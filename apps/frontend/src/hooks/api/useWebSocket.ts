/**
 * useWebSocket Hook
 *
 * React hook for integrating WebSocket client with Zustand store.
 * Manages the WebSocket connection lifecycle, event subscriptions,
 * and keeps the store synchronized with connection state and events.
 *
 * @module hooks.api.useWebSocket
 *
 * @example
 * ```typescript
 * import { useWebSocket } from '@/hooks/api/useWebSocket';
 *
 * function MonitoringComponent() {
 *   const {
 *     connectionStatus,
 *     isConnected,
 *     connect,
 *     disconnect,
 *     subscribe,
 *     unsubscribe
 *   } = useWebSocket();
 *
 *   useEffect(() => {
 *     connect();
 *     return () => disconnect();
 *   }, [connect, disconnect]);
 *
 *   return (
 *     <div>
 *       <p>Status: {connectionStatus}</p>
 *       {isConnected && <p>Connected!</p>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import WebSocketClient from '@/services/websocket/WebSocketClient';
import { useWebSocketStore } from '@/stores/useWebSocketStore';
import type {
  ConnectionStatus,
  AnyEvent,
  WorkflowEvent,
  NodeEvent,
  WorkflowEventType,
  NodeEventType,
  SystemEventType
} from '@/services/websocket/events.types';

/**
 * useWebSocket hook return type
 */
export interface UseWebSocketReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;

  /** Is currently connected */
  isConnected: boolean;

  /** Number of reconnection attempts */
  reconnectAttempts: number;

  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;

  /** Last error message */
  lastError?: string;

  /** Connected timestamp */
  connectedAt?: Date;

  /** Disconnected timestamp */
  disconnectedAt?: Date;

  /** Subscribed channels */
  subscribedChannels: string[];

  /** Active executions count */
  activeExecutionsCount: number;

  /** Event log entries */
  eventLog: AnyEvent[];

  /** Connect to WebSocket server */
  connect: () => Promise<void>;

  /** Disconnect from WebSocket server */
  disconnect: () => void;

  /** Subscribe to a channel */
  subscribe: (channel: string) => void;

  /** Unsubscribe from a channel */
  unsubscribe: (channel: string) => void;

  /** Subscribe to a specific event type */
  on: (
    eventType: string,
    handler: (event: any) => void | Promise<void>
  ) => () => void;

  /** Clear all events from the event log */
  clearEventLog: () => void;
}

/**
 * Hook to manage WebSocket connection and event handling
 *
 * Initializes the WebSocket client on mount, subscribes to store updates,
 * registers event listeners, and maintains the store state. Automatically
 * handles cleanup on unmount.
 *
 * @returns Object containing connection state and control methods
 */
