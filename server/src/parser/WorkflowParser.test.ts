import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, WorkflowValidationError } from './WorkflowParser';
import { NodeRegistry } from '../registry/NodeRegistry';
import { WorkflowNode } from '../../../shared/src/types';
import type { NodeMetadata, ExecutionContext, EdgeMap } from '../../../shared/src/types';

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
            start: {
              type: 'action',
              config: { message: 'Starting workflow' },
              edges: {
                next: 'process'
              }
            }
          },
          {
            process: {
              type: 'decision',
              edges: {
                'true': 'success',
                'false': 'failure'
              }
            }
          },
          {
            success: {
              type: 'action',
              config: { message: 'Success!' }
            }
          },
          {
            failure: {
              type: 'action',
              config: { message: 'Failed!' }
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
            start: {
              type: 'action'
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
            start: {
              type: 'action'
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
            start: {
              type: 'unknown-node',
              edges: {
                next: 'end'
              }
            }
          },
          {
            end: {
              type: 'action'
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/workflow[0]/start/type',
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
            start: {
              type: 'action',
              edges: {
                next: 'non-existent-node'
              }
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/workflow[0]/start/edges/next',
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
            start: {
              type: 'decision',
              edges: {
                'true': {
                  type: 'action',
                  config: { message: 'Inline action' },
                  edges: {
                    done: 'end'
                  }
                },
                'false': 'end'
              }
            }
          },
          {
            end: {
              type: 'action'
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for nested node with missing type', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            start: {
              type: 'decision',
              edges: {
                'true': {
                  config: { message: 'Missing type' }
                }
              }
            }
          }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(false);
      // Schema validation catches this error before semantic validation
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: '/workflow[0]/start/edges/true',
          message: 'Nested node configuration must have a type',
          code: 'NESTED_NODE_MISSING_TYPE'
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
            start: {
              type: 'action',
              edges: {
                next: ['step1', 'step2', 'step3']
              }
            }
          },
          { step1: { type: 'action' } },
          { step2: { type: 'action' } },
          { step3: { type: 'action' } }
        ]
      };

      const result = parser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate optional edges', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            start: {
              type: 'action',
              edges: {
                'next?': 'end',
                'fallback': 'error'
              }
            }
          },
          { end: { type: 'action' } },
          { error: { type: 'action' } }
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
            start: {
              type: 'action',
              config: { message: 'Hello' },
              edges: {
                next: 'end'
              }
            }
          },
          {
            end: {
              type: 'action',
              config: { message: 'Goodbye' }
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
      
      const startNode = parsed.nodes.find(n => n.nodeId === 'start');
      expect(startNode).toBeDefined();
      expect(startNode?.config).toEqual({ message: 'Hello' });
      expect(startNode?.edges).toEqual({ next: 'end' });
    });

    it('should parse optional edges correctly', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            start: {
              type: 'action',
              edges: {
                'success?': 'end',
                'error': 'errorHandler'
              }
            }
          },
          { end: { type: 'action' } },
          { errorHandler: { type: 'action' } }
        ]
      };

      const parsed = parser.parse(workflow);
      const startNode = parsed.nodes.find(n => n.nodeId === 'start');
      
      expect(startNode?.edges).toEqual({
        success: 'end',
        error: 'errorHandler'
      });
    });

    it('should parse array edge routes', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            start: {
              type: 'action',
              edges: {
                pipeline: ['step1', 'step2', 'step3']
              }
            }
          },
          { step1: { type: 'action' } },
          { step2: { type: 'action' } },
          { step3: { type: 'action' } }
        ]
      };

      const parsed = parser.parse(workflow);
      const startNode = parsed.nodes.find(n => n.nodeId === 'start');
      
      expect(startNode?.edges.pipeline).toEqual(['step1', 'step2', 'step3']);
    });

    it('should parse nested node configurations', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            start: {
              type: 'decision',
              edges: {
                'true': {
                  type: 'action',
                  config: { message: 'Inline success' },
                  edges: {
                    done: 'end'
                  }
                },
                'false': 'end'
              }
            }
          },
          { end: { type: 'action' } }
        ]
      };

      const parsed = parser.parse(workflow);
      const startNode = parsed.nodes.find(n => n.nodeId === 'start');
      
      expect(startNode?.edges['true']).toEqual({
        type: 'action',
        config: { message: 'Inline success' },
        edges: {
          done: 'end'
        }
      });
      expect(startNode?.edges['false']).toBe('end');
    });

    it('should throw WorkflowValidationError for invalid workflow', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            start: {
              type: 'invalid-node'
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

    it('should separate config from edges in parsed nodes', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            complexNode: {
              type: 'action',
              timeout: 5000,
              retries: 3,
              config: {
                apiUrl: 'https://api.example.com',
                method: 'POST'
              },
              edges: {
                success: 'nextStep',
                'error?': 'errorHandler'
              }
            }
          },
          { nextStep: { type: 'action' } },
          { errorHandler: { type: 'action' } }
        ]
      };

      const parsed = parser.parse(workflow);
      const complexNode = parsed.nodes.find(n => n.nodeId === 'complexNode');
      
      expect(complexNode?.config).toEqual({
        apiUrl: 'https://api.example.com',
        method: 'POST'
      });
      expect(complexNode?.edges).toEqual({
        success: 'nextStep',
        error: 'errorHandler'
      });
    });
  });
});