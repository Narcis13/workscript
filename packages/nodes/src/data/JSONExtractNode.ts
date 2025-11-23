import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * JSONExtractNode - Universal node for extracting values from JSON/objects
 *
 * Supports multiple extraction methods:
 * - dot_notation: Simple dot notation path access (e.g., "user.profile.name")
 * - bracket_notation: Bracket notation with array indices (e.g., "users[0].name")
 * - simple_path: Combination of dot and bracket notation
 *
 * @example
 * ```json
 * {
 *   "extract-1": {
 *     "method": "dot_notation",
 *     "path": "user.profile.name",
 *     "outputField": "userName",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
export class JSONExtractNode extends WorkflowNode {
  metadata = {
    id: 'jsonExtract',
    name: 'JSON Extract',
    version: '1.0.0',
    description: 'Universal node for extracting values from JSON/objects using various query methods',
    inputs: ['method', 'path', 'fallbackValue', 'multiple', 'outputField'],
    outputs: ['result', 'value'],
    ai_hints: {
      purpose: 'Extract values from JSON/objects using dot notation, bracket notation, or path expressions',
      when_to_use: 'When you need to extract specific values from nested objects or arrays in workflow data',
      expected_edges: ['success', 'not_found', 'error'],
      example_usage: '{"extract-1": {"method": "dot_notation", "path": "user.profile.name", "outputField": "userName", "success?": "next-node"}}',
      example_config: '{"method": "dot_notation|bracket_notation|simple_path", "path": "string", "fallbackValue?": "any", "multiple?": "boolean", "outputField?": "string"}',
      get_from_state: [],
      post_to_state: ['extractedValue']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const {
      method = 'dot_notation',
      path,
      fallbackValue,
      multiple = false,
      outputField = 'extractedValue'
    } = config || {};

    // Validation
    if (!path) {
      return {
        error: () => ({
          error: 'Missing required parameter: path',
          nodeId: context.nodeId
        })
      };
    }

    // Get the data to extract from (prefer inputs.data, fallback to entire state)
    const sourceData = context.inputs.data !== undefined ? context.inputs.data : context.state;

    if (sourceData === null || sourceData === undefined) {
      // Use fallback value if provided
      if (fallbackValue !== undefined) {
        context.state[outputField] = fallbackValue;
        return {
          not_found: () => ({
            value: fallbackValue,
            path,
            usedFallback: true,
            message: 'Path not found, used fallback value'
          })
        };
      }

      return {
        not_found: () => ({
          error: 'No data available to extract from',
          path,
          nodeId: context.nodeId
        })
      };
    }

    try {
      let extractedValue: any;

      switch (method) {
        case 'dot_notation':
          extractedValue = this.extractByDotNotation(sourceData, path);
          break;

        case 'bracket_notation':
          extractedValue = this.extractByBracketNotation(sourceData, path);
          break;

        case 'simple_path':
          extractedValue = this.extractBySimplePath(sourceData, path);
          break;

        default:
          return {
            error: () => ({
              error: `Unknown method: ${method}`,
              supportedMethods: ['dot_notation', 'bracket_notation', 'simple_path'],
              nodeId: context.nodeId
            })
          };
      }

      // Check if value was found
      if (extractedValue === undefined) {
        if (fallbackValue !== undefined) {
          extractedValue = fallbackValue;
          context.state[outputField] = extractedValue;

          return {
            not_found: () => ({
              value: extractedValue,
              path,
              usedFallback: true,
              message: 'Path not found, used fallback value'
            })
          };
        }

        return {
          not_found: () => ({
            path,
            method,
            message: 'Path not found and no fallback value provided',
            nodeId: context.nodeId
          })
        };
      }

      // Store extracted value in state
      context.state[outputField] = extractedValue;

      return {
        success: () => ({
          value: extractedValue,
          path,
          method,
          outputField,
          message: 'Successfully extracted value'
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Extraction failed',
          path,
          method,
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Extract value using dot notation (e.g., "user.profile.name")
   */
  private extractByDotNotation(obj: any, path: string): any {
    if (!path) return obj;

    const keys = path.split('.').filter(k => k.length > 0);
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object') {
        return undefined;
      }

      current = current[key];
    }

    return current;
  }

  /**
   * Extract value using bracket notation (e.g., "users[0].name" or "data['key']")
   */
  private extractByBracketNotation(obj: any, path: string): any {
    if (!path) return obj;

    let current = obj;

    // Match both array indices [0] and object keys ['key'] or ["key"]
    const pattern = /([^\[\]]+)|\[([^\]]+)\]/g;
    let match;

    while ((match = pattern.exec(path)) !== null) {
      const key = match[1] || match[2];

      if (!key) continue;

      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object') {
        return undefined;
      }

      // Remove quotes if present
      const cleanKey = key.replace(/^['"]|['"]$/g, '');

      // Try to parse as number for array access
      const numKey = parseInt(cleanKey, 10);
      if (!isNaN(numKey) && Array.isArray(current)) {
        current = current[numKey];
      } else {
        current = current[cleanKey];
      }
    }

    return current;
  }

  /**
   * Extract value using simple path (combination of dot and bracket notation)
   * Supports: "user.profile.name", "users[0].name", "data['key'].value"
   */
  private extractBySimplePath(obj: any, path: string): any {
    if (!path) return obj;

    let current = obj;

    // Split by dots but preserve bracket notation
    const segments = path.match(/([^.\[\]]+|\[[^\]]+\])/g);

    if (!segments) {
      return undefined;
    }

    for (let segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object') {
        return undefined;
      }

      // Handle bracket notation
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const key = segment.slice(1, -1).replace(/^['"]|['"]$/g, '');
        const numKey = parseInt(key, 10);

        if (!isNaN(numKey) && Array.isArray(current)) {
          current = current[numKey];
        } else {
          current = current[key];
        }
      } else {
        // Handle dot notation
        current = current[segment];
      }
    }

    return current;
  }
}

export default JSONExtractNode;
