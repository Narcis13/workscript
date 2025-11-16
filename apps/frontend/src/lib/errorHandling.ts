/**
 * Error Handling Utilities
 *
 * Centralized error handling utilities for mapping API error codes
 * to user-friendly error messages.
 *
 * Features:
 * - HTTP status code to message mapping
 * - Context-aware error messages
 * - Security-conscious error messages (no sensitive data exposure)
 * - Special handling for authentication errors
 * - Network error handling
 *
 * Requirements Coverage:
 * - Requirement 14: Error Handling and User Feedback
 *
 * @module lib/errorHandling
 */

import { AxiosError } from 'axios';

/**
 * Error context types for context-aware error messages
 */
export type ErrorContext =
  | 'login'
  | 'register'
  | 'logout'
  | 'changePassword'
  | 'resetPassword'
  | 'fetchUser'
  | 'refreshToken'
  | 'general';

/**
 * Standard error message templates
 * Maps HTTP status codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<number, string> = {
  // Client Errors (4xx)
  400: 'Invalid request. Please check your input and try again.',
  401: 'Invalid credentials. Please check your email and password.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This email address is already registered. Please log in instead.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many attempts. Please wait 15 minutes before trying again.',

  // Server Errors (5xx)
  500: 'An unexpected server error occurred. Please try again later.',
  502: 'Service temporarily unavailable. Please try again in a few moments.',
  503: 'Service is currently under maintenance. Please try again later.',
  504: 'The request took too long to process. Please try again.',
};

/**
 * Context-specific error message overrides
 * Provides more specific messages based on the operation context
 */
const CONTEXT_SPECIFIC_MESSAGES: Record<ErrorContext, Partial<Record<number, string>>> = {
  login: {
    401: 'Invalid email or password. Please try again.',
    429: 'Account locked due to too many failed login attempts. Please wait 15 minutes and try again.',
    403: 'Your account has been disabled. Please contact support.',
  },
  register: {
    409: 'This email address is already registered. Please log in or use a different email.',
    400: 'Please ensure all fields are filled correctly.',
  },
  logout: {
    401: 'Your session has expired. You have been logged out.',
  },
  changePassword: {
    401: 'Current password is incorrect. Please try again.',
    400: 'New password does not meet security requirements. Please ensure it has at least 8 characters, including uppercase, lowercase, and a number.',
  },
  resetPassword: {
    404: 'No account found with this email address.',
    400: 'Invalid or expired reset link. Please request a new one.',
  },
  fetchUser: {
    401: 'Your session has expired. Please log in again.',
    404: 'User account not found.',
  },
  refreshToken: {
    401: 'Your session has expired. Please log in again.',
    403: 'Invalid session. Please log in again.',
  },
  general: {},
};

/**
 * Network error messages
 */
const NETWORK_ERRORS = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  TIMEOUT: 'The request took too long to complete. Please try again.',
  CANCELLED: 'The request was cancelled. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

/**
 * Default fallback error message
 */
const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again.';

/**
 * Extract error message from Axios error response
 *
 * @param error - Axios error object
 * @returns Extracted error message or null
 */
function extractApiErrorMessage(error: AxiosError): string | null {
  if (!error.response?.data) {
    return null;
  }

  const data = error.response.data as any;

  // Try different possible error message fields
  if (typeof data.error === 'string') {
    return data.error;
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    // For validation errors, combine multiple messages
    return data.errors.map((err: any) => err.message || err).join(', ');
  }

  return null;
}

/**
 * Check if error contains sensitive information that should be sanitized
 *
 * @param message - Error message to check
 * @returns true if message contains sensitive info
 *
 * TODO: Expand sensitive patterns to include more PII (phone numbers, addresses, etc.)
 * TODO: Consider using a dedicated PII detection library for production
 */
