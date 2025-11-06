import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type {
  WebSocketMessage
} from '@workscript/engine';

/**
 * WebSocket Client representation
 */
export interface WebSocketClient {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  metadata: Record<string, any>;
}

/**
 * Shared WebSocket Manager - Available to all plugins
 *
 * This service provides WebSocket communication capabilities for real-time
 * event streaming and bidirectional communication with clients.
 *
 * Features:
 * - Client connection management
 * - Channel-based subscriptions
 * - Broadcasting to channels or specific clients
 * - Custom message handler registration
 * - Plugin-agnostic design
 */
export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private messageHandlers: Map<string, (client: WebSocketClient, message: WebSocketMessage) => void> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize WebSocket server
   * @param server - HTTP server instance
   * @param path - WebSocket path (default: /ws)
   */
  async initialize(server: Server, path: string = '/ws'): Promise<void> {
    this.wss = new WebSocketServer({
      server,
      path
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        socket: ws,
        subscriptions: new Set(),
        metadata: {
          connectedAt: Date.now(),
          userAgent: request.headers['user-agent'],
          ip: request.socket.remoteAddress
        }
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendMessage(client, {
        type: 'connection.welcome',
        payload: { clientId },
        timestamp: Date.now()
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());

          this.handleMessage(client, message);
        } catch (error) {
          console.error(`Error parsing message from client ${clientId}:`, error);
          this.sendError(client, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    this.setupDefaultHandlers();
  }

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
        timestamp: Date.now()
      });
    });

    // Subscription handler
    this.registerHandler('subscribe', (client, message) => {
      const { channel } = message.payload || {};
      if (typeof channel === 'string') {
        client.subscriptions.add(channel);
        this.sendMessage(client, {
          type: 'subscribed',
          payload: { channel },
          timestamp: Date.now()
        });
      }
    });

    // Unsubscription handler
    this.registerHandler('unsubscribe', (client, message) => {
      const { channel } = message.payload || {};
      if (typeof channel === 'string') {
        client.subscriptions.delete(channel);
        this.sendMessage(client, {
          type: 'unsubscribed',
          payload: { channel },
          timestamp: Date.now()
        });
      }
    });

    // System ping handler
    this.registerHandler('system:ping', (client, message) => {
      this.sendMessage(client, {
        type: 'system:pong',
        payload: {
          timestamp: Date.now(),
          serverId: process.env.SERVER_ID || 'workscript-api'
        },
        timestamp: Date.now()
      });
    });
  }

  /**
   * Register a custom message handler
   * Plugins can use this to handle custom message types
   *
   * @param messageType - Message type to handle (e.g., 'workflow:execute')
   * @param handler - Handler function
   */
  registerHandler(messageType: string, handler: (client: WebSocketClient, message: WebSocketMessage) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregister a message handler
   * @param messageType - Message type to unregister
   */
  unregisterHandler(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  private handleMessage(client: WebSocketClient, message: WebSocketMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        handler(client, message);
      } catch (error) {
        console.error(`Error handling message type ${message.type}:`, error);
        this.sendError(client, `Error processing ${message.type} message`);
      }
    } else {
      console.warn(`No handler found for message type: ${message.type}`);
      this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Send a message to a specific client
   * @param client - Client to send message to
   * @param message - Message to send
   */
  sendMessage(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  private sendError(client: WebSocketClient, error: string): void {
    this.sendMessage(client, {
      type: 'error',
      payload: { error },
      timestamp: Date.now()
    });
  }

  // Broadcasting methods

  /**
   * Broadcast a message to all connected clients
   * @param message - Message to broadcast
   * @param excludeClientId - Optional client ID to exclude from broadcast
   */
  broadcast(message: WebSocketMessage, excludeClientId?: string): void {
    this.clients.forEach((client) => {
      if (excludeClientId && client.id === excludeClientId) return;
      this.sendMessage(client, message);
    });
  }

  /**
   * Broadcast a message to all clients subscribed to a specific channel
   * @param channel - Channel name
   * @param message - Message to broadcast
   * @param excludeClientId - Optional client ID to exclude from broadcast
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
   * @param clientIds - Array of client IDs
   * @param message - Message to broadcast
   */
  broadcastToClients(clientIds: string[], message: WebSocketMessage): void {
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendMessage(client, message);
      }
    });
  }

  // Client management

  /**
   * Get a specific client by ID
   * @param clientId - Client ID
   * @returns WebSocketClient or undefined
   */
  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all connected clients
   * @returns Array of WebSocketClient
   */
  getConnectedClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get all clients subscribed to a specific channel
   * @param channel - Channel name
   * @returns Array of WebSocketClient
   */
  getClientsInChannel(channel: string): WebSocketClient[] {
    return Array.from(this.clients.values()).filter(client =>
      client.subscriptions.has(channel)
    );
  }

  /**
   * Disconnect a specific client
   * @param clientId - Client ID
   */
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.close();
      this.clients.delete(clientId);
    }
  }

  // Server management

  /**
   * Close the WebSocket server and disconnect all clients
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
    }
  }

  /**
   * Get WebSocket server statistics
   * @returns Statistics object
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((total, client) => total + client.subscriptions.size, 0),
      channels: Array.from(new Set(
        Array.from(this.clients.values())
          .flatMap(client => Array.from(client.subscriptions))
      )),
      messageHandlers: Array.from(this.messageHandlers.keys())
    };
  }
}
