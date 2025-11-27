/**
 * IntegrationsPage - Third-party OAuth Integration Management
 *
 * Main page for managing OAuth integrations with third-party providers.
 * Displays available providers (Google active, Microsoft/Slack/Notion coming soon)
 * and user's existing connections with full CRUD support.
 *
 * Features:
 * - Available providers display with Connect functionality
 * - Grouped connections by provider
 * - Connection management (rename, test, disconnect, reconnect)
 * - Real-time status updates
 * - Loading skeletons and empty states
 * - Error handling with retry functionality
 *
 * Requirements Coverage:
 * - Requirement 1: Integrations Page Navigation
 * - Requirement 2: Available Providers Display
 * - Requirement 6: My Connections Section
 * - Requirement 9: Connection Actions - Rename
 * - Requirement 10: Connection Actions - Test Connection
 * - Requirement 11: Connection Actions - Disconnect
 * - Requirement 12: Connection Actions - Reconnect
 * - Requirement 13: Empty States
 * - Requirement 14: Loading States
 * - Requirement 15: Error Handling
 *
 * @module pages/integrations/IntegrationsPage
 */

import { useState, useMemo, useCallback } from 'react';
import { Plug, RefreshCw, AlertCircle, WifiOff } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseError, ErrorMessages, logError } from '@/lib/errorUtils';

import {
  ProviderCard,
  ProviderCardSkeleton,
  ConnectionCard,
  ConnectionCardSkeleton,
  RenameConnectionDialog,
  DisconnectConfirmDialog,
} from '@/components/integrations';

import {
  useProviders,
  useConnections,
  useRenameConnection,
  useDeleteConnection,
  useTestConnection,
} from '@/hooks/api/useIntegrations';

import { getOAuthAuthUrl } from '@/services/api/integrations.api';
import {
  groupConnectionsByProvider,
  getConnectionCountForProvider,
} from '@/lib/connectionUtils';
import {
  getProviderConfig,
  allProviderConfigs,
} from '@/lib/providerConfig';

import type { ConnectionSummary } from '@/types/integration.types';

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * IntegrationsPage Component
 *
 * Main page for OAuth integration management.
 * Displays available providers and user's existing connections.
 */
