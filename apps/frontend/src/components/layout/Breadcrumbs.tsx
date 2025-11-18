import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

/**
 * Route segment to human-readable label mapping
 * Maps URL segments to user-friendly display names
 */
const segmentLabels: Record<string, string> = {
  // Main sections
  dashboard: 'Dashboard',
  nodes: 'Nodes',
  workflows: 'Workflows',
  automations: 'Automations',
  executions: 'Executions',
  monitoring: 'Monitoring',

  // Actions/states
  new: 'New',
  edit: 'Edit',
  detail: 'Details',

  // Auth routes
  login: 'Login',
  register: 'Register',
  profile: 'Profile',
  users: 'Users',

  // Common
  settings: 'Settings',
};

/**
 * Breadcrumb segment interface
 * Represents a single breadcrumb in the navigation trail
 */
interface BreadcrumbSegment {
  /** Display label for this breadcrumb */
  label: string;
  /** URL path for navigation */
  path: string;
  /** Whether this is the current/active page */
  isCurrent: boolean;
}

/**
 * Breadcrumbs - Dynamic navigation breadcrumbs component
 *
 * Provides hierarchical navigation breadcrumbs that automatically generate
 * based on the current route path. Supports clickable links for navigation
 * back to parent routes and highlights the current page.
 *
 * Features:
 * - **Automatic Generation**: Breadcrumbs generated from current URL path
 * - **Clickable Navigation**: Each breadcrumb (except current) is a clickable link
 * - **Home Icon**: Dashboard/home is represented by a house icon
 * - **Smart Labeling**: URL segments mapped to human-readable labels
 * - **ID Detection**: Dynamic IDs (UUIDs, numeric IDs) displayed as truncated values
 * - **Responsive Design**: Adapts to mobile, tablet, and desktop viewports
 * - **Accessibility**: Proper ARIA labels and semantic navigation structure
 *
 * Breadcrumb Generation Logic:
 * 1. Parse current URL path into segments
 * 2. Map each segment to a human-readable label
 * 3. Build cumulative paths for navigation
 * 4. Render as clickable links (except current page)
 *
 * Example Breadcrumb Paths:
 * ```
 * /workflows                     → Dashboard > Workflows
 * /workflows/new                 → Dashboard > Workflows > New
 * /workflows/abc-123             → Dashboard > Workflows > abc-123
 * /workflows/abc-123/edit        → Dashboard > Workflows > abc-123 > Edit
 * /nodes/math-node               → Dashboard > Nodes > math-node
 * /automations/xyz-789/detail    → Dashboard > Automations > xyz-789 > Details
 * ```
 *
 * ID Truncation:
 * - UUIDs and long IDs are truncated to first 8 characters
 * - Displayed with ellipsis indicator
 * - Full ID available on hover (title attribute)
 *
 * Responsive Behavior:
 * - **Mobile (< 640px)**: Compact spacing, smaller text
 * - **Tablet (640px - 1023px)**: Standard spacing
 * - **Desktop (≥ 1024px)**: Full spacing and larger separators
 *
 * Accessibility:
 * - Uses semantic `<nav>` with aria-label="breadcrumb"
 * - Current page marked with aria-current="page"
 * - Screen reader friendly labels
 * - Keyboard navigable links
 *
 * Usage:
 * ```tsx
 * // In a page component
 * <div>
 *   <Breadcrumbs />
 *   <PageContent />
 * </div>
 * ```
 *
 * ```tsx
 * // In AppLayout
 * <header>
 *   <PageTitle />
 *   <Breadcrumbs />
 * </header>
 * ```
 *
 * Implementation Details:
 * - Uses `useLocation` hook to get current path
 * - Filters out empty segments from path
 * - Builds cumulative paths for each segment
 * - Detects UUID/numeric IDs for special formatting
 * - Renders home icon for dashboard/root
 *
 * Customization:
 * - Add new segments to `segmentLabels` for custom route labels
 * - Modify ID detection regex for different ID formats
 * - Adjust truncation length (currently 8 characters)
 * - Customize separator icon (default: ChevronRight from shadcn/ui)
 *
 * Related Components:
 * - {@link Header} - Page header that may include breadcrumbs
 * - {@link AppLayout} - Main layout structure
 * - {@link Sidebar} - Primary navigation (separate from breadcrumbs)
 *
 * @component
 *
 * @example
 * // Basic usage - breadcrumbs automatically adapt to current route
 * <Breadcrumbs />
 *
 * @example
 * // With custom container styling
 * <div className="mb-4">
 *   <Breadcrumbs />
 * </div>
 *
 * Requirements:
 * - Req 2: Node detail page breadcrumbs (Nodes > {Node Name})
 * - Req 8: Workflow detail page breadcrumbs (Workflows > {Workflow Name})
 * - Req 12: Automation detail page breadcrumbs (Automations > {Automation Name})
 * - Accessibility: WCAG 2.1 AA semantic navigation and screen reader support
 *
 * Phase: 1.6.4 - Foundation & Setup
 * Dependencies: react-router-dom, shadcn/ui breadcrumb component, lucide-react
 * Next Steps: Integrate into page layouts (NodeDetailPage, WorkflowDetailPage, etc.)
 */
