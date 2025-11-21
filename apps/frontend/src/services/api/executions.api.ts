/**
 * Executions API Service
 *
 * Provides functions for interacting with workflow execution-related API endpoints.
 * All functions use the configured Axios client with automatic authentication.
 *
 * Features:
 * - Fetch execution history with filtering and pagination
 * - View detailed execution information
 * - Re-run previous executions
 * - Export execution data as JSON
 * - Query executions by workflow or automation
 * - Error handling with typed responses
 *
 * Requirements Coverage:
 * - Requirement 8: Workflow Detail View and Execution History
 * - Requirement 12: Automation Execution Management and Monitoring
 * - Requirement 14: Execution History and State Inspection
 *
 * @module services/api/executions.api
 */

import { apiClient } from './client';
import type {
  WorkflowExecution,
  ExecutionFilterOptions,
  ExecutionStats,
  ExecutionExportData,
  StateChange,
  NodeExecutionLog,
  ExecutionTimelineEvent,
  RerunExecutionRequest,
} from '../../types/execution.types';
import type { ApiResponse, ApiListResponse, PaginatedResponse } from '../../types/api.types';

/**
 * Base path for executions API endpoints
 */
const EXECUTIONS_BASE_PATH = '/workscript/executions';

/**
 * Base path for workflow-related endpoints
 */
const WORKFLOWS_BASE_PATH = '/workscript/workflows';

/**
 * Base path for automations-related endpoints
 */
const AUTOMATIONS_BASE_PATH = '/workscript/automations';

// ============================================
// EXECUTION QUERIES
// ============================================

/**
 * Fetch all executions with optional filtering and pagination
 *
 * Retrieves a paginated list of workflow executions from the database.
 * Supports filtering by status, workflow, automation, date range, and more.
 *
 * @param filters - Optional filter options (status, workflowId, automationId, dateRange, etc.)
 * @returns Promise resolving to array of executions
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * // Fetch all executions
 * const executions = await fetchExecutions();
 *
 * // Fetch completed executions from a specific workflow
 * const filtered = await fetchExecutions({
 *   status: 'completed',
 *   workflowId: '123e4567-e89b-12d3-a456-426614174000',
 *   page: 1,
 *   pageSize: 20
 * });
 *
 * // Fetch executions from last 24 hours
 * const today = new Date();
 * const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
 * const recent = await fetchExecutions({
 *   startDate: yesterday,
 *   endDate: today,
 *   sortBy: 'startTime',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export async function fetchExecutions(
  filters?: ExecutionFilterOptions
): Promise<WorkflowExecution[]> {
  const response = await apiClient.get<ApiListResponse<WorkflowExecution>>(
    EXECUTIONS_BASE_PATH,
    { params: filters }
  );

  return response.data.items || response.data || [];
}

/**
 * Fetch a single execution by ID with all details
 *
 * Retrieves complete execution data including:
 * - Execution metadata (ID, workflow, status, timing)
 * - Initial and final state
 * - State change history
 * - Node execution logs
 * - Error details (if failed)
 *
 * @param id - Execution ID (UUID)
 * @returns Promise resolving to complete execution details
 * @throws Error if execution not found or request fails
 *
 * @example
 * ```typescript
 * const execution = await fetchExecution('550e8400-e29b-41d4-a716-446655440000');
 * console.log('Status:', execution.status);
 * console.log('Duration:', execution.duration);
 * console.log('Final state:', execution.finalState);
 * ```
 */