export default function IntegrationsPage() {
  // ===========================================================================
  // DIALOG STATE
  // ===========================================================================

  /** Connection to rename (null when dialog is closed) */
  const [renameConnection, setRenameConnection] = useState<ConnectionSummary | null>(null);

  /** Connection to delete (null when dialog is closed) */
  const [deleteConnection, setDeleteConnection] = useState<ConnectionSummary | null>(null);

  /** Connection ID currently being tested */
  const [testingId, setTestingId] = useState<string | null>(null);

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  const {
    data: providers,
    isLoading: isLoadingProviders,
    error: providersError,
    refetch: refetchProviders,
  } = useProviders();

  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
    refetch: refetchConnections,
    isRefetching: isRefetchingConnections,
  } = useConnections();

  // ===========================================================================
  // MUTATIONS
  // ===========================================================================

  const renameMutation = useRenameConnection();
  const deleteMutation = useDeleteConnection();
  const testMutation = useTestConnection();

  // ===========================================================================
  // DERIVED DATA
  // ===========================================================================

  /**
   * Group connections by provider for organized display
   */
  const connectionsByProvider = useMemo(() => {
    if (!connections) return {};
    return groupConnectionsByProvider(connections);
  }, [connections]);

  /**
   * Get the number of connections for a specific provider
   */
  const getConnectionCount = useCallback(
    (providerId: string): number => {
      if (!connections) return 0;
      return getConnectionCountForProvider(connections, providerId);
    },
    [connections]
  );

  /**
   * Providers that have at least one connection
   */
  const providersWithConnections = useMemo(() => {
    return Object.keys(connectionsByProvider).filter(
      (providerId) => connectionsByProvider[providerId]?.length > 0
    );
  }, [connectionsByProvider]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  /**
   * Handle connecting to a provider (opens OAuth in new tab)
   */
  const handleConnect = useCallback((providerId: string) => {
    // Build OAuth URL with redirect to callback page
    const callbackUrl = `${window.location.origin}/integrations/oauth/callback`;
    const authUrl = getOAuthAuthUrl(providerId, {
      redirect: callbackUrl,
    });

    // Open OAuth flow in a new tab
    window.open(authUrl, '_blank', 'noopener,noreferrer');
  }, []);

  /**
   * Handle rename action - opens rename dialog
   */
  const handleOpenRenameDialog = useCallback((connectionId: string) => {
    const connection = connections?.find((c) => c.id === connectionId);
    if (connection) {
      setRenameConnection(connection);
    }
  }, [connections]);

  /**
   * Handle rename confirmation
   */
  const handleRename = useCallback(
    async (id: string, name: string) => {
      await renameMutation.mutateAsync({ id, name });
      setRenameConnection(null);
    },
    [renameMutation]
  );

  /**
   * Handle test connection action
   */
  const handleTest = useCallback(
    async (connectionId: string) => {
      if (testingId) return; // Prevent multiple concurrent tests
      setTestingId(connectionId);
      try {
        await testMutation.mutateAsync(connectionId);
      } finally {
        setTestingId(null);
      }
    },
    [testingId, testMutation]
  );

  /**
   * Handle disconnect action - opens confirmation dialog
   */
  const handleOpenDisconnectDialog = useCallback((connectionId: string) => {
    const connection = connections?.find((c) => c.id === connectionId);
    if (connection) {
      setDeleteConnection(connection);
    }
  }, [connections]);

  /**
   * Handle disconnect confirmation
   */
  const handleConfirmDisconnect = useCallback(async () => {
    if (!deleteConnection) return;
    await deleteMutation.mutateAsync(deleteConnection.id);
    setDeleteConnection(null);
  }, [deleteConnection, deleteMutation]);

  /**
   * Handle reauth action (reconnect expired connection)
   */
  const handleReauth = useCallback(
    (_connectionId: string, providerId: string) => {
      // Initiate OAuth flow for the provider
      handleConnect(providerId);
    },
    [handleConnect]
  );

  /**
   * Refresh all data
   */
  const handleRefresh = useCallback(() => {
    refetchProviders();
    refetchConnections();
  }, [refetchProviders, refetchConnections]);

  // ===========================================================================
  // LOADING STATE
  // ===========================================================================

  const isLoading = isLoadingProviders || isLoadingConnections;

  // ===========================================================================
  // ERROR STATE
  // ===========================================================================

  const hasError = providersError || connectionsError;

  // Parse errors for better user-friendly messages
  const errorInfo = useMemo(() => {
    if (!hasError) return null;

    const error = providersError || connectionsError;
    const fallbackMessage = providersError
      ? ErrorMessages.PROVIDER_LOAD_FAILED
      : ErrorMessages.CONNECTIONS_LOAD_FAILED;

    // Log error in development
    logError(error, 'IntegrationsPage');

    return parseError(error, fallbackMessage);
  }, [hasError, providersError, connectionsError]);

  if (hasError && errorInfo) {
    const isNetwork = errorInfo.isNetworkError;

    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Integrations"
          description="Connect third-party services to your workflows"
        />
        <Alert variant="destructive">
          {isNetwork ? (
            <WifiOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          )}
          <AlertTitle>
            {isNetwork ? 'Connection Problem' : 'Error loading integrations'}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{errorInfo.message}</p>
            {isNetwork && (
              <p className="text-sm text-muted-foreground">
                Please check your internet connection and try again.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="w-fit"
              aria-label="Retry loading integrations"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Integrations"
        description="Connect third-party services to your workflows"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetchingConnections}
            aria-label={isRefetchingConnections ? "Refreshing integrations..." : "Refresh integrations"}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefetchingConnections ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefetchingConnections ? (
              <span aria-live="polite">Refreshing...</span>
            ) : (
              'Refresh'
            )}
          </Button>
        }
      />

      {/* Available Providers Section */}
      <section aria-labelledby="providers-heading" aria-busy={isLoading}>
        <h2
          id="providers-heading"
          className="text-lg font-semibold mb-4"
        >
          Available Providers
        </h2>

        {/* Screen reader announcement for loading state */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading ? 'Loading available providers...' : `${providers?.length || 0} providers available`}
        </div>

        {isLoading ? (
          // Loading skeletons
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <ProviderCardSkeleton key={i} />
            ))}
          </div>
        ) : (() => {
          // Get coming soon providers that aren't already in API results
          const comingSoonProviders = allProviderConfigs
            .filter((config) => config.comingSoon)
            .filter((config) => !providers?.some((p) => p.id === config.id));

          // Check if we have any providers to display
          const hasProviders = (providers?.length ?? 0) > 0 || comingSoonProviders.length > 0;

          if (!hasProviders) {
            // Empty state when no providers are available at all
            return (
              <EmptyState
                icon={Plug}
                title="No providers available"
                description="No integration providers are currently available. Please check back later."
              />
            );
          }

          return (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {/* API providers */}
              {providers?.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  connectionCount={getConnectionCount(provider.id)}
                  onConnect={handleConnect}
                />
              ))}

              {/* Coming soon providers (from config) */}
              {comingSoonProviders.map((config) => (
                <ProviderCard
                  key={config.id}
                  providerId={config.id}
                  onConnect={() => {}}
                />
              ))}
            </div>
          );
        })()}
      </section>

      <Separator />

      {/* My Connections Section */}
      <section aria-labelledby="connections-heading" aria-busy={isLoading}>
        <h2
          id="connections-heading"
          className="text-lg font-semibold mb-4"
        >
          My Connections
        </h2>

        {/* Screen reader announcement for loading/count state */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading
            ? 'Loading your connections...'
            : connections?.length
              ? `${connections.length} connection${connections.length === 1 ? '' : 's'} found`
              : 'No connections yet'}
        </div>

        {isLoading ? (
          // Loading skeletons
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {[...Array(3)].map((_, i) => (
              <ConnectionCardSkeleton key={i} />
            ))}
          </div>
        ) : !connections?.length ? (
          // Empty state
          <EmptyState
            icon={Plug}
            title="No connections yet"
            description="Connect a service from the Available Providers section above to get started with your workflow integrations."
          />
        ) : (
          // Grouped connections by provider
          // Note: Layout handles 10+ connections gracefully via CSS grid auto-wrapping.
          // Pagination is out of scope for this implementation but could be added if needed.
          <div className="space-y-6">
            {providersWithConnections.map((providerId) => {
              const providerConnections = connectionsByProvider[providerId] || [];
              const providerConfig = getProviderConfig(providerId);

              return (
                <div key={providerId}>
                  {/* Provider Group Header */}
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {providerConfig.name}{' '}
                    <span className="text-xs">({providerConnections.length})</span>
                  </h3>

                  {/* Connection Cards Grid */}
                  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    {providerConnections.map((connection) => (
                      <ConnectionCard
                        key={connection.id}
                        connection={connection}
                        onRename={handleOpenRenameDialog}
                        onTest={handleTest}
                        onDisconnect={handleOpenDisconnectDialog}
                        onReauth={handleReauth}
                        testing={testingId === connection.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Rename Connection Dialog */}
      <RenameConnectionDialog
        open={!!renameConnection}
        onOpenChange={(open) => !open && setRenameConnection(null)}
        connection={renameConnection}
        onRename={handleRename}
        loading={renameMutation.isPending}
      />

      {/* Disconnect Confirmation Dialog */}
      <DisconnectConfirmDialog
        open={!!deleteConnection}
        onOpenChange={(open) => !open && setDeleteConnection(null)}
        connection={deleteConnection}
        onConfirm={handleConfirmDisconnect}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
