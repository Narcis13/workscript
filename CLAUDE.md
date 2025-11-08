# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Architecture Migration Complete (November 2025)

**✅ MIGRATION COMPLETE: New Modular Plugin Architecture**

The project has been successfully migrated to a modern `/packages` and `/apps` architecture as outlined in `workscript_prospect.md`:

### Current Structure:
- **`/packages/engine`** - Core workflow engine (migrated from `/shared`, package: `@workscript/engine`)
- **`/packages/ui`** - Shared UI components (shadcn/ui, package: `@workscript/ui`)
- **`/packages/config`** - Shared configurations for ESLint, TypeScript, Tailwind
- **`/apps/api`** - Plugin-based API server with Workscript plugin
- **`/apps/frontend`** - Vite + React SPA (starting point for workflow UI)
- **`/server`** - Legacy CRM API (kept for Real Estate CRM features)
- **`/client`** - Legacy frontend (kept for workflow integration reference)

### Import Updates (COMPLETED):
All imports now use `@workscript/engine`:
```typescript
// ✅ Current imports (all files updated)
import { ExecutionEngine } from '@workscript/engine';
import { UNIVERSAL_NODES } from '@workscript/engine/nodes';
```

### Workspace Configuration:
```json
{
  "workspaces": ["./server", "./client", "./packages/*", "./apps/*"]
}
```
**Note:** `/shared` removed - migration complete!

### Architecture Roles:
- **`/packages/engine`** - Core workflow orchestration (universal)
- **`/packages/ui`** - Shared React components
- **`/packages/config`** - Shared tooling configurations
- **`/apps/api`** - Modern plugin-based API for SaaS products
- **`/apps/frontend`** - Frontend starting point (Vite + React)
- **`/server`** - Legacy CRM (keep for Real Estate features)
- **`/client`** - Legacy frontend (keep as reference)

---

## Project Overview

This is an **Agentic Workflow Orchestration System** built as a TypeScript monorepo using the bhvr stack (Bun + Hono + Vite + React). The project implements a **production-ready, shared-core** node-based workflow system with JSON definitions, comprehensive validation, lifecycle hooks, real-time event streaming, database persistence, and UI workflow generation.

**Key Achievement:** The **core engine is fully implemented in the @workscript/engine package** (formerly `/shared`, now `/packages/engine`) and executes workflows across server (Hono API), client (browser), and CLI environments with **distributed node architectures**.

## Essential Commands

### Development (New Architecture)
- `bun run dev` - Start all services (engine, api, frontend) with hot reload and concurrently
- `bun run dev:engine` - Start engine TypeScript watch mode
- `bun run dev:api` - Start API server with hot reload
- `bun run dev:frontend` - Start Vite dev server
- `bun install` - Install dependencies and auto-build engine package

### Development (Legacy - for reference)
- `bun run dev:legacy` - Start legacy server + client
- `bun run dev:client` - Start legacy client only
- `bun run dev:server` - Start legacy server only

### Build & Test
- `bun run build` - Build all packages (engine → api → frontend)
- `bun run build:engine` - Build engine package only
- `bun run build:api` - Build API server only
- `bun run build:frontend` - Build frontend only
- `bun run test` - Run tests for engine and API
- `bun run test:engine` - Run engine tests
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

The codebase follows a **modular plugin-based monorepo architecture** with packages and apps designed for **multi-environment execution**:

### Packages (Shared Core Libraries)

#### 1. Engine Package (`/packages/engine`) - `@workscript/engine` ✅

**Status:** Production-ready with advanced features

**Core Components:**
- **ExecutionEngine** (`/packages/engine/src/engine/`) - Orchestrates workflow execution with lifecycle hooks
- **WorkflowParser** (`/packages/engine/src/parser/`) - AST-like parsing with JSON Schema + semantic validation
- **StateManager** (`/packages/engine/src/state/`) - Advanced state management with snapshots, watchers, change detection
- **StateResolver** (`/packages/engine/src/state/`) - Elegant `$.key` syntax for state access
- **NodeRegistry** (`/packages/engine/src/registry/`) - Multi-package node discovery and registration
- **HookManager** (`/packages/engine/src/hooks/`) - Comprehensive lifecycle hook system
- **EventEmitter** (`/packages/engine/src/events/`) - Event-driven architecture foundation

