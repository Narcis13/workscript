import { eq, desc, and } from 'drizzle-orm';
import { db } from '../index';
import { 
  automations, 
  automationExecutions, 
  workflows,
  type Automation, 
  type NewAutomation, 
  type AutomationExecution, 
  type NewAutomationExecution 
} from '../schema';

export class AutomationRepository {
  // Basic CRUD operations for automations
  async create(automation: NewAutomation): Promise<Automation> {
    await db.insert(automations).values(automation);
    // For MySQL, we need to fetch the created record separately
    if (automation.id) {
      const created = await this.findById(automation.id);
      if (!created) throw new Error('Failed to create automation');
      return created;
    }
    throw new Error('Automation ID is required');
  }

  async findById(id: string): Promise<Automation | null> {
    const [automation] = await db.select().from(automations).where(eq(automations.id, id));
    return automation || null;
  }

  async findAll(): Promise<Automation[]> {
    return db.select().from(automations).orderBy(desc(automations.createdAt));
  }

  async findByAgencyId(agencyId: number): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(eq(automations.agencyId, agencyId))
      .orderBy(desc(automations.createdAt));
  }

  async findEnabled(): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(eq(automations.enabled, true))
      .orderBy(desc(automations.createdAt));
  }

  async findEnabledByAgencyId(agencyId: number): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(eq(automations.agencyId, agencyId), eq(automations.enabled, true)))
      .orderBy(desc(automations.createdAt));
  }

  async findByTriggerType(triggerType: 'immediate' | 'cron' | 'webhook'): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(eq(automations.triggerType, triggerType))
      .orderBy(desc(automations.createdAt));
  }

  async findScheduledAutomations(): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(
        eq(automations.enabled, true),
        eq(automations.triggerType, 'cron')
      ))
      .orderBy(desc(automations.nextRunAt));
  }

  async update(id: string, updates: Partial<NewAutomation>): Promise<Automation | null> {
    await db.update(automations).set(updates).where(eq(automations.id, id));
    return this.findById(id);
  }

  async updateRunStats(id: string, success: boolean, error?: string): Promise<Automation | null> {
    const now = new Date();
    const updates: Partial<NewAutomation> = {
      lastRunAt: now,
      runCount: (await this.findById(id))?.runCount || 0 + 1,
      ...(success 
        ? { successCount: (await this.findById(id))?.successCount || 0 + 1 }
        : { 
            failureCount: (await this.findById(id))?.failureCount || 0 + 1,
            lastError: error,
            lastErrorAt: now
          })
    };
    
    return this.update(id, updates);
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<Automation | null> {
    return this.update(id, { enabled });
  }

  async delete(id: string): Promise<boolean> {
    // First delete related executions
    await db.delete(automationExecutions).where(eq(automationExecutions.automationId, id));
    
    // Then delete the automation
    const result = await db.delete(automations).where(eq(automations.id, id));
    return (result as any).affectedRows > 0;
  }

  // Automation execution methods
  async createExecution(execution: NewAutomationExecution): Promise<AutomationExecution> {
    await db.insert(automationExecutions).values(execution);
    // For MySQL, we need to fetch the created record separately
    if (execution.id) {
      const created = await this.findExecutionById(execution.id);
      if (!created) throw new Error('Failed to create automation execution');
      return created;
    }
    throw new Error('Execution ID is required');
  }

  async findExecutionById(id: string): Promise<AutomationExecution | null> {
    const [execution] = await db.select().from(automationExecutions).where(eq(automationExecutions.id, id));
    return execution || null;
  }

  async findExecutionsByAutomationId(automationId: string): Promise<AutomationExecution[]> {
    return db.select()
      .from(automationExecutions)
      .where(eq(automationExecutions.automationId, automationId))
      .orderBy(desc(automationExecutions.startedAt));
  }

  async findAllExecutions(): Promise<AutomationExecution[]> {
    return db.select()
      .from(automationExecutions)
      .orderBy(desc(automationExecutions.startedAt));
  }

  async updateExecution(id: string, updates: Partial<NewAutomationExecution>): Promise<AutomationExecution | null> {
    await db.update(automationExecutions).set(updates).where(eq(automationExecutions.id, id));
    return this.findExecutionById(id);
  }

  async completeExecution(id: string, status: 'completed' | 'failed', result?: any, error?: string): Promise<AutomationExecution | null> {
    const now = new Date();
    const execution = await this.findExecutionById(id);
    if (!execution) return null;

    const duration = execution.startedAt ? Date.now() - new Date(execution.startedAt).getTime() : null;
    
    return this.updateExecution(id, {
      status,
      result,
      error,
      completedAt: now,
      duration
    });
  }

  // Advanced queries with joins
  async findAutomationsWithWorkflow(): Promise<(Automation & { workflow: any })[]> {
    const result = await db.select()
      .from(automations)
      .leftJoin(workflows, eq(automations.workflowId, workflows.id))
      .orderBy(desc(automations.createdAt));

    return result.map(row => ({ ...row.automations, workflow: row.workflows }));
  }

  async findAutomationWithWorkflowById(id: string): Promise<(Automation & { workflow: any }) | null> {
    const result = await db.select()
      .from(automations)
      .leftJoin(workflows, eq(automations.workflowId, workflows.id))
      .where(eq(automations.id, id));

    return result[0] ? { ...result[0].automations, workflow: result[0].workflows } : null;
  }

  // Statistics and analytics
  async getAutomationStats(automationId: string): Promise<{
    totalRuns: number;
    successRate: number;
    averageDuration: number;
    lastRun?: Date;
  }> {
    const automation = await this.findById(automationId);
    if (!automation) throw new Error('Automation not found');

    const executions = await this.findExecutionsByAutomationId(automationId);
    const completedExecutions = executions.filter(e => e.duration !== null);
    
    const averageDuration = completedExecutions.length > 0 
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    return {
      totalRuns: automation.runCount,
      successRate: automation.runCount > 0 ? (automation.successCount / automation.runCount) * 100 : 0,
      averageDuration,
      lastRun: automation.lastRunAt ? new Date(automation.lastRunAt) : undefined
    };
  }

  async getAgencyAutomationStats(agencyId: number): Promise<{
    totalAutomations: number;
    enabledAutomations: number;
    totalExecutions: number;
    successRate: number;
  }> {
    const allAutomations = await this.findByAgencyId(agencyId);
    const enabledAutomations = allAutomations.filter(a => a.enabled);
    
    const totalExecutions = allAutomations.reduce((sum, a) => sum + a.runCount, 0);
    const totalSuccesses = allAutomations.reduce((sum, a) => sum + a.successCount, 0);
    
    return {
      totalAutomations: allAutomations.length,
      enabledAutomations: enabledAutomations.length,
      totalExecutions,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0
    };
  }
}