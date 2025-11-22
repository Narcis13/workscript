import { Hono } from 'hono';
import { WorkflowRepository } from '../repositories/workflowRepository';
import { authenticate, requirePermission } from '../../../shared-services/auth/middleware';
import { Permission, type AuthContext } from '../../../shared-services/auth/types';
import { desc, and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { workflowExecutions } from '../schema/workscript.schema';

const workflowRepository = new WorkflowRepository();
const executionsApp = new Hono<{ Variables: AuthContext }>();

/**
 * GET /executions - List all executions with optional filtering and pagination
 *
 * Query params:
 * - status: Filter by status (pending, running, completed, failed)
 * - workflowId: Filter by workflow ID
 * - startDate: Filter executions after this date
 * - endDate: Filter executions before this date
 * - pageSize: Number of executions to return (default: 50, max: 100)
 * - sortBy: Field to sort by (default: startTime)
 * - sortOrder: Sort order (asc or desc, default: desc)
 */
executionsApp.get('/', authenticate, requirePermission(Permission.EXECUTION_READ), async (c) => {
  try {
    const {
      status,
      workflowId,
      startDate,
      endDate,
      pageSize = '50',
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = c.req.query();

    // Build query conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(workflowExecutions.status, status));
    }
    if (workflowId) {
      conditions.push(eq(workflowExecutions.workflowId, workflowId));
    }
    if (startDate) {
      conditions.push(gte(workflowExecutions.startedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(workflowExecutions.startedAt, new Date(endDate)));
    }

    // Parse and validate pageSize
    const limit = Math.min(Math.max(1, parseInt(pageSize, 10) || 50), 100);

    // Build query
    let query = db.select().from(workflowExecutions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply sorting
    const orderByField = sortBy === 'startTime' ? workflowExecutions.startedAt : workflowExecutions.completedAt;
    query = query.orderBy(sortOrder === 'asc' ? orderByField : desc(orderByField)) as any;

    // Apply limit
    query = query.limit(limit) as any;

    const executions = await query;

    return c.json({
      items: executions,
      count: executions.length,
      filters: { status, workflowId, startDate, endDate },
      pagination: { pageSize: limit }
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return c.json({ error: 'Failed to fetch executions' }, 500);
  }
});

/**
 * GET /executions/:id - Get single execution by ID
 */
executionsApp.get('/:id', authenticate, requirePermission(Permission.EXECUTION_READ), async (c) => {
  try {
    const id = c.req.param('id');
    const execution = await workflowRepository.findExecutionById(id);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    return c.json(execution);
  } catch (error) {
    console.error('Error fetching execution:', error);
    return c.json({ error: 'Failed to fetch execution' }, 500);
  }
});

/**
 * GET /executions/stats - Get execution statistics
 *
 * Returns aggregate statistics about executions:
 * - Total executions
 * - Executions by status
 * - Success rate
 * - Average duration
 */
executionsApp.get('/stats', authenticate, requirePermission(Permission.EXECUTION_READ), async (c) => {
  try {
    const { workflowId, startDate, endDate } = c.req.query();

    // Build query conditions
    const conditions = [];
    if (workflowId) {
      conditions.push(eq(workflowExecutions.workflowId, workflowId));
    }
    if (startDate) {
      conditions.push(gte(workflowExecutions.startedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(workflowExecutions.startedAt, new Date(endDate)));
    }

    // Build base query
    let query = db.select().from(workflowExecutions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const executions = await query;

    // Calculate statistics
    const total = executions.length;
    const byStatus = {
      pending: executions.filter(e => e.status === 'pending').length,
      running: executions.filter(e => e.status === 'running').length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
    };

    const successRate = total > 0
      ? ((byStatus.completed / total) * 100).toFixed(2)
      : '0';

    // Calculate average duration for completed executions
    const completedExecutions = executions.filter(e =>
      e.status === 'completed' && e.startedAt && e.completedAt
    );

    let averageDuration = 0;
    if (completedExecutions.length > 0) {
      const totalDuration = completedExecutions.reduce((sum, e) => {
        const duration = new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime();
        return sum + duration;
      }, 0);
      averageDuration = Math.round(totalDuration / completedExecutions.length);
    }

    return c.json({
      total,
      byStatus,
      successRate: parseFloat(successRate),
      averageDuration,
      filters: { workflowId, startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching execution stats:', error);
    return c.json({ error: 'Failed to fetch execution stats' }, 500);
  }
});

/**
 * POST /executions/:id/rerun - Re-run a previous execution
 *
 * Creates a new execution by re-running the workflow from a previous execution.
 */
executionsApp.post('/:id/rerun', authenticate, requirePermission(Permission.EXECUTION_RERUN), async (c) => {
  try {
    const id = c.req.param('id');
    const execution = await workflowRepository.findExecutionById(id);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    // Get the workflow definition
    const workflow = await workflowRepository.findById(execution.workflowId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    // This would normally trigger a new execution via the WorkflowService
    // For now, return a message indicating the feature is available
    return c.json({
      message: 'Execution rerun feature available',
      executionId: execution.id,
      workflowId: execution.workflowId,
      note: 'Implement rerun logic via WorkflowService'
    }, 501); // 501 Not Implemented
  } catch (error) {
    console.error('Error rerunning execution:', error);
    return c.json({ error: 'Failed to rerun execution' }, 500);
  }
});

export default executionsApp;
