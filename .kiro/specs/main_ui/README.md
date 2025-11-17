# Workscript Main UI - Specification

**Feature:** Professional React-based frontend for managing workflows, automations, and nodes in the Workscript orchestration system
**Target Application:** `/apps/frontend`
**Status:** 📋 Ready for Implementation
**Created:** 2025-01-18
**Version:** 1.0.0

---

## 📁 Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with comprehensive acceptance criteria (150+ criteria total)
   - Non-functional requirements (performance, security, accessibility, browser support)
   - Success metrics and explicitly defined out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 142 actionable tasks organized in 9 phases
   - Checkboxes for progress tracking
   - Task-to-requirement mapping for full traceability
   - Estimated timeline: 18-24 days

3. **[README.md](./README.md)** - This overview document

---

## 🎯 Feature Overview

### What We're Building

The **Workscript Main UI** is a comprehensive management interface for the Workscript workflow orchestration system. Key features include:

- **Node Library Browser** - Browse and test 35+ workflow nodes (universal and server-specific) with detailed metadata, AI hints, and isolated execution testing
- **Workflow Manager** - Full CRUD operations with Monaco-based JSON editor, real-time validation, visual preview, and manual execution with custom initial state
- **Automation Manager** - Complete automation lifecycle management with visual cron expression builder, webhook configuration, execution history, and statistics dashboards
- **Real-time Monitoring** - WebSocket-powered live workflow execution tracking with node-level progress, event logs, and execution timelines
- **Execution History** - Comprehensive execution inspection with state snapshots, diff viewers, timeline visualization, and re-run capabilities
- **Dashboard Overview** - System statistics, recent activity, quick actions, and health monitoring
- **Permission-based Access Control** - Role-based UI restrictions aligned with backend permission model
- **Professional Design** - Consistent UI using exclusively shadcn/ui components with responsive mobile-first design

### Technology Stack

**Core Framework:**
- React 19 + TypeScript (type-safe component development)
- Vite 7 (fast build tool with hot module replacement)
- React Router v7 (modern routing with nested layouts)

**UI & Styling:**
- shadcn/ui (exclusive component library - 30+ components)
- Tailwind CSS v4 (utility-first styling)
- lucide-react (icon library)
- recharts (data visualization)

**State Management:**
- Tanstack Query v5 (server state with caching, optimistic updates)
- Zustand (client state for WebSocket and UI preferences)

**Specialized Libraries:**
- Monaco Editor (@monaco-editor/react) - Professional JSON editing
- Zod (runtime schema validation)
- date-fns (date formatting and manipulation)

**Backend Integration:**
- Axios (HTTP client with interceptors)
- Native WebSocket API (real-time event streaming)
- Existing JWT authentication system

---

## 🏗️ Architecture

### High-Level Structure

