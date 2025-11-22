# Implementation Plan: Admin User Management UI

This document provides a concrete, actionable implementation plan for building the Admin User Management UI feature. Tasks are organized by phases and include checkboxes for tracking progress. Each task is designed to be completed in 15-30 minutes.

---

## PHASE 1: DATABASE SCHEMA & MIGRATIONS

### 1.1 Database Schema Updates

- [ ] **Task 1.1.1: Review existing users table schema**
  - Open `/apps/api/src/db/schema/auth.schema.ts`
  - Verify all required fields exist: `firstName`, `lastName`, `permissions` (JSON), `isActive`, `emailVerified`, `tenantId`
  - Confirm indexes are present: `users_email_idx`, `users_tenant_idx`, `users_is_active_idx`
  - _Requirements: 13_

- [ ] **Task 1.1.2: Add firstName and lastName fields if missing**
  - If `firstName` and `lastName` don't exist in schema, add them as nullable varchar(255)
  - Run `cd apps/api && bun run db:generate` to create migration
  - Run `cd apps/api && bun run db:push` to apply migration
  - _Requirements: 4_

- [ ] **Task 1.1.3: Create user_activity_logs table**
  - Create new file `/apps/api/src/db/schema/activity.schema.ts`
  - Define table with fields: `id` (CUID2), `userId` (foreign key), `eventType` (varchar), `eventData` (JSON), `ipAddress` (varchar), `userAgent` (text), `createdAt` (timestamp)
  - Add indexes on `userId` and `createdAt` for fast queries
  - Export schema from index file
  - _Requirements: 12_

- [ ] **Task 1.1.4: Generate and apply activity logs migration**
  - Run `cd apps/api && bun run db:generate`
  - Review generated migration file
  - Run `cd apps/api && bun run db:push` to apply
  - Verify table exists in database with `bun run db:studio`
  - _Requirements: 12_

---

## PHASE 2: BACKEND API - USER MANAGEMENT ENDPOINTS

### 2.1 User Management Routes Setup

- [ ] **Task 2.1.1: Create users routes file**
  - Create `/apps/api/src/routes/users.ts`
  - Import Hono and create new `Hono()` instance
  - Import authentication middleware from `/apps/api/src/shared-services/auth/middleware.ts`
  - Import database connection
  - _Requirements: 13_

- [ ] **Task 2.1.2: Add admin permission middleware**
  - Create middleware function `requireAdmin` that checks for `Permission.USER_MANAGE`
  - Use existing `requireAuth` middleware as base
  - Return 403 Forbidden if user doesn't have permission
  - Apply middleware to all routes in the file
  - _Requirements: 1, 13_

- [ ] **Task 2.1.3: Implement GET /api/users (list users)**
  - Create route handler for `GET /`
  - Extract query params: `page`, `pageSize`, `sortBy`, `sortOrder`, `role`, `status`, `verified`, `search`
  - Build database query with filters using Drizzle ORM
  - Add pagination logic (default 20 per page)
  - Add sorting logic (default: createdAt desc)
  - Exclude `passwordHash` from response
  - Return JSON with: `{ users: [], total: number, page: number, pageSize: number }`
  - _Requirements: 2, 13_

- [ ] **Task 2.1.4: Implement GET /api/users/:id (get single user)**
  - Create route handler for `GET /:id`
  - Query database for user by ID
  - Return 404 if user not found
  - Exclude `passwordHash` from response
  - Return user object with all fields
  - _Requirements: 6, 13_

- [ ] **Task 2.1.5: Implement POST /api/users (create user)**
  - Create route handler for `POST /`
  - Validate request body: email (required), password (required), firstName, lastName, role, permissions, tenantId, emailVerified
  - Hash password using bcrypt with 12 salt rounds
  - Check for duplicate email (return 409 Conflict)
  - Insert new user into database
  - Log activity: "user_created" event
  - Return created user (exclude passwordHash)
  - _Requirements: 3, 13, 18_

- [ ] **Task 2.1.6: Implement PUT /api/users/:id (update user)**
  - Create route handler for `PUT /:id`
  - Validate request body: email, firstName, lastName, role, permissions, tenantId, isActive
  - Check if user is updating their own role (prevent self-demotion)
  - Check if user exists (404 if not)
  - Update database record
  - Log activity: "profile_updated" event with changes
  - Return updated user
  - _Requirements: 4, 13_

- [ ] **Task 2.1.7: Implement DELETE /api/users/:id (soft delete)**
  - Create route handler for `DELETE /:id`
  - Check if user is trying to delete themselves (return 400)
  - Check if user is the last admin (return 400)
  - Set `isActive = false` instead of hard delete
  - Invalidate user's active sessions
  - Log activity: "user_deactivated" event
  - Return success message
  - _Requirements: 5, 13_

### 2.2 Additional User Management Endpoints

- [ ] **Task 2.2.1: Implement PATCH /api/users/:id/permissions**
  - Create route handler for `PATCH /:id/permissions`
  - Validate request body: `permissions` array
  - Update only the permissions field
  - Log activity: "permissions_updated" event with diff
  - Return updated user
  - _Requirements: 7, 13_

- [ ] **Task 2.2.2: Implement PATCH /api/users/:id/verify-email**
  - Create route handler for `PATCH /:id/verify-email`
  - Set `emailVerified = true`
  - Clear any pending verification tokens
  - Log activity: "email_verified" event with admin who verified
  - Return updated user
  - _Requirements: 9, 13_

- [ ] **Task 2.2.3: Implement PATCH /api/users/:id/status**
  - Create route handler for `PATCH /:id/status`
  - Toggle `isActive` field
  - Check if user is trying to deactivate themselves (prevent)
  - Check if deactivating last admin (prevent)
  - If deactivating, invalidate user sessions
  - Log activity: "user_activated" or "user_deactivated"
  - Return updated user
  - _Requirements: 8, 13_

- [ ] **Task 2.2.4: Implement GET /api/users/:id/activity**
  - Create route handler for `GET /:id/activity`
  - Extract query params: `page`, `pageSize` (default 10)
  - Query `user_activity_logs` table where `userId = :id`
  - Sort by `createdAt` descending
  - Paginate results
  - Return JSON: `{ activities: [], total: number, page: number }`
  - _Requirements: 6, 12, 13_

