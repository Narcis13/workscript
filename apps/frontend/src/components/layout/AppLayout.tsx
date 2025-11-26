import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useWebSocket } from '@/hooks/api/useWebSocket';

interface AppLayoutProps {
  children?: ReactNode;
}

/**
 * AppLayout - Main application layout component for Workscript Main UI
 *
 * Provides the core layout structure for the workflow management interface with:
 * - Persistent sidebar navigation (collapsible on mobile)
 * - Header with page title, user menu, and WebSocket status indicator
 * - Main content area with proper spacing and scroll handling
 * - Responsive breakpoints for mobile, tablet, and desktop views
 * - Outlet for nested route rendering
 *
 * Layout Structure:
 * ```
 * ┌─────────────────────────────────────┐
 * │  Sidebar   │       Header          │
 * ├────────────┼───────────────────────┤
 * │            │                       │
 * │  Nav       │   Main Content        │
 * │  Links     │   <Outlet />          │
 * │            │                       │
 * └────────────┴───────────────────────┘
 * ```
 *
 * Responsive Behavior:
 * - **Mobile (< 768px)**: Sidebar collapses to hamburger menu overlay
 * - **Tablet (768px - 1023px)**: Sidebar remains visible, narrower width
 * - **Desktop (≥ 1024px)**: Full sidebar with expanded labels
 *
 * Usage:
 * ```tsx
 * // In route configuration
 * <Route element={<AppLayout />}>
 *   <Route path="/dashboard" element={<DashboardPage />} />
 *   <Route path="/workflows" element={<WorkflowsPage />} />
 *   ...
 * </Route>
 *
 * // Or with children
 * <AppLayout>
 *   <YourPageContent />
 * </AppLayout>
 * ```
 *
 * Accessibility Features:
 * - Skip-to-content link for keyboard navigation
 * - Semantic HTML structure (aside, header, main)
 * - Focus trap in mobile sidebar overlay
 * - ARIA labels for navigation elements
 *
 * Related Components:
 * - {@link Sidebar} - Navigation sidebar with collapsible mobile menu
 * - {@link Header} - Top header bar with user menu and status indicators
 *
 * @component
 * @param {AppLayoutProps} props - Component props
 * @param {ReactNode} [props.children] - Optional children to render instead of Outlet
 *
 * @example
 * // Route-based usage (recommended)
 * <Route element={<AppLayout />}>
 *   <Route path="/" element={<DashboardPage />} />
 * </Route>
 *
 * @example
 * // Direct usage with children
 * <AppLayout>
 *   <div>Page content here</div>
 * </AppLayout>
 *
 * Requirements:
 * - Req 18: Responsive design with mobile, tablet, and desktop breakpoints
 * - Req 13: WebSocket status indicator in header
 * - Req 16: User menu with logout functionality
 * - Accessibility: WCAG 2.1 AA compliance
 */
export function AppLayout({ children }: AppLayoutProps) {
  // Initialize WebSocket connection for all protected routes
  // The hook auto-connects on mount and maintains connection
  useWebSocket();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Skip to content link for screen readers - accessible via keyboard */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Layout container with flexbox for sidebar + content */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Navigation - Collapsible on mobile */}
        <Sidebar />

        {/* Main content area - Header + scrollable content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header - Fixed at top of content area */}
          <Header />

          {/* Main scrollable content area */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950"
            tabIndex={-1}
          >
            <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                {/* Render children if provided, otherwise render Outlet for nested routes */}
                {children || <Outlet />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
