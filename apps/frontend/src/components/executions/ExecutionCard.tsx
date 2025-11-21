/**
 * ExecutionCard Component
 *
 * Displays a real-time execution card that tracks the progress of an active workflow execution.
 * Shows workflow information, progress bar, current node, elapsed time, and status with
 * the ability to expand and view detailed event logs.
 *
 * Features:
 * - Real-time execution progress display
 * - Progress bar showing completed nodes
 * - Current node highlighting
 * - Elapsed time tracking
 * - Status badge (running/pending/completed/failed)
 * - Expandable event log with recent execution events
 * - Responsive layout with hover effects
 * - Keyboard accessible
 *
 * @module components/executions/ExecutionCard
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Zap, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ActiveExecutionTracking } from '@/services/websocket/events.types';
import type { AnyEvent } from '@/services/websocket/events.types';

/**
 * Props for the ExecutionCard component
 */
export interface ExecutionCardProps {
  /**
   * The active execution to display (from WebSocket updates)
   */
  execution: ActiveExecutionTracking;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional callback when the card is clicked
   */
  onClick?: (executionId: string) => void;
}

/**
 * Format elapsed time in human-readable format
 *
 * @param ms - Milliseconds elapsed
 * @returns Formatted time string (e.g., "2m 30s")
 */
const formatElapsedTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Get the appropriate status badge configuration
 */
const getStatusConfig = (status: string): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  label: string;
  icon: React.ReactNode;
} => {
  switch (status) {
    case 'running':
      return {
        variant: 'default',
        label: 'Running',
        icon: <Zap className="h-3 w-3" />,
      };
    case 'pending':
      return {
        variant: 'secondary',
        label: 'Pending',
        icon: <Circle className="h-3 w-3" />,
      };
    case 'completed':
      return {
        variant: 'default',
        label: 'Completed',
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case 'failed':
      return {
        variant: 'destructive',
        label: 'Failed',
        icon: <AlertCircle className="h-3 w-3" />,
      };
    default:
      return {
        variant: 'outline',
        label: status,
        icon: <Circle className="h-3 w-3" />,
      };
  }
};

/**
 * Get event type display information
 */
const getEventTypeInfo = (eventType: string): {
  label: string;
  color: string;
  icon: React.ReactNode;
} => {
  const baseClasses = 'h-3 w-3';

  if (eventType.startsWith('workflow:')) {
    const type = eventType.split(':')[1];
    return {
      label: `Workflow ${type}`,
      color: 'text-blue-500',
      icon: <Zap className={baseClasses} />,
    };
  } else if (eventType.startsWith('node:')) {
    const type = eventType.split(':')[1];
    const icons: Record<string, React.ReactNode> = {
      started: <Circle className={baseClasses} />,
      completed: <CheckCircle2 className={baseClasses} />,
      failed: <AlertCircle className={baseClasses} />,
      skipped: <Circle className={baseClasses} />,
    };
    return {
      label: `Node ${type}`,
      color: 'text-gray-500',
      icon: icons[type] || <Circle className={baseClasses} />,
    };
  }

  return {
    label: eventType,
    color: 'text-gray-500',
    icon: <Circle className={baseClasses} />,
  };
};

/**
 * ExecutionCard Component
 *
 * Displays a single execution's real-time progress and status with expandable details.
 *
 * @example
 * ```tsx
 * <ExecutionCard
 *   execution={activeExecution}
 *   onClick={(id) => navigate(`/executions/${id}`)}
 * />
 * ```
 */
export const ExecutionCard: React.FC<ExecutionCardProps> = ({
  execution,
  className,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentElapsedTime, setCurrentElapsedTime] = useState(execution.elapsedTime);

  // Update elapsed time every second
  useEffect(() => {
    if (execution.status === 'running' || execution.status === 'pending') {
      const interval = setInterval(() => {
        setCurrentElapsedTime((prev) => prev + 1000);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [execution.status]);

  const statusConfig = getStatusConfig(execution.status);
  const progressPercentage = (execution.progress.completed / execution.progress.total) * 100;
  const hasRecentEvents = execution.events && execution.events.length > 0;
  const recentEvents = execution.events?.slice(-5) || []; // Show last 5 events

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(execution.executionId);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick(execution.executionId);
      }
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        'hover:shadow-lg hover:border-primary/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'cursor-pointer',
        className
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Execution ${execution.executionId} - ${execution.workflowName}`}
      aria-expanded={isExpanded}
    >
      {/* Header Section */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{execution.workflowName}</CardTitle>
            <CardDescription className="text-xs font-mono mt-1 truncate">
              Execution: {execution.executionId.slice(0, 8)}...
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant} className="shrink-0 flex items-center gap-1">
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </Badge>
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="space-y-3">
        {/* Current Node and Progress Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current Node:</span>
              {execution.currentNode ? (
                <span className="font-mono font-semibold text-primary truncate">
                  {execution.currentNode}
                </span>
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatElapsedTime(currentElapsedTime)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">
                {execution.progress.completed} / {execution.progress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Execution progress: ${progressPercentage.toFixed(0)}%`}
              />
            </div>
          </div>
        </div>

        {/* Node Status Summary */}
        {(execution.completedNodes.length > 0 || execution.failedNodes.length > 0) && (
          <div className="flex gap-4 text-xs">
            {execution.completedNodes.length > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">
                  {execution.completedNodes.length} completed
                </span>
              </div>
            )}
            {execution.failedNodes.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-muted-foreground">
                  {execution.failedNodes.length} failed
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Expand Button */}
      {hasRecentEvents && (
        <>
          <Separator />
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={handleExpandClick}
              aria-label={isExpanded ? 'Hide event log' : 'Show event log'}
            >
              <span className="text-xs font-medium">Event Log ({recentEvents.length})</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Expandable Event Log */}
          {isExpanded && (
            <div className="px-4 py-3 space-y-2 bg-muted/50 border-t">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Recent Events</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentEvents.map((event) => {
                  const eventInfo = getEventTypeInfo(event.type);
                  const eventTime = new Date(event.timestamp);

                  return (
                    <div
                      key={`${event.executionId}-${event.type}-${eventTime.getTime()}`}
                      className="flex gap-2 text-xs p-2 bg-background rounded border border-border/50"
                    >
                      <div className={cn('flex-shrink-0 mt-0.5', eventInfo.color)}>
                        {eventInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{eventInfo.label}</div>
                        {'nodeId' in event && (
                          <div className="text-muted-foreground">
                            Node: <span className="font-mono">{event.nodeId}</span>
                          </div>
                        )}
                        {event.data && 'duration' in event.data && (
                          <div className="text-muted-foreground">
                            Duration: {event.data.duration}ms
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-muted-foreground">
                        {eventTime.toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

/**
 * Export ExecutionCard as default
 */
export default ExecutionCard;
