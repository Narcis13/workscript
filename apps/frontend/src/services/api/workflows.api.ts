/**
 * Workflows API Service
 *
 * Provides functions for interacting with workflow-related API endpoints.
 * All functions use the configured Axios client with automatic authentication.
 *
 * Features:
 * - Full CRUD operations for workflows
 * - Workflow validation
 * - Workflow execution
 * - Error handling with typed responses
 *
 * Requirements Coverage:
 * - Requirement 4: Workflow List Management and Navigation
 * - Requirement 5: Workflow Creation with Monaco Editor
 * - Requirement 6: Workflow Editing with Version Control
 * - Requirement 7: Workflow Execution and Testing
 * - Requirement 8: Workflow Detail View and Execution History
 *
 * @module services/api/workflows.api
 */

import { apiClient } from './client';
import type {
  Workflow,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
  ValidationResult,
  ExecutionResult,
  ExecuteWorkflowRequest,
  WorkflowFilterOptions,
  DuplicateWorkflowRequest,
} from '../../types/workflow.types';
import type { ApiResponse, ApiListResponse } from '../../types/api.types';
import type { WorkflowDefinition } from '@workscript/engine';

/**
 * Base path for workflow API endpoints
 */
const WORKFLOWS_BASE_PATH = '/workscript/workflows';

// ============================================
// WORKFLOW CRUD OPERATIONS
// ============================================

/**
 * Fetch all workflows from the database
 *
 * @param filters - Optional filter options
 * @returns Promise resolving to array of workflows
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const workflows = await fetchWorkflows({ search: 'test', isActive: true });
 * ```
 */
export async function fetchWorkflows(
  filters?: WorkflowFilterOptions
): Promise<Workflow[]> {
  const response = await apiClient.get<any>(
    `${WORKFLOWS_BASE_PATH}/allfromdb`,
    { params: filters }
  );

  // The API returns { success: true, count: number, workflows: Workflow[] }
  return response.data.workflows || response.data.items || response.data || [];
}

/**
 * Fetch a single workflow by ID
 *
 * @param id - Workflow ID (UUID)
 * @returns Promise resolving to workflow
 * @throws Error if workflow not found or request fails
 *
 * @example
 * ```typescript
 * const workflow = await fetchWorkflow('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function fetchWorkflow(id: string): Promise<Workflow> {
  const response = await apiClient.get<any>(
    `${WORKFLOWS_BASE_PATH}/${id}`
  );

  // The API returns { success: true, workflow: Workflow }
  if (response.data.workflow) {
    return response.data.workflow;
  }

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Workflow;
}

/**
 * Create a new workflow
 *
 * @param data - Workflow creation payload
 * @returns Promise resolving to created workflow
 * @throws Error if validation fails or request fails
 *
 * @example
 * ```typescript
 * const workflow = await createWorkflow({
 *   name: 'My Workflow',
 *   description: 'A test workflow',
 *   version: '1.0.0',
 *   definition: { id: 'test', name: 'Test', version: '1.0.0', workflow: [] }
 * });
 * ```
 */
export async function createWorkflow(
  data: CreateWorkflowPayload
): Promise<Workflow> {
  const response = await apiClient.post<any>(
    `${WORKFLOWS_BASE_PATH}/create`,
    data
  );

  // The API returns { success: true, message: string, workflow: Workflow }
  if (response.data.workflow) {
    return response.data.workflow;
  }

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Workflow;
}

/**
 * Update an existing workflow
 *
 * @param id - Workflow ID (UUID)
 * @param data - Workflow update payload
 * @returns Promise resolving to updated workflow
 * @throws Error if workflow not found or request fails
 *
 * @example
 * ```typescript
 * const updated = await updateWorkflow('123e4567-e89b-12d3-a456-426614174000', {
 *   name: 'Updated Workflow',
 *   isActive: false
 * });
 * ```
 */
export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowPayload
): Promise<Workflow> {
  const response = await apiClient.put<any>(
    `${WORKFLOWS_BASE_PATH}/${id}`,
    data
  );

  // The API returns { success: true, message: string, workflow: Workflow }
  if (response.data.workflow) {
    return response.data.workflow;
  }

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Workflow;
}

