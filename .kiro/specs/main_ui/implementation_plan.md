# Implementation Plan: Workscript Main UI

This document provides a concrete, actionable implementation plan for the **Workscript Main UI** - a professional React-based frontend for managing workflows, automations, and nodes in the Workscript orchestration system. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: FOUNDATION & SETUP

### 1.1 Project Dependencies Installation

- [ ] **Task 1.1.1: Install React Query and related packages**
  - Run: `cd apps/frontend && bun add @tanstack/react-query @tanstack/react-query-devtools`
  - Verify installation in package.json
  - _Requirements: Req 4, 5, 9, 10 (API integration)_

- [ ] **Task 1.1.2: Install Monaco Editor**
  - Run: `bun add @monaco-editor/react monaco-editor`
  - Verify installation and check for version compatibility
  - _Requirements: Req 5, 6, 20 (Monaco editor integration)_

- [ ] **Task 1.1.3: Install state management and utilities**
  - Run: `bun add zustand zod date-fns`
  - Verify installations
  - _Requirements: Req 13, 19 (WebSocket state, validation)_

- [ ] **Task 1.1.4: Install routing library**
  - Run: `bun add react-router-dom@next`
  - Note: Using React Router v7 for future-ready routing
  - _Requirements: Req 4, 8, 9, 12, 15 (Navigation)_

- [ ] **Task 1.1.5: Install UI enhancement libraries**
  - Run: `bun add lucide-react recharts`
  - lucide-react for icons, recharts for charts
  - _Requirements: Req 12, 15 (Stats and charts)_

### 1.2 shadcn/ui Components Installation

- [x] **Task 1.2.1: Install essential form components**
  - Run: `npx shadcn@latest add button card input label textarea`
  - Test each component renders correctly
  - _Requirements: Req 5, 6, 10 (Forms)_

- [x] **Task 1.2.2: Install selection and dropdown components**
  - Run: `npx shadcn@latest add select dropdown-menu dialog alert`
  - Test component functionality
  - _Requirements: Req 9, 10, 19 (Selections and modals)_

- [x] **Task 1.2.3: Install data display components**
  - Run: `npx shadcn@latest add table badge separator tabs`
  - Verify table renders with sample data
  - _Requirements: Req 4, 8, 9, 12, 14 (Data tables)_

- [x] **Task 1.2.4: Install toggle and input components**
  - Run: `npx shadcn@latest add switch checkbox radio-group`
  - Test toggle functionality
  - _Requirements: Req 9, 10, 11 (Toggles and selections)_

- [x] **Task 1.2.5: Install form handling**
  - Run: `npx shadcn@latest add form sheet popover`
  - Configure form with react-hook-form integration
  - _Requirements: Req 5, 6, 10 (Form management)_

- [x] **Task 1.2.6: Install date and advanced components**
  - Run: `npx shadcn@latest add calendar command pagination`
  - Test calendar date selection
  - _Requirements: Req 4, 9, 14 (Pagination and filtering)_

- [x] **Task 1.2.7: Install notification components**
  - Run: `npx shadcn@latest add toast sonner`
  - Set up toast provider in app root
  - _Requirements: Req 19 (User feedback)_

- [x] **Task 1.2.8: Install navigation components**
  - Run: `npx shadcn@latest add breadcrumb`
  - Test breadcrumb navigation
  - _Requirements: Req 2, 8, 12 (Navigation)_

### 1.3 TypeScript Types and API Interfaces

- [ ] **Task 1.3.1: Create workflow type definitions**
  - Create file: `apps/frontend/src/types/workflow.types.ts`
  - Define interfaces: `WorkflowDefinition`, `ParsedWorkflow`, `ValidationResult`, `ExecutionResult`
  - Import from `@workscript/engine` where appropriate
  - _Requirements: Req 4, 5, 6, 7, 8_

- [ ] **Task 1.3.2: Create automation type definitions**
  - Create file: `apps/frontend/src/types/automation.types.ts`
  - Define interfaces: `Automation`, `NewAutomation`, `AutomationExecution`, `TriggerConfig`
  - Include enums for `TriggerType` and `ExecutionStatus`
  - _Requirements: Req 9, 10, 11, 12_

- [ ] **Task 1.3.3: Create node type definitions**
  - Create file: `apps/frontend/src/types/node.types.ts`
  - Define interfaces: `NodeMetadata`, `AIHints`, `NodeSource`
  - _Requirements: Req 1, 2, 3_

- [ ] **Task 1.3.4: Create execution type definitions**
  - Create file: `apps/frontend/src/types/execution.types.ts`
  - Define interfaces: `WorkflowExecution`, `StateChange`, `NodeExecutionLog`
  - _Requirements: Req 7, 8, 14_

- [ ] **Task 1.3.5: Create API request/response types**
  - Create file: `apps/frontend/src/types/api.types.ts`
  - Define generic types: `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`
  - _Requirements: All API-related requirements_

- [ ] **Task 1.3.6: Create WebSocket message types**
  - Create file: `apps/frontend/src/services/websocket/events.types.ts`
  - Define interfaces: `WebSocketMessage`, `WorkflowEvent`, `NodeEvent`
  - Include event type enums
  - _Requirements: Req 13 (WebSocket events)_

### 1.4 API Client Configuration

- [ ] **Task 1.4.1: Create Axios client with auth interceptor**
  - Create file: `apps/frontend/src/services/api/client.ts`
  - Configure base URL from environment variable
  - Add request interceptor to inject JWT token from localStorage
  - Add response interceptor for error handling
  - _Requirements: Req 16 (Authentication)_

- [ ] **Task 1.4.2: Implement token refresh logic**
  - Add 401 response handler to attempt token refresh
  - Implement refresh token API call
  - Retry original request on successful refresh
  - Redirect to login on refresh failure
  - _Requirements: Req 16 (Session management)_

- [ ] **Task 1.4.3: Create error handling utility**
  - Create file: `apps/frontend/src/services/api/errorHandler.ts`
  - Map HTTP status codes to user-friendly messages
  - Extract error details from API responses
  - _Requirements: Req 19 (Error handling)_

### 1.5 React Query Setup

- [ ] **Task 1.5.1: Configure React Query client**
  - Create file: `apps/frontend/src/lib/queryClient.ts`
  - Configure default options: retry logic (3 attempts), staleTime (5 minutes), cacheTime (10 minutes)
  - Set up global error handler
  - _Requirements: All API requirements_

- [ ] **Task 1.5.2: Add React Query providers to app**
  - Wrap app in `QueryClientProvider` in `main.tsx`
  - Add `ReactQueryDevtools` in development mode
  - Verify devtools appear in browser
  - _Requirements: All API requirements_

### 1.6 Base Layout Components

- [ ] **Task 1.6.1: Create AppLayout component**
  - Create file: `apps/frontend/src/components/layout/AppLayout.tsx`
  - Implement main layout structure: `<Sidebar>`, `<Header>`, `<main>` content area, `<Outlet>` for nested routes
  - Add responsive breakpoints for mobile/desktop
  - Document with JSDoc: purpose, structure, responsive behavior
  - _Requirements: Req 18 (Responsive design)_

- [ ] **Task 1.6.2: Create Sidebar component**
  - Create file: `apps/frontend/src/components/layout/Sidebar.tsx`
  - Implement navigation links: Dashboard, Nodes, Workflows, Automations, Executions, Monitoring
  - Add active link highlighting using `useLocation`
  - Implement collapsible sidebar for mobile (hamburger menu)
  - Add shadcn/ui icons from lucide-react
  - Document component with JSDoc
  - _Requirements: Req 18 (Responsive navigation)_

- [ ] **Task 1.6.3: Create Header component**
  - Create file: `apps/frontend/src/components/layout/Header.tsx`
  - Display current page title (dynamic based on route)
  - Add user menu dropdown: user name, email, role, logout button
  - Add WebSocket status indicator
  - Document component
  - _Requirements: Req 13, 16 (WebSocket status, user info)_

- [ ] **Task 1.6.4: Create Breadcrumbs component**
  - Create file: `apps/frontend/src/components/layout/Breadcrumbs.tsx`
  - Generate breadcrumbs from current route path
  - Make breadcrumb links clickable for navigation
  - Style using shadcn/ui breadcrumb component
  - Document component
  - _Requirements: Req 2, 8, 12 (Navigation)_

### 1.7 Shared Utility Components

- [ ] **Task 1.7.1: Create EmptyState component**
  - Create file: `apps/frontend/src/components/shared/EmptyState.tsx`
  - Props: `title`, `description`, `icon`, `actionButton`
  - Display icon, message, and optional action button
  - Document with usage examples
  - _Requirements: Req 1, 4, 8, 9, 14 (Empty states)_

- [ ] **Task 1.7.2: Create LoadingSpinner component**
  - Create file: `apps/frontend/src/components/shared/LoadingSpinner.tsx`
  - Props: `size` (sm/md/lg), `label` (optional text)
  - Use shadcn/ui spinner or create custom
  - Document component
  - _Requirements: Req 1, 4, 8, 9, 19 (Loading states)_

- [ ] **Task 1.7.3: Create ErrorBoundary component**
  - Create file: `apps/frontend/src/components/shared/ErrorBoundary.tsx`
  - Implement React error boundary with fallback UI
  - Display friendly error message and "Reload Page" button
  - Log errors to console in development
  - Document component
  - _Requirements: Req 19 (Error handling)_

