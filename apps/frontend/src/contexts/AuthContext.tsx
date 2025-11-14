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

import React, { createContext, useState, useEffect } from 'react';
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
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        // Token validation failed - clear tokens and reset state
        console.error('Failed to initialize authentication:', error);
        authService.clearTokens();
        setUser(null);
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
  const login = async (email: string, password: string): Promise<void> => {
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
  };

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
  const register = async (email: string, password: string): Promise<void> => {
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
  };

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
  const logout = async (): Promise<void> => {
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
  };

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
  const refreshUser = async (): Promise<void> => {
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
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Check if user is authenticated
   * True if user object exists
   */
  const isAuthenticated = !!user;

  // ============================================
  // CONTEXT VALUE
  // ============================================

  /**
   * Context value provided to all child components
   */
  const value: AuthContextType = {
    // State
    user,
    isAuthenticated,
    isLoading,

    // Methods
    login,
    register,
    logout,
    refreshUser,
  };

  // ============================================
  // RENDER
  // ============================================

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Export AuthProvider as default
 */
export default AuthProvider;
