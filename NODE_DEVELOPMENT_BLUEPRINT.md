# Node Development Blueprint

**Version:** 2.0.0
**Last Updated:** 2025-11-28
**Purpose:** Comprehensive guide for developing workflow nodes in the Agentic Workflow Engine

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Node Anatomy](#node-anatomy)
3. [Critical: Single-Edge Return Pattern](#critical-single-edge-return-pattern)
4. [Development Template](#development-template)
5. [Best Practices](#best-practices)
6. [Pattern Library](#pattern-library)
7. [State Management](#state-management)
8. [Edge Routing](#edge-routing)
9. [AI Hints](#ai-hints)
10. [Testing Guidelines](#testing-guidelines)
11. [Examples Gallery](#examples-gallery)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Server-Only Node Architecture

All workflow nodes are consolidated in a single package: **`@workscript/nodes`** located at `/packages/nodes/`.

This architecture provides:
- **Single source of truth** - All nodes in one package
- **Server-side execution only** - All workflows run via API for security and consistency
- **Simplified imports** - `import { ALL_NODES, MathNode } from '@workscript/nodes'`
- **Clear separation** - Engine handles orchestration, nodes handle business logic

### How the Workflow Orchestration System Works

The workflow engine executes nodes in a defined sequence, with each node:
1. Receiving an **ExecutionContext** containing shared state and inputs
2. Performing its operation (computation, I/O, transformation, etc.)
3. Mutating the shared state if needed
4. Returning an **EdgeMap** with **exactly ONE key** that determines the next execution path

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow Engine                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Parse Workflow Definition (JSON)             │  │
│  │  2. Validate Structure & Node Availability       │  │
│  │  3. Initialize Shared State                      │  │
│  │  4. Execute Nodes Sequentially                   │  │
│  │     - Create ExecutionContext for each node      │  │
│  │     - Resolve state references ($.syntax)        │  │
│  │     - Execute node.execute(context, config)      │  │
│  │     - Process returned EdgeMap (SINGLE KEY!)     │  │
│  │     - Update shared state                        │  │
│  │     - Route to next node based on edge           │  │
│  │  5. Return final execution result                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Package Structure

```
packages/
└── nodes/                    # @workscript/nodes - ALL NODES HERE
    ├── src/
    │   ├── index.ts          # Exports ALL_NODES array and individual nodes
    │   ├── MathNode.ts       # Core nodes
    │   ├── LogicNode.ts
    │   ├── DataTransformNode.ts
    │   ├── StateSetterNode.ts
    │   ├── EmptyNode.ts
    │   ├── LogNode.ts
    │   ├── FileSystemNode.ts # Server capability nodes
    │   ├── DatabaseNode.ts
    │   ├── AuthNode.ts
    │   ├── data/             # Data manipulation nodes
    │   │   ├── FilterNode.ts
    │   │   ├── SortNode.ts
    │   │   ├── AggregateNode.ts
    │   │   └── ...
    │   └── custom/           # Custom integrations
    │       ├── google/gmail/
    │       └── zoca/
    └── package.json
```

### Key Components

- **WorkflowNode**: Abstract base class that all nodes extend
- **ExecutionContext**: Contains state, inputs, workflowId, nodeId, executionId
- **EdgeMap**: Return type from execute() - **MUST contain exactly ONE key**
- **StateManager**: Manages shared state across workflow execution
- **StateResolver**: Resolves $.references to actual state values
- **NodeRegistry**: Registers nodes from `@workscript/nodes` package

### Imports

```typescript
// Engine imports (orchestration)
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Node imports (for registration)
import { ALL_NODES, MathNode, FilterNode } from '@workscript/nodes';
```

---

## Node Anatomy

### Complete Node Structure

Every workflow node consists of these essential components:

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class ExampleNode extends WorkflowNode {
  // 1. METADATA - Describes the node for discovery and AI workflows
  metadata = {
    id: 'example',                    // Unique identifier (lowercase, no spaces)
    name: 'Example Node',             // Human-readable name
    version: '1.0.0',                 // Semantic version
    description: 'Description of what this node does',
    inputs: ['param1', 'param2'],     // Expected configuration parameters
    outputs: ['result', 'data'],      // Keys in returned edge data
    ai_hints: {                       // Critical for AI-assisted workflows
      purpose: 'Brief purpose statement',
      when_to_use: 'When to use this node',
      expected_edges: ['success', 'error'],
      example_usage: '{"example": {"param1": "value", "success?": "next-node"}}',
      example_config: '{"param1": "string", "param2?": "number"}',
      get_from_state: ['keyToRead'],  // Optional: state keys this node reads
      post_to_state: ['keyToWrite']   // Optional: state keys this node writes
    }
  };

  // 2. EXECUTE METHOD - Core node logic
  // CRITICAL: Must return EdgeMap with EXACTLY ONE KEY
  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // 3. INPUT VALIDATION - Return error edge immediately if invalid
    const { param1, param2 } = config || {};

    if (!param1) {
      return {
        error: () => ({ error: 'Missing required parameter: param1' })
      };
    }

    // 4. BUSINESS LOGIC wrapped in try-catch
    try {
      const result = await this.performOperation(param1, param2);

      // 5. STATE MUTATION (if needed)
      context.state.exampleResult = result;
      context.state.lastExecutionTime = new Date().toISOString();

      // 6. RETURN SINGLE SUCCESS EDGE
      return {
        success: () => ({
          result,
          message: 'Operation completed successfully'
        })
      };

    } catch (error) {
      // 7. RETURN SINGLE ERROR EDGE from catch block
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  // 8. HELPER METHODS (optional)
  private async performOperation(param1: any, param2: any): Promise<any> {
    // Implementation details
    return {};
  }
}

export default ExampleNode;
```

### Component Breakdown

#### 1. Metadata Object

```typescript
metadata = {
  id: string;              // REQUIRED: Unique identifier (e.g., 'math', 'filesystem')
  name: string;            // REQUIRED: Human-readable name (e.g., 'Math Operations')
  version: string;         // REQUIRED: Semantic version (e.g., '1.0.0')
  description?: string;    // OPTIONAL: Detailed description
  inputs?: string[];       // OPTIONAL: Array of expected config parameter names
  outputs?: string[];      // OPTIONAL: Array of output keys in edge data
  ai_hints?: AIHints;      // OPTIONAL: Hints for AI workflow generation
}
```

#### 2. Execute Method

```typescript
async execute(
  context: ExecutionContext,  // Contains state, inputs, workflow/node/execution IDs
  config?: Record<string, any> // Configuration from workflow definition (already resolved)
): Promise<EdgeMap>           // Returns EdgeMap with EXACTLY ONE KEY
```

#### 3. ExecutionContext

```typescript
interface ExecutionContext {
  state: Record<string, any>;  // Shared mutable state across all nodes
  inputs: Record<string, any>; // Input data from previous node or workflow
  workflowId: string;          // Workflow identifier
  nodeId: string;              // Current node identifier
  executionId: string;         // Unique execution identifier
}
```

#### 4. EdgeMap - CRITICAL: Single Key Only

```typescript
type EdgeMap = Record<string, (context?: ExecutionContext) => any>;

// ✅ CORRECT - Single key returned
return { success: () => ({ result: data }) };
return { error: () => ({ error: message }) };
return { found: () => ({ data }) };
return { not_found: () => ({ key }) };
return { true: () => ({ result }) };
return { false: () => ({ result }) };

// ❌ WRONG - Multiple keys returned
return {
  success: () => ({ result }),
  error: () => ({ error: 'backup' })  // DON'T DO THIS!
};
```

---

## Critical: Single-Edge Return Pattern

### The Fundamental Rule

**Every node execution MUST return an EdgeMap with exactly ONE key.**

The node's logic must decide which single edge to return based on:
- Input validation results
- Computation outcomes
- External operation results
- Catch block exceptions

### Why Single Edge?

1. **Deterministic flow** - Clear, unambiguous workflow routing
2. **Simplified debugging** - Easy to trace execution path
3. **Clean semantics** - Each execution has one outcome
4. **Error handling clarity** - Errors are explicit, not fallbacks

### The Pattern

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { param } = config || {};

  // VALIDATION CHECKS - Return error edge immediately
  if (!param) {
    return {
      error: () => ({ error: 'Missing param' })
    };
  }

  // BUSINESS LOGIC in try-catch
  try {
    const result = await this.operation(param);

    // CONDITIONAL EDGES based on result
    if (someCondition(result)) {
      context.state.found = result;
      return {
        found: () => ({ result })
      };
    } else {
      return {
        not_found: () => ({ searched: param })
      };
    }

  } catch (error) {
    // ERROR EDGE from catch block
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Failed'
      })
    };
  }
}
```

### Decision Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Node Execution                        │
│                                                         │
│  1. Validate inputs                                     │
│     ├─ Invalid? → return { error: () => {...} }        │
│     └─ Valid? → continue                                │
│                                                         │
│  2. Try business logic                                  │
│     │                                                   │
│     ├─ Success + Condition A?                           │
│     │  → return { edgeA: () => {...} }                 │
│     │                                                   │
│     ├─ Success + Condition B?                           │
│     │  → return { edgeB: () => {...} }                 │
│     │                                                   │
│     └─ Catch exception?                                 │
│        → return { error: () => {...} }                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Development Template

### Standard Server Node Template

Use this template for all nodes (all nodes are server-side):

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * [NodeName] - [Brief description]
 *
 * [Detailed description of what this node does]
 *
 * @example
 * ```json
 * {
 *   "my-node": {
 *     "param": "value",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
export class MyNode extends WorkflowNode {
  metadata = {
    id: 'myNode',
    name: 'My Node',
    version: '1.0.0',
    description: 'Server-side node - describe what it does',
    inputs: ['param1', 'param2'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Brief purpose statement (1 sentence)',
      when_to_use: 'When you need to [specific use case]',
      expected_edges: ['success', 'error'],
      example_usage: '{"my-node-1": {"param1": "value", "success?": "next-node"}}',
      example_config: '{"param1": "string", "param2?": "number"}',
      get_from_state: [],
      post_to_state: ['myNodeResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { param1, param2 } = config || {};

    // Validation - return error edge immediately
    if (!param1) {
      return {
        error: () => ({ error: 'Missing required parameter: param1' })
      };
    }

    try {
      // Business logic
      const result = await this.processData(param1, param2);

      // State mutation
      context.state.myNodeResult = result;

      // Return single success edge
      return {
        success: () => ({ result })
      };

    } catch (error) {
      // Return single error edge from catch
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Operation failed',
          nodeId: context.nodeId
        })
      };
    }
  }

  private async processData(param1: any, param2?: any): Promise<any> {
    // Implementation
    return {};
  }
}

export default MyNode;
```

### Node with External Dependencies (Node.js APIs)

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
import fs from 'fs/promises';
import path from 'path';

/**
 * FileSystemNode - Server-side file system operations
 */
export class FileSystemNode extends WorkflowNode {
  metadata = {
    id: 'filesystem',
    name: 'File System Operations',
    version: '1.0.0',
    description: 'Server-side file system operations',
    inputs: ['operation', 'path', 'content'],
    outputs: ['result', 'content'],
    ai_hints: {
      purpose: 'Perform file system operations (read, write, delete, mkdir)',
      when_to_use: 'When you need to interact with the file system',
      expected_edges: ['success', 'error', 'exists', 'not_exists'],
      example_usage: '{"fs-1": {"operation": "read", "path": "/tmp/data.txt", "success?": "next"}}',
      example_config: '{"operation": "read|write|exists|delete|mkdir", "path": "string", "content?": "string"}',
      get_from_state: [],
      post_to_state: ['fileContent', 'fileWritten', 'fileExists']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, path: filePath, content } = config || {};

    if (!operation || !filePath) {
      return {
        error: () => ({ error: 'Missing operation or path' })
      };
    }

    try {
      switch (operation) {
        case 'read': {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          context.state.fileContent = fileContent;
          return {
            success: () => ({ content: fileContent })
          };
        }

        case 'write': {
          if (content === undefined) {
            return {
              error: () => ({ error: 'Missing content for write operation' })
            };
          }
          await fs.writeFile(filePath, content, 'utf-8');
          context.state.fileWritten = filePath;
          return {
            success: () => ({ path: filePath })
          };
        }

        case 'exists': {
          try {
            await fs.access(filePath);
            context.state.fileExists = true;
            return {
              exists: () => ({ exists: true, path: filePath })
            };
          } catch {
            context.state.fileExists = false;
            return {
              not_exists: () => ({ exists: false, path: filePath })
            };
          }
        }

        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }
    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'File system operation failed',
          operation,
          path: filePath
        })
      };
    }
  }
}

export default FileSystemNode;
```

### Adding a New Node

1. **Create the node file** in `/packages/nodes/src/` (or appropriate subdirectory):
   - Core nodes → `/packages/nodes/src/`
   - Data manipulation → `/packages/nodes/src/data/`
   - Custom integrations → `/packages/nodes/src/custom/`

2. **Export the node** in `/packages/nodes/src/index.ts`:
   ```typescript
   // Add import
   import MyNewNode from './MyNewNode';

   // Add to ALL_NODES array
   export const ALL_NODES = [
     // ... existing nodes
     MyNewNode,
   ];

   // Add individual export
   export { MyNewNode };
   ```

3. **Rebuild**: `bun run build:nodes`

4. **Test the node**: Create tests alongside the implementation

---

## Best Practices

### 1. Single Responsibility Principle

Each node should do ONE thing well:

```typescript
// ✅ GOOD - Focused node
export class AddNode extends WorkflowNode {
  metadata = { id: 'add', name: 'Add Numbers', ... };
  async execute(context, config) {
    const { values } = config;
    const result = values.reduce((a, b) => a + b, 0);
    context.state.sum = result;
    return { success: () => ({ result }) };
  }
}

// ❌ BAD - Too many responsibilities
export class MathAndStringNode extends WorkflowNode {
  metadata = { id: 'mathAndString', ... };
  async execute(context, config) {
    // Does math AND string operations - should be separate nodes
  }
}
```

### 2. Validate All Inputs Early

Return error edge immediately for invalid inputs:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, values } = config || {};

  // Validate required parameters - return error immediately
  if (!operation) {
    return {
      error: () => ({ error: 'Missing required parameter: operation' })
    };
  }

  if (!values || !Array.isArray(values)) {
    return {
      error: () => ({
        error: 'Missing or invalid values parameter',
        expected: 'array of numbers',
        received: typeof values
      })
    };
  }

  // Continue with validated inputs in try-catch
  try {
    // ... business logic
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Failed' })
    };
  }
}
```

### 3. Use TypeScript Interfaces for Configuration

```typescript
interface MyNodeConfig {
  operation: 'create' | 'update' | 'delete';
  id: string;
  data?: Record<string, any>;
}

async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
  const { operation, id, data } = (config as MyNodeConfig) || {};
  // TypeScript now provides type checking and autocomplete
}
```

### 4. Store Results in Both State and Edge Data

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  try {
    const result = await this.performOperation(config);

    // Store in state for global access
    context.state.operationResult = result;
    context.state.lastOperationTime = new Date().toISOString();

    // Also return via edge for next node's inputs
    return {
      success: () => ({
        result,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Failed' })
    };
  }
}
```

### 5. Use Helper Methods for Complex Logic

Keep execute() clean and readable:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  // Validation - return error immediately
  const validationError = this.validateConfig(config);
  if (validationError) {
    return {
      error: () => ({ error: validationError })
    };
  }

  try {
    const parsedData = this.parseInput(config.input);
    const result = await this.processData(parsedData);
    this.storeResult(context, result);

    return { success: () => ({ result }) };
  } catch (error) {
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Unknown error',
        nodeId: context.nodeId
      })
    };
  }
}

private validateConfig(config: any): string | null {
  if (!config?.input) return 'Missing input';
  return null;
}

private parseInput(input: any): any {
  return input;
}

private async processData(data: any): Promise<any> {
  return data;
}

private storeResult(context: ExecutionContext, result: any): void {
  context.state.result = result;
}
```

### 6. Provide Meaningful Error Messages

```typescript
// ❌ BAD - Vague error
return { error: () => ({ error: 'Failed' }) };

// ✅ GOOD - Detailed error
return {
  error: () => ({
    error: `File not found: ${filePath}`,
    nodeId: context.nodeId,
    operation: 'read',
    path: filePath,
    suggestion: 'Check if the file path is correct and file exists'
  })
};
```

### 7. Keep Nodes Stateless

All data should flow through ExecutionContext:

```typescript
// ❌ BAD - Node has internal state
export class BadNode extends WorkflowNode {
  private results: any[] = [];  // Don't do this!

  async execute(context, config) {
    this.results.push(config.data);  // Instance state - bad!
  }
}

// ✅ GOOD - All state in context
export class GoodNode extends WorkflowNode {
  async execute(context, config) {
    if (!context.state.results) {
      context.state.results = [];
    }
    context.state.results.push(config.data);  // Shared state - good!
    return { success: () => ({}) };
  }
}
```

### 8. Namespace State Keys

Avoid state key collisions:

```typescript
// ✅ GOOD - Namespaced keys
context.state.mathResult = sum;
context.state.fileSystemLastRead = content;
context.state.apiResponseData = data;

// ❌ BAD - Generic keys that might conflict
context.state.result = sum;  // Too generic
context.state.data = content;  // Very likely to conflict
```

---

## Pattern Library

### Pattern 1: Simple Success/Error

Most common pattern - validation + try/catch:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { param } = config || {};

  if (!param) {
    return {
      error: () => ({ error: 'Missing param' })
    };
  }

  try {
    const result = await this.doSomething(param);
    context.state.result = result;

    return {
      success: () => ({ result })
    };
  } catch (error) {
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}
```

### Pattern 2: Boolean Branching

For conditional logic with true/false outcomes:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, values } = config || {};

  if (!operation || !values) {
    return {
      error: () => ({ error: 'Missing operation or values' })
    };
  }

  try {
    const result = this.evaluateCondition(operation, values);
    context.state.conditionResult = result;

    // Return appropriate single edge based on result
    if (result) {
      return {
        true: () => ({ result: true })
      };
    } else {
      return {
        false: () => ({ result: false })
      };
    }
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Failed' })
    };
  }
}
```

### Pattern 3: Found/Not Found

For lookup operations:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { key } = config || {};

  if (!key) {
    return {
      error: () => ({ error: 'Missing key parameter' })
    };
  }

  try {
    const value = await this.lookup(key);

    if (value !== null && value !== undefined) {
      context.state.lookupValue = value;
      return {
        found: () => ({ key, value })
      };
    } else {
      return {
        not_found: () => ({ key })
      };
    }
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Lookup failed' })
    };
  }
}
```

### Pattern 4: Exists/Not Exists

For existence checks:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { path } = config || {};

  if (!path) {
    return {
      error: () => ({ error: 'Missing path' })
    };
  }

  try {
    await fs.access(path);
    context.state.fileExists = true;

    return {
      exists: () => ({ exists: true, path })
    };
  } catch (accessError) {
    // File doesn't exist - this is expected, not an error
    context.state.fileExists = false;

    return {
      not_exists: () => ({ exists: false, path })
    };
  }
}
```

### Pattern 5: Multi-Condition Routing

For operations with multiple possible outcomes:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { value } = config || {};

  if (value === undefined) {
    return {
      error: () => ({ error: 'Missing value' })
    };
  }

  try {
    // Evaluate and return appropriate single edge
    if (value > 100) {
      return { high: () => ({ value, category: 'high' }) };
    } else if (value > 50) {
      return { medium: () => ({ value, category: 'medium' }) };
    } else if (value > 0) {
      return { low: () => ({ value, category: 'low' }) };
    } else {
      return { zero_or_negative: () => ({ value, category: 'invalid' }) };
    }
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Failed' })
    };
  }
}
```

### Pattern 6: Transform/Map

For data transformation nodes:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, data } = config || {};

  if (!operation) {
    return {
      error: () => ({ error: 'Missing operation' })
    };
  }

  if (data === undefined) {
    return {
      error: () => ({ error: 'Missing data' })
    };
  }

  try {
    let result: any;

    switch (operation) {
      case 'stringify':
        result = JSON.stringify(data);
        break;
      case 'parse':
        result = typeof data === 'string' ? JSON.parse(data) : data;
        break;
      case 'uppercase':
        result = String(data).toUpperCase();
        break;
      default:
        return {
          error: () => ({ error: `Unknown operation: ${operation}` })
        };
    }

    context.state.transformResult = result;

    return {
      success: () => ({ result })
    };
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Transform failed' })
    };
  }
}
```

### Pattern 7: Aggregation/Reduce

For aggregation operations:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, values } = config || {};

  if (!operation) {
    return {
      error: () => ({ error: 'Missing operation' })
    };
  }

  if (!Array.isArray(values)) {
    return {
      error: () => ({ error: 'Values must be an array' })
    };
  }

  try {
    let result: number;

    switch (operation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'product':
        result = values.reduce((a, b) => a * b, 1);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      case 'min':
        result = Math.min(...values);
        break;
      default:
        return {
          error: () => ({ error: `Unknown operation: ${operation}` })
        };
    }

    context.state.aggregateResult = result;

    return {
      success: () => ({ result })
    };
  } catch (error) {
    return {
      error: () => ({ error: error instanceof Error ? error.message : 'Aggregation failed' })
    };
  }
}
```

### Pattern 8: External API Call

For HTTP/API calls:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { url, method, body } = config || {};

  if (!url) {
    return {
      error: () => ({ error: 'Missing url parameter' })
    };
  }

  try {
    const response = await fetch(url, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      return {
        error: () => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
          url,
          status: response.status
        })
      };
    }

    const data = await response.json();
    context.state.apiResponse = data;

    return {
      success: () => ({ data, status: response.status })
    };

  } catch (error) {
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'API call failed',
        url
      })
    };
  }
}
```

### Pattern 9: Database Operation

For database queries:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, table, data, where } = config || {};

  if (!operation || !table) {
    return {
      error: () => ({ error: 'Missing operation or table' })
    };
  }

  try {
    switch (operation) {
      case 'select': {
        const results = await this.db.select(table, where);
        context.state.dbResults = results;

        if (results.length > 0) {
          return {
            found: () => ({ results, count: results.length })
          };
        } else {
          return {
            empty: () => ({ count: 0, table })
          };
        }
      }

      case 'insert': {
        if (!data) {
          return {
            error: () => ({ error: 'Missing data for insert' })
          };
        }
        const id = await this.db.insert(table, data);
        context.state.insertedId = id;

        return {
          success: () => ({ id, table })
        };
      }

      default:
        return {
          error: () => ({ error: `Unknown operation: ${operation}` })
        };
    }
  } catch (error) {
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Database operation failed',
        operation,
        table
      })
    };
  }
}
```

---

## State Management

### Understanding Shared State

The workflow engine maintains a **single shared state object** that persists across all node executions:

```typescript
// Workflow starts with initialState
{
  "id": "my-workflow",
  "initialState": {
    "user": "john",
    "count": 0
  },
  "workflow": [...]
}

