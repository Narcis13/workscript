/**
 * ResourceListNode - List resources from sandboxed storage with filters
 *
 * Pattern: success/empty/error
 * Use case: Find resources by type, tags, search, with pagination
 *
 * Supports:
 * - Filter by type, tags, search, authorType
 * - Pagination with limit and offset
 * - Sorting by name, createdAt, size, updatedAt
 * - JWT authentication via context.state.JWT_token
 *
 * @example
 * ```json
 * {
 *   "resource-list": {
 *     "type": "prompt",
 *     "tags": ["email", "marketing"],
 *     "limit": 10,
 *     "success?": "process-prompts",
 *     "empty?": "create-defaults",
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

type ResourceType = 'prompt' | 'image' | 'audio' | 'document' | 'data';
type AuthorType = 'user' | 'workflow' | 'automation' | 'system';
type SortBy = 'name' | 'createdAt' | 'size' | 'updatedAt';

interface ResourceListConfig {
  /** Filter by resource type */
  type?: ResourceType;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Search in name and description */
  search?: string;
  /** Filter by author type */
  authorType?: AuthorType;
  /** Maximum results to return (default: 50, max: 100) */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
  /** Sort field (default: createdAt) */
  sortBy?: SortBy;
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

interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

// ============================================================================
// NODE IMPLEMENTATION
// ============================================================================

/**
 * ResourceListNode - List resources from sandboxed storage with filters
 *
 * Queries the Resources API with optional filters, search, and pagination.
 */
export class ResourceListNode extends WorkflowNode {
  metadata = {
    id: 'resource-list',
    name: 'List Resources',
    version: '1.0.0',
    description: 'List resources from the sandboxed storage with filters and pagination. Supports filtering by type, tags, search, and sorting.',
    inputs: ['type', 'tags', 'search', 'authorType', 'limit', 'offset', 'sortBy', 'baseUrl', 'timeout'],
    outputs: ['items', 'count', 'pagination'],
    ai_hints: {
      purpose: 'Query and list resources from storage with filtering, searching, and pagination',
      when_to_use: 'When you need to find resources by type, tags, or search terms, or browse available resources',
      expected_edges: ['success', 'empty', 'error'],
      example_usage: '{"resource-list": {"type": "prompt", "tags": ["greeting"], "limit": 10, "success?": "process-prompts", "empty?": "create-defaults"}}',
      example_config: '{"type?": "prompt|image|audio|document|data", "tags?": "[string]", "search?": "string", "authorType?": "user|workflow", "limit?": "number (1-100)", "offset?": "number", "sortBy?": "name|createdAt|size|updatedAt"}',
      get_from_state: ['JWT_token', 'API_BASE_URL'],
      post_to_state: ['resourceList', 'resourceCount']
    }
  };

  /** Default timeout in milliseconds (30 seconds) */
  private readonly DEFAULT_TIMEOUT = 30000;

  /** Default and maximum limit values */
  private readonly DEFAULT_LIMIT = 50;
  private readonly MAX_LIMIT = 100;

  /** Valid resource types */
  private readonly VALID_TYPES: ResourceType[] = ['prompt', 'image', 'audio', 'document', 'data'];

  /** Valid author types */
  private readonly VALID_AUTHOR_TYPES: AuthorType[] = ['user', 'workflow', 'automation', 'system'];

