# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Architecture Overview

**Server-only Agentic Workflow Orchestration System** - TypeScript monorepo (Bun + Hono + Vite + React)

### Package Structure
```
workscript/
├── packages/
│   ├── engine/     # @workscript/engine - Pure orchestration (NO node implementations)
│   ├── nodes/      # @workscript/nodes - ALL 35+ workflow nodes consolidated here
│   ├── ui/         # @workscript/ui - Shared React components (shadcn/ui)
│   └── config/     # @workscript/config - ESLint, TypeScript, Tailwind configs
├── apps/
│   ├── api/        # Workflow execution server (Hono) - all workflows run here
│   └── frontend/   # Management UI only (Vite + React) - NO local execution
└── server/         # Legacy CRM API (Real Estate features)
```

### Package-Specific Documentation

Each major package has its own CLAUDE.md with detailed guidance:

| Package | Documentation | Focus |
|---------|---------------|-------|
| API Server | [`/apps/api/CLAUDE.md`](./apps/api/CLAUDE.md) | Hono routes, workflow execution, database |
| Frontend | [`/apps/frontend/CLAUDE.md`](./apps/frontend/CLAUDE.md) | React UI, Vite config, components |
| Engine | [`/packages/engine/CLAUDE.md`](./packages/engine/CLAUDE.md) | Orchestration, parser, state management |
| Nodes | [`/packages/nodes/CLAUDE.md`](./packages/nodes/CLAUDE.md) | Node implementations, testing patterns |

### Import Patterns
```typescript
// Engine (orchestration)
import { ExecutionEngine, StateManager, NodeRegistry, HookManager } from '@workscript/engine';

// Nodes (all consolidated)
import { ALL_NODES, MathNode, FilterNode, DatabaseNode } from '@workscript/nodes';
```

## Essential Commands

```bash
# Development
bun run dev              # Start all services with hot reload
bun run dev:engine       # Engine watch mode
bun run dev:nodes        # Nodes watch mode
bun run dev:api          # API server
bun run dev:frontend     # Vite dev server

# Build & Test
bun run build            # Build all (engine → nodes → api → frontend)
bun run test             # Run all tests
bun run typecheck        # Type-check all packages

# Database (API)
cd apps/api && bun run db:push    # Push schema
cd apps/api && bun run db:studio  # Open Drizzle Studio
```

## Engine Components

| Component | Location | Purpose |
|-----------|----------|---------|
| ExecutionEngine | `/packages/engine/src/engine/` | Workflow orchestration with lifecycle hooks |
| WorkflowParser | `/packages/engine/src/parser/` | JSON → AST parsing + validation |
| StateManager | `/packages/engine/src/state/` | Snapshots, watchers, change detection |
| StateResolver | `/packages/engine/src/state/` | `$.key` syntax resolution |
| NodeRegistry | `/packages/engine/src/registry/` | Node registration (server-only) |
| HookManager | `/packages/engine/src/hooks/` | Lifecycle event system |

## Workflow JSON Syntax

**CRITICAL: Read `/WORKFLOW_CREATION_BLUEPRINT.md` for complete workflow syntax reference.**

### Fundamental Rules

1. **Pre-registered nodes only** - All nodes must exist in `@workscript/nodes`
2. **Inline configuration** - Edge targets contain the next node's config INLINE, not string references

### Basic Structure
```json
{
  "id": "workflow-id",
  "name": "Workflow Name",
  "version": "1.0.0",
  "initialState": { "key": "value" },
  "workflow": [ ... ]
}
```

### State Syntax
```
$.key              → state.key
$.nested.path      → state.nested.path
{ "$.path": val }  → Set state.path = val
```

### Edge Syntax
```
{ ... }    → Execute inline node
[ ... ]    → Execute sequence of inline nodes
null       → End execution / exit loop
```

### Loop Syntax
```json
{ "nodeType...": { "continue?": [...], "exit?": null } }
```

## Workflow Examples (Correct Patterns)

### Data Processing Pipeline
```json
{
  "id": "data-pipeline",
  "name": "Data Processing Pipeline",
  "version": "1.0.0",
  "initialState": {
    "data": [
      { "id": 1, "name": "Alice", "status": "active", "score": 85 },
      { "id": 2, "name": "Bob", "status": "deleted", "score": 92 }
    ]
  },
  "workflow": [
    {
      "filter": {
        "items": "$.data",
        "conditions": [
          { "field": "status", "dataType": "string", "operation": "equals", "value": "active" }
        ],
        "passed?": {
          "sort": {
            "type": "simple",
            "fieldsToSortBy": [
              { "fieldName": "score", "order": "descending" }
            ],
            "success?": {
              "log": {
                "message": "Processed $.filterStats.passedCount items"
              }
            }
          }
        },
        "filtered?": {
          "log": { "message": "No active records found" }
        }
      }
    }
  ]
}
```

