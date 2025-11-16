# Workscript Frontend Application

A production-ready React application with complete authentication system, built with Vite, React 19, TypeScript, and Tailwind CSS v4.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
- [Development](#development)
  - [Available Scripts](#available-scripts)
  - [Project Structure](#project-structure)
- [Authentication System](#authentication-system)
  - [Architecture Overview](#architecture-overview)
  - [Key Components](#key-components)
  - [Authentication Flow](#authentication-flow)
  - [Token Management](#token-management)
- [Usage Guide](#usage-guide)
  - [Using Authentication](#using-authentication)
  - [Protected Routes](#protected-routes)
  - [Permission Checks](#permission-checks)
- [UI Components](#ui-components)
- [API Integration](#api-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Features

✅ **Complete Authentication System**
- User registration with email/password
- User login with JWT tokens
- Secure logout with token cleanup
- Password change functionality
- Automatic token refresh on expiration

✅ **Protected Routes**
- Route guards for authenticated pages
- Role-based access control (RBAC)
- Permission-based UI rendering
- Automatic redirect to login for unauthenticated users

✅ **Modern UI**
- shadcn/ui component library
- Tailwind CSS v4 for styling
- Fully responsive design (mobile, tablet, desktop)
- Dark mode support (via shadcn/ui)

✅ **Form Validation**
- Real-time form validation with Zod
- Password strength indicator
- Field-level error messages
- Type-safe form handling with react-hook-form

✅ **User Management**
- Admin dashboard for viewing users
- User profile page
- Password change interface

✅ **Public Workflow Demo**
- Accessible without authentication
- Showcases workflow capabilities

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React | 19.1.x | UI library |
| Build Tool | Vite | 6.3.x | Fast development & build |
| Language | TypeScript | 5.8.x | Type safety |
| Styling | Tailwind CSS | 4.1.x | Utility-first CSS |
| UI Library | shadcn/ui | Latest | Component library |
| Routing | React Router | 6.x | Client-side routing |
| Forms | react-hook-form | 7.x | Form management |
| Validation | Zod | 3.x | Schema validation |
| HTTP Client | Axios | 1.x | API communication |
| Runtime | Bun | 1.x | Package manager & runtime |

---

## Getting Started

### Prerequisites

- **Bun** 1.0 or later ([Install Bun](https://bun.sh))
- **Node.js** 18+ (optional, Bun is preferred)
- **API Server** running at `http://localhost:3013` (see `/apps/api`)

### Installation

1. **Navigate to frontend directory:**
   ```bash
   cd apps/frontend
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Start development server:**
   ```bash
   bun run dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:5173`

### Environment Configuration

Create a `.env` file in `/apps/frontend/` with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:3013

# Optional: Production API URL
# VITE_API_URL=https://api.your-production-domain.com
```

**Environment Variables:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3013` | Yes |

**Note:** All environment variables must be prefixed with `VITE_` to be accessible in the Vite application.

---

## Development

### Available Scripts

From the **root of the monorepo** (`/`):

```bash
# Start all services (engine, api, frontend)
bun run dev

# Start frontend only
bun run dev:frontend

# Build frontend
bun run build:frontend

# Run type checking
bun run typecheck

# Format code
bun run format
```

From `/apps/frontend/`:

```bash
# Start development server with hot reload
bun run dev

# Build for production
bun run build

# Preview production build locally
bun run preview

# Run type checking
bun run typecheck

# Lint code
bun run lint
```

### Project Structure

```
apps/frontend/
├── src/
│   ├── components/
│   │   ├── auth/              # Authentication forms
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ChangePasswordForm.tsx
│   │   │   └── ResetPasswordForm.tsx
│   │   ├── guards/            # Route protection
│   │   │   └── ProtectedRoute.tsx
│   │   ├── layout/            # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── DashboardLayout.tsx
│   │   └── ui/                # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── form.tsx
│   │       └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx    # Global auth state
│   ├── hooks/
│   │   ├── useAuth.ts         # Auth hook
│   │   └── usePermission.ts   # Permission hooks
│   ├── lib/
│   │   ├── api.ts             # Axios instance
│   │   ├── utils.ts           # Utility functions
│   │   └── errorHandling.ts   # Error handling utilities
│   ├── pages/
│   │   ├── auth/              # Auth pages
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── dashboard/         # Protected pages
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── UsersPage.tsx
│   │   ├── WorkflowDemoPage.tsx
│   │   └── UnauthorizedPage.tsx
│   ├── services/
│   │   └── AuthService.ts     # API communication
│   ├── types/
│   │   └── auth.ts            # TypeScript types
│   ├── App.tsx                # Main app component with routes
│   ├── main.tsx               # App entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── .env                       # Environment variables (git-ignored)
├── .env.example               # Environment template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md                  # This file
```

---

## Authentication System

### Architecture Overview

The authentication system follows a **centralized service architecture** with **React Context** for global state management:

```
┌─────────────────────────────────────────────────┐
│              React Components                   │
│   (Forms, Pages, Protected Routes)              │
└───────────────────┬─────────────────────────────┘
                    │ useAuth()
                    ↓
┌─────────────────────────────────────────────────┐
│           AuthContext (Global State)            │
│   - user: User | null                           │
│   - isLoading: boolean                          │
│   - login(email, password)                      │
│   - register(email, password)                   │
│   - logout()                                    │
│   - refreshUser()                               │
└───────────────────┬─────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────┐
│         AuthService (API Client)                │
│   - Axios instance with interceptors            │
│   - Token storage (localStorage)                │
│   - Automatic token refresh                     │
│   - Request/Response handling                   │
└───────────────────┬─────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────┐
│         Hono API Server (/apps/api)             │
│   - JWT token generation                        │
│   - User authentication                         │
│   - Token refresh endpoint                      │
└─────────────────────────────────────────────────┘
```

### Key Components

#### 1. AuthService (`src/services/AuthService.ts`)

A **singleton service** that handles all API communication:

**Features:**
- Axios instance with automatic token injection
- Token storage in localStorage
- Automatic token refresh on 401 responses
- Single concurrent refresh request prevention
- Request retry after successful refresh

**Key Methods:**
```typescript
class AuthService {
  // Authentication
  login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }>
  register(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }>
  logout(): Promise<void>

  // User management
  getCurrentUser(): Promise<User>
  changePassword(oldPassword: string, newPassword: string): Promise<void>

  // Token management (private)
  private refreshAccessToken(): Promise<void>
  private setTokens(tokens: AuthTokens): void
  private clearTokens(): void

  // Status checks
  isAuthenticated(): boolean
  isTokenExpired(): boolean
}
```

#### 2. AuthContext (`src/contexts/AuthContext.tsx`)

Provides **global authentication state** to all components:

**State:**
```typescript
{
  user: User | null;           // Current user or null
  isLoading: boolean;          // Loading state
  isAuthenticated: boolean;    // Computed from user
}
```

**Methods:**
```typescript
{
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
}
```

**Usage:**
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user?.email}!</div>;
}
```

#### 3. ProtectedRoute (`src/components/guards/ProtectedRoute.tsx`)

A **route guard component** that protects routes from unauthorized access:

**Features:**
- Checks authentication status
- Redirects to login if not authenticated
- Saves original URL for redirect after login
- Supports role-based access control
- Shows loading state during auth check

**Usage:**
```typescript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>

// With role requirement
<Route
  path="/admin"
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

### Authentication Flow

#### Registration Flow

1. User fills out registration form (email + password)
2. Form validation (Zod schema)
3. `register()` called in AuthContext
4. AuthService sends POST to `/api/auth/register`
5. API returns user + tokens
6. Tokens stored in localStorage
7. User object stored in context state
8. User redirected to dashboard

#### Login Flow

1. User fills out login form (email + password)
2. Form validation
3. `login()` called in AuthContext
4. AuthService sends POST to `/api/auth/login`
5. API returns user + tokens
6. Tokens stored in localStorage
7. User object stored in context state
8. User redirected to originally requested page (or dashboard)

#### Logout Flow

1. User clicks logout button
2. `logout()` called in AuthContext
3. AuthService sends POST to `/api/auth/logout` (sends both tokens)
4. Tokens cleared from localStorage (even if API fails)
5. User object cleared from context state
6. User redirected to login page

#### Password Change Flow

1. User navigates to profile page
2. User fills out change password form (current + new password)
3. Form validation
4. `changePassword()` called in AuthService
5. API verifies current password and updates to new password
6. Success message displayed
7. Form reset

### Token Management

#### Token Storage

**Location:** `localStorage`

**Keys:**
- `accessToken` - Short-lived JWT (15 minutes)
- `refreshToken` - Long-lived JWT (7 days)
- `tokenExpiry` - Timestamp for access token expiration

#### Automatic Token Refresh

The AuthService uses **Axios interceptors** to automatically handle token refresh:

**Response Interceptor:**
```typescript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - attempt refresh
      await authService.refreshAccessToken();
      // Retry original request with new token
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

**Refresh Prevention:**
- Only one refresh request at a time
- Subsequent 401 errors wait for ongoing refresh
- If refresh fails, user is logged out

---

## Usage Guide

### Using Authentication

#### In Components

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <p>Welcome, {user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### In Forms

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';

function LoginForm() {
  const { login } = useAuth();
  const form = useForm();

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await login(data.email, data.password);
      // Redirect handled by AuthContext
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

### Protected Routes

#### Basic Protection

```typescript
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

#### Role-Based Protection

```typescript
<Route
  path="/admin/users"
  element={
    <ProtectedRoute requiredRole="admin">
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

### Permission Checks

#### Check Single Permission

```typescript
import { usePermission } from '@/hooks/usePermission';

function DeleteButton() {
  const canDelete = usePermission('users.delete');

  if (!canDelete) {
    return null; // Hide button
  }

  return <button>Delete User</button>;
}
```

#### Check Multiple Permissions

```typescript
import { useHasAnyPermission } from '@/hooks/usePermission';

function AdminTools() {
  const hasAdminAccess = useHasAnyPermission(['users.manage', 'roles.manage']);

  if (!hasAdminAccess) {
    return null;
  }

  return <div>Admin tools...</div>;
}
```

---

## UI Components

This application uses **shadcn/ui** components for consistent, accessible UI:

### Installed Components

- **Form Controls:** `input`, `label`, `form`, `button`, `textarea`
- **Feedback:** `alert`, `toast`
- **Layout:** `card`, `separator`, `table`
- **Navigation:** `dropdown-menu`
- **Display:** `avatar`, `badge`
- **Overlays:** `dialog`, `sheet`

### Adding New Components

```bash
bunx shadcn@latest add [component-name]
```

Example:
```bash
bunx shadcn@latest add dialog
```

### Component Usage

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

function MyForm() {
  return (
    <div>
      <Input type="email" placeholder="Email" />
      <Button>Submit</Button>
      <Alert>
        <AlertDescription>Success!</AlertDescription>
      </Alert>
    </div>
  );
}
```

---

## API Integration

### Base Configuration

All API calls use the configured base URL from environment variables:

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3013',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies if needed
});

export default api;
```

### Making API Calls

```typescript
import api from '@/lib/api';

// GET request
const users = await api.get('/api/users');

// POST request
const result = await api.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'password123',
});

// Authenticated request (token automatically added)
const profile = await api.get('/api/auth/me');
```

### Error Handling

```typescript
import { handleApiError } from '@/lib/errorHandling';

try {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
} catch (error) {
  const errorMessage = handleApiError(error);
  console.error(errorMessage);
  throw error;
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to API"

**Symptoms:** Network errors, "ERR_CONNECTION_REFUSED"

**Solution:**
- Ensure API server is running: `bun run dev:api` (from root)
- Check `VITE_API_URL` in `.env` is correct
- Verify API is running on `http://localhost:3013`

#### 2. "Token refresh loop"

**Symptoms:** Continuous 401 errors, app keeps logging out

**Solution:**
- Clear localStorage: `localStorage.clear()`
- Refresh the page
- Log in again
- Check API refresh endpoint is working

#### 3. "Protected route redirects immediately"

**Symptoms:** Can't access dashboard after login

**Solution:**
- Open browser DevTools > Network tab
- Check if `/api/auth/me` request succeeds
- Verify tokens are in localStorage
- Check for errors in console

#### 4. "Form validation not working"

**Symptoms:** Form submits without validation

**Solution:**
- Check Zod schema is defined correctly
- Verify `react-hook-form` resolver is configured
- Check for console errors

#### 5. "UI components not styled"

**Symptoms:** Components appear unstyled or broken

**Solution:**
- Ensure Tailwind CSS is configured correctly
- Check `tailwind.config.ts` includes component paths
- Run `bun run dev` to rebuild

#### 6. "Environment variables undefined"

**Symptoms:** `import.meta.env.VITE_API_URL` is undefined

**Solution:**
- Ensure variables are prefixed with `VITE_`
- Restart dev server after changing `.env`
- Check `.env` file exists in `/apps/frontend/`

### Debugging Tips

#### Enable Verbose Logging

Add to `AuthService.ts`:
```typescript
console.log('[AuthService] Login attempt:', email);
console.log('[AuthService] Token stored:', accessToken);
```

#### Check Auth State

In any component:
```typescript
const { user, isLoading, isAuthenticated } = useAuth();
console.log({ user, isLoading, isAuthenticated });
```

#### Inspect Tokens

In browser console:
```javascript
console.log({
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  tokenExpiry: localStorage.getItem('tokenExpiry'),
});
```

#### Clear Auth State

```javascript
// In browser console
localStorage.clear();
location.reload();
```

---

## Best Practices

### Security

✅ **DO:**
- Use HTTPS in production
- Store tokens in localStorage (as per integration guide)
- Never log passwords or tokens
- Validate all user input
- Use Zod schemas for validation

❌ **DON'T:**
- Expose tokens in URLs or query parameters
- Log sensitive data
- Disable CORS without understanding implications
- Skip input validation

### Code Quality

✅ **DO:**
- Use TypeScript strict mode
- Type all props and state
- Use `useAuth()` hook consistently
- Handle errors gracefully
- Show loading states

❌ **DON'T:**
- Use `any` type
- Access localStorage directly (use AuthService)
- Forget error handling
- Skip loading states

### Performance

✅ **DO:**
- Use React.memo for expensive components
- Lazy load routes with React.lazy
- Optimize images and assets
- Use code splitting

❌ **DON'T:**
- Put large objects in context state
- Re-render unnecessarily
- Load all routes upfront

### Accessibility

✅ **DO:**
- Use semantic HTML
- Add ARIA labels
- Support keyboard navigation
- Test with screen readers

❌ **DON'T:**
- Remove focus outlines
- Use div for buttons
- Skip alt text on images

---

## Additional Resources

### Documentation

- **Project Overview:** `/CLAUDE.md`
- **API Documentation:** `/apps/api/README.md`
- **Integration Guide:** `/apps/api/docs/INTEGRATION_GUIDE.md`
- **Auth Specification:** `/.kiro/specs/react_client_auth/`

### External Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Zod Documentation](https://zod.dev)

---

## Support

For issues or questions:

1. Check this README first
2. Review troubleshooting section
3. Check specification in `/.kiro/specs/react_client_auth/`
4. Review API integration guide
5. Open an issue or contact the team

---

**Version:** 1.0.0
**Last Updated:** 2025-11-16
**Status:** Production Ready

**Happy Coding! 🚀**
