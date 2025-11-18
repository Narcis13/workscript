/**
 * Execution Type Definitions
 *
 * Type definitions for workflow execution-related entities in the Workscript Main UI.
 * These types track workflow execution history, state changes, and detailed execution logs.
 *
 * @module execution.types
 */

import type { ExecutionResult as EngineExecutionResult } from '@workscript/engine';
import type { ExecutionStatus } from './automation.types';

/**
 * Workflow execution entity from the database
 *
 * Represents a complete record of a workflow execution.
 */
export interface WorkflowExecution {
  /** Unique execution ID (UUID) */
  id: string;

  /** Workflow ID that was executed */
  workflowId: string;

  /** Workflow name (for display) */
  workflowName?: string;

  /** Workflow version */
  workflowVersion?: string;

  /** Automation ID (if triggered by an automation) */
  automationId?: string;

  /** Execution status */
  status: ExecutionStatus;

  /** How the execution was triggered */
  triggeredBy: 'manual' | 'automation' | 'webhook' | 'api';

  /** Execution start time */
  startTime: Date | string;

  /** Execution end time */
  endTime?: Date | string | null;

  /** Execution duration in milliseconds */
  duration?: number | null;

  /** Initial state */
  initialState?: Record<string, any>;

  /** Final state */
  finalState?: Record<string, any>;

  /** Execution result */
  result?: any;

  /** Error message (if failed) */
  error?: string | null;

  /** Error stack trace (if failed) */
  stackTrace?: string | null;

  /** Node that failed (if failed) */
  failedNodeId?: string | null;

  /** State at the point of failure */
  stateAtFailure?: Record<string, any> | null;

  /** Creation timestamp */
  createdAt: Date | string;

  /** User ID who triggered the execution (if manual) */
  triggeredBy_userId?: string;
}

/**
 * State change record
 *
 * Represents a single state mutation during execution.
 */
export interface StateChange {
  /** Change ID */
  id: string;

  /** Execution ID */
  executionId: string;

  /** Node that made the change */
  nodeId: string;

  /** State key that changed */
  key: string;

  /** Old value (before change) */
  oldValue: any;

  /** New value (after change) */
  newValue: any;

  /** Type of change operation */
  operation: 'set' | 'update' | 'delete' | 'merge';

  /** Timestamp of the change */
  timestamp: Date | string;

  /** Sequence number in the execution */
  sequenceNumber: number;
}

/**
 * Node execution log
 *
 * Detailed log of a single node's execution within a workflow.
 */
export interface NodeExecutionLog {
  /** Log ID */
  id: string;

  /** Execution ID */
  executionId: string;

  /** Node ID */
  nodeId: string;

  /** Node type */
  nodeType: string;

  /** Execution start time */
  startTime: Date | string;

  /** Execution end time */
  endTime?: Date | string | null;

  /** Execution duration in milliseconds */
  duration?: number | null;

  /** Node status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

  /** Input configuration */
  inputConfig?: Record<string, any>;

  /** Output edges returned */
  outputEdges?: Record<string, any>;

  /** Error message (if failed) */
  error?: string | null;

  /** State modifications made by this node */
  stateModifications?: Record<string, any>;

  /** Sequence number in the execution flow */
  sequenceNumber: number;

  /** Parent node ID (for nested executions) */
  parentNodeId?: string | null;

  /** Retry attempt number (if retried) */
  retryAttempt?: number;
}

/**
 * Execution timeline event
 *
 * Represents a single event in the execution timeline.
 */
export interface ExecutionTimelineEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type: 'workflow:started' | 'workflow:completed' | 'workflow:failed' |
        'node:started' | 'node:completed' | 'node:failed' | 'node:skipped' |
        'state:changed' | 'edge:triggered' | 'error:occurred';

  /** Timestamp */
  timestamp: Date | string;

  /** Related node ID (if applicable) */
  nodeId?: string;

  /** Event data */
  data?: Record<string, any>;

  /** Human-readable description */
  description: string;

  /** Severity level */
  severity?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Execution diff result
 *
 * Represents the difference between initial and final states.
 */
export interface ExecutionStateDiff {
  /** Keys that were added */
  added: string[];

  /** Keys that were removed */
  removed: string[];

  /** Keys that were modified */
  modified: Array<{
    key: string;
    oldValue: any;
    newValue: any;
  }>;

  /** Keys that remained unchanged */
  unchanged: string[];

  /** Total number of changes */
  changeCount: number;
}

/**
 * Execution summary
 *
 * High-level summary of an execution.
 */
export interface ExecutionSummary {
  /** Execution ID */
  id: string;

  /** Workflow name */
  workflowName: string;

  /** Execution status */
  status: ExecutionStatus;

  /** Start time */
  startTime: Date | string;

  /** End time */
  endTime?: Date | string | null;

  /** Duration in milliseconds */
  duration?: number | null;

  /** Number of nodes executed */
  nodesExecuted: number;

  /** Number of successful nodes */
  nodesSucceeded: number;

  /** Number of failed nodes */
  nodesFailed: number;

  /** Number of state changes */
  stateChanges: number;

  /** Error summary (if failed) */
  errorSummary?: string;
}

/**
 * Execution filter options
 */
export interface ExecutionFilterOptions {
  /** Filter by workflow ID */
  workflowId?: string;

  /** Filter by automation ID */
  automationId?: string;

  /** Filter by execution status */
  status?: ExecutionStatus;

