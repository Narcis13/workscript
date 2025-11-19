/**
 * WorkflowEditPage Component
 *
 * Full-featured workflow editing page with Monaco editor, real-time validation,
 * dirty state tracking, diff viewer, and permission-based access control.
 *
 * Features:
 * - Pre-populated workflow metadata form (name, description, version)
 * - Monaco JSON editor for workflow definition with syntax highlighting
 * - Real-time workflow validation with error display
 * - Dirty indicator showing unsaved changes
 * - Save action with validation before update
 * - View Diff action to compare original vs current workflow
 * - Warning banner when workflow is used by active automations
 * - Cancel action with unsaved changes warning
 * - Permission check for WORKFLOW_UPDATE
 * - Loading states for all async operations
 * - Toast notifications for user feedback
 *
 * Requirements Coverage:
 * - Requirement 6: Workflow Editing with Version Control
 * - Requirement 17: Permission-based Access Control
 * - Requirement 19: Error Handling and User Feedback
 * - Requirement 20: Monaco Editor Integration
 *
 * @module pages/WorkflowEditPage
 */

import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { WorkflowDefinition } from '@workscript/engine';
import {
  useWorkflow,
  useUpdateWorkflow,
  useValidateWorkflow,
  useWorkflowAutomations,
} from '../hooks/api/useWorkflows';
import type {
  WorkflowFormData,
  ValidationResult,
} from '../types/workflow.types';
import { WorkflowForm } from '../components/workflows/WorkflowForm';
import { WorkflowEditor } from '../components/workflows/WorkflowEditor';
import { WorkflowValidator } from '../components/workflows/WorkflowValidator';
import { PageHeader } from '../components/shared/PageHeader';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { AuthContext } from '../contexts/AuthContext';
import { Permission } from '../types/auth';
import { toast } from 'sonner';
import {
  Save,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
  FileText,
  CircleDot
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import Editor from '@monaco-editor/react';

/**
 * WorkflowEditPage Component
 *
 * Main page component for editing existing workflows with comprehensive validation,
 * diff viewing capabilities, and permission checks.
 *
 * @component
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/workflows/:id/edit" element={<WorkflowEditPage />} />
 * ```
 *
 * Workflow:
 * 1. Loads existing workflow from API
 * 2. User edits workflow metadata and/or JSON definition
 * 3. Dirty indicator shows when changes are made
 * 4. User can click "View Diff" to see changes
 * 5. User clicks "Validate" to check workflow validity (optional)
 * 6. User clicks "Save" to update workflow (validates first)
 * 7. On success, redirects to workflow detail page
 */
export function WorkflowEditPage() {
  // ============================================
  // CONTEXT & NAVIGATION
  // ============================================

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  // Check authentication
  if (!authContext) {
    throw new Error('WorkflowEditPage must be used within AuthProvider');
  }

  const { user } = authContext;

  // ============================================
  // PERMISSION CHECK
  // ============================================

  /**
   * Check if user has WORKFLOW_UPDATE permission
   * If not, form will be read-only and save button disabled
   */
  const hasUpdatePermission = user?.permissions.includes(Permission.WORKFLOW_UPDATE) ?? false;

  // ============================================
  // DATA FETCHING
  // ============================================

  const {
    data: workflow,
    isLoading: workflowLoading,
    error: workflowError,
    refetch: refetchWorkflow,
  } = useWorkflow(id);

  const {
    data: automations,
    isLoading: automationsLoading,
  } = useWorkflowAutomations(id || '');

  // ============================================
  // STATE
  // ============================================

  /**
   * Workflow metadata form state
   * Controlled by WorkflowForm component
   */
  const [formData, setFormData] = useState<WorkflowFormData | null>(null);

  /**
   * Workflow JSON definition (Monaco editor content)
   */
  const [workflowJson, setWorkflowJson] = useState<string>('');

  /**
   * Original workflow JSON for diff comparison
   */
  const [originalWorkflowJson, setOriginalWorkflowJson] = useState<string>('');

  /**
   * Parsed workflow definition for validation
   * Null if JSON is invalid
   */
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(null);

  /**
   * Validation result state
   * Used to show validation errors
   */
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  /**
   * Dirty flag - tracks if user has made changes
   * Used for unsaved changes warning
   */
  const [isDirty, setIsDirty] = useState<boolean>(false);

  /**
   * Cancel confirmation dialog state
   */
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  /**
   * View Diff dialog state
   */
  const [showDiffDialog, setShowDiffDialog] = useState<boolean>(false);

  // ============================================
  // MUTATIONS
  // ============================================

  const updateMutation = useUpdateWorkflow();
  const validateMutation = useValidateWorkflow();

  // ============================================
  // INITIALIZE FORM DATA FROM WORKFLOW
  // ============================================

  /**
   * Populate form fields when workflow data loads
   * Sets both form data and original JSON for diff comparison
   */
  useEffect(() => {
    if (workflow) {
      // Set form data
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        version: workflow.version,
      });

      // Set workflow JSON
      const jsonString = JSON.stringify(workflow.definition, null, 2);
      setWorkflowJson(jsonString);
      setOriginalWorkflowJson(jsonString);
    }
  }, [workflow]);

  // ============================================
  // PARSE WORKFLOW JSON
  // ============================================

  /**
   * Parse workflow JSON and update workflowDefinition state
   * Automatically triggered when workflowJson changes
   */
  useEffect(() => {
    try {
      const parsed = JSON.parse(workflowJson);
      setWorkflowDefinition(parsed);
    } catch (error) {
      // Invalid JSON - set to null
      setWorkflowDefinition(null);
    }
  }, [workflowJson]);

  // ============================================
  // COMPUTE ACTIVE AUTOMATIONS
  // ============================================

  /**
   * Count active automations using this workflow
   * Used to show warning banner
   */
  const activeAutomationsCount = useMemo(() => {
    if (!automations) return 0;
    return automations.filter((a) => a.enabled).length;
  }, [automations]);

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle form submission from WorkflowForm
   * Updates form data state and marks as dirty
   */
  const handleFormSubmit = useCallback((data: WorkflowFormData) => {
    setFormData(data);
    setIsDirty(true);
  }, []);

  /**
   * Handle workflow JSON change from Monaco editor
   */
  const handleWorkflowJsonChange = useCallback((value: string) => {
    setWorkflowJson(value);
    setIsDirty(true);
  }, []);

  /**
   * Handle manual validation trigger
   * Validates workflow and displays results
   */
  const handleValidate = useCallback(async () => {
    if (!workflowDefinition) {
      toast.error('Invalid JSON', {
        description: 'Please fix JSON syntax errors before validating.',
      });
      return;
    }

    try {
      const result = await validateMutation.mutateAsync(workflowDefinition);
      setValidationResult(result);
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error('Validation error:', error);
    }
  }, [workflowDefinition, validateMutation]);

  /**
   * Handle workflow save
   * Validates workflow before updating
   */
  const handleSave = useCallback(async () => {
    // Check permissions
    if (!hasUpdatePermission) {
      toast.error('Insufficient permissions', {
        description: 'You do not have permission to update workflows.',
      });
      return;
    }

    // Ensure workflow ID exists
    if (!id) {
      toast.error('Missing workflow ID', {
        description: 'Cannot update workflow without an ID.',
      });
      return;
    }

    // Ensure form data is present
    if (!formData) {
      toast.error('Missing form data', {
        description: 'Please fill in the workflow name, description, and version.',
      });
      return;
    }

    // Ensure workflow JSON is valid
    if (!workflowDefinition) {
      toast.error('Invalid workflow JSON', {
        description: 'Please fix JSON syntax errors before saving.',
      });
      return;
    }

    // Validate workflow before saving
    try {
      const validationResult = await validateMutation.mutateAsync(workflowDefinition);
      setValidationResult(validationResult);

      if (!validationResult.valid) {
        toast.error('Validation failed', {
          description: 'Please fix validation errors before saving.',
        });
        return;
      }

      // Validation passed - update workflow
      await updateMutation.mutateAsync({
        id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          version: formData.version,
          definition: workflowDefinition,
          isActive: workflow?.isActive ?? true,
        },
      });

      // Clear dirty flag
      setIsDirty(false);

      // Update original JSON for future diffs
      setOriginalWorkflowJson(JSON.stringify(workflowDefinition, null, 2));

      // Navigate to workflow detail page
      navigate(`/workflows/${id}`);
    } catch (error) {
      // Error handling is done by mutation hooks
      console.error('Save error:', error);
    }
  }, [
    hasUpdatePermission,
    id,
    formData,
    workflowDefinition,
    workflow?.isActive,
    validateMutation,
    updateMutation,
    navigate,
  ]);

  /**
   * Handle cancel action
   * Shows confirmation if there are unsaved changes
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      navigate(`/workflows/${id}`);
    }
  }, [isDirty, navigate, id]);

  /**
   * Confirm cancel and navigate away
   */
  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    navigate(`/workflows/${id}`);
  }, [navigate, id]);

  /**
   * Handle Monaco editor save shortcut (Cmd/Ctrl+S)
   */
  const handleEditorSave = useCallback(() => {
    handleSave();
  }, [handleSave]);

  /**
   * Handle View Diff action
   * Opens diff dialog showing original vs current workflow
   */
  const handleViewDiff = useCallback(() => {
    setShowDiffDialog(true);
  }, []);

  // ============================================
  // LOADING & ERROR STATES
  // ============================================

  if (workflowLoading) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" label="Loading workflow..." />
      </div>
    );
  }

  if (workflowError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error loading workflow</AlertTitle>
          <AlertDescription>
            {(workflowError as any)?.response?.data?.message ||
              (workflowError as any)?.message ||
              'An unexpected error occurred.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => refetchWorkflow()} variant="outline">
            Retry
          </Button>
          <Button onClick={() => navigate('/workflows')} variant="ghost" className="ml-2">
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Workflow not found</AlertTitle>
          <AlertDescription>
            The workflow you're looking for doesn't exist or has been deleted.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/workflows')} variant="outline">
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title={`Edit Workflow: ${workflow.name}`}
        description="Modify workflow configuration and definition with real-time validation"
        actions={
          <div className="flex gap-2">
            {isDirty && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-md text-sm">
                <CircleDot className="size-4 animate-pulse" />
                <span className="font-medium">Unsaved changes</span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        }
      />

      {/* Permission Warning */}
      {!hasUpdatePermission && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Insufficient Permissions</AlertTitle>
          <AlertDescription>
            You do not have permission to update workflows. All fields are read-only.
            Please contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Automations Warning */}
      {activeAutomationsCount > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Warning: Workflow in Use</AlertTitle>
          <AlertDescription>
            This workflow is used by {activeAutomationsCount} active automation{activeAutomationsCount > 1 ? 's' : ''}.
            Changes may affect scheduled executions. Please review carefully before saving.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content - Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Metadata Form */}
        <div className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Workflow Metadata</h2>
            <WorkflowForm
              initialData={formData || undefined}
              onSubmit={handleFormSubmit}
              loading={updateMutation.isPending}
              readOnly={!hasUpdatePermission}
            />
          </div>

          {/* Validation Section */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Validation</h2>
            <WorkflowValidator
              workflowDefinition={workflowDefinition}
              onValidate={(result) => setValidationResult(result)}
              showButton={true}
              autoValidate={false}
            />
          </div>
        </div>

        {/* Right Column - Workflow Editor */}
        <div className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Workflow Definition</h2>
            <WorkflowEditor
              value={workflowJson}
              onChange={handleWorkflowJsonChange}
              onSave={handleEditorSave}
              onValidate={handleValidate}
              readOnly={!hasUpdatePermission}
              height="600px"
              showMinimap={true}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="flex flex-wrap gap-3 justify-end items-center border-t pt-6">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleValidate}
          disabled={!workflowDefinition || validateMutation.isPending || !hasUpdatePermission}
        >
          {validateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {!validateMutation.isPending && <CheckCircle2 className="size-4" />}
          Validate
        </Button>

        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleViewDiff}
          disabled={!isDirty}
        >
          <FileText className="size-4" />
          View Diff
        </Button>

        <Button
          type="button"
          size="default"
          onClick={handleSave}
          disabled={!hasUpdatePermission || updateMutation.isPending || !formData || !workflowDefinition || !isDirty}
        >
          {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {!updateMutation.isPending && <Save className="size-4" />}
          Save Changes
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave? All changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        isDestructive={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* View Diff Dialog */}
      <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Changes</DialogTitle>
            <DialogDescription>
              Compare the original workflow definition (left) with your current changes (right).
              Green highlights indicate additions, red highlights indicate deletions.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="600px"
                language="json"
                theme="vs-dark"
                original={originalWorkflowJson}
                modified={workflowJson}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  enableSplitViewResizing: true,
                  originalEditable: false,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  folding: true,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDiffDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Export WorkflowEditPage as default
 */
export default WorkflowEditPage;
