import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';

/**
 * Page title mapping for dynamic header titles
 */
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/nodes': 'Node Library',
  '/workflows': 'Workflows',
  '/automations': 'Automations',
  '/executions': 'Execution History',
  '/monitoring': 'Real-time Monitoring',
};

/**
 * WebSocket connection status type
 */
type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Header - Top navigation bar component for Workscript Main UI
 *
 * Provides the main application header with:
 * - Dynamic page title based on current route
 * - User menu dropdown with user info (name, email, role) and logout
 * - WebSocket connection status indicator
 * - Responsive design for mobile, tablet, and desktop
 * - Consistent styling across all pages
 *
 * Header Layout:
 * ```
 * ┌──────────────────────────────────────────────┐
 * │ Page Title     │  WS Status  │  User Menu   │
 * └──────────────────────────────────────────────┘
 * ```
 *
 * Dynamic Page Title:
 * - Automatically determined from current route path
 * - Supports both base routes (e.g., `/workflows`) and detail routes (e.g., `/workflows/123`)
 * - Falls back to "Workscript" if route is not recognized
 *
 * WebSocket Status Indicator:
 * - **Connected** (green): Active WebSocket connection with real-time updates
 * - **Disconnected** (red): No WebSocket connection, auto-reconnect attempts
 * - **Reconnecting** (yellow): Attempting to re-establish connection
 * - Displays as a colored badge with status text
 *
 * User Menu Features:
 * - Displays user avatar with initials (first letter of email or name)
 * - Shows full email address in dropdown header
 * - Displays user role (admin, user, etc.) with capitalization
 * - Logout button with destructive styling
 * - Accessible via keyboard navigation
 *
 * Responsive Behavior:
 * - **Mobile (< 640px)**: Compact layout, abbreviated labels
 * - **Tablet (640px - 1023px)**: Full labels, smaller spacing
 * - **Desktop (≥ 1024px)**: Full layout with optimal spacing
 *
 * Accessibility Features:
 * - ARIA labels for user menu and status indicator
 * - Keyboard navigable dropdown menu
 * - Focus indicators on all interactive elements
 * - Screen reader friendly status announcements
 *
 * Usage:
 * ```tsx
 * <Header />
 * ```
 *
 * Implementation Details:
 * - Route detection uses `useLocation` hook from react-router-dom
 * - Authentication state from `useAuth` custom hook
 * - WebSocket status from Zustand store (to be implemented in Phase 5)
 * - User initials extracted from email for avatar display
 * - Logout triggers auth context logout function
 *
 * Related Components:
 * - {@link AppLayout} - Parent layout that includes Header
 * - {@link Sidebar} - Navigation sidebar (separate from header)
 * - {@link WebSocketStatus} - Dedicated WebSocket status component (Phase 5)
 *
 * @component
 *
 * @example
 * // Used within AppLayout
 * <div className="flex flex-col">
 *   <Header />
 *   <main>Content</main>
 * </div>
 *
 * @example
 * // With custom page title override (future enhancement)
 * <Header pageTitle="Custom Workflow Editor" />
 *
 * Requirements:
 * - Req 13: WebSocket status indicator in header
 * - Req 16: User menu with authentication info and logout
 * - Req 18: Responsive design for mobile, tablet, desktop
 * - Accessibility: WCAG 2.1 AA keyboard navigation and focus indicators
 *
 * Phase: 1.6.3 - Foundation & Setup
 * Dependencies: useAuth hook, shadcn/ui components (DropdownMenu, Avatar, Badge)
 * Next Steps: Integrate WebSocket store in Phase 5 for real connection status
 */
export function Header() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  // TODO: Replace with actual WebSocket store in Phase 5
  // For now, using mock status for development
  const wsStatus: ConnectionStatus = 'connected';

  /**
   * Get the page title based on current route
   * Matches both exact paths and path prefixes
   * @returns Formatted page title string
   */
  const getPageTitle = (): string => {
    const path = location.pathname;

    // Check for exact matches first
    if (pageTitles[path]) {
      return pageTitles[path];
    }

    // Check for prefix matches (e.g., /workflows/123 → Workflows)
    const matchedKey = Object.keys(pageTitles).find((key) =>
      path.startsWith(key)
    );
    if (matchedKey) {
      return pageTitles[matchedKey];
    }

    // Default fallback
    return 'Workscript';
  };

  /**
   * Get user initials from email or name for avatar display
   * @returns First two letters in uppercase, or 'U' if no user data
   */
  const getUserInitials = (): string => {
    if (!user?.email) return 'U';

    // Try to extract first and last name initials from email
    const emailParts = user.email.split('@')[0];
    const nameParts = emailParts.split('.');

    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }

    // Fallback to first two letters of email
    return user.email.substring(0, 2).toUpperCase();
  };

  /**
   * Handle user logout action
   * Clears authentication state and redirects to login
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Error handling will be enhanced in Phase 7 with toast notifications
    }
  };

  /**
   * Get WebSocket status badge styling
   * @param status - Current connection status
   * @returns Badge variant and color classes
   */
  const getWSStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          variant: 'default' as const,
          color: 'bg-green-500 dark:bg-green-600',
          text: 'Connected',
        };
      case 'disconnected':
        return {
          variant: 'destructive' as const,
          color: 'bg-red-500 dark:bg-red-600',
          text: 'Disconnected',
        };
      case 'reconnecting':
        return {
          variant: 'secondary' as const,
          color: 'bg-yellow-500 dark:bg-yellow-600',
          text: 'Reconnecting',
        };
    }
  };

  const statusBadge = getWSStatusBadge(wsStatus);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between w-full">
        {/* Page Title - Left */}
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50">
            {getPageTitle()}
          </h1>
        </div>

        {/* WebSocket Status & User Menu - Right */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* WebSocket Status Indicator */}
          {isAuthenticated && (
            <Badge
              variant={statusBadge.variant}
              className="hidden sm:flex items-center gap-1.5"
              aria-label={`WebSocket status: ${statusBadge.text}`}
            >
              <Circle
                className={`h-2 w-2 fill-current ${statusBadge.color}`}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{statusBadge.text}</span>
            </Badge>
          )}

          {/* Mobile WebSocket Status - Icon Only */}
          {isAuthenticated && (
            <div
              className="sm:hidden"
              aria-label={`WebSocket status: ${statusBadge.text}`}
            >
              <Circle
                className={`h-3 w-3 fill-current ${statusBadge.color}`}
                aria-hidden="true"
              />
            </div>
          )}

          {/* User Menu Dropdown */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-50">
                      {user.email}
                    </p>
                    <p className="text-xs leading-none text-slate-500 dark:text-slate-400 capitalize">
                      Role: {user.role || 'User'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  onClick={handleLogout}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
