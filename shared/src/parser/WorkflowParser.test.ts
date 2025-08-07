import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, WorkflowValidationError } from './WorkflowParser';
import { NodeRegistry } from '../registry/NodeRegistry';
import { WorkflowNode } from '../types';
import type { NodeMetadata, ExecutionContext, EdgeMap } from '../types';

// Mock node implementations for testing
class MockActionNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'action',
    name: 'Action Node',
    version: '1.0.0',
    description: 'A mock action node for testing'
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return { success: true };
  }
}

class MockDecisionNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'decision',
    name: 'Decision Node',
    version: '1.0.0',
    description: 'A mock decision node for testing'
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return { true: 'yes', false: 'no' };
  }
}

describe('WorkflowParser', () => {
  let parser: WorkflowParser;
  let registry: NodeRegistry;

  beforeEach(async () => {
    registry = new NodeRegistry();
    await registry.register(MockActionNode);
    await registry.register(MockDecisionNode);
    parser = new WorkflowParser(registry);
  });

  describe('validate', () => {
    it('should validate a correct workflow definition', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              message: 'Starting workflow',
              'next?': 'decision'
            }
          },
          {
            decision: {
              'true?': 'action',
              'false?': 'action'
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const workflow = {
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              message: 'test'
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/',
          code: 'SCHEMA_VALIDATION_ERROR'
        })
      );
    });

    it('should fail validation for invalid version format', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: 'v1.0',
        workflow: [
          {
            action: {
              message: 'test'
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/version',
          code: 'SCHEMA_VALIDATION_ERROR'
        })
      );
    });

    it('should fail validation for non-existent node type', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            'unknown-node': {
              'next?': 'action'
            }
          },
          'action'
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/workflow[0]/unknown-node',
          message: "Node type 'unknown-node' not found in registry",
          code: 'NODE_TYPE_NOT_FOUND'
        })
      );
    });

    it('should fail validation for edge referencing non-existent node', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              'next?': 'non-existent-node'
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/workflow[0]/action/next?',
          message: "Edge references non-existent node 'non-existent-node'",
          code: 'EDGE_TARGET_NOT_FOUND'
        })
      );
    });

    it('should validate nested node configurations', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            decision: {
              'true?': {
                action: {
                  message: 'Inline action',
                  'done?': 'action'
                }
              },
              'false?': 'action'
            }
          },
          'action'
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for nested node with invalid node type', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            decision: {
              'true?': {
                'invalid-node': {
                  message: 'Invalid nested node'
                }
              }
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/workflow[0]/decision/true?/invalid-node',
          message: "Nested node type 'invalid-node' not found in registry",
          code: 'NODE_TYPE_NOT_FOUND'
        })
      );
    });

    it('should validate array edge routes', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              'next?': ['action', 'decision', 'action']
            }
          },
          'action',
          'decision'
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate edges with question mark syntax', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              message: 'test parameter',
              'success?': 'action',
              'error?': 'decision'
            }
          },
          'action',
          'decision'
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('parse', () => {
    it('should parse a valid workflow definition', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        initialState: { counter: 0 },
        workflow: [
          {
            action: {
              message: 'Hello',
              'next?': 'action'
            }
          },
          {
            action: {
              message: 'Goodbye'
            }
          }
        ]
      };

      const parsed = parser.parse(workflow);
      
      expect(parsed.id).toBe('test-workflow');
      expect(parsed.name).toBe('Test Workflow');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.initialState).toEqual({ counter: 0 });
      expect(parsed.nodes).toHaveLength(2);
      
      const firstNode = parsed.nodes[0];
      expect(firstNode?.nodeId).toBe('action');
      expect(firstNode?.config).toEqual({ message: 'Hello' });
      expect(firstNode?.edges).toEqual({ 
        next: { 
          type: 'simple', 
          target: 'action' 
        } 
      });
    });

    it('should parse question mark edges correctly', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              timeout: 5000,
              'success?': 'action',
              'error?': 'decision'
            }
          },
          'action',
          'decision'
        ]
      };

      const parsed = parser.parse(workflow);
      const firstNode = parsed.nodes[0];
      
      expect(firstNode?.nodeId).toBe('action');
      expect(firstNode?.config).toEqual({ timeout: 5000 });
      expect(firstNode?.edges).toEqual({
        success: { type: 'simple', target: 'action' },
        error: { type: 'simple', target: 'decision' }
      });
    });

    it('should parse array edge routes', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              'pipeline?': ['action', 'decision', 'action']
            }
          },
          'action',
          'decision'
        ]
      };

      const parsed = parser.parse(workflow);
      const firstNode = parsed.nodes[0];
      
      expect(firstNode?.nodeId).toBe('action');
      expect(firstNode?.edges.pipeline).toEqual({
        type: 'sequence',
        sequence: ['action', 'decision', 'action']
      });
    });

    it('should parse nested node configurations', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            decision: {
              'true?': {
                action: {
                  message: 'Inline success',
                  'done?': 'action'
                }
              },
              'false?': 'action'
            }
          },
          'action'
        ]
      };

      const parsed = parser.parse(workflow);
      const firstNode = parsed.nodes[0];
      
      expect(firstNode?.nodeId).toBe('decision');
      
      // Check 'true' edge structure
      const trueEdge = firstNode?.edges['true'];
      expect(trueEdge?.type).toBe('nested');
      expect(trueEdge?.nestedNode?.nodeId).toBe('action');
      expect(trueEdge?.nestedNode?.config).toEqual({ message: 'Inline success' });
      expect(trueEdge?.nestedNode?.edges['done']).toEqual({
        type: 'simple',
        target: 'action'
      });
      
      // Check 'false' edge structure
      expect(firstNode?.edges['false']).toEqual({
        type: 'simple',
        target: 'action'
      });
    });

    it('should throw WorkflowValidationError for invalid workflow', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            'invalid-node': {
              message: 'test'
            }
          }
        ]
      };

      expect(() => parser.parse(workflow)).toThrow(WorkflowValidationError);
      
      try {
        parser.parse(workflow);
      } catch (error) {
        expect(error).toBeInstanceOf(WorkflowValidationError);
        expect((error as WorkflowValidationError).errors).toHaveLength(1);
        expect((error as WorkflowValidationError).errors[0]?.code).toBe('NODE_TYPE_NOT_FOUND');
      }
    });

    it('should separate parameters from edges in parsed nodes', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              timeout: 5000,
              retries: 3,
              apiUrl: 'https://api.example.com',
              method: 'POST',
              'success?': 'action',
              'error?': 'decision'
            }
          },
          'action',
          'decision'
        ]
      };

      const parsed = parser.parse(workflow);
      const firstNode = parsed.nodes[0];
      
      expect(firstNode?.nodeId).toBe('action');
      expect(firstNode?.config).toEqual({
        timeout: 5000,
        retries: 3,
        apiUrl: 'https://api.example.com',
        method: 'POST'
      });
      expect(firstNode?.edges).toEqual({
        success: { type: 'simple', target: 'action' },
        error: { type: 'simple', target: 'decision' }
      });
    });

    it('should parse simple string node references', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          'action',
          'decision',
          {
            action: {
              message: 'configured node',
              'next?': 'decision'
            }
          }
        ]
      };

      const parsed = parser.parse(workflow);
      
      expect(parsed.nodes).toHaveLength(3);
      
      // First node: simple string reference
      expect(parsed.nodes[0]?.nodeId).toBe('action');
      expect(parsed.nodes[0]?.config).toEqual({});
      expect(parsed.nodes[0]?.edges).toEqual({});
      
      // Second node: simple string reference
      expect(parsed.nodes[1]?.nodeId).toBe('decision');
      expect(parsed.nodes[1]?.config).toEqual({});
      expect(parsed.nodes[1]?.edges).toEqual({});
      
      // Third node: configured node
      expect(parsed.nodes[2]?.nodeId).toBe('action');
      expect(parsed.nodes[2]?.config).toEqual({ message: 'configured node' });
      expect(parsed.nodes[2]?.edges).toEqual({ 
        next: { type: 'simple', target: 'decision' } 
      });
    });
  });
});