export async function fetchExecution(id: string): Promise<WorkflowExecution> {
  const response = await apiClient.get<ApiResponse<WorkflowExecution>>(
    `${EXECUTIONS_BASE_PATH}/${id}`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as WorkflowExecution;
}

/**
 * Fetch all executions for a specific workflow
 *
 * Retrieves execution history for a workflow with optional filtering.
 *
 * @param workflowId - Workflow ID (UUID)
 * @param filters - Optional filter options
 * @returns Promise resolving to array of workflow executions
 * @throws Error if workflow not found or request fails
 *
 * @example
 * ```typescript
 * // Fetch recent executions for a workflow
 * const executions = await fetchExecutionsByWorkflow(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   { status: 'completed', pageSize: 50 }
 * );
 * ```
 */
export async function fetchExecutionsByWorkflow(
  workflowId: string,
  filters?: ExecutionFilterOptions
): Promise<WorkflowExecution[]> {
  const response = await apiClient.get<ApiListResponse<WorkflowExecution>>(
    `${WORKFLOWS_BASE_PATH}/${workflowId}/executions`,
    { params: filters }
  );

  return response.data.items || response.data || [];
}

/**
 * Fetch all executions for a specific automation
 *
 * Retrieves execution history triggered by a specific automation.
 *
 * @param automationId - Automation ID (UUID)
 * @param filters - Optional filter options
 * @returns Promise resolving to array of automation executions
 * @throws Error if automation not found or request fails
 *
 * @example
 * ```typescript
 * // Fetch failed executions for an automation
 * const failures = await fetchExecutionsByAutomation(
 *   'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8',
 *   { status: 'failed', sortBy: 'startTime', sortOrder: 'desc' }
 * );
 * ```
 */
export async function fetchExecutionsByAutomation(
  automationId: string,
  filters?: ExecutionFilterOptions
): Promise<WorkflowExecution[]> {
  const response = await apiClient.get<ApiListResponse<WorkflowExecution>>(
    `${AUTOMATIONS_BASE_PATH}/${automationId}/executions`,
    { params: filters }
  );

  return response.data.items || response.data || [];
}

// ============================================
// EXECUTION ACTIONS
// ============================================

/**
 * Re-run a previous execution with the same or different initial state
 *
 * Creates a new execution by re-running a workflow with the same configuration
 * as a previous execution. Useful for retrying failed workflows or testing with
 * the same data.
 *
 * @param executionId - ID of the execution to re-run
 * @param request - Optional re-run configuration (useSameInitialState, overrideState, etc.)
 * @returns Promise resolving to the new execution created
 * @throws Error if execution not found or request fails
 *
 * @example
 * ```typescript
 * // Re-run with the same initial state
 * const newExecution = await rerunExecution('550e8400-e29b-41d4-a716-446655440000', {
 *   useSameInitialState: true
 * });
 * console.log('New execution ID:', newExecution.id);
 *
 * // Re-run with modified initial state
 * const modified = await rerunExecution('550e8400-e29b-41d4-a716-446655440000', {
 *   useSameInitialState: false,
 *   initialState: { user: 'Bob', role: 'admin' }
 * });
 * ```
 */
export async function rerunExecution(
  executionId: string,
  request?: Partial<RerunExecutionRequest>
): Promise<WorkflowExecution> {
  const payload: RerunExecutionRequest = {
    executionId,
    useSameInitialState: request?.useSameInitialState ?? true,
    initialState: request?.initialState,
    options: request?.options,
  };

  const response = await apiClient.post<ApiResponse<WorkflowExecution>>(
    `${EXECUTIONS_BASE_PATH}/${executionId}/rerun`,
    payload
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as WorkflowExecution;
}

/**
 * Export an execution as JSON file
 *
 * Downloads a complete execution record including metadata, state changes,
 * node logs, and timeline events as a JSON file.
 *
 * @param executionId - Execution ID to export
 * @param filename - Optional custom filename (defaults to execution ID)
 *
 * @example
 * ```typescript
 * // Export execution data
 * await exportExecution('550e8400-e29b-41d4-a716-446655440000');
 * // Downloads: 550e8400-e29b-41d4-a716-446655440000.json
 *
 * // Export with custom filename
 * await exportExecution('550e8400-e29b-41d4-a716-446655440000', 'my-workflow-run.json');
 * ```
 */
export async function exportExecution(
  executionId: string,
  filename?: string
): Promise<void> {
  try {
    // Fetch the full execution data
    const execution = await fetchExecution(executionId);

    // Fetch additional execution details
    const [stateChanges, nodeLogs, events] = await Promise.all([
      fetchExecutionStateChanges(executionId),
      fetchExecutionNodeLogs(executionId),
      fetchExecutionTimeline(executionId),
    ]);

    // Create export data structure
    const exportData: ExecutionExportData = {
      execution,
      stateChanges,
      nodeLogs,
      timeline: events,
      stateDiff: computeStateDiff(execution.initialState || {}, execution.finalState || {}),
      exportedAt: new Date(),
      version: '1.0.0',
    };

    // Generate JSON
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${executionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting execution:', error);
    throw error;
  }
}

// ============================================
// EXECUTION DETAILS & ANALYTICS
// ============================================

/**
 * Fetch state changes for an execution
 *
 * @param executionId - Execution ID
 * @returns Promise resolving to array of state changes
 * @throws Error if request fails
 *
 * @internal
 * Used internally by exportExecution and execution detail views
 */
export async function fetchExecutionStateChanges(
  executionId: string
): Promise<StateChange[]> {
  const response = await apiClient.get<ApiListResponse<StateChange>>(
    `${EXECUTIONS_BASE_PATH}/${executionId}/state-changes`
  );

  return response.data.items || response.data || [];
}

/**
 * Fetch node execution logs for an execution
 *
 * @param executionId - Execution ID
 * @returns Promise resolving to array of node logs
 * @throws Error if request fails
 *
 * @internal
 * Used internally by exportExecution and execution detail views
 */
export async function fetchExecutionNodeLogs(
  executionId: string
): Promise<NodeExecutionLog[]> {
  const response = await apiClient.get<ApiListResponse<NodeExecutionLog>>(
    `${EXECUTIONS_BASE_PATH}/${executionId}/node-logs`
  );

  return response.data.items || response.data || [];
}

/**
 * Fetch timeline events for an execution
 *
 * @param executionId - Execution ID
 * @returns Promise resolving to array of timeline events
 * @throws Error if request fails
 *
 * @internal
 * Used internally by exportExecution and execution detail views
 */
export async function fetchExecutionTimeline(
  executionId: string
): Promise<ExecutionTimelineEvent[]> {
  const response = await apiClient.get<ApiListResponse<ExecutionTimelineEvent>>(
    `${EXECUTIONS_BASE_PATH}/${executionId}/timeline`
  );

  return response.data.items || response.data || [];
}

/**
 * Fetch execution statistics
 *
 * Retrieves aggregate statistics about executions across the system.
 *
 * @param filters - Optional filter options (workflow, automation, date range)
 * @returns Promise resolving to execution statistics
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const stats = await fetchExecutionStats({
 *   workflowId: '123e4567-e89b-12d3-a456-426614174000'
 * });
 * console.log('Success rate:', stats.successRate);
 * console.log('Average duration:', stats.averageDuration);
 * ```
 */
export async function fetchExecutionStats(
  filters?: ExecutionFilterOptions
): Promise<ExecutionStats> {
  const response = await apiClient.get<ApiResponse<ExecutionStats>>(
    `${EXECUTIONS_BASE_PATH}/stats`,
    { params: filters }
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as ExecutionStats;
}

/**
 * Fetch execution statistics for a specific workflow
 *
 * @param workflowId - Workflow ID
 * @returns Promise resolving to execution statistics for the workflow
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const stats = await fetchWorkflowExecutionStats('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function fetchWorkflowExecutionStats(
  workflowId: string
): Promise<ExecutionStats> {
  const response = await apiClient.get<ApiResponse<ExecutionStats>>(
    `${WORKFLOWS_BASE_PATH}/${workflowId}/execution-stats`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as ExecutionStats;
}

/**
 * Fetch execution statistics for a specific automation
 *
 * @param automationId - Automation ID
 * @returns Promise resolving to execution statistics for the automation
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const stats = await fetchAutomationExecutionStats('a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8');
 * ```
 */
export async function fetchAutomationExecutionStats(
  automationId: string
): Promise<ExecutionStats> {
  const response = await apiClient.get<ApiResponse<ExecutionStats>>(
    `${AUTOMATIONS_BASE_PATH}/${automationId}/execution-stats`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as ExecutionStats;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Compute state diff between initial and final state
 *
 * Helper function to determine what changed in the state during execution.
 *
 * @param initialState - Initial state object
 * @param finalState - Final state object
 * @returns State diff with added, removed, modified, and unchanged keys
 *
 * @internal
 * Used internally by exportExecution
 */
function computeStateDiff(
  initialState: Record<string, any>,
  finalState: Record<string, any>
) {
  const allKeys = new Set([...Object.keys(initialState), ...Object.keys(finalState)]);

  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ key: string; oldValue: any; newValue: any }> = [];
  const unchanged: string[] = [];

  allKeys.forEach((key) => {
    const initialValue = initialState[key];
    const finalValue = finalState[key];

    if (!(key in initialState)) {
      added.push(key);
    } else if (!(key in finalState)) {
      removed.push(key);
    } else if (JSON.stringify(initialValue) !== JSON.stringify(finalValue)) {
      modified.push({ key, oldValue: initialValue, newValue: finalValue });
    } else {
      unchanged.push(key);
    }
  });

  return {
    added,
    removed,
    modified,
    unchanged,
    changeCount: added.length + removed.length + modified.length,
  };
}

/**
 * Format execution duration for display
 *
 * Converts milliseconds to human-readable format (e.g., "2.5 seconds", "1 minute 30 seconds")
 *
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatExecutionDuration(2500); // "2.5 seconds"
 * formatExecutionDuration(90000); // "1 minute 30 seconds"
 * ```
 */
export function formatExecutionDuration(durationMs?: number | null): string {
  if (!durationMs || durationMs < 0) {
    return 'Unknown';
  }

  const seconds = Math.floor(durationMs / 1000);
  const milliseconds = durationMs % 1000;

  if (seconds === 0) {
    return `${milliseconds}ms`;
  }

  if (seconds < 60) {
    return milliseconds > 0
      ? `${seconds}.${Math.floor(milliseconds / 100)} seconds`
      : `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get execution status display color
 *
 * Returns a color class/value suitable for UI display based on execution status.
 *
 * @param status - Execution status
 * @returns Color identifier ('green', 'yellow', 'red', 'blue', 'gray')
 *
 * @example
 * ```typescript
 * const color = getExecutionStatusColor('completed'); // 'green'
 * const color = getExecutionStatusColor('failed'); // 'red'
 * ```
 */
export function getExecutionStatusColor(
  status: 'pending' | 'running' | 'completed' | 'failed'
): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'running':
      return 'blue';
    case 'pending':
      return 'yellow';
    default:
      return 'gray';
  }
}

/**
 * Check if an execution can be re-run
 *
 * @param execution - Execution to check
 * @returns true if execution can be re-run
 *
 * @example
 * ```typescript
 * if (canRerunExecution(execution)) {
 *   // Show re-run button
 * }
 * ```
 */
export function canRerunExecution(execution: WorkflowExecution): boolean {
  // Can re-run completed or failed executions
  return execution.status === 'completed' || execution.status === 'failed';
}

/**
 * Get execution error message for display
 *
 * @param execution - Execution with potential error
 * @returns Error message or undefined
 *
 * @example
 * ```typescript
 * const errorMsg = getExecutionErrorMessage(execution);
 * if (errorMsg) {
 *   console.error('Execution failed:', errorMsg);
 * }
 * ```
 */
export function getExecutionErrorMessage(execution: WorkflowExecution): string | undefined {
  if (execution.status === 'failed') {
    return execution.error || 'Unknown error';
  }
  return undefined;
}
