/**
 * ExecutionsPage Component
 *
 * Displays a comprehensive list of all workflow executions with multiple filtering
 * and sorting capabilities.
 *
 * Features:
 * - Display all executions in a sortable, searchable table
 * - Filter by execution status (All/Pending/Running/Completed/Failed)
 * - Filter by workflow (dropdown with all available workflows)
 * - Filter by date range (start date and end date selectors)
 * - Sort by column (start time, duration, status)
 * - Pagination for large lists (>20 items per page)
 * - Execution details with truncated ID and copy-to-clipboard
 * - Empty state when no executions exist
 * - Loading skeletons during data fetch
 * - Real-time status updates via WebSocket integration
 *
 * Requirements Coverage:
 * - Requirement 14: Execution History and State Inspection
 *   - Full execution list view with filtering
 *   - Status, workflow, and date range filters
 *   - Column sorting
 *   - Pagination
 *
 * @module pages/ExecutionsPage
 */

import React, { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar, AlertCircle } from 'lucide-react';
import { MobilePagination } from '@/components/shared/MobilePagination';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExecutionList } from '@/components/executions/ExecutionList';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useExecutions } from '@/hooks/api/useExecutions';
import { useWorkflows } from '@/hooks/api/useWorkflows';
import type { ExecutionStatus } from '@/types/automation.types';
import type { WorkflowExecution } from '@/types/execution.types';

/**
 * Type for status filter
 */
type StatusFilterType = ExecutionStatus | 'all';

/**
 * ExecutionsPage Component
 *
 * Main page for viewing execution history with comprehensive filtering and sorting.
 *
 * @example
 * ```tsx
 * // Route integration
 * import { ExecutionsPage } from '@/pages/ExecutionsPage';
 *
 * // In routes.tsx:
 * {
 *   path: '/executions',
 *   element: <ExecutionsPage />,
 * }
 * ```
 *
 * @remarks
 * - Uses React Query for efficient data fetching and caching
 * - Implements client-side filtering for responsive UX
 * - Date range filter defaults to last 30 days
 * - Pagination is handled via React Query's query keys
 * - Status filter includes all execution statuses from the system
 */
