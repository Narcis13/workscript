/**
 * WebSocket Event Type Definitions
 *
 * Type definitions for WebSocket communication in the Workscript Main UI.
 * These types extend the core WebSocket types from @workscript/engine with
 * frontend-specific event handling and state management.
 *
 * @module websocket.events.types
 */

import type {
  WebSocketMessage,
  WorkflowProgressMessage,
  WorkflowResultMessage,
  WorkflowErrorMessage,
  WorkflowStatusMessage
} from '@workscript/engine';

/**
 * WebSocket connection status
 */
export enum ConnectionStatus {
  /** Not connected */
  DISCONNECTED = 'disconnected',

  /** Connection in progress */
  CONNECTING = 'connecting',

  /** Successfully connected */
  CONNECTED = 'connected',

  /** Reconnection in progress */
  RECONNECTING = 'reconnecting',

  /** Connection failed */
  FAILED = 'failed',

  /** Connection closed */
  CLOSED = 'closed'
}

/**
 * WebSocket connection state
 *
 * Represents the current state of the WebSocket connection.
 */
export interface WebSocketConnectionState {
  /** Current connection status */
  status: ConnectionStatus;

  /** Connection timestamp */
  connectedAt?: Date;

  /** Disconnection timestamp */
  disconnectedAt?: Date;

  /** Number of reconnection attempts */
  reconnectAttempts: number;

  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;

  /** Last error message */
  lastError?: string;

  /** WebSocket URL */
  url: string;

  /** Subscribed channels */
  subscribedChannels: string[];

  /** Ping latency in milliseconds */
  latency?: number;
}

/**
 * Workflow event types
 *
 * Types of workflow-related events that can be received via WebSocket.
 */
export enum WorkflowEventType {
  /** Workflow execution started */
  STARTED = 'workflow:started',

  /** Workflow execution completed successfully */
  COMPLETED = 'workflow:completed',

  /** Workflow execution failed */
  FAILED = 'workflow:failed',

  /** Workflow execution progress update */
  PROGRESS = 'workflow:progress',

  /** Workflow execution status change */
  STATUS = 'workflow:status'
}

/**
 * Node event types
 *
 * Types of node-related events that can be received via WebSocket.
 */
export enum NodeEventType {
  /** Node execution started */
  STARTED = 'node:started',

  /** Node execution completed successfully */
  COMPLETED = 'node:completed',

  /** Node execution failed */
  FAILED = 'node:failed',

  /** Node execution skipped */
  SKIPPED = 'node:skipped'
}

/**
 * System event types
 *
 * Types of system-related events.
 */
export enum SystemEventType {
  /** System ping */
  PING = 'system:ping',

  /** System pong (response to ping) */
  PONG = 'system:pong',

  /** System notification */
  NOTIFICATION = 'system:notification',

  /** System error */
  ERROR = 'system:error'
}

/**
 * Workflow event payload
 *
 * Common structure for workflow-related events.
 */
export interface WorkflowEvent {
  /** Event type */
  type: WorkflowEventType;

  /** Execution ID */
  executionId: string;

  /** Workflow ID */
  workflowId: string;

  /** Workflow name */
  workflowName?: string;

  /** Event timestamp */
  timestamp: Date;

  /** Event-specific data */
  data?: Record<string, any>;
}

/**
 * Workflow started event
 */
export interface WorkflowStartedEvent extends WorkflowEvent {
  type: WorkflowEventType.STARTED;
  data: {
    /** Initial state */
    initialState?: Record<string, any>;

    /** Trigger source */
    triggeredBy?: 'manual' | 'automation' | 'webhook' | 'api';

    /** Total number of nodes in the workflow */
    totalNodes?: number;
  };
}

/**
 * Workflow completed event
 */
export interface WorkflowCompletedEvent extends WorkflowEvent {
  type: WorkflowEventType.COMPLETED;
  data: {
    /** Final state */
    finalState?: Record<string, any>;

    /** Execution result */
    result?: any;

    /** Execution duration in milliseconds */
    duration?: number;

    /** Number of nodes executed */
    nodesExecuted?: number;
  };
}

/**
 * Workflow failed event
 */
export interface WorkflowFailedEvent extends WorkflowEvent {
  type: WorkflowEventType.FAILED;
  data: {
    /** Error message */
    error: string;

    /** Failed node ID */
    failedNodeId?: string;

    /** State at failure */
    stateAtFailure?: Record<string, any>;

    /** Error stack trace */
    stackTrace?: string;

    /** Execution duration before failure */
    duration?: number;
  };
}