### 2.3 Activity Logging Service

- [ ] **Task 2.3.1: Create ActivityLogger service**
  - Create `/apps/api/src/shared-services/ActivityLogger.ts`
  - Implement singleton class with methods: `logLogin`, `logWorkflowExecuted`, `logProfileUpdate`, `logRoleChange`, `logPermissionsUpdate`, `logUserDeactivated`, `logUserActivated`
  - Each method should insert into `user_activity_logs` table
  - Include metadata: IP address from request, user agent
  - Export singleton instance
  - _Requirements: 12_

- [ ] **Task 2.3.2: Integrate ActivityLogger into auth routes**
  - Open `/apps/api/src/routes/auth.ts`
  - Import ActivityLogger
  - Add `ActivityLogger.logLogin()` call in successful login handler
  - Include userId, ipAddress, userAgent
  - _Requirements: 12_

- [ ] **Task 2.3.3: Integrate ActivityLogger into users routes**
  - Import ActivityLogger into `/apps/api/src/routes/users.ts`
  - Add logging calls to all user mutation endpoints (create, update, delete, toggle status, verify email, update permissions)
  - Include current admin's userId as `modifiedBy`
  - _Requirements: 12_

### 2.4 Backend Validation & Security

- [ ] **Task 2.4.1: Add validation middleware**
  - Create `/apps/api/src/routes/users.validation.ts`
  - Define Zod schemas for: createUserSchema, updateUserSchema, updatePermissionsSchema
  - Export validation middleware functions
  - _Requirements: 15, 18_

- [ ] **Task 2.4.2: Apply validation to all routes**
  - Import validation middleware into users routes
  - Apply appropriate schema validation to POST and PUT endpoints
  - Return 400 with detailed errors on validation failure
  - _Requirements: 15_

- [ ] **Task 2.4.3: Add rate limiting to user endpoints**
  - Install rate limiting library if not present: `bun add @hono/rate-limit`
  - Configure rate limiter: 100 requests per minute per IP
  - Apply to all user management routes
  - _Requirements: 18_

- [ ] **Task 2.4.4: Add self-modification prevention**
  - In PUT and DELETE handlers, check if `req.user.id === userId`
  - For role changes, return 400: "Cannot change your own role"
  - For deletion, return 400: "Cannot delete your own account"
  - For deactivation, return 400: "Cannot deactivate your own account"
  - _Requirements: 4, 5, 8_

- [ ] **Task 2.4.5: Add last admin protection**
  - Create helper function `isLastAdmin(userId)` that counts active admins
  - In DELETE and role change handlers, check if user is last admin
  - Return 400: "Cannot remove the last admin user" if true
  - _Requirements: 5, 8_

### 2.5 Register Routes in Main App

- [ ] **Task 2.5.1: Register users routes**
  - Open `/apps/api/src/index.ts` or main app file
  - Import users routes from `/apps/api/src/routes/users.ts`
  - Register with `app.route('/api/users', usersRoutes)`
  - _Requirements: 13_

- [ ] **Task 2.5.2: Test all endpoints with Postman/curl**
  - Test GET /api/users with filters, pagination, search
  - Test POST /api/users (create)
  - Test PUT /api/users/:id (update)
  - Test DELETE /api/users/:id (soft delete)
  - Test PATCH endpoints (permissions, status, verify-email)
  - Test GET /api/users/:id/activity
  - Verify 403 errors for non-admin users
  - _Requirements: 13_

---

## PHASE 3: FRONTEND DATA LAYER - REACT QUERY HOOKS

### 3.1 API Client Setup

- [ ] **Task 3.1.1: Create user types**
  - Open `/apps/frontend/src/types/auth.ts`
  - Verify User interface includes: `firstName`, `lastName`, `tenantId`
  - Add ActivityLog interface: `{ id, userId, eventType, eventData, ipAddress, userAgent, createdAt }`
  - Export types
  - _Requirements: 14_

- [ ] **Task 3.1.2: Create users API service**
  - Create `/apps/frontend/src/services/UsersService.ts`
  - Implement class methods: `getUsers(filters)`, `getUser(id)`, `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)`, `updatePermissions(id, permissions)`, `verifyEmail(id)`, `toggleStatus(id)`, `getUserActivity(id, pagination)`
  - Use existing axios instance from AuthService
  - Handle errors and return typed responses
  - _Requirements: 13, 14_

### 3.2 React Query Hooks

- [ ] **Task 3.2.1: Create useUsers hook**
  - Create `/apps/frontend/src/hooks/api/useUsers.ts`
  - Implement `useUsers(filters, pagination, sort)` using `useQuery`
  - Set query key: `['users', filters, pagination, sort]`
  - Set stale time to 5 minutes
  - Enable refetch on window focus
  - Return `{ data, isLoading, error, refetch }`
  - _Requirements: 2, 14_

- [ ] **Task 3.2.2: Create useUser hook**
  - In same file, implement `useUser(id)` using `useQuery`
  - Set query key: `['user', id]`
  - Return single user details
  - _Requirements: 6, 14_

- [ ] **Task 3.2.3: Create useCreateUser mutation**
  - Implement `useCreateUser()` using `useMutation`
  - On success, invalidate `['users']` query
  - Implement optimistic update: add new user to cached list
  - On error, rollback optimistic update
  - Return `{ mutate, isLoading, error }`
  - _Requirements: 3, 14_

- [ ] **Task 3.2.4: Create useUpdateUser mutation**
  - Implement `useUpdateUser()` using `useMutation`
  - On success, invalidate `['users']` and `['user', id]` queries
  - Implement optimistic update: update user in cached list
  - On error, rollback optimistic update
  - _Requirements: 4, 14_

- [ ] **Task 3.2.5: Create useDeleteUser mutation**
  - Implement `useDeleteUser()` using `useMutation`
  - On success, invalidate `['users']` query
  - Implement optimistic update: remove user from cached list
  - On error, rollback optimistic update
  - _Requirements: 5, 14_

