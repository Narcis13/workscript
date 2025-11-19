/**
 * React Query Hooks for Workflow Management
 *
 * Provides custom hooks for all workflow-related operations using React Query.
 * These hooks handle data fetching, caching, mutations, and optimistic updates.
 *
 * Features:
 * - Automatic refetching on window focus
 * - Optimistic updates for mutations
 * - Cache invalidation on mutations
 * - Toast notifications for success/error states
 * - Proper TypeScript typing for all operations
 *
 * Requirements Coverage:
 * - Requirement 4: Workflow List Management and Navigation
 * - Requirement 5: Workflow Creation with Monaco Editor
 * - Requirement 6: Workflow Editing with Version Control
 * - Requirement 7: Workflow Execution and Testing
 * - Requirement 8: Workflow Detail View and Execution History
 *
 * @module hooks/api/useWorkflows
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Workflow,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
  ValidationResult,
  ExecutionResult,
  WorkflowFilterOptions,
  DuplicateWorkflowRequest,
} from '../../types/workflow.types';
import type { WorkflowDefinition } from '@workscript/engine';
import {
  fetchWorkflows,
  fetchWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  validateWorkflow,
  executeWorkflow,
  executeWorkflowById,
  fetchWorkflowExecutions,
  fetchWorkflowAutomations,
} from '../../services/api/workflows.api';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query key factory for workflow-related queries
 * Provides consistent query keys for proper cache management
 */
