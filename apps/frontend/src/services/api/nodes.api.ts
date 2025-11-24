/**
 * Nodes API Service
 *
 * Service layer for interacting with the nodes API endpoints.
 * Provides methods for:
 * - Fetching all available nodes with optional filtering
 * - Fetching detailed metadata for specific nodes
 * - Executing nodes in isolation for testing purposes
 *
 * **Architecture Note (November 2025):**
 * With the server-only architecture migration, all workflow nodes now execute
 * exclusively on the API server via `@workscript/nodes` package. The frontend
 * serves as a management UI only - it does NOT execute workflows locally.
 *
 * All node filtering by "source" (universal/server/client) is kept for backward
 * compatibility, but all nodes are now effectively server nodes.
 *
 * @see .kiro/specs/new_nodes/ for architecture details
 *
 * Requirements Coverage:
 * - Requirement 1: Node Library Browser
 * - Requirement 2: Node Detail View and Metadata Display
 * - Requirement 3: Node Test Runner and Execution
 *
 * @module services/api/nodes
 */

import type { AxiosResponse } from 'axios';
import apiClient from './client';
import type { ApiResponse, ApiListResponse } from '../../types/api.types';
import type { NodeMetadata, NodeSource, NodeTestResult } from '../../types/node.types';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Request parameters for fetching all nodes
 */
export interface FetchNodesParams {
  /** Filter nodes by source (universal, server, or client) */
  source?: NodeSource;

  /** Search query to filter nodes by name, ID, or description */
  search?: string;

  /** Filter by category */
  category?: string;

  /** Filter by tags */
  tags?: string[];

  /** Include deprecated nodes in results */
  includeDeprecated?: boolean;
}

/**
 * Response from the allnodes endpoint
 */
export interface FetchNodesResponse {
  /** Array of node metadata */
  nodes: NodeMetadata[];

  /** Total number of nodes */
  total: number;

  /** Breakdown by source */
  bySource?: {
    universal: number;
    server: number;
    client?: number;
  };
}

/**
 * Request payload for executing a node
 */
export interface ExecuteNodeRequest {
  /** Node configuration (JSON object) */
  config: Record<string, any>;

  /** Initial state (optional) */
  initialState?: Record<string, any>;
}

/**
 * Response from node execution
 */
export interface ExecuteNodeResponse {
  /** Whether the execution was successful */
  success: boolean;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Returned edges from the node */
  edges?: Record<string, any>;

  /** Final state after execution */
  finalState?: Record<string, any>;

  /** Error message if execution failed */
  error?: string;