- [ ] **Task 3.2.6: Create useUpdateUserPermissions mutation**
  - Implement `useUpdateUserPermissions()` using `useMutation`
  - On success, invalidate `['users']` and `['user', id]` queries
  - _Requirements: 7, 14_

- [ ] **Task 3.2.7: Create useVerifyUserEmail mutation**
  - Implement `useVerifyUserEmail()` using `useMutation`
  - On success, invalidate `['users']` and `['user', id]` queries
  - _Requirements: 9, 14_

- [ ] **Task 3.2.8: Create useToggleUserStatus mutation**
  - Implement `useToggleUserStatus()` using `useMutation`
  - On success, invalidate `['users']` and `['user', id]` queries
  - _Requirements: 8, 14_

- [ ] **Task 3.2.9: Create useUserActivity hook**
  - Implement `useUserActivity(id, pagination)` using `useQuery`
  - Set query key: `['user-activity', id, pagination]`
  - Return activity logs with pagination
  - _Requirements: 6, 12, 14_

- [ ] **Task 3.2.10: Export all hooks**
  - Export all hooks from `/apps/frontend/src/hooks/api/useUsers.ts`
  - Test imports in a test component
  - _Requirements: 14_

---

## PHASE 4: UI COMPONENTS - REUSABLE USER MANAGEMENT COMPONENTS

### 4.1 Permission Management Components

- [ ] **Task 4.1.1: Create PermissionSelector component**
  - Create `/apps/frontend/src/components/users/PermissionSelector.tsx`
  - Import Permission enum from types
  - Implement multi-select with categories: Workflow, Automation, User, API Key, System
  - Add section headers with "Select All" / "Select None" links
  - Add tooltips on hover with permission descriptions
  - Use shadcn Checkbox component
  - Accept props: `selectedPermissions`, `onChange`
  - _Requirements: 7_

- [ ] **Task 4.1.2: Style PermissionSelector**
  - Group permissions by category with visual separators
  - Use grid layout for checkboxes (2 columns on desktop, 1 on mobile)
  - Add hover effects and focus states
  - Make scrollable if many permissions (max height 400px)
  - _Requirements: 7, 11_

- [ ] **Task 4.1.3: Add permission descriptions**
  - Create constant object mapping Permission enum to user-friendly descriptions
  - Integrate with Tooltip component from shadcn
  - Test tooltip appears on hover
  - _Requirements: 7_

### 4.2 User Form Components

- [ ] **Task 4.2.1: Create CreateUserDialog component**
  - Create `/apps/frontend/src/components/users/CreateUserDialog.tsx`
  - Use shadcn Dialog component
  - Create form with react-hook-form and zod validation
  - Add fields: Email, Password, First Name, Last Name, Role (Select), Tenant ID, Permissions (use PermissionSelector), Email Verified (Checkbox)
  - Accept props: `trigger` (button element), `onSuccess` callback
  - _Requirements: 3_

- [ ] **Task 4.2.2: Add password generator to CreateUserDialog**
  - Add "Generate" button next to password field
  - Implement password generator: 12+ chars, mixed case, numbers, special chars
  - Add password strength indicator (Weak/Medium/Strong)
  - Add show/hide password toggle icon
  - Add copy-to-clipboard button
  - _Requirements: 3, 20_

- [ ] **Task 4.2.3: Add form validation to CreateUserDialog**
  - Define Zod schema: email (email format), password (min 8 chars), firstName, lastName, role (enum), permissions (array)
  - Integrate with react-hook-form
  - Display validation errors below each field
  - Disable submit button if form invalid
  - _Requirements: 3, 15_

- [ ] **Task 4.2.4: Integrate CreateUserDialog with API**
  - Import `useCreateUser` hook
  - Handle form submission with mutation
  - Show loading spinner on submit button during mutation
  - Display success toast on success
  - Display error toast on failure
  - Close dialog on success
  - _Requirements: 3, 19_

- [ ] **Task 4.2.5: Create EditUserDialog component**
  - Create `/apps/frontend/src/components/users/EditUserDialog.tsx`
  - Similar structure to CreateUserDialog but without password field
  - Pre-populate form with user data from props
  - Add "Active Status" toggle switch
  - Accept props: `user`, `open`, `onOpenChange`, `onSuccess`
  - _Requirements: 4_

- [ ] **Task 4.2.6: Add role change warnings to EditUserDialog**
  - Detect when role changes from/to admin
  - Show confirmation dialog: "Remove admin privileges?"
  - Prevent self-demotion (disable role field if editing own account)
  - _Requirements: 4_

- [ ] **Task 4.2.7: Integrate EditUserDialog with API**
  - Import `useUpdateUser` hook
  - Handle form submission with mutation
  - Implement optimistic updates
  - Display success/error toasts
  - _Requirements: 4, 19_

### 4.3 Confirmation Dialogs

- [ ] **Task 4.3.1: Create DeleteUserDialog component**
  - Create `/apps/frontend/src/components/users/DeleteUserDialog.tsx`
  - Use existing `ConfirmDialog` component from shared components
  - Display user email for confirmation
  - Add warning text about soft delete
  - Accept props: `user`, `open`, `onOpenChange`, `onConfirm`
  - _Requirements: 5_

- [ ] **Task 4.3.2: Integrate DeleteUserDialog with API**
  - Import `useDeleteUser` hook
  - Handle confirm action with mutation
  - Display success toast: "User deactivated successfully"
  - Display error toast on failure
  - _Requirements: 5, 19_

- [ ] **Task 4.3.3: Create VerifyEmailDialog component**
  - Create `/apps/frontend/src/components/users/VerifyEmailDialog.tsx`
  - Use ConfirmDialog with custom text
  - Message: "Manually verify email for [email]? This will bypass the email verification process."
  - Accept props: `user`, `open`, `onOpenChange`, `onConfirm`
  - _Requirements: 9_

- [ ] **Task 4.3.4: Integrate VerifyEmailDialog with API**
  - Import `useVerifyUserEmail` hook
  - Handle confirm action with mutation
  - Display success toast
  - _Requirements: 9, 19_

