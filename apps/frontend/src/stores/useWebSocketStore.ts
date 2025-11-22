/**
 * WebSocket State Management Store
 *
 * Zustand-based store for managing WebSocket connection state, active executions,
 * and event logging. This store manages real-time updates from the Workscript
 * workflow engine, including connection status, active executions, and event history.
 *
 * @module stores.useWebSocketStore
 *
 * @example
 * ```typescript
 * import { useWebSocketStore } from '@/stores/useWebSocketStore';
 *
 * function MonitoringComponent() {
 *   const { connectionStatus, activeExecutions, addExecution, updateExecution } =
 *     useWebSocketStore();
 *
 *   return (
 *     <div>
 *       <p>Status: {connectionStatus}</p>
 *       {Array.from(activeExecutions.values()).map((execution) => (
 *         <ExecutionCard key={execution.executionId} execution={execution} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ConnectionStatus,
  ActiveExecutionTracking,
  AnyEvent
} from '@/services/websocket/events.types';

/**
 * WebSocket Store State
 *
 * Represents the current state of the WebSocket connection and related data.
 */
export interface WebSocketStoreState {
  // Connection State
  /** Current connection status */
  connectionStatus: ConnectionStatus;

  /** Timestamp when connection was established */
  connectedAt?: Date;

  /** Timestamp when connection was lost */
  disconnectedAt?: Date;

  /** Number of reconnection attempts */
  reconnectAttempts: number;

  /** Maximum reconnection attempts before giving up */
  maxReconnectAttempts: number;

  /** Last error message */
  lastError?: string;

  /** Subscribed channels */
  subscribedChannels: string[];

  /** Connection latency in milliseconds */
  latency?: number;

  // Active Executions
  /** Map of active executions by execution ID */
  activeExecutions: Map<string, ActiveExecutionTracking>;

  // Event Log
  /** Array of recent events in chronological order */
  eventLog: AnyEvent[];

  /** Maximum number of events to retain in the log */
  maxEventLogSize: number;
}

/**
 * WebSocket Store Actions
 *
 * Methods for updating the store state.
 */
export interface WebSocketStoreActions {
  // Connection Management
  /**
   * Set the connection status
   *
   * @param status - The new connection status
   */
  setConnectionStatus: (status: ConnectionStatus) => void;

  /**
   * Set the connection error
   *
   * @param error - Error message
   */
  setError: (error?: string) => void;

  /**
   * Update reconnection attempts
   *
   * @param attempts - Number of reconnection attempts
   */
  setReconnectAttempts: (attempts: number) => void;

  /**
   * Set the connection timestamp
   *
   * @param timestamp - Timestamp when connection was established
   */
  setConnectedAt: (timestamp: Date) => void;

  /**
   * Set the disconnection timestamp
   *
   * @param timestamp - Timestamp when connection was lost
   */
  setDisconnectedAt: (timestamp: Date) => void;

  /**
   * Update subscribed channels
   *
   * @param channels - Array of channel names
   */
  setSubscribedChannels: (channels: string[]) => void;

  /**
   * Set connection latency
   *
   * @param latency - Latency in milliseconds
   */
  setLatency: (latency: number) => void;

  /**
   * Reset connection state to initial values
   */
  resetConnection: () => void;

  // Active Executions Management
  /**
   * Add a new active execution to track
   *
   * @param execution - The execution to track
   */
  addExecution: (execution: ActiveExecutionTracking) => void;

  /**
   * Update an active execution with new data
   *
   * @param executionId - The execution ID
   * @param updates - Partial updates to apply
   */
  updateExecution: (
    executionId: string,
    updates: Partial<ActiveExecutionTracking>
  ) => void;

  /**
   * Remove an execution from the active executions map
   *
   * @param executionId - The execution ID to remove
   */
  removeExecution: (executionId: string) => void;

  /**
   * Clear all active executions
   */
  clearExecutions: () => void;

  /**
   * Get a specific execution by ID
   *
   * @param executionId - The execution ID
   * @returns The execution or undefined if not found
   */
  getExecution: (executionId: string) => ActiveExecutionTracking | undefined;

  // Event Log Management
  /**
   * Add an event to the event log
   *
   * Automatically maintains the maximum log size by removing oldest events.
   *
   * @param event - The event to log
   */
  addEvent: (event: AnyEvent) => void;

  /**
   * Add multiple events to the event log
   *
   * @param events - Array of events to add
   */
  addEvents: (events: AnyEvent[]) => void;

  /**
   * Clear all events from the event log
   */
  clearEvents: () => void;

  /**
   * Get all events from the log
   *
   * @returns Array of logged events
   */
  getEvents: () => AnyEvent[];

  /**
   * Get events filtered by execution ID
   *
   * @param executionId - The execution ID to filter by
   * @returns Array of matching events
   */
  getExecutionEvents: (executionId: string) => AnyEvent[];

  /**
   * Get events filtered by event type
   *
   * @param eventType - The event type to filter by
   * @returns Array of matching events
   */
  getEventsByType: (eventType: string) => AnyEvent[];

  /**
   * Set the maximum event log size
   *
   * @param size - Maximum number of events to retain
   */
  setMaxEventLogSize: (size: number) => void;
}

/**
 * WebSocket Store Type
 */
export type WebSocketStore = WebSocketStoreState & WebSocketStoreActions;

/**
 * Default state values
 */
const defaultState: WebSocketStoreState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  subscribedChannels: [],
  activeExecutions: new Map(),
  eventLog: [],
  maxEventLogSize: 500
};