**Node Library:**
- **Universal Nodes** (`/packages/engine/nodes/`) - Zero dependencies, environment-agnostic
  - `MathNode` - Mathematical operations
  - `LogicNode` - Boolean logic
  - `DataTransformNode` - Object/array transformations
  - `StateSetterNode` - Direct state manipulation with `$.path` syntax
  - `EmptyNode` - No-op placeholder
  - `LogNode` - Logging and debugging
- **Data Manipulation Nodes** (`/packages/engine/nodes/data/`) - Comprehensive data processing
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

### 2. UI Package (`/packages/ui`) - `@workscript/ui` ✅

**Status:** Active development

**Purpose:** Shared React UI components for all frontend applications

**Components:**
- **Button** - Customizable button component with variants
- **Utils** - `cn()` function for className merging

**Usage:**
```typescript
import { Button, cn } from '@workscript/ui';
```

### 3. Config Package (`/packages/config`) - `@workscript/config` ✅

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

### 1. API Server (`/apps/api`) - **PLUGIN-BASED API** ✅

**Status:** Production-ready

**Architecture:** Plugin-based SaaS platform architecture

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

**API Nodes** (`/apps/api/nodes/`):
- `FileSystemNode` - File operations (read, write, delete, mkdir)
- `DatabaseNode` - Database queries and operations
- `AuthNode` - Authentication and authorization
- **Custom Integrations** (`/apps/api/nodes/custom/`):
  - Gmail integration (googleConnect, sendEmail, listEmails)
  - Zoca integration (toateContactele, fiecareElement, aplicaFiltre)

**Note:** Legacy server code in `/server` is maintained for Real Estate CRM features (see Legacy Applications section below)

### 2. Frontend App (`/apps/frontend`) - **VITE + REACT SPA** ✅

**Status:** Starting point for workflow UI

**Stack:**
- Vite 7 + React 19
- Tailwind CSS v4
- TypeScript
- shadcn/ui components integration

**Purpose:** Modern SPA for workflow builder and execution UI

**Frontend Nodes** (`/apps/frontend/nodes/`):
- `LocalStorageNode` - Browser storage operations
- `FetchNode` - HTTP requests from browser
- `DOMNode` - DOM manipulation
- **UI Workflow Nodes** - Interactive UI generation
  - `FormUINode` - Dynamic form rendering
  - `DataTableUINode` - Data table visualization
  - `ChartUINode` - Chart and graph rendering
  - `DashboardUINode` - Dashboard composition
  - `FileProcessorUINode` - File upload and processing
  - `ActionButtonGroupUINode` - Action button groups

**Note:** Legacy client code in `/client` contains reference implementations of UI workflow integration (see Legacy Applications section below)

---

## Legacy Applications (Kept for Reference)

### Server (`/server`) - **LEGACY CRM API**

**Status:** Maintained for Real Estate CRM features

**Contains:**
- Complete Real Estate CRM schema (13+ tables, 821 lines)
- Agency, Agent, Contact, Property management
- AI Lead Scoring, Property Matching
- WhatsApp conversations
- Email templates
- Legacy server nodes (`/server/nodes/`)

**Keep for:** Production CRM functionality not yet migrated to EstateFlow plugin

### Client (`/client`) - **LEGACY FRONTEND**

**Status:** Reference for workflow integration

**Contains:**
- Full workflow UI integration
- ClientWorkflowService
- UI workflow nodes (FormUI, DataTable, Chart, Dashboard)
- WebSocket workflow demos
- Legacy client nodes (`/client/nodes/`)

**Keep for:** Reference implementation of workflow UI integration

---

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

1. **Universal Nodes** (`/packages/engine/nodes/`) - Zero external dependencies
   - Pure computation and logic
   - Work in any JavaScript runtime
   - Examples: Math, Logic, Data transformation

2. **API Nodes** (`/apps/api/nodes/`) - Server-specific dependencies
   - File system, databases, authentication
   - Network operations, external APIs
   - Examples: FileSystem, Database, Auth, Gmail
   - **Note:** Legacy server nodes in `/server/nodes/` (CRM features only)

3. **Frontend Nodes** (`/apps/frontend/nodes/`) - Browser-specific APIs
   - DOM manipulation, client storage
   - Browser APIs, UI rendering
   - Examples: LocalStorage, Fetch, DOM, UI nodes
   - **Note:** Legacy client nodes in `/client/nodes/` (reference implementations)

