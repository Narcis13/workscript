/**
 * WorkflowPreview Component
 *
 * Displays a simple visual representation of a workflow's structure,
 * showing nodes and their edge connections in a tree/list format.
 * This is an optional enhancement to help users understand workflow flow
 * without requiring a full drag-and-drop visual builder.
 *
 * @component
 * @example
 * ```tsx
 * <WorkflowPreview workflow={parsedWorkflow} />
 * ```
 *
 * @requirements
 * - Req 5: Workflow Creation (visual preview)
 * - Req 6: Workflow Editing (structure visualization)
 * - Req 8: Workflow Detail View (workflow understanding)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ParsedWorkflow, WorkflowStep } from '@workscript/engine';
import {
  GitBranch,
  Play,
  CircleDot,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';

/**
 * Props for the WorkflowPreview component
 */
interface WorkflowPreviewProps {
  /** Parsed workflow to visualize */
  workflow: ParsedWorkflow;

  /** Optional class name for styling */
  className?: string;

  /** Show detailed edge information (default: true) */
  showEdges?: boolean;

  /** Compact mode (less spacing, smaller text) */
  compact?: boolean;
}

/**
 * Represents a node in the workflow for visualization
 */
interface WorkflowNode {
  /** Unique identifier */
  id: string;

  /** Node type/name */
  type: string;

  /** Configuration object */
  config?: Record<string, any>;

  /** Edge routes from this node */
  edges: { [edgeName: string]: string | string[] };

  /** Whether this is a loop node (ends with ...) */
  isLoop: boolean;

  /** Whether this is a state setter node (starts with $.) */
  isStateSetter: boolean;

  /** Index in the workflow array */
  index: number;
}

/**
 * Parse a workflow step to extract node information
 */
function parseWorkflowStep(step: WorkflowStep, index: number): WorkflowNode[] {
  const nodes: WorkflowNode[] = [];

  if (typeof step === 'string') {
    // Simple node reference
    nodes.push({
      id: step,
      type: step,
      edges: {},
      isLoop: step.endsWith('...'),
      isStateSetter: step.startsWith('$.'),
      index,
    });
  } else if (typeof step === 'object') {
    // Node with configuration
    for (const [nodeId, config] of Object.entries(step)) {
      const edges: { [edgeName: string]: string | string[] } = {};
      const cleanConfig: Record<string, any> = {};

      // Separate edges from regular config
      if (config && typeof config === 'object') {
        for (const [key, value] of Object.entries(config)) {
          if (key.endsWith('?')) {
            // This is an edge
            edges[key] = value as string | string[];
          } else {
            // This is regular config
            cleanConfig[key] = value;
          }
        }
      }

      nodes.push({
        id: nodeId,
        type: nodeId.replace(/\.\.\.$/, ''), // Remove loop suffix for display
        config: Object.keys(cleanConfig).length > 0 ? cleanConfig : undefined,
        edges,
        isLoop: nodeId.endsWith('...'),
        isStateSetter: nodeId.startsWith('$.'),
        index,
      });
    }
  }

  return nodes;
}

/**
 * Parse the entire workflow into a flat list of nodes
 */
function parseWorkflow(workflow: ParsedWorkflow): WorkflowNode[] {
  const nodes: WorkflowNode[] = [];

  workflow.workflow.forEach((step, index) => {
    nodes.push(...parseWorkflowStep(step, index));
  });

  return nodes;
}

/**
 * Get icon for node type
 */
function getNodeIcon(node: WorkflowNode) {
  if (node.isStateSetter) {
    return <CircleDot className="h-4 w-4" />;
  }
  if (node.isLoop) {
    return <GitBranch className="h-4 w-4" />;
  }
  return <Play className="h-4 w-4" />;
}

/**
 * Get badge variant for node type
 */
function getNodeBadgeVariant(node: WorkflowNode): 'default' | 'secondary' | 'outline' {
  if (node.isStateSetter) return 'secondary';
  if (node.isLoop) return 'outline';
  return 'default';
}

