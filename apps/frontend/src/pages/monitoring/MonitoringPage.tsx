/**
 * MonitoringPage - Real-time Monitoring Dashboard
 *
 * Displays live workflow execution monitoring with WebSocket updates,
 * active execution tracking, and event log streaming.
 *
 * Features:
 * - WebSocket connection status indicator
 * - Active executions grid with real-time progress
 * - Event log with filtering by type
 * - Connection statistics
 * - Auto-reconnection handling
 * - Clear event log functionality
 *
 * Requirements Coverage:
 * - Requirement 13: Real-time Monitoring & WebSocket
 *
 * @module pages/monitoring/MonitoringPage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Filter,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ExecutionCard } from '@/components/executions/ExecutionCard';
import { useWebSocket } from '@/hooks/api/useWebSocket';
import { useWebSocketStore } from '@/stores/useWebSocketStore';
import { cn } from '@/lib/utils';
import type { AnyEvent, ConnectionStatus } from '@/services/websocket/events.types';

/**
 * Event type filter options
 */
const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Events' },
  { value: 'workflow', label: 'Workflow Events' },
  { value: 'node', label: 'Node Events' },
  { value: 'system', label: 'System Events' },
];

/**
 * Get status badge configuration based on connection status
 */
function getConnectionStatusConfig(status: ConnectionStatus): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  icon: React.ReactNode;
  color: string;
} {
  switch (status) {
    case 'connected':
      return {
        variant: 'default',
        label: 'Connected',
        icon: <Wifi className="h-4 w-4" />,
        color: 'text-green-500',
      };
    case 'connecting':
      return {
        variant: 'secondary',
        label: 'Connecting...',
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        color: 'text-blue-500',
      };
    case 'reconnecting':
      return {
        variant: 'secondary',
        label: 'Reconnecting...',
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        color: 'text-yellow-500',
      };
    case 'disconnected':
      return {
        variant: 'outline',
        label: 'Disconnected',
        icon: <WifiOff className="h-4 w-4" />,
        color: 'text-gray-500',
      };
    case 'failed':
      return {
        variant: 'destructive',
        label: 'Connection Failed',
        icon: <XCircle className="h-4 w-4" />,
        color: 'text-red-500',
      };
    default:
      return {
        variant: 'outline',
        label: status,
        icon: <Circle className="h-4 w-4" />,
        color: 'text-gray-500',
      };
  }
}

/**
 * Get event icon based on event type
 */
