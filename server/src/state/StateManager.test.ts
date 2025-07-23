import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  StateManager, 
  StateNotFoundError, 
  StateLockError, 
  SnapshotNotFoundError,
  StatePersistenceAdapter,
  WorkflowState
} from './StateManager';

// Mock persistence adapter for testing
class MockPersistenceAdapter implements StatePersistenceAdapter {
  private storage: Map<string, WorkflowState> = new Map();
  public saveCallCount = 0;
  public loadCallCount = 0;
  public deleteCallCount = 0;

  async save(executionId: string, state: WorkflowState): Promise<void> {
    this.saveCallCount++;
    // Serialize and deserialize to simulate real persistence
    const serialized = JSON.stringify({
      ...state,
      locks: Array.from(state.locks),
      lastModified: state.lastModified.toISOString()
    });
    const deserialized = JSON.parse(serialized);
    deserialized.locks = new Set(deserialized.locks);
    deserialized.lastModified = new Date(deserialized.lastModified);
    this.storage.set(executionId, deserialized);
  }

  async load(executionId: string): Promise<WorkflowState | null> {
    this.loadCallCount++;
    return this.storage.get(executionId) || null;
  }

  async delete(executionId: string): Promise<void> {
    this.deleteCallCount++;
    this.storage.delete(executionId);
  }

