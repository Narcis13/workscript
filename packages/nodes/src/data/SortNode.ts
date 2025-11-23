import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * SortNode - Universal node for sorting items based on field values or random order
 *
 * Provides two main sorting modes:
 * 1. Simple mode: Sort by one or multiple fields with ascending/descending order
 * 2. Random mode: Randomly shuffle items using Fisher-Yates algorithm
 *
 * Supports:
 * - Multi-field sorting (sort by field1 desc, then field2 asc)
 * - Nested field access using dot notation
 * - Stable sort algorithm (preserves original order for equal elements)
 * - Proper handling of null/undefined values
 *
 * @example
 * ```json
 * {
 *   "sort-1": {
 *     "type": "simple",
 *     "fieldsToSortBy": [
 *       {"fieldName": "score", "order": "descending"},
 *       {"fieldName": "name", "order": "ascending"}
 *     ],
 *     "success?": "next-node"
 *   }
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "shuffle-1": {
 *     "type": "random",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */

interface SortFieldConfig {
  fieldName: string;
  order: 'ascending' | 'descending';
}

interface SortNodeConfig {
  type?: 'simple' | 'random';
  fieldsToSortBy?: SortFieldConfig[];
  disableDotNotation?: boolean;
}

export class SortNode extends WorkflowNode {
  metadata = {
    id: 'sort',
    name: 'Sort Items',
    version: '1.0.0',
    description: 'Universal node for sorting items based on field values or random order',
    inputs: ['type', 'fieldsToSortBy', 'disableDotNotation'],
    outputs: ['items', 'count'],
    ai_hints: {
      purpose: 'Sort items by field values (ascending/descending) or randomly shuffle them',
      when_to_use: 'When you need to order data by specific criteria, support multi-field sorting, or randomize item order',
      expected_edges: ['success', 'error'],
      example_usage: '{"sort-1": {"type": "simple", "fieldsToSortBy": [{"fieldName": "score", "order": "descending"}], "success?": "next-node"}}',
      example_config: '{"type": "simple|random", "fieldsToSortBy?": "[{fieldName: string, order: ascending|descending}, ...]", "disableDotNotation?": "boolean"}',
      get_from_state: [],
      post_to_state: ['sortedItems']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { type, fieldsToSortBy, disableDotNotation } = (config as SortNodeConfig) || {};

    // Validate type parameter
    if (!type) {
      return {
        error: () => ({
          error: 'Missing required parameter: type',
          nodeId: context.nodeId,
          suggestion: 'Specify type as "simple" or "random"'
        })
      };
    }

    if (type !== 'simple' && type !== 'random') {
      return {
        error: () => ({
          error: `Invalid type: ${type}`,
          nodeId: context.nodeId,
          validTypes: ['simple', 'random'],
          suggestion: 'Use "simple" for field-based sorting or "random" for shuffle'
        })
      };
    }

    try {
      // Get items from context inputs
      const items = context.inputs.items || [];

      if (!Array.isArray(items)) {
        return {
          error: () => ({
            error: 'Input items must be an array',
            nodeId: context.nodeId,
            receivedType: typeof items
          })
        };
      }

      // Handle empty array
      if (items.length === 0) {
        context.state.sortedItems = [];
        return {
          success: () => ({
            items: [],
            count: 0,
            message: 'No items to sort'
          })
        };
      }

      let sortedItems: any[];

      if (type === 'random') {
        // Fisher-Yates shuffle algorithm
        sortedItems = this.fisherYatesShuffle([...items]);
      } else {
        // Simple field-based sorting
        if (!fieldsToSortBy || !Array.isArray(fieldsToSortBy) || fieldsToSortBy.length === 0) {
          return {
            error: () => ({
              error: 'Missing or invalid fieldsToSortBy parameter for simple sort',
              nodeId: context.nodeId,
              suggestion: 'Provide an array of field configurations with fieldName and order'
            })
          };
        }

        // Validate field configurations
        for (const field of fieldsToSortBy) {
          if (!field.fieldName || typeof field.fieldName !== 'string') {
            return {
              error: () => ({
                error: 'Each sort field must have a valid fieldName',
                nodeId: context.nodeId,
                invalidField: field
              })
            };
          }

          if (field.order !== 'ascending' && field.order !== 'descending') {
            return {
              error: () => ({
                error: `Invalid sort order: ${field.order}`,
                nodeId: context.nodeId,
                fieldName: field.fieldName,
                validOrders: ['ascending', 'descending']
              })
            };
          }
        }

        sortedItems = this.sortByFields([...items], fieldsToSortBy, disableDotNotation || false);
      }

      // Store in state
      context.state.sortedItems = sortedItems;

      return {
        success: () => ({
          items: sortedItems,
          count: sortedItems.length,
          sortType: type,
          timestamp: new Date().toISOString()
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Sort operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Fisher-Yates shuffle algorithm for random item ordering
   * Time complexity: O(n)
   * Space complexity: O(1) - in-place shuffle
   *
   * @param items Array to shuffle (will be modified)
   * @returns Shuffled array
   */
  private fisherYatesShuffle<T>(items: T[]): T[] {
    // Start from the last element and swap with a random element before it
    for (let i = items.length - 1; i > 0; i--) {
      // Generate random index from 0 to i (inclusive)
      const randomIndex = Math.floor(Math.random() * (i + 1));

      // Swap elements at i and randomIndex
      [items[i], items[randomIndex]] = [items[randomIndex]!, items[i]!];
    }

    return items;
  }

  /**
   * Sort items by multiple fields using stable sort algorithm
   *
   * @param items Array to sort
   * @param fields Sort configurations (field name and order)
   * @param disableDotNotation Whether to disable nested field access
   * @returns Sorted array
   */
  private sortByFields(items: any[], fields: SortFieldConfig[], disableDotNotation: boolean): any[] {
    return items.sort((a, b) => {
      // Iterate through sort fields in order (multi-level sort)
      for (const field of fields) {
        const aValue = this.getFieldValue(a, field.fieldName, disableDotNotation);
        const bValue = this.getFieldValue(b, field.fieldName, disableDotNotation);

        // Compare values
        const comparison = this.compareValues(aValue, bValue);

        // If values are not equal, return the comparison result
        if (comparison !== 0) {
          return field.order === 'ascending' ? comparison : -comparison;
        }

        // If values are equal, continue to next sort field
      }

      // All fields are equal - maintain original order (stable sort)
      return 0;
    });
  }

  /**
   * Get field value from object, supporting dot notation for nested access
   *
   * @param obj Object to extract value from
   * @param fieldPath Field path (e.g., "user.profile.name")
   * @param disableDotNotation Whether to disable nested access
   * @returns Field value or undefined if not found
   */
  private getFieldValue(obj: any, fieldPath: string, disableDotNotation: boolean): any {
    if (obj == null) {
      return undefined;
    }

    // If dot notation is disabled, return direct property access
    if (disableDotNotation) {
      return obj[fieldPath];
    }

    // Support nested field access with dot notation
    const segments = fieldPath.split('.');
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
   * Compare two values for sorting
   * Handles null/undefined, numbers, strings, booleans, and dates
   *
   * @param a First value
   * @param b Second value
   * @returns -1 if a < b, 1 if a > b, 0 if equal
   */
  private compareValues(a: any, b: any): number {
    // Handle null/undefined - always sort to end
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      // Handle NaN - sort to end
      if (isNaN(a) && isNaN(b)) return 0;
      if (isNaN(a)) return 1;
      if (isNaN(b)) return -1;

      return a - b;
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Handle booleans (false < true)
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 0 : a ? 1 : -1;
    }

    // Handle strings (case-insensitive comparison)
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();

    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
  }
}

export default SortNode;
