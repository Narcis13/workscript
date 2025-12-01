# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@workscript/nodes` is the consolidated workflow nodes package for the Workscript Agentic Workflow Engine. It contains all 39 server-side workflow nodes used by the execution engine.

## Commands

```bash
# Build
bun run build        # Compile TypeScript to dist/

# Development
bun run dev          # Watch mode for TypeScript compilation

# Type checking
bun run typecheck    # Run tsc --noEmit

# Testing (run from monorepo root)
cd ../.. && bun run test:nodes
```

Run a single test file:
```bash
bun test src/data/FilterNode.test.ts
```

## Architecture

### Node Structure

All nodes extend `WorkflowNode` from `@workscript/engine` and implement:

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class ExampleNode extends WorkflowNode {
  metadata = {
    id: 'example',                    // Unique identifier used in workflow JSON
    name: 'Example Node',
    version: '1.0.0',
    description: 'What this node does',
    inputs: ['param1', 'param2'],     // Config parameters
    outputs: ['result'],              // What it produces
    ai_hints: {                       // LLM integration hints
      purpose: 'Brief description for AI',
      when_to_use: 'Conditions when this node is appropriate',
      expected_edges: ['success', 'error'],
      example_usage: '{"example-1": {"param1": "value", "success?": "next"}}',
      example_config: '{"param1": "type", "param2": "type"}',
      get_from_state: [],             // State keys this reads
      post_to_state: ['exampleResult'] // State keys this writes
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // Implementation
    return {
      success: () => ({ result: 'value' }),
      error: () => ({ error: 'message' })
    };
  }
}
```

### Directory Organization

```
src/
├── index.ts              # Central exports + ALL_NODES array
├── *Node.ts              # Core nodes (Math, Logic, DataTransform, Empty, Log, StateSetter)
├── AskAINode.ts          # AI/LLM integration
├── RunWorkflowNode.ts    # Workflow orchestration
├── FileSystemNode.ts     # Server operations
├── DatabaseNode.ts
├── AuthNode.ts
├── data/                 # Data manipulation nodes (22 nodes)
│   ├── FilterNode.ts
│   ├── SortNode.ts
│   ├── AggregateNode.ts
│   └── ...
└── custom/               # Third-party integrations
    ├── google/gmail/     # Gmail nodes (3)
    └── zoca/             # Zoca CRM nodes (3)
```

### Key Patterns

**Edge-based routing**: Nodes return an `EdgeMap` with edge functions. Edge names ending with `?` in workflow JSON trigger conditional routing:
```json
{"filter-1": {"items": "$.data", "conditions": [...], "passed?": "process", "error?": "handle-error"}}
```

**State resolution**: Values prefixed with `$.` are resolved from workflow state:
```json
{"math-1": {"operation": "add", "values": ["$.base", "$.multiplier"]}}
```

**State updates**: Nodes write results to `context.state` which persists across the workflow:
```typescript
context.state.filterPassed = passed;
context.state.filterStats = { passedCount: passed.length };
```

### Adding a New Node

1. Create `src/NewNode.ts` (or `src/data/NewNode.ts` for data manipulation)
2. Export in `src/index.ts`:
   ```typescript
   export { NewNode } from './NewNode.js';
   ```
3. Add to `ALL_NODES` array in `src/index.ts`
4. Add tests in `src/NewNode.test.ts`

### Testing Pattern

Tests use Vitest with a mock `ExecutionContext`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyNode } from './MyNode';
import type { ExecutionContext } from '@workscript/engine';

describe('MyNode', () => {
  let node: MyNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new MyNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'test-node',
      executionId: 'test-exec-123'
    };
  });

  it('should execute successfully', async () => {
    const result = await node.execute(context, { param: 'value' });
    expect(result.success).toBeDefined();
    const data = await result.success!(context);
    expect(data.result).toBe('expected');
  });
});
```

## Node Categories

| Category | Count | Examples |
|----------|-------|----------|
| Core | 6 | MathNode, LogicNode, DataTransformNode, EmptyNode, LogNode, StateSetterNode |
| AI | 1 | AskAINode |
| Orchestration | 1 | RunWorkflowNode |
| Data Manipulation | 22 | FilterNode, SortNode, AggregateNode, SwitchNode, ValidateDataNode |
| Server | 3 | FileSystemNode, DatabaseNode, AuthNode |
| Custom Integrations | 6 | GoogleConnectNode, SendEmailNode, ToateContacteleNode |

## Dependencies

- `@workscript/engine` - Core engine types (`WorkflowNode`, `ExecutionContext`, `EdgeMap`)
- `bcryptjs` - Password hashing for AuthNode
- `mysql2` - Database connectivity for DatabaseNode
