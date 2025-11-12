# Implementation Plan: React Client Authentication

This document provides a concrete, actionable implementation plan for integrating authentication into the React Vite frontend. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: SETUP & DEPENDENCIES

### 1.1 Install Required Dependencies

- [ ] **Task 1.1.1: Install routing and HTTP client libraries**
  - Run: `bun add react-router-dom axios`
  - Verify installation in package.json
  - _Requirements: 20, 6_

- [ ] **Task 1.1.2: Install form management libraries**
  - Run: `bun add react-hook-form @hookform/resolvers zod`
  - Verify installation in package.json
  - _Requirements: 18_

- [ ] **Task 1.1.3: Add shadcn/ui components (batch 1)**
  - Run: `bunx shadcn@latest add input label card form alert`
  - Verify components added to `src/components/ui/`
  - _Requirements: 8_

- [ ] **Task 1.1.4: Add shadcn/ui components (batch 2)**
  - Run: `bunx shadcn@latest add dropdown-menu avatar badge separator table`
  - Verify components added to `src/components/ui/`
  - _Requirements: 8, 12_

### 1.2 Environment Configuration

- [ ] **Task 1.2.1: Create environment configuration**
  - Create `/apps/frontend/.env` file
  - Add: `VITE_API_URL=http://localhost:3013`
  - Create `.env.example` with same structure
  - _Requirements: 16_

- [ ] **Task 1.2.2: Update TypeScript environment types**
  - Create or update `src/vite-env.d.ts`
  - Add type definitions for VITE_API_URL
  - Ensure TypeScript recognizes environment variables
  - _Requirements: 15, 16_

### 1.3 Project Structure Setup

- [ ] **Task 1.3.1: Create directory structure**
  - Create: `src/services/`
  - Create: `src/contexts/`
  - Create: `src/components/auth/`
  - Create: `src/components/layout/`
  - Create: `src/components/guards/`
  - Create: `src/pages/auth/`
  - Create: `src/pages/dashboard/`
  - Create: `src/hooks/`
  - Create: `src/types/`
  - _Requirements: All_

---

## PHASE 2: CORE TYPE DEFINITIONS & API CLIENT

### 2.1 Type Definitions

- [ ] **Task 2.1.1: Create authentication types**
  - Create `src/types/auth.ts`
  - Define `User` interface (id, email, role, permissions, tenantId?, createdAt)
  - Define `AuthTokens` interface (accessToken, refreshToken, expiresIn)
  - Define `LoginRequest` and `LoginResponse` types
  - Define `RegisterRequest` and `RegisterResponse` types
  - Define `ChangePasswordRequest` type
  - Define `AuthContextType` interface
  - _Requirements: 15, 7_

### 2.2 API Client Setup

- [ ] **Task 2.2.1: Create base Axios instance**
  - Create `src/lib/api.ts`
  - Configure axios instance with baseURL from environment
  - Set up withCredentials: true for cookies
  - Export configured instance
  - _Requirements: 6, 16_

### 2.3 Authentication Service

- [ ] **Task 2.3.1: Create AuthService class structure**
  - Create `src/services/AuthService.ts`
  - Define singleton AuthService class
  - Create private axios instance
  - Add token storage methods (private)
  - _Requirements: 6_

- [ ] **Task 2.3.2: Implement authentication methods**
  - Implement `register(email, password)` method
  - Implement `login(email, password)` method
  - Implement `logout()` method
  - Implement `getCurrentUser()` method
  - Implement `changePassword(oldPassword, newPassword)` method
  - _Requirements: 1, 2, 3, 4, 6_

- [ ] **Task 2.3.3: Implement token management**
  - Implement `setTokens(tokens)` private method
  - Implement `getAccessToken()` private method
  - Implement `getRefreshToken()` private method
  - Implement `clearTokens()` private method
  - Implement `isTokenExpired()` method
  - Implement `isAuthenticated()` method
  - _Requirements: 6, 10_

- [ ] **Task 2.3.4: Implement automatic token refresh**
  - Implement `refreshAccessToken()` method
  - Add request interceptor to include access token in headers
  - Add response interceptor to handle 401 errors
  - Add logic to prevent multiple simultaneous refresh requests
  - Implement automatic retry of failed request after refresh
  - _Requirements: 6, 9, 10_

- [ ] **Task 2.3.5: Export AuthService singleton**
  - Create and export `authService` singleton instance
  - Add type exports
  - _Requirements: 6_

---

## PHASE 3: AUTHENTICATION CONTEXT & HOOKS

### 3.1 Authentication Context

