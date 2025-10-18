# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Agentic Workflow Orchestration System** built as a TypeScript monorepo using the bhvr stack (Bun + Hono + Vite + React). The project implements a **production-ready, shared-core** node-based workflow system with JSON definitions, comprehensive validation, lifecycle hooks, real-time event streaming, database persistence, and UI workflow generation.

**Key Achievement:** The **core engine is fully implemented in the shared package** and executes workflows across server (Hono API), client (browser), and CLI environments with **distributed node architectures**.

## Essential Commands

### Development
- `bun run dev` - Start all services (client, server, shared) with hot reload
- `bun run dev:client` - Start only the frontend
- `bun run dev:server` - Start only the backend
- `bun install` - Install dependencies and auto-build shared/server packages

### Build & Test
- `bun run build` - Build all packages in dependency order
- `cd server && bun run test` - Run server tests with Vitest
- `cd shared && bun run test` - Run shared engine tests
- `cd client && bun run lint` - Run ESLint on frontend code

### Testing Individual Components
- Run specific test: `cd server && bun test WorkflowParser.test.ts`
- Watch mode: `cd server && bun test --watch`
- Test with coverage: `cd server && bun test --coverage`

### Database Operations
- `cd server && bun run db:generate` - Generate migrations
- `cd server && bun run db:push` - Push schema to database
- `cd server && bun run db:migrate` - Run migrations

## Architecture Overview

The codebase follows a **shared-core monorepo architecture** with three main packages designed for **multi-environment execution**:

### 1. Shared Package (`/shared`) - **CORE ENGINE PACKAGE** ✅

**Status:** Production-ready with advanced features

**Core Components:**
- **ExecutionEngine** (`/shared/src/engine/`) - Orchestrates workflow execution with lifecycle hooks
- **WorkflowParser** (`/shared/src/parser/`) - AST-like parsing with JSON Schema + semantic validation
- **StateManager** (`/shared/src/state/`) - Advanced state management with snapshots, watchers, change detection
- **StateResolver** (`/shared/src/state/`) - Elegant `$.key` syntax for state access
- **NodeRegistry** (`/shared/src/registry/`) - Multi-package node discovery and registration
- **HookManager** (`/shared/src/hooks/`) - Comprehensive lifecycle hook system
- **EventEmitter** (`/shared/src/events/`) - Event-driven architecture foundation

**Node Library:**
- **Universal Nodes** (`/shared/nodes/`) - Zero dependencies, environment-agnostic
  - `MathNode` - Mathematical operations
  - `LogicNode` - Boolean logic
  - `DataTransformNode` - Object/array transformations
  - `StateSetterNode` - Direct state manipulation with `$.path` syntax
  - `EmptyNode` - No-op placeholder
  - `LogNode` - Logging and debugging
- **Data Manipulation Nodes** (`/shared/nodes/data/`) - Comprehensive data processing
  - `FilterNode` - Complex filtering with multiple data types
  - `SortNode` - Array sorting
  - `AggregateNode` - Data aggregation
  - `SummarizeNode` - Data summarization
  - `LimitNode` - Result limiting
  - `SplitOutNode` - Data splitting
  - `RemoveDuplicatesNode` - Deduplication
  - `EditFieldsNode` - Field manipulation
  - `TransformObjectNode` - Object transformation
  - `JSONExtractNode` - JSON parsing
  - `CompareDatasetsNode` - Dataset comparison
  - `SwitchNode` - Conditional routing

**Types & Schemas:**
- Complete TypeScript type definitions
- JSON Schema for workflow validation
- WebSocket message types

### 2. Server Package (`/server`) - **SERVER ENVIRONMENT** ✅

**Status:** Production-ready with full integration

**API Layer:**
- **Hono REST API** (`/server/src/index.ts`) - Fast, lightweight web framework
- **REST Routes** (`/server/src/api/`) - Workflows, automations, integrations
- **Middleware** (`/server/src/middleware/`) - Security, logging, error handling

