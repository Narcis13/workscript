# Apps Architecture Manual (Plan)

## Scope
- Analyze and document `/apps` focusing on `api` and `frontend` (active code)
- Summarize placeholders: `client`, `docs`, `mobile/expo`
- Provide deep architectural understanding, startup flow, routing, auth, plugins, data flow, configs, and extension points

## Deliverables
- Create `apps/ARCHITECTURE.md` with a comprehensive manual
- Include file references using `file_path:line_number` for key functions
- Provide clear instructions to run, extend, and troubleshoot

## Document Structure
1. Introduction and Monorepo Overview
2. Backend API (Bun + Hono + Drizzle)
   - Purpose and responsibilities
   - Startup flow (`startServer` at `apps/api/src/index.ts:103`), health/root routes (`69–93`)
   - Routing map: `auth.ts`, `apikeys.ts`, `password-reset.ts`; plugin-mounted routes
   - Authentication architecture: JWT (`apps/api/src/shared-services/auth/JWTManager.ts:139–147`), sessions (`SessionManager.ts:89`), API keys (`APIKeyManager.ts:230`)
   - Plugin system: loader (`apps/api/src/core/plugins/loader.ts:57,64,116,220–231`), registry (`registry.ts:37,166,235`)
   - Database config and migrations: `drizzle.config.ts:12–17`, `src/db/index.ts:14–18`
   - Environment configuration: server (`PORT`), CORS (`CLIENT_URL`, `NODE_ENV`), email (`EMAIL_FROM`), auth limits
   - Error handling & logging conventions
   - Build scripts and operational commands
3. Frontend SPA (React + Vite + React Router v7 + TanStack Query)
   - Bootstrapping: `apps/frontend/src/main.tsx:1–17`, providers in `App.tsx`
   - Routing map and guards: `apps/frontend/src/routes.tsx:122–273`
   - Data fetching and HTTP client: Axios setup (`client.ts:49–56`), interceptors (`client.ts:191`, `226–298`), token refresh (`139–182`)
   - Environment configuration: `API_URL` (`apps/frontend/src/lib/config.ts:10`)
   - UI components, contexts, hooks overview
4. Inter-App Data Flow
   - Login, refresh, logout flows (step-by-step with endpoints)
   - Password reset and email verification flows
   - Example sequences from frontend → API → DB
5. Security Considerations
   - Password hashing rounds, lockout, rate limiting, JWT secrets and expiries, CORS
6. Extension Points
   - Adding API routes, creating plugins, adding frontend pages/components
7. Setup & Run
   - Required `.env` variables, how to start `api` and `frontend`, common pitfalls
8. Reference Index
   - Full list of key functions with `file_path:line_number`

## Key Findings to Incorporate
- Active apps: `api` and `frontend`; others are placeholders
- API: Bun/Hono server, plugin architecture, Drizzle ORM, comprehensive auth
- Frontend: React SPA, protected routing, Axios with token lifecycle, env-based API URL

## Implementation Steps
1. Draft `apps/ARCHITECTURE.md` using the structure above with detailed explanations and verified references
2. Include routing tables and flow descriptions (textual diagrams)
3. Add run instructions and environment variable guidance
4. Cross-link references to critical files using `file_path:line_number`
5. Verify all references by re-reading files to ensure accuracy

## Verification
- Lint the document for broken references and consistency
- Optional: run `api` and `frontend` locally to validate env and routes described (after confirmation)

If you approve, I will generate `apps/ARCHITECTURE.md` with the outlined content and deliver the full manual.