- [ ] **Task 1.7.4: Create ConfirmDialog component**
  - Create file: `apps/frontend/src/components/shared/ConfirmDialog.tsx`
  - Props: `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`
  - Use shadcn/ui Dialog component
  - Destructive action variant (red confirm button)
  - Document component
  - _Requirements: Req 4, 6, 9, 12 (Confirmation dialogs)_

- [ ] **Task 1.7.5: Create StatusBadge component**
  - Create file: `apps/frontend/src/components/shared/StatusBadge.tsx`
  - Props: `status` (pending/running/completed/failed/enabled/disabled)
  - Color-coded badges using shadcn/ui Badge
  - Document component
  - _Requirements: Req 4, 8, 9, 12, 14 (Status indicators)_

- [ ] **Task 1.7.6: Create DataTable component**
  - Create file: `apps/frontend/src/components/shared/DataTable.tsx`
  - Generic reusable table with props: `columns`, `data`, `onSort`, `loading`
  - Integrate shadcn/ui Table component
  - Add sorting indicators in headers
  - Document component with TypeScript generics
  - _Requirements: Req 4, 8, 9, 12, 14 (Tables)_

- [ ] **Task 1.7.7: Create SearchInput component**
  - Create file: `apps/frontend/src/components/shared/SearchInput.tsx`
  - Props: `value`, `onChange`, `placeholder`, `debounceMs`
  - Use shadcn/ui Input with search icon
  - Implement debounce internally
  - Document component
  - _Requirements: Req 1, 4, 9, 14 (Search/filter)_

- [ ] **Task 1.7.8: Create PageHeader component**
  - Create file: `apps/frontend/src/components/shared/PageHeader.tsx`
  - Props: `title`, `description`, `actions` (optional buttons)
  - Consistent styling across all pages
  - Document component
  - _Requirements: All page requirements_

### 1.8 Routing Configuration

- [ ] **Task 1.8.1: Set up React Router**
  - Create file: `apps/frontend/src/routes.tsx`
  - Define route structure using `createBrowserRouter`
  - Set up nested routes with AppLayout as parent
  - _Requirements: All navigation requirements_

- [ ] **Task 1.8.2: Define main routes**
  - Add routes: `/` (Dashboard), `/nodes` (Nodes list), `/nodes/:nodeId` (Node detail), `/workflows` (Workflows list), `/workflows/new` (Create workflow), `/workflows/:id` (Workflow detail), `/workflows/:id/edit` (Edit workflow)
  - All routes use lazy loading for code splitting
  - _Requirements: Req 1, 2, 3, 4, 5, 6, 7, 8_

- [ ] **Task 1.8.3: Define automation routes**
  - Add routes: `/automations` (Automations list), `/automations/new` (Create automation), `/automations/:id` (Automation detail), `/automations/:id/edit` (Edit automation)
  - _Requirements: Req 9, 10, 11, 12_

- [ ] **Task 1.8.4: Define monitoring and execution routes**
  - Add routes: `/executions` (Executions list), `/executions/:id` (Execution detail), `/monitoring` (Real-time monitoring)
  - _Requirements: Req 13, 14_

- [ ] **Task 1.8.5: Add 404 Not Found route**
  - Create 404 page component
  - Add catch-all route at the end
  - Display friendly message and link to dashboard
  - _Requirements: Req 19 (Error handling)_

### 1.9 Authentication Context and Guards

- [ ] **Task 1.9.1: Create auth context**
  - Create file: `apps/frontend/src/contexts/AuthContext.tsx`
  - Manage auth state: user, token, permissions
  - Provide login, logout, and token refresh functions
  - Document context with JSDoc
  - _Requirements: Req 16 (Authentication)_

- [ ] **Task 1.9.2: Implement protected route wrapper**
  - Create file: `apps/frontend/src/components/ProtectedRoute.tsx`
  - Check if user is authenticated, redirect to login if not
  - Optionally check for required permissions
  - Display 403 page if permissions insufficient
  - _Requirements: Req 16, 17 (Auth and permissions)_

- [ ] **Task 1.9.3: Add auth provider to app root**
  - Wrap app in `AuthProvider` in `main.tsx`
  - Load user data on app initialization
  - _Requirements: Req 16_

---

## PHASE 2: NODE LIBRARY IMPLEMENTATION

### 2.1 Node API Service Layer

- [ ] **Task 2.1.1: Create nodes API service**
  - Create file: `apps/frontend/src/services/api/nodes.api.ts`
  - Implement functions: `fetchAllNodes(source?)`, `fetchNodeMetadata(nodeId)`, `executeNode(nodeId, config, initialState)`
  - Use Axios client from Task 1.4.1
  - Document with JSDoc and TypeScript
  - _Requirements: Req 1, 2, 3_

- [ ] **Task 2.1.2: Create useNodes React Query hook**
  - Create file: `apps/frontend/src/hooks/api/useNodes.ts`
  - Implement hook: `useNodes(source?)` - returns nodes list query
  - Enable/disable based on source parameter
  - Add loading, error, and refetch states
  - _Requirements: Req 1_

- [ ] **Task 2.1.3: Create useNodeMetadata React Query hook**
  - In `apps/frontend/src/hooks/api/useNodes.ts`
  - Implement hook: `useNodeMetadata(nodeId)` - returns node detail query
  - Handle node not found errors
  - _Requirements: Req 2_

- [ ] **Task 2.1.4: Create useExecuteNode mutation hook**
  - In `apps/frontend/src/hooks/api/useNodes.ts`
  - Implement hook: `useExecuteNode()` - returns mutation for node execution
  - Handle success and error states with toast notifications
  - _Requirements: Req 3_

### 2.2 Node List Components

- [ ] **Task 2.2.1: Create NodeCard component**
  - Create file: `apps/frontend/src/components/nodes/NodeCard.tsx`
  - Props: `node` (NodeMetadata)
  - Display: id, name, version, description (truncated), source badge, "View Details" button
  - Use shadcn/ui Card component
  - Add hover effects
  - Document component
  - _Requirements: Req 1_

- [ ] **Task 2.2.2: Create NodeFilterBar component**
  - Create file: `apps/frontend/src/components/nodes/NodeFilterBar.tsx`
  - Props: `onSourceChange`, `onSearchChange`
  - Include: source dropdown (All/Universal/Server), search input
  - Use shadcn/ui Select and Input
  - Document component
  - _Requirements: Req 1_

- [ ] **Task 2.2.3: Create NodeList component**
  - Create file: `apps/frontend/src/components/nodes/NodeList.tsx`
  - Props: `nodes`, `loading`, `error`
  - Render grid of NodeCard components
  - Show loading skeletons when loading
  - Show error state with retry button
  - Show empty state when no nodes
  - Document component
  - _Requirements: Req 1_

### 2.3 Nodes Page

- [ ] **Task 2.3.1: Create NodesPage component**
  - Create file: `apps/frontend/src/pages/NodesPage.tsx`
  - Use `useNodes` hook to fetch nodes
  - Implement local state for search and source filter
  - Render PageHeader with total node count
  - Render NodeFilterBar
  - Render NodeList with filtered nodes
  - Add pagination if > 20 nodes
  - Document component
  - _Requirements: Req 1_

- [ ] **Task 2.3.2: Test NodesPage functionality**
  - Test search filtering works correctly
  - Test source filtering (All/Universal/Server)
  - Test loading states display correctly
  - Test error handling with retry
  - Test empty state displays when no results
  - _Requirements: Req 1_

### 2.4 Node Detail Components

- [ ] **Task 2.4.1: Create NodeDetailPanel component**
  - Create file: `apps/frontend/src/components/nodes/NodeDetailPanel.tsx`
  - Props: `node` (NodeMetadata)
  - Display sections: Overview (name, version, description), Inputs, Outputs, AI Hints (purpose, when to use, expected edges, example usage with syntax highlighting)
  - Use shadcn/ui Tabs for section organization
  - Add copy buttons for code snippets
  - Document component
  - _Requirements: Req 2_

- [ ] **Task 2.4.2: Create NodeTestRunner component**
  - Create file: `apps/frontend/src/components/nodes/NodeTestRunner.tsx`
  - Props: `nodeId`, `exampleConfig`
  - Render Monaco editor for config input
  - Render Monaco editor for initial state (optional)
  - Render "Run Test" button using `useExecuteNode` mutation
  - Display results panel with execution time, edges, final state
  - Add "Clear Results" and "Reset to Example" buttons
  - Document component
  - _Requirements: Req 3_

### 2.5 Node Detail Page

- [ ] **Task 2.5.1: Create NodeDetailPage component**
  - Create file: `apps/frontend/src/pages/NodeDetailPage.tsx`
  - Use `useParams` to get nodeId from route
  - Use `useNodeMetadata` hook to fetch node details
  - Render Breadcrumbs (Nodes > {Node Name})
  - Render NodeDetailPanel with node metadata
  - Render NodeTestRunner below metadata
  - Handle loading state, error state, and 404 not found
  - Document component
  - _Requirements: Req 2, 3_

