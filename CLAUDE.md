# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Architecture Migration Complete (November 2025)

**✅ MIGRATION COMPLETE: Server-Only Node Architecture**

The project has been successfully migrated to a **server-only node execution model** with a dedicated `@workscript/nodes` package:

### Current Structure:
- **`/packages/engine`** - Core workflow engine, pure orchestration (package: `@workscript/engine`)
- **`/packages/nodes`** - **ALL workflow nodes consolidated here** (package: `@workscript/nodes`) ✨ NEW
- **`/packages/ui`** - Shared UI components (shadcn/ui, package: `@workscript/ui`)
- **`/packages/config`** - Shared configurations for ESLint, TypeScript, Tailwind
- **`/apps/api`** - Plugin-based API server with Workscript plugin (workflow execution)
- **`/apps/frontend`** - Vite + React SPA (management UI only, no local execution)
- **`/server`** - Legacy CRM API (kept for Real Estate CRM features)

### Import Updates (COMPLETED):
```typescript
// ✅ Engine imports (orchestration)
import { ExecutionEngine, StateManager, NodeRegistry, HookManager } from '@workscript/engine';

// ✅ Node imports (all nodes consolidated)
import { ALL_NODES, MathNode, DatabaseNode, FilterNode } from '@workscript/nodes';
```

### Workspace Configuration:
```json
{
  "workspaces": ["./server", "./packages/*", "./apps/*"]
}
```
**Note:** `/client` removed - server-only execution complete!

### Architecture Roles:
- **`/packages/engine`** - Core workflow orchestration (no node implementations)
- **`/packages/nodes`** - **Single source of truth for all nodes** (35+ nodes)
- **`/packages/ui`** - Shared React components
- **`/packages/config`** - Shared tooling configurations
- **`/apps/api`** - API server for workflow execution (all workflows run server-side)
- **`/apps/frontend`** - Management UI (create, monitor, view workflows via API)
- **`/server`** - Legacy CRM (uses `@workscript/nodes` for workflows)

---

## Project Overview

This is an **Agentic Workflow Orchestration System** built as a TypeScript monorepo using the bhvr stack (Bun + Hono + Vite + React). The project implements a **production-ready, server-only** node-based workflow system with JSON definitions, comprehensive validation, lifecycle hooks, real-time event streaming, database persistence, and management UI.

**Key Achievement:** The **core engine (`@workscript/engine`) is a pure orchestration layer**, while all **35+ workflow nodes are consolidated in the `@workscript/nodes` package**. All workflows execute server-side via the API, with the frontend serving as a management interface.

## Essential Commands

### Development
- `bun run dev` - Start all services (engine, nodes, api, frontend) with hot reload
- `bun run dev:engine` - Start engine TypeScript watch mode
- `bun run dev:nodes` - Start nodes TypeScript watch mode
- `bun run dev:api` - Start API server with hot reload
- `bun run dev:frontend` - Start Vite dev server
- `bun install` - Install dependencies and auto-build packages

### Build & Test
- `bun run build` - Build all packages (engine → nodes → api → frontend)
- `bun run build:engine` - Build engine package only
- `bun run build:nodes` - Build nodes package only
- `bun run build:api` - Build API server only
- `bun run build:frontend` - Build frontend only
- `bun run test` - Run tests for engine, nodes, and API
- `bun run test:engine` - Run engine tests
- `bun run test:nodes` - Run nodes tests
- `bun run test:api` - Run API tests
- `bun run typecheck` - Type-check all packages

### Utilities
- `bun run clean` - Remove all dist folders and nested node_modules
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting

### Database Operations (API)
- `cd apps/api && bun run db:generate` - Generate migrations
- `cd apps/api && bun run db:push` - Push schema to database
- `cd apps/api && bun run db:studio` - Open Drizzle Studio

### Database Operations (Legacy Server)
- `cd server && bun run db:generate` - Generate migrations (CRM)
- `cd server && bun run db:push` - Push CRM schema to database
- `cd server && bun run db:migrate` - Run CRM migrations

## Architecture Overview

The codebase follows a **modular plugin-based monorepo architecture** with **server-only workflow execution**:

### Packages (Shared Core Libraries)

#### 1. Engine Package (`/packages/engine`) - `@workscript/engine` ✅