/**
 * Workflow progress event
 */
export interface WorkflowProgressEvent extends WorkflowEvent {
  type: WorkflowEventType.PROGRESS;
  data: {
    /** Current node being executed */
    currentNode: string;

    /** Number of completed nodes */
    completedNodes: number;

    /** Total number of nodes */
    totalNodes: number;

    /** Progress percentage (0-100) */
    percentage: number;

    /** Current state snapshot */
    currentState?: Record<string, any>;
  };
}

/**
 * Node event payload
 *
 * Common structure for node-related events.
 */
export interface NodeEvent {
  /** Event type */
  type: NodeEventType;

  /** Execution ID */
  executionId: string;

  /** Node ID */
  nodeId: string;

  /** Node type */
  nodeType?: string;

  /** Event timestamp */
  timestamp: Date;

  /** Event-specific data */
  data?: Record<string, any>;
}

/**
 * Node started event
 */
export interface NodeStartedEvent extends NodeEvent {
  type: NodeEventType.STARTED;
  data: {
    /** Node configuration */
    config?: Record<string, any>;

    /** Node index in execution order */
    index?: number;
  };
}

/**
 * Node completed event
 */
export interface NodeCompletedEvent extends NodeEvent {
  type: NodeEventType.COMPLETED;
  data: {
    /** Execution duration in milliseconds */
    duration: number;

    /** Output edges */
    edges?: Record<string, any>;

    /** State modifications */
    stateModifications?: Record<string, any>;
  };
}

/**
 * Node failed event
 */
export interface NodeFailedEvent extends NodeEvent {
  type: NodeEventType.FAILED;
  data: {
    /** Error message */
    error: string;

    /** Error stack trace */
    stackTrace?: string;

    /** Execution duration before failure */
    duration?: number;
  };
}

/**
 * Union type for all workflow events
 */
export type AnyWorkflowEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | WorkflowProgressEvent;

/**
 * Union type for all node events
 */
export type AnyNodeEvent =
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent;

/**
 * Union type for all events
 */
export type AnyEvent = AnyWorkflowEvent | AnyNodeEvent;

/**
 * WebSocket event handler
 *
 * Function signature for event handlers.
 */
export type WebSocketEventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * WebSocket event subscription
 *
 * Represents an active event subscription.
 */
export interface WebSocketEventSubscription {
  /** Subscription ID */
  id: string;

  /** Event type */
  eventType: string;

  /** Event handler function */
  handler: WebSocketEventHandler;

  /** Whether the subscription is active */
  active: boolean;

  /** Subscription timestamp */
  subscribedAt: Date;

  /** Filter function (optional) */
  filter?: (event: any) => boolean;
}

/**
 * WebSocket channel subscription
 *
 * Represents a subscription to a WebSocket channel.
 */
export interface WebSocketChannelSubscription {
  /** Channel name */
  channel: string;

  /** Subscription ID */
  subscriptionId: string;

  /** Subscription timestamp */
  subscribedAt: Date;

  /** Event handlers for this channel */
  handlers: Map<string, WebSocketEventHandler[]>;
}

/**
 * Active execution tracking (for real-time monitoring)
 *
 * Tracks an active workflow execution in real-time.
 */
export interface ActiveExecutionTracking {
  /** Execution ID */
  executionId: string;

  /** Workflow ID */
  workflowId: string;

  /** Workflow name */
  workflowName: string;

  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /** Currently executing node */
  currentNode?: string;

  /** Completed nodes */
  completedNodes: string[];

  /** Failed nodes */
  failedNodes: string[];

  /** Execution progress */
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };

  /** Start time */
  startTime: Date;

  /** End time */
  endTime?: Date;

  /** Elapsed time in milliseconds */
  elapsedTime: number;

  /** Recent events */
  events: AnyEvent[];

  /** Current state snapshot */
  currentState?: Record<string, any>;
}

/**
 * WebSocket event log entry
 *
 * Represents a logged event for debugging and monitoring.
 */
export interface WebSocketEventLogEntry {
  /** Event ID */
  id: string;

  /** Event type */
  type: string;

  /** Event payload */
  payload: any;

  /** Event direction */
  direction: 'incoming' | 'outgoing';

  /** Timestamp */
  timestamp: Date;

  /** Related execution ID */
  executionId?: string;

  /** Related workflow ID */
  workflowId?: string;

  /** Event severity */
  severity: 'debug' | 'info' | 'warning' | 'error';
}

/**
 * WebSocket reconnection config
 *
 * Configuration for automatic reconnection.
 */