- [ ] **Task 2.5.2: Test NodeDetailPage functionality**
  - Test node details load correctly
  - Test 404 handling for invalid nodeId
  - Test code snippet copy to clipboard
  - Test node execution with valid config
  - Test node execution with invalid config shows errors
  - Test Monaco editor validation
  - _Requirements: Req 2, 3_

---

## PHASE 3: WORKFLOW MANAGEMENT

### 3.1 Workflow API Service Layer

- [ ] **Task 3.1.1: Create workflows API service**
  - Create file: `apps/frontend/src/services/api/workflows.api.ts`
  - Implement functions: `fetchWorkflows()`, `fetchWorkflow(id)`, `createWorkflow(data)`, `updateWorkflow(id, data)`, `deleteWorkflow(id)`, `executeWorkflow(definition, initialState)`, `validateWorkflow(definition)`
  - Use Axios client
  - Document all functions
  - _Requirements: Req 4, 5, 6, 7, 8_

- [ ] **Task 3.1.2: Create useWorkflows React Query hook**
  - Create file: `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement hook: `useWorkflows()` - returns workflows list query
  - Enable automatic refetching on window focus
  - _Requirements: Req 4_

- [ ] **Task 3.1.3: Create useWorkflow hook**
  - In `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement hook: `useWorkflow(id)` - returns single workflow query
  - _Requirements: Req 8_

- [ ] **Task 3.1.4: Create useCreateWorkflow mutation hook**
  - In `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement mutation with optimistic updates
  - Invalidate workflows list query on success
  - Show toast notification on success/error
  - _Requirements: Req 5_

- [ ] **Task 3.1.5: Create useUpdateWorkflow mutation hook**
  - In `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement mutation with optimistic updates
  - Invalidate workflow detail query on success
  - _Requirements: Req 6_

- [ ] **Task 3.1.6: Create useDeleteWorkflow mutation hook**
  - In `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement mutation with optimistic updates
  - Invalidate workflows list query on success
  - Show confirmation toast on success
  - _Requirements: Req 4_

- [ ] **Task 3.1.7: Create useExecuteWorkflow mutation hook**
  - In `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement mutation for immediate workflow execution
  - Handle execution results with state updates
  - _Requirements: Req 7_

- [ ] **Task 3.1.8: Create useValidateWorkflow mutation hook**
  - In `apps/frontend/src/hooks/api/useWorkflows.ts`
  - Implement mutation for workflow validation
  - Return validation errors with line/column info
  - _Requirements: Req 5, 6_

### 3.2 Workflow List Components

- [ ] **Task 3.2.1: Create WorkflowCard component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowCard.tsx`
  - Props: `workflow`, `onView`, `onEdit`, `onDelete`, `onRun`
  - Display: name, description, version, isActive badge, created/updated dates
  - Add action buttons: View, Edit, Delete, Run
  - Use shadcn/ui Card and DropdownMenu
  - Check permissions before showing actions
  - Document component
  - _Requirements: Req 4, 17_

- [ ] **Task 3.2.2: Create WorkflowList component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowList.tsx`
  - Props: `workflows`, `loading`, `onView`, `onEdit`, `onDelete`, `onRun`
  - Render grid of WorkflowCard components
  - Show skeleton loaders when loading
  - Show empty state when no workflows
  - Document component
  - _Requirements: Req 4_

### 3.3 Workflows Page

- [ ] **Task 3.3.1: Create WorkflowsPage component**
  - Create file: `apps/frontend/src/pages/WorkflowsPage.tsx`
  - Use `useWorkflows` hook
  - Use `useDeleteWorkflow` hook for deletion
  - Implement search filtering (local state)
  - Render PageHeader with "Create Workflow" button
  - Render SearchInput
  - Render WorkflowList
  - Add pagination for > 20 workflows
  - Handle delete confirmation with ConfirmDialog
  - Document component
  - _Requirements: Req 4_

- [ ] **Task 3.3.2: Test WorkflowsPage functionality**
  - Test workflows load and display correctly
  - Test search filtering
  - Test Create button navigation
  - Test View/Edit/Delete actions
  - Test delete confirmation dialog
  - Test empty state
  - _Requirements: Req 4_

### 3.4 Workflow Form and Editor Components

- [ ] **Task 3.4.1: Create WorkflowForm component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowForm.tsx`
  - Props: `initialData`, `onSubmit`, `loading`
  - Fields: name (required), description (optional), version (default "1.0.0")
  - Use shadcn/ui Form with react-hook-form
  - Validate name is not empty
  - Document component
  - _Requirements: Req 5, 6_

- [ ] **Task 3.4.2: Create WorkflowEditor component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowEditor.tsx`
  - Props: `value`, `onChange`, `onValidate`, `readOnly`
  - Render Monaco editor with JSON schema validation
  - Configure Monaco: syntax highlighting, line numbers, bracket matching, auto-indentation
  - Add keyboard shortcut for save (Cmd/Ctrl+S)
  - Document component
  - _Requirements: Req 5, 6, 20_

- [ ] **Task 3.4.3: Create WorkflowValidator component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowValidator.tsx`
  - Props: `workflowDefinition`, `onValidate`
  - Use `useValidateWorkflow` mutation
  - Display validation status: success (green checkmark), error (red X with errors)
  - Show error messages with line numbers
  - Add "Validate" button
  - Document component
  - _Requirements: Req 5, 6_

- [ ] **Task 3.4.4: Create WorkflowPreview component (optional)**
  - Create file: `apps/frontend/src/components/workflows/WorkflowPreview.tsx`
  - Props: `workflow` (ParsedWorkflow)
  - Display simple visual representation of nodes and edges
  - Use list or tree view (no drag-and-drop)
  - Document component
  - _Requirements: Req 5, 6, 8 (Optional enhancement)_

### 3.5 Workflow Creation Page

- [ ] **Task 3.5.1: Create WorkflowCreatePage component**
  - Create file: `apps/frontend/src/pages/WorkflowCreatePage.tsx`
  - Use `useCreateWorkflow` mutation
  - Use `useValidateWorkflow` mutation
  - Manage form state: name, description, version, workflow JSON
  - Render PageHeader with "Create Workflow" title
  - Render WorkflowForm for metadata
  - Render WorkflowEditor for JSON definition
  - Render WorkflowValidator
  - Add action buttons: Save, Validate, Test Run, Cancel
  - Handle unsaved changes warning on Cancel
  - Check `WORKFLOW_CREATE` permission
  - Document component
  - _Requirements: Req 5, 17_

- [ ] **Task 3.5.2: Implement Test Run dialog**
  - Add dialog for test run with initial state input
  - Use Monaco editor for initial state JSON
  - Execute workflow with `useExecuteWorkflow` mutation
  - Display execution results
  - _Requirements: Req 5, 7_

- [ ] **Task 3.5.3: Test WorkflowCreatePage functionality**
  - Test form validation (name required)
  - Test Monaco editor validation with invalid JSON
  - Test Validate button shows errors
  - Test Save creates workflow and redirects
  - Test Test Run executes workflow
  - Test Cancel shows confirmation if dirty
  - Test permission check disables Save if no permission
  - _Requirements: Req 5, 17_

### 3.6 Workflow Edit Page

- [ ] **Task 3.6.1: Create WorkflowEditPage component**
  - Create file: `apps/frontend/src/pages/WorkflowEditPage.tsx`
  - Use `useParams` to get workflow ID
  - Use `useWorkflow` hook to fetch existing workflow
  - Use `useUpdateWorkflow` mutation
  - Pre-populate form with existing data when loaded
  - Add "dirty" indicator for unsaved changes
  - Render same components as create page
  - Add "View Diff" button to show original vs. current
  - Show warning banner if workflow is used by active automations
  - Check `WORKFLOW_UPDATE` permission
  - Document component
  - _Requirements: Req 6, 17_

- [ ] **Task 3.6.2: Implement Monaco diff editor for View Diff**
  - Add dialog with Monaco diff editor
  - Show original workflow (left) vs. current workflow (right)
  - Highlight changes in green/red
  - _Requirements: Req 6, 20_

- [ ] **Task 3.6.3: Test WorkflowEditPage functionality**
  - Test workflow data loads and populates form
  - Test Save updates workflow
  - Test View Diff shows changes correctly
  - Test warning banner for workflows with automations
  - Test permission check makes form read-only if no permission
  - _Requirements: Req 6, 17_

### 3.7 Workflow Detail Page

- [ ] **Task 3.7.1: Create WorkflowDetailView component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowDetailView.tsx`
  - Props: `workflow`
  - Display metadata: name, description, version, created/updated dates, isActive status
  - Display workflow definition in read-only Monaco editor
  - Document component
  - _Requirements: Req 8_

- [ ] **Task 3.7.2: Create WorkflowExecutionPanel component**
  - Create file: `apps/frontend/src/components/workflows/WorkflowExecutionPanel.tsx`
  - Props: `workflowDefinition`
  - Render Monaco editor for initial state JSON (optional)
  - Render "Run Workflow" button using `useExecuteWorkflow`
  - Display execution results panel (collapsed by default)
  - Show: execution ID, status, duration, final state, result, "View Full Execution" link
  - Add "Clear Results" button
  - Check `WORKFLOW_EXECUTE` permission
  - Document component
  - _Requirements: Req 7, 17_

