/**
 * WorkflowDetailPage Component
 *
 * Comprehensive workflow detail page displaying metadata, definition, execution panel,
 * execution history, and associated automations.
 *
 * Features:
 * - Complete workflow metadata display (name, description, version, dates, status)
 * - Read-only Monaco editor for workflow definition viewing
 * - Workflow execution panel for manual execution with custom initial state
 * - Execution history table showing recent 20 executions
 * - Associated automations section (if workflow is used by automations)
 * - Action buttons: Edit, Duplicate, Delete with permission checks
 * - Breadcrumbs navigation (Workflows > {Workflow Name})
 * - Delete confirmation dialog
 * - Loading states and error handling
 * - Toast notifications for user feedback
 *
 * Requirements Coverage:
 * - Requirement 8: Workflow Detail View and Execution History
 * - Requirement 17: Permission-based Access Control
 * - Requirement 19: Error Handling and User Feedback
 *
 * @module pages/WorkflowDetailPage
 */

import React, { useState, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Edit,
  Copy,
  Trash2,
  AlertTriangle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  useWorkflow,
  useWorkflowExecutions,
  useWorkflowAutomations,
  useDeleteWorkflow,
  useDuplicateWorkflow,
} from '../hooks/api/useWorkflows';
import { AuthContext } from '../contexts/AuthContext';
import { Permission } from '../types/auth';
import { PageHeader } from '../components/shared/PageHeader';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { WorkflowDetailView } from '../components/workflows/WorkflowDetailView';
import { WorkflowExecutionPanel } from '../components/workflows/WorkflowExecutionPanel';
import { ExecutionList } from '../components/executions/ExecutionList';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import { toast } from 'sonner';

/**
 * WorkflowDetailPage Component
 *
 * Main page component for displaying complete workflow details including
 * execution history and associated automations.
 *
 * @component
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
 * ```
 *
 * Workflow:
 * 1. Loads workflow data from API
 * 2. Loads execution history (recent 20)
 * 3. Loads associated automations
 * 4. Displays all information in organized sections
 * 5. Provides actions: Edit, Duplicate, Delete
 * 6. Allows manual workflow execution
 */
export default function WorkflowDetailPage() {
  // ============================================
  // CONTEXT & NAVIGATION
  // ============================================

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  // ============================================
  // HOOKS & QUERIES
  // ============================================

  // Fetch workflow data
  const {
    data: workflow,
    isLoading: workflowLoading,
    error: workflowError,
    refetch: refetchWorkflow,
  } = useWorkflow(id);

  // Fetch execution history (recent 20)
  const {
    data: executions = [],
    isLoading: executionsLoading,
    refetch: refetchExecutions,
  } = useWorkflowExecutions(id!, 20);

  // Fetch associated automations
  const {
    data: automations = [],
    isLoading: automationsLoading,
  } = useWorkflowAutomations(id!);

  // ============================================
  // MUTATIONS
  // ============================================

  const deleteMutation = useDeleteWorkflow();
  const duplicateMutation = useDuplicateWorkflow();

  // ============================================
  // LOCAL STATE
  // ============================================

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ============================================
  // PERMISSIONS
  // ============================================

  const hasReadPermission = authContext?.hasPermission(Permission.WORKFLOW_READ) ?? false;
  const hasUpdatePermission = authContext?.hasPermission(Permission.WORKFLOW_UPDATE) ?? false;
  const hasDeletePermission = authContext?.hasPermission(Permission.WORKFLOW_DELETE) ?? false;

  // ============================================
  // ACTION HANDLERS
  // ============================================

  /**
   * Navigate to edit page
   */
  const handleEdit = () => {
    if (!id) return;
    navigate(`/workflows/${id}/edit`);
  };

  /**
   * Duplicate workflow with "Copy of" prefix
   */
  const handleDuplicate = async () => {
    if (!workflow) return;

    try {
      const duplicate = await duplicateMutation.mutateAsync({
        id: workflow.id,
        data: {
          name: `Copy of ${workflow.name}`,
        },
      });

      // Navigate to the new workflow
      navigate(`/workflows/${duplicate.id}`);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to duplicate workflow:', error);
    }
  };

  /**
   * Delete workflow with confirmation
   */
  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteMutation.mutateAsync(id);
      // Navigate back to workflows list after successful deletion
      navigate('/workflows');
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to delete workflow:', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  /**
   * Refresh execution history
   */
  const handleRefreshHistory = () => {
    refetchExecutions();
    toast.success('Execution history refreshed');
  };

  // ============================================
  // LOADING & ERROR STATES
  // ============================================

  // Show loading spinner while data is being fetched
  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" label="Loading workflow..." />
      </div>
    );
  }

  // Show 403 error if user doesn't have read permission
  if (!hasReadPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don't have permission to view this workflow
        </p>
        <Button onClick={() => navigate('/workflows')}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  // Show error state if workflow fetch failed
  if (workflowError) {
    const is404 = (workflowError as any)?.response?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">
          {is404 ? 'Workflow Not Found' : 'Error Loading Workflow'}
        </h1>
        <p className="text-muted-foreground max-w-md text-center">
          {is404
            ? 'The workflow you are looking for does not exist. It may have been deleted or the URL is incorrect.'
            : 'An error occurred while loading the workflow. Please try again.'}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/workflows')} variant="outline">
            Back to Workflows
          </Button>
          {!is404 && (
            <Button onClick={() => refetchWorkflow()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // If workflow is not found (shouldn't happen after error check, but TypeScript safety)
  if (!workflow) {
    return null;
  }

  // ============================================
  // ACTION BUTTONS
  // ============================================

  const actionButtons = (
    <div className="flex gap-2">
      {hasUpdatePermission && (
        <Button onClick={handleEdit} variant="default">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      )}
      <Button
        onClick={handleDuplicate}
        variant="outline"
        disabled={duplicateMutation.isPending}
      >
        {duplicateMutation.isPending ? (
          <LoadingSpinner size="sm" className="mr-2" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        Duplicate
      </Button>
      {hasDeletePermission && (
        <Button
          onClick={() => setShowDeleteDialog(true)}
          variant="destructive"
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
    </div>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/workflows">Workflows</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{workflow.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <PageHeader
        title={workflow.name}
        description={workflow.description}
        actions={actionButtons}
      />

      {/* Warning banner if workflow is used by active automations */}
      {automations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: This workflow is used by automations</AlertTitle>
          <AlertDescription>
            This workflow is used by {automations.length} automation(s). Changes may affect scheduled executions.
          </AlertDescription>
        </Alert>
      )}

      {/* Workflow Detail View */}
      <WorkflowDetailView workflow={workflow} />

      {/* Workflow Execution Panel */}
      <WorkflowExecutionPanel workflowDefinition={workflow.definition} />

      {/* Execution History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                Recent {executions.length} execution{executions.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button
              onClick={handleRefreshHistory}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {executionsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" label="Loading executions..." />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No executions yet. Run this workflow to see execution history.</p>
            </div>
          ) : (
            <ExecutionList
              executions={executions}
              loading={executionsLoading}
              compact
            />
          )}
        </CardContent>
      </Card>

      {/* Associated Automations */}
      {automations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Associated Automations</CardTitle>
            <CardDescription>
              Automations using this workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {automations.map((automation: any) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{automation.name}</h4>
                      <Badge variant={automation.enabled ? 'default' : 'secondary'}>
                        {automation.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    {automation.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {automation.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link to={`/automations/${automation.id}`}>
                      View <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
