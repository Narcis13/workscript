/**
 * WebSocket Event System for Workflow Engine
 * Handles workflow lifecycle events, node execution progress, and error notifications
 */
import { EventEmitter } from './EventEmitter';
/**
 * WebSocket Event System class
 * Extends EventEmitter with WebSocket-specific functionality
 */
export class WebSocketEventSystem extends EventEmitter {
    webSocketSender;
    eventBuffer = [];
    maxBufferSize = 1000;
    isConnected = false;
    constructor(webSocketSender) {
        super();
        this.webSocketSender = webSocketSender;
    }
    /**
     * Set or update the WebSocket sender function
     */
    setWebSocketSender(sender) {
        this.webSocketSender = sender;
    }
    /**
     * Set connection status
     */
    setConnectionStatus(connected) {
        this.isConnected = connected;
        if (connected && this.eventBuffer.length > 0) {
            this.flushEventBuffer();
        }
    }
    /**
     * Workflow Lifecycle Events
     */
    emitWorkflowStarted(workflowId, executionId, workflowDefinition) {
        const event = {
            type: 'workflow:started',
            workflowId,
            executionId,
            timestamp: Date.now(),
            data: { workflowDefinition }
        };
        this.emitWebSocketEvent(event);
    }
    emitWorkflowCompleted(workflowId, executionId, result) {
        const event = {
            type: 'workflow:completed',
            workflowId,
            executionId,
            timestamp: Date.now(),
            data: { result }
        };
        this.emitWebSocketEvent(event);
    }
    emitWorkflowFailed(workflowId, executionId, error) {
        const event = {
            type: 'workflow:failed',
            workflowId,
            executionId,
            timestamp: Date.now(),
            data: { error }
        };
        this.emitWebSocketEvent(event);
    }
    emitWorkflowCancelled(workflowId, executionId, reason) {
        const event = {
            type: 'workflow:cancelled',
            workflowId,
            executionId,
            timestamp: Date.now(),
            data: { reason }
        };
        this.emitWebSocketEvent(event);
    }
    emitWorkflowPaused(workflowId, executionId) {
        const event = {
            type: 'workflow:paused',
            workflowId,
            executionId,
            timestamp: Date.now()
        };
        this.emitWebSocketEvent(event);
    }
    emitWorkflowResumed(workflowId, executionId) {
        const event = {
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
    emitNodeStarted(workflowId, executionId, nodeId, nodeMetadata, inputs) {
        const event = {
            type: 'node:started',
            workflowId,
            executionId,
            nodeId,
            timestamp: Date.now(),
            data: { nodeMetadata, inputs }
        };
        this.emitWebSocketEvent(event);
    }
    emitNodeCompleted(workflowId, executionId, nodeId, outputs, duration) {
        const event = {
            type: 'node:completed',
            workflowId,
            executionId,
            nodeId,
            timestamp: Date.now(),
            data: { outputs, duration }
        };
        this.emitWebSocketEvent(event);
    }
    emitNodeFailed(workflowId, executionId, nodeId, error) {
        const event = {
            type: 'node:failed',
            workflowId,
            executionId,
            nodeId,
            timestamp: Date.now(),
            data: { error }
        };
        this.emitWebSocketEvent(event);
    }
    emitNodeSkipped(workflowId, executionId, nodeId, reason) {
        const event = {
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
    emitWorkflowProgress(workflowId, executionId, totalNodes, completedNodes, currentNode, estimatedTimeRemaining) {
        const percentage = Math.round((completedNodes / totalNodes) * 100);
        const event = {
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
    emitValidationError(code, message, details, context) {
        const event = {
            type: 'error:validation',
            severity: 'medium',
            timestamp: Date.now(),
            data: { code, message, details, context }
        };
        this.emitWebSocketEvent(event);
    }
    emitExecutionError(code, message, severity = 'high', details, context, recovery) {
        const event = {
            type: 'error:execution',
            severity,
            timestamp: Date.now(),
            data: { code, message, details, context, recovery }
        };
        this.emitWebSocketEvent(event);
    }
    emitConnectionError(code, message, details) {
        const event = {
            type: 'error:connection',
            severity: 'high',
            timestamp: Date.now(),
            data: { code, message, details }
        };
        this.emitWebSocketEvent(event);
    }
    emitSystemError(code, message, severity = 'critical', details) {
        const event = {
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
    emitSystemInfo(title, message, category) {
        const event = {
            type: 'system:info',
            timestamp: Date.now(),
            data: { title, message, category }
        };
        this.emitWebSocketEvent(event);
    }
    emitSystemWarning(title, message, category, actions) {
        const event = {
            type: 'system:warning',
            timestamp: Date.now(),
            data: { title, message, category, actions }
        };
        this.emitWebSocketEvent(event);
    }
    emitSystemSuccess(title, message, category) {
        const event = {
            type: 'system:success',
            timestamp: Date.now(),
            data: { title, message, category }
        };
        this.emitWebSocketEvent(event);
    }
    /**
     * Event Listener Registration Methods
     */
    onWorkflowLifecycle(callback) {
        return this.on('workflow:lifecycle', callback);
    }
    onNodeExecution(callback) {
        return this.on('node:execution', callback);
    }
    onWorkflowProgress(callback) {
        return this.on('workflow:progress', callback);
    }
    onError(callback) {
        return this.on('error', callback);
    }
    onSystemNotification(callback) {
        return this.on('system:notification', callback);
    }
    /**
     * Core event emission method
     */
    emitWebSocketEvent(event) {
        // Emit to local event listeners
        this.emitLocalEvent(event);
        // Send via WebSocket if available and connected
        if (this.isConnected && this.webSocketSender) {
            const message = {
                type: `ws:${event.type}`,
                payload: event,
                timestamp: event.timestamp
            };
            const sent = this.webSocketSender(message);
            if (!sent) {
                this.bufferEvent(event);
            }
        }
        else {
            this.bufferEvent(event);
        }
    }
    /**
     * Emit event to local listeners based on event type
     */
    async emitLocalEvent(event) {
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
    bufferEvent(event) {
        this.eventBuffer.push(event);
        // Maintain buffer size limit
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift(); // Remove oldest event
        }
    }
    /**
     * Flush buffered events when connection is restored
     */
    async flushEventBuffer() {
        if (!this.isConnected || !this.webSocketSender || this.eventBuffer.length === 0) {
            return;
        }
        const events = [...this.eventBuffer];
        this.eventBuffer = [];
        for (const event of events) {
            const message = {
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
    getBufferStatus() {
        return {
            size: this.eventBuffer.length,
            maxSize: this.maxBufferSize,
            isConnected: this.isConnected
        };
    }
    /**
     * Clear event buffer
     */
    clearBuffer() {
        this.eventBuffer = [];
    }
    /**
     * Set maximum buffer size
     */
    setMaxBufferSize(size) {
        this.maxBufferSize = Math.max(1, size);
        // Trim buffer if needed
        while (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }
    }
}
