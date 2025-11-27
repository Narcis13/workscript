/**
 * Central Routing Configuration for Workscript Main UI
 *
 * Implements React Router v7 with createBrowserRouter for improved
 * route management, lazy loading, and nested route structure.
 *
 * Architecture:
 * - Public routes (auth, demo pages)
 * - Protected routes with AppLayout wrapper
 * - Nested routes for workflows, automations, executions
 * - 404 catch-all route
 *
 * Features:
 * - Code splitting with lazy loading for all route components
 * - Protected route guards with authentication checks
 * - Permission-based access control
 * - Nested layouts with AppLayout for authenticated views
 *
 * @module routes
 */

import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/guards/RouteErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { Role } from '@/types/auth';

// ============================================
// LAZY-LOADED PAGE COMPONENTS
// ============================================

// Auth Pages (Public)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

// Public Pages
const WorkflowDemoPage = lazy(() => import('@/pages/WorkflowDemoPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Dashboard Pages (Protected)
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const UsersPage = lazy(() => import('@/pages/dashboard/UsersPage'));

// Node Pages (Protected)
const NodesPage = lazy(() => import('@/pages/nodes/NodesPage'));
const NodeDetailPage = lazy(() => import('@/pages/nodes/NodeDetailPage'));

// Workflow Pages (Protected)
const WorkflowsPage = lazy(() => import('@/pages/workflows/WorkflowsPage'));
const WorkflowCreatePage = lazy(() => import('@/pages/workflows/WorkflowCreatePage'));
const WorkflowDetailPage = lazy(() => import('@/pages/workflows/WorkflowDetailPage'));
const WorkflowEditPage = lazy(() => import('@/pages/workflows/WorkflowEditPage'));

// Automation Pages (Protected)
const AutomationsPage = lazy(() => import('@/pages/automations/AutomationsPage'));
const AutomationCreatePage = lazy(() => import('@/pages/automations/AutomationCreatePage'));
const AutomationDetailPage = lazy(() => import('@/pages/automations/AutomationDetailPage'));
const AutomationEditPage = lazy(() => import('@/pages/automations/AutomationEditPage'));

// Execution Pages (Protected)
const ExecutionsPage = lazy(() => import('@/pages/executions/ExecutionsPage'));
const ExecutionDetailPage = lazy(() => import('@/pages/executions/ExecutionDetailPage'));

// Monitoring Pages (Protected)
const MonitoringPage = lazy(() => import('@/pages/monitoring/MonitoringPage'));

// Integration Pages (Protected)
const IntegrationsPage = lazy(() => import('@/pages/integrations/IntegrationsPage'));
const OAuthCallbackPage = lazy(() => import('@/pages/integrations/OAuthCallbackPage'));

// ============================================
// ROUTER CONFIGURATION
// ============================================

/**
 * Main application router using createBrowserRouter
 *
 * Route Structure:
 * ```
 * /                           → Redirect to /dashboard
 * /login                      → Public: Login page
 * /register                   → Public: Register page
 * /reset-password             → Public: Password reset
 * /workflow-demo              → Public: Workflow demo
 * /unauthorized               → Public: 403 page
 *
 * Protected routes with AppLayout:
 * /dashboard                  → Dashboard home
 * /dashboard/profile          → User profile
 * /dashboard/users            → User management (admin only)
 *
 * /nodes                      → Node library browser
 * /nodes/:nodeId              → Node detail view
 *
 * /workflows                  → Workflows list
 * /workflows/new              → Create workflow
 * /workflows/:id              → Workflow detail
 * /workflows/:id/edit         → Edit workflow
 *
 * /automations                → Automations list
 * /automations/new            → Create automation
 * /automations/:id            → Automation detail
 * /automations/:id/edit       → Edit automation
 *
 * /executions                 → Execution history
 * /executions/:executionId    → Execution detail
 *
 * /monitoring                 → Real-time monitoring
 *
 * /integrations               → OAuth integrations management
 * /integrations/oauth/callback → OAuth callback handler (outside AppLayout)
 *
 * /*                          → 404 Not Found
 * ```
 *
 * Usage in App.tsx:
 * ```tsx
 * import { RouterProvider } from 'react-router-dom';
 * import { router } from './routes';
 *
 * function App() {
 *   return <RouterProvider router={router} />;
 * }
 * ```
 */
export const router = createBrowserRouter([
  // ============================================
  // PUBLIC ROUTES
  // ============================================
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/workflow-demo',
    element: <WorkflowDemoPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },

  // ============================================
  // PROTECTED ROUTES WITH APP LAYOUT
  // ============================================
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      // ----------------------------------------
      // DEFAULT REDIRECT
      // ----------------------------------------
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },

      // ----------------------------------------
      // DASHBOARD ROUTES
      // ----------------------------------------
      {
        path: 'dashboard',
        element: (
          <RouteErrorBoundary fallbackPath="/">
            <DashboardPage />
          </RouteErrorBoundary>
        ),
      },
      {
        path: 'dashboard/profile',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <ProfilePage />
          </RouteErrorBoundary>
        ),
      },
      {
        path: 'dashboard/users',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <ProtectedRoute requiredRole={Role.ADMIN}>
              <UsersPage />
            </ProtectedRoute>
          </RouteErrorBoundary>
        ),
      },

      // ----------------------------------------
      // NODE ROUTES (Phase 2)
      // ----------------------------------------
      {
        path: 'nodes',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <NodesPage />
          </RouteErrorBoundary>
        ),
      },
      {
        path: 'nodes/:nodeId',
        element: (
          <RouteErrorBoundary fallbackPath="/nodes">
            <NodeDetailPage />
          </RouteErrorBoundary>
        ),
      },

      // ----------------------------------------
      // WORKFLOW ROUTES (Phase 3)
      // ----------------------------------------
      {
        path: 'workflows',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <WorkflowsPage />
          </RouteErrorBoundary>
        ),
      },
      {
        path: 'workflows/new',
        element: (
          <RouteErrorBoundary fallbackPath="/workflows">
            <WorkflowCreatePage />
          </RouteErrorBoundary>
        ),
        // TODO: Add WORKFLOW_CREATE permission check in Phase 3
      },
      {
        path: 'workflows/:id',
        element: (
          <RouteErrorBoundary fallbackPath="/workflows">
            <WorkflowDetailPage />
          </RouteErrorBoundary>
        ),
        // TODO: Add WORKFLOW_READ permission check in Phase 3
      },
      {
        path: 'workflows/:id/edit',
        element: (
          <RouteErrorBoundary fallbackPath="/workflows">
            <WorkflowEditPage />
          </RouteErrorBoundary>
        ),
        // TODO: Add WORKFLOW_UPDATE permission check in Phase 3
      },

      // ----------------------------------------
      // AUTOMATION ROUTES (Phase 4)
      // ----------------------------------------
      {
        path: 'automations',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <AutomationsPage />
          </RouteErrorBoundary>
        ),
      },
      {
        path: 'automations/new',
        element: (
          <RouteErrorBoundary fallbackPath="/automations">
            <AutomationCreatePage />
          </RouteErrorBoundary>
        ),
        // TODO: Add AUTOMATION_CREATE permission check in Phase 4
      },
      {
        path: 'automations/:id',
        element: (
          <RouteErrorBoundary fallbackPath="/automations">
            <AutomationDetailPage />
          </RouteErrorBoundary>
        ),
        // TODO: Add AUTOMATION_READ permission check in Phase 4
      },
      {
        path: 'automations/:id/edit',
        element: (
          <RouteErrorBoundary fallbackPath="/automations">
            <AutomationEditPage />
          </RouteErrorBoundary>
        ),
        // TODO: Add AUTOMATION_UPDATE permission check in Phase 4
      },

      // ----------------------------------------
      // EXECUTION ROUTES (Phase 6)
      // ----------------------------------------
      {
        path: 'executions',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <ExecutionsPage />
          </RouteErrorBoundary>
        ),
      },
      {
        path: 'executions/:executionId',
        element: (
          <RouteErrorBoundary fallbackPath="/executions">
            <ExecutionDetailPage />
          </RouteErrorBoundary>
        ),
      },

      // ----------------------------------------
      // MONITORING ROUTES (Phase 5)
      // ----------------------------------------
      {
        path: 'monitoring',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <MonitoringPage />
          </RouteErrorBoundary>
        ),
      },

      // ----------------------------------------
      // INTEGRATION ROUTES
      // ----------------------------------------
      {
        path: 'integrations',
        element: (
          <RouteErrorBoundary fallbackPath="/dashboard">
            <IntegrationsPage />
          </RouteErrorBoundary>
        ),
      },
    ],
  },

  // ============================================
  // OAUTH CALLBACK ROUTE (Outside AppLayout - minimal page)
  // ============================================
  {
    path: '/integrations/oauth/callback',
    element: (
      <ProtectedRoute>
        <RouteErrorBoundary fallbackPath="/integrations">
          <OAuthCallbackPage />
        </RouteErrorBoundary>
      </ProtectedRoute>
    ),
  },

  // ============================================
  // 404 NOT FOUND ROUTE (Catch-all)
  // ============================================
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

/**
 * Export router as default for convenience
 */
export default router;
