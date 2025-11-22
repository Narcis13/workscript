/**
 * RouteErrorBoundary Component
 *
 * Lightweight error boundary specifically designed for wrapping individual routes.
 * Provides route-specific error handling without crashing the entire application.
 *
 * Features:
 * - Catches errors in specific route components
 * - Provides navigation back to safety
 * - Lighter weight than global ErrorBoundary
 * - Optional error reporting per route
 *
 * @module components/guards/RouteErrorBoundary
 */

import React, { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';

/**
 * Props for RouteErrorBoundary component
 */
interface RouteErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional callback for error reporting */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional custom error message */
  message?: string;
  /** Optional fallback path to navigate to */
  fallbackPath?: string;
  /** Optional navigation function (provided by wrapper) */
  navigate?: (path: string) => void;
}

/**
 * State for RouteErrorBoundary component
 */
interface RouteErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object */
  error: Error | null;
}

/**
 * RouteErrorBoundary Component (Class-based)
 *
 * Internal class-based error boundary implementation.
 * Use the exported RouteErrorBoundary wrapper for navigation support.
 *
 * @class RouteErrorBoundaryInternal
 * @extends Component
 */
class RouteErrorBoundaryInternal extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Static lifecycle method called when an error is thrown
   */
  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error has been thrown
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('RouteErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Call optional error reporting callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state and retry rendering
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  /**
   * Navigate back
   */
  goBack = (): void => {
    window.history.back();
  };

  /**
   * Navigate to fallback path or home
   */
  goToFallback = (): void => {
    const { fallbackPath = '/', navigate } = this.props;
    if (navigate) {
      navigate(fallbackPath);
    } else {
      window.location.href = fallbackPath;
    }
  };

  /**
   * Render method
   */
  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, message } = this.props;

    // If no error, render children normally
    if (!hasError) {
      return children;
    }

    // Render route-specific error UI
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          {/* Error Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              This page encountered an error
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                {message || 'An unexpected error occurred while loading this page.'}
              </p>
              {import.meta.env.DEV && error && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium hover:underline">
                    Technical details (development mode)
                  </summary>
                  <pre className="mt-2 text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={this.resetErrorBoundary}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button
              onClick={this.goBack}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>

            <Button
              onClick={this.goToFallback}
              variant="outline"
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-sm text-center text-slate-600 dark:text-slate-400">
            If this problem persists, please try refreshing the entire page or contact support.
          </p>
        </div>
      </div>
    );
  }
}

/**
 * RouteErrorBoundary Wrapper
 *
 * Functional wrapper that provides navigation support to the class-based error boundary.
 * This is the component you should use in your routes.
 *
 * @component
 * @example
 * ```tsx
 * // Wrap a single route
 * <RouteErrorBoundary>
 *   <WorkflowsPage />
 * </RouteErrorBoundary>
 *
 * // With custom error handling
 * <RouteErrorBoundary
 *   onError={(error, errorInfo) => {
 *     reportError({ error, errorInfo, route: 'workflows' });
 *   }}
 *   fallbackPath="/dashboard"
 * >
 *   <WorkflowsPage />
 * </RouteErrorBoundary>
 * ```
 */
export function RouteErrorBoundary({
  children,
  onError,
  message,
  fallbackPath,
}: Omit<RouteErrorBoundaryProps, 'navigate'>): JSX.Element {
  // Get navigate function from React Router
  const navigate = useNavigate();

  return (
    <RouteErrorBoundaryInternal
      onError={onError}
      message={message}
      fallbackPath={fallbackPath}
      navigate={navigate}
    >
      {children}
    </RouteErrorBoundaryInternal>
  );
}

/**
 * HOC to wrap a component with RouteErrorBoundary
 *
 * @example
 * ```tsx
 * const SafeWorkflowsPage = withRouteErrorBoundary(WorkflowsPage, {
 *   fallbackPath: '/dashboard',
 *   message: 'Failed to load workflows page'
 * });
 * ```
 */
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<RouteErrorBoundaryProps, 'children' | 'navigate'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <RouteErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </RouteErrorBoundary>
  );

  WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default RouteErrorBoundary;
