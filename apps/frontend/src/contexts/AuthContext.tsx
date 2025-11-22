/**
 * Authentication Context
 *
 * Global authentication state management using React Context API.
 * Provides authentication state and methods to all components in the tree.
 *
 * Features:
 * - Automatic token validation on app initialization
 * - Centralized user state management
 * - Authentication methods (login, register, logout, refreshUser)
 * - Loading states for async operations
 * - Error handling
 *
 * @module contexts/AuthContext
 */

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/AuthService';
import type { User, AuthContextType } from '../types/auth';

// ============================================
// CONTEXT CREATION
// ============================================

/**
 * AuthContext - React context for authentication state
 *
 * Use the useAuth hook to access this context instead of using it directly.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER PROPS
// ============================================

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

// ============================================
// AUTH PROVIDER COMPONENT
// ============================================

/**
 * AuthProvider Component
 *
 * Wraps the application and provides authentication state to all child components.
 * Automatically checks for existing tokens on mount and fetches current user if authenticated.
 *
 * @component
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ============================================
  // STATE
  // ============================================

  /**
   * Current authenticated user (null if not authenticated)
   */
  const [user, setUser] = useState<User | null>(null);

  /**
   * Loading state for async authentication operations
   * True during initialization, login, register, logout, and user refresh
   */
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ============================================
  // INITIALIZATION - Check for existing tokens on mount
  // ============================================

  useEffect(() => {
    /**
     * Initialize authentication state
     * Checks if user has valid tokens and fetches current user if so
     */
    const initializeAuth = async () => {
      try {
        // Check if user has tokens in localStorage
        if (authService.isAuthenticated()) {
          // Tokens exist - fetch current user from API
          // The axios interceptor will automatically refresh the token if expired
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error: any) {
        // Distinguish between auth errors (invalid/expired tokens) and other errors
        const isAuthError =
          error?.response?.status === 401 ||
          error?.message?.includes('refresh token') ||
          error?.message?.includes('authentication');

        if (isAuthError) {
          // Token validation/refresh failed - clear tokens and reset state
          console.error('Authentication failed during initialization:', error);
          authService.clearTokens();
          setUser(null);
        } else {
          // Network error or temporary server issue - keep tokens, user will be logged out on next nav
          console.error('Failed to initialize authentication (non-auth error):', error);
          // Don't clear tokens - let user try again or navigate to trigger another auth check
        }
      } finally {
        // Mark initialization as complete
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []); // Run only once on mount

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Login user with email and password
   *
   * @param email - User email address
   * @param password - User password
   * @throws Error if login fails
   *
   * @example
   * ```tsx
   * const { login } = useAuth();
   * try {
   *   await login('user@example.com', 'password123');
   *   // User is now authenticated, navigate to dashboard
   * } catch (error) {
   *   // Show error message
   * }
   * ```
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
    } catch (error) {
      // Re-throw error for component to handle
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user with email and password
   *
   * Automatically logs in the user after successful registration
   *
   * @param email - User email address
   * @param password - User password (must meet security requirements)
   * @throws Error if registration fails
   *
   * @example
   * ```tsx
   * const { register } = useAuth();
   * try {
   *   await register('newuser@example.com', 'SecurePass123');
   *   // User is now registered and authenticated
   * } catch (error) {
   *   // Show error message (e.g., email already exists)
   * }
   * ```
   */
  const register = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(email, password);
      setUser(newUser);
    } catch (error) {
      // Re-throw error for component to handle
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout current user
   *
   * Clears tokens from localStorage and resets user state.
   * Calls logout endpoint on backend to invalidate tokens.
   *
   * @example
   * ```tsx
   * const { logout } = useAuth();
   * await logout();
   * // User is now logged out, navigate to login page
   * ```
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      // Log error but don't throw - we still want to clear local state
      console.error('Logout error:', error);
    } finally {
      // Always clear user state
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh current user data from API
   *
   * Useful after updating user profile or when you need to ensure
   * user data is up-to-date (e.g., after role/permission changes)
   *
   * @throws Error if refresh fails
   *
   * @example
   * ```tsx
   * const { refreshUser } = useAuth();
   * // After changing password
   * await refreshUser();
   * ```
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser);
    } catch (error) {
      // If refresh fails, assume token is invalid
      console.error('Failed to refresh user:', error);
      authService.clearTokens();
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Check if user is authenticated
   * True if user object exists
   */
  const isAuthenticated = !!user;

  /**
   * Check if current user has a specific permission
   *
   * Checks both custom permissions (user.permissions array) AND role-based permissions.
   * This matches the backend PermissionManager logic to ensure consistency.
   *
   * Permission checking order:
   * 1. Check user's custom permissions array
   * 2. Check user's role-based permissions (admin gets all, user gets workflow/automation/execution, api gets read-only)
   *
   * @param permission - Permission string to check (e.g., 'WORKFLOW_READ', 'workflow:read')
   * @returns True if user has the permission, false otherwise
   *
   * @example
   * ```tsx
   * const { hasPermission } = useAuth();
   * if (hasPermission('WORKFLOW_READ')) {
   *   // Show workflow list
   * }
   * ```
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) {
      return false;
    }

    // Normalize permission string (convert enum to string format)
    const normalizedPermission = permission.toLowerCase().replace('_', ':');

    // 1. Check custom permissions array (if exists)
    if (user.permissions && user.permissions.length > 0) {
      const hasCustomPermission = user.permissions.some(
        (p) => p.toLowerCase() === normalizedPermission || p.toLowerCase() === permission.toLowerCase()
      );
      if (hasCustomPermission) {
        return true;
      }
    }

    // 2. Check role-based permissions (matches backend PermissionManager)
    // ADMIN: All permissions
    if (user.role === 'admin') {
      return true;
    }

    // USER: Workflow, automation, and execution permissions
    if (user.role === 'user') {
      const userPermissions = [
        'workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete', 'workflow:execute',
        'automation:create', 'automation:read', 'automation:update', 'automation:delete', 'automation:execute',
        'execution:read', 'execution:export', 'execution:rerun',
        'user:read', 'user:update',
        'apikey:create', 'apikey:read', 'apikey:delete',
      ];
      return userPermissions.some(p => p === normalizedPermission || p.replace(':', '_').toUpperCase() === permission.toUpperCase());
    }

    // API: Read and execute only
    if (user.role === 'api') {
      const apiPermissions = [
        'workflow:read', 'workflow:execute',
        'automation:read', 'automation:execute',
        'execution:read',
      ];
      return apiPermissions.some(p => p === normalizedPermission || p.replace(':', '_').toUpperCase() === permission.toUpperCase());
    }

    return false;
  }, [user]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  /**
   * Context value provided to all child components
   * Memoized to prevent unnecessary re-renders
   */
  const value: AuthContextType = useMemo(() => ({
    // State
    user,
    isAuthenticated,
    isLoading,

    // Methods
    login,
    register,
    logout,
    refreshUser,
    hasPermission,
  }), [user, isAuthenticated, isLoading, login, register, logout, refreshUser, hasPermission]);

  // ============================================
  // RENDER
  // ============================================

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// CUSTOM HOOK
// ============================================

/**
 * useAuth Hook
 *
 * Custom hook to access authentication context.
 * Must be used within an AuthProvider component.
 *
 * @throws Error if used outside of AuthProvider
 * @returns AuthContextType - Authentication state and methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginForm onLogin={login} />;
 *   }
 *
 *   return <div>Welcome {user.email}</div>;
 * }
 * ```
 */
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Export AuthProvider as default
 */
export default AuthProvider;