```
apps/frontend/
├── src/
│   ├── components/        # Reusable UI components (modular, well-documented)
│   │   ├── ui/            # shadcn/ui components
│   │   ├── layout/        # App shell (Sidebar, Header, Breadcrumbs)
│   │   ├── nodes/         # Node-related components
│   │   ├── workflows/     # Workflow-related components
│   │   ├── automations/   # Automation-related components
│   │   ├── executions/    # Execution display components
│   │   ├── monitoring/    # Real-time monitoring components
│   │   └── shared/        # Shared utilities (EmptyState, LoadingSpinner, etc.)
│   │
│   ├── pages/             # Route components (one per major view)
│   │   ├── DashboardPage.tsx
│   │   ├── NodesPage.tsx, NodeDetailPage.tsx
│   │   ├── WorkflowsPage.tsx, WorkflowCreatePage.tsx, WorkflowEditPage.tsx, WorkflowDetailPage.tsx
│   │   ├── AutomationsPage.tsx, AutomationCreatePage.tsx, AutomationEditPage.tsx, AutomationDetailPage.tsx
│   │   ├── ExecutionsPage.tsx, ExecutionDetailPage.tsx
│   │   └── MonitoringPage.tsx
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── api/           # React Query hooks (useWorkflows, useAutomations, useNodes, etc.)
│   │   └── utility hooks  # useDebounce, usePagination, useLocalStorage
│   │
│   ├── services/          # External integrations
│   │   ├── api/           # API client and service layer (workflows.api.ts, automations.api.ts, etc.)
│   │   ├── websocket/     # WebSocket client and event handling
│   │   └── validation/    # Validation utilities (workflow, cron)
│   │
│   ├── stores/            # Zustand state stores
│   │   ├── useWebSocketStore.ts    # WebSocket connection state and events
│   │   └── useUIStore.ts           # UI preferences (theme, layout)
│   │
│   ├── types/             # TypeScript type definitions
│   │   ├── workflow.types.ts
│   │   ├── automation.types.ts
│   │   ├── node.types.ts
│   │   ├── execution.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/             # Helper functions
│   │   ├── formatters.ts   # Date/time/number formatters
│   │   ├── validators.ts   # Validation functions
│   │   └── constants.ts    # App-wide constants
│   │
│   ├── routes.tsx         # React Router configuration
│   ├── App.tsx            # Root component
│   └── main.tsx           # Application entry point
│
└── package.json
```

### Key Components

**Layout System:**
- `<AppLayout>` - Main shell with sidebar, header, and content area
- `<Sidebar>` - Collapsible navigation (hamburger menu on mobile)
- `<Header>` - Page title, user menu, WebSocket status
- `<Breadcrumbs>` - Contextual navigation

**Node Library:**
- `<NodeCard>` - Individual node display with metadata
- `<NodeList>` - Filterable, searchable node grid
- `<NodeDetailPanel>` - Complete metadata and AI hints
- `<NodeTestRunner>` - Monaco-based config editor + execution

**Workflow Management:**
- `<WorkflowCard>` - Workflow summary with actions
- `<WorkflowEditor>` - Monaco JSON editor with validation
- `<WorkflowValidator>` - Real-time validation feedback
- `<WorkflowExecutionPanel>` - Manual execution interface

**Automation Management:**
- `<AutomationCard>` - Automation summary with toggle
- `<CronBuilder>` - Visual cron expression builder
- `<CronValidator>` - Cron validation + next run preview
- `<AutomationStats>` - Charts and statistics

**Real-time Monitoring:**
- `<WebSocketClient>` - Singleton WebSocket manager
- `<RealtimeMonitor>` - Live execution tracking
- `<EventLog>` - Scrolling event history with filters
- `<NodeExecutionFlow>` - Visual execution progress

**Execution History:**
- `<ExecutionTimeline>` - Vertical timeline of node executions
- `<ExecutionStateViewer>` - JSON tree viewer with diff
- `<ExecutionDetails>` - Complete execution inspection

**Shared Utilities:**
- `<DataTable>` - Generic sortable table
- `<EmptyState>` - Consistent empty state messages
- `<ConfirmDialog>` - Reusable confirmation dialogs
- `<StatusBadge>` - Color-coded status indicators

---

## 📋 Implementation Phases

### Phase 1: Foundation & Setup (3-4 days)
- Install 50+ dependencies (React Query, Monaco, Zustand, shadcn components)
- Configure API client with JWT authentication and token refresh
- Set up React Query with devtools
- Create base layout components (AppLayout, Sidebar, Header, Breadcrumbs)
- Set up routing structure with React Router v7
- Create shared utility components (EmptyState, LoadingSpinner, ErrorBoundary, etc.)
- Define TypeScript types for all entities

### Phase 2: Node Library Implementation (2-3 days)
- Build node API service layer and React Query hooks
- Create NodeCard, NodeList, NodeFilterBar components
- Build NodesPage with search and filtering
- Create NodeDetailPage with metadata display
- Build NodeTestRunner with Monaco editor and execution

