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
 * - Real-time execution updates via WebSocket
 * - JSON validation with error markers
 * - Permission-based access control
 * - Clear results functionality
 * - View Full Execution link
 * - Live progress bar showing node execution progress
 * - Real-time node status updates
 * - Execution timeline with completed and failed nodes
 *
 * Real-time Monitoring:
 * - Listens for workflow:started, workflow:progress, workflow:completed, workflow:failed events
 * - Listens for node:started, node:completed, node:failed events matching current execution ID
 * - Updates progress bar as nodes complete
 * - Shows current executing node in real-time
 * - Updates status badge (pending → running → completed/failed)
 * - Displays execution timeline with node details
 *
 * Requirements Coverage:
 * - Requirement 7: Workflow Execution and Testing
 * - Requirement 13: Real-time Workflow Monitoring via WebSocket
 * - Requirement 17: Permission-based Access Control and UI Restrictions
 * - Requirement 19: Error Handling and User Feedback
 * - Requirement 20: Monaco Editor Integration
 *
 * @module components/workflows/WorkflowExecutionPanel
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Play, RotateCcw, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { ExecutionResultsPanel } from './ExecutionResultsPanel';
import { useExecuteWorkflow } from '../../hooks/api/useWorkflows';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/api/useWebSocket';
import type { WorkflowDefinition } from '@workscript/engine';
import type { ExecutionResult } from '@workscript/engine';
import type {
  WorkflowProgressEvent,
  WorkflowCompletedEvent,
  WorkflowFailedEvent,
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  isWorkflowProgressEvent,
  isWorkflowCompletedEvent,
  isWorkflowFailedEvent,
  isNodeStartedEvent,
  isNodeCompletedEvent,
  isNodeFailedEvent
} from '@/services/websocket/events.types';

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
  const { on, isConnected } = useWebSocket();

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

  /**
   * Current execution ID for tracking real-time updates
   */
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  /**
   * Real-time execution progress tracking
   */
  const [realtimeProgress, setRealtimeProgress] = useState<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    currentNode: string | null;
    completedNodes: string[];
    failedNodes: string[];
    totalNodes: number;
    percentage: number;
    startTime: Date | null;
    elapsedTime: number;
    error: string | null;
  }>({
    status: 'pending',
    currentNode: null,
    completedNodes: [],
    failedNodes: [],
    totalNodes: 0,
    percentage: 0,
    startTime: null,
    elapsedTime: 0,
    error: null,
  });

  /**
   * Node execution timeline for displaying execution details
   */
  const [nodeTimeline, setNodeTimeline] = useState<
    Array<{
      nodeId: string;
      nodeType?: string;
      status: 'pending' | 'executing' | 'completed' | 'failed';
      startTime: Date | null;
      endTime: Date | null;
      duration: number;
      error?: string;
    }>
  >([]);

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
   * Reset real-time progress state
   */
  const resetRealtimeProgress = useCallback(() => {
    setRealtimeProgress({
      status: 'pending',
      currentNode: null,
      completedNodes: [],
      failedNodes: [],
      totalNodes: 0,
      percentage: 0,
      startTime: null,
      elapsedTime: 0,
      error: null,
    });
    setNodeTimeline([]);
  }, []);

  /**
   * Handle workflow execution
   * Parses initial state and executes workflow
   * Sets up real-time progress tracking via WebSocket
   */
  const handleRunWorkflow = useCallback(async () => {
    if (!isJsonValid) {
      return;
    }

    try {
      // Reset real-time progress state before execution
      resetRealtimeProgress();

      // Parse initial state
      const initialState = JSON.parse(initialStateJson);

      // Execute workflow
      const result = await executeMutation.mutateAsync({
        definition: workflowDefinition,
        initialState,
      });

      // Set execution ID for WebSocket event filtering
      if (result.executionId) {
        setCurrentExecutionId(result.executionId);
      }

      // Store result and show results panel
      setExecutionResult(result);
      setShowResults(true);
    } catch (error) {
      console.error('Execution failed:', error);
      // Error is already handled by the mutation hook (toast notification)
    }
  }, [isJsonValid, initialStateJson, workflowDefinition, executeMutation, resetRealtimeProgress]);

  /**
   * Clear execution results
   */
  const handleClearResults = useCallback(() => {
    setExecutionResult(null);
    setShowResults(false);
    setInitialStateJson(JSON.stringify(defaultInitialState, null, 2));
    setIsJsonValid(true);
    setJsonError(null);
    setCurrentExecutionId(null);
    setRealtimeProgress({
      status: 'pending',
      currentNode: null,
      completedNodes: [],
      failedNodes: [],
      totalNodes: 0,
      percentage: 0,
      startTime: null,
      elapsedTime: 0,
      error: null,
    });
    setNodeTimeline([]);
  }, [defaultInitialState]);

  // ============================================
  // WEBSOCKET EVENT LISTENERS
  // ============================================

  /**
   * Set up WebSocket event listeners for real-time execution updates
   */
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    // Listen for workflow started events
    const unsubscribeWorkflowStarted = on('workflow:started', (event: any) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setRealtimeProgress((prev) => ({
          ...prev,
          status: 'running',
          startTime: event.timestamp || new Date(),
          totalNodes: event.data?.totalNodes || 0,
        }));
      }
    });

    // Listen for workflow progress events
    const unsubscribeWorkflowProgress = on('workflow:progress', (event: WorkflowProgressEvent) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setRealtimeProgress((prev) => ({
          ...prev,
          currentNode: event.data.currentNode,
          completedNodes: Array.from(
            new Set([...prev.completedNodes, ...(event.data.completedNodes ? [event.data.currentNode] : [])])
          ),
          totalNodes: event.data.totalNodes,
          percentage: event.data.percentage || 0,
          elapsedTime: Date.now() - (event.timestamp?.getTime() || 0),
        }));
      }
    });

    // Listen for node started events
    const unsubscribeNodeStarted = on('node:started', (event: NodeStartedEvent) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setNodeTimeline((prev) => {
          const existing = prev.findIndex((n) => n.nodeId === event.nodeId);
          if (existing >= 0) {
            // Update existing timeline entry
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              status: 'executing',
              startTime: event.timestamp,
            };
            return updated;
          } else {
            // Add new timeline entry
            return [
              ...prev,
              {
                nodeId: event.nodeId,
                nodeType: event.nodeType,
                status: 'executing',
                startTime: event.timestamp,
                endTime: null,
                duration: 0,
              },
            ];
          }
        });
      }
    });

    // Listen for node completed events
    const unsubscribeNodeCompleted = on('node:completed', (event: NodeCompletedEvent) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setRealtimeProgress((prev) => ({
          ...prev,
          completedNodes: Array.from(new Set([...prev.completedNodes, event.nodeId])),
          percentage:
            prev.totalNodes > 0
              ? Math.round(
                  ((prev.completedNodes.length + 1) / prev.totalNodes) * 100
                )
              : prev.percentage,
        }));

        setNodeTimeline((prev) => {
          const updated = prev.map((n) =>
            n.nodeId === event.nodeId
              ? {
                  ...n,
                  status: 'completed' as const,
                  endTime: event.timestamp,
                  duration: event.data?.duration || 0,
                }
              : n
          );
          return updated;
        });
      }
    });

    // Listen for node failed events
    const unsubscribeNodeFailed = on('node:failed', (event: NodeFailedEvent) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setRealtimeProgress((prev) => ({
          ...prev,
          failedNodes: Array.from(new Set([...prev.failedNodes, event.nodeId])),
          status: 'failed',
          error: event.data?.error || 'Node execution failed',
        }));

        setNodeTimeline((prev) => {
          const updated = prev.map((n) =>
            n.nodeId === event.nodeId
              ? {
                  ...n,
                  status: 'failed' as const,
                  endTime: event.timestamp,
                  duration: event.data?.duration || 0,
                  error: event.data?.error,
                }
              : n
          );
          return updated;
        });
      }
    });

    // Listen for workflow completed events
    const unsubscribeWorkflowCompleted = on('workflow:completed', (event: WorkflowCompletedEvent) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setRealtimeProgress((prev) => ({
          ...prev,
          status: 'completed',
          elapsedTime: event.data?.duration || 0,
        }));
      }
    });

    // Listen for workflow failed events
    const unsubscribeWorkflowFailed = on('workflow:failed', (event: WorkflowFailedEvent) => {
      if (!currentExecutionId || currentExecutionId === event.executionId) {
        setRealtimeProgress((prev) => ({
          ...prev,
          status: 'failed',
          error: event.data?.error || 'Workflow execution failed',
          elapsedTime: event.data?.duration || 0,
        }));
      }
    });

    // Return cleanup function
    return () => {
      unsubscribeWorkflowStarted();
      unsubscribeWorkflowProgress();
      unsubscribeNodeStarted();
      unsubscribeNodeCompleted();
      unsubscribeNodeFailed();
      unsubscribeWorkflowCompleted();
      unsubscribeWorkflowFailed();
    };
  }, [isConnected, currentExecutionId, on]);

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

          {/* Real-time Status Indicator */}
          {showResults && (
            <div className="space-y-3 border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Execution Status</span>
                  <Badge
                    variant={
                      realtimeProgress.status === 'completed'
                        ? 'default'
                        : realtimeProgress.status === 'failed'
                          ? 'destructive'
                          : realtimeProgress.status === 'running'
                            ? 'secondary'
                            : 'outline'
                    }
                  >
                    {realtimeProgress.status === 'running' && (
                      <div className="inline-block size-2 rounded-full bg-yellow-500 mr-2" />
                    )}
                    {realtimeProgress.status === 'completed' && <CheckCircle2 className="size-4 mr-1" />}
                    {realtimeProgress.status === 'failed' && <XCircle className="size-4 mr-1" />}
                    {realtimeProgress.status}
                  </Badge>
                </div>
                {realtimeProgress.startTime && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {(realtimeProgress.elapsedTime / 1000).toFixed(2)}s
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {realtimeProgress.status === 'running' && realtimeProgress.totalNodes > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {realtimeProgress.completedNodes.length} / {realtimeProgress.totalNodes} nodes
                    </span>
                    <span>{realtimeProgress.percentage}%</span>
                  </div>
                  <Progress value={realtimeProgress.percentage} className="h-2" />
                </div>
              )}

              {/* Current Node Display */}
              {realtimeProgress.currentNode && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Current Node:</span>
                  <span className="ml-2 font-medium text-primary">{realtimeProgress.currentNode}</span>
                </div>
              )}

              {/* Error Display */}
              {realtimeProgress.error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{realtimeProgress.error}</AlertDescription>
                </Alert>
              )}

              {/* Node Timeline */}
              {nodeTimeline.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Execution Timeline</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {nodeTimeline.map((node, idx) => (
                      <div
                        key={`${node.nodeId}-${idx}`}
                        className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50"
                      >
                        {node.status === 'completed' && (
                          <CheckCircle2 className="size-3 text-green-600 flex-shrink-0" />
                        )}
                        {node.status === 'executing' && (
                          <div className="size-3 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin flex-shrink-0" />
                        )}
                        {node.status === 'failed' && (
                          <XCircle className="size-3 text-red-600 flex-shrink-0" />
                        )}
                        {node.status === 'pending' && (
                          <div className="size-3 rounded-full border border-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{node.nodeId}</div>
                          {node.nodeType && (
                            <div className="text-xs text-muted-foreground">{node.nodeType}</div>
                          )}
                        </div>
                        {node.duration > 0 && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {(node.duration / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connection Status */}
              {!isConnected && (
                <Alert variant="default" className="border-orange-200 bg-orange-50">
                  <AlertCircle className="size-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Real-time updates temporarily unavailable. Results will be shown when execution completes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

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
