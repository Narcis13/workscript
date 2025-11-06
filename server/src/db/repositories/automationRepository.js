import { eq, desc, and } from 'drizzle-orm';
import { db } from '../index';
import { automations, automationExecutions, workflows } from '../schema';
export class AutomationRepository {
    // Basic CRUD operations for automations
    async create(automation) {
        await db.insert(automations).values(automation);
        // For MySQL, we need to fetch the created record separately
        if (automation.id) {
            const created = await this.findById(automation.id);
            if (!created)
                throw new Error('Failed to create automation');
            return created;
        }
        throw new Error('Automation ID is required');
    }
    async findById(id) {
        const [automation] = await db.select().from(automations).where(eq(automations.id, id));
        return automation || null;
    }
    async findAll() {
        return db.select().from(automations).orderBy(desc(automations.createdAt));
    }
    async findByAgencyId(agencyId) {
        return db.select()
            .from(automations)
            .where(eq(automations.agencyId, agencyId))
            .orderBy(desc(automations.createdAt));
    }
    async findEnabled() {
        return db.select()
            .from(automations)
            .where(eq(automations.enabled, true))
            .orderBy(desc(automations.createdAt));
    }
    async findEnabledByAgencyId(agencyId) {
        return db.select()
            .from(automations)
            .where(and(eq(automations.agencyId, agencyId), eq(automations.enabled, true)))
            .orderBy(desc(automations.createdAt));
    }
    async findByTriggerType(triggerType) {
        return db.select()
            .from(automations)
            .where(eq(automations.triggerType, triggerType))
            .orderBy(desc(automations.createdAt));
    }
    async findScheduledAutomations() {
        return db.select()
            .from(automations)
            .where(and(eq(automations.enabled, true), eq(automations.triggerType, 'cron')))
            .orderBy(desc(automations.nextRunAt));
    }
    async update(id, updates) {
        await db.update(automations).set(updates).where(eq(automations.id, id));
        return this.findById(id);
    }
    async updateRunStats(id, success, error) {
        const now = new Date();
        const updates = {
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
    async toggleEnabled(id, enabled) {
        return this.update(id, { enabled });
    }
    async delete(id) {
        // First delete related executions
        await db.delete(automationExecutions).where(eq(automationExecutions.automationId, id));
        // Then delete the automation
        const result = await db.delete(automations).where(eq(automations.id, id));
        return result.affectedRows > 0;
    }
    // Automation execution methods
    async createExecution(execution) {
        await db.insert(automationExecutions).values(execution);
        // For MySQL, we need to fetch the created record separately
        if (execution.id) {
            const created = await this.findExecutionById(execution.id);
            if (!created)
                throw new Error('Failed to create automation execution');
            return created;
        }
        throw new Error('Execution ID is required');
    }
    async findExecutionById(id) {
        const [execution] = await db.select().from(automationExecutions).where(eq(automationExecutions.id, id));
        return execution || null;
    }
    async findExecutionsByAutomationId(automationId) {
        return db.select()
            .from(automationExecutions)
            .where(eq(automationExecutions.automationId, automationId))
            .orderBy(desc(automationExecutions.startedAt));
    }
    async findAllExecutions() {
        return db.select()
            .from(automationExecutions)
            .orderBy(desc(automationExecutions.startedAt));
    }
    async updateExecution(id, updates) {
        await db.update(automationExecutions).set(updates).where(eq(automationExecutions.id, id));
        return this.findExecutionById(id);
    }
    async completeExecution(id, status, result, error) {
        const now = new Date();
        const execution = await this.findExecutionById(id);
        if (!execution)
            return null;
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
    async findAutomationsWithWorkflow() {
        const result = await db.select()
            .from(automations)
            .leftJoin(workflows, eq(automations.workflowId, workflows.id))
            .orderBy(desc(automations.createdAt));
        return result.map(row => ({ ...row.automations, workflow: row.workflows }));
    }
    async findAutomationWithWorkflowById(id) {
        const result = await db.select()
            .from(automations)
            .leftJoin(workflows, eq(automations.workflowId, workflows.id))
            .where(eq(automations.id, id));
        return result[0] ? { ...result[0].automations, workflow: result[0].workflows } : null;
    }
    // Statistics and analytics
    async getAutomationStats(automationId) {
        const automation = await this.findById(automationId);
        if (!automation)
            throw new Error('Automation not found');
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
    async getAgencyAutomationStats(agencyId) {
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
