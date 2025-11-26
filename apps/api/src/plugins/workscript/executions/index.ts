import { Hono } from 'hono';
import { WorkflowRepository } from '../repositories/workflowRepository';
import { authenticate, requirePermission } from '../../../shared-services/auth/middleware';
import { Permission, type AuthContext } from '../../../shared-services/auth/types';
import { desc, and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { workflowExecutions, workflows } from '../schema/workscript.schema';

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

    // Build query with left join to get workflow name
    let query = db.select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      workflowName: workflows.name,
      status: workflowExecutions.status,
      result: workflowExecutions.result,
      error: workflowExecutions.error,
      startedAt: workflowExecutions.startedAt,
      completedAt: workflowExecutions.completedAt
    })
    .from(workflowExecutions)
    .leftJoin(workflows, eq(workflowExecutions.workflowId, workflows.id));

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

/**
 * GET /executions/:id/state-changes - Get state changes for an execution
 *
 * Computes state changes by comparing initial and final state,
 * plus any state modifications recorded in node logs.
 */
executionsApp.get('/:id/state-changes', authenticate, requirePermission(Permission.EXECUTION_READ), async (c) => {
  try {
    const id = c.req.param('id');
    const execution = await workflowRepository.findExecutionById(id);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    const stateChanges: any[] = [];
    const initialState = (execution.initialState as Record<string, any>) || {};
    const finalState = (execution.finalState as Record<string, any>) || {};
    const nodeLogs = (execution.nodeLogs as any[]) || [];

    // Extract state changes from node logs
    let sequenceNumber = 0;
    for (const log of nodeLogs) {
      if (log.stateModifications) {
        for (const [key, newValue] of Object.entries(log.stateModifications)) {
          stateChanges.push({
            id: `${id}-${sequenceNumber}`,
            executionId: id,
            nodeId: log.nodeId || 'unknown',
            key,
            oldValue: undefined, // Not tracked per-change
            newValue,
            operation: 'set',
            timestamp: log.endTime || log.startTime || execution.startedAt,
            sequenceNumber: sequenceNumber++,
          });
        }
      }
    }

    // If no state changes from logs, compute diff from initial/final state
    if (stateChanges.length === 0) {
      const allKeys = new Set([...Object.keys(initialState), ...Object.keys(finalState)]);
      for (const key of allKeys) {
        const oldValue = initialState[key];
        const newValue = finalState[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          let operation: 'set' | 'update' | 'delete' = 'update';
          if (oldValue === undefined) operation = 'set';
          else if (newValue === undefined) operation = 'delete';

          stateChanges.push({
            id: `${id}-${sequenceNumber}`,
            executionId: id,
            nodeId: 'unknown',
            key,
            oldValue,
            newValue,
            operation,
            timestamp: execution.completedAt || execution.startedAt,
            sequenceNumber: sequenceNumber++,
          });
        }
      }
    }

    return c.json({ items: stateChanges, count: stateChanges.length });
  } catch (error) {
    console.error('Error fetching state changes:', error);
    return c.json({ error: 'Failed to fetch state changes' }, 500);
  }
});

/**
 * GET /executions/:id/node-logs - Get node execution logs
 *
 * Returns the detailed node logs stored during execution.
 */
executionsApp.get('/:id/node-logs', authenticate, requirePermission(Permission.EXECUTION_READ), async (c) => {
  try {
    const id = c.req.param('id');
    const execution = await workflowRepository.findExecutionById(id);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    const nodeLogs = (execution.nodeLogs as any[]) || [];

    // Transform logs to match frontend expected format
    const formattedLogs = nodeLogs.map((log, index) => ({
      id: log.id || `${id}-node-${index}`,
      executionId: id,
      nodeId: log.nodeId || `node-${index}`,
      nodeType: log.nodeType || 'unknown',
      startTime: log.startTime || execution.startedAt,
      endTime: log.endTime || null,
      duration: log.duration || null,
      status: log.status || 'completed',
      inputConfig: log.inputConfig || log.config || null,
      outputEdges: log.outputEdges || log.edges || null,
      error: log.error || null,
      stateModifications: log.stateModifications || null,
      sequenceNumber: log.sequenceNumber ?? index,
      parentNodeId: log.parentNodeId || null,
      retryAttempt: log.retryAttempt || 0,
    }));

    return c.json({ items: formattedLogs, count: formattedLogs.length });
  } catch (error) {
    console.error('Error fetching node logs:', error);
    return c.json({ error: 'Failed to fetch node logs' }, 500);
  }
});

/**
 * GET /executions/:id/timeline - Get execution timeline events
 *
 * Generates a timeline of events from the execution data.
 */
executionsApp.get('/:id/timeline', authenticate, requirePermission(Permission.EXECUTION_READ), async (c) => {
  try {
    const id = c.req.param('id');
    const execution = await workflowRepository.findExecutionById(id);

    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }

    const timeline: any[] = [];
    const nodeLogs = (execution.nodeLogs as any[]) || [];

    // Workflow started event
    timeline.push({
      id: `${id}-start`,
      type: 'workflow:started',
      timestamp: execution.startedAt,
      description: 'Workflow execution started',
      severity: 'info',
    });

    // Node execution events from logs
    for (const log of nodeLogs) {
      // Node started
      if (log.startTime) {
        timeline.push({
          id: `${id}-${log.nodeId}-start`,
          type: 'node:started',
          timestamp: log.startTime,
          nodeId: log.nodeId,
          data: { nodeType: log.nodeType },
          description: `Node '${log.nodeId}' started execution`,
          severity: 'info',
        });
      }

      // Node completed/failed
      if (log.endTime) {
        const isError = log.status === 'failed' || log.error;
        timeline.push({
          id: `${id}-${log.nodeId}-end`,
          type: isError ? 'node:failed' : 'node:completed',
          timestamp: log.endTime,
          nodeId: log.nodeId,
          data: {
            nodeType: log.nodeType,
            duration: log.duration,
            error: log.error,
          },
          description: isError
            ? `Node '${log.nodeId}' failed: ${log.error || 'Unknown error'}`
            : `Node '${log.nodeId}' completed successfully`,
          severity: isError ? 'error' : 'success',
        });
      }

      // State change events
      if (log.stateModifications) {
        const keys = Object.keys(log.stateModifications);
        if (keys.length > 0) {
          timeline.push({
            id: `${id}-${log.nodeId}-state`,
            type: 'state:changed',
            timestamp: log.endTime || log.startTime,
            nodeId: log.nodeId,
            data: { keys, modifications: log.stateModifications },
            description: `State updated: ${keys.join(', ')}`,
            severity: 'info',
          });
        }
      }
    }

    // Workflow completed/failed event
    if (execution.completedAt) {
      const isFailed = execution.status === 'failed';
      timeline.push({
        id: `${id}-end`,
        type: isFailed ? 'workflow:failed' : 'workflow:completed',
        timestamp: execution.completedAt,
        data: {
          status: execution.status,
          error: execution.error,
          failedNodeId: execution.failedNodeId,
        },
        description: isFailed
          ? `Workflow failed: ${execution.error || 'Unknown error'}`
          : 'Workflow execution completed successfully',
        severity: isFailed ? 'error' : 'success',
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ items: timeline, count: timeline.length });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return c.json({ error: 'Failed to fetch timeline' }, 500);
  }
});

export default executionsApp;
