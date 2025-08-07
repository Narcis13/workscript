/**
 * ExecutionEngine - Core workflow execution orchestration
 * 
 * Implements Requirements:
 * - Requirement 3: Access to execution context during node execution
 * - Requirement 10: Execute workflows reliably with proper error handling
 */

// Conditional import for Node.js crypto module
let randomUUID: () => string;
if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
  // Browser environment - use Web Crypto API or fallback
  randomUUID = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36);
} else {
  // Server environment
  randomUUID = require('crypto').randomUUID;
}
import type { 
  ExecutionContext, 
  ExecutionResult, 
  EdgeMap 
} from '../types';
import type { ParsedWorkflow, ParsedNode, ParsedEdge } from '../parser/WorkflowParser';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';

export interface NodeExecutionResult {
  edge: string | null;
  data: any;
}

export interface ExecutionPlan {
  type: 'continue' | 'jump' | 'sequence' | 'nested' | 'end';
  targetIndex?: number;
  steps?: ExecutionStep[];
  config?: any;
}

export interface ExecutionStep {
  type: 'node' | 'nested';
  nodeId?: string;
  config?: any;
}

export class ExecutionEngineError extends Error {
  constructor(
    message: string,
    public executionId: string,
    public nodeId?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ExecutionEngineError';
  }
}

export class LoopLimitError extends ExecutionEngineError {
  constructor(executionId: string, nodeId: string) {
    super(`Loop limit exceeded for node: ${nodeId}`, executionId, nodeId);
    this.name = 'LoopLimitError';
  }
}

export class ExecutionEngine {
  private static readonly MAX_LOOP_ITERATIONS = 1000;
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(
    private registry: NodeRegistry,
    private stateManager: StateManager
  ) {}

  /**
   * Execute a parsed workflow
   * Requirement 10.1: WHEN executing a workflow THEN it must process nodes in the defined sequence
   */
  async execute(workflow: ParsedWorkflow): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();
    
