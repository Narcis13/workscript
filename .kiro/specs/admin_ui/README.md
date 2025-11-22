# Admin User Management UI - Specification

**Feature:** Comprehensive admin interface for managing users, roles, and permissions
**Target Application:** `/apps/frontend` (Vite + React SPA)
**Status:** 📋 Ready for Implementation
**Created:** 2025-01-22
**Version:** 1.0.0

---

## 📁 Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, accessibility)
   - Success metrics and out-of-scope items
   - 150+ acceptance criteria covering all scenarios

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 193+ actionable tasks organized in 13 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 12-15 days
   - Task-to-requirement traceability

3. **[README.md](./README.md)** - This overview document

---

## 🎯 Feature Overview

### What We're Building

A production-ready admin user management UI that enables administrators to:

- ✅ **View all users** in a paginated, sortable, filterable table
- ✅ **Create new users** with email, password, role, and granular permissions
- ✅ **Edit existing users** including profile, role, permissions, and status
- ✅ **Delete users** via soft delete (deactivation) to retain audit history
- ✅ **View user details** in a comprehensive slide-out panel
- ✅ **Manage permissions** with categorized multi-select interface
- ✅ **Toggle user status** to activate/deactivate accounts
- ✅ **Verify emails** manually without requiring verification links
- ✅ **Track user activity** with detailed activity logs and timeline
- ✅ **Search and filter** by email, name, role, status, verification, tenant
- ✅ **Generate secure passwords** with strength indicators
- ✅ **Persist preferences** with localStorage and shareable URLs

### Key Features

**User Management:**
- CRUD operations for user accounts
- Role assignment (Admin, User, API)
- Granular permission management (Workflow, Automation, User, API Key, System)
- Multi-tenancy support with tenant assignment
- Email verification override for trusted accounts
- Active/Inactive status toggling

**User Interface:**
- Responsive design (mobile-first, 320px to 2560px+)
- shadcn UI components for consistent design language
- Advanced filtering: role, status, verification, tenant
- Real-time search with debouncing (300ms)
- Sortable columns: email, created date, last login
- Pagination (20 users per page)
- Loading skeletons and empty states
- Toast notifications for all actions

**Activity Tracking:**
- Login events with IP and user agent
- Workflow/automation executions
- Profile changes with admin attribution
- Role and permission changes
- Account status changes
- Timeline visualization

**Security & Compliance:**
- Admin-only access with permission checks
- Prevent self-demotion and self-deletion
- Protect last admin from removal
- Password hashing with bcrypt (12 rounds)
- Activity audit logging
- WCAG AA accessibility compliance
- HTTPS-only data transmission

**Performance:**
- React Query caching (5-minute TTL)
- Optimistic updates for instant feedback
- Code splitting and lazy loading
- 90+ Lighthouse performance score target
- Debounced search to reduce API calls

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- **Framework:** React 19 + Vite 6
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (28+ components)
- **Data Fetching:** React Query (@tanstack/react-query)
- **Forms:** react-hook-form + Zod validation
- **Routing:** React Router v7
- **Notifications:** Sonner (toast library)
- **HTTP Client:** Axios

**Backend:**
- **Framework:** Hono v4 (lightweight web framework)
- **Database:** MySQL with Drizzle ORM
- **Authentication:** JWT tokens with refresh mechanism
- **Password Hashing:** bcrypt (12 salt rounds)
- **Validation:** Zod schemas
- **Middleware:** Admin permission checks, rate limiting

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  UsersPage   │  │   Dialogs    │  │ Components   │      │
│  │  (Enhanced)  │  │  (CRUD ops)  │  │ (Table, etc) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  React Query    │                        │
│                  │  (useUsers,     │                        │
│                  │   mutations)    │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  UsersService   │                        │
│                  │  (Axios API)    │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Backend API (Hono)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/users Routes (Admin Middleware)                │  │
│  │  - GET /api/users (list)                             │  │
│  │  - GET /api/users/:id (details)                      │  │
│  │  - POST /api/users (create)                          │  │
│  │  - PUT /api/users/:id (update)                       │  │
│  │  - DELETE /api/users/:id (soft delete)               │  │
│  │  - PATCH /api/users/:id/permissions                  │  │
│  │  - PATCH /api/users/:id/verify-email                 │  │
│  │  - PATCH /api/users/:id/status                       │  │
│  │  - GET /api/users/:id/activity (logs)                │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                        │                                    │
│           ┌────────────┴────────────┐                       │
│           │                         │                       │
│  ┌────────▼─────────┐    ┌─────────▼──────────┐            │
│  │  Drizzle ORM     │    │  ActivityLogger    │            │
│  │  (users table)   │    │  (audit logging)   │            │
│  └────────┬─────────┘    └─────────┬──────────┘            │
└───────────┼──────────────────────────┼──────────────────────┘
            │                          │
