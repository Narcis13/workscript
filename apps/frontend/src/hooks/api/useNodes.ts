/**
 * React Query Hooks for Nodes API
 *
 * Custom hooks for interacting with the Workscript nodes API using React Query.
 * Provides data fetching, caching, and mutation capabilities for:
 * - Fetching all available nodes with filtering
 * - Fetching detailed metadata for specific nodes
 * - Executing nodes in isolation for testing
 *
 * **Architecture Note (November 2025):** With server-only execution, all nodes
 * are served from `@workscript/nodes` package via the API. The frontend uses
 * these hooks to display and interact with nodes but does NOT execute workflows
 * locally. All workflow execution happens server-side.
 *
 * These hooks automatically handle:
 * - Loading states
 * - Error handling
 * - Data caching and revalidation
 * - Optimistic updates
 * - Background refetching
 *
 * Requirements Coverage:
 * - Requirement 1: Node Library Browser
 * - Requirement 2: Node Detail View and Metadata Display
 * - Requirement 3: Node Test Runner and Execution
 *
 * @module hooks/api/useNodes
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchAllNodes,
  fetchNodeMetadata,
  executeNode,
  getErrorMessage,
  type FetchNodesParams,
  type ExecuteNodeRequest,
  type ExecuteNodeResponse,
} from '../../services/api/nodes.api';
import type { NodeMetadata, NodeSource } from '../../types/node.types';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query key factory for nodes-related queries
 *
 * Provides consistent, type-safe query keys for React Query cache management.
 * Keys are structured hierarchically to support granular cache invalidation.
 *
 * @example
 * ```typescript
 * // Invalidate all nodes queries
 * queryClient.invalidateQueries({ queryKey: nodesKeys.all });
 *
 * // Invalidate only node lists (but not individual node details)
 * queryClient.invalidateQueries({ queryKey: nodesKeys.lists() });
 *
 * // Invalidate a specific node's metadata
 * queryClient.invalidateQueries({ queryKey: nodesKeys.detail('math') });
 * ```
 */
