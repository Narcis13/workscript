/**
 * ValidateDataNode - Universal node for data validation against schemas and rules
 *
 * Validates data using various validation strategies:
 * - JSON validation (checks if text is valid JSON)
 * - JSON Schema validation
 * - Type checking
 * - Required fields validation
 * - Range validation for numeric values
 * - Pattern matching with regex
 * - Custom validation functions
 *
 * @example
 * ```json
 * {
 *   "validateData": {
 *     "validationType": "required_fields",
 *     "data": "$.dataToValidate",
 *     "requiredFields": ["name", "email", "age"],
 *     "valid?": "process-data",
 *     "invalid?": "handle-error"
 *   }
 * }
 * ```
 *
 * @example JSON validation
 * ```json
 * {
 *   "validateData": {
 *     "validationType": "json",
 *     "data": "$.textToValidate",
 *     "valid?": "process-json",
 *     "invalid?": "handle-invalid-json"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface TypeCheck {
  field: string;
  expectedType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
}

interface RangeValidation {
  field: string;
  min?: number;
  max?: number;
}

interface PatternValidation {
  field: string;
  pattern: string;
  errorMessage?: string;
}

interface ValidationError {
  field: string;
  error: string;
  value?: any;
}

interface ValidateDataNodeConfig {
  validationType?: 'json' | 'json_schema' | 'type_check' | 'required_fields' | 'range' | 'pattern' | 'custom';
  data?: any; // Data to validate - can be provided via config or context.inputs
  schema?: Record<string, any>;
  typeChecks?: TypeCheck[];
  requiredFields?: string[];
  rangeValidations?: RangeValidation[];
  patternValidations?: PatternValidation[];
  customValidator?: string; // JavaScript function as string
  stopOnError?: boolean;
  outputErrors?: boolean;
}

export class ValidateDataNode extends WorkflowNode {
  metadata = {
    id: 'validateData',
    name: 'Validate Data',
    version: '1.1.0',
    description: 'Universal node - validate data against schemas, rules, and JSON format',
    inputs: [
      'validationType',
      'data',
      'schema',
      'typeChecks',
      'requiredFields',
      'rangeValidations',
      'patternValidations',
      'stopOnError',
      'outputErrors'
    ],
    outputs: ['data', 'isValid', 'errors', 'parsedJson'],
    ai_hints: {
      purpose: 'Validate data against schemas, type checks, required fields, ranges, patterns, and JSON format',
      when_to_use: 'When you need to ensure data quality, conformance to expected structure, or verify JSON validity before processing',
      expected_edges: ['valid', 'invalid', 'error'],
      example_usage: '{"validateData": {"validationType": "required_fields", "data": "$.dataToValidate", "requiredFields": ["name", "email"], "valid?": "process", "invalid?": "reject"}}',
      example_config: '{"validationType": "json|type_check|required_fields|range|pattern|json_schema", "data": "any", "requiredFields?": "[string, ...]", "typeChecks?": "[{field, expectedType}, ...]", "outputErrors?": "boolean"}',
      get_from_state: [],
      post_to_state: ['validationResult', 'validationErrors', 'parsedJson']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      validationType = 'required_fields',
      data: configData,
      schema,
      typeChecks,
      requiredFields,
      rangeValidations,
      patternValidations,
      customValidator,
      stopOnError = true,
      outputErrors = true
    } = (config as ValidateDataNodeConfig) || {};

    // Extract data to validate from config first, then fall back to context.inputs
    const dataToValidate = configData !== undefined ? configData : context.inputs?.data;

    // For JSON validation, we accept string input
    if (validationType === 'json') {
      if (dataToValidate === undefined || dataToValidate === null) {
        return {
          error: () => ({
            error: 'No data to validate for JSON validation',
            nodeId: context.nodeId
          })
        };
      }
      // JSON validation handles its own type checking
    } else {
      // For other validation types, we require an object
      if (!dataToValidate || typeof dataToValidate !== 'object') {
        return {
          error: () => ({
            error: 'No data to validate or data is not an object',
            nodeId: context.nodeId
          })
        };
      }
    }

    try {
      let isValid = true;
      const errors: ValidationError[] = [];

      // Execute validation based on type
      switch (validationType) {
        case 'json': {
          const jsonResult = this.validateJson(dataToValidate);
          if (jsonResult.isValid) {
            // Store parsed JSON in state
            context.state.parsedJson = jsonResult.parsedValue;
            context.state.validationResult = {
              isValid: true,
              timestamp: new Date().toISOString(),
              validationType: 'json'
            };

            return {
              valid: () => ({
                data: dataToValidate,
                parsedJson: jsonResult.parsedValue,
                isValid: true,
                validationType: 'json'
              })
            };
          } else {
            context.state.validationResult = {
              isValid: false,
              timestamp: new Date().toISOString(),
              validationType: 'json'
            };
            context.state.validationErrors = [{
              field: '__json__',
              error: jsonResult.error || 'Invalid JSON',
              value: dataToValidate
            }];

            const response: any = {
              data: dataToValidate,
              isValid: false,
              validationType: 'json'
            };

            if (outputErrors) {
              response.errors = [{
                field: '__json__',
                error: jsonResult.error || 'Invalid JSON',
                value: dataToValidate
              }];
              response.errorCount = 1;
            }

            return {
              invalid: () => response
            };
          }
        }

        case 'json_schema':
          errors.push(...this.validateJsonSchema(dataToValidate, schema));
          break;

        case 'type_check':
          if (!typeChecks || !Array.isArray(typeChecks)) {
            return {
              error: () => ({
                error: 'Type checks array is required for type_check validation',
                nodeId: context.nodeId
              })
            };
          }
          errors.push(...this.validateTypes(dataToValidate, typeChecks));
          break;

        case 'required_fields':
          if (!requiredFields || !Array.isArray(requiredFields)) {
            return {
              error: () => ({
                error: 'Required fields array is required for required_fields validation',
                nodeId: context.nodeId
              })
            };
          }
          errors.push(...this.validateRequiredFields(dataToValidate, requiredFields));
          break;

        case 'range':
          if (!rangeValidations || !Array.isArray(rangeValidations)) {
            return {
              error: () => ({
                error: 'Range validations array is required for range validation',
                nodeId: context.nodeId
              })
            };
          }
          errors.push(...this.validateRanges(dataToValidate, rangeValidations));
          break;

        case 'pattern':
          if (!patternValidations || !Array.isArray(patternValidations)) {
            return {
              error: () => ({
                error: 'Pattern validations array is required for pattern validation',
                nodeId: context.nodeId
              })
            };
          }
          errors.push(...this.validatePatterns(dataToValidate, patternValidations));
          break;

        case 'custom':
          if (!customValidator || typeof customValidator !== 'string') {
            return {
              error: () => ({
                error: 'Custom validator function string is required for custom validation',
                nodeId: context.nodeId
              })
            };
          }
          errors.push(...this.validateCustom(dataToValidate, customValidator));
          break;

        default:
          return {
            error: () => ({
              error: `Unknown validation type: ${validationType}`,
              nodeId: context.nodeId
            })
          };
      }

      isValid = errors.length === 0;

      // Store validation results in state
      context.state.validationResult = {
        isValid,
        timestamp: new Date().toISOString(),
        validationType,
        itemsValidated: Array.isArray(dataToValidate) ? dataToValidate.length : 1
      };

      if (errors.length > 0) {
        context.state.validationErrors = errors;
      }

      // Build response based on validation result
      if (isValid) {
        return {
          valid: () => ({
            data: dataToValidate,
            isValid: true,
            validationType
          })
        };
      } else {
        const response: any = {
          data: dataToValidate,
          isValid: false,
          validationType
        };

        if (outputErrors) {
          response.errors = errors;
          response.errorCount = errors.length;
        }

        return {
          invalid: () => response
        };
      }
    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Validation execution failed',
          nodeId: context.nodeId,
          validationType,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Validate if a string is valid JSON
   * Returns the parsed value if valid, or error information if invalid
   */
  private validateJson(data: any): { isValid: boolean; parsedValue?: any; error?: string } {
    // If already an object/array, it's valid JSON (already parsed)
    if (typeof data === 'object' && data !== null) {
      return { isValid: true, parsedValue: data };
    }

    // If not a string, it's not valid JSON text
    if (typeof data !== 'string') {
      return {
        isValid: false,
        error: `Expected string for JSON validation, got ${typeof data}`
      };
    }

    // Try to parse the string as JSON
    try {
      const parsed = JSON.parse(data);
      // JSON.parse successfully parsed - check if it's an object or array
      if (typeof parsed === 'object' && parsed !== null) {
        return { isValid: true, parsedValue: parsed };
      } else {
        // Primitive values like "true", "123", "null" are technically valid JSON
        // but based on the requirement, we're validating for JSON objects
        return {
          isValid: false,
          error: `JSON parsed to primitive value (${typeof parsed}), expected object or array`
        };
      }
    } catch (parseError) {
      return {
        isValid: false,
        error: parseError instanceof Error ? parseError.message : 'Invalid JSON syntax'
      };
    }
  }

  /**
   * Validate data against JSON Schema
   * Note: This is a basic implementation. For production use, integrate with AJV library
   */
  private validateJsonSchema(data: any, schema?: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!schema) {
      errors.push({
        field: '__schema__',
        error: 'JSON Schema is required for json_schema validation'
      });
      return errors;
    }

    // Basic JSON Schema validation (simplified - in production use AJV)
    // This is a placeholder for actual JSON Schema validation
    if (schema.type && typeof data !== schema.type) {
      errors.push({
        field: '__root__',
        error: `Expected type ${schema.type}, got ${typeof data}`,
        value: data
      });
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push({
            field,
            error: `Required field is missing`,
            value: undefined
          });
        }
      }
    }

    if (schema.properties && typeof data === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data && typeof propSchema === 'object' && propSchema !== null) {
          const prop = propSchema as any;
          if (prop.type && typeof data[key] !== prop.type) {
            errors.push({
              field: key,
              error: `Expected type ${prop.type}, got ${typeof data[key]}`,
              value: data[key]
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate field types
   */
  private validateTypes(data: any, typeChecks: TypeCheck[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const check of typeChecks) {
      const value = this.getNestedValue(data, check.field);
      const actualType = this.getActualType(value);

      if (actualType !== check.expectedType) {
        errors.push({
          field: check.field,
          error: `Expected type ${check.expectedType}, got ${actualType}`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Validate required fields are present
   */
  private validateRequiredFields(data: any, requiredFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(data, field);

      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          error: 'Required field is missing or empty',
          value
        });
      }
    }

    return errors;
  }

  /**
   * Validate numeric ranges
   */
  private validateRanges(data: any, rangeValidations: RangeValidation[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const validation of rangeValidations) {
      const value = this.getNestedValue(data, validation.field);

      if (typeof value !== 'number') {
        errors.push({
          field: validation.field,
          error: `Field must be a number for range validation, got ${typeof value}`,
          value
        });
        continue;
      }

      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field: validation.field,
          error: `Value ${value} is below minimum ${validation.min}`,
          value
        });
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field: validation.field,
          error: `Value ${value} is above maximum ${validation.max}`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Validate patterns using regex
   */
  private validatePatterns(data: any, patternValidations: PatternValidation[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const validation of patternValidations) {
      const value = this.getNestedValue(data, validation.field);

      if (value === undefined || value === null) {
        errors.push({
          field: validation.field,
          error: validation.errorMessage || 'Field value is missing for pattern validation',
          value
        });
        continue;
      }

      const stringValue = String(value);
      let regex: RegExp;

      try {
        regex = new RegExp(validation.pattern);
      } catch (error) {
        errors.push({
          field: validation.field,
          error: `Invalid regex pattern: ${validation.pattern}`,
          value
        });
        continue;
      }

      if (!regex.test(stringValue)) {
        errors.push({
          field: validation.field,
          error: validation.errorMessage || `Value does not match pattern: ${validation.pattern}`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Execute custom validation function
   */
  private validateCustom(data: any, customValidator: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      // Create function from string (safe in controlled environment)
      // In production, consider using a safer evaluation method
      const validatorFn = new Function('data', customValidator);
      const result = validatorFn(data);

      // Custom validator should return true for valid, false or error array for invalid
      if (result === false) {
        errors.push({
          field: '__custom__',
          error: 'Custom validation failed'
        });
      } else if (Array.isArray(result)) {
        errors.push(...result);
      } else if (typeof result === 'object' && result !== null && result.valid === false) {
        errors.push({
          field: '__custom__',
          error: result.error || 'Custom validation failed',
          value: result.value
        });
      }
    } catch (error) {
      errors.push({
        field: '__custom__',
        error: error instanceof Error ? error.message : 'Custom validator execution failed'
      });
    }

    return errors;
  }

  /**
   * Get actual type of value (including array and null)
   */
  private getActualType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

export default ValidateDataNode;
