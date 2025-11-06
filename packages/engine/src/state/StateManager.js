/**
 * StateManager - Manages workflow execution state with atomic updates, snapshots, and change detection
 *
 * Implements Requirements:
 * - Requirement 11: Share data between nodes with atomic and consistent modifications
 * - Requirement 22: Enable edge functions to return context data
 * - Phase 3: State change detection and hooks integration
 */
export class StateNotFoundError extends Error {
    executionId;
    constructor(executionId) {
        super(`State not found for execution: ${executionId}`);
        this.executionId = executionId;
        this.name = 'StateNotFoundError';
    }
}
export class StateLockError extends Error {
    key;
    constructor(key) {
        super(`State key is locked: ${key}`);
        this.key = key;
        this.name = 'StateLockError';
    }
}
export class SnapshotNotFoundError extends Error {
    snapshotId;
    constructor(snapshotId) {
        super(`Snapshot not found: ${snapshotId}`);
        this.snapshotId = snapshotId;
        this.name = 'SnapshotNotFoundError';
    }
}
export class StateManager {
    states = new Map();
    snapshots = new Map();
    persistenceAdapter;
    watchers = new Map();
    hookManager;
    debounceTimers = new Map();
    // Performance optimization caches
    diffCache = new Map();
    changeCache = new Map();
    batchedUpdates = new Map();
    // Performance settings
    maxCacheSize = 100;
    batchWindowMs = 10; // Batch updates within 10ms
    enableBatching = false; // Disabled by default for predictable behavior
    constructor(persistenceAdapter, hookManager, options) {
        this.persistenceAdapter = persistenceAdapter;
        this.hookManager = hookManager;
        this.maxCacheSize = options?.maxCacheSize ?? 100;
        this.batchWindowMs = options?.batchWindowMs ?? 10;
        this.enableBatching = options?.enableBatching ?? false;
    }
    /**
     * Initialize workflow state with optional initial data
     * Requirement 11.1: WHEN initializing a workflow THEN it must set the initial state from the definition
     */
    async initialize(executionId, initialState = {}) {
        if (this.states.has(executionId)) {
            throw new Error(`State already exists for execution: ${executionId}`);
        }
        const state = {
            data: { ...initialState },
            version: 0,
            lastModified: new Date(),
            locks: new Set(),
            previousData: { ...initialState }
        };
        this.states.set(executionId, state);
        // Persist to external storage if adapter is configured
        if (this.persistenceAdapter) {
            await this.persistenceAdapter.save(executionId, state);
        }
    }
    /**
     * Get current state data (returns a copy to prevent external modifications)
     * Requirement 11.2: WHEN nodes access state THEN they must see the current values
     */
    async getState(executionId) {
        let state = this.states.get(executionId);
        // Try to load from persistence if not in memory
        if (!state && this.persistenceAdapter) {
            const persistedState = await this.persistenceAdapter.load(executionId);
            if (persistedState) {
                // Restore locks as a new Set (since JSON doesn't preserve Sets)
                persistedState.locks = new Set(Array.from(persistedState.locks || []));
                this.states.set(executionId, persistedState);
                state = persistedState;
            }
        }
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        // Return a deep copy to prevent external modifications
        return JSON.parse(JSON.stringify(state.data));
    }
    /**
     * Update state atomically with optional key locking
     * Requirement 11.3: WHEN nodes modify state THEN changes must be atomic and consistent
     * Requirement 11.4: IF concurrent modifications occur THEN the system must handle them safely
     */
    async updateState(executionId, updates, lockKeys = []) {
        const state = this.states.get(executionId);
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        // Check for locked keys
        for (const key of Object.keys(updates)) {
            if (state.locks.has(key)) {
                throw new StateLockError(key);
            }
        }
        // Performance optimization: Check if batching is enabled and should be used
        if (this.enableBatching && lockKeys.length === 0) {
            return this.batchStateUpdate(executionId, updates);
        }
        // Lock specified keys during update
        if (lockKeys.length > 0) {
            const unlock = await this.lockKeys(executionId, lockKeys);
            try {
                await this.performStateUpdate(state, updates, executionId);
            }
            finally {
                unlock();
            }
        }
        else {
            await this.performStateUpdate(state, updates, executionId);
        }
    }
    async performStateUpdate(state, updates, executionId) {
        // Store previous data for diff detection
        const previousData = { ...state.data };
        // Emit before-update hook
        if (this.hookManager) {
            const hookContext = {
                eventType: 'state:before-update',
                workflowId: executionId,
                data: { updates, currentState: state.data },
                timestamp: new Date()
            };
            await this.hookManager.emit('state:before-update', hookContext);
        }
        // Apply updates atomically
        state.data = { ...state.data, ...updates };
        state.version++;
        state.lastModified = new Date();
        // Calculate and store diff
        const diff = this.calculateStateDiff(previousData, state.data);
        const changes = this.extractChanges(diff);
        // Update previous data for next diff
        state.previousData = { ...previousData };
        // Persist changes if adapter is configured
        if (this.persistenceAdapter) {
            await this.persistenceAdapter.save(executionId, state);
        }
        // Emit after-update hook
        if (this.hookManager) {
            const hookContext = {
                eventType: 'state:after-update',
                workflowId: executionId,
                data: { updates, diff, changes, newState: state.data },
                timestamp: new Date()
            };
            await this.hookManager.emit('state:after-update', hookContext);
        }
        // Trigger state watchers
        await this.triggerWatchers(executionId, changes);
    }
    /**
     * Lock specific state keys to prevent concurrent modifications
     * Returns an unlock function to release the locks
     */
    async lockKeys(executionId, keys) {
        const state = this.states.get(executionId);
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        // Check if any keys are already locked
        for (const key of keys) {
            if (state.locks.has(key)) {
                throw new StateLockError(key);
            }
        }
        // Lock all keys atomically
        keys.forEach(key => state.locks.add(key));
        // Return unlock function
        return () => {
            keys.forEach(key => state?.locks.delete(key));
        };
    }
    /**
     * Create a snapshot of the current state for rollback purposes
     * Implements Memento pattern as specified in design.md
     */
    async createSnapshot(executionId) {
        const currentState = await this.getState(executionId);
        const state = this.states.get(executionId);
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        const snapshot = {
            data: { ...currentState },
            version: state.version,
            timestamp: new Date()
        };
        // Store snapshot
        const snapshots = this.snapshots.get(executionId) || [];
        snapshots.push(snapshot);
        this.snapshots.set(executionId, snapshots);
        return snapshot.timestamp.toISOString();
    }
    /**
     * Rollback state to a specific snapshot
     */
    async rollback(executionId, snapshotId) {
        const snapshots = this.snapshots.get(executionId);
        const snapshot = snapshots?.find(s => s.timestamp.toISOString() === snapshotId);
        if (!snapshot) {
            throw new SnapshotNotFoundError(snapshotId);
        }
        const state = this.states.get(executionId);
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        // Replace state completely with snapshot data
        state.data = { ...snapshot.data };
        state.version++;
        state.lastModified = new Date();
        // Persist changes if adapter is configured
        if (this.persistenceAdapter) {
            await this.persistenceAdapter.save(executionId, state);
        }
    }
    /**
     * Get all snapshots for an execution
     */
    getSnapshots(executionId) {
        return this.snapshots.get(executionId) || [];
    }
    /**
     * Clear all snapshots for an execution (useful for cleanup)
     */
    clearSnapshots(executionId) {
        this.snapshots.delete(executionId);
    }
    /**
     * Set edge context data for the next node execution
     * Requirement 22.2: IF edge data is returned THEN it must be available in the next node's context
     */
    async setEdgeContext(executionId, edgeData) {
        await this.updateState(executionId, {
            _edgeContext: edgeData,
            _edgeContextTimestamp: new Date().toISOString()
        });
    }
    /**
     * Get and clear edge context data (consumed by next node)
     */
    async getAndClearEdgeContext(executionId) {
        const state = await this.getState(executionId);
        const edgeContext = state._edgeContext || null;
        if (edgeContext) {
            await this.updateState(executionId, {
                _edgeContext: undefined,
                _edgeContextTimestamp: undefined
            });
        }
        return edgeContext;
    }
    /**
     * Get state metadata (version, last modified, etc.)
     */
    getStateMetadata(executionId) {
        const state = this.states.get(executionId);
        if (!state) {
            return null;
        }
        return {
            version: state.version,
            lastModified: state.lastModified,
            lockedKeys: Array.from(state.locks)
        };
    }
    /**
     * Get the total number of active states (for monitoring)
     */
    get activeStateCount() {
        return this.states.size;
    }
    /**
     * Get all active execution IDs (for monitoring and debugging)
     */
    getActiveExecutions() {
        return Array.from(this.states.keys());
    }
    /**
     * Batch state updates for performance optimization
     */
    async batchStateUpdate(executionId, updates) {
        const existingBatch = this.batchedUpdates.get(executionId);
        const now = Date.now();
        if (existingBatch && (now - existingBatch.timestamp) < this.batchWindowMs) {
            // Merge with existing batch
            Object.assign(existingBatch.updates, updates);
            return Promise.resolve(); // Return immediately for batched updates
        }
        // Execute existing batch immediately if it exists
        if (existingBatch) {
            await this.executeBatchedUpdate(executionId, existingBatch.updates);
        }
        // For immediate execution if no batching window or first update
        const state = this.states.get(executionId);
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        // Start new batch
        this.batchedUpdates.set(executionId, {
            updates: { ...updates },
            timestamp: now
        });
        // Schedule execution after batch window
        setTimeout(async () => {
            try {
                const currentBatch = this.batchedUpdates.get(executionId);
                if (currentBatch && currentBatch.timestamp === now) {
                    await this.executeBatchedUpdate(executionId, currentBatch.updates);
                }
            }
            catch (error) {
                console.error('Error executing batched update:', error);
            }
        }, this.batchWindowMs);
        // For immediate synchronous behavior in tests, execute right away
        if (this.batchWindowMs <= 0) {
            await this.executeBatchedUpdate(executionId, updates);
        }
    }
    /**
     * Execute batched state updates
     */
    async executeBatchedUpdate(executionId, updates) {
        const state = this.states.get(executionId);
        if (!state) {
            return; // State might have been cleaned up
        }
        // Remove from batch queue
        this.batchedUpdates.delete(executionId);
        // Execute the actual update
        await this.performStateUpdate(state, updates, executionId);
    }
    /**
     * Calculate diff between two state objects with caching
     */
    calculateStateDiff(oldState, newState) {
        // Create hash for cache key
        const oldHash = this.createStateHash(oldState);
        const newHash = this.createStateHash(newState);
        const cacheKey = `${oldHash}-${newHash}`;
        // Check cache first
        const cached = this.diffCache.get(cacheKey);
        if (cached && cached.hash === cacheKey) {
            return cached.diff;
        }
        // Calculate diff
        const added = {};
        const updated = {};
        const removed = [];
        // Find added and updated keys
        for (const key in newState) {
            if (!(key in oldState)) {
                added[key] = newState[key];
            }
            else if (!this.deepEqual(oldState[key], newState[key])) {
                updated[key] = {
                    oldValue: oldState[key],
                    newValue: newState[key]
                };
            }
        }
        // Find removed keys
        for (const key in oldState) {
            if (!(key in newState)) {
                removed.push(key);
            }
        }
        const diff = {
            added,
            updated,
            removed,
            timestamp: new Date()
        };
        // Cache the result (with size limit)
        if (this.diffCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.diffCache.keys().next().value;
            if (firstKey !== undefined) {
                this.diffCache.delete(firstKey);
            }
        }
        this.diffCache.set(cacheKey, { hash: cacheKey, diff });
        return diff;
    }
    /**
     * Create a simple hash for state objects for caching
     */
    createStateHash(state) {
        const keys = Object.keys(state).sort();
        let hash = '';
        for (const key of keys) {
            const value = state[key];
            const valueStr = typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
            hash += `${key}:${valueStr.length}`;
        }
        return hash;
    }
    /**
     * Extract individual changes from a diff
     */
    extractChanges(diff) {
        const changes = [];
        // Added keys
        for (const [key, value] of Object.entries(diff.added)) {
            changes.push({
                key,
                oldValue: undefined,
                newValue: value,
                timestamp: diff.timestamp
            });
        }
        // Updated keys
        for (const [key, change] of Object.entries(diff.updated)) {
            changes.push({
                key,
                oldValue: change.oldValue,
                newValue: change.newValue,
                timestamp: diff.timestamp
            });
        }
        // Removed keys
        for (const key of diff.removed) {
            changes.push({
                key,
                oldValue: undefined, // We don't track the old value for removed keys
                newValue: undefined,
                timestamp: diff.timestamp
            });
        }
        return changes;
    }
    /**
     * Deep equality check for state comparison
     */
    deepEqual(a, b) {
        if (a === b)
            return true;
        if (a == null || b == null)
            return false;
        if (typeof a !== typeof b)
            return false;
        if (typeof a === 'object') {
            if (Array.isArray(a) !== Array.isArray(b))
                return false;
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length)
                return false;
            for (const key of keysA) {
                if (!keysB.includes(key))
                    return false;
                if (!this.deepEqual(a[key], b[key]))
                    return false;
            }
            return true;
        }
        return false;
    }
    /**
     * Register a state watcher for specific keys or all state changes
     */
    registerWatcher(watcher) {
        const id = `watcher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullWatcher = {
            ...watcher,
            id,
            enabled: watcher.enabled ?? true
        };
        this.watchers.set(id, fullWatcher);
        return id;
    }
    /**
     * Unregister a state watcher
     */
    unregisterWatcher(watcherId) {
        const removed = this.watchers.delete(watcherId);
        // Clear any pending debounce timer
        const timer = this.debounceTimers.get(watcherId);
        if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(watcherId);
        }
        return removed;
    }
    /**
     * Enable or disable a state watcher
     */
    setWatcherEnabled(watcherId, enabled) {
        const watcher = this.watchers.get(watcherId);
        if (watcher) {
            watcher.enabled = enabled;
            return true;
        }
        return false;
    }
    /**
     * Get all registered watchers for an execution
     */
    getWatchers(executionId) {
        const allWatchers = Array.from(this.watchers.values());
        return executionId
            ? allWatchers.filter(w => w.executionId === executionId)
            : allWatchers;
    }
    /**
     * Trigger state watchers for relevant changes
     */
    async triggerWatchers(executionId, changes) {
        const relevantWatchers = Array.from(this.watchers.values())
            .filter(w => w.enabled && w.executionId === executionId);
        for (const watcher of relevantWatchers) {
            try {
                // Filter changes based on watched keys
                const watchedChanges = this.filterChangesForWatcher(changes, watcher);
                if (watchedChanges.length === 0) {
                    continue;
                }
                // Apply condition filter if specified
                const filteredChanges = watcher.condition
                    ? watchedChanges.filter(watcher.condition)
                    : watchedChanges;
                if (filteredChanges.length === 0) {
                    continue;
                }
                // Handle debouncing
                if (watcher.debounceMs && watcher.debounceMs > 0) {
                    this.handleDebouncedWatcher(watcher, filteredChanges);
                }
                else {
                    // Execute immediately
                    await watcher.callback(filteredChanges);
                }
            }
            catch (error) {
                // Only log errors if not in test environment
                if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
                    console.error(`Error in state watcher ${watcher.id}:`, error);
                }
            }
        }
    }
    /**
     * Filter changes based on watcher's key configuration
     */
    filterChangesForWatcher(changes, watcher) {
        if (watcher.keys === '*') {
            return changes;
        }
        return changes.filter(change => watcher.keys.includes(change.key));
    }
    /**
     * Handle debounced watcher execution
     */
    handleDebouncedWatcher(watcher, changes) {
        // Clear existing timer
        const existingTimer = this.debounceTimers.get(watcher.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Set new timer
        const timer = setTimeout(async () => {
            try {
                await watcher.callback(changes);
            }
            catch (error) {
                // Only log errors if not in test environment
                if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
                    console.error(`Error in debounced state watcher ${watcher.id}:`, error);
                }
            }
            finally {
                this.debounceTimers.delete(watcher.id);
            }
        }, watcher.debounceMs);
        this.debounceTimers.set(watcher.id, timer);
    }
    /**
     * Create a conditional trigger that executes when specific state conditions are met
     */
    createStateTrigger(executionId, condition, action, options) {
        const watcherId = this.registerWatcher({
            executionId,
            keys: options?.keys || '*',
            callback: async (changes) => {
                // Apply the condition to the entire changes array
                if (condition(changes)) {
                    await action(changes);
                    // Remove watcher if it's a one-time trigger
                    if (options?.once) {
                        this.unregisterWatcher(watcherId);
                    }
                }
            },
            debounceMs: options?.debounceMs
        });
        return watcherId;
    }
    /**
     * Get the current diff for an execution (compared to previous state)
     */
    getCurrentDiff(executionId) {
        const state = this.states.get(executionId);
        if (!state || !state.previousData) {
            return null;
        }
        return this.calculateStateDiff(state.previousData, state.data);
    }
    /**
     * Clean up watchers and timers when execution completes
     */
    async cleanup(executionId) {
        // Remove all watchers for this execution
        const watchersToRemove = Array.from(this.watchers.entries())
            .filter(([_, watcher]) => watcher.executionId === executionId)
            .map(([id]) => id);
        for (const watcherId of watchersToRemove) {
            this.unregisterWatcher(watcherId);
        }
        // Clean up any pending batched updates
        this.batchedUpdates.delete(executionId);
        // Clean up caches related to this execution
        this.cleanupCacheForExecution(executionId);
        // Clean up state and snapshots
        this.states.delete(executionId);
        this.snapshots.delete(executionId);
        if (this.persistenceAdapter) {
            await this.persistenceAdapter.delete(executionId);
        }
    }
    /**
     * Clean up caches for a specific execution
     */
    cleanupCacheForExecution(executionId) {
        // Clean up change cache
        this.changeCache.delete(executionId);
        // Clean up diff cache entries related to this execution
        // Note: We can't easily identify which diff cache entries belong to which execution
        // So we'll periodically clean the entire cache if it gets too large
        if (this.diffCache.size > this.maxCacheSize * 2) {
            this.diffCache.clear();
        }
    }
    /**
     * Force flush all pending batched updates
     */
    async flushBatchedUpdates() {
        const batches = Array.from(this.batchedUpdates.entries());
        this.batchedUpdates.clear();
        for (const [executionId, batch] of batches) {
            try {
                await this.executeBatchedUpdate(executionId, batch.updates);
            }
            catch (error) {
                console.error(`Error flushing batched updates for ${executionId}:`, error);
            }
        }
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            activeStates: this.states.size,
            activeWatchers: this.watchers.size,
            cacheSize: this.diffCache.size,
            pendingBatches: this.batchedUpdates.size,
            activeDebouncers: this.debounceTimers.size
        };
    }
    /**
     * Clear all caches (useful for memory management)
     */
    clearCaches() {
        this.diffCache.clear();
        this.changeCache.clear();
    }
    /**
     * Configure performance settings at runtime
     */
    configurePerformance(options) {
        if (options.maxCacheSize !== undefined) {
            this.maxCacheSize = options.maxCacheSize;
        }
        if (options.batchWindowMs !== undefined) {
            this.batchWindowMs = options.batchWindowMs;
        }
        if (options.enableBatching !== undefined) {
            this.enableBatching = options.enableBatching;
            // If disabling batching, flush any pending updates
            if (!options.enableBatching) {
                this.flushBatchedUpdates().catch(console.error);
            }
        }
    }
    /**
     * Set a value at a nested path in the state (e.g., 'user.profile.name')
     * Creates intermediate objects as needed
     * Supports syntactic sugar for state setting: $.path.to.state
     */
    async setNestedPath(executionId, path, value) {
        const state = this.states.get(executionId);
        if (!state) {
            throw new StateNotFoundError(executionId);
        }
        // Parse the path into segments
        const segments = path.split('.').filter(seg => seg.length > 0);
        if (segments.length === 0) {
            throw new Error('Invalid state path: path cannot be empty');
        }
        // Get current state data (deep copy to avoid mutations)
        const currentData = { ...state.data };
        // Navigate to the parent object, creating intermediate objects as needed
        let current = currentData;
        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            // If the segment doesn't exist or isn't an object, create a new object
            if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
                current[segment] = {};
            }
            else {
                // Deep copy the nested object to avoid mutations
                current[segment] = { ...current[segment] };
            }
            current = current[segment];
        }
        // Set the final value
        const finalSegment = segments[segments.length - 1];
        current[finalSegment] = value;
        // Update the entire state atomically
        await this.updateState(executionId, currentData);
    }
    /**
     * Get a value from a nested path in the state
     * Returns undefined if the path doesn't exist
     */
    async getNestedPath(executionId, path) {
        const currentState = await this.getState(executionId);
        const segments = path.split('.').filter(seg => seg.length > 0);
        if (segments.length === 0) {
            return undefined;
        }
        let current = currentState;
        for (const segment of segments) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            current = current[segment];
        }
        return current;
    }
}
