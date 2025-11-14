/**
 * ChangePasswordForm Component
 *
 * Form component for authenticated users to change their password.
 *
 * Features:
 * - Current password, new password, and confirm new password fields
 * - Form validation using react-hook-form and Zod
 * - Password strength validation for new password
 * - Loading state during submission
 * - Success message display
 * - Error display with Alert component
 * - Form reset after successful password change
 *
 * Requirements Coverage:
 * - Requirement 4: Password Change
 * - Requirement 8: User Interface Components
 * - Requirement 14: Error Handling and User Feedback
 * - Requirement 18: Form Validation
 * - Requirement 19: Loading States
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/AuthService';
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * ChangePasswordForm Component
 *
 * Renders a form for changing the user's password.
 * Handles form submission, validation, and displays success/error messages.
 *
 * Acceptance Criteria:
 * - 4.1: Change password form available in profile/settings
 * - 4.2: Form has fields for current password, new password, and confirm password
 * - 4.3: New password meets security requirements
 * - 4.4: Current password verified on submission
 * - 4.5: Success message displayed on success
 * - 4.6: Error message shown on failure
 * - 4.7: Form reset after successful password change
 * - 4.8: New password confirmation must match exactly
 *
 * @component
 * @example
 * ```tsx
 * <ChangePasswordForm />
 * ```
 */
export function ChangePasswordForm() {
  // ============================================
  // STATE
  // ============================================

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // FORM SETUP
  // ============================================

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur', // Validate on blur for better UX
  });

  // ============================================
  // FORM SUBMISSION HANDLER
  // ============================================

  /**
   * Handle form submission
   *
   * Attempts to change the user's password using the authService.
   * On success, displays a success message and resets the form.
   * On failure, displays an appropriate error message.
   *
   * @param data - Form data (currentPassword, newPassword, confirmNewPassword)
   */
  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(''); // Clear previous errors
    setSuccess(''); // Clear previous success messages
    setIsSubmitting(true);

    try {
      // Call authService changePassword method
      const message = await authService.changePassword(
        data.currentPassword,
        data.newPassword
      );

      // Password change successful
      setSuccess(message || 'Password changed successfully!');

      // Reset form after successful password change
      reset();
    } catch (err: any) {
      // Handle different error types
      let errorMessage = 'Failed to change password. Please try again.';

      if (err.message) {
        // Use error message from authService
        errorMessage = err.message;
      }

      // Check for specific error cases
      if (errorMessage.toLowerCase().includes('current password')) {
        errorMessage = 'Current password is incorrect. Please try again.';
      } else if (errorMessage.toLowerCase().includes('same')) {
        errorMessage = 'New password must be different from your current password.';
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Password Field */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          placeholder="Enter your current password"
          autoComplete="current-password"
          {...register('currentPassword')}
          aria-invalid={errors.currentPassword ? 'true' : 'false'}
          disabled={isSubmitting}
        />
        {errors.currentPassword && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      {/* New Password Field */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Create a new strong password"
          autoComplete="new-password"
          {...register('newPassword')}
          aria-invalid={errors.newPassword ? 'true' : 'false'}
          disabled={isSubmitting}
        />
        {errors.newPassword && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.newPassword.message}
          </p>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Password must be at least 8 characters with uppercase, lowercase, and number.
        </p>
      </div>

      {/* Confirm New Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          {...register('confirmNewPassword')}
          aria-invalid={errors.confirmNewPassword ? 'true' : 'false'}
          disabled={isSubmitting}
        />
        {errors.confirmNewPassword && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.confirmNewPassword.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Changing password...
          </>
        ) : (
          'Change Password'
        )}
      </Button>
    </form>
  );
}

export default ChangePasswordForm;
