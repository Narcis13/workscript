# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
workscript/
├── packages/                   # Shared libraries
│   ├── engine/                # @workscript/engine - Pure orchestration (no nodes)
│   │   ├── src/
│   │   │   ├── engine/        # ExecutionEngine, workflow orchestration
│   │   │   ├── parser/        # WorkflowParser, JSON schema validation
│   │   │   ├── state/         # StateManager, StateResolver, state handling
│   │   │   ├── registry/      # NodeRegistry, node instantiation
│   │   │   ├── hooks/         # HookManager, lifecycle events
│   │   │   ├── events/        # EventEmitter, WebSocket types
│   │   │   ├── types/         # TypeScript interfaces (WorkflowNode, ExecutionContext, EdgeMap)
│   │   │   ├── ui/            # UINode base class
│   │   │   ├── schemas/       # JSON Schema validation files
│   │   │   └── index.ts       # Central exports
│   │   ├── dist/              # Compiled output (generated)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── CLAUDE.md
│   ├── nodes/                 # @workscript/nodes - All 45 workflow nodes
│   │   ├── src/
│   │   │   ├── *Node.ts       # Core nodes (Math, Logic, Transform, Empty, Log, StateSetter)
│   │   │   ├── AskAINode.ts   # AI/LLM integration
│   │   │   ├── RunWorkflowNode.ts # Workflow orchestration
│   │   │   ├── FileSystemNode.ts, DatabaseNode.ts, AuthNode.ts # Server nodes
│   │   │   ├── data/          # Data manipulation nodes (28 nodes)
│   │   │   │   ├── FilterNode.ts
│   │   │   │   ├── SortNode.ts
│   │   │   │   ├── AggregateNode.ts
│   │   │   │   ├── EditFieldsNode.ts
│   │   │   │   ├── EveryArrayItemNode.ts, RangeNode.ts, WhileNode.ts # Loop nodes
│   │   │   │   ├── FetchApiNode.ts # HTTP operations
│   │   │   │   ├── ResourceReadNode.ts, ResourceWriteNode.ts, etc. # Resource operations
│   │   │   │   └── [20+ more data nodes]
│   │   │   ├── custom/        # Third-party integrations
│   │   │   │   ├── google/gmail/
│   │   │   │   │   ├── googleConnect.ts
│   │   │   │   │   ├── sendEmail.ts
│   │   │   │   │   └── listEmails.ts
│   │   │   │   └── zoca/      # Zoca CRM integration
│   │   │   │       ├── toateContactele.ts
│   │   │   │       ├── fiecareElement.ts
│   │   │   │       └── aplicaFiltre.ts
│   │   │   └── index.ts       # Central exports, ALL_NODES array
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── CLAUDE.md
│   ├── ui/                    # @workscript/ui - Shared React components (shadcn/ui)
│   │   └── src/
│   ├── config/                # @workscript/config - ESLint, TypeScript, Tailwind configs
│   │   └── [shared configs]
│   └── utils/                 # Utility functions
├── apps/
│   ├── api/                   # @workscript/api - Hono REST API server
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point, Hono app initialization
│   │   │   ├── core/
│   │   │   │   └── plugins/   # Plugin system
│   │   │   │       ├── loader.ts      # Auto-discovers and mounts plugins
│   │   │   │       ├── registry.ts    # Plugin registry
│   │   │   │       ├── types.ts       # SaaSPlugin interface
│   │   │   │       └── middleware.ts
│   │   │   ├── plugins/       # Plugin implementations
│   │   │   │   └── workscript/        # Main workflow plugin
│   │   │   │       ├── plugin.ts      # SaaSPlugin implementation
│   │   │   │       ├── service/       # WorkflowService (singleton)
│   │   │   │       ├── routes/        # Hono routes
│   │   │   │       │   ├── workflows.ts
│   │   │   │       │   ├── automations.ts
│   │   │   │       │   ├── executions.ts
│   │   │   │       │   └── nodes.ts
│   │   │   │       └── schema/        # Database schema
│   │   │   ├── routes/        # Core API routes
│   │   │   │   ├── auth.ts
│   │   │   │   ├── apikeys.ts
│   │   │   │   ├── password-reset.ts
│   │   │   │   ├── integrations.ts
│   │   │   │   └── ai.ts
│   │   │   ├── shared-services/       # Cross-plugin services
│   │   │   │   ├── auth/             # JWT, sessions, API keys
│   │   │   │   │   ├── JWTManager.ts
│   │   │   │   │   ├── SessionManager.ts
│   │   │   │   │   └── PermissionManager.ts
│   │   │   │   ├── websocket/        # WebSocket manager
│   │   │   │   │   └── BunWebSocketManager.ts
│   │   │   │   ├── scheduler/        # Cron job scheduling
│   │   │   │   │   └── CronScheduler.ts
│   │   │   │   ├── ask-ai/           # AI completions
│   │   │   │   ├── email/            # Email service
│   │   │   │   └── integrations/     # OAuth providers
│   │   │   ├── db/            # Database layer
│   │   │   │   ├── connection.ts
│   │   │   │   └── schema/    # Drizzle ORM schemas
│   │   │   │       ├── auth.schema.ts
│   │   │   │       ├── automations.schema.ts
│   │   │   │       └── integrations.schema.ts
│   │   │   └── workflows/     # Workflow utilities (if any)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── CLAUDE.md
│   │   └── drizzle.config.ts
│   ├── frontend/              # React management UI (Vite)
│   │   ├── src/
│   │   │   ├── main.tsx       # Entry point
│   │   │   ├── App.tsx        # Root component
│   │   │   ├── index.css      # Global styles, Tailwind
│   │   │   ├── components/    # React components organized by feature
│   │   │   │   ├── auth/      # Login, register, password reset
│   │   │   │   ├── workflows/ # Workflow editor, CRUD, Monaco editor
│   │   │   │   ├── automations/ # Automation CRUD, cron builder
│   │   │   │   ├── executions/ # Execution details, timeline, state viewer
│   │   │   │   ├── nodes/     # Node browser, node details
│   │   │   │   ├── monitoring/ # Real-time monitor, WebSocket status
│   │   │   │   ├── integrations/ # OAuth connections
│   │   │   │   ├── layout/    # AppLayout, Header, Sidebar
│   │   │   │   ├── guards/    # ProtectedRoute, RouteErrorBoundary
│   │   │   │   ├── shared/    # DataTable, EmptyState, LoadingSpinner
│   │   │   │   └── ui/        # shadcn/ui components
│   │   │   ├── contexts/      # React Context (auth)
│   │   │   ├── hooks/         # Custom hooks
│   │   │   │   ├── api/       # useWorkflows, useAutomations, etc.
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useWebSocket.ts
│   │   │   ├── pages/         # Route page components
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── WorkflowsPage.tsx
│   │   │   │   ├── WorkflowEditor.tsx
│   │   │   │   ├── AutomationsPage.tsx
│   │   │   │   ├── ExecutionsPage.tsx
│   │   │   │   ├── NodesPage.tsx
│   │   │   │   ├── Monitoring.tsx
│   │   │   │   └── Integrations.tsx
│   │   │   ├── services/      # API clients, utilities
│   │   │   │   ├── api/       # Axios instance, endpoint clients
│   │   │   │   └── websocket/ # WebSocket client
│   │   │   ├── stores/        # Zustand stores (if used)
│   │   │   ├── types/         # TypeScript interfaces
│   │   │   ├── lib/           # Utility functions, React Query config
│   │   │   ├── routes.tsx     # React Router v7 route definitions
│   │   │   └── vite-env.d.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── eslint.config.js
│   │   ├── CLAUDE.md
│   │   └── index.html
│   └── [other apps: client/, mobile/, sandbox/]
├── docs/                      # Documentation
├── .planning/                 # Planning/analysis output
│   └── codebase/              # Codebase analysis documents
├── package.json               # Root monorepo config
├── bunfig.toml                # Bun configuration
├── bun.lock                   # Lock file
├── tsconfig.json              # Root TypeScript config
├── .prettierrc                # Code formatting
├── CLAUDE.md                  # Root guidance for Claude Code
└── WORKFLOW_CREATION_BLUEPRINT.md # Workflow syntax reference
```

## Directory Purposes

**packages/engine:**
- Purpose: Pure orchestration and state management (NO node implementations)
- Contains: Workflow parser, execution engine, state resolver, hook system, type definitions
- Key files: `ExecutionEngine.ts`, `WorkflowParser.ts`, `StateManager.ts`, `StateResolver.ts`, `NodeRegistry.ts`

**packages/nodes:**
- Purpose: All 45 workflow node implementations (consolidated in single package)
- Contains: Core nodes, data manipulation nodes, AI nodes, server nodes, custom integrations
- Key file: `src/index.ts` (exports ALL_NODES array with all node classes)
- Subdirectories: `data/` (28 nodes), `custom/google/gmail/` (Gmail), `custom/zoca/` (Zoca CRM)

**apps/api:**
- Purpose: REST API server for workflow execution, management, real-time events
- Contains: Hono routes, plugin system, database schema, shared services
- Entry point: `src/index.ts`
- Key services: WorkflowService (workflow execution), BunWebSocketManager, CronScheduler, JWTManager
- Port: 3013 (default)

**apps/frontend:**
- Purpose: React management UI for workflows, automations, executions (NO local execution)
- Contains: Routes, components, API clients, authentication, real-time updates
- Entry point: `src/main.tsx` (React DOM render)
- Key files: `routes.tsx` (all routes), `App.tsx` (root component), `contexts/AuthContext.tsx`
- Dev port: 5173 (Vite default)

## Key File Locations

**Entry Points:**
- `apps/api/src/index.ts`: API server initialization, Hono app, middleware, plugin loader
- `apps/frontend/src/main.tsx`: React DOM render with React Query provider
- `packages/engine/src/index.ts`: Central exports (all engine modules)
- `packages/nodes/src/index.ts`: Central exports (ALL_NODES array)

**Configuration:**
- `package.json`: Root monorepo workspace, build/test scripts
- `bunfig.toml`: Bun runtime configuration
- `apps/api/drizzle.config.ts`: Database migration config
- `apps/frontend/vite.config.ts`: Vite build config
- `tsconfig.json`: Shared TypeScript config across monorepo

**Core Logic:**
- `packages/engine/src/engine/ExecutionEngine.ts`: Workflow orchestration
- `packages/engine/src/parser/WorkflowParser.ts`: JSON→AST parsing, validation
- `packages/engine/src/state/StateResolver.ts`: $.key and {{$.key}} resolution
- `apps/api/src/plugins/workscript/service/WorkflowService.ts`: Workflow execution API
- `apps/api/src/shared-services/websocket/BunWebSocketManager.ts`: Real-time events

**Testing:**
- `packages/engine/src/**/*.test.ts`: Engine unit tests (Vitest)
- `packages/nodes/src/**/*.test.ts`: Node tests
- `apps/api/src/**/*.test.ts`: API tests

## Naming Conventions

**Files:**
- Node implementations: `{NodeName}Node.ts` (e.g., `FilterNode.ts`, `MathNode.ts`)
- Services: `{ServiceName}Service.ts` (e.g., `WorkflowService.ts`)
- Managers: `{Manager}Manager.ts` (e.g., `NodeRegistry.ts`, `HookManager.ts`)
- Routes: `{resource}.ts` (e.g., `workflows.ts`, `automations.ts`)
- Tests: `{Filename}.test.ts` (co-located)
- Utilities: Lowercase with hyphens in folder names (e.g., `shared-services/`)

**Directories:**
- Feature folders: Lowercase plural or kebab-case (e.g., `components/`, `shared-services/`)
- Node subdirectories: `data/` (data nodes), `custom/` (integrations)
- Type definitions: `types/` directory

**TypeScript Classes:**
- Node classes: `{Feature}Node` (extends WorkflowNode)
- Manager classes: `{Name}Manager`
- Service classes: `{Name}Service` (singleton pattern)

## Where to Add New Code

**New Workflow Node:**
- Location for core: `packages/nodes/src/{NodeName}Node.ts`
- Location for data operations: `packages/nodes/src/data/{NodeName}Node.ts`
- Location for integrations: `packages/nodes/src/custom/{service}/{NodeName}.ts`
- Export: Add to `packages/nodes/src/index.ts` and to ALL_NODES array
- Test file: `packages/nodes/src/{NodeName}Node.test.ts`

**New Engine Feature (parser, state, hooks):**
- Location: `packages/engine/src/{layer}/` where layer is `parser/`, `state/`, `hooks/`, etc.
- Example: New hook type → `packages/engine/src/hooks/MyHook.ts`
- Test file: Co-located as `MyHook.test.ts`

**New API Route:**
- Location: `apps/api/src/routes/{resource}.ts` for core routes
- Location: `apps/api/src/plugins/{plugin-name}/routes/{resource}.ts` for plugin routes
- Integration: Import in `apps/api/src/index.ts` and mount with `app.route()`

**New Frontend Component:**
- Location: `apps/frontend/src/components/{feature}/{ComponentName}.tsx`
- Styling: Tailwind CSS + shadcn/ui components (in `components/ui/`)
- Test: Co-located as `{ComponentName}.test.tsx` if needed

**New Shared Service:**
- Location: `apps/api/src/shared-services/{service-name}/{ServiceName}.ts`
- Pattern: Singleton class with static methods or exported functions
- Used by: Multiple plugins

**New Plugin:**
- Location: `apps/api/src/plugins/{plugin-name}/plugin.ts`
- Requirements: Implement SaaSPlugin interface, export default plugin object
- Auto-discovery: Loader finds plugins in `src/plugins/{name}/plugin.ts` automatically

## Special Directories

**node_modules:**
- Purpose: Dependencies installed by Bun
- Generated: Yes (automatic via `bun install`)
- Committed: No (.gitignore)

**dist/:**
- Purpose: Compiled TypeScript output (packages/engine only)
- Generated: Yes (via `bun run build` or `tsc`)
- Committed: No (.gitignore)

**.git/:**
- Purpose: Git repository metadata
- Generated: Yes (by git)
- Committed: N/A

**docs/:**
- Purpose: Project documentation
- Manual: Yes
- Committed: Yes

**.env (at apps/api):**
- Purpose: Environment variables for database, auth, API keys
- Template: `.env.example`
- Committed: No (.gitignore) - secrets must be private
- Required: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, PORT

**bun.lock:**
- Purpose: Dependency lock file (Bun package manager)
- Generated: Yes (via `bun install`)
- Committed: Yes

---

## File-Level Guidance

### When Adding UI Components
Use path: `apps/frontend/src/components/{feature}/{ComponentName}.tsx`
Pattern: Function component with React hooks
Styling: Import Tailwind + shadcn components
State: Use React Query for server state, Context for global, Zustand for local

### When Adding API Endpoints
For new plugin: Create `apps/api/src/plugins/{name}/routes/{resource}.ts`
For core API: Create `apps/api/src/routes/{resource}.ts`
Pattern: Use Hono router, return JSON responses
Database: Use Drizzle ORM with schema in same plugin/core directory

### When Adding Node Implementations
File: `packages/nodes/src/{NodeName}Node.ts` or `packages/nodes/src/data/{NodeName}Node.ts`
Pattern: Extend WorkflowNode, implement execute() returning EdgeMap
Metadata: Include ai_hints for LLM integration
State: Use context.state for persistence across workflow

### When Modifying Engine Core
File: `packages/engine/src/{component}/` (engine, parser, state, etc.)
Pattern: Maintain pure orchestration (no node implementations)
Tests: Co-locate test files, use Vitest
After change: Run `bun run build:engine` from root to update dist/
