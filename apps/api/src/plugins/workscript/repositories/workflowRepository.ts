import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db';
import {
  workflows,
  workflowExecutions,
  type Workflow,
  type NewWorkflow,
  type WorkflowExecution,
  type NewWorkflowExecution
} from '../schema/workscript.schema';

/**
 * Workflow Repository
 *
 * Handles CRUD operations for workflows and workflow executions.
 * Uses the shared database connection from /apps/api/src/db
 */
export class WorkflowRepository {
  /**
   * Create a new workflow
   * @param workflow - Workflow data
   * @returns Created workflow
   */
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

  /**
   * Find a workflow by ID
   * @param id - Workflow ID
   * @returns Workflow or null if not found
   */
  async findById(id: string): Promise<Workflow | null> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow || null;
  }

  /**
   * Find all workflows
   * @returns Array of workflows ordered by creation date (newest first)
   */
  async findAll(): Promise<Workflow[]> {
    return db.select().from(workflows).orderBy(desc(workflows.createdAt));
  }

  /**
   * Find all active workflows
   * @returns Array of active workflows
   */
  async findActive(): Promise<Workflow[]> {
    return db.select()
      .from(workflows)
      .where(eq(workflows.isActive, true))
      .orderBy(desc(workflows.createdAt));
  }

  /**
   * Update a workflow
   * @param id - Workflow ID
   * @param updates - Partial workflow data to update
   * @returns Updated workflow or null if not found
   */
  async update(id: string, updates: Partial<NewWorkflow>): Promise<Workflow | null> {
    await db.update(workflows).set(updates).where(eq(workflows.id, id));
    return this.findById(id);
  }

  /**
   * Delete a workflow
   * @param id - Workflow ID
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(workflows).where(eq(workflows.id, id));
    return (result as any).affectedRows > 0;
  }

  // Workflow execution methods

  /**
   * Create a workflow execution record
   * @param execution - Execution data
   * @returns Created execution
   */
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

  /**
   * Find an execution by ID with full details including workflow name
   * @param id - Execution ID
   * @returns Execution with enriched data or null if not found
   */
  async findExecutionById(id: string): Promise<Record<string, any> | null> {
    const [result] = await db.select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      workflowName: workflows.name,
      workflowVersion: workflows.version,
      status: workflowExecutions.status,
      triggeredBy: workflowExecutions.triggeredBy,
      initialState: workflowExecutions.initialState,
      finalState: workflowExecutions.finalState,
      result: workflowExecutions.result,
      error: workflowExecutions.error,
      stackTrace: workflowExecutions.stackTrace,
      failedNodeId: workflowExecutions.failedNodeId,
      nodeLogs: workflowExecutions.nodeLogs,
      startedAt: workflowExecutions.startedAt,
      completedAt: workflowExecutions.completedAt,
    })
      .from(workflowExecutions)
      .leftJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
      .where(eq(workflowExecutions.id, id));

    if (!result) return null;

    // Parse result JSON for additional data (fallback for older executions)
    const resultData = result.result as Record<string, any> | null;

    // Calculate duration if both timestamps exist
    const duration = result.startedAt && result.completedAt
      ? new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()
      : null;

    // Extract initial/final state from stored columns or from result JSON (fallback)
    const initialState = result.initialState || resultData?.initialState || null;
    const finalState = result.finalState || resultData?.finalState || null;

    // Map to frontend expected field names
    return {
      id: result.id,
      workflowId: result.workflowId,
      workflowName: result.workflowName || 'Unknown',
      workflowVersion: result.workflowVersion || '1.0.0',
      status: result.status,
      triggeredBy: result.triggeredBy || 'manual',
      initialState,
      finalState,
      result: result.result,
      error: result.error,
      stackTrace: result.stackTrace,
      failedNodeId: result.failedNodeId,
      nodeLogs: result.nodeLogs,
      startTime: result.startedAt,
      endTime: result.completedAt,
      duration,
      createdAt: result.startedAt,
    };
  }

  /**
   * Find all executions for a specific workflow
   * @param workflowId - Workflow ID
   * @returns Array of executions ordered by start time (newest first)
   */
  async findExecutionsByWorkflowId(workflowId: string): Promise<WorkflowExecution[]> {
    return db.select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt));
  }

  /**
   * Update an execution record
   * @param id - Execution ID
   * @param updates - Partial execution data to update
   * @returns Updated execution or null if not found
   */
  async updateExecution(id: string, updates: Partial<NewWorkflowExecution>): Promise<WorkflowExecution | null> {
    await db.update(workflowExecutions).set(updates).where(eq(workflowExecutions.id, id));
    return this.findExecutionById(id);
  }
}
