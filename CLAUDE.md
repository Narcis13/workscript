# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Agentic Workflow Engine built as a TypeScript monorepo using the bhvr stack (Bun + Hono + Vite + React). The project implements a **shared, multi-environment** node-based workflow system with JSON definitions and comprehensive validation. The **core engine resides in the shared package** and can execute workflows across server (Hono API), client (browser), and future CLI environments with **distributed node architectures**.

## Essential Commands

### Development
- `bun run dev` - Start all services (client, server, shared)
- `bun run dev:client` - Start only the frontend
- `bun run dev:server` - Start only the backend
- `bun install` - Install dependencies and auto-build shared/server packages

### Build & Test
- `bun run build` - Build all packages in dependency order
- `cd server && bun run test` - Run server tests with Vitest
- `cd client && bun run lint` - Run ESLint on frontend code

### Testing Individual Components
- Run specific test: `cd server && bun test WorkflowParser.test.ts`
- Watch mode: `cd server && bun test --watch`

## Architecture Overview

The codebase follows a **shared-core monorepo architecture** with three main packages designed for **multi-environment execution**:

### 1. Shared Package (`/shared`) - **CORE ENGINE PACKAGE**
- **Complete Workflow Engine**: ExecutionEngine, WorkflowParser, StateManager, NodeRegistry
- **Universal Types**: `WorkflowDefinition`, `Node`, `Edge`, `SharedState`, `ExecutionContext`
- **Workflow Schema**: JSON Schema for workflow validation
- **Universal Nodes** (`/shared/nodes/`): Environment-agnostic nodes with zero external dependencies
- **Multi-Environment Support**: Same engine runs in server, client, CLI contexts
- Auto-compiled on install and during development

### 2. Server Package (`/server`) - **SERVER ENVIRONMENT**
- **Hono-based API Server**: REST endpoints using shared workflow engine
- **Server-Specific Nodes** (`/server/nodes/`): File system, database, authentication, email nodes
- **Infrastructure Integration**: Environment variables, server resources, external APIs
- **Enhanced Node Discovery**: Automatically loads shared + server nodes

### 3. Client Package (`/client`) - **CLIENT ENVIRONMENT**
- **React 19 + Vite 6 frontend** with shared workflow engine integration
- **Client-Specific Nodes** (`/client/nodes/`): DOM, localStorage, fetch, browser API nodes
- **Browser Compatibility**: Full workflow execution in browser environment
- **Enhanced Node Discovery**: Automatically loads shared + client nodes
- Tailwind CSS v4 with shadcn/ui components

## Key Concepts

### Multi-Environment Workflow System
- **Nodes**: Basic execution units with `nodeId`, `nodeType`, and `payload` - now distributed across environments
- **Edges**: Define workflow flow with conditions and routing
- **Loops**: Special node type for iteration with `maxIterations` control
- **Shared State**: Mutable state object accessible across all nodes in any environment
- **Environment Compatibility**: Same workflows can run in server, client, or universal contexts

### Distributed Node Architecture
1. **Universal Nodes** (`/shared/nodes/`): Zero dependencies, work everywhere (math, logic, data transformation)
2. **Server Nodes** (`/server/nodes/`): Server-specific capabilities (filesystem, database, auth)
3. **Client Nodes** (`/client/nodes/`): Browser-specific capabilities (DOM, localStorage, fetch)
4. **Automatic Discovery**: NodeRegistry loads appropriate nodes based on environment

### Validation Layers
1. **JSON Schema Validation**: Structural validation against workflow-schema.json (shared)
2. **Semantic Validation**: Logic validation (edge references, loop constraints) (shared)
3. **Node Availability**: Environment-specific node validation
4. **Error Reporting**: Detailed errors with source location and package tracking

## Important Conventions

1. **TypeScript**: Use strict mode - all code must pass TypeScript checks across all environments
2. **Testing**: Write tests for shared engine components in `/shared/` and environment-specific nodes in respective packages
3. **Error Handling**: Provide detailed, actionable error messages with package source information
4. **Monorepo**: Changes to shared engine require rebuilding dependent packages
5. **Node Placement**: 
   - Universal nodes (no dependencies) → `/shared/nodes/`
   - Server-specific nodes → `/server/nodes/`
   - Client-specific nodes → `/client/nodes/`
6. **Environment Detection**: Use NodeRegistry's `discoverFromPackages()` for automatic node loading

## Multi-Environment Usage Examples

### Server Environment (Hono API)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from 'shared';