function getEventIcon(eventType: string): React.ReactNode {
  if (eventType.includes('started')) {
    return <Zap className="h-4 w-4 text-blue-500" />;
  }
  if (eventType.includes('completed')) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (eventType.includes('failed')) {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  if (eventType.includes('progress')) {
    return <Activity className="h-4 w-4 text-yellow-500" />;
  }
  return <Circle className="h-4 w-4 text-gray-500" />;
}

/**
 * Format event type for display
 */
function formatEventType(eventType: string): string {
  return eventType
    .replace('workflow:', 'Workflow ')
    .replace('node:', 'Node ')
    .replace('system:', 'System ')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * MonitoringPage Component
 *
 * Real-time monitoring dashboard with WebSocket integration.
 */
export default function MonitoringPage() {
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [showEventLog, setShowEventLog] = useState(true);

  // ============================================
  // WEBSOCKET HOOK
  // ============================================

  const {
    connectionStatus,
    isConnected,
    reconnectAttempts,
    maxReconnectAttempts,
    lastError,
    connectedAt,
    subscribedChannels,
    activeExecutionsCount,
    eventLog,
    connect,
    disconnect,
    clearEventLog,
  } = useWebSocket();

  // Get active executions from the store
  const activeExecutions = useWebSocketStore((state) => state.activeExecutions);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Connection status configuration
   */
  const statusConfig = useMemo(
    () => getConnectionStatusConfig(connectionStatus),
    [connectionStatus]
  );

  /**
   * Filter events based on selected type
   */
  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'all') {
      return eventLog;
    }

    return eventLog.filter((event) => {
      const type = event.type || '';
      switch (eventTypeFilter) {
        case 'workflow':
          return type.startsWith('workflow:');
        case 'node':
          return type.startsWith('node:');
        case 'system':
          return type.startsWith('system:');
        default:
          return true;
      }
    });
  }, [eventLog, eventTypeFilter]);

  /**
   * Event statistics
   */
  const eventStats = useMemo(() => {
    const workflowEvents = eventLog.filter((e) => e.type?.startsWith('workflow:')).length;
    const nodeEvents = eventLog.filter((e) => e.type?.startsWith('node:')).length;
    const errorEvents = eventLog.filter((e) => e.type?.includes('failed')).length;

    return {
      total: eventLog.length,
      workflow: workflowEvents,
      node: nodeEvents,
      errors: errorEvents,
    };
  }, [eventLog]);

  /**
   * Convert active executions Map to array for rendering
   */
  const activeExecutionsList = useMemo(
    () => Array.from(activeExecutions.values()),
    [activeExecutions]
  );

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle reconnect button click
   */
  const handleReconnect = useCallback(async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }, [connect]);

  /**
   * Handle clear event log
   */
  const handleClearEvents = useCallback(() => {
    clearEventLog();
  }, [clearEventLog]);

  /**
   * Navigate to execution detail
   */
  const handleExecutionClick = useCallback(
    (executionId: string) => {
      navigate(`/executions/${executionId}`);
    },
    [navigate]
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Real-time Monitoring"
        description="Monitor live workflow executions and system events"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant} className="flex items-center gap-1.5">
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={handleReconnect}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        }
      />

      {/* Connection Error Alert */}
      {lastError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Connection Error</p>
              <p className="text-sm text-muted-foreground">{lastError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReconnect}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Executions
            </CardDescription>
            <CardTitle className="text-2xl">{activeExecutionsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Events Logged
            </CardDescription>
            <CardTitle className="text-2xl">{eventStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Connected Since
            </CardDescription>
            <CardTitle className="text-lg">
              {connectedAt ? format(connectedAt, 'HH:mm:ss') : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Events
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">{eventStats.errors}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Active Executions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Executions</CardTitle>
              <CardDescription>
                Real-time tracking of running workflow executions
              </CardDescription>
            </div>
            {activeExecutionsCount > 0 && (
              <Badge variant="secondary">{activeExecutionsCount} running</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeExecutionsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeExecutionsList.map((execution) => (
                <ExecutionCard
                  key={execution.executionId}
                  execution={execution}
                  onClick={handleExecutionClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Executions</h3>
              <p className="text-muted-foreground max-w-md">
                {isConnected
                  ? 'No workflows are currently running. Start a workflow to see real-time execution progress here.'
                  : 'WebSocket is disconnected. Connect to monitor live executions.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Log Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowEventLog(!showEventLog)}
            >
              <CardTitle className="text-lg">Event Log</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {showEventLog ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {showEventLog && (
                <>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter events" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearEvents}
                    disabled={eventLog.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
          {showEventLog && (
            <CardDescription>
              Showing {filteredEvents.length} of {eventLog.length} events
            </CardDescription>
          )}
        </CardHeader>

        {showEventLog && (
          <CardContent>
            {filteredEvents.length > 0 ? (
              <div className="h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {filteredEvents
                    .slice()
                    .reverse()
                    .map((event, index) => {
                      const timestamp = event.timestamp
                        ? new Date(event.timestamp)
                        : new Date();

                      return (
                        <div
                          key={`${event.executionId}-${event.type}-${index}`}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {formatEventType(event.type)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {event.type}
                              </Badge>
                            </div>
                            {event.executionId && (
                              <p className="text-xs text-muted-foreground">
                                Execution:{' '}
                                <span className="font-mono">
                                  {event.executionId.substring(0, 8)}...
                                </span>
                              </p>
                            )}
                            {'nodeId' in event && event.nodeId && (
                              <p className="text-xs text-muted-foreground">
                                Node: <span className="font-mono">{event.nodeId}</span>
                              </p>
                            )}
                            {event.data && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {'duration' in event.data && (
                                  <span>Duration: {event.data.duration}ms</span>
                                )}
                                {'error' in event.data && (
                                  <span className="text-red-500">
                                    Error: {event.data.error}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-xs text-muted-foreground">
                            {format(timestamp, 'HH:mm:ss.SSS')}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  {isConnected
                    ? 'Events will appear here as workflows execute. Start a workflow to see events.'
                    : 'Connect to the WebSocket server to receive events.'}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Connection Details (Collapsed by default) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={cn('font-medium', statusConfig.color)}>{statusConfig.label}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reconnect Attempts</p>
              <p className="font-medium">
                {reconnectAttempts} / {maxReconnectAttempts}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Subscribed Channels</p>
              <p className="font-medium">{subscribedChannels.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Connected At</p>
              <p className="font-medium">
                {connectedAt ? format(connectedAt, 'HH:mm:ss') : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
