/**
 * NodeExecutionFlow Component
 *
 * Displays a visual flow diagram of node execution progress within a workflow execution.
 * Shows the current state of each node with color-coded status indicators and a visual
 * representation of the execution flow through the workflow.
 *
 * Features:
 * - Completed nodes shown with green checkmark
 * - Current node shown with blue spinner animation
 * - Pending nodes shown in gray
 * - Failed nodes shown with red X
 * - Vertical flow diagram with connection lines
 * - Responsive layout that adapts to screen size
 * - Shows node IDs and execution order
 * - Keyboard accessible with ARIA labels
 *
 * @module components/monitoring/NodeExecutionFlow
 *
 * @example
 * ```tsx
 * import { NodeExecutionFlow } from '@/components/monitoring/NodeExecutionFlow';
 *
 * function ExecutionDetail() {
 *   const execution = useExecution(executionId);
 *
 *   return (
 *     <NodeExecutionFlow
 *       execution={execution}
 *       className="mt-6"
 *     />
 *   );
 * }
 * ```
 */

import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowExecution, NodeExecutionLog } from '@/types/execution.types';
import type { ActiveExecution } from '@/types/execution.types';

/**
 * Node status type definition
 */
type NodeStatus = 'completed' | 'running' | 'pending' | 'failed' | 'skipped';

/**
 * Props for the NodeExecutionFlow component
 */
export interface NodeExecutionFlowProps {
  /**
   * The execution data containing node execution logs
   * Can be either a completed execution or an active execution
   */
  execution: WorkflowExecution | ActiveExecution;

  /**
   * Optional CSS class name for the container
   */
  className?: string;

  /**
   * Optional callback when a node is clicked
   * Useful for navigation or showing node details
   */
  onNodeClick?: (nodeId: string) => void;

  /**
   * Optional flag to show execution order numbers
   * @default true
   */
  showExecutionOrder?: boolean;

  /**
   * Optional flag to show node type alongside node ID
   * @default false
   */
  showNodeType?: boolean;

  /**
   * Optional maximum number of nodes to display
   * Useful for condensing very long workflows
   */
  maxNodesToShow?: number;
}

/**
 * Determine the status of a node based on execution context
 *
 * @param nodeId - The node ID to check
 * @param execution - The execution context
 * @returns The status of the node
 */
const getNodeStatus = (
  nodeId: string,
  execution: WorkflowExecution | ActiveExecution
): NodeStatus => {
  // For ActiveExecution type
  if ('currentNode' in execution) {
    const activeExecution = execution as ActiveExecution;

    // Check if this is the current node
    if (activeExecution.currentNode === nodeId) {
      return 'running';
    }

    // Check if node is completed
    if (activeExecution.recentEvents) {
      const completedEvent = activeExecution.recentEvents.find(
        (event) =>
          event.type === 'node:completed' && ('nodeId' in event ? event.nodeId === nodeId : false)
      );
      if (completedEvent) {
        return 'completed';
      }

      // Check if node failed
      const failedEvent = activeExecution.recentEvents.find(
        (event) =>
          event.type === 'node:failed' && ('nodeId' in event ? event.nodeId === nodeId : false)
      );
      if (failedEvent) {
        return 'failed';
      }

      // Check if node started
      const startedEvent = activeExecution.recentEvents.find(
        (event) =>
          event.type === 'node:started' && ('nodeId' in event ? event.nodeId === nodeId : false)
      );
      if (startedEvent) {
        return 'pending';
      }
    }

    return 'pending';
  }

  // For WorkflowExecution type - this would require additional processing
  // For now, treat all as pending (this would be enhanced with actual node execution data)
  return 'pending';
};

/**
 * Get the visual configuration for a node status
 */
const getStatusConfig = (status: NodeStatus): {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  label: string;
  ariaLabel: string;
} => {
  const iconClass = 'h-5 w-5';

  switch (status) {
    case 'completed':
      return {
        icon: <CheckCircle2 className={cn(iconClass, 'text-green-500')} />,
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        label: 'Completed',
        ariaLabel: 'Completed',
      };
    case 'running':
      return {
        icon: <Loader2 className={cn(iconClass, 'text-blue-500 animate-spin')} />,
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label: 'Running',
        ariaLabel: 'Currently executing',
      };
    case 'failed':
      return {
        icon: <AlertCircle className={cn(iconClass, 'text-red-500')} />,
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        label: 'Failed',
        ariaLabel: 'Failed execution',
      };
    case 'skipped':
      return {
        icon: <Circle className={cn(iconClass, 'text-gray-400')} />,
        bgColor: 'bg-gray-100 dark:bg-gray-800/30',
        borderColor: 'border-gray-200 dark:border-gray-700',
        label: 'Skipped',
        ariaLabel: 'Skipped',
      };
    case 'pending':
    default:
      return {
        icon: <Circle className={cn(iconClass, 'text-gray-400')} />,
        bgColor: 'bg-gray-50 dark:bg-gray-900/30',
        borderColor: 'border-gray-200 dark:border-gray-800',
        label: 'Pending',
        ariaLabel: 'Pending execution',
      };
  }
};

