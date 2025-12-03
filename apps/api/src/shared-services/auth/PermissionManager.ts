/**
 * Permission Manager (RBAC - Role-Based Access Control)
 *
 * Manages role-based permissions and authorization logic.
 *
 * ============ RBAC CONCEPT ============
 *
 * **What is RBAC?**
 * Role-Based Access Control assigns permissions to roles, not individual users.
 *
 * **Three Levels of Authorization:**
 *
 * 1. ROLE-BASED (Coarse-grained)
 *    - User has a role: 'admin', 'user', 'api'
 *    - Role determines what user can do
 *    - Simple, scales well
 *
 * 2. PERMISSION-BASED (Fine-grained)
 *    - Specific actions: 'workflow:create', 'user:manage'
 *    - Can be assigned directly or via role
 *    - Flexible for complex requirements
 *
 * 3. CUSTOM (Combination)
 *    - User has role + additional permissions
 *    - Allows exceptions and special cases
 *    - Example: User role + admin:dashboard permission
 *
 * **This Implementation:**
 * ```
 * User
 *   ├── role: 'admin' (from user.role field)
 *   │    └── gets all permissions
 *   ├── role: 'user'
 *   │    └── gets workflow/automation permissions
 *   ├── role: 'api'
 *   │    └── gets read/execute only
 *   └── custom permissions (from user.permissions field)
 *        └── override role defaults
 * ```
 *
 * @module auth/PermissionManager
 * @see Permission enum in types.ts for all available permissions
 */

import { Role, Permission, SafeUser, AuthException, AuthErrorCode } from './types';

/**
 * Permission Manager Class
 *
 * **Responsibilities:**
 * - Define role-to-permission mappings
 * - Check if user/role has specific permission
 * - Check multiple permissions (any/all)
 * - Validate role and permission values
 *
 * **Design:** Singleton for efficient permission lookups
 *
 * @class PermissionManager
 * @example
 * const pm = PermissionManager.getInstance();
 *
 * // Check role permission
 * if (pm.hasPermission(user.role, Permission.WORKFLOW_CREATE)) {
 *   // User can create workflows
 * }
 *
 * // Check user-specific permission (including custom ones)
 * if (pm.hasUserPermission(user, Permission.WORKFLOW_DELETE)) {
 *   // User can delete (either from role or custom)
 * }
 */
export class PermissionManager {
  private static instance: PermissionManager | null = null;

  /**
   * Role-to-Permission mapping
   *
   * Defines what permissions each role automatically gets.
   *
   * **Principle of Least Privilege:**
   * - ADMIN: All permissions (full access)
   * - USER: Workflow and automation permissions (normal user actions)
   * - API: Read and execute only (programmatic, no modification)
   *
   * **Design consideration:**
   * - Permissions are additive (can't remove via role)
   * - Custom permissions in user.permissions can add more
   * - Can't remove permissions from role via custom (would need blacklist)
   */
  private readonly rolePermissions: Record<Role, Permission[]> = {
    // ========== ADMIN ROLE ==========
    // Full system access - can do everything
    [Role.ADMIN]: Object.values(Permission),

    // ========== USER ROLE ==========
    // Standard user - can manage workflows and automations
    [Role.USER]: [
      // Workflow permissions
      Permission.WORKFLOW_CREATE,
      Permission.WORKFLOW_READ,
      Permission.WORKFLOW_UPDATE,
      Permission.WORKFLOW_DELETE,
      Permission.WORKFLOW_EXECUTE,

      // Automation permissions
      Permission.AUTOMATION_CREATE,
      Permission.AUTOMATION_READ,
      Permission.AUTOMATION_UPDATE,
      Permission.AUTOMATION_DELETE,
      Permission.AUTOMATION_EXECUTE,

      // Execution permissions
      Permission.EXECUTION_READ,
      Permission.EXECUTION_EXPORT,
      Permission.EXECUTION_RERUN,

      // Resource permissions
      Permission.RESOURCE_CREATE,
      Permission.RESOURCE_READ,
      Permission.RESOURCE_UPDATE,
      Permission.RESOURCE_DELETE,

      // User profile
      Permission.USER_READ,
      Permission.USER_UPDATE,

      // API Keys (can manage own)
      Permission.API_KEY_CREATE,
      Permission.API_KEY_READ,
      Permission.API_KEY_DELETE,
    ],

    // ========== API ROLE ==========
    // Programmatic access via API keys - read and execute only
    [Role.API]: [
      // Read workflows
      Permission.WORKFLOW_READ,
      Permission.WORKFLOW_EXECUTE,

      // Read automations
      Permission.AUTOMATION_READ,
      Permission.AUTOMATION_EXECUTE,

      // Execution permissions
      Permission.EXECUTION_READ,

      // Resource permissions (read and create only)
      Permission.RESOURCE_READ,
      Permission.RESOURCE_CREATE,
    ],
  };

  /**
   * Private constructor - use getInstance()
   */
  private constructor() {}

  /**
   * Get singleton instance
   *
   * @static
   * @returns {PermissionManager}
   */
  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Check if a role has a specific permission
   *
   * **Usage:** For role-based checks
   *
   * @param {Role} role The user's role
   * @param {Permission} permission The permission to check
   * @returns {boolean} True if role has permission
   *
   * @example
   * if (pm.hasPermission(Role.ADMIN, Permission.USER_MANAGE)) {
   *   console.log('Admins can manage users');
   * }
   */
  hasPermission(role: Role, permission: Permission): boolean {
    const permissions = this.rolePermissions[role];
    return permissions ? permissions.includes(permission) : false;
  }

