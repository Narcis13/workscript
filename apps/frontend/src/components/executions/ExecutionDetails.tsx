/**
 * ExecutionDetails Component
 *
 * Displays comprehensive metadata about a workflow execution, including execution IDs,
 * workflow information, timing details, status, and detailed state inspection.
 * Provides tools to view initial state, final state, and compare state differences
 * with a Monaco-based diff viewer.
 *
 * Features:
 * - Execution metadata display (ID, workflow, timing, status, duration)
 * - Copy-to-clipboard functionality for execution IDs
 * - Initial state display as formatted JSON tree with expand/collapse
 * - Final state display as formatted JSON tree with expand/collapse
 * - Compare States button for side-by-side diff view
 * - Status badges and timing information
 * - Responsive layout for mobile and desktop
 * - Error state handling for missing or incomplete data
 * - Skeleton loading state display
 * - Formatted timestamps and duration calculations
 *
 * @module components/executions/ExecutionDetails
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import type { WorkflowExecution } from '@/types/execution.types';
import type { ExecutionStatus } from '@/types/automation.types';

/**
 * Props for the ExecutionDetails component
 */
export interface ExecutionDetailsProps {
  /**
   * The workflow execution object with complete metadata
   */
  execution: WorkflowExecution;

  /**
   * Optional CSS class name for the container
   */
  className?: string;

  /**
   * Callback when "Compare States" button is clicked
   */
  onCompareStates?: () => void;

  /**
   * Whether to show initial and final states (default: true)
   */
  showStates?: boolean;

  /**
   * Whether the component is loading (default: false)
   */
  isLoading?: boolean;
}

/**
 * Props for the JSON tree viewer
 */
interface JSONTreeViewerProps {
  /**
   * The JSON data to display
   */
  data: Record<string, any> | undefined | null;

  /**
   * Label for the section
   */
  label: string;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Format a timestamp to human-readable format with date and time
 *
 * @param timestamp - ISO string or Date object
 * @returns Formatted date and time string
 */
const formatDateTime = (timestamp: Date | string | undefined | null): string => {
  if (!timestamp) return 'Not available';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
};

/**
 * Format duration in milliseconds to human-readable format
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
const formatDuration = (ms: number | null | undefined): string => {
  if (!ms) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
};

/**
 * Copy text to clipboard with visual feedback
 *
 * @param text - Text to copy
 * @param label - Label for the toast notification
 */
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied to clipboard`);
  } catch (err) {
    toast.error(`Failed to copy ${label}`);
  }
};

/**
 * JSON Tree Viewer Component
 *
 * Displays JSON data as an expandable tree with syntax highlighting.
 * Shows object/array nesting with expand/collapse controls.
 */
const JSONTreeViewer: React.FC<JSONTreeViewerProps> = ({ data, label, className }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!data) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        </div>
        <div className="bg-muted rounded-md p-3">
          <p className="text-xs text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }

  if (Object.keys(data).length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        </div>
        <div className="bg-muted rounded-md p-3">
          <p className="text-xs text-muted-foreground">Empty object</p>
        </div>
      </div>
    );
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCopyJSON = () => {
    copyToClipboard(JSON.stringify(data, null, 2), `${label} JSON`);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-sm font-semibold text-foreground hover:bg-transparent"
          onClick={handleToggle}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 mr-2" />
          ) : (
            <ChevronDown className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1"
          onClick={handleCopyJSON}
          title="Copy JSON to clipboard"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {isExpanded && (
        <div className="bg-muted rounded-md p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

/**
 * Skeleton Loading Component
 *
 * Shows placeholder content while execution details are loading
 */
const ExecutionDetailsSkeleton: React.FC = () => (
  <Card className="space-y-6 p-6">
    {/* Metadata Skeleton */}
    <div className="space-y-4">
      <div className="h-6 bg-muted rounded-md w-32 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
    </div>

    <Separator />

    {/* States Skeleton */}
    <div className="space-y-4">
      <div className="h-6 bg-muted rounded-md w-40 animate-pulse" />
      <div className="h-40 bg-muted rounded-md animate-pulse" />
    </div>
  </Card>
);

/**
 * ExecutionDetails Component
 *
 * Displays comprehensive execution details including metadata, timing information,
 * status, and state inspection tools. Provides copy-to-clipboard for IDs and
 * state comparison functionality.
 *
 * @example
 * ```tsx
 * <ExecutionDetails
 *   execution={executionData}
 *   showStates={true}
 *   onCompareStates={() => setShowDiffModal(true)}
 * />
 * ```
 */
export const ExecutionDetails: React.FC<ExecutionDetailsProps> = ({
  execution,
  className,
  onCompareStates,
  showStates = true,
  isLoading = false,
}) => {

  if (isLoading) {
    return (
      <div className={className}>
        <ExecutionDetailsSkeleton />
      </div>
    );
  }

  const status = execution.status as ExecutionStatus;
  const startTime = formatDateTime(execution.startTime);
  const endTime = formatDateTime(execution.endTime);
  const duration = formatDuration(execution.duration);
  const canCompare =
    execution.initialState && execution.finalState && onCompareStates;

  return (
    <div className={className}>
      <Card className="space-y-6 p-6">
        {/* Execution Metadata Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Execution Details</h2>
            <StatusBadge status={status} />
          </div>

          <Separator />

          {/* ID and Workflow Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Execution ID */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Execution ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-3 py-2 rounded-md flex-1 truncate">
                  {execution.id}
                </code>
                <CopyButton
                  value={execution.id}
                  label="Execution ID"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                />
              </div>
            </div>

            {/* Workflow */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Workflow</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {execution.workflowName || 'Unknown'}
                </span>
                {execution.workflowVersion && (
                  <Badge variant="secondary" className="text-xs">
                    v{execution.workflowVersion}
                  </Badge>
                )}
              </div>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Start Time
              </div>
              <p className="text-sm text-foreground">{startTime}</p>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                End Time
              </div>
              <p className="text-sm text-foreground">{endTime}</p>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                <Zap className="h-4 w-4" />
                Duration
              </div>
              <p className="text-sm font-mono text-foreground">{duration}</p>
            </div>

            {/* Triggered By */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Triggered By</p>
              <Badge variant="outline" className="text-xs w-fit">
                {execution.triggeredBy || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Error Information (if failed) */}
          {execution.status === 'failed' && execution.error && (
            <>
              <Separator />
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
                    Error Message
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-300">{execution.error}</p>
                </div>
                {execution.stackTrace && (
                  <details className="text-xs">
                    <summary className="font-semibold text-red-800 dark:text-red-300 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 bg-red-100 dark:bg-red-900/50 p-2 rounded text-red-700 dark:text-red-300 overflow-x-auto">
                      {execution.stackTrace}
                    </pre>
                  </details>
                )}
                {execution.failedNodeId && (
                  <p className="text-xs text-red-800 dark:text-red-300">
                    <span className="font-semibold">Failed Node:</span> {execution.failedNodeId}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* State Information */}
        {showStates && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">State Information</h3>
                {canCompare && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCompareStates}
                    className="gap-2"
                  >
                    Compare States
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Initial State */}
                <JSONTreeViewer
                  data={execution.initialState}
                  label="Initial State"
                />

                {/* Final State */}
                <JSONTreeViewer
                  data={execution.finalState}
                  label="Final State"
                />
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

/**
 * Export ExecutionDetails as default
 */
export default ExecutionDetails;
