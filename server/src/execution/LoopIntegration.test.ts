import { describe, it, expect, beforeEach } from 'vitest';
import { NodeExecutor } from './NodeExecutor';
import { EdgeRouter } from '../routing/EdgeRouter';
import { LoopManager } from './LoopManager';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { WorkflowParser } from '../parser/WorkflowParser';
import { LoopNode, BatchProcessorNode, ValidationNode } from '../nodes/test/LoopNode';
import { SimpleNode } from '../nodes/test/MockNodes';
import type { WorkflowDefinition } from 'shared/dist';

describe('Loop Integration', () => {
  let nodeExecutor: NodeExecutor;
  let edgeRouter: EdgeRouter;
  let loopManager: LoopManager;
  let nodeRegistry: NodeRegistry;
  let stateManager: StateManager;
  let workflowParser: WorkflowParser;

  beforeEach(() => {
    nodeRegistry = new NodeRegistry();
    stateManager = new StateManager();
    loopManager = new LoopManager();
    nodeExecutor = new NodeExecutor(nodeRegistry, stateManager, loopManager);
    workflowParser = new WorkflowParser(nodeRegistry);

    // Register loop nodes
    nodeRegistry.register(LoopNode);
    nodeRegistry.register(BatchProcessorNode);
    nodeRegistry.register(ValidationNode);
    nodeRegistry.register(SimpleNode);
  });

  describe('loop workflow validation', () => {
    it('should validate workflow with loop edges', () => {
      const workflow: WorkflowDefinition = {
        id: 'loop-workflow',
        name: 'Loop Workflow',
        version: '1.0.0',
        workflow: {
          'processor': {
            type: 'loop',
            edges: {
              'loop?': ['batch-processor', 'validator'],
              'complete?': 'summary',
              'error?': 'error-handler'
            }
          },
          'batch-processor': {
            type: 'batch-processor'
          },
          'validator': {
            type: 'validator'
          },
          'summary': {
            type: 'simple'
          },
          'error-handler': {
            type: 'simple'
          }
        }
      };

      const result = workflowParser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not flag loop edges as circular references', () => {
      const workflow: WorkflowDefinition = {
        id: 'loop-workflow',
        name: 'Loop Workflow',
        version: '1.0.0',
        workflow: {
          'processor': {
            type: 'loop',
            edges: {
              'loop': 'processor', // Self-reference via loop edge
              'complete': 'end'
            }
          },
          'end': {
            type: 'simple'
          }
        }
      };

      const result = workflowParser.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag non-loop circular references', () => {
      const workflow: WorkflowDefinition = {
        id: 'circular-workflow',
        name: 'Circular Workflow',
        version: '1.0.0',
        workflow: {
          'processor': {
            type: 'loop',
            edges: {
              'success': 'processor' // Self-reference via success edge
            }
          }
        }
      };

      const result = workflowParser.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'circular_reference')).toBe(true);
    });
  });

  describe('loop execution flow', () => {
    it('should execute simple loop sequence', async () => {
      const workflow: WorkflowDefinition = {
        id: 'simple-loop',
        name: 'Simple Loop',
        version: '1.0.0',
        initialState: { 
          items: ['item1', 'item2', 'item3'],
          processedCount: 0
        },
        workflow: {
          'processor': {
            type: 'loop',
            config: { batchSize: 1, maxIterations: 5 },
            edges: {
              'loop?': ['batch-processor'],
              'complete?': 'summary'
            }
          },
          'batch-processor': {
            type: 'batch-processor'
          },
          'summary': {
            type: 'simple'
          }
        }
      };

      const edgeRouter = new EdgeRouter(workflow);
      const executionId = await nodeExecutor.createExecution(workflow.id, workflow.initialState);

      // Start with processor node
      let currentNodeId = 'processor';
      let executionCount = 0;
      const maxExecutions = 15;

      while (currentNodeId && executionCount < maxExecutions) {
        const nodeConfig = workflow.workflow[currentNodeId];
        const edgeMap = await nodeExecutor.executeNode(
          currentNodeId,
          nodeConfig,
          workflow.id,
          executionId
        );

        const routeResult = edgeRouter.routeEdges(currentNodeId, edgeMap);

        if (routeResult.isLoop && loopManager.hasLoopEdge(edgeMap) && !loopManager.isInLoop(executionId)) {
          // Start loop
          const loopSequence = loopManager.extractLoopSequence(routeResult);
          if (loopSequence) {
            const loopResult = loopManager.startLoop(executionId, currentNodeId, loopSequence);
            currentNodeId = loopResult.nextNode;
          }
        } else if (loopManager.isInLoop(executionId)) {
          // Continue loop
          const loopResult = loopManager.continueLoop(executionId, currentNodeId, edgeMap);
          if (loopResult.terminated) {
            // Loop terminated, handle non-loop edge
            if (Object.keys(edgeMap).length > 0) {
              const nonLoopRoute = edgeRouter.routeEdges(currentNodeId, edgeMap);
              currentNodeId = nonLoopRoute.nextNodes[0] || null;
            } else {
              currentNodeId = null;
            }
          } else {
            currentNodeId = loopResult.nextNode;
          }
        } else {
          // Normal routing
          currentNodeId = routeResult.nextNodes[0] || null;
        }

        executionCount++;
      }

      const finalState = await nodeExecutor.getFinalState(executionId);
      expect(finalState.processedCount).toBe(3); // All items processed
      expect(finalState.completed).toBe(true);
      expect(finalState.results).toHaveLength(3);

      await nodeExecutor.completeExecution(executionId);
    });

    it('should handle loop termination on max iterations', async () => {
      const workflow: WorkflowDefinition = {
        id: 'max-iterations-loop',
        name: 'Max Iterations Loop',
        version: '1.0.0',
        initialState: { 
          items: Array.from({ length: 100 }, (_, i) => `item${i}`)
        },
        workflow: {
          'processor': {
            type: 'loop',
            config: { batchSize: 1, maxIterations: 3 },
            edges: {
              'loop?': ['batch-processor'],
              'complete?': 'summary',
              'error?': 'error-handler'
            }
          },
          'batch-processor': {
            type: 'batch-processor'
          },
          'summary': {
            type: 'simple'
          },
          'error-handler': {
            type: 'simple'
          }
        }
      };

      const edgeRouter = new EdgeRouter(workflow);
      const executionId = await nodeExecutor.createExecution(workflow.id, workflow.initialState);

      // Execute processor node multiple times
      let iterationCount = 0;
      let currentNodeId = 'processor';

      while (iterationCount < 5) {
        const nodeConfig = workflow.workflow[currentNodeId];
        const edgeMap = await nodeExecutor.executeNode(
          currentNodeId,
          nodeConfig,
          workflow.id,
          executionId
        );

        if (edgeMap.error) {
          // Max iterations reached
          break;
        }

        if (edgeMap.loop) {
          const routeResult = edgeRouter.routeEdges(currentNodeId, edgeMap);
          const loopSequence = loopManager.extractLoopSequence(routeResult);
          
          if (loopSequence && !loopManager.isInLoop(executionId)) {
            const loopResult = loopManager.startLoop(executionId, currentNodeId, loopSequence);
            // Execute the loop sequence
            await nodeExecutor.executeNode(
              loopResult.nextNode!,
              workflow.workflow[loopResult.nextNode!],
              workflow.id,
              executionId
            );
            loopManager.continueLoop(executionId, loopResult.nextNode!, { success: true });
          }
        }

        iterationCount++;
      }

      const finalState = await nodeExecutor.getFinalState(executionId);
      expect(finalState.iterations).toBe(4); // 3 max + 1 initial
      expect(finalState.processedCount).toBe(3); // Only 3 items processed due to max iterations

      await nodeExecutor.completeExecution(executionId);
    });
  });

  describe('edge routing with loops', () => {
    it('should prioritize loop edges over other edges', () => {
      const workflow: WorkflowDefinition = {
        id: 'priority-test',
        name: 'Priority Test',
        version: '1.0.0',
        workflow: {
          'processor': {
            type: 'loop',
            edges: {
              'loop?': ['batch-processor'],
              'complete?': 'summary',
              'success?': 'alternative'
            }
          },
          'batch-processor': { type: 'batch-processor' },
          'summary': { type: 'simple' },
          'alternative': { type: 'simple' }
        }
      };

      const edgeRouter = new EdgeRouter(workflow);
      const edgeMap = { loop: 'continue', success: 'done' };
      
      const result = edgeRouter.routeEdges('processor', edgeMap);
      
      expect(result.isLoop).toBe(true);
      expect(result.nextNodes).toEqual(['batch-processor']);
    });

    it('should handle non-loop edges when loop not present', () => {
      const workflow: WorkflowDefinition = {
        id: 'non-loop-test',
        name: 'Non-Loop Test',
        version: '1.0.0',
        workflow: {
          'processor': {
            type: 'loop',
            edges: {
              'loop?': ['batch-processor'],
              'complete?': 'summary'
            }
          },
          'batch-processor': { type: 'batch-processor' },
          'summary': { type: 'simple' }
        }
      };

      const edgeRouter = new EdgeRouter(workflow);
      const edgeMap = { complete: 'done' };
      
      const result = edgeRouter.routeEdges('processor', edgeMap);
      
      expect(result.isLoop).toBeUndefined();
      expect(result.nextNodes).toEqual(['summary']);
    });
  });

  describe('loop state management', () => {
    it('should preserve state across loop iterations', async () => {
      const executionId = await nodeExecutor.createExecution('test-workflow', { counter: 0 });
      
      // Start loop
      const loopResult = loopManager.startLoop(executionId, 'processor', ['increment']);
      expect(loopResult.loopState?.iteration).toBe(0);
      
      // Execute first iteration
      await stateManager.update(executionId, { counter: 1 });
      const continueResult1 = loopManager.continueLoop(executionId, 'increment', { success: true });
      expect(continueResult1.nextNode).toBe('processor');
      
      // Execute second iteration
      await stateManager.update(executionId, { counter: 2 });
      const continueResult2 = loopManager.continueLoop(executionId, 'processor', { loop: 'continue' });
      expect(continueResult2.loopState?.iteration).toBe(1);
      
      // Check that state was preserved
      const finalState = await stateManager.get(executionId);
      expect(finalState.counter).toBe(2);
      
      await nodeExecutor.completeExecution(executionId);
    });
  });

  describe('loop statistics and monitoring', () => {
    it('should provide loop statistics', () => {
      const executionId = 'stats-test';
      loopManager.startLoop(executionId, 'processor', ['batch', 'validate'], 50, 10000);
      
      const stats = loopManager.getLoopStats(executionId);
      expect(stats).toBeDefined();
      expect(stats.nodeId).toBe('processor');
      expect(stats.iteration).toBe(0);
      expect(stats.maxIterations).toBe(50);
      expect(stats.sequenceLength).toBe(2);
      expect(stats.isActive).toBe(true);
      expect(stats.elapsedTime).toBeGreaterThanOrEqual(0);
      expect(stats.maxExecutionTime).toBe(10000);
    });

    it('should validate loop sequences', () => {
      const workflow: WorkflowDefinition = {
        id: 'validation-test',
        name: 'Validation Test',
        version: '1.0.0',
        workflow: {
          'node1': { type: 'simple' },
          'node2': { type: 'simple' }
        }
      };

      const validSequence = ['node1', 'node2'];
      const invalidSequence = ['node1', 'non-existent'];
      
      expect(loopManager.validateLoopSequence(validSequence, workflow)).toEqual([]);
      expect(loopManager.validateLoopSequence(invalidSequence, workflow)).toHaveLength(1);
    });
  });
});