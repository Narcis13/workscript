/**
 * ResetPasswordForm Component (UI Only)
 *
 * Simple form for password reset email submission.
 * Note: Backend email functionality is not implemented.
 * This is a UI-only placeholder for future implementation.
 *
 * Features:
 * - Email input field with validation
 * - Form validation using react-hook-form and Zod
 * - Success message after submission (mock)
 * - Loading state during submission
 * - Note about email functionality not being implemented
 * - Link back to login page
 *
 * Requirements Coverage:
 * - Requirement 2: User Login (forgot password link)
 * - Requirement 8: User Interface Components
 * - Requirement 17: Responsive Design
 * - Requirement 18: Form Validation
 *
 * Implementation Note:
 * This component provides the UI for password reset but does not
 * actually send emails. It's a placeholder for future backend integration.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Info } from 'lucide-react';

/**
 * ResetPasswordForm Component
 *
 * Renders a simple form for requesting a password reset email.
 * This is UI-only - no actual email is sent.
 *
 * Acceptance Criteria:
 * - Display form with email field
 * - Validate email format
 * - Show success message after submission
 * - Display note that email functionality is not implemented
 * - Show loading state during submission
 * - Include link back to login
 *
 * @component
 * @example
 * ```tsx
 * <ResetPasswordForm />
 * ```
 */
export function ResetPasswordForm() {
  // ============================================
  // STATE
  // ============================================

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ============================================
  // FORM SETUP
  // ============================================

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  // ============================================
  // FORM SUBMISSION HANDLER
  // ============================================

  /**
   * Handle form submission (mock)
   *
   * Simulates a password reset request.
   * In a real implementation, this would call an API endpoint
   * that sends a password reset email to the user.
   *
   * @param data - Form data (email)
   */
  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success
      // Note: In production, do not log user emails or any PII
      setIsSuccess(true);
      reset();
    } catch (err) {
      // In a real implementation, handle errors here
      console.error('Password reset failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Information Note */}
      <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Email functionality is not implemented. This is a UI-only form for demonstration purposes.
        </AlertDescription>
      </Alert>

      {/* Success Alert */}
      {isSuccess && (
        <Alert variant="default" className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            <strong>Success!</strong> If an account exists with this email, a password reset link would be sent.
            (UI only - no actual email sent)
          </AlertDescription>
        </Alert>
      )}

      {/* Reset Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
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
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>
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
              Sending reset link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        {/* Back to Login Link */}
        <div className="text-center text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Remember your password?{' '}
          </span>
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPasswordForm;