**Automatic Discovery:**
- NodeRegistry loads appropriate nodes based on environment
- `discoverFromPackages('api')` - Loads universal + API nodes
- `discoverFromPackages('frontend')` - Loads universal + frontend nodes
- `discoverFromPackages('universal')` - Loads only universal nodes

## Important Conventions

### Code Quality
1. **TypeScript Strict Mode** - All code must pass TypeScript checks
2. **Error Handling** - Provide detailed, actionable error messages
3. **Testing** - Write tests for all core components and nodes
4. **Documentation** - Include JSDoc comments and AI hints in node metadata

### Architecture Rules
1. **Engine-First** - Core engine logic goes in `/packages/engine/`, not duplicated
2. **Node Placement** - Consider dependencies when placing nodes:
   - No dependencies → `/packages/engine/nodes/`
   - Server dependencies (fs, db) → `/apps/api/nodes/`
   - Browser APIs → `/apps/frontend/nodes/`
   - **Legacy:** Existing nodes in `/server/nodes/` and `/client/nodes/` remain for CRM features
3. **Import Structure** - Always import from `@workscript/engine` package for core types and engine
4. **State Immutability** - Use StateManager methods, don't mutate state directly

### Development Workflow
1. **Build Order** - Engine package builds first, then api and frontend
2. **Hot Reload** - Use `bun run dev` for concurrent development of all apps
3. **Testing** - Test workflows in target environment (api/frontend/universal)
4. **Validation** - Workflows are validated before execution (JSON Schema + semantic)

## Multi-Environment Usage Examples

### API Server Environment (Hono API)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager, HookManager } from '@workscript/engine';

// API server initialization - loads universal + API nodes
const registry = new NodeRegistry();
await registry.discoverFromPackages('api');

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

// Execute workflow with API server capabilities
const result = await engine.execute(parsedWorkflow);
```

### Frontend Environment (Browser)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from '@workscript/engine';

// Frontend initialization - loads universal + frontend nodes
const registry = new NodeRegistry();
await registry.discoverFromPackages('frontend');

const engine = new ExecutionEngine(registry, new StateManager());

// Execute workflow in browser
const result = await engine.execute(parsedWorkflow);
```

