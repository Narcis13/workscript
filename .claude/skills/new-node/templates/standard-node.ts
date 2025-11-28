/**
 * Standard Node Template
 *
 * Pattern: success/error
 * Use case: Basic operations with success or failure outcomes
 *
 * INSTRUCTIONS:
 * 1. Replace [NodeName] with your node class name (PascalCase)
 * 2. Replace [nodeId] with unique identifier (camelCase or kebab-case)
 * 3. Replace [Node Name] with human-readable name
 * 4. Update inputs, outputs, and ai_hints
 * 5. Implement business logic in execute()
 * 6. Export in /packages/nodes/src/index.ts
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface for type safety
interface [NodeName]Config {
  param1: string;           // Required parameter
  param2?: number;          // Optional parameter
}

/**
 * [NodeName] - Brief description of what this node does
 *
 * Detailed description explaining:
 * - What the node does
 * - When to use it
 * - Key behaviors
 *
 * @example
 * ```json
 * {
 *   "[nodeId]-1": {
 *     "param1": "value",
 *     "param2": 42,
 *     "success?": "next-node",
 *     "error?": "error-handler"
 *   }
 * }
 * ```
 */
export class [NodeName] extends WorkflowNode {
  metadata = {
    id: '[nodeId]',
    name: '[Node Name]',
    version: '1.0.0',
    description: 'Brief description of what this node does',
    inputs: ['param1', 'param2'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Brief purpose statement (1 sentence)',
      when_to_use: 'When you need to [specific use case]',
      expected_edges: ['success', 'error'],
      example_usage: '{"[nodeId]-1": {"param1": "value", "success?": "next-node"}}',
      example_config: '{"param1": "string", "param2?": "number"}',
      get_from_state: [],
      post_to_state: ['[nodeId]Result']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { param1, param2 } = (config as [NodeName]Config) || {};

    // ============================================
    // VALIDATION - Return error edge immediately
    // ============================================
    if (!param1) {
      return {
        error: () => ({
          error: 'Missing required parameter: param1',
          nodeId: context.nodeId
        })
      };
    }

    // ============================================
    // BUSINESS LOGIC - Wrap in try-catch
    // ============================================
    try {
      // Your implementation here
      const result = await this.processData(param1, param2);

      // ============================================
      // STATE MUTATION - Update shared state
      // ============================================
      context.state.[nodeId]Result = result;

      // ============================================
      // RETURN SINGLE SUCCESS EDGE
      // ============================================
      return {
        success: () => ({
          result,
          message: 'Operation completed successfully'
        })
      };

    } catch (error) {
      // ============================================
      // RETURN SINGLE ERROR EDGE from catch
      // ============================================
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  // ============================================
  // HELPER METHODS - Keep execute() clean
  // ============================================
  private async processData(param1: string, param2?: number): Promise<any> {
    // Implementation details
    // Replace with actual logic
    return { processed: param1, multiplier: param2 || 1 };
  }
}

export default [NodeName];