export const nodesKeys = {
  /** Base key for all nodes-related queries */
  all: ['nodes'] as const,

  /** Keys for all node list queries */
  lists: () => [...nodesKeys.all, 'list'] as const,

  /** Key for a specific node list query with filters */
  list: (params?: FetchNodesParams) => [...nodesKeys.lists(), params] as const,

  /** Keys for all node detail queries */
  details: () => [...nodesKeys.all, 'detail'] as const,

  /** Key for a specific node's metadata */
  detail: (nodeId: string) => [...nodesKeys.details(), nodeId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook for fetching all available workflow nodes
 *
 * Retrieves the complete list of nodes from the Workscript registry (35+ nodes
 * from `@workscript/nodes` package) with optional filtering.
 *
 * **Note:** All nodes execute server-side. Source filtering is kept for backward
 * compatibility and UI organization but all nodes are available via API execution.
 *
 * **Features:**
 * - Automatic caching with React Query
 * - Loading and error states
 * - Background refetching on window focus
 * - Automatic retries on failure (3 attempts)
 * - Stale data revalidation after 5 minutes
 *
 * **Example Usage:**
 * ```typescript
 * // Fetch all nodes (recommended)
 * const { data: nodes, isLoading, error, refetch } = useNodes();
 *
 * // Search for specific nodes
 * const { data: searchResults } = useNodes({ search: 'math' });
 *
 * // Filter by category
 * const { data: dataNodes } = useNodes({ category: 'data' });
 *
 * // Disable query until user action
 * const { data, refetch } = useNodes(undefined, { enabled: false });
 * ```
 *
 * @param params - Optional filter parameters
 * @param params.source - Filter by node source (kept for backward compatibility)
 * @param params.search - Search query to match against node name, ID, or description
 * @param params.category - Filter by node category
 * @param params.tags - Filter by node tags
 * @param params.includeDeprecated - Whether to include deprecated nodes
 * @param options - React Query options (enabled, refetchInterval, etc.)
 * @returns React Query result with nodes array, loading state, and error handling
 *
 * @see {@link NodeMetadata} for the structure of returned node data
 * @see {@link FetchNodesParams} for available filter parameters
 */
export function useNodes(
  params?: FetchNodesParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
  }
): UseQueryResult<NodeMetadata[], Error> {
  return useQuery({
    queryKey: nodesKeys.list(params),
    queryFn: () => fetchAllNodes(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    refetchOnWindowFocus: options?.refetchOnWindowFocus !== false,
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Hook for fetching detailed metadata for a specific node
 *
 * Retrieves complete metadata for a single node, including:
 * - Basic information (id, name, version, description)
 * - Input and output field definitions
 * - AI hints for usage guidance
 * - Example configurations
 *
 * **Features:**
 * - Automatic caching (data remains fresh for 10 minutes)
 * - Error handling with user-friendly messages
 * - 404 detection for non-existent nodes
 * - Automatic retries on transient failures
 *
 * **Example Usage:**
 * ```typescript
 * // Basic usage
 * const { data: node, isLoading, error } = useNodeMetadata('math');
 *
 * // Access node metadata
 * if (data) {
 *   console.log(data.ai_hints?.purpose);
 *   console.log(data.ai_hints?.example_usage);
 * }
 *
 * // Conditional fetching (only when nodeId is available)
 * const { data } = useNodeMetadata(nodeId, { enabled: !!nodeId });
 *
 * // Handle errors
 * if (error) {
 *   console.error('Failed to load node:', error.message);
 * }
 * ```
 *
 * @param nodeId - The unique identifier of the node to fetch
 * @param options - React Query options
 * @param options.enabled - Whether the query should execute (default: true if nodeId is provided)
 * @returns React Query result with node metadata, loading state, and error handling
 *
 * @see {@link NodeMetadata} for the structure of returned metadata
 */
export function useNodeMetadata(
  nodeId: string,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<NodeMetadata, Error> {
  return useQuery({
    queryKey: nodesKeys.detail(nodeId),
    queryFn: () => fetchNodeMetadata(nodeId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (node not found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    enabled: options?.enabled !== false && !!nodeId,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook for executing a node in isolation for testing
 *
 * Provides a mutation for running a single node with custom configuration and initial state.
 * This is useful for testing node behavior before using it in workflows.
 *
 * **Features:**
 * - Loading state management during execution
 * - Success/error toast notifications
 * - Automatic error handling
 * - Execution time tracking
 * - State and edge data returned
 *
 * **Example Usage:**
 * ```typescript
 * const { mutate: executeNodeTest, isPending, data, error } = useExecuteNode();
 *
 * // Execute a math node
 * executeNodeTest({
 *   nodeId: 'math',
 *   config: {
 *     operation: 'add',
 *     values: [10, 20, 30]
 *   },
 *   initialState: {}
 * }, {
 *   onSuccess: (result) => {
 *     console.log('Result:', result.finalState?.mathResult);
 *     console.log('Execution time:', result.executionTime, 'ms');
 *   },
 *   onError: (error) => {
 *     console.error('Execution failed:', error);
 *   }
 * });
 *
 * // Access mutation state
 * if (isPending) {
 *   console.log('Executing node...');
 * }
 *
 * if (data) {
 *   console.log('Execution completed:', data);
 * }
 * ```
 *
 * @returns React Query mutation result with execute function and state
 *
 * @see {@link ExecuteNodeRequest} for request payload structure
 * @see {@link ExecuteNodeResponse} for response structure
 */
export function useExecuteNode(): UseMutationResult<
  ExecuteNodeResponse,
  Error,
  { nodeId: string; config: Record<string, any>; initialState?: Record<string, any> },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nodeId,
      config,
      initialState,
    }: {
      nodeId: string;
      config: Record<string, any>;
      initialState?: Record<string, any>;
    }) => {
      return executeNode(nodeId, { config, initialState });
    },

    onSuccess: (data, variables) => {
      // Show success toast
      if (data.success) {
        toast.success('Node executed successfully', {
          description: `Execution completed in ${data.executionTime}ms`,
        });
      } else {
        // Execution completed but returned error edge
        toast.error('Node execution failed', {
          description: data.error || 'The node returned an error edge',
        });
      }

      // Optionally invalidate related queries
      // (Not needed for isolated node execution, but kept for consistency)
    },

    onError: (error: any) => {
      // Extract user-friendly error message
      const message = getErrorMessage(error);

      // Show error toast
      toast.error('Failed to execute node', {
        description: message,
      });
    },
  });
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook for prefetching node metadata
 *
 * Useful for preloading node data before the user navigates to the detail page.
 * This improves perceived performance by loading data in the background.
 *
 * **Example Usage:**
 * ```typescript
 * const prefetchNode = usePrefetchNodeMetadata();
 *
 * // Prefetch on hover
 * <NodeCard
 *   onMouseEnter={() => prefetchNode('math')}
 *   onClick={() => navigate(`/nodes/math`)}
 * />
 * ```
 *
 * @returns Function to prefetch node metadata
 */
export function usePrefetchNodeMetadata() {
  const queryClient = useQueryClient();

  return (nodeId: string) => {
    queryClient.prefetchQuery({
      queryKey: nodesKeys.detail(nodeId),
      queryFn: () => fetchNodeMetadata(nodeId),
      staleTime: 10 * 60 * 1000,
    });
  };
}

/**
 * Hook for filtering nodes by source on the client side
 *
 * Useful when you have all nodes loaded and want to filter by source for
 * UI organization purposes.
 *
 * **Note (November 2025):** With server-only execution, source filtering is
 * kept for backward compatibility and UI organization. All nodes execute via API.
 *
 * **Example Usage:**
 * ```typescript
 * const { data: allNodes } = useNodes();
 * const serverNodes = useFilteredNodes(allNodes, NodeSource.SERVER);
 * ```
 *
 * @param nodes - Array of node metadata
 * @param source - Node source to filter by (kept for backward compatibility)
 * @returns Filtered array of nodes
 * @deprecated Source filtering is kept for UI organization. All nodes execute server-side.
 */
export function useFilteredNodes(nodes: NodeMetadata[] | undefined, source?: NodeSource): NodeMetadata[] {
  if (!nodes) return [];
  if (!source) return nodes;

  return nodes.filter((node) => node.source === source);
}

// ============================================
// EXPORTS
// ============================================

export default {
  useNodes,
  useNodeMetadata,
  useExecuteNode,
  usePrefetchNodeMetadata,
  useFilteredNodes,
  nodesKeys,
};
