/**
 * ResourceReadNode - Read resource content from sandboxed storage
 *
 * Pattern: success/not_found/error
 * Use case: Read files, prompts, templates from the Resources API
 *
 * Supports:
 * - Identification by resourceId (CUID) or path
 * - Multiple response types: text, json, binary
 * - JWT authentication via context.state.JWT_token
 * - Configurable API base URL
 *
 * @example
 * ```json
 * {
 *   "resource-read": {
 *     "path": "prompts/greeting.md",
 *     "responseType": "text",
 *     "success?": "use-prompt",
 *     "not_found?": "use-default",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ResponseType = 'text' | 'json' | 'binary';

interface ResourceReadConfig {
  /** Resource ID (CUID) - takes priority over path */
  resourceId?: string;
  /** Resource path relative to sandbox (e.g., "prompts/greeting.md") */
  path?: string;
  /** How to parse the response content (default: 'text') */
  responseType?: ResponseType;
  /** API base URL override */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

interface ResourceMetadata {
  id: string;
  name: string;
  path: string;
  type: string;
  mimeType: string;
  size: number;
  checksum: string;
  authorType: string;
  authorId?: string;
  tenantId: string;
  description?: string;
  tags: string[];
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// NODE IMPLEMENTATION
// ============================================================================

/**
 * ResourceReadNode - Read resource content from sandboxed storage
 *
 * Fetches resource metadata and content via HTTP calls to the Resources API.
 * Supports identification by resourceId or path, with multiple response types.
 */
export class ResourceReadNode extends WorkflowNode {
  metadata = {
    id: 'resource-read',
    name: 'Read Resource',
    version: '1.0.0',
    description: 'Read resource content from the sandboxed storage system by ID or path. Supports text, JSON, and binary content.',
    inputs: ['resourceId', 'path', 'responseType', 'baseUrl', 'timeout'],
    outputs: ['content', 'resource', 'mimeType', 'size'],
    ai_hints: {
      purpose: 'Read resource content (files, prompts, templates) from the sandboxed storage',
      when_to_use: 'When you need to fetch file content, load prompts, read templates, or access stored data resources',
      expected_edges: ['success', 'not_found', 'error'],
      example_usage: '{"resource-read": {"resourceId": "$.promptId", "success?": "process-content", "not_found?": "use-default"}}',
      example_config: '{"resourceId?": "string (CUID)", "path?": "string (relative path)", "responseType?": "text|json|binary", "baseUrl?": "string", "timeout?": "number (ms)"}',
      get_from_state: ['JWT_token', 'API_BASE_URL'],
      post_to_state: ['resourceContent', 'resourceMetadata']
    }
  };

  /** Default timeout in milliseconds (30 seconds) */
  private readonly DEFAULT_TIMEOUT = 30000;

  /** Valid response types */
  private readonly VALID_RESPONSE_TYPES: ResponseType[] = ['text', 'json', 'binary'];

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      resourceId,
      path,
      responseType = 'text',
      baseUrl,
      timeout
    } = (config as ResourceReadConfig) || {};

    // ========================================================================
    // VALIDATION
    // ========================================================================

    // Must provide either resourceId or path
    if (!resourceId && !path) {
      return {
        error: () => ({
          error: 'Missing required parameter: provide either resourceId or path',
          nodeId: context.nodeId
        })
      };
    }

