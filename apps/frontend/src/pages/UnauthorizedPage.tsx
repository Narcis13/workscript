/**
 * UnauthorizedPage Component
 *
 * 403 Forbidden error page displayed when users lack required permissions.
 *
 * Features:
 * - Clear 403 error message
 * - Navigation buttons to Dashboard and Login
 * - Uses shadcn/ui components (Card, Button)
 * - Responsive centered layout
 *
 * Requirements Coverage:
 * - Requirement 5: Protected Routes (Criterion 8 - redirect to /unauthorized)
 * - Requirement 14: Error Handling and User Feedback
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

/**
 * UnauthorizedPage Component
 *
 * Displays a 403 Forbidden error page when users attempt to access
 * resources they don't have permission for.
 *
 * Acceptance Criteria:
 * - 5.8: Redirect to /unauthorized if user lacks required permissions
 * - 14.1: Display error with clear feedback using UI components
 *
 * @component
 * @example
 * ```tsx
 * // In router configuration
 * <Route path="/unauthorized" element={<UnauthorizedPage />} />
 * ```
 */
export function UnauthorizedPage() {
  // ============================================
  // HOOKS
  // ============================================

  const navigate = useNavigate();

  // ============================================
  // HANDLERS
  // ============================================

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <span className="text-7xl font-bold text-slate-900 dark:text-slate-100">
              403
            </span>
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            If you believe this is an error, please contact your administrator
            or try logging in with a different account.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleGoToDashboard}
            className="w-full sm:w-auto"
            variant="default"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={handleGoToLogin}
            className="w-full sm:w-auto"
            variant="outline"
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default UnauthorizedPage;
