import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class MathNode extends WorkflowNode {
  metadata = {
    id: 'math',
    name: 'Math Operations',
    version: '1.0.0',
    description: 'Universal math node - performs basic mathematical operations',
    inputs: ['operation', 'values'],
    outputs: ['result']
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