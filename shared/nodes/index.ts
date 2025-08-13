/**
 * Central export point for all universal workflow nodes
 * These nodes work across all environments (server, client, CLI) with zero external dependencies
 * 
 * Each universal node should be exported here to enable automatic registration
 * in environments where file-based discovery is not available (like browsers).
 */

// Import all universal nodes
export { MathNode } from './MathNode';
export { LogicNode } from './LogicNode';
export { DataTransformNode } from './DataTransformNode';
export { EmptyNode } from './EmptyNode';

// Import for array creation
import { MathNode } from './MathNode';
import { LogicNode } from './LogicNode';
import { DataTransformNode } from './DataTransformNode';
import { EmptyNode } from './EmptyNode';
import type { WorkflowNode } from '../types';

/**
 * Array of all universal node classes for automatic registration
 * Used by services in environments without file system access
 */
export const UNIVERSAL_NODES: Array<typeof WorkflowNode> = [
  MathNode,
  LogicNode,
  DataTransformNode,
  EmptyNode
];

/**
 * Get all universal node classes
 * @returns Array of universal node class constructors
 */
export function getAllUniversalNodes(): Array<typeof WorkflowNode> {
  return [...UNIVERSAL_NODES];
}

/**
 * Get universal node metadata for development/debugging
 * @returns Array of node metadata objects
 */
export function getUniversalNodeMetadata() {
  return UNIVERSAL_NODES.map(NodeClass => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = new (NodeClass as any)();
      return {
        ...instance.metadata,
        source: 'universal' as const
      };
    } catch (error) {
      console.warn(`Failed to get metadata for universal node class:`, NodeClass, error);
      return null;
    }
  }).filter(Boolean);
}