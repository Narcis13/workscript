/**
 * Permission Checking Hooks
 *
 * Custom React hooks for role-based access control (RBAC).
 * Provides hooks to check user permissions and roles.
 *
 * @module hooks/usePermission
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Permission, Role } from '../types/auth';

// ============================================
// PERMISSION CHECKING HOOK
// ============================================

/**
 * usePermission Hook
 *
 * Check if the current user has a specific permission.
 * Returns true if user has the permission, false otherwise.
 *
 * @param permission - The permission to check (e.g., Permission.WORKFLOW_CREATE)
 * @returns true if user has the permission, false otherwise
 *
 * @example
 * ```tsx
 * function CreateWorkflowButton() {
 *   const canCreate = usePermission(Permission.WORKFLOW_CREATE);
 *
 *   if (!canCreate) {
 *     return null; // Hide button if user lacks permission
 *   }
 *
 *   return <button>Create Workflow</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function WorkflowActions() {
 *   const canUpdate = usePermission(Permission.WORKFLOW_UPDATE);
 *   const canDelete = usePermission(Permission.WORKFLOW_DELETE);
 *
 *   return (
 *     <div>
 *       {canUpdate && <button>Edit</button>}
 *       {canDelete && <button>Delete</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export const usePermission = (permission: Permission): boolean => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return false;
    }

    // Check if user has the specific permission
    return user.permissions.includes(permission);
  }, [user, permission]);
};

// ============================================
// MULTIPLE PERMISSIONS CHECKING HOOK
// ============================================

/**
 * useHasAnyPermission Hook
 *
 * Check if the current user has ANY of the specified permissions.
 * Returns true if user has at least one of the permissions, false otherwise.
 *
 * @param permissions - Array of permissions to check
 * @returns true if user has any of the permissions, false otherwise
 *
 * @example
 * ```tsx
 * function UserManagement() {
 *   const canManageUsers = useHasAnyPermission([
 *     Permission.USER_UPDATE,
 *     Permission.USER_MANAGE
 *   ]);
 *
 *   if (!canManageUsers) {
 *     return <div>Access Denied</div>;
 *   }
 *
 *   return <UserList />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const isAdmin = useHasAnyPermission([
 *     Permission.SYSTEM_CONFIG,
 *     Permission.SYSTEM_AUDIT
 *   ]);
 *
 *   return isAdmin ? <AdminDashboard /> : <Redirect to="/unauthorized" />;
 * }
 * ```
 */
export const useHasAnyPermission = (permissions: Permission[]): boolean => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || permissions.length === 0) {
      return false;
    }

    // Check if user has any of the specified permissions
    return permissions.some(permission => user.permissions.includes(permission));
  }, [user, permissions]);
};

// ============================================
// ROLE CHECKING HOOK
// ============================================

/**
 * useHasRole Hook
 *
 * Check if the current user has a specific role.
 * Returns true if user has the role, false otherwise.
 *
 * @param role - The role to check (e.g., Role.ADMIN)
 * @returns true if user has the role, false otherwise
 *
 * @example
 * ```tsx
 * function AdminOnlyFeature() {
 *   const isAdmin = useHasRole(Role.ADMIN);
 *
 *   if (!isAdmin) {
 *     return <div>Admin access required</div>;
 *   }
 *
 *   return <AdminPanel />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function Header() {
 *   const isAdmin = useHasRole(Role.ADMIN);
 *
 *   return (
 *     <nav>
 *       <Link to="/dashboard">Dashboard</Link>
 *       {isAdmin && <Link to="/admin">Admin</Link>}
 *     </nav>
 *   );
 * }
 * ```
 */
export const useHasRole = (role: Role): boolean => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return false;
    }

    return user.role === role;
  }, [user, role]);
};

// ============================================
// MULTIPLE ROLES CHECKING HOOK
// ============================================

/**
 * useHasAnyRole Hook
 *
 * Check if the current user has ANY of the specified roles.
 * Returns true if user has at least one of the roles, false otherwise.
 *
 * @param roles - Array of roles to check
 * @returns true if user has any of the roles, false otherwise
 *
 * @example
 * ```tsx
 * function ManagerFeature() {
 *   const hasAccess = useHasAnyRole([Role.ADMIN, Role.USER]);
 *
 *   if (!hasAccess) {
 *     return null;
 *   }
 *
 *   return <ManagerDashboard />;
 * }
 * ```
 */
export const useHasAnyRole = (roles: Role[]): boolean => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || roles.length === 0) {
      return false;
    }

    // Check if user has any of the specified roles
    return roles.includes(user.role);
  }, [user, roles]);
};

/**
 * Export all hooks as default
 */
export default {
  usePermission,
  useHasAnyPermission,
  useHasRole,
  useHasAnyRole,
};
