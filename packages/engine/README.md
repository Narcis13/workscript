# @workscript/engine

Core workflow orchestration engine for Workscript.

## Features

- **ExecutionEngine** - Orchestrates workflow execution with lifecycle hooks
- **WorkflowParser** - AST-like parsing with JSON Schema validation
- **StateManager** - Advanced state management with snapshots and watchers
- **StateResolver** - Elegant `$.key` syntax for state access
- **NodeRegistry** - Multi-package node discovery
- **HookManager** - Comprehensive lifecycle events

## Installation

```bash
bun add @workscript/engine
```

## Usage

```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from '@workscript/engine';

const registry = new NodeRegistry();
await registry.discoverFromPackages('universal');

const engine = new ExecutionEngine(registry, new StateManager());
const result = await engine.execute(workflow);
```

## Universal Nodes

Zero-dependency nodes that work in any JavaScript runtime:

- `MathNode` - Mathematical operations
- `LogicNode` - Boolean logic
- `DataTransformNode` - Object/array transformations
- `StateSetterNode` - Direct state manipulation
- `FilterNode`, `SortNode`, `AggregateNode` - Data processing

## Development

```bash
bun run dev   # Watch mode
bun run build # Build package
bun run test  # Run tests
```
