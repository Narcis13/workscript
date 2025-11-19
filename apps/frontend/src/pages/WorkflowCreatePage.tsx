/**
 * WorkflowCreatePage Component
 *
 * Full-featured workflow creation page with Monaco editor, real-time validation,
 * and permission-based access control.
 *
 * Features:
 * - Workflow metadata form (name, description, version)
 * - Monaco JSON editor for workflow definition with syntax highlighting
 * - Real-time workflow validation with error display
 * - Save action with validation before creation
 * - Validate action for manual validation trigger
 * - Test Run action for immediate workflow execution (Task 3.5.2)
 * - Cancel action with unsaved changes warning
 * - Permission check for WORKFLOW_CREATE
 * - Loading states for all async operations
 * - Toast notifications for user feedback
 * - Navigation to workflow detail page on success
 *
 * Requirements Coverage:
 * - Requirement 5: Workflow Creation with Monaco Editor
 * - Requirement 7: Workflow Execution and Testing (Test Run)
 * - Requirement 17: Permission-based Access Control
 * - Requirement 19: Error Handling and User Feedback
 * - Requirement 20: Monaco Editor Integration
 *
 * @module pages/WorkflowCreatePage
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkflowDefinition } from '@workscript/engine';
import {
  useCreateWorkflow,
  useValidateWorkflow,
  useExecuteWorkflow,
} from '../hooks/api/useWorkflows';
import type {
  WorkflowFormData,
  ValidationResult,
} from '../types/workflow.types';
import { WorkflowForm } from '../components/workflows/WorkflowForm';
import { WorkflowEditor } from '../components/workflows/WorkflowEditor';
import { WorkflowValidator } from '../components/workflows/WorkflowValidator';
import { ExecutionResultsPanel } from '../components/workflows/ExecutionResultsPanel';
import { PageHeader } from '../components/shared/PageHeader';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { AuthContext } from '../contexts/AuthContext';
import { Permission } from '../types/auth';
import { toast } from 'sonner';
import { Save, CheckCircle2, Play, X, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import type { ExecutionResult } from '@workscript/engine';

/**
 * Default workflow JSON template
 * Provides a starting point for new workflows
 */
const DEFAULT_WORKFLOW_JSON = JSON.stringify(
  {
    id: 'new-workflow',
    name: 'New Workflow',
    version: '1.0.0',
    initialState: {},
    workflow: [
      {
        'log-start': {
          message: 'Workflow started',
          'success?': 'end',
        },
      },
      {
        'log-end': {
          message: 'Workflow completed',
        },
      },
    ],
  },
  null,
  2
);

/**
 * WorkflowCreatePage Component
 *
 * Main page component for creating new workflows with comprehensive validation,
 * testing capabilities, and permission checks.
 *
 * @component
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/workflows/new" element={<WorkflowCreatePage />} />
 * ```
 *
 * Workflow:
 * 1. User enters workflow metadata (name, description, version)
 * 2. User edits workflow JSON in Monaco editor
 * 3. User clicks "Validate" to check workflow validity
 * 4. User clicks "Test Run" to execute workflow immediately (optional)
 * 5. User clicks "Save" to create workflow (validates first)
 * 6. On success, redirects to workflow detail page
 */