- [ ] **Task 4.3.5: Create ToggleStatusDialog component**
  - Create `/apps/frontend/src/components/users/ToggleStatusDialog.tsx`
  - Dynamic message based on current status
  - If active: "Deactivate [email]? The user will not be able to log in."
  - If inactive: "Activate [email]? The user will be able to log in again."
  - Accept props: `user`, `open`, `onOpenChange`, `onConfirm`
  - _Requirements: 8_

- [ ] **Task 4.3.6: Integrate ToggleStatusDialog with API**
  - Import `useToggleUserStatus` hook
  - Handle confirm action with mutation
  - Display appropriate toast based on action
  - _Requirements: 8, 19_

### 4.4 User Details Component

- [ ] **Task 4.4.1: Create UserDetailsSheet component**
  - Create `/apps/frontend/src/components/users/UserDetailsSheet.tsx`
  - Use shadcn Sheet component (slide-out from right)
  - Accept props: `userId`, `open`, `onOpenChange`
  - Fetch user details with `useUser(userId)` hook
  - Fetch activity with `useUserActivity(userId)` hook
  - _Requirements: 6_

- [ ] **Task 4.4.2: Build User Profile section**
  - Display avatar (generated from initials using shadcn Avatar)
  - Show full name, email, email verification badge
  - Use Card component for visual grouping
  - _Requirements: 6_

- [ ] **Task 4.4.3: Build Account Details section**
  - Display role badge, tenant ID, active status badge
  - Show created date (formatted with date-fns), last login (relative time), last updated
  - Use two-column layout on desktop, stack on mobile
  - _Requirements: 6_

- [ ] **Task 4.4.4: Build Permissions section**
  - Display all permissions as colored badges
  - Group by category with section headers
  - Use Badge component from shadcn
  - _Requirements: 6, 7_

- [ ] **Task 4.4.5: Build Activity Timeline section**
  - Create `/apps/frontend/src/components/users/UserActivityTimeline.tsx`
  - Display events in timeline format
  - Show event icon, description, timestamp (relative), metadata
  - Use Separator component between events
  - Add pagination if > 10 events
  - Show loading skeletons while fetching
  - Show empty state if no activity
  - _Requirements: 6, 12_

- [ ] **Task 4.4.6: Add quick action buttons to UserDetailsSheet**
  - Add button group at top: Edit, Delete, Toggle Status, Verify Email
  - Clicking buttons opens respective dialogs
  - Keep sheet open when dialogs open
  - _Requirements: 6_

### 4.5 User Table Component

- [ ] **Task 4.5.1: Create UserTable component**
  - Create `/apps/frontend/src/components/users/UserTable.tsx`
  - Use shadcn Table component
  - Define columns: Avatar, Email, Name, Role, Status, Email Verified, Tenant, Created Date, Last Login, Actions
  - Accept props: `users`, `isLoading`, `onEdit`, `onDelete`, `onViewDetails`, `onToggleStatus`, `onVerifyEmail`
  - _Requirements: 2_

- [ ] **Task 4.5.2: Add sortable column headers**
  - Make Email, Created Date, Last Login columns sortable
  - Add sort indicator icons (up/down arrows)
  - Handle sort state in parent component
  - _Requirements: 2_

- [ ] **Task 4.5.3: Add action dropdown to each row**
  - Use shadcn DropdownMenu component
  - Menu items: View Details, Edit, Verify Email, Toggle Status, Separator, Delete (destructive)
  - Disable "Verify Email" if already verified
  - Call appropriate callback props on click
  - _Requirements: 2_

- [ ] **Task 4.5.4: Add loading skeleton state**
  - Create skeleton rows using shadcn Skeleton component
  - Show 5 skeleton rows when `isLoading` is true
  - Match table structure
  - _Requirements: 2_

- [ ] **Task 4.5.5: Add empty states**
  - Use EmptyState component from shared components
  - Show "No users found" when filtered results are empty
  - Show "No users yet - Create your first user" when no users exist
  - Include "Create User" button in empty state
  - _Requirements: 2_

- [ ] **Task 4.5.6: Make table mobile responsive**
  - Wrap table in div with `overflow-x-auto` class
  - Make Actions column sticky on the right
  - Test horizontal scrolling on mobile
  - _Requirements: 11_

### 4.6 Filter and Search Components

- [ ] **Task 4.6.1: Create UserFilters component**
  - Create `/apps/frontend/src/components/users/UserFilters.tsx`
  - Add filter controls: Role (select), Status (select), Verification (select), Tenant (input)
  - Use shadcn Select component
  - Layout filters horizontally on desktop, stack on mobile
  - Add "Clear Filters" button
  - Accept props: `filters`, `onChange`
  - _Requirements: 2, 10_

- [ ] **Task 4.6.2: Style UserFilters for responsiveness**
  - Use Tailwind grid layout: `grid-cols-1 md:grid-cols-4`
  - Make selects full width on mobile
  - Add spacing between filters
  - _Requirements: 11_

- [ ] **Task 4.6.3: Integrate SearchInput component**
  - Use existing SearchInput component from shared components
  - Debounce search input (300ms)
  - Place above filters
  - Full width on mobile
  - _Requirements: 2_

---

## PHASE 5: ENHANCED USERS PAGE

### 5.1 Page Structure and Layout

- [ ] **Task 5.1.1: Update UsersPage component**
  - Open `/apps/frontend/src/pages/dashboard/UsersPage.tsx`
  - Import all user components (UserTable, UserFilters, CreateUserDialog, etc.)
  - Import all hooks from useUsers
  - Set up component state for filters, pagination, sort
  - _Requirements: 2_

- [ ] **Task 5.1.2: Set up data fetching**
  - Use `useUsers()` hook with filters, pagination, sort
  - Handle loading state
  - Handle error state
  - Set up automatic refetching
  - _Requirements: 2, 14_

- [ ] **Task 5.1.3: Build page header**
  - Use PageHeader component from shared components
  - Title: "User Management"
  - Description: "Manage users, roles, and permissions"
  - Add CreateUserDialog as action button in header
  - _Requirements: 2_

- [ ] **Task 5.1.4: Add search and filters section**
  - Place SearchInput component
  - Place UserFilters component below search
  - Connect to filter state
  - Update URL params when filters change
  - _Requirements: 2, 10_