  /** Error stack trace if execution failed */
  stackTrace?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch all available nodes from the registry
 *
 * Retrieves the complete list of workflow nodes available in the Workscript engine.
 * All nodes are served from the `@workscript/nodes` package on the server.
 *
 * **Architecture Note:** With server-only execution, source filtering is kept for
 * backward compatibility but all 35+ nodes execute exclusively on the API server.
 *
 * **API Endpoint:** `GET /workscript/workflows/allnodes`
 *
 * **Example Usage:**
 * ```typescript
 * // Fetch all nodes (recommended)
 * const allNodes = await fetchAllNodes();
 *
 * // Search for specific nodes
 * const mathNodes = await fetchAllNodes({ search: 'math' });
 *
 * // Filter by category
 * const dataNodes = await fetchAllNodes({ category: 'data' });
 * ```
 *
 * @param params - Optional filter parameters
 * @param params.source - Filter by node source (kept for backward compatibility)
 * @param params.search - Search query to match against node name, ID, or description
 * @param params.category - Filter by node category
 * @param params.tags - Filter by node tags
 * @param params.includeDeprecated - Whether to include deprecated nodes (default: false)
 * @returns Promise resolving to array of node metadata
 * @throws {AxiosError} If the API request fails
 *
 * @see {@link NodeMetadata} for the structure of returned node data
 */
export async function fetchAllNodes(params?: FetchNodesParams): Promise<NodeMetadata[]> {
  try {
    // Build query parameters
    const queryParams: Record<string, any> = {};

    if (params?.source) {
      queryParams.source = params.source;
    }

    if (params?.search) {
      queryParams.search = params.search;
    }

    if (params?.category) {
      queryParams.category = params.category;
    }

    if (params?.tags && params.tags.length > 0) {
      queryParams.tags = params.tags.join(',');
    }

    if (params?.includeDeprecated !== undefined) {
      queryParams.includeDeprecated = params.includeDeprecated;
    }

    // Make API request
    const response: AxiosResponse<FetchNodesResponse> = await apiClient.get(
      '/workscript/workflows/allnodes',
      { params: queryParams }
    );

    // Extract nodes array from response
    // Handle both direct array response and object with nodes property
    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (response.data && Array.isArray(response.data.nodes)) {
      return response.data.nodes;
    }

    // Fallback to empty array if response structure is unexpected
    console.warn('[Nodes API] Unexpected response structure:', response.data);
    return [];
  } catch (error) {
    console.error('[Nodes API] Failed to fetch nodes:', error);
    throw error;
  }
}

/**
 * Fetch detailed metadata for a specific node
 *
 * Retrieves complete metadata for a single node, including:
 * - Basic information (id, name, version, description)
 * - Input and output field definitions
 * - AI hints for usage guidance
 * - Example configurations
 * - Related nodes and documentation links
 *
 * **API Endpoint:** `GET /workscript/nodes/metadata/:nodeId`
 *
 * **Example Usage:**
 * ```typescript
 * // Fetch metadata for the math node
 * const mathNode = await fetchNodeMetadata('math');
 *
 * // Access AI hints
 * console.log(mathNode.ai_hints?.purpose);
 * console.log(mathNode.ai_hints?.example_usage);
 * ```
 *
 * @param nodeId - The unique identifier of the node (e.g., 'math', 'logic', 'dataTransform')
 * @returns Promise resolving to the node's complete metadata
 * @throws {AxiosError} If the API request fails (404 if node not found)
 *
 * @see {@link NodeMetadata} for the structure of returned metadata
 */
export async function fetchNodeMetadata(nodeId: string): Promise<NodeMetadata> {
  try {
    if (!nodeId || nodeId.trim() === '') {
      throw new Error('Node ID is required');
    }

    // Make API request
    const response: AxiosResponse<{ success: boolean; metadata: NodeMetadata }> = await apiClient.get(
      `/workscript/nodes/metadata/${encodeURIComponent(nodeId)}`
    );

    // Extract metadata from wrapped response
    return response.data.metadata;
  } catch (error) {
    console.error(`[Nodes API] Failed to fetch metadata for node "${nodeId}":`, error);
    throw error;
  }
}

/**
 * Execute a node in isolation for testing
 *
 * Runs a single node with the provided configuration and initial state,
 * allowing developers to test node behavior before using it in workflows.
 *
 * The execution is isolated and does not affect any existing workflows or automations.
 * Results include:
 * - Execution time
 * - Returned edges (success, error, custom edges)
 * - Final state after execution
 * - Error details if execution failed
 *
 * **API Endpoint:** `POST /workscript/nodes/run/:nodeId`
 *
 * **Example Usage:**
 * ```typescript
 * // Test a math node
 * const result = await executeNode('math', {
 *   config: {
 *     operation: 'add',
 *     values: [10, 20, 30]
 *   },
 *   initialState: {}
 * });
 *
 * console.log('Result:', result.finalState?.mathResult); // 60
 * console.log('Execution time:', result.executionTime, 'ms');
 *
 * // Test with initial state
 * const result2 = await executeNode('stateGetter', {
 *   config: { key: 'developer' },
 *   initialState: { developer: 'Alice' }
 * });
 * ```
 *
 * @param nodeId - The unique identifier of the node to execute
 * @param request - Execution request containing config and optional initial state
 * @param request.config - Node configuration (JSON object with node-specific parameters)
 * @param request.initialState - Optional initial state for the execution context
 * @returns Promise resolving to execution result with edges, state, and timing
 * @throws {AxiosError} If the API request fails or node execution fails
 *
 * @see {@link ExecuteNodeRequest} for request payload structure
 * @see {@link ExecuteNodeResponse} for response structure
 * @see {@link NodeTestResult} for the UI representation of test results
 */
export async function executeNode(
  nodeId: string,
  request: ExecuteNodeRequest
): Promise<ExecuteNodeResponse> {
  try {
    if (!nodeId || nodeId.trim() === '') {
      throw new Error('Node ID is required');
    }

    if (!request.config) {
      throw new Error('Node configuration is required');
    }

    // Make API request
    const response: AxiosResponse<ExecuteNodeResponse> = await apiClient.post(
      `/workscript/nodes/run/${encodeURIComponent(nodeId)}`,
      {
        config: request.config,
        initialState: request.initialState || {},
      }
    );

    return response.data;
  } catch (error) {
    console.error(`[Nodes API] Failed to execute node "${nodeId}":`, error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a node is available for execution via the API
 *
 * **Architecture Note (November 2025):** With server-only execution, all nodes
 * are now available via the API regardless of their legacy "source" designation.
 * This function is kept for backward compatibility but now always returns true
 * since all workflow execution happens server-side.
 *
 * @param node - Node metadata to check
 * @returns true - all nodes are now available via API execution
 *
 * @example
 * ```typescript
 * const mathNode = await fetchNodeMetadata('math');
 * const available = isNodeAvailable(mathNode);
 * console.log('Math node available:', available); // true (all nodes available via API)
 *
 * const fsNode = await fetchNodeMetadata('filesystem');
 * console.log('Filesystem node available:', isNodeAvailable(fsNode)); // true (executes on server)
 * ```
 *
 * @deprecated This function is kept for backward compatibility. With server-only
 * execution, all nodes are available via the API. Use the API directly to execute
 * workflows instead of checking availability client-side.
 */
export function isNodeAvailable(node: NodeMetadata): boolean {
  // With server-only architecture, all nodes are available via API execution
  // The frontend never executes workflows locally anymore
  //
  // Legacy logic kept for reference:
  // - Universal nodes were available everywhere
  // - Client nodes were browser-only
  // - Server nodes were API-only
  //
  // Now: All nodes execute on the server via API
  return true;
}

/**
 * Get a user-friendly error message from an API error
 *
 * Extracts and formats error messages from Axios errors for display to users.
 *
 * @param error - The error object from a failed API request
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await fetchNodeMetadata('invalid-node-id');
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast.error(message); // "Node not found"
 * }
 * ```
 */
export function getErrorMessage(error: any): string {
  // Check for Axios error response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Handle specific status codes
    if (status === 404) {
      return data?.message || 'Node not found. It may have been removed or the ID is incorrect.';
    }

    if (status === 400) {
      return data?.message || 'Invalid request. Please check your input and try again.';
    }

    if (status === 500) {
      return data?.message || 'An unexpected server error occurred. Please try again later.';
    }

    // Generic error with message from server
    if (data?.message) {
      return data.message;
    }

    if (data?.error) {
      return data.error;
    }
  }

  // Network error
  if (error.request && !error.response) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Generic error
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Filter nodes by search query
 *
 * Client-side filtering of nodes by matching against name, ID, or description.
 * This is useful for implementing real-time search without making API calls.
 *
 * @param nodes - Array of node metadata to filter
 * @param query - Search query string
 * @returns Filtered array of nodes
 *
 * @example
 * ```typescript
 * const allNodes = await fetchAllNodes();
 * const mathNodes = filterNodesBySearch(allNodes, 'math');
 * const dataNodes = filterNodesBySearch(allNodes, 'transform');
 * ```
 */
export function filterNodesBySearch(nodes: NodeMetadata[], query: string): NodeMetadata[] {
  if (!query || query.trim() === '') {
    return nodes;
  }

  const searchLower = query.toLowerCase().trim();

  return nodes.filter((node) => {
    // Match against node ID
    if (node.id && node.id.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Match against node name
    if (node.name && node.name.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Match against description
    if (node.description && node.description.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Match against tags
    if (node.tags && node.tags.some((tag) => tag.toLowerCase().includes(searchLower))) {
      return true;
    }

    return false;
  });
}

/**
 * Filter nodes by source
 *
 * Client-side filtering of nodes by their legacy source designation.
 *
 * **Architecture Note (November 2025):** With server-only execution, source
 * filtering is kept for backward compatibility and UI organization purposes only.
 * All nodes execute on the server regardless of their source designation.
 *
 * @param nodes - Array of node metadata to filter
 * @param source - Node source to filter by
 * @returns Filtered array of nodes
 *
 * @example
 * ```typescript
 * const allNodes = await fetchAllNodes();
 * // Filter by category for UI display (all nodes execute server-side)
 * const serverNodes = filterNodesBySource(allNodes, NodeSource.SERVER);
 * ```
 *
 * @deprecated Source filtering is kept for backward compatibility.
 * All nodes now execute server-side via the API.
 */
export function filterNodesBySource(nodes: NodeMetadata[], source: NodeSource): NodeMetadata[] {
  return nodes.filter((node) => node.source === source);
}

// ============================================
// EXPORTS
// ============================================

export default {
  fetchAllNodes,
  fetchNodeMetadata,
  executeNode,
  isNodeAvailable,
  getErrorMessage,
  filterNodesBySearch,
  filterNodesBySource,
};
