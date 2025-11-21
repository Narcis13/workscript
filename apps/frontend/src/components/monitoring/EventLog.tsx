/**
 * EventLog Component
 *
 * Displays a scrollable, filterable list of WebSocket events with timestamps.
 * Allows users to monitor real-time workflow execution events and filter by:
 * - Event type (errors, completed workflows, etc.)
 * - Workflow ID
 * - Custom filter criteria
 *
 * Features:
 * - Chronological event display with timestamps
 * - Multiple filtering options with real-time updates
 * - Auto-scroll to bottom on new events (with pause option)
 * - Event type color-coding and icons
 * - Detailed event information with expandable details
 *
 * @example
 * ```tsx
 * import { EventLog } from '@/components/monitoring/EventLog';
 * import { useEventLog } from '@/stores/useWebSocketStore';
 * import type { EventLogFilters } from '@/components/monitoring/EventLog';
 *
 * export function MonitoringPage() {
 *   const events = useEventLog();
 *   const [filters, setFilters] = useState<EventLogFilters>({
 *     showErrors: true,
 *     showCompleted: true,
 *     selectedWorkflow: undefined,
 *   });
 *
 *   return (
 *     <EventLog events={events} filters={filters} onFiltersChange={setFilters} />
 *   );
 * }
 * ```
 *
 * @module components.monitoring.EventLog
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnyEvent } from '@/services/websocket/events.types';
import {
  isWorkflowEvent,
  isNodeEvent,
  isWorkflowStartedEvent,
  isWorkflowCompletedEvent,
  isWorkflowFailedEvent,
  isNodeStartedEvent,
  isNodeCompletedEvent,
  isNodeFailedEvent,
} from '@/services/websocket/events.types';

/**
 * Filter options for the event log
 */
export interface EventLogFilters {
  /** Show only error events */
  showErrors?: boolean;

  /** Show only completed workflow events */
  showCompleted?: boolean;

  /** Filter by specific workflow ID */
  selectedWorkflow?: string;

  /** Filter by event type(s) */
  eventTypes?: string[];

  /** Custom filter function */
  customFilter?: (event: AnyEvent) => boolean;

  /** Search text for event details */
  searchText?: string;
}

/**
 * Props for the EventLog component
 */
interface EventLogProps {
  /** Array of events to display */
  events: AnyEvent[];

  /** Current filter configuration */
  filters?: EventLogFilters;

  /** Callback when filters change */
  onFiltersChange?: (filters: EventLogFilters) => void;

  /** Maximum height of the event log container */
  maxHeight?: string;

  /** Enable auto-scroll to bottom on new events */
  autoScroll?: boolean;
}

/**
 * Get human-readable label for an event type
 */
function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'workflow:started': 'Workflow Started',
    'workflow:completed': 'Workflow Completed',
    'workflow:failed': 'Workflow Failed',
    'workflow:progress': 'Workflow Progress',
    'workflow:status': 'Workflow Status',
    'node:started': 'Node Started',
    'node:completed': 'Node Completed',
    'node:failed': 'Node Failed',
    'node:skipped': 'Node Skipped',
    'system:ping': 'System Ping',
    'system:pong': 'System Pong',
    'system:notification': 'System Notification',
    'system:error': 'System Error',
  };
  return labels[type] || type;
}

/**
 * Determine if an event is an error event
 */
function isErrorEvent(event: AnyEvent): boolean {
  return (
    event.type.includes('failed') ||
    event.type.includes('error') ||
    (event.type.includes('workflow:') && isWorkflowFailedEvent(event)) ||
    (event.type.includes('node:') && isNodeFailedEvent(event))
  );
}

/**
 * Determine if an event is a completed event
 */
function isCompletedEvent(event: AnyEvent): boolean {
  return event.type.includes('completed');
}

/**
 * Get icon component for event type
 */
function getEventIcon(event: AnyEvent) {
  if (isErrorEvent(event)) {
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  }

  if (isCompletedEvent(event)) {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }

  if (event.type.includes('started') || event.type.includes('progress')) {
    return <Clock className="w-4 h-4 text-blue-500" />;
  }

  return <Clock className="w-4 h-4 text-gray-400" />;
}

/**
 * Get background color class for event row based on event type
 */
function getEventRowBg(event: AnyEvent): string {
  if (isErrorEvent(event)) {
    return 'bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900';
  }

  if (isCompletedEvent(event)) {
    return 'bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900';
  }

  if (event.type.includes('started') || event.type.includes('progress')) {
    return 'bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900';
  }

  return 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800';
}

/**
 * Render event-specific details
 */