**Services:**
- **WorkflowService** (`/server/src/services/`) - Singleton service integrating all engine components
- **WebSocketManager** (`/server/src/services/`) - Real-time event streaming and broadcasting
- **CronScheduler** (`/server/src/services/`) - Automated workflow execution with cron scheduling

**Database Layer:**
- **Drizzle ORM** with MySQL (`/server/src/db/schema.ts`)
- Workflows, executions, and automations persistence
- Repository pattern for data access

**Server-Specific Nodes** (`/server/nodes/`):
- `FileSystemNode` - File operations (read, write, delete, mkdir)
- `DatabaseNode` - Database queries and operations
- `AuthNode` - Authentication and authorization
- **Google Integration** (`/server/nodes/custom/google/gmail/`)
  - `googleConnect` - OAuth connection
  - `sendEmail` - Send emails via Gmail
  - `listEmails` - Fetch emails
- **Zoca Integration** (`/server/nodes/custom/zoca/`)
  - `toateContactele` - Fetch all contacts
  - `fiecareElement` - Process each element
  - `aplicaFiltre` - Apply filters

### 3. Client Package (`/client`) - **CLIENT ENVIRONMENT** ✅

**Status:** Production-ready with UI workflow system

**Frontend:**
- **React 19 + Vite 6** - Modern, fast development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui components** - Beautiful, accessible UI

**Client-Specific Nodes** (`/client/nodes/`):
- `LocalStorageNode` - Browser storage operations
- `FetchNode` - HTTP requests from browser
- `DOMNode` - DOM manipulation
- **UI Workflow Nodes** (`/client/nodes/ui/`) - Interactive UI generation
  - `FormUINode` - Dynamic form rendering
  - `DataTableUINode` - Data table visualization
  - `ChartUINode` - Chart and graph rendering
  - `DashboardUINode` - Dashboard composition
  - `FileProcessorUINode` - File upload and processing
  - `ActionButtonGroupUINode` - Action button groups
- **Utility Nodes** (`/client/nodes/utils/`)
  - `ButtonNode` - Interactive buttons
  - `ContainerNode` - Layout containers
  - `LogInputNode` - Input logging and debugging

## Key Concepts & Advanced Features

### 1. Multi-Environment Workflow System

**Core Concepts:**
- **Nodes** - Basic execution units with `nodeId`, `nodeType`, and `config`
- **Edges** - Define workflow flow with conditional routing (`success?`, `error?`, etc.)
- **Loops** - Nodes ending with `...` enable iteration with automatic loop-back
- **Shared State** - Mutable state object accessible across all nodes with atomic updates
- **Environment Compatibility** - Same workflows run on server, client, or universal contexts

### 2. State Management & Resolution

**StateManager Features:**
- **Atomic Updates** - Version-controlled state modifications with optional key locking
- **Snapshots** - Point-in-time state capture with rollback capability (Memento pattern)
- **Change Detection** - Detailed tracking of all state modifications with diffs
- **State Watchers** - Monitor specific keys or all changes with conditional callbacks
- **Edge Context** - Temporary data passing between nodes

**StateResolver Features:**
- **`$.key` Syntax** - Elegant state access (e.g., `"$.developer"` resolves to `state.developer`)
- **Nested Paths** - Deep access (e.g., `"$.config.timeout"` → `state.config.timeout`)
- **Deep Resolution** - Automatic resolution in objects and arrays
- **Missing Key Handling** - Configurable strategies (undefined, preserve, throw)

**State Setter Nodes:**
- **`$.path` Syntax** - Direct state manipulation without dedicated nodes
- Examples:
  ```json
  { "$.developer": "Alice" }
  { "$.config.timeout": 5000 }
  { "$.results": [] }
  ```

### 3. Lifecycle Hook System

**HookManager - Comprehensive Event System:**

**Workflow Lifecycle Hooks:**
- `workflow:before-start` - Before workflow initialization
- `workflow:after-start` - After state initialization
- `workflow:before-end` - Before workflow completion
- `workflow:after-end` - After workflow completion
- `workflow:on-error` - On any workflow error