- [ ] **Task 3.7.3: Create ExecutionList component**
  - Create file: `apps/frontend/src/components/executions/ExecutionList.tsx`
  - Props: `executions`, `loading`, `compact` (optional)
  - Display table with columns: execution ID (truncated), start time, status badge, duration, "View Details"
  - Use DataTable component
  - Document component
  - _Requirements: Req 8, 14_

- [ ] **Task 3.7.4: Create WorkflowDetailPage component**
  - Create file: `apps/frontend/src/pages/WorkflowDetailPage.tsx`
  - Use `useParams` to get workflow ID
  - Use `useWorkflow` hook
  - Fetch workflow executions (create useWorkflowExecutions hook)
  - Render Breadcrumbs (Workflows > {Workflow Name})
  - Render PageHeader with action buttons: Edit, Duplicate, Delete
  - Render WorkflowDetailView
  - Render WorkflowExecutionPanel
  - Render ExecutionList (recent 20)
  - Show "Associated Automations" section if applicable
  - Handle delete with confirmation
  - Check `WORKFLOW_READ` permission
  - Document component
  - _Requirements: Req 8, 17_

- [ ] **Task 3.7.5: Implement workflow duplication**
  - Add duplicate action handler
  - Create new workflow with "Copy of {name}" prefix
  - Use `useCreateWorkflow` mutation
  - Show success toast and redirect to new workflow
  - _Requirements: Req 8_

- [ ] **Task 3.7.6: Test WorkflowDetailPage functionality**
  - Test workflow details load correctly
  - Test Edit button navigates to edit page
  - Test Delete shows confirmation and deletes workflow
  - Test Duplicate creates new workflow
  - Test execution panel runs workflow
  - Test execution history displays recent runs
  - Test 403 error for users without permission
  - _Requirements: Req 8, 17_

---

## PHASE 4: AUTOMATION MANAGEMENT

### 4.1 Automation API Service Layer

- [ ] **Task 4.1.1: Create automations API service**
  - Create file: `apps/frontend/src/services/api/automations.api.ts`
  - Implement functions: `fetchAutomations(filters?)`, `fetchAutomation(id)`, `createAutomation(data)`, `updateAutomation(id, data)`, `deleteAutomation(id)`, `toggleAutomation(id, enabled)`, `executeAutomation(id)`, `rescheduleAutomation(id, cronConfig)`, `validateCronExpression(expression)`
  - Document all functions
  - _Requirements: Req 9, 10, 11, 12_

