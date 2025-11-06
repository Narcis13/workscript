/**
 * Central hook registration and execution manager
 */
import { EventEmitter } from '../events/EventEmitter';
/**
 * Manages hook registration and execution for the workflow system
 */
export class HookManager {
    hooks = new Map();
    eventEmitter = new EventEmitter();
    nextHookId = 1;
    /**
     * Register a hook for a specific event type
     */
    register(eventType, options) {
        const hookId = `hook_${this.nextHookId++}`;
        const registeredHook = {
            ...options,
            id: hookId,
            eventType,
            priority: options.priority || 0,
            executed: false
        };
        // Initialize event type array if it doesn't exist
        if (!this.hooks.has(eventType)) {
            this.hooks.set(eventType, []);
        }
        // Add hook and sort by priority (higher priority first)
        const eventHooks = this.hooks.get(eventType);
        eventHooks.push(registeredHook);
        eventHooks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return hookId;
    }
    /**
     * Unregister a hook by ID
     */
    unregister(hookId) {
        for (const [eventType, hooks] of this.hooks.entries()) {
            const index = hooks.findIndex(h => h.id === hookId);
            if (index !== -1) {
                hooks.splice(index, 1);
                if (hooks.length === 0) {
                    this.hooks.delete(eventType);
                }
                return true;
            }
        }
        return false;
    }
    /**
     * Unregister all hooks for an event type
     */
    unregisterAll(eventType) {
        if (eventType) {
            this.hooks.delete(eventType);
        }
        else {
            this.hooks.clear();
        }
    }
    /**
     * Emit an event and execute all registered hooks for that event type
     * @param eventType The event type to emit
     * @param context The context data to pass to hooks
     * @returns Array of hook execution results
     */
    async emit(eventType, context) {
        const fullContext = {
            eventType,
            timestamp: new Date(),
            ...context
        };
        return this.executeHooks(eventType, fullContext);
    }
    /**
     * Execute all hooks for a specific event
     */
    async executeHooks(eventType, context) {
        const eventHooks = this.hooks.get(eventType);
        if (!eventHooks || eventHooks.length === 0) {
            return [];
        }
        const results = [];
        // Execute hooks sequentially to maintain priority order
        for (const hook of eventHooks) {
            // Skip if hook was already executed and is a once hook
            if (hook.once && hook.executed) {
                continue;
            }
            // Apply filter if present
            if (hook.filter && !hook.filter(context)) {
                continue;
            }
            // Apply node filter for node events
            if (context.nodeId && hook.nodeFilter && !hook.nodeFilter.includes(context.nodeId)) {
                continue;
            }
            const startTime = Date.now();
            let success = true;
            let error;
            try {
                await hook.handler(context);
                // Mark as executed for once hooks
                if (hook.once) {
                    hook.executed = true;
                }
            }
            catch (err) {
                success = false;
                error = err instanceof Error ? err : new Error(String(err));
                console.error(`Hook ${hook.name} (${hook.id}) failed:`, error);
            }
            const duration = Date.now() - startTime;
            results.push({
                hook,
                duration,
                success,
                error
            });
        }
        // Emit internal event for hook execution monitoring
        await this.eventEmitter.emit('hooks:executed', {
            eventType,
            context,
            results
        });
        return results;
    }
    /**
     * Get all registered hooks for an event type
     */
    getHooks(eventType) {
        return this.hooks.get(eventType)?.slice() || [];
    }
    /**
     * Get all registered event types
     */
    getEventTypes() {
        return Array.from(this.hooks.keys());
    }
    /**
     * Get total number of registered hooks
     */
    getHookCount() {
        let count = 0;
        for (const hooks of this.hooks.values()) {
            count += hooks.length;
        }
        return count;
    }
    /**
     * Check if any hooks are registered for an event type
     */
    hasHooks(eventType) {
        const hooks = this.hooks.get(eventType);
        return hooks ? hooks.length > 0 : false;
    }
    /**
     * Get the internal event emitter for monitoring
     */
    getEventEmitter() {
        return this.eventEmitter;
    }
    /**
     * Clear all hooks and reset state
     */
    clear() {
        this.hooks.clear();
        this.eventEmitter.removeAllListeners();
        this.nextHookId = 1;
    }
}