/**
 * Delete a workflow by ID
 *
 * @param id - Workflow ID (UUID)
 * @returns Promise resolving when deletion completes
 * @throws Error if workflow not found or request fails
 *
 * @example
 * ```typescript
 * await deleteWorkflow('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function deleteWorkflow(id: string): Promise<void> {
  await apiClient.delete(`${WORKFLOWS_BASE_PATH}/${id}`);
}

/**
 * Duplicate an existing workflow with a new name
 *
 * @param id - Workflow ID to duplicate
 * @param data - Duplication request with new name
 * @returns Promise resolving to new workflow
 * @throws Error if source workflow not found or request fails
 *
 * @example
 * ```typescript
 * const duplicate = await duplicateWorkflow('123e4567-e89b-12d3-a456-426614174000', {
 *   name: 'Copy of My Workflow'
 * });
 * ```
 */
export async function duplicateWorkflow(
  id: string,
  data: DuplicateWorkflowRequest
): Promise<Workflow> {
  const response = await apiClient.post<any>(
    `${WORKFLOWS_BASE_PATH}/${id}/duplicate`,
    data
  );

  // Handle different response formats
  if (response.data.workflow) {
    return response.data.workflow;
  }

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Workflow;
}

// ============================================
// WORKFLOW VALIDATION
// ============================================

/**
 * Validate a workflow definition
 *
 * Performs server-side validation including:
 * - JSON schema validation
 * - Semantic validation (node existence, edge validity)
 * - Reference validation ($.state paths)
 *
 * @param definition - Workflow definition to validate
 * @returns Promise resolving to validation result
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const result = await validateWorkflow({
 *   id: 'test',
 *   name: 'Test Workflow',
 *   version: '1.0.0',
 *   workflow: [{ 'math-1': { operation: 'add', values: [1, 2] } }]
 * });
 *
 * if (result.valid) {
 *   console.log('Workflow is valid!');
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export async function validateWorkflow(
  definition: WorkflowDefinition
): Promise<ValidationResult> {
  const response = await apiClient.post<any>(
    `${WORKFLOWS_BASE_PATH}/validate`,
    definition
  );

  // The API returns the validation result directly
  if (response.data.data) {
    return response.data.data;
  }

  return response.data as ValidationResult;
}

// ============================================
// WORKFLOW EXECUTION
// ============================================

/**
 * Execute a workflow immediately
 *
 * Executes a workflow definition with optional initial state.
 * This is for manual/test execution, not scheduled execution.
 *
 * @param definition - Workflow definition to execute
 * @param initialState - Optional initial state object
 * @returns Promise resolving to execution result
 * @throws Error if validation fails or execution fails
 *
 * @example
 * ```typescript
 * const result = await executeWorkflow(
 *   {
 *     id: 'test',
 *     name: 'Test Workflow',
 *     version: '1.0.0',
 *     workflow: [{ 'log-1': { message: 'Hello World' } }]
 *   },
 *   { user: 'Alice' }
 * );
 *
 * console.log('Final state:', result.state);
 * console.log('Execution duration:', result.duration);
 * ```
 */
export async function executeWorkflow(
  definition: WorkflowDefinition,
  initialState?: Record<string, any>
): Promise<ExecutionResult> {
  const payload: ExecuteWorkflowRequest = {
    definition,
    initialState,
  };

  const response = await apiClient.post<any>(
    `${WORKFLOWS_BASE_PATH}/run`,
    payload
  );

  // The API returns the execution result directly
  if (response.data.data) {
    return response.data.data;
  }

  return response.data as ExecutionResult;
}

/**
 * Execute a persisted workflow by ID
 *
 * @param workflowId - Workflow ID to execute
 * @param initialState - Optional initial state object
 * @returns Promise resolving to execution result
 * @throws Error if workflow not found or execution fails
 *
 * @example
 * ```typescript
 * const result = await executeWorkflowById('123e4567-e89b-12d3-a456-426614174000', {
 *   input: 'test data'
 * });
 * ```
 */
