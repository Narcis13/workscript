import type { ReactNode } from 'react';
import { Header } from './Header';

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
 *
 * Requirements: 9, 17
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
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
