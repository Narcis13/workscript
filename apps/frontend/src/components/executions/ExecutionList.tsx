import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, Copy } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import type { WorkflowExecution } from '@/types/execution.types';
import { toast } from 'sonner';

/**
 * ExecutionList Component Props
 *
 * @property executions - Array of workflow execution records to display
 * @property loading - Whether the executions are currently being loaded
 * @property compact - Optional flag to use a more compact layout (hides some columns)
 * @property onViewDetails - Optional callback when "View Details" is clicked (if not provided, uses navigation)
 */
export interface ExecutionListProps {
  /** Array of workflow executions to display */
  executions: WorkflowExecution[];

  /** Loading state indicator */
  loading?: boolean;

  /** Use compact layout (useful for embedding in other views) */
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
 * ExecutionList Component
 *
 * Displays a table of workflow executions with the following features:
 * - Sortable columns
 * - Truncated execution IDs with copy-to-clipboard functionality
 * - Color-coded status badges
 * - Formatted timestamps and durations
 * - "View Details" action button
 * - Compact mode for embedding in other views
 * - Loading state with skeleton rows
 * - Empty state when no executions
 *
 * This component is used in:
 * - Workflow detail pages (to show recent executions for a specific workflow)
 * - Automation detail pages (to show executions triggered by an automation)
 * - Execution history page (full list of all executions)
 * - Dashboard (recent executions overview)
 *
 * @param props - ExecutionListProps
 * @returns Rendered table of executions
 *
 * @example
 * ```tsx
 * // Full table with all columns
 * <ExecutionList
 *   executions={executions}
 *   loading={isLoading}
 * />
 *
 * // Compact mode for embedding
 * <ExecutionList
 *   executions={recentExecutions}
 *   loading={isLoading}
 *   compact={true}
 * />
 *
 * // With custom view handler
 * <ExecutionList
 *   executions={executions}
 *   onViewDetails={(id) => console.log('View execution:', id)}
 * />
 * ```
 *
 * @remarks
 * - Execution IDs are truncated to 8 characters for readability
 * - Click on execution ID to copy full ID to clipboard
 * - Status badges are color-coded: green (completed), red (failed), blue (running), gray (pending)
 * - Duration is calculated from start and end times if not provided
 * - Uses DataTable component for consistent table styling and behavior
 */
export function ExecutionList({
  executions,
  loading = false,
  compact = false,
  onViewDetails,
}: ExecutionListProps) {
  const navigate = useNavigate();

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
   * Define table columns based on compact mode
   */
  const columns: Column<WorkflowExecution>[] = React.useMemo(() => {
    const baseColumns: Column<WorkflowExecution>[] = [
      {
        id: 'executionId',
        header: 'Execution ID',
        accessorKey: 'id',
        cell: (execution) => (
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
        id: 'workflowName',
        header: 'Workflow',
        accessorKey: 'workflowName',
        cell: (execution) => (
          <span className="font-medium">{execution.workflowName || 'Unknown'}</span>
        ),
        sortable: true,
      },
      {
        id: 'startTime',
        header: 'Start Time',
        accessorKey: 'startTime',
        cell: (execution) => (
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
        cell: (execution) => <StatusBadge status={execution.status} />,
        sortable: true,
      },
      {
        id: 'duration',
        header: 'Duration',
        accessorKey: 'duration',
        cell: (execution) => {
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
        cell: (execution) => (
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

    // In compact mode, hide workflow name and shorten the table
    if (compact) {
      return baseColumns.filter(
        (col) => col.id !== 'workflowName' && col.id !== 'startTime'
      );
    }

    return baseColumns;
  }, [compact, navigate, onViewDetails]);

  return (
    <DataTable
      columns={columns}
      data={executions}
      loading={loading}
      emptyMessage="No executions yet. Run this workflow to see execution history."
    />
  );
}

export default ExecutionList;