export async function executeWorkflowById(
  workflowId: string,
  initialState?: Record<string, any>
): Promise<ExecutionResult> {
  const payload: ExecuteWorkflowRequest = {
    workflowId,
    initialState,
  };

  const response = await apiClient.post<any>(
    `${WORKFLOWS_BASE_PATH}/run`,
    payload
  );

  // The API returns the execution result directly
  if (response.data.data) {
    return response.data.data;
  }

  return response.data as ExecutionResult;
}

// ============================================
// WORKFLOW METADATA & STATS
// ============================================

/**
 * Fetch workflow execution history
 *
 * @param workflowId - Workflow ID
 * @param limit - Maximum number of executions to return (default: 20)
 * @returns Promise resolving to array of execution results
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const executions = await fetchWorkflowExecutions('123e4567-e89b-12d3-a456-426614174000', 50);
 * ```
 */
export async function fetchWorkflowExecutions(
  workflowId: string,
  limit: number = 20
): Promise<ExecutionResult[]> {
  const response = await apiClient.get<any>(
    `${WORKFLOWS_BASE_PATH}/${workflowId}/executions`,
    { params: { limit } }
  );

  // Handle different response formats
  return response.data.executions || response.data.items || response.data || [];
}

/**
 * Fetch automations using a specific workflow
 *
 * @param workflowId - Workflow ID
 * @returns Promise resolving to array of automation IDs or objects
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const automations = await fetchWorkflowAutomations('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function fetchWorkflowAutomations(
  workflowId: string
): Promise<any[]> {
  const response = await apiClient.get<any>(
    `${WORKFLOWS_BASE_PATH}/${workflowId}/automations`
  );

  // Handle different response formats
  return response.data.automations || response.data.items || response.data || [];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a workflow is being used by any active automations
 *
 * @param workflowId - Workflow ID to check
 * @returns Promise resolving to boolean
 *
 * @example
 * ```typescript
 * const isUsed = await isWorkflowUsedByAutomations('123e4567-e89b-12d3-a456-426614174000');
 * if (isUsed) {
 *   console.warn('Warning: This workflow is used by active automations');
 * }
 * ```
 */
export async function isWorkflowUsedByAutomations(
  workflowId: string
): Promise<boolean> {
  try {
    const automations = await fetchWorkflowAutomations(workflowId);
    return automations.length > 0;
  } catch (error) {
    console.error('Error checking workflow usage:', error);
    return false;
  }
}

/**
 * Export workflow as JSON file
 *
 * Downloads the workflow definition as a JSON file.
 *
 * @param workflow - Workflow to export
 * @param filename - Optional custom filename (defaults to workflow name)
 *
 * @example
 * ```typescript
 * exportWorkflowAsJSON(workflow, 'my-workflow-backup.json');
 * ```
 */
export function exportWorkflowAsJSON(
  workflow: Workflow,
  filename?: string
): void {
  const exportData = {
    id: workflow.definition.id,
    name: workflow.definition.name,
    version: workflow.definition.version,
    description: workflow.description,
    initialState: workflow.definition.initialState,
    workflow: workflow.definition.workflow,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download =
    filename || `${workflow.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

/**
 * Format validation errors for display
 *
 * Converts validation result errors into a user-friendly format.
 *
 * @param validationResult - Validation result from API
 * @returns Array of formatted error messages
 *
 * @example
 * ```typescript
 * const errors = formatValidationErrors(result);
 * errors.forEach(error => console.error(error));
 * ```
 */
export function formatValidationErrors(
  validationResult: ValidationResult
): string[] {
  if (validationResult.valid || !validationResult.errors) {
    return [];
  }

  return validationResult.errors.map((error) => {
    const location = error.line
      ? `Line ${error.line}${error.column ? `:${error.column}` : ''}`
      : 'Unknown location';

    return `${location}: ${error.message}`;
  });
}

/**
 * Get execution status display text
 *
 * @param execution - Execution result
 * @returns Human-readable status text
 *
 * @example
 * ```typescript
 * const status = getExecutionStatusText(execution);
 * console.log(status); // "Completed successfully" or "Failed with errors"
 * ```
 */
export function getExecutionStatusText(execution: ExecutionResult): string {
  if (execution.error) {
    return 'Failed with errors';
  }

  if (execution.stateChanges && execution.stateChanges.length > 0) {
    return 'Completed successfully';
  }

  return 'Completed with no state changes';
}
