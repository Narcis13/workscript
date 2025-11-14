import { Link } from 'react-router-dom';
import { WorkflowDemo } from '@/components/WorkflowDemo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

/**
 * WorkflowDemoPage - Public page showcasing workflow engine capabilities
 *
 * This page demonstrates the workflow engine running in the browser without
 * requiring authentication. It provides a showcase of the product for visitors
 * to explore before signing up.
 *
 * Features:
 * - No authentication required (public access)
 * - Simple layout without DashboardLayout
 * - Navigation back to home/dashboard
 * - Prompt to register for unauthenticated visitors
 * - Accessible to both authenticated and unauthenticated users
 *
 * Requirements: 13
 */
export default function WorkflowDemoPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header Navigation */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Branding */}
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
                <span className="text-white text-sm font-bold">W</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50 hidden sm:inline">
                Workscript
              </span>
            </Link>

            {/* Navigation Actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="default" size="sm">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="default" size="sm">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div className="max-w-2xl mx-auto mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">ℹ</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Try it for free!
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mb-2">
                  You're viewing a public demo. Sign up to create and save your own workflows,
                  access advanced features, and integrate with your apps.
                </p>
                <Link to="/register">
                  <Button size="sm" variant="default">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Demo Component */}
        <WorkflowDemo />

        {/* Footer Navigation */}
        <div className="max-w-2xl mx-auto mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex justify-center gap-4">
            <Link to={isAuthenticated ? '/dashboard' : '/'}>
              <Button variant="ghost" size="sm">
                ← Back to {isAuthenticated ? 'Dashboard' : 'Home'}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