**Node Lifecycle Hooks:**
- `node:before-execute` - Before each node execution
- `node:after-execute` - After each node execution

**State Change Hooks:**
- `state:change` - On state modifications
- `state:snapshot-created` - When snapshot is created
- `state:rollback` - When state is rolled back

**Hook Features:**
- Priority-based execution
- Conditional execution
- Once-only hooks
- Async handler support

### 4. Real-Time WebSocket System

**WebSocketManager Features:**
- Client connection management
- Channel-based subscriptions
- Broadcast capabilities
- Integration with workflow hooks for real-time monitoring

**Message Types:**
- Workflow execution events
- Node execution progress
- State change notifications
- Error notifications
- System messages (ping/pong)

### 5. Database Persistence & Automation

**Database Schema:**
- `workflows` - Workflow definitions storage
- `workflow_executions` - Execution history and results
- `automations` - Scheduled workflow automation

**CronScheduler:**
- Automated workflow execution based on cron expressions
- Integration with database for persistence
- Automatic rescheduling and error recovery

### 6. UI Workflow System

**UINode Base Class:**
- Abstract class for UI-generating nodes
- Automatic render data preparation
- Interaction event handling
- State updates from user interactions

**UI Components:**
- Forms with validation
- Data tables with sorting/filtering
- Charts and visualizations
- Dashboards with multiple widgets
- File upload and processing

### 7. Distributed Node Architecture

**Three-Tier Node System:**

1. **Universal Nodes** (`/shared/nodes/`) - Zero external dependencies
   - Pure computation and logic
   - Work in any JavaScript runtime
   - Examples: Math, Logic, Data transformation

2. **Server Nodes** (`/server/nodes/`) - Server-specific dependencies
   - File system, databases, authentication
   - Network operations, external APIs
   - Examples: FileSystem, Database, Auth, Gmail

3. **Client Nodes** (`/client/nodes/`) - Browser-specific APIs
   - DOM manipulation, client storage
   - Browser APIs, UI rendering
   - Examples: LocalStorage, Fetch, DOM, UI nodes

**Automatic Discovery:**
- NodeRegistry loads appropriate nodes based on environment
- `discoverFromPackages('server')` - Loads universal + server nodes
- `discoverFromPackages('client')` - Loads universal + client nodes
- `discoverFromPackages('universal')` - Loads only universal nodes

## Important Conventions

### Code Quality
1. **TypeScript Strict Mode** - All code must pass TypeScript checks
2. **Error Handling** - Provide detailed, actionable error messages
3. **Testing** - Write tests for all core components and nodes
4. **Documentation** - Include JSDoc comments and AI hints in node metadata

### Architecture Rules
1. **Shared-First** - Core engine logic goes in `/shared/`, not duplicated
2. **Node Placement** - Consider dependencies when placing nodes:
   - No dependencies → `/shared/nodes/`
   - Server dependencies (fs, db) → `/server/nodes/`
   - Browser APIs → `/client/nodes/`
3. **Import Structure** - Always import from `shared` package for core types and engine
4. **State Immutability** - Use StateManager methods, don't mutate state directly

### Development Workflow
1. **Build Order** - Shared package builds first, then server/client
2. **Hot Reload** - Use `bun run dev` for concurrent development
3. **Testing** - Test workflows in target environment (server/client/universal)
4. **Validation** - Workflows are validated before execution (JSON Schema + semantic)

## Multi-Environment Usage Examples

### Server Environment (Hono API)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager, HookManager } from 'shared';

// Server initialization - loads shared + server nodes
const registry = new NodeRegistry();
await registry.discoverFromPackages('server');

const stateManager = new StateManager();
const hookManager = new HookManager();
const engine = new ExecutionEngine(registry, stateManager, hookManager);

// Setup hooks for monitoring
hookManager.register('workflow:after-end', {
  name: 'log-completion',
  handler: async (context) => {
    console.log('Workflow completed:', context.workflowId);
  }
});

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

// Universal initialization - loads only universal nodes
const registry = new NodeRegistry();
await registry.discoverFromPackages('universal');

