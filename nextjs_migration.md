# Next.js 15.3+ Migration Plan for Client Package

## 📊 **Current State Analysis**

**Client Package (Vite + React 19):**
- ~47 TypeScript/React files
- React Router v7 with 4 routes: `/`, `/advanced`, `/websocket`, `/aizoca`
- Tailwind CSS v4 ✅ (already configured)
- shadcn/ui components ✅ (already in use)
- ClientWorkflowService singleton for workflow engine
- Client-specific workflow nodes (DOMNode, FetchNode, LocalStorageNode)
- WebSocket integration for real-time workflows

**Server Package (Hono):**
- Multiple API routes: `/workflows`, `/automations`, `/api/auth`, `/api/zoca/*`
- Drizzle ORM ✅ (already configured)
- WebSocket support via WebSocketManager
- Cron scheduler for automated workflows

**Shared Package:**
- Core workflow engine (ExecutionEngine, WorkflowParser, StateManager, NodeRegistry)
- Universal nodes accessible to both environments

---

## Phase 1: Initial Setup (Next.js in /next folder)

### 1. Initialize Next.js 15.3+ in /next folder
- Run `bunx create-next-app@latest next` with: App Router, TypeScript, Tailwind CSS, no src/ directory
- Configure as workspace in root package.json
- Set up Next.js to work with Bun runtime

### 2. Configure Monorepo Integration
- Update `/next/package.json` with workspace dependencies: `shared@workspace:*`
- Configure path aliases in `next.config.ts`: `@shared`, `@/`, `@/components`, `@/lib`, `@/services`
- Set up TypeScript project references to shared package
- Configure Tailwind to work with shared component paths

---

## Phase 2: Core Structure & Configuration

### 3. Create Next.js folder structure
```
/next
├── app/                          # App Router pages
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home (/)
│   ├── advanced/page.tsx         # Advanced workflow demo
│   ├── websocket/page.tsx        # WebSocket demo
│   ├── aizoca/                   # AI Zoca section
│   │   ├── layout.tsx            # Nested layout with sidebar
│   │   └── page.tsx              # Main AI Zoca page
│   └── api/                      # API routes (if needed for server actions)
├── components/                   # Migrated React components
│   ├── ui/                       # shadcn components
│   ├── workflow/                 # Workflow-related components
│   ├── contact-details/          # Contact detail components
│   └── workflow-ui/              # Workflow UI components
├── lib/                          # Utilities
│   ├── api-client.ts             # Hono API client wrapper
│   ├── workflow-client.ts        # Browser workflow service
│   └── utils.ts                  # General utilities
├── services/                     # Service layer
│   └── ClientWorkflowService.ts  # Migrated workflow service
├── nodes/                        # Client-specific workflow nodes
│   ├── DOMNode.ts
│   ├── FetchNode.ts
│   └── LocalStorageNode.ts
├── hooks/                        # React hooks
│   └── useWebSocket.ts           # WebSocket hook
└── public/                       # Static assets
```

### 4. Environment Configuration
- Create `.env.local` for Next.js environment variables
- Configure `NEXT_PUBLIC_HONO_API_URL` for backend API
- Configure `NEXT_PUBLIC_WS_URL` for WebSocket connections
- Set up environment types in `env.d.ts`

---

## Phase 3: Component & Service Migration

### 5. Migrate React components (preserve all functionality)
- Move all components from `/client/src/components` to `/next/components`
- Update imports to use Next.js path aliases (`@/components`, `@shared`)
- Convert client-side only components to use `'use client'` directive
- Preserve React 19 features (already compatible with Next.js 15)

### 6. Migrate ClientWorkflowService
- Move `/client/src/services/ClientWorkflowService.ts` to `/next/services/`
- Ensure singleton pattern works in Next.js environment
- Verify workflow engine initialization with shared package
- Test node registration (universal + client nodes)

### 7. Migrate client-specific workflow nodes
- Copy `/client/nodes/*` to `/next/nodes/`
- Create `/next/nodes/index.ts` export file
- Update imports to reference shared package types
- Ensure browser-specific APIs work in Next.js client components

### 8. Migrate hooks and utilities
- Copy `/client/src/hooks/*` to `/next/hooks/`
- Copy `/client/src/lib/*` to `/next/lib/`
- Update WebSocket hook for Next.js environment

---

## Phase 4: API & Backend Integration

### 9. Create Hono API client wrapper
- Build type-safe API client in `/next/lib/api-client.ts`
- Configure base URL from environment variables
- Add interceptors for error handling and auth (future: Clerk tokens)
- Create hooks for API calls: `useWorkflows()`, `useAutomations()`, etc.
- Support both REST and WebSocket connections

### 10. Setup API route proxies (if needed)
- Create Next.js API routes in `/next/app/api/*` if proxying is required
- Proxy requests to Hono server to handle CORS/auth (optional optimization)

---

## Phase 5: Routing Migration

### 11. Convert React Router routes to Next.js App Router
- `/` → `/next/app/page.tsx` (Home)
- `/advanced` → `/next/app/advanced/page.tsx`
- `/websocket` → `/next/app/websocket/page.tsx`
- `/aizoca` → `/next/app/aizoca/page.tsx`
- Create layouts as needed (root layout, nested layouts)

### 12. Preserve navigation patterns
- Replace `<Link>` from react-router-dom with Next.js `<Link>`
- Replace `useNavigate()` with Next.js `useRouter()`
- Update `<Router>` and `<Routes>` to Next.js layouts/pages

---

## Phase 6: Styling & UI

### 13. Configure Tailwind CSS v4
- Next.js already initialized with Tailwind
- Copy Tailwind config from `/client/tailwind.config.ts`
- Migrate custom CSS from `/client/src/index.css` to `/next/app/globals.css`
- Verify all tailwind-merge and class-variance-authority utilities work