┌───────────▼──────────────────────────▼──────────────────────┐
│                     MySQL Database                          │
│  ┌──────────────────┐    ┌────────────────────────────┐    │
│  │  users table     │    │  user_activity_logs table  │    │
│  │  - id (CUID2)    │    │  - id (CUID2)              │    │
│  │  - email         │    │  - userId (FK)             │    │
│  │  - passwordHash  │    │  - eventType               │    │
│  │  - role          │    │  - eventData (JSON)        │    │
│  │  - permissions[] │    │  - ipAddress               │    │
│  │  - firstName     │    │  - userAgent               │    │
│  │  - lastName      │    │  - createdAt               │    │
│  │  - tenantId      │    └────────────────────────────┘    │
│  │  - emailVerified │                                       │
│  │  - isActive      │                                       │
│  │  - createdAt     │                                       │
│  │  - lastLoginAt   │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**Frontend Components:**
- `UsersPage.tsx` - Main page with table, filters, pagination
- `UserTable.tsx` - Data table with sortable columns and actions
- `CreateUserDialog.tsx` - Modal form for creating users
- `EditUserDialog.tsx` - Modal form for editing users
- `DeleteUserDialog.tsx` - Confirmation dialog for soft delete
- `UserDetailsSheet.tsx` - Slide-out panel with user details and activity
- `UserFilters.tsx` - Filter controls for role, status, verification, tenant
- `PermissionSelector.tsx` - Categorized multi-select for permissions
- `UserActivityTimeline.tsx` - Timeline view of user actions

**Frontend Hooks:**
- `useUsers(filters, pagination, sort)` - Fetch paginated user list
- `useUser(id)` - Fetch single user details
- `useCreateUser()` - Mutation for creating users
- `useUpdateUser()` - Mutation for updating users
- `useDeleteUser()` - Mutation for soft deleting users
- `useUpdateUserPermissions()` - Mutation for permission updates
- `useVerifyUserEmail()` - Mutation for email verification
- `useToggleUserStatus()` - Mutation for status toggling
- `useUserActivity(id)` - Fetch user activity logs

**Backend Components:**
- `/apps/api/src/routes/users.ts` - User management routes
- `/apps/api/src/routes/users.validation.ts` - Zod validation schemas
- `/apps/api/src/shared-services/ActivityLogger.ts` - Activity logging service
- `/apps/api/src/shared-services/auth/middleware.ts` - Admin permission checks
- `/apps/api/src/db/schema/auth.schema.ts` - Users table schema
- `/apps/api/src/db/schema/activity.schema.ts` - Activity logs schema

---

## 📋 Implementation Phases

### Phase 1: Database Schema & Migrations (0.5 days)
- Review existing users table
- Add firstName, lastName fields if missing
- Create user_activity_logs table
- Generate and apply migrations

### Phase 2: Backend API - User Management Endpoints (2-3 days)
- Create user management routes with admin middleware
- Implement 9 API endpoints (list, get, create, update, delete, permissions, verify, status, activity)
- Add ActivityLogger service for audit trails
- Implement validation, security, and rate limiting
- Add self-modification and last-admin protection

### Phase 3: Frontend Data Layer - React Query Hooks (1 day)
- Create UsersService with Axios
- Implement 9 React Query hooks
- Configure caching, refetching, optimistic updates
- Add error handling and retry logic

### Phase 4: UI Components - Reusable Components (3-4 days)
- Build PermissionSelector with categories
- Build CreateUserDialog with password generator
- Build EditUserDialog with role warnings
- Build DeleteUserDialog, VerifyEmailDialog, ToggleStatusDialog
- Build UserDetailsSheet with activity timeline
- Build UserTable with sortable columns and actions
- Build UserFilters with role/status/verification/tenant filters

### Phase 5: Enhanced Users Page (1-2 days)
- Update UsersPage with all components
- Implement search, filter, sort, pagination
- Manage dialog state and callbacks
- Implement URL state sync and localStorage persistence
- Add error handling and loading states

### Phase 6: Toast Notifications (0.5 days)
- Set up Sonner toast library
- Add success toasts for all mutations
- Add error toasts with specific messages
- Configure auto-dismiss and positioning

### Phase 7: Accessibility Implementation (1-2 days)
- Verify keyboard navigation and focus management
- Add ARIA labels to all interactive elements
- Test with NVDA/VoiceOver screen readers
- Check color contrast ratios (WCAG AA)
- Verify minimum touch target sizes (44x44px)

### Phase 8: Responsive Design Refinement (1 day)
- Test layouts at 320px, 768px, 1024px+
- Make components mobile-responsive
- Test touch gestures (swipe, tap, scroll)
- Ensure dialogs adapt to screen size

