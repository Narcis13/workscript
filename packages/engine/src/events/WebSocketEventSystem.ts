/**
 * WebSocket Event System for Workflow Engine
 * Handles workflow lifecycle events, node execution progress, and error notifications
 */

import { EventEmitter } from './EventEmitter';
import type { 
  WebSocketMessage,
  AnyWebSocketMessage,
  WorkflowDefinition,
  ExecutionResult,
  NodeMetadata,
  ValidationResult
} from '../types';

/**
 * WebSocket event data interfaces
 */
export interface WorkflowLifecycleEvent {
  type: 'workflow:started' | 'workflow:completed' | 'workflow:failed' | 'workflow:cancelled' | 'workflow:paused' | 'workflow:resumed';
  workflowId: string;
  executionId: string;
  timestamp: number;
  data?: {
    workflowDefinition?: WorkflowDefinition;
    result?: ExecutionResult;
    error?: string;
    reason?: string;
  };
}

export interface NodeExecutionEvent {
  type: 'node:started' | 'node:completed' | 'node:failed' | 'node:skipped';
  workflowId: string;
  executionId: string;
  nodeId: string;
  timestamp: number;
  data?: {
    nodeMetadata?: NodeMetadata;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    error?: string;
    duration?: number;
  };
}

export interface WorkflowProgressEvent {
  type: 'workflow:progress';
  workflowId: string;
  executionId: string;
  timestamp: number;
  data: {
    totalNodes: number;
    completedNodes: number;
    currentNode: string;
    percentage: number;
    estimatedTimeRemaining?: number;
  };
}

export interface ErrorNotificationEvent {
  type: 'error:validation' | 'error:execution' | 'error:connection' | 'error:system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  data: {
    code: string;
    message: string;
    details?: Record<string, any>;
    context?: {
      workflowId?: string;
      executionId?: string;
      nodeId?: string;
    };
    recovery?: {
      action: string;
      message: string;
    };
  };
}

export interface SystemNotificationEvent {
  type: 'system:info' | 'system:warning' | 'system:success';
  timestamp: number;
  data: {
    title: string;
    message: string;
    category?: string;
    actions?: Array<{
      label: string;
      action: string;
      data?: any;
    }>;
  };
}

/**
 * Union type for all WebSocket events
 */
export type WebSocketEvent = 
  | WorkflowLifecycleEvent
  | NodeExecutionEvent
  | WorkflowProgressEvent
  | ErrorNotificationEvent
  | SystemNotificationEvent;

/**
 * Event callback types
 */
export type WorkflowLifecycleCallback = (event: WorkflowLifecycleEvent) => void | Promise<void>;
export type NodeExecutionCallback = (event: NodeExecutionEvent) => void | Promise<void>;
export type WorkflowProgressCallback = (event: WorkflowProgressEvent) => void | Promise<void>;
export type ErrorNotificationCallback = (event: ErrorNotificationEvent) => void | Promise<void>;
export type SystemNotificationCallback = (event: SystemNotificationEvent) => void | Promise<void>;

/**
 * WebSocket Event System class
 * Extends EventEmitter with WebSocket-specific functionality
 */
export class WebSocketEventSystem extends EventEmitter {
  private webSocketSender?: (message: WebSocketMessage) => boolean;
  private eventBuffer: WebSocketEvent[] = [];
  private maxBufferSize = 1000;
  private isConnected = false;

  constructor(webSocketSender?: (message: WebSocketMessage) => boolean) {
    super();
    this.webSocketSender = webSocketSender;
  }

  /**
   * Set or update the WebSocket sender function
   */
  setWebSocketSender(sender: (message: WebSocketMessage) => boolean): void {
    this.webSocketSender = sender;
  }

