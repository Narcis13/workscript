# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- TypeScript 5.8.x - All source code in monorepo
- JavaScript (JSX/TSX) - React components and build output

**Secondary:**
- SQL - MySQL database queries via Drizzle ORM

## Runtime

**Environment:**
- Bun 1.x - JavaScript/TypeScript runtime and package manager
- Node.js compatible - All code runs on Bun's Node.js-compatible API

**Package Manager:**
- Bun - Uses `bun install` and `bun run` commands
- Lockfile: `bun.lockb` (binary lockfile format)

## Frameworks

**Core Orchestration:**
- `@workscript/engine` 1.0.0 (custom) - Pure workflow orchestration layer with parsing, execution, and state management

**Server:**
- Hono 4.7.9 - Web framework for REST API and WebSocket server
- Drizzle ORM 0.37.0 - Type-safe database library for MySQL
- mysql2 3.11.5 - MySQL database client and connection pooling

**Client/UI:**
- React 19.1.1 - UI component library
- Vite 7.1.7 (frontend), 6.3.x (build config) - Module bundler and dev server
- Tailwind CSS 4.1.17 - Utility-first CSS framework
- shadcn/ui - Pre-built Radix UI component library

**Routing:**
- React Router DOM 7.9.6 - Client-side routing

**Forms & Validation:**
- React Hook Form 7.66.1 - Form state management
- Zod 4.1.12 - TypeScript-first schema validation
- Ajv 8.17.1 - JSON Schema validator (engine layer)

## Key Dependencies

**Critical:**
- `@workscript/engine` - Workflow orchestration (in-house)
- `@workscript/nodes` - All 35+ workflow nodes (in-house)
- `hono` 4.7.9 - HTTP framework
- `drizzle-orm` 0.37.0 - Database ORM
- `croner` 9.0.0 - Cron scheduling for automations

**Infrastructure:**
- `ioredis` 5.8.2 - Redis client for optional distributed sessions
- `googleapis` 166.0.0 - Google OAuth and Gmail API
- `bcryptjs` 3.0.3 - Password hashing
- `ws` 8.18.3 - WebSocket library
- `@paralleldrive/cuid2` 2.2.2 - Unique ID generation

**UI Components:**
- `@radix-ui/*` - Unstyled, accessible UI primitives
- `lucide-react` 0.554.0 - Icon library
- `recharts` 3.4.1 - React charting library
- `monaco-editor` 0.54.0 - Code editor (workflow JSON)
- `react-dropzone` 14.3.8 - File drop component
- `react-markdown` 10.1.0 - Markdown rendering
- `sonner` 2.0.7 - Toast notifications
- `date-fns` 4.1.0 - Date manipulation
- `react-day-picker` 9.11.1 - Calendar component

**Data Management:**
- `@tanstack/react-query` 5.90.10 - Server state management
- `zustand` 5.0.8 - Client state management
- `axios` 1.13.2 - HTTP client

**Utilities:**
- `class-variance-authority` 0.7.1 - CSS class composition
- `clsx` 2.1.1 - Conditional className builder
- `tailwind-merge` 3.3.1 - Merge Tailwind classes
- `dompurify` 3.3.0 - HTML sanitization
- `glob` 11.0.3 - File pattern matching (engine)

## Build & Development

**TypeScript:**
- Version: 5.8.3
- Strict mode: enabled
- Target: ESNext (native ES2020+)

**Testing:**
- Vitest 3.2.4 - Test runner compatible with Jest API
- Bun test - Native test support via `bun test`

**Code Quality:**
- ESLint 9.36.0 - JavaScript/TypeScript linting
- Prettier - Code formatter (configured in project)
- TypeScript strict mode - Full type safety

**Development Tools:**
- @vitejs/plugin-react 5.0.4 - React Fast Refresh for Vite
- @tailwindcss/vite 4.1.17 - Tailwind CSS Vite plugin
- concurrently 9.1.2 - Run multiple scripts in parallel

## Configuration

**Environment:**
- Copy `.env.example` to `.env` for configuration
- Environment-specific variables:
  - **API Server** (`apps/api/.env`): Database, JWT, OAuth, Redis, AI model config
  - **Frontend** (`apps/frontend/.env`): `VITE_API_URL` only

**Build:**
- `packages/*/tsconfig.json` - TypeScript per-package configs
- `apps/frontend/vite.config.ts` - Vite build configuration with:
  - React plugin for JSX
  - Tailwind CSS Vite plugin
  - Path aliases (`@/*` → `./src/*`)
  - Monaco editor optimization
- Bun native build for API server via `bun build src/index.ts --target bun`

**Database:**
- Drizzle ORM config: `drizzle.config.ts` (generated)
- Schemas in `apps/api/src/db/schema/` and `apps/api/src/plugins/workscript/schema/`
- MySQL connection pooling via `mysql2/promise`

## Platform Requirements

**Development:**
- Bun 1.x runtime
- Node.js 18+ (Bun compatible)
- MySQL 5.7+ (local or remote)
- Redis (optional, for distributed sessions)

**Production:**
- Bun 1.x runtime
- MySQL 5.7+ database
- Redis (recommended for production sessions)
- Environment: macOS, Linux, Windows (via WSL)

## Monorepo Structure

**Packages:**
- `packages/engine` - Core workflow orchestration (no nodes)
- `packages/nodes` - All 35+ workflow node implementations
- `packages/config` - Shared ESLint, TypeScript, Tailwind configs
- `packages/ui` - Shared React components (not yet actively used)

**Apps:**
- `apps/api` - Hono REST API with plugin system
- `apps/frontend` - Vite + React management UI
- `server/` - Legacy CRM API (Real Estate features)

**Workspaces:** Configured in root `package.json` with `workspaces` field

## TypeScript Configuration Hierarchy

```
Root tsconfig.json
├── baseUrl: "./", paths for @server/*, @workscript/engine
├── strict: true, strict module syntax
└── Extends to all package-specific configs
    ├── packages/engine/tsconfig.json (ESNext, declaration: true)
    ├── packages/nodes/tsconfig.json (ESNext, excludes tests)
    ├── apps/api/tsconfig.json (ESNext, server target)
    └── apps/frontend/tsconfig.json (ESNext, React JSX)
```

## Version Pinning

- `bun-types: latest` - Always latest Bun types
- Most dependencies: caret ranges (^) for minor updates
- Critical libraries pinned to specific versions:
  - Hono: 4.7.9
  - React: 19.1.1
  - Drizzle ORM: 0.37.0
  - Vite: 7.1.7

---

*Stack analysis: 2026-01-23*
