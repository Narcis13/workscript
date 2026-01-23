# Testing Patterns

**Analysis Date:** 2026-01-23

## Test Framework

**Runner:**
- Vitest 3.2.x
- Config file: `apps/frontend/vitest.config.ts` (example, similar across packages)

**Assertion Library:**
- Vitest built-in assertions (chai-based)
- Uses `expect()` for all assertions

**Run Commands:**
```bash
# All tests across monorepo
bun run test              # Runs test:engine && test:nodes && test:api

# Per-package
bun run test:engine       # Run engine tests
bun run test:nodes        # Run nodes tests
bun run test:api          # Run API tests
bun run test:frontend     # Run frontend tests

# Single file from package directory
cd packages/engine && bun test src/state/StateManager.test.ts
cd packages/nodes && bun test src/data/FilterNode.test.ts

# Watch mode
bun test --watch
```

## Test File Organization

**Location:**
- Co-located with implementation: `MyFile.ts` → `MyFile.test.ts`
- Integration tests: `MyFile.integration.test.ts`
- Demo/example tests: `MyFile.demo.test.ts`
- Examples:
  - `packages/engine/src/state/StateManager.ts` → `StateManager.test.ts`
  - `packages/engine/src/state/StateResolver.integration.test.ts` (integration tests)
  - `packages/engine/src/engine/ExecutionEngine.test.ts`, `ExecutionEngine.ast.test.ts`
  - `packages/nodes/src/data/FilterNode.test.ts`

**Naming:**
- Test files: `{ComponentName}.test.ts`
- Integration tests: `{ComponentName}.integration.test.ts`
- Pattern tests: `{ComponentName}.pattern.test.ts` or similar
- All test files end with `.test.ts` or `.test.tsx` for Vitest discovery

**Structure:**
```
packages/engine/
├── src/
│   ├── engine/
│   │   ├── ExecutionEngine.ts
│   │   ├── ExecutionEngine.test.ts
│   │   ├── ExecutionEngine.ast.test.ts
│   │   └── index.ts
│   ├── state/
│   │   ├── StateManager.ts
│   │   ├── StateManager.test.ts
│   │   ├── StateResolver.ts
│   │   ├── StateResolver.test.ts
│   │   ├── StateResolver.integration.test.ts
│   │   └── StateResolver.demo.test.ts
│   └── ...
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FilterNode } from './FilterNode'
import type { ExecutionContext } from '@workscript/engine'

describe('FilterNode', () => {
  let node: FilterNode
  let context: ExecutionContext

  beforeEach(() => {
    node = new FilterNode()
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'filter-test',
      executionId: 'test-exec-123'
    }
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('filter')
      expect(node.metadata.name).toBe('Filter')
    })
  })

  describe('validation', () => {
    it('should return error for missing items', async () => {
      const result = await node.execute(context, { /* config */ })
      expect(result.error).toBeDefined()
    })
  })
})
```

**Patterns:**
- **Setup pattern:** Use `beforeEach()` to initialize node instance and mock ExecutionContext
- **Teardown pattern:** Not explicitly used; state cleaned between tests via `beforeEach()`
- **Assertion pattern:** Use `expect()` with chain methods: `expect(value).toBe()`, `expect(array).toHaveLength()`, `expect(fn).rejects.toThrow()`

## Mocking

**Framework:** Vitest's built-in `vi` module for mocking

**Patterns:**
```typescript
// Mock adapter pattern (StateManager tests)
class MockPersistenceAdapter implements StatePersistenceAdapter {
  private storage: Map<string, WorkflowState> = new Map()
  public saveCallCount = 0

  async save(executionId: string, state: WorkflowState): Promise<void> {
    this.saveCallCount++
    // Implementation
  }

  async load(executionId: string): Promise<WorkflowState | null> {
    this.loadCallCount++
    return this.storage.get(executionId) || null
  }

  clear(): void {
    this.storage.clear()
    this.saveCallCount = 0
  }
}
```

