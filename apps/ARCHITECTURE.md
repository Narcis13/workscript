# Workscript Apps Architecture Manual

## Table of Contents
- Monorepo Overview
- Backend API (Bun + Hono + Drizzle)
- Frontend SPA (React + Vite + Router + TanStack Query)
- Inter-App Flows
- Security Considerations
- Extension Points
- Setup & Run
- Reference Index

## Monorepo Overview
- Location: `./apps`
- Active apps: `api`, `frontend`
- Placeholders: `client`, `docs`, `mobile/expo`
- Shared libs: API `src/shared-services/*`; Frontend `src/lib`, `services`, `hooks`, `contexts`, `components`

## Backend API (Bun + Hono + Drizzle)
- Purpose: Modular workflow orchestration API with plugin architecture and comprehensive authentication.
- Tech stack: `Bun`, `Hono` for routing, `Drizzle ORM` for MySQL, plugin system.
- Entry point: `apps/api/src/index.ts`
- Startup flow:
  - Initialize `Hono` app, set CORS and logger
  - Mount built-in routes: `/health`, `/`, `/auth/*`, `/api/keys/*`, `/password-reset/*`
  - Initialize plugin loader, discover and register plugins
  - Expose plugin endpoints and health checks
  - Configure `notFound` and `onError` handlers
  - Start `Bun.serve` with retry and graceful shutdown
- Routing:
  - Auth: `apps/api/src/routes/auth.ts`
  - API keys: `apps/api/src/routes/apikeys.ts`
  - Password reset: `apps/api/src/routes/password-reset.ts`
  - Plugin endpoints: `/api/plugins`, `/api/health/plugins`
- Authentication:
  - JWT access/refresh management in `apps/api/src/shared-services/auth/JWTManager.ts`
  - Session management via `apps/api/src/shared-services/auth/SessionManager.ts`
  - Account management in `apps/api/src/shared-services/auth/AuthManager.ts`
  - API keys in `apps/api/src/shared-services/auth/APIKeyManager.ts`
- Plugin system:
  - Loader singleton mounts plugin routes: `apps/api/src/core/plugins/loader.ts`
  - Registry tracks metadata, health, stats: `apps/api/src/core/plugins/registry.ts`
  - Plugins discovered from `apps/api/src/plugins/*` with `plugin.ts` manifests
- Database:
  - Drizzle config: `apps/api/drizzle.config.ts` with schema paths and env-based credentials
  - MySQL credentials: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Environment:
  - Server port: `PORT`
  - CORS: `CLIENT_URL`, `NODE_ENV`
  - JWT: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
  - Sessions: `SESSION_EXPIRY`
  - Email: `EMAIL_FROM`
- Error handling:
  - Global `app.onError` for structured JSON errors
  - `app.notFound` for consistent 404 responses
- Scripts:
  - `bun --watch src/index.ts` for development
  - `bun src/index.ts` start
  - `bun build` to `dist`
  - `db:generate`, `db:migrate`, `db:push`, `db:studio` via Drizzle

## Frontend SPA (React + Vite + Router + TanStack Query)
- Purpose: Admin UI for workflows, nodes, automations, executions, monitoring.
- Tech stack: `React`, `Vite`, `React Router v7`, `@tanstack/react-query`, `Tailwind`.
- Bootstrapping:
  - `apps/frontend/src/main.tsx` mounts app with `QueryClientProvider` and Devtools
  - `apps/frontend/src/App.tsx` wraps `RouterProvider` in `ErrorBoundary`, `AuthProvider`, `Suspense`, `Toaster`
- Routing:
  - Central config in `apps/frontend/src/routes.tsx` with public and protected routes
  - Protected routes wrapped by `AppLayout` and `ProtectedRoute`
  - Lazy-loading for all pages (code splitting)
- HTTP client:
  - `apps/frontend/src/services/api/client.ts` defines Axios instance
  - Request interceptor injects `Authorization: Bearer <access>` for non-auth endpoints
  - Response interceptor handles `401` with automatic refresh and request retry
- Auth lifecycle:
  - Tokens stored in `localStorage` under `access_token`, `refresh_token`, `token_expiry_timestamp`
  - `POST /auth/refresh` used to rotate tokens, update storage and retry original request
- Environment:
  - `apps/frontend/src/lib/config.ts` exposes `API_URL` from `VITE_API_URL`, fallback `http://localhost:3013`
- Build config:
  - `apps/frontend/vite.config.ts` sets monorepo aliases and Tailwind/React plugins