  clear(): void {
    this.storage.clear();
    this.saveCallCount = 0;
    this.loadCallCount = 0;
    this.deleteCallCount = 0;
  }
}

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockAdapter: MockPersistenceAdapter;
  const testExecutionId = 'test-execution-123';
  const testInitialState = { counter: 0, message: 'hello' };

  beforeEach(() => {
    mockAdapter = new MockPersistenceAdapter();
    stateManager = new StateManager(mockAdapter);
  });

  describe('initialization', () => {
    it('should initialize state with empty initial data', async () => {
      await stateManager.initialize(testExecutionId);
      
      const state = await stateManager.getState(testExecutionId);
      expect(state).toEqual({});
      
      const metadata = stateManager.getStateMetadata(testExecutionId);
      expect(metadata?.version).toBe(0);
      expect(metadata?.lockedKeys).toEqual([]);
      expect(mockAdapter.saveCallCount).toBe(1);
    });

    it('should initialize state with provided initial data', async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
      
      const state = await stateManager.getState(testExecutionId);
      expect(state).toEqual(testInitialState);
      expect(mockAdapter.saveCallCount).toBe(1);
    });

    it('should throw error if state already exists for execution', async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
      
      await expect(
        stateManager.initialize(testExecutionId, { other: 'data' })
      ).rejects.toThrow(`State already exists for execution: ${testExecutionId}`);
    });

    it('should work without persistence adapter', async () => {
      const stateManagerNoPersistence = new StateManager();
      await stateManagerNoPersistence.initialize(testExecutionId, testInitialState);
      
      const state = await stateManagerNoPersistence.getState(testExecutionId);
      expect(state).toEqual(testInitialState);
    });
  });

  describe('state retrieval', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    it('should return a deep copy of state data', async () => {
      const state = await stateManager.getState(testExecutionId);
      
      // Modify returned state
      state.counter = 999;
      state.newField = 'should not affect original';
      
      // Original state should be unchanged
      const originalState = await stateManager.getState(testExecutionId);
      expect(originalState.counter).toBe(0);
      expect(originalState.newField).toBeUndefined();
    });

    it('should throw StateNotFoundError for non-existent execution', async () => {
      await expect(
        stateManager.getState('non-existent-id')
      ).rejects.toThrow(StateNotFoundError);
    });

    it('should load state from persistence if not in memory', async () => {
      // Save state to persistence and clear from memory
      await stateManager.updateState(testExecutionId, { updated: true });
      const stateManagerNew = new StateManager(mockAdapter);
      
      const state = await stateManagerNew.getState(testExecutionId);
      expect(state.counter).toBe(0);
      expect(state.updated).toBe(true);
      expect(mockAdapter.loadCallCount).toBe(1);
    });
  });

  describe('state updates', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    it('should update state atomically', async () => {
      const updates = { counter: 5, newField: 'added' };
      await stateManager.updateState(testExecutionId, updates);
      
      const state = await stateManager.getState(testExecutionId);
      expect(state.counter).toBe(5);
      expect(state.newField).toBe('added');
      expect(state.message).toBe('hello'); // Original field preserved
      
      const metadata = stateManager.getStateMetadata(testExecutionId);
      expect(metadata?.version).toBe(1);
    });

    it('should increment version on each update', async () => {
      await stateManager.updateState(testExecutionId, { counter: 1 });
      expect(stateManager.getStateMetadata(testExecutionId)?.version).toBe(1);
      
      await stateManager.updateState(testExecutionId, { counter: 2 });
      expect(stateManager.getStateMetadata(testExecutionId)?.version).toBe(2);
      
      await stateManager.updateState(testExecutionId, { counter: 3 });
      expect(stateManager.getStateMetadata(testExecutionId)?.version).toBe(3);
    });

    it('should persist updates if adapter is configured', async () => {
      await stateManager.updateState(testExecutionId, { counter: 10 });
      expect(mockAdapter.saveCallCount).toBe(2); // Initial + update
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        stateManager.updateState('non-existent', { data: 'test' })
      ).rejects.toThrow(StateNotFoundError);
    });
  });

  describe('state locking', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    it('should lock and unlock keys successfully', async () => {
      const unlock = await stateManager.lockKeys(testExecutionId, ['counter', 'message']);
      
      const metadata = stateManager.getStateMetadata(testExecutionId);
      expect(metadata?.lockedKeys).toEqual(['counter', 'message']);
      
      unlock();
      
      const metadataAfterUnlock = stateManager.getStateMetadata(testExecutionId);
      expect(metadataAfterUnlock?.lockedKeys).toEqual([]);
    });

    it('should prevent updates to locked keys', async () => {
      const unlock = await stateManager.lockKeys(testExecutionId, ['counter']);
      
      await expect(
        stateManager.updateState(testExecutionId, { counter: 10 })
      ).rejects.toThrow(StateLockError);
      
      unlock();
      
      // Should work after unlocking
      await stateManager.updateState(testExecutionId, { counter: 10 });
      const state = await stateManager.getState(testExecutionId);
      expect(state.counter).toBe(10);
    });

    it('should prevent locking already locked keys', async () => {
      await stateManager.lockKeys(testExecutionId, ['counter']);
      
      await expect(
        stateManager.lockKeys(testExecutionId, ['counter'])
      ).rejects.toThrow(StateLockError);
    });

    it('should allow updates with lockKeys parameter', async () => {
      await stateManager.updateState(
        testExecutionId, 
        { counter: 15, message: 'updated' }, 
        ['counter', 'message']
      );
      
      const state = await stateManager.getState(testExecutionId);
      expect(state.counter).toBe(15);
      expect(state.message).toBe('updated');
      
      // Keys should be unlocked after update
      const metadata = stateManager.getStateMetadata(testExecutionId);
      expect(metadata?.lockedKeys).toEqual([]);
    });
  });

  describe('snapshots', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    it('should create snapshots successfully', async () => {
      const snapshotId1 = await stateManager.createSnapshot(testExecutionId);
      expect(snapshotId1).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      
      await stateManager.updateState(testExecutionId, { counter: 5 });
      const snapshotId2 = await stateManager.createSnapshot(testExecutionId);
      
      const snapshots = stateManager.getSnapshots(testExecutionId);
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].data).toEqual(testInitialState);
      expect(snapshots[1].data.counter).toBe(5);
    });

    it('should rollback to snapshots successfully', async () => {
      const snapshotId = await stateManager.createSnapshot(testExecutionId);
      
      await stateManager.updateState(testExecutionId, { counter: 100, newField: 'added' });
      let state = await stateManager.getState(testExecutionId);
      expect(state.counter).toBe(100);
      expect(state.newField).toBe('added');
      
      await stateManager.rollback(testExecutionId, snapshotId);
      state = await stateManager.getState(testExecutionId);
      expect(state).toEqual(testInitialState);
    });

    it('should throw error for non-existent snapshot', async () => {
      await expect(
        stateManager.rollback(testExecutionId, 'non-existent-snapshot')
      ).rejects.toThrow(SnapshotNotFoundError);
    });

    it('should clear snapshots successfully', async () => {
      await stateManager.createSnapshot(testExecutionId);
      await stateManager.createSnapshot(testExecutionId);
      
      expect(stateManager.getSnapshots(testExecutionId)).toHaveLength(2);
      
      stateManager.clearSnapshots(testExecutionId);
      expect(stateManager.getSnapshots(testExecutionId)).toHaveLength(0);
    });
  });

  describe('edge context', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    it('should set and get edge context data', async () => {
      const edgeData = { result: 'success', data: { id: 123 } };
      
      await stateManager.setEdgeContext(testExecutionId, edgeData);
      const retrievedData = await stateManager.getAndClearEdgeContext(testExecutionId);
      
      expect(retrievedData).toEqual(edgeData);
    });

    it('should clear edge context after retrieval', async () => {
      const edgeData = { result: 'success' };
      
      await stateManager.setEdgeContext(testExecutionId, edgeData);
      await stateManager.getAndClearEdgeContext(testExecutionId);
      
      const secondRetrieval = await stateManager.getAndClearEdgeContext(testExecutionId);
      expect(secondRetrieval).toBeNull();
    });

    it('should return null if no edge context exists', async () => {
      const edgeData = await stateManager.getAndClearEdgeContext(testExecutionId);
      expect(edgeData).toBeNull();
    });
  });

  describe('monitoring and cleanup', () => {
    it('should track active state count', async () => {
      expect(stateManager.activeStateCount).toBe(0);
      
      await stateManager.initialize('exec-1', {});
      expect(stateManager.activeStateCount).toBe(1);
      
      await stateManager.initialize('exec-2', {});
      expect(stateManager.activeStateCount).toBe(2);
      
      await stateManager.cleanup('exec-1');
      expect(stateManager.activeStateCount).toBe(1);
    });

    it('should return active execution IDs', async () => {
      await stateManager.initialize('exec-1', {});
      await stateManager.initialize('exec-2', {});
      
      const activeExecutions = stateManager.getActiveExecutions();
      expect(activeExecutions).toEqual(['exec-1', 'exec-2']);
    });

    it('should cleanup state and snapshots', async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
      await stateManager.createSnapshot(testExecutionId);
      
      expect(stateManager.activeStateCount).toBe(1);
      expect(stateManager.getSnapshots(testExecutionId)).toHaveLength(1);
      
      await stateManager.cleanup(testExecutionId);
      
      expect(stateManager.activeStateCount).toBe(0);
      expect(stateManager.getSnapshots(testExecutionId)).toHaveLength(0);
      expect(mockAdapter.deleteCallCount).toBe(1);
    });

    it('should return null metadata for non-existent execution', () => {
      const metadata = stateManager.getStateMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('persistence adapter integration', () => {
    it('should work correctly without persistence adapter', async () => {
      const stateManagerNoPersistence = new StateManager();
      
      await stateManagerNoPersistence.initialize(testExecutionId, testInitialState);
      await stateManagerNoPersistence.updateState(testExecutionId, { counter: 5 });
      
      const state = await stateManagerNoPersistence.getState(testExecutionId);
      expect(state.counter).toBe(5);
    });

    it('should handle persistence adapter errors gracefully', async () => {
      const failingAdapter: StatePersistenceAdapter = {
        save: vi.fn().mockRejectedValue(new Error('Persistence failed')),
        load: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(undefined)
      };

      const stateManagerWithFailingAdapter = new StateManager(failingAdapter);
      
      // Should throw persistence errors during initialization
      await expect(
        stateManagerWithFailingAdapter.initialize(testExecutionId, testInitialState)
      ).rejects.toThrow('Persistence failed');
      
      // Should throw persistence errors during updates
      const workingAdapter: StatePersistenceAdapter = {
        save: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(null), 
        delete: vi.fn().mockResolvedValue(undefined)
      };
      
      const workingStateManager = new StateManager(workingAdapter);
      await workingStateManager.initialize('test-exec', testInitialState);
      
      // Now switch to failing adapter for update test
      (workingStateManager as any).persistenceAdapter = failingAdapter;
      
      await expect(
        workingStateManager.updateState('test-exec', { counter: 5 })
      ).rejects.toThrow('Persistence failed');
    });

    it('should restore locks correctly from persistence', async () => {
      // Create state with locks
      await stateManager.initialize(testExecutionId, testInitialState);
      const unlock = await stateManager.lockKeys(testExecutionId, ['counter']);
      
      // Create new state manager with same adapter
      const newStateManager = new StateManager(mockAdapter);
      
      // Should be able to load state but locks are not persisted (by design)
      const state = await newStateManager.getState(testExecutionId);
      expect(state).toEqual(testInitialState);
      
      unlock(); // Clean up
    });
  });

  describe('error conditions', () => {
    it('should handle concurrent lock attempts correctly', async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
      
      // Lock a key
      const unlock1 = await stateManager.lockKeys(testExecutionId, ['counter']);
      
      // Try to lock same key - should fail
      await expect(
        stateManager.lockKeys(testExecutionId, ['counter'])
      ).rejects.toThrow(StateLockError);
      
      unlock1();
      
      // Should work after unlock
      const unlock2 = await stateManager.lockKeys(testExecutionId, ['counter']);
      unlock2();
    });

    it('should handle state updates during active locks', async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
      
      const unlock = await stateManager.lockKeys(testExecutionId, ['counter']);
      
      // Update non-locked key should work
      await stateManager.updateState(testExecutionId, { message: 'updated' });
      
      // Update locked key should fail
      await expect(
        stateManager.updateState(testExecutionId, { counter: 10 })
      ).rejects.toThrow(StateLockError);
      
      unlock();
      
      const state = await stateManager.getState(testExecutionId);
      expect(state.message).toBe('updated');
      expect(state.counter).toBe(0); // Should remain unchanged
    });
  });
});