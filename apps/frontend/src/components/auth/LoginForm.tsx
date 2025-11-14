/**
 * LoginForm Component
 *
 * Authentication form for user login with email and password.
 *
 * Features:
 * - Email and password input fields with validation
 * - Form validation using react-hook-form and Zod
 * - Loading state during submission
 * - Error display with Alert component
 * - Links to registration and password reset
 * - Automatic redirect after successful login
 *
 * Requirements Coverage:
 * - Requirement 2: User Login
 * - Requirement 8: User Interface Components
 * - Requirement 14: Error Handling and User Feedback
 * - Requirement 17: Responsive Design
 * - Requirement 18: Form Validation
 * - Requirement 19: Loading States
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * LoginForm Component
 *
 * Renders a login form with email and password fields.
 * Handles form submission, validation, and redirects on success.
 *
 * Acceptance Criteria:
 * - 2.1: Display login form with email and password fields
 * - 2.2: Validate credentials before API request
 * - 2.3: Store tokens in localStorage on success
 * - 2.4: Load user object into auth context
 * - 2.5: Redirect to originally requested page or dashboard
 * - 2.6: Display error message on failure
 * - 2.7: Show loading state during submission
 * - 2.8: Display specific error for locked accounts
 * - 2.9: Show link to registration page
 * - 2.10: Show "Forgot password?" link
 *
 * @component
 * @example
 * ```tsx
 * <LoginForm />
 * ```
 */
export function LoginForm() {
  // ============================================
  // HOOKS
  // ============================================

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // ============================================
  // STATE
  // ============================================

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // FORM SETUP
  // ============================================

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // Validate on blur for better UX
  });

  // ============================================
  // FORM SUBMISSION HANDLER
  // ============================================

  /**
   * Handle form submission
   *
   * Attempts to log in the user with provided credentials.
   * On success, redirects to the originally requested page or dashboard.
   * On failure, displays an appropriate error message.
   *
   * @param data - Form data (email and password)
   */
  const onSubmit = async (data: LoginFormData) => {
    setError(''); // Clear previous errors
    setIsSubmitting(true);

    try {
      // Call login method from AuthContext
      await login(data.email, data.password);

      // Redirect to originally requested page or dashboard
      // The location state contains the "from" path if user was redirected to login
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      // Handle different error types
      let errorMessage = 'Invalid email or password. Please try again.';

      if (err.response) {
        const status = err.response.status;
        const apiError = err.response.data?.error || err.response.data?.message;

        if (status === 429) {
          // Account locked error
          errorMessage = 'Account locked due to too many failed login attempts. Please wait 15 minutes and try again.';
        } else if (status === 401) {
          // Invalid credentials
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (apiError) {
          // Use API error message if available
          errorMessage = apiError;
        }
      } else if (err.message) {
        // Network or other errors
        errorMessage = `Login failed: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/reset-password"
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
          disabled={isSubmitting}
        />
        {errors.password && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Registration Link */}
      <div className="text-center text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
        </span>
        <Link
          to="/register"
          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Register
        </Link>
      </div>
    </form>
  );
}

export default LoginForm;
