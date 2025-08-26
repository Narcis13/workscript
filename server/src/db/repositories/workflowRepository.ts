import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { workflows, workflowExecutions, type Workflow, type NewWorkflow, type WorkflowExecution, type NewWorkflowExecution } from '../schema';

export class WorkflowRepository {
  async create(workflow: NewWorkflow): Promise<Workflow> {
    await db.insert(workflows).values(workflow);
    // For MySQL, we need to fetch the created record separately
    if (workflow.id) {
      const created = await this.findById(workflow.id);
      if (!created) throw new Error('Failed to create workflow');
      return created;
    }
    throw new Error('Workflow ID is required');
  }

  async findById(id: string): Promise<Workflow | null> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow || null;
  }

  async findAll(): Promise<Workflow[]> {
    return db.select().from(workflows).orderBy(desc(workflows.createdAt));
  }

  async findActive(): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.isActive, true)).orderBy(desc(workflows.createdAt));
  }

  async update(id: string, updates: Partial<NewWorkflow>): Promise<Workflow | null> {
    await db.update(workflows).set(updates).where(eq(workflows.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(workflows).where(eq(workflows.id, id));
    return (result as any).affectedRows > 0;
  }

  // Workflow execution methods
  async createExecution(execution: NewWorkflowExecution): Promise<WorkflowExecution> {
    await db.insert(workflowExecutions).values(execution);
    // For MySQL, we need to fetch the created record separately
    if (execution.id) {
      const created = await this.findExecutionById(execution.id);
      if (!created) throw new Error('Failed to create workflow execution');
      return created;
    }
    throw new Error('Execution ID is required');
  }

  async findExecutionById(id: string): Promise<WorkflowExecution | null> {
    const [execution] = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, id));
    return execution || null;
  }

  async findExecutionsByWorkflowId(workflowId: string): Promise<WorkflowExecution[]> {
    return db.select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt));
  }

  async updateExecution(id: string, updates: Partial<NewWorkflowExecution>): Promise<WorkflowExecution | null> {
    await db.update(workflowExecutions).set(updates).where(eq(workflowExecutions.id, id));
    return this.findExecutionById(id);
  }
}