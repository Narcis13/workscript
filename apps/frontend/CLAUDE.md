# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **Workscript Frontend Application** - a React SPA for managing workflows in a workflow orchestration system. This is a **management UI only** - all workflow execution happens server-side via the API at `/apps/api`.

**Stack:** Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui

## Commands

```bash
# Development (from this directory)
bun run dev          # Start dev server at http://localhost:5173
bun run build        # Type-check with tsc -b, then build with Vite
bun run lint         # Run ESLint
bun run preview      # Preview production build

# From monorepo root
bun run dev:frontend # Start frontend only
bun run dev          # Start all services (engine, nodes, api, frontend)
```

## Architecture

### Key Files
- `src/routes.tsx` - Central routing with React Router v7 (`createBrowserRouter`)
- `src/App.tsx` - Root component: ErrorBoundary → TooltipProvider → AuthProvider → RouterProvider
- `src/contexts/AuthContext.tsx` - Global authentication state
- `src/services/AuthService.ts` - Singleton for API auth communication with token management

### Directory Structure
```
src/
├── components/
│   ├── auth/          # LoginForm, RegisterForm, ChangePasswordForm
│   ├── automations/   # Automation CRUD components, CronBuilder
│   ├── dashboard/     # Dashboard widgets (StatCard, RecentExecutions)
│   ├── executions/    # ExecutionDetails, Timeline, StateViewer
│   ├── guards/        # ProtectedRoute, RouteErrorBoundary
│   ├── integrations/  # OAuth connection management
│   ├── layout/        # AppLayout, Header, Sidebar, Breadcrumbs
│   ├── monitoring/    # RealtimeMonitor, WebSocketStatus, EventLog
│   ├── nodes/         # Node browser and detail views
│   ├── shared/        # DataTable, EmptyState, LoadingSpinner, PageHeader
│   ├── ui/            # shadcn/ui components (button, input, card, etc.)
│   └── workflows/     # Workflow editor components
├── contexts/          # AuthContext
├── hooks/
│   ├── api/           # useWorkflows, useAutomations, useExecutions, etc.
│   ├── useAuth.ts     # Hook for AuthContext
│   └── useWebSocket.ts
├── pages/             # Route page components
├── services/
│   ├── api/           # API clients (client.ts, workflows.api.ts, etc.)
│   └── websocket/     # WebSocket client for real-time events
├── types/             # TypeScript types for auth, workflows, executions, etc.
└── routes.tsx         # All route definitions
```

### Route Structure (Protected with ProtectedRoute)
- `/dashboard` - Main dashboard
- `/workflows`, `/workflows/new`, `/workflows/:id`, `/workflows/:id/edit`
- `/automations`, `/automations/new`, `/automations/:id`, `/automations/:id/edit`
- `/executions`, `/executions/:executionId`
- `/nodes`, `/nodes/:nodeId`
- `/monitoring` - Real-time workflow monitoring
- `/integrations` - OAuth integrations

### Authentication Flow
1. AuthService handles login/register/logout with JWT tokens
2. Tokens stored in localStorage (`accessToken`, `refreshToken`, `tokenExpiry`)
3. Axios interceptor auto-refreshes expired tokens
4. ProtectedRoute guard checks auth state before rendering

### Path Aliases
- `@/*` → `./src/*` (configured in tsconfig.json and vite.config.ts)
- `@engine` → `../../packages/engine/src`
- `@workscript/engine` → `../../packages/engine/dist/src/index.js`

## Environment Variables

Copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:3013
```

All env vars must be prefixed with `VITE_` to be accessible via `import.meta.env`.

## Component Patterns

### Adding shadcn/ui Components
```bash
bunx shadcn@latest add [component-name]
```

### Using Auth in Components
```tsx
import { useAuth } from '@/hooks/useAuth';

const { user, isAuthenticated, login, logout } = useAuth();
```

### Making API Calls
Use the hooks in `src/hooks/api/`:
```tsx
import { useWorkflows, useCreateWorkflow } from '@/hooks/api/useWorkflows';

const { data: workflows, isLoading } = useWorkflows();
const createMutation = useCreateWorkflow();
```

## Monorepo Context

Part of the Workscript monorepo. Dependencies:
- `@workscript/engine` - Core workflow engine types (imported for type definitions)

The frontend does NOT execute workflows locally. All execution is via API calls to `/apps/api`.
