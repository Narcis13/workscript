import type { EdgeMap, WorkflowDefinition } from 'shared/dist';
import { ErrorHandler, ErrorCategory, ErrorSeverity, WorkflowError } from '../error/ErrorHandler';

/**
 * Edge routing result containing the next nodes to execute
 */
export interface EdgeRouteResult {
  /** Next nodes to execute in sequence */
  nextNodes: string[];
  /** Inline node configurations */
  inlineConfigs: Record<string, any>;
  /** Whether this was an optional edge that wasn't found */
  isOptional: boolean;
  /** Whether to continue to next node in sequence */
  continueSequence: boolean;
  /** Whether this is a loop edge */
  isLoop?: boolean;
}

/**
 * Edge routing configuration for a specific edge
 */
export interface EdgeConfig {
  /** Edge name (with or without ? suffix) */
  name: string;
  /** Whether this edge is optional */
  isOptional: boolean;
  /** Edge value from workflow definition */
  value: any;
}

/**
 * EdgeRouter class responsible for resolving and routing workflow edges
 * Handles different edge patterns: single node, array, nested configurations, and optional routing
 */
export class EdgeRouter {
  private workflow: WorkflowDefinition;
  private nodeSequence: string[];
  private errorHandler?: ErrorHandler;

  constructor(workflow: WorkflowDefinition, errorHandler?: ErrorHandler) {
    this.workflow = workflow;
    this.nodeSequence = Object.keys(workflow.workflow);
    this.errorHandler = errorHandler;
  }

  /**
   * Routes execution based on edge map returned from node execution
   * @param currentNodeId - ID of the current node
   * @param edgeMap - EdgeMap returned from node execution
   * @returns Edge routing result
   */
  routeEdges(currentNodeId: string, edgeMap: EdgeMap): EdgeRouteResult {
    const currentNode = this.workflow.workflow[currentNodeId];
    
    if (!currentNode || !currentNode.edges) {
      return this.createSequenceResult(currentNodeId);
    }

    // Handle loop edges with priority
    if (edgeMap.hasOwnProperty('loop')) {
      const loopConfig = this.parseEdgeConfig(currentNode.edges, 'loop');
      if (loopConfig) {
        const result = this.resolveEdge(loopConfig, edgeMap.loop);
        result.isLoop = true;
        return result;
      }
    }

    // Find the first matching non-loop edge from the edgeMap
    for (const [edgeKey, edgeValue] of Object.entries(edgeMap)) {
      if (edgeKey === 'loop') continue; // Skip loop edges, already handled
      
      const edgeConfig = this.parseEdgeConfig(currentNode.edges, edgeKey);
      
      if (edgeConfig) {
        return this.resolveEdge(edgeConfig, edgeValue);
      }
    }

    // No matching edges found, continue to next node in sequence
    return this.createSequenceResult(currentNodeId);
  }

  /**
   * Resolves a specific edge configuration
   * @param edgeConfig - Edge configuration to resolve
   * @param edgeValue - Value returned from node execution for this edge
   * @returns Edge routing result
   */
  private resolveEdge(edgeConfig: EdgeConfig, edgeValue: any): EdgeRouteResult {
    const { value, isOptional } = edgeConfig;

    // Handle different edge patterns
    if (typeof value === 'string') {
      // Single node reference
      return this.resolveSingleNode(value, isOptional);
    } else if (Array.isArray(value)) {
      // Node sequence or mixed array
      return this.resolveNodeSequence(value, isOptional);
    } else if (typeof value === 'object' && value !== null) {
      // Nested node configuration
      return this.resolveNestedConfig(value, isOptional);
    }

    // Invalid edge configuration
    return {
      nextNodes: [],
      inlineConfigs: {},
      isOptional,
      continueSequence: true
    };
  }