**Mock usage in tests:**
```typescript
let mockAdapter: MockPersistenceAdapter

beforeEach(() => {
  mockAdapter = new MockPersistenceAdapter()
  stateManager = new StateManager(mockAdapter)
})

// Assert on mock calls
expect(mockAdapter.saveCallCount).toBe(1)
```

**Vitest vi mocking for functions:**
```typescript
import { vi } from 'vitest'

const failingAdapter: StatePersistenceAdapter = {
  save: vi.fn().mockRejectedValue(new Error('Persistence failed')),
  load: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined)
}

// Test error handling
await expect(stateManager.initialize(testExecutionId, testInitialState))
  .rejects.toThrow('Persistence failed')
```

**What to Mock:**
- External dependencies (adapters, services, APIs)
- File system operations
- Network calls
- Time-based operations (use `vi.useFakeTimers()`)

**What NOT to Mock:**
- Core business logic being tested
- Internal state management
- The node being tested itself
- Actual ExecutionContext (create a real one with test data)

## Fixtures and Factories

**Test Data:**
Test data is defined inline in test suites as local constants:

```typescript
// String filter test data
const items = [
  { name: 'Product A', description: 'Great product' },
  { name: 'Product B', description: 'Another great item' },
  { name: 'Item C', description: '' }
]

// Number filter test data
const items = [
  { name: 'Product A', price: 25.99, stock: 10 },
  { name: 'Product B', price: 15.50, stock: 0 },
  { name: 'Product C', price: 45.00, stock: 5 }
]
```

**Location:**
- Inline within describe blocks (preferred)
- No separate fixture files detected
- Data defined close to where it's used for clarity

**Factory patterns for ExecutionContext:**
```typescript
// Standard factory in beforeEach
beforeEach(() => {
  context = {
    state: {},
    inputs: {},
    workflowId: 'test-workflow',
    nodeId: 'filter-test',
    executionId: 'test-exec-123'
  }
})
```

## Coverage

**Requirements:** No coverage targets enforced (based on lack of coverage config in vitest.config.ts)

**View Coverage:**
```bash
# Not configured by default, but Vitest supports:
bun test --coverage
```

**Coverage configuration:** Not present; add to vitest.config.ts if needed:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/']
    }
  }
})
```

## Test Types

**Unit Tests:**
- Scope: Single node or service in isolation
- Approach: Mock all dependencies, test single method or class
- Example: `FilterNode.test.ts` - tests the FilterNode execute method with various filter conditions
- Coverage: Input validation, business logic, edge cases, error conditions
- Pattern: `describe('FilterNode', () => { describe('validation', () => { ... }) })`

**Integration Tests:**
- Scope: Multiple components working together
- Approach: Real implementations, fewer mocks, test end-to-end workflows
- Examples:
  - `StateResolver.integration.test.ts` - Tests StateResolver with real StateManager
  - `HookManager.integration.test.ts` - Tests HookManager with ExecutionEngine
  - `ExecutionEngine.ast.test.ts` - Tests parsing and execution together
- Pattern: Named `.integration.test.ts`, may use more complex setup

**E2E Tests:**
- Framework: Not used
- Status: Not configured

## Common Patterns

**Async Testing:**
```typescript
// Using async/await with try-catch
it('should update state atomically', async () => {
  const updates = { counter: 5, newField: 'added' }
  await stateManager.updateState(testExecutionId, updates)

  const state = await stateManager.getState(testExecutionId)
  expect(state.counter).toBe(5)
})

// Using .rejects.toThrow() for error cases
it('should throw error for non-existent execution', async () => {
  await expect(
    stateManager.getState('non-existent-id')
  ).rejects.toThrow(StateNotFoundError)
})

// Promise.all for concurrent operations
const updatePromises = [
  stateManagerWithBatching.updateState(testExecutionId, { a: 1 }),
  stateManagerWithBatching.updateState(testExecutionId, { b: 2 }),
  stateManagerWithBatching.updateState(testExecutionId, { c: 3 })
]
await Promise.all(updatePromises)
```

**Error Testing:**
```typescript
// Test custom error types
it('should throw StateNotFoundError for non-existent execution', async () => {
  await expect(
    stateManager.getState('non-existent')
  ).rejects.toThrow(StateNotFoundError)
})

