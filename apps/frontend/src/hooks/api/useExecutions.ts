/**
 * React Query Hooks for Execution Management
 *
 * Provides custom hooks for all execution-related operations using React Query.
 * These hooks handle data fetching, caching, mutations, and state management
 * for workflow execution history, detailed execution views, and re-run functionality.
 *
 * Features:
 * - Automatic refetching on window focus
 * - Filter support (status, workflow, date range)
 * - Proper cache management for list and detail views
 * - Error handling with typed responses
 * - Re-run execution mutations with proper state management
 * - Stale time configured for frequently-changing execution data
 *
 * Requirements Coverage:
 * - Requirement 8: Workflow Detail View and Execution History
 * - Requirement 12: Automation Execution Management and Monitoring
 * - Requirement 14: Execution History and State Inspection
 *
 * @module hooks/api/useExecutions
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { WorkflowExecution } from '../../types/execution.types';
import type { ExecutionFilterOptions } from '../../types/execution.types';
import {
  fetchExecutions,
  fetchExecution,
  fetchExecutionsByWorkflow,
  fetchExecutionsByAutomation,
  rerunExecution,
} from '../../services/api/executions.api';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query key factory for execution-related queries
 * Provides consistent query keys for proper cache management and invalidation
 */
export const executionKeys = {
  all: ['executions'] as const,
  lists: () => [...executionKeys.all, 'list'] as const,
  list: (filters?: ExecutionFilterOptions) =>
    [...executionKeys.lists(), filters] as const,
  details: () => [...executionKeys.all, 'detail'] as const,
  detail: (id: string) => [...executionKeys.details(), id] as const,
  byWorkflow: (workflowId: string) =>
    [...executionKeys.all, 'workflow', workflowId] as const,
  byAutomation: (automationId: string) =>
    [...executionKeys.all, 'automation', automationId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all executions with optional filtering
 *
 * Retrieves a paginated list of workflow executions from the database.
 * Supports filtering by status, workflow ID, and date range.
 * Automatically refetches on window focus and provides caching.
 *
 * Suitable for the executions list page with filtering capabilities.
 *
 * @param filters - Optional filter options including:
 *   - status: 'pending' | 'running' | 'completed' | 'failed'
 *   - workflowId: Filter by specific workflow
 *   - dateRange: Filter by execution time range (startDate, endDate)
 *   - page: Page number for pagination
 *   - pageSize: Number of items per page
 *   - sortBy: Field to sort by ('startTime', 'duration', 'status')
 *   - sortOrder: Sort order ('asc' | 'desc')
 * @returns React Query result with executions array, loading state, error state, and refetch function
 *
 * @example
 * ```typescript
 * function ExecutionsPage() {
 *   const { data: executions, isLoading, error, refetch } = useExecutions();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return <ExecutionList executions={executions} />;
 * }
 * ```
 *
 * @example With filters
 * ```typescript
 * const { data: failedExecutions } = useExecutions({
 *   status: 'failed',
 *   workflowId: 'workflow-123'
 * });
 * ```
 *
 * @example With date range filter
 * ```typescript
 * const today = new Date();
 * const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
 *
 * const { data: recentExecutions } = useExecutions({
 *   dateRange: {
 *     startDate: oneWeekAgo,
 *     endDate: today
 *   },
 *   sortBy: 'startTime',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export function useExecutions(filters?: ExecutionFilterOptions) {
  return useQuery({
    queryKey: executionKeys.list(filters),
    queryFn: () => fetchExecutions(filters),
    staleTime: 1 * 60 * 1000, // 1 minute (executions change frequently)
    refetchOnWindowFocus: true, // Requirement 14: Auto-refetch on focus for real-time awareness
    refetchOnMount: true, // Refetch on mount if data is stale (e.g., after new execution)
    retry: 3,
  });
}

/**
 * Fetch a single execution by ID with all details
 *
 * Retrieves complete execution data including metadata, state snapshots,
 * state changes, and node execution logs.
 *
 * Provides caching and automatic refetching for execution detail views.
 * Shorter stale time than list queries since detailed data can change during execution.
 *
 * @param id - Execution ID (UUID)
 * @param options - Optional query options:
 *   - enabled: Whether to run the query (useful for conditional fetching)
 * @returns React Query result with execution data
 *
 * @example
 * ```typescript
 * function ExecutionDetailPage() {
 *   const { id } = useParams();
 *   const { data: execution, isLoading, error } = useExecution(id);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!execution) return <NotFound />;
 *
 *   return <ExecutionDetailView execution={execution} />;
 * }
 * ```
 *
 * @example With conditional execution
 * ```typescript
 * const { data: execution } = useExecution(id, {
 *   enabled: !!id && userHasPermission('EXECUTION_READ')
 * });
 * ```
 */
export function useExecution(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: executionKeys.detail(id!),
    queryFn: () => fetchExecution(id!),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 30 * 1000, // 30 seconds (detail data can change during execution)
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (execution not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

/**
 * Fetch executions for a specific workflow
 *
 * Retrieves execution history for a workflow with optional filtering.
 * Useful for displaying recent executions on the workflow detail page.
 *
 * @param workflowId - Workflow ID (UUID)
 * @param filters - Optional filter options
 * @returns React Query result with workflow executions
 *
 * @example
 * ```typescript
 * function WorkflowDetailPage() {
 *   const { workflowId } = useParams();
 *   const { data: executions } = useExecutionsByWorkflow(workflowId, {
 *     pageSize: 20,
 *     sortBy: 'startTime',
 *     sortOrder: 'desc'
 *   });
 *
 *   return <ExecutionHistoryTable executions={executions} />;
 * }
 * ```
 */
export function useExecutionsByWorkflow(
  workflowId: string | undefined,
  filters?: ExecutionFilterOptions
) {
  return useQuery({
    queryKey: executionKeys.byWorkflow(workflowId!),
    queryFn: () => fetchExecutionsByWorkflow(workflowId!, filters),
    enabled: !!workflowId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Refetch on mount if data is stale
  });
}

/**
 * Fetch executions for a specific automation
 *
 * Retrieves execution history triggered by a specific automation.
 * Useful for displaying execution history on the automation detail page.
 *
 * @param automationId - Automation ID (UUID)
 * @param filters - Optional filter options
 * @returns React Query result with automation executions
 *
 * @example
 * ```typescript
 * function AutomationDetailPage() {
 *   const { automationId } = useParams();
 *   const { data: executions, isLoading } = useExecutionsByAutomation(automationId, {
 *     pageSize: 50,
 *     sortBy: 'startTime',
 *     sortOrder: 'desc'
 *   });
 *
 *   return isLoading ? <LoadingSpinner /> : <ExecutionHistoryTable executions={executions} />;
 * }
 * ```
 */
export function useExecutionsByAutomation(
  automationId: string | undefined,
  filters?: ExecutionFilterOptions
) {
  return useQuery({
    queryKey: executionKeys.byAutomation(automationId!),
    queryFn: () => fetchExecutionsByAutomation(automationId!, filters),
    enabled: !!automationId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Refetch on mount if data is stale
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Re-run a previous execution
 *
 * Creates a new execution by re-running a workflow with the same or modified
 * configuration as a previous execution. Useful for retrying failed workflows
 * or testing with the same data.
 *
 * Features:
 * - Shows success/error toast notifications
 * - Invalidates execution list caches
 * - Returns new execution for navigation or further inspection
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```typescript
 * function ExecutionDetailPage() {
 *   const navigate = useNavigate();
 *   const rerunMutation = useRerunExecution();
 *   const { id } = useParams();
 *
 *   const handleRerun = async () => {
 *     try {
 *       const newExecution = await rerunMutation.mutateAsync({
 *         executionId: id!,
 *         useSameInitialState: true
 *       });
 *       navigate(`/executions/${newExecution.id}`);
 *       toast.success('Execution re-run started');
 *     } catch (error) {
 *       toast.error('Failed to re-run execution');
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleRerun}
 *       disabled={rerunMutation.isPending}
 *     >
 *       {rerunMutation.isPending ? 'Re-running...' : 'Re-run'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example With modified initial state
 * ```typescript
 * const newExecution = await rerunMutation.mutateAsync({
 *   executionId,
 *   useSameInitialState: false,
 *   initialState: { userId: '123', role: 'admin' }
 * });
 * ```
 */
export function useRerunExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      executionId,
      useSameInitialState,
      initialState,
    }: {
      executionId: string;
      useSameInitialState?: boolean;
      initialState?: Record<string, any>;
    }) =>
      rerunExecution(executionId, {
        useSameInitialState,
        initialState,
      }),
    onSuccess: (newExecution) => {
      // Invalidate execution lists to refresh counts and recent items
      queryClient.invalidateQueries({ queryKey: executionKeys.lists() });

      // Invalidate workflow-specific execution lists
      if (newExecution.workflowId) {
        queryClient.invalidateQueries({
          queryKey: executionKeys.byWorkflow(newExecution.workflowId),
        });
      }

      // Invalidate automation-specific execution lists
      if (newExecution.automationId) {
        queryClient.invalidateQueries({
          queryKey: executionKeys.byAutomation(newExecution.automationId),
        });
      }

      // Cache the new execution for immediate access
      queryClient.setQueryData(
        executionKeys.detail(newExecution.id),
        newExecution
      );

      toast.success('Execution re-run started', {
        description: `New execution ID: ${newExecution.id.substring(0, 8)}...`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to re-run execution', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'An unexpected error occurred.',
      });
    },
  });
}