export interface WebSocketReconnectionConfig {
  /** Enable automatic reconnection */
  enabled: boolean;

  /** Maximum number of reconnection attempts */
  maxAttempts: number;

  /** Initial delay in milliseconds */
  initialDelay: number;

  /** Maximum delay in milliseconds */
  maxDelay: number;

  /** Use exponential backoff */
  exponentialBackoff: boolean;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Jitter (randomness) factor (0-1) */
  jitter: number;
}

/**
 * WebSocket heartbeat config
 *
 * Configuration for connection heartbeat/ping.
 */
export interface WebSocketHeartbeatConfig {
  /** Enable heartbeat */
  enabled: boolean;

  /** Ping interval in milliseconds */
  interval: number;

  /** Timeout for pong response in milliseconds */
  timeout: number;

  /** Number of missed pongs before reconnecting */
  missedPongThreshold: number;
}

/**
 * WebSocket options
 *
 * Configuration options for the WebSocket client.
 */
export interface WebSocketOptions {
  /** WebSocket URL */
  url: string;

  /** Protocols */
  protocols?: string | string[];

  /** Reconnection configuration */
  reconnection?: WebSocketReconnectionConfig;

  /** Heartbeat configuration */
  heartbeat?: WebSocketHeartbeatConfig;

  /** Connection timeout in milliseconds */
  connectionTimeout?: number;

  /** Message queue configuration */
  messageQueue?: {
    /** Enable message queueing when disconnected */
    enabled: boolean;

    /** Maximum queue size */
    maxSize: number;

    /** Flush queue on reconnect */
    flushOnReconnect: boolean;
  };

  /** Enable debug logging */
  debug?: boolean;

  /** Event log retention */
  eventLogRetention?: {
    /** Enable event logging */
    enabled: boolean;

    /** Maximum number of events to retain */
    maxEvents: number;

    /** Log time-to-live in milliseconds */
    ttl: number;
  };
}

/**
 * WebSocket event filter
 *
 * Configuration for filtering events.
 */
export interface WebSocketEventFilter {
  /** Event types to include */
  eventTypes?: string[];

  /** Event types to exclude */
  excludeEventTypes?: string[];

  /** Execution IDs to include */
  executionIds?: string[];

  /** Workflow IDs to include */
  workflowIds?: string[];

  /** Severity levels to include */
  severityLevels?: Array<'debug' | 'info' | 'warning' | 'error'>;

  /** Custom filter function */
  custom?: (event: WebSocketEventLogEntry) => boolean;
}

/**
 * WebSocket statistics
 *
 * Statistics about WebSocket communication.
 */
export interface WebSocketStatistics {
  /** Total messages sent */
  messagesSent: number;

  /** Total messages received */
  messagesReceived: number;

  /** Total bytes sent */
  bytesSent: number;

  /** Total bytes received */
  bytesReceived: number;

  /** Number of reconnections */
  reconnections: number;

  /** Average latency in milliseconds */
  averageLatency: number;

  /** Total connection uptime in milliseconds */
  uptime: number;

  /** Last reset timestamp */
  lastReset: Date;

  /** Messages by type */
  messagesByType: Record<string, number>;

  /** Errors encountered */
  errors: number;
}

/**
 * Type guards for event types
 */

export function isWorkflowEvent(event: any): event is AnyWorkflowEvent {
  return event && typeof event.type === 'string' && event.type.startsWith('workflow:');
}

export function isNodeEvent(event: any): event is AnyNodeEvent {
  return event && typeof event.type === 'string' && event.type.startsWith('node:');
}

export function isWorkflowStartedEvent(event: any): event is WorkflowStartedEvent {
  return event && event.type === WorkflowEventType.STARTED;
}

export function isWorkflowCompletedEvent(event: any): event is WorkflowCompletedEvent {
  return event && event.type === WorkflowEventType.COMPLETED;
}

export function isWorkflowFailedEvent(event: any): event is WorkflowFailedEvent {
  return event && event.type === WorkflowEventType.FAILED;
}

export function isWorkflowProgressEvent(event: any): event is WorkflowProgressEvent {
  return event && event.type === WorkflowEventType.PROGRESS;
}

export function isNodeStartedEvent(event: any): event is NodeStartedEvent {
  return event && event.type === NodeEventType.STARTED;
}

export function isNodeCompletedEvent(event: any): event is NodeCompletedEvent {
  return event && event.type === NodeEventType.COMPLETED;
}

export function isNodeFailedEvent(event: any): event is NodeFailedEvent {
  return event && event.type === NodeEventType.FAILED;
}