const engine = new ExecutionEngine(registry, new StateManager());
```

## Workflow Definition Examples

### Basic Workflow with State Resolution
```json
{
  "id": "state-resolution-example",
  "name": "State Resolution Example",
  "version": "1.0.0",
  "initialState": {
    "developer": "Alice",
    "base": 10
  },
  "workflow": [
    {
      "$.multiplier": 3
    },
    {
      "math": {
        "operation": "multiply",
        "values": ["$.base", "$.multiplier"],
        "success?": "log"
      }
    },
    {
      "log": {
        "message": "Result: $.mathResult"
      }
    }
  ]
}
```

### Loop Workflow
```json
{
  "id": "loop-example",
  "name": "Loop Example",
  "version": "1.0.0",
  "initialState": {
    "counter": 0,
    "max": 5
  },
  "workflow": [
    {
      "process-item...": {
        "value": "$.counter",
        "continue?": {
          "math": {
            "operation": "add",
            "values": ["$.counter", 1],
            "success?": "$.counter"
          }
        }
      }
    }
  ]
}
```

### Conditional Routing
```json
{
  "id": "conditional-example",
  "name": "Conditional Routing",
  "version": "1.0.0",
  "workflow": [
    {
      "validate-input": {
        "data": "$.input",
        "valid?": "process-data",
        "invalid?": "log-error"
      }
    },
    {
      "process-data": {
        "input": "$.input",
        "success?": "save-result"
      }
    },
    {
      "log-error": {
        "message": "Invalid input"
      }
    }
  ]
}
```

### UI Workflow
```json
{
  "id": "ui-workflow",
  "name": "Form Submission Workflow",
  "version": "1.0.0",
  "workflow": [
    {
      "form-ui": {
        "fields": [
          { "name": "email", "type": "email", "required": true },
          { "name": "message", "type": "textarea", "required": true }
        ],
        "submit?": "process-form",
        "cancel?": "reset-form"
      }
    },
    {
      "process-form": {
        "data": "$.formData",
        "success?": "show-success"
      }
    }
  ]
}
```

## Development Tips

### Engine Development
- **Shared Engine Changes** - Modify components in `/shared/src/` and rebuild dependent packages
- **Testing** - Write unit tests for individual components, integration tests for interactions
- **Hooks** - Use hooks for observability, don't modify core execution logic
- **State Management** - Leverage StateManager's advanced features (snapshots, watchers)

### Node Development
- **Node Placement** - Choose package based on dependencies
- **Metadata** - Include complete metadata with AI hints for better LLM integration
- **Validation** - Always validate inputs before processing
- **Error Handling** - Return error edges instead of throwing exceptions
- **State Updates** - Update state for important results
- **Edge Data** - Return meaningful data with edge functions

### Testing Strategy
- **Unit Tests** - Test individual components in isolation
- **Integration Tests** - Test component interactions
- **E2E Tests** - Test complete workflows through API
- **Environment Tests** - Test nodes in their target environment

### Debugging
- **Validation Errors** - Include line/column numbers and source package
- **Execution Logs** - Use hooks to log execution progress
- **State Inspection** - Use StateManager's getChanges() for debugging
- **WebSocket Events** - Monitor real-time workflow execution

## Claude Code AI Agent Workflow

### Critical Instructions

**ON EVERY SESSION:**
1. ✅ **READ DESIGN DOCUMENT** - `/Users/narcisbrindusescu/teste/workscript/.kiro/specs/json-workflow-engine/design.md`
2. ✅ **UNDERSTAND CURRENT STATE** - System is production-ready with advanced features
3. ✅ **FOLLOW ARCHITECTURE** - All implementations must align with shared-core design

### Specification-Driven Development

**Before Implementing ANY Feature:**
1. Check `.kiro/specs/json-workflow-engine/` for existing specifications
2. Read `design.md` for architectural guidance
3. Read `requirements.md` for feature requirements
4. Follow `tasks.md` for implementation checklist

**Key Specifications:**
- **design.md** - Comprehensive architectural documentation (2,300+ lines)
- **requirements.md** - User stories with acceptance criteria
- **tasks.md** - Implementation task breakdown

### Architecture Alignment

**When Adding Features:**
- ✅ Core engine features → `/shared/src/`
- ✅ Universal nodes → `/shared/nodes/`
- ✅ Server nodes → `/server/nodes/`
- ✅ Client nodes → `/client/nodes/`
- ✅ Business integrations → `/server/nodes/custom/` or `/client/nodes/custom/`

**When Modifying Existing Code:**
- ✅ Maintain backward compatibility
- ✅ Update tests alongside changes
- ✅ Document breaking changes
- ✅ Follow existing patterns and conventions

### Implementation Priorities

**Current State - No Migration Needed:**
The system is **production-ready** with all core features implemented:
- ✅ Shared-core architecture complete
- ✅ Advanced features implemented (hooks, state resolution, WebSocket)
- ✅ Database persistence and automation
- ✅ UI workflow system
- ✅ Comprehensive node library

**Focus Areas for New Development:**
1. **New Node Types** - Add domain-specific nodes following established patterns
2. **Business Integrations** - Extend custom integrations in `/server/nodes/custom/`
3. **UI Components** - Add new UI workflow nodes in `/client/nodes/ui/`
4. **Performance Optimization** - Optimize execution engine and state management
5. **Enhanced Monitoring** - Expand hook system and WebSocket events

## AI-Assisted Software Development Framework

### Overview
This project includes a framework for transforming software specifications into structured development artifacts located in `.kiro/framework/`.

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

**Manual Process:**
1. Create a specification markdown file
2. Use each prompt template with the specification to generate artifacts
3. Save outputs to `.kiro/specs/[project-name]/`

**Automated Process:**
```bash
bun run .kiro/framework/generate-artifacts.ts path/to/spec.md project-name
```

### Working with Generated Artifacts

**When implementing features:**
1. Reference artifacts in `.kiro/specs/json-workflow-engine/`
2. Follow tasks checklist in `tasks.md`
3. Ensure implementations meet `requirements.md` acceptance criteria
4. Adhere to architecture defined in `design.md`

## Node Development Patterns

### Universal Node Pattern (Zero Dependencies)

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
      when_to_use: 'When you need to calculate sums, differences, products, or quotients',
      expected_edges: ['success', 'error'],
      example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next"}}',
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

    try {
      let result: number;
      switch (operation) {
        case 'add':
          result = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'subtract':
          result = values.reduce((a: number, b: number) => a - b);
          break;
        // ... more operations
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

### Server Node Pattern (Server Dependencies)

```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
import fs from 'fs/promises';