- [ ] **Task 5.1.5: Add UserTable component**
  - Render UserTable with fetched users data
  - Pass loading state
  - Connect action callbacks to dialog state
  - _Requirements: 2_

- [ ] **Task 5.1.6: Add pagination**
  - Use MobilePagination component from shared components
  - Set page size to 20 users per page
  - Update page state on navigation
  - _Requirements: 2_

### 5.2 Dialog State Management

- [ ] **Task 5.2.1: Set up dialog state**
  - Create state for each dialog: `createDialogOpen`, `editDialogOpen`, `deleteDialogOpen`, `detailsSheetOpen`, `verifyDialogOpen`, `statusDialogOpen`
  - Create state for `selectedUser`
  - _Requirements: 3, 4, 5, 6, 8, 9_

- [ ] **Task 5.2.2: Connect table actions to dialogs**
  - Implement `handleEdit`: set selectedUser and open edit dialog
  - Implement `handleDelete`: set selectedUser and open delete dialog
  - Implement `handleViewDetails`: set selectedUser and open details sheet
  - Implement `handleToggleStatus`: set selectedUser and open status dialog
  - Implement `handleVerifyEmail`: set selectedUser and open verify dialog
  - _Requirements: 2_

- [ ] **Task 5.2.3: Render all dialogs**
  - Add CreateUserDialog to page
  - Add EditUserDialog (conditional on selectedUser)
  - Add DeleteUserDialog (conditional on selectedUser)
  - Add UserDetailsSheet (conditional on selectedUser)
  - Add VerifyEmailDialog (conditional on selectedUser)
  - Add ToggleStatusDialog (conditional on selectedUser)
  - _Requirements: 3, 4, 5, 6, 8, 9_

### 5.3 Filter and Search Logic

- [ ] **Task 5.3.1: Implement search handler**
  - Create debounced search handler (300ms delay)
  - Update search state
  - Reset pagination to page 1 on search
  - Update URL params
  - _Requirements: 2, 10_

- [ ] **Task 5.3.2: Implement filter handlers**
  - Create handler for role filter change
  - Create handler for status filter change
  - Create handler for verification filter change
  - Create handler for tenant filter change
  - Update filter state and reset pagination on filter change
  - Update URL params
  - _Requirements: 2, 10_

- [ ] **Task 5.3.3: Implement clear filters handler**
  - Reset all filter state to defaults
  - Clear search input
  - Reset pagination to page 1
  - Clear URL params
  - _Requirements: 2, 10_

- [ ] **Task 5.3.4: Implement sort handler**
  - Create handler for column header clicks
  - Toggle sort direction on same column
  - Update sort state
  - Update URL params
  - _Requirements: 2, 10_

### 5.4 URL State and Persistence

- [ ] **Task 5.4.1: Implement URL state sync**
  - Use React Router's `useSearchParams` hook
  - On component mount, read URL params and set initial state
  - On state change, update URL params
  - _Requirements: 10_

- [ ] **Task 5.4.2: Implement localStorage persistence**
  - On filter/search/sort change, save to localStorage
  - On component mount, restore from localStorage if URL params are empty
  - Use key: `userManagementFilters`
  - _Requirements: 10_

- [ ] **Task 5.4.3: Test shareable URLs**
  - Apply filters and copy URL
  - Open URL in new tab/incognito and verify filters are applied
  - Test all combinations of filters
  - _Requirements: 10_

### 5.5 Error Handling and Loading States

- [ ] **Task 5.5.1: Add error boundary**
  - Wrap page in ErrorBoundary component (already exists in routes)
  - Verify error boundary catches and displays errors
  - _Requirements: 15_

- [ ] **Task 5.5.2: Add query error handling**
  - Check `error` from useUsers hook
  - Display error message with retry button
  - Style error state with Alert component
  - _Requirements: 15_

- [ ] **Task 5.5.3: Add mutation error handling**
  - Handle mutation errors in each dialog component
  - Display error toasts with specific messages
  - Don't close dialogs on error
  - _Requirements: 15, 19_

- [ ] **Task 5.5.4: Add loading states**
  - Show skeleton loaders in table while loading
  - Show loading spinners in dialogs during mutations
  - Disable buttons during mutations
  - _Requirements: 2_

---

## PHASE 6: TOAST NOTIFICATIONS

### 6.1 Toast Integration

- [ ] **Task 6.1.1: Verify Sonner toast setup**
  - Check if Sonner is installed and configured in `/apps/frontend/src/App.tsx`
  - If not, install: `bunx shadcn@latest add sonner`
  - Add `<Toaster />` to App.tsx
  - _Requirements: 19_

- [ ] **Task 6.1.2: Create toast helper utilities**
  - Create `/apps/frontend/src/lib/toasts.ts`
  - Export functions: `showSuccessToast(message)`, `showErrorToast(message)`, `showWarningToast(message)`
  - Configure auto-dismiss (5 seconds)
  - Configure position (top-right on desktop, top on mobile)
  - _Requirements: 19_

- [ ] **Task 6.1.3: Add success toasts to mutations**
  - In CreateUserDialog: "User created successfully"
  - In EditUserDialog: "User updated successfully"
  - In DeleteUserDialog: "User deactivated successfully"
  - In VerifyEmailDialog: "Email verified successfully"
  - In ToggleStatusDialog: "User activated" / "User deactivated"
  - _Requirements: 19_

- [ ] **Task 6.1.4: Add error toasts to mutations**
  - On mutation error, show error toast with API error message
  - On network error: "Network error. Please check your connection."
  - On validation error: "Please fix the errors in the form"
  - _Requirements: 19_

- [ ] **Task 6.1.5: Test toast notifications**
  - Trigger all success scenarios and verify toasts appear
  - Trigger error scenarios and verify error toasts
  - Verify toasts auto-dismiss after 5 seconds
  - Verify toasts are dismissible via close button
  - Test toast stacking when multiple operations occur
  - _Requirements: 19_

---

## PHASE 7: ACCESSIBILITY IMPLEMENTATION

### 7.1 Keyboard Navigation