export function useWebSocket(): UseWebSocketReturn {
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const eventHandlersRef = useRef<Map<string, (() => void)[]>>(new Map());
  const isInitializedRef = useRef(false);

  // Subscribe to connection state only (not the entire store)
  const connectionStatus = useWebSocketStore((state) => state.connectionStatus);
  const reconnectAttempts = useWebSocketStore((state) => state.reconnectAttempts);
  const maxReconnectAttempts = useWebSocketStore((state) => state.maxReconnectAttempts);
  const lastError = useWebSocketStore((state) => state.lastError);
  const connectedAt = useWebSocketStore((state) => state.connectedAt);
  const disconnectedAt = useWebSocketStore((state) => state.disconnectedAt);
  const subscribedChannels = useWebSocketStore((state) => state.subscribedChannels);
  const eventLog = useWebSocketStore((state) => state.eventLog);
  const activeExecutionsCount = useWebSocketStore((state) => state.activeExecutions.size);

  // Get actions (these are stable references, won't cause re-renders)
  const setConnectionStatus = useWebSocketStore((state) => state.setConnectionStatus);
  const setError = useWebSocketStore((state) => state.setError);
  const setReconnectAttempts = useWebSocketStore((state) => state.setReconnectAttempts);
  const setConnectedAt = useWebSocketStore((state) => state.setConnectedAt);
  const setDisconnectedAt = useWebSocketStore((state) => state.setDisconnectedAt);
  const setSubscribedChannels = useWebSocketStore((state) => state.setSubscribedChannels);
  const addExecution = useWebSocketStore((state) => state.addExecution);
  const updateExecution = useWebSocketStore((state) => state.updateExecution);
  const removeExecution = useWebSocketStore((state) => state.removeExecution);
  const addEvent = useWebSocketStore((state) => state.addEvent);
  const clearEventLogStore = useWebSocketStore((state) => state.clearEvents);

  /**
   * Initialize WebSocket client and set up event listeners
   *
   * IMPORTANT: Event handlers are registered on the singleton WebSocketClient,
   * so we must check if they're already registered to prevent duplicates
   * when multiple components use this hook.
   */
  const initializeWebSocket = useCallback(() => {
    // Get singleton instance first
    const wsClient = WebSocketClient.getInstance({
      debug: import.meta.env.DEV,
      reconnection: {
        enabled: true,
        maxAttempts: 5
      }
    });

    wsClientRef.current = wsClient;

    // Check if store handlers are already registered on the singleton
    // This prevents duplicate handlers when multiple components use this hook
    if (wsClient.areStoreHandlersRegistered()) {
      isInitializedRef.current = true;
      return;
    }

    // Mark as initialized in both places
    isInitializedRef.current = true;
    wsClient.markStoreHandlersRegistered();

    // Connection status changed
    wsClient.on('connection:status-changed', (event: any) => {
      useWebSocketStore.getState().setConnectionStatus(event.status);

      // Update timestamps
      const state = wsClient.getState();
      if (state.connectedAt) {
        useWebSocketStore.getState().setConnectedAt(state.connectedAt);
      }
      if (state.disconnectedAt) {
        useWebSocketStore.getState().setDisconnectedAt(state.disconnectedAt);
      }
    });

    // Connection failed
    wsClient.on('connection:failed', () => {
      useWebSocketStore.getState().setError('Max reconnection attempts reached');
    });

    // Workflow started
    wsClient.on('workflow:started', (event: WorkflowEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      // Initialize execution tracking
      if (event.executionId && event.workflowId) {
        store.addExecution({
          executionId: event.executionId,
          workflowId: event.workflowId,
          workflowName: event.workflowName || '',
          status: 'running',
          completedNodes: [],
          failedNodes: [],
          progress: {
            completed: 0,
            total: event.data?.totalNodes || 0,
            percentage: 0
          },
          startTime: event.timestamp || new Date(),
          elapsedTime: 0,
          events: [event],
          currentState: event.data?.initialState
        });
      }
    });

    // Workflow progress
    wsClient.on('workflow:progress', (event: WorkflowEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (event.executionId && event.data) {
        store.updateExecution(event.executionId, {
          currentNode: event.data.currentNode,
          progress: {
            completed: event.data.completedNodes || 0,
            total: event.data.totalNodes || 0,
            percentage: event.data.percentage || 0
          },
          elapsedTime: Date.now() - (event.timestamp?.getTime() || 0),
          currentState: event.data.currentState
        });
      }
    });

    // Node started
    wsClient.on('node:started', (event: NodeEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (event.executionId) {
        store.updateExecution(event.executionId, {
          currentNode: event.nodeId
        });
      }
    });

    // Node completed
    wsClient.on('node:completed', (event: NodeEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (event.executionId) {
        const execution = store.getExecution(event.executionId);
        if (execution) {
          const completedNodes = [...execution.completedNodes, event.nodeId];
          store.updateExecution(event.executionId, {
            completedNodes,
            progress: {
              ...execution.progress,
              completed: completedNodes.length,
              percentage:
                execution.progress.total > 0
                  ? Math.round((completedNodes.length / execution.progress.total) * 100)
                  : 0
            }
          });
        }
      }
    });

    // Node failed
    wsClient.on('node:failed', (event: NodeEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (event.executionId) {
        const execution = store.getExecution(event.executionId);
        if (execution) {
          const failedNodes = [...execution.failedNodes, event.nodeId];
          store.updateExecution(event.executionId, {
            failedNodes,
            status: 'failed'
          });
        }
      }
    });

    // Workflow completed
    wsClient.on('workflow:completed', (event: WorkflowEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (event.executionId) {
        store.updateExecution(event.executionId, {
          status: 'completed',
          endTime: event.timestamp || new Date(),
          elapsedTime: event.data?.duration || 0
        });
      }
    });

    // Workflow failed
    wsClient.on('workflow:failed', (event: WorkflowEvent) => {
      const store = useWebSocketStore.getState();
      store.addEvent({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (event.executionId) {
        store.updateExecution(event.executionId, {
          status: 'failed',
          endTime: event.timestamp || new Date(),
          elapsedTime: event.data?.duration || 0
        });
      }
    });

    // System errors
    wsClient.on('system:error', (event: any) => {
      useWebSocketStore.getState().setError(event.error || 'WebSocket error occurred');
    });
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (!wsClientRef.current) {
      initializeWebSocket();
    }

    const wsClient = wsClientRef.current;
    if (!wsClient) {
      return;
    }

    try {
      await wsClient.connect();
      setSubscribedChannels(wsClient.getState().subscribedChannels);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect';
      setError(errorMessage);
    }
  }, [initializeWebSocket, setSubscribedChannels, setError]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      // Clean up event handlers
      eventHandlersRef.current.forEach((handlers) => {
        handlers.forEach((unsubscribe) => unsubscribe());
      });
      eventHandlersRef.current.clear();
    }
  }, []);

  /**
   * Subscribe to a channel
   */
  const subscribe = useCallback((channel: string) => {
    if (wsClientRef.current) {
      wsClientRef.current.subscribe(channel);
      setSubscribedChannels(wsClientRef.current.getState().subscribedChannels);
    }
  }, [setSubscribedChannels]);

  /**
   * Unsubscribe from a channel
   */
  const unsubscribe = useCallback((channel: string) => {
    if (wsClientRef.current) {
      wsClientRef.current.unsubscribe(channel);
      setSubscribedChannels(wsClientRef.current.getState().subscribedChannels);
    }
  }, [setSubscribedChannels]);

  /**
   * Register event handler
   */
  const on = useCallback(
    (eventType: string, handler: (event: any) => void | Promise<void>) => {
      if (!wsClientRef.current) {
        initializeWebSocket();
      }

      const wsClient = wsClientRef.current;
      if (!wsClient) {
        return () => {
          /* noop */
        };
      }

      // Register with WebSocket client
      const unsubscribe = wsClient.on(eventType, handler);

      // Track for cleanup
      if (!eventHandlersRef.current.has(eventType)) {
        eventHandlersRef.current.set(eventType, []);
      }
      eventHandlersRef.current.get(eventType)!.push(unsubscribe);

      // Return cleanup function
      return () => {
        unsubscribe();
        const handlers = eventHandlersRef.current.get(eventType);
        if (handlers) {
          const index = handlers.indexOf(unsubscribe);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      };
    },
    [initializeWebSocket]
  );

  /**
   * Clear event log
   */
  const clearEventLog = useCallback(() => {
    clearEventLogStore();
  }, [clearEventLogStore]);

  /**
   * Set up connection on mount, cleanup on unmount
   */
  useEffect(() => {
    // Initialize and connect when component mounts
    initializeWebSocket();
    connect();

    // Clean up on unmount
    return () => {
      // Don't disconnect on unmount to keep connection alive
      // The connection should persist across component remounts
      // Only clean up event handlers
      eventHandlersRef.current.forEach((handlers) => {
        handlers.forEach((unsubscribe) => unsubscribe());
      });
      eventHandlersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - initializeWebSocket and connect have internal guards

  const isConnected = connectionStatus === 'connected';

  return {
    connectionStatus,
    isConnected,
    reconnectAttempts,
    maxReconnectAttempts,
    lastError,
    connectedAt,
    disconnectedAt,
    subscribedChannels,
    activeExecutionsCount,
    eventLog,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    on,
    clearEventLog
  };
}

export default useWebSocket;