export class FileSystemNode extends WorkflowNode {
  metadata = {
    id: 'filesystem',
    name: 'File System Operations',
    version: '1.0.0',
    description: 'Server-specific file system operations',
    inputs: ['operation', 'path', 'content'],
    outputs: ['result', 'content', 'exists'],
    ai_hints: {
      purpose: 'Perform file system operations on the server',
      when_to_use: 'When you need to read, write, or manage files',
      expected_edges: ['success', 'error', 'exists', 'not_exists'],
      example_usage: '{"fs-1": {"operation": "read", "path": "/tmp/data.txt", "success?": "process"}}',
      example_config: '{"operation": "read|write|exists|delete|mkdir", "path": "string", "content?": "string"}',
      get_from_state: [],
      post_to_state: ['fileContent', 'fileWritten', 'fileExists']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, path, content } = config || {};

    if (!operation || !path) {
      return {
        error: () => ({ error: 'Missing operation or path' })
      };
    }

    try {
      switch (operation) {
        case 'read': {
          const fileContent = await fs.readFile(path, 'utf-8');
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
          await fs.writeFile(path, content, 'utf-8');
          context.state.fileWritten = path;
          return {
            success: () => ({ path })
          };
        }
        // ... more operations
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
          path
        })
      };
    }
  }
}

export default FileSystemNode;
```

### Client Node Pattern (Browser APIs)

```typescript
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

