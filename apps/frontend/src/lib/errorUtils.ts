/**
 * Error Utilities
 *
 * Centralized error handling utilities for the Integrations UI and across the application.
 * Provides consistent error message extraction, network error detection, and user-friendly
 * error formatting.
 *
 * Features:
 * - API error message extraction from various response formats
 * - Network connectivity error detection
 * - User-friendly fallback messages
 * - Structured error types for consistent handling
 *
 * Requirements Coverage:
 * - Requirement 15: Error Handling
 *
 * @module lib/errorUtils
 */

import { AxiosError } from 'axios';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Structured error information for UI display
 */
export interface ParsedError {
  /** User-friendly error message */
  message: string;
  /** HTTP status code if available */
  statusCode?: number;
  /** Whether this is a network/connectivity error */
  isNetworkError: boolean;
  /** Whether this error requires re-authentication */
  requiresReauth: boolean;
  /** Original error for debugging */
  originalError: unknown;
}

/**
 * API error response structure (from backend)
 */
interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  statusCode?: number;
  details?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default user-friendly error messages
 */
export const ErrorMessages = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request timed out. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  SERVER_ERROR: 'The server encountered an error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  BAD_REQUEST: 'The request was invalid. Please check your input and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  CONFLICT: 'This action could not be completed due to a conflict.',

  // Integration-specific messages
  PROVIDER_LOAD_FAILED: 'Failed to load available providers. Please try again.',
  CONNECTIONS_LOAD_FAILED: 'Failed to load your connections. Please try again.',
  CONNECTION_TEST_FAILED: 'Unable to test connection. Please try again.',
  CONNECTION_RENAME_FAILED: 'Failed to rename connection. Please try again.',
  CONNECTION_DELETE_FAILED: 'Failed to disconnect account. Please try again.',
  OAUTH_FLOW_FAILED: 'Failed to start authentication. Please try again.',
} as const;

// =============================================================================
// ERROR PARSING
// =============================================================================

/**
 * Parse an error into a structured format for UI display
 *
 * Handles various error types:
 * - Axios errors with response data
 * - Network errors (no response)
 * - Timeout errors
 * - Generic JavaScript errors
 * - Unknown error types
 *
 * @param error - The error to parse
 * @param fallbackMessage - Default message if error cannot be parsed
 * @returns Structured error information
 *
 * @example
 * ```typescript
 * try {
 *   await fetchConnections();
 * } catch (error) {
 *   const parsed = parseError(error, ErrorMessages.CONNECTIONS_LOAD_FAILED);
 *   if (parsed.isNetworkError) {
 *     showRetryableError(parsed.message);
 *   } else {
 *     showToast({ title: 'Error', description: parsed.message, variant: 'destructive' });
 *   }
 * }
 * ```
 */
export function parseError(
  error: unknown,
  fallbackMessage: string = ErrorMessages.UNKNOWN_ERROR
): ParsedError {
  // Handle Axios errors
  if (isAxiosError(error)) {
    return parseAxiosError(error, fallbackMessage);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      isNetworkError: isNetworkError(error),
      requiresReauth: false,
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error || fallbackMessage,
      isNetworkError: false,
      requiresReauth: false,
      originalError: error,
    };
  }

  // Unknown error type
  return {
    message: fallbackMessage,
    isNetworkError: false,
    requiresReauth: false,
    originalError: error,
  };
}

/**
 * Parse an Axios error into structured format
 *
 * @param error - Axios error to parse
 * @param fallbackMessage - Default message if error cannot be parsed
 * @returns Structured error information
 */
function parseAxiosError(
  error: AxiosError<ApiErrorResponse>,
  fallbackMessage: string
): ParsedError {
  const statusCode = error.response?.status;
  const responseData = error.response?.data;

  // Network error (no response received)
  if (!error.response) {
    // Check for timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        message: ErrorMessages.TIMEOUT_ERROR,
        isNetworkError: true,
        requiresReauth: false,
        originalError: error,
      };
    }

    // Check for network error
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return {
        message: ErrorMessages.NETWORK_ERROR,
        isNetworkError: true,
        requiresReauth: false,
        originalError: error,
      };
    }

    // Generic connection error
    return {
      message: ErrorMessages.NETWORK_ERROR,
      isNetworkError: true,
      requiresReauth: false,
      originalError: error,
    };
  }

  // Extract error message from response
  const message = extractErrorMessage(responseData, statusCode, fallbackMessage);

  // Determine if re-auth is required
  const requiresReauth = statusCode === 401;

  return {
    message,
    statusCode,
    isNetworkError: false,
    requiresReauth,
    originalError: error,
  };
}

