import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class LogicNode extends WorkflowNode {
  metadata = {
    id: 'logic',
    name: 'Logic Operations',
    version: '1.0.0',
    description: 'Universal logic node - performs boolean logic operations',
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

    let result: boolean;
    
    try {
      switch (operation) {
        case 'and':
          result = values.every((value: any) => Boolean(value));
          break;
        case 'or':
          result = values.some((value: any) => Boolean(value));
          break;
        case 'not':
          result = !Boolean(values[0]);
          break;
        case 'equal':
          result = values.length > 1 && values[0] === values[1];
          break;
        case 'greater':
          result = values.length > 1 && values[0] > values[1];
          break;
        case 'less':
          result = values.length > 1 && values[0] < values[1];
          break;
        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }

      context.state.logicResult = result;
      
      return {
        [result ? 'true' : 'false']: () => ({ result })
      };
    } catch (error) {
      return {
        error: () => ({ error: error instanceof Error ? error.message : 'Logic operation failed' })
      };
    }
  }
}