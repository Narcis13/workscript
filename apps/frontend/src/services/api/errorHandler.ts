/**
 * API Error Handler Utility
 *
 * Specialized error handling for API layer with HTTP status code mapping.
 * This module complements the general error handling in lib/errorHandling.ts
 * by providing API-specific error handling utilities.
 *
 * Features:
 * - HTTP status code to user-friendly message mapping
 * - API error response parsing
 * - Context-aware error messages for API operations
 * - Error type checking utilities
 *
 * Requirements Coverage:
 * - Requirement 19: Error Handling, Validation, and User Feedback
 *
 * @module services/api/errorHandler
 */

import { AxiosError } from 'axios';
import { getErrorMessage, isAxiosError, isNetworkError } from '../../lib/errorHandling';

/**
 * API operation contexts for better error messaging
 */
export type ApiErrorContext =
  | 'workflow'
  | 'automation'
  | 'node'
  | 'execution'
  | 'validation'
  | 'websocket'
  | 'general';

/**
 * Structured API error object
 */
export interface ApiError {
  /** HTTP status code */
  status?: number;
  /** Error message */
  message: string;
  /** Original error object */
  error: unknown;
  /** Whether this is a network error */
  isNetworkError: boolean;
  /** Whether this is a validation error */
  isValidationError: boolean;
  /** Additional error details from API response */
  details?: any;
}

/**
 * HTTP status code to user-friendly message mapping for API operations
 */
const API_ERROR_MESSAGES: Record<number, string> = {
  // Client Errors (4xx)
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found. It may have been deleted or the URL is incorrect.',
  409: 'This operation conflicts with existing data. Please refresh and try again.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please wait a moment before trying again.',

  // Server Errors (5xx)
  500: 'An unexpected server error occurred. Please try again or contact support.',
  502: 'The server is temporarily unavailable. Please try again in a few moments.',
  503: 'The service is currently under maintenance. Please try again later.',
  504: 'The request took too long to process. Please try again.',
};

/**
 * Context-specific error messages for different API operations
 */
const CONTEXT_ERROR_MESSAGES: Record<ApiErrorContext, Partial<Record<number, string>>> = {
  workflow: {
    404: 'Workflow not found. It may have been deleted.',
    409: 'A workflow with this name already exists.',
    422: 'Workflow validation failed. Please check the workflow definition.',
  },
  automation: {
    404: 'Automation not found. It may have been deleted.',
    409: 'An automation with this name already exists.',
    422: 'Automation configuration is invalid. Please check the trigger settings.',
  },
  node: {
    404: 'Node not found. This node may not be available in your environment.',
    422: 'Node configuration is invalid. Please check the config parameters.',
  },
  execution: {
    404: 'Execution not found. It may have been deleted.',
    422: 'Execution failed. Please check the workflow definition and initial state.',
  },
  validation: {
    400: 'Validation failed. Please check your input.',
    422: 'The provided data does not meet validation requirements.',
  },
  websocket: {
    401: 'WebSocket authentication failed. Please refresh the page.',
    503: 'WebSocket service is temporarily unavailable.',
  },
  general: {},
};

/**
 * Parse API error response to extract error details
 *
 * @param error - Axios error object
 * @returns Structured API error object
 */
export function parseApiError(error: unknown, context: ApiErrorContext = 'general'): ApiError {
  // Handle non-Axios errors
  if (!isAxiosError(error)) {
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      error,
      isNetworkError: false,
      isValidationError: false,
    };
  }

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  const isNetwork = isNetworkError(error);
  const isValidation = status === 400 || status === 422;

  // Try to get context-specific message
  let message: string;
  if (status && CONTEXT_ERROR_MESSAGES[context][status]) {
    message = CONTEXT_ERROR_MESSAGES[context][status]!;
  } else if (status && API_ERROR_MESSAGES[status]) {
    message = API_ERROR_MESSAGES[status];
  } else {
    message = getErrorMessage(error, 'general');
  }

  // Extract additional details from response
  const details = extractErrorDetails(axiosError);

  return {
    status,
    message,
    error,
    isNetworkError: isNetwork,
    isValidationError: isValidation,
    details,
  };
}

/**
 * Extract error details from Axios error response
 *
 * @param error - Axios error object
 * @returns Error details object or undefined
 */
