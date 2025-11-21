/**
 * React Query Hooks for Automation Management
 *
 * Provides custom hooks for all automation-related operations using React Query.
 * These hooks handle data fetching, caching, mutations, and optimistic updates.
 *
 * Features:
 * - Automatic refetching on window focus
 * - Optimistic updates for mutations
 * - Cache invalidation on mutations
 * - Toast notifications for success/error states
 * - Proper TypeScript typing for all operations
 * - Support for filtering by trigger type and enabled status
 *
 * Requirements Coverage:
 * - Requirement 9: Automation List Management and Filtering
 * - Requirement 10: Automation Creation with Trigger Configuration
 * - Requirement 11: Cron Expression Builder and Validator
 * - Requirement 12: Automation Execution Management and Monitoring
 *
 * @module hooks/api/useAutomations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Automation,
  AutomationWithStats,
  CreateAutomationPayload,
  UpdateAutomationPayload,
  AutomationExecution,
  AutomationStats,
  AutomationFilterOptions,
  AutomationExecutionFilterOptions,
  RescheduleAutomationRequest,
  CronValidationResult,
  AutomationSummaryStats,
} from '../../types/automation.types';
import {
  fetchAutomations,
  fetchAutomation,
  fetchAutomationWithStats,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  executeAutomation,
  rescheduleAutomation,
  validateCronExpression,
  fetchAutomationExecutions,
  fetchAutomationExecution,
  fetchAutomationStats,
  fetchAutomationSummaryStats,
} from '../../services/api/automations.api';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query key factory for automation-related queries
 * Provides consistent query keys for proper cache management
 */
