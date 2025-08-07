/**
 * ExecutionEngine tests
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ExecutionEngine, ExecutionEngineError, LoopLimitError } from './ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { WorkflowNode } from '../types';
import type { ParsedWorkflow } from '../parser/WorkflowParser';

// Mock node for testing
class TestNode extends WorkflowNode {
  metadata = {
    id: 'test-node',
    name: 'Test Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    return {
      success: () => ({ processed: true }),
      error: () => undefined
    };
  }
}

class ConditionalNode extends WorkflowNode {
  metadata = {
    id: 'conditional-node',
    name: 'Conditional Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    const condition = config?.condition || context.state.condition;
    return {
      success: () => condition ? { result: 'success' } : undefined,
      failure: () => !condition ? { result: 'failure' } : undefined
    };
  }
}

class LoopNode extends WorkflowNode {
  metadata = {
    id: 'loop-node...',
    name: 'Loop Node',
    version: '1.0.0'
  };

  async execute(context: any) {
    const counter = context.state.counter || 0;
    context.state.counter = counter + 1;
    
    return {
      continue: () => counter < 3 ? { counter: counter + 1 } : undefined,
      complete: () => counter >= 3 ? { completed: true } : undefined
    };
  }
}

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;

  beforeEach(async () => {
    registry = new NodeRegistry();
    stateManager = new StateManager();
    engine = new ExecutionEngine(registry, stateManager);

    // Register test nodes
    await registry.register(TestNode);
    await registry.register(ConditionalNode);
    await registry.register(LoopNode);
  });

  describe('execute', () => {
    it('should execute a simple workflow successfully', async () => {
      const workflow: ParsedWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_0'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.workflowId).toBe('test-workflow');
      expect(result.executionId).toMatch(/^exec_/);
      expect(result.finalState).toBeDefined();
    });

    it('should handle workflow with initial state', async () => {
      const workflow: ParsedWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        initialState: { counter: 0, data: 'initial' },
        nodes: [
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_0'
          }
        ]
      };

      const result = await engine.execute(workflow);
//console.log(result)
      expect(result.status).toBe('completed');
      expect(result.finalState).toMatchObject({
        counter: 0,
        data: 'initial'
      });
    });

    it('should handle node execution errors', async () => {
      // Create a node that throws an error
      class ErrorNode extends WorkflowNode {
        metadata = { id: 'error-node', name: 'Error Node', version: '1.0.0' };
        async execute(): Promise<any> {
          throw new Error('Test error');
        }
      }

      await registry.register(ErrorNode);

      const workflow: ParsedWorkflow = {
        id: 'error-workflow',
        name: 'Error Workflow',
        nodes: [{ 
          nodeId: 'error-node', 
          config: {}, 
          edges: {},
          children: [],
          depth: 0,
          uniqueId: 'error-node_0'
        }]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Node execution failed');
    });

    it('should handle error edges when node fails', async () => {
      class ErrorNode extends WorkflowNode {
        metadata = { id: 'error-node', name: 'Error Node', version: '1.0.0' };
        async execute(): Promise<any> {
          throw new Error('Test error');
        }
      }

      await registry.register(ErrorNode);

      const workflow: ParsedWorkflow = {
        id: 'error-workflow',
        name: 'Error Workflow',
        nodes: [
          {
            nodeId: 'error-node',
            config: {},
            edges: { 
              error: { 
                type: 'simple', 
                target: 'test-node' 
              } 
            },
            children: [],
            depth: 0,
            uniqueId: 'error-node_0'
          },
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
    });

    it('should execute multiple nodes in sequence', async () => {
      const workflow: ParsedWorkflow = {
        id: 'sequence-workflow',
        name: 'Sequence Workflow',
        nodes: [
          { 
            nodeId: 'test-node', 
            config: {}, 
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_0'
          },
          { 
            nodeId: 'test-node', 
            config: {}, 
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          },
          { 
            nodeId: 'test-node', 
            config: {}, 
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_2'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
    });

    it('should handle conditional routing', async () => {
      const workflow: ParsedWorkflow = {
        id: 'conditional-workflow',
        name: 'Conditional Workflow',
        initialState: { condition: true },
        nodes: [
          {
            nodeId: 'conditional-node',
            config: {},
            edges: {
              success: { type: 'simple', target: 'test-node' },
              failure: { type: 'simple', target: 'test-node' }
            },
            children: [],
            depth: 0,
            uniqueId: 'conditional-node_0'
          },
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
    });

    it('should handle loop nodes with iteration limits', async () => {
      const workflow: ParsedWorkflow = {
        id: 'loop-workflow',
        name: 'Loop Workflow',
        initialState: { counter: 0 },
        nodes: [
          {
            nodeId: 'loop-node...',
            config: {},
            edges: {
              continue: { type: 'simple', target: 'loop-node...' },
              complete: { type: 'simple', target: 'test-node' }
            },
            children: [],
            depth: 0,
            uniqueId: 'loop-node_0'
          },
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.counter).toBeGreaterThan(0);
    });

    it('should prevent infinite loops', async () => {
      class InfiniteLoopNode extends WorkflowNode {
        metadata = { id: 'infinite-loop...', name: 'Infinite Loop', version: '1.0.0' };
        async execute() {
          return {
            continue: () => ({ loop: true })
          };
        }
      }

      await registry.register(InfiniteLoopNode);

      const workflow: ParsedWorkflow = {
        id: 'infinite-workflow',
        name: 'Infinite Workflow',
        nodes: [
          {
            nodeId: 'infinite-loop...',
            config: {},
            edges: { 
              continue: { type: 'simple', target: 'infinite-loop...' } 
            },
            children: [],
            depth: 0,
            uniqueId: 'infinite-loop_0'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Loop limit exceeded');
    });

    it('should handle array edge routes', async () => {
      const workflow: ParsedWorkflow = {
        id: 'array-route-workflow',
        name: 'Array Route Workflow',
        nodes: [
          {
            nodeId: 'conditional-node',
            config: { condition: true },
            edges: {
              success: { 
                type: 'sequence', 
                sequence: ['test-node', 'test-node'] 
              }
            },
            children: [],
            depth: 0,
            uniqueId: 'conditional-node_0'
          },
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
    });

    it('should handle nested configuration routes', async () => {
      const workflow: ParsedWorkflow = {
        id: 'nested-workflow',
        name: 'Nested Workflow',
        nodes: [
          {
            nodeId: 'conditional-node',
            config: { condition: true },
            edges: {
              success: {
                type: 'nested',
                nestedNode: {
                  nodeId: 'test-node',
                  config: { param: 'nested' },
                  edges: {},
                  children: [],
                  depth: 1,
                  uniqueId: 'test-node_nested'
                }
              }
            },
            children: [],
            depth: 0,
            uniqueId: 'conditional-node_0'
          },
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
    });

    it('should handle edge routing to Registry-only nodes', async () => {
      // Create a separate node that exists only in Registry, not in workflow
      class RegistryOnlyNode extends WorkflowNode {
        metadata = {
          id: 'registry-only-node',
          name: 'Registry Only Node',
          version: '1.0.0'
        };

        async execute(context: any, config?: any) {
          context.state.registryNodeExecuted = true;
          return {
            success: () => ({ registryResult: 'executed' })
          };
        }
      }

      await registry.register(RegistryOnlyNode);

      const workflow: ParsedWorkflow = {
        id: 'registry-route-workflow',
        name: 'Registry Route Workflow',
        nodes: [
          {
            nodeId: 'conditional-node',
            config: { condition: true },
            edges: {
              success: { 
                type: 'simple', 
                target: 'registry-only-node' 
              }
            },
            children: [],
            depth: 0,
            uniqueId: 'conditional-node_0'
          },
          {
            nodeId: 'test-node',
            config: {},
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'test-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.registryNodeExecuted).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should create ExecutionEngineError with proper details', () => {
      const originalError = new Error('Original error');
      const engineError = new ExecutionEngineError(
        'Engine error',
        'exec-123',
        'test-node',
        originalError
      );

      expect(engineError.message).toBe('Engine error');
      expect(engineError.executionId).toBe('exec-123');
      expect(engineError.nodeId).toBe('test-node');
      expect(engineError.originalError).toBe(originalError);
    });

    it('should create LoopLimitError with proper details', () => {
      const loopError = new LoopLimitError('exec-123', 'loop-node...');

      expect(loopError.message).toContain('Loop limit exceeded');
      expect(loopError.executionId).toBe('exec-123');
      expect(loopError.nodeId).toBe('loop-node...');
    });
  });

  describe('state management', () => {
    it('should preserve state across node executions', async () => {
      class StateModifyingNode extends WorkflowNode {
        metadata = { id: 'state-node', name: 'State Node', version: '1.0.0' };
        async execute(context: any) {
          context.state.modified = true;
          context.state.count = (context.state.count || 0) + 1;
          return { success: () => ({ modified: true }) };
        }
      }

      await registry.register(StateModifyingNode);

      const workflow: ParsedWorkflow = {
        id: 'state-workflow',
        name: 'State Workflow',
        initialState: { count: 0 },
        nodes: [
          { 
            nodeId: 'state-node', 
            config: {}, 
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'state-node_0'
          },
          { 
            nodeId: 'state-node', 
            config: {}, 
            edges: {},
            children: [],
            depth: 0,
            uniqueId: 'state-node_1'
          }
        ]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.modified).toBe(true);
      expect(result.finalState?.count).toBeGreaterThan(0);
    });
  });
});