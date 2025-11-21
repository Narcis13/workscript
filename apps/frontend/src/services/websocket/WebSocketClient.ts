/**
 * WebSocket Client Service
 *
 * Singleton WebSocket client for real-time workflow execution monitoring.
 * Implements auto-reconnect with exponential backoff, message queuing,
 * event subscription system, and heartbeat monitoring.
 *
 * @module websocket.WebSocketClient
 */

import type {
  WebSocketConnectionState,
  WebSocketOptions,
  WebSocketReconnectionConfig,
  WebSocketHeartbeatConfig,
  WebSocketEventHandler,
  WebSocketEventLogEntry,
  WebSocketStatistics
} from './events.types';

import {
  ConnectionStatus,
  SystemEventType
} from './events.types';

/**
 * WebSocket Client
 *
 * Manages WebSocket connection to the backend with:
 * - Automatic reconnection with exponential backoff
 * - Event subscription system with typed handlers
 * - Message queuing during disconnection
 * - Heartbeat/ping-pong monitoring
 * - Event logging for debugging
 * - Connection statistics
 *
 * Singleton pattern ensures only one connection per application instance.
 *
 * @example
 * ```typescript
 * // Initialize client
 * const ws = WebSocketClient.getInstance();
 *
 * // Subscribe to events
 * ws.on('workflow:started', (event) => {
 *   console.log('Workflow started:', event.workflowId);
 * });
 *
 * // Connect to server
 * await ws.connect();
 *
 * // Send message
 * ws.send({ type: 'subscribe', channel: 'workflow-events' });
 *
 * // Clean up
 * ws.disconnect();
 * ```
 */
export class WebSocketClient {
  /** Singleton instance */
  private static instance: WebSocketClient | null = null;

  /** Underlying WebSocket connection */
  private ws: WebSocket | null = null;

  /** Connection state */
  private state: WebSocketConnectionState;

  /** Configuration options */
  private options: WebSocketOptions;

  /** Default reconnection configuration */
  private static readonly DEFAULT_RECONNECTION_CONFIG: WebSocketReconnectionConfig = {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 16000, // 16 seconds
    exponentialBackoff: true,
    backoffMultiplier: 2,
    jitter: 0.1
  };

  /** Default heartbeat configuration */
  private static readonly DEFAULT_HEARTBEAT_CONFIG: WebSocketHeartbeatConfig = {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    missedPongThreshold: 3
  };

  /** Event handlers registry */
  private handlers: Map<string, WebSocketEventHandler[]> = new Map();

  /** Message queue for when disconnected */
  private messageQueue: any[] = [];

  /** Heartbeat interval ID */
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /** Heartbeat timeout ID */
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Reconnect timeout ID */
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Missed pong count */
  private missedPongs = 0;

  /** Event log for debugging */
  private eventLog: WebSocketEventLogEntry[] = [];

