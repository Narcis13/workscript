import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import type { 
  WorkflowDefinition, 
  ValidationResult, 
  ValidationError 
} from 'shared/dist';
import workflowSchema from '../schemas/workflow-schema.json';
import type { NodeRegistry } from '../registry/NodeRegistry';

/**
 * WorkflowParser class responsible for validating and parsing workflow definitions
 * Implements JSON schema validation and semantic validation for workflow structures
 */
export class WorkflowParser {
  private ajv: Ajv;
  private nodeRegistry?: NodeRegistry;

  constructor(nodeRegistry?: NodeRegistry) {
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: false
    });
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * Validates a workflow definition against the JSON schema and performs semantic validation
   * @param workflow - The workflow definition to validate
   * @returns ValidationResult containing validation status and any errors
   */
  validate(workflow: unknown): ValidationResult {
    // First validate against JSON schema
    const isValid = this.ajv.validate(workflowSchema, workflow);
    
    if (!isValid) {
      const errors = this.ajv.errors || [];
      const validationErrors = this.convertAjvErrors(errors);
      
      return {
        valid: false,
        errors: validationErrors
      };
    }
    
    // If schema validation passes, perform additional semantic validations
    if (this.isWorkflowDefinition(workflow)) {
      const semanticErrors = this.validateWorkflowSemantics(workflow);
      
      if (semanticErrors.length > 0) {
        return {
          valid: false,
          errors: semanticErrors
        };
      }
    }

    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Parses a JSON string into a WorkflowDefinition with validation
   * @param workflowJson - JSON string containing workflow definition
   * @returns Parsed and validated WorkflowDefinition
   * @throws Error if JSON is invalid or workflow validation fails
   */
  parse(workflowJson: string): WorkflowDefinition {
    let parsedWorkflow: unknown;

    try {
      parsedWorkflow = JSON.parse(workflowJson);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }

    const validationResult = this.validate(parsedWorkflow);
    
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map(err => `${err.path}: ${err.message}`).join('; ');
      throw new Error(`Workflow validation failed: ${errorMessages}`);
    }

    return parsedWorkflow as WorkflowDefinition;
  }

  /**
   * Converts AJV validation errors to our ValidationError format with improved error messages
   * @param ajvErrors - Array of AJV error objects
   * @returns Array of ValidationError objects with user-friendly messages
   */
  private convertAjvErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map(error => {
      const path = this.extractErrorPath(error);
      let message = error.message || 'Validation error';
      let code = error.keyword || 'validation_error';

      // Enhance error messages for better user experience
      switch (error.keyword) {
        case 'required':
          message = `Missing required field: ${error.params?.missingProperty || 'unknown'}`;
          code = 'missing_required_field';
          break;
        case 'pattern':
          if (error.instancePath.includes('id')) {
            message = 'ID must contain only letters, numbers, hyphens, and underscores';
            code = 'invalid_id_format';
          } else if (error.instancePath.includes('version')) {
            message = 'Version must follow semantic versioning format (e.g., 1.0.0)';
            code = 'invalid_version_format';
          }
          break;
        case 'minLength':
          message = `Field must not be empty`;
          code = 'empty_field';
          break;
        case 'minProperties':
          if (error.instancePath.includes('workflow')) {
            message = 'Workflow must contain at least one node';
            code = 'empty_workflow';
          }
          break;
        case 'additionalProperties':
          message = `Unknown property: ${error.params?.additionalProperty || 'unknown'}`;
          code = 'unknown_property';
          break;
        case 'type':
          message = `Expected ${error.params?.type || 'unknown type'} but got ${typeof error.data}`;
          code = 'invalid_type';
          break;
        case 'oneOf':
          message = 'Value does not match any of the allowed formats';
          code = 'invalid_format';
          break;
      }

      return {
        path: path,
        message: message,
        code: code
      };
    });
  }

  /**
   * Extracts a user-friendly error path from an AJV error object
   * @param error - AJV error object
   * @returns Human-readable path string
   */
  private extractErrorPath(error: ErrorObject): string {
    // Use instancePath if available
    if (error.instancePath && error.instancePath !== '') {
      return error.instancePath.replace(/^\//, '').replace(/\//g, '.');
    }
    
    // For required property errors, construct path from parent and missing property
    if (error.keyword === 'required' && error.params?.missingProperty) {
      const parentPath = error.instancePath || '';
      const formattedParent = parentPath.replace(/^\//, '').replace(/\//g, '.');
      return formattedParent ? `${formattedParent}.${error.params.missingProperty}` : error.params.missingProperty;
    }
    
    // For schema path errors, try to extract property name
    if (error.schemaPath.includes('/properties/')) {
      const match = error.schemaPath.match(/\/properties\/([^/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Default to root if no better path can be determined
    return 'root';
  }

  /**
   * Type guard to check if an unknown object is a WorkflowDefinition
   * @param obj - Object to check
   * @returns Boolean indicating if object matches WorkflowDefinition structure
   */
  private isWorkflowDefinition(obj: unknown): obj is WorkflowDefinition {
    if (typeof obj !== 'object' || obj === null) return false;
    
    const workflow = obj as Partial<WorkflowDefinition>;
    return (
      typeof workflow.id === 'string' &&
      typeof workflow.name === 'string' &&
      typeof workflow.version === 'string' &&
      typeof workflow.workflow === 'object' &&
      workflow.workflow !== null
    );
  }

  /**
   * Performs semantic validation on a workflow definition
   * Validates aspects that can't be easily expressed in JSON Schema
   * @param workflow - Workflow definition to validate
   * @returns Array of ValidationError objects for any semantic errors found
   */
  private validateWorkflowSemantics(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for node references in edge routes
    const nodeIds = Object.keys(workflow.workflow);
    
    // Check each node configuration for potential issues
    for (const [nodeId, nodeConfig] of Object.entries(workflow.workflow)) {
      // Check if node has a type property
      if (!nodeConfig.type) {
        errors.push({
          path: `workflow.${nodeId}`,
          message: `Node '${nodeId}' is missing required 'type' property`,
          code: 'missing_node_type'
        });
      } else if (this.nodeRegistry) {
        // Validate node type exists in registry if registry is provided
        const nodeClass = this.nodeRegistry.get(nodeConfig.type);
        if (!nodeClass) {
          errors.push({
            path: `workflow.${nodeId}.type`,
            message: `Unknown node type '${nodeConfig.type}' - not found in node registry`,
            code: 'unknown_node_type'
          });
        }
      }
      
      // Check edge references if they exist
      if (nodeConfig.edges && typeof nodeConfig.edges === 'object') {
        this.validateEdgeReferences(workflow, nodeId, nodeConfig.edges, nodeIds, errors);
      }
    }
    
    // Check for circular references
    this.detectCircularReferences(workflow, errors);
    
    return errors;
  }

  /**
   * Validates edge references in a node configuration
   * @param workflow - Complete workflow definition
   * @param nodeId - ID of the node being validated
   * @param edges - Edge configuration object
   * @param nodeIds - Array of all node IDs in the workflow
   * @param errors - Array to collect validation errors
   */
  private validateEdgeReferences(
    workflow: WorkflowDefinition,
    nodeId: string,
    edges: Record<string, any>,
    nodeIds: string[],
    errors: ValidationError[]
  ): void {
    for (const [edgeKey, edgeValue] of Object.entries(edges)) {
      // Skip optional edges (ending with ?)
      const isOptionalEdge = edgeKey.endsWith('?');
      
      if (typeof edgeValue === 'string') {
        // Direct node reference
        if (!isOptionalEdge && !nodeIds.includes(edgeValue)) {
          errors.push({
            path: `workflow.${nodeId}.edges.${edgeKey}`,
            message: `Edge '${edgeKey}' references non-existent node '${edgeValue}'`,
            code: 'invalid_node_reference'
          });
        }
      } else if (Array.isArray(edgeValue)) {
        // Array of node references
        for (let i = 0; i < edgeValue.length; i++) {
          const ref = edgeValue[i];
          if (typeof ref === 'string' && !isOptionalEdge && !nodeIds.includes(ref)) {
            errors.push({
              path: `workflow.${nodeId}.edges.${edgeKey}[${i}]`,
              message: `Edge '${edgeKey}' references non-existent node '${ref}'`,
              code: 'invalid_node_reference'
            });
          }
        }
      } else if (typeof edgeValue === 'object' && edgeValue !== null) {
        // Nested configuration - validate it has required properties
        if (!edgeValue.type) {
          errors.push({
            path: `workflow.${nodeId}.edges.${edgeKey}`,
            message: `Nested configuration in edge '${edgeKey}' is missing required 'type' property`,
            code: 'missing_node_type'
          });
        }
      }
    }
  }

  /**
   * Detects circular references in workflow definition
   * Excludes loop edges from circular reference detection as they are legitimate
   * @param workflow - Workflow definition to check
   * @param errors - Array to collect validation errors
   */
  private detectCircularReferences(workflow: WorkflowDefinition, errors: ValidationError[]): void {
    // Simple direct self-reference check (excluding loop edges)
    for (const [nodeId, nodeConfig] of Object.entries(workflow.workflow)) {
      if (nodeConfig.edges && typeof nodeConfig.edges === 'object') {
        for (const [edgeKey, edgeValue] of Object.entries(nodeConfig.edges)) {
          // Skip loop edges as they are legitimate self-references
          const isLoopEdge = edgeKey === 'loop' || edgeKey === 'loop?';
          
          if (!isLoopEdge && edgeValue === nodeId) {
            errors.push({
              path: `workflow.${nodeId}.edges.${edgeKey}`,
              message: `Node '${nodeId}' has a direct self-reference which may cause an infinite loop`,
              code: 'circular_reference'
            });
          }
        }
      }
    }
    
    // More complex circular reference detection could be implemented here
    // using graph traversal algorithms, but should still exclude loop edges
  }
}