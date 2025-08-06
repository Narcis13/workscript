import Ajv from 'ajv';
import type { 
  WorkflowDefinition, 
  ValidationResult, 
  ValidationError, 
  WorkflowStep,
  NodeConfiguration,
  ParameterValue,
  EdgeRoute,
  NestedNodeConfiguration
} from '../../../shared/src/types';
import { NodeRegistry } from '../registry/NodeRegistry';
import workflowSchema from '../schemas/workflow-schema.json';

export interface ParsedNode {
  nodeId: string;
  config: Record<string, ParameterValue>;
  edges: Record<string, ParsedEdge>;
  children: ParsedNode[];
  parent?: ParsedNode;
  depth: number;
  uniqueId: string;
  isLoopNode: boolean;
  baseNodeType: string;
}

export interface ParsedEdge {
  type: 'simple' | 'sequence' | 'nested';
  target?: string;
  sequence?: Array<string | ParsedNode>;
  nestedNode?: ParsedNode;
}

export interface ParsedWorkflow {
  id: string;
  name: string;
  version?: string;
  initialState?: Record<string, any>;
  nodes: ParsedNode[];
}

export class WorkflowParser {
  private ajv: Ajv;
  private nodeRegistry: NodeRegistry;

  constructor(nodeRegistry: NodeRegistry) {
    this.nodeRegistry = nodeRegistry;
    this.ajv = new Ajv({ allErrors: true, verbose: true });
  }

  /**
   * Check if a node ID has loop syntax (ends with ...)
   */
  private isLoopNode(nodeId: string): boolean {
    return nodeId.endsWith('...');
  }

  /**
   * Get the base node type from a potentially loop node ID
   */
  private getBaseNodeType(nodeId: string): string {
    return this.isLoopNode(nodeId) ? nodeId.slice(0, -3) : nodeId;
  }

  public parse(workflowDefinition: unknown): ParsedWorkflow {
    const validationResult = this.validate(workflowDefinition);
    
    if (!validationResult.valid) {
      throw new WorkflowValidationError('Workflow validation failed', validationResult.errors);
    }

    const workflow = workflowDefinition as WorkflowDefinition;
    const parsedNodes = this.parseNodes(workflow.workflow);

    return {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      initialState: workflow.initialState,
      nodes: parsedNodes
    };
  }