  /** Statistics */
  private stats: WebSocketStatistics = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    reconnections: 0,
    averageLatency: 0,
    uptime: 0,
    lastReset: new Date(),
    messagesByType: {},
    errors: 0
  };

  /** Connection start time for uptime calculation */
  private connectionStartTime: number | null = null;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor(options: Partial<WebSocketOptions> = {}) {
    const wsUrl = options.url || this.getWebSocketUrl();

    this.options = {
      url: wsUrl,
      reconnection: {
        ...WebSocketClient.DEFAULT_RECONNECTION_CONFIG,
        ...options.reconnection
      },
      heartbeat: {
        ...WebSocketClient.DEFAULT_HEARTBEAT_CONFIG,
        ...options.heartbeat
      },
      connectionTimeout: options.connectionTimeout || 5000,
      messageQueue: {
        enabled: true,
        maxSize: 100,
        flushOnReconnect: true,
        ...options.messageQueue
      },
      debug: options.debug || false,
      eventLogRetention: {
        enabled: true,
        maxEvents: 1000,
        ttl: 3600000, // 1 hour
        ...options.eventLogRetention
      }
    };

    this.state = {
      status: ConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.options.reconnection!.maxAttempts,
      url: this.options.url!,
      subscribedChannels: []
    };

    this.debug('WebSocketClient initialized', this.options);
  }

  /**
   * Get singleton instance
   *
   * @param options Configuration options (only used on first instantiation)
   * @returns WebSocket client instance
   */
  public static getInstance(options?: Partial<WebSocketOptions>): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient(options);
    }
    return WebSocketClient.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (WebSocketClient.instance) {
      WebSocketClient.instance.disconnect();
      WebSocketClient.instance = null;
    }
  }

  /**
   * Get WebSocket URL from environment or construct from current location
   */
  private getWebSocketUrl(): string {
    // Check environment variable first
    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl) {
      return envUrl;
    }

    // Construct from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  /**
   * Connect to WebSocket server
   *
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<void> {
    if (this.state.status === ConnectionStatus.CONNECTED) {
      this.debug('Already connected');
      return;
    }

    if (this.state.status === ConnectionStatus.CONNECTING) {
      this.debug('Connection already in progress');
      return;
    }

    this.setStatus(ConnectionStatus.CONNECTING);

    return new Promise((resolve, reject) => {
      // Connection timeout
      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

      try {
        this.ws = new WebSocket(this.options.url!, this.options.protocols);

        // Start timeout
        connectionTimeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('WebSocket connection timeout'));
        }, this.options.connectionTimeout);

        this.ws.onopen = () => {
          if (connectionTimeout) clearTimeout(connectionTimeout);
          this.connectionStartTime = Date.now();
          this.missedPongs = 0;
          this.state.connectedAt = new Date();
          this.setStatus(ConnectionStatus.CONNECTED);
          this.debug('WebSocket connected');

          // Reset reconnect attempts on successful connection
          this.state.reconnectAttempts = 0;

          // Start heartbeat
          if (this.options.heartbeat?.enabled) {
            this.startHeartbeat();
          }

          // Subscribe to default channel
          this.subscribe('workflow-events');

          // Flush message queue
          if (this.options.messageQueue?.flushOnReconnect && this.messageQueue.length > 0) {
            this.debug(`Flushing ${this.messageQueue.length} queued messages`);
            const queue = [...this.messageQueue];
            this.messageQueue = [];
            queue.forEach(msg => this.send(msg));
          }

          resolve();
        };

        this.ws.onerror = (event) => {
          if (connectionTimeout) clearTimeout(connectionTimeout);
          const error = 'WebSocket error occurred';
          this.state.lastError = error;
          this.logEvent('system:error', event, 'incoming', 'error');
          this.stats.errors++;
          this.debug(error, event);
          reject(new Error(error));
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = () => {
          this.state.disconnectedAt = new Date();
          if (this.state.status !== ConnectionStatus.CLOSED) {
            this.setStatus(ConnectionStatus.DISCONNECTED);
            this.debug('WebSocket disconnected, reconnecting...');
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.debug('Disconnecting from WebSocket');

    // Clear timers
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    // Close connection
    if (this.ws) {
      this.setStatus(ConnectionStatus.CLOSED);
      this.ws.close();
      this.ws = null;
    }

    this.connectionStartTime = null;
  }

  /**
   * Subscribe to a WebSocket channel
   *
   * @param channel Channel name (e.g., "workflow-events")
   */
  public subscribe(channel: string): void {
    if (!this.state.subscribedChannels.includes(channel)) {
      this.state.subscribedChannels.push(channel);
      this.debug(`Subscribed to channel: ${channel}`);
    }

    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        channel
      });
    }
  }

  /**
   * Unsubscribe from a WebSocket channel
   *
   * @param channel Channel name
   */
  public unsubscribe(channel: string): void {
    this.state.subscribedChannels = this.state.subscribedChannels.filter(c => c !== channel);
    this.debug(`Unsubscribed from channel: ${channel}`);

    if (this.isConnected()) {
      this.send({
        type: 'unsubscribe',
        channel
      });
    }
  }

  /**
   * Send message through WebSocket
   *
   * Queues message if not connected (if message queueing enabled).
   *
   * @param message Message object to send
   */
  public send(message: any): void {
    if (!this.ws || this.state.status !== ConnectionStatus.CONNECTED) {
      if (this.options.messageQueue?.enabled && this.messageQueue.length < this.options.messageQueue.maxSize) {
        this.debug('Queueing message (not connected)', message);
        this.messageQueue.push(message);
        this.stats.messagesSent++;
        this.logEvent(message.type || 'unknown', message, 'outgoing', 'info');
      } else {
        this.debug('Message dropped (not connected, queue full)', message);
      }
      return;
    }

    try {
      const payload = JSON.stringify(message);
      this.ws.send(payload);
      this.stats.messagesSent++;
      this.stats.bytesSent += payload.length;
      this.logEvent(message.type || 'unknown', message, 'outgoing', 'debug');
      this.debug('Message sent', message);
    } catch (error) {
      this.debug('Error sending message', error);
      this.stats.errors++;
    }
  }

  /**
   * Register event handler
   *
   * Multiple handlers can be registered for the same event type.
   *
   * @param eventType Event type (e.g., "workflow:started", "node:completed")
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  public on(eventType: string, handler: WebSocketEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
    this.debug(`Registered handler for: ${eventType}`);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unregister event handler
   *
   * @param eventType Event type
   * @param handler Event handler function
   */
  public off(eventType: string, handler: WebSocketEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.debug(`Unregistered handler for: ${eventType}`);
      }
    }
  }

  /**
   * Emit event to all registered handlers
   *
   * @param eventType Event type
   * @param event Event data
   */
  public emit(eventType: string, event: any): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      this.debug(`Emitting event: ${eventType}`, event);
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          this.debug(`Error in event handler for ${eventType}`, error);
          this.stats.errors++;
        }
      });
    }
  }

  /**
   * Get current connection state
   *
   * @returns Connection state
   */
  public getState(): Readonly<WebSocketConnectionState> {
    return { ...this.state };
  }

  /**
   * Check if connected
   *
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this.state.status === ConnectionStatus.CONNECTED && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   *
   * @returns Connection status
   */
  public getStatus(): ConnectionStatus {
    return this.state.status;
  }

  /**
   * Get statistics
   *
   * @returns Statistics object
   */
  public getStatistics(): Readonly<WebSocketStatistics> {
    return {
      ...this.stats,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
    };
  }

  /**
   * Get event log
   *
   * @returns Array of logged events
   */
  public getEventLog(): ReadonlyArray<WebSocketEventLogEntry> {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  public clearEventLog(): void {
    this.eventLog = [];
    this.debug('Event log cleared');
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      reconnections: 0,
      averageLatency: 0,
      uptime: 0,
      lastReset: new Date(),
      messagesByType: {},
      errors: 0
    };
    this.debug('Statistics reset');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Set connection status and update state
   *
   * @param status New status
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.state.status !== status) {
      this.debug(`Status changed: ${this.state.status} -> ${status}`);
      this.state.status = status;

      // Emit status change event
      this.emit('connection:status-changed', { status });
    }
  }

  /**
   * Handle incoming WebSocket message
   *
   * @param event MessageEvent from WebSocket
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this.stats.messagesReceived++;
      this.stats.bytesReceived += event.data.length;

      const eventType = message.type || 'unknown';
      this.stats.messagesByType[eventType] = (this.stats.messagesByType[eventType] || 0) + 1;

      this.debug('Message received', message);
      this.logEvent(eventType, message, 'incoming', 'debug');

      // Handle pong for heartbeat
      if (message.type === SystemEventType.PONG) {
        this.handlePong();
        return;
      }

      // Emit event to handlers
      if (message.type) {
        this.emit(message.type, message);
      }

      // Also emit generic 'message' event
      this.emit('message', message);
    } catch (error) {
      this.debug('Error parsing message', error);
      this.stats.errors++;
      this.logEvent('error', event.data, 'incoming', 'error');
    }
  }

  /**
   * Start heartbeat/ping mechanism
   */
  private startHeartbeat(): void {
    const config = this.options.heartbeat!;

    // Send ping periodically
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.missedPongs++;

        // Check if too many pongs missed
        if (this.missedPongs > config.missedPongThreshold) {
          this.debug('Too many missed pongs, reconnecting...');
          this.ws?.close();
          return;
        }

        // Send ping
        this.send({ type: SystemEventType.PING });

        // Set timeout waiting for pong
        this.heartbeatTimeout = setTimeout(() => {
          // Pong not received in time, will be handled by missedPongs check
        }, config.timeout);
      }
    }, config.interval);
  }

  /**
   * Handle pong response
   */
  private handlePong(): void {
    this.missedPongs = 0;
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    this.debug('Pong received');
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    const config = this.options.reconnection!;

    if (!config.enabled) {
      this.debug('Reconnection disabled');
      return;
    }

    if (this.state.reconnectAttempts >= config.maxAttempts) {
      this.debug('Max reconnection attempts reached');
      this.setStatus(ConnectionStatus.FAILED);
      this.emit('connection:failed', { attempts: this.state.reconnectAttempts });
      return;
    }

    this.setStatus(ConnectionStatus.RECONNECTING);
    this.state.reconnectAttempts++;

    // Calculate delay with exponential backoff
    let delay = config.initialDelay;

    if (config.exponentialBackoff) {
      delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, this.state.reconnectAttempts - 1),
        config.maxDelay
      );
    }

    // Add jitter
    if (config.jitter > 0) {
      const jitterAmount = delay * config.jitter;
      delay += Math.random() * jitterAmount - jitterAmount / 2;
    }

    this.debug(`Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.state.reconnectAttempts}/${config.maxAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.stats.reconnections++;
      this.connect().catch(error => {
        this.debug('Reconnect failed', error);
        this.scheduleReconnect();
      });
    }, Math.round(delay));
  }

  /**
   * Log event for debugging
   *
   * @param type Event type
   * @param payload Event payload
   * @param direction Message direction
   * @param severity Log severity
   */
  private logEvent(
    type: string,
    payload: any,
    direction: 'incoming' | 'outgoing',
    severity: 'debug' | 'info' | 'warning' | 'error'
  ): void {
    if (!this.options.eventLogRetention?.enabled) {
      return;
    }

    const entry: WebSocketEventLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      payload,
      direction,
      timestamp: new Date(),
      severity
    };

    // Extract execution/workflow IDs if present
    if (payload.executionId) entry.executionId = payload.executionId;
    if (payload.workflowId) entry.workflowId = payload.workflowId;

    this.eventLog.push(entry);

    // Trim log to max size
    const maxEvents = this.options.eventLogRetention.maxEvents;
    if (this.eventLog.length > maxEvents) {
      this.eventLog = this.eventLog.slice(-maxEvents);
    }
  }

  /**
   * Debug logging
   *
   * @param message Debug message
   * @param data Optional data to log
   */
  private debug(message: string, data?: any): void {
    if (this.options.debug) {
      const prefix = '[WebSocketClient]';
      if (data !== undefined) {
        console.debug(prefix, message, data);
      } else {
        console.debug(prefix, message);
      }
    }
  }
}

export default WebSocketClient;
