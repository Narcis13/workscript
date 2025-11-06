// UI Workflow Infrastructure - Event System and Utilities
// UI Event System Implementation
export class UIWorkflowEventEmitter {
    handlers = new Map();
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);
    }
    emit(event, data) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                }
                catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
    off(event, handler) {
        if (!handler) {
            this.handlers.delete(event);
            return;
        }
        const handlers = this.handlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
            if (handlers.length === 0) {
                this.handlers.delete(event);
            }
        }
    }
    // Get all registered events
    getEvents() {
        return Array.from(this.handlers.keys());
    }
    // Clear all handlers
    clear() {
        this.handlers.clear();
    }
}
// UI Interaction Event Factory
export class UIEventFactory {
    static createFormSubmitEvent(nodeId, formData) {
        return {
            type: 'form_submit',
            data: formData,
            nodeId,
            timestamp: Date.now()
        };
    }
    static createButtonClickEvent(nodeId, action, payload) {
        return {
            type: 'button_click',
            data: { action, payload },
            nodeId,
            timestamp: Date.now()
        };
    }
    static createDataSelectEvent(nodeId, selectedData) {
        return {
            type: 'data_select',
            data: selectedData,
            nodeId,
            timestamp: Date.now()
        };
    }
    static createChartInteractionEvent(nodeId, interactionType, data) {
        return {
            type: 'chart_interaction',
            data: { interactionType, ...data },
            nodeId,
            timestamp: Date.now()
        };
    }
    static createFileUploadEvent(nodeId, files) {
        return {
            type: 'file_upload',
            data: {
                files: files.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    lastModified: f.lastModified
                }))
            },
            nodeId,
            timestamp: Date.now()
        };
    }
    static createCustomEvent(type, nodeId, data) {
        return {
            type,
            data,
            nodeId,
            timestamp: Date.now()
        };
    }
}
// UI State Manager for workflow UIs
export class UIStateManager {
    state = new Map();
    eventEmitter = new UIWorkflowEventEmitter();
    // Get state for a specific node
    getNodeState(nodeId) {
        return this.state.get(nodeId) || {};
    }
    // Update state for a specific node
    setNodeState(nodeId, state) {
        const previousState = this.getNodeState(nodeId);
        this.state.set(nodeId, { ...previousState, ...state });
        // Emit state change event
        this.eventEmitter.emit('state_change', {
            nodeId,
            previousState,
            newState: this.getNodeState(nodeId)
        });
    }
    // Get the entire UI state
    getAllState() {
        const result = {};
        this.state.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
    // Clear state for a specific node
    clearNodeState(nodeId) {
        this.state.delete(nodeId);
        this.eventEmitter.emit('state_cleared', { nodeId });
    }
    // Clear all state
    clearAll() {
        this.state.clear();
        this.eventEmitter.emit('all_state_cleared', {});
    }
    // Subscribe to state changes
    onStateChange(handler) {
        this.eventEmitter.on('state_change', handler);
    }
    // Subscribe to state clearing
    onStateCleared(handler) {
        this.eventEmitter.on('state_cleared', handler);
    }
    // Get the event emitter for custom events
    getEventEmitter() {
        return this.eventEmitter;
    }
}
// UI Workflow Context - combines state and event management
export class UIWorkflowContext {
    stateManager;
    eventEmitter;
    constructor() {
        this.stateManager = new UIStateManager();
        this.eventEmitter = new UIWorkflowEventEmitter();
    }
    getStateManager() {
        return this.stateManager;
    }
    getEventEmitter() {
        return this.eventEmitter;
    }
    // Handle UI interaction and update state
    handleInteraction(event) {
        // Update node state with interaction data
        this.stateManager.setNodeState(event.nodeId, {
            lastInteraction: event,
            interactionData: event.data
        });
        // Emit the interaction event for workflow processing
        this.eventEmitter.emit('ui_interaction', event);
        // Emit specific event type for targeted handling
        this.eventEmitter.emit(event.type, event);
    }
    // Subscribe to UI interactions
    onInteraction(handler) {
        this.eventEmitter.on('ui_interaction', handler);
    }
    // Subscribe to specific interaction types
    onInteractionType(type, handler) {
        this.eventEmitter.on(type, handler);
    }
    // Clean up resources
    destroy() {
        this.stateManager.clearAll();
        this.eventEmitter.clear();
    }
}
// Export types for external use
export * from '../types';
