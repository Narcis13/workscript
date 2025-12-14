/**
 * React Query Hooks for Integrations Management
 *
 * Provides custom hooks for all OAuth integration-related operations using React Query.
 * These hooks handle data fetching, caching, mutations, and optimistic updates.
 *
 * Features:
 * - Automatic refetching on window focus for connections
 * - Optimistic updates for mutations (delete)
 * - Cache invalidation on mutations
 * - Toast notifications for success/error states
 * - Proper TypeScript typing for all operations
 * - Comprehensive error handling with user-friendly messages
 * - Network error detection with retry guidance
 *
 * Requirements Coverage:
 * - Requirement 15: Error Handling
 * - Requirement 17: React Query Hooks
 *
 * @module hooks/api/useIntegrations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  parseError,
  logError,
  ErrorMessages,
} from '../../lib/errorUtils';
import type {
  ConnectionSummary,
  ConnectionsFilter,
} from '../../types/integration.types';
import {
  fetchProviders,
  fetchConnections,
  fetchConnection,
  renameConnection,
  deleteConnection,
  testConnection,
} from '../../services/api/integrations.api';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query key factory for integration-related queries
 *
 * Provides consistent query keys for proper cache management.
 * Follows the pattern: ['integrations', 'resource', ...params]
 *
 * @example
 * ```typescript
 * // All integrations data
 * integrationKeys.all // ['integrations']
 *
 * // All providers
 * integrationKeys.providers() // ['integrations', 'providers']
 *
 * // All connections
 * integrationKeys.connections() // ['integrations', 'connections']
 *
 * // Connections filtered by provider
 * integrationKeys.connectionsByProvider('google') // ['integrations', 'connections', { provider: 'google' }]
 *
 * // Single connection by ID
 * integrationKeys.connection('clg4xyz123...') // ['integrations', 'connections', 'clg4xyz123...']
 * ```
 */
export const integrationKeys = {
  /** Base key for all integration queries */
  all: ['integrations'] as const,

  /** Key for providers list query */
  providers: () => [...integrationKeys.all, 'providers'] as const,

  /** Base key for connections queries */
  connections: () => [...integrationKeys.all, 'connections'] as const,

  /**
   * Key for connections list with optional provider filter
   * @param filter - Optional filter parameters
   */
  connectionsList: (filter?: ConnectionsFilter) =>
    [...integrationKeys.connections(), filter ?? {}] as const,

  /**
   * Key for a single connection by ID
   * @param id - Connection ID (CUID2)
   */
  connection: (id: string) => [...integrationKeys.connections(), id] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all available OAuth providers
 *
 * Providers are cached for 30 minutes as they rarely change.
 * Suitable for displaying available integrations.
 *
 * @returns React Query result with providers array
 *
 * @example
 * ```typescript
 * function AvailableProviders() {
 *   const { data: providers, isLoading, error, refetch } = useProviders();
 *
 *   if (isLoading) return <ProviderCardSkeleton count={4} />;
 *   if (error) return <ErrorAlert onRetry={refetch} />;
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {providers?.map(provider => (
 *         <ProviderCard key={provider.id} provider={provider} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProviders() {
  return useQuery({
    queryKey: integrationKeys.providers(),
    queryFn: fetchProviders,
    staleTime: 30 * 60 * 1000, // 30 minutes - providers rarely change
    refetchOnMount: true,
    retry: 3,
  });
}

/**
 * Fetch all OAuth connections with optional filtering
 *
 * Connections are cached for 2 minutes and refetch on window focus
 * to keep status information up to date.
 *
 * @param filter - Optional filter parameters (provider, createdBy)
 * @returns React Query result with connections array
 *
 * @example
 * ```typescript
 * function MyConnections() {
 *   const { data: connections, isLoading, error, refetch } = useConnections();
 *
 *   if (isLoading) return <ConnectionCardSkeleton count={3} />;
 *   if (error) return <ErrorAlert onRetry={refetch} />;
 *   if (!connections?.length) return <EmptyState />;
 *
 *   return (
 *     <div className="space-y-4">
 *       {connections.map(connection => (
 *         <ConnectionCard key={connection.id} connection={connection} />
 *       ))}
 *     </div>
 *   );
 * }
 *
 * // With provider filter
 * function GoogleConnections() {
 *   const { data: googleConnections } = useConnections({ provider: 'google' });
 *   // ...
 * }
 * ```
 */
export function useConnections(filter?: ConnectionsFilter) {
  return useQuery({
    queryKey: integrationKeys.connectionsList(filter),
    queryFn: () => fetchConnections(filter),
    staleTime: 2 * 60 * 1000, // 2 minutes - connections may change status
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Requirement 17: Refetch on window focus
    retry: 3,
  });
}

/**
 * Fetch a single connection by ID
 *
 * @param id - Connection ID (CUID2)
 * @param options - Optional query options
 * @returns React Query result with connection data
 *
 * @example
 * ```typescript
 * function ConnectionDetail({ connectionId }: { connectionId: string }) {
 *   const { data: connection, isLoading, error } = useConnection(connectionId);
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <ErrorMessage />;
 *   if (!connection) return <NotFound />;
 *
 *   return <ConnectionDetailView connection={connection} />;
 * }
 * ```
 */
export function useConnection(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: integrationKeys.connection(id!),
    queryFn: () => fetchConnection(id!),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry on 404 (connection not found)
      const errorResponse = error as { response?: { status?: number } };
      if (errorResponse?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Rename a connection
 *
 * Features:
 * - Updates cache on success
 * - Invalidates connections list to refresh
 * - Shows success/error toast notifications
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function RenameDialog({ connection, onClose }) {
 *   const renameMutation = useRenameConnection();
 *   const [name, setName] = useState(connection.name);
 *
 *   const handleSave = async () => {
 *     await renameMutation.mutateAsync({
 *       id: connection.id,
 *       name,
 *     });
 *     onClose();
 *   };
 *
 *   return (
 *     <Dialog>
 *       <Input value={name} onChange={setName} />
 *       <Button
 *         onClick={handleSave}
 *         loading={renameMutation.isPending}
 *       >
 *         Save
 *       </Button>
 *     </Dialog>
 *   );
 * }
 * ```
 */
export function useRenameConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameConnection(id, name),

    onSuccess: (updatedConnection, { id }) => {
      // Update the connection in cache
      queryClient.setQueryData<ConnectionSummary>(
        integrationKeys.connection(id),
        (old) =>
          old
            ? { ...old, name: updatedConnection.name }
            : undefined
      );

      // Invalidate connections list to refresh
      queryClient.invalidateQueries({
        queryKey: integrationKeys.connections(),
      });

      toast.success('Connection renamed', {
        description: `Connection renamed to "${updatedConnection.name}".`,
      });
    },

    onError: (error: unknown) => {
      logError(error, 'useRenameConnection');
      const parsed = parseError(error, ErrorMessages.CONNECTION_RENAME_FAILED);

      if (parsed.isNetworkError) {
        toast.error('Connection error', {
          description: parsed.message,
          action: {
            label: 'Retry',
            onClick: () => {
              // User can retry manually via the dialog
            },
          },
        });
      } else {
        toast.error('Failed to rename connection', {
          description: parsed.message,
        });
      }
    },
  });
}

