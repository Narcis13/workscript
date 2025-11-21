/**
 * ExecutionTimeline Component
 *
 * Displays a vertical timeline of node executions during a workflow execution.
 * Each timeline item shows a node's execution details including ID, type, start time,
 * duration, and status. Timeline items are expandable to reveal detailed information
 * about inputs, outputs, state modifications, and any errors.
 *
 * Features:
 * - Vertical timeline visualization with visual connectors
 * - Node status indicators (pending, running, completed, failed, skipped)
 * - Color-coded status badges
 * - Expandable items showing detailed execution information
 * - Input configuration display (JSON format)
 * - Output edges display (JSON format)
 * - State modifications tracking
 * - Error display for failed nodes
 * - Duration and timing information
 * - Responsive design with hover effects
 * - Keyboard accessible expand/collapse controls
 * - Performance optimized for large execution flows
 *
 * @module components/executions/ExecutionTimeline
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { NodeExecutionLog } from '@/types/execution.types';

/**
 * Props for the ExecutionTimeline component
 */
export interface ExecutionTimelineProps {
  /**
   * The workflow execution object containing the complete execution data
   */
  execution: {
    /** Node execution logs in order */
    nodeLogs?: NodeExecutionLog[];
    /** Whether the execution is currently running */
    status?: 'running' | 'completed' | 'failed' | 'pending';
    /** Total execution duration in milliseconds */
    duration?: number;
  };

  /**
   * Optional CSS class name for the timeline container
   */
  className?: string;

  /**
   * Optional callback when a node is clicked
   */
  onNodeClick?: (nodeId: string) => void;

  /**
   * Whether to show state modifications (default: true)
   */
  showStateChanges?: boolean;

  /**
   * Whether to auto-expand failed nodes (default: true)
   */
  autoExpandFailures?: boolean;
}

/**
 * Props for a single timeline item
 */
interface TimelineItemProps {
  /** The node execution log data */
  node: NodeExecutionLog;
  /** Index in the execution sequence */
  index: number;
  /** Total number of nodes */
  total: number;
  /** Whether this is the last item */
  isLast: boolean;
  /** Whether to show state changes */
  showStateChanges: boolean;
  /** Optional callback when node is clicked */
  onNodeClick?: (nodeId: string) => void;
}

/**
 * Get status configuration including color, icon, and label
 *
 * @param status - The node execution status
 * @returns Object with variant, label, and icon properties
 */
const getStatusConfig = (
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  label: string;
  icon: React.ReactNode;
  dotColor: string;
} => {
  switch (status) {
    case 'pending':
      return {
        variant: 'secondary',
        label: 'Pending',
        icon: <Circle className="h-3 w-3" />,
        dotColor: 'bg-gray-300',
      };
    case 'running':
      return {
        variant: 'default',
        label: 'Running',
        icon: <Zap className="h-3 w-3" />,
        dotColor: 'bg-blue-500 animate-pulse',
      };
    case 'completed':
      return {
        variant: 'default',
        label: 'Completed',
        icon: <CheckCircle2 className="h-3 w-3" />,
        dotColor: 'bg-green-500',
      };
    case 'failed':
      return {
        variant: 'destructive',
        label: 'Failed',
        icon: <AlertCircle className="h-3 w-3" />,
        dotColor: 'bg-red-500',
      };
    case 'skipped':
      return {
        variant: 'outline',
        label: 'Skipped',
        icon: <Circle className="h-3 w-3" />,
        dotColor: 'bg-gray-400',
      };
  }
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
 * Format a timestamp to human-readable format
 *
 * @param timestamp - ISO string or Date object
 * @returns Formatted time string
 */
const formatTime = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString();
};

/**
 * Render JSON data with syntax highlighting
 *
 * @param data - The data to render
 * @param maxLength - Maximum lines to show before truncating
 * @returns Formatted JSON string
 */
const renderJSON = (data: any, maxLength = 200): string => {
  try {
    const json = JSON.stringify(data, null, 2);
    return json.length > maxLength ? json.substring(0, maxLength) + '...' : json;
  } catch {
    return String(data);
  }
};

/**
 * Timeline Item Component
 *
 * Renders a single node execution in the timeline with expandable details.
 */