export function ExecutionsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Search query for filtering executions by ID or workflow name
   */
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filter by execution status
   * Options: 'all', 'pending', 'running', 'completed', 'failed'
   */
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  /**
   * Filter by workflow ID
   */
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | 'all'>('all');

  /**
   * Start date for date range filter
   * Default: 30 days ago
   */
  const [startDate, setStartDate] = useState<Date>(
    subDays(new Date(), 30)
  );

  /**
   * End date for date range filter
   * Default: today
   */
  const [endDate, setEndDate] = useState<Date>(new Date());

  /**
   * Current page number for pagination
   */
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Number of items per page
   */
  const pageSize = 20;

  /**
   * Current sort field
   */
  const [sortBy, setSortBy] = useState<'startTime' | 'duration' | 'status'>('startTime');

  /**
   * Current sort direction
   */
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================
  // DATA FETCHING
  // ============================================

  /**
   * Fetch all executions with current filters and pagination
   */
  const {
    data: executionsData = [],
    isLoading: isLoadingExecutions,
    error: executionsError,
    refetch: refetchExecutions,
    hasNextPage = false,
    totalPages = 1,
  } = useExecutions({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    workflowId: selectedWorkflowId !== 'all' ? selectedWorkflowId : undefined,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    page: currentPage,
    pageSize,
  });

  /**
   * Fetch all workflows for the workflow filter dropdown
   */
  const {
    data: workflowsData = [],
    isLoading: isLoadingWorkflows,
  } = useWorkflows();

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Filter and search executions locally for better UX
   * This is in addition to API-level filtering
   */
  const filteredAndSearchedExecutions = useMemo(() => {
    let result = executionsData;

    // Client-side search by execution ID or workflow name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (execution) =>
          execution.id.toLowerCase().includes(query) ||
          (execution.workflowName?.toLowerCase().includes(query) ?? false)
      );
    }

    return result;
  }, [executionsData, searchQuery]);

  /**
   * Determine if we have any filters applied
   */
  const hasActiveFilters = useMemo(
    () =>
      statusFilter !== 'all' ||
      selectedWorkflowId !== 'all' ||
      searchQuery.trim() !== '' ||
      (startDate && endDate),
    [statusFilter, selectedWorkflowId, searchQuery, startDate, endDate]
  );

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilterType);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Handle workflow filter change
   */
  const handleWorkflowFilterChange = (value: string) => {
    setSelectedWorkflowId(value);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Handle date range change (start date)
   */
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setCurrentPage(1); // Reset to first page
    }
  };

  /**
   * Handle date range change (end date)
   */
  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      setCurrentPage(1); // Reset to first page
    }
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (field: 'startTime' | 'duration' | 'status') => {
    if (sortBy === field) {
      // Toggle sort direction if same field clicked
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with descending order by default
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Handle reset all filters
   */
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedWorkflowId('all');
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
    setCurrentPage(1);
    setSortBy('startTime');
    setSortOrder('desc');
  };

  /**
   * Handle previous page
   */
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Handle next page
   */
  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Loading state
  if (isLoadingExecutions && filteredAndSearchedExecutions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Execution History"
          description="View and analyze all workflow executions"
        />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner label="Loading executions..." />
        </div>
      </div>
    );
  }

  // Error state
  if (executionsError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Execution History"
          description="View and analyze all workflow executions"
        />
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">
                Failed to load executions
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {executionsError instanceof Error
                  ? executionsError.message
                  : 'An unexpected error occurred while fetching executions.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchExecutions()}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoadingExecutions && filteredAndSearchedExecutions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Execution History"
          description="View and analyze all workflow executions"
        />

        {hasActiveFilters ? (
          <EmptyState
            title="No executions found"
            description="No executions match your current filters. Try adjusting your search criteria."
            actionButton={
              <Button onClick={handleResetFilters} variant="outline">
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No executions yet"
            description="Workflow executions will appear here once you run a workflow or automation."
          />
        )}
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Execution History"
        description="View and analyze all workflow executions with detailed logs and state inspection"
      />

      {/* Filters Section */}
      <div className="space-y-4">
        {/* Search and Quick Filters Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Search Input */}
          <div className="flex-1 min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by execution ID or workflow name..."
              debounceMs={300}
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-40">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Status
            </label>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Workflow Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Workflow
            </label>
            <Select
              value={selectedWorkflowId}
              onValueChange={handleWorkflowFilterChange}
              disabled={isLoadingWorkflows}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {workflowsData.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Start Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(startDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateChange}
                  disabled={(date) =>
                    date > endDate || date > new Date()
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              End Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(endDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={handleEndDateChange}
                  disabled={(date) =>
                    date < startDate || date > new Date()
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Execution Table */}
      <div className="rounded-lg border bg-card">
        <ExecutionList
          executions={filteredAndSearchedExecutions}
          loading={isLoadingExecutions}
        />
      </div>

      {/* Summary Footer with Pagination */}
      {filteredAndSearchedExecutions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
            <div>
              Showing {filteredAndSearchedExecutions.length} of {executionsData.length} executions
              {statusFilter !== 'all' && ` • ${statusFilter} status`}
              {selectedWorkflowId !== 'all' && ' • filtered by workflow'}
            </div>
            {isLoadingExecutions && (
              <span className="text-xs">
                Updating...
              </span>
            )}
          </div>

          {/* Pagination Controls - Mobile Optimized */}
          {totalPages > 1 && (
            <MobilePagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasPreviousPage={currentPage > 1}
              hasNextPage={hasNextPage}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              className="p-4 bg-card border rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ExecutionsPage;