export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters?: WorkflowFilterOptions) =>
    [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  executions: (id: string) =>
    [...workflowKeys.detail(id), 'executions'] as const,
  automations: (id: string) =>
    [...workflowKeys.detail(id), 'automations'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all workflows with optional filtering
 *
 * Automatically refetches on window focus and provides caching.
 * Suitable for workflow list pages.
 *
 * @param filters - Optional filter options (search, isActive, etc.)
 * @returns React Query result with workflows array
 *
 * @example
 * ```typescript
 * function WorkflowsPage() {
 *   const { data: workflows, isLoading, error, refetch } = useWorkflows();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return <WorkflowList workflows={workflows} />;
 * }
 * ```
 *
 * @example With filters
 * ```typescript
 * const { data: activeWorkflows } = useWorkflows({ isActive: true });
 * ```
 */
export function useWorkflows(filters?: WorkflowFilterOptions) {
  return useQuery({
    queryKey: workflowKeys.list(filters),
    queryFn: () => fetchWorkflows(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Requirement 4: Auto-refetch on focus
    retry: 3,
  });
}

/**
 * Fetch a single workflow by ID
 *
 * Provides caching and automatic refetching for workflow detail views.
 *
 * @param id - Workflow ID (UUID)
 * @param options - Optional query options
 * @returns React Query result with workflow data
 *
 * @example
 * ```typescript
 * function WorkflowDetailPage() {
 *   const { id } = useParams();
 *   const { data: workflow, isLoading, error } = useWorkflow(id!);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!workflow) return <NotFound />;
 *
 *   return <WorkflowDetailView workflow={workflow} />;
 * }
 * ```
 */
export function useWorkflow(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: workflowKeys.detail(id!),
    queryFn: () => fetchWorkflow(id!),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (workflow not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

/**
 * Fetch execution history for a workflow
 *
 * @param workflowId - Workflow ID
 * @param limit - Maximum number of executions to fetch (default: 20)
 * @returns React Query result with execution array
 *
 * @example
 * ```typescript
 * const { data: executions } = useWorkflowExecutions(workflowId, 50);
 * ```
 */
export function useWorkflowExecutions(workflowId: string, limit?: number) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId),
    queryFn: () => fetchWorkflowExecutions(workflowId, limit),
    enabled: !!workflowId,
    staleTime: 1 * 60 * 1000, // 1 minute (executions change frequently)
  });
}

/**
 * Fetch automations using a workflow
 *
 * @param workflowId - Workflow ID
 * @returns React Query result with automations array
 *
 * @example
 * ```typescript
 * const { data: automations } = useWorkflowAutomations(workflowId);
 * if (automations && automations.length > 0) {
 *   // Show warning: workflow is used by active automations
 * }
 * ```
 */
export function useWorkflowAutomations(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.automations(workflowId),
    queryFn: () => fetchWorkflowAutomations(workflowId),
    enabled: !!workflowId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new workflow
 *
 * Features:
 * - Invalidates workflows list cache on success
 * - Shows success/error toast notifications
 * - Returns created workflow for navigation
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function WorkflowCreatePage() {
 *   const navigate = useNavigate();
 *   const createMutation = useCreateWorkflow();
 *
 *   const handleSubmit = async (data: CreateWorkflowPayload) => {
 *     const workflow = await createMutation.mutateAsync(data);
 *     navigate(`/workflows/${workflow.id}`);
 *   };
 *
 *   return (
 *     <WorkflowForm
 *       onSubmit={handleSubmit}
 *       loading={createMutation.isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkflowPayload) => createWorkflow(data),
    onSuccess: (newWorkflow) => {
      // Invalidate and refetch workflows list
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });

      // Add to cache for immediate access
      queryClient.setQueryData(
        workflowKeys.detail(newWorkflow.id),
        newWorkflow
      );

      toast.success('Workflow created successfully', {
        description: `"${newWorkflow.name}" has been created.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to create workflow', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'An unexpected error occurred.',
      });
    },
  });
}

/**
 * Update an existing workflow
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Reverts on error
 * - Invalidates related caches
 * - Shows success/error toast notifications
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function WorkflowEditPage() {
 *   const { id } = useParams();
 *   const updateMutation = useUpdateWorkflow();
 *
 *   const handleSave = (data: UpdateWorkflowPayload) => {
 *     updateMutation.mutate({ id: id!, data });
 *   };
 *
 *   return (
 *     <WorkflowForm
 *       onSubmit={handleSave}
 *       loading={updateMutation.isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWorkflowPayload;
    }) => updateWorkflow(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: workflowKeys.detail(id) });

      // Snapshot previous value
      const previousWorkflow = queryClient.getQueryData<Workflow>(
        workflowKeys.detail(id)
      );

      // Optimistically update cache
      if (previousWorkflow) {
        queryClient.setQueryData<Workflow>(workflowKeys.detail(id), {
          ...previousWorkflow,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousWorkflow };
    },

    onSuccess: (updatedWorkflow, { id }) => {
      // Update cache with server response
      queryClient.setQueryData(workflowKeys.detail(id), updatedWorkflow);

      // Invalidate list to reflect changes
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });

      toast.success('Workflow updated successfully', {
        description: `"${updatedWorkflow.name}" has been updated.`,
      });
    },

    onError: (error: any, { id }, context) => {
      // Revert optimistic update on error
      if (context?.previousWorkflow) {
        queryClient.setQueryData(
          workflowKeys.detail(id),
          context.previousWorkflow
        );
      }

      toast.error('Failed to update workflow', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'An unexpected error occurred.',
      });
    },
  });
}

/**
 * Delete a workflow
 *
 * Features:
 * - Optimistic removal from list
 * - Reverts on error
 * - Shows confirmation toast
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function WorkflowCard({ workflow }) {
 *   const deleteMutation = useDeleteWorkflow();
 *   const [showConfirm, setShowConfirm] = useState(false);
 *
 *   const handleDelete = () => {
 *     deleteMutation.mutate(workflow.id);
 *     setShowConfirm(false);
 *   };
 *
 *   return (
 *     <>
 *       <Button onClick={() => setShowConfirm(true)}>Delete</Button>
 *       <ConfirmDialog
 *         open={showConfirm}
 *         title="Delete Workflow"
 *         description={`Are you sure you want to delete "${workflow.name}"?`}
 *         onConfirm={handleDelete}
 *         onCancel={() => setShowConfirm(false)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.lists() });

      // Snapshot previous list
      const previousWorkflows = queryClient.getQueryData<Workflow[]>(
        workflowKeys.lists()
      );

      // Optimistically remove from cache
      if (previousWorkflows) {
        queryClient.setQueryData<Workflow[]>(
          workflowKeys.lists(),
          previousWorkflows.filter((w) => w.id !== id)
        );
      }

      return { previousWorkflows };
    },

    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: workflowKeys.detail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });

      toast.success('Workflow deleted successfully', {
        description: 'The workflow has been permanently deleted.',
      });
    },

    onError: (error: any, _, context) => {
      // Revert optimistic update
      if (context?.previousWorkflows) {
        queryClient.setQueryData(
          workflowKeys.lists(),
          context.previousWorkflows
        );
      }

      toast.error('Failed to delete workflow', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'An unexpected error occurred.',
      });
    },
  });
}

/**
 * Duplicate a workflow
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * const duplicateMutation = useDuplicateWorkflow();
 * const navigate = useNavigate();
 *
 * const handleDuplicate = async (workflowId: string) => {
 *   const duplicate = await duplicateMutation.mutateAsync({
 *     id: workflowId,
 *     data: { name: 'Copy of My Workflow' }
 *   });
 *   navigate(`/workflows/${duplicate.id}`);
 * };
 * ```
 */
export function useDuplicateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: DuplicateWorkflowRequest;
    }) => duplicateWorkflow(id, data),

    onSuccess: (newWorkflow) => {
      // Add to cache
      queryClient.setQueryData(
        workflowKeys.detail(newWorkflow.id),
        newWorkflow
      );

      // Invalidate list
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });

      toast.success('Workflow duplicated successfully', {
        description: `"${newWorkflow.name}" has been created.`,
      });
    },

    onError: (error: any) => {
      toast.error('Failed to duplicate workflow', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'An unexpected error occurred.',
      });
    },
  });
}

