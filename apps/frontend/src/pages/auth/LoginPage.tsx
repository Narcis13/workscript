/**
 * LoginPage Component
 *
 * Page component for user login.
 *
 * Features:
 * - Uses AuthLayout for consistent auth page design
 * - Includes LoginForm component
 * - Redirects authenticated users to dashboard
 * - Handles return URL from location state
 *
 * Requirements Coverage:
 * - Requirement 2: User Login
 * - Requirement 20: Routing and Navigation
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

/**
 * LoginPage Component
 *
 * Renders the login page with the login form inside the auth layout.
 * Redirects already authenticated users to the dashboard.
 *
 * Acceptance Criteria:
 * - 2.1: Display login page at /login route
 * - 2.11: Redirect to dashboard if already authenticated
 * - 20.2: Access /login displays the login page
 *
 * @component
 * @example
 * ```tsx
 * // In router configuration
 * <Route path="/login" element={<LoginPage />} />
 * ```
 */
export function LoginPage() {
  // ============================================
  // HOOKS
  // ============================================

  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // ============================================
  // REDIRECT IF ALREADY AUTHENTICATED
  // ============================================

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // User is already logged in, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // ============================================
  // LOADING STATE
  // ============================================

  // Show loading indicator while checking authentication status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  // Don't render the form if user is authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your account to continue"
    >
      <LoginForm />
    </AuthLayout>
  );
}

export default LoginPage;
