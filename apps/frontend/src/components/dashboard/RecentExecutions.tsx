import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecutions } from '@/hooks/api/useExecutions';
import { ExecutionList } from '@/components/executions/ExecutionList';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowRight } from 'lucide-react';

/**
 * RecentExecutions Component
 *
 * Displays a compact table of the most recent 10 workflow executions.
 * This component is specifically designed for the dashboard to provide
 * a quick overview of recent execution activity.
 *
 * Features:
 * - Displays last 10 executions in a compact format
 * - Automatic data fetching via React Query
 * - Loading and error states
 * - "View All" link to navigate to full executions page
 * - Responsive design adapts to dashboard width
 *
 * Used by:
 * - DashboardPage: To show recent execution activity overview
 *
 * @returns Rendered component showing recent executions
 *
 * @example
 * ```tsx
 * // On the dashboard page
 * <RecentExecutions />
 * ```
 *
 * @remarks
 * - Uses compact mode of ExecutionList to save space
 * - Fetches executions sorted by most recent first
 * - Limited to 10 items to keep dashboard lightweight
 * - Automatically refetches data when window gains focus
 *
 * Requirements Met:
 * - Requirement 15: Dashboard Overview and Statistics
 */
export function RecentExecutions() {
  const navigate = useNavigate();

  // Fetch the last 10 executions sorted by most recent first
  const { data: executions = [], isLoading, error } = useExecutions({
    pageSize: 10,
    sortBy: 'startTime',
    sortOrder: 'desc',
  });

  /**
   * Handle navigation to full executions page
   */
  const handleViewAll = () => {
    navigate('/executions');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" label="Loading executions..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        title="Failed to Load Executions"
        description="Unable to fetch recent executions. Please try again."
        icon="AlertCircle"
      />
    );
  }

  // Empty state
  if (executions.length === 0) {
    return (
      <EmptyState
        title="No Executions Yet"
        description="No workflow executions have been recorded. Run a workflow to see execution history here."
        icon="History"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Execution List in compact mode */}
      <ExecutionList executions={executions} compact={true} />

      {/* View All Link */}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          onClick={handleViewAll}
          className="gap-2"
        >
          View All Executions
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default RecentExecutions;
