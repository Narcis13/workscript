// Abstract WorkflowNode base class
export class WorkflowNode {
}
// Abstract UINode base class
export class UINode extends WorkflowNode {
    // UI nodes return both execution edges AND render instructions
    async execute(context, config) {
        const renderData = await this.prepareRenderData(context, config);
        const edges = await this.getEdges(context, config);
        return {
            ...edges,
            __ui_render: () => ({
                component: this.getComponentName(),
                props: renderData,
                nodeId: context.nodeId,
                onInteraction: this.createInteractionHandler(context)
            })
        };
    }
    // Create interaction handler for the UI component
    createInteractionHandler(context) {
        return (event) => {
            this.handleInteraction(event, context);
        };
    }
    // Handle UI interactions and update workflow state
    handleInteraction(event, context) {
        // Default implementation - can be overridden by specific nodes
        this.updateStateFromInteraction(event, context);
        this.emitWorkflowEvent(event, context);
    }
    updateStateFromInteraction(event, context) {
        // Update context state based on interaction
        const stateKey = `${context.nodeId}_interaction`;
        context.state[stateKey] = event;
        // Store specific interaction data
        if (event.data) {
            const dataKey = `${context.nodeId}_data`;
            context.state[dataKey] = event.data;
        }
    }
    emitWorkflowEvent(event, context) {
        // This would integrate with the workflow engine's event system
        // For now, we just store the event for the engine to pick up
        const eventsKey = `${context.nodeId}_events`;
        if (!context.state[eventsKey]) {
            context.state[eventsKey] = [];
        }
        context.state[eventsKey].push(event);
    }
}
/**
 * WebSocket message type guards for type-safe handling
 */
export const isConnectionMessage = (msg) => {
    return msg.type.startsWith('connection:');
};
export const isSystemMessage = (msg) => {
    return msg.type.startsWith('system:');
};
export const isWorkflowMessage = (msg) => {
    return msg.type.startsWith('workflow:');
};
export const isNodeMessage = (msg) => {
    return msg.type.startsWith('node:');
};
/**
 * WebSocket serialization/deserialization utilities
 */
export class WebSocketMessageSerializer {
    /**
     * Serialize a WebSocket message to JSON string
     */
    static serialize(message) {
        try {
            // Ensure timestamp is set
            const messageWithTimestamp = {
                timestamp: Date.now(),
                ...message
            };
            return JSON.stringify(messageWithTimestamp);
        }
        catch (error) {
            throw new Error(`Failed to serialize WebSocket message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Deserialize a JSON string to WebSocket message
     */
    static deserialize(data) {
        try {
            const parsed = JSON.parse(data);
            // Validate basic message structure
            if (!parsed.type || typeof parsed.type !== 'string') {
                throw new Error('Invalid message format: missing or invalid type field');
            }
            return parsed;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Failed to parse WebSocket message: Invalid JSON');
            }
            throw error;
        }
    }
    /**
     * Create a typed message with automatic timestamp and ID generation
     */
    static createMessage(type, payload, options) {
        return {
            type,
            payload,
            timestamp: Date.now(),
            requestId: options?.requestId || crypto.randomUUID?.() || Math.random().toString(36),
            correlationId: options?.correlationId
        };
    }
    /**
     * Validate message structure
     */
    static isValidMessage(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const msg = data;
        return typeof msg.type === 'string' && msg.type.length > 0;
    }
    /**
     * Create error response message
     */
    static createErrorResponse(originalMessage, error, code) {
        return this.createMessage('error', {
            code: code || 'UNKNOWN_ERROR',
            message: error,
            timestamp: Date.now(),
            details: {
                originalType: originalMessage.type,
                originalRequestId: originalMessage.requestId
            }
        }, {
            correlationId: originalMessage.requestId
        });
    }
    /**
     * Create success response message for workflow operations
     */
    static createWorkflowSuccessResponse(executionId, result, originalMessage) {
        return this.createMessage('workflow:result', {
            executionId,
            success: true,
            result,
            timestamp: Date.now(),
            duration: result.endTime && result.startTime
                ? result.endTime.getTime() - result.startTime.getTime()
                : undefined
        }, {
            correlationId: originalMessage?.requestId
        });
    }
}
