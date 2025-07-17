import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeExecutor } from './NodeExecutor';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { 
  SimpleNode, 
  CounterNode, 
  ConditionalNode, 
  ErrorNode, 
  DelayNode,
  TransformNode,
  MultiEdgeNode
} from '../nodes/test/MockNodes';

describe('NodeExecutor', () => {
  let nodeExecutor: NodeExecutor;
  let nodeRegistry: NodeRegistry;
  let stateManager: StateManager;

  beforeEach(() => {
    nodeRegistry = new NodeRegistry();
    stateManager = new StateManager();
    nodeExecutor = new NodeExecutor(nodeRegistry, stateManager);

    // Register mock nodes
    nodeRegistry.register(SimpleNode);
    nodeRegistry.register(CounterNode);
    nodeRegistry.register(ConditionalNode);
    nodeRegistry.register(ErrorNode);
    nodeRegistry.register(DelayNode);
    nodeRegistry.register(TransformNode);
    nodeRegistry.register(MultiEdgeNode);
  });

  describe('createExecution', () => {
    it('should create new execution with generated ID', async () => {
      const executionId = await nodeExecutor.createExecution('test-workflow');
      
      expect(executionId).toMatch(/^exec_[a-f0-9-]+$/);
      expect(stateManager.has(executionId)).toBe(true);
    });

    it('should initialize execution with initial state', async () => {
      const initialState = { count: 0, message: 'hello' };
      const executionId = await nodeExecutor.createExecution('test-workflow', initialState);
      
      const state = await stateManager.get(executionId);
      expect(state).toEqual(initialState);
    });
  });

  describe('executeNode', () => {
    let executionId: string;

    beforeEach(async () => {
      executionId = await nodeExecutor.createExecution('test-workflow');
    });

    it('should execute simple node successfully', async () => {
      const nodeConfig = { type: 'simple' };
      const result = await nodeExecutor.executeNode(
        'node1',
        nodeConfig,
        'test-workflow',
        executionId
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw error for missing node type', async () => {
      const nodeConfig = {}; // Missing type
      
      await expect(
        nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId)
      ).rejects.toThrow("Node 'node1' is missing required 'type' property");
    });

    it('should throw error for unknown node type', async () => {
      const nodeConfig = { type: 'unknown-type' };
      
      await expect(
        nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId)
      ).rejects.toThrow("Unknown node type 'unknown-type' for node 'node1'");
    });

    it('should pass configuration to node', async () => {
      const nodeConfig = {
        type: 'counter',
        config: { increment: 5 }
      };

      await nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId);
      
      const state = await stateManager.get(executionId);
      expect(state.count).toBe(5);
    });

    it('should pass inputs to node', async () => {
      const nodeConfig = { type: 'counter' };
      const inputs = { increment: 3 };

      await nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId, inputs);
      
      const state = await stateManager.get(executionId);
      expect(state.count).toBe(3);
    });

    it('should update state after node execution', async () => {
      // Initialize state with count
      await stateManager.update(executionId, { count: 10 });

      const nodeConfig = {
        type: 'counter',
        config: { increment: 5 }
      };

      await nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId);
      
      const state = await stateManager.get(executionId);
      expect(state.count).toBe(15);
    });

    it('should handle conditional node routing', async () => {
      const nodeConfig = {
        type: 'conditional',
        config: { condition: true }
      };

      const result = await nodeExecutor.executeNode(
        'node1',
        nodeConfig,
        'test-workflow',
        executionId
      );

      expect(result).toEqual({ true: 'next-if-true' });
    });

    it('should handle node execution errors', async () => {
      const nodeConfig = {
        type: 'error',
        config: { message: 'Test error message' }
      };

      await expect(
        nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId)
      ).rejects.toThrow("Failed to execute node 'node1' of type 'error': Test error message");
    });

    it('should execute delay node', async () => {
      const nodeConfig = {
        type: 'delay',
        config: { duration: 50 }
      };

      const start = Date.now();
      await nodeExecutor.executeNode('node1', nodeConfig, 'test-workflow', executionId);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some margin
      expect(elapsed).toBeLessThan(100);
    });

    it('should execute transform node', async () => {
      await stateManager.update(executionId, { input: 'hello' });

      const nodeConfig = {
        type: 'transform',
        config: {
          source: 'input',
          target: 'output',
          transform: 'uppercase'
        }
      };

      const result = await nodeExecutor.executeNode(
        'node1',
        nodeConfig,
        'test-workflow',
        executionId
      );

      const state = await stateManager.get(executionId);
      expect(state.output).toBe('HELLO');
      expect(result).toEqual({ success: 'HELLO' });
    });

    it('should handle multi-edge node', async () => {
      const nodeConfig = {
        type: 'multi-edge',
        config: {
          edge1: 'node-a',
          edge2: 'node-b',
          default: 'node-default'
        }
      };

      const result = await nodeExecutor.executeNode(
        'node1',
        nodeConfig,
        'test-workflow',
        executionId
      );

      expect(result).toEqual({
        edge1: 'node-a',
        edge2: 'node-b',
        default: 'node-default'
      });
    });
  });

  describe('completeExecution', () => {
    it('should schedule cleanup for execution', async () => {
      const executionId = await nodeExecutor.createExecution('test-workflow');
      
      // Spy on scheduleCleanup
      const scheduleCleanupSpy = vi.spyOn(stateManager, 'scheduleCleanup');
      
      await nodeExecutor.completeExecution(executionId, 5000);
      
      expect(scheduleCleanupSpy).toHaveBeenCalledWith(executionId, 5000);
    });

    it('should use default cleanup delay', async () => {
      const executionId = await nodeExecutor.createExecution('test-workflow');
      
      const scheduleCleanupSpy = vi.spyOn(stateManager, 'scheduleCleanup');
      
      await nodeExecutor.completeExecution(executionId);
      
      expect(scheduleCleanupSpy).toHaveBeenCalledWith(executionId, undefined);
    });
  });

  describe('getFinalState', () => {
    it('should retrieve final state of execution', async () => {
      const initialState = { result: 'success', count: 42 };
      const executionId = await nodeExecutor.createExecution('test-workflow', initialState);
      
      const finalState = await nodeExecutor.getFinalState(executionId);
      
      expect(finalState).toEqual(initialState);
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        nodeExecutor.getFinalState('non-existent')
      ).rejects.toThrow('No state found for execution: non-existent');
    });
  });

  describe('execution context', () => {
    it('should provide correct execution context to nodes', async () => {
      const executionId = await nodeExecutor.createExecution('test-workflow');
      
      // Create a custom node that validates the context
      class ContextValidatorNode extends SimpleNode {
        async execute(context: any): Promise<any> {
          expect(context).toHaveProperty('state');
          expect(context).toHaveProperty('inputs');
          expect(context).toHaveProperty('workflowId');
          expect(context).toHaveProperty('nodeId');
          expect(context).toHaveProperty('executionId');
          
          expect(context.workflowId).toBe('test-workflow');
          expect(context.nodeId).toBe('validator-node');
          expect(context.executionId).toBe(executionId);
          
          return { validated: true };
        }
      }

      const validatorNode = new ContextValidatorNode();
      vi.spyOn(nodeRegistry, 'get').mockReturnValue(ContextValidatorNode);

      const nodeConfig = { type: 'context-validator' };
      const result = await nodeExecutor.executeNode(
        'validator-node',
        nodeConfig,
        'test-workflow',
        executionId
      );

      expect(result).toEqual({ validated: true });
    });
  });
});