export const automationKeys = {
  all: ['automations'] as const,
  lists: () => [...automationKeys.all, 'list'] as const,
  list: (filters?: AutomationFilterOptions) =>
    [...automationKeys.lists(), filters] as const,
  details: () => [...automationKeys.all, 'detail'] as const,
  detail: (id: string) => [...automationKeys.details(), id] as const,
  stats: (id: string) => [...automationKeys.detail(id), 'stats'] as const,
  executions: (id: string) =>
    [...automationKeys.detail(id), 'executions'] as const,
  execution: (automationId: string, executionId: string) =>
    [...automationKeys.executions(automationId), executionId] as const,
  summary: () => [...automationKeys.all, 'summary'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all automations with optional filtering
 *
 * Automatically refetches on window focus and provides caching.
 * Suitable for automation list pages.
 *
 * Supports filtering by:
 * - Trigger type (cron, webhook, immediate)
 * - Enabled status (true/false)
 * - Workflow ID
 * - Search query (matches name or description)
 *
 * @param filters - Optional filter options
 * @returns React Query result with automations array
 *
 * @example
 * ```typescript
 * function AutomationsPage() {
 *   const { data: automations, isLoading, error, refetch } = useAutomations();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return <AutomationList automations={automations} />;
 * }
 * ```
 *
 * @example With filters
 * ```typescript
 * // Fetch only enabled cron automations
 * const { data: cronAutomations } = useAutomations({
 *   enabled: true,
 *   triggerType: TriggerType.CRON
 * });
 *
 * // Fetch automations with search
 * const { data: searchResults } = useAutomations({
 *   search: 'daily report'
 * });
 * ```
 */
export function useAutomations(filters?: AutomationFilterOptions) {
  return useQuery({
    queryKey: automationKeys.list(filters),
    queryFn: () => fetchAutomations(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single automation by ID
 *
 * Returns the automation entity without statistics.
 * For statistics, use `useAutomationWithStats` or `useAutomationStats`.
 *
 * @param id - Automation ID (UUID)
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with automation
 *
 * @example
 * ```typescript
 * function AutomationDetailPage({ automationId }) {
 *   const { data: automation, isLoading, error } = useAutomation(automationId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <AutomationDetails automation={automation} />;
 * }
 * ```
 */
export function useAutomation(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: automationKeys.detail(id),
    queryFn: () => fetchAutomation(id),
    enabled: !!id && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single automation with execution statistics
 *
 * Returns the automation entity enriched with execution statistics
 * (total runs, success/failure counts, average duration, etc.)
 *
 * @param id - Automation ID (UUID)
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with automation and stats
 *
 * @example
 * ```typescript
 * function AutomationStatsPanel({ automationId }) {
 *   const { data: automation, isLoading } = useAutomationWithStats(automationId);
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *
 *   return (
 *     <div>
 *       <h3>{automation.name}</h3>
 *       <p>Success rate: {automation.stats.successRate}%</p>
 *       <p>Total runs: {automation.stats.totalRuns}</p>
 *       <p>Average duration: {automation.stats.averageDuration}ms</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutomationWithStats(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: automationKeys.stats(id),
    queryFn: () => fetchAutomationWithStats(id),
    enabled: !!id && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes (stats may change more frequently)
  });
}

/**
 * Fetch execution statistics for an automation
 *
 * Returns only the statistics without the full automation object.
 * Use this for lighter payloads when only stats are needed.
 *
 * @param id - Automation ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with automation stats
 *
 * @example
 * ```typescript
 * function QuickStatsCard({ automationId }) {
 *   const { data: stats } = useAutomationStats(automationId);
 *
 *   return (
 *     <Card>
 *       <p>Total Runs: {stats?.totalRuns || 0}</p>
 *       <p>Success Rate: {stats?.successRate || 0}%</p>
 *     </Card>
 *   );
 * }
 * ```
 */
export function useAutomationStats(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: automationKeys.stats(id),
    queryFn: () => fetchAutomationStats(id),
    enabled: !!id && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch execution history for a specific automation
 *
 * @param automationId - Automation ID
 * @param filters - Optional filters for status, date range, pagination
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with execution records
 *
 * @example
 * ```typescript
 * function AutomationExecutionHistory({ automationId }) {
 *   const { data: executions, isLoading } = useAutomationExecutions(automationId);
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *
 *   return <ExecutionList executions={executions} />;
 * }
 * ```
 *
 * @example With filters
 * ```typescript
 * // Fetch only failed executions
 * const { data: failures } = useAutomationExecutions(automationId, {
 *   status: ExecutionStatus.FAILED
 * });
 * ```
 */
export function useAutomationExecutions(
  automationId: string,
  filters?: Omit<AutomationExecutionFilterOptions, 'automationId'>,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: automationKeys.executions(automationId),
    queryFn: () => fetchAutomationExecutions(automationId, filters),
    enabled: !!automationId && enabled,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
  });
}

/**
 * Fetch a single execution by ID
 *
 * @param automationId - Automation ID
 * @param executionId - Execution ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with execution details
 *
 * @example
 * ```typescript
 * function ExecutionDetailModal({ automationId, executionId }) {
 *   const { data: execution } = useAutomationExecution(automationId, executionId);
 *
 *   return (
 *     <Modal>
 *       <h3>Execution {execution?.id}</h3>
 *       <p>Status: {execution?.status}</p>
 *       <p>Duration: {execution?.duration}ms</p>
 *     </Modal>
 *   );
 * }
 * ```
 */
export function useAutomationExecution(
  automationId: string,
  executionId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: automationKeys.execution(automationId, executionId),
    queryFn: () => fetchAutomationExecution(automationId, executionId),
    enabled: !!automationId && !!executionId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch summary statistics for all automations
 *
 * Returns aggregate data useful for dashboard displays:
 * - Total/enabled/disabled counts
 * - Breakdown by trigger type
 * - Overall success rate
 * - Automations scheduled in next 24h
 *
 * @param enabled - Whether to enable the query (default: true)
 * @returns React Query result with summary statistics
 *
 * @example
 * ```typescript
 * function DashboardStats() {
 *   const { data: summary } = useAutomationSummaryStats();
 *
 *   return (
 *     <div>
 *       <StatCard label="Total Automations" value={summary?.total || 0} />
 *       <StatCard label="Enabled" value={summary?.enabled || 0} />
 *       <StatCard label="Cron Jobs" value={summary?.byTriggerType.cron || 0} />
 *       <StatCard label="Success Rate" value={`${summary?.successRate || 0}%`} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutomationSummaryStats(enabled: boolean = true) {
  return useQuery({
    queryKey: automationKeys.summary(),
    queryFn: fetchAutomationSummaryStats,
    enabled,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new automation
 *
 * Automatically invalidates the automations list cache on success
 * and shows toast notifications for success/error states.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function CreateAutomationForm() {
 *   const createMutation = useCreateAutomation();
 *
 *   const handleSubmit = async (data) => {
 *     try {
 *       const automation = await createMutation.mutateAsync(data);
 *       navigate(`/automations/${automation.id}`);
 *     } catch (error) {
 *       // Error toast is shown automatically
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {/* form fields *\/}
 *       <Button type="submit" disabled={createMutation.isPending}>
 *         {createMutation.isPending ? 'Creating...' : 'Create Automation'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAutomation,
    onSuccess: (newAutomation) => {
      // Invalidate automations list to trigger refetch
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });

      // Invalidate summary stats
      queryClient.invalidateQueries({ queryKey: automationKeys.summary() });

      // Show success toast
      toast.success('Automation created successfully', {
        description: `${newAutomation.name} has been created and ${newAutomation.enabled ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error: Error) => {
      // Show error toast
      toast.error('Failed to create automation', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    },
  });
}

/**
 * Update an existing automation
 *
 * Automatically invalidates the automation cache on success
 * and shows toast notifications.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function EditAutomationForm({ automation }) {
 *   const updateMutation = useUpdateAutomation();
 *
 *   const handleSubmit = async (data) => {
 *     await updateMutation.mutateAsync({ id: automation.id, data });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {/* form fields *\/}
 *       <Button type="submit" disabled={updateMutation.isPending}>
 *         Save Changes
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAutomationPayload }) =>
      updateAutomation(id, data),
    onSuccess: (updatedAutomation) => {
      // Invalidate specific automation query
      queryClient.invalidateQueries({
        queryKey: automationKeys.detail(updatedAutomation.id),
      });

      // Invalidate automations list
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });

      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: automationKeys.stats(updatedAutomation.id),
      });

      // Show success toast
      toast.success('Automation updated successfully', {
        description: `${updatedAutomation.name} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update automation', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    },
  });
}

/**
 * Delete an automation by ID
 *
 * Automatically invalidates caches and shows toast notifications.
 * This action cannot be undone.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function DeleteAutomationButton({ automation }) {
 *   const deleteMutation = useDeleteAutomation();
 *   const [showConfirm, setShowConfirm] = useState(false);
 *
 *   const handleDelete = async () => {
 *     try {
 *       await deleteMutation.mutateAsync(automation.id);
 *       navigate('/automations');
 *     } catch (error) {
 *       // Error toast shown automatically
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <Button variant="destructive" onClick={() => setShowConfirm(true)}>
 *         Delete
 *       </Button>
 *       <ConfirmDialog
 *         open={showConfirm}
 *         onConfirm={handleDelete}
 *         title={`Delete "${automation.name}"?`}
 *         description="This will unschedule the automation permanently. This action cannot be undone."
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAutomation,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: automationKeys.detail(deletedId) });

      // Invalidate lists to trigger refetch
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });

      // Invalidate summary stats
      queryClient.invalidateQueries({ queryKey: automationKeys.summary() });

      // Show success toast
      toast.success('Automation deleted successfully', {
        description: 'The automation has been removed and unscheduled.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete automation', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    },
  });
}

/**
 * Toggle an automation's enabled status
 *
 * Enables or disables an automation with comprehensive optimistic updates for instant UI feedback.
 * Updates both the automation detail and all automation lists to ensure consistent UI state.
 * When disabled, scheduled executions will not run, and webhooks will return 404.
 *
 * **Optimistic Updates Strategy:**
 * 1. Cancels any pending refetches to prevent race conditions
 * 2. Snapshots the current automation from the detail cache
 * 3. Snapshots all automation lists that might contain this automation
 * 4. Optimistically updates the detail cache with new enabled status
 * 5. Optimistically updates all list caches to reflect the toggle
 * 6. On success: confirms updates with server response and invalidates related queries
 * 7. On error: rolls back all caches to pre-mutation state with error toast
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function AutomationToggle({ automation }) {
 *   const toggleMutation = useToggleAutomation();
 *
 *   const handleToggle = async (enabled: boolean) => {
 *     await toggleMutation.mutateAsync({ id: automation.id, enabled });
 *   };
 *
 *   return (
 *     <Switch
 *       checked={automation.enabled}
 *       onCheckedChange={handleToggle}
 *       disabled={toggleMutation.isPending}
 *     />
 *   );
 * }
 * ```
 *
 * @example With loading state feedback
 * ```typescript
 * const toggleMutation = useToggleAutomation();
 *
 * <Switch
 *   checked={automation.enabled}
 *   onCheckedChange={(checked) =>
 *     toggleMutation.mutateAsync({ id: automation.id, enabled: checked })
 *   }
 *   disabled={toggleMutation.isPending}
 * />
 * {toggleMutation.isPending && <Loader2 className="animate-spin" />}
 * ```
 */
export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleAutomation(id, enabled),
    onMutate: async ({ id, enabled }) => {
      // ========================================
      // CANCEL PENDING REFETCHES
      // ========================================
      // Cancel any outgoing refetches to avoid race conditions and overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: automationKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: automationKeys.lists() });

      // ========================================
      // SNAPSHOT CURRENT STATE
      // ========================================
      // Snapshot the detail automation for rollback
      const previousAutomation = queryClient.getQueryData<Automation>(
        automationKeys.detail(id)
      );

      // Snapshot all list caches (all possible filter combinations)
      // This ensures we can rollback list views if the mutation fails
      const previousLists = new Map<string[], Array<Automation>>();
      queryClient.getQueriesData({ queryKey: automationKeys.lists() }).forEach(
        ([key, data]) => {
          if (Array.isArray(data)) {
            previousLists.set(key as string[], data);
          }
        }
      );

      // ========================================
      // OPTIMISTIC UPDATE: DETAIL VIEW
      // ========================================
      // Optimistically update the detail cache
      if (previousAutomation) {
        queryClient.setQueryData<Automation>(automationKeys.detail(id), {
          ...previousAutomation,
          enabled,
        });
      }

      // ========================================
      // OPTIMISTIC UPDATE: LIST VIEWS
      // ========================================
      // Update all automation list caches to reflect the toggle
      // This ensures the UI updates immediately in list views without waiting for server
      previousLists.forEach((automations, key) => {
        const updatedAutomations = automations.map((automation) =>
          automation.id === id ? { ...automation, enabled } : automation
        );
        queryClient.setQueryData(key, updatedAutomations);
      });

      // ========================================
      // RETURN CONTEXT FOR ERROR HANDLING
      // ========================================
      // Return context with previous state for rollback on error
      return {
        previousAutomation,
        previousLists,
      };
    },
    onSuccess: (updatedAutomation) => {
      // ========================================
      // UPDATE WITH SERVER RESPONSE
      // ========================================
      // Update detail cache with the confirmed server response
      queryClient.setQueryData(
        automationKeys.detail(updatedAutomation.id),
        updatedAutomation
      );

      // ========================================
      // SYNC LIST CACHES WITH SERVER
      // ========================================
      // Update all list caches with the server-confirmed data
      queryClient.getQueriesData({ queryKey: automationKeys.lists() }).forEach(
        ([key, data]) => {
          if (Array.isArray(data)) {
            const updatedAutomations = (data as Automation[]).map(
              (automation) =>
                automation.id === updatedAutomation.id ? updatedAutomation : automation
            );
            queryClient.setQueryData(key, updatedAutomations);
          }
        }
      );

      // ========================================
      // INVALIDATE RELATED QUERIES
      // ========================================
      // Invalidate summary stats since enabled/disabled counts changed
      queryClient.invalidateQueries({ queryKey: automationKeys.summary() });

      // ========================================
      // USER FEEDBACK
      // ========================================
      // Show success toast with appropriate message
      toast.success(
        updatedAutomation.enabled ? 'Automation enabled' : 'Automation disabled',
        {
          description: updatedAutomation.enabled
            ? `${updatedAutomation.name} will run according to its schedule.`
            : `${updatedAutomation.name} will not run until enabled.`,
        }
      );
    },
    onError: (error: Error, { id }, context) => {
      // ========================================
      // ROLLBACK OPTIMISTIC UPDATES
      // ========================================
      // Rollback detail cache to previous state
      if (context?.previousAutomation) {
        queryClient.setQueryData(
          automationKeys.detail(id),
          context.previousAutomation
        );
      }

      // Rollback all list caches to previous state
      // This is critical for maintaining consistency if the toggle fails
      context?.previousLists?.forEach((automations, key) => {
        queryClient.setQueryData(key, automations);
      });

      // ========================================
      // ERROR FEEDBACK
      // ========================================
      toast.error('Failed to toggle automation', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    },
  });
}

/**
 * Execute an automation manually
 *
 * Triggers an immediate execution of the automation's workflow,
 * bypassing the normal scheduling/webhook trigger.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function ExecuteNowButton({ automationId }) {
 *   const executeMutation = useExecuteAutomation();
 *
 *   const handleExecute = async () => {
 *     try {
 *       const execution = await executeMutation.mutateAsync({
 *         id: automationId
 *       });
 *       console.log('Execution started:', execution.id);
 *     } catch (error) {
 *       // Error toast shown automatically
 *     }
 *   };
 *
 *   return (
 *     <Button
 *       onClick={handleExecute}
 *       disabled={executeMutation.isPending}
 *     >
 *       {executeMutation.isPending ? 'Starting...' : 'Execute Now'}
 *     </Button>
 *   );
 * }
 * ```
 *
 * @example With initial state
 * ```typescript
 * const handleExecute = async () => {
 *   await executeMutation.mutateAsync({
 *     id: automationId,
 *     initialState: { testMode: true, userId: 'test-123' }
 *   });
 * };
 * ```
 */
export function useExecuteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      initialState,
    }: {
      id: string;
      initialState?: Record<string, any>;
    }) => executeAutomation(id, initialState),
    onSuccess: (execution, { id }) => {
      // Invalidate execution history to show new execution
      queryClient.invalidateQueries({ queryKey: automationKeys.executions(id) });

      // Invalidate stats to update run counts
      queryClient.invalidateQueries({ queryKey: automationKeys.stats(id) });

      // Show success toast
      toast.success('Automation triggered successfully', {
        description: `Execution ${execution.id} has started.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to execute automation', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    },
  });
}

/**
 * Reschedule a cron automation
 *
 * Updates the cron expression and/or timezone for a cron-based automation.
 * Only works for automations with TriggerType.CRON.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function RescheduleCronButton({ automation }) {
 *   const rescheduleMutation = useRescheduleAutomation();
 *   const [showDialog, setShowDialog] = useState(false);
 *
 *   const handleReschedule = async (newExpression: string, timezone?: string) => {
 *     await rescheduleMutation.mutateAsync({
 *       id: automation.id,
 *       cronConfig: { expression: newExpression, timezone }
 *     });
 *     setShowDialog(false);
 *   };
 *
 *   return (
 *     <>
 *       <Button onClick={() => setShowDialog(true)}>
 *         Reschedule
 *       </Button>
 *       <RescheduleDialog
 *         open={showDialog}
 *         automation={automation}
 *         onConfirm={handleReschedule}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useRescheduleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      cronConfig,
    }: {
      id: string;
      cronConfig: RescheduleAutomationRequest;
    }) => rescheduleAutomation(id, cronConfig),
    onSuccess: (updatedAutomation) => {
      // Update cache with rescheduled automation
      queryClient.setQueryData(
        automationKeys.detail(updatedAutomation.id),
        updatedAutomation
      );

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: automationKeys.lists() });

      // Show success toast with next run time
      const nextRun = updatedAutomation.nextRunAt
        ? new Date(updatedAutomation.nextRunAt).toLocaleString()
        : 'unknown';

      toast.success('Automation rescheduled successfully', {
        description: `Next run scheduled for ${nextRun}.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to reschedule automation', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    },
  });
}

/**
 * Validate a cron expression
 *
 * Validates the syntax of a cron expression and calculates the next
 * 5 execution times. Useful for real-time validation in the UI.
 *
 * Does not automatically show error toasts (for real-time validation).
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function CronValidator({ expression, timezone }) {
 *   const validateMutation = useValidateCron();
 *
 *   useEffect(() => {
 *     const timer = setTimeout(() => {
 *       if (expression) {
 *         validateMutation.mutate({ expression, timezone });
 *       }
 *     }, 300); // Debounce validation
 *
 *     return () => clearTimeout(timer);
 *   }, [expression, timezone]);
 *
 *   const result = validateMutation.data;
 *
 *   return (
 *     <div>
 *       {validateMutation.isPending && <Spinner />}
 *       {result?.valid && (
 *         <div>
 *           <CheckIcon className="text-green-600" />
 *           <p>{result.description}</p>
 *           <ul>
 *             {result.nextRunTimes?.map((time, i) => (
 *               <li key={i}>{new Date(time).toLocaleString()}</li>
 *             ))}
 *           </ul>
 *         </div>
 *       )}
 *       {result && !result.valid && (
 *         <div>
 *           <XIcon className="text-red-600" />
 *           <p>{result.error}</p>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useValidateCron() {
  return useMutation({
    mutationFn: ({
      expression,
      timezone,
    }: {
      expression: string;
      timezone?: string;
    }) => validateCronExpression(expression, timezone),
    // Do not show toast on error for real-time validation
    onError: () => {
      // Silent error handling for validation
    },
  });
}