// ============================================
// VALIDATION & EXECUTION MUTATION HOOKS
// ============================================

/**
 * Validate a workflow definition
 *
 * Returns validation errors with line/column information for Monaco editor.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function WorkflowEditor({ definition }) {
 *   const validateMutation = useValidateWorkflow();
 *
 *   const handleValidate = async () => {
 *     const result = await validateMutation.mutateAsync(definition);
 *     if (!result.valid) {
 *       // Show errors in Monaco editor
 *       setMonacoErrors(result.errors);
 *     }
 *   };
 *
 *   return <Button onClick={handleValidate}>Validate</Button>;
 * }
 * ```
 */
export function useValidateWorkflow() {
  return useMutation({
    mutationFn: (definition: WorkflowDefinition) =>
      validateWorkflow(definition),
    onSuccess: (result) => {
      if (result.valid) {
        toast.success('Workflow validation passed', {
          description: 'The workflow definition is valid.',
        });
      } else {
        toast.error('Workflow validation failed', {
          description: `Found ${result.errors?.length || 0} error(s).`,
        });
      }
    },
    onError: (error: any) => {
      toast.error('Validation request failed', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to validate workflow.',
      });
    },
  });
}

/**
 * Execute a workflow immediately
 *
 * For manual/test execution with optional initial state.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function WorkflowExecutionPanel({ definition }) {
 *   const [initialState, setInitialState] = useState({});
 *   const executeMutation = useExecuteWorkflow();
 *
 *   const handleRun = async () => {
 *     const result = await executeMutation.mutateAsync({
 *       definition,
 *       initialState
 *     });
 *     console.log('Final state:', result.state);
 *   };
 *
 *   return (
 *     <>
 *       <MonacoEditor value={initialState} onChange={setInitialState} />
 *       <Button onClick={handleRun} loading={executeMutation.isPending}>
 *         Run Workflow
 *       </Button>
 *     </>
 *   );
 * }
 * ```
 */
export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: ({
      definition,
      initialState,
    }: {
      definition: WorkflowDefinition;
      initialState?: Record<string, any>;
    }) => executeWorkflow(definition, initialState),
    onSuccess: (result) => {
      if (result.error) {
        toast.error('Workflow execution failed', {
          description: result.error.message || 'Execution encountered an error.',
        });
      } else {
        toast.success('Workflow executed successfully', {
          description: `Completed in ${result.duration}ms`,
        });
      }
    },
    onError: (error: any) => {
      toast.error('Execution request failed', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to execute workflow.',
      });
    },
  });
}

/**
 * Execute a persisted workflow by ID
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * const executeByIdMutation = useExecuteWorkflowById();
 *
 * const handleRun = async (workflowId: string, initialState?: any) => {
 *   const result = await executeByIdMutation.mutateAsync({
 *     workflowId,
 *     initialState
 *   });
 * };
 * ```
 */
export function useExecuteWorkflowById() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      initialState,
    }: {
      workflowId: string;
      initialState?: Record<string, any>;
    }) => executeWorkflowById(workflowId, initialState),

    onSuccess: (result, { workflowId }) => {
      // Invalidate execution history
      queryClient.invalidateQueries({
        queryKey: workflowKeys.executions(workflowId),
      });

      if (result.error) {
        toast.error('Workflow execution failed', {
          description: result.error.message || 'Execution encountered an error.',
        });
      } else {
        toast.success('Workflow executed successfully', {
          description: `Completed in ${result.duration}ms`,
        });
      }
    },

    onError: (error: any) => {
      toast.error('Execution request failed', {
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to execute workflow.',
      });
    },
  });
}