**Status:** Production-ready - Pure orchestration layer

**Core Components:**
- **ExecutionEngine** (`/packages/engine/src/engine/`) - Orchestrates workflow execution with lifecycle hooks
- **WorkflowParser** (`/packages/engine/src/parser/`) - AST-like parsing with JSON Schema + semantic validation
- **StateManager** (`/packages/engine/src/state/`) - Advanced state management with snapshots, watchers, change detection
- **StateResolver** (`/packages/engine/src/state/`) - Elegant `$.key` syntax for state access
- **NodeRegistry** (`/packages/engine/src/registry/`) - Simplified node registration (server-only)
- **HookManager** (`/packages/engine/src/hooks/`) - Comprehensive lifecycle hook system
- **EventEmitter** (`/packages/engine/src/events/`) - Event-driven architecture foundation

**Note:** The engine package is now a **pure orchestration layer** - it does NOT contain node implementations. All nodes are in `@workscript/nodes`.

**Types & Schemas:**
- Complete TypeScript type definitions
- JSON Schema for workflow validation
- WebSocket message types

#### 2. Nodes Package (`/packages/nodes`) - `@workscript/nodes` ✅ NEW

**Status:** Production-ready - Single source of truth for all nodes

**Purpose:** Consolidates ALL workflow nodes in one package (35+ nodes)

**Core Nodes:**
- `MathNode` - Mathematical operations
- `LogicNode` - Boolean logic
- `DataTransformNode` - Object/array transformations
- `StateSetterNode` - Direct state manipulation with `$.path` syntax
- `EmptyNode` - No-op placeholder
- `LogNode` - Logging and debugging

**Data Manipulation Nodes** (`/packages/nodes/src/data/`):
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
- And more...

**Server Nodes:**
- `FileSystemNode` - File operations (read, write, delete, mkdir)
- `DatabaseNode` - Database queries and operations
- `AuthNode` - Authentication and authorization

**Custom Integrations** (`/packages/nodes/src/custom/`):
- **Gmail Integration** (`google/gmail/`) - googleConnect, sendEmail, listEmails
- **Zoca Integration** (`zoca/`) - toateContactele, fiecareElement, aplicaFiltre

**Usage:**
```typescript
import { ALL_NODES } from '@workscript/nodes';
import { MathNode, DatabaseNode, FilterNode } from '@workscript/nodes';
```

#### 3. UI Package (`/packages/ui`) - `@workscript/ui` ✅

**Status:** Active development

**Purpose:** Shared React UI components for all frontend applications

**Components:**
- **Button** - Customizable button component with variants
- **Utils** - `cn()` function for className merging

**Usage:**
```typescript
import { Button, cn } from '@workscript/ui';
```

#### 4. Config Package (`/packages/config`) - `@workscript/config` ✅

**Status:** Active

**Purpose:** Centralized configuration files for consistent tooling across the monorepo

**Exports:**
- `@workscript/config/eslint` - ESLint shared configuration
- `@workscript/config/typescript` - TypeScript base tsconfig
- `@workscript/config/tailwind` - Tailwind CSS base configuration

**Usage:**
```json
// tsconfig.json
{
  "extends": "@workscript/config/typescript"
}
```

---

## Applications

### 1. API Server (`/apps/api`) - **WORKFLOW EXECUTION SERVER** ✅

**Status:** Production-ready

**Architecture:** Plugin-based SaaS platform with server-only workflow execution

**Plugin System:**
- **PluginLoader** - Automatic plugin discovery and registration
- **SaaSPlugin Interface** - Standardized plugin structure
- **Plugin Manifest** - AI-discoverable plugin metadata
- **Health Checks** - Per-plugin health monitoring

**Current Plugins:**
- **Workscript Plugin** (`/apps/api/src/plugins/workscript/`)
  - Workflow execution API
  - Automation scheduling (cron)
  - WebSocket workflow events
  - Database schema (workflows, executions, automations)

**Shared Services:**
- **WebSocketManager** - Real-time event broadcasting
- **CronScheduler** - Automated workflow execution

**Node Registration:**
```typescript
import { ALL_NODES } from '@workscript/nodes';
import { NodeRegistry } from '@workscript/engine';

const registry = new NodeRegistry();
await registry.registerFromArray(ALL_NODES);
```

