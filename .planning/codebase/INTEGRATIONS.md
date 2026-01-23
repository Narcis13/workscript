# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**OpenRouter AI:**
- Service: OpenRouter.ai - Unified API for 300+ AI models (OpenAI, Anthropic, Google, Meta, Mistral, etc.)
- What it's used for: AI completions via AskAINode workflow nodes
- SDK/Client: Custom `OpenRouterClient` in `apps/api/src/shared-services/ask-ai/`
- Auth: `OPENROUTER_API_KEY` environment variable (format: `sk-or-v1-*`)
- Request timeout: `AI_REQUEST_TIMEOUT` (default: 30000ms)
- Model sync: `AI_MODEL_SYNC_INTERVAL` (default: 86400s = 24 hours)
- Attribution: `OPENROUTER_SITE_URL` and `OPENROUTER_SITE_NAME` headers

**Google APIs:**
- Service: Google Cloud APIs (Gmail, Calendar, Drive, Profile)
- What it's used for: OAuth 2.0 authentication and Gmail/Calendar integrations
- SDK/Client: `googleapis` package v166.0.0, custom provider at `apps/api/src/shared-services/integrations/providers/google/`
- Auth: OAuth 2.0 with PKCE
  - `GOOGLE_CLIENT_ID` - Google Console credentials
  - `GOOGLE_CLIENT_SECRET` - Google Console credentials
  - `GOOGLE_REDIRECT_URI` - Callback URL (default: `http://localhost:3013/api/auth/google/callback`)
- Scopes available:
  - Gmail: `GMAIL_READONLY`, `GMAIL_SEND`, `GMAIL_COMPOSE`, `GMAIL_MODIFY`
  - Calendar: `CALENDAR_READONLY`, `CALENDAR`
  - Drive: `DRIVE`, `DRIVE_FILE`
  - Profile: `USERINFO_EMAIL`, `USERINFO_PROFILE`, `OPENID`

## Data Storage

**Databases:**
- **MySQL 5.7+** - Primary relational database
  - Connection: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - Default credentials in development: `localhost:3306`, user `root`, password configured
  - Client: `mysql2` 3.11.5 with connection pooling
  - ORM: `drizzle-orm` 0.37.0 (type-safe, schema-first)
  - Schemas location: `apps/api/src/db/schema/` and `apps/api/src/plugins/workscript/schema/`
  - Tables: `users`, `sessions`, `api_keys`, `automations`, `integrations`, `workflows`, `resources`, `ai_usage`

**Caching & Sessions:**
- **Redis** (optional) - Distributed session storage
  - Connection: `REDIS_URL` environment variable (format: `redis://host:port`)
  - Client: `ioredis` 5.8.2
  - Purpose: Session persistence across server restarts, distributed deployment
  - Fallback: In-memory session storage if Redis not configured
  - Session expiry: `SESSION_EXPIRY` (default: 86400s = 24 hours)

**File Storage:**
- Local filesystem only - No cloud storage integration detected
- File handling: `filesystem` workflow node for server-side operations
- Upload handling: `react-dropzone` for frontend file drops

## Authentication & Identity

**Auth Provider:**
- Hybrid: Custom JWT-based auth with Google OAuth 2.0 integration
- Implementation approach:
  - Email/password auth: `AuthManager` in `apps/api/src/shared-services/auth/`
  - JWT tokens: Access token (15 min expiry) + Refresh token (7 day expiry)
  - OAuth 2.0: Google provider via googleapis library + custom `IntegrationManager`
  - Session management: `SessionManager` with optional Redis backend
  - API key auth: `APIKeyManager` for programmatic access

**Security:**
- JWT secrets:
  - `JWT_SECRET` - Access token signing (32+ chars required)
  - `JWT_REFRESH_SECRET` - Refresh token signing (different secret required)
  - Token expiry: `JWT_ACCESS_EXPIRY` (900s = 15 min), `JWT_REFRESH_EXPIRY` (604800s = 7 days)
- Password hashing:
  - Algorithm: bcryptjs with configurable rounds
  - `BCRYPT_ROUNDS` (default: 10 for dev, 12+ recommended for production)
- Account security:
  - Max failed login attempts: `MAX_LOGIN_ATTEMPTS` (default: 5)
  - Lockout duration: `LOCKOUT_DURATION` (default: 900s = 15 min)
- Password reset:
  - Token expiry: `PASSWORD_RESET_EXPIRY` (default: 1800s = 30 min)
  - Token length: `PASSWORD_RESET_TOKEN_LENGTH` (64 chars = 256 bits)
- API key management:
  - Rate limit: `API_KEY_RATE_LIMIT` (default: 1000 requests/hour)
  - Expiry: `API_KEY_EXPIRY` (default: 2592000s = 30 days, 0 = never)

**Email Service:**
- Currently: Mock implementation (logs to console)
- Configured but disabled: SMTP email (Gmail supported)
- Configuration keys (commented out in .env.example):
  - `SMTP_HOST` - SMTP server
  - `SMTP_PORT` - SMTP port (587 for TLS)
  - `SMTP_SECURE` - Use TLS
  - `SMTP_USER` - SMTP username
  - `SMTP_PASS` - SMTP password (Gmail: App Password, not regular password)
  - `EMAIL_FROM` - From address

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service (Sentry, etc.) integrated
- Error handling: Node-level edge-based system, custom error objects

