/**
 * API Type Definitions
 *
 * Generic type definitions for API requests and responses.
 * These types provide consistent structure for all HTTP communication.
 *
 * @module api.types
 */

/**
 * Generic API response wrapper
 *
 * All API endpoints return responses in this structure.
 *
 * @template T - The type of the response data
 */
export interface ApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;

  /** Response data */
  data?: T;

  /** Error message (if failed) */
  error?: string;

  /** Detailed error information */
  errorDetails?: {
    /** Error code */
    code?: string;

    /** Field-specific errors */
    fieldErrors?: Record<string, string[]>;

    /** Stack trace (in development mode) */
    stackTrace?: string;
  };

  /** Response metadata */
  meta?: {
    /** Request timestamp */
    timestamp?: number;

    /** Request ID for tracking */
    requestId?: string;

    /** API version */
    version?: string;
  };
}

/**
 * API error response
 *
 * Standard error response structure.
 */
export interface ApiError {
  /** Error message */
  message: string;

  /** HTTP status code */
  statusCode: number;

  /** Error code */
  code?: string;

  /** Field-specific validation errors */
  fieldErrors?: Record<string, string[]>;

  /** Additional error details */
  details?: Record<string, any>;

  /** Error timestamp */
  timestamp: number;

  /** Request ID */
  requestId?: string;

  /** Stack trace (in development) */
  stackTrace?: string;
}

/**
 * Paginated response wrapper
 *
 * Used for endpoints that return paginated lists.
 *
 * @template T - The type of items in the list
 */
export interface PaginatedResponse<T = any> {
  /** Array of items for the current page */
  items: T[];

  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;

    /** Number of items per page */
    pageSize: number;

    /** Total number of items across all pages */
    totalItems: number;

    /** Total number of pages */
    totalPages: number;

    /** Whether there is a next page */
    hasNextPage: boolean;

    /** Whether there is a previous page */
    hasPreviousPage: boolean;

    /** Next page number (if available) */
    nextPage?: number;

    /** Previous page number (if available) */
    previousPage?: number;
  };

  /** Optional metadata */
  meta?: {
    /** Filters applied */
    filters?: Record<string, any>;

    /** Sort field and order */
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}

/**
 * API list response
 *
 * Non-paginated list response.
 *
 * @template T - The type of items in the list
 */
export interface ApiListResponse<T = any> {
  /** Array of items */
  items: T[];

  /** Total count */
  total: number;

  /** Optional metadata */
  meta?: {
    /** Filters applied */
    filters?: Record<string, any>;

    /** Sort field and order */
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}

/**
 * API success response
 *
 * Simple success response for operations that don't return data.
 */
export interface ApiSuccessResponse {
  /** Success message */
  message: string;

  /** Whether the operation was successful */
  success: true;

  /** Optional operation metadata */
  meta?: {
    /** Affected resource ID */
    resourceId?: string;

    /** Number of affected resources */
    affectedCount?: number;

    /** Operation timestamp */
    timestamp?: number;
  };
}

/**
 * Bulk operation response
 *
 * Response for operations affecting multiple items.
 *
 * @template T - The type of successful items
 */
export interface BulkOperationResponse<T = any> {
  /** Successfully processed items */
  succeeded: T[];

  /** Failed items with errors */
  failed: Array<{
    /** Item that failed */
    item: T;

    /** Error message */
    error: string;

    /** Error code */
    code?: string;
  }>;

  /** Summary */
  summary: {
    /** Total number of items processed */
    total: number;

    /** Number of successful operations */
    successCount: number;

    /** Number of failed operations */
    failureCount: number;

    /** Success rate (percentage) */
    successRate: number;
  };
}

/**
 * Validation error response
 *
 * Response for validation failures.
 */
export interface ValidationErrorResponse {
  /** Main error message */
  message: string;

  /** Field-specific errors */
  errors: Array<{
    /** Field name */
    field: string;

    /** Error message */
    message: string;

    /** Error code */
    code: string;

    /** Actual value provided */
    value?: any;

    /** Expected value or format */
    expected?: string;
  }>;

  /** Total number of validation errors */
  errorCount: number;
}

/**
 * Health check response
 *
 * Response from health check endpoints.
 */
export interface HealthCheckResponse {
  /** Overall status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Timestamp */
  timestamp: number;

  /** Uptime in seconds */
  uptime: number;

  /** Service version */
  version?: string;

  /** Component statuses */
  components?: {
    /** Component name */
    name: string;

    /** Component status */
    status: 'healthy' | 'degraded' | 'unhealthy';

    /** Additional details */
    details?: Record<string, any>;
  }[];

  /** System metrics */
  metrics?: {
    /** Memory usage */
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };

    /** CPU usage */
    cpu?: {
      percentage: number;
    };

    /** Active connections */
    connections?: number;
  };
}

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request configuration
 *
 * Configuration for making API requests.
 */
export interface RequestConfig {
  /** HTTP method */
  method: HttpMethod;

