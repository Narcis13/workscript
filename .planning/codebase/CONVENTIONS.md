# Coding Conventions

**Analysis Date:** 2026-01-23

## Naming Patterns

**Files:**
- PascalCase for class files: `FilterNode.ts`, `StateManager.ts`, `ExecutionEngine.ts`
- camelCase for utilities/helpers: `validate-nodes.ts`
- Test files suffixed with `.test.ts` or integration tests `.integration.test.ts`: `StateManager.test.ts`, `HookManager.integration.test.ts`
- Demo/example files: `.demo.test.ts` pattern

**Functions:**
- camelCase for all function names: `execute()`, `initialize()`, `getState()`, `updateState()`
- Private methods use camelCase with leading underscore: `_createSnapshot()` (implicit, follows convention)
- Async functions are regular camelCase, marked with `async`: `async execute(context, config)`

**Variables:**
- camelCase for all local variables and parameters: `testExecutionId`, `initialState`, `stateManager`
- Constants in PascalCase when they are class-level: `MAX_LOOP_ITERATIONS`, `DEFAULT_TIMEOUT` (seen in `ExecutionEngine.ts` lines 68-69)
- Private fields use `#` ES2022 syntax or prefixed with underscore in older patterns

**Types:**
- PascalCase for all interfaces and types: `ExecutionContext`, `EdgeMap`, `WorkflowNode`, `NodeMetadata`, `FilterCondition`
- Type unions and complex types follow same convention: `StateChange`, `EdgeMap`, `ExecutionPlan`
- Generic type parameters use single uppercase letters or descriptive PascalCase: `T`, `K`, `StatePersistenceAdapter`

**Classes:**
- PascalCase with "Node" suffix for workflow nodes: `FilterNode`, `StateManager`, `ExecutionEngine`
- Error classes suffixed with "Error": `ExecutionEngineError`, `LoopLimitError`, `StateNotFoundError`, `StateLockError`

## Code Style

**Formatting:**
- Tool: Prettier (configured in `/.prettierrc`)
- Tab width: 2 spaces
- Semicolons: disabled (`"semi": false`)
- Single quotes: enabled (`"singleQuote": true`)
- Print width: 100 characters
- Trailing comma: ES5 style (`"trailingComma": "es5"`)
- Arrow parens: always present (`"arrowParens": "always"`)
- Bracket spacing: enabled (`"bracketSpacing": true`)
- Line endings: LF (`"endOfLine": "lf"`)

**Key formatting examples:**
```typescript
// Functions - no semicolons, single quotes
const result = await stateManager.updateState(testExecutionId, { counter: 5 })

// Trailing commas in objects/arrays (ES5)
const obj = {
  key1: 'value',
  key2: 'value',
}

// Imports with sorted specifiers
import type {
  ExecutionContext,
  EdgeMap,
  WorkflowDefinition,
} from '@workscript/engine'
```

**Linting:**
- Tool: ESLint (configured per-package)
- Frontend: `apps/frontend/eslint.config.js`
- TypeScript strict mode: enabled in all `tsconfig.json` files
- Required flags:
  - `"strict": true` - Full type checking
  - `"forceConsistentCasingInFileNames": true` - Consistent casing
  - `"noFallthroughCasesInSwitch": true` - No switch case fallthrough
  - `"noUncheckedIndexedAccess": true` - Index access safety
  - Optional flags disabled by default: `noUnusedLocals`, `noUnusedParameters`, `noPropertyAccessFromIndexSignature`

## Import Organization

**Order:**
1. React imports (if applicable): `import React from 'react'`
2. External packages: `import { vitest } from 'vitest'`
3. Workspace/monorepo packages: `import { WorkflowNode } from '@workscript/engine'`
4. Relative imports from project paths: `import { StateManager } from '../state/StateManager'`
5. Relative imports from current directory: `import { helper } from './helper'`

**Path Aliases:**
- `@workscript/engine` → `/packages/engine/src` (engine exports)
- `@workscript/nodes` → `/packages/nodes/src` (nodes package)
- `@workscript/ui` → `/packages/ui` (UI components)
- `@workscript/config` → `/packages/config` (config files)
- `@server/*` → `/server/src/*` (legacy CRM API)
- `@/*` → `./src/*` (frontend only, configured in `apps/frontend/tsconfig.json`)
- `@engine` → `../../packages/engine/src` (frontend test config)

**Import style:**
```typescript
// Named imports with destructuring
import { StateManager, StateNotFoundError } from './StateManager'

// Type imports separated
import type { ExecutionContext, EdgeMap } from '@workscript/engine'

// Default exports when applicable
import FilterNode from './FilterNode'
```

## Error Handling

**Patterns:**
- Custom error classes extending Error: All error types in codebase extend the base Error class
- Constructor signature: `constructor(message: string, public context?: string, public originalError?: Error)`
- Examples: `ExecutionEngineError`, `LoopLimitError`, `StateNotFoundError`, `StateLockError`, `SnapshotNotFoundError`