- [ ] **Task 7.1.1: Verify tab order**
  - Test keyboard navigation with Tab key through entire page
  - Ensure logical order: header → filters → search → table → pagination
  - Fix any issues with tab order using `tabIndex` if needed
  - _Requirements: 16_

- [ ] **Task 7.1.2: Add keyboard shortcuts to dialogs**
  - Verify Escape key closes all dialogs
  - Verify Enter key submits forms in dialogs
  - Test focus trap within dialogs
  - _Requirements: 16_

- [ ] **Task 7.1.3: Add focus indicators**
  - Verify all interactive elements show focus ring (default Tailwind)
  - Customize focus styles if needed for better visibility
  - Test with keyboard navigation
  - _Requirements: 16_

- [ ] **Task 7.1.4: Test focus management in dialogs**
  - When dialog opens, focus should move to first input
  - When dialog closes, focus should return to trigger button
  - Test with CreateUserDialog, EditUserDialog, etc.
  - _Requirements: 16_

### 7.2 ARIA Labels and Semantic HTML

- [ ] **Task 7.2.1: Add ARIA labels to form inputs**
  - Verify all inputs have associated `<label>` elements
  - Add aria-label to icon buttons (Edit, Delete, etc.)
  - Add aria-describedby to inputs with error messages
  - _Requirements: 16_

- [ ] **Task 7.2.2: Add ARIA labels to interactive elements**
  - Action dropdown button: "User actions menu"
  - Sort buttons: "Sort by email", "Sort by created date"
  - Pagination buttons: "Next page", "Previous page"
  - Filter selects: aria-label for each filter purpose
  - _Requirements: 16_

