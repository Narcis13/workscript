# Agentic Workflow Engine Specification

## Overview

An agentic workflow engine that executes workflows defined in JSON files. The engine uses a node-based architecture where each node is a self-contained unit of work that can make decisions about execution flow through edge-based routing.

## Core Architecture

### Node-Based System
- **Nodes**: Fundamental units of work, implemented as TypeScript classes
- **Edges**: Return values from nodes that determine execution flow
- **Workflows**: JSON definitions that orchestrate node execution
- **Shared State**: Mutable object available to all nodes in a workflow
- **Optional Routing**: Edge routes are optional - missing routes continue to next node

## Node Structure

### Node Class Definition
```typescript
export abstract class WorkflowNode {
  abstract metadata: NodeMetadata
  
  abstract execute(
    context: ExecutionContext, 
    config?: Record<string, any>
  ): Promise<EdgeMap>
}
```

### Node Metadata
```typescript
interface NodeMetadata {
  id: string
  name: string
  description?: string
  version: string
  inputs?: string[]
  outputs?: string[]
}
```

### Execution Context
```typescript
interface ExecutionContext {
  state: Record<string, any>    // Shared mutable state
  inputs: Record<string, any>   // Current node inputs
  workflowId: string
  nodeId: string
  executionId: string
}
```

### Edge System
- Nodes return `EdgeMap` - object with edge names as keys and functions as values
- Edge functions return data/context for the next execution step
- Common edges: `success`, `error`, `loop`, `complete`, `unauthorized`, etc.

## Workflow Definition Format

### Basic Structure
```json
{
  "id": "workflow-identifier",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "initialState": {
    "key": "value",
    "nested": {
      "data": "here"
    }
  },
  "workflow": {
    "node-name": {
      "param1": "value1",
      "edge-name?": "next-node-or-config"
    }
  }
}
```

### Node Configuration Patterns

#### Simple Node Reference
```json
"node-name": {
  "param1": "value1",
  "param2": "value2"
}
```

#### Edge Routing Options
```json
"node-name": {
  "param1": "value1",
  "success?": "next-node",                    // Single node
  "error?": ["retry", "log-error"],           // Node sequence
  "unauthorized?": {                          // Nested node config
    "request-access": {
      "message": "Access denied",
      "redirectUrl": "/login"
    }
  }
}
```

#### Mixed Routing
```json
"process-users": {
  "batchSize": 10,
  "success?": [
    "validate-results",
    {
      "send-notification": {
        "template": "success",
        "recipients": ["admin@example.com"]
      }
    }
  ],
  "error?": "handle-error"
}
```

## Special Constructs

### Loop Mechanism
Nodes can emit a `loop` edge to create iteration patterns:

```json
"each-user": {
  "batchSize": 5,
  "loop?": ["process-user", "validate-result"],
  "complete?": "send-summary",
  "error?": "handle-batch-error"
}
```

**Loop Execution Flow:**
1. Node executes and returns `loop` edge
2. Executor runs the sequence defined in `loop?`
3. Executor calls the same node again
4. Repeats until node returns different edge (e.g., `complete`, `error`)

### Optional Routing
- Edge routes (keys ending with `?`) are optional
- If no route is defined for an edge, execution continues to next node in sequence
- This reduces verbosity in workflow definitions

## Execution Engine Components

### Node Registry
- Manages registration and discovery of available nodes
- Provides metadata about registered nodes
- Handles node instantiation

### Workflow Parser
- Validates JSON workflow definitions
- Resolves node references and configurations
- Handles nested routing structures

### Execution Engine
- Orchestrates workflow execution
- Manages shared state
- Handles edge routing and flow control
- Supports loop constructs
- Provides error handling and recovery

### State Management
- Maintains shared state object throughout workflow execution
- Allows nodes to read and modify state
- Supports initial state configuration
- Persists state across node executions

## Key Features

### Flexibility
- Nodes can be simple string references or complex configurations
- Edge routing supports single nodes, sequences, or nested configurations
- Optional routing reduces boilerplate

### Modularity
- Each node is self-contained in its own file
- Nodes can be versioned independently
- Easy to test and maintain individual nodes

### Control Flow
- Edge-based routing provides flexible conditional logic
- Loop constructs enable iteration without complex control structures
- Shared state enables data flow between nodes

### Extensibility
- Plugin architecture for custom nodes
- Configurable execution contexts
- Support for different node types and behaviors

## Implementation Stack

- **Runtime**: Bun
- **Server Framework**: Hono
- **Language**: TypeScript
- **Architecture**: Monorepo with shared types
- **Node Storage**: Individual files with class exports

## Example Use Cases

### Data Processing Pipeline
```json
{
  "id": "data-pipeline",
  "initialState": {
    "inputFile": "data.csv",
    "outputFormat": "json"
  },
  "workflow": {
    "read-file": {
      "encoding": "utf8",
      "error?": "handle-file-error"
    },
    "parse-csv": {
      "delimiter": ",",
      "headers": true,
      "error?": "log-parse-error"
    },
    "transform-data": {
      "rules": ["normalize", "validate"],
      "success?": "write-output",
      "validation_failed?": "generate-error-report"
    }
  }
}
```

### User Authentication Flow
```json
{
  "id": "auth-flow",
  "workflow": {
    "validate-credentials": {
      "hashAlgorithm": "bcrypt",
      "success?": "generate-token",
      "invalid?": "increment-failed-attempts",
      "locked?": "send-unlock-email"
    },
    "generate-token": {
      "expiresIn": "24h",
      "success?": "log-successful-login"
    }
  }
}
```

### Batch Processing with Loops
```json
{
  "id": "batch-processor",
  "initialState": {
    "items": ["item1", "item2", "item3"],
    "processed": 0
  },
  "workflow": {
    "process-batch": {
      "batchSize": 1,
      "loop?": ["process-item", "update-progress"],
      "complete?": "generate-report",
      "error?": "handle-batch-error"
    }
  }
}
```

## Future Considerations

- Parallel execution of node sequences
- Workflow versioning and migration
- Real-time monitoring and observability
- Workflow scheduling and triggers
- Integration with external systems
- Human in the Loop
- Workflow composition and reusability