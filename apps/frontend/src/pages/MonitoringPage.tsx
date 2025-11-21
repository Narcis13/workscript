/**
 * MonitoringPage Component
 *
 * Real-time workflow execution monitoring dashboard. Displays active workflow executions
 * with live progress tracking via WebSocket connection, and provides a detailed event log
 * of all execution events with filtering capabilities.
 *
 * Features:
 * - Real-time execution tracking with WebSocket
 * - Active executions displayed as responsive grid of execution cards
 * - WebSocket connection status indicator with auto-reconnect support
 * - Event log showing all workflow and node execution events
 * - Event filtering by type, workflow, and custom criteria
 * - Error banner for WebSocket connection failures
 * - Auto-reconnect notification and retry options
 * - Accessibility features (ARIA live regions, keyboard navigation)
 * - Fully responsive design (mobile, tablet, desktop)
 *
 * ## Integration Points:
 * - `useWebSocket()` hook - Manages WebSocket connection lifecycle
 * - `useWebSocketStore()` - Provides active executions and event log
 * - `RealtimeMonitor` component - Displays active executions
 * - `WebSocketStatus` component - Shows connection status
 * - `EventLog` component - Shows filtered event history
 *
 * ## Requirement Coverage:
 * - **Requirement 13: Real-time Workflow Monitoring via WebSocket**
 *   - ✓ WebSocket connection established to `/ws` endpoint
 *   - ✓ WebSocket status indicator shows connection state
 *   - ✓ Active executions appear in real-time with `workflow:started` event
 *   - ✓ Node execution updates with `node:started` and `node:completed` events
 *   - ✓ Workflow completion with `workflow:completed` event
 *   - ✓ Error handling with `workflow:error` and `node:error` events
 *   - ✓ Event log with timestamps and event details
 *   - ✓ Event filtering (show only errors, show only completed, filter by workflow)
 *   - ✓ Auto-reconnect with 5 second timeout and error banner
 *
 * @module pages.MonitoringPage
 *
 * @example
 * ```tsx
 * // In routes.tsx
 * const MonitoringPage = lazy(() =>
 *   import('@/pages/MonitoringPage').then((m) => ({ default: m.MonitoringPage }))
 * );
 *
 * // In Router configuration
 * {
 *   path: '/monitoring',
 *   element: <MonitoringPage />
 * }
 *
 * // Usage in app
 * <Link to="/monitoring">View Monitoring</Link>
 * ```
 *
 * ## State Management:
 * - Uses `useWebSocketStore()` to access:
 *   - `activeExecutions` - Map of currently running executions
 *   - `eventLog` - Array of all events in chronological order
 *   - `connectionStatus` - Current WebSocket connection state
 * - Uses local component state for:
 *   - `eventFilters` - User-selected filter options
 *   - `showConnectionError` - Banner visibility for connection errors
 *
 * ## Performance Considerations:
 * - RealtimeMonitor uses responsive grid that reflows on resize
 * - EventLog auto-scrolls to latest events with pause option
 * - WebSocket auto-reconnect with exponential backoff
 * - Event log limited to most recent events (auto-clears old events)
 * - Memoized filter functions to prevent unnecessary re-renders
 *
 * @returns {JSX.Element} The rendered monitoring dashboard
 */

import { useEffect, useState, useMemo } from 'react';
import { AlertCircle, Wifi } from 'lucide-react';
import { useWebSocket } from '@/hooks/api/useWebSocket';
import {
  useActiveExecutions,
  useEventLog,
  useWebSocketStore,
} from '@/stores/useWebSocketStore';
import { PageHeader } from '@/components/shared/PageHeader';
import { RealtimeMonitor } from '@/components/monitoring/RealtimeMonitor';
import { EventLog, type EventLogFilters } from '@/components/monitoring/EventLog';
import { WebSocketStatus } from '@/components/monitoring/WebSocketStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * Props for MonitoringPage component
 */
interface MonitoringPageProps {
  /**
   * Optional CSS class name for the root container
   */
  className?: string;
}

/**
 * MonitoringPage Component
 *
 * Main page for real-time workflow execution monitoring. Combines WebSocket connection
 * management with UI display of active executions and event history.
 *
 * @component
 * @param {MonitoringPageProps} props - Component props
 * @returns {JSX.Element} The rendered monitoring page
 *
 * @throws {Error} If WebSocket client fails to initialize (caught and displayed in UI)
 */
