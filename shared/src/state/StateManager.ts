/**
 * StateManager - Manages workflow execution state with atomic updates and snapshots
 * 
 * Implements Requirements:
 * - Requirement 11: Share data between nodes with atomic and consistent modifications
 * - Requirement 22: Enable edge functions to return context data
 */

export interface WorkflowState {
  data: Record<string, any>;
  version: number;
  lastModified: Date;
  locks: Set<string>;
}

export interface StateSnapshot {
  readonly data: Record<string, any>;
  readonly version: number;
  readonly timestamp: Date;
}

export interface StatePersistenceAdapter {
  save(executionId: string, state: WorkflowState): Promise<void>;
  load(executionId: string): Promise<WorkflowState | null>;
  delete(executionId: string): Promise<void>;
}

export class StateNotFoundError extends Error {
  constructor(public executionId: string) {
    super(`State not found for execution: ${executionId}`);
    this.name = 'StateNotFoundError';
  }
}

export class StateLockError extends Error {
  constructor(public key: string) {
    super(`State key is locked: ${key}`);
    this.name = 'StateLockError';
  }
}

export class SnapshotNotFoundError extends Error {
  constructor(public snapshotId: string) {
    super(`Snapshot not found: ${snapshotId}`);
    this.name = 'SnapshotNotFoundError';
  }
}

export class StateManager {
  private states: Map<string, WorkflowState> = new Map();
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private persistenceAdapter?: StatePersistenceAdapter;

  constructor(persistenceAdapter?: StatePersistenceAdapter) {
    this.persistenceAdapter = persistenceAdapter;
  }

  /**
   * Initialize workflow state with optional initial data
   * Requirement 11.1: WHEN initializing a workflow THEN it must set the initial state from the definition
   */
  async initialize(
    executionId: string,
    initialState: Record<string, any> = {}
  ): Promise<void> {
    if (this.states.has(executionId)) {
      throw new Error(`State already exists for execution: ${executionId}`);
    }

    const state: WorkflowState = {
      data: { ...initialState },
      version: 0,
      lastModified: new Date(),
      locks: new Set()
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
  async getState(executionId: string): Promise<Record<string, any>> {
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
  async updateState(
    executionId: string,
    updates: Record<string, any>,
    lockKeys: string[] = []
  ): Promise<void> {
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

    // Lock specified keys during update
    if (lockKeys.length > 0) {
      const unlock = await this.lockKeys(executionId, lockKeys);
      try {
        await this.performStateUpdate(state, updates, executionId);
      } finally {
        unlock();
      }
    } else {
      await this.performStateUpdate(state, updates, executionId);
    }
  }

  private async performStateUpdate(
    state: WorkflowState,
    updates: Record<string, any>,
    executionId: string
  ): Promise<void> {
    // Apply updates atomically
    state.data = { ...state.data, ...updates };
    state.version++;
    state.lastModified = new Date();

    // Persist changes if adapter is configured
    if (this.persistenceAdapter) {
      await this.persistenceAdapter.save(executionId, state);
    }
  }

  /**
   * Lock specific state keys to prevent concurrent modifications
   * Returns an unlock function to release the locks
   */
  async lockKeys(
    executionId: string,
    keys: string[]
  ): Promise<() => void> {
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
      keys.forEach(key => state.locks.delete(key));
    };
  }

  /**
   * Create a snapshot of the current state for rollback purposes
   * Implements Memento pattern as specified in design.md
   */
  async createSnapshot(executionId: string): Promise<string> {
    const currentState = await this.getState(executionId);
    const state = this.states.get(executionId);
    
    if (!state) {
      throw new StateNotFoundError(executionId);
    }

    const snapshot: StateSnapshot = {
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
  async rollback(executionId: string, snapshotId: string): Promise<void> {
    const snapshots = this.snapshots.get(executionId);
    const snapshot = snapshots?.find(
      s => s.timestamp.toISOString() === snapshotId
    );

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
  getSnapshots(executionId: string): StateSnapshot[] {
    return this.snapshots.get(executionId) || [];
  }

  /**
   * Clear all snapshots for an execution (useful for cleanup)
   */
  clearSnapshots(executionId: string): void {
    this.snapshots.delete(executionId);
  }

  /**
   * Set edge context data for the next node execution
   * Requirement 22.2: IF edge data is returned THEN it must be available in the next node's context
   */
  async setEdgeContext(
    executionId: string,
    edgeData: Record<string, any>
  ): Promise<void> {
    await this.updateState(executionId, {
      _edgeContext: edgeData,
      _edgeContextTimestamp: new Date().toISOString()
    });
  }

  /**
   * Get and clear edge context data (consumed by next node)
   */
  async getAndClearEdgeContext(executionId: string): Promise<Record<string, any> | null> {
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
  getStateMetadata(executionId: string): { version: number; lastModified: Date; lockedKeys: string[] } | null {
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
   * Clean up state and snapshots for completed executions
   */
  async cleanup(executionId: string): Promise<void> {
    this.states.delete(executionId);
    this.snapshots.delete(executionId);

    if (this.persistenceAdapter) {
      await this.persistenceAdapter.delete(executionId);
    }
  }

  /**
   * Get the total number of active states (for monitoring)
   */
  get activeStateCount(): number {
    return this.states.size;
  }

  /**
   * Get all active execution IDs (for monitoring and debugging)
   */
  getActiveExecutions(): string[] {
    return Array.from(this.states.keys());
  }
}