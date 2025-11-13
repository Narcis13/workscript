---
description: Interactive guide for adding a new workflow node (universal/server/client)
---

You are helping create a new workflow node for the execution engine.

## Node Creation Workflow

### Step 1: Determine Node Type

Ask the user what kind of node they want to create:
- **Universal Node** - Pure logic, no external dependencies (math, data transformation, logic)
- **Server Node** - Requires server dependencies (filesystem, database, auth, external APIs)
- **Client Node** - Requires browser APIs (localStorage, fetch, DOM, UI components)

### Step 2: Node Placement

Based on type:
- Universal → `/shared/nodes/`
- Server → `/server/nodes/` (or `/server/nodes/custom/` for integrations)
- Client → `/client/nodes/` (or `/client/nodes/ui/` for UI nodes)

### Step 3: Gather Node Information

Collect:
1. Node ID (kebab-case, e.g., "math-operations")
2. Node name (human-readable)
3. Description (what it does)
4. Inputs (array of input parameters)
5. Outputs (array of output values)
6. Expected edges (success, error, custom?)
7. State interactions (what it reads/writes)

### Step 4: Generate Node Code

Use the appropriate template:

**Universal Node Template:**
```typescript
import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class YourNode extends WorkflowNode {
  metadata = {
    id: 'your-node',
    name: 'Your Node Name',
    version: '1.0.0',
    description: 'What this node does',
    inputs: ['param1', 'param2'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Purpose description',
      when_to_use: 'When to use this node',
      expected_edges: ['success', 'error'],
      example_usage: '{"node-1": {"param1": "value", "success?": "next"}}',
      example_config: '{"param1": "type", "param2": "type"}',
      get_from_state: [],
      post_to_state: ['resultKey']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { param1, param2 } = config || {};

    // Validation
    if (!param1) {
      return {
        error: () => ({ error: 'Missing required parameter: param1' })
      };
    }

    try {
      // Your logic here
      const result = // compute result

      // Update state
      context.state.resultKey = result;

      return {
        success: () => ({ result })
      };
    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Operation failed'
        })
      };
    }
  }
}

export default YourNode;
```

### Step 5: Create Tests

Generate test file in same package:
- `/shared/__tests__/YourNode.test.ts`
- `/server/__tests__/YourNode.test.ts`
- `/client/__tests__/YourNode.test.ts`

### Step 6: Register Node

Ensure node is exported in package's node index file and will be discovered by NodeRegistry.

### Step 7: Verification Checklist

- [ ] Node follows TypeScript strict mode
- [ ] Metadata is complete with ai_hints
- [ ] Input validation is thorough
- [ ] Error handling returns error edges
- [ ] State updates are documented
- [ ] Tests cover success and error cases
- [ ] Example usage is provided
- [ ] Export statement is present

Now, what kind of node would you like to create?