export function WorkflowCreatePage() {
  // ============================================
  // CONTEXT & NAVIGATION
  // ============================================

  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  // Check authentication
  if (!authContext) {
    throw new Error('WorkflowCreatePage must be used within AuthProvider');
  }

  const { user } = authContext;

  // ============================================
  // PERMISSION CHECK
  // ============================================

  /**
   * Check if user has WORKFLOW_CREATE permission
   * If not, save button will be disabled
   */
  const hasCreatePermission = user?.permissions.includes(Permission.WORKFLOW_CREATE) ?? false;

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
  const [workflowJson, setWorkflowJson] = useState<string>(DEFAULT_WORKFLOW_JSON);

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
   * Test Run dialog state
   */
  const [showTestRunDialog, setShowTestRunDialog] = useState<boolean>(false);

  /**
   * Test Run initial state JSON
   */
  const [testRunInitialState, setTestRunInitialState] = useState<string>('{}');

  /**
   * Test Run execution result
   * Stores the result after workflow execution completes
   */
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // ============================================
  // MUTATIONS
  // ============================================

  const createMutation = useCreateWorkflow();
  const validateMutation = useValidateWorkflow();
  const executeMutation = useExecuteWorkflow();

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
  // HANDLERS
  // ============================================

  /**
   * Handle form submission from WorkflowForm
   * Updates form data state
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
   * Validates workflow before creating
   */
  const handleSave = useCallback(async () => {
    // Check permissions
    if (!hasCreatePermission) {
      toast.error('Insufficient permissions', {
        description: 'You do not have permission to create workflows.',
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

      // Validation passed - create workflow
      const createdWorkflow = await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        version: formData.version,
        definition: workflowDefinition,
        isActive: true, // New workflows are active by default
      });

      // Clear dirty flag
      setIsDirty(false);

      // Navigate to workflow detail page
      navigate(`/workflows/${createdWorkflow.id}`);
    } catch (error) {
      // Error handling is done by mutation hooks
      console.error('Save error:', error);
    }
  }, [
    hasCreatePermission,
    formData,
    workflowDefinition,
    validateMutation,
    createMutation,
    navigate,
  ]);

  /**
   * Handle Test Run action
   * Opens dialog for initial state input and executes workflow
   */
  const handleTestRun = useCallback(() => {
    if (!workflowDefinition) {
      toast.error('Invalid workflow JSON', {
        description: 'Please fix JSON syntax errors before running.',
      });
      return;
    }

    // Reset execution result from previous runs
    setExecutionResult(null);
    setShowTestRunDialog(true);
  }, [workflowDefinition]);

  /**
   * Execute workflow with test initial state
   */
  const handleExecuteTest = useCallback(async () => {
    if (!workflowDefinition) {
      return;
    }

    let initialState: Record<string, any> | undefined;

    // Parse initial state JSON
    try {
      initialState = JSON.parse(testRunInitialState);
    } catch (error) {
      toast.error('Invalid initial state JSON', {
        description: 'Please fix JSON syntax errors in the initial state.',
      });
      return;
    }

    try {
      const result = await executeMutation.mutateAsync({
        definition: workflowDefinition,
        initialState,
      });

      // Store execution result to display in dialog
      setExecutionResult(result);
    } catch (error) {
      // Error handling is done by mutation hook
      console.error('Test run error:', error);
    }
  }, [workflowDefinition, testRunInitialState, executeMutation]);

  /**
   * Handle cancel action
   * Shows confirmation if there are unsaved changes
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      navigate('/workflows');
    }
  }, [isDirty, navigate]);

  /**
   * Confirm cancel and navigate away
   */
  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    navigate('/workflows');
  }, [navigate]);

  /**
   * Handle Monaco editor save shortcut (Cmd/Ctrl+S)
   */
  const handleEditorSave = useCallback(() => {
    handleSave();
  }, [handleSave]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title="Create Workflow"
        description="Define a new workflow with JSON-based configuration and real-time validation"
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={createMutation.isPending}
            >
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        }
      />

      {/* Permission Warning */}
      {!hasCreatePermission && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Insufficient Permissions</AlertTitle>
          <AlertDescription>
            You do not have permission to create workflows. The save button will be disabled.
            Please contact your administrator if you believe this is an error.
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
              onSubmit={handleFormSubmit}
              loading={createMutation.isPending}
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
              readOnly={false}
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
          disabled={!workflowDefinition || validateMutation.isPending}
        >
          {validateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {!validateMutation.isPending && <CheckCircle2 className="size-4" />}
          Validate
        </Button>

        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleTestRun}
          disabled={!workflowDefinition || executeMutation.isPending}
        >
          {executeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {!executeMutation.isPending && <Play className="size-4" />}
          Test Run
        </Button>

        <Button
          type="button"
          size="default"
          onClick={handleSave}
          disabled={!hasCreatePermission || createMutation.isPending || !formData || !workflowDefinition}
        >
          {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {!createMutation.isPending && <Save className="size-4" />}
          Save Workflow
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

      {/* Test Run Dialog */}
      <Dialog open={showTestRunDialog} onOpenChange={setShowTestRunDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Run Workflow</DialogTitle>
            <DialogDescription>
              {!executionResult
                ? 'Enter an optional initial state as JSON to test the workflow execution. Leave empty for default empty state.'
                : 'Workflow execution results are displayed below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Initial State Editor - Only show if no result yet */}
            {!executionResult && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Initial State (JSON)
                </label>
                <WorkflowEditor
                  value={testRunInitialState}
                  onChange={setTestRunInitialState}
                  readOnly={false}
                  height="300px"
                  showMinimap={false}
                  placeholder='Enter initial state as JSON (e.g., {"key": "value"})'
                />
              </div>
            )}

            {/* Execution Results - Show after execution completes */}
            {executionResult && (
              <ExecutionResultsPanel result={executionResult} />
            )}
          </div>

          <DialogFooter>
            {!executionResult ? (
              // Before execution: Show Cancel and Run buttons
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTestRunDialog(false)}
                  disabled={executeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteTest}
                  disabled={executeMutation.isPending}
                >
                  {executeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  {!executeMutation.isPending && <Play className="size-4" />}
                  Run Workflow
                </Button>
              </>
            ) : (
              // After execution: Show Run Again and Close buttons
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setExecutionResult(null);
                    setTestRunInitialState('{}');
                  }}
                >
                  Run Again
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowTestRunDialog(false);
                    setExecutionResult(null);
                    setTestRunInitialState('{}');
                  }}
                >
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Export WorkflowCreatePage as default
 */
export default WorkflowCreatePage;
