import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * Props for the StatCard component
 */
export interface StatCardProps {
  /**
   * The title/label for the statistic
   * @example "Total Workflows", "Active Automations", "Recent Executions"
   */
  title: string;

  /**
   * The main numeric value to display
   * @example 42, "15", 3500
   */
  value: string | number;

  /**
   * Optional subtitle or descriptive text below the title
   * @example "in last 24h", "enabled", "success rate"
   */
  subtitle?: string;

  /**
   * Optional React icon component to display
   * @example <WorkflowIcon className="size-5" />
   */
  icon?: React.ReactNode;

  /**
   * Optional trend indicator showing direction of change
   * - "up": displays green trending up indicator
   * - "down": displays red trending down indicator
   * - undefined: no trend indicator displayed
   */
  trend?: "up" | "down";

  /**
   * Optional URL or route path to navigate to when card is clicked
   * If provided, the entire card becomes clickable
   * @example "/workflows", "/automations", "/executions"
   */
  link?: string;

  /**
   * Optional additional CSS classes for the card container
   */
  className?: string;
}

/**
 * StatCard component for displaying statistics on the dashboard
 *
 * StatCard displays a single statistic with a large numeric value, optional icon,
 * subtitle, and trend indicator. The entire card can be made clickable to navigate
 * to a related page or external link.
 *
 * This component is specifically designed for the Dashboard page (Requirement 15)
 * to display key system metrics in a visually appealing and interactive way.
 *
 * @component
 * @example
 * ```tsx
 * // Basic stat card
 * <StatCard
 *   title="Total Workflows"
 *   value={42}
 *   subtitle="active"
 *   link="/workflows"
 * />
 *
 * // With icon and trend
 * <StatCard
 *   title="Recent Executions"
 *   value={156}
 *   subtitle="in last 24h"
 *   icon={<Activity className="size-5" />}
 *   trend="up"
 *   link="/executions"
 * />
 *
 * // With down trend
 * <StatCard
 *   title="Failed Jobs"
 *   value={3}
 *   subtitle="this week"
 *   icon={<AlertCircle className="size-5" />}
 *   trend="down"
 * />
 *
 * // Without link (non-clickable)
 * <StatCard
 *   title="Average Duration"
 *   value="2.3s"
 *   subtitle="per execution"
 *   icon={<Timer className="size-5" />}
 * />
 * ```
 *
 * @param {StatCardProps} props - Component props
 * @returns {React.ReactElement} The rendered StatCard component
 *
 * @remarks
 * - The card is clickable (cursor becomes pointer) only if `link` prop is provided
 * - When clicked with a `link`, navigates using React Router
 * - Responsive sizing: adjusts padding and font sizes on smaller screens
 * - Icon can be any valid React node (lucide-react icons recommended)
 * - Trend indicators use green for "up" and red for "down"
 * - Values are displayed in a large, prominent font (text-3xl)
 * - Supports any string or number for value (no automatic formatting)
 *
 * Related Requirements:
 * - Req 15: Dashboard Overview and Statistics
 * - Req 18: Responsive Design and Mobile Optimization
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  link,
  className,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (link) {
      navigate(link);
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "p-6 transition-all duration-200",
        link && "cursor-pointer hover:shadow-lg hover:border-primary/50",
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Left Section: Title, Value, Subtitle */}
        <div className="flex flex-col gap-2 flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          {/* Main Value */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {value}
            </span>

            {/* Trend Indicator */}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
                  trend === "up"
                    ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950"
                    : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950"
                )}
              >
                {trend === "up" ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
              </div>
            )}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Section: Icon */}
        {icon && (
          <div className="ml-4 p-2 rounded-lg bg-muted">
            <div className="text-muted-foreground">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
