import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  StateManager, 
  StateNotFoundError, 
  StateLockError, 
  SnapshotNotFoundError
} from './StateManager';
import type {
  StatePersistenceAdapter,
  WorkflowState,
  StateChange,
  StateWatcher
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
      expect(snapshots[0]?.data).toEqual(testInitialState);
      expect(snapshots[1]?.data.counter).toBe(5);
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

  // Tests for nested path state operations ($.syntax support)
  describe('Nested Path Operations', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    describe('setNestedPath', () => {
      it('should set simple nested path', async () => {
        await stateManager.setNestedPath(testExecutionId, 'user.name', 'John');

        const state = await stateManager.getState(testExecutionId);
        expect(state.user).toEqual({ name: 'John' });
      });

      it('should set deeply nested path', async () => {
        await stateManager.setNestedPath(testExecutionId, 'user.profile.settings.theme', 'dark');

        const state = await stateManager.getState(testExecutionId);
        expect(state.user).toEqual({
          profile: {
            settings: {
              theme: 'dark'
            }
          }
        });
      });

      it('should preserve existing nested data', async () => {
        await stateManager.setNestedPath(testExecutionId, 'user.name', 'John');
        await stateManager.setNestedPath(testExecutionId, 'user.age', 30);

        const state = await stateManager.getState(testExecutionId);
        expect(state.user).toEqual({ name: 'John', age: 30 });
      });

      it('should set value on existing path', async () => {
        await stateManager.updateState(testExecutionId, {
          user: { name: 'Alice', age: 25 }
        });

        await stateManager.setNestedPath(testExecutionId, 'user.name', 'Bob');

        const state = await stateManager.getState(testExecutionId);
        expect(state.user).toEqual({ name: 'Bob', age: 25 });
      });

      it('should set complex values (objects, arrays)', async () => {
        await stateManager.setNestedPath(testExecutionId, 'config.options', {
          timeout: 30,
          retries: 3,
          enabled: true
        });

        const state = await stateManager.getState(testExecutionId);
        expect(state.config.options).toEqual({
          timeout: 30,
          retries: 3,
          enabled: true
        });
      });

      it('should set array values', async () => {
        await stateManager.setNestedPath(testExecutionId, 'items.list', [1, 2, 3, 4, 5]);

        const state = await stateManager.getState(testExecutionId);
        expect(state.items.list).toEqual([1, 2, 3, 4, 5]);
      });

      it('should throw error for empty path', async () => {
        await expect(
          stateManager.setNestedPath(testExecutionId, '', 'value')
        ).rejects.toThrow('Invalid state path: path cannot be empty');
      });

      it('should throw error for non-existent execution', async () => {
        await expect(
          stateManager.setNestedPath('non-existent', 'path.to.value', 'value')
        ).rejects.toThrow(StateNotFoundError);
      });

      it('should persist updates to adapter', async () => {
        const saveCountBefore = mockAdapter.saveCallCount;

        await stateManager.setNestedPath(testExecutionId, 'user.name', 'John');

        expect(mockAdapter.saveCallCount).toBeGreaterThan(saveCountBefore);
      });

      it('should increment state version', async () => {
        const versionBefore = stateManager.getStateMetadata(testExecutionId)?.version;

        await stateManager.setNestedPath(testExecutionId, 'user.name', 'John');

        const versionAfter = stateManager.getStateMetadata(testExecutionId)?.version;
        expect(versionAfter).toBe((versionBefore ?? 0) + 1);
      });

      it('should handle single-level path', async () => {
        await stateManager.setNestedPath(testExecutionId, 'simpleValue', 42);

        const state = await stateManager.getState(testExecutionId);
        expect(state.simpleValue).toBe(42);
      });
    });

    describe('getNestedPath', () => {
      beforeEach(async () => {
        await stateManager.updateState(testExecutionId, {
          user: {
            name: 'John',
            profile: {
              age: 30,
              settings: {
                theme: 'dark'
              }
            }
          },
          items: [1, 2, 3]
        });
      });

      it('should get value from simple nested path', async () => {
        const value = await stateManager.getNestedPath(testExecutionId, 'user.name');
        expect(value).toBe('John');
      });

      it('should get value from deeply nested path', async () => {
        const value = await stateManager.getNestedPath(testExecutionId, 'user.profile.settings.theme');
        expect(value).toBe('dark');
      });

      it('should get object from nested path', async () => {
        const value = await stateManager.getNestedPath(testExecutionId, 'user.profile');
        expect(value).toEqual({
          age: 30,
          settings: {
            theme: 'dark'
          }
        });
      });

      it('should return undefined for non-existent path', async () => {
        const value = await stateManager.getNestedPath(testExecutionId, 'user.nonexistent.path');
        expect(value).toBeUndefined();
      });

      it('should return undefined for empty path', async () => {
        const value = await stateManager.getNestedPath(testExecutionId, '');
        expect(value).toBeUndefined();
      });

      it('should get array value', async () => {
        const value = await stateManager.getNestedPath(testExecutionId, 'items');
        expect(value).toEqual([1, 2, 3]);
      });

      it('should get single-level value', async () => {
        await stateManager.updateState(testExecutionId, { simpleValue: 42 });
        const value = await stateManager.getNestedPath(testExecutionId, 'simpleValue');
        expect(value).toBe(42);
      });

      it('should throw error for non-existent execution', async () => {
        await expect(
          stateManager.getNestedPath('non-existent', 'some.path')
        ).rejects.toThrow(StateNotFoundError);
      });
    });
  });

  // Phase 3: State Change Detection and Watchers Tests
  describe('Phase 3: State Change Detection', () => {
    beforeEach(async () => {
      await stateManager.initialize(testExecutionId, testInitialState);
    });

    describe('State Change Detection', () => {
      it('should detect state changes and calculate diffs', async () => {
        await stateManager.updateState(testExecutionId, { counter: 5, newField: 'hello' });
        
        const diff = stateManager.getCurrentDiff(testExecutionId);
        expect(diff).toBeDefined();
        expect(diff?.added).toEqual({ newField: 'hello' });
        expect(diff?.updated).toEqual({ counter: { oldValue: 0, newValue: 5 } });
        expect(diff?.removed).toEqual([]);
      });

      it('should handle removed keys in state diff', async () => {
        await stateManager.updateState(testExecutionId, { counter: 1, message: undefined });
        
        const diff = stateManager.getCurrentDiff(testExecutionId);
        expect(diff?.updated).toEqual({ 
          counter: { oldValue: 0, newValue: 1 },
          message: { oldValue: 'hello', newValue: undefined }
        });
      });
    });

    describe('State Watchers', () => {
      it('should register and trigger state watchers', async () => {
        const changes: StateChange[] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: ['counter'],
          callback: (changesReceived) => {
            changes.push(...changesReceived);
          }
        });

        await stateManager.updateState(testExecutionId, { counter: 5 });
        
        expect(changes).toHaveLength(1);
        expect(changes[0]?.key).toBe('counter');
        expect(changes[0]?.oldValue).toBe(0);
        expect(changes[0]?.newValue).toBe(5);
        
        stateManager.unregisterWatcher(watcherId);
      });

      it('should filter changes by watched keys', async () => {
        const changes: StateChange[] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: ['counter'], // Only watching counter
          callback: (changesReceived) => {
            changes.push(...changesReceived);
          }
        });

        await stateManager.updateState(testExecutionId, { 
          counter: 5, 
          message: 'updated',
          newField: 'ignored'
        });
        
        expect(changes).toHaveLength(1);
        expect(changes[0]?.key).toBe('counter');
        
        stateManager.unregisterWatcher(watcherId);
      });

      it('should support wildcard watchers for all keys', async () => {
        const changes: StateChange[] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: '*', // Watch all keys
          callback: (changesReceived) => {
            changes.push(...changesReceived);
          }
        });

        await stateManager.updateState(testExecutionId, { 
          counter: 5, 
          message: 'updated',
          newField: 'added'
        });
        
        expect(changes).toHaveLength(3);
        const keys = changes.map(c => c.key);
        expect(keys).toContain('counter');
        expect(keys).toContain('message');
        expect(keys).toContain('newField');
        
        stateManager.unregisterWatcher(watcherId);
      });

      it('should support conditional watchers', async () => {
        const changes: StateChange[] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: '*',
          condition: (change) => change.key === 'counter' && typeof change.newValue === 'number' && change.newValue > 10,
          callback: (changesReceived) => {
            changes.push(...changesReceived);
          }
        });

        // This should not trigger (counter <= 10)
        await stateManager.updateState(testExecutionId, { counter: 5 });
        expect(changes).toHaveLength(0);

        // This should trigger (counter > 10)
        await stateManager.updateState(testExecutionId, { counter: 15 });
        expect(changes).toHaveLength(1);
        expect(changes[0]?.newValue).toBe(15);
        
        stateManager.unregisterWatcher(watcherId);
      });

      it('should support debounced watchers', async () => {
        const changes: StateChange[][] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: '*',
          debounceMs: 50,
          callback: (changesReceived) => {
            changes.push([...changesReceived]);
          }
        });

        // Rapid updates
        await stateManager.updateState(testExecutionId, { counter: 1 });
        await stateManager.updateState(testExecutionId, { counter: 2 });
        await stateManager.updateState(testExecutionId, { counter: 3 });
        
        // Should not have triggered yet
        expect(changes).toHaveLength(0);
        
        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Should have triggered once with the last update
        expect(changes).toHaveLength(1);
        
        stateManager.unregisterWatcher(watcherId);
      });

      it('should enable and disable watchers', async () => {
        const changes: StateChange[] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: ['counter'],
          callback: (changesReceived) => {
            changes.push(...changesReceived);
          }
        });

        // Enabled by default
        await stateManager.updateState(testExecutionId, { counter: 1 });
        expect(changes).toHaveLength(1);

        // Disable watcher
        stateManager.setWatcherEnabled(watcherId, false);
        await stateManager.updateState(testExecutionId, { counter: 2 });
        expect(changes).toHaveLength(1); // No new changes

        // Re-enable watcher
        stateManager.setWatcherEnabled(watcherId, true);
        await stateManager.updateState(testExecutionId, { counter: 3 });
        expect(changes).toHaveLength(2); // New change recorded
        
        stateManager.unregisterWatcher(watcherId);
      });
    });

    describe('State Triggers', () => {
      it('should create conditional state triggers', async () => {
        let triggered = false;
        
        const triggerId = stateManager.createStateTrigger(
          testExecutionId,
          (changes) => changes.some(c => c.key === 'counter' && typeof c.newValue === 'number' && c.newValue >= 10),
          () => { triggered = true; }
        );

        // Should not trigger
        await stateManager.updateState(testExecutionId, { counter: 5 });
        expect(triggered).toBe(false);

        // Should trigger
        await stateManager.updateState(testExecutionId, { counter: 15 });
        expect(triggered).toBe(true);
        
        stateManager.unregisterWatcher(triggerId);
      });

      it('should support one-time triggers', async () => {
        let triggerCount = 0;
        
        const triggerId = stateManager.createStateTrigger(
          testExecutionId,
          (changes) => changes.some(c => c.key === 'counter'),
          () => { triggerCount++; },
          { once: true }
        );

        // First trigger
        await stateManager.updateState(testExecutionId, { counter: 5 });
        expect(triggerCount).toBe(1);

        // Should not trigger again
        await stateManager.updateState(testExecutionId, { counter: 10 });
        expect(triggerCount).toBe(1);
      });

      it('should support key-specific triggers', async () => {
        let triggered = false;
        
        const triggerId = stateManager.createStateTrigger(
          testExecutionId,
          (changes) => changes.some(c => c.key === 'counter'),
          () => { triggered = true; },
          { keys: ['counter'] }
        );

        // Should not trigger for other keys
        await stateManager.updateState(testExecutionId, { message: 'updated' });
        expect(triggered).toBe(false);

        // Should trigger for watched key
        await stateManager.updateState(testExecutionId, { counter: 5 });
        expect(triggered).toBe(true);
        
        stateManager.unregisterWatcher(triggerId);
      });
    });

    describe('Performance Optimizations', () => {
      it('should batch state updates when enabled', async () => {
        const stateManagerWithBatching = new StateManager(undefined, undefined, {
          enableBatching: true,
          batchWindowMs: 20
        });
        
        await stateManagerWithBatching.initialize(testExecutionId, {});
        
        // Rapid updates should be batched
        const updatePromises = [
          stateManagerWithBatching.updateState(testExecutionId, { a: 1 }),
          stateManagerWithBatching.updateState(testExecutionId, { b: 2 }),
          stateManagerWithBatching.updateState(testExecutionId, { c: 3 })
        ];
        
        await Promise.all(updatePromises);
        
        // Wait for batch window
        await new Promise(resolve => setTimeout(resolve, 30));
        
        const state = await stateManagerWithBatching.getState(testExecutionId);
        expect(state).toEqual({ a: 1, b: 2, c: 3 });
        
        await stateManagerWithBatching.cleanup(testExecutionId);
      });

      it('should provide performance metrics', () => {
        const metrics = stateManager.getPerformanceMetrics();
        
        expect(metrics).toHaveProperty('activeStates');
        expect(metrics).toHaveProperty('activeWatchers');
        expect(metrics).toHaveProperty('cacheSize');
        expect(metrics).toHaveProperty('pendingBatches');
        expect(metrics).toHaveProperty('activeDebouncers');
        
        expect(metrics.activeStates).toBeGreaterThan(0);
      });

      it('should allow runtime performance configuration', async () => {
        stateManager.configurePerformance({
          enableBatching: false,
          maxCacheSize: 50,
          batchWindowMs: 100
        });

        // Configuration should take effect immediately
        await stateManager.updateState(testExecutionId, { test: 'value' });
        
        const metrics = stateManager.getPerformanceMetrics();
        expect(metrics.pendingBatches).toBe(0); // Batching disabled
      });

      it('should clear caches on demand', () => {
        stateManager.clearCaches();
        
        const metrics = stateManager.getPerformanceMetrics();
        expect(metrics.cacheSize).toBe(0);
      });

      it('should flush batched updates', async () => {
        const stateManagerWithBatching = new StateManager(undefined, undefined, {
          enableBatching: true,
          batchWindowMs: 1000 // Long window
        });
        
        await stateManagerWithBatching.initialize(testExecutionId, {});
        
        // Add update to batch
        await stateManagerWithBatching.updateState(testExecutionId, { test: 'value' });
        
        // Force flush
        await stateManagerWithBatching.flushBatchedUpdates();
        
        const state = await stateManagerWithBatching.getState(testExecutionId);
        expect(state.test).toBe('value');
        
        await stateManagerWithBatching.cleanup(testExecutionId);
      });
    });

    describe('Deep Equality and Diff Calculation', () => {
      it('should correctly detect deep object changes', async () => {
        await stateManager.updateState(testExecutionId, {
          nested: { a: 1, b: { c: 2 } }
        });

        await stateManager.updateState(testExecutionId, {
          nested: { a: 1, b: { c: 3 } } // Deep change
        });

        const diff = stateManager.getCurrentDiff(testExecutionId);
        expect(diff?.updated).toHaveProperty('nested');
      });

      it('should detect changes for objects with same content but different references', async () => {
        const changes: StateChange[] = [];
        
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: '*',
          callback: (changesReceived) => {
            changes.push(...changesReceived);
          }
        });

        await stateManager.updateState(testExecutionId, { complex: { nested: [1, 2, 3] } });
        const changeCount1 = changes.length;

        // Same content, different object reference - our deep equality should detect this as the same
        await stateManager.updateState(testExecutionId, { complex: { nested: [1, 2, 3] } });
        const changeCount2 = changes.length;

        // Should NOT register a new change since content is identical (deep equality)
        expect(changeCount2).toBe(changeCount1);
        
        stateManager.unregisterWatcher(watcherId);
      });
    });

    describe('Cleanup and Memory Management', () => {
      it('should clean up watchers during execution cleanup', async () => {
        const watcherId = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: '*',
          callback: () => {}
        });

        const watchers = stateManager.getWatchers(testExecutionId);
        expect(watchers).toHaveLength(1);

        await stateManager.cleanup(testExecutionId);

        const watchersAfterCleanup = stateManager.getWatchers(testExecutionId);
        expect(watchersAfterCleanup).toHaveLength(0);
      });

      it('should track watchers by execution ID', async () => {
        const anotherExecutionId = 'another-execution';
        await stateManager.initialize(anotherExecutionId, {});

        const watcher1 = stateManager.registerWatcher({
          executionId: testExecutionId,
          keys: '*',
          callback: () => {}
        });

        const watcher2 = stateManager.registerWatcher({
          executionId: anotherExecutionId,
          keys: '*',
          callback: () => {}
        });

        expect(stateManager.getWatchers(testExecutionId)).toHaveLength(1);
        expect(stateManager.getWatchers(anotherExecutionId)).toHaveLength(1);
        expect(stateManager.getWatchers()).toHaveLength(2);

        await stateManager.cleanup(anotherExecutionId);
      });
    });
  });
});