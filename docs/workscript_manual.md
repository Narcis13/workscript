# Workscript Manual

**A Comprehensive Guide to the JSON-Based Workflow Orchestration System**

---

## The Philosophy: Data as Program

Workscript represents a paradigm shift in how we think about automation and orchestration. Instead of writing imperative code that tells computers *how* to do things step by step, Workscript uses **declarative JSON data** that describes *what* should happen.

This distinction matters profoundly in the age of AI agents.

### JSON: The Universal Language

Consider what JSON truly is: a structured, hierarchical data format that both humans and machines can read and write. Just as HTML describes documents through a DOM (Document Object Model) that browsers render into visual pages, **Workscript workflows are living documents** that the engine interprets and executes.

This has revolutionary implications:

```json
{
  "id": "calculate-discount",
  "name": "Calculate Customer Discount",
  "version": "1.0.0",
  "initialState": { "basePrice": 100, "discountPercent": 15 },
  "workflow": [
    { "math": { "operation": "multiply", "values": ["$.basePrice", "$.discountPercent"], "success?": "apply-discount" } },
    { "$.finalPrice": { "value": "$.mathResult" } }
  ]
}
```

This workflow is not code. It is **data describing intent**. An AI agent can:
- Read and understand it without executing it
- Generate new workflows by producing JSON
- Modify running workflows by updating the data structure
- Reason about workflow logic through data analysis

### The DOM Metaphor: Workflows as Living Documents

In web browsers, the DOM represents a page as a tree of nodes that JavaScript can read and modify at runtime. When you change the DOM, the page updates instantly.

Workscript workflows work the same way. The JSON structure is parsed into an Abstract Syntax Tree (AST) of nodes, edges, and configurations. But here's the magical part: **because workflows are just data**, they can be modified during execution.

Imagine an AI agent that:
1. Starts executing a workflow
2. Observes intermediate results through hooks
3. *Modifies the remaining workflow steps* based on what it learned
4. Continues execution with the updated plan

This is not science fiction. It's the architectural foundation of Workscript.

---

## Core Concepts

### 1. Nodes: The Atoms of Automation

Every workflow is composed of **nodes** - self-contained units that perform exactly one task. The genius of Workscript's node architecture is its simplicity:

```typescript
export abstract class WorkflowNode {
  abstract metadata: NodeMetadata;

  abstract execute(
    context: ExecutionContext,
    config?: Record<string, any>
  ): Promise<EdgeMap>;
}
```

That's it. Every node in the entire system follows this pattern:
- **Metadata** describes what the node does (for humans and AI)
- **Execute** takes context and configuration, returns edges

Let's look at a real node - the MathNode:

```typescript
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
      expected_edges: ['success', 'error']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, values } = config || {};

    let result: number;
    switch (operation) {
      case 'add':
        result = values.reduce((a, b) => a + b, 0);
        break;
      // ... other operations
    }

    context.state.mathResult = result;

    return {
      success: () => ({ result })
    };
  }
}
```

Notice the simplicity:
1. Node receives configuration (`operation: 'add', values: [10, 20]`)
2. Node performs its single task
3. Node updates shared state if needed
4. Node returns edges indicating what happened

The power comes not from individual nodes, but from their composition.

### 2. Edges: The Flow of Intention

When a node completes, it returns an **EdgeMap** - a set of named edges that describe possible outcomes:

```typescript
return {
  success: () => ({ result: calculatedValue }),
  error: () => ({ error: 'Division by zero' }),
  empty: () => ({ message: 'No data to process' })
};
```

Edges are not just labels - they carry data. When you route to the next node, that edge data becomes available.

In workflow definitions, edges are specified with the `?` suffix:

```json
{
  "validate-input": {
    "data": "$.userInput",
    "valid?": "process-data",
    "invalid?": "show-error",
    "empty?": "request-input"
  }
}
```

This creates a **branching flow** where execution takes different paths based on outcomes. The engine doesn't need complex conditionals - nodes simply declare their possible outcomes, and the workflow definition routes them.

