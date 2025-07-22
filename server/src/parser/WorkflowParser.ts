import Ajv from 'ajv';
import type { WorkflowDefinition, ValidationResult, ValidationError, NodeConfiguration } from '../../../shared/src/types';
import { NodeRegistry } from '../registry/NodeRegistry';
import workflowSchema from '../schemas/workflow-schema.json';

export interface ParsedNode {
  nodeId: string;
  type: string;
  config: Record<string, any>;
  edges: Record<string, EdgeRoute>;
}

export type EdgeRoute = string | string[] | NodeConfiguration;

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
    const nodeIds = new Set(Object.keys(workflow.workflow));

    // Validate each node
    for (const [nodeId, nodeConfig] of Object.entries(workflow.workflow)) {
      // Check if node type exists in registry
      if (nodeConfig.type && !this.nodeRegistry.hasNode(nodeConfig.type)) {
        errors.push({
          path: `/workflow/${nodeId}/type`,
          message: `Node type '${nodeConfig.type}' not found in registry`,
          code: 'NODE_TYPE_NOT_FOUND'
        });
      }

      // Validate edges if present
      if (nodeConfig.edges) {
        for (const [edgeKey, edgeValue] of Object.entries(nodeConfig.edges)) {
          const edgeErrors = this.validateEdgeRoute(
            edgeValue,
            nodeIds,
            `/workflow/${nodeId}/edges/${edgeKey}`
          );
          errors.push(...edgeErrors);
        }
      }
    }

    return errors;
  }

  private validateEdgeRoute(
    route: any,
    validNodeIds: Set<string>,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof route === 'string') {
      // String route - check if it references a valid node
      const targetNodeId = route.endsWith('?') ? route.slice(0, -1) : route;
      if (!validNodeIds.has(targetNodeId)) {
        errors.push({
          path,
          message: `Edge references non-existent node '${targetNodeId}'`,
          code: 'EDGE_TARGET_NOT_FOUND'
        });
      }
    } else if (Array.isArray(route)) {
      // Array route - validate each element
      route.forEach((item, index) => {
        const itemErrors = this.validateEdgeRoute(
          item,
          validNodeIds,
          `${path}[${index}]`
        );
        errors.push(...itemErrors);
      });
    } else if (typeof route === 'object' && route !== null) {
      // Nested node configuration - validate it has a type
      if (!route.type) {
        errors.push({
          path,
          message: 'Nested node configuration must have a type',
          code: 'NESTED_NODE_MISSING_TYPE'
        });
      } else if (!this.nodeRegistry.hasNode(route.type)) {
        errors.push({
          path: `${path}/type`,
          message: `Node type '${route.type}' not found in registry`,
          code: 'NODE_TYPE_NOT_FOUND'
        });
      }

      // Recursively validate nested edges
      if (route.edges) {
        for (const [edgeKey, edgeValue] of Object.entries(route.edges)) {
          const edgeErrors = this.validateEdgeRoute(
            edgeValue,
            validNodeIds,
            `${path}/edges/${edgeKey}`
          );
          errors.push(...edgeErrors);
        }
      }
    }

    return errors;
  }

  private parseNodes(workflowNodes: Record<string, NodeConfiguration>): ParsedNode[] {
    const parsedNodes: ParsedNode[] = [];

    for (const [nodeId, nodeConfig] of Object.entries(workflowNodes)) {
      const { type, edges, config, ...rest } = nodeConfig;
      
      const parsedNode: ParsedNode = {
        nodeId,
        type: type || 'unknown',
        config: config || rest,
        edges: {}
      };

      // Parse edges with parameter separation
      if (edges) {
        for (const [edgeKey, edgeValue] of Object.entries(edges)) {
          const isOptional = edgeKey.endsWith('?');
          const cleanEdgeKey = isOptional ? edgeKey.slice(0, -1) : edgeKey;
          
          parsedNode.edges[cleanEdgeKey] = this.parseEdgeRoute(edgeValue);
        }
      }

      parsedNodes.push(parsedNode);
    }

    return parsedNodes;
  }

  private parseEdgeRoute(route: any): EdgeRoute {
    if (typeof route === 'string') {
      // Remove optional marker from string routes
      return route.endsWith('?') ? route.slice(0, -1) : route;
    } else if (Array.isArray(route)) {
      // Process array routes recursively
      return route.map(item => this.parseEdgeRoute(item));
    } else if (typeof route === 'object' && route !== null) {
      // For nested configurations, parse their edges recursively
      const { edges, ...rest } = route;
      const parsedConfig: NodeConfiguration = { ...rest };
      
      if (edges) {
        parsedConfig.edges = {};
        for (const [edgeKey, edgeValue] of Object.entries(edges)) {
          const isOptional = edgeKey.endsWith('?');
          const cleanEdgeKey = isOptional ? edgeKey.slice(0, -1) : edgeKey;
          parsedConfig.edges[cleanEdgeKey] = this.parseEdgeRoute(edgeValue);
        }
      }
      
      return parsedConfig;
    }
    
    return route;
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