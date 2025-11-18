/**
 * Automation Type Definitions
 *
 * Type definitions for automation-related entities in the Workscript Main UI.
 * Automations schedule and trigger workflow executions automatically.
 *
 * @module automation.types
 */

import type { WorkflowDefinition } from '@workscript/engine';

/**
 * Trigger type enum
 *
 * Defines how an automation is triggered.
 */
export enum TriggerType {
  /** Cron-based scheduling */
  CRON = 'cron',

  /** Webhook HTTP endpoint */
  WEBHOOK = 'webhook',

  /** Manual trigger only */
  IMMEDIATE = 'immediate'
}

/**
 * Execution status enum
 *
 * Represents the status of an automation execution.
 */
export enum ExecutionStatus {
  /** Execution is queued but not yet started */
  PENDING = 'pending',

  /** Execution is currently running */
  RUNNING = 'running',

  /** Execution completed successfully */
  COMPLETED = 'completed',

  /** Execution failed with error */
  FAILED = 'failed',

  /** Execution was cancelled */
  CANCELLED = 'cancelled'
}

/**
 * Cron trigger configuration
 *
 * Configuration for cron-based automation scheduling.
 */
export interface CronTriggerConfig {
  /** Trigger type */
  type: TriggerType.CRON;

  /** Cron expression (e.g., "0 9 * * *") */
  expression: string;

  /** Timezone (e.g., "America/New_York", "UTC") */
  timezone?: string;

  /** Enable/disable the schedule */
  enabled?: boolean;
}

/**
 * Webhook trigger configuration
 *
 * Configuration for webhook-based automation triggering.
 */
export interface WebhookTriggerConfig {
  /** Trigger type */
  type: TriggerType.WEBHOOK;

  /** Webhook URL path (e.g., "/webhooks/my-automation") */
  path: string;

  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';

  /** Secret key for webhook authentication */
  secret?: string;

  /** Enable/disable the webhook */
  enabled?: boolean;
}

/**
 * Immediate trigger configuration
 *
 * Configuration for manual-only triggering.
 */
export interface ImmediateTriggerConfig {
  /** Trigger type */
  type: TriggerType.IMMEDIATE;

  /** Enable/disable manual triggering */
  enabled?: boolean;
}

/**
 * Union type for all trigger configurations
 */
export type TriggerConfig = CronTriggerConfig | WebhookTriggerConfig | ImmediateTriggerConfig;

/**
 * Automation entity from the database
 *
 * Represents a persisted automation with scheduling configuration.
 */
export interface Automation {
  /** Unique identifier (UUID) */
  id: string;

  /** Automation name */
  name: string;

  /** Optional description */
  description?: string;

  /** Associated workflow ID */
  workflowId: string;

  /** Associated workflow name (for display) */
  workflowName?: string;

  /** Associated workflow version */
  workflowVersion?: string;

  /** Trigger configuration */
  trigger: TriggerConfig;

  /** Whether the automation is enabled */
  enabled: boolean;

  /** Next scheduled run time (for cron triggers) */
  nextRunAt?: Date | string | null;

  /** Last run time */
  lastRunAt?: Date | string | null;

  /** Creation timestamp */
  createdAt: Date | string;

  /** Last update timestamp */
  updatedAt: Date | string;

  /** User ID of the creator */
  createdBy?: string;

  /** User ID of the last editor */
  updatedBy?: string;
}

/**
 * Automation creation payload
 *
 * Used when creating a new automation via the API.
 */
export interface CreateAutomationPayload {
  /** Automation name (required) */
  name: string;

  /** Optional description */
  description?: string;

  /** Associated workflow ID (required) */
  workflowId: string;

  /** Trigger configuration (required) */
  trigger: TriggerConfig;

  /** Whether the automation should be enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Automation update payload
 *
 * Used when updating an existing automation via the API.
 * All fields are optional except the automation ID.
 */
export interface UpdateAutomationPayload {
  /** Automation name */
  name?: string;

  /** Description */
  description?: string;

  /** Associated workflow ID */
  workflowId?: string;

  /** Trigger configuration */
  trigger?: TriggerConfig;

  /** Enabled status */
  enabled?: boolean;
}

/**
 * Automation execution record
 *
 * Represents a single execution of an automation.
 */
export interface AutomationExecution {
  /** Unique execution ID */
  id: string;

  /** Automation ID */
  automationId: string;

  /** Automation name */
  automationName?: string;

  /** Workflow ID */
  workflowId: string;

  /** Workflow name */
  workflowName?: string;

  /** Workflow execution ID */
  workflowExecutionId?: string;

  /** Execution status */
  status: ExecutionStatus;

  /** How the execution was triggered */
  triggeredBy: 'cron' | 'webhook' | 'manual';

  /** Execution start time */
  startTime: Date | string;

  /** Execution end time */
  endTime?: Date | string | null;

  /** Execution duration in milliseconds */
  duration?: number | null;

  /** Error message (if failed) */
  error?: string | null;

  /** Initial state passed to the workflow */
  initialState?: Record<string, any>;

  /** Final workflow state */
  finalState?: Record<string, any>;

  /** Execution result */
  result?: any;

