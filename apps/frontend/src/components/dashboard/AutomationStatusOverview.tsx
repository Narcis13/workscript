import React from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import type { AutomationSummaryStats } from "@/types/automation.types";

/**
 * Props for the AutomationStatusOverview component
 */
export interface AutomationStatusOverviewProps {
  /**
   * Summary statistics about automations in the system
   * Contains counts of enabled/disabled automations and success rates
   */
  stats: AutomationSummaryStats;

  /**
   * Optional additional CSS classes for the component container
   */
  className?: string;

  /**
   * Optional loading state indicator
   * If true, displays skeleton/loading state instead of content
   */
  isLoading?: boolean;
}

/**
 * AutomationStatusOverview component for the dashboard
 *
 * AutomationStatusOverview displays pie charts showing:
 * 1. The distribution of enabled vs. disabled automations
 * 2. The overall success vs. failure rates across all automations
 *
 * This component is used on the Dashboard page (Requirement 15) to provide
 * a visual representation of the health and status of automations in the system.
 *
 * The component uses recharts for visualization and includes:
 * - Color-coded pie charts (green for success/enabled, red for failure/disabled)
 * - Hover tooltips showing exact counts and percentages
 * - Responsive sizing that adapts to container width
 * - Clean, accessible design using Tailwind CSS
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with automation stats
 * <AutomationStatusOverview
 *   stats={{
 *     total: 12,
 *     enabled: 10,
 *     disabled: 2,
 *     byTriggerType: { cron: 8, webhook: 2, immediate: 2 },
 *     totalExecutions: 500,
 *     successRate: 95,
 *     recentFailures: 2
 *   }}
 * />
 *
 * // With loading state
 * <AutomationStatusOverview
 *   stats={stats}
 *   isLoading={true}
 * />
 * ```
 *
 * @param {AutomationStatusOverviewProps} props - Component props
 * @returns {React.ReactElement} The rendered AutomationStatusOverview component
 *
 * @remarks
 * - The component displays two separate pie charts side by side on desktop
 * - On mobile, charts stack vertically due to responsive container sizing
 * - Colors: Green (#10b981) for enabled/success, Red (#ef4444) for disabled/failure
 * - Percentages are calculated from the provided statistics
 * - The tooltip shows exact counts and percentages on hover
 * - Component is fully responsive and works on all screen sizes
 *
 * Related Requirements:
 * - Req 15: Dashboard Overview and Statistics
 * - Req 18: Responsive Design and Mobile Optimization
 */
export const AutomationStatusOverview: React.FC<
  AutomationStatusOverviewProps
> = ({ stats, className = "", isLoading = false }) => {
  // Calculate enabled/disabled data for the first pie chart
  const statusData = [
    {
      name: "Enabled",
      value: stats.enabled,
      percentage: stats.total > 0 ? ((stats.enabled / stats.total) * 100).toFixed(1) : 0
    },
    {
      name: "Disabled",
      value: stats.disabled,
      percentage: stats.total > 0 ? ((stats.disabled / stats.total) * 100).toFixed(1) : 0
    }
  ];

  // Calculate success/failure data for the second pie chart
  // If no successRate is provided, default to 0
  const successRate = stats.successRate ?? 0;
  const failureRate = 100 - successRate;

  const successData = [
    {
      name: "Successful",
      value: Math.round((stats.totalExecutions * successRate) / 100),
      percentage: successRate.toFixed(1)
    },
    {
      name: "Failed",
      value: Math.round((stats.totalExecutions * failureRate) / 100),
      percentage: failureRate.toFixed(1)
    }
  ];

  // Custom tooltip component for pie charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {data.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Count: {data.value}
          </p>
          <p className="text-xs font-semibold text-foreground">
            {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Color scheme for charts
  const STATUS_COLORS = ["#10b981", "#ef4444"]; // Green for enabled, Red for disabled
  const SUCCESS_COLORS = ["#10b981", "#ef4444"]; // Green for success, Red for failure

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-6">
          {/* Loading skeleton for status chart */}
          <div>
            <div className="h-5 bg-muted rounded w-1/3 mb-4" />
            <div className="h-64 bg-muted rounded" />
          </div>

          {/* Loading skeleton for success chart */}
          <div>
            <div className="h-5 bg-muted rounded w-1/3 mb-4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-8">
        {/* Status Chart: Enabled vs Disabled */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Automation Status
          </h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, payload }) =>
                    `${name}: ${payload?.percentage ?? 0}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[index]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => {
                    const data = entry.payload as any;
                    return `${value}: ${data.value}`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Enabled</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                {stats.enabled}
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Disabled</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">
                {stats.disabled}
              </p>
            </div>
          </div>
        </div>

        {/* Success Rate Chart: Successful vs Failed */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Execution Success Rate
          </h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={successData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, payload }) =>
                    `${name}: ${payload?.percentage ?? 0}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {successData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SUCCESS_COLORS[index]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => {
                    const data = entry.payload as any;
                    return `${value}: ${data.value}`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Success Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                {successRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Executions</p>
              <p className="text-lg font-bold text-foreground">
                {stats.totalExecutions}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {stats.recentFailures !== undefined && stats.recentFailures > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <span className="font-semibold">{stats.recentFailures}</span> automation(s) have recent failures
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AutomationStatusOverview;
