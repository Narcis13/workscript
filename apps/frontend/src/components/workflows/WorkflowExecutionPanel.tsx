/**
 * WorkflowExecutionPanel Component
 *
 * Provides an interface for manually executing workflows with custom initial state.
 * Displays execution results including status, duration, final state, and errors.
 *
 * Features:
 * - Monaco editor for initial state JSON input (optional)
 * - Run Workflow button with loading state
 * - Collapsible execution results panel
 * - Real-time execution updates via WebSocket (future enhancement)
 * - JSON validation with error markers
 * - Permission-based access control
 * - Clear results functionality
 * - View Full Execution link
 *
 * Requirements Coverage:
 * - Requirement 7: Workflow Execution and Testing
 * - Requirement 17: Permission-based Access Control and UI Restrictions
 * - Requirement 19: Error Handling and User Feedback
 * - Requirement 20: Monaco Editor Integration
 *
 * @module components/workflows/WorkflowExecutionPanel
 */

import React, { useState, useCallback } from 'react';
import { Play, RotateCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ExecutionResultsPanel } from './ExecutionResultsPanel';
import { useExecuteWorkflow } from '../../hooks/api/useWorkflows';
import { useAuth } from '../../hooks/useAuth';
import type { WorkflowDefinition } from '@workscript/engine';
import type { ExecutionResult } from '@workscript/engine';

/**
 * Props for WorkflowExecutionPanel component
 */
export interface WorkflowExecutionPanelProps {
  /**
   * Workflow definition to execute
   */
  workflowDefinition: WorkflowDefinition;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional initial state to pre-populate the editor
   */
  defaultInitialState?: Record<string, any>;
}

/**
 * WorkflowExecutionPanel Component
 *
 * Allows users to manually execute workflows with custom initial state
 * and displays execution results.
 *
 * @component
 * @example
 * ```tsx
 * <WorkflowExecutionPanel
 *   workflowDefinition={workflow.definition}
 *   defaultInitialState={{ userId: "123", action: "test" }}
 * />
 * ```
 */
export function WorkflowExecutionPanel({
  workflowDefinition,
  className,
  defaultInitialState = {},
}: WorkflowExecutionPanelProps) {
  // ============================================
  // HOOKS
  // ============================================

  const { theme } = useTheme();
  const { user } = useAuth();
  const executeMutation = useExecuteWorkflow();

  // ============================================
  // STATE
  // ============================================

  /**
   * Initial state JSON string for the Monaco editor
   */
  const [initialStateJson, setInitialStateJson] = useState<string>(
    JSON.stringify(defaultInitialState, null, 2)
  );

  /**
   * Whether the initial state JSON is valid
   */
  const [isJsonValid, setIsJsonValid] = useState<boolean>(true);

  /**
   * JSON parse error message (if any)
   */
  const [jsonError, setJsonError] = useState<string | null>(null);

  /**
   * Execution result (null if not yet executed)
   */
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  /**
   * Whether to show the results panel
   */
  const [showResults, setShowResults] = useState<boolean>(false);

  // ============================================
  // PERMISSION CHECK
  // ============================================

  /**
   * Check if user has WORKFLOW_EXECUTE permission
   * For now, we check if user exists (logged in).
   * In production, this should check user.permissions.includes('WORKFLOW_EXECUTE')
   */
  const hasExecutePermission = user !== null;
  // TODO: Replace with actual permission check when permission system is implemented
  // const hasExecutePermission = user?.permissions?.includes('WORKFLOW_EXECUTE') ?? false;

  // ============================================
  // MONACO EDITOR HANDLERS
  // ============================================

  /**
   * Handle editor content change
   * Validates JSON and updates state
   */
  const handleEditorChange = useCallback((value: string | undefined) => {
    const newValue = value || '{}';
    setInitialStateJson(newValue);

    // Validate JSON
    try {
      JSON.parse(newValue);
      setIsJsonValid(true);
      setJsonError(null);
    } catch (error) {
      setIsJsonValid(false);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }, []);

  /**
   * Configure Monaco editor on mount
   */
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    // Configure JSON validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemaValidation: 'error',
      allowComments: false,
    });

    // Set editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      lineHeight: 20,
      padding: { top: 8, bottom: 8 },
    });
  }, []);

  // ============================================
  // EXECUTION HANDLERS
  // ============================================

  /**
   * Handle workflow execution
   * Parses initial state and executes workflow
   */
  const handleRunWorkflow = useCallback(async () => {
    if (!isJsonValid) {
      return;
    }

    try {
      // Parse initial state
      const initialState = JSON.parse(initialStateJson);

      // Execute workflow
      const result = await executeMutation.mutateAsync({
        definition: workflowDefinition,
        initialState,
      });

      // Store result and show results panel
      setExecutionResult(result);
      setShowResults(true);
    } catch (error) {
      console.error('Execution failed:', error);
      // Error is already handled by the mutation hook (toast notification)
    }
  }, [isJsonValid, initialStateJson, workflowDefinition, executeMutation]);

  /**
   * Clear execution results
   */
  const handleClearResults = useCallback(() => {
    setExecutionResult(null);
    setShowResults(false);
    setInitialStateJson(JSON.stringify(defaultInitialState, null, 2));
    setIsJsonValid(true);
    setJsonError(null);
  }, [defaultInitialState]);

  // ============================================
  // RENDER
  // ============================================

  // If user lacks permission, show permission denial message
  if (!hasExecutePermission) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Execute Workflow</CardTitle>
          <CardDescription>Run this workflow with custom initial state</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permission Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to execute workflows. Please contact your administrator to
              request access.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Execution Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execute Workflow</CardTitle>
          <CardDescription>
            Run this workflow with custom initial state (optional). Leave empty for default state.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Initial State Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Initial State (JSON)</label>
            <div
              className={cn(
                'border rounded-lg overflow-hidden',
                !isJsonValid && 'border-destructive'
              )}
            >
              <Editor
                height="200px"
                defaultLanguage="json"
                value={initialStateJson}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  readOnly: false,
                  lineNumbers: 'on',
                  minimap: { enabled: false },
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                  },
                  wordWrap: 'on',
                  tabSize: 2,
                  insertSpaces: true,
                  automaticLayout: true,
                }}
              />
            </div>

            {/* JSON Error Message */}
            {!isJsonValid && jsonError && (
              <p className="text-sm text-destructive">
                <AlertCircle className="inline size-3.5 mr-1" />
                {jsonError}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunWorkflow}
              disabled={!isJsonValid || executeMutation.isPending}
              className="gap-2"
            >
              {executeMutation.isPending ? (
                <>
                  <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Run Workflow
                </>
              )}
            </Button>

            {showResults && (
              <Button
                variant="outline"
                onClick={handleClearResults}
                disabled={executeMutation.isPending}
                className="gap-2"
              >
                <RotateCcw className="size-4" />
                Clear Results
              </Button>
            )}
          </div>

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground">
            Tip: The workflow will execute immediately with the provided initial state. Any validation
            errors will be shown in the results panel below.
          </p>
        </CardContent>
      </Card>

      {/* Execution Results Panel */}
      {showResults && executionResult && (
        <ExecutionResultsPanel result={executionResult} />
      )}
    </div>
  );
}

/**
 * Export component as default
 */
export default WorkflowExecutionPanel;
