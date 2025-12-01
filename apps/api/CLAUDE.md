# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **Workscript API Server** (`@workscript/api`) - a Hono-based REST API with a modular plugin architecture for workflow orchestration. All workflow execution happens server-side.

## Commands

### Development
```bash
bun run dev        # Start with hot reload (watches src/index.ts)
bun run start      # Start without hot reload
bun run build      # Build to dist/ folder
bun run clean      # Remove dist folder
bun run kill-port  # Kill process using port 3013
```

### Database (Drizzle ORM + MySQL)
```bash
bun run db:generate  # Generate migrations from schema changes
bun run db:migrate   # Run pending migrations
bun run db:push      # Push schema directly (development)
bun run db:studio    # Open Drizzle Studio GUI
```

### From Monorepo Root
```bash
bun run dev:api      # Start API with hot reload
bun run build:api    # Build API
bun run test:api     # Run API tests
```

## Architecture

### Entry Point
`src/index.ts` - Hono app with:
- CORS middleware (configurable via `CLIENT_URL`)
- Plugin loader (auto-discovers plugins from `src/plugins/`)
- Bun.serve with WebSocket support at `/ws`
- Hot reload handling for development

### Plugin System
Plugins live in `src/plugins/{plugin-name}/plugin.ts` and implement the `SaaSPlugin` interface:

```typescript
// src/core/plugins/types.ts defines the plugin interface
interface SaaSPlugin {
  id: string;           // kebab-case identifier
  name: string;
  version: string;      // semver
  enabled: boolean;
  routes?: { basePath: string; router: Hono };
  schema?: { tables: any[] };
  aiManifest?: AIManifest;  // LLM-discoverable metadata
  onLoad?: (context: PluginContext) => Promise<void>;
  onUnload?: () => Promise<void>;
  healthCheck?: () => Promise<boolean>;
}
```

The loader (`src/core/plugins/loader.ts`) auto-discovers and mounts plugins at startup.

### Current Plugin: Workscript
Located in `src/plugins/workscript/`:
- **Routes:** `/workscript/workflows/*`, `/workscript/automations/*`, `/workscript/executions/*`, `/workscript/nodes/*`
- **Services:** `WorkflowService` - singleton that initializes the workflow engine
- **Schema:** `src/plugins/workscript/schema/workscript.schema.ts`

### Shared Services (`src/shared-services/`)
Cross-plugin services:

| Service | Purpose |
|---------|---------|
| `auth/` | JWTManager, SessionManager, APIKeyManager, PermissionManager |
| `websocket/` | BunWebSocketManager for real-time events |
| `scheduler/` | CronScheduler for automated workflow execution |
| `ask-ai/` | OpenRouter client for AI model access |
| `email/` | Email service (mock by default) |
| `integrations/` | OAuth provider management (Google, etc.) |

### Database Schema (`src/db/schema/`)
- `auth.schema.ts` - Users, sessions, API keys
- `automations.schema.ts` - Scheduled automation jobs
- `integrations.schema.ts` - OAuth connections
- `ai.schema.ts` - AI usage tracking

Plugin schemas are in their respective directories (e.g., `src/plugins/workscript/schema/`).

### API Routes (`src/routes/`)
Core routes mounted directly on the app:
- `/auth` - Authentication endpoints
- `/api/keys` - API key management
- `/password-reset` - Password reset flow
- `/integrations` - OAuth provider connections
- `/ai` - AI completions and model discovery

## Key Patterns

### WorkflowService Initialization
The `WorkflowService` (singleton) registers all nodes from `@workscript/nodes`:

```typescript
import { ALL_NODES } from '@workscript/nodes';
const registeredCount = await this.registry.registerFromArray(ALL_NODES, { source: 'server' });
```

### WebSocket Broadcasting
Workflow events are broadcast via hooks:

```typescript
this.hookManager.register('workflow:after-end', {
  name: 'websocket-broadcaster',
  handler: async (context) => {
    this.webSocketManager.broadcastToChannel('workflow-events', {
      type: 'workflow:completed',
      payload: { workflowId: context.workflowId }
    });
  }
});
```

### CronScheduler
Plugins register execution callbacks:

```typescript
cronScheduler.registerExecutionCallback('workscript', async (ctx) => {
  const result = await workflowService.executeWorkflow(workflow.definition);
  return { success: true, result };
});
```

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `PORT` | Server port (default: 3013) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Auth tokens (32+ chars) |
| `REDIS_URL` | Optional Redis for sessions |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth |
| `OPENROUTER_API_KEY` | AI completions |
| `CLIENT_URL` | CORS allowed origins |

## Package Dependencies

- `@workscript/engine` - Core workflow orchestration (ExecutionEngine, StateManager, etc.)
- `@workscript/nodes` - All workflow nodes (35+)
- `hono` - Web framework
- `drizzle-orm` + `mysql2` - Database ORM
- `croner` - Cron scheduling
- `ioredis` - Redis client (optional)

## API Endpoints

### Health & Info
- `GET /` - API info and available endpoints
- `GET /health` - Server health check
- `GET /api/plugins` - List loaded plugins
- `GET /api/health/plugins` - Plugin health status
- `GET /api/ai-manifest` - LLM-discoverable plugin capabilities

### Workscript Plugin
- `POST /workscript/workflows/create` - Save workflow to DB
- `POST /workscript/workflows/run` - Execute workflow immediately
- `POST /workscript/workflows/validate` - Validate without executing
- `GET /workscript/workflows/allnodes` - List available nodes
- `GET /workscript/automations` - List scheduled automations
- `POST /workscript/automations` - Create automation
- `POST /workscript/automations/:id/execute` - Manual trigger

### WebSocket
Connect to `ws://localhost:3013/ws` for real-time workflow events.

## Adding a New Plugin

1. Create directory: `src/plugins/{plugin-name}/`
2. Create `plugin.ts` exporting a `SaaSPlugin`:

```typescript
import type { SaaSPlugin } from '../../core/plugins';
import { Hono } from 'hono';

const router = new Hono();
router.get('/', (c) => c.json({ message: 'My plugin' }));

const plugin: SaaSPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  enabled: true,
  routes: { basePath: '/my-plugin', router },
  async onLoad(context) {
    context.logger?.info('Plugin loaded');
  }
};

export default plugin;
```

3. Restart the server - plugin auto-discovered