// Node 1 executes and modifies state
context.state.count = 1;
context.state.firstNodeResult = "data";

// Node 2 sees the modified state
console.log(context.state.count);  // 1
console.log(context.state.firstNodeResult);  // "data"
```

### Direct State Mutation

Always mutate state directly:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  try {
    // ✅ CORRECT - Direct mutation
    context.state.result = "value";
    context.state.user = { name: "John", age: 30 };
    context.state.items.push(newItem);

    // ❌ WRONG - Don't create new state object
    // context.state = { ...context.state, result: "value" };

    return { success: () => ({ result: "value" }) };
  } catch (error) {
    return { error: () => ({ error: error.message }) };
  }
}
```

### Writing Nested State

For complex nested structures:

```typescript
// Simple nested write
context.state.user = { name: "John" };
context.state.user.profile = { age: 30 };

// Or use helper method for deep paths
private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const segments = path.split('.');
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (!(segment in current) || typeof current[segment] !== 'object') {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]!] = value;
}

// Usage
this.setNestedValue(context.state, 'user.profile.settings.theme', 'dark');
```

### State References ($.syntax)

Workflow definitions can reference state using `$.keyPath` syntax. The StateResolver automatically resolves these before your node executes:

```json
// In workflow definition:
{
  "math-1": {
    "values": "$.userScores"
  }
}
```

