# Node Development Quick Reference

## Critical Rule

**Every node execution MUST return an EdgeMap with exactly ONE key.**

```typescript
// CORRECT - Single key returned
return { success: () => ({ result }) };

// WRONG - Multiple keys returned
return {
  success: () => ({ result }),
  error: () => ({ error })  // NEVER DO THIS!
};
```

## File Locations

| Category | Location |
|----------|----------|
| Core nodes | `/packages/nodes/src/MyNode.ts` |
| Data manipulation | `/packages/nodes/src/data/MyNode.ts` |
| Custom integrations | `/packages/nodes/src/custom/[provider]/MyNode.ts` |

## Standard Imports

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
```

## Node Structure

```typescript
export class MyNode extends WorkflowNode {
  metadata = {
    id: 'myNode',           // Required: Unique identifier
    name: 'My Node',        // Required: Human-readable name
    version: '1.0.0',       // Required: Semantic version
    description: '...',     // Optional: Description
    inputs: ['param1'],     // Optional: Config parameters
    outputs: ['result'],    // Optional: Output keys
    ai_hints: { ... }       // Optional: AI workflow hints
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // Implementation
  }
}
```

## ExecutionContext

```typescript
interface ExecutionContext {
  state: Record<string, any>;  // Shared mutable state
  inputs: Record<string, any>; // Input from previous node
  workflowId: string;          // Workflow identifier
  nodeId: string;              // Current node identifier
  executionId: string;         // Unique execution ID
}
```

## Execute Method Template

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { param } = config || {};

  // 1. VALIDATION - Return error immediately
  if (!param) {
    return {
      error: () => ({ error: 'Missing param' })
    };
  }

  // 2. BUSINESS LOGIC in try-catch
  try {
    const result = await this.operation(param);

    // 3. STATE MUTATION
    context.state.myResult = result;

    // 4. RETURN SINGLE SUCCESS EDGE
    return {
      success: () => ({ result })
    };

  } catch (error) {
    // 5. RETURN SINGLE ERROR EDGE from catch
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Failed',
        nodeId: context.nodeId
      })
    };
  }
}
```

## Common Edge Patterns

### Pattern 1: Success/Error (Most Common)

```typescript
// Validation error
return { error: () => ({ error: 'Missing param' }) };

// Success
return { success: () => ({ result }) };

// Catch block error
return { error: () => ({ error: error.message }) };
```

### Pattern 2: Boolean (True/False)

```typescript
if (condition) {
  return { true: () => ({ result: true }) };
} else {
  return { false: () => ({ result: false }) };
}
```

### Pattern 3: Lookup (Found/Not Found)

```typescript
if (item) {
  return { found: () => ({ value: item }) };
} else {
  return { not_found: () => ({ key }) };
}
```

### Pattern 4: Exists/Not Exists

```typescript
try {
  await fs.access(path);
  return { exists: () => ({ path }) };
} catch {
  return { not_exists: () => ({ path }) };
}
```

### Pattern 5: Multi-Outcome

```typescript
if (value > 100) {
  return { high: () => ({ value }) };
} else if (value > 50) {
  return { medium: () => ({ value }) };
} else {
  return { low: () => ({ value }) };
}
```

### Pattern 6: Empty/Results

```typescript
if (results.length > 0) {
  return { success: () => ({ results }) };
} else {
  return { empty: () => ({ count: 0 }) };
}
```

## AI Hints Structure

```typescript
ai_hints: {
  // Required for AI workflows
  purpose: 'Brief purpose (1 sentence)',
  when_to_use: 'When to use this node',
  expected_edges: ['success', 'error'],

  // Recommended
  example_usage: '{"node-1": {"param": "value", "success?": "next"}}',
  example_config: '{"param": "string", "optionalParam?": "number"}',

  // Optional
  get_from_state: ['keyToRead'],
  post_to_state: ['keyToWrite']
}
```

## State Management

### Direct Mutation (Correct)

```typescript
context.state.result = value;
context.state.user = { name: 'John' };
context.state.items.push(newItem);
```

### State Key Naming

```typescript
// GOOD - Namespaced keys
context.state.mathResult = sum;
context.state.filterData = filtered;

// BAD - Generic keys (may conflict)
context.state.result = sum;
context.state.data = filtered;
```

## Workflow JSON Usage

```json
{
  "my-node-1": {
    "param1": "value",
    "param2": "$.stateKey",
    "success?": "next-node",
    "error?": "error-handler"
  }
}
```

### State References

- `$.key` - Access state.key
- `$.nested.path` - Access state.nested.path
- Values are resolved before node execution

## Export Checklist

Add to `/packages/nodes/src/index.ts`:

```typescript
// 1. Import
import MyNewNode from './MyNewNode';

// 2. Add to ALL_NODES
export const ALL_NODES = [
  // ... existing
  MyNewNode,
];

// 3. Individual export
export { MyNewNode };
```

## Build Commands

```bash
bun run build:nodes    # Build nodes package
bun run test:nodes     # Run tests
bun run build          # Build all packages
```

## Error Message Best Practices

```typescript
// BAD - Vague
return { error: () => ({ error: 'Failed' }) };

// GOOD - Detailed
return {
  error: () => ({
    error: `File not found: ${path}`,
    nodeId: context.nodeId,
    operation: 'read',
    suggestion: 'Check if file path is correct'
  })
};
```

## Test Template

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
      executionId: 'test-123'
    };
  });

  // CRITICAL TEST - Single edge return
  it('should return exactly one edge key', async () => {
    const result = await node.execute(context, { param: 'value' });
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('should return error edge for invalid input', async () => {
    const result = await node.execute(context, {});
    expect(Object.keys(result)).toHaveLength(1);
    expect(result.error).toBeDefined();
  });
});
```

## Common Mistakes to Avoid

1. **Multiple edge keys** - Always return ONE key
2. **Throwing errors** - Return error edge instead
3. **Not validating inputs** - Validate before try-catch
4. **Generic state keys** - Use namespaced keys
5. **Instance state** - Keep nodes stateless
6. **Missing ai_hints** - Include for AI workflow generation
7. **Forgetting exports** - Add to index.ts and ALL_NODES