### 3. State: The Shared Memory

Every workflow has a shared state object that all nodes can read from and write to:

```json
{
  "initialState": {
    "customer": { "name": "Alice", "tier": "gold" },
    "items": [],
    "total": 0
  }
}
```

The StateManager provides:
- **Atomic updates** - Changes happen completely or not at all
- **Snapshots** - Save state at any point for rollback
- **Watchers** - React to specific state changes
- **Edge context** - Temporary data passing between nodes

### 4. State Resolution: The `$.` Syntax

Workscript uses an elegant syntax for referencing state values:

```json
{
  "math": {
    "operation": "multiply",
    "values": ["$.price", "$.quantity"]
  }
}
```

The `$.` prefix tells the engine to resolve this reference at execution time. The StateResolver:
- Resolves `$.price` to `state.price`
- Supports nested paths: `$.customer.address.city`
- Preserves types - numbers stay numbers, objects stay objects

### 5. State Setters: Direct State Manipulation

For simple state updates, Workscript provides syntactic sugar:

```json
{ "$.total": 150 }
```

or with complex values:

```json
{ "$.config.timeout": { "value": 30000, "success?": "continue" } }
```

This creates a hidden `StateSetterNode` that writes directly to state. No need to create a custom node just to set a value.

---

## The Execution Model

### How Workflows Run

When you execute a workflow, the ExecutionEngine:

1. **Parses** the JSON definition into an AST
2. **Validates** the structure and checks node availability
3. **Initializes** shared state
4. **Executes** nodes sequentially, following edge routes
5. **Returns** final state and execution results

```
┌─────────────────────────────────────────────────────────┐
│                    Workflow JSON                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               WorkflowParser (AST Generation)           │
│  - JSON Schema validation                               │
│  - Semantic validation (node existence, edge targets)   │
│  - ParsedNode tree construction                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  ExecutionEngine                        │
│  - Node execution orchestration                         │
│  - Edge-based routing                                   │
│  - State management integration                         │
│  - Hook lifecycle management                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Final State                           │
└─────────────────────────────────────────────────────────┘
```

### Loop Nodes: Iteration Made Simple

Append `...` to any node ID to make it a loop node:

```json
{
  "process-item...": {
    "item": "$.currentItem",
    "continue?": {
      "math": { "operation": "add", "values": ["$.counter", 1] }
    }
  }
}
```

When a loop node's edge route completes, execution returns to the same node. This continues until:
- The node returns an edge with no route defined
- The loop limit is reached (default: 1000 iterations)

Loop nodes enable iteration without requiring special loop constructs. The workflow is still just data describing flow.

### Nested Execution

Edges can contain entire nested workflow structures:

```json
{
  "validate": {
    "data": "$.input",
    "valid?": {
      "process": {
        "input": "$.input",
        "success?": {
          "notify": { "message": "Processing complete" }
        }
      }
    },
    "invalid?": "error-handler"
  }
}
```

The engine recursively executes nested structures while maintaining a single shared state.

---

## The Hook System: Observability and Control

Hooks allow external code to observe and react to workflow events without modifying node logic:

```typescript
hookManager.register('node:after-execute', {
  name: 'log-node-results',
  handler: async (context) => {
    console.log(`Node ${context.nodeId} completed with edge: ${context.data?.edgeResult?.edge}`);
  }
});
```

### Available Hook Events

**Workflow Lifecycle:**
- `workflow:before-start` - Before workflow initialization
- `workflow:after-start` - After state initialization
- `workflow:before-end` - Before workflow completion
- `workflow:after-end` - After workflow completion
- `workflow:on-error` - On any workflow error

**Node Execution:**
- `node:before-execute` - Before each node runs
- `node:after-execute` - After each node completes
- `node:on-error` - On node execution error
- `node:on-edge-taken` - When a specific edge is followed
- `node:on-state-change` - When node modifies state