### 14. Setup shadcn/ui
- Already have shadcn dependencies (lucide-react, @radix-ui/react-slot, etc.)
- Copy existing shadcn components from `/client/src/components/ui` to `/next/components/ui`
- Ensure components.json is configured correctly for Next.js
- Test all UI components render correctly

---

## Phase 7: Future Integrations Preparation

### 15. Prepare for Drizzle ORM + Supabase
- Install `drizzle-orm` and `@supabase/supabase-js` (mark as future dependencies)
- Create placeholder `/next/lib/db.ts` for Drizzle client
- Create placeholder `/next/lib/supabase.ts` for Supabase client
- Document schema migration strategy from server MySQL to Supabase Postgres

### 16. Prepare for Clerk Authentication
- Install `@clerk/nextjs` (mark as future dependency)
- Create placeholder middleware for Clerk auth
- Document integration points for protected routes
- Plan API client auth header injection

### 17. Prepare for Stripe Payments
- Install `@stripe/stripe-js` and `stripe` (mark as future dependency)
- Create placeholder `/next/lib/stripe.ts`
- Plan webhook handlers in `/next/app/api/webhooks/stripe/route.ts`
- Document checkout flow integration points

---

## Phase 8: Monorepo Integration

### 18. Update root package.json workspace scripts
```json
{
  "workspaces": [
    "./server",
    "./client",
    "./shared",
    "./next"
  ],
  "scripts": {
    "dev:next": "cd next && bun run dev",
    "dev": "concurrently \"bun run dev:shared\" \"bun run dev:server\" \"bun run dev:next\"",
    "build:next": "cd next && bun run build",
    "build": "bun run build:shared && bun run build:server && bun run build:next"
  }
}
```

### 19. Configure shared package exports for Next.js
- Ensure `/shared/package.json` exports are compatible with Next.js bundler
- Verify tree-shaking works correctly
- Test workflow engine imports in both server and client Next.js components

---

## Phase 9: Testing & Validation

### 20. Test workflow engine integration
- Verify ClientWorkflowService initializes correctly
- Test workflow execution with universal + client nodes
- Test WebSocket workflow triggering
- Validate state management across workflow runs

### 21. Test API communication with Hono server
- Test all workflow API endpoints
- Test automation endpoints
- Test Google auth integration
- Test all /api/zoca/* endpoints (agencies, agents, contacts, etc.)
- Verify WebSocket connection and real-time updates

### 22. Test all routes and navigation
- Verify all 4 routes render correctly
- Test client-side navigation
- Test page refresh and deep linking
- Verify layouts render properly

---

## Phase 10: Migration Completion

### 23. Documentation updates
- Update CLAUDE.md with Next.js architecture
- Document new folder structure
- Add Next.js-specific development guidelines
- Document future integration steps (Clerk, Stripe, Supabase)

### 24. Deprecate old client package (future)
- Mark `/client` as deprecated in package.json
- Update scripts to point to `/next` by default
- Plan final removal timeline

---

## Key Decisions

- ✅ **Next.js 15.3+ App Router** (modern, supports React Server Components)
- ✅ **Keep `/client` intact initially** for parallel development
- ✅ **Use `/next` folder** to avoid conflicts
- ✅ **Preserve all existing functionality** (workflows, WebSocket, components)
- ✅ **Maintain shared package integration** - no changes to core workflow engine
- ✅ **Continue using Hono API server** - no backend changes needed
- ✅ **Prepare for future integrations** - Clerk + Stripe + Supabase + Drizzle

---

## Benefits

### Immediate Benefits
- Server-side rendering and static generation capabilities
- Better SEO and initial page load performance
- Built-in API routes for future needs
- Image optimization with next/image
- Better TypeScript integration
- Modern App Router architecture

### Future Integration Benefits
- Production-ready auth with Clerk
- Seamless Stripe integration for payments
- Supabase real-time subscriptions support
- Better developer experience with hot reloading
- Improved bundle optimization

---

## Migration Timeline Estimate

| Phase | Estimated Time | Priority |
|-------|---------------|----------|
| Phase 1-2: Initial Setup | 2-4 hours | High |
| Phase 3: Component Migration | 6-8 hours | High |
| Phase 4: API Integration | 4-6 hours | High |
| Phase 5: Routing | 2-3 hours | High |
| Phase 6: Styling & UI | 2-4 hours | Medium |
| Phase 7: Future Prep | 2-3 hours | Low |
| Phase 8-9: Testing | 4-6 hours | High |
| Phase 10: Documentation | 2-3 hours | Medium |

**Total Estimated Time:** 24-37 hours

---

## Risk Mitigation

### Potential Risks
1. **Workflow engine compatibility** - Shared package must work in Next.js environment
   - Mitigation: Test early, verify singleton patterns work

2. **WebSocket connection handling** - Next.js has different client lifecycle
   - Mitigation: Use `useEffect` properly, test connection recovery

3. **Build size increase** - Next.js may increase bundle size
   - Mitigation: Configure tree-shaking, lazy loading, code splitting

4. **Development workflow disruption** - Two client packages during migration
   - Mitigation: Use `/next` folder, keep `/client` working until full migration

---

## Success Criteria

- ✅ All 4 routes working with identical functionality
- ✅ Workflow engine executes correctly in browser
- ✅ All API calls to Hono server work
- ✅ WebSocket connections stable
- ✅ All UI components render correctly
- ✅ Build completes without errors
- ✅ Development workflow smooth (hot reload, fast refresh)
- ✅ Ready for Clerk, Stripe, Supabase integration
