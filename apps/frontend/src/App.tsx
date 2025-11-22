/**
 * Main Application Component
 *
 * Root component for Workscript Main UI that sets up:
 * - Error boundary for graceful error handling
 * - Authentication context provider
 * - Router with lazy-loaded routes
 * - Toast notifications
 *
 * Uses React Router v7 with createBrowserRouter for improved
 * performance, code splitting, and route management.
 *
 * @module App
 */

import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from './routes';

/**
 * Loading fallback component displayed during route transitions
 * and lazy component loading
 */
function RouterLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading page...</p>
      </div>
    </div>
  );
}

/**
 * App Component
 *
 * Application Structure:
 * ```
 * ErrorBoundary
 *   └── TooltipProvider
 *       └── AuthProvider
 *           └── Suspense (loading fallback)
 *               └── RouterProvider (all routes)
 *           └── Toaster (notifications)
 * ```
 *
 * Features:
 * - Global error boundary catches React errors
 * - Tooltip provider for all Radix UI tooltips
 * - Authentication context available to all components
 * - Suspense handles lazy-loaded route components
 * - Toast notifications for user feedback
 *
 * @component
 */
function App() {
  return (
    <ErrorBoundary
      message="We're sorry, but something went wrong with the application."
      onError={(error, errorInfo) => {
        // In production, send to error reporting service (Sentry, LogRocket, etc.)
        if (import.meta.env.DEV) {
          console.error('Application Error:', error);
          console.error('Error Info:', errorInfo);
        }
      }}
    >
      <TooltipProvider>
        <AuthProvider>
          {/* Suspense wrapper for lazy-loaded route components */}
          <Suspense fallback={<RouterLoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>

          {/* Global toast notification container */}
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;