### Phase 9: Performance Optimization (1 day)
- Add React.memo to expensive components
- Optimize re-renders with useCallback/useMemo
- Verify React Query caching and optimistic updates
- Run Lighthouse audit (target 90+)
- Implement code splitting

### Phase 10: Security Hardening (1 day)
- Verify authentication and authorization checks
- Test CSRF protection and XSS prevention
- Test self-modification and last-admin protection
- Verify password hashing and rate limiting
- Test SQL injection prevention

### Phase 11: Testing (2-3 days)
- Write unit tests for components and utilities
- Write integration tests for CRUD flows
- Write E2E tests for user lifecycle
- Test error scenarios and edge cases

### Phase 12: Documentation & Polish (1 day)
- Add JSDoc comments to all code
- Create user guide and permission docs
- Review all UI text and labels
- Test animations and transitions
- Final visual review

### Phase 13: Final Verification (0.5 days)
- Test production build
- Run TypeScript checks and linter
- Run all tests and check coverage
- Review all requirements and acceptance criteria
- Perform UAT and get sign-off

---

## 🚀 Quick Start Guide

### For Developers

**Prerequisites:**
- Node.js 18+ or Bun 1.x installed
- Access to MySQL database
- Admin account for testing

**Setup Steps:**

1. **Review Existing Code:**
   ```bash
   # Check current UsersPage implementation
   open apps/frontend/src/pages/dashboard/UsersPage.tsx

   # Check current auth system
   open apps/frontend/src/contexts/AuthContext.tsx
   open apps/api/src/routes/auth.ts

   # Check database schema
   open apps/api/src/db/schema/auth.schema.ts
   ```

2. **Read Specifications:**
   ```bash
   # Review requirements
   open .kiro/specs/admin_ui/requirements.md

   # Review implementation plan
   open .kiro/specs/admin_ui/implementation_plan.md
   ```

3. **Start Implementation:**
   - Follow tasks in `implementation_plan.md` sequentially
   - Start with Phase 1 (Database Schema)
   - Check off tasks as you complete them
   - Run tests frequently during development

4. **Development Workflow:**
   ```bash
   # Start development servers
   bun run dev

   # In separate terminals:
   cd apps/api && bun run db:studio  # View database
   cd apps/frontend && bun run dev   # Frontend dev server
   cd apps/api && bun run dev        # Backend dev server

   # Run tests
   bun run test

   # Type checking
   bun run typecheck

   # Linting
   bun run lint
   ```

### For Reviewers

**Code Review Checklist:**

1. **Functionality:**
   - [ ] All 20 requirements met
   - [ ] All acceptance criteria pass
   - [ ] CRUD operations work correctly
   - [ ] Filters, search, sort, pagination work
   - [ ] Activity logging captures all events

2. **Security:**
   - [ ] Admin-only access enforced
   - [ ] Self-modification prevented
   - [ ] Last admin protected
   - [ ] Passwords properly hashed
   - [ ] No sensitive data exposed

3. **Accessibility:**
   - [ ] WCAG AA compliance verified
   - [ ] Keyboard navigation works
   - [ ] Screen reader compatible
   - [ ] Color contrast sufficient
   - [ ] Touch targets adequate

4. **Performance:**
   - [ ] Lighthouse score 90+
   - [ ] React Query caching works
   - [ ] Optimistic updates implemented
   - [ ] No unnecessary re-renders
   - [ ] Code splitting enabled

5. **Code Quality:**
   - [ ] TypeScript strict mode passes
   - [ ] Linter passes
   - [ ] Tests written and passing
   - [ ] JSDoc comments present
   - [ ] Follows existing patterns

---

## ✅ Success Criteria

The feature is complete when:

- ✅ Admin users can create, read, update, and delete user accounts
- ✅ Permission management allows granular permission assignment
- ✅ User activity history displays login, workflow, and profile events
- ✅ All operations are restricted to users with 'admin' role
- ✅ UI is responsive on mobile, tablet, and desktop (320px+)
- ✅ Accessibility testing passes with WCAG AA compliance
- ✅ Performance scores 90+ on Lighthouse
- ✅ All form validations work with clear error messages
- ✅ Toast notifications provide feedback for all actions
- ✅ Search, filter, sort, and pagination work correctly
- ✅ Activity logging captures all relevant events
- ✅ Security testing passes (no vulnerabilities)
- ✅ Code passes TypeScript strict mode and linting
- ✅ Integration with existing auth system is seamless
- ✅ User acceptance testing confirms intuitive UX

---

## 🔒 Security Considerations

**Authentication & Authorization:**
- All user management routes require valid admin JWT token
- Backend validates `USER_MANAGE` permission on every request
- Frontend uses `ProtectedRoute` with `requiredRole={Role.ADMIN}`
- Invalid/expired tokens redirect to login page

