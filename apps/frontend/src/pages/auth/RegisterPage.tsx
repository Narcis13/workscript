/**
 * RegisterPage Component
 *
 * Page component for new user registration.
 *
 * Features:
 * - Uses AuthLayout for consistent auth page design
 * - Includes RegisterForm component
 * - Redirects authenticated users to dashboard
 * - Handles auto-login after successful registration
 *
 * Requirements Coverage:
 * - Requirement 1: User Registration
 * - Requirement 20: Routing and Navigation
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

/**
 * RegisterPage Component
 *
 * Renders the registration page with the registration form inside the auth layout.
 * Redirects already authenticated users to the dashboard.
 *
 * Acceptance Criteria:
 * - 1.1: Display registration page at /register route
 * - 1.10: Redirect to dashboard if already authenticated
 * - 20.3: Access /register displays the registration page
 *
 * @component
 * @example
 * ```tsx
 * // In router configuration
 * <Route path="/register" element={<RegisterPage />} />
 * ```
 */
export function RegisterPage() {
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
      title="Create your account"
      description="Sign up to get started with Workscript"
    >
      <RegisterForm />
    </AuthLayout>
  );
}

export default RegisterPage;