  /**
   * Resolves a single node reference
   * @param nodeId - Target node ID
   * @param isOptional - Whether the edge is optional
   * @returns Edge routing result
   */
  private resolveSingleNode(nodeId: string, isOptional: boolean): EdgeRouteResult {
    if (this.nodeExists(nodeId)) {
      return {
        nextNodes: [nodeId],
        inlineConfigs: {},
        isOptional,
        continueSequence: false
      };
    }

    if (isOptional) {
      return {
        nextNodes: [],
        inlineConfigs: {},
        isOptional: true,
        continueSequence: true
      };
    }

    if (this.errorHandler) {
      const error = this.errorHandler.createError(
        ErrorCategory.FLOW_CONTROL,
        'invalid_node_reference',
        `Node reference '${nodeId}' not found in workflow`,
        ErrorSeverity.ERROR,
        { data: { nodeId, workflowId: this.workflow.id } }
      );
      throw error;
    } else {
      throw new Error(`Node reference '${nodeId}' not found in workflow`);
    }
  }

  /**
   * Resolves a node sequence (array of nodes/configs)
   * @param sequence - Array of node references or configurations
   * @param isOptional - Whether the edge is optional
   * @returns Edge routing result
   */
  private resolveNodeSequence(sequence: any[], isOptional: boolean): EdgeRouteResult {
    const nextNodes: string[] = [];
    const inlineConfigs: Record<string, any> = {};

    for (const item of sequence) {
      if (typeof item === 'string') {
        // String node reference
        if (this.nodeExists(item)) {
          nextNodes.push(item);
        } else if (!isOptional) {
          if (this.errorHandler) {
            const error = this.errorHandler.createError(
              ErrorCategory.FLOW_CONTROL,
              'invalid_node_reference',
              `Node reference '${item}' not found in workflow`,
              ErrorSeverity.ERROR,
              { data: { nodeId: item, workflowId: this.workflow.id } }
            );
            throw error;
          } else {
            throw new Error(`Node reference '${item}' not found in workflow`);
          }
        }
      } else if (typeof item === 'object' && item !== null) {
        // Nested configuration
        const nestedResult = this.resolveNestedConfig(item, isOptional);
        nextNodes.push(...nestedResult.nextNodes);
        Object.assign(inlineConfigs, nestedResult.inlineConfigs);
      }
    }

    return {
      nextNodes,
      inlineConfigs,
      isOptional,
      continueSequence: false
    };
  }

  /**
   * Resolves a nested node configuration
   * @param config - Nested node configuration object
   * @param isOptional - Whether the edge is optional
   * @returns Edge routing result
   */
  private resolveNestedConfig(config: Record<string, any>, isOptional: boolean): EdgeRouteResult {
    const nextNodes: string[] = [];
    const inlineConfigs: Record<string, any> = {};

    for (const [nodeId, nodeConfig] of Object.entries(config)) {
      if (this.nodeExists(nodeId)) {
        nextNodes.push(nodeId);
        // Store inline config for later use
        inlineConfigs[nodeId] = nodeConfig;
      } else if (!isOptional) {
        if (this.errorHandler) {
          const error = this.errorHandler.createError(
            ErrorCategory.FLOW_CONTROL,
            'invalid_node_reference',
            `Node reference '${nodeId}' not found in workflow`,
            ErrorSeverity.ERROR,
            { data: { nodeId, workflowId: this.workflow.id } }
          );
          throw error;
        } else {
          throw new Error(`Node reference '${nodeId}' not found in workflow`);
        }
      }
    }

    return {
      nextNodes,
      inlineConfigs,
      isOptional,
      continueSequence: false
    };
  }

