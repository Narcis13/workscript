import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  BoxesIcon,
  Workflow,
  CalendarClock,
  History,
  Activity,
  Plug,
  FolderOpen,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Navigation link configuration
 */
interface NavLink {
  /** Route path */
  href: string;
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: typeof LayoutDashboard;
  /** Optional badge text (e.g., "New", "Beta") */
  badge?: string;
}

/**
 * Navigation links for the Workscript Main UI
 */
const navigationLinks: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/nodes',
    label: 'Nodes',
    icon: BoxesIcon,
  },
  {
    href: '/workflows',
    label: 'Workflows',
    icon: Workflow,
  },
  {
    href: '/resources',
    label: 'Resources',
    icon: FolderOpen,
  },
  {
    href: '/automations',
    label: 'Automations',
    icon: CalendarClock,
  },
  {
    href: '/executions',
    label: 'Executions',
    icon: History,
  },
  {
    href: '/monitoring',
    label: 'Monitoring',
    icon: Activity,
  },
  {
    href: '/integrations',
    label: 'Integrations',
    icon: Plug,
  },
];

/**
 * Sidebar - Navigation sidebar component for Workscript Main UI
 *
 * Provides persistent navigation for the application with:
 * - Active link highlighting based on current route
 * - Responsive behavior: full sidebar on desktop, hamburger menu on mobile
 * - Collapsible mobile overlay using shadcn/ui Sheet component
 * - Icons from lucide-react for all navigation items
 * - Smooth transitions and hover effects
 *
 * Navigation Structure:
 * - Dashboard: System overview and statistics
 * - Nodes: Browse and test workflow nodes
 * - Workflows: Create and manage workflows
 * - Automations: Schedule and configure automations
 * - Executions: View execution history and details
 * - Monitoring: Real-time workflow execution monitoring
 *
 * Responsive Behavior:
 * - **Mobile (< 768px)**: Hidden by default, accessible via hamburger menu button in Header
 * - **Tablet (768px - 1023px)**: Visible sidebar with icons and labels
 * - **Desktop (≥ 1024px)**: Full-width sidebar with expanded layout
 *
 * Active Link Detection:
 * - Uses `useLocation` hook to detect current route
 * - Matches both exact paths and path prefixes (e.g., /workflows matches /workflows/123)
 * - Active links highlighted with background color and border accent
 *
 * Accessibility Features:
 * - Semantic `<nav>` element with aria-label
 * - Keyboard navigable links
 * - Focus indicators on all interactive elements
 * - Screen reader friendly labels
 *
 * Usage:
 * ```tsx
 * <Sidebar />
 * ```
 *
 * Implementation Details:
 * - Mobile menu state managed with `useState` hook
 * - Sheet component provides accessible modal overlay on mobile
 * - Active route detection uses pathname matching
 * - Icons consistently sized at 20x20px
 * - Smooth transitions on hover and active states
 *
 * Related Components:
 * - {@link AppLayout} - Parent layout component that includes Sidebar
 * - {@link Header} - Top header bar (contains hamburger menu trigger on mobile)
 *
 * @component
 *
 * @example
 * // Used within AppLayout
 * <div className="flex">
 *   <Sidebar />
 *   <main>Content</main>
 * </div>
 *
 * Requirements:
 * - Req 1, 2, 4, 9, 13, 14, 15: Navigation to all major pages
 * - Req 18: Responsive design with mobile hamburger menu
 * - Accessibility: WCAG 2.1 AA keyboard navigation and focus indicators
 */
export function Sidebar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Check if a navigation link is currently active
   * @param href - The link's href path
   * @returns True if the current route matches the link
   */
  const isActiveLink = (href: string): boolean => {
    // Exact match for dashboard
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    // Prefix match for other routes (e.g., /workflows matches /workflows/123)
    return location.pathname.startsWith(href);
  };

  /**
   * Render a single navigation link
   * @param link - Navigation link configuration
   * @returns Styled link component with icon and label
   */
  const renderNavLink = (link: NavLink) => {
    const Icon = link.icon;
    const isActive = isActiveLink(link.href);

    return (
      <Link
        key={link.href}
        to={link.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          isActive && [
            'bg-blue-50 dark:bg-blue-950',
            'text-blue-700 dark:text-blue-300',
            'border-l-4 border-blue-600 dark:border-blue-400',
            'font-medium',
          ],
          !isActive && 'text-slate-700 dark:text-slate-300'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{link.label}</span>
        {link.badge && (
          <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {link.badge}
          </span>
        )}
      </Link>
    );
  };

  /**
   * Sidebar content - reused in both desktop and mobile views
   */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo/Branding */}
      <div className="px-6 py-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Workscript
          </span>
        </Link>
      </div>

      <Separator className="mb-4" />

      {/* Navigation Links */}
      <nav
        className="flex-1 px-3 space-y-1 overflow-y-auto"
        aria-label="Main navigation"
      >
        {navigationLinks.map(renderNavLink)}
      </nav>

      {/* Footer / Version Info */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Version 1.0.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Toggle Button - Visible only on mobile */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white dark:bg-slate-900 shadow-md"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-white dark:bg-slate-900"
          >
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar - Hidden on mobile, visible on tablet and desktop */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {sidebarContent}
      </aside>
    </>
  );
}