```typescript
// When your node executes, config is already resolved:
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { values } = config;
  console.log(values);  // [10, 20, 30] - already resolved from state.userScores
}
```

---

## Edge Routing

### Understanding EdgeMap - Single Key Rule

The `EdgeMap` return type determines workflow routing. **You MUST return exactly one key:**

```typescript
type EdgeMap = Record<string, (context?: ExecutionContext) => any>;

// ✅ CORRECT - Single key
return { success: () => ({ result }) };
return { error: () => ({ error: message }) };
return { found: () => ({ data }) };

// ❌ WRONG - Multiple keys
return {
  success: () => ({ result }),
  error: () => ({ error })  // Never include both!
};
```

### Edge Naming Conventions

Use clear, semantic edge names:

```typescript
// ✅ GOOD - Clear semantic names
return { success: () => ({ ... }) };
return { error: () => ({ ... }) };
return { found: () => ({ ... }) };
return { not_found: () => ({ ... }) };
return { true: () => ({ ... }) };
return { false: () => ({ ... }) };
return { valid: () => ({ ... }) };
return { invalid: () => ({ ... }) };
return { exists: () => ({ ... }) };
return { not_exists: () => ({ ... }) };

// ❌ BAD - Unclear names
return { ok: () => ({ ... }) };  // What does "ok" mean?
return { done: () => ({ ... }) };  // Too vague
```