  /**
   * Check if user has a specific permission
   *
   * **Checks in order:**
   * 1. User's custom permissions (user.permissions)
   * 2. User's role permissions (via rolePermissions)
   *
   * **Usage:** For actual authorization decisions
   *
   * @param {SafeUser} user The user to check
   * @param {Permission} permission The permission to check
   * @returns {boolean} True if user has permission
   *
   * @example
   * if (pm.hasUserPermission(user, Permission.WORKFLOW_DELETE)) {
   *   // Delete allowed
   * }
   */
  hasUserPermission(user: SafeUser, permission: Permission): boolean {
    // Check custom permissions first
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check role permissions
    return this.hasPermission(user.role, permission);
  }

  /**
   * Check if user has ANY of the specified permissions
   *
   * **Usage:** When user needs at least one of multiple permissions
   *
   * @param {SafeUser} user The user to check
   * @param {Permission[]} permissions Array of permissions
   * @returns {boolean} True if user has at least one permission
   *
   * @example
   * if (pm.hasAnyPermission(user, [
   *   Permission.WORKFLOW_WRITE,
   *   Permission.WORKFLOW_ADMIN
   * ])) {
   *   // User can write workflows via either permission
   * }
   */
  hasAnyPermission(user: SafeUser, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasUserPermission(user, p));
  }

  /**
   * Check if user has ALL of the specified permissions
   *
   * **Usage:** When user needs multiple permissions simultaneously
   *
   * @param {SafeUser} user The user to check
   * @param {Permission[]} permissions Array of permissions
   * @returns {boolean} True if user has all permissions
   *
   * @example
   * if (pm.hasAllPermissions(user, [
   *   Permission.WORKFLOW_WRITE,
   *   Permission.WORKFLOW_DELETE
   * ])) {
   *   // User can both write and delete workflows
   * }
   */
  hasAllPermissions(user: SafeUser, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasUserPermission(user, p));
  }

  /**
   * Assert user has permission (throw if not)
   *
   * **Usage:** In request handlers
   *
   * @param {SafeUser} user The user to check
   * @param {Permission | Permission[]} permissions The required permission(s)
   * @throws {AuthException} If permission not granted
   *
   * @example
   * // In route handler
   * try {
   *   pm.assertPermission(user, Permission.USER_MANAGE);
   *   // User is authorized, continue
   * } catch (error) {
   *   // Permission denied
   *   return c.json({ error: 'Access denied' }, 403);
   * }
   */
  assertPermission(
    user: SafeUser,
    permissions: Permission | Permission[]
  ): void {
    const permsArray = Array.isArray(permissions) ? permissions : [permissions];

    if (!this.hasAllPermissions(user, permsArray)) {
      throw new AuthException(
        AuthErrorCode.INSUFFICIENT_PERMISSIONS,
        `User does not have required permissions: ${permsArray.join(', ')}`,
        403
      );
    }
  }

  /**
   * Get all permissions for a user
   *
   * **Usage:** For permission listing/debugging
   *
   * @param {SafeUser} user The user
   * @returns {Permission[]} All permissions the user has
   *
   * @example
   * const userPerms = pm.getUserPermissions(user);
   * console.log('User can:', userPerms);
   */
  getUserPermissions(user: SafeUser): Permission[] {
    const rolePerms = this.rolePermissions[user.role] || [];
    const customPerms = user.permissions || [];

    // Combine and deduplicate
    return [...new Set([...rolePerms, ...customPerms])];
  }

  /**
   * Get all permissions for a role
   *
   * @param {Role} role The role
   * @returns {Permission[]} All permissions for this role
   */
  getRolePermissions(role: Role): Permission[] {
    return [...(this.rolePermissions[role] || [])];
  }

  /**
   * Check if role is valid
   *
   * @param {any} role Value to check
   * @returns {boolean} True if role is valid
   */
  isValidRole(role: any): role is Role {
    return Object.values(Role).includes(role);
  }

  /**
   * Check if permission is valid
   *
   * @param {any} permission Value to check
   * @returns {boolean} True if permission is valid
   */
  isValidPermission(permission: any): permission is Permission {
    return Object.values(Permission).includes(permission);
  }

  /**
   * Get all available roles
   *
   * @returns {Role[]} Array of all roles
   */
  getAllRoles(): Role[] {
    return Object.values(Role);
  }

  /**
   * Get all available permissions
   *
   * @returns {Permission[]} Array of all permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Get role hierarchy info
   *
   * Returns information about role hierarchy for documentation/UI.
   *
   * @returns {Record<Role, { permissions: Permission[]; description: string }>}
   */
  getRoleHierarchy() {
    return {
      [Role.ADMIN]: {
        description: 'Full system access - can perform all actions',
        permissionCount: this.rolePermissions[Role.ADMIN].length,
        permissions: this.rolePermissions[Role.ADMIN],
      },
      [Role.USER]: {
        description: 'Standard user - can create and manage workflows/automations',
        permissionCount: this.rolePermissions[Role.USER].length,
        permissions: this.rolePermissions[Role.USER],
      },
      [Role.API]: {
        description: 'API access - read and execute only (via API keys)',
        permissionCount: this.rolePermissions[Role.API].length,
        permissions: this.rolePermissions[Role.API],
      },
    };
  }
}

// Export singleton getter
export const getPermissionManager = () => PermissionManager.getInstance();
