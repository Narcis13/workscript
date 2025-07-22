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
    const nodeIds = new Set<string>();
    
    // First pass: collect all node IDs
    workflow.workflow.forEach((nodeConfig, index) => {
      Object.keys(nodeConfig).forEach(key => {
        const nodeId = key.endsWith('?') ? key.slice(0, -1) : key;
        nodeIds.add(nodeId);
      });
    });

    // Second pass: validate each node
    workflow.workflow.forEach((nodeConfig, index) => {
      for (const [key, value] of Object.entries(nodeConfig)) {
        const nodeId = key.endsWith('?') ? key.slice(0, -1) : key;
        
        // Check if value is an object with type property (indicating it's a node configuration)
        if (typeof value === 'object' && !Array.isArray(value) && value !== null && 'type' in value) {
          // Check if node type exists in registry
          if (!this.nodeRegistry.hasNode(value.type)) {
            errors.push({
              path: `/workflow[${index}]/${key}/type`,
              message: `Node type '${value.type}' not found in registry`,
              code: 'NODE_TYPE_NOT_FOUND'
            });
          }

          // Validate edges if present
          if ('edges' in value && value.edges) {
            for (const [edgeKey, edgeValue] of Object.entries(value.edges)) {
              const edgeErrors = this.validateEdgeRoute(
                edgeValue,
                nodeIds,
                `/workflow[${index}]/${key}/edges/${edgeKey}`
              );
              errors.push(...edgeErrors);
            }
          }
        }
      }
    });

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

  private parseNodes(workflowNodes: NodeConfiguration[]): ParsedNode[] {
    const parsedNodes: ParsedNode[] = [];

    workflowNodes.forEach((nodeConfig) => {
      for (const [key, value] of Object.entries(nodeConfig)) {
        const nodeId = key.endsWith('?') ? key.slice(0, -1) : key;
        
        // Parse based on the type of value
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // Extract known properties
          const { type, edges, config, ...rest } = value as any;
          
          const parsedNode: ParsedNode = {
            nodeId,
            type: type || 'unknown',
            config: config || (Object.keys(rest).length > 0 ? rest : {}),
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
        } else {
          // Simple value - treat as a basic node
          parsedNodes.push({
            nodeId,
            type: 'unknown',
            config: { value },
            edges: {}
          });
        }
      }
    });

    return parsedNodes;
  }

  private parseEdgeRoute(route: any): EdgeRoute {
    if (typeof route === 'string') {
      // Remove optional marker from string routes
      return route.endsWith('?') ? route.slice(0, -1) : route;
    } else if (Array.isArray(route)) {
      // Process array routes recursively
      return route.map(item => this.parseEdgeRoute(item)) as string[];
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