- [ ] **Task 3.1.1: Create AuthContext structure**
  - Create `src/contexts/AuthContext.tsx`
  - Define AuthContext with createContext
  - Define AuthProvider component
  - Set up state for user, isLoading
  - _Requirements: 7_

- [ ] **Task 3.1.2: Implement initialization logic**
  - Add useEffect to check for tokens on mount
  - Fetch current user if tokens exist
  - Handle initialization errors gracefully
  - Set isLoading to false after check completes
  - _Requirements: 7_

- [ ] **Task 3.1.3: Implement context methods**
  - Implement `login(email, password)` method
  - Implement `register(email, password)` method
  - Implement `logout()` method
  - Implement `refreshUser()` method
  - Update state appropriately in each method
  - _Requirements: 1, 2, 3, 7_

- [ ] **Task 3.1.4: Create context value and provider**
  - Create context value object with all state and methods
  - Wrap children with AuthContext.Provider
  - Export AuthProvider component
  - _Requirements: 7_

### 3.2 Authentication Hooks

- [ ] **Task 3.2.1: Create useAuth hook**
  - Create `src/hooks/useAuth.ts`
  - Implement hook that uses useContext
  - Add error check for usage outside provider
  - Export hook
  - _Requirements: 7_

- [ ] **Task 3.2.2: Create permission checking hooks**
  - Create `src/hooks/usePermission.ts`
  - Implement `usePermission(permission: string)` hook
  - Implement `useHasAnyPermission(permissions: string[])` hook
  - Export both hooks
  - _Requirements: 11_

---

## PHASE 4: ROUTING & NAVIGATION

### 4.1 Protected Route Component

- [ ] **Task 4.1.1: Create ProtectedRoute component**
  - Create `src/components/guards/ProtectedRoute.tsx`
  - Accept children and optional requiredRole prop
  - Check authentication status using useAuth
  - Show loading state while checking
  - Redirect to /login if not authenticated
  - Save attempted location in redirect state
  - Redirect to /unauthorized if lacking permissions
  - _Requirements: 5, 11_

### 4.2 Router Setup

- [ ] **Task 4.2.1: Update App.tsx with router**
  - Import BrowserRouter and Routes from react-router-dom
  - Wrap entire app with AuthProvider
  - Wrap content with BrowserRouter
  - Create Routes structure with placeholders
  - _Requirements: 20_

- [ ] **Task 4.2.2: Define public routes**
  - Add route for `/login` → LoginPage
  - Add route for `/register` → RegisterPage
  - Add route for `/reset-password` → ResetPasswordPage
  - Add route for `/workflow-demo` → WorkflowDemoPage (public)
  - Add route for `/unauthorized` → UnauthorizedPage
  - _Requirements: 13, 20_

- [ ] **Task 4.2.3: Define protected routes**
  - Wrap protected routes with ProtectedRoute component
  - Add route for `/dashboard` → DashboardPage
  - Add route for `/dashboard/profile` → ProfilePage
  - Add route for `/dashboard/users` → UsersPage (admin only)
  - Add catch-all redirect route
  - _Requirements: 5, 20_

### 4.3 Layout Components

- [ ] **Task 4.3.1: Create AuthLayout component**
  - Create `src/components/layout/AuthLayout.tsx`
  - Design centered card layout for auth forms
  - Add branding/logo area
  - Make responsive
  - _Requirements: 9, 17_

- [ ] **Task 4.3.2: Create DashboardLayout component**
  - Create `src/components/layout/DashboardLayout.tsx`
  - Include Header component
  - Create main content area with proper spacing
  - Add sidebar placeholder (optional)
  - Make responsive
  - _Requirements: 9, 17_

- [ ] **Task 4.3.3: Create Header component**
  - Create `src/components/layout/Header.tsx`
  - Add logo/branding on left
  - Add navigation links (Dashboard, Workflow Demo)
  - Add user menu dropdown on right (if authenticated)
  - Show login/register links if not authenticated
  - Make responsive with mobile menu
  - _Requirements: 9, 17_

- [ ] **Task 4.3.4: Create user dropdown menu**
  - Add Avatar component with user initials/icon
  - Add DropdownMenu with user email display
  - Add "Profile" menu item
  - Add "Users" menu item (admin only, conditional rendering)
  - Add Separator
  - Add "Logout" menu item with click handler
  - _Requirements: 3, 9, 11_

---

## PHASE 5: AUTHENTICATION FORMS

### 5.1 Form Validation Schemas

- [ ] **Task 5.1.1: Create login validation schema**
  - Create validation schemas in form components or separate file
  - Define Zod schema for login (email, password)
  - Add email format validation
  - Add password minimum length validation
  - _Requirements: 2, 18_

