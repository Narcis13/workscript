import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

export class LogNode extends WorkflowNode {
  metadata = {
    id: 'log',
    name: 'Log Node',
    version: '1.0.0',
    description: 'A node that logs context.inputs',
    inputs: [],
    outputs: []
  };

  async execute(context: ExecutionContext): Promise<EdgeMap> {
    console.log('Logging context.inputs:', context.state.developer);
    return {
      nothing: () => ({  })
    };
  }

}

export default LogNode;