    try {
      // Initialize state with workflow initial state
      await this.stateManager.initialize(executionId, workflow.initialState || {});

      // Create initial execution context
      const context = this.createInitialContext(workflow, executionId);

      // Execute nodes sequentially with edge routing
      await this.executeWorkflowSequence(workflow, context);

      // Get final state
      const finalState = await this.stateManager.getState(executionId);
      
      return {
        executionId,
        workflowId: workflow.id,
        status: 'completed',
        finalState,
        startTime,
        endTime: new Date()
      };

    } catch (error) {
      return {
        executionId,
        workflowId: workflow.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime,
        endTime: new Date()
      };
    } finally {
      // Schedule cleanup after a delay to allow for result retrieval
      setTimeout(() => {
        this.stateManager.cleanup(executionId).catch(console.error);
      }, 60000); // 1 minute delay
    }
  }

  /**
   * Create initial execution context
   * Requirement 3.2: WHEN accessing context THEN it must provide state, inputs, workflowId, nodeId, and executionId
   */
  private createInitialContext(
    workflow: ParsedWorkflow, 
    executionId: string
  ): ExecutionContext {
    return {
      state: {},
      inputs: {},
      workflowId: workflow.id,
      nodeId: '',
      executionId
    };
  }

  /**
   * Execute the main workflow sequence
   * Requirement 10.2: WHEN a node completes THEN it must route based on the returned edge
   */
  private async executeWorkflowSequence(
    workflow: ParsedWorkflow,
    context: ExecutionContext
  ): Promise<void> {
    let currentIndex = 0;
    const loopCounts = new Map<string, number>();

    while (currentIndex < workflow.nodes.length) {
      const node = workflow.nodes[currentIndex];
      if (!node) {
        throw new ExecutionEngineError(
          `Node not found at index ${currentIndex}`,
          context.executionId
        );
      }
      
      // Check for loop node (ending with '...')
      const isLoopNode = node.nodeId.endsWith('...');
      if (isLoopNode) {
        const baseNodeId = node.nodeId.slice(0, -3);
        const loopCount = loopCounts.get(baseNodeId) || 0;
        
        if (loopCount >= ExecutionEngine.MAX_LOOP_ITERATIONS) {
          throw new LoopLimitError(context.executionId, node.nodeId);
        }
        
        loopCounts.set(baseNodeId, loopCount + 1);
      }

      // Execute the current node
      const result = await this.executeNode(node, context);

      // Handle edge routing
      const nextIndex = await this.resolveEdgeRoute(
        result, 
        node, 
        workflow, 
        currentIndex,
        context
      );

      if (nextIndex === -1) {
        // End execution
        break;
      }

      // Reset loop counter if we're not returning to the same loop node
      if (isLoopNode && nextIndex !== currentIndex) {
        const baseNodeId = node.nodeId.slice(0, -3);
        loopCounts.delete(baseNodeId);
      }

      currentIndex = nextIndex;
    }
  }

  /**
   * Execute a single node
   * Requirement 3.1: WHEN a node executes THEN it must receive an ExecutionContext object
   */
  private async executeNode(
    node: ParsedNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // Get node instance from registry (strip ... suffix for loop nodes)
      const nodeTypeId = node.isLoopNode ? node.baseNodeType : node.nodeId;
      const instance = this.registry.getInstance(nodeTypeId);
      
      // Update context for this node execution
      const nodeContext: ExecutionContext = {
        ...context,
        nodeId: node.nodeId,
        state: await this.stateManager.getState(context.executionId),
        inputs: await this.prepareNodeInputs(context.executionId, node)
      };

      // Execute the node
      const edgeMap = await instance.execute(nodeContext, node.config);
      
      // Determine which edge was taken
      const edgeResult = await this.processEdgeMap(edgeMap, nodeContext);
      
      // Update state with any changes from node execution
      await this.updateStateFromContext(context.executionId, nodeContext);

      return edgeResult;

    } catch (error) {
      // Check if node has error edge route
      if (node.edges.error && node.edges.error.type === 'simple' && node.edges.error.target) {
        return { 
          edge: 'error', 
          data: { 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        };
      }
      throw new ExecutionEngineError(
        `Node execution failed: ${node.nodeId} - ${error instanceof Error ? error.message : String(error)}`,
        context.executionId,
        node.nodeId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Process the EdgeMap returned by a node to determine the edge taken
   * Optimized for single-edge pattern (99% use case)
   */
  private async processEdgeMap(
    edgeMap: EdgeMap, 
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const edgeEntries = Object.entries(edgeMap);
    
    // Design validation: warn if multiple edges are returned (indicates non-standard pattern)
    if (edgeEntries.length > 1) {
      console.warn(`Node ${context.nodeId} returned ${edgeEntries.length} edges. Consider using single-edge pattern for better performance.`);
    }
    
    // Process edges - optimized for single edge case
    for (const [edgeName, edgeFunction] of edgeEntries) {
      if (typeof edgeFunction === 'function') {
        try {
          const data = await edgeFunction(context);
          if (data !== undefined) {
            // Store edge data for next node if provided
            if (data && typeof data === 'object') {
              await this.stateManager.setEdgeContext(context.executionId, data);
            }
            return { edge: edgeName, data };
          }
        } catch (error) {
          console.warn(`Edge function ${edgeName} failed:`, error);
          continue;
        }
      }
    }

    // No edge taken - continue sequential execution
    return { edge: null, data: null };
  }

  /**
   * Resolve edge routing to determine next execution step
   * Requirement 10.2: WHEN a node completes THEN it must route based on the returned edge
   */
  private async resolveEdgeRoute(
    result: NodeExecutionResult,
    node: ParsedNode,
    workflow: ParsedWorkflow,
    currentIndex: number,
    context: ExecutionContext
  ): Promise<number> {
    const isLoopNode = node.nodeId.endsWith('...');
    
    // No edge taken - continue to next node
    if (!result.edge) {
      return currentIndex + 1;
    }

    // Check if this edge has a configuration in the node
    const parsedEdge = node.edges[result.edge];
    
    if (!parsedEdge) {
      // Edge has no configuration - for loop nodes, this means exit the loop
      // For regular nodes, just continue
      return currentIndex + 1;
    }

    // Execute the edge configuration
    switch (parsedEdge.type) {
      case 'simple':
        // Direct node reference - first try to find in workflow nodes
        if (parsedEdge.target) {
          const targetIndex = workflow.nodes.findIndex(n => n.nodeId === parsedEdge.target);
          if (targetIndex >= 0) {
            return targetIndex;
          }
          
          // If not found in workflow, execute from Registry
          if (this.registry.hasNode(parsedEdge.target)) {
            await this.executeNodeFromRegistry(parsedEdge.target, context);
          }
        }
        break;

      case 'sequence':
        // Execute sequence of nodes/configs
        if (parsedEdge.sequence) {
          await this.executeSequenceFromParsedEdge(parsedEdge.sequence, context);
        }
        break;

      case 'nested':
        // Execute nested node from AST
        if (parsedEdge.nestedNode) {
          await this.executeNestedNode(parsedEdge.nestedNode, context);
        }
        break;
    }

    // For loop nodes, after executing the edge configuration, loop back to same node
    // For regular nodes, continue to next node
    if (isLoopNode) {
      return currentIndex; // Loop back to same node for any followed edge
    }
    
    return currentIndex + 1;
  }

  /**
   * Execute a single node directly from Registry
   */
  private async executeNodeFromRegistry(
    nodeId: string,
    context: ExecutionContext
  ): Promise<void> {
    const instance = this.registry.getInstance(nodeId);
    const nodeContext = {
      ...context,
      nodeId,
      state: await this.stateManager.getState(context.executionId),
      inputs: await this.stateManager.getAndClearEdgeContext(context.executionId) || {}
    };
    
    await instance.execute(nodeContext, {});
    await this.updateStateFromContext(context.executionId, nodeContext);
  }

  /**
   * Execute a sequence from parsed edge structure
   */
  private async executeSequenceFromParsedEdge(
    sequence: Array<string | ParsedNode>,
    context: ExecutionContext
  ): Promise<void> {
    for (const item of sequence) {
      if (typeof item === 'string') {
        // Execute referenced node using the centralized method
        await this.executeNodeFromRegistry(item, context);
      } else if (typeof item === 'object' && 'nodeId' in item) {
        // Execute nested ParsedNode from AST
        await this.executeNestedNode(item, context);
      }
    }
  }

  /**
   * Execute a nested ParsedNode from the AST
   */
  private async executeNestedNode(
    parsedNode: ParsedNode,
    context: ExecutionContext
  ): Promise<void> {
    try {
      const isLoopNode = parsedNode.nodeId.endsWith('...');
      
      if (isLoopNode) {
        // Special handling for loop nodes - execute with loop detection
        const loopCounts = new Map<string, number>();
        const baseNodeId = parsedNode.nodeId.slice(0, -3);
        
        while (true) {
          // Check loop limit
          const loopCount = loopCounts.get(baseNodeId) || 0;
          if (loopCount >= ExecutionEngine.MAX_LOOP_ITERATIONS) {
            throw new LoopLimitError(context.executionId, parsedNode.nodeId);
          }
          loopCounts.set(baseNodeId, loopCount + 1);
          
          // Execute the loop node
          const result = await this.executeNode(parsedNode, context);
          
          // If no edge taken or edge has no configuration, exit the loop
          if (!result.edge || !parsedNode.edges[result.edge]) {
            break;
          }
          
          // Execute the edge configuration
          const edge = parsedNode.edges[result.edge];
          if (edge) {
            switch (edge.type) {
              case 'simple':
                if (edge.target && this.registry.hasNode(edge.target)) {
                  await this.executeNodeFromRegistry(edge.target, context);
                }
                break;
                
              case 'sequence':
                if (edge.sequence) {
                  await this.executeSequenceFromParsedEdge(edge.sequence, context);
                }
                break;
                
              case 'nested':
                if (edge.nestedNode) {
                  await this.executeNestedNode(edge.nestedNode, context);
                }
                break;
            }
          }
          
          // Continue looping back to the same node
        }
      } else {
        // Regular node execution (non-loop)
        const result = await this.executeNode(parsedNode, context);
        
        // If the node has edges and an edge was taken, recursively execute nested nodes
        if (result.edge && parsedNode.edges[result.edge]) {
          const edge = parsedNode.edges[result.edge];
          
          if (edge) {
            switch (edge.type) {
              case 'simple':
                if (edge.target && this.registry.hasNode(edge.target)) {
                  await this.executeNodeFromRegistry(edge.target, context);
                }
                break;
                
              case 'sequence':
                if (edge.sequence) {
                  await this.executeSequenceFromParsedEdge(edge.sequence, context);
                }
                break;
                
              case 'nested':
                if (edge.nestedNode) {
                  await this.executeNestedNode(edge.nestedNode, context);
                }
                break;
            }
          }
        }
      }
    } catch (error) {
      // Propagate errors from nested node execution
      throw error;
    }
  }

  /**
   * Execute a sequence of edge route items (legacy support)
   */
  private async executeSequence(
    sequence: any[],
    context: ExecutionContext
  ): Promise<void> {
    for (const item of sequence) {
      if (typeof item === 'string') {
        // Execute referenced node using the centralized method
        await this.executeNodeFromRegistry(item, context);
        
      } else if (typeof item === 'object') {
        // Execute nested configuration
        await this.executeNestedConfiguration(item, context);
      }
    }
  }

  /**
   * Execute a nested node configuration (legacy support)
   */
  private async executeNestedConfiguration(
    config: any,
    context: ExecutionContext
  ): Promise<void> {
    for (const [nodeId, nodeConfig] of Object.entries(config)) {
      const instance = this.registry.getInstance(nodeId);
      const nodeContext = {
        ...context,
        nodeId,
        state: await this.stateManager.getState(context.executionId),
        inputs: await this.stateManager.getAndClearEdgeContext(context.executionId) || {}
      };
      
      await instance.execute(nodeContext, nodeConfig as Record<string, any>);
      await this.updateStateFromContext(context.executionId, nodeContext);
    }
  }

  /**
   * Prepare inputs for node execution, including edge context data
   */
  private async prepareNodeInputs(
    executionId: string,
    node: ParsedNode
  ): Promise<Record<string, any>> {
    const edgeContext = await this.stateManager.getAndClearEdgeContext(executionId);
    const currentState = await this.stateManager.getState(executionId);
    
    return {
      ...edgeContext,
      ...currentState,
      _nodeConfig: node.config
    };
  }

  /**
   * Update state from execution context after node execution
   */
  private async updateStateFromContext(
    executionId: string,
    context: ExecutionContext
  ): Promise<void> {
    if (context.state && typeof context.state === 'object') {
      await this.stateManager.updateState(executionId, context.state);
    }
  }

  /**
   * Generate a unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${randomUUID()}`;
  }
}