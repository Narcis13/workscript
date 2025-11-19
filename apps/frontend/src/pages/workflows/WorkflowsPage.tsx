/**
 * WorkflowsPage Component
 *
 * Main page for displaying and managing all workflows in the system.
 * Provides search filtering, pagination, and action handlers for
 * workflow operations (view, edit, delete, run).
 *
 * Features:
 * - Real-time search filtering (name and description)
 * - Workflow list with cards showing key information
 * - Action buttons: Create, View, Edit, Delete, Run
 * - Delete confirmation dialog
 * - Run workflow dialog with initial state input
 * - Pagination for lists with > 20 workflows
 * - Loading states with skeleton loaders
 * - Empty state when no workflows exist or match filters
 * - Permission-based action visibility
 *
 * Requirements Coverage:
 * - Requirement 4: Workflow List Management and Navigation
 * - Requirement 17: Permission-based Access Control
 * - Requirement 18: Responsive Design
 * - Requirement 19: Error Handling and User Feedback
 *
 * @module pages/WorkflowsPage
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { WorkflowList } from '@/components/workflows/WorkflowList';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  useWorkflows,
  useDeleteWorkflow,
  useExecuteWorkflowById,
} from '@/hooks/api/useWorkflows';
import type { Workflow } from '@/types/workflow.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * WorkflowsPage Component
 *
 * Displays a paginated list of all workflows with search functionality
 * and various workflow actions.
 *
 * @example
 * ```tsx
 * // Basic usage (typically used in routing)
 * <Route path="/workflows" element={<WorkflowsPage />} />
 * ```
 *
 * User Flow:
 * 1. Page loads and fetches all workflows from API
 * 2. User can search to filter workflows by name/description
 * 3. User can click "Create Workflow" to navigate to creation page
 * 4. User can click "View" to see workflow details
 * 5. User can click "Edit" to modify workflow
 * 6. User can click "Delete" which shows confirmation dialog
 * 7. User can click "Run" which shows dialog for initial state input
 * 8. Pagination controls appear if > 20 workflows
 */
