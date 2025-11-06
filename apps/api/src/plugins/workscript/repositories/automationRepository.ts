import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../../db';
import {
  automations,
  automationExecutions,
  type Automation,
  type NewAutomation,
  type AutomationExecution,
  type NewAutomationExecution
} from '../../../db/schema/automations.schema';
import { workflows } from '../schema/workscript.schema';

/**
 * Automation Repository (Workscript Plugin)
 *
 * Handles CRUD operations for automations and automation executions.
 * Automatically filters all operations by pluginId = 'workscript'.
 * Uses the shared automations schema with multi-tenant support.
 */
export class AutomationRepository {
  private readonly pluginId = 'workscript';

  // Basic CRUD operations for automations

  /**
   * Create a new automation
   * Automatically adds pluginId = 'workscript'
   */
  async create(automation: NewAutomation): Promise<Automation> {
    // Ensure pluginId is set to 'workscript'
    const automationWithPlugin = {
      ...automation,
      pluginId: this.pluginId
    };

    await db.insert(automations).values(automationWithPlugin);

    // For MySQL, we need to fetch the created record separately
    if (automation.id) {
      const created = await this.findById(automation.id);
      if (!created) throw new Error('Failed to create automation');
      return created;
    }
    throw new Error('Automation ID is required');
  }

  /**
   * Find an automation by ID (filtered by pluginId)
   */
  async findById(id: string): Promise<Automation | null> {
    const [automation] = await db.select()
      .from(automations)
      .where(and(
        eq(automations.id, id),
        eq(automations.pluginId, this.pluginId)
      ));
    return automation || null;
  }