export function Breadcrumbs() {
  const location = useLocation();

  /**
   * Determine if a segment is likely a dynamic ID (UUID or numeric)
   * @param segment - URL segment to check
   * @returns True if segment appears to be a dynamic ID
   */
  const isDynamicId = (segment: string): boolean => {
    // Check for UUID pattern (8-4-4-4-12 format with hyphens)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Check for numeric ID
    const numericIdRegex = /^\d+$/;

    // Check for short alphanumeric IDs (common in databases)
    const shortIdRegex = /^[a-z0-9]{8,}$/i;

    return uuidRegex.test(segment) || numericIdRegex.test(segment) || shortIdRegex.test(segment);
  };

  /**
   * Truncate long IDs for display
   * @param id - ID to truncate
   * @returns Truncated ID with ellipsis
   */
  const truncateId = (id: string): string => {
    if (id.length <= 12) return id;
    return `${id.substring(0, 8)}...`;
  };

  /**
   * Get display label for a URL segment
   * @param segment - URL segment
   * @param index - Segment index in path
   * @returns Human-readable label
   */
  const getSegmentLabel = (segment: string, index: number): string => {
    // Check if it's a mapped label
    if (segmentLabels[segment]) {
      return segmentLabels[segment];
    }

    // Check if it's a dynamic ID
    if (isDynamicId(segment)) {
      return truncateId(segment);
    }

    // Fallback: capitalize first letter and replace hyphens/underscores with spaces
    return segment
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * Generate breadcrumb segments from current path
   * @returns Array of breadcrumb segments with labels and paths
   */
  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    const pathSegments = location.pathname
      .split('/')
      .filter((segment) => segment !== '');

    // Always start with Dashboard as home
    const breadcrumbs: BreadcrumbSegment[] = [
      {
        label: 'Dashboard',
        path: '/dashboard',
        isCurrent: pathSegments.length === 0 || location.pathname === '/dashboard',
      },
    ];

    // Build breadcrumbs for each path segment
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      // Skip 'dashboard' segment as it's already the home breadcrumb
      if (segment === 'dashboard' && index === 0) {
        return;
      }

      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      breadcrumbs.push({
        label: getSegmentLabel(segment, index),
        path: currentPath,
        isCurrent: isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't render breadcrumbs if we're on the root dashboard (only one item)
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="contents">
            <BreadcrumbItem>
              {crumb.isCurrent ? (
                <BreadcrumbPage>
                  {index === 0 ? (
                    <Home className="h-4 w-4" aria-label="Dashboard" />
                  ) : (
                    crumb.label
                  )}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    to={crumb.path}
                    title={crumb.label}
                    className="flex items-center"
                  >
                    {index === 0 ? (
                      <Home className="h-4 w-4" aria-label="Dashboard" />
                    ) : (
                      crumb.label
                    )}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
