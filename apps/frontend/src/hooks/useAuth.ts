/**
 * useAuth Hook
 *
 * Custom React hook to access authentication context.
 * Provides type-safe access to authentication state and methods.
 *
 * @module hooks/useAuth
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../types/auth';

/**
 * useAuth Hook
 *
 * Access authentication state and methods from AuthContext.
 * Must be used within an AuthProvider component tree.
 *
 * @returns Authentication context with user state and methods
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { login, isLoading } = useAuth();
 *
 *   const handleSubmit = async (email: string, password: string) => {
 *     try {
 *       await login(email, password);
 *       navigate('/dashboard');
 *     } catch (error) {
 *       setError(error.message);
 *     }
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, logout } = useAuth();
 *
 *   if (!user) {
 *     return <div>Not authenticated</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Email: {user.email}</p>
 *       <p>Role: {user.role}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider> to use authentication features.'
    );
  }

  return context;
};

/**
 * Export as default for convenience
 */
export default useAuth;
