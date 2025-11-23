import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * ObjectUtilitiesNode - Provide common object manipulation utilities
 *
 * Supports operations:
 * - keys: Extract all keys from an object
 * - values: Extract all values from an object
 * - entries: Convert object to array of [key, value] pairs
 * - has_field: Check if a field exists (supports nested paths)
 * - is_empty: Check if object has no properties
 * - merge: Shallow merge two objects
 * - deep_merge: Deep merge two objects
 * - clone: Create a shallow copy of object
 * - deep_clone: Create a deep copy of object
 * - get_nested: Get value at nested path
 * - set_nested: Set value at nested path
 * - delete_nested: Delete field at nested path
 *
 * @example
 * ```json
 * {
 *   "obj-util-1": {
 *     "operation": "keys",
 *     "field": "user",
 *     "outputField": "userKeys",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
export class ObjectUtilitiesNode extends WorkflowNode {
  metadata = {
    id: 'objectUtilities',
    name: 'Object Utilities',
    version: '1.0.0',
    description: 'Universal object utilities node - provides common object manipulation operations',
    inputs: ['operation', 'field', 'outputField', 'path', 'value', 'mergeWith', 'overwrite'],
    outputs: ['result', 'found', 'not_found'],
    ai_hints: {
      purpose: 'Provide common object manipulation utilities including keys extraction, merging, cloning, and nested field operations',
      when_to_use: 'When you need to manipulate objects, extract keys/values, check field existence, merge objects, or work with nested paths',
      expected_edges: ['success', 'not_found', 'error'],
      example_usage: '{"obj-util-1": {"operation": "keys", "field": "user", "outputField": "userKeys", "success?": "next-node"}}',
      example_config: '{"operation": "keys|values|entries|has_field|is_empty|merge|deep_merge|clone|deep_clone|get_nested|set_nested|delete_nested", "field": "string", "outputField?": "string", "path?": "string", "value?": "any", "mergeWith?": "string", "overwrite?": "boolean"}',
      get_from_state: [],
      post_to_state: ['objectUtilResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, field, outputField, path, value, mergeWith, overwrite = true } = config || {};

    // Validation
    if (!operation) {
      return {
        error: () => ({ error: 'Missing required parameter: operation' })
      };
    }

    if (!field) {
      return {
        error: () => ({ error: 'Missing required parameter: field' })
      };
    }

    try {
      // Get the object from state
      const obj = this.getNestedValue(context.state, field);

      if (obj === undefined) {
        return {
          error: () => ({
            error: `Field not found: ${field}`,
            field
          })
        };
      }

      // Execute operation
      let result: any;
      let edgeName = 'success';

      switch (operation) {
        case 'keys':
          result = this.operationKeys(obj);
          break;

        case 'values':
          result = this.operationValues(obj);
          break;

        case 'entries':
          result = this.operationEntries(obj);
          break;

        case 'has_field':
          if (!path) {
            return {
              error: () => ({ error: 'Missing required parameter: path for has_field operation' })
            };
          }
          result = this.operationHasField(obj, path);
          edgeName = result ? 'success' : 'not_found';
          break;

        case 'is_empty':
          result = this.operationIsEmpty(obj);
          break;

        case 'merge':
          if (!mergeWith) {
            return {
              error: () => ({ error: 'Missing required parameter: mergeWith for merge operation' })
            };
          }
          const mergeSource = this.getNestedValue(context.state, mergeWith);
          if (mergeSource === undefined) {
            return {
              error: () => ({ error: `Merge source field not found: ${mergeWith}` })
            };
          }
          result = this.operationMerge(obj, mergeSource, overwrite);
          break;

        case 'deep_merge':
          if (!mergeWith) {
            return {
              error: () => ({ error: 'Missing required parameter: mergeWith for deep_merge operation' })
            };
          }
          const deepMergeSource = this.getNestedValue(context.state, mergeWith);
          if (deepMergeSource === undefined) {
            return {
              error: () => ({ error: `Deep merge source field not found: ${mergeWith}` })
            };
          }
          result = this.operationDeepMerge(obj, deepMergeSource, overwrite);
          break;

        case 'clone':
          result = this.operationClone(obj);
          break;

        case 'deep_clone':
          result = this.operationDeepClone(obj);
          break;

        case 'get_nested':
          if (!path) {
            return {
              error: () => ({ error: 'Missing required parameter: path for get_nested operation' })
            };
          }
          result = this.operationGetNested(obj, path);
          if (result === undefined) {
            edgeName = 'not_found';
          }
          break;

        case 'set_nested':
          if (!path) {
            return {
              error: () => ({ error: 'Missing required parameter: path for set_nested operation' })
            };
          }
          if (value === undefined) {
            return {
              error: () => ({ error: 'Missing required parameter: value for set_nested operation' })
            };
          }
          result = this.operationSetNested(obj, path, value);
          break;

        case 'delete_nested':
          if (!path) {
            return {
              error: () => ({ error: 'Missing required parameter: path for delete_nested operation' })
            };
          }
          result = this.operationDeleteNested(obj, path);
          break;

        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }

      // Store result in state
      const resultFieldName = outputField || `${field}_${operation}`;
      this.setNestedValue(context.state, resultFieldName, result);
      context.state.objectUtilResult = result;

      return {
        [edgeName]: () => ({
          result,
          operation,
          field,
          outputField: resultFieldName
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Object utilities operation failed',
          operation,
          field,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Extract all keys from an object
   */
  private operationKeys(obj: any): string[] {
    if (obj === null || typeof obj !== 'object') {
      return [];
    }
    return Object.keys(obj);
  }

  /**
   * Extract all values from an object
   */
  private operationValues(obj: any): any[] {
    if (obj === null || typeof obj !== 'object') {
      return [];
    }
    return Object.values(obj);
  }

  /**
   * Convert object to array of [key, value] pairs
   */
  private operationEntries(obj: any): Array<[string, any]> {
    if (obj === null || typeof obj !== 'object') {
      return [];
    }
    return Object.entries(obj);
  }

  /**
   * Check if a field exists (supports nested paths)
   */
  private operationHasField(obj: any, path: string): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    const segments = path.split('.');
    let current = obj;

    for (const segment of segments) {
      if (current === null || typeof current !== 'object' || !(segment in current)) {
        return false;
      }
      current = current[segment];
    }

    return true;
  }

  /**
   * Check if object has no properties
   */
  private operationIsEmpty(obj: any): boolean {
    if (obj === null || typeof obj !== 'object') {
      return true;
    }
    return Object.keys(obj).length === 0;
  }

  /**
   * Shallow merge two objects
   */
  private operationMerge(target: any, source: any, overwrite: boolean): any {
    if (typeof target !== 'object' || target === null) {
      return source;
    }
    if (typeof source !== 'object' || source === null) {
      return target;
    }

    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (overwrite || !(key in result)) {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Deep merge two objects
   */
  private operationDeepMerge(target: any, source: any, overwrite: boolean): any {
    if (typeof target !== 'object' || target === null) {
      return source;
    }
    if (typeof source !== 'object' || source === null) {
      return target;
    }

    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (overwrite || !(key in result)) {
          if (
            typeof result[key] === 'object' &&
            result[key] !== null &&
            typeof source[key] === 'object' &&
            source[key] !== null &&
            !Array.isArray(result[key]) &&
            !Array.isArray(source[key])
          ) {
            // Both are objects, merge recursively
            result[key] = this.operationDeepMerge(result[key], source[key], overwrite);
          } else {
            result[key] = source[key];
          }
        }
      }
    }

    return result;
  }

  /**
   * Create a shallow copy of object
   */
  private operationClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return [...obj];
    }

    return { ...obj };
  }

  /**
   * Create a deep copy of object (handles circular references)
   */
  private operationDeepClone(obj: any, seen = new WeakMap()): any {
    // Handle primitives
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle circular references
    if (seen.has(obj)) {
      return seen.get(obj);
    }

    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    // Handle RegExp
    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags);
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      const arrCopy: any[] = [];
      seen.set(obj, arrCopy);
      obj.forEach((item, index) => {
        arrCopy[index] = this.operationDeepClone(item, seen);
      });
      return arrCopy;
    }

    // Handle Objects
    const objCopy: Record<string, any> = {};
    seen.set(obj, objCopy);

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        objCopy[key] = this.operationDeepClone(obj[key], seen);
      }
    }

    return objCopy;
  }

  /**
   * Get value at nested path
   */
  private operationGetNested(obj: any, path: string): any {
    if (obj === null || typeof obj !== 'object') {
      return undefined;
    }

    const segments = path.split('.');
    let current = obj;

    for (const segment of segments) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }

  /**
   * Set value at nested path (creates intermediate objects)
   */
  private operationSetNested(obj: any, path: string, value: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Create a copy to avoid mutation
    const result = this.operationDeepClone(obj);

    const segments = path.split('.');
    let current = result;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;

      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {};
      }

      current = current[segment];
    }

    const finalSegment = segments[segments.length - 1]!;
    current[finalSegment] = value;

    return result;
  }

  /**
   * Delete field at nested path
   */
  private operationDeleteNested(obj: any, path: string): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Create a copy to avoid mutation
    const result = this.operationDeepClone(obj);

    const segments = path.split('.');
    let current = result;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;

      if (current === null || typeof current !== 'object' || !(segment in current)) {
        // Path doesn't exist, return as is
        return result;
      }

      current = current[segment];
    }

    const finalSegment = segments[segments.length - 1]!;
    if (current !== null && typeof current === 'object' && finalSegment in current) {
      delete current[finalSegment];
    }

    return result;
  }

  /**
   * Helper method to get a nested value from an object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, keyPath: string): any {
    const keys = keyPath.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Helper method to set a nested value in an object using dot notation
   */
  private setNestedValue(obj: Record<string, any>, keyPath: string, value: any): void {
    const keys = keyPath.split('.');
    let current: any = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;

      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }

      current = current[key];
    }

    const finalKey = keys[keys.length - 1]!;
    current[finalKey] = value;
  }
}

export default ObjectUtilitiesNode;
