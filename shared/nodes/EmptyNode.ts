import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

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
    
      return {
        nothing: () => ({  })
      };
    }
  
}

export default EmptyNode;