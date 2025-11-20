/**
 * Automations API Service
 *
 * Provides functions for interacting with automation-related API endpoints.
 * All functions use the configured Axios client with automatic authentication.
 *
 * Features:
 * - Full CRUD operations for automations
 * - Automation enable/disable toggle
 * - Manual automation execution
 * - Cron rescheduling for cron-based automations
 * - Cron expression validation
 * - Automation execution history
 * - Error handling with typed responses
 *
 * Requirements Coverage:
 * - Requirement 9: Automation List Management and Filtering
 * - Requirement 10: Automation Creation with Trigger Configuration
 * - Requirement 11: Cron Expression Builder and Validator
 * - Requirement 12: Automation Execution Management and Monitoring
 *
 * @module services/api/automations.api
 */

import { apiClient } from './client';
import type {
  Automation,
  AutomationWithStats,
  CreateAutomationPayload,
  UpdateAutomationPayload,
  AutomationExecution,
  AutomationStats,
  AutomationFilterOptions,
  AutomationExecutionFilterOptions,
  RescheduleAutomationRequest,
  ToggleAutomationRequest,
  CronValidationResult,
  AutomationSummaryStats,
  TriggerConfig,
} from '../../types/automation.types';
import type { ApiResponse, ApiListResponse } from '../../types/api.types';

/**
 * Base path for automation API endpoints
 */
const AUTOMATIONS_BASE_PATH = '/workscript/automations';

// ============================================
// AUTOMATION CRUD OPERATIONS
// ============================================

/**
 * Fetch all automations from the database
 *
 * Supports filtering by trigger type, enabled status, workflow ID, and search.
 * Results can be sorted and paginated.
 *
 * @param filters - Optional filter and pagination options
 * @returns Promise resolving to array of automations
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * // Fetch all automations
 * const automations = await fetchAutomations();
 *
 * // Fetch only enabled cron automations
 * const cronAutomations = await fetchAutomations({
 *   enabled: true,
 *   triggerType: TriggerType.CRON
 * });
 *
 * // Fetch with search and pagination
 * const results = await fetchAutomations({
 *   search: 'daily report',
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export async function fetchAutomations(
  filters?: AutomationFilterOptions
): Promise<Automation[]> {
  const response = await apiClient.get<ApiListResponse<Automation>>(
    AUTOMATIONS_BASE_PATH,
    { params: filters }
  );

  return (response.data.items || (response.data as any) || []) as Automation[];
}

/**
 * Fetch a single automation by ID
 *
 * @param id - Automation ID (UUID)
 * @returns Promise resolving to automation
 * @throws Error if automation not found or request fails
 *
 * @example
 * ```typescript
 * const automation = await fetchAutomation('123e4567-e89b-12d3-a456-426614174000');
 * console.log(automation.name, automation.trigger);
 * ```
 */
