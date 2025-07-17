import { WorkflowNode } from 'shared/dist';
import type { NodeMetadata, ExecutionContext, EdgeMap } from 'shared/dist';

/**
 * LogNode - A simple node that logs messages to the console
 * Demonstrates basic node implementation
 */
export class LogNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'log',
    name: 'Log Node',
    version: '1.0.0',
    description: 'Logs a message to the console',
    inputs: ['message', 'level'],
    outputs: ['success', 'error']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    try {
      const message = config?.message || context.inputs?.message || 'No message provided';
      const level = config?.level || context.inputs?.level || 'info';

      // Log based on level
      switch (level.toLowerCase()) {
        case 'error':
          console.error(`[${context.nodeId}] ERROR: ${message}`);
          break;
        case 'warn':
          console.warn(`[${context.nodeId}] WARN: ${message}`);
          break;
        case 'debug':
          console.debug(`[${context.nodeId}] DEBUG: ${message}`);
          break;
        default:
          console.log(`[${context.nodeId}] INFO: ${message}`);
      }

      // Return success edge
      return { success: true };
    } catch (error) {
      console.error(`[${context.nodeId}] Failed to log message:`, error);
      return { error: true };
    }
  }
}