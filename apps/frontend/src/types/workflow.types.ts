/**
 * Workflow Type Definitions
 *
 * Type definitions for workflow-related entities in the Workscript Main UI.
 * These types extend and complement the core types from @workscript/engine.
 *
 * @module workflow.types
 */

import type {
  WorkflowDefinition as EngineWorkflowDefinition,
  ValidationResult as EngineValidationResult,
  ExecutionResult as EngineExecutionResult,
  WorkflowStep
} from '@workscript/engine';

/**
 * Workflow entity from the database
 *
 * Represents a persisted workflow with metadata and definition.
 */
export interface Workflow {
  /** Unique identifier (UUID) */
  id: string;

  /** Workflow name */
  name: string;

  /** Optional description */
  description?: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Whether the workflow is active and can be executed */
  isActive: boolean;

  /** JSON workflow definition */
  definition: EngineWorkflowDefinition;

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
 * Workflow creation payload
 *
 * Used when creating a new workflow via the API.
 */
export interface CreateWorkflowPayload {
  /** Workflow name (required) */
  name: string;

  /** Optional description */
  description?: string;

  /** Semantic version (defaults to "1.0.0") */
  version?: string;

  /** JSON workflow definition (required) */
  definition: EngineWorkflowDefinition;

  /** Whether the workflow should be active (defaults to true) */
  isActive?: boolean;
}

/**
 * Workflow update payload
 *
 * Used when updating an existing workflow via the API.
 * All fields are optional except the workflow ID.
 */
export interface UpdateWorkflowPayload {
  /** Workflow name */
  name?: string;

  /** Description */
  description?: string;

  /** Version */
  version?: string;

  /** JSON workflow definition */
  definition?: EngineWorkflowDefinition;

  /** Active status */
  isActive?: boolean;
}

/**
 * Parsed workflow for execution
 *
 * Represents a workflow that has been validated and is ready for execution.
 * Extends the engine's WorkflowDefinition with additional metadata.
 */
export interface ParsedWorkflow extends EngineWorkflowDefinition {
  /** Database ID of the workflow (if persisted) */
  _id?: string;

  /** Whether the workflow is active */
  _isActive?: boolean;

  /** Validation status */
  _validated?: boolean;

  /** Parse timestamp */
  _parsedAt?: Date;
}

/**
 * Workflow validation result
 *
 * Extended validation result with additional frontend-specific information.
 */
export interface ValidationResult extends EngineValidationResult {
  /** Validation timestamp */
  validatedAt?: Date;

  /** Validation duration in milliseconds */
  duration?: number;

  /** Source of validation (client or server) */
  source?: 'client' | 'server';

  /** Warnings (non-blocking issues) */
  warnings?: ValidationWarning[];
}

/**
 * Validation warning
 *
 * Non-blocking issues that don't prevent workflow execution.
 */
export interface ValidationWarning {
  /** Path to the issue in the workflow */
  path: string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: string;

  /** Severity level */
  severity: 'info' | 'warning';

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Workflow execution result
 *
 * Extended execution result with additional metadata.
 */
export interface ExecutionResult extends EngineExecutionResult {
  /** Database ID of the execution record */
  _id?: string;

  /** Workflow name */
  workflowName?: string;

  /** Workflow version */
  workflowVersion?: string;

  /** Initial state */
  initialState?: Record<string, any>;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Node execution logs */
  nodeLogs?: NodeExecutionLog[];

  /** State changes timeline */
  stateChanges?: StateChange[];
}

/**
 * Node execution log
 *
 * Detailed log of a single node execution.
 */
export interface NodeExecutionLog {
  /** Node ID */
  nodeId: string;

  /** Node type */
  nodeType: string;

  /** Execution start time */
  startTime: Date;

  /** Execution end time */
  endTime?: Date;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Execution status */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /** Input configuration */
  config?: Record<string, any>;

  /** Output edges */
  edges?: Record<string, any>;

  /** Error message (if failed) */
  error?: string;

  /** State modifications made by this node */
  stateModifications?: Record<string, any>;
}

/**
 * State change record
 *
 * Represents a single state mutation during workflow execution.
 */
export interface StateChange {
  /** Timestamp of the change */
  timestamp: Date;

  /** Node that made the change */
  nodeId: string;

  /** State key that changed */
  key: string;

  /** Old value */
  oldValue: any;

  /** New value */
  newValue: any;

  /** Change operation */
  operation: 'set' | 'update' | 'delete';
}

/**
 * Workflow execution request
 *
 * Payload for manual workflow execution.
 */
export interface ExecuteWorkflowRequest {
  /** Workflow definition (if executing ad-hoc) */
  definition?: EngineWorkflowDefinition;

  /** Workflow ID (if executing persisted workflow) */
  workflowId?: string;

  /** Optional initial state */
  initialState?: Record<string, any>;

  /** Execution options */
  options?: {
    /** Timeout in milliseconds */
    timeout?: number;

    /** Enable debug mode */
    debug?: boolean;

    /** Skip validation */
    skipValidation?: boolean;
  };
}

/**
 * Workflow duplicate request
 *
 * Payload for duplicating a workflow with a new name.
 */
export interface DuplicateWorkflowRequest {
  /** New workflow name */
  name: string;

  /** Optional new description */
  description?: string;

  /** Optional new version */
  version?: string;
}

/**
 * Workflow list filter options
 */
export interface WorkflowFilterOptions {
  /** Search query (matches name or description) */
  search?: string;

  /** Filter by active status */
  isActive?: boolean;

  /** Filter by version */
  version?: string;

  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'version';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Page number (for pagination) */
  page?: number;

  /** Page size (for pagination) */
  pageSize?: number;
}

/**
 * Workflow summary statistics
 *
 * Aggregate data about workflows in the system.
 */
export interface WorkflowStats {
  /** Total number of workflows */
  total: number;

  /** Number of active workflows */
  active: number;

  /** Number of inactive workflows */
  inactive: number;

  /** Total number of executions across all workflows */
  totalExecutions: number;

  /** Average execution duration in milliseconds */
  avgExecutionDuration?: number;

  /** Success rate (percentage) */
  successRate?: number;
}

/**
 * Workflow with execution count
 *
 * Workflow entity with additional execution statistics.
 */
export interface WorkflowWithStats extends Workflow {
  /** Number of executions */
  executionCount: number;

  /** Number of successful executions */
  successCount: number;

  /** Number of failed executions */
  failureCount: number;

  /** Last execution timestamp */
  lastExecutedAt?: Date | string;

  /** Number of associated automations */
  automationCount?: number;
}
