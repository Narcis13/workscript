import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeRouter } from './EdgeRouter';
import type { WorkflowDefinition, EdgeMap } from 'shared/dist';

describe('EdgeRouter', () => {
  let router: EdgeRouter;
  let sampleWorkflow: WorkflowDefinition;

  beforeEach(() => {
    sampleWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      workflow: {
        'start': {
          type: 'simple',
          edges: {
            'success': 'process',
            'error?': 'error-handler'
          }
        },
        'process': {
          type: 'counter',
          edges: {
            'success': 'validate',
            'retry?': ['backup', 'process'],
            'complex?': {
              'notify': {
                message: 'Processing complete',
                level: 'info'
              }
            }
          }
        },
        'validate': {
          type: 'conditional',
          edges: {
            'valid': 'complete',
            'invalid?': 'error-handler'
          }
        },
        'backup': {
          type: 'simple'
        },
        'error-handler': {
          type: 'log'
        },
        'notify': {
          type: 'log'
        },
        'complete': {
          type: 'simple'
        }
      }
    };

    router = new EdgeRouter(sampleWorkflow);
  });

  describe('routeEdges', () => {
    it('should route to single node on success', () => {
      const edgeMap: EdgeMap = { success: true };
      const result = router.routeEdges('start', edgeMap);

      expect(result.nextNodes).toEqual(['process']);
      expect(result.inlineConfigs).toEqual({});
      expect(result.isOptional).toBe(false);
      expect(result.continueSequence).toBe(false);
    });

    it('should route to optional edge when present', () => {
      const edgeMap: EdgeMap = { error: 'something went wrong' };
      const result = router.routeEdges('start', edgeMap);

      expect(result.nextNodes).toEqual(['error-handler']);
      expect(result.isOptional).toBe(true);
      expect(result.continueSequence).toBe(false);
    });

    it('should continue to next node when optional edge not triggered', () => {
      const edgeMap: EdgeMap = { success: true };
      const result = router.routeEdges('start', edgeMap);

      expect(result.nextNodes).toEqual(['process']);
      expect(result.continueSequence).toBe(false);
    });

    it('should continue to next node in sequence when no edges match', () => {
      const edgeMap: EdgeMap = { unknown: true };
      const result = router.routeEdges('start', edgeMap);

      expect(result.nextNodes).toEqual(['process']);
      expect(result.continueSequence).toBe(true);
    });

    it('should handle node sequence routing', () => {
      const edgeMap: EdgeMap = { retry: true };
      const result = router.routeEdges('process', edgeMap);

      expect(result.nextNodes).toEqual(['backup', 'process']);
      expect(result.inlineConfigs).toEqual({});
      expect(result.isOptional).toBe(true);
      expect(result.continueSequence).toBe(false);
    });

    it('should handle nested configuration routing', () => {
      const edgeMap: EdgeMap = { complex: 'processed' };
      const result = router.routeEdges('process', edgeMap);

      expect(result.nextNodes).toEqual(['notify']);
      expect(result.inlineConfigs).toEqual({
        'notify': {
          message: 'Processing complete',
          level: 'info'
        }
      });
      expect(result.isOptional).toBe(true);
      expect(result.continueSequence).toBe(false);
    });

    it('should handle node with no edges', () => {
      const edgeMap: EdgeMap = { success: true };
      const result = router.routeEdges('backup', edgeMap);

      expect(result.nextNodes).toEqual(['error-handler']);
      expect(result.continueSequence).toBe(true);
    });

    it('should handle end of sequence', () => {
      const edgeMap: EdgeMap = { success: true };
      const result = router.routeEdges('complete', edgeMap);

      expect(result.nextNodes).toEqual([]);
      expect(result.continueSequence).toBe(false);
    });
  });

  describe('single node routing', () => {
    it('should resolve existing node reference', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: { 'success': 'node2' }
          },
          'node2': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { success: true });

      expect(result.nextNodes).toEqual(['node2']);
      expect(result.continueSequence).toBe(false);
    });

    it('should throw error for non-existent required node', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: { 'success': 'non-existent' }
          }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      
      expect(() => {
        testRouter.routeEdges('node1', { success: true });
      }).toThrow("Node reference 'non-existent' not found in workflow");
    });

    it('should continue sequence for non-existent optional node', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: { 'error?': 'non-existent' }
          },
          'node2': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { error: true });

      expect(result.nextNodes).toEqual([]);
      expect(result.isOptional).toBe(true);
      expect(result.continueSequence).toBe(true);
    });
  });

  describe('array routing', () => {
    it('should handle mixed array with strings and objects', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: {
              'complex': [
                'node2',
                { 'node3': { config: 'value' } },
                'node4'
              ]
            }
          },
          'node2': { type: 'simple' },
          'node3': { type: 'simple' },
          'node4': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { complex: true });

      expect(result.nextNodes).toEqual(['node2', 'node3', 'node4']);
      expect(result.inlineConfigs).toEqual({
        'node3': { config: 'value' }
      });
    });

    it('should skip non-existent nodes in optional array', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: {
              'retry?': ['node2', 'non-existent', 'node3']
            }
          },
          'node2': { type: 'simple' },
          'node3': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { retry: true });

      expect(result.nextNodes).toEqual(['node2', 'node3']);
      expect(result.isOptional).toBe(true);
    });
  });

  describe('nested configuration routing', () => {
    it('should handle multiple nested configurations', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: {
              'multi': {
                'node2': { config1: 'value1' },
                'node3': { config2: 'value2' }
              }
            }
          },
          'node2': { type: 'simple' },
          'node3': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { multi: true });

      expect(result.nextNodes).toEqual(['node2', 'node3']);
      expect(result.inlineConfigs).toEqual({
        'node2': { config1: 'value1' },
        'node3': { config2: 'value2' }
      });
    });
  });

  describe('getNextInSequence', () => {
    it('should return next node in sequence', () => {
      const next = router.getNextInSequence('start');
      expect(next).toBe('process');
    });

    it('should return null for last node', () => {
      const next = router.getNextInSequence('complete');
      expect(next).toBeNull();
    });

    it('should return null for non-existent node', () => {
      const next = router.getNextInSequence('non-existent');
      expect(next).toBeNull();
    });
  });

  describe('getNodeEdges', () => {
    it('should return all edges for a node', () => {
      const edges = router.getNodeEdges('start');
      
      expect(edges).toHaveLength(2);
      expect(edges[0]).toEqual({
        name: 'success',
        isOptional: false,
        value: 'process'
      });
      expect(edges[1]).toEqual({
        name: 'error',
        isOptional: true,
        value: 'error-handler'
      });
    });

    it('should return empty array for node without edges', () => {
      const edges = router.getNodeEdges('backup');
      expect(edges).toEqual([]);
    });

    it('should return empty array for non-existent node', () => {
      const edges = router.getNodeEdges('non-existent');
      expect(edges).toEqual([]);
    });
  });

  describe('validateAllEdges', () => {
    it('should return no errors for valid workflow', () => {
      const errors = router.validateAllEdges();
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid node references', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: {
              'success': 'non-existent',
              'error?': 'also-missing'
            }
          }
        }
      };

      const testRouter = new EdgeRouter(invalidWorkflow);
      const errors = testRouter.validateAllEdges();

      expect(errors).toHaveLength(1); // Only required edge should error
      expect(errors[0]).toContain("Node reference 'non-existent' not found");
    });
  });

  describe('edge parsing', () => {
    it('should match exact edge names', () => {
      const edgeMap: EdgeMap = { success: true };
      const result = router.routeEdges('start', edgeMap);

      expect(result.nextNodes).toEqual(['process']);
      expect(result.isOptional).toBe(false);
    });

    it('should match optional edge names', () => {
      const edgeMap: EdgeMap = { error: 'failed' };
      const result = router.routeEdges('start', edgeMap);

      expect(result.nextNodes).toEqual(['error-handler']);
      expect(result.isOptional).toBe(true);
    });

    it('should prioritize exact matches over optional', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: {
              'result': 'exact-match',
              'result?': 'optional-match'
            }
          },
          'exact-match': { type: 'simple' },
          'optional-match': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { result: true });

      expect(result.nextNodes).toEqual(['exact-match']);
      expect(result.isOptional).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid edge configurations gracefully', () => {
      const workflow: WorkflowDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        workflow: {
          'node1': {
            type: 'simple',
            edges: {
              'invalid': null as any
            }
          },
          'node2': { type: 'simple' }
        }
      };

      const testRouter = new EdgeRouter(workflow);
      const result = testRouter.routeEdges('node1', { invalid: true });

      expect(result.nextNodes).toEqual([]);
      expect(result.continueSequence).toBe(true);
    });
  });
});