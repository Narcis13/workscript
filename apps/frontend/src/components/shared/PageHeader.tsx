import React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps {
  /**
   * The main page title
   * @example "Workflows", "Dashboard", "Create Automation"
   */
  title: string;

  /**
   * Optional description or subtitle providing context about the page
   * @example "Manage and execute your workflow definitions"
   */
  description?: string;

  /**
   * Optional action buttons or controls to display on the right side
   * This can include create buttons, filters, or other page-level actions
   * @example <Button onClick={onCreate}>Create Workflow</Button>
   */
  actions?: React.ReactNode;

  /**
   * Optional additional CSS classes for the container
   */
  className?: string;
}

/**
 * PageHeader component provides consistent page-level header styling
 *
 * This component is used at the top of every page to display the page title,
 * optional description, and action buttons. It ensures consistent spacing,
 * typography, and layout across all pages in the application.
 *
 * @component
 * @example
 * ```tsx
 * // Basic page header
 * <PageHeader
 *   title="Workflows"
 *   description="Manage and execute your workflow definitions"
 * />
 *
 * // With action button
 * <PageHeader
 *   title="Automations"
 *   description="Schedule and monitor automated workflow executions"
 *   actions={
 *     <Button onClick={() => navigate('/automations/new')}>
 *       <Plus className="size-4" />
 *       Create Automation
 *     </Button>
 *   }
 * />
 *
 * // With multiple actions
 * <PageHeader
 *   title="Nodes"
 *   description="Browse available workflow nodes"
 *   actions={
 *     <div className="flex gap-2">
 *       <Button variant="outline">
 *         <Filter className="size-4" />
 *         Filters
 *       </Button>
 *       <Button variant="outline">
 *         <Download className="size-4" />
 *         Export
 *       </Button>
 *     </div>
 *   }
 * />
 *
 * // Simple title only
 * <PageHeader title="Dashboard" />
 * ```
 *
 * @param {PageHeaderProps} props - Component props
 * @returns {React.ReactElement} The rendered PageHeader component
 *
 * @remarks
 * - Used on all major pages: Dashboard, Nodes, Workflows, Automations, Executions, Monitoring
 * - Provides consistent visual hierarchy with title (2xl) and description (muted)
 * - Responsive layout: stacks on mobile, side-by-side on desktop
 * - Actions are right-aligned on desktop, full-width on mobile
 * - Integrates with page layout margin/padding system
 * - Supports any React node as actions for maximum flexibility
 *
 * Related Requirements:
 * - Req 1: Node Library Browser
 * - Req 4: Workflow List Management
 * - Req 5: Workflow Creation
 * - Req 9: Automation List Management
 * - Req 10: Automation Creation
 * - Req 13: Real-time Monitoring
 * - Req 14: Execution History
 * - Req 15: Dashboard Overview
 * - Req 18: Responsive Design
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 border-b",
        "sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Title and Description Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Actions Section */}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