// Server initialization - loads shared + server nodes
const registry = new NodeRegistry();
await registry.discoverFromPackages('server');
const engine = new ExecutionEngine(registry, new StateManager());

// Execute workflow with server capabilities
const result = await engine.execute(parsedWorkflow);
```

### Client Environment (Browser)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from 'shared';

// Client initialization - loads shared + client nodes  
const registry = new NodeRegistry();
await registry.discoverFromPackages('client');
const engine = new ExecutionEngine(registry, new StateManager());

// Execute workflow in browser
const result = await engine.execute(parsedWorkflow);
```

### Universal Environment (CLI/Testing)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from 'shared';

// Universal initialization - loads all available nodes
const registry = new NodeRegistry();
await registry.discoverFromPackages('universal');
const engine = new ExecutionEngine(registry, new StateManager());
```

## Workflow Definition Example

```json
{
  "id": "multi-env-example",
  "name": "Multi-Environment Workflow",
  "version": "1.0.0",
  "description": "Sample workflow that works across environments",
  "workflow": [
    {
      "math": {
        "operation": "add",
        "values": [1, 2, 3],
        "success?": "process-data"
      }
    },
    {
      "process-data": {
        "source": "math_result",
        "success?": {
          "filesystem": {
            "operation": "write",
            "path": "/tmp/result.txt"
          }
        }
      }
    }
  ]
}
```

**Note**: This workflow uses `math` (universal node) and `filesystem` (server-only node), so it can run in server or universal environments, but not client-only.

## Development Tips

- **Shared Engine Changes**: When modifying core engine logic (parser, execution, state), update components in `/shared/` and ensure all dependent packages rebuild
- **Node Development**: Place nodes in appropriate package based on dependencies - prefer universal nodes when possible
- **Multi-Environment Testing**: Test workflows across different environments to ensure portability
- **Development Workflow**: Use `bun run dev` for rapid development with hot reloading across all packages
- **Build Order**: Shared package must build first, then server/client can use updated engine
- **Environment-Aware Debugging**: Workflow validation errors include line/column numbers and node source package information

## Claude Code AI Agent Workflow
- **CRITICAL** On every session and every prompt asked by user you must read, think and evaluate files in ./.kiro/specs/json-workflow-engine folder! Implement tasks taking in consideration the **NEW SHARED ARCHITECTURE** design and requirements defined in this folder. THIS IS MANDATORY!
- **MIGRATION FOCUS** Priority should be given to Phase 1 migration tasks (moving engine to shared package) before implementing new features
- **ARCHITECTURE ALIGNMENT** All implementations must follow the distributed node architecture and multi-environment compatibility requirements

## Current Migration Status & Priorities

### 🚧 **MIGRATION IN PROGRESS** 🚧
The project is currently **migrating from server-only to shared architecture**. See `/migration_plan.md` for complete migration plan.

**Current State**: 
- ✅ Engine fully implemented in `/server/src/` (ExecutionEngine, WorkflowParser, StateManager, NodeRegistry)
- ✅ Advanced features: AST parsing, loop nodes, edge routing, state management
- ⏳ **NEEDS MIGRATION**: Core engine components to `/shared/src/`
- ⏳ **NEEDS IMPLEMENTATION**: Distributed node architecture
- ⏳ **NEEDS ENHANCEMENT**: Multi-environment NodeRegistry

### 🎯 **IMMEDIATE PRIORITIES (Phase 1)**
1. **Move engine to shared package** (`/server/src/{engine,parser,state,schemas,registry}` → `/shared/src/`)
2. **Update shared package.json** (add `ajv`, `glob` dependencies)
3. **Create node directories** (`/shared/nodes/`, `/server/nodes/`, `/client/nodes/`)
4. **Enhance NodeRegistry** for multi-package discovery
5. **Update all imports** to use shared engine
6. **Migrate tests** to shared package

### 📋 **Development Guidelines During Migration**
- **READ SPECS FIRST**: Always check `.kiro/specs/json-workflow-engine/` for requirements
- **SHARED-FIRST**: New engine features go in `/shared/`, not `/server/`
- **NODE PLACEMENT**: Consider environment dependencies when creating nodes
- **BACKWARD COMPATIBILITY**: Ensure existing server functionality continues to work

## Claude Code AI Agent Workflow
- **CRITICAL** On every session and every prompt asked by user you must read, think and evaluate files in ./.kiro/specs/json-workflow-engine folder! Implement tasks taking in consideration the **NEW SHARED ARCHITECTURE** design and requirements defined in this folder. THIS IS MANDATORY!
- **MIGRATION FOCUS** Priority should be given to Phase 1 migration tasks (moving engine to shared package) before implementing new features
- **ARCHITECTURE ALIGNMENT** All implementations must follow the distributed node architecture and multi-environment compatibility requirements

## AI-Assisted Software Development Framework

### Overview
This project includes a framework for transforming software specifications into structured development artifacts. The framework is located in `.kiro/framework/` and provides a systematic approach to generate requirements, design documents, and implementation tasks.

### Framework Components

1. **Requirements Generation** (`.kiro/framework/templates/requirements-prompt.md`)
   - Transforms specifications into user stories with acceptance criteria
   - Uses WHEN/THEN/IF format for testable conditions

2. **Design Generation** (`.kiro/framework/templates/design-prompt.md`)
   - Creates technical architecture from specifications
   - Includes component diagrams, interfaces, and data models

3. **Tasks Generation** (`.kiro/framework/templates/tasks-prompt.md`)
   - Breaks down implementation into ordered, actionable tasks
   - Links tasks to specific requirements

### Using the Framework

#### Manual Process:
1. Create a specification markdown file
2. Use each prompt template with the specification to generate artifacts
3. Save outputs to `.kiro/specs/[project-name]/`

#### Automated Process:
```bash
bun run .kiro/framework/generate-artifacts.ts path/to/spec.md project-name
```

### Working with Generated Artifacts

When implementing features:
1. Always reference the generated artifacts in `.kiro/specs/json-workflow-engine/`
2. Follow the tasks checklist in `tasks.md`
3. Ensure implementations meet requirements in `requirements.md`
4. Adhere to the architecture defined in `design.md`

### Example
See `.kiro/specs/task-api-example/` for an example of generated artifacts from a task management API specification.

## Node Development Patterns

### Universal Nodes (shared/nodes/)
```typescript
// Example: MathNode - zero dependencies, works everywhere
export class MathNode extends WorkflowNode {
  metadata = {
    id: 'math',
    name: 'Math Operations', 
    version: '1.0.0',
    inputs: ['operation', 'values'],
    outputs: ['result']
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, values } = context.inputs;
    let result = 0;
    // Pure computation logic only
    switch(operation) {
      case 'add': result = values.reduce((a, b) => a + b, 0); break;
      // ... more operations
    }
    