/**
 * Create WebSocket Zustand store
 *
 * Manages real-time WebSocket state including connection status, active executions,
 * and event logging for the monitoring dashboard.
 */
export const useWebSocketStore = create<WebSocketStore>()(
  devtools(
    (set, get) => ({
      ...defaultState,

      // Connection Management Actions
      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      setError: (error?: string) => {
        set({ lastError: error });
      },

      setReconnectAttempts: (attempts: number) => {
        set({ reconnectAttempts: attempts });
      },

      setConnectedAt: (timestamp: Date) => {
        set({ connectedAt: timestamp });
      },

      setDisconnectedAt: (timestamp: Date) => {
        set({ disconnectedAt: timestamp });
      },

      setSubscribedChannels: (channels: string[]) => {
        set({ subscribedChannels: channels });
      },

      setLatency: (latency: number) => {
        set({ latency });
      },

      resetConnection: () => {
        set({
          connectionStatus: 'disconnected' as ConnectionStatus,
          reconnectAttempts: 0,
          lastError: undefined,
          connectedAt: undefined,
          disconnectedAt: undefined,
          subscribedChannels: [],
          latency: undefined
        });
      },

      // Active Executions Management Actions
      addExecution: (execution: ActiveExecutionTracking) => {
        set((state) => {
          const newMap = new Map(state.activeExecutions);
          newMap.set(execution.executionId, execution);
          return { activeExecutions: newMap };
        });
      },

      updateExecution: (
        executionId: string,
        updates: Partial<ActiveExecutionTracking>
      ) => {
        set((state) => {
          const execution = state.activeExecutions.get(executionId);
          if (!execution) return state;

          const newMap = new Map(state.activeExecutions);
          newMap.set(executionId, {
            ...execution,
            ...updates,
            executionId: execution.executionId // Ensure ID doesn't change
          });
          return { activeExecutions: newMap };
        });
      },

      removeExecution: (executionId: string) => {
        set((state) => {
          const newMap = new Map(state.activeExecutions);
          newMap.delete(executionId);
          return { activeExecutions: newMap };
        });
      },

      clearExecutions: () => {
        set({ activeExecutions: new Map() });
      },

      getExecution: (executionId: string) => {
        return get().activeExecutions.get(executionId);
      },

      // Event Log Management Actions
      addEvent: (event: AnyEvent) => {
        set((state) => {
          const newLog = [...state.eventLog, event];
          // Maintain max size by removing oldest events
          if (newLog.length > state.maxEventLogSize) {
            newLog.shift();
          }
          return { eventLog: newLog };
        });
      },

      addEvents: (events: AnyEvent[]) => {
        set((state) => {
          let newLog = [...state.eventLog, ...events];
          // Maintain max size by removing oldest events
          if (newLog.length > state.maxEventLogSize) {
            newLog = newLog.slice(newLog.length - state.maxEventLogSize);
          }
          return { eventLog: newLog };
        });
      },

      clearEvents: () => {
        set({ eventLog: [] });
      },

      getEvents: () => {
        return get().eventLog;
      },

      getExecutionEvents: (executionId: string) => {
        return get().eventLog.filter((event) => event.executionId === executionId);
      },

      getEventsByType: (eventType: string) => {
        return get().eventLog.filter((event) => event.type === eventType);
      },

      setMaxEventLogSize: (size: number) => {
        set((state) => {
          const newLog = state.eventLog.slice(
            Math.max(0, state.eventLog.length - size)
          );
          return { maxEventLogSize: size, eventLog: newLog };
        });
      }
    }),
    { name: 'WebSocketStore' }
  )
);

/**
 * Selector hooks for common use cases
 * These prevent unnecessary re-renders by selecting only needed state
 */

/**
 * Hook to get connection status only
 *
 * @returns The current connection status
 */
export const useWebSocketStatus = () =>
  useWebSocketStore((state) => state.connectionStatus);

/**
 * Hook to get active executions only
 *
 * @returns Map of active executions
 */
export const useActiveExecutions = () =>
  useWebSocketStore((state) => state.activeExecutions);

/**
 * Hook to get event log only
 *
 * @returns Array of logged events
 */
export const useEventLog = () => useWebSocketStore((state) => state.eventLog);

/**
 * Hook to get connection metadata
 *
 * @returns Connection state metadata
 */
export const useWebSocketConnection = () => {
  // Use individual selectors instead of creating a new object
  const status = useWebSocketStore((state) => state.connectionStatus);
  const connectedAt = useWebSocketStore((state) => state.connectedAt);
  const disconnectedAt = useWebSocketStore((state) => state.disconnectedAt);
  const reconnectAttempts = useWebSocketStore((state) => state.reconnectAttempts);
  const maxReconnectAttempts = useWebSocketStore((state) => state.maxReconnectAttempts);
  const lastError = useWebSocketStore((state) => state.lastError);
  const latency = useWebSocketStore((state) => state.latency);
  const subscribedChannels = useWebSocketStore((state) => state.subscribedChannels);

  return {
    status,
    connectedAt,
    disconnectedAt,
    reconnectAttempts,
    maxReconnectAttempts,
    lastError,
    latency,
    subscribedChannels
  };
};

/**
 * Hook to get execution count
 *
 * @returns Number of active executions
 */
export const useActiveExecutionCount = () =>
  useWebSocketStore((state) => state.activeExecutions.size);