### Phase 3: Workflow Management (5-6 days)
- Build workflow API service layer and all CRUD hooks
- Create WorkflowCard, WorkflowList components
- Build WorkflowsPage with search and actions
- Build WorkflowEditor with Monaco and real-time validation
- Build WorkflowCreatePage and WorkflowEditPage
- Build WorkflowDetailPage with execution panel and history
- Implement workflow duplication and deletion

### Phase 4: Automation Management (5-6 days)
- Build automation API service layer and all CRUD hooks
- Create AutomationCard, AutomationList, AutomationToggle components
- Build AutomationsPage with filtering and sorting
- Build CronBuilder with visual interface and presets
- Build CronValidator with next run preview
- Build multi-step AutomationForm (4 steps)
- Build AutomationCreatePage and AutomationEditPage
- Build AutomationDetailPage with stats, history, and actions

### Phase 5: Real-time Monitoring & WebSocket (3-4 days)
- Build WebSocketClient service with auto-reconnect
- Create WebSocket Zustand store
- Build WebSocketStatus indicator
- Create RealtimeMonitor, EventLog, NodeExecutionFlow components
- Build MonitoringPage
- Integrate WebSocket events into workflow and automation views

### Phase 6: Execution History & State Inspection (2-3 days)
- Build execution API service layer
- Create ExecutionTimeline, ExecutionDetails, ExecutionStateViewer components
- Build ExecutionsPage with filtering
- Build ExecutionDetailPage with complete inspection tools
- Implement state diff viewer with Monaco
- Add re-run and export functionality

### Phase 7: Dashboard & Polish (3-4 days)
- Build DashboardPage with statistics and charts
- Add pagination to all list views
- Implement toast notifications for all actions
- Add loading states and optimistic updates
- Test responsive design on all breakpoints
- Add JSDoc documentation to all components
- Implement dark/light mode toggle

### Phase 8: Testing & Quality Assurance (2-3 days)
- End-to-end user flow testing
- Permission-based access testing
- Error handling testing (network, API, validation, WebSocket)
- Browser compatibility testing (Chrome, Firefox, Safari, Edge, mobile)
- Performance testing (load times, route transitions, Monaco editor)
- Accessibility testing (keyboard navigation, screen readers, color contrast)

### Phase 9: Final Verification & Deployment Readiness (1-2 days)
- Test production build
- Verify environment variables
- Run TypeScript type checking and ESLint
- Final requirements review
- Documentation review
- Security review

---

## 🚀 Quick Start Guide

### For Developers

**Prerequisites:**
- Bun 1.x installed
- Backend API running at `/apps/api` (Workscript plugin)
- Node.js knowledge and React experience

**Setup Instructions:**

1. **Navigate to frontend directory:**
   ```bash
   cd apps/frontend
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Install shadcn/ui components (as needed):**
   ```bash
   npx shadcn@latest add button card input label textarea
   # ... install others as you implement
   ```

4. **Set up environment variables:**
   ```bash
   # Create .env.local file
   echo "VITE_API_BASE_URL=http://localhost:3000" > .env.local
   echo "VITE_WS_URL=ws://localhost:3000/ws" >> .env.local
   ```

5. **Start development server:**
   ```bash
   bun run dev
   ```

6. **Open browser:**
   Navigate to `http://localhost:5173`

**Development Workflow:**

1. Pick a task from [implementation_plan.md](./implementation_plan.md)
2. Check off the task checkbox when starting: `- [ ]` → `- [x]`
3. Create the component/file as specified
4. Add JSDoc documentation
5. Test the feature in the browser
6. Commit your changes with a descriptive message

**Key Commands:**

```bash
bun run dev          # Start dev server with hot reload
bun run build        # Build for production
bun run preview      # Preview production build
bun run lint         # Run ESLint
bunx tsc --noEmit    # Type check without building
```

### For Reviewers

