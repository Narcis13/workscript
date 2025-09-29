import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class EmptyNode extends WorkflowNode {
  metadata = {
    id: 'empty',
    name: 'Empty Node',
    version: '1.0.0',
    description: 'A node that does nothing',
    inputs: [],
    outputs: []
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
     console.warn('Executing EmptyNode - this node does nothing');
      return {
        nothing: () => ({  })
      };
    }
  
}

export default EmptyNode;