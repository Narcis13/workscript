/**
 * RegisterForm Component
 *
 * Authentication form for new user registration with email and password.
 *
 * Features:
 * - Email, password, and confirm password input fields with validation
 * - Form validation using react-hook-form and Zod
 * - Real-time password strength indicator
 * - Loading state during submission
 * - Error display with Alert component
 * - Link to login page
 * - Automatic login and redirect after successful registration
 *
 * Requirements Coverage:
 * - Requirement 1: User Registration
 * - Requirement 8: User Interface Components
 * - Requirement 14: Error Handling and User Feedback
 * - Requirement 17: Responsive Design
 * - Requirement 18: Form Validation
 * - Requirement 19: Loading States
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  registerSchema,
  type RegisterFormData,
  calculatePasswordStrength,
  passwordStrengthColors,
  passwordStrengthText
} from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

/**
 * RegisterForm Component
 *
 * Renders a registration form with email, password, and confirm password fields.
 * Handles form submission, validation, auto-login, and redirects on success.
 *
 * Acceptance Criteria:
 * - 1.1: Display registration form with email and password fields at /register
 * - 1.2: Email validated as proper email format
 * - 1.3: Password meets security requirements (min 8, uppercase, lowercase, number)
 * - 1.4: Password strength indicator displayed
 * - 1.5: Form validation before API request
 * - 1.6: User automatically logged in with tokens stored on success
 * - 1.7: Redirect to dashboard on success
 * - 1.8: Display error message on failure
 * - 1.9: Loading state shown on submit button
 * - 1.10: Redirect to dashboard if already authenticated
 *
 * @component
 * @example
 * ```tsx
 * <RegisterForm />
 * ```
 */
export function RegisterForm() {
  // ============================================
  // HOOKS
  // ============================================

  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  // ============================================
  // STATE
  // ============================================

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: 'weak' | 'medium' | 'strong';
    score: number;
    feedback: string[];
  } | null>(null);

  // ============================================
  // FORM SETUP
  // ============================================

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur', // Validate on blur for better UX
  });

  // Watch password field for strength indicator
  const password = watch('password', '');

  // ============================================
  // PASSWORD STRENGTH MONITORING
  // ============================================

  /**
   * Update password strength indicator in real-time
   */
  React.useEffect(() => {
    if (password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  // ============================================
  // FORM SUBMISSION HANDLER
  // ============================================

  /**
   * Handle form submission
   *
   * Attempts to register a new user with provided credentials.
   * On success, automatically logs in and redirects to dashboard.
   * On failure, displays an appropriate error message.
   *
   * @param data - Form data (email, password, confirmPassword)
   */
  const onSubmit = async (data: RegisterFormData) => {
    setError(''); // Clear previous errors
    setIsSubmitting(true);

    try {
      // Call register method from AuthContext (auto-logs in)
      await registerUser(data.email, data.password);

      // Registration successful - redirect to dashboard
      // TODO: Add welcome toast notification for new users
      // TODO: Consider adding an onboarding flow for first-time users
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      // Error message is already user-friendly from AuthService
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  /**
   * Render password strength indicator
   */
  const renderPasswordStrength = () => {
    if (!passwordStrength) return null;

    const { strength, score, feedback } = passwordStrength;
    const strengthColor = passwordStrengthColors[strength];
    const strengthLabel = passwordStrengthText[strength];

    // Icon based on strength
    const StrengthIcon =
      strength === 'strong' ? CheckCircle2 :
      strength === 'medium' ? AlertTriangle :
      XCircle;

    const iconColor =
      strength === 'strong' ? 'text-green-600 dark:text-green-400' :
      strength === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
      'text-red-600 dark:text-red-400';

    return (
      <div className="space-y-2 mt-2">
        {/* Strength bar */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-label={`Password strength: ${strengthLabel}`}
          >
            <div
              className={`h-full ${strengthColor} transition-all duration-300`}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <StrengthIcon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
            <span className={`font-medium ${iconColor}`}>
              {strengthLabel}
            </span>
          </div>
        </div>

        {/* Feedback messages */}
        {feedback.length > 0 && (
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1" role="list">
            {feedback.map((item, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      aria-label="Registration form"
    >
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
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
          aria-describedby={errors.email ? 'email-error' : undefined}
          disabled={isSubmitting}
        />
        {errors.email && (
          <p
            id="email-error"
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={
            errors.password
              ? 'password-error password-strength'
              : passwordStrength
              ? 'password-strength'
              : undefined
          }
          disabled={isSubmitting}
        />
        {errors.password && (
          <p
            id="password-error"
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errors.password.message}
          </p>
        )}

        {/* Password Strength Indicator */}
        <div id="password-strength" aria-live="polite" aria-atomic="true">
          {renderPasswordStrength()}
        </div>
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          disabled={isSubmitting}
        />
        {errors.confirmPassword && (
          <p
            id="confirmPassword-error"
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      {/* Login Link */}
      <div className="text-center text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
        </span>
        <Link
          to="/login"
          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          aria-label="Already have an account? Login to your account"
        >
          Login
        </Link>
      </div>
    </form>
  );
}

export default RegisterForm;
