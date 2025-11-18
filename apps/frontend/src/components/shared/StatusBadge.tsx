import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * StatusBadge Component
 *
 * A color-coded badge component for displaying workflow, execution, and automation status indicators.
 * Uses the shadcn/ui Badge component with custom color mappings for different status types.
 *
 * @example
 * ```tsx
 * // Workflow execution status
 * <StatusBadge status="completed" />
 * <StatusBadge status="failed" />
 * <StatusBadge status="running" />
 * <StatusBadge status="pending" />
 *
 * // Automation status
 * <StatusBadge status="enabled" />
 * <StatusBadge status="disabled" />
 * ```
 */

export type Status =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "enabled"
  | "disabled";

export interface StatusBadgeProps {
  /**
   * The status to display
   * - pending: Execution not yet started (gray)
   * - running: Execution in progress (blue)
   * - completed: Execution finished successfully (green)
   * - failed: Execution encountered an error (red)
   * - enabled: Automation is active (green)
   * - disabled: Automation is inactive (gray)
   */
  status: Status;

  /**
   * Additional CSS classes to apply to the badge
   */
  className?: string;
}

/**
 * Maps status values to their visual representation
 */
const statusConfig: Record<
  Status,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  },
  running: {
    label: "Running",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
  },
  enabled: {
    label: "Enabled",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
  },
  disabled: {
    label: "Disabled",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  },
};

/**
 * StatusBadge Component
 *
 * Displays a color-coded badge based on the provided status value.
 * Automatically selects appropriate colors and labels for each status type.
 * Supports both light and dark mode themes.
 *
 * @param {StatusBadgeProps} props - Component properties
 * @returns {JSX.Element} The rendered status badge
 */
export function StatusBadge({ status, className }: StatusBadgeProps): JSX.Element {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        "font-medium",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

export default StatusBadge;
