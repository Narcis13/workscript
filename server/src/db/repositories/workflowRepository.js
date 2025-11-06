import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { workflows, workflowExecutions } from '../schema';
export class WorkflowRepository {
    async create(workflow) {
        await db.insert(workflows).values(workflow);
        // For MySQL, we need to fetch the created record separately
        if (workflow.id) {
            const created = await this.findById(workflow.id);
            if (!created)
                throw new Error('Failed to create workflow');
            return created;
        }
        throw new Error('Workflow ID is required');
    }
    async findById(id) {
        const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
        return workflow || null;
    }
    async findAll() {
        return db.select().from(workflows).orderBy(desc(workflows.createdAt));
    }
    async findActive() {
        return db.select().from(workflows).where(eq(workflows.isActive, true)).orderBy(desc(workflows.createdAt));
    }
    async update(id, updates) {
        await db.update(workflows).set(updates).where(eq(workflows.id, id));
        return this.findById(id);
    }
    async delete(id) {
        const result = await db.delete(workflows).where(eq(workflows.id, id));
        return result.affectedRows > 0;
    }
    // Workflow execution methods
    async createExecution(execution) {
        await db.insert(workflowExecutions).values(execution);
        // For MySQL, we need to fetch the created record separately
        if (execution.id) {
            const created = await this.findExecutionById(execution.id);
            if (!created)
                throw new Error('Failed to create workflow execution');
            return created;
        }
        throw new Error('Execution ID is required');
    }
    async findExecutionById(id) {
        const [execution] = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, id));
        return execution || null;
    }
    async findExecutionsByWorkflowId(workflowId) {
        return db.select()
            .from(workflowExecutions)
            .where(eq(workflowExecutions.workflowId, workflowId))
            .orderBy(desc(workflowExecutions.startedAt));
    }
    async updateExecution(id, updates) {
        await db.update(workflowExecutions).set(updates).where(eq(workflowExecutions.id, id));
        return this.findExecutionById(id);
    }
}
