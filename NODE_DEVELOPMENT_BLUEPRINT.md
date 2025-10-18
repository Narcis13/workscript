# Node Development Blueprint

**Version:** 1.0.0
**Last Updated:** 2025-10-17
**Purpose:** Comprehensive guide for developing workflow nodes in the Agentic Workflow Engine

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Node Anatomy](#node-anatomy)
3. [Development Template](#development-template)
4. [Best Practices](#best-practices)
5. [Pattern Library](#pattern-library)
6. [Environment Guidelines](#environment-guidelines)
7. [State Management](#state-management)
8. [Edge Routing](#edge-routing)
9. [AI Hints](#ai-hints)
10. [Testing Guidelines](#testing-guidelines)
11. [Examples Gallery](#examples-gallery)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### How the Workflow Orchestration System Works

The workflow engine executes nodes in a defined sequence, with each node:
1. Receiving an **ExecutionContext** containing shared state and inputs
2. Performing its operation (computation, I/O, transformation, etc.)
3. Mutating the shared state if needed
4. Returning an **EdgeMap** that determines the next execution path

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
│  │     - Process returned EdgeMap                   │  │
│  │     - Update shared state                        │  │
│  │     - Route to next node based on edge           │  │
│  │  5. Return final execution result                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Components

- **WorkflowNode**: Abstract base class that all nodes extend
- **ExecutionContext**: Contains state, inputs, workflowId, nodeId, executionId
- **EdgeMap**: Return type from execute() - determines workflow routing
- **StateManager**: Manages shared state across workflow execution
- **StateResolver**: Resolves $.references to actual state values
- **NodeRegistry**: Discovers and instantiates nodes from multiple environments

---

## Node Anatomy

### Complete Node Structure

Every workflow node consists of these essential components:

```typescript
import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

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
  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // 3. INPUT VALIDATION
    const { param1, param2 } = config || {};

    if (!param1) {
      return {
        error: () => ({ error: 'Missing required parameter: param1' })
      };
    }

    try {
      // 4. BUSINESS LOGIC
      const result = await this.performOperation(param1, param2);

      // 5. STATE MUTATION (if needed)
      context.state.exampleResult = result;
      context.state.lastExecutionTime = new Date().toISOString();

      // 6. RETURN EDGE MAP
      return {
        success: () => ({
          result,
          message: 'Operation completed successfully'
        })
      };

    } catch (error) {
      // 7. ERROR HANDLING
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
The metadata object is critical for node discovery and AI workflow generation:

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
The execute method signature is strictly defined:

```typescript
async execute(
  context: ExecutionContext,  // Contains state, inputs, workflow/node/execution IDs
  config?: Record<string, any> // Configuration from workflow definition (already resolved)
): Promise<EdgeMap>           // Returns edge map for workflow routing
```

#### 3. ExecutionContext
The context object passed to every node execution:

```typescript
interface ExecutionContext {
  state: Record<string, any>;  // Shared mutable state across all nodes
  inputs: Record<string, any>; // Input data from previous node or workflow
  workflowId: string;          // Workflow identifier
  nodeId: string;              // Current node identifier
  executionId: string;         // Unique execution identifier
}
```

#### 4. EdgeMap
The return type from execute() that determines workflow routing:

```typescript
type EdgeMap = Record<string, (context?: ExecutionContext) => any>;

// Examples:
return { success: () => ({ result: data }) };
return { true: () => ({ result }), false: () => ({ result }) };
return { error: () => ({ error: message, details }) };
return { found: () => ({ data }), not_found: () => ({ key }) };
```

---

## Development Template

### Universal Node Template (Zero Dependencies)

Use this template for nodes that work in any environment (server, client, CLI):

```typescript
import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

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
    description: 'Universal node - describe what it does',
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

    // Validation
    if (!param1) {
      return {
        error: () => ({ error: 'Missing required parameter: param1' })
      };
    }

    try {
      // Business logic (pure JS/TS only - no external dependencies)
      const result = this.processData(param1, param2);

      // State mutation
      context.state.myNodeResult = result;

      // Return edge map
      return {
        success: () => ({ result })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Operation failed',
          nodeId: context.nodeId
        })
      };
    }
  }

  private processData(param1: any, param2?: any): any {
    // Implementation
    return {};
  }
}

export default MyNode;
```

### Server Node Template (Node.js APIs)

Use this template for nodes that require server-side capabilities:

```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
import fs from 'fs/promises';  // Example: Node.js API
import path from 'path';       // Example: Node.js API

/**
 * [NodeName] - Server-specific node for [purpose]
 */
export class MyServerNode extends WorkflowNode {
  metadata = {
    id: 'myServerNode',
    name: 'My Server Node',
    version: '1.0.0',
    description: 'Server-specific node - describe what it does',
    inputs: ['operation', 'param'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Server-side operation for [specific purpose]',
      when_to_use: 'When you need server capabilities like [examples]',
      expected_edges: ['success', 'error'],
      example_usage: '{"server-1": {"operation": "action", "param": "value", "success?": "next"}}',
      example_config: '{"operation": "action1|action2", "param": "string"}',
      get_from_state: [],
      post_to_state: ['serverResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, param } = config || {};

    if (!operation || !param) {
      return {
        error: () => ({ error: 'Missing required parameters' })
      };
    }

    try {
      // Use Node.js APIs here
      const result = await this.performServerOperation(operation, param);

      context.state.serverResult = result;

      return {
        success: () => ({ result })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Server operation failed',
          operation,
          param
        })
      };
    }
  }

  private async performServerOperation(operation: string, param: any): Promise<any> {
    // Implementation using Node.js APIs
    return {};
  }
}

export default MyServerNode;
```

### Client Node Template (Browser APIs)

Use this template for nodes that require browser capabilities:

```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

/**
 * [NodeName] - Client-specific node for [purpose]
 */
export class MyClientNode extends WorkflowNode {
  metadata = {
    id: 'myClientNode',
    name: 'My Client Node',
    version: '1.0.0',
    description: 'Client-specific node - describe what it does',
    inputs: ['operation', 'param'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Browser operation for [specific purpose]',
      when_to_use: 'When you need browser capabilities like [examples]',
      expected_edges: ['success', 'error'],
      example_usage: '{"client-1": {"operation": "action", "param": "value", "success?": "next"}}',
      example_config: '{"operation": "action1|action2", "param": "string"}',
      get_from_state: [],
      post_to_state: ['clientResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, param } = config || {};

    // Environment check
    if (typeof window === 'undefined') {
      return {
        error: () => ({ error: 'This node requires a browser environment' })
      };
    }

    if (!operation || !param) {
      return {
        error: () => ({ error: 'Missing required parameters' })
      };
    }

    try {
      // Use browser APIs here
      const result = await this.performBrowserOperation(operation, param);

      context.state.clientResult = result;

      return {
        success: () => ({ result })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Browser operation failed',
          operation,
          param
        })
      };
    }
  }

  private async performBrowserOperation(operation: string, param: any): Promise<any> {
    // Implementation using browser APIs (localStorage, fetch, DOM, etc.)
    return {};
  }
}

export default MyClientNode;
```

---

## Best Practices

### 1. Single Responsibility Principle
Each node should do ONE thing well:

```typescript
// GOOD - Focused node
export class AddNode extends WorkflowNode {
  metadata = { id: 'add', name: 'Add Numbers', ... };
  async execute(context, config) {
    const { values } = config;
    const result = values.reduce((a, b) => a + b, 0);
    context.state.sum = result;
    return { success: () => ({ result }) };
  }
}

// BAD - Too many responsibilities
export class MathAndStringNode extends WorkflowNode {
  metadata = { id: 'mathAndString', ... };
  async execute(context, config) {
    // Does math AND string operations - should be separate nodes
    if (config.operation === 'add') { /* ... */ }
    if (config.operation === 'uppercase') { /* ... */ }
  }
}
```

### 2. Validate All Inputs
Always validate required parameters early:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, values } = config || {};

  // Validate required parameters
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

  // Continue with validated inputs
}
```

### 3. Use TypeScript Interfaces for Configuration

Define clear types for your node's configuration:

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

This gives maximum flexibility for workflow authors:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
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
}
```

### 5. Use Helper Methods for Complex Logic

Keep execute() clean and readable:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  try {
    // Validate
    this.validateConfig(config);

    // Parse
    const parsedData = this.parseInput(config.input);

    // Process
    const result = await this.processData(parsedData);

    // Store
    this.storeResult(context, result);

    return { success: () => ({ result }) };
  } catch (error) {
    return this.handleError(error, context);
  }
}

private validateConfig(config: any): void {
  if (!config?.input) throw new Error('Missing input');
}

private parseInput(input: any): any {
  // Parsing logic
  return input;
}

private async processData(data: any): Promise<any> {
  // Processing logic
  return data;
}

private storeResult(context: ExecutionContext, result: any): void {
  context.state.result = result;
}

private handleError(error: unknown, context: ExecutionContext): EdgeMap {
  return {
    error: () => ({
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeId: context.nodeId
    })
  };
}
```

### 6. Provide Meaningful Error Messages

Help users debug workflow issues:

```typescript
// BAD - Vague error
return { error: () => ({ error: 'Failed' }) };

// GOOD - Detailed error
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

### 7. Use Nested State Paths Wisely

For complex state structures, use helper methods:

```typescript
// Example from StateSetterNode
private setNestedValue(obj: Record<string, any>, segments: string[], value: any): void {
  let current: any = obj;

  // Navigate to parent, creating intermediate objects
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;

    if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }

    current = current[segment];
  }

  // Set final value
  const finalSegment = segments[segments.length - 1]!;
  current[finalSegment] = value;
}

// Usage
const segments = 'user.profile.settings.theme'.split('.');
this.setNestedValue(context.state, segments, 'dark');
// Results in: context.state.user.profile.settings.theme = 'dark'
```

### 8. Document Complex Nodes

Use JSDoc comments for complex nodes:

```typescript
/**
 * DataTransformNode - Transforms data between different formats
 *
 * Supports multiple transformation operations:
 * - stringify: Convert objects to JSON strings
 * - parse: Parse JSON strings to objects
 * - uppercase/lowercase: Text case transformation
 * - trim: Remove whitespace
 * - length: Get array/string length
 * - reverse: Reverse arrays/strings
 *
 * @example
 * ```json
 * {
 *   "transform-1": {
 *     "operation": "stringify",
 *     "data": {"key": "value"},
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
export class DataTransformNode extends WorkflowNode {
  // Implementation
}
```

### 9. Handle Edge Cases

Consider all possible input scenarios:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { data } = config || {};

  // Handle missing data
  if (data === undefined) {
    return { error: () => ({ error: 'Missing data parameter' }) };
  }

  // Handle null explicitly if it's valid
  if (data === null) {
    context.state.result = null;
    return { success: () => ({ result: null }) };
  }

  // Handle empty arrays/objects
  if (Array.isArray(data) && data.length === 0) {
    return { empty: () => ({ result: [], count: 0 }) };
  }

  // Handle normal case
  const result = this.process(data);
  return { success: () => ({ result }) };
}
```

### 10. Keep Nodes Stateless

All data should flow through ExecutionContext or return values:

```typescript
// BAD - Node has internal state
export class BadNode extends WorkflowNode {
  private results: any[] = [];  // Don't do this!

  async execute(context, config) {
    this.results.push(config.data);  // Instance state - bad!
  }
}

// GOOD - All state in context
export class GoodNode extends WorkflowNode {
  async execute(context, config) {
    if (!context.state.results) {
      context.state.results = [];
    }
    context.state.results.push(config.data);  // Shared state - good!
  }
}
```

---

## Pattern Library

### Pattern 1: Simple Success/Error

Most common pattern - one success path, one error path:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  try {
    const result = await this.doSomething(config);
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

  const result = this.evaluateCondition(operation, values);
  context.state.conditionResult = result;

  return {
    [result ? 'true' : 'false']: () => ({ result })
  };
}
```

### Pattern 3: Multi-Path Routing

For nodes with multiple possible outcomes:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, key } = config || {};

  switch (operation) {
    case 'get': {
      const value = localStorage.getItem(key);
      if (value !== null) {
        context.state.value = value;
        return { found: () => ({ key, value }) };
      } else {
        return { not_found: () => ({ key }) };
      }
    }

    case 'set': {
      localStorage.setItem(key, config.value);
      return { success: () => ({ key }) };
    }

    default:
      return { error: () => ({ error: `Unknown operation: ${operation}` }) };
  }
}
```

### Pattern 4: Iteration/Loop Support

For nodes that process collections:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { items } = config || {};

  if (!Array.isArray(items)) {
    return { error: () => ({ error: 'items must be an array' }) };
  }

  const results = [];
  for (const item of items) {
    const processed = await this.processItem(item);
    results.push(processed);
  }

  context.state.processedItems = results;

  return {
    success: () => ({
      results,
      count: results.length
    })
  };
}
```

### Pattern 5: Exists/Not Exists Check

For existence checks with branching:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { path } = config || {};

  try {
    await fs.access(path);
    context.state.fileExists = true;

    return {
      exists: () => ({ exists: true, path })
    };
  } catch {
    context.state.fileExists = false;

    return {
      not_exists: () => ({ exists: false, path })
    };
  }
}
```

### Pattern 6: State Getter

For nodes that read and return state values:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { key } = config || {};

  if (!key) {
    return { error: () => ({ error: 'Missing key parameter' }) };
  }

  const value = this.getNestedValue(context.state, key);

  if (value === undefined) {
    return { not_found: () => ({ key }) };
  }

  return {
    found: () => ({ key, value })
  };
}

private getNestedValue(obj: Record<string, any>, keyPath: string): any {
  const keys = keyPath.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }

  return current;
}
```

### Pattern 7: State Setter

For nodes that write state values (see StateSetterNode):

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { statePath, value } = config || {};

  if (!statePath) {
    return { error: () => ({ error: 'Missing statePath' }) };
  }

  if (value === undefined) {
    return { error: () => ({ error: 'Missing value' }) };
  }

  const segments = statePath.split('.').filter(seg => seg.length > 0);
  this.setNestedValue(context.state, segments, value);

  return {
    success: () => ({ statePath, value })
  };
}
```

### Pattern 8: Transform/Map

For data transformation nodes:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, data } = config || {};

  if (!operation || data === undefined) {
    return { error: () => ({ error: 'Missing operation or data' }) };
  }

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
      return { error: () => ({ error: `Unknown operation: ${operation}` }) };
  }

  context.state.transformResult = result;

  return {
    success: () => ({ result })
  };
}
```

### Pattern 9: Aggregation/Reduce

For nodes that aggregate data:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { operation, values } = config || {};

  if (!operation || !Array.isArray(values)) {
    return { error: () => ({ error: 'Invalid parameters' }) };
  }

  let result: number;

  switch (operation) {
    case 'add':
      result = values.reduce((a, b) => a + b, 0);
      break;
    case 'multiply':
      result = values.reduce((a, b) => a * b, 1);
      break;
    case 'max':
      result = Math.max(...values);
      break;
    case 'min':
      result = Math.min(...values);
      break;
    default:
      return { error: () => ({ error: `Unknown operation: ${operation}` }) };
  }

  context.state.aggregateResult = result;

  return {
    success: () => ({ result })
  };
}
```

### Pattern 10: Async External API Call

For nodes that call external services:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { url, method, body } = config || {};

  if (!url) {
    return { error: () => ({ error: 'Missing url parameter' }) };
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

---

## Environment Guidelines

### Where to Place Your Node

The workflow system supports three node environments:

#### Universal Nodes (`/shared/nodes/`)

**Place nodes here if they:**
- Have ZERO external dependencies (no npm packages, no Node.js APIs, no browser APIs)
- Use only pure JavaScript/TypeScript
- Work in ANY environment (server, client, CLI, edge functions, etc.)

**Examples:**
- Mathematical operations (add, subtract, multiply, divide)
- Logic operations (and, or, not, comparisons)
- Data transformations (JSON stringify/parse, string operations)
- Array/object manipulations
- Date/time operations (using built-in Date)

**Template:**
```typescript
import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class MyUniversalNode extends WorkflowNode {
  // Only use built-in JavaScript features
  // No imports from 'fs', 'path', 'localStorage', etc.
}
```

#### Server Nodes (`/server/nodes/`)

**Place nodes here if they:**
- Use Node.js APIs (fs, path, crypto, http, etc.)
- Connect to databases or message queues
- Require environment variables or server configuration
- Call external APIs from server context
- Need server-side authentication/authorization
- Interact with server file systems

**Examples:**
- File system operations (read/write files, create directories)
- Database queries (SQL, MongoDB, Redis)
- Email sending (SMTP, SendGrid, etc.)
- Server-side API calls with secrets
- Server-side image processing
- Server log management

**Template:**
```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
import fs from 'fs/promises';  // Node.js API
import path from 'path';       // Node.js API

export class MyServerNode extends WorkflowNode {
  // Can use Node.js APIs and server-side libraries
}
```

#### Client Nodes (`/client/nodes/`)

**Place nodes here if they:**
- Use browser APIs (DOM, localStorage, sessionStorage, etc.)
- Interact with browser features (location, history, clipboard)
- Handle UI events or user interactions
- Use browser-specific globals (window, document, navigator)
- Access browser storage or cookies

**Examples:**
- localStorage/sessionStorage operations
- DOM manipulation (create elements, query selectors)
- Browser fetch API calls
- Clipboard operations
- Browser notifications
- Client-side routing

**Template:**
```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

export class MyClientNode extends WorkflowNode {
  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // Check environment before using browser APIs
    if (typeof window === 'undefined') {
      return {
        error: () => ({ error: 'This node requires a browser environment' })
      };
    }

    // Can use browser APIs: localStorage, DOM, fetch, etc.
  }
}
```

### Environment Decision Tree

```
Does your node use ANY external dependencies?
├─ NO → Universal Node (/shared/nodes/)
└─ YES
   ├─ Uses Node.js APIs (fs, path, crypto)?
   │  └─ YES → Server Node (/server/nodes/)
   ├─ Uses browser APIs (window, DOM, localStorage)?
   │  └─ YES → Client Node (/client/nodes/)
   └─ Uses external npm packages?
      ├─ Works in Node.js only → Server Node
      ├─ Works in browser only → Client Node
      └─ Works in both → Consider splitting into two nodes
```

### Environment-Specific Best Practices

#### Universal Nodes Best Practices

```typescript
// GOOD - Pure JavaScript
const result = values.reduce((a, b) => a + b, 0);
const uppercase = text.toUpperCase();
const parsed = JSON.parse(jsonString);

// BAD - External dependencies
import axios from 'axios';  // Don't import packages in universal nodes
const file = fs.readFileSync('file.txt');  // Don't use Node.js APIs
localStorage.setItem('key', 'value');  // Don't use browser APIs
```

#### Server Nodes Best Practices

```typescript
// GOOD - Server-specific operations
import fs from 'fs/promises';
const content = await fs.readFile('/path/to/file', 'utf-8');

import { connect } from 'mongodb';
const db = await connect(process.env.MONGO_URL);

// BAD - Don't assume browser APIs exist
const value = localStorage.getItem('key');  // Error in server!
document.querySelector('#app');  // Error in server!
```

#### Client Nodes Best Practices

```typescript
// GOOD - Check environment first
if (typeof localStorage === 'undefined') {
  return { error: () => ({ error: 'localStorage not available' }) };
}

localStorage.setItem('key', 'value');
document.querySelector('#app').innerHTML = 'Hello';

// BAD - Don't assume Node.js APIs exist
import fs from 'fs';  // Error in browser!
const content = fs.readFileSync('file.txt');  // Error in browser!
```

### Node Discovery

Nodes are automatically discovered by the NodeRegistry based on their location:

```typescript
// Server environment initialization
const registry = new NodeRegistry();
await registry.discoverFromPackages('server');
// Discovers: /shared/nodes/** + /server/nodes/**

// Client environment initialization
const registry = new NodeRegistry();
await registry.discoverFromPackages('client');
// Discovers: /shared/nodes/** + /client/nodes/**

// Universal environment initialization (CLI, tests)
const registry = new NodeRegistry();
await registry.discoverFromPackages('universal');
// Discovers: /shared/nodes/** + /server/nodes/** + /client/nodes/**
```

---

## State Management

### Understanding Shared State

The workflow engine maintains a **single shared state object** that persists across all node executions in a workflow:

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

// State persists through entire workflow
```

### Direct State Mutation

Always mutate state directly - the engine tracks changes:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  // ✅ CORRECT - Direct mutation
  context.state.result = "value";
  context.state.user = { name: "John", age: 30 };
  context.state.items.push(newItem);

  // ❌ WRONG - Don't create new state object
  context.state = { ...context.state, result: "value" };  // This won't work!

  return { success: () => ({ result: "value" }) };
}
```

### Reading State

Access state values directly:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  // Read simple values
  const userName = context.state.user;
  const count = context.state.count || 0;

  // Read nested values
  const profileName = context.state.user?.profile?.name;

  // Check existence
  if (!context.state.user) {
    return { error: () => ({ error: 'User not found in state' }) };
  }

  return { success: () => ({ userName }) };
}
```

### Writing Nested State

For complex nested structures, create helper methods:

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
// Results in: context.state.user.profile.settings.theme = 'dark'
```

### State References ($.syntax)

Workflow definitions can reference state using `$.keyPath` syntax:

```json
{
  "workflow": [
    {
      "$.config.timeout": {
        "value": 30
      }
    },
    {
      "math-1": {
        "operation": "add",
        "values": "$.previousResults"
      }
    }
  ]
}
```

The StateResolver automatically resolves these references before your node executes:

```typescript
// In workflow definition:
{
  "math-1": {
    "values": "$.userScores"  // Reference to state.userScores
  }
}

// When your node executes, config is already resolved:
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { values } = config;
  console.log(values);  // [10, 20, 30] - already resolved from state.userScores
}
```

### State Naming Conventions

Follow these conventions for state keys:

```typescript
// ✅ GOOD - Clear, descriptive names
context.state.userProfile = {...};
context.state.processedData = [...];
context.state.lastApiResponse = {...};
context.state.validationErrors = [...];

// ❌ BAD - Vague, unclear names
context.state.data = {...};  // Too generic
context.state.temp = {...};  // What is this?
context.state.x = {...};     // Meaningless
```

### State for Inter-Node Communication

Use state to pass data between nodes:

```typescript
// Node 1: Store data for later nodes
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const userData = await this.fetchUser(config.userId);

  // Store for other nodes to use
  context.state.currentUser = userData;
  context.state.userId = config.userId;

  return { success: () => ({ userData }) };
}

// Node 2: Use data from previous node
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  // Access data stored by previous node
  const user = context.state.currentUser;

  if (!user) {
    return { error: () => ({ error: 'No user data available' }) };
  }

  const enrichedData = this.enrichUserData(user);
  return { success: () => ({ enrichedData }) };
}
```

### State Metadata Pattern

Store metadata alongside results:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const result = await this.performOperation(config);

  // Store result
  context.state.operationResult = result;

  // Store metadata
  context.state.operationMetadata = {
    timestamp: new Date().toISOString(),
    nodeId: context.nodeId,
    executionId: context.executionId,
    duration: performance.now() - startTime
  };

  return { success: () => ({ result }) };
}
```

### Avoiding State Conflicts

Prefix state keys with node-specific identifiers to avoid collisions:

```typescript
// ✅ GOOD - Namespaced keys
context.state.mathResult = sum;
context.state.fileSystemLastRead = content;
context.state.apiResponseData = data;

// ❌ BAD - Generic keys that might conflict
context.state.result = sum;  // Too generic - many nodes might use this
context.state.data = content;  // Very likely to conflict
```

---

## Edge Routing

### Understanding EdgeMap

The `EdgeMap` return type determines how workflow execution continues:

```typescript
type EdgeMap = Record<string, (context?: ExecutionContext) => any>;

// Example:
return {
  success: () => ({ result: data }),
  error: () => ({ error: 'Failed' })
};
```

### Edge Naming Conventions

Use clear, semantic edge names:

```typescript
// ✅ GOOD - Clear semantic names
return { success: () => ({ ... }) };
return { error: () => ({ ... }) };
return { found: () => ({ ... }), not_found: () => ({ ... }) };
return { true: () => ({ ... }), false: () => ({ ... }) };
return { valid: () => ({ ... }), invalid: () => ({ ... }) };
return { exists: () => ({ ... }), not_exists: () => ({ ... }) };

// ❌ BAD - Unclear names
return { ok: () => ({ ... }) };  // What does "ok" mean?
return { done: () => ({ ... }) };  // Too vague
return { next: () => ({ ... }) };  // Not descriptive
```

### Single Edge Pattern (Recommended)

For 99% of use cases, return a single edge:

```typescript
// Most common pattern
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  try {
    const result = await this.operation(config);
    context.state.result = result;

    // Single success edge
    return {
      success: () => ({ result })
    };
  } catch (error) {
    // Single error edge (as exception)
    return {
      error: () => ({ error: error.message })
    };
  }
}
```

### Multiple Edge Pattern

For conditional branching:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { key } = config || {};

  const value = localStorage.getItem(key);

  // Multiple possible edges
  if (value !== null) {
    context.state.value = value;
    return {
      found: () => ({ key, value })
    };
  } else {
    return {
      not_found: () => ({ key })
    };
  }
}
```

### Edge Routing in Workflows

Workflow authors use edge names with the `?` suffix for routing:

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
    },
    { "load-profile": {...} },
    { "create-user": {...} },
    { "log-error": {...} }
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

// Node 2 receives edge data in inputs
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  // Edge data is available in context.inputs
  console.log(context.inputs.userId);    // 123
  console.log(context.inputs.userName);  // "John"

  // State is also available
  console.log(context.state.currentUser);  // From previous nodes
}
```

**Best practice:** Store in both state AND edge data:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const result = await this.operation(config);

  // Store in state for global access
  context.state.operationResult = result;

  // Also return in edge data for next node
  return {
    success: () => ({ result })
  };
}
```

### Dynamic Edge Selection

Select edges based on runtime conditions:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { value } = config || {};

  if (value > 100) {
    return { high: () => ({ value, category: 'high' }) };
  } else if (value > 50) {
    return { medium: () => ({ value, category: 'medium' }) };
  } else {
    return { low: () => ({ value, category: 'low' }) };
  }
}
```

### No Edge Pattern

If no edge matches or is returned, the workflow continues sequentially:

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  // Perform side effect
  console.log('Logging:', config.message);
  context.state.logged = true;

  // Return empty edge map - workflow continues to next node
  return {};
}
```

### Loop Nodes and Edges

Nodes ending with `...` are loop nodes that re-execute on edge routes:

```typescript
// In workflow definition:
{
  "process-items...": {
    "items": "$.itemList",
    "success?": {
      "process-item": {
        "item": "$.currentItem"
      }
    }
  }
}

// The node will loop until:
// 1. No edge is returned
// 2. Max iterations reached (1000 default)
// 3. Error edge with no route
```

---

## AI Hints

### Purpose of AI Hints

The `ai_hints` field in node metadata is critical for AI-assisted workflow generation. When an AI model generates workflows, it uses these hints to:

1. Understand WHAT the node does
2. Determine WHEN to use the node
3. Know WHAT edges the node returns
4. See EXAMPLES of proper usage
5. Understand the CONFIGURATION structure

### Complete AI Hints Structure

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

### Writing Effective AI Hints

#### 1. Purpose - One Sentence Summary

Be clear and concise:

```typescript
// ✅ GOOD
purpose: 'Perform mathematical operations on numeric values'
purpose: 'Transform data between different formats (JSON, uppercase, reverse, etc.)'
purpose: 'Check if a file exists on the server filesystem'

// ❌ BAD
purpose: 'Math'  // Too vague
purpose: 'This node does math operations like addition, subtraction, multiplication, division, and more'  // Too verbose
```

#### 2. When to Use - Specific Use Cases

Describe specific scenarios:

```typescript
// ✅ GOOD
when_to_use: 'When you need to calculate sums, differences, products, or quotients in a workflow'
when_to_use: 'When you need to store data in the browser that persists across sessions'
when_to_use: 'When you need conditional branching based on boolean logic (and, or, not) or value comparisons'

// ❌ BAD
when_to_use: 'When you need math'  // Not specific enough
when_to_use: 'Use this node to do things'  // Too vague
```

#### 3. Expected Edges - All Possible Outcomes

List ALL edges your node can return:

```typescript
// ✅ GOOD
expected_edges: ['success', 'error']
expected_edges: ['true', 'false', 'error']
expected_edges: ['found', 'not_found', 'error']
expected_edges: ['exists', 'not_exists', 'error']

// ❌ BAD
expected_edges: []  // Don't leave empty
expected_edges: ['done']  // Use semantic names
```

#### 4. Example Usage - Real Workflow Snippet

Provide a realistic JSON workflow snippet:

```typescript
// ✅ GOOD - Shows actual workflow syntax
example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next-node"}}'

example_usage: '{"transform-1": {"operation": "stringify", "data": {"key": "value"}, "success?": "next-node"}}'

example_usage: '{"storage-1": {"operation": "get", "key": "user_preferences", "found?": "use-prefs", "not_found?": "set-defaults"}}'

// ❌ BAD
example_usage: 'math node with add operation'  // Not JSON
example_usage: '{"operation": "add"}'  // Incomplete, missing node ID
```

#### 5. Example Config - Configuration Structure

Show the config structure with type hints:

```typescript
// ✅ GOOD - Clear type hints with optional markers
example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}'

example_config: '{"operation": "read|write|exists", "path": "string", "content?": "string"}'

example_config: '{"key": "string", "value?": "any", "ttl?": "number"}'

// Use ? suffix for optional parameters
// Use | for enum-like choices
// Use [...] for arrays
// Use {...} for objects

// ❌ BAD
example_config: '{"operation": "string", "values": "array"}'  // Not specific enough
example_config: 'operation and values'  // Not JSON
```

#### 6. State Keys - Document State Interactions

Help users understand state dependencies:

```typescript
// ✅ GOOD
ai_hints: {
  get_from_state: ['userPreferences', 'sessionId'],  // This node reads these
  post_to_state: ['calculationResult', 'lastCalculationTime']  // This node writes these
}

ai_hints: {
  get_from_state: [],  // This node doesn't read state
  post_to_state: ['mathResult']  // Only writes mathResult
}

// ❌ BAD
ai_hints: {
  get_from_state: ['anything'],  // Too vague
  post_to_state: ['data']  // Too generic
}
```

### Complete AI Hints Examples

#### Example 1: MathNode

```typescript
ai_hints: {
  purpose: 'Perform mathematical operations on numeric values',
  when_to_use: 'When you need to calculate sums, differences, products, or quotients in a workflow',
  expected_edges: ['success', 'error'],
  example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next-node"}}',
  example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}',
  get_from_state: [],
  post_to_state: ['mathResult']
}
```

#### Example 2: FileSystemNode

```typescript
ai_hints: {
  purpose: 'Perform file system operations on the server (read, write, delete, create directories)',
  when_to_use: 'When you need to interact with the file system in server environments',
  expected_edges: ['success', 'error', 'exists', 'not_exists'],
  example_usage: '{"fs-1": {"operation": "read", "path": "/tmp/data.txt", "success?": "process-data"}}',
  example_config: '{"operation": "read|write|exists|delete|mkdir", "path": "string", "content?": "string"}',
  get_from_state: [],
  post_to_state: ['fileContent', 'fileWritten', 'fileExists', 'fileDeleted', 'dirCreated']
}
```

#### Example 3: LogicNode

```typescript
ai_hints: {
  purpose: 'Perform boolean logic operations and comparisons',
  when_to_use: 'When you need conditional branching based on boolean logic (and, or, not) or value comparisons (equal, greater, less)',
  expected_edges: ['true', 'false', 'error'],
  example_usage: '{"logic-1": {"operation": "equal", "values": [10, 10], "true?": "success-path", "false?": "failure-path"}}',
  example_config: '{"operation": "and|or|not|equal|greater|less", "values": "[any, ...]"}',
  get_from_state: [],
  post_to_state: ['logicResult']
}
```

### Testing AI Hints

To test if your AI hints are effective, ask yourself:

1. **Can an AI understand what this node does from `purpose` alone?**
2. **Do the examples show realistic usage?**
3. **Are all possible edges documented?**
4. **Is the config structure clear with type hints?**
5. **Are state dependencies explicit?**

### AI Hints Best Practices

```typescript
// ✅ DO
- Keep purpose to 1 sentence
- Use specific scenarios in when_to_use
- List ALL possible edges (including 'error')
- Provide complete JSON examples
- Use type hints in example_config
- Mark optional params with ?
- Document state reads/writes

// ❌ DON'T
- Write vague, generic descriptions
- Skip example_usage or example_config
- Forget to list error edges
- Use incomplete examples
- Leave type hints ambiguous
- Assume state knowledge
```

---

## Testing Guidelines

### Test Structure

Use the following structure for testing nodes:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyNode } from './MyNode';
import type { ExecutionContext } from '../src/types';

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

  describe('execute', () => {
    it('should perform basic operation', async () => {
      const result = await node.execute(context, {
        param: 'value'
      });

      expect(result.success).toBeDefined();
      expect(context.state.myResult).toBe('expected');
    });
  });
});
```

### Test Categories

#### 1. Metadata Tests

```typescript
describe('metadata', () => {
  it('should have correct id', () => {
    expect(node.metadata.id).toBe('myNode');
  });

  it('should have version', () => {
    expect(node.metadata.version).toBeDefined();
    expect(node.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should have required inputs defined', () => {
    expect(node.metadata.inputs).toContain('param1');
  });

  it('should have ai_hints', () => {
    expect(node.metadata.ai_hints).toBeDefined();
    expect(node.metadata.ai_hints?.purpose).toBeDefined();
  });
});
```

#### 2. Happy Path Tests

```typescript
describe('successful execution', () => {
  it('should process valid input', async () => {
    const result = await node.execute(context, {
      param: 'valid-value'
    });

    expect(result.success).toBeDefined();
    const data = await result.success!(context);
    expect(data.result).toBe('expected-output');
  });

  it('should update state correctly', async () => {
    await node.execute(context, { param: 'value' });

    expect(context.state.myResult).toBe('expected');
  });
});
```

#### 3. Error Handling Tests

```typescript
describe('error handling', () => {
  it('should return error for missing parameter', async () => {
    const result = await node.execute(context, {});

    expect(result.error).toBeDefined();
    const errorData = await result.error!(context);
    expect(errorData.error).toContain('Missing required parameter');
  });

  it('should handle invalid input gracefully', async () => {
    const result = await node.execute(context, {
      param: null
    });

    expect(result.error).toBeDefined();
  });
});
```

#### 4. Edge Routing Tests

```typescript
describe('edge routing', () => {
  it('should return success edge', async () => {
    const result = await node.execute(context, { param: 'valid' });

    expect(result.success).toBeDefined();
    expect(typeof result.success).toBe('function');
  });

  it('should return correct edge based on condition', async () => {
    const result = await node.execute(context, { value: 100 });

    expect(result.high).toBeDefined();
    expect(result.low).toBeUndefined();
  });
});
```

#### 5. State Management Tests

```typescript
describe('state management', () => {
  it('should read from state', async () => {
    context.state.inputValue = 42;

    const result = await node.execute(context, {});

    expect(result.success).toBeDefined();
    const data = await result.success!(context);
    expect(data.processedValue).toBe(84); // inputValue * 2
  });

  it('should preserve existing state', async () => {
    context.state.existingKey = 'preserve-me';

    await node.execute(context, { param: 'value' });

    expect(context.state.existingKey).toBe('preserve-me');
  });

  it('should set nested state correctly', async () => {
    await node.execute(context, {
      path: 'user.profile.name',
      value: 'John'
    });

    expect(context.state.user.profile.name).toBe('John');
  });
});
```

#### 6. Type Safety Tests

```typescript
describe('type safety', () => {
  it('should handle string values', async () => {
    const result = await node.execute(context, {
      value: 'string-value'
    });

    expect(result.success).toBeDefined();
  });

  it('should handle number values', async () => {
    const result = await node.execute(context, {
      value: 42
    });

    expect(result.success).toBeDefined();
  });

  it('should handle array values', async () => {
    const result = await node.execute(context, {
      values: [1, 2, 3]
    });

    expect(result.success).toBeDefined();
  });

  it('should handle null explicitly', async () => {
    const result = await node.execute(context, {
      value: null
    });

    expect(result.success).toBeDefined();
  });
});
```

### Testing Async Operations

```typescript
describe('async operations', () => {
  it('should handle async processing', async () => {
    const result = await node.execute(context, {
      url: 'https://api.example.com/data'
    });

    expect(result.success).toBeDefined();
    const data = await result.success!(context);
    expect(data.apiResponse).toBeDefined();
  });

  it('should handle async errors', async () => {
    const result = await node.execute(context, {
      url: 'https://invalid-url-that-fails'
    });

    expect(result.error).toBeDefined();
  });
});
```

### Testing Environment-Specific Nodes

```typescript
// Server node tests
describe('FileSystemNode', () => {
  it('should read file from filesystem', async () => {
    // Use test fixtures or temp files
    const result = await node.execute(context, {
      operation: 'read',
      path: '/tmp/test-file.txt'
    });

    expect(result.success).toBeDefined();
  });
});

// Client node tests
describe('LocalStorageNode', () => {
  beforeEach(() => {
    // Mock localStorage for testing
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    } as any;
  });

  it('should store value in localStorage', async () => {
    const result = await node.execute(context, {
      operation: 'set',
      key: 'test-key',
      value: 'test-value'
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
  });
});
```

### Test Coverage Goals

Aim for these coverage targets:

- **Metadata**: 100% (all fields present and valid)
- **Happy paths**: 100% (all success scenarios)
- **Error handling**: 90%+ (all expected errors)
- **Edge routing**: 100% (all possible edges)
- **State management**: 90%+ (all state mutations)

---

## Examples Gallery

### Example 1: StateSetterNode (Complete Reference Implementation)

```typescript
/**
 * StateSetterNode - Universal node for setting state values via syntactic sugar
 *
 * Enables workflows to use $.path.to.state syntax for direct state manipulation
 * This is an internal node automatically used by the parser when detecting $.syntax
 */

import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class StateSetterNode extends WorkflowNode {
  metadata = {
    id: '__state_setter__',
    name: 'State Setter',
    version: '1.0.0',
    description: 'Internal node for setting nested state values via syntactic sugar ($.path.to.state)',
    inputs: ['statePath', 'value'],
    outputs: ['success', 'error'],
    ai_hints: {
      purpose: 'Set nested state values using $.path.to.state syntax',
      when_to_use: 'Automatically used by parser when $.syntax is detected in workflow definitions',
      expected_edges: ['success', 'error'],
      example_usage: '{"$.config.timeout": {"value": 30, "success?": "next-node"}}',
      example_config: '{"statePath": "string", "value": "any"}',
      get_from_state: [],
      post_to_state: ['<dynamic-path-from-config>', '_lastStateSet']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
      // Extract statePath and value from config
      const { statePath, value } = config || {};

      // Validate inputs
      if (!statePath || typeof statePath !== 'string') {
        return {
          error: () => ({
            error: 'StateSetterNode requires a valid statePath parameter',
            nodeId: context.nodeId
          })
        };
      }

      if (value === undefined) {
        return {
          error: () => ({
            error: 'StateSetterNode requires a value parameter',
            nodeId: context.nodeId,
            statePath
          })
        };
      }

      // Parse the path into segments
      const segments = statePath.split('.').filter((seg: string) => seg.length > 0);

      if (segments.length === 0) {
        return {
          error: () => ({
            error: 'Invalid state path: path cannot be empty',
            nodeId: context.nodeId,
            statePath
          })
        };
      }

      // Set the nested value in context.state
      this.setNestedValue(context.state, segments, value);

      // Store metadata about the operation
      context.state._lastStateSet = {
        path: statePath,
        value,
        timestamp: new Date().toISOString(),
        nodeId: context.nodeId
      };

      return {
        success: () => ({
          statePath,
          value,
          message: `Successfully set state at path: ${statePath}`
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Helper method to set a nested value in an object
   * Creates intermediate objects as needed
   */
  private setNestedValue(obj: Record<string, any>, segments: string[], value: any): void {
    let current: any = obj;

    // Navigate to the parent object, creating intermediate objects as needed
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;

      // If the segment doesn't exist or isn't an object, create a new object
      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {};
      }

      current = current[segment];
    }

    // Set the final value
    const finalSegment = segments[segments.length - 1]!;
    current[finalSegment] = value;
  }
}

export default StateSetterNode;
```

**Key Learnings:**
1. Comprehensive input validation with specific error messages
2. Helper methods for complex operations (setNestedValue)
3. Metadata storage for debugging and auditing
4. Clear separation of concerns (validate, process, store, return)
5. Detailed JSDoc documentation

### Example 2: MathNode (Simple Universal Node)

```typescript
import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class MathNode extends WorkflowNode {
  metadata = {
    id: 'math',
    name: 'Math Operations',
    version: '1.0.0',
    description: 'Universal math node - performs basic mathematical operations',
    inputs: ['operation', 'values'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Perform mathematical operations on numeric values',
      when_to_use: 'When you need to calculate sums, differences, products, or quotients in a workflow',
      expected_edges: ['success', 'error'],
      example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next-node"}}',
      example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}',
      get_from_state: [],
      post_to_state: ['mathResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, values } = config || {};

    if (!operation || !values) {
      return {
        error: () => ({ error: 'Missing operation or values' })
      };
    }

    let result: number;

    try {
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
          result = values.reduce((a: number, b: number) => a / b);
          break;
        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }

      context.state.mathResult = result;

      return {
        success: () => ({ result })
      };
    } catch (error) {
      return {
        error: () => ({ error: error instanceof Error ? error.message : 'Math operation failed' })
      };
    }
  }
}

export default MathNode;
```

**Key Learnings:**
1. Simple, focused operations (does one thing well)
2. Switch statement for operation routing
3. Array.reduce for aggregation operations
4. Default case for unknown operations
5. State mutation + edge data pattern

### Example 3: LocalStorageNode (Client-Specific)

```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

interface LocalStorageNodeConfig {
  operation?: string;
  key?: string;
  value?: string;
}

export class LocalStorageNode extends WorkflowNode {
  metadata = {
    id: 'localStorage',
    name: 'Local Storage Operations',
    version: '1.0.0',
    description: 'Browser-specific local storage operations - store and retrieve data in browser',
    inputs: ['operation', 'key', 'value'],
    outputs: ['result', 'found', 'not_found'],
    ai_hints: {
      purpose: 'Persist and retrieve data in browser localStorage',
      when_to_use: 'When you need to store data in the browser that persists across sessions',
      expected_edges: ['success', 'error', 'found', 'not_found'],
      example_usage: '{"storage-1": {"operation": "set", "key": "username", "value": "john", "success?": "next-node"}}',
      example_config: '{"operation": "set|get|remove|clear|keys", "key": "string", "value?": "any"}',
      get_from_state: [],
      post_to_state: ['localStorageSet', 'localStorageValue', 'localStorageRemoved', 'localStorageCleared', 'localStorageKeys']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { operation, key, value } = (config as LocalStorageNodeConfig) || {};

    if (!operation || !key) {
      return {
        error: () => ({ error: 'Missing operation or key' })
      };
    }

    // Environment check
    if (typeof localStorage === 'undefined') {
      return {
        error: () => ({ error: 'localStorage is not available in this environment' })
      };
    }

    try {
      switch (operation) {
        case 'set': {
          if (value === undefined) {
            return {
              error: () => ({ error: 'Missing value for set operation' })
            };
          }

          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, stringValue);
          context.state.localStorageSet = { key, value: stringValue };

          return {
            success: () => ({ key, value: stringValue })
          };
        }

        case 'get': {
          const storedValue = localStorage.getItem(key);
          if (storedValue !== null) {
            let parsedValue;
            try {
              parsedValue = JSON.parse(storedValue);
            } catch {
              parsedValue = storedValue;
            }

            context.state.localStorageValue = parsedValue;
            return {
              found: () => ({ key, value: parsedValue })
            };
          } else {
            return {
              not_found: () => ({ key })
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
          error: error instanceof Error ? error.message : 'localStorage operation failed',
          operation,
          key
        })
      };
    }
  }
}
```

**Key Learnings:**
1. Environment availability check (`typeof localStorage`)
2. TypeScript interface for config type safety
3. Multiple edge patterns (found/not_found)
4. JSON parsing with fallback to string
5. Different state keys for different operations

### Example 4: FileSystemNode (Server-Specific)

```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
import fs from 'fs/promises';
import path from 'path';

export class FileSystemNode extends WorkflowNode {
  metadata = {
    id: 'filesystem',
    name: 'File System Operations',
    version: '1.0.0',
    description: 'Server-specific file system operations - read, write, and manage files',
    inputs: ['operation', 'path', 'content'],
    outputs: ['result', 'content', 'exists'],
    ai_hints: {
      purpose: 'Perform file system operations on the server (read, write, delete, create directories)',
      when_to_use: 'When you need to interact with the file system in server environments',
      expected_edges: ['success', 'error', 'exists', 'not_exists'],
      example_usage: '{"fs-1": {"operation": "read", "path": "/tmp/data.txt", "success?": "process-data"}}',
      example_config: '{"operation": "read|write|exists|delete|mkdir", "path": "string", "content?": "string"}',
      get_from_state: [],
      post_to_state: ['fileContent', 'fileWritten', 'fileExists', 'fileDeleted', 'dirCreated']
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

**Key Learnings:**
1. Node.js-specific imports (fs/promises)
2. Nested try-catch for existence checks
3. Operation-specific validation (content required for write)
4. Different edge names for different operations
5. Path safety considerations

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Node not found" Error

**Symptom:**
```
NodeNotFoundError: Node not found: myNode
```

**Causes & Solutions:**

1. **Node not exported as default:**
```typescript
// ❌ BAD
export class MyNode extends WorkflowNode { }

// ✅ GOOD
export class MyNode extends WorkflowNode { }
export default MyNode;
```

2. **Wrong metadata ID:**
```typescript
// Workflow uses: "myNode"
// But metadata has:
metadata = {
  id: 'my-node'  // ❌ Mismatch
}

// Fix:
metadata = {
  id: 'myNode'  // ✅ Matches workflow usage
}
```

3. **Node in wrong directory for environment:**
```typescript
// Client workflow tries to use server node
// Solution: Move node to /shared/nodes/ if it should be universal
// Or use appropriate environment for workflow
```

#### Issue 2: State References Not Resolving

**Symptom:**
```typescript
// Config has "$.userData" but node receives the string literally
config.userId === "$.userData"  // Expected: actual userData object
```

**Causes & Solutions:**

1. **StateResolver not being used:**
   - This should be automatic in the ExecutionEngine
   - Check that you're using the current engine version

2. **State key doesn't exist:**
```typescript
// State doesn't have userData
context.state = {}

// Workflow uses:
{
  "node-1": {
    "data": "$.userData"  // Resolves to undefined
  }
}

// Solution: Ensure state is set before referencing it
```

#### Issue 3: Edge Not Routing Correctly

**Symptom:**
Workflow doesn't follow expected path after node execution

**Causes & Solutions:**

1. **Edge function not called:**
```typescript
// ❌ BAD - Returns object instead of function
return {
  success: { result: data }  // Plain object
};

// ✅ GOOD - Returns function
return {
  success: () => ({ result: data })  // Function
};
```

2. **Multiple edges returned:**
```typescript
// Only the first matching edge is used
return {
  success: () => ({ result: 1 }),
  also_success: () => ({ result: 2 })  // Never called
};
```

3. **Edge name doesn't match workflow:**
```json
// Workflow expects "success" edge
{
  "node-1": {
    "success?": "next-node"
  }
}

// But node returns "complete" edge
return { complete: () => ({}) };  // Mismatch!
```

#### Issue 4: State Not Persisting

**Symptom:**
State changes in one node don't appear in the next node

**Causes & Solutions:**

1. **Creating new state object:**
```typescript
// ❌ BAD - Replaces state object
context.state = { newKey: 'value' };

// ✅ GOOD - Mutates existing state
context.state.newKey = 'value';
```

2. **Async state update not awaited:**
```typescript
// ❌ BAD - State might not be saved
this.updateStateAsync(context.state);
return { success: () => ({}) };

// ✅ GOOD - Wait for state save
await this.updateStateAsync(context.state);
return { success: () => ({}) };
```

#### Issue 5: TypeScript Errors

**Symptom:**
```
Type 'unknown' is not assignable to type 'string'
```

**Causes & Solutions:**

1. **Config not typed:**
```typescript
// ❌ BAD
async execute(context: ExecutionContext, config?: any) {
  const param = config.param;  // Type is 'any'
}

// ✅ GOOD
interface MyConfig {
  param: string;
  value?: number;
}

async execute(context: ExecutionContext, config?: unknown) {
  const { param, value } = (config as MyConfig) || {};
  // param is typed as string | undefined
}
```

#### Issue 6: Environment Incompatibility

**Symptom:**
```
ReferenceError: localStorage is not defined
```

**Causes & Solutions:**

1. **Using browser APIs in server:**
```typescript
// ❌ BAD - Crashes in server environment
const value = localStorage.getItem('key');

// ✅ GOOD - Check environment first
if (typeof localStorage === 'undefined') {
  return { error: () => ({ error: 'localStorage not available' }) };
}
const value = localStorage.getItem('key');
```

2. **Using Node.js APIs in browser:**
```typescript
// ❌ BAD - Crashes in browser
import fs from 'fs';
const content = fs.readFileSync('file.txt');

// ✅ GOOD - Use server node in /server/nodes/
// Don't try to use Node.js APIs in universal or client nodes
```

#### Issue 7: Nested State Not Creating Intermediate Objects

**Symptom:**
```
Cannot set property 'theme' of undefined
```

**Causes & Solutions:**

```typescript
// ❌ BAD - Parent object doesn't exist
context.state.user.profile.theme = 'dark';
// Error if user or profile don't exist

// ✅ GOOD - Create intermediate objects
if (!context.state.user) context.state.user = {};
if (!context.state.user.profile) context.state.user.profile = {};
context.state.user.profile.theme = 'dark';

// ✅ BETTER - Use helper method
this.setNestedValue(context.state, ['user', 'profile', 'theme'], 'dark');
```

#### Issue 8: AI Not Understanding Node Usage

**Symptom:**
AI-generated workflows use node incorrectly or don't use it at all

**Causes & Solutions:**

1. **Poor AI hints:**
```typescript
// ❌ BAD
ai_hints: {
  purpose: 'Does stuff',
  when_to_use: 'When needed',
  expected_edges: []
}

// ✅ GOOD
ai_hints: {
  purpose: 'Perform mathematical operations on numeric values',
  when_to_use: 'When you need to calculate sums, differences, products, or quotients',
  expected_edges: ['success', 'error'],
  example_usage: '{"math-1": {"operation": "add", "values": [10, 20], "success?": "next"}}',
  example_config: '{"operation": "add|subtract", "values": "[number, ...]"}'
}
```

#### Issue 9: Workflow Validation Failing

**Symptom:**
```
Workflow validation failed: Invalid node reference
```

**Causes & Solutions:**

1. **Node not registered:**
   - Ensure node file is in correct directory
   - Check that node extends WorkflowNode
   - Verify default export exists

2. **Metadata missing required fields:**
```typescript
// ❌ BAD
metadata = {
  id: 'myNode'
  // Missing name, version
}

// ✅ GOOD
metadata = {
  id: 'myNode',
  name: 'My Node',
  version: '1.0.0'
}
```

### Debugging Tips

1. **Add logging to execute method:**
```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  console.log('[MyNode] Executing with config:', config);
  console.log('[MyNode] Current state:', context.state);

  const result = await this.operation(config);

  console.log('[MyNode] Result:', result);
  return { success: () => ({ result }) };
}
```

2. **Use metadata in error messages:**
```typescript
return {
  error: () => ({
    error: 'Operation failed',
    nodeId: context.nodeId,
    workflowId: context.workflowId,
    executionId: context.executionId,
    config: config  // Include config for debugging
  })
};
```

3. **Test nodes in isolation:**
```typescript
// Create standalone test
const node = new MyNode();
const context = {
  state: {},
  inputs: {},
  workflowId: 'test',
  nodeId: 'test',
  executionId: 'test'
};

const result = await node.execute(context, { param: 'value' });
console.log('Result:', result);
console.log('State:', context.state);
```

---

## Quick Reference

### Node Checklist

When creating a new node, ensure:

- [ ] Class extends `WorkflowNode`
- [ ] Metadata has `id`, `name`, `version`
- [ ] Metadata has complete `ai_hints`
- [ ] Execute method signature is correct
- [ ] Input validation is comprehensive
- [ ] Error handling returns `error` edge
- [ ] State mutations use `context.state.key = value`
- [ ] Returns EdgeMap with functions
- [ ] Helper methods are private
- [ ] Node is placed in correct environment directory
- [ ] Default export exists
- [ ] Tests cover happy path and errors
- [ ] JSDoc documentation exists for complex logic

### Common Imports

```typescript
// Universal node
import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

// Server node
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

// Client node
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
```

### Metadata Template

```typescript
metadata = {
  id: 'nodeId',
  name: 'Node Name',
  version: '1.0.0',
  description: 'What this node does',
  inputs: ['param1', 'param2'],
  outputs: ['result'],
  ai_hints: {
    purpose: 'Brief purpose',
    when_to_use: 'When to use this',
    expected_edges: ['success', 'error'],
    example_usage: '{"node-1": {"param": "value", "success?": "next"}}',
    example_config: '{"param": "string", "optional?": "number"}',
    get_from_state: [],
    post_to_state: ['resultKey']
  }
}
```

### Execute Template

```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { param } = config || {};

  if (!param) {
    return { error: () => ({ error: 'Missing param' }) };
  }

  try {
    const result = await this.performOperation(param);
    context.state.result = result;
    return { success: () => ({ result }) };
  } catch (error) {
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

**End of Node Development Blueprint v1.0.0**

This blueprint should be used as the authoritative guide for developing workflow nodes in the Agentic Workflow Engine. When in doubt, refer to the StateSetterNode implementation as the reference standard for clean, well-documented node development.