**How to Review Implementation:**

1. **Check Requirements Completion:**
   - Open [requirements.md](./requirements.md)
   - For each requirement, verify all acceptance criteria are met
   - Test the feature in the browser according to the acceptance criteria

2. **Check Task Completion:**
   - Open [implementation_plan.md](./implementation_plan.md)
   - Verify all tasks in a phase are checked off before considering the phase complete
   - Review code for each task to ensure it meets the specification

3. **Code Quality Review:**
   - All components have JSDoc comments
   - TypeScript types are properly defined (no `any`)
   - Components are modular and reusable (< 300 lines)
   - shadcn/ui is used exclusively for UI components
   - Error handling is comprehensive

4. **Testing Review:**
   - End-to-end user flows work correctly
   - Permission-based access control is enforced
   - Error states are handled gracefully
   - Responsive design works on mobile/tablet/desktop
   - Browser compatibility verified

5. **Performance Review:**
   - Initial page load < 3 seconds
   - Route transitions < 300ms
   - Monaco editor handles large files smoothly
   - WebSocket reconnection is reliable

---

## ✅ Success Criteria

Implementation will be considered complete and successful when:

- [ ] All 20 requirements implemented with acceptance criteria verified
- [ ] All 142 tasks in implementation plan are checked off
- [ ] Node library displays and filters 35+ nodes correctly
- [ ] Monaco editor allows workflow creation/editing with real-time validation
- [ ] Cron builder generates valid expressions with next run preview
- [ ] WebSocket connection is stable with live execution updates
- [ ] All CRUD operations work for workflows and automations
- [ ] Permission-based access control properly restricts UI elements
- [ ] Application is fully responsive on mobile, tablet, and desktop
- [ ] Only shadcn/ui components are used throughout the UI (plus Monaco and recharts)
- [ ] All components are documented with JSDoc comments
- [ ] TypeScript compilation succeeds with no errors
- [ ] ESLint passes with no warnings
- [ ] Production build is under 1MB gzipped
- [ ] End-to-end testing passes on all major browsers
- [ ] Accessibility standards are met (WCAG 2.1 AA)
- [ ] Performance metrics are achieved (load times, transitions)
- [ ] Error handling provides clear, actionable feedback
- [ ] Authentication integrates seamlessly with backend
- [ ] WebSocket auto-reconnect works reliably

---

## 🔒 Security Considerations

**Authentication & Authorization:**
- JWT tokens stored securely (not in localStorage visible to XSS)
- Tokens included in Authorization header for all API requests
- Token refresh implemented to maintain sessions
- Logout clears all authentication data
- Permission checks before rendering UI elements
- 403 pages shown for unauthorized access

**Data Protection:**
- No sensitive data exposed in console logs
- Error messages don't leak internal details
- Webhook URLs displayed with copy button (not selectable)
- API keys never displayed in UI
- XSS protection via React's built-in escaping

**Network Security:**
- HTTPS enforced in production
- WebSocket connections use WSS protocol
- CSRF protection for state-changing operations
- API requests timeout after 30 seconds

---

## 📊 Progress Tracking

**How to Track Progress:**

1. **Use the Implementation Plan Checklist:**
   - Open [implementation_plan.md](./implementation_plan.md) in your editor
   - Check off tasks as you complete them: `- [ ]` → `- [x]`
   - Track progress by phase

2. **Phase Completion:**
   - Phase 1: __ / 32 tasks complete
   - Phase 2: __ / 13 tasks complete
   - Phase 3: __ / 26 tasks complete
   - Phase 4: __ / 26 tasks complete
   - Phase 5: __ / 13 tasks complete
   - Phase 6: __ / 11 tasks complete
   - Phase 7: __ / 21 tasks complete
   - Phase 8: __ / 17 tasks complete
   - Phase 9: __ / 9 tasks complete

3. **Visual Progress (Optional):**
   - Create a GitHub project board
   - Convert tasks to issues
   - Move through columns: To Do → In Progress → Done