  public validate(workflowDefinition: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // JSON Schema validation
    const schemaValid = this.ajv.validate(workflowSchema, workflowDefinition);
    
    if (!schemaValid && this.ajv.errors) {
      errors.push(...this.ajv.errors.map(error => ({
        path: error.instancePath || '/',
        message: error.message || 'Unknown validation error',
        code: 'SCHEMA_VALIDATION_ERROR'
      })));
    }

    // If schema validation passes, perform semantic validation
    if (errors.length === 0 && workflowDefinition && typeof workflowDefinition === 'object') {
      const workflow = workflowDefinition as WorkflowDefinition;
      const semanticErrors = this.validateSemantics(workflow);
      errors.push(...semanticErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateSemantics(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set<string>();
    
    // First pass: collect all node IDs from workflow steps
    workflow.workflow.forEach((step, stepIndex) => {
      if (typeof step === 'string') {
        // Simple node reference
        nodeIds.add(step);
        
        // Check if base node type exists in registry (strip ... suffix for loop nodes)
        const baseNodeType = this.getBaseNodeType(step);
        if (!this.nodeRegistry.hasNode(baseNodeType)) {
          errors.push({
            path: `/workflow[${stepIndex}]`,
            message: `Node type '${baseNodeType}' not found in registry`,
            code: 'NODE_TYPE_NOT_FOUND'
          });
        }
      } else {
        // Node configuration object
        for (const nodeId of Object.keys(step)) {
          nodeIds.add(nodeId);
          
          // Check if base node type exists in registry (strip ... suffix for loop nodes)
          const baseNodeType = this.getBaseNodeType(nodeId);
          if (!this.nodeRegistry.hasNode(baseNodeType)) {
            errors.push({
              path: `/workflow[${stepIndex}]/${nodeId}`,
              message: `Node type '${baseNodeType}' not found in registry`,
              code: 'NODE_TYPE_NOT_FOUND'
            });
          }
        }
      }
    });

    // Second pass: validate edge routes for configured nodes
    workflow.workflow.forEach((step, stepIndex) => {
      if (typeof step === 'object') {
        for (const [nodeId, nodeConfig] of Object.entries(step)) {
          const { edges } = this.separateParametersAndEdges(nodeConfig);
          
          for (const [edgeName, edgeRoute] of Object.entries(edges)) {
            const edgeErrors = this.validateEdgeRoute(
              edgeRoute,
              nodeIds,
              `/workflow[${stepIndex}]/${nodeId}/${edgeName}?`
            );
            errors.push(...edgeErrors);
          }
        }
      }
    });

    return errors;
  }

  private validateEdgeRoute(
    route: EdgeRoute,
    validNodeIds: Set<string>,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof route === 'string') {
      // String route - check if it references a valid node
      if (!validNodeIds.has(route) && !this.nodeRegistry.hasNode(route)) {
        errors.push({
          path,
          message: `Edge references non-existent node '${route}'`,
          code: 'EDGE_TARGET_NOT_FOUND'
        });
      }
    } else if (Array.isArray(route)) {
      // Array route - validate each element
      route.forEach((item, index) => {
        if (typeof item === 'string') {
          if (!validNodeIds.has(item) && !this.nodeRegistry.hasNode(item)) {
            errors.push({
              path: `${path}[${index}]`,
              message: `Edge references non-existent node '${item}'`,
              code: 'EDGE_TARGET_NOT_FOUND'
            });
          }
        } else {
          // Nested configuration in array
          const nestedErrors = this.validateNestedConfiguration(
            item,
            validNodeIds,
            `${path}[${index}]`
          );
          errors.push(...nestedErrors);
        }
      });
    } else if (typeof route === 'object' && route !== null) {
      // Nested node configuration
      const nestedErrors = this.validateNestedConfiguration(
        route,
        validNodeIds,
        path
      );
      errors.push(...nestedErrors);
    }

    return errors;
  }

  private validateNestedConfiguration(
    config: NestedNodeConfiguration,
    validNodeIds: Set<string>,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [nodeId, nodeConfig] of Object.entries(config)) {
      // Check if base node type exists in registry (strip ... suffix for loop nodes)
      const baseNodeType = this.getBaseNodeType(nodeId);
      if (!this.nodeRegistry.hasNode(baseNodeType)) {
        errors.push({
          path: `${path}/${nodeId}`,
          message: `Nested node type '${baseNodeType}' not found in registry`,
          code: 'NODE_TYPE_NOT_FOUND'
        });
      }

      // Recursively validate nested edges
      const { edges } = this.separateParametersAndEdges(nodeConfig);
      for (const [edgeName, edgeRoute] of Object.entries(edges)) {
        const edgeErrors = this.validateEdgeRoute(
          edgeRoute,
          validNodeIds,
          `${path}/${nodeId}/${edgeName}?`
        );
        errors.push(...edgeErrors);
      }
    }

    return errors;
  }

  private parseNodes(workflowSteps: WorkflowStep[]): ParsedNode[] {
    const parsedNodes: ParsedNode[] = [];
    let nodeCounter = 0;

    workflowSteps.forEach((step) => {
      if (typeof step === 'string') {
        // Simple node reference without configuration
        const isLoop = this.isLoopNode(step);
        const baseType = this.getBaseNodeType(step);
        
        parsedNodes.push({
          nodeId: step,
          config: {},
          edges: {},
          children: [],
          depth: 0,
          uniqueId: `${step}_${nodeCounter++}`,
          isLoopNode: isLoop,
          baseNodeType: baseType
        });
      } else {
        // Node configuration object
        for (const [nodeId, nodeConfig] of Object.entries(step)) {
          const parsedNode = this.parseNodeRecursively(nodeId, nodeConfig, 0, `${nodeId}_${nodeCounter++}`);
          parsedNodes.push(parsedNode);
        }
      }
    });

    return parsedNodes;
  }

  private parseNodeRecursively(
    nodeId: string, 
    nodeConfig: NodeConfiguration, 
    depth: number, 
    uniqueId: string,
    parent?: ParsedNode
  ): ParsedNode {
    const { parameters, edges } = this.separateParametersAndEdges(nodeConfig);
    
    const isLoop = this.isLoopNode(nodeId);
    const baseType = this.getBaseNodeType(nodeId);
    
    const parsedNode: ParsedNode = {
      nodeId,
      config: parameters,
      edges: {},
      children: [],
      parent,
      depth,
      uniqueId,
      isLoopNode: isLoop,
      baseNodeType: baseType
    };

    // Parse edges recursively to build the tree structure
    for (const [edgeName, edgeRoute] of Object.entries(edges)) {
      parsedNode.edges[edgeName] = this.parseEdgeRecursively(edgeRoute, depth + 1, parsedNode);
    }

    return parsedNode;
  }

  private parseEdgeRecursively(edgeRoute: EdgeRoute, depth: number, parent: ParsedNode): ParsedEdge {
    let edgeCounter = 0;

    if (typeof edgeRoute === 'string') {
      // Simple string reference
      return {
        type: 'simple',
        target: edgeRoute
      };
    } else if (Array.isArray(edgeRoute)) {
      // Array of routes (sequence)
      const parsedSequence: Array<string | ParsedNode> = [];
      
      edgeRoute.forEach((item, index) => {
        if (typeof item === 'string') {
          parsedSequence.push(item);
        } else {
          // Nested configuration in array
          for (const [nodeId, nodeConfig] of Object.entries(item)) {
            const uniqueId = `${parent.uniqueId}_seq_${index}_${nodeId}_${edgeCounter++}`;
            const nestedNode = this.parseNodeRecursively(nodeId, nodeConfig, depth, uniqueId, parent);
            parent.children.push(nestedNode);
            parsedSequence.push(nestedNode);
          }
        }
      });

      return {
        type: 'sequence',
        sequence: parsedSequence
      };
    } else if (typeof edgeRoute === 'object' && edgeRoute !== null) {
      // Nested node configuration
      const nestedConfigs = edgeRoute as NestedNodeConfiguration;
      
      if (Object.keys(nestedConfigs).length === 1) {
        // Single nested node
        const [nodeId, nodeConfig] = Object.entries(nestedConfigs)[0]!;
        const uniqueId = `${parent.uniqueId}_nested_${nodeId}_${edgeCounter++}`;
        const nestedNode = this.parseNodeRecursively(nodeId, nodeConfig, depth, uniqueId, parent);
        parent.children.push(nestedNode);
        
        return {
          type: 'nested',
          nestedNode
        };
      } else {
        // Multiple nested nodes - treat as sequence
        const parsedSequence: ParsedNode[] = [];
        
        for (const [nodeId, nodeConfig] of Object.entries(nestedConfigs)) {
          const uniqueId = `${parent.uniqueId}_multi_${nodeId}_${edgeCounter++}`;
          const nestedNode = this.parseNodeRecursively(nodeId, nodeConfig, depth, uniqueId, parent);
          parent.children.push(nestedNode);
          parsedSequence.push(nestedNode);
        }

        return {
          type: 'sequence',
          sequence: parsedSequence
        };
      }
    }

    // Fallback for unknown edge route types
    return {
      type: 'simple',
      target: String(edgeRoute)
    };
  }

  private separateParametersAndEdges(
    nodeConfig: NodeConfiguration
  ): { parameters: Record<string, ParameterValue>; edges: Record<string, EdgeRoute> } {
    const parameters: Record<string, ParameterValue> = {};
    const edges: Record<string, EdgeRoute> = {};

    for (const [key, value] of Object.entries(nodeConfig)) {
      if (key.endsWith('?')) {
        // This is an edge route
        const edgeName = key.slice(0, -1);
        edges[edgeName] = value as EdgeRoute;
      } else {
        // This is a parameter
        parameters[key] = value as ParameterValue;
      }
    }

    return { parameters, edges };
  }

}

export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    public errors: ValidationError[]
  ) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}