**Note:** All nodes are now imported from `@workscript/nodes` package. No local nodes directory.

### 2. Frontend App (`/apps/frontend`) - **MANAGEMENT UI** ✅

**Status:** Production-ready management interface

**Stack:**
- Vite 7 + React 19
- Tailwind CSS v4
- TypeScript
- shadcn/ui components integration

**Purpose:** Management UI for workflows - **NO local workflow execution**

**Features:**
- Create and edit workflow definitions
- Trigger workflow execution via API
- Monitor workflow execution status
- View execution results and history
- Real-time updates via WebSocket

**Important:** The frontend does NOT execute workflows locally. All workflow execution happens server-side via API calls.

---

## Legacy Applications

### Server (`/server`) - **LEGACY CRM API**

**Status:** Maintained for Real Estate CRM features

**Contains:**
- Complete Real Estate CRM schema (13+ tables, 821 lines)
- Agency, Agent, Contact, Property management
- AI Lead Scoring, Property Matching
- WhatsApp conversations
- Email templates

**Node Usage:** Now uses `@workscript/nodes` package for workflow execution

**Keep for:** Production CRM functionality not yet migrated to EstateFlow plugin

---

## Key Concepts & Advanced Features

### 1. Server-Only Workflow System

**Core Concepts:**
- **Nodes** - Basic execution units with `nodeId`, `nodeType`, and `config`
- **Edges** - Define workflow flow with conditional routing (`success?`, `error?`, etc.)
- **Loops** - Nodes ending with `...` enable iteration with automatic loop-back
- **Shared State** - Mutable state object accessible across all nodes with atomic updates
- **Server Execution** - All workflows execute server-side via the API for consistency and security

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

### 7. Consolidated Node Architecture

**Single Package for All Nodes:** `@workscript/nodes`

All 35+ workflow nodes are consolidated in a single package for simplicity and maintainability:

**Node Categories:**
1. **Core Nodes** - Pure computation and logic
   - Math, Logic, DataTransform, StateSetter, Empty, Log

2. **Data Manipulation Nodes** (`/data/`) - Comprehensive data processing
   - Filter, Sort, Aggregate, Summarize, Limit, SplitOut
   - RemoveDuplicates, EditFields, TransformObject, JSONExtract
   - CompareDatasets, Switch, ValidateData, MergeDatasets, and more

3. **Server Nodes** - File system, databases, authentication
   - FileSystem, Database, Auth

4. **Custom Integrations** (`/custom/`) - Third-party service integrations
   - Google Gmail (googleConnect, sendEmail, listEmails)
   - Zoca (toateContactele, fiecareElement, aplicaFiltre)

**Node Registration:**
```typescript
import { ALL_NODES } from '@workscript/nodes';
import { NodeRegistry } from '@workscript/engine';

const registry = new NodeRegistry();
await registry.registerFromArray(ALL_NODES);
```

**Benefits of Consolidated Architecture:**
- Single source of truth for all nodes
- Simpler imports and dependency management
- Server-side only execution for security
- Easier testing and maintenance

## Important Conventions

### Code Quality
1. **TypeScript Strict Mode** - All code must pass TypeScript checks
2. **Error Handling** - Provide detailed, actionable error messages
3. **Testing** - Write tests for all core components and nodes
4. **Documentation** - Include JSDoc comments and AI hints in node metadata

### Architecture Rules
1. **Engine-First** - Core engine logic goes in `/packages/engine/`, not duplicated
2. **Nodes-Consolidated** - ALL nodes go in `/packages/nodes/src/`:
   - Core nodes → `/packages/nodes/src/`
   - Data manipulation → `/packages/nodes/src/data/`
   - Custom integrations → `/packages/nodes/src/custom/`
3. **Import Structure**:
   - Engine: `import { ExecutionEngine, StateManager } from '@workscript/engine'`
   - Nodes: `import { ALL_NODES, MathNode } from '@workscript/nodes'`
4. **State Immutability** - Use StateManager methods, don't mutate state directly
5. **Server-Only Execution** - All workflow execution happens via API, no client-side execution

### Development Workflow
1. **Build Order** - Packages build in order: engine → nodes → api → frontend
2. **Hot Reload** - Use `bun run dev` for concurrent development of all apps
3. **Testing** - Test workflows via API (all execution is server-side)
4. **Validation** - Workflows are validated before execution (JSON Schema + semantic)

