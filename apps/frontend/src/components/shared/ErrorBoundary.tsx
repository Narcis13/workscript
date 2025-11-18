import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /**
   * Child components to render when no error occurs
   */
  children: ReactNode;

  /**
   * Optional fallback component to render when an error occurs
   * If not provided, uses the default error UI
   */
  fallback?: ReactNode;

  /**
   * Optional callback function called when an error is caught
   * @param error - The error that was caught
   * @param errorInfo - Additional error information including component stack
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /**
   * Optional additional CSS classes for the error container
   */
  className?: string;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /**
   * Whether an error has been caught
   */
  hasError: boolean;

  /**
   * The error that was caught (if any)
   */
  error: Error | null;

  /**
   * Additional error information including component stack
   */
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component catches JavaScript errors in child components
 *
 * This component implements React's error boundary pattern to catch errors
 * anywhere in the component tree, log those errors, and display a fallback UI
 * instead of crashing the entire application. It provides a user-friendly
 * error message with a "Reload Page" button to recover from the error.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage - wrap entire app or major sections
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // With custom error handler
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.error('Error caught:', error);
 *     // Send to error tracking service (e.g., Sentry)
 *   }}
 * >
 *   <WorkflowEditor />
 * </ErrorBoundary>
 *
 * // With custom fallback UI
 * <ErrorBoundary
 *   fallback={
 *     <div>
 *       <h1>Custom Error UI</h1>
 *       <button onClick={() => window.location.reload()}>Reload</button>
 *     </div>
 *   }
 * >
 *   <ComplexComponent />
 * </ErrorBoundary>
 *
 * // Multiple error boundaries for granular error handling
 * <ErrorBoundary>
 *   <Header />
 *   <ErrorBoundary>
 *     <Sidebar />
 *   </ErrorBoundary>
 *   <ErrorBoundary>
 *     <MainContent />
 *   </ErrorBoundary>
 * </ErrorBoundary>
 * ```
 *
 * @param {ErrorBoundaryProps} props - Component props
 * @returns {React.ReactElement} The children or error fallback UI
 *
 * @remarks
 * - Used throughout the application to catch unhandled errors (Req 19)
 * - Logs errors to console in development for debugging
 * - Displays user-friendly error message with recovery option
 * - Prevents entire app crash when component errors occur
 * - Error boundaries do NOT catch errors in:
 *   - Event handlers (use try-catch instead)
 *   - Asynchronous code (setTimeout, promises)
 *   - Server-side rendering
 *   - Errors thrown in the error boundary itself
 * - Should be placed at strategic points in the component tree
 * - Consider multiple error boundaries for better UX (one section failing doesn't crash others)
 * - In production, consider integrating with error tracking services (Sentry, LogRocket, etc.)
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method called when an error is thrown in a child component
   * Updates state to trigger fallback UI rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught
   * Used for logging and side effects
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error("Error caught by ErrorBoundary:", error);
      console.error("Component stack:", errorInfo.componentStack);
    }

    // Call optional error handler prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error boundary state to allow retry
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reloads the entire page to recover from error
   */
  private handleReload = (): void => {
    window.location.reload();
  };

  /**
   * Renders the default error fallback UI
   */
  private renderDefaultFallback(): ReactNode {
    const { error, errorInfo } = this.state;

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[400px] py-12 px-4 text-center",
          this.props.className
        )}
        role="alert"
      >
        {/* Error Icon */}
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <AlertTriangle
            className="size-12 text-destructive"
            aria-hidden="true"
          />
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h2>

        {/* Error Description */}
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          An unexpected error occurred while rendering this component.
          {import.meta.env.DEV && error && (
            <span className="block mt-2 text-xs font-mono text-destructive">
              {error.toString()}
            </span>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={this.handleReset} variant="outline">
            Try Again
          </Button>

          <Button onClick={this.handleReload}>
            <RefreshCw />
            Reload Page
          </Button>
        </div>

        {/* Developer Info (only in development) */}
        {import.meta.env.DEV && errorInfo && (
          <details className="mt-8 text-left w-full max-w-2xl">
            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground mb-2">
              View Error Details (Development Only)
            </summary>
            <div className="bg-muted rounded-md p-4 overflow-auto text-xs font-mono">
              <div className="mb-4">
                <strong className="text-destructive">Error:</strong>
                <pre className="mt-1 whitespace-pre-wrap">
                  {error?.stack || error?.toString()}
                </pre>
              </div>
              <div>
                <strong className="text-destructive">Component Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </div>
            </div>
          </details>
        )}
      </div>
    );
  }

  render(): ReactNode {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    // If there's an error, render fallback UI
    if (hasError) {
      // Use custom fallback if provided, otherwise use default
      return fallback || this.renderDefaultFallback();
    }

    // No error, render children normally
    return children;
  }
}

export default ErrorBoundary;
