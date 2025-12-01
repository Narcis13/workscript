/**
 * FetchApiNode - Makes HTTP API calls to external endpoints
 *
 * Comprehensive HTTP client node supporting:
 * - All common HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * - Custom headers and request body
 * - Timeout support with AbortController
 * - Multiple response types (json, text, blob, arrayBuffer)
 * - Automatic Content-Type handling
 * - Detailed error reporting with status code categorization
 *
 * @example
 * ```json
 * {
 *   "fetchApi-1": {
 *     "url": "https://api.example.com/users",
 *     "method": "GET",
 *     "headers": { "Authorization": "Bearer $.apiToken" },
 *     "timeout": 5000,
 *     "success?": "process-data",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 *
 * @example POST request with body
 * ```json
 * {
 *   "fetchApi-1": {
 *     "url": "https://api.example.com/users",
 *     "method": "POST",
 *     "body": { "name": "$.userName", "email": "$.userEmail" },
 *     "headers": { "Content-Type": "application/json" },
 *     "success?": "created",
 *     "clientError?": "validation-failed",
 *     "serverError?": "server-issue"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer';

interface FetchApiNodeConfig {
  /** The API endpoint URL to fetch from (required) */
  url: string;
  /** HTTP method (default: 'GET') */
  method?: HttpMethod;
  /** Request body for POST/PUT/PATCH requests */
  body?: unknown;
  /** Custom headers object */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Expected response type (default: 'json') */
  responseType?: ResponseType;
}

interface FetchApiResponse {
  /** Parsed response data */
  data: unknown;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers as object */
  headers: Record<string, string>;
  /** Response URL (may differ from request URL due to redirects) */
  url: string;
  /** Whether the response was redirected */
  redirected: boolean;
}

// ============================================================================
// NODE IMPLEMENTATION
// ============================================================================

/**
 * FetchApiNode - Makes HTTP API calls to external endpoints using native fetch()
 *
 * Provides comprehensive HTTP client functionality with proper error handling,
 * timeout support, and flexible response parsing.
 */
export class FetchApiNode extends WorkflowNode {
  metadata = {
    id: 'fetchApi',
    name: 'Fetch API',
    version: '1.0.0',
    description: 'Makes HTTP API calls to external endpoints using native fetch(). Supports all HTTP methods, custom headers, request body, timeout, and multiple response types.',
    inputs: ['url', 'method', 'body', 'headers', 'timeout', 'responseType'],
    outputs: ['data', 'status', 'headers', 'statusText', 'url', 'redirected'],
    ai_hints: {
      purpose: 'Make HTTP requests to external APIs and services using native fetch()',
      when_to_use: 'When you need to call REST APIs, webhooks, external services, or any HTTP endpoint. Use for data retrieval (GET), creating resources (POST), updating (PUT/PATCH), or deleting (DELETE).',
      expected_edges: ['success', 'error', 'clientError', 'serverError'],
      example_usage: '{"fetchApi-1": {"url": "https://api.example.com/data", "method": "GET", "timeout": 5000, "success?": "process-data", "error?": "handle-error"}}',
      example_config: '{"url": "string (required)", "method?": "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS", "body?": "any (for POST/PUT/PATCH)", "headers?": "Record<string, string>", "timeout?": "number (ms, default 30000)", "responseType?": "json|text|blob|arrayBuffer"}',
      get_from_state: [],
      post_to_state: ['fetchResponse', 'fetchStatus', 'fetchHeaders']
    }
  };

  /** Default timeout in milliseconds (30 seconds) */
  private readonly DEFAULT_TIMEOUT = 30000;

  /** HTTP methods that can have a request body */
  private readonly BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

