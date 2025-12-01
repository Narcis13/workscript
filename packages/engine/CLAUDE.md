# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@workscript/engine` is the **pure orchestration layer** for the Workscript workflow system. It handles workflow parsing, execution, state management, and lifecycle hooks. This package contains **no node implementations** - all nodes are in `@workscript/nodes`.

## Commands

```bash
# Development
bun run dev        # Watch mode (tsc --watch)
bun run build      # Build package (tsc)
bun run test       # Run all tests (vitest --run)

# Run a single test file
bunx vitest run src/engine/ExecutionEngine.test.ts
bunx vitest run src/state/StateManager.test.ts --watch
```

## Architecture

```
src/
├── engine/         # ExecutionEngine - workflow orchestration
├── parser/         # WorkflowParser - JSON → AST parsing + validation
├── state/          # StateManager + StateResolver - state management
├── registry/       # NodeRegistry - node registration and instantiation
├── hooks/          # HookManager - lifecycle event system
├── events/         # EventEmitter + WebSocket types
├── types/          # Core TypeScript interfaces
├── ui/             # UINode base class for UI-generating nodes
└── schemas/        # JSON Schema for workflow validation
```

### Core Components

**ExecutionEngine** (`src/engine/ExecutionEngine.ts`)
- Orchestrates workflow execution with lifecycle hooks
- Processes nodes sequentially with edge-based routing
- Handles loop nodes (`nodeId...` syntax), state setters (`$.path`), and nested configurations
- Max loop iterations: 1000, default timeout: 30s

**WorkflowParser** (`src/parser/WorkflowParser.ts`)
- Converts JSON workflow definitions to AST (ParsedWorkflow → ParsedNode[])
- JSON Schema validation (Ajv) + semantic validation (node existence, edge targets)
- Separates parameters from edges (keys ending in `?` are edges)
- Handles state setter syntax: `{"$.config.timeout": 5000}`

**StateManager** (`src/state/StateManager.ts`)
- Atomic state updates with version tracking
- Snapshots for rollback (Memento pattern)
- State watchers for reactive updates
- Edge context for passing data between nodes (`_edgeContext`)
- Key locking for concurrent modification protection

**StateResolver** (`src/state/StateResolver.ts`)
- Resolves `$.key` syntax in configurations: `"$.developer"` → `state.developer`
- Supports nested paths: `"$.user.profile.name"`
- Configurable missing key handling: `undefined`, `preserve`, or `throw`

**NodeRegistry** (`src/registry/NodeRegistry.ts`)
- Registers node classes and manages instantiation
- `registerFromArray(ALL_NODES)` is the recommended pattern
- Supports singleton nodes
- `discoverFromPackages()` is deprecated

**HookManager** (`src/hooks/HookManager.ts`)
- Priority-based hook execution
- Event types: `workflow:before-start`, `workflow:after-end`, `node:before-execute`, etc.
- Supports `once`, `filter`, and `nodeFilter` options

### Key Types

```typescript
// Workflow nodes extend this abstract class
abstract class WorkflowNode {
  abstract metadata: NodeMetadata;
  abstract execute(context: ExecutionContext, config?: any): Promise<EdgeMap>;
}

// EdgeMap - nodes return edge functions that determine routing
type EdgeMap = Record<string, (context: ExecutionContext) => any>;

// ExecutionContext - passed to every node
interface ExecutionContext {
  state: Record<string, any>;
  inputs: Record<string, any>;
  workflowId: string;
  nodeId: string;
  executionId: string;
}
```

### Workflow JSON Syntax

```json
{
  "id": "example",
  "name": "Example Workflow",
  "initialState": { "counter": 0 },
  "workflow": [
    { "$.multiplier": 3 },
    { "math": { "operation": "add", "values": [1, 2], "success?": "next-node" } },
    { "loop-node...": { "continue?": { "math": { "operation": "add", "values": ["$.counter", 1] } } } }
  ]
}
```

- **State setters**: `{"$.path": value}` - sets `state.path` to value
- **Edge routes**: Keys ending in `?` (e.g., `"success?"`) define routing
- **Loop nodes**: NodeId ending in `...` creates a loop that re-executes
- **State references**: `"$.key"` resolves to `state.key` at runtime

## Testing Patterns

Tests use Vitest. Mock nodes by extending `WorkflowNode`:

```typescript
class TestNode extends WorkflowNode {
  metadata = { id: 'test-node', name: 'Test Node', version: '1.0.0' };

  async execute(context, config) {
    return {
      success: () => ({ result: 'ok' }),
      error: () => undefined  // Return undefined to skip this edge
    };
  }
}
```

Test files are co-located: `ComponentName.ts` → `ComponentName.test.ts`
