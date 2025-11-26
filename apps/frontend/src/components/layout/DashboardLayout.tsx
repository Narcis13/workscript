import type { ReactNode } from 'react';
import { Header } from './Header';
import { useWebSocket } from '@/hooks/api/useWebSocket';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout component for authenticated pages
 *
 * Provides a consistent layout for all dashboard/authenticated pages.
 * Features:
 * - Header with navigation and user menu
 * - Main content area with proper spacing
 * - Optional sidebar placeholder
 * - Full mobile responsiveness
 * - User dropdown menu with logout functionality
 * - Admin-only navigation items (conditional)
 * - WebSocket connection management for real-time updates
 *
 * Requirements: 9, 17
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Initialize WebSocket connection for all dashboard pages
  // The hook auto-connects on mount and maintains connection
  useWebSocket();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Skip to content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main id="main-content" className="container mx-auto px-4 py-8" tabIndex={-1}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Optional Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} Workscript. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
