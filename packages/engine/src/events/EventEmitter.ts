/**
 * Event emitter for internal workflow events
 */

import type { EventCallback, EventListener } from '../hooks/types';

/**
 * Simple event emitter for hook system
 */
export class EventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();
  private nextId = 1;

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback, once = false): string {
    const id = `listener_${this.nextId++}`;
    const listener: EventListener = {
      id,
      event,
      callback,
      once
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(listener);
    return id;
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, callback: EventCallback): string {
    return this.on(event, callback, true);
  }

  /**
   * Remove an event listener by ID
   */
  off(listenerId: string): boolean {
    for (const [event, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.listeners.delete(event);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  async emit(event: string, data?: any): Promise<void> {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      return;
    }

    // Execute listeners concurrently
    const promises = listeners.map(async (listener) => {
      try {
        await listener.callback(data);
        
        // Remove one-time listeners after execution
        if (listener.once) {
          this.off(listener.id);
        }
      } catch (error) {
        // Log error but don't stop other listeners
        console.error(`Error in event listener ${listener.id} for event ${event}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}