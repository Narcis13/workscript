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
 * /executions/:id             → Execution detail
 *
 * /monitoring                 → Real-time monitoring
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
        element: <DashboardPage />,
      },
      {
        path: 'dashboard/profile',
        element: <ProfilePage />,
      },
      {
        path: 'dashboard/users',
        element: (
          <ProtectedRoute requiredRole={Role.ADMIN}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },

      // ----------------------------------------
      // NODE ROUTES (Phase 2)
      // ----------------------------------------
      {
        path: 'nodes',
        element: <NodesPage />,
      },
      {
        path: 'nodes/:nodeId',
        element: <NodeDetailPage />,
      },

      // ----------------------------------------
      // WORKFLOW ROUTES (Phase 3)
      // ----------------------------------------
      {
        path: 'workflows',
        element: <WorkflowsPage />,
      },
      {
        path: 'workflows/new',
        element: <WorkflowCreatePage />,
        // TODO: Add WORKFLOW_CREATE permission check in Phase 3
      },
      {
        path: 'workflows/:id',
        element: <WorkflowDetailPage />,
        // TODO: Add WORKFLOW_READ permission check in Phase 3
      },
      {
        path: 'workflows/:id/edit',
        element: <WorkflowEditPage />,
        // TODO: Add WORKFLOW_UPDATE permission check in Phase 3
      },

      // ----------------------------------------
      // AUTOMATION ROUTES (Phase 4)
      // ----------------------------------------
      {
        path: 'automations',
        element: <AutomationsPage />,
      },
      {
        path: 'automations/new',
        element: <AutomationCreatePage />,
        // TODO: Add AUTOMATION_CREATE permission check in Phase 4
      },
      {
        path: 'automations/:id',
        element: <AutomationDetailPage />,
        // TODO: Add AUTOMATION_READ permission check in Phase 4
      },
      {
        path: 'automations/:id/edit',
        element: <AutomationEditPage />,
        // TODO: Add AUTOMATION_UPDATE permission check in Phase 4
      },

      // ----------------------------------------
      // EXECUTION ROUTES (Phase 6)
      // ----------------------------------------
      {
        path: 'executions',
        element: <ExecutionsPage />,
      },
      {
        path: 'executions/:id',
        element: <ExecutionDetailPage />,
      },

      // ----------------------------------------
      // MONITORING ROUTES (Phase 5)
      // ----------------------------------------
      {
        path: 'monitoring',
        element: <MonitoringPage />,
      },
    ],
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
