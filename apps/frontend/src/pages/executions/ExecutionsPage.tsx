/**
 * ExecutionsPage - Execution History List
 *
 * Displays workflow execution history with filtering by status,
 * workflow, and date range. Provides access to detailed execution logs.
 *
 * Features:
 * - Real-time search filtering
 * - Status filter dropdown (pending, running, completed, failed)
 * - Workflow filter dropdown
 * - Date range filter
 * - Execution list with DataTable
 * - Pagination and sorting
 * - Loading states with skeleton loaders
 * - Empty state when no executions
 * - Re-run and export actions
 *
 * Requirements Coverage:
 * - Requirement 14: Execution History and State Inspection
 *
 * @module pages/executions/ExecutionsPage
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, RefreshCw, Filter, X, Calendar } from 'lucide-react';
import { format, subDays, subHours, startOfDay, endOfDay } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { ExecutionList } from '@/components/executions/ExecutionList';
import { MobilePagination } from '@/components/shared/MobilePagination';
import { usePagination } from '@/hooks/usePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExecutions } from '@/hooks/api/useExecutions';
import { useWorkflows } from '@/hooks/api/useWorkflows';
import type { WorkflowExecution, ExecutionFilterOptions } from '@/types/execution.types';
import type { ExecutionStatus } from '@/types/automation.types';

/**
 * Available status filter options
 */
const STATUS_OPTIONS: { value: ExecutionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

/**
 * Predefined date range options
 */
const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

/**
 * ExecutionsPage Component
 *
 * Displays a paginated list of all executions with comprehensive filtering options.
 */
export default function ExecutionsPage() {
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Search term for filtering executions
   */
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Selected status filter
   */
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all');

  /**
   * Selected workflow filter
   */
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');

  /**
   * Selected date range preset
   */
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');

  /**
   * Custom date range state
   */
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  // ============================================
  // API HOOKS
  // ============================================

  /**
   * Build filter options for the API call
   */
  const filterOptions = useMemo((): ExecutionFilterOptions => {
    const options: ExecutionFilterOptions = {
      sortBy: 'startTime',
      sortOrder: 'desc',
    };

    if (statusFilter !== 'all') {
      options.status = statusFilter;
    }

    if (workflowFilter !== 'all') {
      options.workflowId = workflowFilter;
    }

    // Calculate date range based on preset
    const now = new Date();
    switch (dateRangePreset) {
      case '1h':
        options.startDate = subHours(now, 1);
        options.endDate = now;
        break;
      case '24h':
        options.startDate = subHours(now, 24);
        options.endDate = now;
        break;
      case '7d':
        options.startDate = subDays(now, 7);
        options.endDate = now;
        break;
      case '30d':
        options.startDate = subDays(now, 30);
        options.endDate = now;
        break;
      case 'custom':
        if (customDateRange.from) {
          options.startDate = startOfDay(customDateRange.from);
        }
        if (customDateRange.to) {
          options.endDate = endOfDay(customDateRange.to);
        }
        break;
    }

    return options;
  }, [statusFilter, workflowFilter, dateRangePreset, customDateRange]);

  /**
   * Fetch all executions with filters
   */
  const { data: executions = [], isLoading, error, refetch } = useExecutions(filterOptions);

  /**
   * Fetch all workflows for the filter dropdown
   */
  const { data: workflows = [] } = useWorkflows();

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Filter executions based on search term (client-side filter for workflow name)
   */
  const filteredExecutions = useMemo(() => {
    if (!searchTerm.trim()) {
      return executions;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return executions.filter(
      (execution) =>
        execution.workflowName?.toLowerCase().includes(lowerSearch) ||
        execution.id.toLowerCase().includes(lowerSearch)
    );
  }, [executions, searchTerm]);

  /**
   * Pagination hook - manages current page and pagination calculations
   */
  const pagination = usePagination({
    totalItems: filteredExecutions.length,
    initialPageSize: 20,
  });

  /**
   * Paginate filtered executions
   */
  const paginatedExecutions = useMemo(() => {
    return filteredExecutions.slice(pagination.startIndex, pagination.endIndex);
  }, [filteredExecutions, pagination.startIndex, pagination.endIndex]);

  /**
   * Count active filters for badge display
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (workflowFilter !== 'all') count++;
    if (dateRangePreset !== 'all') count++;
    return count;
  }, [statusFilter, workflowFilter, dateRangePreset]);

  /**
   * Execution statistics
   */
  const stats = useMemo(() => {
    const total = executions.length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const running = executions.filter((e) => e.status === 'running').length;
    const pending = executions.filter((e) => e.status === 'pending').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, failed, running, pending, successRate };
  }, [executions]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle search term change
   */
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    pagination.resetPage();
  };

  /**
   * Handle status filter change
   */
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ExecutionStatus | 'all');
    pagination.resetPage();
  };

  /**
   * Handle workflow filter change
   */
  const handleWorkflowChange = (value: string) => {
    setWorkflowFilter(value);
    pagination.resetPage();
  };

  /**
   * Handle date range preset change
   */
  const handleDateRangeChange = (value: string) => {
    setDateRangePreset(value);
    if (value !== 'custom') {
      setCustomDateRange({ from: undefined, to: undefined });
    }
    pagination.resetPage();
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setStatusFilter('all');
    setWorkflowFilter('all');
    setDateRangePreset('all');
    setCustomDateRange({ from: undefined, to: undefined });
    setSearchTerm('');
    pagination.resetPage();
  };

  /**
   * Navigate to execution detail page
   */
  const handleViewDetails = (executionId: string) => {
    navigate(`/executions/${executionId}`);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Execution History"
        description="View and analyze workflow execution logs"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Running</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.running}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl">{stats.successRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Filters</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-1">
              <SearchInput
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by workflow or ID..."
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Workflow Filter */}
            <Select value={workflowFilter} onValueChange={handleWorkflowChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <div className="flex gap-2">
              <Select value={dateRangePreset} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Date Range Picker */}
              {dateRangePreset === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: customDateRange.from,
                        to: customDateRange.to,
                      }}
                      onSelect={(range) => {
                        setCustomDateRange({
                          from: range?.from,
                          to: range?.to,
                        });
                        pagination.resetPage();
                      }}
                      numberOfMonths={2}
                    />
                    {customDateRange.from && (
                      <div className="p-3 border-t text-sm text-muted-foreground">
                        {customDateRange.from && format(customDateRange.from, 'PPP')}
                        {customDateRange.to && ` - ${format(customDateRange.to, 'PPP')}`}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {paginatedExecutions.length} of {filteredExecutions.length} executions
          {filteredExecutions.length !== executions.length && (
            <span className="ml-1">(filtered from {executions.length} total)</span>
          )}
        </span>
      </div>

      {/* Execution List */}
      <ExecutionList
        executions={paginatedExecutions}
        loading={isLoading}
        onViewDetails={handleViewDetails}
      />

      {/* Empty State */}
      {!isLoading && filteredExecutions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No executions found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {activeFilterCount > 0 || searchTerm
                ? 'No executions match your current filters. Try adjusting your search criteria.'
                : 'No workflow executions have been recorded yet. Run a workflow to see execution history here.'}
            </p>
            {(activeFilterCount > 0 || searchTerm) && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <MobilePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPreviousPage={pagination.hasPreviousPage}
          hasNextPage={pagination.hasNextPage}
          onPreviousPage={pagination.previousPage}
          onNextPage={pagination.nextPage}
          onGoToPage={pagination.goToPage}
          className="p-4 bg-card border rounded-lg"
        />
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-destructive text-sm mb-4">
              Failed to load executions. Please try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