### Edge Routing in Workflows

Workflow authors use edge names with the `?` suffix:

```json
{
  "workflow": [
    {
      "check-user": {
        "userId": "123",
        "found?": "load-profile",
        "not_found?": "create-user",
        "error?": "log-error"
      }
    }
  ]
}
```

### Edge Data vs State

**Edge data** is passed to the next node's inputs:

```typescript
// Node 1 returns edge data
return {
  success: () => ({
    userId: 123,
    userName: "John"
  })
};

// Node 2 receives edge data in context.inputs
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  console.log(context.inputs.userId);    // 123
  console.log(context.inputs.userName);  // "John"
}
```

---

## AI Hints

### Purpose of AI Hints

The `ai_hints` field helps AI models generate correct workflows:

```typescript
metadata = {
  id: 'example',
  name: 'Example Node',
  version: '1.0.0',
  ai_hints: {
    // Required fields
    purpose: string,           // Brief 1-sentence purpose
    when_to_use: string,       // When to use this node
    expected_edges: string[],  // Array of possible edge names

    // Highly recommended fields
    example_usage: string,     // JSON workflow snippet
    example_config: string,    // JSON config structure with types

    // Optional but useful fields
    get_from_state: string[],  // State keys this node reads
    post_to_state: string[]    // State keys this node writes
  }
}
```

