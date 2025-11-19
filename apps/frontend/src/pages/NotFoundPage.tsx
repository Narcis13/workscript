/**
 * NotFoundPage - 404 Error Page
 *
 * Displayed when a user navigates to a route that doesn't exist.
 * Provides a friendly message and navigation options back to the app.
 *
 * @module pages/NotFoundPage
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * NotFoundPage Component
 *
 * Features:
 * - Clear 404 message
 * - Navigation back to dashboard
 * - Go back in history option
 * - Centered layout with clean design
 *
 * @component
 * @example
 * ```tsx
 * <Route path="*" element={<NotFoundPage />} />
 * ```
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Error Code */}
        <h1 className="text-9xl font-bold text-slate-200 dark:text-slate-800">
          404
        </h1>

        {/* Error Message */}
        <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
          Page Not Found
        </h2>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Navigation Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {/* Additional Help Text */}
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-500">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
