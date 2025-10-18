import { WorkflowNode } from '../../src/types';
import type { ExecutionContext, EdgeMap } from '../../src/types';

/**
 * SplitOutNode - Convert a single item containing an array into multiple items
 *
 * This universal node takes an input object with an array field and "splits" it out
 * into multiple items, where each item contains one element from the array along with
 * optional parent data. This is the inverse operation of aggregation.
 *
 * Common use cases:
 * - Processing multiple order items individually
 * - Splitting user lists into individual user processing
 * - Converting grouped data into individual records for downstream processing
 *
 * @example
 * ```json
 * {
 *   "split-out-1": {
 *     "arrayPath": "items",
 *     "keepParentData": true,
 *     "as": "item",
 *     "success?": "process-item"
 *   }
 * }
 * ```
 */
export class SplitOutNode extends WorkflowNode {
  metadata = {
    id: 'splitOut',
    name: 'Split Out',
    version: '1.0.0',
    description: 'Universal node - converts a single item with an array into multiple items, one for each array element',
    inputs: ['arrayPath', 'keepParentData', 'as'],
    outputs: ['item', 'order_id'],
    ai_hints: {
      purpose: 'Convert a single item containing an array into multiple items, creating one output item per array element',
      when_to_use: 'When you need to process array elements individually, such as splitting order items, user lists, or grouped data into separate items',
      expected_edges: ['success', 'empty', 'error'],
      example_usage: '{"split-out-1": {"arrayPath": "items", "keepParentData": true, "as": "item", "success?": "process-items"}}',
      example_config: '{"arrayPath": "string (dot notation path)", "keepParentData?": "boolean", "as?": "string"}',
      get_from_state: [],
      post_to_state: ['splitOutResult', 'splitOutCount']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
      // Extract configuration parameters
      const { arrayPath, keepParentData = true, as = 'item' } = config || {};

      // Validate required parameters
      if (!arrayPath || typeof arrayPath !== 'string') {
        return {
          error: () => ({
            error: 'Missing or invalid required parameter: arrayPath',
            nodeId: context.nodeId,
            expected: 'string (dot notation path to array field)',
            received: typeof arrayPath
          })
        };
      }

      // Get the array from inputs using dot notation
      const arrayData = this.getNestedValue(context.inputs, arrayPath);

      // Handle case where path doesn't exist
      if (arrayData === undefined) {
        return {
          error: () => ({
            error: `Array path not found: ${arrayPath}`,
            nodeId: context.nodeId,
            arrayPath,
            availableFields: Object.keys(context.inputs)
          })
        };
      }

      // Handle case where value is null
      if (arrayData === null) {
        return {
          empty: () => ({
            message: `Array at path "${arrayPath}" is null`,
            arrayPath,
            count: 0
          })
        };
      }

      // Validate that the target is actually an array
      if (!Array.isArray(arrayData)) {
        return {
          error: () => ({
            error: `Value at path "${arrayPath}" is not an array`,
            nodeId: context.nodeId,
            arrayPath,
            actualType: typeof arrayData,
            value: arrayData
          })
        };
      }

      // Handle empty array case
      if (arrayData.length === 0) {
        context.state.splitOutResult = [];
        context.state.splitOutCount = 0;

        return {
          empty: () => ({
            message: 'Array is empty',
            arrayPath,
            count: 0
          })
        };
      }

      // Split out the array into multiple items
      const splitItems: any[] = [];

      for (const arrayElement of arrayData) {
        let outputItem: any;

        if (keepParentData) {
          // Include parent data (everything except the array itself)
          outputItem = this.createOutputWithParent(context.inputs, arrayPath, arrayElement, as);
        } else {
          // Only include the array element
          outputItem = { [as]: arrayElement };
        }

        splitItems.push(outputItem);
      }

      // Store results in state
      context.state.splitOutResult = splitItems;
      context.state.splitOutCount = splitItems.length;

      return {
        success: () => ({
          items: splitItems,
          count: splitItems.length,
          arrayPath,
          message: `Successfully split ${splitItems.length} items from array at "${arrayPath}"`
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Split out operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Get a nested value from an object using dot notation
   * Supports paths like "user.profile.name" or "items"
   *
   * @param obj - The object to traverse
   * @param path - Dot-notation path to the value
   * @returns The value at the path, or undefined if not found
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const segments = path.split('.').filter(seg => seg.length > 0);

    let current = obj;
    for (const segment of segments) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }

  /**
   * Create an output item that includes parent data along with the array element
   * This removes the array field itself and adds the element under the specified key
   *
   * @param parentData - The original parent object
   * @param arrayPath - Path to the array that was split
   * @param arrayElement - The current element from the array
   * @param elementKey - Key name for the array element in output
   * @returns Output object with parent data and array element
   */
  private createOutputWithParent(
    parentData: any,
    arrayPath: string,
    arrayElement: any,
    elementKey: string
  ): any {
    // Deep clone the parent data to avoid mutations
    const output = JSON.parse(JSON.stringify(parentData));

    // Remove the array field from the output
    this.deleteNestedValue(output, arrayPath);

    // Add the current array element under the specified key
    output[elementKey] = arrayElement;

    return output;
  }

  /**
   * Delete a nested value from an object using dot notation
   * Supports paths like "user.profile.name" or "items"
   *
   * @param obj - The object to modify
   * @param path - Dot-notation path to the value to delete
   */
  private deleteNestedValue(obj: any, path: string): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    const segments = path.split('.').filter(seg => seg.length > 0);

    // Navigate to parent
    let current = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;
      if (current[segment] == null || typeof current[segment] !== 'object') {
        return;
      }
      current = current[segment];
    }

    // Delete the final segment
    const finalSegment = segments[segments.length - 1]!;
    delete current[finalSegment];
  }
}

export default SplitOutNode;
