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
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../error/ErrorHandler';

/**
 * NodeExecutor class responsible for executing individual workflow nodes
 * Handles node instantiation, execution context creation, and result processing
 */
export class NodeExecutor {
  private nodeRegistry: NodeRegistry;
  private stateManager: StateManager;
  private loopManager: LoopManager;
  private errorHandler: ErrorHandler;

  constructor(
    nodeRegistry: NodeRegistry, 
    stateManager: StateManager, 
    errorHandler?: ErrorHandler,
    loopManager?: LoopManager
  ) {
    this.nodeRegistry = nodeRegistry;
    this.stateManager = stateManager;
    this.errorHandler = errorHandler || new ErrorHandler();
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
      const error = this.errorHandler.createError(
        ErrorCategory.VALIDATION,
        'missing_node_type',
        `Node '${nodeId}' is missing required 'type' property`,
        ErrorSeverity.ERROR,
        { nodeId, executionId, workflowId }
      );
      return { error: () => error };
    }

    // Get node class from registry
    const NodeClass = this.nodeRegistry.get(nodeType);
    if (!NodeClass) {
      const error = this.errorHandler.createError(
        ErrorCategory.VALIDATION,
        'unknown_node_type',
        `Unknown node type '${nodeType}' for node '${nodeId}'`,
        ErrorSeverity.ERROR,
        { nodeId, executionId, workflowId, data: { nodeType } }
      );
      return { error: () => error };
    }

    // Create node instance
    let nodeInstance: WorkflowNode;
    try {
      nodeInstance = new (NodeClass as any)() as WorkflowNode;
    } catch (err) {
      const error = this.errorHandler.createError(
        ErrorCategory.RUNTIME,
        'node_instantiation_failed',
        `Failed to instantiate node '${nodeId}' of type '${nodeType}'`,
        ErrorSeverity.ERROR,
        { 
          nodeId, 
          executionId, 
          workflowId, 
          originalError: err instanceof Error ? err : new Error(String(err)),
          data: { nodeType } 
        }
      );
      return { error: () => error };
    }

    // Get current state
    let state: Record<string, any>;
    try {
      state = await this.stateManager.get(executionId);
    } catch (err) {
      const error = this.errorHandler.createError(
        ErrorCategory.RUNTIME,
        'state_retrieval_failed',
        `Failed to retrieve state for execution '${executionId}'`,
        ErrorSeverity.ERROR,
        { 
          nodeId, 
          executionId, 
          workflowId, 
          originalError: err instanceof Error ? err : new Error(String(err))
        }
      );
      return { error: () => error };
    }

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
      try {
        await this.stateManager.update(executionId, context.state);
      } catch (err) {
        const error = this.errorHandler.createError(
          ErrorCategory.RUNTIME,
          'state_update_failed',
          `Failed to update state for execution '${executionId}'`,
          ErrorSeverity.WARNING, // Warning because execution succeeded but state update failed
          { 
            nodeId, 
            executionId, 
            workflowId, 
            originalError: err instanceof Error ? err : new Error(String(err))
          }
        );
        // Continue with execution but include error in result
        return { 
          ...result,
          error: () => error 
        };
      }

      return result;
    } catch (err) {
      // Handle node execution error
      const error = this.errorHandler.createError(
        ErrorCategory.NODE_EXECUTION,
        'node_execution_failed',
        `Failed to execute node '${nodeId}' of type '${nodeType}': ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
        ErrorSeverity.ERROR,
        { 
          nodeId, 
          executionId, 
          workflowId, 
          originalError: err instanceof Error ? err : new Error(String(err)),
          data: { 
            nodeType,
            inputs: context.inputs 
          } 
        }
      );
      
      // Add error information to state
      context.state = {
        ...context.state,
        lastError: {
          id: error.id,
          message: error.message,
          code: error.code,
          nodeId: error.nodeId,
          timestamp: error.timestamp
        }
      };
      
      try {
        // Update state with error information
        await this.stateManager.update(executionId, context.state);
      } catch (stateErr) {
        // Log but continue if state update fails
        this.errorHandler.createError(
          ErrorCategory.RUNTIME,
          'error_state_update_failed',
          `Failed to update state with error information`,
          ErrorSeverity.WARNING,
          { 
            nodeId, 
            executionId, 
            workflowId, 
            originalError: stateErr instanceof Error ? stateErr : new Error(String(stateErr))
          }
        );
      }
      
      // Return error edge for routing
      return { error: () => error };
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
  stateManager: StateManager,
  errorHandler?: ErrorHandler
): NodeExecutor => {
  return new NodeExecutor(nodeRegistry, stateManager, errorHandler);
};