4. **Weekly Reviews:**
   - Review completed tasks at end of each week
   - Adjust timeline estimates as needed
   - Document any blockers or challenges

---

## 🚫 Out of Scope

The following features are **explicitly NOT included** in this initial implementation:

1. **Drag-and-Drop Visual Workflow Builder** - Only JSON editing in v1
2. **Multi-tenant Agency Switching** - Shows single agency data only
3. **Workflow Version History UI** - Basic diff viewer only, not full version management
4. **Advanced Analytics Dashboard** - Basic stats only, no trends or predictions
5. **Workflow Templates Library** - Can duplicate workflows, but no curated templates
6. **Collaborative Editing** - No real-time multi-user collaboration
7. **Workflow Debugging with Breakpoints** - Shows execution logs but no interactive debugging
8. **Custom Theme Builder** - Light/dark toggle only, no custom themes
9. **Export to External Formats** - JSON export only, no YAML or graphical exports
10. **Audit Logs UI** - Backend may log, but no dedicated UI viewer
11. **User Management UI** - Auth integration only, no user CRUD in UI
12. **API Key Management UI** - No UI for generating/managing API keys
13. **Workflow Marketplace** - No public sharing or marketplace

These features may be considered for v2 based on user feedback and business priorities.

---

## 📚 Related Documentation

**Project Documentation:**
- [CLAUDE.md](/Users/narcisbrindusescu/teste/workscript/CLAUDE.md) - Main project documentation and architecture
- [workscript_prospect.md](/Users/narcisbrindusescu/teste/workscript/workscript_prospect.md) - Strategic roadmap

**Backend API Documentation:**
- Backend plugin: `/apps/api/src/plugins/workscript/`
- API routes: `/apps/api/src/plugins/workscript/routes/`
- Database schema: `/apps/api/src/plugins/workscript/schema/`

**Engine Documentation:**
- Engine package: `/packages/engine/`
- Node library: `/packages/engine/nodes/`
- Core types: `/packages/engine/src/types/`

**Other Specifications:**
- React Client Auth: `.kiro/specs/react_client_auth/`
- JSON Workflow Engine: `.kiro/specs/json-workflow-engine/`

**External Resources:**
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)

---

## 🤝 Contributing

**Implementation Guidelines:**

1. **Follow the Plan:** Use [implementation_plan.md](./implementation_plan.md) as your roadmap
2. **One Task at a Time:** Complete tasks in order within each phase
3. **Check Requirements:** Ensure your implementation meets the acceptance criteria in [requirements.md](./requirements.md)
4. **Document Everything:** Add JSDoc comments to all functions and components
5. **Use TypeScript:** Define proper types, avoid `any`
6. **Use shadcn/ui Only:** Don't introduce other UI component libraries
7. **Test as You Go:** Manually test each feature before marking task complete
8. **Commit Frequently:** Make small, focused commits with descriptive messages
9. **Ask Questions:** If requirements are unclear, ask for clarification before implementing

**Code Style:**
- Follow existing patterns in the codebase
- Use functional components with hooks (no class components)
- Keep components under 300 lines (split into smaller components if larger)
- Use meaningful variable and function names
- Add comments for complex logic

**Git Workflow:**
```bash
# Create feature branch from main
git checkout -b feature/main-ui-phase-1

# Make changes, test, and commit
git add .
git commit -m "feat(ui): implement AppLayout and Sidebar components"

# Push to remote
git push origin feature/main-ui-phase-1

# Create pull request for review
```

---

**Happy Coding! 🎉**

Let's build an amazing workflow orchestration UI together. If you have any questions or need clarification on any requirement or task, don't hesitate to reach out. This specification is designed to be comprehensive, but feel free to suggest improvements as you implement.

**Document Version:** 1.0.0
**Last Updated:** 2025-01-18
**Maintainer:** Development Team