- [ ] **Task 5.1.2: Create register validation schema**
  - Define Zod schema for registration
  - Add email format validation
  - Add password strength validation (min 8, uppercase, lowercase, number)
  - Add password confirmation matching
  - _Requirements: 1, 18_

- [ ] **Task 5.1.3: Create change password validation schema**
  - Define Zod schema for password change
  - Add current password required validation
  - Add new password strength validation
  - Add new password confirmation matching
  - Ensure new password differs from current
  - _Requirements: 4, 18_

### 5.2 Login Form

- [ ] **Task 5.2.1: Create LoginForm component**
  - Create `src/components/auth/LoginForm.tsx`
  - Set up react-hook-form with Zod resolver
  - Create form with email and password fields
  - Add proper labels and input components (shadcn)
  - _Requirements: 2, 8_

- [ ] **Task 5.2.2: Implement login form submission**
  - Add form onSubmit handler
  - Call useAuth login method
  - Handle loading state
  - Handle errors with Alert component
  - Redirect to dashboard on success
  - _Requirements: 2, 14, 19_

- [ ] **Task 5.2.3: Add login form extras**
  - Add "Forgot password?" link
  - Add "Don't have an account? Register" link
  - Add loading state to submit button
  - Add error display with Alert
  - Make form responsive
  - _Requirements: 2, 8, 14, 17_

### 5.3 Register Form

- [ ] **Task 5.3.1: Create RegisterForm component**
  - Create `src/components/auth/RegisterForm.tsx`
  - Set up react-hook-form with Zod resolver
  - Create form with email, password, and confirm password fields
  - Add proper labels and input components
  - _Requirements: 1, 8_

- [ ] **Task 5.3.2: Implement password strength indicator**
  - Add password strength calculation logic
  - Display strength indicator (weak/medium/strong)
  - Update indicator in real-time as user types
  - Use appropriate colors (red/yellow/green)
  - _Requirements: 1, 18_

- [ ] **Task 5.3.3: Implement register form submission**
  - Add form onSubmit handler
  - Call useAuth register method
  - Handle loading state
  - Handle errors with Alert component
  - Auto-login and redirect to dashboard on success
  - _Requirements: 1, 14, 19_

- [ ] **Task 5.3.4: Add register form extras**
  - Add "Already have an account? Login" link
  - Add loading state to submit button
  - Add error display with Alert
  - Make form responsive
  - _Requirements: 1, 8, 14, 17_

### 5.4 Change Password Form

- [ ] **Task 5.4.1: Create ChangePasswordForm component**
  - Create `src/components/auth/ChangePasswordForm.tsx`
  - Set up react-hook-form with Zod resolver
  - Create form with current, new, and confirm password fields
  - Add proper labels and input components
  - _Requirements: 4, 8_

- [ ] **Task 5.4.2: Implement password change submission**
  - Add form onSubmit handler
  - Call authService.changePassword method
  - Handle loading state
  - Handle errors with Alert component
  - Show success message and reset form on success
  - _Requirements: 4, 14, 19_

### 5.5 Reset Password Form (UI Only)

- [ ] **Task 5.5.1: Create ResetPasswordForm component**
  - Create `src/components/auth/ResetPasswordForm.tsx`
  - Create simple form with email field
  - Add submit handler (mock/placeholder)
  - Show success message after submission
  - Add note that email functionality not implemented
  - _Requirements: 2, 8_

---

## PHASE 6: PAGE COMPONENTS

### 6.1 Authentication Pages

- [ ] **Task 6.1.1: Create LoginPage**
  - Create `src/pages/auth/LoginPage.tsx`
  - Use AuthLayout
  - Include LoginForm component
  - Add redirect logic if already authenticated
  - Handle return URL from location state
  - _Requirements: 2, 20_

- [ ] **Task 6.1.2: Create RegisterPage**
  - Create `src/pages/auth/RegisterPage.tsx`
  - Use AuthLayout
  - Include RegisterForm component
  - Add redirect logic if already authenticated
  - _Requirements: 1, 20_

- [ ] **Task 6.1.3: Create ResetPasswordPage**
  - Create `src/pages/auth/ResetPasswordPage.tsx`
  - Use AuthLayout
  - Include ResetPasswordForm component
  - Add back to login link
  - _Requirements: 2, 20_

- [ ] **Task 6.1.4: Create UnauthorizedPage**
  - Create `src/pages/UnauthorizedPage.tsx`
  - Display 403 error message
  - Add "Go to Dashboard" button
  - Add "Go to Login" button
  - _Requirements: 5, 14_

### 6.2 Dashboard Pages