### Example AI Hints

```typescript
// MathNode
ai_hints: {
  purpose: 'Perform mathematical operations on numeric values',
  when_to_use: 'When you need to calculate sums, differences, products, or quotients',
  expected_edges: ['success', 'error'],
  example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next-node"}}',
  example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}',
  get_from_state: [],
  post_to_state: ['mathResult']
}

// FileSystemNode
ai_hints: {
  purpose: 'Perform file system operations (read, write, delete, mkdir)',
  when_to_use: 'When you need to interact with the file system',
  expected_edges: ['success', 'error', 'exists', 'not_exists'],
  example_usage: '{"fs-1": {"operation": "read", "path": "/tmp/data.txt", "success?": "process-data"}}',
  example_config: '{"operation": "read|write|exists|delete|mkdir", "path": "string", "content?": "string"}',
  get_from_state: [],
  post_to_state: ['fileContent', 'fileWritten', 'fileExists']
}
```

---

## Testing Guidelines

### Test Structure

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
      executionId: 'test-execution-123'
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('myNode');
      expect(node.metadata.name).toBe('My Node');
      expect(node.metadata.version).toBe('1.0.0');
    });
  });

  describe('execute - single edge returns', () => {
    it('should return ONLY success edge on valid input', async () => {
      const result = await node.execute(context, { param: 'value' });

      // Verify single edge returned
      expect(Object.keys(result)).toHaveLength(1);
      expect(result.success).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return ONLY error edge on invalid input', async () => {
      const result = await node.execute(context, {});

      // Verify single edge returned
      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
      expect(result.success).toBeUndefined();
    });

    it('should return ONLY error edge on exception', async () => {
      const result = await node.execute(context, { param: 'trigger-error' });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });
  });

  describe('state management', () => {
    it('should update state correctly', async () => {
      await node.execute(context, { param: 'value' });

      expect(context.state.myResult).toBeDefined();
    });
  });
});
```

### Critical Test: Single Edge Return

Always verify that only one edge is returned:

```typescript
it('should never return multiple edges', async () => {
  const testCases = [
    { param: 'valid' },
    { param: null },
    {},
    { param: 'error-trigger' }
  ];

  for (const config of testCases) {
    const result = await node.execute(context, config);

    // CRITICAL: Only one edge should be returned
    expect(Object.keys(result)).toHaveLength(1);
  }
});
```

---

## Examples Gallery

### Example 1: MathNode (Complete Reference)

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class MathNode extends WorkflowNode {
  metadata = {
    id: 'math',
    name: 'Math Operations',
    version: '1.0.0',
    description: 'Performs basic mathematical operations',
    inputs: ['operation', 'values'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Perform mathematical operations on numeric values',
      when_to_use: 'When you need to calculate sums, differences, products, or quotients',
      expected_edges: ['success', 'error'],
      example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next-node"}}',
      example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}',
      get_from_state: [],
      post_to_state: ['mathResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, values } = config || {};

    // Validation - return single error edge
    if (!operation) {
      return {
        error: () => ({ error: 'Missing operation parameter' })
      };
    }

    if (!values || !Array.isArray(values)) {
      return {
        error: () => ({ error: 'Missing or invalid values parameter' })
      };
    }

    // Business logic in try-catch
    try {
      let result: number;

      switch (operation) {
        case 'add':
          result = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'subtract':
          result = values.reduce((a: number, b: number) => a - b);
          break;
        case 'multiply':
          result = values.reduce((a: number, b: number) => a * b, 1);
          break;
        case 'divide':
          if (values.slice(1).includes(0)) {
            return {
              error: () => ({ error: 'Division by zero' })
            };
          }
          result = values.reduce((a: number, b: number) => a / b);
          break;
        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }

      context.state.mathResult = result;

      // Return single success edge
      return {
        success: () => ({ result })
      };

    } catch (error) {
      // Return single error edge from catch
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Math operation failed'
        })
      };
    }
  }
}

export default MathNode;
```

