import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import type { 
  WorkflowDefinition, 
  ValidationResult, 
  ValidationError 
} from 'shared/dist';
import workflowSchema from '../schemas/workflow-schema.json';

export class WorkflowParser {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: false
    });
  }

  /**
   * Validates a workflow definition against the JSON schema
   */
  validate(workflow: unknown): ValidationResult {
    const isValid = this.ajv.validate(workflowSchema, workflow);
    
    if (isValid) {
      return {
        valid: true,
        errors: []
      };
    }

    const errors = this.ajv.errors || [];
    const validationErrors = this.convertAjvErrors(errors);

    return {
      valid: false,
      errors: validationErrors
    };
  }

  /**
   * Parses a JSON string into a WorkflowDefinition with validation
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
   * Converts AJV validation errors to our ValidationError format
   */
  private convertAjvErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map(error => {
      const path = error.instancePath || (error.schemaPath.includes('/properties/') ? 
        error.schemaPath.split('/properties/')[1]?.split('/')[0] || 'root' : 'root');
      
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
      }

      return {
        path: path,
        message: message,
        code: code
      };
    });
  }
}