  /**
   * Find all automations for this plugin
   */
  async findAll(): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(eq(automations.pluginId, this.pluginId))
      .orderBy(desc(automations.createdAt));
  }

  /**
   * Find automations by agency ID (for CRM integration)
   */
  async findByAgencyId(agencyId: string): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(
        eq(automations.pluginId, this.pluginId),
        eq(automations.agencyId, agencyId)
      ))
      .orderBy(desc(automations.createdAt));
  }

  /**
   * Find all enabled automations for this plugin
   */
  async findEnabled(): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(
        eq(automations.pluginId, this.pluginId),
        eq(automations.enabled, true)
      ))
      .orderBy(desc(automations.createdAt));
  }

  /**
   * Find enabled automations by agency ID
   */
  async findEnabledByAgencyId(agencyId: string): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(
        eq(automations.pluginId, this.pluginId),
        eq(automations.agencyId, agencyId),
        eq(automations.enabled, true)
      ))
      .orderBy(desc(automations.createdAt));
  }

  /**
   * Find automations by trigger type
   */
  async findByTriggerType(triggerType: 'immediate' | 'cron' | 'webhook'): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(
        eq(automations.pluginId, this.pluginId),
        eq(automations.triggerType, triggerType)
      ))
      .orderBy(desc(automations.createdAt));
  }

  /**
   * Find all scheduled (cron) automations that are enabled
   * Used by CronScheduler to load automations on startup
   */
  async findScheduledAutomations(): Promise<Automation[]> {
    return db.select()
      .from(automations)
      .where(and(
        eq(automations.pluginId, this.pluginId),
        eq(automations.enabled, true),
        eq(automations.triggerType, 'cron')
      ))
      .orderBy(desc(automations.nextRunAt));
  }

  /**
   * Update an automation
   */
  async update(id: string, updates: Partial<NewAutomation>): Promise<Automation | null> {
    // Prevent changing pluginId
    const { pluginId, ...safeUpdates } = updates as any;

    await db.update(automations)
      .set(safeUpdates)
      .where(and(
        eq(automations.id, id),
        eq(automations.pluginId, this.pluginId)
      ));

    return this.findById(id);
  }

  /**
   * Update automation run statistics
   * Called after each execution to track success/failure
   */
  async updateRunStats(id: string, success: boolean, error?: string): Promise<Automation | null> {
    const automation = await this.findById(id);
    if (!automation) return null;

    const now = new Date();
    const updates: Partial<NewAutomation> = {
      lastRunAt: now,
      runCount: automation.runCount + 1,
      ...(success
        ? { successCount: automation.successCount + 1 }
        : {
            failureCount: automation.failureCount + 1,
            lastError: error,
            lastErrorAt: now
          })
    };

    return this.update(id, updates);
  }

  /**
   * Toggle automation enabled/disabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<Automation | null> {
    return this.update(id, { enabled });
  }

  /**
   * Delete an automation and all its executions
   */
  async delete(id: string): Promise<boolean> {
    // First delete related executions
    await db.delete(automationExecutions)
      .where(and(
        eq(automationExecutions.automationId, id),
        eq(automationExecutions.pluginId, this.pluginId)
      ));

    // Then delete the automation
    const result = await db.delete(automations)
      .where(and(
        eq(automations.id, id),
        eq(automations.pluginId, this.pluginId)
      ));

    return (result as any).affectedRows > 0;
  }

  // Automation execution methods

  /**
   * Create an automation execution record
   * Automatically adds pluginId = 'workscript'
   */
  async createExecution(execution: NewAutomationExecution): Promise<AutomationExecution> {
    // Ensure pluginId is set to 'workscript'
    const executionWithPlugin = {
      ...execution,
      pluginId: this.pluginId
    };

    await db.insert(automationExecutions).values(executionWithPlugin);

    // For MySQL, we need to fetch the created record separately
    if (execution.id) {
      const created = await this.findExecutionById(execution.id);
      if (!created) throw new Error('Failed to create automation execution');
      return created;
    }
    throw new Error('Execution ID is required');
  }

  /**
   * Find an execution by ID (filtered by pluginId)
   */
  async findExecutionById(id: string): Promise<AutomationExecution | null> {
    const [execution] = await db.select()
      .from(automationExecutions)
      .where(and(
        eq(automationExecutions.id, id),
        eq(automationExecutions.pluginId, this.pluginId)
      ));
    return execution || null;
  }

  /**
   * Find all executions for a specific automation
   */
  async findExecutionsByAutomationId(automationId: string): Promise<AutomationExecution[]> {
    return db.select()
      .from(automationExecutions)
      .where(and(
        eq(automationExecutions.automationId, automationId),
        eq(automationExecutions.pluginId, this.pluginId)
      ))
      .orderBy(desc(automationExecutions.startedAt));
  }

  /**
   * Find all executions for this plugin
   */
  async findAllExecutions(): Promise<AutomationExecution[]> {
    return db.select()
      .from(automationExecutions)
      .where(eq(automationExecutions.pluginId, this.pluginId))
      .orderBy(desc(automationExecutions.startedAt));
  }

  /**
   * Update an execution record
   */
  async updateExecution(id: string, updates: Partial<NewAutomationExecution>): Promise<AutomationExecution | null> {
    // Prevent changing pluginId
    const { pluginId, ...safeUpdates } = updates as any;

    await db.update(automationExecutions)
      .set(safeUpdates)
      .where(and(
        eq(automationExecutions.id, id),
        eq(automationExecutions.pluginId, this.pluginId)
      ));

    return this.findExecutionById(id);
  }

  /**
   * Mark an execution as completed or failed
   */
  async completeExecution(
    id: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: string
  ): Promise<AutomationExecution | null> {
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

  /**
   * Find all automations with their associated workflow data
   */
  async findAutomationsWithWorkflow(): Promise<(Automation & { workflow: any })[]> {
    const result = await db.select()
      .from(automations)
      .leftJoin(workflows, eq(automations.workflowId, workflows.id))
      .where(eq(automations.pluginId, this.pluginId))
      .orderBy(desc(automations.createdAt));

    return result.map(row => ({ ...row.automations, workflow: row.workflows }));
  }

  /**
   * Find a specific automation with its workflow data
   */
  async findAutomationWithWorkflowById(id: string): Promise<(Automation & { workflow: any }) | null> {
    const result = await db.select()
      .from(automations)
      .leftJoin(workflows, eq(automations.workflowId, workflows.id))
      .where(and(
        eq(automations.id, id),
        eq(automations.pluginId, this.pluginId)
      ));

    return result[0] ? { ...result[0].automations, workflow: result[0].workflows } : null;
  }

  // Statistics and analytics

  /**
   * Get statistics for a specific automation
   */
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

  /**
   * Get automation statistics for a specific agency (CRM integration)
   */
  async getAgencyAutomationStats(agencyId: string): Promise<{
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