export class LocalStorageNode extends WorkflowNode {
  metadata = {
    id: 'localStorage',
    name: 'Local Storage Operations',
    version: '1.0.0',
    description: 'Client-specific browser storage operations',
    inputs: ['operation', 'key', 'value'],
    outputs: ['value', 'success'],
    ai_hints: {
      purpose: 'Interact with browser localStorage',
      when_to_use: 'When you need to store or retrieve data in the browser',
      expected_edges: ['success', 'error', 'found', 'not_found'],
      example_usage: '{"storage-1": {"operation": "get", "key": "userData", "found?": "process"}}',
      example_config: '{"operation": "get|set|remove|clear", "key?": "string", "value?": "any"}',
      get_from_state: [],
      post_to_state: ['storageValue', 'storageKey']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, key, value } = config || {};

    if (!operation) {
      return {
        error: () => ({ error: 'Missing operation' })
      };
    }

    try {
      switch (operation) {
        case 'get': {
          if (!key) {
            return {
              error: () => ({ error: 'Missing key for get operation' })
            };
          }
          const data = localStorage.getItem(key);
          context.state.storageValue = data;
          return {
            [data !== null ? 'found' : 'not_found']: () => ({ value: data })
          };
        }
        case 'set': {
          if (!key) {
            return {
              error: () => ({ error: 'Missing key for set operation' })
            };
          }
          localStorage.setItem(key, JSON.stringify(value));
          context.state.storageKey = key;
          return {
            success: () => ({ key, value })
          };
        }
        // ... more operations
        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }
    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'LocalStorage operation failed'
        })
      };
    }
  }
}