## Usage Examples

### Server-Side Workflow Execution (API)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager, HookManager } from '@workscript/engine';
import { ALL_NODES } from '@workscript/nodes';

// Initialize NodeRegistry with all nodes
const registry = new NodeRegistry();
await registry.registerFromArray(ALL_NODES);

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

// Execute workflow
const result = await engine.execute(parsedWorkflow);
```

### Frontend Workflow Triggering (via API)
```typescript
// Frontend does NOT execute workflows locally
// Instead, it calls the API to trigger execution

const response = await fetch('/api/workflows/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workflowId: 'my-workflow', input: { data: 'value' } })
});

const result = await response.json();
```

### CLI/Testing Environment
```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from '@workscript/engine';
import { ALL_NODES } from '@workscript/nodes';

// Same initialization as API - all nodes available
const registry = new NodeRegistry();
await registry.registerFromArray(ALL_NODES);

const engine = new ExecutionEngine(registry, new StateManager());
const result = await engine.execute(parsedWorkflow);
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
- **Engine Changes** - Modify components in `/packages/engine/src/` and rebuild dependent packages
- **Testing** - Write unit tests for individual components, integration tests for interactions
- **Hooks** - Use hooks for observability, don't modify core execution logic
- **State Management** - Leverage StateManager's advanced features (snapshots, watchers)

### Node Development
- **Node Location** - All new nodes go in `/packages/nodes/src/` (or subdirectories)
- **Metadata** - Include complete metadata with AI hints for better LLM integration
- **Validation** - Always validate inputs before processing
- **Error Handling** - Return error edges instead of throwing exceptions
- **State Updates** - Update state for important results
- **Edge Data** - Return meaningful data with edge functions
- **Exports** - Add new nodes to `/packages/nodes/src/index.ts` and `ALL_NODES` array

### Testing Strategy
- **Unit Tests** - Test individual components in isolation
- **Integration Tests** - Test component interactions
- **E2E Tests** - Test complete workflows through API
- **Node Tests** - Test nodes in `/packages/nodes/` alongside implementations

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
- ✅ Core engine features → `/packages/engine/src/`
- ✅ **ALL nodes** → `/packages/nodes/src/` (single location)
- ✅ Core nodes → `/packages/nodes/src/`
- ✅ Data manipulation nodes → `/packages/nodes/src/data/`
- ✅ Custom integrations → `/packages/nodes/src/custom/`

**When Modifying Existing Code:**
- ✅ Maintain backward compatibility
- ✅ Update tests alongside changes
- ✅ Document breaking changes
- ✅ Follow existing patterns and conventions

### Implementation Priorities

**Current State - Server-Only Architecture:**
The system is **production-ready** with server-only workflow execution:
- ✅ Engine is pure orchestration (no node implementations)
- ✅ All 35+ nodes consolidated in `@workscript/nodes`
- ✅ Advanced features implemented (hooks, state resolution, WebSocket)
- ✅ Database persistence and automation
- ✅ Frontend is management UI only (no local execution)

**Focus Areas for New Development:**
1. **New Node Types** - Add nodes to `/packages/nodes/src/` following established patterns
2. **Business Integrations** - Add custom integrations in `/packages/nodes/src/custom/`
3. **Management UI** - Enhance frontend workflow management features
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

### Standard Node Pattern (All nodes in @workscript/nodes)

All nodes follow the same pattern and go in `/packages/nodes/src/`:

```typescript
// /packages/nodes/src/MathNode.ts
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

### Server Node Pattern (with dependencies)

```typescript
// /packages/nodes/src/FileSystemNode.ts
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
import fs from 'fs/promises';