  /**
   * Set connection status
   */
  setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
    if (connected && this.eventBuffer.length > 0) {
      this.flushEventBuffer();
    }
  }

  /**
   * Workflow Lifecycle Events
   */
  emitWorkflowStarted(workflowId: string, executionId: string, workflowDefinition?: WorkflowDefinition): void {
    const event: WorkflowLifecycleEvent = {
      type: 'workflow:started',
      workflowId,
      executionId,
      timestamp: Date.now(),
      data: { workflowDefinition }
    };
    this.emitWebSocketEvent(event);
  }

  emitWorkflowCompleted(workflowId: string, executionId: string, result: ExecutionResult): void {
    const event: WorkflowLifecycleEvent = {
      type: 'workflow:completed',
      workflowId,
      executionId,
      timestamp: Date.now(),
      data: { result }
    };
    this.emitWebSocketEvent(event);
  }

  emitWorkflowFailed(workflowId: string, executionId: string, error: string): void {
    const event: WorkflowLifecycleEvent = {
      type: 'workflow:failed',
      workflowId,
      executionId,
      timestamp: Date.now(),
      data: { error }
    };
    this.emitWebSocketEvent(event);
  }

  emitWorkflowCancelled(workflowId: string, executionId: string, reason?: string): void {
    const event: WorkflowLifecycleEvent = {
      type: 'workflow:cancelled',
      workflowId,
      executionId,
      timestamp: Date.now(),
      data: { reason }
    };
    this.emitWebSocketEvent(event);
  }

  emitWorkflowPaused(workflowId: string, executionId: string): void {
    const event: WorkflowLifecycleEvent = {
      type: 'workflow:paused',
      workflowId,
      executionId,
      timestamp: Date.now()
    };
    this.emitWebSocketEvent(event);
  }

  emitWorkflowResumed(workflowId: string, executionId: string): void {
    const event: WorkflowLifecycleEvent = {
      type: 'workflow:resumed',
      workflowId,
      executionId,
      timestamp: Date.now()
    };
    this.emitWebSocketEvent(event);
  }

  /**
   * Node Execution Events
   */
  emitNodeStarted(workflowId: string, executionId: string, nodeId: string, nodeMetadata?: NodeMetadata, inputs?: Record<string, any>): void {
    const event: NodeExecutionEvent = {
      type: 'node:started',
      workflowId,
      executionId,
      nodeId,
      timestamp: Date.now(),
      data: { nodeMetadata, inputs }
    };
    this.emitWebSocketEvent(event);
  }

  emitNodeCompleted(workflowId: string, executionId: string, nodeId: string, outputs?: Record<string, any>, duration?: number): void {
    const event: NodeExecutionEvent = {
      type: 'node:completed',
      workflowId,
      executionId,
      nodeId,
      timestamp: Date.now(),
      data: { outputs, duration }
    };
    this.emitWebSocketEvent(event);
  }

  emitNodeFailed(workflowId: string, executionId: string, nodeId: string, error: string): void {
    const event: NodeExecutionEvent = {
      type: 'node:failed',
      workflowId,
      executionId,
      nodeId,
      timestamp: Date.now(),
      data: { error }
    };
    this.emitWebSocketEvent(event);
  }

  emitNodeSkipped(workflowId: string, executionId: string, nodeId: string, reason?: string): void {
    const event: NodeExecutionEvent = {
      type: 'node:skipped',
      workflowId,
      executionId,
      nodeId,
      timestamp: Date.now(),
      data: { error: reason }
    };
    this.emitWebSocketEvent(event);
  }

  /**
   * Workflow Progress Events
   */
  emitWorkflowProgress(
    workflowId: string, 
    executionId: string, 
    totalNodes: number, 
    completedNodes: number, 
    currentNode: string,
    estimatedTimeRemaining?: number
  ): void {
    const percentage = Math.round((completedNodes / totalNodes) * 100);
    const event: WorkflowProgressEvent = {
      type: 'workflow:progress',
      workflowId,
      executionId,
      timestamp: Date.now(),
      data: {
        totalNodes,
        completedNodes,
        currentNode,
        percentage,
        estimatedTimeRemaining
      }
    };
    this.emitWebSocketEvent(event);
  }

  /**
   * Error Handling Events
   */
  emitValidationError(code: string, message: string, details?: Record<string, any>, context?: { workflowId?: string }): void {
    const event: ErrorNotificationEvent = {
      type: 'error:validation',
      severity: 'medium',
      timestamp: Date.now(),
      data: { code, message, details, context }
    };
    this.emitWebSocketEvent(event);
  }

  emitExecutionError(
    code: string, 
    message: string, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    details?: Record<string, any>, 
    context?: { workflowId?: string; executionId?: string; nodeId?: string },
    recovery?: { action: string; message: string }
  ): void {
    const event: ErrorNotificationEvent = {
      type: 'error:execution',
      severity,
      timestamp: Date.now(),
      data: { code, message, details, context, recovery }
    };
    this.emitWebSocketEvent(event);
  }

  emitConnectionError(code: string, message: string, details?: Record<string, any>): void {
    const event: ErrorNotificationEvent = {
      type: 'error:connection',
      severity: 'high',
      timestamp: Date.now(),
      data: { code, message, details }
    };
    this.emitWebSocketEvent(event);
  }

  emitSystemError(code: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'critical', details?: Record<string, any>): void {
    const event: ErrorNotificationEvent = {
      type: 'error:system',
      severity,
      timestamp: Date.now(),
      data: { code, message, details }
    };
    this.emitWebSocketEvent(event);
  }

  /**
   * System Notification Events
   */
  emitSystemInfo(title: string, message: string, category?: string): void {
    const event: SystemNotificationEvent = {
      type: 'system:info',
      timestamp: Date.now(),
      data: { title, message, category }
    };
    this.emitWebSocketEvent(event);
  }

  emitSystemWarning(title: string, message: string, category?: string, actions?: Array<{ label: string; action: string; data?: any }>): void {
    const event: SystemNotificationEvent = {
      type: 'system:warning',
      timestamp: Date.now(),
      data: { title, message, category, actions }
    };
    this.emitWebSocketEvent(event);
  }

  emitSystemSuccess(title: string, message: string, category?: string): void {
    const event: SystemNotificationEvent = {
      type: 'system:success',
      timestamp: Date.now(),
      data: { title, message, category }
    };
    this.emitWebSocketEvent(event);
  }

  /**
   * Event Listener Registration Methods
   */
  onWorkflowLifecycle(callback: WorkflowLifecycleCallback): string {
    return this.on('workflow:lifecycle', callback);
  }

  onNodeExecution(callback: NodeExecutionCallback): string {
    return this.on('node:execution', callback);
  }

  onWorkflowProgress(callback: WorkflowProgressCallback): string {
    return this.on('workflow:progress', callback);
  }

  onError(callback: ErrorNotificationCallback): string {
    return this.on('error', callback);
  }

  onSystemNotification(callback: SystemNotificationCallback): string {
    return this.on('system:notification', callback);
  }

  /**
   * Core event emission method
   */
  private emitWebSocketEvent(event: WebSocketEvent): void {
    // Emit to local event listeners
    this.emitLocalEvent(event);

    // Send via WebSocket if available and connected
    if (this.isConnected && this.webSocketSender) {
      const message: WebSocketMessage = {
        type: `ws:${event.type}`,
        payload: event,
        timestamp: event.timestamp
      };

      const sent = this.webSocketSender(message);
      if (!sent) {
        this.bufferEvent(event);
      }
    } else {
      this.bufferEvent(event);
    }
  }

  /**
   * Emit event to local listeners based on event type
   */
  private async emitLocalEvent(event: WebSocketEvent): Promise<void> {
    switch (true) {
      case event.type.startsWith('workflow:') && !event.type.includes('progress'):
        await this.emit('workflow:lifecycle', event);
        break;
      case event.type.startsWith('node:'):
        await this.emit('node:execution', event);
        break;
      case event.type === 'workflow:progress':
        await this.emit('workflow:progress', event);
        break;
      case event.type.startsWith('error:'):
        await this.emit('error', event);
        break;
      case event.type.startsWith('system:'):
        await this.emit('system:notification', event);
        break;
    }
  }

  /**
   * Buffer events when WebSocket is not available
   */
  private bufferEvent(event: WebSocketEvent): void {
    this.eventBuffer.push(event);
    
    // Maintain buffer size limit
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift(); // Remove oldest event
    }
  }

  /**
   * Flush buffered events when connection is restored
   */
  private async flushEventBuffer(): Promise<void> {
    if (!this.isConnected || !this.webSocketSender || this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const event of events) {
      const message: WebSocketMessage = {
        type: `ws:${event.type}`,
        payload: event,
        timestamp: event.timestamp
      };

      const sent = this.webSocketSender(message);
      if (!sent) {
        // Re-buffer if send fails
        this.bufferEvent(event);
        break;
      }
    }
  }

  /**
   * Get event buffer status
   */
  getBufferStatus(): { size: number; maxSize: number; isConnected: boolean } {
    return {
      size: this.eventBuffer.length,
      maxSize: this.maxBufferSize,
      isConnected: this.isConnected
    };
  }

  /**
   * Clear event buffer
   */
  clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * Set maximum buffer size
   */
  setMaxBufferSize(size: number): void {
    this.maxBufferSize = Math.max(1, size);
    
    // Trim buffer if needed
    while (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }
  }
}