import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser } from './WorkflowParser';
import type { WorkflowDefinition } from 'shared/dist';

describe('WorkflowParser', () => {
  let parser: WorkflowParser;

  beforeEach(() => {
    parser = new WorkflowParser();
  });

  describe('validate', () => {
    it('should validate a correct workflow definition', () => {
      const validWorkflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'test-node'
          }
        }
      };

      const result = parser.validate(validWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow missing required id field', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'test-node' }
        }
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('missing_required_field');
      expect(result.errors[0]?.message).toContain('id');
    });

    it('should reject workflow missing required name field', () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'test-node' }
        }
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('missing_required_field');
      expect(result.errors[0]?.message).toContain('name');
    });

    it('should reject workflow missing required version field', () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        workflow: {
          'node1': { type: 'test-node' }
        }
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe('missing_required_field');
      expect(result.errors[0]?.message).toContain('version');
    });

    it('should reject workflow missing required workflow field', () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0'
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('missing_required_field');
      expect(result.errors[0].message).toContain('workflow');
    });

    it('should reject workflow with invalid id format', () => {
      const invalidWorkflow = {
        id: 'test workflow!',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'test-node' }
        }
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid_id_format');
    });

    it('should reject workflow with invalid version format', () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0',
        workflow: {
          'node1': { type: 'test-node' }
        }
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid_version_format');
    });

    it('should reject workflow with empty workflow object', () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {}
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('empty_workflow');
    });

    it('should accept workflow with initialState', () => {
      const validWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        initialState: {
          counter: 0,
          data: 'test'
        },
        workflow: {
          'node1': { type: 'test-node' }
        }
      };

      const result = parser.validate(validWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow with additional properties', () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'test-node' }
        },
        unknownProperty: 'should not be here'
      };

      const result = parser.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('unknown_property');
    });
  });

  describe('parse', () => {
    it('should parse valid JSON workflow', () => {
      const workflowJson = JSON.stringify({
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'test-node' }
        }
      });

      const result = parser.parse(workflowJson);
      expect(result.id).toBe('test-workflow');
      expect(result.name).toBe('Test Workflow');
      expect(result.version).toBe('1.0.0');
      expect(result.workflow).toHaveProperty('node1');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      expect(() => parser.parse(invalidJson)).toThrow('Invalid JSON');
    });

    it('should throw error for JSON that fails validation', () => {
      const invalidWorkflowJson = JSON.stringify({
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'test-node' }
        }
        // missing required 'id' field
      });

      expect(() => parser.parse(invalidWorkflowJson)).toThrow('Workflow validation failed');
    });

    it('should parse workflow with initialState', () => {
      const workflowJson = JSON.stringify({
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        initialState: {
          counter: 0
        },
        workflow: {
          'node1': { type: 'test-node' }
        }
      });

      const result = parser.parse(workflowJson);
      expect(result.initialState).toEqual({ counter: 0 });
    });
  });
});