/**
 * Extract user-friendly error message from API response
 *
 * @param data - Response data
 * @param statusCode - HTTP status code
 * @param fallbackMessage - Default message
 * @returns User-friendly error message
 */
function extractErrorMessage(
  data: ApiErrorResponse | undefined,
  statusCode: number | undefined,
  fallbackMessage: string
): string {
  // Try to get message from response data
  if (data) {
    // Check common error field names
    if (data.error && typeof data.error === 'string') {
      return data.error;
    }
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    if (data.details && typeof data.details === 'string') {
      return data.details;
    }
  }

  // Map status codes to user-friendly messages
  if (statusCode) {
    switch (statusCode) {
      case 400:
        return ErrorMessages.BAD_REQUEST;
      case 401:
        return ErrorMessages.UNAUTHORIZED;
      case 403:
        return ErrorMessages.FORBIDDEN;
      case 404:
        return ErrorMessages.NOT_FOUND;
      case 409:
        return ErrorMessages.CONFLICT;
      case 429:
        return ErrorMessages.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorMessages.SERVER_ERROR;
      default:
        // For other 4xx errors, use fallback
        if (statusCode >= 400 && statusCode < 500) {
          return fallbackMessage;
        }
        // For other 5xx errors, use server error message
        if (statusCode >= 500) {
          return ErrorMessages.SERVER_ERROR;
        }
    }
  }

  return fallbackMessage;
}

// =============================================================================
// ERROR TYPE DETECTION
// =============================================================================

/**
 * Type guard for Axios errors
 *
 * @param error - Error to check
 * @returns true if error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Check if an error is a network/connectivity error
 *
 * @param error - Error to check
 * @returns true if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  // Check Axios network error
  if (isAxiosError(error)) {
    // No response means network error
    if (!error.response) {
      return true;
    }
    // Check error codes
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return true;
    }
  }

  // Check standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('connection refused') ||
      message.includes('timeout')
    );
  }

  return false;
}

/**
 * Check if an error requires re-authentication
 *
 * @param error - Error to check
 * @returns true if error indicates auth failure
 */
export function requiresReauth(error: unknown): boolean {
  if (isAxiosError(error)) {
    return error.response?.status === 401;
  }
  return false;
}

// =============================================================================
// ERROR MESSAGE FORMATTING
// =============================================================================

/**
 * Get user-friendly error message from any error type
 *
 * Simplified helper that just returns the message string.
 *
 * @param error - Error to extract message from
 * @param fallbackMessage - Default message if extraction fails
 * @returns User-friendly error message string
 *
 * @example
 * ```typescript
 * toast.error('Operation failed', {
 *   description: getErrorMessage(error, 'Please try again'),
 * });
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage: string = ErrorMessages.UNKNOWN_ERROR
): string {
  return parseError(error, fallbackMessage).message;
}

/**
 * Format error for console logging (development)
 *
 * @param error - Error to format
 * @param context - Additional context about where the error occurred
 */
export function logError(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    const parsed = parseError(error);
    console.error(
      `[Error${context ? ` in ${context}` : ''}]:`,
      {
        message: parsed.message,
        statusCode: parsed.statusCode,
        isNetworkError: parsed.isNetworkError,
        requiresReauth: parsed.requiresReauth,
        originalError: parsed.originalError,
      }
    );
  }
}

// =============================================================================
// RETRY LOGIC HELPERS
// =============================================================================

/**
 * Check if an error is retryable
 *
 * Network errors and some server errors are typically retryable.
 * Client errors (4xx except 408, 429) are not retryable.
 *
 * @param error - Error to check
 * @returns true if the operation should be retried
 */
export function isRetryableError(error: unknown): boolean {
  const parsed = parseError(error);

  // Network errors are retryable
  if (parsed.isNetworkError) {
    return true;
  }

  // Auth errors should not be retried (need re-login)
  if (parsed.requiresReauth) {
    return false;
  }

  // Server errors are typically retryable
  if (parsed.statusCode && parsed.statusCode >= 500) {
    return true;
  }

  // Rate limiting is retryable (after waiting)
  if (parsed.statusCode === 429) {
    return true;
  }

  // Timeout errors are retryable
  if (parsed.statusCode === 408) {
    return true;
  }

  // Other client errors are not retryable
  return false;
}