**Self-Protection:**
- Admins cannot change their own role
- Admins cannot delete their own account
- Admins cannot deactivate their own account
- Last admin user cannot be deleted or demoted

**Data Protection:**
- Passwords hashed with bcrypt (12 salt rounds)
- Password hashes never exposed in API responses
- All data transmitted over HTTPS only
- User input sanitized to prevent XSS
- Parameterized queries prevent SQL injection

**Audit & Compliance:**
- All user management actions logged with admin ID
- Activity logs are append-only (immutable)
- IP addresses and user agents captured
- GDPR compliance: PII identified for data requests

**Rate Limiting:**
- User management endpoints limited to 100 requests/minute per IP
- Prevents brute force and DoS attacks

---

## 📊 Progress Tracking

**How to Track Implementation:**

1. **Use Checkboxes in implementation_plan.md:**
   - Mark tasks complete as you finish them
   - Use `- [x]` syntax for completed tasks
   - Keep track of current phase

2. **Git Workflow:**
   - Create feature branch: `feature/admin-user-management`
   - Commit frequently with descriptive messages
   - Reference task numbers in commits
   - Create PR when phase is complete

3. **Testing Progress:**
   - Run tests after each task
   - Check code coverage regularly
   - Fix failing tests immediately

4. **Daily Standup:**
   - Report tasks completed yesterday
   - Report tasks planned for today
   - Flag any blockers

**Estimated Timeline:**
- **Week 1:** Phases 1-6 (Backend + Core UI)
- **Week 2:** Phases 7-10 (Accessibility + Performance + Security)
- **Week 3:** Phases 11-13 (Testing + Documentation + Verification)

---

## 🚫 Out of Scope

The following features are **NOT** included in this initial implementation:

- Hard delete (permanent user deletion)
- Bulk operations (multi-select and bulk edit/delete)
- Advanced activity filtering (by event type, date range)
- User impersonation (admin login as user)
- Admin password reset (users use self-service)
- User groups/teams (hierarchical organization)
- Advanced multi-tenancy (tenant-specific dashboards)
- Export/import functionality (CSV/Excel)
- Custom avatar uploads (only initial-based avatars)
- 2FA management (admin control of user 2FA)
- Session management (view/terminate active sessions)
- API key management (separate feature)
- Advanced audit reports and analytics

These features may be added in future iterations based on user feedback and business needs.

---

## 📚 Related Documentation

**Internal Documentation:**
- `/CLAUDE.md` - Project overview and architecture
- `/workscript_prospect.md` - Strategic roadmap
- `/.kiro/specs/json-workflow-engine/design.md` - Workflow engine architecture
- `/apps/frontend/README.md` - Frontend app documentation
- `/apps/api/README.md` - API documentation

**External Documentation:**
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 🤝 Contributing

**Development Guidelines:**

1. **Follow Existing Patterns:**
   - Match the structure of AutomationsPage, WorkflowsPage
   - Use shadcn UI components consistently
   - Follow TypeScript strict mode rules

2. **Code Quality Standards:**
   - Write JSDoc comments for all exports
   - Add unit tests for utilities and hooks
   - Add integration tests for CRUD flows
   - Pass TypeScript checks and linter

3. **Git Commit Messages:**
   - Use conventional commits format
   - Reference task numbers: `feat: add CreateUserDialog (Task 4.2.1)`
   - Keep commits atomic and focused

4. **Pull Request Process:**
   - Create PR when phase is complete
   - Request review from team lead
   - Address all review comments
   - Ensure CI passes (tests, lint, typecheck)

5. **Testing Requirements:**
   - Write tests alongside features
   - Aim for 80%+ code coverage
   - Test error scenarios
   - Test accessibility with screen readers

---

## 📞 Questions & Support

**If you need help:**
- Review the requirements and implementation plan thoroughly
- Check existing code for patterns to follow
- Consult shadcn/ui docs for component usage
- Reach out to team lead for clarification

**Common Questions:**

**Q: Should I create new UI components or use existing ones?**
A: Always use shadcn components first. Only create custom components when shadcn doesn't provide what you need.

**Q: How should I handle errors from the API?**
A: Display error toasts with specific messages. Don't close dialogs on error. Allow users to retry.

**Q: Should I implement hard delete or soft delete?**
A: Soft delete only (set `isActive = false`). This retains audit history and prevents data loss.

**Q: Can I add features not in the requirements?**
A: No. Stick to the requirements. Additional features should be proposed and approved first.

**Q: How do I test admin-only access locally?**
A: Create an admin user in the database manually, or use existing auth endpoints to register and manually set role to 'admin' in database.

---

**Happy Coding! 🎉**

**Remember:** This is a comprehensive feature with security implications. Take your time, follow the plan, write tests, and don't skip accessibility or security steps. The end result will be a production-ready, enterprise-grade user management system.