/**
 * Delete a connection
 *
 * Features:
 * - Optimistic removal from list for instant feedback
 * - Reverts on error
 * - Shows success/error toast notifications
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function DisconnectDialog({ connection, onClose }) {
 *   const deleteMutation = useDeleteConnection();
 *
 *   const handleDisconnect = async () => {
 *     await deleteMutation.mutateAsync(connection.id);
 *     onClose();
 *   };
 *
 *   return (
 *     <AlertDialog>
 *       <p>Are you sure you want to disconnect {connection.accountEmail}?</p>
 *       <Button
 *         variant="destructive"
 *         onClick={handleDisconnect}
 *         loading={deleteMutation.isPending}
 *       >
 *         Disconnect
 *       </Button>
 *     </AlertDialog>
 *   );
 * }
 * ```
 */
export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConnection(id),

    // Optimistic update
    onMutate: async (id) => {
      // Cancel outgoing refetches for all connection queries
      await queryClient.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === 'integrations' &&
          query.queryKey[1] === 'connections',
      });

      // Snapshot previous connections for all cached queries
      const previousQueries = queryClient.getQueriesData<ConnectionSummary[]>({
        predicate: (query) =>
          query.queryKey[0] === 'integrations' &&
          query.queryKey[1] === 'connections',
      });

      // Optimistically remove from all cached connection lists
      queryClient.setQueriesData<ConnectionSummary[]>(
        {
          predicate: (query) =>
            query.queryKey[0] === 'integrations' &&
            query.queryKey[1] === 'connections',
        },
        (old) => old?.filter((c) => c.id !== id)
      );

      return { previousQueries };
    },

    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({
        queryKey: integrationKeys.connection(id),
      });

      // Invalidate all connections queries to ensure consistency
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'integrations' &&
          query.queryKey[1] === 'connections',
      });

      toast.success('Connection disconnected', {
        description: 'The connection has been removed.',
      });
    },

    onError: (error: unknown, _, context) => {
      // Revert optimistic update
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      logError(error, 'useDeleteConnection');
      const parsed = parseError(error, ErrorMessages.CONNECTION_DELETE_FAILED);

      if (parsed.isNetworkError) {
        toast.error('Connection error', {
          description: parsed.message,
          action: {
            label: 'Retry',
            onClick: () => {
              // User can retry manually via the dialog
            },
          },
        });
      } else {
        toast.error('Failed to disconnect', {
          description: parsed.message,
        });
      }
    },
  });
}

/**
 * Test a connection's validity
 *
 * Features:
 * - Shows test result via toast notification
 * - Invalidates connection queries to refresh status
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * function ConnectionCard({ connection }) {
 *   const testMutation = useTestConnection();
 *   const [testing, setTesting] = useState(false);
 *
 *   const handleTest = async () => {
 *     setTesting(true);
 *     try {
 *       const result = await testMutation.mutateAsync(connection.id);
 *       // Toast is shown by the mutation
 *     } finally {
 *       setTesting(false);
 *     }
 *   };
 *
 *   return (
 *     <DropdownMenuItem onClick={handleTest} disabled={testing}>
 *       {testing ? <Spinner /> : <TestTube />}
 *       Test Connection
 *     </DropdownMenuItem>
 *   );
 * }
 * ```
 */
export function useTestConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => testConnection(id),

    onSuccess: (result, id) => {
      // Invalidate connection queries to refresh status
      queryClient.invalidateQueries({
        queryKey: integrationKeys.connection(id),
      });
      queryClient.invalidateQueries({
        queryKey: integrationKeys.connections(),
      });

      if (result.valid) {
        toast.success('Connection is valid', {
          description: 'The connection is working correctly.',
        });
      } else {
        toast.error('Connection test failed', {
          description: result.error || 'The connection is no longer valid.',
        });
      }
    },

    onError: (error: unknown) => {
      logError(error, 'useTestConnection');
      const parsed = parseError(error, ErrorMessages.CONNECTION_TEST_FAILED);

      if (parsed.isNetworkError) {
        toast.error('Connection error', {
          description: parsed.message,
        });
      } else {
        toast.error('Test failed', {
          description: parsed.message,
        });
      }
    },
  });
}