- [ ] **Task 7.2.3: Verify semantic table markup**
  - Ensure table uses `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
  - Add scope="col" to column headers
  - Verify shadcn Table component uses semantic markup
  - _Requirements: 16_

- [ ] **Task 7.2.4: Add ARIA live regions for dynamic updates**
  - Add aria-live="polite" to toast notification container
  - Add aria-live="polite" to table loading/error states
  - Test with screen reader to verify announcements
  - _Requirements: 16_

### 7.3 Screen Reader Testing

- [ ] **Task 7.3.1: Test with NVDA (Windows) or VoiceOver (Mac)**
  - Navigate entire page with screen reader
  - Verify all content is readable
  - Verify form labels are announced
  - Verify buttons announce their purpose
  - _Requirements: 16_

- [ ] **Task 7.3.2: Test table navigation with screen reader**
  - Verify table rows and cells are navigable
  - Verify column headers are announced
  - Verify action buttons in each row are announced
  - _Requirements: 16_

- [ ] **Task 7.3.3: Test dialogs with screen reader**
  - Verify dialog titles are announced
  - Verify form fields are announced with labels
  - Verify error messages are announced
  - _Requirements: 16_

### 7.4 Color Contrast and Visual Accessibility

- [ ] **Task 7.4.1: Check color contrast ratios**
  - Use browser devtools or WebAIM Contrast Checker
  - Verify all text meets 4.5:1 contrast ratio (WCAG AA)
  - Check badges (role, status) have sufficient contrast
  - Fix any issues by adjusting colors
  - _Requirements: 16_

- [ ] **Task 7.4.2: Verify status indicators use text labels**
  - Active/Inactive badges should have text, not just color
  - Verified/Unverified badges should have text
  - Role badges should have text
  - _Requirements: 16_

- [ ] **Task 7.4.3: Test with color blindness simulation**
  - Use browser extension or devtools to simulate color blindness
  - Verify all information is distinguishable
  - Make adjustments if needed
  - _Requirements: 16_

### 7.5 Touch Target Sizes

- [ ] **Task 7.5.1: Verify minimum touch target sizes**
  - All buttons should be at least 44x44px
  - Dropdown menu items should be at least 44px height
  - Action icons should have padding to meet 44px target
  - _Requirements: 11, 16_

- [ ] **Task 7.5.2: Test on actual mobile device**
  - Test all interactive elements on phone
  - Verify easy tapping without accidental clicks
  - Adjust spacing if needed
  - _Requirements: 11_

---

## PHASE 8: RESPONSIVE DESIGN REFINEMENT

### 8.1 Mobile Layout Testing

- [ ] **Task 8.1.1: Test layout at 320px width (iPhone SE)**
  - Verify page header displays correctly
  - Verify filters stack vertically
  - Verify table scrolls horizontally
  - Verify dialogs expand to full screen
  - _Requirements: 11_

- [ ] **Task 8.1.2: Test layout at 768px width (tablet)**
  - Verify filters display in grid layout
  - Verify table is readable without horizontal scroll
  - Verify dialogs are centered, not full screen
  - _Requirements: 11_

- [ ] **Task 8.1.3: Test layout at 1024px+ width (desktop)**
  - Verify all filters display horizontally
  - Verify table has ample spacing
  - Verify dialogs are comfortable size (not too wide)
  - _Requirements: 11_

- [ ] **Task 8.1.4: Test landscape orientation on mobile**
  - Rotate device to landscape
  - Verify layout adapts appropriately
  - Verify no horizontal overflow
  - _Requirements: 11_

### 8.2 Component Responsiveness

- [ ] **Task 8.2.1: Make UserFilters responsive**
  - Use grid with breakpoints: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - Full width selects on mobile
  - Adequate spacing between filters
  - _Requirements: 11_

- [ ] **Task 8.2.2: Make UserTable responsive**
  - Wrap in scrollable container on mobile
  - Sticky Actions column on right
  - Adequate row height for touch
  - _Requirements: 11_

- [ ] **Task 8.2.3: Make dialogs responsive**
  - CreateUserDialog: full screen on mobile, centered on desktop
  - EditUserDialog: full screen on mobile, centered on desktop
  - UserDetailsSheet: full screen on mobile, slide-in from right on desktop
  - _Requirements: 11_

- [ ] **Task 8.2.4: Make pagination responsive**
  - Use MobilePagination on small screens
  - Show full pagination controls on desktop
  - Test page navigation on mobile
  - _Requirements: 11_

### 8.3 Touch Gestures

- [ ] **Task 8.3.1: Test table horizontal scrolling**
  - Swipe table left/right on mobile
  - Verify smooth scrolling
  - Verify no interference with page scroll
  - _Requirements: 11_

- [ ] **Task 8.3.2: Test sheet slide gestures**
  - Swipe down to close UserDetailsSheet on mobile
  - Verify smooth animation
  - _Requirements: 11_

- [ ] **Task 8.3.3: Test dialog touch interactions**
  - Tap outside dialog to close (if enabled)
  - Tap close button
  - Scroll within dialog on mobile
  - _Requirements: 11_

---

## PHASE 9: PERFORMANCE OPTIMIZATION

### 9.1 React Performance

- [ ] **Task 9.1.1: Add React.memo to expensive components**
  - Wrap UserTable in React.memo
  - Wrap UserFilters in React.memo
  - Wrap PermissionSelector in React.memo
  - Test re-renders with React DevTools Profiler
  - _Requirements: 17_

- [ ] **Task 9.1.2: Optimize re-renders**
  - Use useCallback for event handlers passed as props
  - Use useMemo for expensive computations (filtering, sorting)
  - Verify optimizations with React DevTools
  - _Requirements: 17_

- [ ] **Task 9.1.3: Implement virtualization if needed**
  - If table has 100+ rows, consider using react-virtual or similar
  - Test rendering performance with large datasets
  - Implement if table lags
  - _Requirements: 17_

### 9.2 Network Performance

- [ ] **Task 9.2.1: Verify React Query caching**
  - Test that users data is cached for 5 minutes
  - Test that navigating away and back uses cache
  - Test that refetch on window focus works
  - _Requirements: 14, 17_

- [ ] **Task 9.2.2: Implement optimistic updates**
  - Verify create mutation optimistically adds user
  - Verify update mutation optimistically updates user
  - Verify delete mutation optimistically removes user
  - Test rollback on error
  - _Requirements: 14, 17_

- [ ] **Task 9.2.3: Add request debouncing**
  - Verify search input is debounced (300ms)
  - Test that typing doesn't trigger multiple API calls
  - _Requirements: 2, 17_

### 9.3 Bundle Size Optimization

- [ ] **Task 9.3.1: Verify code splitting**
  - Check that UsersPage is lazy-loaded (already exists in routes)
  - Verify user management code is in separate chunk
  - Use bundle analyzer if available
  - _Requirements: 17_

- [ ] **Task 9.3.2: Optimize imports**
  - Use named imports from shadcn components
  - Avoid importing entire libraries
  - Check bundle size impact
  - _Requirements: 17_

### 9.4 Lighthouse Audit

- [ ] **Task 9.4.1: Run Lighthouse audit**
  - Open Chrome DevTools Lighthouse
  - Run audit on UsersPage
  - Target: 90+ performance score
  - _Requirements: 17_

- [ ] **Task 9.4.2: Fix Lighthouse recommendations**
  - Address any performance issues identified
  - Address any accessibility issues identified
  - Re-run audit to verify improvements
  - _Requirements: 17_

---

## PHASE 10: SECURITY HARDENING

### 10.1 Frontend Security

- [ ] **Task 10.1.1: Verify authentication checks**
  - Test that non-admin users cannot access /dashboard/users
  - Test that unauthenticated users are redirected to login
  - Test that role changes during session log user out
  - _Requirements: 1, 18_

- [ ] **Task 10.1.2: Add CSRF protection**
  - Verify CSRF tokens are included in state-changing requests
  - Test that requests without tokens are rejected
  - _Requirements: 18_

- [ ] **Task 10.1.3: Sanitize user input**
  - Verify all user input is escaped before rendering
  - Test for XSS vulnerabilities by entering `<script>alert('xss')</script>`
  - Ensure input is sanitized
  - _Requirements: 18_

- [ ] **Task 10.1.4: Test self-modification prevention**
  - Try to change own role as admin (should fail)
  - Try to delete own account (should fail)
  - Try to deactivate own account (should fail)
  - Verify error messages display
  - _Requirements: 4, 5, 8_

### 10.2 Backend Security

- [ ] **Task 10.2.1: Verify admin middleware**
  - Test all user management endpoints without admin token (should return 403)
  - Test with user role token (should return 403)
  - Test with admin token (should succeed)
  - _Requirements: 1, 18_

- [ ] **Task 10.2.2: Test last admin protection**
  - Create scenario with one admin user
  - Try to delete that admin (should fail)
  - Try to demote that admin to user (should fail)
  - Verify error responses
  - _Requirements: 5, 8_

- [ ] **Task 10.2.3: Verify password hashing**
  - Create a user and check database
  - Verify password is hashed with bcrypt
  - Verify plaintext password is never stored
  - _Requirements: 18_

- [ ] **Task 10.2.4: Test rate limiting**
  - Make 100+ requests to user management endpoints
  - Verify rate limit kicks in
  - Verify 429 Too Many Requests response
  - _Requirements: 18_

- [ ] **Task 10.2.5: Verify SQL injection prevention**
  - Test with malicious input: `' OR '1'='1`
  - Verify parameterized queries prevent injection
  - Test all endpoints with SQL injection payloads
  - _Requirements: 18_

---

## PHASE 11: TESTING

### 11.1 Unit Tests

- [ ] **Task 11.1.1: Write tests for PermissionSelector**
  - Test permission selection/deselection
  - Test category select all/none
  - Test onChange callback
  - _Requirements: 7_

- [ ] **Task 11.1.2: Write tests for password generator utility**
  - Test password length
  - Test character variety
  - Test strength indicator logic
  - _Requirements: 20_

- [ ] **Task 11.1.3: Write tests for form validation schemas**
  - Test email validation
  - Test password strength validation
  - Test required field validation
  - _Requirements: 15_

- [ ] **Task 11.1.4: Write tests for React Query hooks**
  - Test useUsers with different filters
  - Test mutation success and error scenarios
  - Test optimistic updates
  - _Requirements: 14_

### 11.2 Integration Tests

- [ ] **Task 11.2.1: Test create user flow**
  - Open CreateUserDialog
  - Fill in form
  - Submit
  - Verify API call made
  - Verify success toast appears
  - Verify table updates
  - _Requirements: 3_

- [ ] **Task 11.2.2: Test edit user flow**
  - Click Edit on a user
  - Modify fields
  - Submit
  - Verify API call made
  - Verify success toast
  - Verify table updates
  - _Requirements: 4_

- [ ] **Task 11.2.3: Test delete user flow**
  - Click Delete on a user
  - Confirm in dialog
  - Verify API call made
  - Verify success toast
  - Verify user removed from table
  - _Requirements: 5_

- [ ] **Task 11.2.4: Test filter and search**
  - Apply role filter
  - Verify filtered results
  - Apply search
  - Verify filtered results
  - Clear filters
  - Verify all results return
  - _Requirements: 2, 10_

### 11.3 E2E Tests

- [ ] **Task 11.3.1: Test admin-only access**
  - Log in as non-admin user
  - Navigate to /dashboard/users
  - Verify 403 or redirect
  - Log in as admin
  - Verify page loads
  - _Requirements: 1_

- [ ] **Task 11.3.2: Test complete user lifecycle**
  - Create user
  - View user details
  - Edit user
  - Toggle user status
  - Verify email
  - Delete user
  - _Requirements: 3, 4, 5, 6, 8, 9_

- [ ] **Task 11.3.3: Test error scenarios**
  - Create user with duplicate email (409 error)
  - Update user with invalid email (400 error)
  - Test network errors (disconnect network)
  - Verify error toasts display
  - _Requirements: 15, 19_

---

## PHASE 12: DOCUMENTATION & POLISH

### 12.1 Code Documentation

- [ ] **Task 12.1.1: Add JSDoc comments to components**
  - Document all exported components with JSDoc
  - Include prop types and descriptions
  - Add usage examples
  - _Requirements: Code Quality_

- [ ] **Task 12.1.2: Add JSDoc comments to hooks**
  - Document all React Query hooks
  - Describe parameters and return values
  - Add usage examples
  - _Requirements: Code Quality_

- [ ] **Task 12.1.3: Add JSDoc comments to API endpoints**
  - Document all user management endpoints
  - Describe request/response schemas
  - Add authentication requirements
  - _Requirements: Code Quality_

### 12.2 User Guide

- [ ] **Task 12.2.1: Create user management guide**
  - Create `/docs/admin-user-management.md`
  - Document how to access user management
  - Document each feature (create, edit, delete, etc.)
  - Add screenshots if helpful
  - _Requirements: All_

- [ ] **Task 12.2.2: Document permission system**
  - Create `/docs/permissions.md`
  - List all available permissions
  - Explain what each permission grants
  - Explain how to assign permissions
  - _Requirements: 7_

### 12.3 Final Polish

- [ ] **Task 12.3.1: Review all UI text and labels**
  - Check for typos
  - Ensure consistent terminology
  - Ensure friendly, professional tone
  - _Requirements: All_

- [ ] **Task 12.3.2: Test all animations and transitions**
  - Verify smooth dialog open/close
  - Verify smooth sheet slide-in/out
  - Verify smooth table updates
  - Adjust timing if needed
  - _Requirements: 17_

- [ ] **Task 12.3.3: Final visual review**
  - Check spacing and alignment
  - Check color consistency
  - Check font sizes and weights
  - Make any final tweaks
  - _Requirements: All_

---

## PHASE 13: FINAL VERIFICATION

### 13.1 Build & Deploy Readiness

- [ ] **Task 13.1.1: Test production build**
  - Run `bun run build`
  - Fix any build errors
  - Test built application locally
  - _Requirements: Code Quality_

- [ ] **Task 13.1.2: Run TypeScript checks**
  - Run `bun run typecheck`
  - Fix any type errors
  - Ensure strict mode compliance
  - _Requirements: Code Quality_

- [ ] **Task 13.1.3: Run linter**
  - Run `bun run lint`
  - Fix any linting errors/warnings
  - _Requirements: Code Quality_

- [ ] **Task 13.1.4: Run tests**
  - Run `bun run test`
  - Verify all tests pass
  - Check code coverage (target 80%+)
  - _Requirements: Code Quality_

### 13.2 Final Acceptance

- [ ] **Task 13.2.1: Review all requirements**
  - Go through requirements.md
  - Verify all 20 requirements are met
  - Verify all acceptance criteria pass
  - Document any deviations
  - _Requirements: All_

- [ ] **Task 13.2.2: Perform UAT (User Acceptance Testing)**
  - Have stakeholder/product owner test feature
  - Collect feedback
  - Address any issues
  - Get sign-off
  - _Requirements: All_

- [ ] **Task 13.2.3: Create demo video/screenshots**
  - Record demo of all features
  - Take screenshots of key screens
  - Use for documentation/training
  - _Requirements: All_

- [ ] **Task 13.2.4: Final code review**
  - Request peer code review
  - Address feedback
  - Merge to main branch
  - _Requirements: Code Quality_

---

## Summary

**Total Tasks:** 193
**Estimated Time:** 12-15 days (full-time work)

**Critical Path:**
1. Phase 1: Database Schema & Migrations (0.5 days)
2. Phase 2: Backend API - User Management Endpoints (2-3 days)
3. Phase 3: Frontend Data Layer - React Query Hooks (1 day)
4. Phase 4: UI Components - Reusable Components (3-4 days)
5. Phase 5: Enhanced Users Page (1-2 days)
6. Phase 6: Toast Notifications (0.5 days)
7. Phase 7: Accessibility Implementation (1-2 days)
8. Phase 8: Responsive Design Refinement (1 day)
9. Phase 9: Performance Optimization (1 day)
10. Phase 10: Security Hardening (1 day)
11. Phase 11: Testing (2-3 days)
12. Phase 12: Documentation & Polish (1 day)
13. Phase 13: Final Verification (0.5 days)

**Key Milestones:**
- ✅ Database schema ready with activity logging
- ✅ Backend API fully implemented and secured
- ✅ React Query data layer complete
- ✅ All UI components built and integrated
- ✅ Users page fully functional with all features
- ✅ Accessibility compliance verified
- ✅ Performance optimized (90+ Lighthouse score)
- ✅ Security hardened and tested
- ✅ All tests passing
- ✅ Production-ready deployment

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-22
**Status:** Ready for Implementation