**Logs:**
- Hono built-in logger: `logger` middleware at `apps/api/src/index.ts`
- Logs all HTTP requests
- Mock email service logs to console
- WebSocket events broadcast to clients via `BunWebSocketManager`
- No centralized log aggregation (ELK, Datadog, etc.) detected

**AI Usage Tracking:**
- `UsageTracker` in `apps/api/src/shared-services/ask-ai/`
- Tracks OpenRouter API calls and token usage
- Stores usage stats in `ai_usage` database table

## CI/CD & Deployment

**Hosting:**
- Bun-based deployment (Vercel, Railway, AWS, Docker support)
- Server port: `PORT` (default: 3013)
- Deployment instructions in `.env.example` for: Vercel, Railway, AWS, Docker

**CI Pipeline:**
- Not detected - No GitHub Actions, Jenkins, or other CI system in codebase
- Manual deployment or external CI system

**Build Process:**
- Bun native bundler for API: `bun build src/index.ts --outdir dist --target bun`
- Vite bundler for frontend: `vite build`
- TypeScript compilation: `tsc` for packages
- Post-install: `postinstall` script auto-builds engine package

## Environment Configuration

**Required env vars - Database:**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**Required env vars - Authentication:**
- `JWT_SECRET` (32+ chars)
- `JWT_REFRESH_SECRET` (32+ chars, different from JWT_SECRET)
- `SESSION_SECRET` (32+ chars)

**Required env vars - Google OAuth:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (callback URL)

**Required env vars - AI:**
- `OPENROUTER_API_KEY` (starts with `sk-or-v1-`)

**Optional env vars:**
- `REDIS_URL` - Redis connection for distributed sessions
- `PORT` - Server port (default: 3013)
- `NODE_ENV` - Environment mode (development, production, test)
- `CLIENT_URL` - Frontend origin for CORS (default: `http://localhost:5173`)
- `API_BASE_URL` - API URL for internal calls (default: `http://localhost:3013`)
- `SESSION_EXPIRY` - Session duration in seconds (default: 86400)
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 10)
- `OPENROUTER_SITE_URL` - Attribution URL for OpenRouter
- `OPENROUTER_SITE_NAME` - Attribution name for OpenRouter (default: "Workscript")
- `AI_REQUEST_TIMEOUT` - OpenRouter request timeout (default: 30000ms)
- `AI_MODEL_SYNC_INTERVAL` - Model cache refresh (default: 86400s)

**Secrets location:**
- Development: `.env` file (NOT committed, in .gitignore)
- Production: Platform-specific secrets management:
  - Vercel: Settings → Environment Variables
  - Railway: Settings → Variables
  - AWS: Secrets Manager or CloudFormation Parameters
  - Docker: `--env-file` flag or docker-compose environment

## Webhooks & Callbacks

**Incoming:**
- `POST /workscript/automations/:id/execute` - Manual automation trigger endpoint
- Webhook support framework in place but not fully documented
- OAuth callback: `GET /api/auth/google/callback` - Google OAuth redirect

**Outgoing:**
- None detected - Workflows may emit events via WebSocket but no outgoing webhooks
- Google API calls for Gmail/Calendar operations (via workflow nodes)

## Real-Time Communication

**WebSocket:**
- Native Bun WebSocket support at `ws://localhost:3013/ws`
- Manager: `BunWebSocketManager` singleton in `apps/api/src/shared-services/websocket/`
- Features: Client subscriptions, channel-based broadcasting, custom message handlers
- Used for: Real-time workflow event streaming, execution monitoring
- Events: `workflow:completed`, `workflow:started`, `node:executed`, etc.

## Automation & Scheduling

**Cron Scheduling:**
- Library: `croner` 9.0.0
- Manager: `CronScheduler` in `apps/api/src/shared-services/scheduler/`
- Use case: Automation jobs that run on schedule
- Features: Multi-plugin support, timezone support, execution locking, next-run tracking
- Trigger types: `cron`, `webhook`, `manual`
- Interface: Plugins register execution callbacks with pluginId isolation

## Database Backup & Migration

**Migrations:**
- Tool: Drizzle Kit (version in devDependencies)
- Commands:
  - `bun run db:generate` - Generate migrations from schema changes
  - `bun run db:migrate` - Run pending migrations
  - `bun run db:push` - Push schema directly (development mode, no migration files)
  - `bun run db:studio` - Open Drizzle Studio GUI for schema inspection

## Dependency Management

**Package Manager:**
- Bun with monorepo workspaces
- Lockfile: `bun.lockb`
- Workspace packages auto-linked
- peer dependencies: TypeScript 5.7.3+

## Plugin System

**Architecture:**
- Plugin interface: `SaaSPlugin` at `apps/api/src/core/plugins/types.ts`
- Auto-discovery: Plugins in `apps/api/src/plugins/{plugin-name}/plugin.ts`
- Features: Plugin routes, schema extension, lifecycle hooks, AI manifest

**Current Plugins:**
- Workscript (core): Workflow execution, automations, resources at `/workscript/*` routes
- Plugin loader auto-discovers and mounts at startup

---

*Integration audit: 2026-01-23*
