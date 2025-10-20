import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class EmptyNode extends WorkflowNode {
  metadata = {
    id: 'empty',
    name: 'Empty Node',
    version: '1.0.0',
    description: 'A node that does nothing',
    inputs: [],
    outputs: [],
    ai_hints: {
      purpose: 'Placeholder node that performs no operation',
      when_to_use: 'For testing workflows, as a no-op placeholder, or for demonstration purposes',
      expected_edges: ['nothing'],
      example_usage: '{"empty-1": {"nothing?": "next-node"}}',
      example_config: '{}',
      get_from_state: [],
      post_to_state: []
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
     console.warn('Executing EmptyNode - this node print state and inputs');
     console.log('Current state:', context.state);
     console.log('Current inputs:', context.inputs);
      return {
        nothing: () => ({ luckyNumber: 13 })
      };
    }
  
}

export default EmptyNode;