  /** Request URL */
  url: string;

  /** Request headers */
  headers?: Record<string, string>;

  /** Request body */
  data?: any;

  /** URL parameters */
  params?: Record<string, any>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to include credentials */
  withCredentials?: boolean;

  /** Abort signal for request cancellation */
  signal?: AbortSignal;

  /** Custom response type */
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer';
}

/**
 * Request interceptor
 *
 * Function to modify requests before they are sent.
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor
 *
 * Function to process responses before they are returned.
 */
export type ResponseInterceptor<T = any> = (response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;

/**
 * Error interceptor
 *
 * Function to handle request errors.
 */
export type ErrorInterceptor = (error: ApiError) => Promise<ApiError>;

/**
 * API client configuration
 *
 * Configuration for the API client.
 */
export interface ApiClientConfig {
  /** Base URL for all requests */
  baseURL: string;

  /** Default timeout in milliseconds */
  timeout?: number;

  /** Default headers */
  headers?: Record<string, string>;

  /** Whether to include credentials */
  withCredentials?: boolean;

  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];

  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];

  /** Error interceptors */
  errorInterceptors?: ErrorInterceptor[];

  /** Retry configuration */
  retry?: {
    /** Maximum number of retries */
    maxRetries: number;

    /** Retry delay in milliseconds */
    retryDelay: number;

    /** Whether to use exponential backoff */
    exponentialBackoff: boolean;

    /** HTTP status codes to retry */
    retryOn?: number[];
  };
}

/**
 * Query parameters for filtering
 *
 * Common query parameters for list endpoints.
 */
export interface QueryParams {
  /** Search query */
  search?: string;

  /** Filter parameters */
  filter?: Record<string, any>;

  /** Sort field */
  sortBy?: string;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Page number (1-indexed) */
  page?: number;

  /** Page size */
  pageSize?: number;

  /** Fields to include in response */
  fields?: string[];

  /** Fields to exclude from response */
  exclude?: string[];

  /** Include related resources */
  include?: string[];
}

/**
 * File upload request
 *
 * Configuration for file upload requests.
 */
export interface FileUploadRequest {
  /** File to upload */
  file: File | Blob;

  /** Field name for the file */
  fieldName?: string;

  /** Additional form data */
  data?: Record<string, any>;

  /** Upload progress callback */
  onProgress?: (progress: number) => void;

  /** Abort controller for cancellation */
  abortController?: AbortController;
}

/**
 * File upload response
 *
 * Response from file upload endpoints.
 */
export interface FileUploadResponse {
  /** Upload success status */
  success: boolean;

  /** Uploaded file URL */
  url?: string;

  /** File metadata */
  file?: {
    /** File ID */
    id: string;

    /** Original filename */
    name: string;

    /** File size in bytes */
    size: number;

    /** MIME type */
    type: string;

    /** Upload timestamp */
    uploadedAt: Date;
  };

  /** Error message (if failed) */
  error?: string;
}

/**
 * Batch request
 *
 * Configuration for batch API requests.
 */
export interface BatchRequest {
  /** Array of individual requests */
  requests: Array<{
    /** Request ID for tracking */
    id: string;

    /** HTTP method */
    method: HttpMethod;

    /** Request URL (relative to base URL) */
    url: string;

    /** Request body */
    data?: any;

    /** Request headers */
    headers?: Record<string, string>;
  }>;

  /** Whether to stop on first error */
  stopOnError?: boolean;

  /** Whether to execute requests in parallel */
  parallel?: boolean;
}

/**
 * Batch response
 *
 * Response from batch API requests.
 *
 * @template T - The type of response data
 */
export interface BatchResponse<T = any> {
  /** Array of individual responses */
  responses: Array<{
    /** Request ID */
    id: string;

    /** Response status */
    status: number;

    /** Response data */
    data?: T;

    /** Error message (if failed) */
    error?: string;
  }>;

  /** Batch summary */
  summary: {
    /** Total requests */
    total: number;

    /** Successful requests */
    succeeded: number;

    /** Failed requests */
    failed: number;
  };
}

/**
 * Rate limit information
 *
 * Information about API rate limiting.
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the time window */
  limit: number;

  /** Remaining requests in the current window */
  remaining: number;

  /** Time when the rate limit resets (Unix timestamp) */
  resetAt: number;

  /** Time window in seconds */
  window: number;

  /** Whether the rate limit has been exceeded */
  exceeded: boolean;

  /** Time until reset (in seconds) */
  retryAfter?: number;
}

/**
 * Cache metadata
 *
 * Information about response caching.
 */
export interface CacheMetadata {
  /** Whether the response was served from cache */
  cached: boolean;

  /** Cache timestamp */
  cachedAt?: number;

  /** Cache expiration timestamp */
  expiresAt?: number;

  /** Cache key */
  cacheKey?: string;

  /** Time-to-live in seconds */
  ttl?: number;
}