/**
 * WorkflowPreview Component
 *
 * Displays a visual representation of workflow structure showing:
 * - Workflow metadata (id, name, version)
 * - Initial state (if defined)
 * - Sequential list of nodes with their configurations
 * - Edge connections and routing
 * - Special node indicators (loops, state setters)
 */
export function WorkflowPreview({
  workflow,
  className = '',
  showEdges = true,
  compact = false,
}: WorkflowPreviewProps) {
  const nodes = parseWorkflow(workflow);
  const hasInitialState = workflow.initialState && Object.keys(workflow.initialState).length > 0;

  if (nodes.length === 0) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This workflow has no nodes defined yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'p-4 pb-2' : ''}>
        <CardTitle className={compact ? 'text-base' : 'text-lg'}>
          Workflow Structure
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'p-4 pt-2' : ''}>
        {/* Workflow Metadata */}
        <div className={`space-y-2 ${compact ? 'mb-3' : 'mb-4'}`}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">ID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{workflow.id}</code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Name:</span>
            <span>{workflow.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Version:</span>
            <Badge variant="outline">{workflow.version}</Badge>
          </div>
          {workflow.description && (
            <div className="flex items-start gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Description:</span>
              <span className="text-muted-foreground">{workflow.description}</span>
            </div>
          )}
        </div>

        <Separator className={compact ? 'my-3' : 'my-4'} />

        {/* Initial State */}
        {hasInitialState && (
          <>
            <div className={compact ? 'mb-3' : 'mb-4'}>
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Initial State</span>
              </div>
              <div className="bg-muted rounded-md p-3 text-xs font-mono">
                <pre className="overflow-x-auto">
                  {JSON.stringify(workflow.initialState, null, 2)}
                </pre>
              </div>
            </div>
            <Separator className={compact ? 'my-3' : 'my-4'} />
          </>
        )}

        {/* Node List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Play className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">Execution Flow</span>
            <Badge variant="secondary" className="text-xs">
              {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
            </Badge>
          </div>

          <div className="space-y-2">
            {nodes.map((node, idx) => (
              <div
                key={`${node.id}-${idx}`}
                className={`border rounded-lg ${compact ? 'p-3' : 'p-4'} space-y-2`}
              >
                {/* Node Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getNodeIcon(node)}
                    <code className="text-sm font-semibold truncate">{node.id}</code>
                    <Badge variant={getNodeBadgeVariant(node)} className="text-xs">
                      {node.isStateSetter
                        ? 'State Setter'
                        : node.isLoop
                        ? 'Loop Node'
                        : 'Node'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Step {node.index + 1}
                  </span>
                </div>

                {/* Node Configuration */}
                {node.config && Object.keys(node.config).length > 0 && (
                  <div className="pl-6">
                    <div className="text-xs text-muted-foreground mb-1">Configuration:</div>
                    <div className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(node.config, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {/* Node Edges */}
                {showEdges && Object.keys(node.edges).length > 0 && (
                  <div className="pl-6 space-y-1">
                    <div className="text-xs text-muted-foreground">Edges:</div>
                    {Object.entries(node.edges).map(([edgeName, target]) => (
                      <div
                        key={edgeName}
                        className="flex items-center gap-2 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge
                          variant={
                            edgeName === 'success?'
                              ? 'default'
                              : edgeName === 'error?'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {edgeName}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <code className="bg-muted px-2 py-0.5 rounded">
                          {Array.isArray(target) ? target.join(', ') : target}
                        </code>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loop Indicator */}
                {node.isLoop && (
                  <div className="pl-6 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <GitBranch className="h-3 w-3" />
                    <span>This node will loop back on continue</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <Separator className={compact ? 'my-3' : 'my-4'} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {nodes.filter((n) => !n.isStateSetter).length} execution nodes
            </span>
            <span className="flex items-center gap-1">
              <CircleDot className="h-3 w-3" />
              {nodes.filter((n) => n.isStateSetter).length} state setters
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {nodes.filter((n) => n.isLoop).length} loop nodes
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkflowPreview;
