/**
 * EveryArrayItemNode - Iterate through all elements of an array, emitting each item one at a time
 *
 * This node is designed to work with the workflow loop pattern (... suffix). It tracks iteration
 * progress in state and emits a different edge depending on whether there are more items to process.
 *
 * On each execution:
 * - First execution: Initialize index to 0, emit first item via `current-item` edge
 * - Subsequent executions (loop re-entry): Increment index, emit next item
 * - When index reaches array length: Emit `complete` edge instead of `current-item`
 * - Empty arrays: Emit `complete` immediately
 *
 * Common use cases:
 * - Processing each user in a list individually
 * - Sending emails to multiple recipients one by one
 * - Iterating through records for individual transformation
 * - Any scenario where you need Array.forEach/map-like iteration in a workflow
 *
 * @example
 * ```json
 * {
 *   "process-users...": {
 *     "items": "$.users",
 *     "itemKey": "currentUser",
 *     "indexKey": "userIndex",
 *     "current-item?": "handle-user",
 *     "complete?": "finish-processing"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * Configuration interface for EveryArrayItemNode
 */
interface EveryArrayItemConfig {
  /** The array to iterate through (supports state resolution like $.myArray) */
  items?: any[];
  /** Key name to store current item in state (default: 'currentItem') */
  itemKey?: string;
  /** Key name to store current index in state (default: 'currentIndex') */
  indexKey?: string;
  /** Optional key to track iteration progress in state (default: '__everyArrayItem_<nodeId>') */
  stateKey?: string;
}

/**
 * Internal state structure for tracking iteration progress
 */
interface IterationState {
  /** The original array being iterated */
  items: any[];
  /** Current index in the iteration */
  currentIndex: number;
  /** Total number of items */
  totalItems: number;
  /** Whether iteration has started */
  initialized: boolean;
}

export class EveryArrayItemNode extends WorkflowNode {
  metadata = {
    id: 'every-array-item',
    name: 'Every Array Item',
    version: '1.0.0',
    description: 'Iterate through all elements of an array, emitting each item one at a time. Designed for loop workflows with ... suffix.',
    inputs: ['items', 'itemKey', 'indexKey', 'stateKey'],
    outputs: ['currentItem', 'currentIndex', 'totalItems', 'isFirst', 'isLast'],
    ai_hints: {
      purpose: 'Iterate through array elements one at a time, like Array.forEach or Array.map in JavaScript. Emits current-item edge for each element and complete edge when done.',
      when_to_use: 'When you need to process each item in an array individually within a workflow loop. Use with the ... suffix on the node ID to enable automatic loop-back behavior.',
      expected_edges: ['current-item', 'complete', 'error'],
      example_usage: '{"every-array-item": {"items": "$.users", "itemKey": "currentUser", "indexKey": "userIndex", "current-item?": "handle-user", "complete?": "finish-processing"}}',
      example_config: '{"items": "$.arrayFromState or [literal, array]", "itemKey?": "string (default: currentItem)", "indexKey?": "string (default: currentIndex)", "stateKey?": "string (custom state tracking key)"}',
      get_from_state: ['items (via state resolution)', 'iteration progress (internal tracking)'],
      post_to_state: ['currentItem (or custom itemKey)', 'currentIndex (or custom indexKey)', 'everyArrayItemTotal', 'everyArrayItemIsFirst', 'everyArrayItemIsLast']
    }
  };

  async execute(context: ExecutionContext, config?: EveryArrayItemConfig): Promise<EdgeMap> {
    // Extract configuration with defaults
    const {
      items,
      itemKey = 'currentItem',
      indexKey = 'currentIndex',
      stateKey
    } = config || {};

    // Generate internal state key for tracking iteration progress
    const internalStateKey = stateKey || `__everyArrayItem_${context.nodeId}`;

    // Get or initialize iteration state
    let iterationState = context.state[internalStateKey] as IterationState | undefined;

    // Validation BEFORE try-catch (only on first execution)
    if (!iterationState || !iterationState.initialized) {
      // Validate items parameter
      if (items === undefined || items === null) {
        return {
          error: () => ({
            error: 'Missing required parameter: items',
            nodeId: context.nodeId,
            expected: 'array (can use state resolution like $.myArray)',
            received: typeof items
          })
        };
      }

      // Validate that items is an array
      if (!Array.isArray(items)) {
        return {
          error: () => ({
            error: 'Parameter "items" must be an array',
            nodeId: context.nodeId,
            expected: 'array',
            received: typeof items,
            value: items
          })
        };
      }
    }

    try {
      // First execution: Initialize iteration state
      if (!iterationState || !iterationState.initialized) {
        // Initialize iteration state (items already validated above)
        iterationState = {
          items: items!,
          currentIndex: 0,
          totalItems: items!.length,
          initialized: true
        };

        // Handle empty array case - emit complete immediately
        if (items!.length === 0) {
          // Clean up iteration state
          delete context.state[internalStateKey];

          // Set state indicators for empty array
          context.state[itemKey] = undefined;
          context.state[indexKey] = -1;
          context.state.everyArrayItemTotal = 0;
          context.state.everyArrayItemIsFirst = false;
          context.state.everyArrayItemIsLast = false;

          return {
            complete: () => ({
              message: 'Array is empty, no items to process',
              totalItems: 0,
              itemsProcessed: 0
            })
          };
        }

        // Store iteration state
        context.state[internalStateKey] = iterationState;
      }

      // Get current index
      const currentIndex = iterationState.currentIndex;
      const totalItems = iterationState.totalItems;
      const itemsArray = iterationState.items;

      // Check if we've processed all items
      if (currentIndex >= totalItems) {
        // Clean up iteration state
        delete context.state[internalStateKey];

        // Set final state values
        context.state[itemKey] = undefined;
        context.state[indexKey] = totalItems;
        context.state.everyArrayItemTotal = totalItems;
        context.state.everyArrayItemIsFirst = false;
        context.state.everyArrayItemIsLast = true;

        return {
          complete: () => ({
            message: 'All items have been processed',
            totalItems,
            itemsProcessed: totalItems
          })
        };
      }

      // Get current item
      const currentItem = itemsArray[currentIndex];
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === totalItems - 1;

      // Update state with current item information
      context.state[itemKey] = currentItem;
      context.state[indexKey] = currentIndex;
      context.state.everyArrayItemTotal = totalItems;
      context.state.everyArrayItemIsFirst = isFirst;
      context.state.everyArrayItemIsLast = isLast;

      // Increment index for next iteration
      iterationState.currentIndex++;
      context.state[internalStateKey] = iterationState;

      // Emit current-item edge
      return {
        'current-item': () => ({
          item: currentItem,
          index: currentIndex,
          totalItems,
          isFirst,
          isLast,
          remaining: totalItems - currentIndex - 1
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Array iteration failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Reset the iteration state for a specific node
   * Can be called if you need to restart iteration from the beginning
   *
   * @param context - Execution context
   * @param stateKey - Optional custom state key
   */
  static resetIteration(context: ExecutionContext, stateKey?: string): void {
    const nodeId = context.nodeId;
    const internalStateKey = stateKey || `__everyArrayItem_${nodeId}`;
    delete context.state[internalStateKey];
  }
}

export default EveryArrayItemNode;
