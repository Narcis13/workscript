/**
 * WorkflowEditPage - Edit Existing Workflow
 *
 * Provides interface for editing workflow definitions with version tracking
 * and validation. Shows warnings if workflow is used by active automations.
 * Part of Phase 3: Workflow Management (Req 6)
 *
 * @module pages/workflows/WorkflowEditPage
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, TestTube2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { WorkflowDefinition } from '@workscript/engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WorkflowEditor } from '@/components/workflows/WorkflowEditor';
import { WorkflowValidator } from '@/components/workflows/WorkflowValidator';
import { WorkflowExecutionPanel } from '@/components/workflows/WorkflowExecutionPanel';
import { useWorkflow, useUpdateWorkflow, useWorkflowAutomations } from '@/hooks/api/useWorkflows';
import { toast } from 'sonner';

/**
 * WorkflowEditPage Component
 *
 * Full-featured workflow editing page with form, editor, validation,
 * and test execution capabilities.
 *
 * Features:
 * - Fetches existing workflow data
 * - Pre-populates form and editor
 * - Shows warnings for workflows with automations
 * - Dirty state tracking
 * - Version increment suggestions
 * - Save updates to database
 *
 * Workflow:
 * 1. User loads existing workflow
 * 2. User modifies workflow metadata and/or definition
 * 3. User validates workflow definition
 * 4. User optionally tests workflow execution
 * 5. User saves updated workflow to database
 * 6. User is redirected to workflow detail page
 */
