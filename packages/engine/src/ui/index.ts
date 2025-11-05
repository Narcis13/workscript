// UI Workflow Infrastructure - Event System and Utilities

import type { UIInteractionEvent, UIEventEmitter } from '../types';

// UI Event System Implementation
export class UIWorkflowEventEmitter implements UIEventEmitter {
  private handlers: Map<string, Array<(data: any) => void>> = new Map();
  
  on(event: string, handler: (data: any) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }
  
  emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  off(event: string, handler?: (data: any) => void): void {
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
  getEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
  
  // Clear all handlers
  clear(): void {
    this.handlers.clear();
  }
}

// UI Interaction Event Factory
export class UIEventFactory {
  static createFormSubmitEvent(nodeId: string, formData: Record<string, any>): UIInteractionEvent {
    return {
      type: 'form_submit',
      data: formData,
      nodeId,
      timestamp: Date.now()
    };
  }
  
  static createButtonClickEvent(nodeId: string, action: string, payload?: any): UIInteractionEvent {
    return {
      type: 'button_click',
      data: { action, payload },
      nodeId,
      timestamp: Date.now()
    };
  }
  
  static createDataSelectEvent(nodeId: string, selectedData: any): UIInteractionEvent {
    return {
      type: 'data_select',
      data: selectedData,
      nodeId,
      timestamp: Date.now()
    };
  }
  
  static createChartInteractionEvent(nodeId: string, interactionType: string, data: any): UIInteractionEvent {
    return {
      type: 'chart_interaction',
      data: { interactionType, ...data },
      nodeId,
      timestamp: Date.now()
    };
  }
  
  static createFileUploadEvent(nodeId: string, files: File[]): UIInteractionEvent {
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
  
  static createCustomEvent(type: string, nodeId: string, data: any): UIInteractionEvent {
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
  private state: Map<string, any> = new Map();
  private eventEmitter: UIWorkflowEventEmitter = new UIWorkflowEventEmitter();
  
  // Get state for a specific node
  getNodeState(nodeId: string): any {
    return this.state.get(nodeId) || {};
  }
  
  // Update state for a specific node
  setNodeState(nodeId: string, state: any): void {
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
  getAllState(): Record<string, any> {
    const result: Record<string, any> = {};
    this.state.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  // Clear state for a specific node
  clearNodeState(nodeId: string): void {
    this.state.delete(nodeId);
    this.eventEmitter.emit('state_cleared', { nodeId });
  }
  
  // Clear all state
  clearAll(): void {
    this.state.clear();
    this.eventEmitter.emit('all_state_cleared', {});
  }
  
  // Subscribe to state changes
  onStateChange(handler: (data: { nodeId: string; previousState: any; newState: any }) => void): void {
    this.eventEmitter.on('state_change', handler);
  }
  
  // Subscribe to state clearing
  onStateCleared(handler: (data: { nodeId: string }) => void): void {
    this.eventEmitter.on('state_cleared', handler);
  }
  
  // Get the event emitter for custom events
  getEventEmitter(): UIWorkflowEventEmitter {
    return this.eventEmitter;
  }
}

// UI Workflow Context - combines state and event management
export class UIWorkflowContext {
  private stateManager: UIStateManager;
  private eventEmitter: UIWorkflowEventEmitter;
  
  constructor() {
    this.stateManager = new UIStateManager();
    this.eventEmitter = new UIWorkflowEventEmitter();
  }
  
  getStateManager(): UIStateManager {
    return this.stateManager;
  }
  
  getEventEmitter(): UIWorkflowEventEmitter {
    return this.eventEmitter;
  }
  
  // Handle UI interaction and update state
  handleInteraction(event: UIInteractionEvent): void {
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
  onInteraction(handler: (event: UIInteractionEvent) => void): void {
    this.eventEmitter.on('ui_interaction', handler);
  }
  
  // Subscribe to specific interaction types
  onInteractionType(type: string, handler: (event: UIInteractionEvent) => void): void {
    this.eventEmitter.on(type, handler);
  }
  
  // Clean up resources
  destroy(): void {
    this.stateManager.clearAll();
    this.eventEmitter.clear();
  }
}

// Export types for external use
export * from '../types';