/**
 * Invalidate all execution-related caches
 *
 * Utility function to manually invalidate execution caches.
 * Useful when external events (like WebSocket updates) indicate data has changed.
 *
 * @param queryClient - React Query client instance
 * @param scope - Which caches to invalidate:
 *   - 'all': Invalidate all execution queries
 *   - 'lists': Invalidate only execution list queries
 *   - 'details': Invalidate only execution detail queries
 *   - workflowId: Invalidate queries for a specific workflow
 *   - automationId: Invalidate queries for a specific automation
 *
 * @example
 * ```typescript
 * import { useQueryClient } from '@tanstack/react-query';
 * import { invalidateExecutionQueries, executionKeys } from './useExecutions';
 *
 * function useWebSocketSync() {
 *   const queryClient = useQueryClient();
 *   const socket = useWebSocket();
 *
 *   useEffect(() => {
 *     socket.on('execution:completed', (execution) => {
 *       // Refresh execution lists when a new execution completes
 *       invalidateExecutionQueries(queryClient, 'all');
 *     });
 *   }, [socket, queryClient]);
 * }
 * ```
 */
export function invalidateExecutionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: 'all' | 'lists' | 'details' | { workflowId?: string; automationId?: string }
) {
  if (scope === 'all') {
    queryClient.invalidateQueries({ queryKey: executionKeys.all });
  } else if (scope === 'lists') {
    queryClient.invalidateQueries({ queryKey: executionKeys.lists() });
  } else if (scope === 'details') {
    queryClient.invalidateQueries({ queryKey: executionKeys.details() });
  } else if ('workflowId' in scope && scope.workflowId) {
    queryClient.invalidateQueries({
      queryKey: executionKeys.byWorkflow(scope.workflowId),
    });
  } else if ('automationId' in scope && scope.automationId) {
    queryClient.invalidateQueries({
      queryKey: executionKeys.byAutomation(scope.automationId),
    });
  }
}