- [ ] **Task 6.2.1: Create DashboardPage**
  - Create `src/pages/dashboard/DashboardPage.tsx`
  - Use DashboardLayout
  - Display welcome message with user's email
  - Add quick links to other sections
  - Show user role with Badge component
  - _Requirements: 9_

- [ ] **Task 6.2.2: Create ProfilePage**
  - Create `src/pages/dashboard/ProfilePage.tsx`
  - Use DashboardLayout
  - Display user information (email, role)
  - Include ChangePasswordForm component
  - Make responsive
  - _Requirements: 4, 9, 17_

- [ ] **Task 6.2.3: Create UsersPage (admin only)**
  - Create `src/pages/dashboard/UsersPage.tsx`
  - Use DashboardLayout
  - Add role check at component level
  - Display user list in Table component
  - Show email, role (Badge), created date
  - Add loading skeleton
  - Add note if API endpoint doesn't exist
  - _Requirements: 11, 12_

### 6.3 Public Pages

- [ ] **Task 6.3.1: Create WorkflowDemoPage**
  - Create `src/pages/WorkflowDemoPage.tsx`
  - Move existing WorkflowDemo component into this page
  - Use simple layout (not DashboardLayout)
  - Add navigation back to home/dashboard
  - Ensure no authentication required
  - _Requirements: 13_

---

## PHASE 7: INTEGRATION & REFINEMENT

### 7.1 App Integration

- [ ] **Task 7.1.1: Update main.tsx**
  - Ensure AuthProvider wraps the app (if not in App.tsx)
  - Verify StrictMode is enabled
  - Check for any global providers needed
  - _Requirements: 7_

- [ ] **Task 7.1.2: Update App.tsx final structure**
  - Ensure proper provider nesting
  - Verify all routes are defined correctly
  - Test navigation between routes
  - _Requirements: 20_

- [ ] **Task 7.1.3: Add loading states to protected routes**
  - Add global loading indicator during auth check
  - Prevent route flashing during initialization
  - Show skeleton loaders where appropriate
  - _Requirements: 19_

### 7.2 Error Handling Enhancement

- [ ] **Task 7.2.1: Improve error messages**
  - Map API error codes to user-friendly messages
  - Add specific message for account locked (429)
  - Add specific message for invalid credentials (401)
  - Ensure no sensitive data in error messages
  - _Requirements: 14_

- [ ] **Task 7.2.2: Add error boundaries (optional)**
  - Create ErrorBoundary component for catch-all errors
  - Display user-friendly error page
  - Add report/retry functionality
  - _Requirements: 14_

### 7.3 Responsive Design Verification

- [ ] **Task 7.3.1: Test mobile layouts**
  - Test all forms on mobile viewport
  - Verify touch-friendly interactions
  - Check dropdown menus work on touch
  - Test table responsiveness
  - _Requirements: 17_

- [ ] **Task 7.3.2: Test tablet layouts**
  - Verify layouts adapt appropriately
  - Check navigation responsiveness
  - Test forms and tables
  - _Requirements: 17_

- [ ] **Task 7.3.3: Test desktop layouts**
  - Verify proper centering and max-widths
  - Check that layouts don't stretch too wide
  - Test all interactive elements
  - _Requirements: 17_

### 7.4 Type Safety Verification

- [ ] **Task 7.4.1: Run TypeScript type check**
  - Run `bun run typecheck` (or `tsc --noEmit`)
  - Fix any TypeScript errors
  - Ensure strict mode is enabled
  - _Requirements: 15_

- [ ] **Task 7.4.2: Verify API type contracts**
  - Compare TypeScript types with API documentation
  - Ensure request/response types match backend
  - Add JSDoc comments where helpful
  - _Requirements: 15_

---

## PHASE 8: TESTING & POLISH

### 8.1 Manual Testing

- [ ] **Task 8.1.1: Test registration flow**
  - Test successful registration
  - Test duplicate email error
  - Test password validation errors
  - Test auto-login after registration
  - _Requirements: 1_

- [ ] **Task 8.1.2: Test login flow**
  - Test successful login
  - Test invalid credentials error
  - Test account locked error
  - Test redirect to originally requested page
  - _Requirements: 2_

- [ ] **Task 8.1.3: Test logout flow**
  - Test logout clears tokens
  - Test logout redirects to login
  - Test logout works even if API fails
  - _Requirements: 3_

- [ ] **Task 8.1.4: Test password change flow**
  - Test successful password change
  - Test wrong current password error
  - Test password validation
  - Test form reset after success
  - _Requirements: 4_

- [ ] **Task 8.1.5: Test protected routes**
  - Test redirect to login when not authenticated
  - Test access granted when authenticated
  - Test return to requested page after login
  - Test unauthorized page for insufficient permissions
  - _Requirements: 5_

