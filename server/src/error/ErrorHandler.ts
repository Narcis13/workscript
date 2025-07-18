import type { ExecutionContext } from 'shared/dist';
import { v4 as uuidv4 } from 'uuid';

/**
 * Error categories for workflow errors
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  RUNTIME = 'runtime',
  FLOW_CONTROL = 'flow_control',
  NODE_EXECUTION = 'node_execution',
  SYSTEM = 'system'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Interface for workflow errors
 */
export interface WorkflowError {
  id: string;
  category: ErrorCategory;
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  nodeId?: string;
  executionId?: string;
  workflowId?: string;
  context?: Record<string, any>;
  originalError?: Error;
  stack?: string;
}

/**
 * Interface for error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    id: string;
    category: string;
    code: string;
    message: string;
    severity: string;
    timestamp: string;
    details?: Record<string, any>;
  };
}

/**
 * ErrorHandler class for managing workflow errors
 * Provides centralized error handling, categorization, and response generation
 */
export class ErrorHandler {
  private errors: Map<string, WorkflowError> = new Map();
  private logger: Console;

  constructor(logger: Console = console) {
    this.logger = logger;
  }

  /**
   * Creates a workflow error object
   * @param category - Error category
   * @param code - Error code
   * @param message - Error message
   * @param severity - Error severity
   * @param context - Additional context information
   * @returns WorkflowError object
   */
  createError(
    category: ErrorCategory,
    code: string,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context?: {
      nodeId?: string;
      executionId?: string;
      workflowId?: string;
      originalError?: Error;
      data?: Record<string, any>;
    }
  ): WorkflowError {
    const errorId = `err_${uuidv4()}`;
    
    const error: WorkflowError = {
      id: errorId,
      category,
      code,
      message,
      severity,
      timestamp: new Date(),
      nodeId: context?.nodeId,
      executionId: context?.executionId,
      workflowId: context?.workflowId,
      context: context?.data,
      originalError: context?.originalError,
      stack: context?.originalError?.stack
    };
    
    // Store error for later retrieval
    this.errors.set(errorId, error);
    
    // Log error based on severity
    this.logError(error);
    
    return error;
  }

  /**
   * Handles an error during workflow execution
   * @param error - Error to handle
   * @param context - Execution context
   * @returns Error edge name to route to
   */
  handleExecutionError(
    error: Error | WorkflowError,
    context?: ExecutionContext
  ): string {
    let workflowError: WorkflowError;
    
    if (this.isWorkflowError(error)) {
      workflowError = error;
    } else {
      // Convert standard Error to WorkflowError
      workflowError = this.createError(
        ErrorCategory.NODE_EXECUTION,
        'node_execution_failed',
        error.message,
        ErrorSeverity.ERROR,
        {
          nodeId: context?.nodeId,
          executionId: context?.executionId,
          workflowId: context?.workflowId,
          originalError: error,
          data: context ? { inputs: context.inputs } : undefined
        }
      );
    }
    
    // Update execution context with error information if available
    if (context) {
      context.state = {
        ...context.state,
        error: {
          id: workflowError.id,
          message: workflowError.message,
          code: workflowError.code,
          category: workflowError.category,
          timestamp: workflowError.timestamp
        }
      };
    }
    
    // Return 'error' as the edge name for error routing
    return 'error';
  }

  /**
   * Logs an error based on its severity
   * @param error - Error to log
   */
  logError(error: WorkflowError): void {
    const logData = {
      errorId: error.id,
      category: error.category,
      code: error.code,
      nodeId: error.nodeId,
      executionId: error.executionId,
      workflowId: error.workflowId,
      context: error.context,
      timestamp: error.timestamp
    };
    
    switch (error.severity) {
      case ErrorSeverity.FATAL:
        this.logger.error(`FATAL ERROR: ${error.message}`, logData, error.stack);
        break;
      case ErrorSeverity.ERROR:
        this.logger.error(`ERROR: ${error.message}`, logData);
        break;
      case ErrorSeverity.WARNING:
        this.logger.warn(`WARNING: ${error.message}`, logData);
        break;
      case ErrorSeverity.INFO:
        this.logger.info(`INFO: ${error.message}`, logData);
        break;
    }
  }

  /**
   * Creates an API error response from a workflow error
   * @param error - Workflow error
   * @returns API error response
   */
  createErrorResponse(error: WorkflowError): ErrorResponse {
    return {
      success: false,
      error: {
        id: error.id,
        category: error.category,
        code: error.code,
        message: error.message,
        severity: error.severity,
        timestamp: error.timestamp.toISOString(),
        details: this.createErrorDetails(error)
      }
    };
  }

  /**
   * Gets an error by ID
   * @param errorId - Error ID
   * @returns WorkflowError or undefined if not found
   */
  getError(errorId: string): WorkflowError | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Gets all errors for an execution
   * @param executionId - Execution ID
   * @returns Array of workflow errors
   */
  getExecutionErrors(executionId: string): WorkflowError[] {
    return Array.from(this.errors.values())
      .filter(error => error.executionId === executionId);
  }

  /**
   * Cleans up errors for an execution
   * @param executionId - Execution ID
   */
  cleanupExecutionErrors(executionId: string): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.executionId === executionId) {
        this.errors.delete(id);
      }
    }
  }

  /**
   * Type guard to check if an error is a WorkflowError
   * @param error - Error to check
   * @returns Boolean indicating if error is a WorkflowError
   */
  private isWorkflowError(error: any): error is WorkflowError {
    return (
      error &&
      typeof error === 'object' &&
      'category' in error &&
      'code' in error &&
      'id' in error
    );
  }

  /**
   * Creates error details for API response
   * @param error - Workflow error
   * @returns Error details object
   */
  private createErrorDetails(error: WorkflowError): Record<string, any> {
    const details: Record<string, any> = {};
    
    if (error.nodeId) details.nodeId = error.nodeId;
    if (error.executionId) details.executionId = error.executionId;
    if (error.workflowId) details.workflowId = error.workflowId;
    if (error.context) details.context = error.context;
    
    // Include stack trace for non-production environments
    if (process.env.NODE_ENV !== 'production' && error.stack) {
      details.stack = error.stack;
    }
    
    return Object.keys(details).length > 0 ? details : undefined;
  }
}

/**
 * Factory function to create an ErrorHandler instance
 * @returns ErrorHandler instance
 */
export const createErrorHandler = (): ErrorHandler => {
  return new ErrorHandler();
};