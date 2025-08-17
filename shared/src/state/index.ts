export {
  StateManager,
  type WorkflowState,
  type StateSnapshot,
  type StatePersistenceAdapter,
  StateNotFoundError,
  StateLockError,
  SnapshotNotFoundError,
  type StateChange,
  type StateDiff,
  type StateWatcher
} from './StateManager';