## Inter-App Flows
- Login:
  - Frontend calls `POST /auth/login` with credentials
  - API verifies, returns user, access, refresh, expiry
  - Frontend stores tokens and expiry timestamp
- Access token usage:
  - Axios request interceptor adds `Authorization` header to secure calls
- Refresh:
  - On `401` or near expiry, frontend calls `POST /auth/refresh`
  - API verifies refresh, rotates tokens, returns new access (and optionally refresh)
  - Original request retries with new token
- Logout:
  - Frontend clears tokens and navigates to `/login`
  - API `POST /auth/logout` revokes refresh token and clears session cookie
- Password reset and email verification:
  - `POST /password-reset/*` endpoints for request/validate/complete
  - `GET /auth/verify-email/:token` and `POST /auth/resend-verification`

## Security Considerations
- CORS restricted to `CLIENT_URL` origins; dev localhost allowed
- JWT secrets validated for length in production; short expiry for access tokens
- Sessions cookie: `httpOnly`, `secure` in production, `sameSite=Strict`
- API keys never returned after creation; metadata only on list/read
- Rate limiting applied for verification resend; account lockout in login

## Extension Points
- API routes:
  - Add new Hono routers in `apps/api/src/routes/*` and mount via `app.route()`
- Plugins:
  - Create `apps/api/src/plugins/<plugin-id>/plugin.ts` with metadata, optional `routes` and `onLoad`
- Frontend pages:
  - Add React pages under `apps/frontend/src/pages/*` and register in `routes.tsx`

## Setup & Run
- Environment:
  - API `.env` requires DB and JWT settings; see `apps/api/drizzle.config.ts` and service configs
  - Frontend `.env` uses `VITE_API_URL`
- Run API:
  - `cd apps/api && bun --watch src/index.ts`
- Run Frontend:
  - `cd apps/frontend && npm run dev` (or `pnpm dev` depending on workspace)
- Build:
  - API: `bun build src/index.ts --outdir dist --target bun`
  - Frontend: `vite build`

## Reference Index
- `apps/api/src/index.ts:69–76` Health route
- `apps/api/src/index.ts:78–93` Root route
- `apps/api/src/index.ts:95–99` Route mounting
- `apps/api/src/index.ts:103` `startServer` entry
- `apps/api/src/index.ts:231` Port and server start
- `apps/api/src/core/plugins/loader.ts:57` `PluginLoader.setApp`
- `apps/api/src/core/plugins/loader.ts:64` `PluginLoader.loadPlugins`
- `apps/api/src/core/plugins/loader.ts:116` `loadPlugin`
- `apps/api/src/core/plugins/loader.ts:220–231` Route mounting
- `apps/api/src/core/plugins/registry.ts:37` `registerPlugin`
- `apps/api/src/core/plugins/registry.ts:166` `getAllPluginsMetadata`
- `apps/api/src/core/plugins/registry.ts:235–239` `checkAllPluginsHealth`
- `apps/api/drizzle.config.ts:12–17` DB credentials
- `apps/api/src/routes/auth.ts:76` POST `/auth/register`
- `apps/api/src/routes/auth.ts:184` POST `/auth/login`
- `apps/api/src/routes/auth.ts:312` POST `/auth/refresh`
- `apps/api/src/routes/auth.ts:395` POST `/auth/logout`
- `apps/api/src/routes/auth.ts:477` GET `/auth/me`
- `apps/api/src/routes/auth.ts:549` POST `/auth/change-password`
- `apps/api/src/routes/auth.ts:640` GET `/auth/verify-email/:token`
- `apps/api/src/routes/auth.ts:707` POST `/auth/resend-verification`
- `apps/api/src/routes/apikeys.ts:63` GET `/api/keys`
- `apps/api/src/routes/apikeys.ts:153` POST `/api/keys`
- `apps/api/src/routes/apikeys.ts:241` DELETE `/api/keys/:id`
- `apps/api/src/routes/apikeys.ts:331` PUT `/api/keys/:id`
- `apps/api/src/shared-services/auth/JWTManager.ts:139–147` JWT secrets and expiry
- `apps/frontend/src/main.tsx:1–17` App bootstrap
- `apps/frontend/src/App.tsx` Providers and error handling
- `apps/frontend/src/routes.tsx:122–273` Router configuration
- `apps/frontend/src/services/api/client.ts:49–56` Axios instance
- `apps/frontend/src/services/api/client.ts:191` Request interceptor
- `apps/frontend/src/services/api/client.ts:226–298` Response interceptor
- `apps/frontend/src/services/api/client.ts:139–182` Token refresh
- `apps/frontend/src/lib/config.ts:10` `API_URL` env mapping