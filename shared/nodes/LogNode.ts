import { WorkflowNode } from '../src/types';
import type { ExecutionContext, EdgeMap } from '../src/types';

export class LogNode extends WorkflowNode {
  metadata = {
    id: 'log',
    name: 'Log Node',
    version: '1.0.0',
    description: 'A node that logs messages with state resolution support',
    inputs: ['message'],
    outputs: ['message'],
    ai_hints: {
      purpose: 'Log messages to console for debugging and monitoring workflow execution',
      when_to_use: 'When you need to output debugging information or track workflow progress',
      expected_edges: ['success'],
      example_usage: '{"log-1": {"message": "Processing started", "success?": "next-node"}}',
      example_config: '{"message": "string"}',
      get_from_state: [],
      post_to_state: ['lastLoggedMessage', 'logNodeExecuted']
    }
  };

  async execute(context: ExecutionContext,config?: any): Promise<EdgeMap> {
    const { message } = config || {};

    // Log the resolved message
    console.log('📝 Log Node Message:', message, context.state);

    // Store the logged message in state for potential use by other nodes
    context.state.lastLoggedMessage = message;
    context.state.logNodeExecuted = true;

    return {
      success: () => ({ message })
    };
  }

}

export default LogNode;