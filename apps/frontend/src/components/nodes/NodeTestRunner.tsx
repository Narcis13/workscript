/**
 * NodeTestRunner Component
 *
 * Interactive component for testing individual workflow nodes in isolation.
 * Provides Monaco editors for configuration and initial state input,
 * executes the node, and displays detailed results including execution time,
 * edges, and final state.
 *
 * **Features:**
 * - Monaco JSON editors with syntax highlighting and validation
 * - Real-time execution with loading states
 * - Comprehensive results display (execution time, edges, state)
 * - Pre-population with example configuration from AI hints
 * - Clear results and reset to example functionality
 *
 * **Requirements Coverage:**
 * - Requirement 3: Node Test Runner and Execution (Acceptance Criteria 1-12)
 * - Requirement 20: Monaco Editor Integration and Configuration
 *
 * **Example Usage:**
 * ```typescript
 * <NodeTestRunner
 *   nodeId="math"
 *   exampleConfig={{
 *     operation: "add",
 *     values: [10, 20, 30]
 *   }}
 * />
 * ```
 *
 * @module components/nodes/NodeTestRunner
 */

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { PlayIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useExecuteNode } from '../../hooks/api/useNodes';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Props for the NodeTestRunner component
 */
export interface NodeTestRunnerProps {
  /** The unique identifier of the node to test */
  nodeId: string;

  /** Example configuration from the node's AI hints (optional) */
  exampleConfig?: Record<string, any>;

  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Execution result state
 */
interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Returned edges from the node */
  edges?: Record<string, any>;

  /** Final state after execution */
  finalState?: Record<string, any>;

  /** Error message if execution failed */
  error?: string;

  /** Stack trace if execution failed */
  stackTrace?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely parse JSON string
 *
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
function safeJsonParse(jsonString: string): Record<string, any> | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Safely stringify JSON object
 *
 * @param obj - Object to stringify
 * @returns Formatted JSON string
 */
function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{}';
  }
}

/**
 * Validate JSON string
 *
 * @param jsonString - JSON string to validate
 * @returns true if valid JSON, false otherwise
 */
function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// COMPONENT
// ============================================

/**
 * NodeTestRunner Component
 *
 * Provides an interactive testing environment for workflow nodes with Monaco editors
 * for config and initial state input, execution controls, and detailed result display.
 *
 * @param props - Component props
 * @returns React component
 */
export function NodeTestRunner({
  nodeId,
  exampleConfig,
  className = '',
}: NodeTestRunnerProps): JSX.Element {
  // ============================================
  // STATE
  // ============================================

  // Editor content (JSON strings)
  const [configJson, setConfigJson] = useState<string>('{}');
  const [initialStateJson, setInitialStateJson] = useState<string>('{}');

  // Validation states
  const [isConfigValid, setIsConfigValid] = useState<boolean>(true);
  const [isStateValid, setIsStateValid] = useState<boolean>(true);

  // Execution result
  const [result, setResult] = useState<ExecutionResult | null>(null);

  // ============================================
  // HOOKS
  // ============================================

  // Execute node mutation
  const { mutate: executeNode, isPending } = useExecuteNode();

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Pre-populate config editor with example config when component mounts
   */
  useEffect(() => {
    if (exampleConfig) {
      setConfigJson(safeJsonStringify(exampleConfig));
    }
  }, [exampleConfig]);

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle config editor change
   */
  const handleConfigChange = (value: string | undefined) => {
    const newValue = value || '{}';
    setConfigJson(newValue);
    setIsConfigValid(isValidJson(newValue));
  };

  /**
   * Handle initial state editor change
   */
  const handleStateChange = (value: string | undefined) => {
    const newValue = value || '{}';
    setInitialStateJson(newValue);
    setIsStateValid(isValidJson(newValue));
  };

  /**
   * Handle "Run Test" button click
   */
  const handleRunTest = () => {
    // Validate JSON
    if (!isConfigValid || !isStateValid) {
      return;
    }

    // Parse JSON
    const config = safeJsonParse(configJson);
    const initialState = safeJsonParse(initialStateJson);

    if (!config) {
      setIsConfigValid(false);
      return;
    }

    // Execute node
    executeNode(
      {
        nodeId,
        config,
        initialState: initialState || {},
      },
      {
        onSuccess: (data) => {
          setResult(data);
        },
        onError: (error: any) => {
          setResult({
            success: false,
            executionTime: 0,
            error: error.message || 'Execution failed',
          });
        },
      }
    );
  };

  /**
   * Handle "Clear Results" button click
   */
  const handleClearResults = () => {
    setResult(null);
    setConfigJson('{}');
    setInitialStateJson('{}');
    setIsConfigValid(true);
    setIsStateValid(true);
  };

  /**
   * Handle "Reset to Example" button click
   */
  const handleResetToExample = () => {
    if (exampleConfig) {
      setConfigJson(safeJsonStringify(exampleConfig));
      setIsConfigValid(true);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Test Node</CardTitle>
        <CardDescription>
          Test this node in isolation with custom configuration and initial state
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Configuration Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Node Configuration</label>
            {exampleConfig && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToExample}
                className="h-8"
              >
                <RotateCcwIcon className="mr-1 h-3 w-3" />
                Reset to Example
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Editor
              height="200px"
              defaultLanguage="json"
              value={configJson}
              onChange={handleConfigChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
          {!isConfigValid && (
            <p className="text-sm text-red-600">Invalid JSON in configuration</p>
          )}
        </div>

        {/* Initial State Editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Initial State (Optional)</label>
          <div className="rounded-md border">
            <Editor
              height="150px"
              defaultLanguage="json"
              value={initialStateJson}
              onChange={handleStateChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
          {!isStateValid && (
            <p className="text-sm text-red-600">Invalid JSON in initial state</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleRunTest}
            disabled={isPending || !isConfigValid || !isStateValid}
            className="flex-1"
          >
            <PlayIcon className="mr-2 h-4 w-4" />
            {isPending ? 'Running...' : 'Run Test'}
          </Button>

          {result && (
            <Button
              variant="outline"
              onClick={handleClearResults}
              disabled={isPending}
            >
              <XIcon className="mr-2 h-4 w-4" />
              Clear Results
            </Button>
          )}
        </div>

        {/* Results Panel */}
        {result && (
          <>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Execution Results</h3>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'Success' : 'Failed'}
                </Badge>
              </div>

              {/* Execution Time */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Execution Time</p>
                <p className="text-sm">{result.executionTime}ms</p>
              </div>

              {/* Error Message (if failed) */}
              {!result.success && result.error && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600">Error</p>
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{result.error}</p>
                    {result.stackTrace && (
                      <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                        {result.stackTrace}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Returned Edges */}
              {result.edges && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Returned Edges</p>
                  <div className="rounded-md border bg-gray-50">
                    <Editor
                      height="150px"
                      defaultLanguage="json"
                      value={safeJsonStringify(result.edges)}
                      theme="vs-light"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Final State */}
              {result.finalState && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Final State</p>
                  <div className="rounded-md border bg-gray-50">
                    <Editor
                      height="200px"
                      defaultLanguage="json"
                      value={safeJsonStringify(result.finalState)}
                      theme="vs-light"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        lineNumbers: 'off',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// EXPORTS
// ============================================

export default NodeTestRunner;