**State Management:**
- `state:before-update` - Before state changes
- `state:after-update` - After state changes
- `state:on-snapshot` - When snapshot is created
- `state:on-rollback` - When state is rolled back

### Hook Features

- **Priority ordering** - Higher priority hooks execute first
- **Filtering** - Only trigger for specific nodes or conditions
- **Once-only hooks** - Execute only on first occurrence
- **Async support** - Handlers can be async functions

Hooks are the foundation for:
- Real-time monitoring via WebSocket
- Audit logging
- Performance metrics
- AI agent observation
- Debugging and development tools

---

## The Node Library

Workscript includes 35+ production-ready nodes organized into categories:

### Core Nodes
| Node | Purpose |
|------|---------|
| `math` | Mathematical operations (add, subtract, multiply, divide) |
| `logic` | Boolean logic (and, or, not, conditions) |
| `data-transform` | Object and array transformations |
| `log` | Logging and debugging output |
| `empty` | No-op placeholder for workflow structure |

### Data Manipulation Nodes
| Node | Purpose |
|------|---------|
| `filter` | Filter arrays by conditions |
| `sort` | Sort arrays by fields |
| `aggregate` | Group and aggregate data |
| `summarize` | Statistical summaries |
| `limit` | Limit result set size |
| `split-out` | Split single item into multiple |
| `remove-duplicates` | Deduplicate arrays |
| `edit-fields` | Add, remove, rename fields |
| `transform-object` | Deep object transformations |
| `json-extract` | Parse and extract from JSON |
| `compare-datasets` | Compare two data sets |
| `switch` | Conditional routing based on values |
| `validate-data` | Schema validation |

### Server Nodes
| Node | Purpose |
|------|---------|
| `filesystem` | Read, write, delete files |
| `database` | Query and modify databases |
| `auth` | Authentication operations |

### Integration Nodes
| Node | Purpose |
|------|---------|
| `google-connect` | Gmail OAuth connection |
| `send-email` | Send emails via Gmail |
| `list-emails` | List emails from Gmail |

---

## The Plugin System: Modular Architecture

The API server uses a plugin architecture that makes Workscript itself a plugin:

```typescript
const plugin: SaaSPlugin = {
  id: 'workscript',
  name: 'Workscript',
  version: '1.0.0',
  enabled: true,

  routes: {
    basePath: '/workscript',
    router: honoRouter
  },

  schema: {
    tables: [workflows, workflowExecutions]
  },

  aiManifest: {
    capabilities: [
      'Create and execute workflows with JSON definitions',
      'Schedule automated workflow execution with cron',
      // ...
    ],
    when_to_use: 'When you need to automate business processes'
  },

  async onLoad(context) {
    // Initialize services
  },

  async healthCheck() {
    // Return health status
  }
};
```

### Plugin Features

- **Auto-discovery** - Plugins are found by directory scanning
- **Lifecycle hooks** - `onLoad`, `onUnload`, `healthCheck`
- **Route mounting** - Each plugin gets a base path
- **Database schemas** - Plugins define their own tables
- **AI manifests** - LLM-friendly capability documentation

---

## AI-First Design

Workscript is built from the ground up for AI agents. Every component includes hints and metadata that help AI systems understand and work with workflows.

### Node AI Hints

Every node includes `ai_hints` in its metadata:

```typescript
ai_hints: {
  purpose: 'Perform mathematical operations on numeric values',
  when_to_use: 'When you need to calculate sums, differences, products, or quotients',
  expected_edges: ['success', 'error'],
  example_usage: '{"math-1": {"operation": "add", "values": [10, 20], "success?": "next-node"}}',
  example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}',
  get_from_state: [],
  post_to_state: ['mathResult']
}
```

An AI agent can:
1. Query available nodes and their capabilities
2. Understand when each node should be used
3. Generate correct configurations
4. Predict what state will be modified

### Plugin AI Manifests

Plugins expose their capabilities through manifests:

