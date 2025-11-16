/**
 * ProtectedRoute Component
 *
 * Route guard component that protects routes from unauthorized access.
 * Checks authentication status and optionally role-based permissions.
 *
 * Features:
 * - Authentication check with redirect to login
 * - Loading state during authentication verification
 * - Return URL preservation for post-login redirect
 * - Optional role-based access control
 * - Optional permission-based access control
 * - Redirect to unauthorized page if lacking permissions
 *
 * @module components/guards/ProtectedRoute
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useHasRole, useHasAnyPermission } from '../../hooks/usePermission';
import type { Role, Permission } from '../../types/auth';

// ============================================
// COMPONENT PROPS
// ============================================

/**
 * Props for ProtectedRoute component
 *
 * @interface ProtectedRouteProps
 */
interface ProtectedRouteProps {
  /**
   * Child components to render if access is granted
   */
  children: React.ReactNode;

  /**
   * Optional role required to access this route
   * If provided, user must have this specific role
   *
   * @example
   * ```tsx
   * <ProtectedRoute requiredRole={Role.ADMIN}>
   *   <AdminDashboard />
   * </ProtectedRoute>
   * ```
   */
  requiredRole?: Role;

  /**
   * Optional permissions required to access this route
   * If provided, user must have at least one of these permissions
   *
   * @example
   * ```tsx
   * <ProtectedRoute requiredPermissions={[Permission.USER_MANAGE]}>
   *   <UserList />
   * </ProtectedRoute>
   * ```
   */
  requiredPermissions?: Permission[];
}

// ============================================
// LOADING COMPONENT
// ============================================

/**
 * Simple loading component displayed while checking authentication
 * Can be replaced with a more sophisticated loading indicator if needed
 *
 * TODO: Replace with a more polished loading screen (skeleton, animation)
 * TODO: Add progress indicator for slow network connections
 */
const LoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-sm text-gray-600">Verifying authentication...</p>
      </div>
    </div>
  );
};

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

/**
 * ProtectedRoute Component
 *
 * Wraps route components that require authentication and/or specific permissions.
 * Handles three scenarios:
 * 1. Loading: Shows loading indicator while checking auth status
 * 2. Not Authenticated: Redirects to /login with return URL
 * 3. Insufficient Permissions: Redirects to /unauthorized
 * 4. Authorized: Renders children
 *
 * @component
 * @example
 * ```tsx
 * // Basic authentication check only
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 *
 * @example
 * ```tsx
 * // Require admin role
 * <ProtectedRoute requiredRole={Role.ADMIN}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 *
 * @example
 * ```tsx
 * // Require specific permissions
 * <ProtectedRoute requiredPermissions={[Permission.USER_MANAGE, Permission.USER_READ]}>
 *   <UserList />
 * </ProtectedRoute>
 * ```
 *
 * @example
 * ```tsx
 * // Both role and permissions (must have role AND at least one permission)
 * <ProtectedRoute
 *   requiredRole={Role.ADMIN}
 *   requiredPermissions={[Permission.SYSTEM_CONFIG]}
 * >
 *   <SystemSettings />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions,
}) => {
  // ============================================
  // HOOKS
  // ============================================

  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Check role if required (only if role is specified)
  const hasRequiredRole = useHasRole(requiredRole as Role);

  // Check permissions if required (only if permissions are specified)
  const hasRequiredPermissions = useHasAnyPermission(requiredPermissions || []);

  // ============================================
  // LOADING STATE
  // ============================================

  /**
   * Show loading indicator while authentication is being verified
   * This prevents route flashing and ensures smooth user experience
   */
  if (isLoading) {
    return <LoadingScreen />;
  }

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================

  /**
   * If user is not authenticated, redirect to login page
   * Save the attempted location so we can redirect back after login
   */
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  // ============================================
  // ROLE CHECK
  // ============================================

  /**
   * If a specific role is required and user doesn't have it,
   * redirect to unauthorized page
   */
  if (requiredRole && !hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ============================================
  // PERMISSION CHECK
  // ============================================

  /**
   * If specific permissions are required and user doesn't have any of them,
   * redirect to unauthorized page
   */
  if (requiredPermissions && requiredPermissions.length > 0 && !hasRequiredPermissions) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ============================================
  // AUTHORIZED - RENDER CHILDREN
  // ============================================

  /**
   * User is authenticated and has required permissions
   * Render the protected content
   */
  return <>{children}</>;
};

/**
 * Export as default for convenience
 */
export default ProtectedRoute;