  /** Valid sort fields */
  private readonly VALID_SORT_BY: SortBy[] = ['name', 'createdAt', 'size', 'updatedAt'];

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      type,
      tags,
      search,
      authorType,
      limit,
      offset = 0,
      sortBy,
      baseUrl,
      timeout
    } = (config as ResourceListConfig) || {};

    // ========================================================================
    // VALIDATION
    // ========================================================================

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

    // Validate authorType if provided
    if (authorType && !this.VALID_AUTHOR_TYPES.includes(authorType)) {
      return {
        error: () => ({
          error: `Invalid authorType: ${authorType}`,
          expected: this.VALID_AUTHOR_TYPES.join(', '),
          nodeId: context.nodeId
        })
      };
    }

    // Validate sortBy if provided
    if (sortBy && !this.VALID_SORT_BY.includes(sortBy)) {
      return {
        error: () => ({
          error: `Invalid sortBy: ${sortBy}`,
          expected: this.VALID_SORT_BY.join(', '),
          nodeId: context.nodeId
        })
      };
    }

    // Validate limit if provided
    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1 || limit > this.MAX_LIMIT) {
        return {
          error: () => ({
            error: `Invalid limit: ${limit}`,
            expected: `Number between 1 and ${this.MAX_LIMIT}`,
            nodeId: context.nodeId
          })
        };
      }
    }

    // Validate offset if provided
    if (offset !== undefined && (typeof offset !== 'number' || offset < 0)) {
      return {
        error: () => ({
          error: `Invalid offset: ${offset}`,
          expected: 'Non-negative number',
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
          suggestion: 'Ensure authentication has been performed before listing resources',
          nodeId: context.nodeId
        })
      };
    }

    // Resolve API base URL
    const apiBaseUrl = this.resolveBaseUrl(baseUrl, context);

    // ========================================================================
    // BUILD AND EXECUTE QUERY
    // ========================================================================
    try {
      const effectiveLimit = limit || this.DEFAULT_LIMIT;

      const result = await this.listResources(apiBaseUrl, {
        type,
        tags,
        search,
        authorType,
        limit: effectiveLimit,
        offset,
        sortBy,
        token,
        timeout
      });

      if (!result.ok) {
        return {
          error: () => ({
            error: result.error || `HTTP ${result.status}: Failed to list resources`,
            code: result.code,
            status: result.status,
            nodeId: context.nodeId
          })
        };
      }

      const items = result.items || [];
      const count = result.count || items.length;

      // Build pagination info
      const pagination: PaginationInfo = {
        limit: effectiveLimit,
        offset,
        total: count,
        hasMore: offset + items.length < count
      };

      // Store in state
      context.state.resourceList = items;
      context.state.resourceCount = count;

      // ======================================================================
      // RETURN APPROPRIATE EDGE
      // ======================================================================
      if (items.length === 0) {
        return {
          empty: () => ({
            items: [],
            count: 0,
            pagination,
            filters: { type, tags, search, authorType }
          })
        };
      }

      return {
        success: () => ({
          items,
          count,
          pagination
        })
      };

    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: () => ({
            error: `Request timeout after ${timeout || this.DEFAULT_TIMEOUT}ms`,
            nodeId: context.nodeId
          })
        };
      }

      // Handle network errors
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Failed to list resources',
          code: 'NETWORK_ERROR',
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
   * List resources from the API
   */
  private async listResources(
    baseUrl: string,
    params: {
      type?: ResourceType;
      tags?: string[];
      search?: string;
      authorType?: AuthorType;
      limit: number;
      offset: number;
      sortBy?: SortBy;
      token: string;
      timeout?: number;
    }
  ): Promise<{
    ok: boolean;
    status: number;
    items?: ResourceMetadata[];
    count?: number;
    error?: string;
    code?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      params.timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const url = new URL('/workscript/resources', baseUrl);

      // Add query parameters
      if (params.type) {
        url.searchParams.set('type', params.type);
      }
      if (params.tags && params.tags.length > 0) {
        url.searchParams.set('tags', params.tags.join(','));
      }
      if (params.search) {
        url.searchParams.set('search', params.search);
      }
      if (params.authorType) {
        url.searchParams.set('authorType', params.authorType);
      }
      url.searchParams.set('limit', String(params.limit));
      url.searchParams.set('offset', String(params.offset));
      if (params.sortBy) {
        url.searchParams.set('sortBy', params.sortBy);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as {
        success?: boolean;
        items?: ResourceMetadata[];
        count?: number;
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
        items: data.items || [],
        count: data.count || 0
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default ResourceListNode;
