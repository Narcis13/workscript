# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Server-only Agentic Workflow Orchestration System with modular plugin architecture

**Key Characteristics:**
- Pure orchestration engine (no node implementations) in `@workscript/engine`
- Consolidated 45+ workflow nodes in `@workscript/nodes`
- Hono-based REST API with plugin system for extensibility
- React management UI (no local workflow execution)
- Monorepo structure with clear package separation
- Workflow execution only on server via REST/WebSocket APIs
- JSON-based workflow definitions with state resolver for dynamic values

## Layers

**Orchestration Layer:**
- Purpose: Parse workflows, manage execution state, coordinate node execution
- Location: `/packages/engine/src/`
- Contains: ExecutionEngine, WorkflowParser, StateManager, StateResolver, NodeRegistry, HookManager
- Depends on: Ajv (validation), glob (asset discovery)
- Used by: API server (`@workscript/api`), potentially frontend for preview/validation

**Node Implementation Layer:**
- Purpose: Provide all workflow node types (core, data, AI, server integrations)
- Location: `/packages/nodes/src/`
- Contains: 45 node classes extending `WorkflowNode` from engine
- Depends on: `@workscript/engine`, bcryptjs, mysql2
- Used by: API server (registered via NodeRegistry)
- Node categories: Core (6), AI (1), Orchestration (1), Data manipulation (28), Server (3), Custom integrations (6)

**API Server Layer:**
- Purpose: HTTP endpoint for workflow management, execution, real-time events
- Location: `/apps/api/src/`
- Contains: Hono routes, plugin system, database schema, WebSocket manager, shared services
- Depends on: Hono, Drizzle ORM, `@workscript/engine`, `@workscript/nodes`, MySQL, Redis
- Used by: Frontend, external clients via REST/WebSocket

**Shared Services Layer:**
- Purpose: Cross-plugin utilities (auth, WebSocket, scheduling, AI, integrations)
- Location: `/apps/api/src/shared-services/`
- Contains: Authentication (JWT, sessions, API keys), WebSocket broadcaster, Cron scheduler, OpenRouter AI client
- Depends on: ioredis, croner, googleapis
- Used by: Plugins, routes

**Plugin System:**
- Purpose: Modular plugin architecture for extending API with new capabilities
- Location: `/apps/api/src/plugins/` and `/apps/api/src/core/plugins/`
- Contains: Auto-discoverable SaaSPlugin implementations, plugin loader, plugin registry
- Current plugins: Workscript (main workflow plugin), extensible for new plugins
- Used by: API server initialization and request routing

**Frontend Layer:**
- Purpose: Management UI for workflows, automations, executions, integrations
- Location: `/apps/frontend/src/`
- Contains: React components, routes, API clients, WebSocket consumers, auth context
- Depends on: React 19, Vite 7, shadcn/ui, React Query, Zod for validation
- Used by: Browser clients
- Does NOT execute workflows locally

## Data Flow

**Workflow Creation and Execution:**

1. **Frontend:** User designs workflow in editor, sends JSON to API
2. **API Routes:** Receives POST `/workscript/workflows/run` with workflow definition
3. **WorkflowService:** Initializes ExecutionEngine with ALL_NODES registered
4. **WorkflowParser:** Parses JSON workflow → AST (array of ParsedNode objects)
5. **ExecutionEngine:** Iterates workflow array sequentially:
   - Resolves state references ($.key syntax) before passing to node
   - Instantiates node class, calls `execute(context, config)`
   - Node returns EdgeMap with conditional edges
   - Engine resolves which edge to follow based on result
   - Updates context.state with node outputs
6. **State Updates:** StateManager tracks versions, snapshots for rollback
7. **Events:** HookManager broadcasts to WebSocket via `workflow:after-end`, `node:before-execute`, etc.
8. **Frontend:** WebSocket listener updates UI with real-time execution progress

**State Resolution During Execution:**

- **Full reference** (`$.key`): Direct state access, type preservation
  - `"$.count": 42` → 42 (number)
  - Used for node input parameters requiring actual values
- **Template interpolation** (`{{$.key}}`): String embedding
  - `"Hello {{$.user.name}}"` → `"Hello Alice"` (string)
  - Used for messages, dynamic URLs, text concatenation
- **State setters** (`{"$.path": value}`): Update workflow state
  - Persists across nodes in workflow execution

**Database Persistence:**

- MySQL via Drizzle ORM
- Schema in `/apps/api/src/db/schema/`
- Tables: workflows, automations, integrations, auth (users, sessions, API keys)
- Plugin schema: `/apps/api/src/plugins/workscript/schema/`

## Key Abstractions

