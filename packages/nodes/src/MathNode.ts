import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class MathNode extends WorkflowNode {
  metadata = {
    id: 'math',
    name: 'Math Operations',
    version: '1.0.0',
    description: 'Universal math node - performs basic mathematical operations',
    inputs: ['operation', 'values'],
    outputs: ['result'],
    ai_hints: {
      purpose: 'Perform mathematical operations on numeric values',
      when_to_use: 'When you need to calculate sums, differences, products, or quotients in a workflow',
      expected_edges: ['success', 'error'],
      example_usage: '{"math-1": {"operation": "add", "values": [10, 20, 30], "success?": "next-node"}}',
      example_config: '{"operation": "add|subtract|multiply|divide", "values": "[number, ...]"}',
      get_from_state: [],
      post_to_state: ['mathResult']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, values } = config || {};
    
    if (!operation || !values) {
      return {
        error: () => ({ error: 'Missing operation or values' })
      };
    }

    let result: number;
    
    try {
      switch (operation) {
        case 'add':
          result = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'subtract':
          result = values.reduce((a: number, b: number) => a - b);
          break;
        case 'multiply':
          result = values.reduce((a: number, b: number) => a * b, 1);
          break;
        case 'divide':
          result = values.reduce((a: number, b: number) => a / b);
          break;
        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }

      context.state.mathResult = result;
      
      return {
        success: () => ({ result })
      };
    } catch (error) {
      return {
        error: () => ({ error: error instanceof Error ? error.message : 'Math operation failed' })
      };
    }
  }
}

export default MathNode;