    context.state.mathResult = result;
    return { success: () => ({ result }) };
  }
}
```

### Server Nodes (server/nodes/)
```typescript
// Example: FileSystemNode - server-only dependencies
import fs from 'fs/promises';

export class FileSystemNode extends WorkflowNode {
  metadata = {
    id: 'filesystem',
    name: 'File System Operations',
    version: '1.0.0'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, path, content } = context.inputs;
    // Can use Node.js APIs
    if (operation === 'read') {
      const data = await fs.readFile(path, 'utf-8');
      return { success: () => ({ content: data }) };
    }
    // ... more operations
  }
}
```

### Client Nodes (client/nodes/)
```typescript
// Example: LocalStorageNode - browser-only APIs
export class LocalStorageNode extends WorkflowNode {
  metadata = {
    id: 'localStorage',
    name: 'Local Storage Operations', 
    version: '1.0.0'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, key, value } = context.inputs;
    // Can use browser APIs
    if (operation === 'get') {
      const data = localStorage.getItem(key);
      return { [data ? 'found' : 'not_found']: () => ({ value: data }) };
    }
    // ... more operations  
  }
}
```

## Package Structure After Migration

```
/shared/
├── src/
│   ├── types/           # Shared types (existing)
│   ├── engine/          # ExecutionEngine (from server)
│   ├── parser/          # WorkflowParser (from server)
│   ├── state/           # StateManager (from server)
│   ├── registry/        # Enhanced NodeRegistry (from server)
│   └── schemas/         # JSON schemas (from server)
└── nodes/               # Universal nodes (new)
    ├── MathNode.ts
    ├── LogicNode.ts
    └── DataTransformNode.ts

/server/
├── src/
│   ├── index.ts         # Hono API (imports from shared)
│   └── middleware/      # Server middleware
└── nodes/               # Server-specific nodes (new)
    ├── FileSystemNode.ts
    ├── DatabaseNode.ts
    └── AuthNode.ts

/client/
├── src/
│   ├── App.tsx          # React app (imports from shared)
│   └── components/      # UI components
└── nodes/               # Client-specific nodes (new)
    ├── LocalStorageNode.ts
    ├── DOMNode.ts
    └── FetchNode.ts
```