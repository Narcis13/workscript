/**
 * ArrayUtilitiesNode - Universal node for common array manipulation utilities
 *
 * Provides a comprehensive set of array operations:
 * - chunk: Split array into chunks of specified size
 * - compact: Remove falsy values (null, undefined, false, 0, "")
 * - difference: Get elements in first array but not in second
 * - intersection: Get elements present in both arrays
 * - union: Combine arrays and remove duplicates
 * - unique: Remove duplicate elements
 * - reverse: Reverse array order
 * - shuffle: Randomly shuffle array elements
 * - flatten: Flatten nested arrays to specified depth
 * - first: Get first N elements
 * - last: Get last N elements
 * - sample: Get random N elements
 *
 * @example
 * ```json
 * {
 *   "array-util-1": {
 *     "operation": "unique",
 *     "field": "numbers",
 *     "outputField": "uniqueNumbers",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface ArrayUtilitiesNodeConfig {
  operation?: 'chunk' | 'compact' | 'difference' | 'intersection' | 'union' | 'unique' | 'reverse' | 'shuffle' | 'flatten' | 'first' | 'last' | 'sample';
  field?: string;
  outputField?: string;
  // Operation-specific parameters
  chunkSize?: number;
  compareArray?: string;
  uniqueBy?: string;
  depth?: number;
  sampleSize?: number;
  count?: number; // For first/last operations
}

export class ArrayUtilitiesNode extends WorkflowNode {
  metadata = {
    id: 'arrayUtilities',
    name: 'Array Utilities',
    version: '1.0.0',
    description: 'Universal node - common array manipulation utilities including chunk, compact, difference, intersection, union, unique, reverse, shuffle, flatten, first, last, and sample',
    inputs: [
      'operation',
      'field',
      'outputField',
      'chunkSize',
      'compareArray',
      'uniqueBy',
      'depth',
      'sampleSize',
      'count'
    ],
    outputs: ['result', 'originalArray', 'modifiedArray'],
    ai_hints: {
      purpose: 'Perform common array manipulation operations like chunking, deduplication, set operations, shuffling, and sampling',
      when_to_use: 'When you need to transform or analyze arrays using standard utility operations',
      expected_edges: ['success', 'error', 'empty'],
      example_usage: '{"array-util-1": {"operation": "unique", "field": "tags", "outputField": "uniqueTags", "success?": "next"}}',
      example_config: '{"operation": "chunk|compact|difference|intersection|union|unique|reverse|shuffle|flatten|first|last|sample", "field": "string", "outputField?": "string", "chunkSize?": "number", "depth?": "number"}',
      get_from_state: [],
      post_to_state: ['arrayUtilResult']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      operation = 'unique',
      field,
      outputField,
      chunkSize = 10,
      compareArray,
      uniqueBy,
      depth = Infinity,
      sampleSize = 1,
      count = 1
    } = (config as ArrayUtilitiesNodeConfig) || {};

    // Validate required parameters
    if (!field) {
      return {
        error: () => ({
          error: 'Missing required parameter: field',
          nodeId: context.nodeId
        })
      };
    }

    // Get array from data
    const data = context.inputs?.data || context.state;
    const array = this.getNestedValue(data, field);

    if (!Array.isArray(array)) {
      return {
        error: () => ({
          error: `Field "${field}" is not an array or does not exist`,
          nodeId: context.nodeId,
          fieldValue: array,
          fieldType: typeof array
        })
      };
    }

    // Handle empty arrays
    if (array.length === 0) {
      const resultFieldName = outputField || `${field}Result`;
      const result = {
        [field]: array,
        [resultFieldName]: []
      };

      // Store in state
      context.state.arrayUtilResult = {
        operation,
        field,
        resultField: resultFieldName,
        inputLength: 0,
        outputLength: 0
      };

      return {
        empty: () => result
      };
    }

    try {
      let result: any;

      // Execute operation
      switch (operation) {
        case 'chunk':
          result = this.chunk(array, chunkSize);
          break;

        case 'compact':
          result = this.compact(array);
          break;

        case 'difference':
          if (!compareArray) {
            return {
              error: () => ({
                error: 'compareArray parameter is required for difference operation',
                nodeId: context.nodeId
              })
            };
          }
          const diffArray = this.getNestedValue(data, compareArray);
          if (!Array.isArray(diffArray)) {
            return {
              error: () => ({
                error: `compareArray "${compareArray}" is not an array`,
                nodeId: context.nodeId
              })
            };
          }
          result = this.difference(array, diffArray);
          break;

        case 'intersection':
          if (!compareArray) {
            return {
              error: () => ({
                error: 'compareArray parameter is required for intersection operation',
                nodeId: context.nodeId
              })
            };
          }
          const intersectArray = this.getNestedValue(data, compareArray);
          if (!Array.isArray(intersectArray)) {
            return {
              error: () => ({
                error: `compareArray "${compareArray}" is not an array`,
                nodeId: context.nodeId
              })
            };
          }
          result = this.intersection(array, intersectArray);
          break;

        case 'union':
          if (!compareArray) {
            return {
              error: () => ({
                error: 'compareArray parameter is required for union operation',
                nodeId: context.nodeId
              })
            };
          }
          const unionArray = this.getNestedValue(data, compareArray);
          if (!Array.isArray(unionArray)) {
            return {
              error: () => ({
                error: `compareArray "${compareArray}" is not an array`,
                nodeId: context.nodeId
              })
            };
          }
          result = this.union(array, unionArray);
          break;

        case 'unique':
          result = this.unique(array, uniqueBy);
          break;

        case 'reverse':
          result = this.reverse(array);
          break;

        case 'shuffle':
          result = this.shuffle(array);
          break;

        case 'flatten':
          result = this.flatten(array, depth);
          break;

        case 'first':
          result = this.first(array, count);
          break;

        case 'last':
          result = this.last(array, count);
          break;

        case 'sample':
          result = this.sample(array, sampleSize);
          break;

        default:
          return {
            error: () => ({
              error: `Unknown operation: ${operation}`,
              nodeId: context.nodeId,
              availableOperations: [
                'chunk', 'compact', 'difference', 'intersection', 'union',
                'unique', 'reverse', 'shuffle', 'flatten', 'first', 'last', 'sample'
              ]
            })
          };
      }

      // Prepare output
      const resultFieldName = outputField || `${field}Result`;
      const output = {
        [field]: array,
        [resultFieldName]: result
      };

      // Store in state
      context.state.arrayUtilResult = {
        operation,
        field,
        resultField: resultFieldName,
        inputLength: array.length,
        outputLength: Array.isArray(result) ? result.length : (Array.isArray(result[0]) ? result.length : 1),
        timestamp: new Date().toISOString()
      };

      return {
        success: () => ({
          ...output,
          operation,
          inputLength: array.length,
          outputLength: Array.isArray(result) ? result.length : (Array.isArray(result[0]) ? result.length : 1)
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Array operation failed',
          nodeId: context.nodeId,
          operation,
          field,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Chunk - Split array into chunks of specified size
   */
  private chunk<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
      throw new Error('Chunk size must be greater than 0');
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Compact - Remove falsy values
   */
  private compact<T>(array: T[]): T[] {
    return array.filter(item => {
      // Remove null, undefined, false, 0, "", NaN
      return item !== null && item !== undefined && item !== false && item !== 0 && item !== '' && !Number.isNaN(item);
    });
  }

  /**
   * Difference - Elements in first array but not in second
   */
  private difference<T>(array1: T[], array2: T[]): T[] {
    const set2 = new Set(array2.map(item => this.getComparisonKey(item)));
    return array1.filter(item => !set2.has(this.getComparisonKey(item)));
  }

  /**
   * Intersection - Elements present in both arrays
   */
  private intersection<T>(array1: T[], array2: T[]): T[] {
    const set2 = new Set(array2.map(item => this.getComparisonKey(item)));
    return array1.filter(item => set2.has(this.getComparisonKey(item)));
  }

  /**
   * Union - Combine arrays and remove duplicates
   */
  private union<T>(array1: T[], array2: T[]): T[] {
    const combined = [...array1, ...array2];
    return this.unique(combined);
  }

  /**
   * Unique - Remove duplicate elements
   */
  private unique<T>(array: T[], uniqueBy?: string): T[] {
    if (!uniqueBy) {
      // Simple unique using Set
      const seen = new Set<string>();
      return array.filter(item => {
        const key = this.getComparisonKey(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    // Unique by specific field
    const seen = new Set<any>();
    return array.filter(item => {
      if (typeof item !== 'object' || item === null) {
        return true;
      }
      const value = this.getNestedValue(item, uniqueBy);
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * Reverse - Reverse array order (creates new array)
   */
  private reverse<T>(array: T[]): T[] {
    return [...array].reverse();
  }

  /**
   * Shuffle - Randomly shuffle array elements (Fisher-Yates algorithm)
   */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  /**
   * Flatten - Flatten nested arrays to specified depth
   */
  private flatten(array: any[], depth: number = Infinity): any[] {
    if (depth <= 0) {
      return array;
    }

    return array.reduce((acc, item) => {
      if (Array.isArray(item)) {
        acc.push(...this.flatten(item, depth - 1));
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  }

  /**
   * First - Get first N elements
   */
  private first<T>(array: T[], count: number = 1): T[] {
    if (count <= 0) {
      return [];
    }
    return array.slice(0, count);
  }

  /**
   * Last - Get last N elements
   */
  private last<T>(array: T[], count: number = 1): T[] {
    if (count <= 0) {
      return [];
    }
    return array.slice(-count);
  }

  /**
   * Sample - Get random N elements without replacement
   */
  private sample<T>(array: T[], size: number = 1): T[] {
    if (size <= 0) {
      return [];
    }

    if (size >= array.length) {
      return [...array];
    }

    const shuffled = this.shuffle(array);
    return shuffled.slice(0, size);
  }

  /**
   * Get comparison key for an item (handles objects, arrays, primitives)
   */
  private getComparisonKey(item: any): string {
    if (item === null) return 'null';
    if (item === undefined) return 'undefined';
    if (typeof item === 'object') {
      return JSON.stringify(item);
    }
    return String(item);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

export default ArrayUtilitiesNode;
