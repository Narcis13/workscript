/**
 * StateSetterNode - Universal node for setting state values via syntactic sugar
 *
 * Enables workflows to use $.path.to.state syntax for direct state manipulation
 * This is an internal node automatically used by the parser when detecting $.syntax
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class StateSetterNode extends WorkflowNode {
  metadata = {
    id: '__state_setter__',
    name: 'State Setter',
    version: '1.0.0',
    description: 'Internal node for setting nested state values via syntactic sugar ($.path.to.state)',
    inputs: ['statePath', 'value'],
    outputs: ['success', 'error'],
    ai_hints: {
      purpose: 'Set nested state values using $.path.to.state syntax',
      when_to_use: 'Automatically used by parser when $.syntax is detected in workflow definitions',
      expected_edges: ['success', 'error'],
      example_usage: '{"$.config.timeout": {"value": 30, "success?": "next-node"}}',
      example_config: '{"statePath": "string", "value": "any"}',
      get_from_state: [],
      post_to_state: ['<dynamic-path-from-config>', '_lastStateSet']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
      // Extract statePath and value from config
      const { statePath, value } = config || {};

      // Validate inputs
      if (!statePath || typeof statePath !== 'string') {
        return {
          error: () => ({
            error: 'StateSetterNode requires a valid statePath parameter',
            nodeId: context.nodeId
          })
        };
      }

      if (value === undefined) {
        return {
          error: () => ({
            error: 'StateSetterNode requires a value parameter',
            nodeId: context.nodeId,
            statePath
          })
        };
      }

      // Parse the path into segments
      const segments = statePath.split('.').filter((seg: string) => seg.length > 0);

      if (segments.length === 0) {
        return {
          error: () => ({
            error: 'Invalid state path: path cannot be empty',
            nodeId: context.nodeId,
            statePath
          })
        };
      }

      // Set the nested value in context.state
      // The ExecutionEngine will persist this via updateStateFromContext
      this.setNestedValue(context.state, segments, value);

      // Store metadata about the operation
      context.state._lastStateSet = {
        path: statePath,
        value,
        timestamp: new Date().toISOString(),
        nodeId: context.nodeId
      };

      return {
        success: () => ({
          statePath,
          value,
          message: `Successfully set state at path: ${statePath}`
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Helper method to set a nested value in an object
   * Creates intermediate objects as needed
   */
  private setNestedValue(obj: Record<string, any>, segments: string[], value: any): void {
    let current: any = obj;

    // Navigate to the parent object, creating intermediate objects as needed
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;

      // If the segment doesn't exist or isn't an object, create a new object
      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {};
      }

      current = current[segment];
    }

    // Set the final value
    const finalSegment = segments[segments.length - 1]!;
    current[finalSegment] = value;
  }
}

export default StateSetterNode;