export class FileSystemNode extends WorkflowNode {
  metadata = {
    id: 'filesystem',
    name: 'File System Operations',
    version: '1.0.0',
    description: 'Server-side file system operations',
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

### Adding a New Node

1. Create the node file in `/packages/nodes/src/` (or appropriate subdirectory)
2. Export the node in `/packages/nodes/src/index.ts`:
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
3. Rebuild: `bun run build:nodes`
4. Test the node

## Package Structure (Current State)

```
workscript/
├── .kiro/
│   ├── framework/              # Documentation generation framework
│   └── specs/
│       ├── json-workflow-engine/
│       │   ├── design.md       # 📘 COMPREHENSIVE ARCHITECTURAL GUIDE
│       │   ├── requirements.md # User stories and acceptance criteria
│       │   └── tasks.md        # Implementation task breakdown
│       └── new_nodes/          # Server-only migration specs
│           ├── requirements.md # Migration requirements
│           └── implementation_plan.md # Migration tasks
│
├── packages/                   # ✅ Shared Core Libraries
│   ├── engine/                 # @workscript/engine (Pure orchestration)
│   │   ├── src/
│   │   │   ├── engine/         # ExecutionEngine with lifecycle hooks
│   │   │   ├── parser/         # WorkflowParser with AST parsing
│   │   │   ├── state/          # StateManager + StateResolver
│   │   │   ├── registry/       # NodeRegistry (server-only)
│   │   │   ├── hooks/          # HookManager for lifecycle events
│   │   │   ├── events/         # EventEmitter and WebSocket types
│   │   │   ├── types/          # Complete TypeScript type definitions
│   │   │   └── schemas/        # JSON Schema for validation
│   │   └── package.json        # NO node implementations here
│   │
│   ├── nodes/                  # @workscript/nodes ✨ ALL NODES HERE
│   │   ├── src/
│   │   │   ├── MathNode.ts     # Core nodes
│   │   │   ├── LogicNode.ts
│   │   │   ├── DataTransformNode.ts
│   │   │   ├── StateSetterNode.ts
│   │   │   ├── EmptyNode.ts
│   │   │   ├── LogNode.ts
│   │   │   ├── FileSystemNode.ts  # Server nodes
│   │   │   ├── DatabaseNode.ts
│   │   │   ├── AuthNode.ts
│   │   │   ├── data/           # Data manipulation nodes
│   │   │   │   ├── FilterNode.ts
│   │   │   │   ├── SortNode.ts
│   │   │   │   ├── AggregateNode.ts
│   │   │   │   ├── SummarizeNode.ts
│   │   │   │   ├── LimitNode.ts
│   │   │   │   ├── SplitOutNode.ts
│   │   │   │   ├── RemoveDuplicatesNode.ts
│   │   │   │   ├── EditFieldsNode.ts
│   │   │   │   ├── TransformObjectNode.ts
│   │   │   │   ├── JSONExtractNode.ts
│   │   │   │   ├── CompareDatasetsNode.ts
│   │   │   │   ├── SwitchNode.ts
│   │   │   │   └── ...
│   │   │   ├── custom/         # Custom integrations
│   │   │   │   ├── google/gmail/
│   │   │   │   │   ├── googleConnect.ts
│   │   │   │   │   ├── sendEmail.ts
│   │   │   │   │   └── listEmails.ts
│   │   │   │   └── zoca/
│   │   │   │       ├── toateContactele.ts
│   │   │   │       ├── fiecareElement.ts
│   │   │   │       └── aplicaFiltre.ts
│   │   │   └── index.ts        # Exports ALL_NODES array
│   │   └── package.json
│   │
│   ├── ui/                     # @workscript/ui (Shared UI components)
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── utils.ts        # cn() utility
│   │   └── package.json
│   │
│   └── config/                 # @workscript/config (Shared configs)
│       ├── eslint/
│       ├── typescript/
│       ├── tailwind/
│       └── package.json
│
├── apps/                       # ✅ Applications
│   ├── api/                    # Workflow execution server (Hono)
│   │   ├── src/
│   │   │   ├── index.ts        # Hono API entry point
│   │   │   ├── plugins/        # SaaS plugins
│   │   │   │   └── workscript/ # Workscript plugin
│   │   │   │       ├── routes/ # API routes
│   │   │   │       ├── services/ # Business logic (uses @workscript/nodes)
│   │   │   │       └── schema/ # Database schema
│   │   │   ├── shared-services/ # Shared services
│   │   │   │   ├── WebSocketManager.ts
│   │   │   │   └── CronScheduler.ts
│   │   │   └── middleware/     # API middleware
│   │   └── package.json        # Depends on @workscript/nodes
│   │
│   └── frontend/               # Management UI (Vite + React)
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/     # UI components
│       │   ├── hooks/          # React hooks
│       │   └── services/       # API clients (NO local execution)
│       └── package.json        # NO @workscript/nodes dependency
│
├── server/                     # ⚠️ LEGACY - Real Estate CRM API
│   ├── src/                    # Hono API
│   │   ├── index.ts
│   │   ├── api/                # CRM routes
│   │   ├── services/           # CRM services (uses @workscript/nodes)
│   │   ├── db/                 # CRM schema (13+ tables)
│   │   └── middleware/
│   └── package.json            # Depends on @workscript/nodes
│
├── package.json                # Root workspace config
├── CLAUDE.md                   # This file - guidance for Claude Code
├── workscript_prospect.md      # Strategic roadmap
└── README.md                   # Project README
```

**Key:**
- ✅ **Production-ready** - Active development, use for new features
- ⚠️ **Legacy** - Kept for Real Estate CRM features

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

**Core Engine (`@workscript/engine`):**
- ✅ ExecutionEngine with lifecycle hooks
- ✅ WorkflowParser with AST-like parsing
- ✅ StateManager with snapshots, watchers, change detection
- ✅ StateResolver with `$.key` syntax
- ✅ NodeRegistry with simplified server-only registration
- ✅ HookManager with comprehensive event system

**Consolidated Nodes (`@workscript/nodes`):**
- ✅ 35+ nodes in a single package
- ✅ Core nodes (Math, Logic, DataTransform, etc.)
- ✅ Data manipulation nodes (Filter, Sort, Aggregate, etc.)
- ✅ Server nodes (FileSystem, Database, Auth)
- ✅ Custom integrations (Gmail, Zoca)

**Advanced Features:**
- ✅ State setter nodes (`$.path` syntax)
- ✅ Loop nodes (`...` suffix)
- ✅ WebSocket real-time event streaming
- ✅ Database persistence (workflows, executions, automations)
- ✅ CronScheduler for automated execution

**Infrastructure:**
- ✅ REST API with Hono (server-only workflow execution)
- ✅ WebSocket server
- ✅ Database layer with Drizzle ORM
- ✅ Management UI (frontend for workflow management)
- ✅ Middleware (security, logging, error handling)

### 🎯 Development Focus

**Server-only architecture complete - focus on:**
1. **New Node Types** - Add nodes to `/packages/nodes/src/`
2. **Custom Integrations** - Extend `/packages/nodes/src/custom/`
3. **Management UI** - Enhance frontend workflow management
4. **Performance** - Optimize execution and state management
5. **Testing** - Increase test coverage

---

## Migration Notes (November 2025)

### What Changed

The project migrated from a **distributed multi-environment node architecture** to a **server-only consolidated architecture**:

**Before:**
- Nodes spread across 5 locations (`/packages/engine/nodes/`, `/apps/api/nodes/`, `/apps/frontend/nodes/`, `/server/nodes/`, `/client/nodes/`)
- NodeRegistry supported 3 environments (universal, server, client)
- Frontend could execute workflows locally

**After:**
- All 35+ nodes consolidated in `/packages/nodes/` (`@workscript/nodes`)
- Engine is pure orchestration (no node implementations)
- NodeRegistry simplified to server-only
- Frontend is management UI only (all execution via API)
- Legacy `/client/` directory removed

### Benefits

1. **Single Source of Truth** - All nodes in one package
2. **Simpler Imports** - `import { ALL_NODES } from '@workscript/nodes'`
3. **Better Security** - Server-only execution prevents client tampering
4. **Easier Maintenance** - No environment-specific discovery logic
5. **Cleaner Architecture** - Clear separation of concerns

### Migration Path

If updating from the old architecture:

1. **Update node imports:**
   ```typescript
   // Old
   import { UNIVERSAL_NODES } from '@workscript/engine/nodes';

   // New
   import { ALL_NODES } from '@workscript/nodes';
   ```

2. **Update NodeRegistry usage:**
   ```typescript
   // Old
   await registry.discoverFromPackages('api');

   // New
   await registry.registerFromArray(ALL_NODES);
   ```

3. **Remove client-side workflow execution** - Use API calls instead

---

**Document Version:** 3.0.0
**Last Updated:** 2025-11-24
**Status:** Server-Only Architecture - Production Ready