### Conditional Branching
```json
{
  "id": "role-check",
  "name": "Role-Based Processing",
  "version": "1.0.0",
  "initialState": {
    "user": { "name": "Alice", "role": "admin" }
  },
  "workflow": [
    {
      "logic": {
        "operation": "equal",
        "values": ["$.user.role", "admin"],
        "true?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "permissions", "value": "all", "type": "string" }
            ],
            "success?": {
              "log": { "message": "Admin $.user.name granted full access" }
            }
          }
        },
        "false?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "permissions", "value": "limited", "type": "string" }
            ],
            "success?": {
              "log": { "message": "User $.user.name granted limited access" }
            }
          }
        }
      }
    }
  ]
}
```

### Loop Pattern
```json
{
  "id": "loop-example",
  "name": "Process Items Loop",
  "version": "1.0.0",
  "initialState": {
    "items": ["a", "b", "c"],
    "index": 0
  },
  "workflow": [
    {
      "logic...": {
        "operation": "less",
        "values": ["$.index", 3],
        "true?": [
          { "log": { "message": "Processing item $.index" } },
          { "$.index": "$.index + 1" }
        ],
        "false?": null
      }
    },
    {
      "log": { "message": "Loop complete. Processed $.index items." }
    }
  ]
}
```

### Database Operations
```json
{
  "id": "db-workflow",
  "name": "Database Workflow",
  "version": "1.0.0",
  "initialState": { "userId": "123" },
  "workflow": [
    {
      "database": {
        "operation": "find",
        "table": "users",
        "query": { "id": "$.userId" },
        "found?": {
          "validateData": {
            "validationType": "required_fields",
            "requiredFields": ["email", "name"],
            "valid?": {
              "log": { "message": "User $.dbRecord.name is valid" }
            },
            "invalid?": {
              "log": { "message": "User data incomplete: $.validationErrors" }
            }
          }
        },
        "not_found?": {
          "log": { "message": "User $.userId not found" }
        }
      }
    }
  ]
}
```

## Registered Node Types

**Core:** `math`, `logic`, `transform`, `log`, `empty`

**Data:** `filter`, `sort`, `aggregate`, `switch`, `splitOut`, `limit`, `editFields`, `summarize`, `transformObject`, `jsonExtract`, `removeDuplicates`, `validateData`, `compareDatasets`, `dateTime`, `stringOperations`, `mathOperations`, `arrayUtilities`, `objectUtilities`, `extractText`, `calculateField`

**AI/Orchestration:** `ask-ai`, `runWorkflow`

**Server:** `filesystem`, `database`, `auth`

## Node Development

### Adding a New Node

1. Create in `/packages/nodes/src/` (or `data/`, `custom/` subdirectory)
2. Export in `/packages/nodes/src/index.ts`:
```typescript
import MyNode from './MyNode';
export const ALL_NODES = [...existingNodes, MyNode];
export { MyNode };
```
3. Rebuild: `bun run build:nodes`

### Node Pattern
```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class MyNode extends WorkflowNode {
  metadata = {
    id: 'my-node',
    name: 'My Node',
    version: '1.0.0',
    description: 'Description',
    inputs: ['param1', 'param2'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'What this node does',
      when_to_use: 'When to use it',
      expected_edges: ['success', 'error'],
      post_to_state: ['myResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { param1 } = config || {};

    if (!param1) {
      return { error: () => ({ error: 'Missing param1' }) };
    }

    context.state.myResult = param1;
    return { success: () => ({ result: param1 }) };
  }
}
```

## Development Guidelines

### Architecture Rules
- **Engine** (`/packages/engine/`) - Pure orchestration, no nodes
- **Nodes** (`/packages/nodes/`) - ALL nodes here (core, data, custom)
- **Server-only execution** - All workflows via API, no client-side

### Code Quality
- TypeScript strict mode required
- Error handling with edge returns (not exceptions)
- Tests alongside implementations
- AI hints in node metadata

### File Locations
- Core nodes → `/packages/nodes/src/`
- Data nodes → `/packages/nodes/src/data/`
- Custom integrations → `/packages/nodes/src/custom/`
- Engine features → `/packages/engine/src/`

## Lifecycle Hooks

```typescript
hookManager.register('workflow:before-start', { name: 'hook', handler: async (ctx) => {} });
hookManager.register('workflow:after-end', { name: 'hook', handler: async (ctx) => {} });
hookManager.register('node:before-execute', { name: 'hook', handler: async (ctx) => {} });
hookManager.register('node:after-execute', { name: 'hook', handler: async (ctx) => {} });
hookManager.register('state:change', { name: 'hook', handler: async (ctx) => {} });
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | Bun 1.x |
| Language | TypeScript 5.8.x |
| Server | Hono 4.7.x |
| Client | React 19.1.x + Vite 6.3.x |
| Database | MySQL + Drizzle 0.37.x |
| Validation | Ajv 8.17.x |
| Testing | Vitest 3.2.x |
| Styling | Tailwind CSS 4.1.x |

---

**Version:** 4.0.0 | **Updated:** 2025-12-01 | **Status:** Production Ready