  /** Filter by trigger type */
  triggeredBy?: 'manual' | 'automation' | 'webhook' | 'api';

  /** Filter by date range - start */
  startDate?: Date | string;

  /** Filter by date range - end */
  endDate?: Date | string;

  /** Filter by user ID (who triggered) */
  userId?: string;

  /** Sort field */
  sortBy?: 'startTime' | 'endTime' | 'duration' | 'status' | 'workflowName';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Page number (for pagination) */
  page?: number;

  /** Page size (for pagination) */
  pageSize?: number;
}

/**
 * Execution statistics
 *
 * Aggregate statistics about executions.
 */
export interface ExecutionStats {
  /** Total number of executions */
  total: number;

  /** Number of successful executions */
  successCount: number;

  /** Number of failed executions */
  failureCount: number;

  /** Number of running executions */
  runningCount: number;

  /** Number of pending executions */
  pendingCount: number;

  /** Success rate (percentage) */
  successRate: number;

  /** Average execution duration in milliseconds */
  averageDuration?: number;

  /** Median execution duration in milliseconds */
  medianDuration?: number;

  /** Executions in the last 24 hours */
  last24Hours: number;

  /** Executions in the last 7 days */
  last7Days: number;

  /** Most common failure reason */
  commonFailureReason?: string;
}

/**
 * Execution export data
 *
 * Complete execution data for export.
 */
export interface ExecutionExportData {
  /** Execution metadata */
  execution: WorkflowExecution;

  /** State change timeline */
  stateChanges: StateChange[];

  /** Node execution logs */
  nodeLogs: NodeExecutionLog[];

  /** Timeline events */
  timeline: ExecutionTimelineEvent[];

  /** State diff */
  stateDiff: ExecutionStateDiff;

  /** Export timestamp */
  exportedAt: Date;

  /** Export format version */
  version: string;
}

/**
 * Execution comparison
 *
 * Comparison between two executions.
 */
export interface ExecutionComparison {
  /** First execution ID */
  executionId1: string;

  /** Second execution ID */
  executionId2: string;

  /** Differences in execution */
  differences: {
    /** Duration difference in milliseconds */
    durationDiff?: number;

    /** Status match */
    statusMatch: boolean;

    /** Node count difference */
    nodeCountDiff: number;

    /** State change count difference */
    stateChangeCountDiff: number;

    /** Different final states */
    finalStateDiff: Record<string, any>;
  };

  /** Common nodes executed */
  commonNodes: string[];

  /** Nodes only in execution 1 */
  onlyInExecution1: string[];

  /** Nodes only in execution 2 */
  onlyInExecution2: string[];
}

/**
 * Execution re-run request
 *
 * Payload for re-running a previous execution.
 */
export interface RerunExecutionRequest {
  /** Execution ID to re-run */
  executionId: string;

  /** Whether to use the same initial state */
  useSameInitialState?: boolean;

  /** Override initial state (if not using same) */
  initialState?: Record<string, any>;

  /** Execution options */
  options?: {
    /** Timeout in milliseconds */
    timeout?: number;

    /** Enable debug mode */
    debug?: boolean;
  };
}

/**
 * Active execution tracking
 *
 * Real-time tracking of an active execution.
 */
export interface ActiveExecution {
  /** Execution ID */
  executionId: string;

  /** Workflow name */
  workflowName: string;

  /** Current status */
  status: 'running' | 'pending';

  /** Currently executing node */
  currentNode?: string;

  /** Execution progress */
  progress: {
    /** Number of completed nodes */
    completed: number;

    /** Total number of nodes */
    total: number;

    /** Progress percentage (0-100) */
    percentage: number;
  };

  /** Elapsed time in milliseconds */
  elapsedTime: number;

  /** Start time */
  startTime: Date;

  /** Estimated completion time */
  estimatedEndTime?: Date;

  /** Recent events */
  recentEvents: ExecutionTimelineEvent[];
}

/**
 * Execution error details
 *
 * Detailed information about an execution error.
 */
export interface ExecutionErrorDetails {
  /** Error message */
  message: string;

  /** Error code */
  code?: string;

  /** Error type */
  type: 'validation' | 'runtime' | 'timeout' | 'node_error' | 'system' | 'unknown';

  /** Stack trace */
  stackTrace?: string;

  /** Node that failed */
  failedNode?: {
    nodeId: string;
    nodeType: string;
    config?: Record<string, any>;
  };

  /** State at failure */
  stateAtFailure?: Record<string, any>;

  /** Suggested resolution */
  suggestedResolution?: string;

  /** Related documentation URL */
  docsUrl?: string;

  /** Whether the error is recoverable */
  recoverable: boolean;
}

/**
 * Execution performance metrics
 *
 * Detailed performance metrics for an execution.
 */
export interface ExecutionPerformanceMetrics {
  /** Total execution duration */
  totalDuration: number;

  /** Time spent in each node */
  nodeExecutionTimes: Record<string, number>;

  /** Slowest node */
  slowestNode?: {
    nodeId: string;
    duration: number;
  };

  /** Fastest node */
  fastestNode?: {
    nodeId: string;
    duration: number;
  };

  /** Average node execution time */
  averageNodeDuration: number;

  /** State changes per second */
  stateChangesPerSecond: number;

  /** Memory usage (if available) */
  memoryUsage?: {
    initial: number;
    peak: number;
    final: number;
  };
}