### Example 2: FilterNode (Data Manipulation)

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class FilterNode extends WorkflowNode {
  metadata = {
    id: 'filter',
    name: 'Filter Data',
    version: '1.0.0',
    description: 'Filters arrays based on conditions',
    inputs: ['data', 'field', 'operator', 'value'],
    outputs: ['filtered', 'count'],
    ai_hints: {
      purpose: 'Filter array data based on field conditions',
      when_to_use: 'When you need to filter arrays by field values',
      expected_edges: ['success', 'empty', 'error'],
      example_usage: '{"filter-1": {"data": "$.items", "field": "status", "operator": "equals", "value": "active", "success?": "process"}}',
      example_config: '{"data": "array", "field": "string", "operator": "equals|contains|gt|lt", "value": "any"}',
      get_from_state: [],
      post_to_state: ['filteredData', 'filteredCount']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { data, field, operator, value } = config || {};

    if (!Array.isArray(data)) {
      return {
        error: () => ({ error: 'Data must be an array' })
      };
    }

    if (!field || !operator) {
      return {
        error: () => ({ error: 'Missing field or operator' })
      };
    }

    try {
      const filtered = data.filter(item => {
        const fieldValue = item[field];

        switch (operator) {
          case 'equals':
            return fieldValue === value;
          case 'contains':
            return String(fieldValue).includes(String(value));
          case 'gt':
            return fieldValue > value;
          case 'lt':
            return fieldValue < value;
          default:
            return false;
        }
      });

      context.state.filteredData = filtered;
      context.state.filteredCount = filtered.length;

      // Return appropriate single edge based on result
      if (filtered.length > 0) {
        return {
          success: () => ({ filtered, count: filtered.length })
        };
      } else {
        return {
          empty: () => ({ count: 0, originalCount: data.length })
        };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Filter operation failed'
        })
      };
    }
  }
}

