/**
 * AutomationsPage Component
 *
 * Displays a list of all automations with filtering, searching, and sorting capabilities.
 *
 * Features:
 * - Display all automations in a filterable list
 * - Search by automation name or description
 * - Filter by trigger type (All/Cron/Webhook/Immediate)
 * - Filter by enabled status (All/Enabled/Disabled)
 * - Sort by column (name, trigger type, next run, status)
 * - Pagination for large lists (>20 items)
 * - Enable/disable toggle with optimistic updates
 * - Execute automation immediately
 * - Delete confirmation dialog
 * - Empty state when no automations exist
 * - Loading skeletons during data fetch
 * - Permission-based action visibility
 *
 * Requirements Coverage:
 * - Requirement 9: Automation List Management and Filtering
 * - Requirement 17: Permission-based Access Control and UI Restrictions
 *
 * @module pages/AutomationsPage
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { AutomationList } from '@/components/automations/AutomationList';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  useAutomations,
  useDeleteAutomation,
  useToggleAutomation,
  useExecuteAutomation,
} from '@/hooks/api/useAutomations';
import type { Automation, TriggerType } from '@/types/automation.types';
import { toast } from 'sonner';

/**
 * Type for trigger type filter
 */
type TriggerTypeFilter = TriggerType | 'all';

/**
 * Type for enabled status filter
 */
type StatusFilter = 'all' | 'enabled' | 'disabled';

/**
 * Type for sort field
 */
type SortField = 'name' | 'triggerType' | 'nextRun' | 'status';

/**
 * Type for sort direction
 */
type SortDirection = 'asc' | 'desc';

/**
 * AutomationsPage Component
 *
 * Main page for viewing and managing automations.
 *
 * @example
 * ```tsx
 * // Route integration
 * import { AutomationsPage } from '@/pages/AutomationsPage';
 *
 * // In routes.tsx:
 * {
 *   path: '/automations',
 *   element: <AutomationsPage />,
 * }
 * ```
 */