function extractErrorDetails(error: AxiosError): any {
  if (!error.response?.data) {
    return undefined;
  }

  const data = error.response.data as any;

  // Extract common error detail fields
  const details: any = {};

  if (data.errors) {
    details.errors = data.errors;
  }

  if (data.validationErrors) {
    details.validationErrors = data.validationErrors;
  }

  if (data.field) {
    details.field = data.field;
  }

  if (data.code) {
    details.code = data.code;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

/**
 * Get user-friendly error message for API errors
 *
 * @param error - Error object
 * @param context - API operation context
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.post('/workflows', workflowData);
 * } catch (error) {
 *   const message = getApiErrorMessage(error, 'workflow');
 *   toast.error(message);
 * }
 * ```
 */
export function getApiErrorMessage(error: unknown, context: ApiErrorContext = 'general'): string {
  const apiError = parseApiError(error, context);
  return apiError.message;
}

/**
 * Handle API error with toast notification
 * This is a convenience function for common error handling pattern
 *
 * @param error - Error object
 * @param context - API operation context
 * @param customHandler - Optional custom error handler
 * @returns Structured API error object
 *
 * @example
 * ```typescript
 * import { toast } from 'sonner';
 *
 * try {
 *   await apiClient.delete(`/workflows/${id}`);
 * } catch (error) {
 *   handleApiError(error, 'workflow', (apiError) => {
 *     toast.error(apiError.message);
 *   });
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context: ApiErrorContext = 'general',
  customHandler?: (apiError: ApiError) => void
): ApiError {
  const apiError = parseApiError(error, context);

  if (customHandler) {
    customHandler(apiError);
  }

  return apiError;
}

/**
 * Check if error is a specific HTTP status code
 *
 * @param error - Error object
 * @param status - HTTP status code to check
 * @returns true if error matches the status code
 */
export function isErrorStatus(error: unknown, status: number): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  return (error as AxiosError).response?.status === status;
}

/**
 * Check if error is a 404 Not Found error
 *
 * @param error - Error object
 * @returns true if error is 404
 */
export function isNotFoundError(error: unknown): boolean {
  return isErrorStatus(error, 404);
}

/**
 * Check if error is a 403 Forbidden error
 *
 * @param error - Error object
 * @returns true if error is 403
 */
export function isForbiddenError(error: unknown): boolean {
  return isErrorStatus(error, 403);
}

/**
 * Check if error is a 409 Conflict error
 *
 * @param error - Error object
 * @returns true if error is 409
 */
export function isConflictError(error: unknown): boolean {
  return isErrorStatus(error, 409);
}

/**
 * Check if error is a validation error (400 or 422)
 *
 * @param error - Error object
 * @returns true if error is validation error
 */
export function isApiValidationError(error: unknown): boolean {
  return isErrorStatus(error, 400) || isErrorStatus(error, 422);
}

/**
 * Extract validation errors from API response
 *
 * @param error - Error object
 * @returns Array of validation error messages or empty array
 *
 * @example
 * ```typescript
 * const validationErrors = extractValidationErrors(error);
 * if (validationErrors.length > 0) {
 *   validationErrors.forEach(err => console.log(err));
 * }
 * ```
 */
export function extractValidationErrors(error: unknown): string[] {
  if (!isAxiosError(error)) {
    return [];
  }

  const data = (error as AxiosError).response?.data as any;
  if (!data) {
    return [];
  }

  // Try different validation error formats
  if (Array.isArray(data.errors)) {
    return data.errors.map((err: any) =>
      typeof err === 'string' ? err : err.message || err.msg || String(err)
    );
  }

  if (Array.isArray(data.validationErrors)) {
    return data.validationErrors.map((err: any) =>
      typeof err === 'string' ? err : err.message || err.msg || String(err)
    );
  }

  if (typeof data.error === 'string') {
    return [data.error];
  }

  if (typeof data.message === 'string') {
    return [data.message];
  }

  return [];
}

/**
 * Create error object for toast notifications
 *
 * @param error - Error object
 * @param context - API operation context
 * @returns Object with title and description for toasts
 */
export function getApiErrorToast(
  error: unknown,
  context: ApiErrorContext = 'general'
): { title: string; description: string } {
  const apiError = parseApiError(error, context);

  const titles: Record<ApiErrorContext, string> = {
    workflow: 'Workflow Error',
    automation: 'Automation Error',
    node: 'Node Error',
    execution: 'Execution Error',
    validation: 'Validation Error',
    websocket: 'Connection Error',
    general: 'Error',
  };

  return {
    title: titles[context] || titles.general,
    description: apiError.message,
  };
}
