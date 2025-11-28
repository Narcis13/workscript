/**
 * Boolean Node Template
 *
 * Pattern: true/false/error
 * Use case: Conditional logic with true/false outcomes
 *
 * INSTRUCTIONS:
 * 1. Replace [NodeName] with your node class name (PascalCase)
 * 2. Replace [nodeId] with unique identifier (camelCase or kebab-case)
 * 3. Update the condition evaluation logic
 * 4. Export in /packages/nodes/src/index.ts
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface
interface [NodeName]Config {
  operation: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'isEmpty';
  value1: unknown;
  value2?: unknown;
}

/**
 * [NodeName] - Evaluates conditions and returns true or false
 *
 * Routes workflow based on boolean evaluation of conditions.
 * Supports multiple comparison operations.
 *
 * @example
 * ```json
 * {
 *   "[nodeId]-1": {
 *     "operation": "greaterThan",
 *     "value1": "$.count",
 *     "value2": 10,
 *     "true?": "process-large",
 *     "false?": "process-small",
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
    description: 'Evaluates conditions and routes based on true/false result',
    inputs: ['operation', 'value1', 'value2'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Evaluate boolean conditions for workflow routing',
      when_to_use: 'When you need conditional branching based on comparisons',
      expected_edges: ['true', 'false', 'error'],
      example_usage: '{"[nodeId]-1": {"operation": "equals", "value1": "$.status", "value2": "active", "true?": "process"}}',
      example_config: '{"operation": "equals|notEquals|greaterThan|lessThan|contains|isEmpty", "value1": "any", "value2?": "any"}',
      get_from_state: [],
      post_to_state: ['[nodeId]Result']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { operation, value1, value2 } = (config as [NodeName]Config) || {};

    // ============================================
    // VALIDATION - Return error edge immediately
    // ============================================
    if (!operation) {
      return {
        error: () => ({
          error: 'Missing required parameter: operation',
          nodeId: context.nodeId
        })
      };
    }

    if (value1 === undefined) {
      return {
        error: () => ({
          error: 'Missing required parameter: value1',
          nodeId: context.nodeId
        })
      };
    }

    // ============================================
    // BUSINESS LOGIC - Evaluate condition
    // ============================================
    try {
      const result = this.evaluateCondition(operation, value1, value2);

      // Store result in state
      context.state.[nodeId]Result = result;

      // ============================================
      // RETURN APPROPRIATE SINGLE EDGE
      // ============================================
      if (result) {
        return {
          true: () => ({
            result: true,
            operation,
            value1,
            value2
          })
        };
      } else {
        return {
          false: () => ({
            result: false,
            operation,
            value1,
            value2
          })
        };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Condition evaluation failed',
          nodeId: context.nodeId,
          operation
        })
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private evaluateCondition(operation: string, value1: unknown, value2?: unknown): boolean {
    switch (operation) {
      case 'equals':
        return value1 === value2;

      case 'notEquals':
        return value1 !== value2;

      case 'greaterThan':
        return Number(value1) > Number(value2);

      case 'lessThan':
        return Number(value1) < Number(value2);

      case 'contains':
        if (typeof value1 === 'string') {
          return value1.includes(String(value2));
        }
        if (Array.isArray(value1)) {
          return value1.includes(value2);
        }
        return false;

      case 'isEmpty':
        if (value1 === null || value1 === undefined) return true;
        if (typeof value1 === 'string') return value1.length === 0;
        if (Array.isArray(value1)) return value1.length === 0;
        if (typeof value1 === 'object') return Object.keys(value1).length === 0;
        return false;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

export default [NodeName];