- [ ] **Task 8.1.6: Test token refresh**
  - Simulate 401 error
  - Verify automatic refresh attempt
  - Verify request retry after refresh
  - Verify logout if refresh fails
  - _Requirements: 6, 10_

- [ ] **Task 8.1.7: Test permission-based UI**
  - Test admin-only navigation items
  - Test Users page access control
  - Test usePermission hook
  - _Requirements: 11_

- [ ] **Task 8.1.8: Test WorkflowDemo public access**
  - Verify no authentication required
  - Test navigation from demo to other pages
  - _Requirements: 13_

### 8.2 Polish & Cleanup

- [ ] **Task 8.2.1: Review and clean up console logs**
  - Remove debug console.log statements
  - Keep only necessary error logs
  - Ensure no sensitive data logged
  - _Requirements: Security_

- [ ] **Task 8.2.2: Optimize bundle size**
  - Review imported dependencies
  - Remove unused imports
  - Check bundle analyzer if available
  - _Requirements: Performance_

- [ ] **Task 8.2.3: Add loading skeletons**
  - Add skeleton loaders for user list
  - Add skeleton for dashboard data
  - Improve perceived performance
  - _Requirements: 19_

- [ ] **Task 8.2.4: Accessibility improvements**
  - Add ARIA labels where needed
  - Test keyboard navigation
  - Verify focus management
  - Test with screen reader (if possible)
  - _Requirements: Accessibility_

- [ ] **Task 8.2.5: Add helpful comments**
  - Add JSDoc comments to complex functions
  - Document non-obvious logic
  - Add TODO comments for future enhancements
  - _Requirements: Code Quality_

### 8.3 Documentation

- [ ] **Task 8.3.1: Create README for frontend**
  - Document authentication setup
  - Add environment variable documentation
  - Include development instructions
  - Add troubleshooting section
  - _Requirements: N/A (documentation)_

- [ ] **Task 8.3.2: Update CLAUDE.md if needed**
  - Document new authentication structure
  - Add notes about protected routes
  - Update project overview
  - _Requirements: N/A (documentation)_

---

## PHASE 9: FINAL VERIFICATION

### 9.1 Build & Deploy Readiness

- [ ] **Task 9.1.1: Test production build**
  - Run `bun run build`
  - Fix any build errors
  - Verify bundle size is reasonable
  - Test built app with `bun run preview`
  - _Requirements: Code Quality_

- [ ] **Task 9.1.2: Verify environment configuration**
  - Test with development API URL
  - Document production environment variables
  - Ensure fallback values are appropriate
  - _Requirements: 16_

- [ ] **Task 9.1.3: Cross-browser testing**
  - Test in Chrome
  - Test in Firefox
  - Test in Safari
  - Test in Edge
  - Document any browser-specific issues
  - _Requirements: Browser Support_

### 9.2 Security Review

- [ ] **Task 9.2.1: Security checklist**
  - Verify tokens stored correctly (localStorage)
  - Verify passwords never logged
  - Verify no sensitive data in error messages
  - Verify HTTPS enforced (production)
  - Verify CORS properly configured
  - _Requirements: Security_

### 9.3 Final Acceptance

- [ ] **Task 9.3.1: Review all requirements**
  - Go through requirements document
  - Verify all acceptance criteria met
  - Document any intentional deviations
  - _Requirements: All_

- [ ] **Task 9.3.2: Create demo video (optional)**
  - Record walkthrough of all features
  - Demonstrate registration, login, logout
  - Show protected routes and permissions
  - Demonstrate responsive design
  - _Requirements: N/A (documentation)_

---

## Summary

**Total Tasks:** 120+
**Estimated Time:** 3-5 days (full-time development)

**Critical Path:**
1. Phase 1: Setup & Dependencies (0.5 day)
2. Phase 2: Core Types & API Client (0.5 day)
3. Phase 3: Auth Context & Hooks (0.5 day)
4. Phase 4: Routing & Navigation (1 day)
5. Phase 5: Authentication Forms (1 day)
6. Phase 6: Page Components (0.5 day)
7. Phase 7-9: Integration, Testing, Polish (1 day)

**Key Milestones:**
- ✅ Dependencies installed and shadcn/ui components added
- ✅ AuthService fully implemented with token refresh
- ✅ AuthContext providing authentication state globally
- ✅ All forms created with validation
- ✅ Protected routing working correctly
- ✅ All pages implemented and responsive
- ✅ Manual testing completed successfully
- ✅ Production build working

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-12
**Status:** Ready for Implementation