// Test error edge returns from nodes
it('should return error edge for missing items', async () => {
  const result = await node.execute(context, { /* missing items */ })

  expect(result.error).toBeDefined()
  const errorData = await result.error!(context)
  expect(errorData.error).toContain('Missing or invalid items')
})

// Test error message content
it('should include field name in validation error', async () => {
  await expect(
    stateManager.setNestedPath(testExecutionId, '', 'value')
  ).rejects.toThrow('Invalid state path: path cannot be empty')
})
```

**Watchers and Callbacks:**
```typescript
// Register watchers and test callbacks fire
it('should register and trigger state watchers', async () => {
  const changes: StateChange[] = []

  const watcherId = stateManager.registerWatcher({
    executionId: testExecutionId,
    keys: ['counter'],
    callback: (changesReceived) => {
      changes.push(...changesReceived)
    }
  })

  await stateManager.updateState(testExecutionId, { counter: 5 })

  expect(changes).toHaveLength(1)
  expect(changes[0]?.key).toBe('counter')

  stateManager.unregisterWatcher(watcherId)
})

// Test debounced watchers with time
it('should support debounced watchers', async () => {
  const changes: StateChange[][] = []

  const watcherId = stateManager.registerWatcher({
    executionId: testExecutionId,
    keys: '*',
    debounceMs: 50,
    callback: (changesReceived) => {
      changes.push([...changesReceived])
    }
  })

  // Rapid updates
  await stateManager.updateState(testExecutionId, { counter: 1 })
  await stateManager.updateState(testExecutionId, { counter: 2 })
  await stateManager.updateState(testExecutionId, { counter: 3 })

  expect(changes).toHaveLength(0) // Not triggered yet

  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(changes).toHaveLength(1) // Triggered once with last update

  stateManager.unregisterWatcher(watcherId)
})
```

**Deep Object Testing:**
```typescript
// Test nested structure changes
it('should correctly detect deep object changes', async () => {
  await stateManager.updateState(testExecutionId, {
    nested: { a: 1, b: { c: 2 } }
  })

  await stateManager.updateState(testExecutionId, {
    nested: { a: 1, b: { c: 3 } } // Deep change
  })

  const diff = stateManager.getCurrentDiff(testExecutionId)
  expect(diff?.updated).toHaveProperty('nested')
})

// Test reference equality doesn't trigger change
it('should detect same content as no change via deep equality', async () => {
  const changes: StateChange[] = []

  const watcherId = stateManager.registerWatcher({
    executionId: testExecutionId,
    keys: '*',
    callback: (changesReceived) => {
      changes.push(...changesReceived)
    }
  })

  await stateManager.updateState(testExecutionId, { complex: { nested: [1, 2, 3] } })
  const changeCount1 = changes.length

  // Same content, different reference
  await stateManager.updateState(testExecutionId, { complex: { nested: [1, 2, 3] } })
  const changeCount2 = changes.length

  // Should NOT register new change (deep equality check)
  expect(changeCount2).toBe(changeCount1)

  stateManager.unregisterWatcher(watcherId)
})
```

**Test Organization for Comprehensive Coverage:**
FilterNode example has 15+ describe blocks covering:
- Metadata validation
- Input validation
- String operations (equals, contains, startsWith, isEmpty, regex)
- Number operations (equals, gt, lte, between)
- Boolean operations (true, false)
- Date operations (before, after, between)
- Array operations (contains, isEmpty)
- Object operations (isEmpty, isNotEmpty)
- Multiple conditions (AND/ALL mode, OR/ANY mode)
- Nested field access with dot notation
- State management (storage in context)
- Edge routing (passed, filtered edges)

---

*Testing analysis: 2026-01-23*