export default LocalStorageNode;
```

## Package Structure (Current State)

```
workscript/
├── .kiro/
│   ├── framework/              # Documentation generation framework
│   └── specs/
│       └── json-workflow-engine/
│           ├── design.md       # 📘 COMPREHENSIVE ARCHITECTURAL GUIDE (2,300+ lines)
│           ├── requirements.md # User stories and acceptance criteria
│           └── tasks.md        # Implementation task breakdown
│
├── shared/                     # ✅ Core engine package (production-ready)
│   ├── src/
│   │   ├── engine/            # ExecutionEngine with lifecycle hooks
│   │   ├── parser/            # WorkflowParser with AST parsing
│   │   ├── state/             # StateManager + StateResolver
│   │   ├── registry/          # NodeRegistry with multi-package discovery
│   │   ├── hooks/             # HookManager for lifecycle events
│   │   ├── events/            # EventEmitter and WebSocket types
│   │   ├── types/             # Complete TypeScript type definitions
│   │   └── schemas/           # JSON Schema for validation
│   ├── nodes/                 # Universal nodes (zero dependencies)
│   │   ├── MathNode.ts
│   │   ├── LogicNode.ts
│   │   ├── DataTransformNode.ts
│   │   ├── StateSetterNode.ts
│   │   ├── EmptyNode.ts
│   │   ├── LogNode.ts
│   │   └── data/              # Data manipulation library
│   │       ├── FilterNode.ts
│   │       ├── SortNode.ts
│   │       ├── AggregateNode.ts
│   │       ├── SummarizeNode.ts
│   │       ├── LimitNode.ts
│   │       ├── SplitOutNode.ts
│   │       ├── RemoveDuplicatesNode.ts
│   │       ├── EditFieldsNode.ts
│   │       ├── TransformObjectNode.ts
│   │       ├── JSONExtractNode.ts
│   │       ├── CompareDatasetsNode.ts
│   │       └── SwitchNode.ts
│   └── package.json
│
├── server/                    # ✅ Server package (production-ready)
│   ├── src/
│   │   ├── index.ts          # Hono API entry point
│   │   ├── api/              # REST routes (workflows, automations)
│   │   ├── services/
│   │   │   ├── WorkflowService.ts    # Singleton service
│   │   │   ├── WebSocketManager.ts   # Real-time events
│   │   │   └── CronScheduler.ts      # Automation scheduling
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle ORM schema
│   │   │   └── repositories/ # Data access layer
│   │   ├── middleware/       # Security, logging, error handling
│   │   └── lib/              # Utilities
│   ├── nodes/                # Server-specific nodes
│   │   ├── FileSystemNode.ts
│   │   ├── DatabaseNode.ts
│   │   ├── AuthNode.ts
│   │   └── custom/           # Business integrations
│   │       ├── google/gmail/ # Gmail integration
│   │       └── zoca/         # Zoca API integration
│   └── package.json
│
├── client/                   # ✅ Client package (production-ready)
│   ├── src/
│   │   ├── App.tsx           # React app
│   │   ├── components/       # UI components
│   │   ├── hooks/            # React hooks
│   │   └── services/         # Client services
│   ├── nodes/                # Client-specific nodes
│   │   ├── LocalStorageNode.ts
│   │   ├── FetchNode.ts
│   │   ├── DOMNode.ts
│   │   ├── ui/               # UI workflow nodes
│   │   │   ├── FormUINode.ts
│   │   │   ├── DataTableUINode.ts
│   │   │   ├── ChartUINode.ts
│   │   │   ├── DashboardUINode.ts
│   │   │   ├── FileProcessorUINode.ts
│   │   │   └── ActionButtonGroupUINode.ts
│   │   └── utils/            # Utility nodes
│   │       ├── ButtonNode.ts
│   │       ├── ContainerNode.ts
│   │       └── LogInputNode.ts
│   └── package.json
│
├── package.json              # Root package.json
├── CLAUDE.md                 # This file - guidance for Claude Code
└── README.md                 # Project README
```

## Technology Stack

### Core Technologies
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Bun | 1.x | Fast JavaScript runtime with native TypeScript |
| Language | TypeScript | 5.8.x | Type-safe development |
| Server Framework | Hono | 4.7.x | Lightweight, fast web framework |
| Client Framework | React | 19.1.x | UI library |
| Build Tool (Client) | Vite | 6.3.x | Fast frontend tooling |
| Database ORM | Drizzle | 0.37.x | Type-safe SQL toolkit |
| Database | MySQL | 2.x | Relational database |
| Validation | Ajv | 8.17.x | JSON Schema validation |
| Testing | Vitest | 3.2.x | Fast unit testing |
| WebSocket | Bun Native | - | Real-time communication |
| Styling | Tailwind CSS | 4.1.x | Utility-first CSS |

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeDoc** - API documentation generation
- **Git** - Version control
- **Drizzle Kit** - Database migrations

## Summary - Current State

### ✅ Production-Ready Features

**Core Engine:**
- ✅ ExecutionEngine with lifecycle hooks
- ✅ WorkflowParser with AST-like parsing
- ✅ StateManager with snapshots, watchers, change detection
- ✅ StateResolver with `$.key` syntax
- ✅ NodeRegistry with multi-package discovery
- ✅ HookManager with comprehensive event system

**Advanced Features:**
- ✅ State setter nodes (`$.path` syntax)
- ✅ Loop nodes (`...` suffix)
- ✅ WebSocket real-time event streaming
- ✅ Database persistence (workflows, executions, automations)
- ✅ CronScheduler for automated execution
- ✅ UI workflow system with UINode base class

**Node Libraries:**
- ✅ Universal nodes (17+ nodes)
- ✅ Server nodes (6+ nodes + custom integrations)
- ✅ Client nodes (12+ nodes including UI)

**Infrastructure:**
- ✅ REST API with Hono
- ✅ WebSocket server
- ✅ Database layer with Drizzle ORM
- ✅ Middleware (security, logging, error handling)

### 🎯 Development Focus

**No migration needed - focus on:**
1. **New Features** - Add domain-specific nodes and integrations
2. **Performance** - Optimize execution and state management
3. **Monitoring** - Enhance observability with hooks and WebSocket
4. **Documentation** - Expand API documentation and examples
5. **Testing** - Increase test coverage

---

**Document Version:** 2.0.0
**Last Updated:** 2025-01-18
**Status:** Current Implementation - Production Ready