export default function WorkflowEditPage() {
  // ============================================
  // HOOKS
  // ============================================

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workflow, isLoading, error } = useWorkflow(id);
  const { data: automations } = useWorkflowAutomations(id || '');
  const updateMutation = useUpdateWorkflow();

  // ============================================
  // STATE
  // ============================================

  /**
   * Workflow metadata
   */
  const [workflowName, setWorkflowName] = useState<string>('');
  const [workflowDescription, setWorkflowDescription] = useState<string>('');
  const [workflowVersion, setWorkflowVersion] = useState<string>('');

  /**
   * Workflow definition JSON as string (for Monaco editor)
   */
  const [workflowJson, setWorkflowJson] = useState<string>('');

  /**
   * Parsed workflow definition (null if JSON is invalid)
   */
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(null);

  /**
   * JSON parse error (if any)
   */
  const [jsonError, setJsonError] = useState<string | null>(null);

  /**
   * Whether the workflow has been validated successfully
   */
  const [isValidated, setIsValidated] = useState<boolean>(false);

  /**
   * Active tab (edit, validate, or test)
   */
  const [activeTab, setActiveTab] = useState<string>('edit');

  /**
   * Track if the form has unsaved changes
   */
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Initialize form when workflow data is loaded
   */
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      setWorkflowVersion(workflow.version);

      const jsonString = JSON.stringify(workflow.definition, null, 2);
      setWorkflowJson(jsonString);
      setWorkflowDefinition(workflow.definition);
      setJsonError(null);
      setIsDirty(false);
    }
  }, [workflow]);

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle workflow JSON changes from Monaco editor
   */
  const handleJsonChange = useCallback((value: string) => {
    setWorkflowJson(value);
    setIsDirty(true);

    // Try to parse JSON
    try {
      const parsed = JSON.parse(value);
      setWorkflowDefinition(parsed);
      setJsonError(null);
      setIsValidated(false); // Reset validation when definition changes
    } catch (error) {
      setWorkflowDefinition(null);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }, []);

  /**
   * Handle validation completion
   */
  const handleValidate = useCallback((result: any) => {
    setIsValidated(result.valid);
    if (result.valid) {
      toast.success('Validation passed', {
        description: 'Your workflow is ready to be saved or tested.',
      });
    }
  }, []);

  /**
   * Handle save workflow
   */
  const handleSave = useCallback(async () => {
    if (!id || !workflowDefinition) {
      toast.error('Cannot save workflow', {
        description: 'Please fix JSON errors before saving.',
      });
      return;
    }

    if (!workflowName.trim()) {
      toast.error('Cannot save workflow', {
        description: 'Please enter a workflow name.',
      });
      return;
    }

    if (workflowName.trim().length < 3) {
      toast.error('Cannot save workflow', {
        description: 'Workflow name must be at least 3 characters long.',
      });
      return;
    }

    try {
      // Update the workflow definition with form metadata
      const updatedDefinition: WorkflowDefinition = {
        ...workflowDefinition,
        id: workflowName.toLowerCase().replace(/\s+/g, '-'),
        name: workflowName,
        version: workflowVersion,
      };

      // Update workflow via API
      await updateMutation.mutateAsync({
        id,
        data: {
          name: workflowName,
          description: workflowDescription,
          version: workflowVersion,
          definition: updatedDefinition,
        },
      });

      setIsDirty(false);

      // Navigate back to the workflow detail page
      navigate(`/workflows/${id}`);
    } catch (error) {
      // Error is already handled by the mutation hook with toast
      console.error('Failed to update workflow:', error);
    }
  }, [id, workflowDefinition, workflowName, workflowDescription, workflowVersion, updateMutation, navigate]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    navigate(`/workflows/${id}`);
  }, [navigate, id, isDirty]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const canSave = workflowDefinition !== null && workflowName.trim().length >= 3 && isDirty;
  const canValidate = workflowDefinition !== null;
  const hasActiveAutomations = automations && automations.length > 0;

  // ============================================
  // LOADING & ERROR STATES
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Workflow</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || 'Failed to load workflow. Please try again.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Workflows
        </Button>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Workflow Not Found</AlertTitle>
          <AlertDescription>
            The requested workflow could not be found.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Workflows
        </Button>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Edit Workflow
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-10">
            Modify workflow definition and configuration
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!canSave || updateMutation.isPending}
          size="lg"
        >
          {updateMutation.isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Automation Warning */}
      {hasActiveAutomations && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: Active Automations</AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            This workflow is used by {automations.length} active automation(s). Changes may affect scheduled executions.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Metadata Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Workflow Metadata</CardTitle>
            <CardDescription>
              Basic information about your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="workflow-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => {
                    setWorkflowName(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Enter workflow name"
                  disabled={updateMutation.isPending}
                  required
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  A descriptive name for your workflow (min 3 characters)
                </p>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => {
                    setWorkflowDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Enter workflow description (optional)"
                  disabled={updateMutation.isPending}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Optional description of what this workflow does
                </p>
              </div>

              {/* Version Field */}
              <div className="space-y-2">
                <Label htmlFor="workflow-version">
                  Version <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workflow-version"
                  value={workflowVersion}
                  onChange={(e) => {
                    setWorkflowVersion(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="1.0.0"
                  disabled={updateMutation.isPending}
                  required
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Semantic version (e.g., 1.0.0, 2.1.3)
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="mt-6 space-y-2 border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                {jsonError ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-red-600 dark:text-red-400">JSON Error</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-green-600 dark:text-green-400">Valid JSON</span>
                  </>
                )}
              </div>

              {isValidated && !jsonError && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">
                    Workflow validated
                  </span>
                </div>
              )}

              {isDirty && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Unsaved changes
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Editor, Validation, and Testing */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workflow Definition</CardTitle>
            <CardDescription>
              Edit, validate, and test your workflow JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="validate" disabled={!canValidate}>
                  Validate
                </TabsTrigger>
                <TabsTrigger value="test" disabled={!canValidate}>
                  Test
                </TabsTrigger>
              </TabsList>

              {/* Edit Tab */}
              <TabsContent value="edit" className="space-y-4">
                <WorkflowEditor
                  value={workflowJson}
                  onChange={handleJsonChange}
                  onSave={handleSave}
                  height="600px"
                  showMinimap={true}
                />

                {/* JSON Error Display */}
                {jsonError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <svg
                          className="h-5 w-5 text-red-600 dark:text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200">
                          JSON Parse Error
                        </h3>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                          {jsonError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('validate')}
                    disabled={!canValidate}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Validate Workflow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('test')}
                    disabled={!canValidate}
                  >
                    <TestTube2 className="h-4 w-4" />
                    Test Execution
                  </Button>
                </div>
              </TabsContent>

              {/* Validate Tab */}
              <TabsContent value="validate" className="space-y-4">
                <WorkflowValidator
                  workflowDefinition={workflowDefinition}
                  onValidate={handleValidate}
                  showButton={true}
                  autoValidate={false}
                />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('edit')}>
                    Back to Editor
                  </Button>
                  {isValidated && (
                    <Button onClick={() => setActiveTab('test')}>
                      <TestTube2 className="h-4 w-4" />
                      Test Execution
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Test Tab */}
              <TabsContent value="test" className="space-y-4">
                {workflowDefinition && (
                  <WorkflowExecutionPanel
                    workflowDefinition={workflowDefinition}
                    defaultInitialState={workflowDefinition.initialState || {}}
                  />
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('edit')}>
                    Back to Editor
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('validate')}>
                    Validate Again
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