```typescript
aiManifest: {
  capabilities: [
    'Create and execute workflows with JSON definitions',
    'Validate workflow syntax and structure',
    'Schedule automated workflow execution with cron'
  ],
  when_to_use: 'When you need to automate business processes',
  endpoints: [
    {
      path: '/workscript/workflows/run',
      method: 'POST',
      description: 'Execute a workflow definition immediately',
      parameters: { workflowDefinition: 'Complete workflow JSON' }
    }
  ],
  examples: [
    {
      scenario: 'Simple Math Workflow',
      workflow: '{ "id": "simple-math", ... }',
      expected_outcome: 'Adds two numbers and logs the result'
    }
  ]
}
```

### The AI Agent Pattern

Consider an AI agent that needs to automate a business process:

1. **Discovery**: Agent queries `/workscript/nodes/allnodes` to understand available operations
2. **Planning**: Agent constructs a workflow JSON based on requirements
3. **Validation**: Agent validates via `/workscript/workflows/validate`
4. **Execution**: Agent triggers via `/workscript/workflows/run`
5. **Observation**: Agent monitors via hooks/WebSocket
6. **Adaptation**: Agent modifies workflow data based on results

Because workflows are JSON data, the entire pipeline is:
- Machine-readable and writable
- Self-documenting through metadata
- Modifiable at any point
- Observable through hooks

---

## Practical Examples

### Example 1: Data Processing Pipeline

```json
{
  "id": "process-orders",
  "name": "Process Daily Orders",
  "version": "1.0.0",
  "initialState": {
    "orders": [],
    "processed": [],
    "errors": []
  },
  "workflow": [
    {
      "fetch-orders": {
        "source": "database",
        "query": "SELECT * FROM orders WHERE status = 'pending'",
        "success?": "filter-valid",
        "error?": "log-error"
      }
    },
    {
      "filter-valid": {
        "data": "$.fetchResult",
        "conditions": [
          { "field": "total", "operator": "gt", "value": 0 }
        ],
        "success?": "process-each",
        "empty?": "log-empty"
      }
    },
    {
      "process-each...": {
        "item": "$.currentItem",
        "continue?": {
          "validate-order": {
            "order": "$.currentItem",
            "valid?": "calculate-tax",
            "invalid?": "add-to-errors"
          }
        }
      }
    },
    {
      "calculate-tax": {
        "operation": "multiply",
        "values": ["$.currentItem.total", 0.1],
        "success?": "update-order"
      }
    },
    {
      "summarize-results": {
        "data": "$.processed",
        "operation": "count",
        "success?": "send-report"
      }
    }
  ]
}
```

### Example 2: Conditional Workflow

```json
{
  "id": "customer-tier-discount",
  "name": "Apply Tier-Based Discount",
  "version": "1.0.0",
  "initialState": {
    "customer": { "tier": "gold", "yearsActive": 3 },
    "basePrice": 100
  },
  "workflow": [
    {
      "check-tier": {
        "value": "$.customer.tier",
        "gold?": { "$.discountPercent": 20 },
        "silver?": { "$.discountPercent": 10 },
        "bronze?": { "$.discountPercent": 5 },
        "default?": { "$.discountPercent": 0 }
      }
    },
    {
      "check-loyalty": {
        "condition": { "field": "$.customer.yearsActive", "operator": "gte", "value": 2 },
        "true?": {
          "math": {
            "operation": "add",
            "values": ["$.discountPercent", 5]
          }
        }
      }
    },
    {
      "calculate-final": {
        "operation": "multiply",
        "values": ["$.basePrice", { "operation": "subtract", "values": [1, { "operation": "divide", "values": ["$.discountPercent", 100] }] }]
      }
    }
  ]
}
```

### Example 3: Self-Modifying Workflow

The true power of JSON-as-data: workflows that modify themselves.

