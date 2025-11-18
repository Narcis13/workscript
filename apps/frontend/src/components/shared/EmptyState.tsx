import React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps {
  /**
   * The main title/heading displayed in the empty state
   * @example "No workflows found"
   */
  title: string;

  /**
   * Optional description providing more context about the empty state
   * @example "Get started by creating your first workflow"
   */
  description?: string;

  /**
   * Optional icon component from lucide-react to display above the title
   * @example FileQuestion, Inbox, Search
   */
  icon?: LucideIcon;

  /**
   * Optional action button configuration
   */
  actionButton?: {
    /**
     * Button label text
     */
    label: string;

    /**
     * Click handler for the action button
     */
    onClick: () => void;

    /**
     * Optional button variant (default: "default")
     */
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";

    /**
     * Optional icon to display in the button
     */
    icon?: LucideIcon;
  };

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

/**
 * EmptyState component displays a user-friendly message when no data is available
 *
 * This component is used throughout the application to provide consistent empty state
 * experiences. It displays an optional icon, a title, an optional description, and
 * an optional action button to help users take the next step.
 *
 * @component
 * @example
 * ```tsx
 * // Basic empty state
 * <EmptyState
 *   title="No nodes found"
 *   description="Try adjusting your search or filters"
 * />
 *
 * // With icon
 * import { FileQuestion } from "lucide-react";
 *
 * <EmptyState
 *   icon={FileQuestion}
 *   title="No workflows yet"
 *   description="Create your first workflow to get started"
 * />
 *
 * // With action button
 * import { Plus } from "lucide-react";
 *
 * <EmptyState
 *   icon={FileQuestion}
 *   title="No automations found"
 *   description="Start automating your workflows"
 *   actionButton={{
 *     label: "Create Automation",
 *     onClick: () => navigate('/automations/new'),
 *     icon: Plus
 *   }}
 * />
 *
 * // With custom variant
 * <EmptyState
 *   title="Search returned no results"
 *   description="Try a different search term"
 *   actionButton={{
 *     label: "Clear Filters",
 *     onClick: handleClearFilters,
 *     variant: "outline"
 *   }}
 * />
 * ```
 *
 * @param {EmptyStateProps} props - Component props
 * @returns {React.ReactElement} The rendered EmptyState component
 *
 * @remarks
 * - Used in: Node Library Browser (Req 1), Workflow List (Req 4), Workflow Detail (Req 8),
 *   Automation List (Req 9), Execution History (Req 14)
 * - Provides consistent UX for empty states across the application
 * - Fully responsive and accessible with proper ARIA labels
 * - Icon size and spacing optimized for readability
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actionButton,
  className,
}) => {
  const ActionIcon = actionButton?.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      )}

      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}

      {actionButton && (
        <Button
          variant={actionButton.variant || "default"}
          onClick={actionButton.onClick}
          className="mt-2"
        >
          {ActionIcon && <ActionIcon />}
          {actionButton.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