- [ ] **Task 4.1.2: Create useAutomations React Query hook**
  - Create file: `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement hook: `useAutomations(filters?)` - returns automations list query
  - Support filtering by: triggerType, enabled status
  - _Requirements: Req 9_

- [ ] **Task 4.1.3: Create useAutomation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement hook: `useAutomation(id)` - returns single automation query
  - _Requirements: Req 12_

- [ ] **Task 4.1.4: Create useCreateAutomation mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation with success/error handling
  - Invalidate automations list on success
  - _Requirements: Req 10_

- [ ] **Task 4.1.5: Create useUpdateAutomation mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation with optimistic updates
  - _Requirements: Req 10, 12_

- [ ] **Task 4.1.6: Create useDeleteAutomation mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation with confirmation
  - _Requirements: Req 9_

- [ ] **Task 4.1.7: Create useToggleAutomation mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation with optimistic updates
  - Show toast notification on toggle
  - _Requirements: Req 9, 12_

- [ ] **Task 4.1.8: Create useExecuteAutomation mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation for manual execution
  - _Requirements: Req 12_

- [ ] **Task 4.1.9: Create useRescheduleAutomation mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation for cron rescheduling
  - _Requirements: Req 12_

- [ ] **Task 4.1.10: Create useValidateCron mutation hook**
  - In `apps/frontend/src/hooks/api/useAutomations.ts`
  - Implement mutation to validate cron expressions
  - Return validation result and next run times
  - _Requirements: Req 11_

### 4.2 Automation List Components

- [ ] **Task 4.2.1: Create AutomationCard component**
  - Create file: `apps/frontend/src/components/automations/AutomationCard.tsx`
  - Props: `automation`, `onView`, `onEdit`, `onDelete`, `onToggle`, `onExecute`
  - Display: name, description, workflow name (link), trigger type badge, next run time, run statistics, enabled toggle
  - Add action buttons in dropdown menu
  - Check permissions before showing actions
  - Document component
  - _Requirements: Req 9, 17_

- [ ] **Task 4.2.2: Create AutomationList component**
  - Create file: `apps/frontend/src/components/automations/AutomationList.tsx`
  - Props: `automations`, `loading`, action handlers
  - Render grid of AutomationCard components
  - Show skeleton loaders when loading
  - Show empty state
  - Document component
  - _Requirements: Req 9_

- [ ] **Task 4.2.3: Create AutomationToggle component**
  - Create file: `apps/frontend/src/components/automations/AutomationToggle.tsx`
  - Props: `automationId`, `enabled`, `onChange`
  - Use shadcn/ui Switch component
  - Show loading state during toggle
  - Document component
  - _Requirements: Req 9, 12_

### 4.3 Automations Page

- [ ] **Task 4.3.1: Create AutomationsPage component**
  - Create file: `apps/frontend/src/pages/AutomationsPage.tsx`
  - Use `useAutomations` hook with filter state
  - Implement local state for search, triggerType filter, status filter
  - Render PageHeader with "Create Automation" button
  - Render filter buttons: All, Enabled, Disabled, By Type (cron/webhook/immediate)
  - Render SearchInput
  - Render AutomationList
  - Add pagination for > 20 automations
  - Add column sorting
  - Document component
  - _Requirements: Req 9_

- [ ] **Task 4.3.2: Test AutomationsPage functionality**
  - Test automations load and display
  - Test search filtering
  - Test trigger type filter
  - Test status filter
  - Test enable/disable toggle
  - Test Execute Now action
  - Test delete confirmation
  - Test empty state
  - _Requirements: Req 9_

### 4.4 Cron Expression Builder

- [ ] **Task 4.4.1: Create CronBuilder component**
  - Create file: `apps/frontend/src/components/automations/CronBuilder.tsx`
  - Props: `value` (cron expression), `onChange`, `timezone`
  - Render dropdowns: Minute (0-59, presets), Hour (0-23, presets), Day of Month (1-31, *), Month (1-12, names), Day of Week (0-6, names)
  - Render raw cron expression input (for advanced users)
  - Sync dropdowns with raw input bidirectionally
  - Disable dropdowns when raw input is manually edited
  - Add "Common Presets" dropdown
  - Document component
  - _Requirements: Req 11_

- [ ] **Task 4.4.2: Create CronValidator component**
  - Create file: `apps/frontend/src/components/automations/CronValidator.tsx`
  - Props: `cronExpression`, `timezone`
  - Use `useValidateCron` mutation with debounce (300ms)
  - Display validation status: valid (green checkmark), invalid (red X with error)
  - Display next 5 execution times when valid
  - Format times in selected timezone using date-fns
  - Add info tooltip with cron syntax examples
  - Document component
  - _Requirements: Req 11_

- [ ] **Task 4.4.3: Implement cron presets**
  - Add preset configurations: "Every minute" (*/1 * * * *), "Every 5 minutes" (*/5 * * * *), "Every hour" (0 * * * *), "Every day at midnight" (0 0 * * *), "Every day at 9 AM" (0 9 * * *), "Every Monday at 9 AM" (0 9 * * 1), "First day of month" (0 0 1 * *), "Every weekday at 9 AM" (0 9 * * 1-5)
  - Apply preset to CronBuilder on selection
  - _Requirements: Req 11_

- [ ] **Task 4.4.4: Test CronBuilder functionality**
  - Test dropdown selections generate correct cron expression
  - Test raw input manually edited disables dropdowns
  - Test presets populate correctly
  - Test validation shows errors for invalid expressions
  - Test next run times display correctly
  - Test timezone changes update next run times
  - _Requirements: Req 11_

### 4.5 Automation Form Components

- [ ] **Task 4.5.1: Create AutomationForm component (Step 1: Basic Info)**
  - Create file: `apps/frontend/src/components/automations/AutomationForm.tsx`
  - Multi-step form with step indicators
  - Step 1 fields: name (required), description (optional)
  - Use shadcn/ui Form with react-hook-form
  - Add "Next" button with validation
  - Document component
  - _Requirements: Req 10_

- [ ] **Task 4.5.2: Add Step 2: Workflow Selection**
  - In AutomationForm component
  - Render workflow selector dropdown
  - Fetch workflows using `useWorkflows` hook
  - Filter only active workflows
  - Add search within dropdown using shadcn/ui Command component
  - Display selected workflow name and version
  - Add "Back" and "Next" buttons
  - _Requirements: Req 10_

- [ ] **Task 4.5.3: Add Step 3: Trigger Configuration**
  - In AutomationForm component
  - Render radio buttons for trigger type: Cron, Webhook, Immediate
  - Conditionally render CronBuilder for cron trigger
  - Render webhook URL input for webhook trigger (auto-generate suggested path)
  - Render message for immediate trigger
  - Add timezone selector for cron triggers
  - Add "Back" and "Next" buttons
  - _Requirements: Req 10, 11_

- [ ] **Task 4.5.4: Add Step 4: Review & Submit**
  - In AutomationForm component
  - Display read-only summary of all entered data
  - Include: name, description, workflow name, trigger type, trigger config details
  - Add enabled/disabled toggle (default enabled)
  - Add "Back", "Save", and "Cancel" buttons
  - _Requirements: Req 10_

- [ ] **Task 4.5.5: Test AutomationForm functionality**
  - Test step navigation (forward/backward)
  - Test data persists across steps
  - Test validation prevents proceeding with invalid data
  - Test workflow selection dropdown works
  - Test cron builder integrated correctly
  - Test webhook URL auto-generation
  - Test review summary displays correctly
  - _Requirements: Req 10, 11_

### 4.6 Automation Creation Page

- [ ] **Task 4.6.1: Create AutomationCreatePage component**
  - Create file: `apps/frontend/src/pages/AutomationCreatePage.tsx`
  - Use `useCreateAutomation` mutation
  - Manage multi-step form state
  - Render PageHeader with "Create Automation" title
  - Render AutomationForm
  - Handle Save: validate all steps, submit to API, redirect on success
  - Handle Cancel: show confirmation if data entered
  - Check `AUTOMATION_CREATE` permission
  - Document component
  - _Requirements: Req 10, 17_

- [ ] **Task 4.6.2: Test AutomationCreatePage functionality**
  - Test form submission creates automation
  - Test redirect to detail page on success
  - Test error handling on API failure
  - Test cancel confirmation
  - Test permission check disables save
  - _Requirements: Req 10, 17_

### 4.7 Automation Edit Page

- [ ] **Task 4.7.1: Create AutomationEditPage component**
  - Create file: `apps/frontend/src/pages/AutomationEditPage.tsx`
  - Use `useParams` to get automation ID
  - Use `useAutomation` hook to fetch existing automation
  - Use `useUpdateAutomation` mutation
  - Pre-populate AutomationForm with existing data
  - Render same form as create page
  - Check `AUTOMATION_UPDATE` permission
  - Document component
  - _Requirements: Req 10, 12, 17_

- [ ] **Task 4.7.2: Test AutomationEditPage functionality**
  - Test automation data loads and populates form
  - Test Save updates automation
  - Test permission check makes form read-only
  - _Requirements: Req 12, 17_

### 4.8 Automation Detail Page

- [ ] **Task 4.8.1: Create AutomationStats component**
  - Create file: `apps/frontend/src/components/automations/AutomationStats.tsx`
  - Props: `automation`
  - Display statistics: total runs, success count, failure count, success rate (percentage), average duration
  - Render charts using recharts: success rate pie chart, run count over time line chart
  - Document component
  - _Requirements: Req 12_

- [ ] **Task 4.8.2: Create AutomationExecutionHistory component**
  - Create file: `apps/frontend/src/components/automations/AutomationExecutionHistory.tsx`
  - Props: `automationId`
  - Fetch execution history from API
  - Display table with columns: execution ID, triggered by (cron/webhook/manual), start time, status, duration, "View Details"
  - Add pagination for > 20 executions
  - Auto-refresh every 30 seconds
  - Document component
  - _Requirements: Req 12_

- [ ] **Task 4.8.3: Create AutomationDetailPage component**
  - Create file: `apps/frontend/src/pages/AutomationDetailPage.tsx`
  - Use `useParams` to get automation ID
  - Use `useAutomation` hook
  - Render Breadcrumbs (Automations > {Automation Name})
  - Render PageHeader with action buttons: Edit, Delete, Execute Now, Reschedule (for cron)
  - Display metadata section: description, workflow link, trigger config, enabled status, next run time
  - Render AutomationStats
  - Render AutomationExecutionHistory
  - Display trigger-specific details: cron expression + next 5 runs (for cron), webhook URL with copy button + example curl (for webhook)
  - Show warning banner if recent failures exist
  - Check `AUTOMATION_READ` permission
  - Document component
  - _Requirements: Req 12, 17_

- [ ] **Task 4.8.4: Implement Execute Now action**
  - Use `useExecuteAutomation` mutation
  - Show confirmation dialog
  - Display success toast on execution
  - Refresh execution history
  - _Requirements: Req 12_

- [ ] **Task 4.8.5: Implement Reschedule action**
  - Show dialog with CronBuilder pre-populated with current schedule
  - Use `useRescheduleAutomation` mutation
  - Update next run time on success
  - _Requirements: Req 12_

- [ ] **Task 4.8.6: Test AutomationDetailPage functionality**
  - Test automation details load correctly
  - Test Edit button navigates to edit page
  - Test Delete shows confirmation and deletes
  - Test Execute Now triggers execution
  - Test Reschedule updates schedule
  - Test toggle enabled/disabled
  - Test execution history displays and refreshes
  - Test statistics display correctly
  - Test 403 error for users without permission
  - _Requirements: Req 12, 17_

---

## PHASE 5: REAL-TIME MONITORING & WEBSOCKET

### 5.1 WebSocket Client Service

- [ ] **Task 5.1.1: Create WebSocketClient class**
  - Create file: `apps/frontend/src/services/websocket/WebSocketClient.ts`
  - Implement singleton pattern
  - Connect to `/ws` endpoint
  - Implement auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s max)
  - Subscribe to `workflow-events` channel on connection
  - Parse incoming WebSocket messages
  - Emit events to registered listeners
  - Document class with JSDoc
  - _Requirements: Req 13_

- [ ] **Task 5.1.2: Implement connection lifecycle methods**
  - In WebSocketClient class
  - Methods: `connect()`, `disconnect()`, `subscribe(channel)`, `unsubscribe(channel)`, `send(message)`
  - Track connection state: connecting, connected, disconnected, reconnecting
  - Handle connection errors
  - _Requirements: Req 13_

- [ ] **Task 5.1.3: Implement event listeners**
  - In WebSocketClient class
  - Methods: `on(eventType, handler)`, `off(eventType, handler)`, `emit(eventType, data)`
  - Support event types: `workflow:started`, `workflow:completed`, `workflow:error`, `node:started`, `node:completed`, `node:error`
  - _Requirements: Req 13_

- [ ] **Task 5.1.4: Test WebSocket connection**
  - Test connection establishes on initialization
  - Test auto-reconnect after disconnection
  - Test subscription to workflow-events channel
  - Test message parsing
  - _Requirements: Req 13_

### 5.2 WebSocket State Management

- [ ] **Task 5.2.1: Create WebSocket Zustand store**
  - Create file: `apps/frontend/src/stores/useWebSocketStore.ts`
  - Store state: connectionStatus, activeExecutions (map of executionId -> execution data), eventLog (array of events)
  - Actions: `setConnectionStatus`, `addExecution`, `updateExecution`, `removeExecution`, `addEvent`, `clearEvents`
  - Document store
  - _Requirements: Req 13_

- [ ] **Task 5.2.2: Create useWebSocket hook**
  - Create file: `apps/frontend/src/hooks/api/useWebSocket.ts`
  - Initialize WebSocketClient on mount
  - Subscribe to store updates
  - Register event listeners to update store
  - Return connection status and control methods
  - Clean up on unmount
  - Document hook
  - _Requirements: Req 13_

### 5.3 Real-time Monitoring Components

- [ ] **Task 5.3.1: Create WebSocketStatus component**
  - Create file: `apps/frontend/src/components/monitoring/WebSocketStatus.tsx`
  - Display connection indicator: Connected (green dot), Disconnected (red dot), Reconnecting (yellow dot with spinner)
  - Show tooltip with connection details
  - Use useWebSocketStore
  - Document component
  - _Requirements: Req 13_

- [ ] **Task 5.3.2: Create ExecutionCard component for monitoring**
  - Create file: `apps/frontend/src/components/executions/ExecutionCard.tsx`
  - Props: `execution` (from WebSocket updates)
  - Display: workflow ID, workflow name, current node, progress bar, elapsed time, status
  - Show real-time node execution flow
  - Expandable to show detailed event log
  - Document component
  - _Requirements: Req 13_

- [ ] **Task 5.3.3: Create EventLog component**
  - Create file: `apps/frontend/src/components/monitoring/EventLog.tsx`
  - Props: `events`, `filters`
  - Display scrollable list of events with timestamps
  - Event types: workflow started/completed/error, node started/completed/error
  - Add filters: show only errors, show only completed, filter by workflow
  - Auto-scroll to bottom on new events (with option to pause)
  - Document component
  - _Requirements: Req 13_

- [ ] **Task 5.3.4: Create RealtimeMonitor component**
  - Create file: `apps/frontend/src/components/monitoring/RealtimeMonitor.tsx`
  - Use useWebSocketStore to get activeExecutions
  - Render list of ExecutionCard components
  - Show empty state when no active executions
  - Document component
  - _Requirements: Req 13_

- [ ] **Task 5.3.5: Create NodeExecutionFlow component**
  - Create file: `apps/frontend/src/components/monitoring/NodeExecutionFlow.tsx`
  - Props: `execution`
  - Display visual flow of node execution progress
  - Show completed nodes (green checkmark), current node (blue spinner), pending nodes (gray), failed nodes (red X)
  - Document component
  - _Requirements: Req 13_

### 5.4 Monitoring Page

- [ ] **Task 5.4.1: Create MonitoringPage component**
  - Create file: `apps/frontend/src/pages/MonitoringPage.tsx`
  - Use `useWebSocket` hook
  - Render PageHeader with "Real-time Monitoring" title
  - Render WebSocketStatus indicator
  - Render RealtimeMonitor for active executions
  - Render EventLog with filtering
  - Handle WebSocket connection errors with banner
  - Document component
  - _Requirements: Req 13_

- [ ] **Task 5.4.2: Test MonitoringPage functionality**
  - Test WebSocket connection establishes
  - Test active executions appear in real-time
  - Test event log updates with new events
  - Test filters work correctly
  - Test disconnection shows error banner
  - Test auto-reconnect attempts
  - _Requirements: Req 13_

### 5.5 WebSocket Integration in Other Views

- [ ] **Task 5.5.1: Integrate real-time updates in WorkflowExecutionPanel**
  - Update WorkflowExecutionPanel component
  - Listen for workflow events matching current execution
  - Update progress bar and node status in real-time
  - Show live node execution progress
  - _Requirements: Req 7, 13_

- [ ] **Task 5.5.2: Integrate real-time updates in AutomationExecutionHistory**
  - Update AutomationExecutionHistory component
  - Listen for new automation executions
  - Prepend new executions to the list automatically
  - Show toast notification for new executions
  - _Requirements: Req 12, 13_

- [ ] **Task 5.5.3: Add WebSocketStatus to Header**
  - Update Header component
  - Add WebSocketStatus indicator in top-right
  - Always visible across all pages
  - _Requirements: Req 13_

---

## PHASE 6: EXECUTION HISTORY & STATE INSPECTION

### 6.1 Execution API Service Layer

- [ ] **Task 6.1.1: Create executions API service**
  - Create file: `apps/frontend/src/services/api/executions.api.ts`
  - Implement functions: `fetchExecutions(filters?)`, `fetchExecution(id)`, `fetchExecutionsByWorkflow(workflowId)`, `fetchExecutionsByAutomation(automationId)`, `rerunExecution(id)`, `exportExecution(id)`
  - Document functions
  - _Requirements: Req 8, 12, 14_

- [ ] **Task 6.1.2: Create useExecutions React Query hook**
  - Create file: `apps/frontend/src/hooks/api/useExecutions.ts`
  - Implement hook: `useExecutions(filters?)` - returns executions list query
  - Support filters: status, workflowId, dateRange
  - _Requirements: Req 14_

- [ ] **Task 6.1.3: Create useExecution hook**
  - In `apps/frontend/src/hooks/api/useExecutions.ts`
  - Implement hook: `useExecution(id)` - returns single execution query
  - _Requirements: Req 14_

- [ ] **Task 6.1.4: Create useRerunExecution mutation hook**
  - In `apps/frontend/src/hooks/api/useExecutions.ts`
  - Implement mutation for re-running executions
  - _Requirements: Req 14_

### 6.2 Execution Display Components

- [ ] **Task 6.2.1: Create ExecutionTimeline component**
  - Create file: `apps/frontend/src/components/executions/ExecutionTimeline.tsx`
  - Props: `execution`
  - Display vertical timeline of node executions
  - Each timeline item shows: node ID, node type, start time, duration, status
  - Expandable to show inputs/outputs/state changes
  - Document component
  - _Requirements: Req 14_

- [ ] **Task 6.2.2: Create ExecutionDetails component**
  - Create file: `apps/frontend/src/components/executions/ExecutionDetails.tsx`
  - Props: `execution`
  - Display metadata: execution ID (with copy button), workflow name (link), start/end times, duration, status
  - Display initial state as formatted JSON tree
  - Display final state as formatted JSON tree
  - Add "Compare States" button to show diff
  - Document component
  - _Requirements: Req 14_

- [ ] **Task 6.2.3: Create ExecutionStateViewer component**
  - Create file: `apps/frontend/src/components/executions/ExecutionStateViewer.tsx`
  - Props: `state` (JSON object)
  - Render JSON as expandable tree view
  - Support expand/collapse all
  - Syntax highlighting for values
  - Add "Copy JSON" button
  - Document component
  - _Requirements: Req 14_

- [ ] **Task 6.2.4: Create state diff viewer**
  - Add dialog component with Monaco diff editor
  - Show initial state (left) vs. final state (right)
  - Highlight additions (green) and deletions (red)
  - _Requirements: Req 14, 20_

### 6.3 Executions Page

- [ ] **Task 6.3.1: Create ExecutionsPage component**
  - Create file: `apps/frontend/src/pages/ExecutionsPage.tsx`
  - Use `useExecutions` hook with filter state
  - Implement filters: status (all/pending/running/completed/failed), workflow (dropdown), date range
  - Render PageHeader with "Execution History" title
  - Render filter controls
  - Render ExecutionList using DataTable
  - Add pagination for > 20 executions
  - Add column sorting (by start time, duration, status)
  - Document component
  - _Requirements: Req 14_

- [ ] **Task 6.3.2: Test ExecutionsPage functionality**
  - Test executions load and display
  - Test status filter
  - Test workflow filter
  - Test date range filter
  - Test pagination
  - Test column sorting
  - Test empty state
  - _Requirements: Req 14_

### 6.4 Execution Detail Page

- [ ] **Task 6.4.1: Create ExecutionDetailPage component**
  - Create file: `apps/frontend/src/pages/ExecutionDetailPage.tsx`
  - Use `useParams` to get execution ID
  - Use `useExecution` hook
  - Render PageHeader with action buttons: Re-run, Export, Compare States
  - Render ExecutionDetails
  - Render ExecutionTimeline
  - If execution failed: render error section with message, stack trace, failed node, state at failure, suggested resolution
  - If execution is still running: show live updates via WebSocket
  - Document component
  - _Requirements: Req 14_

- [ ] **Task 6.4.2: Implement Re-run functionality**
  - Add confirmation dialog
  - Use `useRerunExecution` mutation
  - Execute with same initial state
  - Redirect to new execution on success
  - _Requirements: Req 14_

- [ ] **Task 6.4.3: Implement Export functionality**
  - Generate JSON file with complete execution data
  - Download file with filename: `execution-{executionId}.json`
  - _Requirements: Req 14_

- [ ] **Task 6.4.4: Test ExecutionDetailPage functionality**
  - Test execution details load correctly
  - Test timeline displays node executions
  - Test state viewer displays JSON correctly
  - Test Compare States shows diff
  - Test error section for failed executions
  - Test Re-run creates new execution
  - Test Export downloads JSON file
  - Test live updates for running executions
  - _Requirements: Req 14_

---

## PHASE 7: DASHBOARD & POLISH

### 7.1 Dashboard Components

- [ ] **Task 7.1.1: Create StatCard component**
  - Create file: `apps/frontend/src/components/dashboard/StatCard.tsx`
  - Props: `title`, `value`, `subtitle`, `icon`, `trend` (optional), `link`
  - Display statistic with large number, subtitle, icon, optional trend indicator
  - Make entire card clickable to navigate to link
  - Use shadcn/ui Card
  - Document component
  - _Requirements: Req 15_

- [ ] **Task 7.1.2: Create RecentExecutions component**
  - Create file: `apps/frontend/src/components/dashboard/RecentExecutions.tsx`
  - Display table of last 10 executions
  - Columns: workflow name, start time, status, duration
  - Add "View All" link to executions page
  - Document component
  - _Requirements: Req 15_

- [ ] **Task 7.1.3: Create AutomationStatusOverview component**
  - Create file: `apps/frontend/src/components/dashboard/AutomationStatusOverview.tsx`
  - Display pie chart: enabled vs. disabled automations
  - Display success vs. failure rates
  - Use recharts for visualization
  - Add hover tooltips with exact counts
  - Document component
  - _Requirements: Req 15_

- [ ] **Task 7.1.4: Create QuickActions component**
  - Create file: `apps/frontend/src/components/dashboard/QuickActions.tsx`
  - Render action buttons: Create New Workflow, Create New Automation, View Monitoring, Browse Nodes
  - Use shadcn/ui Button with icons
  - Navigate to respective pages on click
  - Document component
  - _Requirements: Req 15_

### 7.2 Dashboard Page

- [ ] **Task 7.2.1: Create DashboardPage component**
  - Create file: `apps/frontend/src/pages/DashboardPage.tsx`
  - Fetch summary statistics from multiple APIs concurrently
  - Render PageHeader with "Dashboard" title
  - Render 4 StatCards: Total Workflows (count + link), Total Automations (count + breakdown + link), Recent Executions (count last 24h + success rate + link), Active Jobs (running count + link)
  - Render RecentExecutions
  - Render AutomationStatusOverview
  - Render QuickActions
  - Add "System Health" section: WebSocket status, active automations count, scheduled jobs in next 24h, last execution time
  - Auto-refresh statistics every 60 seconds
  - Handle loading states with skeletons
  - Handle individual section errors gracefully
  - Check permissions to hide unavailable sections
  - Document component
  - _Requirements: Req 15, 17_

- [ ] **Task 7.2.2: Test DashboardPage functionality**
  - Test statistics load and display correctly
  - Test StatCard navigation works
  - Test charts render correctly
  - Test quick actions navigate correctly
  - Test auto-refresh updates data
  - Test error handling for individual sections
  - Test permission-based section visibility
  - _Requirements: Req 15, 17_

### 7.3 Pagination Implementation

- [ ] **Task 7.3.1: Create usePagination hook**
  - Create file: `apps/frontend/src/hooks/usePagination.ts`
  - Manage pagination state: currentPage, pageSize, totalItems
  - Calculate: totalPages, hasNextPage, hasPreviousPage
  - Provide methods: nextPage, previousPage, goToPage, setPageSize
  - Document hook
  - _Requirements: Req 1, 4, 9, 14_

- [ ] **Task 7.3.2: Add pagination to NodesPage**
  - Update NodesPage to use usePagination hook
  - Render shadcn/ui Pagination component
  - Default page size: 20 nodes
  - _Requirements: Req 1_

- [ ] **Task 7.3.3: Add pagination to WorkflowsPage**
  - Update WorkflowsPage to use usePagination hook
  - Default page size: 20 workflows
  - _Requirements: Req 4_

- [ ] **Task 7.3.4: Add pagination to AutomationsPage**
  - Update AutomationsPage to use usePagination hook
  - Default page size: 20 automations
  - _Requirements: Req 9_

- [ ] **Task 7.3.5: Add pagination to ExecutionsPage**
  - Update ExecutionsPage to use usePagination hook
  - Default page size: 20 executions
  - _Requirements: Req 14_

- [ ] **Task 7.3.6: Optimize pagination for mobile**
  - Update Pagination component for mobile: show prev/next buttons, current page number, hide full page list
  - _Requirements: Req 18_

### 7.4 UI Polish and Enhancements

- [ ] **Task 7.4.1: Add toast notifications for all mutations**
  - Review all mutation hooks (create, update, delete, toggle, execute)
  - Ensure success toasts appear for all successful operations
  - Ensure error toasts appear for all failed operations
  - Use sonner for toast notifications
  - _Requirements: Req 19_

- [ ] **Task 7.4.2: Add loading states to all async actions**
  - Review all buttons that trigger async operations
  - Add loading spinner to button when operation is pending
  - Disable button during operation
  - _Requirements: Req 19_

- [ ] **Task 7.4.3: Implement optimistic updates for toggles**
  - Update useToggleAutomation mutation
  - Optimistically update UI before API response
  - Revert on error
  - _Requirements: Req 9, 12_

- [ ] **Task 7.4.4: Add confirmation dialogs for all destructive actions**
  - Review all delete operations
  - Ensure ConfirmDialog appears with descriptive message
  - Customize confirm button text ("Delete", "Yes, delete", etc.)
  - _Requirements: Req 4, 6, 9, 12_

- [ ] **Task 7.4.5: Add keyboard shortcuts**
  - Implement global keyboard shortcuts: Cmd/Ctrl+K for command palette (future), Cmd/Ctrl+S for save (in editors), Esc to close dialogs
  - Document shortcuts in a help modal
  - _Requirements: Req 20 (Monaco), UX enhancement_

- [ ] **Task 7.4.6: Implement dark/light mode toggle**
  - Add theme toggle to Header user menu
  - Persist preference in localStorage
  - Update Monaco editor theme on toggle
  - _Requirements: Req 20, UX enhancement_

- [ ] **Task 7.4.7: Add copy-to-clipboard functionality**
  - Add copy buttons for: execution IDs, workflow IDs, automation IDs, webhook URLs, code snippets
  - Show toast notification "Copied to clipboard" on success
  - _Requirements: Req 2, 12, 19_

### 7.5 Responsive Design Testing

- [ ] **Task 7.5.1: Test mobile layout (320px - 767px)**
  - Test all pages on mobile viewport
  - Verify sidebar collapses to hamburger menu
  - Verify tables transform to card layouts
  - Verify forms are touch-friendly
  - Verify Monaco editor is usable
  - Fix any layout issues
  - _Requirements: Req 18_

- [ ] **Task 7.5.2: Test tablet layout (768px - 1023px)**
  - Test all pages on tablet viewport
  - Verify layouts adapt appropriately
  - Verify charts scale correctly
  - Fix any layout issues
  - _Requirements: Req 18_

- [ ] **Task 7.5.3: Test desktop layout (1024px+)**
  - Test all pages on desktop viewport
  - Verify full sidebar is visible
  - Verify optimal use of horizontal space
  - Fix any layout issues
  - _Requirements: Req 18_

- [ ] **Task 7.5.4: Test touch interactions**
  - Test on touch device (iPad, phone)
  - Verify swipe gestures work (if implemented)
  - Verify touch targets are at least 44px
  - Verify hover states don't cause issues
  - _Requirements: Req 18_

### 7.6 Code Documentation

- [ ] **Task 7.6.1: Add JSDoc to all components**
  - Review all component files
  - Add JSDoc comments with: component description, props explanation, usage examples, any special notes
  - Ensure consistency across all files
  - _Requirements: All requirements (code quality)_

- [ ] **Task 7.6.2: Add JSDoc to all hooks**
  - Review all hook files
  - Add JSDoc comments with: hook description, parameters, return values, usage examples
  - _Requirements: All requirements (code quality)_

- [ ] **Task 7.6.3: Add JSDoc to all services**
  - Review all API service files
  - Add JSDoc comments with: function description, parameters, return types, error handling
  - _Requirements: All requirements (code quality)_

- [ ] **Task 7.6.4: Add inline comments for complex logic**
  - Review all complex functions (validation, state management, WebSocket handling)
  - Add inline comments explaining non-obvious logic
  - _Requirements: All requirements (code quality)_

---

## PHASE 8: TESTING & QUALITY ASSURANCE

### 8.1 End-to-End User Flow Testing

- [ ] **Task 8.1.1: Test workflow creation flow**
  - Login as user with WORKFLOW_CREATE permission
  - Navigate to workflows page
  - Click "Create Workflow"
  - Fill in form with valid data
  - Validate workflow
  - Save workflow
  - Verify redirect to workflow detail page
  - Verify workflow appears in list
  - _Requirements: Req 5, 17_

- [ ] **Task 8.1.2: Test workflow execution flow**
  - Open workflow detail page
  - Enter initial state
  - Click "Run Workflow"
  - Verify execution starts
  - Wait for completion
  - Verify results display correctly
  - Click "View Full Execution"
  - Verify execution detail page shows complete data
  - _Requirements: Req 7, 14_

- [ ] **Task 8.1.3: Test automation creation flow**
  - Navigate to automations page
  - Click "Create Automation"
  - Complete Step 1: enter name and description
  - Complete Step 2: select workflow
  - Complete Step 3: configure cron trigger with visual builder
  - Complete Step 4: review and enable
  - Save automation
  - Verify redirect to automation detail page
  - Verify automation appears in list
  - _Requirements: Req 10, 11_

- [ ] **Task 8.1.4: Test automation execution monitoring**
  - Open automation detail page
  - Click "Execute Now"
  - Navigate to monitoring page
  - Verify execution appears in real-time monitor
  - Wait for completion
  - Verify execution history updates
  - _Requirements: Req 12, 13_

- [ ] **Task 8.1.5: Test node discovery and testing**
  - Navigate to nodes page
  - Search for specific node
  - Click on node card
  - Verify node details display
  - Enter test configuration
  - Run test
  - Verify test results display
  - _Requirements: Req 1, 2, 3_

### 8.2 Permission-based Testing

- [ ] **Task 8.2.1: Test workflow permissions**
  - Login as user with WORKFLOW_READ only (no CREATE/UPDATE/DELETE/EXECUTE)
  - Verify "Create Workflow" button is hidden
  - Open workflow detail page
  - Verify "Edit" and "Delete" buttons are hidden
  - Verify "Run Workflow" section is hidden or disabled
  - _Requirements: Req 17_

- [ ] **Task 8.2.2: Test automation permissions**
  - Login as user with AUTOMATION_READ only
  - Verify "Create Automation" button is hidden
  - Open automation detail page
  - Verify "Edit", "Delete", "Execute Now" buttons are hidden
  - Verify toggle is disabled
  - _Requirements: Req 17_

- [ ] **Task 8.2.3: Test admin access**
  - Login as admin user
  - Verify all actions are available across all pages
  - _Requirements: Req 17_

### 8.3 Error Handling Testing

- [ ] **Task 8.3.1: Test network error handling**
  - Simulate network offline
  - Attempt to load any page
  - Verify error message displays: "Unable to connect to the server. Please check your internet connection."
  - Verify "Retry" button appears
  - Restore network
  - Click "Retry"
  - Verify data loads successfully
  - _Requirements: Req 19_

- [ ] **Task 8.3.2: Test API error handling**
  - Trigger 404 error (invalid resource ID)
  - Verify 404 error page displays
  - Trigger 500 error (server error simulation)
  - Verify error toast displays with appropriate message
  - _Requirements: Req 19_

- [ ] **Task 8.3.3: Test validation error handling**
  - Submit workflow form with empty name
  - Verify inline error appears below name field
  - Submit workflow with invalid JSON
  - Verify Monaco editor shows error markers
  - Submit automation with invalid cron expression
  - Verify cron validator shows error
  - _Requirements: Req 19_

- [ ] **Task 8.3.4: Test WebSocket error handling**
  - Disconnect WebSocket (simulate server down)
  - Verify status indicator shows "Disconnected"
  - Verify auto-reconnect attempts begin
  - Verify error banner appears after max retries
  - Restore WebSocket
  - Verify connection re-establishes
  - _Requirements: Req 13, 19_

### 8.4 Browser Compatibility Testing

- [ ] **Task 8.4.1: Test on Chrome**
  - Test all major user flows on Chrome (latest version)
  - Verify UI renders correctly
  - Verify all interactions work
  - Document any issues
  - _Requirements: Non-functional (Browser Support)_

- [ ] **Task 8.4.2: Test on Firefox**
  - Test all major user flows on Firefox (latest version)
  - Verify UI renders correctly
  - Verify all interactions work
  - Document any issues
  - _Requirements: Non-functional (Browser Support)_

- [ ] **Task 8.4.3: Test on Safari**
  - Test all major user flows on Safari (latest version)
  - Verify UI renders correctly
  - Verify all interactions work (especially WebSocket)
  - Document any issues
  - _Requirements: Non-functional (Browser Support)_

- [ ] **Task 8.4.4: Test on Edge**
  - Test all major user flows on Edge (latest version)
  - Verify UI renders correctly
  - Verify all interactions work
  - Document any issues
  - _Requirements: Non-functional (Browser Support)_

- [ ] **Task 8.4.5: Test on mobile browsers**
  - Test on iOS Safari (iPhone)
  - Test on Chrome Mobile (Android)
  - Verify responsive layout works
  - Verify touch interactions work
  - Document any issues
  - _Requirements: Non-functional (Browser Support), Req 18_

### 8.5 Performance Testing

- [ ] **Task 8.5.1: Measure initial page load time**
  - Use browser DevTools Performance tab
  - Measure time to interactive on dashboard
  - Verify < 3 seconds on standard broadband
  - Optimize if necessary (code splitting, lazy loading)
  - _Requirements: Non-functional (Performance)_

- [ ] **Task 8.5.2: Measure route transition time**
  - Measure time between route navigation and page render
  - Verify < 300ms for most transitions
  - Optimize if necessary
  - _Requirements: Non-functional (Performance)_

- [ ] **Task 8.5.3: Test Monaco editor performance**
  - Load large workflow JSON (5000+ lines)
  - Type and edit content
  - Verify no lag or freezing
  - Optimize if necessary
  - _Requirements: Non-functional (Performance), Req 20_

- [ ] **Task 8.5.4: Test list rendering performance**
  - Load page with 1000+ items
  - Verify smooth scrolling
  - Verify virtualization works correctly
  - Optimize if necessary
  - _Requirements: Non-functional (Performance)_

### 8.6 Accessibility Testing

- [ ] **Task 8.6.1: Test keyboard navigation**
  - Navigate entire app using only keyboard (Tab, Enter, Esc, Arrow keys)
  - Verify all interactive elements are reachable
  - Verify focus indicators are visible
  - Verify modals trap focus correctly
  - _Requirements: Non-functional (Accessibility)_

- [ ] **Task 8.6.2: Test with screen reader**
  - Use VoiceOver (macOS) or NVDA (Windows)
  - Navigate through major pages
  - Verify all content is announced correctly
  - Verify form labels are associated
  - Verify error messages are announced
  - _Requirements: Non-functional (Accessibility)_

- [ ] **Task 8.6.3: Test color contrast**
  - Use browser extension (e.g., axe DevTools)
  - Check color contrast ratios on all pages
  - Verify WCAG 2.1 AA compliance (4.5:1 for normal text)
  - Fix any failures
  - _Requirements: Non-functional (Accessibility)_

---

## PHASE 9: FINAL VERIFICATION & DEPLOYMENT READINESS

### 9.1 Build & Deploy Readiness

- [ ] **Task 9.1.1: Test production build**
  - Run: `cd apps/frontend && bun run build`
  - Verify build completes without errors
  - Check bundle size (should be < 1MB gzipped)
  - Test built application with local server
  - _Requirements: Non-functional (Performance)_

- [ ] **Task 9.1.2: Verify environment variables**
  - Create `.env.production` file
  - Document all required environment variables: `VITE_API_BASE_URL`, `VITE_WS_URL`, etc.
  - Verify app reads env vars correctly
  - _Requirements: Setup_

- [ ] **Task 9.1.3: Test code splitting**
  - Verify lazy loading is working for routes
  - Check network tab for chunk loading
  - Verify chunks are appropriately sized
  - _Requirements: Non-functional (Performance)_

- [ ] **Task 9.1.4: Run TypeScript type checking**
  - Run: `cd apps/frontend && bunx tsc --noEmit`
  - Verify no TypeScript errors
  - Fix any errors found
  - _Requirements: Non-functional (Code Quality)_

- [ ] **Task 9.1.5: Run ESLint**
  - Run: `cd apps/frontend && bun run lint`
  - Verify no linting errors or warnings
  - Fix any issues found
  - _Requirements: Non-functional (Code Quality)_

### 9.2 Final Acceptance Testing

- [ ] **Task 9.2.1: Review all 20 requirements**
  - Go through each requirement in requirements.md
  - Verify all acceptance criteria are met
  - Document any deviations or limitations
  - _Requirements: All_

- [ ] **Task 9.2.2: Verify all API endpoints are integrated**
  - Cross-reference backend API docs with frontend API services
  - Verify all endpoints are called correctly
  - Verify all request/response types match
  - _Requirements: All API-related requirements_

- [ ] **Task 9.2.3: Verify all shadcn/ui components are used correctly**
  - Review all component imports
  - Verify no external UI libraries are used (except Monaco, recharts)
  - Verify consistent styling across all pages
  - _Requirements: All UI requirements_

- [ ] **Task 9.2.4: Verify WebSocket integration is stable**
  - Test WebSocket connection over extended period (30+ minutes)
  - Verify auto-reconnect works reliably
  - Verify no memory leaks from event listeners
  - _Requirements: Req 13_

- [ ] **Task 9.2.5: Verify responsive design on all breakpoints**
  - Test all pages at: 320px, 375px, 768px, 1024px, 1440px, 1920px
  - Verify layouts adapt correctly at each breakpoint
  - Verify no horizontal scrolling on mobile
  - _Requirements: Req 18_

### 9.3 Documentation Review

- [ ] **Task 9.3.1: Review component documentation**
  - Verify all components have JSDoc comments
  - Verify prop descriptions are clear
  - Verify usage examples are provided
  - _Requirements: Non-functional (Code Quality)_

- [ ] **Task 9.3.2: Create component storybook (optional)**
  - Set up Storybook (if desired)
  - Create stories for key components
  - Document component variations
  - _Requirements: Optional enhancement_

- [ ] **Task 9.3.3: Update README with setup instructions**
  - Document how to install dependencies
  - Document how to run dev server
  - Document how to build for production
  - Document environment variables
  - _Requirements: Setup documentation_

### 9.4 Security Review

- [ ] **Task 9.4.1: Review authentication implementation**
  - Verify JWT tokens are stored securely
  - Verify tokens are not exposed in console logs
  - Verify token refresh works correctly
  - Verify logout clears all auth data
  - _Requirements: Req 16, Non-functional (Security)_

- [ ] **Task 9.4.2: Review XSS protection**
  - Verify all user input is escaped (React does this by default)
  - Verify dangerouslySetInnerHTML is not used
  - Verify external links use rel="noopener noreferrer"
  - _Requirements: Non-functional (Security)_

- [ ] **Task 9.4.3: Review sensitive data handling**
  - Verify webhook URLs are not exposed unnecessarily
  - Verify error messages don't leak sensitive info
  - Verify API keys are never displayed in UI
  - _Requirements: Non-functional (Security)_

---

## Summary

**Total Tasks:** 142 tasks organized across 9 phases

**Estimated Timeline:** 18-24 days

**Critical Path:**

1. **Phase 1: Foundation & Setup** (3-4 days)
   - Dependencies, components, API client, routing, auth

2. **Phase 2: Node Library Implementation** (2-3 days)
   - Node browsing, detail view, test runner

3. **Phase 3: Workflow Management** (5-6 days)
   - Workflow CRUD, Monaco editor, execution, detail views

4. **Phase 4: Automation Management** (5-6 days)
   - Automation CRUD, cron builder, execution management

5. **Phase 5: Real-time Monitoring & WebSocket** (3-4 days)
   - WebSocket client, real-time updates, monitoring dashboard

6. **Phase 6: Execution History & State Inspection** (2-3 days)
   - Execution views, state comparison, timeline

7. **Phase 7: Dashboard & Polish** (3-4 days)
   - Dashboard page, pagination, UI enhancements, responsive testing

8. **Phase 8: Testing & Quality Assurance** (2-3 days)
   - End-to-end testing, permission testing, error handling, browser compatibility

9. **Phase 9: Final Verification & Deployment Readiness** (1-2 days)
   - Build testing, documentation review, security review

**Key Milestones:**

- ✅ Phase 1 Complete: Foundation ready for feature development
- ✅ Phase 2 Complete: Node library fully functional
- ✅ Phase 3 Complete: Workflow management fully functional
- ✅ Phase 4 Complete: Automation management fully functional
- ✅ Phase 5 Complete: Real-time monitoring operational
- ✅ Phase 6 Complete: Execution history and debugging tools ready
- ✅ Phase 7 Complete: UI polish and responsive design complete
- ✅ Phase 8 Complete: All testing passed
- ✅ Phase 9 Complete: Production-ready build verified

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-18
**Status:** Ready for Implementation
