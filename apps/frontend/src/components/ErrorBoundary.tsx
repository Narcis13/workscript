/**
 * ErrorBoundary Component
 *
 * React Error Boundary component for catching and handling errors in the component tree.
 * Provides a fallback UI when errors occur and prevents the entire app from crashing.
 *
 * Features:
 * - Catches React component errors
 * - Displays user-friendly error message
 * - Provides retry functionality
 * - Optional error reporting
 * - Development mode with detailed error info
 * - Production mode with generic message
 *
 * Requirements Coverage:
 * - Requirement 14: Error Handling and User Feedback
 *
 * @module components/ErrorBoundary
 */

import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional fallback component to render instead of default error UI */
  fallback?: (error: Error, errorInfo: React.ErrorInfo, reset: () => void) => ReactNode;
  /** Optional callback for error reporting */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional custom error message */
  message?: string;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object */
  error: Error | null;
  /** React error info with component stack */
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * A React Error Boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={(error, errorInfo, reset) => (
 *   <div>
 *     <h1>Something went wrong</h1>
 *     <button onClick={reset}>Try again</button>
 *   </div>
 * )}>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * @class ErrorBoundary
 * @extends Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static lifecycle method called when an error is thrown
   * Updates state to trigger error UI rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error has been thrown
   * Logs error information and calls optional error reporting callback
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // Store error info in state
    this.setState({ errorInfo });

    // Call optional error reporting callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to an error reporting service
    // Example:
    // Sentry.captureException(error, { extra: errorInfo });
  }

  /**
   * Reset error state and retry rendering
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the page
   */
  reloadPage = (): void => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  goHome = (): void => {
    window.location.href = '/';
  };

  /**
   * Render method
   */
  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, message } = this.props;

    // If no error, render children normally
    if (!hasError) {
      return children;
    }

    // If custom fallback provided, use it
    if (fallback && error && errorInfo) {
      return fallback(error, errorInfo, this.resetErrorBoundary);
    }

    // Render default error UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Something went wrong</CardTitle>
                <CardDescription>
                  {message || 'An unexpected error occurred in the application.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription>
                {error?.message || 'Unknown error'}
              </AlertDescription>
            </Alert>

            {/* Development Mode - Show Stack Trace */}
            {process.env.NODE_ENV === 'development' && errorInfo && (
              <details className="cursor-pointer">
                <summary className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                  Show technical details (development mode)
                </summary>
                <div className="mt-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-md overflow-x-auto">
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {error?.stack}
                  </pre>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-2">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            {/* User Actions */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                What can you do?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Try reloading the page</li>
                <li>Go back to the home page</li>
                <li>If the problem persists, contact support</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 flex-wrap">
            {/* Retry Button */}
            <Button
              onClick={this.resetErrorBoundary}
              variant="default"
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            {/* Reload Button */}
            <Button
              onClick={this.reloadPage}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>

            {/* Home Button */}
            <Button
              onClick={this.goHome}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
}

/**
 * Hook version of ErrorBoundary for functional components
 * Note: This is a wrapper around the class-based ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default ErrorBoundary;