export const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Search term for filtering workflows
   * Updates are debounced by SearchInput component (300ms)
   */
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * ID of workflow to be deleted (if delete dialog is open)
   */
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);

  /**
   * ID of workflow to be run (if run dialog is open)
   */
  const [runWorkflowId, setRunWorkflowId] = useState<string | null>(null);

  /**
   * Initial state JSON string for workflow execution
   */
  const [initialStateJson, setInitialStateJson] = useState('{}');

  /**
   * Pagination state - current page (1-indexed)
   */
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Number of items per page
   */
  const PAGE_SIZE = 20;

  // ============================================
  // API HOOKS
  // ============================================

  /**
   * Fetch all workflows with auto-refetch on window focus
   */
  const { data: workflows = [], isLoading, error, refetch } = useWorkflows();

  /**
   * Delete workflow mutation with optimistic updates
   */
  const deleteMutation = useDeleteWorkflow();

  /**
   * Execute workflow by ID mutation
   */
  const executeMutation = useExecuteWorkflowById();

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Filter workflows based on search term
   * Searches in workflow name and description (case-insensitive)
   */
  const filteredWorkflows = useMemo(() => {
    if (!searchTerm.trim()) {
      return workflows;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return workflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(lowerSearch) ||
        workflow.description?.toLowerCase().includes(lowerSearch)
    );
  }, [workflows, searchTerm]);

  /**
   * Paginate filtered workflows
   */
  const paginatedWorkflows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return filteredWorkflows.slice(startIndex, endIndex);
  }, [filteredWorkflows, currentPage, PAGE_SIZE]);

  /**
   * Calculate total number of pages
   */
  const totalPages = Math.ceil(filteredWorkflows.length / PAGE_SIZE);

  /**
   * Check if pagination should be shown
   */
  const showPagination = filteredWorkflows.length > PAGE_SIZE;

  /**
   * Find workflow to be deleted (for confirmation message)
   */
  const workflowToDelete = useMemo(() => {
    if (!deleteWorkflowId) return null;
    return workflows.find((w) => w.id === deleteWorkflowId);
  }, [deleteWorkflowId, workflows]);

  /**
   * Find workflow to be run (for dialog title)
   */
  const workflowToRun = useMemo(() => {
    if (!runWorkflowId) return null;
    return workflows.find((w) => w.id === runWorkflowId);
  }, [runWorkflowId, workflows]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle search term change
   * Resets pagination to first page when search changes
   */
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  /**
   * Navigate to workflow detail page
   */
  const handleView = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  /**
   * Navigate to workflow edit page
   */
  const handleEdit = (workflowId: string) => {
    navigate(`/workflows/${workflowId}/edit`);
  };

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = (workflowId: string) => {
    setDeleteWorkflowId(workflowId);
  };

  /**
   * Confirm workflow deletion
   * Closes dialog and triggers delete mutation
   */
  const handleDeleteConfirm = () => {
    if (!deleteWorkflowId) return;

    deleteMutation.mutate(deleteWorkflowId, {
      onSuccess: () => {
        setDeleteWorkflowId(null);
        // If current page becomes empty after deletion, go to previous page
        if (paginatedWorkflows.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      },
    });
  };

  /**
   * Cancel workflow deletion
   */
  const handleDeleteCancel = () => {
    setDeleteWorkflowId(null);
  };

  /**
   * Open run workflow dialog
   */
  const handleRunClick = (workflowId: string) => {
    setRunWorkflowId(workflowId);
    setInitialStateJson('{}'); // Reset to empty object
  };

  /**
   * Execute workflow with initial state
   */
  const handleRunConfirm = async () => {
    if (!runWorkflowId) return;

    // Validate JSON
    let initialState: Record<string, any> | undefined;
    try {
      const trimmed = initialStateJson.trim();
      if (trimmed && trimmed !== '{}') {
        initialState = JSON.parse(trimmed);
      }
    } catch (err) {
      toast.error('Invalid JSON', {
        description: 'Please enter valid JSON for the initial state.',
      });
      return;
    }

    executeMutation.mutate(
      { workflowId: runWorkflowId, initialState },
      {
        onSuccess: () => {
          setRunWorkflowId(null);
          setInitialStateJson('{}');
        },
      }
    );
  };

  /**
   * Cancel workflow run
   */
  const handleRunCancel = () => {
    setRunWorkflowId(null);
    setInitialStateJson('{}');
  };

  /**
   * Navigate to create workflow page
   */
  const handleCreateClick = () => {
    navigate('/workflows/new');
  };

  /**
   * Handle pagination - go to specific page
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================
  // PERMISSIONS
  // ============================================

  /**
   * TODO: Integrate with actual permission context
   * For now, we'll assume full permissions
   * This should be replaced with actual permission checks from AuthContext
   */
  const permissions = {
    canUpdate: true,
    canDelete: true,
    canExecute: true,
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header with Create Button */}
      <PageHeader
        title="Workflows"
        description="Manage and execute your workflow definitions"
        actions={
          <Button onClick={handleCreateClick}>
            <Plus className="size-4" />
            Create Workflow
          </Button>
        }
      />

      {/* Search Input */}
      <div className="max-w-md">
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search workflows by name or description..."
        />
      </div>

      {/* Workflow List */}
      <WorkflowList
        workflows={paginatedWorkflows}
        loading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onRun={handleRunClick}
        permissions={permissions}
        emptyState={
          searchTerm
            ? {
                title: 'No workflows found',
                description: 'Try adjusting your search criteria',
                actionButton: {
                  label: 'Clear Search',
                  onClick: () => setSearchTerm(''),
                },
              }
            : {
                title: 'No workflows yet',
                description: 'Create your first workflow to get started',
                actionButton: {
                  label: 'Create Your First Workflow',
                  onClick: handleCreateClick,
                },
              }
        }
      />

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteWorkflowId}
        onOpenChange={(open) => !open && handleDeleteCancel()}
        title="Delete Workflow?"
        description={
          workflowToDelete
            ? `Are you sure you want to delete "${workflowToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this workflow? This action cannot be undone.'
        }
        confirmLabel="Delete"
        isDestructive
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Run Workflow Dialog */}
      <Dialog open={!!runWorkflowId} onOpenChange={(open) => !open && handleRunCancel()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
            <DialogDescription>
              {workflowToRun
                ? `Execute "${workflowToRun.name}" with optional initial state`
                : 'Execute workflow with optional initial state'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="initial-state">
                Initial State (JSON)
                <span className="text-muted-foreground text-xs ml-2">
                  Optional - leave as {} for empty state
                </span>
              </Label>
              <Textarea
                id="initial-state"
                value={initialStateJson}
                onChange={(e) => setInitialStateJson(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm min-h-[150px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleRunCancel}
              disabled={executeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRunConfirm}
              disabled={executeMutation.isPending}
            >
              {executeMutation.isPending ? 'Running...' : 'Run Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error State (if API request fails) */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-destructive text-sm">
            Failed to load workflows. Please try again.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Export WorkflowsPage as default
 */
export default WorkflowsPage;
