/**
 * AutomationStats Component
 *
 * Displays comprehensive execution statistics for an automation including aggregate metrics
 * and visual charts for trend analysis and success rate distribution.
 *
 * Features:
 * - Statistics cards displaying total runs, success count, failure count, success rate, average duration
 * - Success rate pie chart using recharts
 * - Run count over time line chart using recharts
 * - Color-coded indicators (green for success, red for failure)
 * - Responsive layout adapting to mobile and desktop screens
 * - Formatted numbers and percentages
 * - Loading states and empty states
 * - Accessibility-focused chart rendering
 *
 * Requirements Coverage:
 * - Requirement 12: Automation Execution Management and Monitoring
 *
 * @module components/automations/AutomationStats
 */

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
} from 'lucide-react';
import type { Automation, AutomationStats } from '@/types/automation.types';

/**
 * Props for the AutomationStats component
 */
export interface AutomationStatsProps {
  /**
   * Automation object with execution statistics
   * Should contain stats property with totalRuns, successCount, failureCount, successRate, averageDuration
   */
  automation: Automation & { stats?: AutomationStats };

  /**
   * Optional execution history data for timeline visualization
   * Array of objects with date and count
   */
  executionHistory?: Array<{
    date: string;
    count: number;
    successful: number;
    failed: number;
  }>;

  /**
   * Whether the statistics are loading
   */
  isLoading?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional callback when stats are rendered
   */
  onStatsReady?: (stats: AutomationStats) => void;
}

/**
 * Format number as a human-readable string
 */
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

/**
 * Format milliseconds as human-readable time
 */
const formatDuration = (ms: number | undefined): string => {
  if (!ms || ms === 0) return 'N/A';
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  if (ms < 3600000) return (ms / 60000).toFixed(1) + 'm';
  return (ms / 3600000).toFixed(1) + 'h';
};

/**
 * Skeleton Loader for Statistics Cards
 */
const StatsCardSkeleton: React.FC = () => (
  <div className="bg-muted rounded-lg p-6 animate-pulse">
    <div className="h-5 bg-muted-foreground/20 rounded w-20 mb-2" />
    <div className="h-8 bg-muted-foreground/20 rounded w-16" />
  </div>
);

/**
 * AutomationStats Component
 *
 * Renders statistics cards and charts for an automation's execution history.
 * Displays total runs, success/failure counts, success rate, and average duration.
 * Includes pie chart for success rate distribution and line/bar chart for execution trends.
 *
 * @example
 * ```tsx
 * <AutomationStats
 *   automation={automation}
 *   executionHistory={[
 *     { date: 'Jan 1', count: 10, successful: 9, failed: 1 },
 *     { date: 'Jan 2', count: 12, successful: 11, failed: 1 },
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
export const AutomationStats: React.FC<AutomationStatsProps> = ({
  automation,
  executionHistory,
  isLoading = false,
  className,
  onStatsReady,
}) => {
  // Extract stats from automation
  const stats = automation.stats;

  // Prepare pie chart data
  const successRateData = useMemo(() => {
    if (!stats) return [];
    const successRate = stats.successRate ?? 0;
    return [
      { name: 'Success', value: successRate, fill: '#16a34a' },
      { name: 'Failure', value: 100 - successRate, fill: '#dc2626' },
    ];
  }, [stats]);

  // Prepare execution history data for line/bar chart
  const chartData = useMemo(() => {
    if (!executionHistory) return [];
    return executionHistory.map((entry) => ({
      ...entry,
      successRate:
        entry.count > 0 ? Math.round((entry.successful / entry.count) * 100) : 0,
    }));
  }, [executionHistory]);

  // Trigger callback when stats are ready
  React.useEffect(() => {
    if (stats && onStatsReady) {
      onStatsReady(stats);
    }
  }, [stats, onStatsReady]);

  // If no stats available, show empty state
  if (!stats && !isLoading) {
    return (
      <div className={`text-center py-12 ${className || ''}`}>
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Statistics Available</h3>
        <p className="text-sm text-muted-foreground">
          This automation has not been executed yet. Run the automation to see statistics.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Runs Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          {isLoading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Runs
                </span>
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {formatNumber(stats?.totalRuns)}
              </div>
              {stats && stats.totalRuns > 0 && (
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                  {stats.totalRuns === 1 ? '1 execution' : `${stats.totalRuns} executions`}
                </p>
              )}
            </>
          )}
        </div>

        {/* Success Count Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-6 border border-green-200 dark:border-green-800">
          {isLoading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Successful
                </span>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                {formatNumber(stats?.successCount)}
              </div>
              {stats && stats.totalRuns > 0 && (
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                  {Math.round(((stats.successCount ?? 0) / stats.totalRuns) * 100)}% success
                </p>
              )}
            </>
          )}
        </div>

        {/* Failure Count Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg p-6 border border-red-200 dark:border-red-800">
          {isLoading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Failed
                </span>
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                {formatNumber(stats?.failureCount)}
              </div>
              {stats && stats.totalRuns > 0 && (
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                  {Math.round(((stats.failureCount ?? 0) / stats.totalRuns) * 100)}% failure
                </p>
              )}
            </>
          )}
        </div>

        {/* Success Rate Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          {isLoading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Success Rate
                </span>
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                {stats?.successRate ?? 0}%
              </div>
              <div className="mt-2 w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 dark:bg-purple-400 transition-all duration-500"
                  style={{ width: `${stats?.successRate ?? 0}%` }}
                  aria-label={`${stats?.successRate ?? 0}% success rate`}
                />
              </div>
            </>
          )}
        </div>

        {/* Average Duration Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
          {isLoading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Avg Duration
                </span>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                {formatDuration(stats?.averageDuration)}
              </div>
              {stats?.averageDuration && (
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                  per execution
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Charts Row */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Success Rate Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Success Rate Distribution</CardTitle>
              <CardDescription>
                Ratio of successful to failed executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {successRateData.length > 0 && (stats?.totalRuns ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={successRateData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {successRateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.375rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No execution data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Execution History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Execution History</CardTitle>
              <CardDescription>
                Execution count and success rate over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.375rem',
                      }}
                      formatter={(value: number) => [value, '']}
                    />
                    <Legend />
                    <Bar
                      dataKey="successful"
                      name="Successful"
                      fill="#16a34a"
                      stackId="a"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="failed"
                      name="Failed"
                      fill="#dc2626"
                      stackId="a"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No execution history available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State for Charts */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-40 animate-pulse mb-2" />
              <div className="h-4 bg-muted rounded w-48 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-40 animate-pulse mb-2" />
              <div className="h-4 bg-muted rounded w-48 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Footer */}
      {!isLoading && stats && (stats.totalRuns ?? 0) > 0 && (
        <div className="text-xs text-muted-foreground p-4 rounded-lg bg-muted/30 border border-muted">
          <p>
            Based on {stats.totalRuns} execution{stats.totalRuns !== 1 ? 's' : ''} • Last
            run: {stats.lastRunAt ? new Date(stats.lastRunAt).toLocaleString() : 'Never'}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Export AutomationStats as default
 */
export default AutomationStats;