### Universal Environment (CLI/Testing)
```typescript
import { ExecutionEngine, NodeRegistry, StateManager } from '@workscript/engine';

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
- **Engine Changes** - Modify components in `/packages/engine/src/` and rebuild dependent packages
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
- ✅ Core engine features → `/packages/engine/src/`
- ✅ Universal nodes → `/packages/engine/nodes/`
- ✅ API server nodes → `/apps/api/nodes/`
- ✅ Frontend nodes → `/apps/frontend/nodes/`
- ✅ Business integrations → `/apps/api/nodes/custom/` or `/apps/frontend/nodes/custom/`
- **Note:** Legacy paths `/server/nodes/` and `/client/nodes/` remain for CRM features only

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
2. **Business Integrations** - Extend custom integrations in `/apps/api/nodes/custom/`
3. **UI Components** - Add new UI workflow nodes in `/apps/frontend/nodes/ui/`
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

### API Server Node Pattern (Server Dependencies)

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
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

### Frontend Node Pattern (Browser APIs)

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

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
├── packages/                   # ✅ Shared Core Libraries
│   ├── engine/                 # @workscript/engine (Core workflow engine)
│   │   ├── src/
│   │   │   ├── engine/         # ExecutionEngine with lifecycle hooks
│   │   │   ├── parser/         # WorkflowParser with AST parsing
│   │   │   ├── state/          # StateManager + StateResolver
│   │   │   ├── registry/       # NodeRegistry with multi-package discovery
│   │   │   ├── hooks/          # HookManager for lifecycle events
│   │   │   ├── events/         # EventEmitter and WebSocket types
│   │   │   ├── types/          # Complete TypeScript type definitions
│   │   │   └── schemas/        # JSON Schema for validation
│   │   ├── nodes/              # Universal nodes (zero dependencies)
│   │   │   ├── MathNode.ts
│   │   │   ├── LogicNode.ts
│   │   │   ├── DataTransformNode.ts
│   │   │   ├── StateSetterNode.ts
│   │   │   ├── EmptyNode.ts
│   │   │   ├── LogNode.ts
│   │   │   └── data/           # Data manipulation library
│   │   │       ├── FilterNode.ts
│   │   │       ├── SortNode.ts
│   │   │       ├── AggregateNode.ts
│   │   │       ├── SummarizeNode.ts
│   │   │       ├── LimitNode.ts
│   │   │       ├── SplitOutNode.ts
│   │   │       ├── RemoveDuplicatesNode.ts
│   │   │       ├── EditFieldsNode.ts
│   │   │       ├── TransformObjectNode.ts
│   │   │       ├── JSONExtractNode.ts
│   │   │       ├── CompareDatasetsNode.ts
│   │   │       └── SwitchNode.ts
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
│   ├── config/                 # @workscript/config (Shared configs)
│   │   ├── eslint/
│   │   ├── typescript/
│   │   ├── tailwind/
│   │   └── package.json
│   │
│   └── utils/                  # @workscript/utils (Shared utilities)
│       └── package.json
│
├── apps/                       # ✅ Applications
│   ├── api/                    # Plugin-based API server (Hono)
│   │   ├── src/
│   │   │   ├── index.ts        # Hono API entry point
│   │   │   ├── plugins/        # SaaS plugins
│   │   │   │   ├── workscript/ # Workscript plugin
│   │   │   │   │   ├── routes/ # API routes
│   │   │   │   │   ├── services/ # Business logic
│   │   │   │   │   └── schema/ # Database schema
│   │   │   │   └── ...
│   │   │   ├── shared-services/ # Shared services
│   │   │   │   ├── WebSocketManager.ts
│   │   │   │   ├── CronScheduler.ts
│   │   │   │   └── ...
│   │   │   └── middleware/     # API middleware
│   │   ├── nodes/              # API-specific nodes
│   │   │   ├── FileSystemNode.ts
│   │   │   ├── DatabaseNode.ts
│   │   │   ├── AuthNode.ts
│   │   │   └── custom/         # Custom integrations
│   │   │       ├── google/gmail/
│   │   │       └── zoca/
│   │   └── package.json
│   │
│   ├── frontend/               # Vite + React SPA
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── nodes/              # Frontend-specific nodes
│   │   │   ├── LocalStorageNode.ts
│   │   │   ├── FetchNode.ts
│   │   │   ├── DOMNode.ts
│   │   │   └── ui/             # UI workflow nodes
│   │   │       ├── FormUINode.ts
│   │   │       ├── DataTableUINode.ts
│   │   │       ├── ChartUINode.ts
│   │   │       ├── DashboardUINode.ts
│   │   │       ├── FileProcessorUINode.ts
│   │   │       └── ActionButtonGroupUINode.ts
│   │   └── package.json
│   │
│   ├── docs/                   # Documentation site (optional)
│   ├── mobile/                 # Mobile app (future)
│   └── client/                 # Placeholder (not fully populated)
│
├── server/                     # ⚠️ LEGACY - Real Estate CRM API
│   ├── src/                    # Legacy Hono API
│   │   ├── index.ts
│   │   ├── api/                # CRM routes
│   │   ├── services/           # CRM services
│   │   ├── db/                 # CRM schema (13+ tables)
│   │   ├── middleware/
│   │   └── lib/
│   ├── nodes/                  # Legacy server nodes
│   │   ├── FileSystemNode.ts
│   │   ├── DatabaseNode.ts
│   │   ├── AuthNode.ts
│   │   └── custom/
│   │       ├── google/gmail/
│   │       └── zoca/
│   └── package.json
│
├── client/                     # ⚠️ LEGACY - Reference frontend
│   ├── src/                    # Legacy React app
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── nodes/                  # Legacy client nodes
│   │   ├── LocalStorageNode.ts
│   │   ├── FetchNode.ts
│   │   ├── DOMNode.ts
│   │   ├── ui/
│   │   │   ├── FormUINode.ts
│   │   │   ├── DataTableUINode.ts
│   │   │   ├── ChartUINode.ts
│   │   │   └── ...
│   │   └── utils/
│   │       ├── ButtonNode.ts
│   │       └── ...
│   └── package.json
│
├── package.json                # Root workspace config
├── CLAUDE.md                   # This file - guidance for Claude Code
├── workscript_prospect.md      # Strategic roadmap
└── README.md                   # Project README
```

**Key:**
- ✅ **Production-ready** - Active development, use for new features
- ⚠️ **Legacy** - Kept for Real Estate CRM features, reference only

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