```json
{
  "id": "adaptive-retry",
  "name": "Adaptive Retry Pattern",
  "version": "1.0.0",
  "initialState": {
    "retryCount": 0,
    "maxRetries": 3,
    "backoffMs": 1000
  },
  "workflow": [
    {
      "attempt-operation...": {
        "operation": "external-api-call",
        "timeout": "$.backoffMs",
        "success?": "handle-success",
        "error?": {
          "check-retry": {
            "condition": { "field": "$.retryCount", "operator": "lt", "value": "$.maxRetries" },
            "true?": [
              { "$.retryCount": { "operation": "add", "values": ["$.retryCount", 1] } },
              { "$.backoffMs": { "operation": "multiply", "values": ["$.backoffMs", 2] } }
            ],
            "false?": "handle-failure"
          }
        }
      }
    }
  ]
}
```

This workflow dynamically adjusts its retry behavior based on state, implementing exponential backoff through pure data manipulation.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WORKSCRIPT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        JSON WORKFLOW DEFINITION                     │   │
│  │  - Declarative data, not imperative code                            │   │
│  │  - Human and machine readable                                       │   │
│  │  - Self-documenting through metadata                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          @workscript/engine                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ WorkflowParser│  │ExecutionEngine│  │     StateManager        │  │   │
│  │  │ - Validation  │  │ - Orchestration│ │ - Atomic updates        │  │   │
│  │  │ - AST creation│  │ - Edge routing │ │ - Snapshots/rollback    │  │   │
│  │  └──────────────┘  └──────────────┘  │ - State watchers        │  │   │
│  │                                       └──────────────────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ NodeRegistry │  │  HookManager │  │    StateResolver        │  │   │
│  │  │ - Node lookup│  │ - Lifecycle  │  │ - $.syntax resolution   │  │   │
│  │  │ - Metadata   │  │ - Observation│  │ - Type preservation     │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          @workscript/nodes                          │   │
│  │  35+ production nodes organized by category:                        │   │
│  │  - Core: math, logic, data-transform, log                          │   │
│  │  - Data: filter, sort, aggregate, validate, transform              │   │
│  │  - Server: filesystem, database, auth                              │   │
│  │  - Integrations: gmail, custom services                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            apps/api                                 │   │
│  │  Plugin-based API server:                                          │   │
│  │  - Workscript plugin for workflow execution                        │   │
│  │  - REST API endpoints                                              │   │
│  │  - WebSocket for real-time monitoring                              │   │
│  │  - Cron scheduler for automation                                   │   │
│  │  - Database persistence                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

### For Developers

- **Simple mental model** - Nodes do one thing, edges route flow
- **Composition over inheritance** - Build complex logic from simple parts
- **Observable by default** - Hooks provide visibility into execution
- **Type-safe** - Full TypeScript support throughout

### For Operations

- **Declarative infrastructure** - Workflows are version-controlled data
- **Audit trails** - Hook system enables complete logging
- **Hot reload** - Modify workflows without restarting
- **Resilient** - Snapshots enable rollback

### For AI Agents

- **Self-documenting** - AI hints describe every component
- **Data-native** - Generate workflows by producing JSON
- **Observable** - Monitor execution through hooks
- **Adaptive** - Modify workflows during execution

---

## The Future: Workflows as Living Programs

Workscript is designed for a future where AI agents are first-class participants in software systems. By representing workflows as declarative data rather than imperative code, we enable:

**AI-Generated Workflows**
- Agents can produce workflow JSON from natural language descriptions
- Generated workflows are immediately executable
- Validation catches errors before runtime

**Runtime Adaptation**
- Agents can observe workflow execution through hooks
- Based on observations, agents can modify the workflow data
- Modified workflows continue execution seamlessly

**Collaborative Automation**
- Multiple agents can work on different parts of a workflow
- Changes are expressed as data transformations
- Conflict resolution becomes data merging

**Self-Improving Systems**
- Workflows can analyze their own execution metrics
- Poor-performing paths can be automatically optimized
- Successful patterns can be extracted and reused

The JSON-based architecture is not a limitation - it's a liberation. It frees automation from the constraints of traditional programming and opens it to the collaborative, adaptive, intelligent future of software.

---

*Workscript: Where data becomes intention, and intention becomes action.*
