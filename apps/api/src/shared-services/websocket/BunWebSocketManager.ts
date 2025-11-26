import type { ServerWebSocket } from 'bun';
import type { WebSocketMessage } from '@workscript/engine';

/**
 * WebSocket Client representation for Bun
 */
export interface BunWebSocketClient {
  id: string;
  ws: ServerWebSocket<WebSocketData>;
  subscriptions: Set<string>;
  metadata: Record<string, any>;
}

/**
 * WebSocket data attached to each connection
 */
export interface WebSocketData {
  clientId: string;
  connectedAt: number;
}

/**
 * Bun-native WebSocket Manager
 *
 * This service provides WebSocket communication using Bun's native WebSocket support.
 * Much more performant than using the 'ws' package.
 *
 * Features:
 * - Client connection management
 * - Channel-based subscriptions
 * - Broadcasting to channels or specific clients
 * - Custom message handler registration
 */
export class BunWebSocketManager {
  private static instance: BunWebSocketManager | null = null;
  private clients: Map<string, BunWebSocketClient> = new Map();
  private messageHandlers: Map<
    string,
    (client: BunWebSocketClient, message: WebSocketMessage) => void
  > = new Map();

  private constructor() {
    this.setupDefaultHandlers();
  }

  static getInstance(): BunWebSocketManager {
    if (!BunWebSocketManager.instance) {
      BunWebSocketManager.instance = new BunWebSocketManager();
    }
    return BunWebSocketManager.instance;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup default message handlers (ping/pong, subscribe/unsubscribe)
   */
  private setupDefaultHandlers(): void {
    // Ping/Pong handler
    this.registerHandler('ping', (client) => {
      this.sendMessage(client, {
        type: 'pong',
        timestamp: Date.now(),
      });
    });

    // Subscription handler - supports both { channel } and { payload: { channel } } formats
    this.registerHandler('subscribe', (client, message) => {
      // Support both formats: channel at root level or in payload
      const channel = (message as any).channel || message.payload?.channel;
      if (typeof channel === 'string') {
        client.subscriptions.add(channel);
        console.log(`[WebSocket] Client ${client.id} subscribed to channel: ${channel}`);
        this.sendMessage(client, {
          type: 'subscribed',
          payload: { channel },
          timestamp: Date.now(),
        });
      }
    });

    // Unsubscription handler - supports both { channel } and { payload: { channel } } formats
    this.registerHandler('unsubscribe', (client, message) => {
      // Support both formats: channel at root level or in payload
      const channel = (message as any).channel || message.payload?.channel;
      if (typeof channel === 'string') {
        client.subscriptions.delete(channel);
        console.log(`[WebSocket] Client ${client.id} unsubscribed from channel: ${channel}`);
        this.sendMessage(client, {
          type: 'unsubscribed',
          payload: { channel },
          timestamp: Date.now(),
        });
      }
    });

    // System ping handler
    this.registerHandler('system:ping', (client) => {
      this.sendMessage(client, {
        type: 'system:pong',
        payload: {
          timestamp: Date.now(),
          serverId: process.env.SERVER_ID || 'workscript-api',
        },
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Handle new WebSocket connection (called by Bun.serve websocket.open)
   */
  handleOpen(ws: ServerWebSocket<WebSocketData>): void {
    const clientId = this.generateClientId();
    ws.data = {
      clientId,
      connectedAt: Date.now(),
    };

    const client: BunWebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      metadata: {
        connectedAt: Date.now(),
      },
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] Client connected: ${clientId} (total: ${this.clients.size})`);

    // Send welcome message
    this.sendMessage(client, {
      type: 'connection.welcome',
      payload: { clientId },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle incoming WebSocket message (called by Bun.serve websocket.message)
   */
  handleMessage(ws: ServerWebSocket<WebSocketData>, data: string | Buffer): void {
    const clientId = ws.data?.clientId;
    if (!clientId) return;

    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const handler = this.messageHandlers.get(message.type);

      if (handler) {
        handler(client, message);
      } else {
        console.warn(`[WebSocket] No handler for message type: ${message.type}`);
        this.sendError(client, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Error parsing message from ${clientId}:`, error);
      this.sendError(client, 'Invalid message format');
    }
  }

  /**
   * Handle WebSocket close (called by Bun.serve websocket.close)
   */
  handleClose(ws: ServerWebSocket<WebSocketData>): void {
    const clientId = ws.data?.clientId;
    if (clientId) {
      this.clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId} (remaining: ${this.clients.size})`);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleError(ws: ServerWebSocket<WebSocketData>, error: Error): void {
    const clientId = ws.data?.clientId;
    console.error(`[WebSocket] Error for client ${clientId}:`, error);
    if (clientId) {
      this.clients.delete(clientId);
    }
  }

  /**
   * Register a custom message handler
   */
  registerHandler(
    messageType: string,
    handler: (client: BunWebSocketClient, message: WebSocketMessage) => void
  ): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Send a message to a specific client
   */
  sendMessage(client: BunWebSocketClient, message: WebSocketMessage): void {
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[WebSocket] Error sending to ${client.id}:`, error);
    }
  }

  private sendError(client: BunWebSocketClient, error: string): void {
    this.sendMessage(client, {
      type: 'error',
      payload: { error },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: WebSocketMessage, excludeClientId?: string): void {
    this.clients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;
      this.sendMessage(client, message);
    });
  }

  /**
   * Broadcast a message to all clients subscribed to a specific channel
   */
  broadcastToChannel(channel: string, message: WebSocketMessage, excludeClientId?: string): void {
    this.clients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;
      if (client.subscriptions.has(channel)) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Broadcast a message to specific clients
   */
  broadcastToClients(clientIds: string[], message: WebSocketMessage): void {
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Get a specific client by ID
   */
  getClient(clientId: string): BunWebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all connected clients
   */
  getConnectedClients(): BunWebSocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get all clients subscribed to a specific channel
   */
  getClientsInChannel(channel: string): BunWebSocketClient[] {
    return Array.from(this.clients.values()).filter((client) =>
      client.subscriptions.has(channel)
    );
  }

  /**
   * Disconnect a specific client
   */
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.close();
      this.clients.delete(clientId);
    }
  }

  /**
   * Get WebSocket server statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values()).reduce(
        (total, client) => total + client.subscriptions.size,
        0
      ),
      channels: Array.from(
        new Set(
          Array.from(this.clients.values()).flatMap((client) =>
            Array.from(client.subscriptions)
          )
        )
      ),
      messageHandlers: Array.from(this.messageHandlers.keys()),
    };
  }

  /**
   * Close all connections
   */
  close(): void {
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();
  }
}