export default FilterNode;
```

### Example 3: DatabaseNode (External Service)

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class DatabaseNode extends WorkflowNode {
  metadata = {
    id: 'database',
    name: 'Database Operations',
    version: '1.0.0',
    description: 'Performs database queries and operations',
    inputs: ['operation', 'table', 'data', 'where'],
    outputs: ['results', 'affected'],
    ai_hints: {
      purpose: 'Execute database operations (select, insert, update, delete)',
      when_to_use: 'When you need to interact with a database',
      expected_edges: ['success', 'found', 'empty', 'error'],
      example_usage: '{"db-1": {"operation": "select", "table": "users", "where": {"status": "active"}, "found?": "process"}}',
      example_config: '{"operation": "select|insert|update|delete", "table": "string", "data?": "object", "where?": "object"}',
      get_from_state: [],
      post_to_state: ['dbResults', 'dbAffected']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, table, data, where } = config || {};

    if (!operation) {
      return {
        error: () => ({ error: 'Missing operation' })
      };
    }

    if (!table) {
      return {
        error: () => ({ error: 'Missing table' })
      };
    }

    try {
      switch (operation) {
        case 'select': {
          const results = await this.executeSelect(table, where);
          context.state.dbResults = results;

          if (results.length > 0) {
            return {
              found: () => ({ results, count: results.length })
            };
          } else {
            return {
              empty: () => ({ count: 0, table })
            };
          }
        }

        case 'insert': {
          if (!data) {
            return {
              error: () => ({ error: 'Missing data for insert operation' })
            };
          }
          const id = await this.executeInsert(table, data);
          context.state.dbInsertedId = id;

          return {
            success: () => ({ id, table })
          };
        }

        case 'update': {
          if (!data || !where) {
            return {
              error: () => ({ error: 'Missing data or where clause for update' })
            };
          }
          const affected = await this.executeUpdate(table, data, where);
          context.state.dbAffected = affected;

          return {
            success: () => ({ affected, table })
          };
        }

        case 'delete': {
          if (!where) {
            return {
              error: () => ({ error: 'Missing where clause for delete (safety check)' })
            };
          }
          const deleted = await this.executeDelete(table, where);
          context.state.dbDeleted = deleted;

          return {
            success: () => ({ deleted, table })
          };
        }

        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }
    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Database operation failed',
          operation,
          table
        })
      };
    }
  }

  private async executeSelect(table: string, where?: Record<string, any>): Promise<any[]> {
    // Implementation
    return [];
  }

  private async executeInsert(table: string, data: Record<string, any>): Promise<number> {
    // Implementation
    return 1;
  }

  private async executeUpdate(table: string, data: Record<string, any>, where: Record<string, any>): Promise<number> {
    // Implementation
    return 1;
  }

  private async executeDelete(table: string, where: Record<string, any>): Promise<number> {
    // Implementation
    return 1;
  }
}

export default DatabaseNode;
```

