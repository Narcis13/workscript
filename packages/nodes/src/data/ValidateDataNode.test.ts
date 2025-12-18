import { describe, it, expect, beforeEach } from 'vitest';
import { ValidateDataNode } from './ValidateDataNode';
import type { ExecutionContext } from '@workscript/engine';

describe('ValidateDataNode', () => {
  let node: ValidateDataNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new ValidateDataNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'validate-1',
      executionId: 'test-execution-123'
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('validateData');
      expect(node.metadata.name).toBe('Validate Data');
      expect(node.metadata.version).toBe('1.1.0');
      expect(node.metadata.description).toContain('validate data');
    });

    it('should have ai_hints defined', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints?.purpose).toBeDefined();
      expect(node.metadata.ai_hints?.when_to_use).toBeDefined();
      expect(node.metadata.ai_hints?.expected_edges).toContain('valid');
      expect(node.metadata.ai_hints?.expected_edges).toContain('invalid');
    });

    it('should include data in inputs', () => {
      expect(node.metadata.inputs).toContain('data');
    });
  });

  describe('required_fields validation', () => {
    it('should validate when all required fields are present', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email', 'age']
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
      expect(context.state.validationResult?.isValid).toBe(true);
    });

    it('should fail validation when required fields are missing', async () => {
      const data = {
        name: 'John Doe'
        // email and age are missing
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email', 'age']
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors).toBeDefined();
      expect(response.errors.length).toBe(2);
      expect(context.state.validationErrors?.length).toBe(2);
    });

    it('should fail when required field is empty string', async () => {
      const data = {
        name: '',
        email: 'john@example.com'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email']
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors.length).toBe(1);
    });

    it('should fail when required field is null', async () => {
      const data = {
        name: null,
        email: 'john@example.com'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email']
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
    });

    it('should validate nested required fields using dot notation', async () => {
      const data = {
        user: {
          profile: {
            name: 'John'
          }
        }
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['user.profile.name']
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });
  });

  describe('type_check validation', () => {
    it('should validate correct types', async () => {
      const data = {
        name: 'John',
        age: 30,
        active: true,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' }
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'type_check',
        typeChecks: [
          { field: 'name', expectedType: 'string' },
          { field: 'age', expectedType: 'number' },
          { field: 'active', expectedType: 'boolean' },
          { field: 'tags', expectedType: 'array' },
          { field: 'metadata', expectedType: 'object' }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should fail validation for incorrect types', async () => {
      const data = {
        name: 123, // Should be string
        age: '30', // Should be number
        active: 'yes' // Should be boolean
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'type_check',
        typeChecks: [
          { field: 'name', expectedType: 'string' },
          { field: 'age', expectedType: 'number' },
          { field: 'active', expectedType: 'boolean' }
        ]
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors.length).toBe(3);
    });

    it('should correctly identify null type', async () => {
      const data = {
        value: null
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'type_check',
        typeChecks: [
          { field: 'value', expectedType: 'null' }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should correctly identify array vs object', async () => {
      const data = {
        list: [1, 2, 3],
        obj: { key: 'value' }
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'type_check',
        typeChecks: [
          { field: 'list', expectedType: 'array' },
          { field: 'obj', expectedType: 'object' }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });
  });

  describe('range validation', () => {
    it('should validate numbers within range', async () => {
      const data = {
        age: 25,
        score: 75,
        temperature: 20
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'range',
        rangeValidations: [
          { field: 'age', min: 18, max: 100 },
          { field: 'score', min: 0, max: 100 },
          { field: 'temperature', min: -10, max: 40 }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should fail validation for numbers below minimum', async () => {
      const data = {
        age: 15 // Below minimum of 18
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'range',
        rangeValidations: [
          { field: 'age', min: 18, max: 100 }
        ]
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors.length).toBe(1);
      expect(response.errors[0].error).toContain('below minimum');
    });

    it('should fail validation for numbers above maximum', async () => {
      const data = {
        score: 150 // Above maximum of 100
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'range',
        rangeValidations: [
          { field: 'score', min: 0, max: 100 }
        ]
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors[0].error).toContain('above maximum');
    });

    it('should validate with only minimum specified', async () => {
      const data = {
        age: 25
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'range',
        rangeValidations: [
          { field: 'age', min: 18 }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should validate with only maximum specified', async () => {
      const data = {
        age: 25
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'range',
        rangeValidations: [
          { field: 'age', max: 100 }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should fail for non-numeric values', async () => {
      const data = {
        age: 'twenty-five'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'range',
        rangeValidations: [
          { field: 'age', min: 18, max: 100 }
        ]
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors[0].error).toContain('must be a number');
    });
  });

  describe('pattern validation', () => {
    it('should validate email pattern', async () => {
      const data = {
        email: 'john.doe@example.com'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'pattern',
        patternValidations: [
          {
            field: 'email',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            errorMessage: 'Invalid email format'
          }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should fail validation for invalid email pattern', async () => {
      const data = {
        email: 'invalid-email'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'pattern',
        patternValidations: [
          {
            field: 'email',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            errorMessage: 'Invalid email format'
          }
        ]
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors[0].error).toBe('Invalid email format');
    });

    it('should validate phone number pattern', async () => {
      const data = {
        phone: '555-1234'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'pattern',
        patternValidations: [
          {
            field: 'phone',
            pattern: '^\\d{3}-\\d{4}$'
          }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should handle invalid regex pattern gracefully', async () => {
      const data = {
        value: 'test'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'pattern',
        patternValidations: [
          {
            field: 'value',
            pattern: '[invalid('
          }
        ]
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors[0].error).toContain('Invalid regex pattern');
    });

    it('should validate multiple patterns', async () => {
      const data = {
        email: 'john@example.com',
        phone: '555-1234',
        zip: '12345'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'pattern',
        patternValidations: [
          {
            field: 'email',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          },
          {
            field: 'phone',
            pattern: '^\\d{3}-\\d{4}$'
          },
          {
            field: 'zip',
            pattern: '^\\d{5}$'
          }
        ]
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });
  });

  describe('json_schema validation', () => {
    it('should validate basic JSON schema', async () => {
      const data = {
        name: 'John',
        age: 30
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'json_schema',
        schema: {
          type: 'object',
          required: ['name', 'age'],
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        }
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should fail when required properties are missing', async () => {
      const data = {
        name: 'John'
        // age is missing
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'json_schema',
        schema: {
          type: 'object',
          required: ['name', 'age'],
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        }
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return error when no data to validate', async () => {
      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name']
      });

      expect(result.error).toBeDefined();
      const response = await result.error!(context);
      expect(response.error).toContain('No data to validate');
    });

    it('should return error when validationType is unknown', async () => {
      const data = { name: 'John' };
      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'unknown_type' as any,
        requiredFields: ['name']
      });

      expect(result.error).toBeDefined();
      const response = await result.error!(context);
      expect(response.error).toContain('Unknown validation type');
    });

    it('should return error when type_check validation lacks typeChecks array', async () => {
      const data = { name: 'John' };
      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'type_check'
        // typeChecks missing
      });

      expect(result.error).toBeDefined();
      const response = await result.error!(context);
      expect(response.error).toContain('Type checks array is required');
    });

    it('should return error when required_fields validation lacks requiredFields array', async () => {
      const data = { name: 'John' };
      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields'
        // requiredFields missing
      });

      expect(result.error).toBeDefined();
      const response = await result.error!(context);
      expect(response.error).toContain('Required fields array is required');
    });
  });

  describe('output configuration', () => {
    it('should include errors when outputErrors is true', async () => {
      const data = {
        name: 'John'
        // email missing
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email'],
        outputErrors: true
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.errors).toBeDefined();
      expect(response.errorCount).toBe(1);
    });

    it('should exclude errors when outputErrors is false', async () => {
      const data = {
        name: 'John'
        // email missing
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email'],
        outputErrors: false
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.errors).toBeUndefined();
      expect(response.errorCount).toBeUndefined();
    });
  });

  describe('state management', () => {
    it('should store validation results in state', async () => {
      const data = {
        name: 'John',
        email: 'john@example.com'
      };

      context.inputs = { data };

      await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email']
      });

      expect(context.state.validationResult).toBeDefined();
      expect(context.state.validationResult.isValid).toBe(true);
      expect(context.state.validationResult.validationType).toBe('required_fields');
    });

    it('should store validation errors in state when validation fails', async () => {
      const data = {
        name: 'John'
      };

      context.inputs = { data };

      await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email']
      });

      expect(context.state.validationErrors).toBeDefined();
      expect(context.state.validationErrors.length).toBe(1);
    });
  });

  describe('data config property', () => {
    it('should accept data from config instead of context.inputs', async () => {
      const data = {
        name: 'John',
        email: 'john@example.com'
      };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        data: data,
        requiredFields: ['name', 'email']
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should prefer config data over context.inputs data', async () => {
      const inputData = {
        name: 'John'
        // email missing - would fail validation
      };

      const configData = {
        name: 'John',
        email: 'john@example.com'
        // has email - should pass validation
      };

      context.inputs = { data: inputData };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        data: configData,
        requiredFields: ['name', 'email']
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });

    it('should fall back to context.inputs when config data is not provided', async () => {
      const data = {
        name: 'John',
        email: 'john@example.com'
      };

      context.inputs = { data };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        requiredFields: ['name', 'email']
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
    });
  });

  describe('json validation', () => {
    it('should validate valid JSON string', async () => {
      const jsonString = '{"name": "John", "age": 30}';

      const result = await node.execute(context, {
        validationType: 'json',
        data: jsonString
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
      expect(response.parsedJson).toEqual({ name: 'John', age: 30 });
      expect(context.state.parsedJson).toEqual({ name: 'John', age: 30 });
    });

    it('should validate valid JSON array string', async () => {
      const jsonString = '[1, 2, 3, "four"]';

      const result = await node.execute(context, {
        validationType: 'json',
        data: jsonString
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
      expect(response.parsedJson).toEqual([1, 2, 3, 'four']);
    });

    it('should return invalid for invalid JSON string', async () => {
      const invalidJson = '{invalid json}';

      const result = await node.execute(context, {
        validationType: 'json',
        data: invalidJson
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.validationType).toBe('json');
    });

    it('should return invalid for JSON primitive values', async () => {
      const primitiveJson = '"just a string"';

      const result = await node.execute(context, {
        validationType: 'json',
        data: primitiveJson
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors[0].error).toContain('primitive value');
    });

    it('should accept already parsed object as valid JSON', async () => {
      const alreadyParsed = { name: 'John', age: 30 };

      const result = await node.execute(context, {
        validationType: 'json',
        data: alreadyParsed
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
      expect(response.parsedJson).toEqual(alreadyParsed);
    });

    it('should accept already parsed array as valid JSON', async () => {
      const alreadyParsed = [1, 2, 3];

      const result = await node.execute(context, {
        validationType: 'json',
        data: alreadyParsed
      });

      expect(result.valid).toBeDefined();
      const response = await result.valid!(context);
      expect(response.isValid).toBe(true);
      expect(response.parsedJson).toEqual(alreadyParsed);
    });

    it('should return invalid for non-string non-object data', async () => {
      const result = await node.execute(context, {
        validationType: 'json',
        data: 12345
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.isValid).toBe(false);
      expect(response.errors[0].error).toContain('Expected string');
    });

    it('should return error when no data is provided for json validation', async () => {
      const result = await node.execute(context, {
        validationType: 'json'
      });

      expect(result.error).toBeDefined();
      const response = await result.error!(context);
      expect(response.error).toContain('No data to validate');
    });

    it('should store validation result in state for json validation', async () => {
      const jsonString = '{"key": "value"}';

      await node.execute(context, {
        validationType: 'json',
        data: jsonString
      });

      expect(context.state.validationResult).toBeDefined();
      expect(context.state.validationResult.isValid).toBe(true);
      expect(context.state.validationResult.validationType).toBe('json');
      expect(context.state.parsedJson).toEqual({ key: 'value' });
    });

    it('should store validation errors in state for invalid json', async () => {
      const invalidJson = 'not valid json';

      await node.execute(context, {
        validationType: 'json',
        data: invalidJson
      });

      expect(context.state.validationResult).toBeDefined();
      expect(context.state.validationResult.isValid).toBe(false);
      expect(context.state.validationErrors).toBeDefined();
      expect(context.state.validationErrors.length).toBe(1);
    });

    it('should include errors in response when outputErrors is true', async () => {
      const invalidJson = 'invalid';

      const result = await node.execute(context, {
        validationType: 'json',
        data: invalidJson,
        outputErrors: true
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.errors).toBeDefined();
      expect(response.errorCount).toBe(1);
    });

    it('should exclude errors in response when outputErrors is false', async () => {
      const invalidJson = 'invalid';

      const result = await node.execute(context, {
        validationType: 'json',
        data: invalidJson,
        outputErrors: false
      });

      expect(result.invalid).toBeDefined();
      const response = await result.invalid!(context);
      expect(response.errors).toBeUndefined();
      expect(response.errorCount).toBeUndefined();
    });
  });

  describe('single edge return pattern', () => {
    it('should return exactly one edge for valid data', async () => {
      const data = { name: 'John', email: 'john@example.com' };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        data: data,
        requiredFields: ['name', 'email']
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.valid).toBeDefined();
    });

    it('should return exactly one edge for invalid data', async () => {
      const data = { name: 'John' };

      const result = await node.execute(context, {
        validationType: 'required_fields',
        data: data,
        requiredFields: ['name', 'email']
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.invalid).toBeDefined();
    });

    it('should return exactly one edge for error conditions', async () => {
      const result = await node.execute(context, {
        validationType: 'required_fields'
        // Missing requiredFields
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });

    it('should return exactly one edge for json validation', async () => {
      const result = await node.execute(context, {
        validationType: 'json',
        data: '{"valid": true}'
      });

      expect(Object.keys(result)).toHaveLength(1);
    });
  });
});
