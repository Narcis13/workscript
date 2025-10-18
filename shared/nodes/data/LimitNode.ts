import { WorkflowNode } from '../../src/types';
import type { ExecutionContext, EdgeMap } from '../../src/types';

/**
 * LimitNode - Universal node for limiting the number of items passing through
 *
 * Limits the number of items in an array to a maximum count, keeping items from
 * either the beginning or end of the array. This is useful for pagination,
 * testing with sample data, or controlling workflow processing load.
 *
 * @example
 * ```json
 * {
 *   "limit-1": {
 *     "items": [{"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}, {"id": 5}],
 *     "maxItems": 3,
 *     "keepFrom": "beginning",
 *     "success?": "process-items"
 *   }
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "limit-recent": {
 *     "items": "$.allRecords",
 *     "maxItems": 10,
 *     "keepFrom": "end",
 *     "success?": "display-latest"
 *   }
 * }
 * ```
 */
export class LimitNode extends WorkflowNode {
  metadata = {
    id: 'limit',
    name: 'Limit Node',
    version: '1.0.0',
    description: 'Universal node - limits the number of items passing through by keeping a specified number from the beginning or end',
    inputs: ['items', 'maxItems', 'keepFrom'],
    outputs: ['limitedItems', 'count', 'originalCount'],
    ai_hints: {
      purpose: 'Limit the number of items in an array to a maximum count, keeping items from beginning or end',
      when_to_use: 'When you need to paginate results, work with a subset of data, test with sample data, or control processing load',
      expected_edges: ['success', 'all_items', 'error'],
      example_usage: '{"limit-1": {"items": [1,2,3,4,5], "maxItems": 3, "keepFrom": "beginning", "success?": "next-node"}}',
      example_config: '{"items": "[any, ...]", "maxItems": "number", "keepFrom?": "beginning|end"}',
      get_from_state: [],
      post_to_state: ['limitedItems', 'limitCount', 'limitOriginalCount']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
      // Extract configuration parameters
      const { items, maxItems, keepFrom = 'beginning' } = config || {};

      // Validate required parameters
      if (!items) {
        return {
          error: () => ({
            error: 'Missing required parameter: items',
            nodeId: context.nodeId
          })
        };
      }

      if (!maxItems || typeof maxItems !== 'number') {
        return {
          error: () => ({
            error: 'Missing or invalid required parameter: maxItems (must be a number)',
            nodeId: context.nodeId
          })
        };
      }

      // Validate maxItems is positive
      if (maxItems <= 0) {
        return {
          error: () => ({
            error: 'Invalid maxItems: must be greater than 0',
            nodeId: context.nodeId,
            maxItems
          })
        };
      }

      // Validate items is an array
      if (!Array.isArray(items)) {
        return {
          error: () => ({
            error: 'Invalid items parameter: must be an array',
            nodeId: context.nodeId,
            itemsType: typeof items
          })
        };
      }

      // Validate keepFrom parameter
      if (keepFrom !== 'beginning' && keepFrom !== 'end') {
        return {
          error: () => ({
            error: 'Invalid keepFrom parameter: must be "beginning" or "end"',
            nodeId: context.nodeId,
            keepFrom
          })
        };
      }

      const originalCount = items.length;

      // If items array has fewer items than maxItems, return all items
      if (items.length <= maxItems) {
        context.state.limitedItems = items;
        context.state.limitCount = items.length;
        context.state.limitOriginalCount = originalCount;

        return {
          all_items: () => ({
            limitedItems: items,
            count: items.length,
            originalCount,
            message: `All ${items.length} items kept (fewer than maxItems: ${maxItems})`
          })
        };
      }

      // Apply limit based on keepFrom setting
      let limitedItems: any[];
      if (keepFrom === 'beginning') {
        // Keep first maxItems items
        limitedItems = items.slice(0, maxItems);
      } else {
        // Keep last maxItems items (keepFrom === 'end')
        limitedItems = items.slice(-maxItems);
      }

      // Store results in state
      context.state.limitedItems = limitedItems;
      context.state.limitCount = limitedItems.length;
      context.state.limitOriginalCount = originalCount;

      // Return success edge
      return {
        success: () => ({
          limitedItems,
          count: limitedItems.length,
          originalCount,
          keepFrom,
          itemsRemoved: originalCount - limitedItems.length
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Limit operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }
}

export default LimitNode;