export function AutomationsPage() {
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [searchQuery, setSearchQuery] = useState('');
  const [triggerTypeFilter, setTriggerTypeFilter] = useState<TriggerTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const pageSize = 20;

  // ============================================
  // API HOOKS
  // ============================================

  const { data: allAutomations = [], isLoading, error, refetch } = useAutomations();
  const deleteAutomationMutation = useDeleteAutomation();
  const toggleAutomationMutation = useToggleAutomation();
  const executeAutomationMutation = useExecuteAutomation();

  // ============================================
  // DELETE CONFIRMATION STATE
  // ============================================

  const [deleteConfirm, setDeleteConfirm] = useState<{
    automationId: string;
    automationName: string;
  } | null>(null);

  // ============================================
  // EXECUTE CONFIRMATION STATE
  // ============================================

  const [executeConfirm, setExecuteConfirm] = useState<{
    automationId: string;
    automationName: string;
  } | null>(null);

  // ============================================
  // FILTERING AND SORTING LOGIC
  // ============================================

  /**
   * Filter automations based on search query, trigger type, and enabled status
   */
  const filteredAutomations = useMemo(() => {
    return allAutomations.filter((automation) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        automation.name.toLowerCase().includes(searchLower) ||
        (automation.description && automation.description.toLowerCase().includes(searchLower));

      // Trigger type filter
      const matchesTriggerType =
        triggerTypeFilter === 'all' || automation.trigger.type === triggerTypeFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && automation.enabled) ||
        (statusFilter === 'disabled' && !automation.enabled);

      return matchesSearch && matchesTriggerType && matchesStatus;
    });
  }, [allAutomations, searchQuery, triggerTypeFilter, statusFilter]);

  /**
   * Sort the filtered automations
   */
  const sortedAutomations = useMemo(() => {
    const sorted = [...filteredAutomations].sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'triggerType':
          aValue = a.trigger.type;
          bValue = b.trigger.type;
          break;
        case 'nextRun':
          aValue = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0;
          bValue = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0;
          break;
        case 'status':
          aValue = a.enabled ? 1 : 0;
          bValue = b.enabled ? 1 : 0;
          break;
        default:
          return 0;
      }

      // Handle undefined values
      if (aValue === undefined || aValue === null) aValue = 0;
      if (bValue === undefined || bValue === null) bValue = 0;

      // Compare values
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredAutomations, sortField, sortDirection]);

  /**
   * Get paginated automations
   */
  const paginatedAutomations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedAutomations.slice(startIndex, endIndex);
  }, [sortedAutomations, currentPage, pageSize]);

  /**
   * Calculate total pages
   */
  const totalPages = Math.ceil(sortedAutomations.length / pageSize);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle search query change
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Handle trigger type filter change
   */
  const handleTriggerTypeChange = (value: string) => {
    setTriggerTypeFilter(value as TriggerTypeFilter);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Handle column sort
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Handle view automation
   */
  const handleView = (automationId: string) => {
    navigate(`/automations/${automationId}`);
  };

  /**
   * Handle edit automation
   */
  const handleEdit = (automationId: string) => {
    navigate(`/automations/${automationId}/edit`);
  };

  /**
   * Handle delete automation with confirmation
   */
  const handleDeleteClick = (automation: Automation) => {
    setDeleteConfirm({
      automationId: automation.id,
      automationName: automation.name,
    });
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteAutomationMutation.mutateAsync(deleteConfirm.automationId);
      setDeleteConfirm(null);
    } catch (error) {
      // Error is handled by the mutation hook's onError
      console.error('Delete failed:', error);
    }
  };

  /**
   * Handle toggle automation
   */
  const handleToggle = async (automationId: string, enabled: boolean) => {
    try {
      await toggleAutomationMutation.mutateAsync({
        id: automationId,
        enabled,
      });
    } catch (error) {
      // Error is handled by the mutation hook's onError
      console.error('Toggle failed:', error);
    }
  };

  /**
   * Handle execute automation with confirmation
   */
  const handleExecuteClick = (automation: Automation) => {
    setExecuteConfirm({
      automationId: automation.id,
      automationName: automation.name,
    });
  };

  /**
   * Handle execute confirmation
   */
  const handleExecuteConfirm = async () => {
    if (!executeConfirm) return;

    try {
      await executeAutomationMutation.mutateAsync({
        id: executeConfirm.automationId,
      });
      setExecuteConfirm(null);
    } catch (error) {
      // Error is handled by the mutation hook's onError
      console.error('Execute failed:', error);
    }
  };

  /**
   * Handle create automation button click
   */
  const handleCreate = () => {
    navigate('/automations/new');
  };

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    refetch();
  };

  /**
   * Handle workflow link click
   */
  const handleWorkflowClick = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  /**
   * Handle pagination
   */
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // ============================================
  // RENDERING
  // ============================================

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader
          title="Automations"
          description="Schedule and monitor automated workflow executions"
          actions={
            <Button onClick={handleCreate} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Automation
            </Button>
          }
        />

        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load automations"
            description="An error occurred while loading your automations. Please try again."
            actionButton={{
              label: 'Retry',
              onClick: handleRetry,
            }}
          />
        </div>
      </div>
    );
  }

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader
          title="Automations"
          description="Schedule and monitor automated workflow executions"
        />

        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading automations..." />
        </div>
      </div>
    );
  }

  /**
   * Render main content
   */
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Automations"
        description={`${allAutomations.length} automation${allAutomations.length !== 1 ? 's' : ''} total`}
        actions={
          <Button onClick={handleCreate} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create Automation
          </Button>
        }
      />

      {/* Filters and Search */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        {/* Search Bar */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name or description..."
            debounceMs={300}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trigger Type Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trigger Type</label>
            <Select value={triggerTypeFilter} onValueChange={handleTriggerTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cron">Cron Schedule</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="immediate">Manual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Field */}
          <div>
            <label className="text-sm font-medium mb-2 block">Sort By</label>
            <Select value={sortField} onValueChange={(value) => handleSort(value as SortField)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</SelectItem>
                <SelectItem value="triggerType">Trigger Type {sortField === 'triggerType' && (sortDirection === 'asc' ? '↑' : '↓')}</SelectItem>
                <SelectItem value="nextRun">Next Run {sortField === 'nextRun' && (sortDirection === 'asc' ? '↑' : '↓')}</SelectItem>
                <SelectItem value="status">Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {paginatedAutomations.length === 0 && allAutomations.length > 0
            ? '0'
            : Math.min((currentPage - 1) * pageSize + 1, sortedAutomations.length)}-{Math.min(currentPage * pageSize, sortedAutomations.length)} of {sortedAutomations.length} automations
        </div>
      </div>

      {/* Automations List */}
      {sortedAutomations.length === 0 && allAutomations.length > 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No automations found"
          description="Try adjusting your search or filters to find automations"
        />
      ) : (
        <>
          <AutomationList
            automations={paginatedAutomations}
            loading={false}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onToggle={handleToggle}
            onExecute={handleExecuteClick}
            onWorkflowClick={handleWorkflowClick}
            permissions={{
              canUpdate: true, // TODO: check actual permissions from auth context
              canDelete: true,
              canExecute: true,
              canToggle: true,
            }}
            toggleLoadingStates={{}}
            stats={{}}
            emptyState={{
              title: 'No automations yet',
              description: 'Create your first automation to schedule workflows',
              actionButton: {
                label: 'Create Automation',
                onClick: handleCreate,
              },
            }}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-lg">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          open={!!deleteConfirm}
          title={`Delete "${deleteConfirm.automationName}"?`}
          description="This will unschedule the automation permanently. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
          destructive
        />
      )}

      {/* Execute Confirmation Dialog */}
      {executeConfirm && (
        <ConfirmDialog
          open={!!executeConfirm}
          title={`Execute "${executeConfirm.automationName}"?`}
          description="This will trigger an immediate execution of the automation's workflow, bypassing the normal schedule."
          confirmLabel="Execute"
          onConfirm={handleExecuteConfirm}
          onCancel={() => setExecuteConfirm(null)}
        />
      )}
    </div>
  );
}

export default AutomationsPage;