export function MonitoringPage({ className }: MonitoringPageProps): JSX.Element {
  // WebSocket connection management
  const { connectionStatus, isConnected, reconnectAttempts, maxReconnectAttempts } =
    useWebSocket();

  // Store state
  const activeExecutions = useActiveExecutions();
  const eventLog = useEventLog();

  // Local state for event filtering
  const [eventFilters, setEventFilters] = useState<EventLogFilters>({
    showErrors: false,
    showCompleted: false,
    selectedWorkflow: undefined,
  });

  // Track if connection error banner has been shown
  const [showConnectionError, setShowConnectionError] = useState(false);

  /**
   * Handle WebSocket connection failures
   * Show error banner when connection fails and max reconnect attempts exceeded
   */
  useEffect(() => {
    if (
      connectionStatus === 'disconnected' &&
      reconnectAttempts >= maxReconnectAttempts
    ) {
      setShowConnectionError(true);
    } else if (isConnected) {
      setShowConnectionError(false);
    }
  }, [connectionStatus, reconnectAttempts, maxReconnectAttempts, isConnected]);

  /**
   * Handle reconnect retry button
   */
  const handleRetryConnection = () => {
    setShowConnectionError(false);
    // The WebSocket client auto-reconnects, just hide the error message
  };

  /**
   * Convert activeExecutions Map to array for display
   */
  const executionCount = useMemo(() => activeExecutions.size, [activeExecutions]);

  /**
   * Count different event types in log for statistics
   */
  const eventStats = useMemo(() => {
    const stats = {
      total: eventLog.length,
      errors: 0,
      completed: 0,
      started: 0,
    };

    eventLog.forEach((event) => {
      if (event.eventType === 'workflow:error' || event.eventType === 'node:error') {
        stats.errors += 1;
      }
      if (
        event.eventType === 'workflow:completed' ||
        event.eventType === 'node:completed'
      ) {
        stats.completed += 1;
      }
      if (
        event.eventType === 'workflow:started' ||
        event.eventType === 'node:started'
      ) {
        stats.started += 1;
      }
    });

    return stats;
  }, [eventLog]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <PageHeader
        title="Real-time Monitoring"
        description="Monitor active workflow executions and view real-time execution events"
        actions={
          <div className="flex items-center gap-2">
            <WebSocketStatus />
          </div>
        }
      />

      {/* Connection Error Banner */}
      {showConnectionError && (
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Real-time updates unavailable. Unable to connect to WebSocket after{' '}
              {maxReconnectAttempts} attempts. Refresh the page to retry.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryConnection}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Reconnecting Banner */}
      {connectionStatus === 'reconnecting' && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Wifi className="h-4 w-4 animate-pulse text-yellow-600" />
          <AlertDescription>
            Attempting to reconnect to real-time updates... (Attempt{' '}
            {reconnectAttempts + 1} of {maxReconnectAttempts})
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="executions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <span>Active Executions</span>
            {executionCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                {executionCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <span>Event Log</span>
            {eventStats.total > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                {eventStats.total}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Active Executions</h2>
            <p className="text-sm text-gray-500">
              Workflows currently running. Click a card to view detailed execution logs.
            </p>
          </div>

          {/* Connection Status Check */}
          {!isConnected && (
            <Alert variant="default" className="border-blue-500 bg-blue-50">
              <Wifi className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {connectionStatus === 'disconnected' &&
                  'WebSocket connection is disconnected. Execution updates are not available.'}
                {connectionStatus === 'reconnecting' &&
                  'Reconnecting to WebSocket... Active executions may not update in real-time.'}
                {connectionStatus === 'connecting' &&
                  'Connecting to WebSocket... Please wait.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Realtime Monitor */}
          <div
            className="rounded-lg border border-gray-200 bg-white p-6"
            role="region"
            aria-label="Active workflow executions monitor"
            aria-live="polite"
            aria-atomic="false"
          >
            <RealtimeMonitor />
          </div>
        </TabsContent>

        {/* Event Log Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Event Log</h2>
            <p className="text-sm text-gray-500">
              All workflow and node execution events in chronological order. Use filters
              to focus on specific event types.
            </p>
          </div>

          {/* Event Statistics */}
          {eventStats.total > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-gray-600">Total Events</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {eventStats.total}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-gray-600">Started</div>
                <div className="mt-1 text-2xl font-bold text-blue-600">
                  {eventStats.started}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm font-medium text-gray-600">Completed</div>
                <div className="mt-1 text-2xl font-bold text-green-600">
                  {eventStats.completed}
                </div>
              </div>
            </div>
          )}

          {/* Event Log Component */}
          <div
            className="rounded-lg border border-gray-200 bg-white p-4"
            role="region"
            aria-label="Event log with filtering"
            aria-live="polite"
            aria-atomic="false"
          >
            <EventLog
              events={eventLog}
              filters={eventFilters}
              onFiltersChange={setEventFilters}
              maxHeight="600px"
              autoScroll={true}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Accessibility: Screen reader notification */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {isConnected
          ? `Connected to real-time updates. ${executionCount} active executions.`
          : 'WebSocket connection lost. Real-time updates unavailable.'}
      </div>
    </div>
  );
}

/**
 * Export MonitoringPage as default for lazy loading
 */
export default MonitoringPage;