**WorkflowNode:**
- Purpose: Base class for all node implementations
- Examples: `MathNode`, `FilterNode`, `DatabaseNode`, `AskAINode`
- Pattern: Extend WorkflowNode, implement `metadata` object and `execute()` async method
- Returns EdgeMap (dictionary of edge functions for conditional routing)

**ExecutionContext:**
- Purpose: Immutable context passed to every node during execution
- Contains: `state` (mutable), `inputs`, `workflowId`, `nodeId`, `executionId`
- Used to: Read from state, write to state, identify workflow/node being executed

**EdgeMap:**
- Purpose: Return value from node.execute(), defines possible routing paths
- Example: `{ success: () => ({...}), error: () => ({...}) }`
- Used by: ExecutionEngine to determine which next node to execute

**SaaSPlugin:**
- Purpose: Extensible plugin interface for API server
- Contains: `id`, `name`, `version`, `enabled`, `routes`, `schema`, `aiManifest`, lifecycle hooks
- Location: `/apps/api/src/core/plugins/types.ts`
- Example implementation: `/apps/api/src/plugins/workscript/plugin.ts`

**StateResolver:**
- Purpose: Parse and resolve state reference syntax in workflow definitions
- Handles: `$.path` (full reference), `{{$.path}}` (template), nested paths
- Location: `/packages/engine/src/state/StateResolver.ts`

**NodeRegistry:**
- Purpose: Register node classes, manage instantiation, lookup by ID
- Location: `/packages/engine/src/registry/NodeRegistry.ts`
- Method: `registerFromArray(ALL_NODES, { source: 'server' })`

## Entry Points

**API Server:**
- Location: `/apps/api/src/index.ts`
- Triggers: `bun run dev` or `bun src/index.ts`
- Responsibilities:
  - Initialize Hono app with CORS, logging
  - Load plugins auto-discovered from `src/plugins/`
  - Mount core routes (auth, API keys, password reset, integrations, AI)
  - Mount WebSocket endpoint at `/ws`
  - Serve health checks

**Frontend App:**
- Location: `/apps/frontend/src/main.tsx`
- Triggers: React DOM render
- Responsibilities:
  - Initialize React Query client
  - Wrap app with QueryClientProvider
  - Mount App component

**Frontend Routes:**
- Location: `/apps/frontend/src/routes.tsx`
- Uses: React Router v7 with `createBrowserRouter`
- Routes: Dashboard, workflows, automations, executions, nodes, monitoring, integrations
- All protected by ProtectedRoute guard

**ExecutionEngine:**
- Location: `/packages/engine/src/engine/ExecutionEngine.ts`
- Called by: WorkflowService (API)
- Responsibilities:
  - Load and validate workflow definition via WorkflowParser
  - Initialize NodeRegistry with ALL_NODES
  - Execute workflow array sequentially
  - Handle state resolution and updates
  - Fire lifecycle hooks
  - Handle timeouts and max loop iterations

## Error Handling

**Strategy:** Edge-based return pattern (not exceptions)

**Patterns:**
- Nodes return EdgeMap with conditional edges (success, error, found, not_found, etc.)
- ExecutionEngine catches errors from node.execute(), triggers error edge
- No throwing exceptions; routing determined by edge selection
- HTTP endpoints return error responses with status codes
- WebSocket broadcasts error events

## Cross-Cutting Concerns

**Logging:**
- API: Hono logger middleware at `/apps/api/src/index.ts` (line 71)
- Engine: console.warn/log in StateResolver, ExecutionEngine
- Frontend: React Query DevTools for API debugging

**Validation:**
- Engine: JSON Schema via Ajv in WorkflowParser
- Semantic: Node existence checks, edge target validation
- Frontend: Zod schemas in components and services

**Authentication:**
- API: JWT-based via JWTManager (`/apps/api/src/shared-services/auth/`)
- Frontend: AuthContext with token storage in localStorage
- Tokens auto-refresh via Axios interceptor
- API keys for service-to-service auth

**State Management:**
- Engine: StateManager with snapshots, watchers, version tracking
- Frontend: React Context (auth), React Query (server state), Zustand (optional local stores)
- WebSocket: BunWebSocketManager broadcasts workflow events to subscribed clients

**Database Operations:**
- Drizzle ORM at `/apps/api/src/db/`
- MySQL connections via mysql2
- Schema migrations via drizzle-kit
- Plugins define schemas in their directories

**Real-time Events:**
- WebSocket at `/ws` endpoint
- HookManager triggers events during workflow execution
- BunWebSocketManager broadcasts to channels
- Frontend subscribes via useWebSocket hook