---

## Troubleshooting

### Issue 1: Multiple Edges Returned

**Symptom:** Edge routing is unpredictable

**Cause:** Returning multiple keys in EdgeMap

**Solution:**
```typescript
// ❌ WRONG
return {
  success: () => ({ result }),
  error: () => ({ error: 'backup' })
};

// ✅ CORRECT - Use conditional logic to return ONE edge
if (isValid) {
  return { success: () => ({ result }) };
} else {
  return { error: () => ({ error: 'validation failed' }) };
}
```

### Issue 2: Edge Not Routing

**Symptom:** Workflow doesn't follow expected path

**Causes:**
1. Edge function not a function
2. Edge name mismatch

```typescript
// ❌ WRONG - Plain object instead of function
return { success: { result: data } };

// ✅ CORRECT - Arrow function
return { success: () => ({ result: data }) };

// ❌ WRONG - Edge name mismatch
// Workflow expects "success?", node returns "complete"
return { complete: () => ({}) };

// ✅ CORRECT - Matching edge names
return { success: () => ({}) };
```

### Issue 3: State Not Persisting

**Symptom:** State changes don't appear in next node

**Solution:**
```typescript
// ❌ WRONG - Replacing state object
context.state = { newKey: 'value' };

// ✅ CORRECT - Mutating existing state
context.state.newKey = 'value';
```

### Issue 4: Node Not Found

**Symptom:** `NodeNotFoundError: Node not found: myNode`

**Checklist:**
1. Node file in `/packages/nodes/src/`
2. Node exported in `/packages/nodes/src/index.ts`
3. Node added to `ALL_NODES` array
4. Package rebuilt: `bun run build:nodes`
5. Metadata `id` matches workflow usage

---

## Quick Reference

### Node Checklist

- [ ] Class extends `WorkflowNode`
- [ ] Located in `/packages/nodes/src/` (or subdirectory)
- [ ] Metadata has `id`, `name`, `version`
- [ ] Metadata has complete `ai_hints`
- [ ] Execute returns EdgeMap with **EXACTLY ONE KEY**
- [ ] Validation errors return error edge immediately
- [ ] Business logic wrapped in try-catch
- [ ] Catch block returns error edge
- [ ] State mutations use `context.state.key = value`
- [ ] Exported in `/packages/nodes/src/index.ts`
- [ ] Added to `ALL_NODES` array
- [ ] Tests verify single edge returns

### Standard Import

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
```

### Execute Template

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { param } = config || {};

  // Validation - return error immediately
  if (!param) {
    return { error: () => ({ error: 'Missing param' }) };
  }

  // Business logic in try-catch
  try {
    const result = await this.operation(param);
    context.state.result = result;

    // Return single success edge
    return { success: () => ({ result }) };
  } catch (error) {
    // Return single error edge from catch
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Failed',
        nodeId: context.nodeId
      })
    };
  }
}
```

---

**End of Node Development Blueprint v2.0.0**

This blueprint is the authoritative guide for developing workflow nodes. The critical principle is: **every node execution returns an EdgeMap with exactly ONE key**. The node's logic decides which single edge to return based on validation, computation, or exception handling.
