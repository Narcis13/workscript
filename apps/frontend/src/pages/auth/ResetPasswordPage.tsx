/**
 * ResetPasswordPage Component
 *
 * Page component for password reset request (UI only).
 *
 * Features:
 * - Uses AuthLayout for consistent auth page design
 * - Includes ResetPasswordForm component
 * - Note: Backend email functionality not implemented
 *
 * Requirements Coverage:
 * - Requirement 2: User Login (forgot password functionality)
 * - Requirement 20: Routing and Navigation
 *
 * Implementation Note:
 * This is a UI-only implementation. The backend email sending
 * functionality is not implemented and is out of scope for this phase.
 */

import { AuthLayout } from '@/components/layout/AuthLayout';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

/**
 * ResetPasswordPage Component
 *
 * Renders the password reset page with the reset form inside the auth layout.
 * This is a UI-only implementation without backend email integration.
 *
 * Acceptance Criteria:
 * - Display reset password page at /reset-password route
 * - Include email input form
 * - Show note about UI-only implementation
 * - Provide link back to login
 * - 20.3: Access /reset-password displays the reset password page
 *
 * @component
 * @example
 * ```tsx
 * // In router configuration
 * <Route path="/reset-password" element={<ResetPasswordPage />} />
 * ```
 */
export function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email address and we'll send you a link to reset your password"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}

export default ResetPasswordPage;
