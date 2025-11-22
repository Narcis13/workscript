/**
 * WorkflowCreatePage - Create New Workflow
 *
 * Provides a comprehensive interface for creating new workflow definitions with:
 * - Workflow metadata form (name, description, version)
 * - Monaco JSON editor for workflow definition
 * - Real-time validation with detailed error messages
 * - Test execution with initial state input
 * - Save and navigation to created workflow
 *
 * Requirements Coverage:
 * - Requirement 5: Workflow Creation with Monaco Editor
 * - Requirement 7: Workflow Execution and Testing
 * - Requirement 17: Permission-based Access Control
 * - Requirement 19: Error Handling and User Feedback
 * - Requirement 20: Monaco Editor Integration
 *
 * @module pages/workflows/WorkflowCreatePage
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, TestTube2, CheckCircle2 } from 'lucide-react';
import type { WorkflowDefinition } from '@workscript/engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WorkflowEditor } from '@/components/workflows/WorkflowEditor';
import { WorkflowValidator } from '@/components/workflows/WorkflowValidator';
import { WorkflowExecutionPanel } from '@/components/workflows/WorkflowExecutionPanel';
import { useCreateWorkflow } from '@/hooks/api/useWorkflows';
import { toast } from 'sonner';

/**
 * Default workflow template for new workflows
 */
const DEFAULT_WORKFLOW_TEMPLATE: WorkflowDefinition = {
  id: 'new-workflow',
  name: 'New Workflow',
  version: '1.0.0',
  initialState: {},
  workflow: [
    {
      'log-1': {
        message: 'Hello from my new workflow!',
      },
    },
  ],
};

/**
 * WorkflowCreatePage Component
 *
 * Full-featured workflow creation page with form, editor, validation,
 * and test execution capabilities.
 *
 * Workflow:
 * 1. User fills in workflow metadata (name, description, version)
 * 2. User edits workflow JSON definition in Monaco editor
 * 3. User validates workflow definition
 * 4. User optionally tests workflow execution
 * 5. User saves workflow to database
 * 6. User is redirected to workflow detail page
 */
export default function WorkflowCreatePage() {
  // ============================================
  // HOOKS
  // ============================================

  const navigate = useNavigate();
  const createMutation = useCreateWorkflow();

  // ============================================
  // STATE
  // ============================================

  /**
   * Workflow metadata
   */
  const [workflowName, setWorkflowName] = useState<string>('');
  const [workflowDescription, setWorkflowDescription] = useState<string>('');
  const [workflowVersion, setWorkflowVersion] = useState<string>('1.0.0');

  /**
   * Workflow definition JSON as string (for Monaco editor)
   */
  const [workflowJson, setWorkflowJson] = useState<string>(
    JSON.stringify(DEFAULT_WORKFLOW_TEMPLATE, null, 2)
  );

  /**
   * Parsed workflow definition (null if JSON is invalid)
   */
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(
    DEFAULT_WORKFLOW_TEMPLATE
  );

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

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle workflow JSON changes from Monaco editor
   */
  const handleJsonChange = useCallback((value: string) => {
    setWorkflowJson(value);

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
    if (!workflowDefinition) {
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

      // Create workflow via API
      const createdWorkflow = await createMutation.mutateAsync({
        name: workflowName,
        description: workflowDescription,
        version: workflowVersion,
        definition: updatedDefinition,
        isActive: true,
      });

      // Navigate to the created workflow detail page
      navigate(`/workflows/${createdWorkflow.id}`);
    } catch (error) {
      // Error is already handled by the mutation hook with toast
      console.error('Failed to create workflow:', error);
    }
  }, [workflowDefinition, workflowName, workflowDescription, workflowVersion, createMutation, navigate]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    navigate('/workflows');
  }, [navigate]);

  // ============================================
  // RENDER
  // ============================================

  const canSave = workflowDefinition !== null && workflowName.trim().length >= 3;
  const canValidate = workflowDefinition !== null;

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
              Create Workflow
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-10">
            Define a new workflow with JSON configuration
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!canSave || createMutation.isPending}
          size="lg"
        >
          {createMutation.isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Workflow
            </>
          )}
        </Button>
      </div>

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
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Enter workflow name"
                  disabled={createMutation.isPending}
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
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Enter workflow description (optional)"
                  disabled={createMutation.isPending}
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
                  onChange={(e) => setWorkflowVersion(e.target.value)}
                  placeholder="1.0.0"
                  disabled={createMutation.isPending}
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

              {workflowName.trim().length > 0 && workflowName.trim().length < 3 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Name too short
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