export async function fetchAutomation(id: string): Promise<Automation> {
  const response = await apiClient.get<ApiResponse<Automation>>(
    `${AUTOMATIONS_BASE_PATH}/${id}`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Automation;
}

/**
 * Fetch a single automation with execution statistics
 *
 * Returns an automation object enriched with execution statistics
 * (total runs, success/failure counts, average duration, etc.)
 *
 * @param id - Automation ID (UUID)
 * @returns Promise resolving to automation with statistics
 * @throws Error if automation not found or request fails
 *
 * @example
 * ```typescript
 * const automation = await fetchAutomationWithStats('123e4567-e89b-12d3-a456-426614174000');
 * console.log(`Success rate: ${automation.stats.successRate}%`);
 * console.log(`Total runs: ${automation.stats.totalRuns}`);
 * ```
 */
export async function fetchAutomationWithStats(
  id: string
): Promise<AutomationWithStats> {
  const response = await apiClient.get<ApiResponse<AutomationWithStats>>(
    `${AUTOMATIONS_BASE_PATH}/${id}/stats`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as AutomationWithStats;
}

/**
 * Create a new automation
 *
 * Creates an automation with the specified trigger configuration.
 * The automation can be created in enabled or disabled state.
 *
 * @param data - Automation creation payload
 * @returns Promise resolving to created automation
 * @throws Error if validation fails or request fails
 *
 * @example
 * ```typescript
 * // Create a cron automation
 * const automation = await createAutomation({
 *   name: 'Daily Report',
 *   description: 'Generate daily report at 9 AM',
 *   workflowId: 'workflow-123',
 *   trigger: {
 *     type: TriggerType.CRON,
 *     expression: '0 9 * * *',
 *     timezone: 'America/New_York'
 *   },
 *   enabled: true
 * });
 *
 * // Create a webhook automation
 * const webhookAutomation = await createAutomation({
 *   name: 'Process Webhook',
 *   workflowId: 'workflow-456',
 *   trigger: {
 *     type: TriggerType.WEBHOOK,
 *     path: '/webhooks/process-data',
 *     method: 'POST'
 *   }
 * });
 * ```
 */
export async function createAutomation(
  data: CreateAutomationPayload
): Promise<Automation> {
  const response = await apiClient.post<ApiResponse<Automation>>(
    AUTOMATIONS_BASE_PATH,
    data
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Automation;
}

/**
 * Update an existing automation
 *
 * All fields are optional - only provided fields will be updated.
 *
 * @param id - Automation ID (UUID)
 * @param data - Automation update payload
 * @returns Promise resolving to updated automation
 * @throws Error if automation not found or request fails
 *
 * @example
 * ```typescript
 * // Update name and description
 * const updated = await updateAutomation('123e4567-e89b-12d3-a456-426614174000', {
 *   name: 'Updated Daily Report',
 *   description: 'Now includes additional metrics'
 * });
 *
 * // Update trigger configuration
 * const rescheduled = await updateAutomation('123e4567-e89b-12d3-a456-426614174000', {
 *   trigger: {
 *     type: TriggerType.CRON,
 *     expression: '0 10 * * *', // Changed to 10 AM
 *     timezone: 'America/New_York'
 *   }
 * });
 * ```
 */
export async function updateAutomation(
  id: string,
  data: UpdateAutomationPayload
): Promise<Automation> {
  const response = await apiClient.put<ApiResponse<Automation>>(
    `${AUTOMATIONS_BASE_PATH}/${id}`,
    data
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Automation;
}

/**
 * Delete an automation by ID
 *
 * Deletes an automation and unschedules any pending executions.
 * This action cannot be undone.
 *
 * @param id - Automation ID (UUID)
 * @returns Promise resolving when deletion completes
 * @throws Error if automation not found or request fails
 *
 * @example
 * ```typescript
 * await deleteAutomation('123e4567-e89b-12d3-a456-426614174000');
 * console.log('Automation deleted successfully');
 * ```
 */
export async function deleteAutomation(id: string): Promise<void> {
  await apiClient.delete(`${AUTOMATIONS_BASE_PATH}/${id}`);
}

// ============================================
// AUTOMATION CONTROL OPERATIONS
// ============================================

/**
 * Toggle an automation's enabled status
 *
 * Enables or disables an automation. When disabled, scheduled executions
 * will not run, and webhooks will return 404.
 *
 * @param id - Automation ID (UUID)
 * @param enabled - New enabled status
 * @returns Promise resolving to updated automation
 * @throws Error if automation not found or request fails
 *
 * @example
 * ```typescript
 * // Disable an automation
 * const disabled = await toggleAutomation('123e4567-e89b-12d3-a456-426614174000', false);
 * console.log('Automation disabled:', !disabled.enabled);
 *
 * // Enable an automation
 * const enabled = await toggleAutomation('123e4567-e89b-12d3-a456-426614174000', true);
 * console.log('Next run at:', enabled.nextRunAt);
 * ```
 */
export async function toggleAutomation(
  id: string,
  enabled: boolean
): Promise<Automation> {
  const payload: ToggleAutomationRequest = { enabled };

  const response = await apiClient.patch<ApiResponse<Automation>>(
    `${AUTOMATIONS_BASE_PATH}/${id}/toggle`,
    payload
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Automation;
}

/**
 * Execute an automation manually
 *
 * Triggers an immediate execution of the automation's workflow,
 * bypassing the normal scheduling/webhook trigger.
 *
 * @param id - Automation ID (UUID)
 * @param initialState - Optional initial state to pass to the workflow
 * @returns Promise resolving to execution details
 * @throws Error if automation not found, disabled, or execution fails
 *
 * @example
 * ```typescript
 * // Execute without initial state
 * const execution = await executeAutomation('123e4567-e89b-12d3-a456-426614174000');
 * console.log('Execution started:', execution.id);
 *
 * // Execute with custom initial state
 * const executionWithState = await executeAutomation(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   { testMode: true, userId: 'user-123' }
 * );
 * ```
 */
export async function executeAutomation(
  id: string,
  initialState?: Record<string, any>
): Promise<AutomationExecution> {
  const response = await apiClient.post<ApiResponse<AutomationExecution>>(
    `${AUTOMATIONS_BASE_PATH}/${id}/execute`,
    { initialState }
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as AutomationExecution;
}

/**
 * Reschedule a cron automation
 *
 * Updates the cron expression and/or timezone for a cron-based automation.
 * Only works for automations with TriggerType.CRON.
 *
 * @param id - Automation ID (UUID)
 * @param cronConfig - New cron configuration
 * @returns Promise resolving to updated automation with new schedule
 * @throws Error if automation not found, not a cron automation, or invalid cron expression
 *
 * @example
 * ```typescript
 * // Change schedule to run at 8 AM instead of 9 AM
 * const rescheduled = await rescheduleAutomation(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   {
 *     expression: '0 8 * * *',
 *     timezone: 'America/New_York'
 *   }
 * );
 * console.log('Next run:', rescheduled.nextRunAt);
 * ```
 */
export async function rescheduleAutomation(
  id: string,
  cronConfig: RescheduleAutomationRequest
): Promise<Automation> {
  const response = await apiClient.post<ApiResponse<Automation>>(
    `${AUTOMATIONS_BASE_PATH}/${id}/reschedule`,
    cronConfig
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as Automation;
}

// ============================================
// CRON VALIDATION
// ============================================

/**
 * Validate a cron expression
 *
 * Validates the syntax of a cron expression and calculates the next
 * 5 execution times. Useful for real-time validation in the UI.
 *
 * @param expression - Cron expression to validate (5-field format: minute hour day month weekday)
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Promise resolving to validation result with next run times
 * @throws Error if request fails (does not throw for invalid expressions)
 *
 * @example
 * ```typescript
 * // Validate a valid cron expression
 * const result = await validateCronExpression('0 9 * * *', 'America/New_York');
 * if (result.valid) {
 *   console.log('Valid! Next runs:', result.nextRunTimes);
 *   console.log('Description:', result.description);
 * }
 *
 * // Validate an invalid cron expression
 * const invalid = await validateCronExpression('99 99 * * *');
 * if (!invalid.valid) {
 *   console.error('Invalid:', invalid.error);
 * }
 * ```
 */
export async function validateCronExpression(
  expression: string,
  timezone?: string
): Promise<CronValidationResult> {
  const response = await apiClient.post<ApiResponse<CronValidationResult>>(
    `${AUTOMATIONS_BASE_PATH}/cron/validate`,
    { expression, timezone }
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as CronValidationResult;
}

// ============================================
// AUTOMATION EXECUTION HISTORY
// ============================================

/**
 * Fetch execution history for a specific automation
 *
 * @param automationId - Automation ID
 * @param filters - Optional filters for status, date range, pagination
 * @returns Promise resolving to array of execution records
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * // Fetch all executions
 * const executions = await fetchAutomationExecutions('123e4567-e89b-12d3-a456-426614174000');
 *
 * // Fetch only failed executions
 * const failures = await fetchAutomationExecutions(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   { status: ExecutionStatus.FAILED }
 * );
 *
 * // Fetch executions from last 24 hours with pagination
 * const recent = await fetchAutomationExecutions(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   {
 *     startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
 *     page: 1,
 *     pageSize: 20
 *   }
 * );
 * ```
 */
export async function fetchAutomationExecutions(
  automationId: string,
  filters?: Omit<AutomationExecutionFilterOptions, 'automationId'>
): Promise<AutomationExecution[]> {
  const response = await apiClient.get<ApiListResponse<AutomationExecution>>(
    `${AUTOMATIONS_BASE_PATH}/${automationId}/executions`,
    { params: filters }
  );

  return (response.data.items || (response.data as any) || []) as AutomationExecution[];
}

/**
 * Fetch a single execution by ID
 *
 * @param automationId - Automation ID
 * @param executionId - Execution ID
 * @returns Promise resolving to execution details
 * @throws Error if execution not found or request fails
 *
 * @example
 * ```typescript
 * const execution = await fetchAutomationExecution(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   'exec-789'
 * );
 * console.log('Status:', execution.status);
 * console.log('Duration:', execution.duration, 'ms');
 * ```
 */
export async function fetchAutomationExecution(
  automationId: string,
  executionId: string
): Promise<AutomationExecution> {
  const response = await apiClient.get<ApiResponse<AutomationExecution>>(
    `${AUTOMATIONS_BASE_PATH}/${automationId}/executions/${executionId}`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as AutomationExecution;
}

/**
 * Fetch execution statistics for an automation
 *
 * Returns aggregate statistics without the full automation object.
 *
 * @param automationId - Automation ID
 * @returns Promise resolving to execution statistics
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const stats = await fetchAutomationStats('123e4567-e89b-12d3-a456-426614174000');
 * console.log(`Success rate: ${stats.successRate}%`);
 * console.log(`Average duration: ${stats.averageDuration}ms`);
 * console.log(`Next run: ${stats.nextRunAt}`);
 * ```
 */
export async function fetchAutomationStats(
  automationId: string
): Promise<AutomationStats> {
  const response = await apiClient.get<ApiResponse<AutomationStats>>(
    `${AUTOMATIONS_BASE_PATH}/${automationId}/stats`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as AutomationStats;
}

// ============================================
// SYSTEM-WIDE STATISTICS
// ============================================

/**
 * Fetch summary statistics for all automations
 *
 * Returns aggregate data useful for dashboard displays:
 * - Total/enabled/disabled counts
 * - Breakdown by trigger type
 * - Overall success rate
 * - Automations scheduled in next 24h
 *
 * @returns Promise resolving to summary statistics
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const summary = await fetchAutomationSummaryStats();
 * console.log(`Total automations: ${summary.total}`);
 * console.log(`Enabled: ${summary.enabled}, Disabled: ${summary.disabled}`);
 * console.log(`Cron: ${summary.byTriggerType.cron}`);
 * console.log(`Webhooks: ${summary.byTriggerType.webhook}`);
 * console.log(`Overall success rate: ${summary.successRate}%`);
 * console.log(`Scheduled in next 24h: ${summary.scheduledNext24h}`);
 * ```
 */
export async function fetchAutomationSummaryStats(): Promise<AutomationSummaryStats> {
  const response = await apiClient.get<ApiResponse<AutomationSummaryStats>>(
    `${AUTOMATIONS_BASE_PATH}/stats/summary`
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as AutomationSummaryStats;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if an automation has recent failures
 *
 * Considers an automation to have recent failures if it has failed
 * at least 3 times in the last 10 executions.
 *
 * @param automationId - Automation ID to check
 * @returns Promise resolving to boolean
 *
 * @example
 * ```typescript
 * const hasFailures = await hasRecentFailures('123e4567-e89b-12d3-a456-426614174000');
 * if (hasFailures) {
 *   console.warn('Warning: This automation has recent failures');
 * }
 * ```
 */
export async function hasRecentFailures(automationId: string): Promise<boolean> {
  try {
    const stats = await fetchAutomationStats(automationId);

    // Check if success rate is below 70% (indicating recent failures)
    return stats.successRate < 70 && stats.totalRuns >= 5;
  } catch (error) {
    console.error('Error checking recent failures:', error);
    return false;
  }
}

/**
 * Format cron expression to human-readable text
 *
 * Converts common cron patterns to natural language.
 *
 * @param expression - Cron expression
 * @returns Human-readable description
 *
 * @example
 * ```typescript
 * const desc1 = formatCronExpression('0 9 * * *');
 * console.log(desc1); // "Every day at 9:00 AM"
 *
 * const desc2 = formatCronExpression('0 9 * * 1');
 * console.log(desc2); // "Every Monday at 9:00 AM"
 * ```
 */
export function formatCronExpression(expression: string): string {
  // Common patterns
  const patterns: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 0 * * *': 'Every day at midnight',
    '0 9 * * *': 'Every day at 9:00 AM',
    '0 12 * * *': 'Every day at noon',
    '0 18 * * *': 'Every day at 6:00 PM',
    '0 9 * * 1': 'Every Monday at 9:00 AM',
    '0 9 * * 1-5': 'Every weekday at 9:00 AM',
    '0 0 1 * *': 'At midnight on the 1st of every month',
  };

  if (patterns[expression]) {
    return patterns[expression];
  }

  // Basic pattern recognition
  const parts = expression.split(' ');
  if (parts.length !== 5) {
    return expression; // Invalid format, return as-is
  }

  const [minute, hour, day, month, weekday] = parts;

  // Try to build a basic description
  let description = 'At ';

  if (minute === '*' && hour === '*') {
    return 'Every minute';
  }

  if (hour !== '*' && minute !== '*') {
    description += `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } else if (minute.startsWith('*/')) {
    return `Every ${minute.slice(2)} minutes`;
  } else if (hour.startsWith('*/')) {
    return `Every ${hour.slice(2)} hours`;
  } else {
    return expression; // Can't parse, return as-is
  }

  if (weekday !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayNum = parseInt(weekday);
    if (!isNaN(weekdayNum)) {
      description += ` on ${days[weekdayNum]}`;
    }
  } else if (day !== '*') {
    description += ` on day ${day} of the month`;
  } else {
    description += ' every day';
  }

  return description;
}

/**
 * Get automation status display text
 *
 * @param automation - Automation object
 * @returns Human-readable status text
 *
 * @example
 * ```typescript
 * const status = getAutomationStatusText(automation);
 * console.log(status); // "Enabled - Next run in 2 hours" or "Disabled"
 * ```
 */
export function getAutomationStatusText(automation: Automation): string {
  if (!automation.enabled) {
    return 'Disabled';
  }

  if (automation.nextRunAt) {
    const nextRun = new Date(automation.nextRunAt);
    const now = new Date();
    const diffMs = nextRun.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `Enabled - Next run in ${days} day${days > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Enabled - Next run in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `Enabled - Next run in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'Enabled - Running soon';
    }
  }

  return 'Enabled';
}

/**
 * Export automation configuration as JSON file
 *
 * Downloads the automation configuration as a JSON file for backup or sharing.
 *
 * @param automation - Automation to export
 * @param filename - Optional custom filename (defaults to automation name)
 *
 * @example
 * ```typescript
 * exportAutomationAsJSON(automation, 'daily-report-automation.json');
 * ```
 */
export function exportAutomationAsJSON(
  automation: Automation,
  filename?: string
): void {
  const exportData = {
    name: automation.name,
    description: automation.description,
    workflowId: automation.workflowId,
    trigger: automation.trigger,
    enabled: automation.enabled,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download =
    filename || `${automation.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get execution status color for UI display
 *
 * Returns a Tailwind color class for status badges.
 *
 * @param status - Execution status
 * @returns Tailwind color class
 *
 * @example
 * ```typescript
 * const color = getExecutionStatusColor(execution.status);
 * <Badge className={color}>{execution.status}</Badge>
 * ```
 */
export function getExecutionStatusColor(
  status: AutomationExecution['status']
): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'running':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}
