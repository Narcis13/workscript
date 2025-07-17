import { EventEmitter } from 'events';

/**
 * StateManager class responsible for managing workflow execution state
 * Provides thread-safe operations for state initialization, retrieval, updates, and cleanup
 */
export class StateManager extends EventEmitter {
  private states: Map<string, Record<string, any>>;
  private locks: Map<string, Promise<void>>;
  private cleanupTimeouts: Map<string, NodeJS.Timeout>;
  private readonly defaultCleanupDelay: number = 3600000; // 1 hour

  constructor(cleanupDelay?: number) {
    super();
    this.states = new Map();
    this.locks = new Map();
    this.cleanupTimeouts = new Map();
    if (cleanupDelay !== undefined) {
      this.defaultCleanupDelay = cleanupDelay;
    }
  }

  /**
   * Initializes state for a new workflow execution
   * @param executionId - Unique identifier for the execution
   * @param initialState - Optional initial state values
   * @throws Error if execution ID already exists
   */
  async initialize(executionId: string, initialState?: Record<string, any>): Promise<void> {
    await this.withLock(executionId, async () => {
      if (this.states.has(executionId)) {
        throw new Error(`State already exists for execution: ${executionId}`);
      }

      // Deep clone the initial state to prevent external mutations
      const state = initialState ? this.deepClone(initialState) : {};
      this.states.set(executionId, state);
      
      this.emit('stateInitialized', { executionId, state });
    });
  }

  /**
   * Retrieves the current state for an execution
   * @param executionId - Unique identifier for the execution
   * @returns Deep clone of the current state
   * @throws Error if execution ID doesn't exist
   */
  async get(executionId: string): Promise<Record<string, any>> {
    return await this.withLock(executionId, async () => {
      const state = this.states.get(executionId);
      if (!state) {
        throw new Error(`No state found for execution: ${executionId}`);
      }

      // Return a deep clone to prevent external mutations
      return this.deepClone(state);
    });
  }

  /**
   * Updates the state for an execution
   * Merges updates with existing state
   * @param executionId - Unique identifier for the execution
   * @param updates - State updates to apply
   * @throws Error if execution ID doesn't exist
   */
  async update(executionId: string, updates: Record<string, any>): Promise<void> {
    await this.withLock(executionId, async () => {
      const state = this.states.get(executionId);
      if (!state) {
        throw new Error(`No state found for execution: ${executionId}`);
      }

      // Deep merge updates with existing state
      const updatedState = this.deepMerge(state, updates);
      this.states.set(executionId, updatedState);
      
      this.emit('stateUpdated', { executionId, updates, state: updatedState });
    });
  }

  /**
   * Retrieves a specific property from the state
   * @param executionId - Unique identifier for the execution
   * @param key - Property key to retrieve
   * @returns The value of the property or undefined
   */
  async getProperty(executionId: string, key: string): Promise<any> {
    const state = await this.get(executionId);
    return state[key];
  }

  /**
   * Updates a specific property in the state
   * @param executionId - Unique identifier for the execution
   * @param key - Property key to update
   * @param value - New value for the property
   */
  async setProperty(executionId: string, key: string, value: any): Promise<void> {
    await this.update(executionId, { [key]: value });
  }

  /**
   * Removes state for a completed execution
   * @param executionId - Unique identifier for the execution
   */
  async cleanup(executionId: string): Promise<void> {
    await this.withLock(executionId, async () => {
      // Cancel any pending cleanup timeout
      const timeout = this.cleanupTimeouts.get(executionId);
      if (timeout) {
        clearTimeout(timeout);
        this.cleanupTimeouts.delete(executionId);
      }

      this.states.delete(executionId);
      this.emit('stateCleanedUp', { executionId });
    });

    // Clean up the lock after state is removed
    this.locks.delete(executionId);
  }

  /**
   * Schedules automatic cleanup for an execution after a delay
   * @param executionId - Unique identifier for the execution
   * @param delay - Delay in milliseconds before cleanup (defaults to 1 hour)
   */
  scheduleCleanup(executionId: string, delay?: number): void {
    const cleanupDelay = delay ?? this.defaultCleanupDelay;
    
    // Cancel any existing cleanup timeout
    const existingTimeout = this.cleanupTimeouts.get(executionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new cleanup
    const timeout = setTimeout(() => {
      this.cleanup(executionId).catch(error => {
        this.emit('cleanupError', { executionId, error });
      });
    }, cleanupDelay);

    this.cleanupTimeouts.set(executionId, timeout);
  }

  /**
   * Checks if state exists for an execution
   * @param executionId - Unique identifier for the execution
   * @returns True if state exists
   */
  has(executionId: string): boolean {
    return this.states.has(executionId);
  }

  /**
   * Gets the number of active execution states
   * @returns Number of active states
   */
  size(): number {
    return this.states.size;
  }

  /**
   * Clears all states and cancels all cleanup timeouts
   * Useful for testing or shutdown
   */
  clear(): void {
    // Cancel all cleanup timeouts
    for (const timeout of this.cleanupTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.states.clear();
    this.locks.clear();
    this.cleanupTimeouts.clear();
    
    this.emit('allStatesCleared');
  }

  /**
   * Executes an operation with a lock for thread safety
   * @param executionId - Unique identifier for the execution
   * @param operation - Async operation to execute
   * @returns Result of the operation
   */
  private async withLock<T>(executionId: string, operation: () => Promise<T>): Promise<T> {
    // Wait for any existing lock to be released
    const existingLock = this.locks.get(executionId);
    if (existingLock) {
      await existingLock;
    }

    // Create a new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.locks.set(executionId, lockPromise);

    try {
      // Execute the operation
      return await operation();
    } finally {
      // Release the lock
      releaseLock!();
      
      // Remove the lock if no state exists (cleanup case)
      if (!this.states.has(executionId)) {
        this.locks.delete(executionId);
      }
    }
  }

  /**
   * Deep clones an object to prevent mutations
   * @param obj - Object to clone
   * @returns Deep clone of the object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (obj instanceof Object) {
      const clonedObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * Deep merges two objects
   * @param target - Target object
   * @param source - Source object to merge
   * @returns New merged object
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = this.deepClone(target);

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (sourceValue === null || sourceValue === undefined) {
          result[key] = sourceValue;
        } else if (typeof sourceValue === 'object' && !Array.isArray(sourceValue) && 
                   typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          // Recursively merge objects
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          // Replace primitive values and arrays
          result[key] = this.deepClone(sourceValue);
        }
      }
    }

    return result;
  }
}

// Export a singleton instance for global use
export const stateManager = new StateManager();