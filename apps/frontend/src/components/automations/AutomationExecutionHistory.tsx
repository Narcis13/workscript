import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, Copy, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAutomationExecutions } from '@/hooks/api/useAutomations';
import useWebSocket from '@/hooks/api/useWebSocket';
import type { AutomationExecution } from '@/types/automation.types';
import { ExecutionStatus } from '@/types/automation.types';
import type { Status } from '@/components/shared/StatusBadge';
import type { AnyEvent } from '@/services/websocket/events.types';
import { toast } from 'sonner';

/**
 * AutomationExecutionHistory Component Props
 *
 * @property automationId - The automation ID to fetch execution history for
 * @property compact - Optional flag to use a more compact layout
 * @property onViewDetails - Optional callback when "View Details" is clicked
 */
export interface AutomationExecutionHistoryProps {
  /** Automation ID to fetch history for */
  automationId: string;

  /** Use compact layout (useful for embedding) */
  compact?: boolean;

  /** Optional callback for view details action */
  onViewDetails?: (executionId: string) => void;
}

/**
 * Format duration from milliseconds to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1.2s", "45ms", "2m 30s")
 */
function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return '-';
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format date/time for display
 *
 * @param date - Date to format (Date object or ISO string)
 * @returns Formatted date string (e.g., "Jan 18, 2025 14:30")
 */
function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return '-';
  }
}

/**
 * Truncate execution ID to first 8 characters for display
 *
 * @param id - Full execution ID (UUID)
 * @returns Truncated ID
 */
function truncateId(id: string): string {
  return id.substring(0, 8);
}

/**
 * Copy text to clipboard and show toast notification
 *
 * @param text - Text to copy
 * @param label - Label for the toast message
 */
async function copyToClipboard(text: string, label: string = 'Text'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch (error) {
    toast.error('Failed to copy to clipboard');
  }
}

/**
 * Format trigger type for display
 *
 * @param triggeredBy - How the execution was triggered
 * @returns Formatted trigger type string
 */
function formatTriggerType(triggeredBy: 'cron' | 'webhook' | 'manual'): string {
  switch (triggeredBy) {
    case 'cron':
      return 'Cron Schedule';
    case 'webhook':
      return 'Webhook';
    case 'manual':
      return 'Manual';
    default:
      return triggeredBy;
  }
}

/**
 * AutomationExecutionHistory Component
 *
 * Displays a table of execution history for a specific automation with the following features:
 * - Shows execution ID, triggered by type, start time, status, duration
 * - Sortable columns
 * - Truncated execution IDs with copy-to-clipboard functionality
 * - Color-coded status badges
 * - Formatted timestamps and durations
 * - "View Details" action button
 * - Pagination for > 20 executions
 * - Auto-refresh every 30 seconds via React Query
 * - Refresh button for manual refresh
 * - Compact mode for embedding in other views
 * - Loading state with skeleton rows
 * - Empty state when no executions
 * - **REAL-TIME UPDATES** via WebSocket: Automatically prepends new executions to the list as they arrive
 * - **Toast notifications** when new executions are triggered
 *
 * This component is used in:
 * - Automation detail pages (to show execution history for an automation)
 * - Automation stats panels (to show recent executions)
 *
 * WebSocket Integration:
 * - Listens for `automation:execution-started` events from WebSocket
 * - When a new execution is detected for this automation, it's prepended to the history list
 * - Displays a toast notification: "Automation executed"
 * - Works seamlessly with periodic React Query refetches for consistency
 *
 * @param props - AutomationExecutionHistoryProps
 * @returns Rendered table of automation executions
 *
 * @example
 * ```tsx
 * // Full table with all columns
 * <AutomationExecutionHistory
 *   automationId="123e4567-e89b-12d3-a456-426614174000"
 * />
 *
 * // Compact mode for embedding
 * <AutomationExecutionHistory
 *   automationId="123e4567-e89b-12d3-a456-426614174000"
 *   compact={true}
 * />
 *
 * // With custom view handler
 * <AutomationExecutionHistory
 *   automationId="123e4567-e89b-12d3-a456-426614174000"
 *   onViewDetails={(id) => console.log('View execution:', id)}
 * />
 * ```
 *
 * @remarks
 * - Execution IDs are truncated to 8 characters for readability
 * - Click on execution ID to copy full ID to clipboard
 * - Status badges are color-coded: green (completed), red (failed), blue (running), gray (pending)
 * - Duration is calculated from start and end times if not provided
 * - Auto-refreshes every 30 seconds via React Query configuration
 * - Uses DataTable component for consistent table styling and behavior
 * - Supports pagination with 20 executions per page
 * - Real-time updates from WebSocket do not require manual refresh
 * - New executions appear at the top of the table when they arrive
 */
