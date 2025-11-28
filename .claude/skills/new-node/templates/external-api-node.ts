/**
 * External API Node Template
 *
 * Pattern: success/error with HTTP status handling
 * Use case: HTTP/REST API calls, webhooks, external services
 *
 * INSTRUCTIONS:
 * 1. Replace [NodeName] with your node class name (PascalCase)
 * 2. Replace [nodeId] with unique identifier (camelCase or kebab-case)
 * 3. Configure authentication method if needed
 * 4. Customize error handling for specific API requirements
 * 5. Export in /packages/nodes/src/index.ts
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface
interface [NodeName]Config {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  auth?: {
    type: 'bearer' | 'basic' | 'apiKey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

// Define response type
interface ApiResponse {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}

/**
 * [NodeName] - Makes HTTP API calls to external services
 *
 * Handles HTTP requests with configurable method, headers, body,
 * authentication, and timeout. Returns success or error edge.
 *
 * @example
 * ```json
 * {
 *   "[nodeId]-1": {
 *     "url": "https://api.example.com/users",
 *     "method": "POST",
 *     "headers": { "Content-Type": "application/json" },
 *     "body": { "name": "$.userName" },
 *     "auth": { "type": "bearer", "token": "$.apiToken" },
 *     "success?": "process-response",
 *     "error?": "handle-api-error"
 *   }
 * }
 * ```
 */
export class [NodeName] extends WorkflowNode {
  metadata = {
    id: '[nodeId]',
    name: '[Node Name]',
    version: '1.0.0',
    description: 'Makes HTTP API calls to external services',
    inputs: ['url', 'method', 'headers', 'body', 'timeout', 'auth'],
    outputs: ['data', 'status', 'headers'],
    ai_hints: {
      purpose: 'Make HTTP requests to external APIs and services',
      when_to_use: 'When you need to call REST APIs, webhooks, or external services',
      expected_edges: ['success', 'error'],
      example_usage: '{"[nodeId]-1": {"url": "https://api.example.com/data", "method": "GET", "success?": "process"}}',
      example_config: '{"url": "string", "method?": "GET|POST|PUT|PATCH|DELETE", "headers?": "object", "body?": "any", "auth?": {"type": "bearer|basic|apiKey", "token?": "string"}}',
      get_from_state: [],
      post_to_state: ['[nodeId]Response', '[nodeId]Status']
    }
  };

  // Default timeout (30 seconds)
  private readonly defaultTimeout = 30000;

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout,
      auth
    } = (config as [NodeName]Config) || {};

    // ============================================
    // VALIDATION
    // ============================================
    if (!url) {
      return {
        error: () => ({
          error: 'Missing required parameter: url',
          nodeId: context.nodeId
        })
      };
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return {
        error: () => ({
          error: `Invalid URL format: ${url}`,
          nodeId: context.nodeId
        })
      };
    }

    // ============================================
    // BUILD REQUEST
    // ============================================
    try {
      const requestHeaders = this.buildHeaders(headers, auth);
      const requestOptions = this.buildRequestOptions(method, requestHeaders, body);

      // ============================================
      // MAKE API CALL
      // ============================================
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeout || this.defaultTimeout
      );

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ============================================
      // PROCESS RESPONSE
      // ============================================
      const apiResponse = await this.processResponse(response);

      // Store in state
      context.state.[nodeId]Response = apiResponse.data;
      context.state.[nodeId]Status = apiResponse.status;

      // Check for HTTP errors (4xx, 5xx)
      if (!response.ok) {
        return {
          error: () => ({
            error: `HTTP ${apiResponse.status}: ${apiResponse.statusText}`,
            url,
            status: apiResponse.status,
            data: apiResponse.data,
            nodeId: context.nodeId
          })
        };
      }

      // ============================================
      // RETURN SINGLE SUCCESS EDGE
      // ============================================
      return {
        success: () => ({
          data: apiResponse.data,
          status: apiResponse.status,
          headers: apiResponse.headers
        })
      };

    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: () => ({
              error: `Request timeout after ${timeout || this.defaultTimeout}ms`,
              url,
              nodeId: context.nodeId
            })
          };
        }
      }

      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'API call failed',
          url,
          nodeId: context.nodeId
        })
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private buildHeaders(
    customHeaders: Record<string, string>,
    auth?: [NodeName]Config['auth']
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    if (auth) {
      switch (auth.type) {
        case 'bearer':
          if (auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`;
          }
          break;
        case 'basic':
          if (auth.username && auth.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        case 'apiKey':
          if (auth.apiKey) {
            headers[auth.apiKeyHeader || 'X-API-Key'] = auth.apiKey;
          }
          break;
      }
    }

    return headers;
  }

  private buildRequestOptions(
    method: string,
    headers: Record<string, string>,
    body?: unknown
  ): RequestInit {
    const options: RequestInit = {
      method,
      headers
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return options;
  }

  private async processResponse(response: Response): Promise<ApiResponse> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data: unknown;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else {
      data = await response.blob();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers
    };
  }
}

export default [NodeName];
