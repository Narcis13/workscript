/**
 * ResourceInterpolateNode - Interpolate template placeholders with state values
 *
 * Pattern: success/not_found/error
 * Use case: Dynamic prompts, template rendering with workflow state
 *
 * Supports:
 * - Identification by resourceId (CUID) or path
 * - Template syntax: {{$.key}} and {{$.nested.path}}
 * - Include all workflow state or provide specific values
 * - JWT authentication via context.state.JWT_token
 *
 * @example
 * ```json
 * {
 *   "resource-interpolate": {
 *     "path": "prompts/greeting.md",
 *     "includeAllState": true,
 *     "success?": {
 *       "ask-ai": { "userPrompt": "$.interpolatedContent" }
 *     },
 *     "not_found?": "use-default-prompt",
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

interface ResourceInterpolateConfig {
  /** Resource ID (CUID) - takes priority over path */
  resourceId?: string;
  /** Resource path relative to sandbox (e.g., "prompts/greeting.md") */
  path?: string;
  /** Specific state values to use (overrides workflow state) */
  state?: Record<string, unknown>;
  /** Include entire workflow state for interpolation (default: true) */
  includeAllState?: boolean;
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
}

interface InterpolationStats {
  found: number;
  replaced: number;
  unresolved: string[];
}

// ============================================================================
// NODE IMPLEMENTATION
// ============================================================================

/**
 * ResourceInterpolateNode - Interpolate template placeholders with state values
 *
 * Fetches a resource template and replaces {{$.key}} placeholders with
 * actual values from workflow state or provided state object.
 */
export class ResourceInterpolateNode extends WorkflowNode {
  metadata = {
    id: 'resource-interpolate',
    name: 'Interpolate Resource',
    version: '1.0.0',
    description: 'Interpolate template placeholders in a resource with workflow state values. Replaces {{$.key}} syntax with actual values.',
    inputs: ['resourceId', 'path', 'state', 'includeAllState', 'baseUrl', 'timeout'],
    outputs: ['content', 'placeholders', 'originalContent'],
    ai_hints: {
      purpose: 'Replace {{$.path}} placeholders in resource templates with actual state values',
      when_to_use: 'When you have prompt templates or document templates that need dynamic values inserted from workflow state',
      expected_edges: ['success', 'not_found', 'error'],
      example_usage: '{"resource-interpolate": {"path": "prompts/greeting.md", "includeAllState": true, "success?": "use-prompt"}}',
      example_config: '{"resourceId?": "string", "path?": "string", "state?": "object", "includeAllState?": "boolean (default: true)", "baseUrl?": "string"}',
      get_from_state: ['JWT_token', 'API_BASE_URL'],
      post_to_state: ['interpolatedContent', 'interpolationStats']
    }
  };

  /** Default timeout in milliseconds (30 seconds) */
  private readonly DEFAULT_TIMEOUT = 30000;

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      resourceId,
      path,
      state: explicitState,
      includeAllState = true,
      baseUrl,
      timeout
    } = (config as ResourceInterpolateConfig) || {};

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
          suggestion: 'Ensure authentication has been performed before interpolating resources',
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
          context.state.interpolatedContent = null;
          context.state.interpolationStats = null;
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
      // BUILD STATE OBJECT FOR INTERPOLATION
      // ======================================================================
      let interpolationState: Record<string, unknown> = {};

      if (includeAllState) {
        // Include all workflow state (excluding internal keys)
        const workflowState = { ...context.state };
        // Remove internal keys we don't want to interpolate
        delete workflowState.JWT_token;
        delete workflowState.API_BASE_URL;
        interpolationState = workflowState;
      }

      // Merge/override with explicit state if provided
      if (explicitState && typeof explicitState === 'object') {
        interpolationState = { ...interpolationState, ...explicitState };
      }

      // ======================================================================
      // CALL INTERPOLATE API
      // ======================================================================
      const result = await this.interpolateResource(
        apiBaseUrl,
        resolvedResourceId!,
        interpolationState,
        token,
        context,
        timeout
      );

      if (result.status === 404) {
        context.state.interpolatedContent = null;
        context.state.interpolationStats = null;
        return {
          not_found: () => ({
            error: 'Resource not found',
            resourceId: resolvedResourceId,
            nodeId: context.nodeId
          })
        };
      }

      if (!result.ok) {
        return {
          error: () => ({
            error: result.error || `HTTP ${result.status}: Failed to interpolate resource`,
            code: result.code,
            status: result.status,
            resourceId: resolvedResourceId,
            nodeId: context.nodeId
          })
        };
      }

      // ======================================================================
      // STORE IN STATE AND RETURN SUCCESS
      // ======================================================================
      const stats: InterpolationStats = {
        found: result.placeholders?.found || 0,
        replaced: result.placeholders?.replaced || 0,
        unresolved: result.placeholders?.unresolved || []
      };

      context.state.interpolatedContent = result.content;
      context.state.interpolationStats = stats;

      return {
        success: () => ({
          content: result.content,
          placeholders: stats,
          originalContent: result.original
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
          error: error instanceof Error ? error.message : 'Failed to interpolate resource',
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
   * Call the interpolate API endpoint
   */
  private async interpolateResource(
    baseUrl: string,
    resourceId: string,
    state: Record<string, unknown>,
    token: string,
    context: ExecutionContext,
    timeout?: number
  ): Promise<{
    ok: boolean;
    status: number;
    content?: string;
    original?: string;
    placeholders?: { found: number; replaced: number; unresolved: string[] };
    error?: string;
    code?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const url = `${baseUrl}/workscript/resources/${resourceId}/interpolate`;

      const body = {
        state,
        workflowId: context.workflowId,
        executionId: context.executionId,
        nodeId: context.nodeId
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as {
        success: boolean;
        content?: string;
        original?: string;
        placeholders?: { found: number; replaced: number; unresolved: string[] };
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: data.error,
          code: data.code
        };
      }

      return {
        ok: true,
        status: response.status,
        content: data.content,
        original: data.original,
        placeholders: data.placeholders
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default ResourceInterpolateNode;