/**
 * NodeExecutionFlow Component
 *
 * Renders a visual flow diagram showing the execution state of each node in a workflow.
 * Provides clear visual indicators for completed, running, pending, and failed nodes.
 *
 * @component
 */
export const NodeExecutionFlow: React.FC<NodeExecutionFlowProps> = ({
  execution,
  className,
  onNodeClick,
  showExecutionOrder = true,
  showNodeType = false,
  maxNodesToShow,
}) => {
  // Determine which nodes to display
  const nodesToDisplay = useMemo(() => {
    let nodes: string[] = [];

    // For ActiveExecution, try to extract from recent events
    if ('recentEvents' in execution && execution.recentEvents) {
      const nodeIds = new Set<string>();
      execution.recentEvents.forEach((event) => {
        if ('nodeId' in event && event.nodeId) {
          nodeIds.add(event.nodeId);
        }
      });
      nodes = Array.from(nodeIds);
    }

    // If no nodes found from events, try a fallback
    // This would be enhanced when actual execution log data is available
    if (nodes.length === 0) {
      // Default fallback - show a message that no nodes are available
      return [];
    }

    // Limit to maxNodesToShow if specified
    if (maxNodesToShow && nodes.length > maxNodesToShow) {
      return nodes.slice(0, maxNodesToShow);
    }

    return nodes;
  }, [execution, maxNodesToShow]);

  // Show empty state if no nodes to display
  if (nodesToDisplay.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30">
          <Circle className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No node execution flow data available yet. Nodes will appear as the workflow executes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('w-full', className)}
      role="region"
      aria-label="Node execution flow"
      aria-describedby="flow-description"
    >
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Execution Flow ({nodesToDisplay.length} node{nodesToDisplay.length !== 1 ? 's' : ''})
        </h3>
        <p id="flow-description" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Visual representation of node execution progress
        </p>
      </div>

      {/* Flow Diagram */}
      <div className="relative space-y-3">
        {nodesToDisplay.map((nodeId, index) => {
          const status = getNodeStatus(nodeId, execution);
          const statusConfig = getStatusConfig(status);
          const isLastNode = index === nodesToDisplay.length - 1;

          return (
            <div key={`${nodeId}-${index}`} className="relative">
              {/* Connection line from previous node */}
              {index > 0 && (
                <div
                  className="absolute left-[22px] top-[-12px] w-0.5 h-3 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-800"
                  aria-hidden="true"
                />
              )}

              {/* Node Item */}
              <div
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all duration-200',
                  statusConfig.bgColor,
                  statusConfig.borderColor,
                  'hover:shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                  onNodeClick ? 'cursor-pointer' : ''
                )}
                onClick={() => onNodeClick?.(nodeId)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onNodeClick) {
                    e.preventDefault();
                    onNodeClick(nodeId);
                  }
                }}
                role={onNodeClick ? 'button' : 'region'}
                tabIndex={onNodeClick ? 0 : -1}
                aria-label={`Node ${index + 1}: ${nodeId} - ${statusConfig.ariaLabel}`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">{statusConfig.icon}</div>

                {/* Node Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {showExecutionOrder && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-300 dark:bg-gray-700 text-xs font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
                        {index + 1}
                      </span>
                    )}
                    <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {nodeId}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                      {statusConfig.label}
                    </span>
                  </div>

                  {showNodeType && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Node Type: <span className="font-mono">unknown</span>
                    </p>
                  )}
                </div>

                {/* Right arrow indicator for non-last nodes */}
                {!isLastNode && (
                  <div className="flex-shrink-0 text-gray-300 dark:text-gray-700">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Additional nodes indicator */}
        {maxNodesToShow && nodesToDisplay.length < maxNodesToShow && (
          <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
            And {nodesToDisplay.length - maxNodesToShow} more node
            {nodesToDisplay.length - maxNodesToShow !== 1 ? 's' : ''}...
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Running</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Failed</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Export NodeExecutionFlow as default
 */
export default NodeExecutionFlow;