  /** Valid HTTP methods */
  private readonly VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  /** Valid response types */
  private readonly VALID_RESPONSE_TYPES: ResponseType[] = ['json', 'text', 'blob', 'arrayBuffer'];

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      url,
      method = 'GET',
      body,
      headers = {},
      timeout,
      responseType = 'json'
    } = (config as FetchApiNodeConfig) || {};

    // ========================================================================
    // VALIDATION
    // ========================================================================

    // Validate URL is provided
    if (!url) {
      return {
        error: () => ({
          error: 'Missing required parameter: url',
          expected: 'A valid URL string',
          received: typeof url,
          nodeId: context.nodeId
        })
      };
    }

    // Validate URL is a string
    if (typeof url !== 'string') {
      return {
        error: () => ({
          error: 'Invalid url parameter type',
          expected: 'string',
          received: typeof url,
          nodeId: context.nodeId
        })
      };
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        error: () => ({
          error: `Invalid URL format: ${url}`,
          suggestion: 'Ensure the URL includes protocol (http:// or https://)',
          nodeId: context.nodeId
        })
      };
    }

    // Validate HTTP method
    const normalizedMethod = method.toUpperCase() as HttpMethod;
    if (!this.VALID_METHODS.includes(normalizedMethod)) {
      return {
        error: () => ({
          error: `Invalid HTTP method: ${method}`,
          expected: this.VALID_METHODS.join(', '),
          received: method,
          nodeId: context.nodeId
        })
      };
    }

    // Validate response type
    if (!this.VALID_RESPONSE_TYPES.includes(responseType)) {
      return {
        error: () => ({
          error: `Invalid responseType: ${responseType}`,
          expected: this.VALID_RESPONSE_TYPES.join(', '),
          received: responseType,
          nodeId: context.nodeId
        })
      };
    }

    // Validate timeout if provided
    if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0)) {
      return {
        error: () => ({
          error: 'Invalid timeout parameter',
          expected: 'Positive number (milliseconds)',
          received: String(timeout),
          nodeId: context.nodeId
        })
      };
    }

    // Validate headers is an object
    if (headers && (typeof headers !== 'object' || Array.isArray(headers))) {
      return {
        error: () => ({
          error: 'Invalid headers parameter',
          expected: 'Object with string key-value pairs',
          received: typeof headers,
          nodeId: context.nodeId
        })
      };
    }

    // ========================================================================
    // BUILD REQUEST
    // ========================================================================

    try {
      const requestHeaders = this.buildHeaders(headers, body, normalizedMethod);
      const requestOptions = this.buildRequestOptions(normalizedMethod, requestHeaders, body);

      // ======================================================================
      // EXECUTE REQUEST WITH TIMEOUT
      // ======================================================================

      const controller = new AbortController();
      const effectiveTimeout = timeout || this.DEFAULT_TIMEOUT;
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

      let response: Response;
      try {
        response = await fetch(parsedUrl.toString(), {
          ...requestOptions,
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // ======================================================================
      // PROCESS RESPONSE
      // ======================================================================

      const apiResponse = await this.processResponse(response, responseType);

      // Store results in state
      context.state.fetchResponse = apiResponse.data;
      context.state.fetchStatus = apiResponse.status;
      context.state.fetchHeaders = apiResponse.headers;

      // ======================================================================
      // ROUTE BASED ON STATUS CODE
      // ======================================================================

      // Success (2xx)
      if (response.ok) {
        return {
          success: () => ({
            data: apiResponse.data,
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            headers: apiResponse.headers,
            url: apiResponse.url,
            redirected: apiResponse.redirected
          })
        };
      }

      // Client Error (4xx)
      if (response.status >= 400 && response.status < 500) {
        return {
          clientError: () => ({
            error: `HTTP ${apiResponse.status}: ${apiResponse.statusText}`,
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            data: apiResponse.data,
            url: url,
            nodeId: context.nodeId
          })
        };
      }

      // Server Error (5xx)
      if (response.status >= 500) {
        return {
          serverError: () => ({
            error: `HTTP ${apiResponse.status}: ${apiResponse.statusText}`,
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            data: apiResponse.data,
            url: url,
            nodeId: context.nodeId
          })
        };
      }

      // Other non-OK status (1xx, 3xx without redirect)
      return {
        error: () => ({
          error: `Unexpected HTTP status: ${apiResponse.status}`,
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          data: apiResponse.data,
          url: url,
          nodeId: context.nodeId
        })
      };

    } catch (error) {
      // ======================================================================
      // ERROR HANDLING
      // ======================================================================

      // Timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: () => ({
            error: `Request timeout after ${timeout || this.DEFAULT_TIMEOUT}ms`,
            url: url,
            timeout: timeout || this.DEFAULT_TIMEOUT,
            nodeId: context.nodeId
          })
        };
      }

      // Network or other errors
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Fetch request failed',
          url: url,
          errorType: error instanceof Error ? error.name : 'Unknown',
          nodeId: context.nodeId
        })
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Build request headers with automatic Content-Type for JSON bodies
   */
  private buildHeaders(
    customHeaders: Record<string, string>,
    body: unknown,
    method: HttpMethod
  ): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };

    // Auto-set Content-Type for JSON bodies if not already set
    if (
      body !== undefined &&
      this.BODY_METHODS.includes(method) &&
      typeof body === 'object' &&
      body !== null &&
      !headers['Content-Type'] &&
      !headers['content-type']
    ) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Build fetch request options
   */
  private buildRequestOptions(
    method: HttpMethod,
    headers: Record<string, string>,
    body?: unknown
  ): RequestInit {
    const options: RequestInit = {
      method,
      headers
    };

    // Add body for POST/PUT/PATCH methods
    if (body !== undefined && this.BODY_METHODS.includes(method)) {
      if (typeof body === 'string') {
        options.body = body;
      } else if (body instanceof Blob || body instanceof ArrayBuffer) {
        options.body = body;
      } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
        options.body = body;
      } else {
        // Serialize objects to JSON
        options.body = JSON.stringify(body);
      }
    }

    return options;
  }

  /**
   * Process response based on expected response type
   */
  private async processResponse(
    response: Response,
    responseType: ResponseType
  ): Promise<FetchApiResponse> {
    // Extract headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse response body based on responseType
    let data: unknown;

    try {
      switch (responseType) {
        case 'json':
          // Try to parse as JSON, fall back to text if it fails
          const text = await response.text();
          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              // If JSON parsing fails, return as text
              data = text;
            }
          } else {
            data = null;
          }
          break;

        case 'text':
          data = await response.text();
          break;

        case 'blob':
          data = await response.blob();
          break;

        case 'arrayBuffer':
          data = await response.arrayBuffer();
          break;

        default:
          data = await response.text();
      }
    } catch {
      // If response body cannot be read, set data to null
      data = null;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      url: response.url,
      redirected: response.redirected
    };
  }
}

export default FetchApiNode;
