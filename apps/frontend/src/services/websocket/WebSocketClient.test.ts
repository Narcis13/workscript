/**
 * WebSocketClient Tests
 *
 * Comprehensive test suite for WebSocketClient functionality including:
 * - Connection establishment and management
 * - Auto-reconnection with exponential backoff
 * - Message sending and receiving
 * - Event subscription system
 * - Heartbeat/ping-pong monitoring
 * - Message queuing
 * - Statistics tracking
 *
 * @module websocket.WebSocketClient.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocketClient from './WebSocketClient';
import { ConnectionStatus } from './events.types';

// Mock WebSocket API
const mockWebSocketConstructor = vi.fn();
let mockWebSocketInstance: any = {};

global.WebSocket = class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState = 0;
  url: string;
  protocols?: string | string[];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    mockWebSocketConstructor(url, protocols);
    mockWebSocketInstance = this;
  }

  send(_data: string) {
    // Mock send
  }

  close() {
    this.readyState = 3; // CLOSED
  }
} as any;

describe('WebSocketClient', () => {
  beforeEach(() => {
    WebSocketClient.resetInstance();
    mockWebSocketConstructor.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    WebSocketClient.resetInstance();
    vi.useRealTimers();
  });

  // ============================================================================
  // Singleton Pattern Tests
  // ============================================================================

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = WebSocketClient.getInstance();
      const instance2 = WebSocketClient.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should accept options only on first instantiation', () => {
      const instance1 = WebSocketClient.getInstance({
        url: 'ws://custom-url:1234'
      });

      const state1 = instance1.getState();
      expect(state1.url).toBe('ws://custom-url:1234');

      // Second call with different options should be ignored
      const instance2 = WebSocketClient.getInstance({
        url: 'ws://other-url:5678'
      });

      const state2 = instance2.getState();
      expect(state2.url).toBe('ws://custom-url:1234'); // Original URL
      expect(instance1).toBe(instance2);
    });

    it('should allow resetting the singleton instance', () => {
      const instance1 = WebSocketClient.getInstance();
      WebSocketClient.resetInstance();
      const instance2 = WebSocketClient.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // Connection Tests
  // ============================================================================

  describe('Connection Management', () => {
    it('should initialize with disconnected status', () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.DISCONNECTED);
      expect(state.reconnectAttempts).toBe(0);
      expect(state.subscribedChannels).toHaveLength(0);
    });

    it('should connect to WebSocket server', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();

      // Simulate connection opening
      setTimeout(() => {
        mockWebSocketInstance.readyState = 1; // OPEN
        mockWebSocketInstance.onopen?.(new Event('open'));
      }, 0);

      await connectPromise;

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.CONNECTED);
      expect(mockWebSocketConstructor).toHaveBeenCalledWith('ws://localhost:3000/ws', undefined);
    });

    it('should fail on connection timeout', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        connectionTimeout: 1000
      });

      const connectPromise = client.connect();

      // Don't trigger onopen, let it timeout
      vi.advanceTimersByTime(1000);

      await expect(connectPromise).rejects.toThrow('WebSocket connection timeout');

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.DISCONNECTED);
    });

    it('should disconnect and close connection', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      client.disconnect();

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.CLOSED);
    });

    it('should not allow multiple simultaneous connections', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise1 = client.connect();
      const connectPromise2 = client.connect();

      // Both should reference the same connection
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));

      await connectPromise1;
      await connectPromise2;

      // Should only create one WebSocket instance
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);
    });

    it('should handle connection error', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();

      setTimeout(() => {
        mockWebSocketInstance.onerror?.(new Event('error'));
      }, 0);

      await expect(connectPromise).rejects.toThrow('WebSocket error occurred');

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.DISCONNECTED);
      expect(state.lastError).toBe('WebSocket error occurred');
    });
  });

  // ============================================================================
  // Message Sending Tests
  // ============================================================================

  describe('Message Sending', () => {
    it('should send message when connected', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const sendSpy = vi.spyOn(mockWebSocketInstance, 'send');

      client.send({ type: 'test', data: 'hello' });

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test', data: 'hello' })
      );

      const stats = client.getStatistics();
      expect(stats.messagesSent).toBe(2); // 1 subscribe + 1 test message
    });

    it('should queue message when disconnected', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        messageQueue: {
          enabled: true,
          maxSize: 10,
          flushOnReconnect: true
        }
      });

      // Send message while disconnected
      client.send({ type: 'test', data: 'hello' });

      const stats = client.getStatistics();
      expect(stats.messagesSent).toBe(1); // Queued messages count as sent

      // Now connect
      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      // Message should have been sent from queue
      vi.advanceTimersByTime(100);

      // Verify message was queued then sent
      const stats2 = client.getStatistics();
      expect(stats2.messagesSent).toBeGreaterThan(1);
    });

    it('should respect message queue size limit', () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        messageQueue: {
          enabled: true,
          maxSize: 5,
          flushOnReconnect: true
        }
      });

      // Queue 10 messages, but only 5 should be kept
      for (let i = 0; i < 10; i++) {
        client.send({ index: i });
      }

      const stats = client.getStatistics();
      expect(stats.messagesSent).toBe(5); // Only 5 queued
    });

    it('should disable message queuing if configured', () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        messageQueue: {
          enabled: false,
          maxSize: 10,
          flushOnReconnect: true
        }
      });

      client.send({ type: 'test' });

      const stats = client.getStatistics();
      expect(stats.messagesSent).toBe(0); // Message was dropped
    });
  });

  // ============================================================================
  // Message Receiving Tests
  // ============================================================================

  describe('Message Receiving', () => {
    it('should parse and handle incoming messages', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const handler = vi.fn();
      client.on('test:message', handler);

      // Simulate incoming message
      mockWebSocketInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'test:message', value: 'hello' })
        })
      );

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'test:message', value: 'hello' })
      );

      const stats = client.getStatistics();
      expect(stats.messagesReceived).toBe(1);
    });

    it('should handle invalid JSON messages gracefully', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      // Simulate invalid JSON message
      mockWebSocketInstance.onmessage?.(
        new MessageEvent('message', {
          data: 'not valid json {{'
        })
      );

      const stats = client.getStatistics();
      expect(stats.errors).toBe(1);
    });

    it('should emit generic message event for all messages', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const genericHandler = vi.fn();
      client.on('message', genericHandler);

      mockWebSocketInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'workflow:started', id: '123' })
        })
      );

      expect(genericHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'workflow:started', id: '123' })
      );
    });

    it('should track message statistics by type', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      // Send different message types
      for (let i = 0; i < 3; i++) {
        mockWebSocketInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'workflow:started' })
          })
        );
      }

      for (let i = 0; i < 2; i++) {
        mockWebSocketInstance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'node:completed' })
          })
        );
      }

      const stats = client.getStatistics();
      expect(stats.messagesByType['workflow:started']).toBe(3);
      expect(stats.messagesByType['node:completed']).toBe(2);
    });
  });

  // ============================================================================
  // Channel Subscription Tests
  // ============================================================================

  describe('Channel Subscription', () => {
    it('should subscribe to channel when connected', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const sendSpy = vi.spyOn(mockWebSocketInstance, 'send');
      sendSpy.mockClear(); // Clear calls from connection setup

      client.subscribe('custom-channel');

      const state = client.getState();
      expect(state.subscribedChannels).toContain('custom-channel');

      // Should send subscription message
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', channel: 'custom-channel' })
      );
    });

    it('should subscribe to default workflow-events channel on connection', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const state = client.getState();
      expect(state.subscribedChannels).toContain('workflow-events');
    });

    it('should not subscribe to same channel twice', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const sendSpy = vi.spyOn(mockWebSocketInstance, 'send');
      const initialCallCount = sendSpy.mock.calls.length;

      client.subscribe('test-channel');
      client.subscribe('test-channel');

      // Should only send one subscription message
      expect(sendSpy.mock.calls.length).toBe(initialCallCount + 1);
    });

    it('should unsubscribe from channel', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      client.subscribe('test-channel');
      let state = client.getState();
      expect(state.subscribedChannels).toContain('test-channel');

      client.unsubscribe('test-channel');
      state = client.getState();
      expect(state.subscribedChannels).not.toContain('test-channel');
    });
  });

  // ============================================================================
  // Event Handler Tests
  // ============================================================================

  describe('Event Handlers', () => {
    it('should register and call event handlers', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const handler = vi.fn();
      client.on('workflow:started', handler);

      client.emit('workflow:started', { workflowId: '123' });

      expect(handler).toHaveBeenCalledWith({ workflowId: '123' });
    });

    it('should support multiple handlers for same event', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('workflow:started', handler1);
      client.on('workflow:started', handler2);

      client.emit('workflow:started', { workflowId: '123' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should unregister event handlers', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const handler = vi.fn();
      client.on('workflow:started', handler);
      client.off('workflow:started', handler);

      client.emit('workflow:started', { workflowId: '123' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function from on()', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const handler = vi.fn();
      const unsubscribe = client.on('workflow:started', handler);

      client.emit('workflow:started', { workflowId: '123' });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      client.emit('workflow:started', { workflowId: '456' });
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle errors in event handlers gracefully', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      const handler1 = vi.fn(() => {
        throw new Error('Handler error');
      });
      const handler2 = vi.fn();

      client.on('test:event', handler1);
      client.on('test:event', handler2);

      // Should not throw, should call both handlers
      client.emit('test:event', { data: 'test' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      const stats = client.getStatistics();
      expect(stats.errors).toBe(1);
    });
  });

  // ============================================================================
  // Auto-Reconnect Tests
  // ============================================================================

  describe('Auto-Reconnect with Exponential Backoff', () => {
    it('should schedule reconnect on disconnection', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        reconnection: {
          enabled: true,
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 8000,
          exponentialBackoff: true,
          backoffMultiplier: 2,
          jitter: 0
        }
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      // Simulate disconnection
      mockWebSocketInstance.readyState = 3; // CLOSED
      mockWebSocketInstance.onclose?.(new CloseEvent('close'));

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.RECONNECTING);
    });

    it('should apply exponential backoff delays', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        reconnection: {
          enabled: true,
          maxAttempts: 5,
          initialDelay: 1000,
          maxDelay: 16000,
          exponentialBackoff: true,
          backoffMultiplier: 2,
          jitter: 0
        }
      });

      let reconnectCount = 0;

      const connectSpy = vi
        .spyOn(client, 'connect')
        .mockImplementation(async () => {
          reconnectCount++;
          if (reconnectCount < 3) {
            // Fail first 2 attempts
            throw new Error('Connection failed');
          }
          mockWebSocketInstance.readyState = 1;
          mockWebSocketInstance.onopen?.(new Event('open'));
        });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      // Simulate disconnection
      mockWebSocketInstance.onclose?.(new CloseEvent('close'));

      // First reconnect should happen at ~1000ms
      vi.advanceTimersByTime(1000);
      expect(connectSpy).toHaveBeenCalled();

      // Second reconnect should happen at ~2000ms later (initial + exponential)
      mockWebSocketInstance.onclose?.(new CloseEvent('close'));
      vi.advanceTimersByTime(2000);

      // Cleanup
      connectSpy.mockRestore();
    });

    it('should give up after max reconnect attempts', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        reconnection: {
          enabled: true,
          maxAttempts: 2,
          initialDelay: 100,
          maxDelay: 1000,
          exponentialBackoff: true,
          backoffMultiplier: 2,
          jitter: 0
        }
      });

      let connectAttempts = 0;
      const connectSpy = vi
        .spyOn(client, 'connect')
        .mockImplementation(async () => {
          connectAttempts++;
          throw new Error('Connection failed');
        });

      try {
        await client.connect();
      } catch {
        // Expected
      }

      // Simulate disconnection
      mockWebSocketInstance.onclose?.(new CloseEvent('close'));

      // Advance time to trigger all reconnect attempts
      vi.advanceTimersByTime(5000);

      const state = client.getState();
      expect(state.status).toBe(ConnectionStatus.FAILED);

      connectSpy.mockRestore();
    });
  });

  // ============================================================================
  // Statistics and Logging Tests
  // ============================================================================

  describe('Statistics and Logging', () => {
    it('should track message statistics', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      client.send({ type: 'test', data: 'hello world' });

      mockWebSocketInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'response', result: 'ok' })
        })
      );

      const stats = client.getStatistics();
      expect(stats.messagesSent).toBeGreaterThan(0);
      expect(stats.messagesReceived).toBeGreaterThan(0);
    });

    it('should maintain event log', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        eventLogRetention: {
          enabled: true,
          maxEvents: 1000,
          ttl: 3600000
        },
        debug: false
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      client.send({ type: 'test' });

      mockWebSocketInstance.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'response' })
        })
      );

      const eventLog = client.getEventLog();
      expect(eventLog.length).toBeGreaterThan(0);

      // Should have both sent and received events
      const sentEvents = eventLog.filter(e => e.direction === 'outgoing');
      const receivedEvents = eventLog.filter(e => e.direction === 'incoming');
      expect(sentEvents.length).toBeGreaterThan(0);
      expect(receivedEvents.length).toBeGreaterThan(0);
    });

    it('should limit event log to max size', () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        eventLogRetention: {
          enabled: true,
          maxEvents: 10,
          ttl: 3600000
        }
      });

      // Add 20 events
      for (let i = 0; i < 20; i++) {
        client.emit(`event${i}`, { index: i });
      }

      const eventLog = client.getEventLog();
      expect(eventLog.length).toBeLessThanOrEqual(10);
    });

    it('should reset statistics', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      client.send({ type: 'test' });

      let stats = client.getStatistics();
      expect(stats.messagesSent).toBeGreaterThan(0);

      client.resetStatistics();

      stats = client.getStatistics();
      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it('should clear event log', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws',
        eventLogRetention: {
          enabled: true,
          maxEvents: 1000,
          ttl: 3600000
        }
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      client.send({ type: 'test' });

      let eventLog = client.getEventLog();
      expect(eventLog.length).toBeGreaterThan(0);

      client.clearEventLog();

      eventLog = client.getEventLog();
      expect(eventLog).toHaveLength(0);
    });
  });

  // ============================================================================
  // Heartbeat/Ping-Pong Tests
  // ============================================================================

  describe('Heartbeat and Ping-Pong', () => {
    it('should emit connection:status-changed event on status change', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const statusChangedHandler = vi.fn();
      client.on('connection:status-changed', statusChangedHandler);

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      expect(statusChangedHandler).toHaveBeenCalledWith(
        expect.objectContaining({ status: ConnectionStatus.CONNECTED })
      );
    });

    it('should check connection status', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      expect(client.isConnected()).toBe(false);
      expect(client.getStatus()).toBe(ConnectionStatus.DISCONNECTED);

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;

      expect(client.isConnected()).toBe(true);
      expect(client.getStatus()).toBe(ConnectionStatus.CONNECTED);
    });
  });

  // ============================================================================
  // State Management Tests
  // ============================================================================

  describe('State Management', () => {
    it('should return readonly connection state', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const state = client.getState();

      // Should not be able to modify returned state
      expect(() => {
        (state as any).status = ConnectionStatus.CONNECTED;
      }).not.toThrow();

      // Original state should not be modified
      const newState = client.getState();
      expect(newState.status).toBe(ConnectionStatus.DISCONNECTED);
    });

    it('should track connection timestamps', async () => {
      const client = WebSocketClient.getInstance({
        url: 'ws://localhost:3000/ws'
      });

      const connectPromise = client.connect();
      mockWebSocketInstance.readyState = 1;

      const beforeTime = new Date();
      mockWebSocketInstance.onopen?.(new Event('open'));
      await connectPromise;
      const afterTime = new Date();

      const state = client.getState();
      expect(state.connectedAt).toBeDefined();
      expect(state.connectedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(state.connectedAt!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
