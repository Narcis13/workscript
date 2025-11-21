/**
 * ExecutionDetailPage Component
 *
 * Displays comprehensive details of a single workflow execution with multiple views:
 * - Complete execution metadata (ID, workflow, timing, status)
 * - Initial and final state inspection with tree view
 * - State changes timeline showing all mutations
 * - Vertical timeline of node executions with detailed logs
 * - Error details for failed executions (message, stack trace, failed node)
 * - Live updates via WebSocket for running executions
 * - Action buttons: Re-run, Export, Compare States
 *
 * Features:
 * - Automatic data fetching with React Query
 * - Real-time updates for running executions via WebSocket
 * - Error state handling with retry functionality
 * - 404 handling for non-existent executions
 * - Loading skeleton states
 * - Responsive design for mobile and desktop
 * - Copy-to-clipboard for execution IDs
 * - Breadcrumb navigation
 * - Optimistic updates for re-run operations
 *
 * Requirements Coverage:
 * - Requirement 14: Execution History and State Inspection
 *   - Complete execution metadata display
 *   - Initial and final state inspection with tree view
 *   - State changes timeline (showing each mutation)
 *   - Node execution log with inputs/outputs/duration
 *   - Error details section for failed executions
 *   - "Re-run Execution" with confirmation dialog
 *   - "Export Execution" to download JSON file
 *   - Live updates for running executions via WebSocket
 *
 * @module pages/ExecutionDetailPage
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExecutionDetails } from '@/components/executions/ExecutionDetails';
import { ExecutionTimeline } from '@/components/executions/ExecutionTimeline';
import { StateDiffViewer } from '@/components/executions/StateDiffViewer';
import { useExecution, useRerunExecution } from '@/hooks/api/useExecutions';
import { exportExecution } from '@/services/api/executions.api';
import { useWebSocketStore } from '@/stores/useWebSocketStore';
import { cn } from '@/lib/utils';

/**
 * ExecutionDetailPage Component
 *
 * Main page for viewing complete execution details with inspection tools.
 *
 * @example
 * ```tsx
 * // Route integration
 * import { ExecutionDetailPage } from '@/pages/ExecutionDetailPage';
 *
 * // In routes.tsx:
 * {
 *   path: '/executions/:executionId',
 *   element: <ExecutionDetailPage />,
 * }
 * ```
 *
 * @remarks
 * - Uses React Query for efficient data fetching and caching
 * - WebSocket integration for live updates on running executions
 * - Proper error boundaries for network and server errors
 * - Handles permission checks via parent route guards
 * - Uses localStorage for theme preference in diff viewer
 */