  /** Creation timestamp */
  createdAt: Date | string;
}

/**
 * Automation statistics
 *
 * Aggregate statistics for an automation.
 */
export interface AutomationStats {
  /** Total number of executions */
  totalRuns: number;

  /** Number of successful executions */
  successCount: number;

  /** Number of failed executions */
  failureCount: number;

  /** Success rate (percentage, 0-100) */
  successRate: number;

  /** Average execution duration in milliseconds */
  averageDuration?: number;

  /** Last execution timestamp */
  lastRunAt?: Date | string | null;

  /** Next scheduled run (for cron triggers) */
  nextRunAt?: Date | string | null;
}

/**
 * Automation with statistics
 *
 * Automation entity with additional execution statistics.
 */
export interface AutomationWithStats extends Automation {
  /** Execution statistics */
  stats: AutomationStats;
}

/**
 * Cron validation result
 *
 * Result of validating a cron expression.
 */
export interface CronValidationResult {
  /** Whether the expression is valid */
  valid: boolean;

  /** Error message (if invalid) */
  error?: string;

  /** Next 5 execution times */
  nextRunTimes?: Date[];

  /** Human-readable description */
  description?: string;
}

/**
 * Cron preset definition
 *
 * Pre-defined cron expression templates.
 */
export interface CronPreset {
  /** Preset ID */
  id: string;

  /** Display label */
  label: string;

  /** Cron expression */
  expression: string;

  /** Human-readable description */
  description: string;
}

/**
 * Common cron presets
 */
export const CRON_PRESETS: CronPreset[] = [
  {
    id: 'every-minute',
    label: 'Every minute',
    expression: '* * * * *',
    description: 'Runs every minute'
  },
  {
    id: 'every-5-minutes',
    label: 'Every 5 minutes',
    expression: '*/5 * * * *',
    description: 'Runs every 5 minutes'
  },
  {
    id: 'every-hour',
    label: 'Every hour',
    expression: '0 * * * *',
    description: 'Runs at the start of every hour'
  },
  {
    id: 'daily-midnight',
    label: 'Every day at midnight',
    expression: '0 0 * * *',
    description: 'Runs once a day at midnight'
  },
  {
    id: 'daily-9am',
    label: 'Every day at 9 AM',
    expression: '0 9 * * *',
    description: 'Runs once a day at 9:00 AM'
  },
  {
    id: 'monday-9am',
    label: 'Every Monday at 9 AM',
    expression: '0 9 * * 1',
    description: 'Runs every Monday at 9:00 AM'
  },
  {
    id: 'first-of-month',
    label: 'First day of month',
    expression: '0 0 1 * *',
    description: 'Runs at midnight on the first day of each month'
  },
  {
    id: 'weekday-9am',
    label: 'Every weekday at 9 AM',
    expression: '0 9 * * 1-5',
    description: 'Runs Monday through Friday at 9:00 AM'
  }
];

/**
 * Automation list filter options
 */
export interface AutomationFilterOptions {
  /** Search query (matches name or description) */
  search?: string;

  /** Filter by enabled status */
  enabled?: boolean;

  /** Filter by trigger type */
  triggerType?: TriggerType;

  /** Filter by workflow ID */
  workflowId?: string;

  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'nextRunAt' | 'lastRunAt';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Page number (for pagination) */
  page?: number;

  /** Page size (for pagination) */
  pageSize?: number;
}

/**
 * Automation execution filter options
 */
export interface AutomationExecutionFilterOptions {
  /** Filter by automation ID */
  automationId?: string;

  /** Filter by workflow ID */
  workflowId?: string;

  /** Filter by execution status */
  status?: ExecutionStatus;

  /** Filter by trigger type */
  triggeredBy?: 'cron' | 'webhook' | 'manual';

  /** Filter by date range - start */
  startDate?: Date | string;

  /** Filter by date range - end */
  endDate?: Date | string;

  /** Sort field */
  sortBy?: 'startTime' | 'endTime' | 'duration' | 'status';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Page number (for pagination) */
  page?: number;

  /** Page size (for pagination) */
  pageSize?: number;
}

/**
 * Automation reschedule request
 *
 * Payload for rescheduling a cron automation.
 */
export interface RescheduleAutomationRequest {
  /** New cron expression */
  expression: string;

  /** New timezone (optional) */
  timezone?: string;
}

/**
 * Automation toggle request
 *
 * Payload for enabling/disabling an automation.
 */
export interface ToggleAutomationRequest {
  /** New enabled status */
  enabled: boolean;
}

/**
 * Automation summary statistics
 *
 * Aggregate data about automations in the system.
 */
export interface AutomationSummaryStats {
  /** Total number of automations */
  total: number;

  /** Number of enabled automations */
  enabled: number;

  /** Number of disabled automations */
  disabled: number;

  /** Breakdown by trigger type */
  byTriggerType: {
    cron: number;
    webhook: number;
    immediate: number;
  };

  /** Total number of executions across all automations */
  totalExecutions: number;

  /** Overall success rate (percentage) */
  successRate?: number;

  /** Number of automations with recent failures */
  recentFailures?: number;

  /** Number of automations scheduled in the next 24 hours */
  scheduledNext24h?: number;
}