export function AutomationExecutionHistory({
  automationId,
  compact = false,
  onViewDetails,
}: AutomationExecutionHistoryProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [newExecutions, setNewExecutions] = React.useState<AutomationExecution[]>([]);
  const itemsPerPage = 20;

  // Get WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();

  // Fetch execution history with auto-refresh
  const { data: executions = [], isLoading, error, refetch } = useAutomationExecutions(
    automationId,
    {
      page: currentPage,
      pageSize: itemsPerPage,
    },
    !!automationId // Enabled only when automationId is provided
  );

  /**
   * Handle new automation execution from WebSocket
   * When a workflow execution starts for this automation, prepend it to the list
   */
  React.useEffect(() => {
    if (!isConnected || !automationId) {
      return;
    }

    /**
     * Handler for workflow execution started event
     * Check if this execution belongs to the current automation
     * Note: Currently not used directly but kept for potential future WebSocket subscription
     */
    const _handleExecutionStarted = (event: AnyEvent) => {
      // Only process workflow:started events
      if (event.type !== 'workflow:started') {
        return;
      }

      // Check if this execution belongs to the current automation
      // The event may contain automationId in the data, or we need to check the workflow
      const executionData = (event as any).data || {};
      const eventAutomationId = (event as any).automationId || executionData.automationId;

      // Only add if it matches this automation ID
      if (eventAutomationId !== automationId) {
        return;
      }

      // Create a new execution object from the WebSocket event
      const newExecution: AutomationExecution = {
        id: (event as any).executionId || '',
        automationId: automationId,
        workflowId: (event as any).workflowId || '',
        startTime: event.timestamp || new Date(),
        endTime: null,
        duration: null,
        status: ExecutionStatus.RUNNING,
        triggeredBy: 'cron' as const, // Default to cron, could be enhanced with event data
        result: null,
        error: null
      };

      // Prepend to new executions list
      setNewExecutions((prev) => [newExecution, ...prev]);

      // Show toast notification
      toast.info('Automation executed');

      // Clear new executions after a short delay to prevent duplicates with API refresh
      // This helps when React Query refetch brings the same data
      const timer = setTimeout(() => {
        setNewExecutions([]);
      }, 5000);

      return () => clearTimeout(timer);
    };

    // Note: We would normally use the `on` method from useWebSocket hook,
    // but we're listening to all workflow:started events from the event log
    // The WebSocket hook already processes these events, so we'll check the event log
    // This is a fallback approach that listens to all workflow started events
    // A more direct approach would be to check if the WebSocket client emits
    // automation-specific events, but we work with what's available

    return () => {
      // Cleanup is handled by the effect dependencies
    };
  }, [isConnected, automationId]);

  /**
   * Alternative: Listen for execution events directly from WebSocket hook
   * If the WebSocket client supports direct event subscriptions
   */
  const { eventLog } = useWebSocket();

  React.useEffect(() => {
    if (!isConnected || !automationId || eventLog.length === 0) {
      return;
    }

    // Get the most recent event
    const mostRecentEvent = eventLog[eventLog.length - 1];

    if (!mostRecentEvent || mostRecentEvent.type !== 'workflow:started') {
      return;
    }

    // Check if this execution belongs to the current automation
    const eventData = (mostRecentEvent as any).data || {};
    const eventAutomationId = (mostRecentEvent as any).automationId || eventData.automationId;

    // Only process if it matches this automation and we haven't already seen it
    if (eventAutomationId !== automationId || newExecutions.length > 0) {
      return;
    }

    // Create a new execution object from the WebSocket event
    const newExecution: AutomationExecution = {
      id: (mostRecentEvent as any).executionId || '',
      automationId: automationId,
      workflowId: (mostRecentEvent as any).workflowId || '',
      startTime: mostRecentEvent.timestamp || new Date(),
      endTime: null,
      duration: null,
      status: ExecutionStatus.RUNNING,
      triggeredBy: 'cron' as const,
      result: null,
      error: null
    };

    // Prepend to new executions list
    setNewExecutions((prev) => {
      // Check if we already have this execution
      if (prev.some((e) => e.id === newExecution.id)) {
        return prev;
      }
      return [newExecution, ...prev];
    });

    // Show toast notification
    toast.info('Automation executed');

    // Clear new executions after a delay
    const timer = setTimeout(() => {
      setNewExecutions([]);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isConnected, automationId, eventLog, newExecutions.length]);

  /**
   * Handle view details action
   */
  const handleViewDetails = (executionId: string) => {
    if (onViewDetails) {
      onViewDetails(executionId);
    } else {
      navigate(`/executions/${executionId}`);
    }
  };

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    refetch();
  };

  /**
   * Define table columns based on compact mode
   */
  const columns: Column<AutomationExecution>[] = React.useMemo(() => {
    const baseColumns: Column<AutomationExecution>[] = [
      {
        id: 'executionId',
        header: 'Execution ID',
        accessorKey: 'id',
        cell: (execution: AutomationExecution) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(execution.id, 'Execution ID');
            }}
            className="flex items-center gap-2 hover:text-primary transition-colors group"
            title={execution.id}
          >
            <span className="font-mono text-sm">{truncateId(execution.id)}</span>
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ),
      },
      {
        id: 'triggeredBy',
        header: 'Triggered By',
        accessorKey: 'triggeredBy',
        cell: (execution: AutomationExecution) => (
          <span className="text-sm capitalize">
            {formatTriggerType(execution.triggeredBy)}
          </span>
        ),
        sortable: true,
      },
      {
        id: 'startTime',
        header: 'Start Time',
        accessorKey: 'startTime',
        cell: (execution: AutomationExecution) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(execution.startTime)}
          </span>
        ),
        sortable: true,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: (execution: AutomationExecution) => <StatusBadge status={execution.status as Status} />,
        sortable: true,
      },
      {
        id: 'duration',
        header: 'Duration',
        accessorKey: 'duration',
        cell: (execution: AutomationExecution) => {
          // Calculate duration if not provided
          let duration = execution.duration;
          if (!duration && execution.startTime && execution.endTime) {
            const start = new Date(execution.startTime).getTime();
            const end = new Date(execution.endTime).getTime();
            duration = end - start;
          }
          return (
            <span className="text-sm font-mono">
              {formatDuration(duration)}
            </span>
          );
        },
        sortable: true,
      },
      {
        id: 'actions',
        header: '',
        accessorKey: 'id',
        cell: (execution: AutomationExecution) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(execution.id)}
              className="h-8"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          </div>
        ),
      },
    ];

    // In compact mode, hide triggered by column
    if (compact) {
      return baseColumns.filter((col) => col.id !== 'triggeredBy');
    }

    return baseColumns;
  }, [compact, navigate]);

  // Combine new executions from WebSocket with existing data from API
  // New executions appear at the top with a temporary entry before being confirmed by API
  const displayedExecutions = [...newExecutions, ...executions];

  return (
    <div className="space-y-4">
      {/* Header with refresh button and WebSocket status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Execution History</h3>
          {isConnected && newExecutions.length > 0 && (
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live updates enabled" />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Real-time updates indicator */}
      {isConnected && newExecutions.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          {newExecutions.length} new execution{newExecutions.length !== 1 ? 's' : ''} detected in real-time
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load execution history. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Execution table - displays new executions at top, followed by API data */}
      <DataTable
        columns={columns}
        data={displayedExecutions}
        loading={isLoading}
        emptyMessage="No executions yet. Execute this automation to see history."
      />

      {/* Pagination */}
      {executions.length >= itemsPerPage && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={executions.length < itemsPerPage}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="text-xs text-muted-foreground text-center">
        Automatically refreshing every 30 seconds
      </div>
    </div>
  );
}

export default AutomationExecutionHistory;
