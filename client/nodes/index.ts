/**
 * Central export point for all client-specific workflow nodes
 * This file enables automatic node discovery in browser environments
 * where file system-based discovery is not available.
 * 
 * Each client node should be exported here to be automatically
 * registered by the ClientWorkflowService.
 */

// Import all client-specific nodes
export { LocalStorageNode } from './LocalStorageNode';
export { FetchNode } from './FetchNode';
export { DOMNode } from './DOMNode';

// Import utility nodes
export { LogInputNode } from './utils/LogInputNode';

// Import UI nodes
export * from './ui';

// Export node classes as a convenient array for batch registration
import { LocalStorageNode } from './LocalStorageNode';
import { FetchNode } from './FetchNode';
import { DOMNode } from './DOMNode';
import { LogInputNode } from './utils/LogInputNode';
// Import UI nodes
import { FormUINode } from './ui/FormUINode';
import { DashboardUINode } from './ui/DashboardUINode';
import { ChartUINode } from './ui/ChartUINode';
import { DataTableUINode } from './ui/DataTableUINode';
import { FileProcessorUINode } from './ui/FileProcessorUINode';
import { ActionButtonGroupUINode } from './ui/ActionButtonGroupUINode';
import type { WorkflowNode } from 'shared';

/**
 * Array of all client node classes for automatic registration
 * This is used by ClientWorkflowService for browser-based node discovery
 */
export const CLIENT_NODES: Array<typeof WorkflowNode> = [
  LocalStorageNode,
  FetchNode,
  DOMNode,
  LogInputNode,
  // UI Nodes
  FormUINode,
  DashboardUINode,
  ChartUINode,
  DataTableUINode,
  FileProcessorUINode,
  ActionButtonGroupUINode
];

/**
 * Get all client node classes
 * @returns Array of client node class constructors
 */
export function getAllClientNodes(): Array<typeof WorkflowNode> {
  return [...CLIENT_NODES];
}

/**
 * Get client node metadata for development/debugging
 * @returns Array of node metadata objects
 */
export function getClientNodeMetadata() {
  return CLIENT_NODES.map(NodeClass => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = new (NodeClass as any)();
      return {
        ...instance.metadata,
        source: 'client' as const
      };
    } catch (error) {
      console.warn(`Failed to get metadata for node class:`, NodeClass, error);
      return null;
    }
  }).filter(Boolean);
}