**Error throwing:**
```typescript
// In StateManager.ts - throwing custom errors
if (!this.states.has(executionId)) {
  throw new StateNotFoundError(`State not found for execution: ${executionId}`)
}

// With context
throw new StateLockError(`Key "${key}" is already locked`, executionId)
```

**Async error handling:**
- Use try-catch in async functions (vitest tests show pattern)
- Test error conditions with `expect().rejects.toThrow()` pattern
- Return error edges from nodes instead of throwing: `return { error: () => ({ error: 'message' }) }`

**Node-level error handling:**
- Nodes return `EdgeMap` with error edges
- Example from `FilterNode.test.ts` line 42:
```typescript
const result = await node.execute(context, { /* invalid config */ })
expect(result.error).toBeDefined()
const errorData = await result.error!(context)
expect(errorData.error).toContain('Missing or invalid items')
```

## Logging

**Framework:** No centralized logging framework detected; primarily `console` for CLI utilities

**Patterns:**
- Utility scripts use `console.log()`: seen in `packages/nodes/validate-nodes.ts`
- No logging in core engine/nodes packages (production code avoids console)
- Tests use Vitest assertions, not console logging

**When to log:**
- CLI/build tools: Use `console.log()` with emoji prefixes for clarity
- Production code: Avoid console; use error returns through EdgeMap instead
- Example from validate-nodes.ts:
```typescript
console.log('🔍 Validating node files...\n')
console.log(`Found ${nodeFiles.length} node files\n`)
console.log(`✅ ${result.file}`)
console.log(`❌ ${result.file}`)
```

## Comments

**When to Comment:**
- Use block comments for complex algorithms or state management logic
- Add JSDoc for public APIs (WorkflowNode, StateManager, ExecutionEngine methods)
- Inline comments explain "why" not "what" - the code structure should be self-documenting
- Single-line comments for clarifications on non-obvious logic

**JSDoc/TSDoc:**
- Include on all public class methods
- Format: `/** Description */` for single-line, multiline for detailed docs
- Document parameters with `@param`, return with `@return`
- Example pattern (seen in ExecutionEngine.ts):
```typescript
/**
 * ExecutionEngine - Core workflow execution orchestration
 *
 * Implements Requirements:
 * - Requirement 3: Access to execution context during node execution
 * - Requirement 10: Execute workflows reliably with proper error handling
 */
```

- Node metadata includes `ai_hints` for LLM integration documentation:
```typescript
ai_hints: {
  purpose: 'Filter items based on conditions',
  when_to_use: 'When you need to subset data based on criteria',
  expected_edges: ['passed', 'filtered'],
  get_from_state: ['items'],
  post_to_state: ['filterPassed', 'filterFiltered', 'filterStats']
}
```

## Function Design

**Size:** Functions kept reasonably sized; large methods (100+ lines) include complex logic like state resolution or filtering operations

**Parameters:**
- Prefer object parameters for config: `async execute(context: ExecutionContext, config?: any)`
- State operations take `executionId` first: `updateState(executionId, updates)`
- Use typed parameter objects for complex operations

**Return Values:**
- Async functions return Promises: `async execute(): Promise<EdgeMap>`
- Node execution returns `EdgeMap` (object with edge functions)
- State operations return values directly or throw custom errors
- Edge functions return tuples or objects with metadata

**Example pattern from FilterNode:**
```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  if (!config?.items) {
    return {
      error: () => ({ error: 'Missing or invalid items' })
    }
  }
  // ... filter logic
  return {
    passed: () => ({ items: passed, stats: { passedCount: passed.length } }),
    filtered: () => ({ items: filtered })
  }
}
```

## Module Design

**Exports:**
- Central `index.ts` files re-export package contents
- Example: `packages/engine/src/index.ts` exports all submodules
```typescript
export * from "./types"
export * from "./engine"
export * from "./parser"
export * from "./state"
export * from "./registry"
```

**Barrel Files:**
- Used in engine subdirectories: `src/engine/index.ts`, `src/hooks/index.ts`, `src/registry/index.ts`
- Pattern: Re-export main class and related types:
```typescript
// packages/engine/src/engine/index.ts
export { ExecutionEngine, ExecutionEngineError, LoopLimitError } from './ExecutionEngine'
export type { NodeExecutionResult, ExecutionPlan, ExecutionStep } from './ExecutionEngine'
```

**Monorepo imports:**
- Always import from package roots, not internal paths
- `import { StateManager } from '@workscript/engine'` not `'@workscript/engine/src/state/StateManager'`
- Internal to a package, use relative imports: `import { StateResolver } from '../state/StateResolver'`

## TypeScript Configuration

**Strict mode enabled across all packages:**
- `strict: true` enforces all strict type-checking options
- `noUncheckedIndexedAccess: true` prevents unsafe property access
- `forceConsistentCasingInFileNames: true` ensures platform-independent case
- `verbatimModuleSyntax: true` (modern setting) ensures precise import/export semantics
- `experimentalDecorators: true` (required for test infrastructure)
- `moduleDetection: "force"` treats all files as modules

**JSX Configuration:**
- `jsx: "react-jsx"` enables JSX without explicit React imports (React 17+)
- Used in frontend and test files that render components

---

*Convention analysis: 2026-01-23*
