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
  edges: Record<string, EdgeRoute>;
}

export interface ParsedWorkflow {
  id: string;
  name: string;
  version: string;
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
        
        // Check if node type exists in registry
        if (!this.nodeRegistry.hasNode(step)) {
          errors.push({
            path: `/workflow[${stepIndex}]`,
            message: `Node type '${step}' not found in registry`,
            code: 'NODE_TYPE_NOT_FOUND'
          });
        }
      } else {
        // Node configuration object
        for (const nodeId of Object.keys(step)) {
          nodeIds.add(nodeId);
          
          // Check if node type exists in registry  
          if (!this.nodeRegistry.hasNode(nodeId)) {
            errors.push({
              path: `/workflow[${stepIndex}]/${nodeId}`,
              message: `Node type '${nodeId}' not found in registry`,
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
      // Check if nested node type exists in registry
      if (!this.nodeRegistry.hasNode(nodeId)) {
        errors.push({
          path: `${path}/${nodeId}`,
          message: `Nested node type '${nodeId}' not found in registry`,
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

    workflowSteps.forEach((step) => {
      if (typeof step === 'string') {
        // Simple node reference without configuration
        parsedNodes.push({
          nodeId: step,
          config: {},
          edges: {}
        });
      } else {
        // Node configuration object
        for (const [nodeId, nodeConfig] of Object.entries(step)) {
          const { parameters, edges } = this.separateParametersAndEdges(nodeConfig);
          
          parsedNodes.push({
            nodeId,
            config: parameters,
            edges
          });
        }
      }
    });

    return parsedNodes;
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