import { WorkflowNode } from 'shared/dist';
import type { 
  ExecutionContext, 
  EdgeMap,
  NodeConfiguration 
} from 'shared/dist';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { LoopManager } from './LoopManager';
import { v4 as uuidv4 } from 'uuid';

/**
 * NodeExecutor class responsible for executing individual workflow nodes
 * Handles node instantiation, execution context creation, and result processing
 */
export class NodeExecutor {
  private nodeRegistry: NodeRegistry;
  private stateManager: StateManager;
  private loopManager: LoopManager;

  constructor(nodeRegistry: NodeRegistry, stateManager: StateManager, loopManager?: LoopManager) {
    this.nodeRegistry = nodeRegistry;
    this.stateManager = stateManager;
    this.loopManager = loopManager || new LoopManager();
  }

  /**
   * Executes a single node in the workflow
   * @param nodeId - ID of the node in the workflow
   * @param nodeConfig - Node configuration from workflow definition
   * @param workflowId - ID of the workflow being executed
   * @param executionId - Unique execution instance ID
   * @param inputs - Input data for the node
   * @returns EdgeMap result from node execution
   */
  async executeNode(
    nodeId: string,
    nodeConfig: NodeConfiguration,
    workflowId: string,
    executionId: string,
    inputs: Record<string, any> = {}
  ): Promise<EdgeMap> {
    // Validate node type exists
    const nodeType = nodeConfig.type;
    if (!nodeType) {
      throw new Error(`Node '${nodeId}' is missing required 'type' property`);
    }

    // Get node class from registry
    const NodeClass = this.nodeRegistry.get(nodeType);
    if (!NodeClass) {
      throw new Error(`Unknown node type '${nodeType}' for node '${nodeId}'`);
    }

    // Create node instance
    const nodeInstance = new (NodeClass as any)() as WorkflowNode;

    // Get current state
    const state = await this.stateManager.get(executionId);

    // Create execution context
    const context: ExecutionContext = {
      state,
      inputs,
      workflowId,
      nodeId,
      executionId
    };

    try {
      // Execute the node with its configuration
      const result = await nodeInstance.execute(context, nodeConfig.config);

      // Update state if it was modified
      // Note: In a real implementation, we might want to track state changes
      // more explicitly or use a proxy to detect modifications
      await this.stateManager.update(executionId, context.state);

      return result;
    } catch (error) {
      // Wrap and rethrow with context
      throw new Error(
        `Failed to execute node '${nodeId}' of type '${nodeType}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Creates a new execution context for a workflow
   * @param workflowId - ID of the workflow
   * @param initialState - Initial state for the execution
   * @returns New execution ID
   */
  async createExecution(
    workflowId: string,
    initialState?: Record<string, any>
  ): Promise<string> {
    const executionId = this.generateExecutionId();
    await this.stateManager.initialize(executionId, initialState);
    return executionId;
  }

  /**
   * Completes an execution and schedules cleanup
   * @param executionId - ID of the execution to complete
   * @param cleanupDelay - Delay before cleanup in milliseconds
   */
  async completeExecution(
    executionId: string,
    cleanupDelay?: number
  ): Promise<void> {
    // Clean up loop state
    this.loopManager.cleanup(executionId);
    
    // Schedule state cleanup
    this.stateManager.scheduleCleanup(executionId, cleanupDelay);
  }

  /**
   * Gets the final state of an execution
   * @param executionId - ID of the execution
   * @returns Final state
   */
  async getFinalState(executionId: string): Promise<Record<string, any>> {
    return await this.stateManager.get(executionId);
  }

  /**
   * Gets the loop manager instance
   * @returns Loop manager
   */
  getLoopManager(): LoopManager {
    return this.loopManager;
  }

  /**
   * Generates a unique execution ID
   * @returns UUID v4 execution ID
   */
  private generateExecutionId(): string {
    return `exec_${uuidv4()}`;
  }
}

// Export singleton instance
export const createNodeExecutor = (
  nodeRegistry: NodeRegistry,
  stateManager: StateManager
): NodeExecutor => {
  return new NodeExecutor(nodeRegistry, stateManager);
};