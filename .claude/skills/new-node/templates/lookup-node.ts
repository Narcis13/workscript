/**
 * Lookup Node Template
 *
 * Pattern: found/not_found/error
 * Use case: Search operations where item may or may not exist
 *
 * INSTRUCTIONS:
 * 1. Replace [NodeName] with your node class name (PascalCase)
 * 2. Replace [nodeId] with unique identifier (camelCase or kebab-case)
 * 3. Implement the lookup logic
 * 4. Export in /packages/nodes/src/index.ts
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface
interface [NodeName]Config {
  key: string;
  source?: Record<string, unknown> | unknown[];
  field?: string;
}

/**
 * [NodeName] - Looks up data and routes based on whether it was found
 *
 * Searches for data in a source (state, array, or object) and
 * routes to found or not_found edge based on result.
 *
 * @example
 * ```json
 * {
 *   "[nodeId]-1": {
 *     "key": "userId123",
 *     "source": "$.users",
 *     "field": "id",
 *     "found?": "process-user",
 *     "not_found?": "create-user",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 */
export class [NodeName] extends WorkflowNode {
  metadata = {
    id: '[nodeId]',
    name: '[Node Name]',
    version: '1.0.0',
    description: 'Looks up data and routes based on found/not_found result',
    inputs: ['key', 'source', 'field'],
    outputs: ['result', 'value'],
    ai_hints: {
      purpose: 'Search for data and route based on existence',
      when_to_use: 'When you need to find data and handle both found and not found cases',
      expected_edges: ['found', 'not_found', 'error'],
      example_usage: '{"[nodeId]-1": {"key": "searchValue", "source": "$.data", "found?": "process"}}',
      example_config: '{"key": "string", "source?": "object|array", "field?": "string"}',
      get_from_state: [],
      post_to_state: ['[nodeId]Found', '[nodeId]Value']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { key, source, field } = (config as [NodeName]Config) || {};

    // ============================================
    // VALIDATION
    // ============================================
    if (!key) {
      return {
        error: () => ({
          error: 'Missing required parameter: key',
          nodeId: context.nodeId
        })
      };
    }

    // ============================================
    // BUSINESS LOGIC - Perform lookup
    // ============================================
    try {
      const lookupSource = source || context.state;
      const result = this.performLookup(key, lookupSource, field);

      // ============================================
      // RETURN APPROPRIATE SINGLE EDGE
      // ============================================
      if (result.found) {
        context.state.[nodeId]Found = true;
        context.state.[nodeId]Value = result.value;

        return {
          found: () => ({
            found: true,
            key,
            value: result.value
          })
        };
      } else {
        context.state.[nodeId]Found = false;
        context.state.[nodeId]Value = null;

        return {
          not_found: () => ({
            found: false,
            key,
            searchedIn: typeof lookupSource
          })
        };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Lookup failed',
          nodeId: context.nodeId,
          key
        })
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private performLookup(
    key: string,
    source: unknown,
    field?: string
  ): { found: boolean; value: unknown } {
    // Handle array lookup
    if (Array.isArray(source)) {
      if (field) {
        // Search array of objects by field
        const item = source.find((item) =>
          typeof item === 'object' && item !== null && (item as Record<string, unknown>)[field] === key
        );
        return { found: item !== undefined, value: item };
      } else {
        // Search array for value
        const found = source.includes(key);
        return { found, value: found ? key : undefined };
      }
    }

    // Handle object lookup
    if (typeof source === 'object' && source !== null) {
      const obj = source as Record<string, unknown>;
      if (key in obj) {
        return { found: true, value: obj[key] };
      }
      return { found: false, value: undefined };
    }

    // Invalid source type
    throw new Error(`Invalid source type: ${typeof source}. Expected object or array.`);
  }
}

export default [NodeName];