  /**
   * Parses edge configuration from node edges
   * @param edges - Node edges object
   * @param edgeKey - Edge key to look for
   * @returns Edge configuration or null if not found
   */
  private parseEdgeConfig(edges: Record<string, any>, edgeKey: string): EdgeConfig | null {
    // First try exact match
    if (edges[edgeKey]) {
      return {
        name: edgeKey,
        isOptional: false,
        value: edges[edgeKey]
      };
    }

    // Try with optional suffix
    const optionalKey = `${edgeKey}?`;
    if (edges[optionalKey]) {
      return {
        name: edgeKey,
        isOptional: true,
        value: edges[optionalKey]
      };
    }

    // Check if any edge key without ? matches
    for (const [key, value] of Object.entries(edges)) {
      const isOptional = key.endsWith('?');
      const cleanKey = isOptional ? key.slice(0, -1) : key;
      
      if (cleanKey === edgeKey) {
        return {
          name: edgeKey,
          isOptional,
          value
        };
      }
    }

    return null;
  }

  /**
   * Creates a result that continues to the next node in sequence
   * @param currentNodeId - Current node ID
   * @returns Edge routing result for sequence continuation
   */
  private createSequenceResult(currentNodeId: string): EdgeRouteResult {
    const currentIndex = this.nodeSequence.indexOf(currentNodeId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < this.nodeSequence.length) {
      return {
        nextNodes: [this.nodeSequence[nextIndex]],
        inlineConfigs: {},
        isOptional: false,
        continueSequence: true
      };
    }

    // End of sequence
    return {
      nextNodes: [],
      inlineConfigs: {},
      isOptional: false,
      continueSequence: false
    };
  }

  /**
   * Checks if a node exists in the workflow
   * @param nodeId - Node ID to check
   * @returns True if node exists
   */
  private nodeExists(nodeId: string): boolean {
    return this.workflow.workflow.hasOwnProperty(nodeId);
  }

  /**
   * Gets the next node in sequence after the current node
   * @param currentNodeId - Current node ID
   * @returns Next node ID or null if at end or node not found
   */
  getNextInSequence(currentNodeId: string): string | null {
    const currentIndex = this.nodeSequence.indexOf(currentNodeId);
    
    // Return null if node not found
    if (currentIndex === -1) {
      return null;
    }
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < this.nodeSequence.length) {
      return this.nodeSequence[nextIndex];
    }
    
    return null;
  }

  /**
   * Gets all possible edges from a node
   * @param nodeId - Node ID to get edges for
   * @returns Array of edge configurations
   */
  getNodeEdges(nodeId: string): EdgeConfig[] {
    const node = this.workflow.workflow[nodeId];
    if (!node || !node.edges) {
      return [];
    }

    return Object.entries(node.edges).map(([key, value]) => ({
      name: key.endsWith('?') ? key.slice(0, -1) : key,
      isOptional: key.endsWith('?'),
      value
    }));
  }

  /**
   * Validates all edges in the workflow
   * @returns Array of validation errors
   */
  validateAllEdges(): string[] {
    const errors: string[] = [];

    for (const [nodeId, nodeConfig] of Object.entries(this.workflow.workflow)) {
      if (nodeConfig.edges) {
        for (const [edgeKey, edgeValue] of Object.entries(nodeConfig.edges)) {
          try {
            const edgeConfig = {
              name: edgeKey.endsWith('?') ? edgeKey.slice(0, -1) : edgeKey,
              isOptional: edgeKey.endsWith('?'),
              value: edgeValue
            };
            
            this.resolveEdge(edgeConfig, true);
          } catch (error) {
            // Check if it's a WorkflowError
            if (this.errorHandler && this.isWorkflowError(error)) {
              errors.push(`Node '${nodeId}' edge '${edgeKey}': ${error.message} (${error.code})`);
            } else {
              errors.push(`Node '${nodeId}' edge '${edgeKey}': ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }
    }

    return errors;
  }
  
  /**
   * Type guard to check if an error is a WorkflowError
   * @param error - Error to check
   * @returns Boolean indicating if error is a WorkflowError
   */
  private isWorkflowError(error: any): error is WorkflowError {
    return (
      error &&
      typeof error === 'object' &&
      'category' in error &&
      'code' in error &&
      'id' in error
    );
  }
}