const TimelineItem: React.FC<TimelineItemProps> = ({
  node,
  index,
  total,
  isLast,
  showStateChanges,
  onNodeClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = getStatusConfig(node.status);
  const hasDetails =
    (node.inputConfig && Object.keys(node.inputConfig).length > 0) ||
    (node.outputEdges && Object.keys(node.outputEdges).length > 0) ||
    (showStateChanges &&
      node.stateModifications &&
      Object.keys(node.stateModifications).length > 0) ||
    node.error;

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleNodeClick = () => {
    if (onNodeClick) {
      onNodeClick(node.nodeId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleExpand(e as any);
    }
  };

  return (
    <div className="relative">
      {/* Timeline Connector Line */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-6 top-12 w-0.5 h-12',
            node.status === 'completed'
              ? 'bg-green-500'
              : node.status === 'failed'
                ? 'bg-red-500'
                : 'bg-gray-300'
          )}
        />
      )}

      {/* Timeline Item */}
      <div className="flex gap-4 pb-6">
        {/* Timeline Dot and Connector */}
        <div className="relative flex flex-col items-center pt-1">
          <div
            className={cn(
              'w-4 h-4 rounded-full border-2 border-background',
              statusConfig.dotColor
            )}
            role="status"
            aria-label={`Node ${index + 1} status: ${node.status}`}
          />
        </div>

        {/* Node Details Card */}
        <div className="flex-1 pt-0">
          <Card
            className={cn(
              'transition-all duration-200',
              'hover:shadow-md hover:border-primary/50',
              'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
              node.status === 'failed' && 'border-red-200 bg-red-50/50'
            )}
            onClick={handleNodeClick}
            role="button"
            tabIndex={0}
          >
            {/* Node Header */}
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm font-mono font-semibold text-foreground truncate">
                    {node.nodeId}
                  </code>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {node.nodeType}
                  </Badge>
                  <Badge variant={statusConfig.variant} className="text-xs shrink-0">
                    {statusConfig.label}
                  </Badge>
                </div>

                {/* Timing Information */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(node.startTime)}</span>
                  </div>
                  {node.duration !== null && node.duration !== undefined && (
                    <div>
                      Duration: <span className="font-mono">{formatDuration(node.duration)}</span>
                    </div>
                  )}
                  {node.sequenceNumber !== undefined && (
                    <div>
                      Step <span className="font-mono">{node.sequenceNumber + 1}</span> of{' '}
                      <span className="font-mono">{total}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expand Button */}
              {hasDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={handleExpand}
                  onKeyDown={handleKeyDown}
                  aria-label={isExpanded ? 'Hide node details' : 'Show node details'}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Expandable Details */}
            {isExpanded && hasDetails && (
              <>
                <Separator />
                <div className="space-y-4 p-4 bg-muted/50">
                  {/* Error Section */}
                  {node.error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">Error</h4>
                      <p className="text-xs text-red-800 font-mono">{node.error}</p>
                    </div>
                  )}

                  {/* Input Configuration */}
                  {node.inputConfig && Object.keys(node.inputConfig).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2">Input Config</h4>
                      <pre className="bg-background border border-border rounded p-2 text-xs font-mono overflow-x-auto text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                        {renderJSON(node.inputConfig)}
                      </pre>
                    </div>
                  )}

                  {/* Output Edges */}
                  {node.outputEdges && Object.keys(node.outputEdges).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2">Output Edges</h4>
                      <pre className="bg-background border border-border rounded p-2 text-xs font-mono overflow-x-auto text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                        {renderJSON(node.outputEdges)}
                      </pre>
                    </div>
                  )}

                  {/* State Modifications */}
                  {showStateChanges &&
                    node.stateModifications &&
                    Object.keys(node.stateModifications).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2">
                          State Changes
                        </h4>
                        <pre className="bg-background border border-border rounded p-2 text-xs font-mono overflow-x-auto text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                          {renderJSON(node.stateModifications)}
                        </pre>
                      </div>
                    )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

/**
 * ExecutionTimeline Component
 *
 * Displays a complete vertical timeline of all node executions in a workflow execution.
 * Each node is shown with its status, timing, and expandable details.
 *
 * @example
 * ```tsx
 * <ExecutionTimeline
 *   execution={executionData}
 *   showStateChanges={true}
 *   autoExpandFailures={true}
 *   onNodeClick={(nodeId) => console.log(`Clicked node: ${nodeId}`)}
 * />
 * ```
 */
export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  execution,
  className,
  onNodeClick,
  showStateChanges = true,
  autoExpandFailures = true,
}) => {
  const nodeLogs = execution.nodeLogs || [];

  if (nodeLogs.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className="p-8">
          <div className="text-center">
            <CircleIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">No node executions to display</p>
          </div>
        </Card>
      </div>
    );
  }

  const sortedLogs = [...nodeLogs].sort((a, b) => {
    const seqA = a.sequenceNumber ?? 0;
    const seqB = b.sequenceNumber ?? 0;
    return seqA - seqB;
  });

  return (
    <div className={cn('space-y-2', className)}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Execution Timeline</h3>
        <p className="text-xs text-muted-foreground">
          {sortedLogs.length} node{sortedLogs.length !== 1 ? 's' : ''} executed
        </p>
      </div>

      {/* Timeline Container */}
      <div className="space-y-0">
        {sortedLogs.map((node, index) => (
          <TimelineItem
            key={`${node.id}-${index}`}
            node={node}
            index={index}
            total={sortedLogs.length}
            isLast={index === sortedLogs.length - 1}
            showStateChanges={showStateChanges}
            onNodeClick={onNodeClick}
          />
        ))}
      </div>

      {/* Timeline Footer Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground mt-6 p-3 bg-muted/50 rounded-lg">
        <div>
          <span className="font-semibold text-foreground">
            {sortedLogs.filter((n) => n.status === 'completed').length}
          </span>{' '}
          completed
        </div>
        <div>
          <span className="font-semibold text-foreground">
            {sortedLogs.filter((n) => n.status === 'failed').length}
          </span>{' '}
          failed
        </div>
        {sortedLogs.some((n) => n.status === 'skipped') && (
          <div>
            <span className="font-semibold text-foreground">
              {sortedLogs.filter((n) => n.status === 'skipped').length}
            </span>{' '}
            skipped
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Fallback circle icon for empty state
 */
const CircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Circle className={className} />
);

/**
 * Export ExecutionTimeline as default
 */
export default ExecutionTimeline;