function EventDetails({ event }: { event: AnyEvent }) {
  if (isWorkflowEvent(event)) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <p>
          <span className="font-medium">Workflow ID:</span> {event.workflowId}
        </p>
        {event.workflowName && (
          <p>
            <span className="font-medium">Workflow:</span> {event.workflowName}
          </p>
        )}
        <p>
          <span className="font-medium">Execution ID:</span> {event.executionId}
        </p>

        {isWorkflowCompletedEvent(event) && event.data?.duration && (
          <p>
            <span className="font-medium">Duration:</span> {event.data.duration}ms
          </p>
        )}

        {isWorkflowFailedEvent(event) && event.data?.error && (
          <p className="text-red-600 dark:text-red-400">
            <span className="font-medium">Error:</span> {event.data.error}
          </p>
        )}

        {isWorkflowFailedEvent(event) && event.data?.failedNodeId && (
          <p>
            <span className="font-medium">Failed Node:</span> {event.data.failedNodeId}
          </p>
        )}
      </div>
    );
  }

  if (isNodeEvent(event)) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <p>
          <span className="font-medium">Node ID:</span> {event.nodeId}
        </p>
        {event.nodeType && (
          <p>
            <span className="font-medium">Node Type:</span> {event.nodeType}
          </p>
        )}
        <p>
          <span className="font-medium">Execution ID:</span> {event.executionId}
        </p>

        {isNodeCompletedEvent(event) && event.data?.duration && (
          <p>
            <span className="font-medium">Duration:</span> {event.data.duration}ms
          </p>
        )}

        {isNodeFailedEvent(event) && event.data?.error && (
          <p className="text-red-600 dark:text-red-400">
            <span className="font-medium">Error:</span> {event.data.error}
          </p>
        )}
      </div>
    );
  }

  return null;
}

/**
 * EventLog Component
 *
 * Main component for displaying and filtering WebSocket events.
 */
export function EventLog({
  events,
  filters = {},
  onFiltersChange,
  maxHeight = 'h-96',
  autoScroll = true,
}: EventLogProps): JSX.Element {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastEventCountRef = useRef(events.length);

  // Filter events based on current filter settings
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Apply error filter
      if (filters.showErrors === true && !isErrorEvent(event)) {
        return false;
      }

      // Apply completed filter
      if (filters.showCompleted === true && !isCompletedEvent(event)) {
        return false;
      }

      // Apply workflow filter
      if (
        filters.selectedWorkflow &&
        isWorkflowEvent(event) &&
        event.workflowId !== filters.selectedWorkflow
      ) {
        return false;
      }

      // Apply event type filter
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.type)) {
          return false;
        }
      }

      // Apply search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const eventStr = JSON.stringify(event).toLowerCase();
        if (!eventStr.includes(searchLower)) {
          return false;
        }
      }

      // Apply custom filter
      if (filters.customFilter && !filters.customFilter(event)) {
        return false;
      }

      return true;
    });
  }, [events, filters]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (!autoScroll || isPaused || !scrollContainerRef.current) {
      return;
    }

    // Only scroll if new events were added
    if (filteredEvents.length > lastEventCountRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 0);
    }

    lastEventCountRef.current = filteredEvents.length;
  }, [filteredEvents, autoScroll, isPaused]);

  // Handle filter toggle for common filters
  const handleShowErrorsToggle = () => {
    const newShowErrors = filters.showErrors ? false : true;
    const newFilters = { ...filters, showErrors: newShowErrors };
    onFiltersChange?.(newFilters);
  };

  const handleShowCompletedToggle = () => {
    const newShowCompleted = filters.showCompleted ? false : true;
    const newFilters = { ...filters, showCompleted: newShowCompleted };
    onFiltersChange?.(newFilters);
  };

  const handleClearFilters = () => {
    onFiltersChange?.({});
  };

  const hasActiveFilters =
    filters.showErrors ||
    filters.showCompleted ||
    filters.selectedWorkflow ||
    (filters.eventTypes && filters.eventTypes.length > 0) ||
    filters.searchText;

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white dark:bg-gray-950">
      {/* Header with Filter Controls */}
      <div className="border-b dark:border-gray-800 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Event Log ({filteredEvents.length})
          </h3>
          <div className="flex items-center gap-2">
            {autoScroll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className="h-8 px-2 text-xs"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 px-2"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-800">
            <Button
              variant={filters.showErrors ? 'default' : 'outline'}
              size="sm"
              onClick={handleShowErrorsToggle}
              className="h-7 text-xs"
            >
              Errors Only
            </Button>
            <Button
              variant={filters.showCompleted ? 'default' : 'outline'}
              size="sm"
              onClick={handleShowCompletedToggle}
              className="h-7 text-xs"
            >
              Completed Only
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Event List */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex-1 overflow-y-auto',
          maxHeight
        )}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 p-4">
            <p className="text-sm">
              {events.length === 0
                ? 'No events yet'
                : 'No events match your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEvents.map((event, index) => {
              const eventKey = `${event.executionId}-${event.timestamp.getTime()}-${index}`;
              const isExpanded = expandedEventId === eventKey;

              return (
                <div key={eventKey}>
                  {/* Event Row */}
                  <button
                    onClick={() =>
                      setExpandedEventId(
                        isExpanded ? null : eventKey
                      )
                    }
                    className={cn(
                      'w-full text-left px-4 py-3 border-b dark:border-gray-800 transition-colors',
                      'flex items-start justify-between gap-3',
                      'last:border-b-0',
                      getEventRowBg(event)
                    )}
                  >
                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getEventIcon(event)}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getEventTypeLabel(event.type)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {event.timestamp.toLocaleTimeString()}
                            </span>
                            {isWorkflowEvent(event) && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                {event.workflowId.substring(0, 8)}
                              </span>
                            )}
                            {isNodeEvent(event) && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                                {event.nodeId.substring(0, 8)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="flex-shrink-0 text-gray-400 dark:text-gray-600">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
                      <EventDetails event={event} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Bar */}
      {isPaused && (
        <div className="border-t dark:border-gray-800 bg-yellow-50 dark:bg-yellow-950 px-3 py-2">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            ⏸ Auto-scroll paused
          </p>
        </div>
      )}
    </div>
  );
}

export default EventLog;
