/**
 * ExecutionResultsPanel Component
 *
 * Displays the results of a workflow execution in a formatted panel.
 * Shows execution metadata, final state, and error details if applicable.
 *
 * Features:
 * - Displays execution ID, status, and duration
 * - Shows final state as formatted JSON
 * - Shows error message and details if execution failed
 * - Provides copy-to-clipboard functionality for execution ID
 * - Color-coded status badges
 * - Expandable JSON viewer for final state
 *
 * Requirements Coverage:
 * - Requirement 7: Workflow Execution and Testing (displays execution results)
 * - Requirement 19: Error Handling and User Feedback
 *
 * @module components/workflows/ExecutionResultsPanel
 */

import { CheckCircle2, XCircle, Clock, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'sonner';
import { useState } from 'react';
import type { ExecutionResult } from '@workscript/engine';

/**
 * Props for ExecutionResultsPanel component
 */
interface ExecutionResultsPanelProps {
  /** Execution result data from the workflow engine */
  result: ExecutionResult;

  /** Optional CSS class name */
  className?: string;
}

/**
 * Formats duration in milliseconds to a human-readable string
 */
function formatDuration(startTime: Date, endTime?: Date): string {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const duration = end - start;

  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Formats JSON with syntax highlighting colors
 */
function JsonViewer({ data, expanded = false }: { data: any; expanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const jsonString = JSON.stringify(data, null, 2);
  const preview = JSON.stringify(data);
  const truncatedPreview = preview.length > 100 ? preview.slice(0, 100) + '...' : preview;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-muted px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
      {isExpanded ? (
        <pre className="p-4 text-sm overflow-x-auto bg-card">
          <code className="text-foreground">{jsonString}</code>
        </pre>
      ) : (
        <div className="p-4 text-sm text-muted-foreground font-mono">
          {truncatedPreview}
        </div>
      )}
    </div>
  );
}

/**
 * ExecutionResultsPanel Component
 *
 * Displays workflow execution results with status, duration, and state information.
 *
 * @component
 * @example
 * ```tsx
 * const result = {
 *   executionId: '123e4567-e89b-12d3-a456-426614174000',
 *   workflowId: 'my-workflow',
 *   status: 'completed',
 *   finalState: { result: 'success', count: 42 },
 *   startTime: new Date('2024-01-01T10:00:00Z'),
 *   endTime: new Date('2024-01-01T10:00:05Z')
 * };
 *
 * return <ExecutionResultsPanel result={result} />;
 * ```
 */
export function ExecutionResultsPanel({ result, className }: ExecutionResultsPanelProps) {
  const { executionId, status, finalState, error, startTime, endTime } = result;

  const handleCopyExecutionId = () => {
    navigator.clipboard.writeText(executionId);
    toast.success('Execution ID copied to clipboard');
  };

  const duration = formatDuration(startTime, endTime);
  const isSuccess = status === 'completed';
  const isFailed = status === 'failed';
  const isRunning = status === 'running';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Execution Results</CardTitle>
          <Badge
            variant={isSuccess ? 'default' : isFailed ? 'destructive' : 'secondary'}
            className="gap-1.5"
          >
            {isSuccess && <CheckCircle2 className="size-3.5" />}
            {isFailed && <XCircle className="size-3.5" />}
            {isRunning && <Clock className="size-3.5 animate-pulse" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <CardDescription>Workflow execution completed</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Execution Metadata */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Execution ID</span>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                {executionId.slice(0, 8)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyExecutionId}
                className="h-7 w-7 p-0"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-mono font-medium">{duration}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Start Time</span>
            <span className="font-mono text-xs">
              {new Date(startTime).toLocaleString()}
            </span>
          </div>

          {endTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">End Time</span>
              <span className="font-mono text-xs">
                {new Date(endTime).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Error Section (if failed) */}
        {isFailed && error && (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Execution Failed</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Final State */}
        {finalState && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Final State</label>
            <JsonViewer data={finalState} expanded={false} />
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertTitle>Workflow completed successfully</AlertTitle>
            <AlertDescription>
              The workflow executed without errors and completed in {duration}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Export component as default
 */
export default ExecutionResultsPanel;