function containsSensitiveInfo(message: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /database/i,
    /sql/i,
    /stack trace/i,
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email in error (except when it's the context)
  ];

  return sensitivePatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitize error message to remove sensitive information
 *
 * @param message - Error message to sanitize
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(message: string): string {
  if (containsSensitiveInfo(message)) {
    return DEFAULT_ERROR_MESSAGE;
  }
  return message;
}

/**
 * Get user-friendly error message from error object
 *
 * This is the main function to use for error handling throughout the app.
 * It analyzes the error and returns an appropriate user-friendly message.
 *
 * @param error - Error object (AxiosError, Error, or unknown)
 * @param context - Context of the error for more specific messages
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await authService.login(email, password);
 * } catch (error) {
 *   const message = getErrorMessage(error, 'login');
 *   setError(message);
 * }
 * ```
 */
export function getErrorMessage(error: unknown, context: ErrorContext = 'general'): string {
  // Handle Axios errors
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Network errors (no response from server)
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        return NETWORK_ERRORS.TIMEOUT;
      }
      if (axiosError.code === 'ERR_CANCELED') {
        return NETWORK_ERRORS.CANCELLED;
      }
      return NETWORK_ERRORS.NETWORK_ERROR;
    }

    const status = axiosError.response.status;

    // Try to get context-specific message first
    const contextMessages = CONTEXT_SPECIFIC_MESSAGES[context];
    if (contextMessages && contextMessages[status]) {
      return contextMessages[status]!;
    }

    // Try to extract API error message
    const apiMessage = extractApiErrorMessage(axiosError);
    if (apiMessage) {
      // Sanitize API message to ensure no sensitive data
      const sanitized = sanitizeErrorMessage(apiMessage);
      if (sanitized !== DEFAULT_ERROR_MESSAGE) {
        return sanitized;
      }
    }

    // Fall back to standard status code message
    if (ERROR_MESSAGES[status]) {
      return ERROR_MESSAGES[status];
    }

    // If status code not in our map, return generic message
    return DEFAULT_ERROR_MESSAGE;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Don't expose internal error messages that might contain sensitive info
    const sanitized = sanitizeErrorMessage(error.message);
    if (sanitized !== DEFAULT_ERROR_MESSAGE) {
      return sanitized;
    }
  }

  // Unknown error type
  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Type guard to check if error is an AxiosError
 *
 * @param error - Error to check
 * @returns true if error is AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/**
 * Create a toast-friendly error object
 * Useful for components that use toast notifications
 *
 * @param error - Error object
 * @param context - Error context
 * @returns Object with title and description for toasts
 *
 * @example
 * ```typescript
 * const errorToast = getErrorToast(error, 'login');
 * toast.error(errorToast.description, { title: errorToast.title });
 * ```
 */
export function getErrorToast(
  error: unknown,
  context: ErrorContext = 'general'
): { title: string; description: string } {
  const message = getErrorMessage(error, context);

  // Determine title based on context
  const titles: Record<ErrorContext, string> = {
    login: 'Login Failed',
    register: 'Registration Failed',
    logout: 'Logout Error',
    changePassword: 'Password Change Failed',
    resetPassword: 'Password Reset Failed',
    fetchUser: 'Failed to Load User',
    refreshToken: 'Session Expired',
    general: 'Error',
  };

  return {
    title: titles[context] || titles.general,
    description: message,
  };
}

/**
 * Check if an error is a network error
 *
 * @param error - Error to check
 * @returns true if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  return !error.response && error.code !== 'ERR_CANCELED';
}

/**
 * Check if an error is an authentication error
 *
 * @param error - Error to check
 * @returns true if error is 401 or 403
 */
export function isAuthError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 401 || status === 403;
}

/**
 * Check if an error is a validation error
 *
 * @param error - Error to check
 * @returns true if error is 400 or 422
 */
export function isValidationError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 400 || status === 422;
}

/**
 * Check if an error is a rate limit error
 *
 * @param error - Error to check
 * @returns true if error is 429
 */
export function isRateLimitError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 429;
}

/**
 * Get retry-after time from rate limit error
 *
 * @param error - Error object
 * @returns Retry-after time in seconds, or null if not available
 */
export function getRetryAfter(error: unknown): number | null {
  if (!isRateLimitError(error)) {
    return null;
  }

  const axiosError = error as AxiosError;
  const retryAfter = axiosError.response?.headers['retry-after'];

  if (!retryAfter) {
    // Default to 15 minutes for account lockout
    return 900; // 15 minutes in seconds
  }

  const seconds = parseInt(retryAfter, 10);
  return isNaN(seconds) ? null : seconds;
}

/**
 * Format retry-after time in human-readable format
 *
 * @param seconds - Number of seconds
 * @returns Human-readable time string
 *
 * @example
 * ```typescript
 * formatRetryAfter(900) // "15 minutes"
 * formatRetryAfter(60)  // "1 minute"
 * formatRetryAfter(30)  // "30 seconds"
 * ```
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}
