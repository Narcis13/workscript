/**
 * ResourceWriteNode - Create or update resources in sandboxed storage
 *
 * Pattern: created/updated/error
 * Use case: Save files, create prompts, store generated content
 *
 * Supports:
 * - Three modes: create, update, upsert (create if not exists)
 * - Content serialization (objects are JSON.stringify'd)
 * - JWT authentication via context.state.JWT_token
 * - Configurable API base URL
 *
 * @example
 * ```json
 * {
 *   "resource-write": {
 *     "mode": "upsert",
 *     "name": "daily-report",
 *     "path": "reports/{{$.date}}.json",
 *     "content": "$.reportData",
 *     "type": "data",
 *     "created?": "notify-created",
 *     "updated?": "notify-updated",
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

type WriteMode = 'create' | 'update' | 'upsert';
type ResourceType = 'prompt' | 'document' | 'data' | 'image' | 'audio';

interface ResourceWriteConfig {
  /** Operation mode: create, update, or upsert (create if not exists) */
  mode: WriteMode;
  /** Resource ID for update mode */
  resourceId?: string;
  /** Resource path (required for create, optional for update) */
  path?: string;
  /** Display name for the resource */
  name?: string;
  /** Content to write (string or object - objects are JSON stringified) */
  content: string | Record<string, unknown>;
  /** Resource type classification */
  type?: ResourceType;
  /** Description of the resource */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Whether resource is publicly accessible */
  isPublic?: boolean;
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
 * ResourceWriteNode - Create or update resources in sandboxed storage
 *
 * Creates new resources or updates existing ones via HTTP calls to the Resources API.
 * Supports three modes: create, update, and upsert.
 */
export class ResourceWriteNode extends WorkflowNode {
  metadata = {
    id: 'resource-write',
    name: 'Write Resource',
    version: '1.0.0',
    description: 'Create or update resource content in the sandboxed storage system. Supports create, update, and upsert modes.',
    inputs: ['mode', 'resourceId', 'path', 'name', 'content', 'type', 'description', 'tags', 'isPublic', 'baseUrl', 'timeout'],
    outputs: ['resource', 'resourceId', 'created', 'updated'],
    ai_hints: {
      purpose: 'Create new resources or update existing ones in the sandboxed storage',
      when_to_use: 'When you need to save files, create prompts, store generated content, or update existing resources',
      expected_edges: ['created', 'updated', 'error'],
      example_usage: '{"resource-write": {"mode": "create", "name": "analysis", "path": "results/analysis.json", "content": "$.data", "created?": "done"}}',
      example_config: '{"mode": "create|update|upsert", "name?": "string", "path": "string", "content": "string|object", "type?": "prompt|document|data", "tags?": "[string]", "isPublic?": "boolean"}',
      get_from_state: ['JWT_token', 'API_BASE_URL'],
      post_to_state: ['writtenResource', 'writtenResourceId']
    }
  };

  /** Default timeout in milliseconds (30 seconds) */
  private readonly DEFAULT_TIMEOUT = 30000;

  /** Valid write modes */
  private readonly VALID_MODES: WriteMode[] = ['create', 'update', 'upsert'];