    // Validate responseType
    if (!this.VALID_RESPONSE_TYPES.includes(responseType)) {
      return {
        error: () => ({
          error: `Invalid responseType: ${responseType}`,
          expected: this.VALID_RESPONSE_TYPES.join(', '),
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

    // Get JWT token
    const token = context.state.JWT_token;
    if (!token) {
      return {
        error: () => ({
          error: 'Missing JWT token in state',
          code: 'MISSING_JWT_TOKEN',
          suggestion: 'Ensure authentication has been performed before reading resources',
          nodeId: context.nodeId
        })
      };
    }

    // Resolve API base URL
    const apiBaseUrl = this.resolveBaseUrl(baseUrl, context);

    // ========================================================================
    // RESOLVE RESOURCE ID
    // ========================================================================
    try {
      let resolvedResourceId = resourceId;

      // If only path provided, search for resource by path
      if (!resolvedResourceId && path) {
        const searchResult = await this.findResourceByPath(apiBaseUrl, path, token, timeout);

        if (!searchResult) {
          context.state.resourceContent = null;
          context.state.resourceMetadata = null;
          return {
            not_found: () => ({
              error: 'Resource not found',
              path,
              nodeId: context.nodeId
            })
          };
        }

        resolvedResourceId = searchResult.id;
      }

      // ======================================================================
      // FETCH RESOURCE METADATA
      // ======================================================================
      const metadataResult = await this.fetchMetadata(
        apiBaseUrl,
        resolvedResourceId!,
        token,
        timeout
      );

      if (metadataResult.status === 404) {
        context.state.resourceContent = null;
        context.state.resourceMetadata = null;
        return {
          not_found: () => ({
            error: 'Resource not found',
            resourceId: resolvedResourceId,
            nodeId: context.nodeId
          })
        };
      }

      if (!metadataResult.ok) {
        return {
          error: () => ({
            error: `Failed to fetch resource metadata: HTTP ${metadataResult.status}`,
            resourceId: resolvedResourceId,
            status: metadataResult.status,
            data: metadataResult.data,
            nodeId: context.nodeId
          })
        };
      }

      const resourceMetadata = metadataResult.data?.resource as ResourceMetadata;

      // ======================================================================
      // FETCH RESOURCE CONTENT
      // ======================================================================
      const contentResult = await this.fetchContent(
        apiBaseUrl,
        resolvedResourceId!,
        token,
        responseType,
        timeout
      );

      if (contentResult.status === 404) {
        context.state.resourceContent = null;
        context.state.resourceMetadata = resourceMetadata;
        return {
          not_found: () => ({
            error: 'Resource content not found',
            resourceId: resolvedResourceId,
            nodeId: context.nodeId
          })
        };
      }

      if (!contentResult.ok) {
        return {
          error: () => ({
            error: `Failed to fetch resource content: HTTP ${contentResult.status}`,
            resourceId: resolvedResourceId,
            status: contentResult.status,
            nodeId: context.nodeId
          })
        };
      }

      // ======================================================================
      // STORE IN STATE AND RETURN SUCCESS
      // ======================================================================
      context.state.resourceContent = contentResult.content;
      context.state.resourceMetadata = resourceMetadata;

      return {
        success: () => ({
          content: contentResult.content,
          resource: resourceMetadata,
          mimeType: resourceMetadata.mimeType,
          size: resourceMetadata.size
        })
      };

    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: () => ({
            error: `Request timeout after ${timeout || this.DEFAULT_TIMEOUT}ms`,
            resourceId,
            path,
            nodeId: context.nodeId
          })
        };
      }

      // Handle network errors
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Failed to read resource',
          code: 'NETWORK_ERROR',
          resourceId,
          path,
          nodeId: context.nodeId
        })
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Resolve the API base URL from config, state, env, or default
   */
  private resolveBaseUrl(configBaseUrl: string | undefined, context: ExecutionContext): string {
    return (
      configBaseUrl ||
      (context.state.API_BASE_URL as string) ||
      process.env.API_BASE_URL ||
      'http://localhost:3013'
    );
  }

  /**
   * Search for a resource by path
   */
  private async findResourceByPath(
    baseUrl: string,
    path: string,
    token: string,
    timeout?: number
  ): Promise<ResourceMetadata | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const searchUrl = new URL('/workscript/resources', baseUrl);
      searchUrl.searchParams.set('search', path);
      searchUrl.searchParams.set('limit', '1');

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { items?: ResourceMetadata[]; count?: number };

      // Check if we found a resource with matching path
      if (data.items && data.items.length > 0) {
        // Find exact path match or return first result
        const exactMatch = data.items.find((item: ResourceMetadata) =>
          item.path === path || item.path.endsWith(`/${path}`)
        );
        return exactMatch || data.items[0];
      }

      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch resource metadata
   */
  private async fetchMetadata(
    baseUrl: string,
    resourceId: string,
    token: string,
    timeout?: number
  ): Promise<{ ok: boolean; status: number; data: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const url = `${baseUrl}/workscript/resources/${resourceId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data = null;
      try {
        data = await response.json();
      } catch {
        // Response might not be JSON
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch resource content
   */
  private async fetchContent(
    baseUrl: string,
    resourceId: string,
    token: string,
    responseType: ResponseType,
    timeout?: number
  ): Promise<{ ok: boolean; status: number; content: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const url = `${baseUrl}/workscript/resources/${resourceId}/content`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          content: null
        };
      }

      // Parse content based on responseType
      let content: any;
      switch (responseType) {
        case 'json':
          const text = await response.text();
          try {
            content = JSON.parse(text);
          } catch {
            // If JSON parsing fails, return as text
            content = text;
          }
          break;

        case 'binary':
          const buffer = await response.arrayBuffer();
          // Convert to base64 for transport in state
          content = Buffer.from(buffer).toString('base64');
          break;

        case 'text':
        default:
          content = await response.text();
          break;
      }

      return {
        ok: true,
        status: response.status,
        content
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default ResourceReadNode;