export function ExecutionDetailPage() {
  // ============================================
  // ROUTE PARAMS & NAVIGATION
  // ============================================

  /**
   * Execution ID from URL parameters
   */
  const { executionId } = useParams<{ executionId: string }>();

  /**
   * Router navigation hook for programmatic navigation
   */
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Whether to show the diff viewer modal
   */
  const [showDiffViewer, setShowDiffViewer] = useState(false);

  /**
   * Whether to show the re-run confirmation dialog
   */
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);

  /**
   * Whether export is in progress
   */
  const [isExporting, setIsExporting] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  /**
   * Fetch execution details with automatic refetching
   */
  const {
    data: execution,
    isLoading,
    error,
    refetch,
  } = useExecution(executionId);

  /**
   * Re-run execution mutation
   */
  const rerunMutation = useRerunExecution();

  /**
   * Get active execution from WebSocket store for live updates
   */
  const activeExecutions = useWebSocketStore((state) => state.activeExecutions);
  const liveExecution = executionId ? activeExecutions.get(executionId) : null;

  // ============================================
  // EFFECT HOOKS
  // ============================================

  /**
   * Auto-refetch execution if it's still running
   * Provides additional polling fallback for WebSocket updates
   */
  useEffect(() => {
    if (execution?.status === 'running') {
      const interval = setInterval(() => {
        refetch();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [execution?.status, refetch]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle re-run execution
   * Executes the workflow with the same initial state
   */
  const handleRerun = useCallback(async () => {
    if (!executionId || !execution?.initialState) {
      toast.error('Cannot re-run: execution data incomplete');
      return;
    }

    try {
      const newExecution = await rerunMutation.mutateAsync({
        executionId,
        useSameInitialState: true,
      });

      setShowRerunConfirm(false);
      toast.success('Execution re-run started');

      // Navigate to new execution detail page
      setTimeout(() => {
        navigate(`/executions/${newExecution.id}`);
      }, 500);
    } catch (err) {
      // Error toast is handled by mutation hook
      console.error('Re-run failed:', err);
    }
  }, [executionId, execution?.initialState, rerunMutation, navigate]);

  /**
   * Handle export execution data
   * Downloads execution as JSON file with complete execution data
   *
   * Generates a filename in format: execution-{executionId}.json
   * The exported file includes:
   * - Complete execution metadata
   * - Initial and final state snapshots
   * - State change history
   * - Node execution logs
   * - Timeline events
   * - Error details (if applicable)
   * - State diff between initial and final state
   */
  const handleExport = useCallback(async () => {
    if (!executionId) {
      toast.error('Cannot export: execution ID unavailable');
      return;
    }

    try {
      setIsExporting(true);

      // Generate filename in format: execution-{executionId}.json
      const filename = `execution-${executionId}.json`;

      // Use API service to export execution
      // This fetches complete execution data including state changes, node logs, and timeline
      await exportExecution(executionId, filename);

      toast.success('Execution exported successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to export execution';
      toast.error(errorMessage);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [executionId]);

  // ============================================
  // RENDER
  // ============================================

  // Loading state
  if (isLoading && !execution) {
    return (
      <div className="space-y-6">
        <Breadcrumbs />
        <PageHeader
          title="Execution Details"
          description="Loading execution details..."
        />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner label="Loading execution..." />
        </div>
      </div>
    );
  }

  // 404 Not Found state
  if (!isLoading && !execution) {
    return (
      <div className="space-y-6">
        <Breadcrumbs />
        <EmptyState
          icon="AlertCircle"
          title="Execution Not Found"
          description="The execution you're looking for doesn't exist or has been deleted."
          actionButton={{
            label: 'View All Executions',
            onClick: () => navigate('/executions'),
          }}
        />
      </div>
    );
  }

  // Error state with retry
  if (error && !execution) {
    return (
      <div className="space-y-6">
        <Breadcrumbs />
        <EmptyState
          icon="AlertCircle"
          title="Failed to Load Execution"
          description={
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred while loading the execution.'
          }
          actionButton={{
            label: 'Retry',
            onClick: () => refetch(),
          }}
        />
      </div>
    );
  }

  // Successful render with execution data
  return (
    <div className="space-y-6">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs />

      {/* Page Header with Actions */}
      <PageHeader
        title={`Execution: ${execution?.id.substring(0, 8) || 'Loading'}`}
        description={`From ${execution?.workflowName || 'Unknown'} workflow`}
        actions={
          execution && (
            <div className="flex gap-2">
              {/* Compare States Button */}
              {execution.initialState && execution.finalState && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiffViewer(true)}
                >
                  Compare States
                </Button>
              )}

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>

              {/* Re-run Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRerunConfirm(true)}
                disabled={rerunMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {rerunMutation.isPending ? 'Re-running...' : 'Re-run'}
              </Button>
            </div>
          )
        }
      />

      {/* Live Execution Warning */}
      {execution?.status === 'running' && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-400">
            ⏱️ Execution is currently running. Updates are streamed in real-time via WebSocket.
          </p>
        </div>
      )}

      {/* Execution Details Card */}
      {execution && (
        <ExecutionDetails
          execution={execution}
          showStates={true}
          onCompareStates={() => setShowDiffViewer(true)}
        />
      )}

      {/* Execution Timeline */}
      {execution && execution.nodeLogs && execution.nodeLogs.length > 0 && (
        <div className="mt-6">
          <ExecutionTimeline
            execution={execution}
            showStateChanges={true}
            autoExpandFailures={true}
          />
        </div>
      )}

      {/* State Diff Viewer Modal */}
      {execution && execution.initialState && execution.finalState && (
        <StateDiffViewer
          open={showDiffViewer}
          onOpenChange={setShowDiffViewer}
          initialState={execution.initialState}
          finalState={execution.finalState}
        />
      )}

      {/* Re-run Confirmation Dialog */}
      {execution && (
        <ConfirmDialog
          open={showRerunConfirm}
          onOpenChange={setShowRerunConfirm}
          title="Re-run Execution"
          description={`Are you sure you want to re-run this execution with the same initial state? A new execution will be created with the same workflow and data.`}
          confirmLabel="Yes, Re-run"
          cancelLabel="Cancel"
          onConfirm={handleRerun}
          loading={rerunMutation.isPending}
          isDestructive={false}
        />
      )}
    </div>
  );
}

/**
 * Export ExecutionDetailPage as default
 */
export default ExecutionDetailPage;