  /** Valid resource types */
  private readonly VALID_TYPES: ResourceType[] = ['prompt', 'document', 'data', 'image', 'audio'];

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      mode,
      resourceId,
      path,
      name,
      content,
      type,
      description,
      tags,
      isPublic,
      baseUrl,
      timeout
    } = (config as ResourceWriteConfig) || {};

    // ========================================================================
    // VALIDATION
    // ========================================================================

    // Mode is required
    if (!mode) {
      return {
        error: () => ({
          error: 'Missing required parameter: mode',
          expected: this.VALID_MODES.join(', '),
          nodeId: context.nodeId
        })
      };
    }

    // Validate mode
    if (!this.VALID_MODES.includes(mode)) {
      return {
        error: () => ({
          error: `Invalid mode: ${mode}`,
          expected: this.VALID_MODES.join(', '),
          nodeId: context.nodeId
        })
      };
    }

    // Content is required
    if (content === undefined || content === null) {
      return {
        error: () => ({
          error: 'Missing required parameter: content',
          nodeId: context.nodeId
        })
      };
    }

    // Validate mode-specific requirements
    if (mode === 'create' && !path) {
      return {
        error: () => ({
          error: 'Path is required for create mode',
          nodeId: context.nodeId
        })
      };
    }

    if (mode === 'update' && !resourceId && !path) {
      return {
        error: () => ({
          error: 'Either resourceId or path is required for update mode',
          nodeId: context.nodeId
        })
      };
    }

    if (mode === 'upsert' && !path) {
      return {
        error: () => ({
          error: 'Path is required for upsert mode',
          nodeId: context.nodeId
        })
      };
    }

    // Validate type if provided
    if (type && !this.VALID_TYPES.includes(type)) {
      return {
        error: () => ({
          error: `Invalid type: ${type}`,
          expected: this.VALID_TYPES.join(', '),
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
          suggestion: 'Ensure authentication has been performed before writing resources',
          nodeId: context.nodeId
        })
      };
    }

    // Resolve API base URL
    const apiBaseUrl = this.resolveBaseUrl(baseUrl, context);

    // Serialize content if it's an object
    const serializedContent = typeof content === 'object'
      ? JSON.stringify(content)
      : String(content);

    // ========================================================================
    // EXECUTE OPERATION BASED ON MODE
    // ========================================================================
    try {
      switch (mode) {
        case 'create':
          return await this.createResource(context, {
            apiBaseUrl,
            token,
            path: path!,
            name,
            content: serializedContent,
            type,
            description,
            tags,
            isPublic,
            timeout
          });

        case 'update':
          return await this.updateResource(context, {
            apiBaseUrl,
            token,
            resourceId,
            path,
            content: serializedContent,
            timeout
          });

        case 'upsert':
          return await this.upsertResource(context, {
            apiBaseUrl,
            token,
            path: path!,
            name,
            content: serializedContent,
            type,
            description,
            tags,
            isPublic,
            timeout
          });

        default:
          return {
            error: () => ({
              error: `Unsupported mode: ${mode}`,
              nodeId: context.nodeId
            })
          };
      }
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: () => ({
            error: `Request timeout after ${timeout || this.DEFAULT_TIMEOUT}ms`,
            mode,
            path,
            nodeId: context.nodeId
          })
        };
      }

      // Handle network errors
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Failed to write resource',
          code: 'NETWORK_ERROR',
          mode,
          path,
          nodeId: context.nodeId
        })
      };
    }
  }

  // ==========================================================================
  // OPERATION METHODS
  // ==========================================================================

  /**
   * Create a new resource
   */
  private async createResource(
    context: ExecutionContext,
    params: {
      apiBaseUrl: string;
      token: string;
      path: string;
      name?: string;
      content: string;
      type?: ResourceType;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
      timeout?: number;
    }
  ): Promise<EdgeMap> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      params.timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const url = `${params.apiBaseUrl}/workscript/resources/create`;

      const body: Record<string, unknown> = {
        path: params.path,
        content: params.content
      };

      if (params.name) body.name = params.name;
      if (params.type) body.type = params.type;
      if (params.description) body.description = params.description;
      if (params.tags) body.tags = params.tags;
      if (params.isPublic !== undefined) body.isPublic = params.isPublic;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as {
        success?: boolean;
        resource?: ResourceMetadata;
        error?: string;
        code?: string;
      };

      // Handle conflict (resource already exists)
      if (response.status === 409) {
        return {
          error: () => ({
            error: 'Resource already exists at this path',
            code: 'RESOURCE_EXISTS',
            path: params.path,
            suggestion: 'Use mode: "update" or "upsert" to modify existing resources',
            nodeId: context.nodeId
          })
        };
      }

      if (!response.ok) {
        return {
          error: () => ({
            error: data.error || `HTTP ${response.status}: Failed to create resource`,
            code: data.code,
            status: response.status,
            path: params.path,
            nodeId: context.nodeId
          })
        };
      }

      const resource = data.resource as ResourceMetadata;

      // Store in state
      context.state.writtenResource = resource;
      context.state.writtenResourceId = resource.id;

      return {
        created: () => ({
          resource,
          resourceId: resource.id
        })
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Update an existing resource
   */
  private async updateResource(
    context: ExecutionContext,
    params: {
      apiBaseUrl: string;
      token: string;
      resourceId?: string;
      path?: string;
      content: string;
      timeout?: number;
    }
  ): Promise<EdgeMap> {
    let resolvedResourceId = params.resourceId;

    // If no resourceId, find by path
    if (!resolvedResourceId && params.path) {
      const found = await this.findResourceByPath(
        params.apiBaseUrl,
        params.path,
        params.token,
        params.timeout
      );

      if (!found) {
        return {
          error: () => ({
            error: 'Resource not found at path',
            code: 'RESOURCE_NOT_FOUND',
            path: params.path,
            nodeId: context.nodeId
          })
        };
      }

      resolvedResourceId = found.id;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      params.timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const url = `${params.apiBaseUrl}/workscript/resources/${resolvedResourceId}/content`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: params.content }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as {
        success?: boolean;
        resource?: ResourceMetadata;
        previousChecksum?: string;
        error?: string;
        code?: string;
      };

      if (response.status === 404) {
        return {
          error: () => ({
            error: 'Resource not found',
            code: 'RESOURCE_NOT_FOUND',
            resourceId: resolvedResourceId,
            nodeId: context.nodeId
          })
        };
      }

      if (!response.ok) {
        return {
          error: () => ({
            error: data.error || `HTTP ${response.status}: Failed to update resource`,
            code: data.code,
            status: response.status,
            resourceId: resolvedResourceId,
            nodeId: context.nodeId
          })
        };
      }

      const resource = data.resource as ResourceMetadata;

      // Store in state
      context.state.writtenResource = resource;
      context.state.writtenResourceId = resource.id;

      return {
        updated: () => ({
          resource,
          resourceId: resource.id,
          previousChecksum: data.previousChecksum
        })
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Upsert - create if not exists, update if exists
   */
  private async upsertResource(
    context: ExecutionContext,
    params: {
      apiBaseUrl: string;
      token: string;
      path: string;
      name?: string;
      content: string;
      type?: ResourceType;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
      timeout?: number;
    }
  ): Promise<EdgeMap> {
    // First, check if resource exists
    const existing = await this.findResourceByPath(
      params.apiBaseUrl,
      params.path,
      params.token,
      params.timeout
    );

    if (existing) {
      // Update existing resource
      return await this.updateResource(context, {
        apiBaseUrl: params.apiBaseUrl,
        token: params.token,
        resourceId: existing.id,
        content: params.content,
        timeout: params.timeout
      });
    } else {
      // Create new resource
      return await this.createResource(context, params);
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
      // Use path filter for exact/suffix path matching (not search which only checks name/description)
      searchUrl.searchParams.set('path', path);
      searchUrl.searchParams.set('limit', '10');

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
}

export default ResourceWriteNode;
