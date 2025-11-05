/**
 * Simple integration test for HookManager with ExecutionEngine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookManager } from './HookManager';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import type { ParsedWorkflow } from '../parser/WorkflowParser';

describe('HookManager Integration (Simple)', () => {
  let hookManager: HookManager;
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;

  beforeEach(async () => {
    hookManager = new HookManager();
    registry = new NodeRegistry();
    stateManager = new StateManager();
    engine = new ExecutionEngine(registry, stateManager, hookManager);

    // Register a simple mock node directly
    registry.registerNode('test-node', {
      metadata: {
        id: 'test-node',
        name: 'Test Node',
        version: '1.0.0'
      },
      async execute(context) {
        context.state.testResult = 'executed';
        return { success: () => ({ result: 'ok' }) };
      }
    });
  });

  it('should execute workflow lifecycle hooks', async () => {
    const hookCalls: string[] = [];

    // Register workflow lifecycle hooks
    hookManager.register('workflow:before-start', {
      name: 'before-start-logger',
      handler: async (context) => {
        hookCalls.push(`before-start:${context.workflowId}`);
      }
    });

    hookManager.register('workflow:after-start', {
      name: 'after-start-logger',
      handler: async (context) => {
        hookCalls.push(`after-start:${context.workflowId}`);
      }
    });

    hookManager.register('workflow:after-end', {
      name: 'after-end-logger',
      handler: async (context) => {
        hookCalls.push(`after-end:${context.workflowId}`);
      }
    });

    // Create a simple parsed workflow directly (bypass parser)
    const workflow: ParsedWorkflow = {
      id: 'test-hooks-workflow',
      name: 'Test Hooks Workflow',
      version: '1.0.0',
      description: 'Test workflow for hooks',
      initialState: {},
      nodes: [
        {
          nodeId: 'test-node',
          nodeType: 'test-node',
          isLoopNode: false,
          baseNodeType: 'test-node',
          config: {},
          edges: {}
        }
      ]
    };

    const result = await engine.execute(workflow);

    expect(result.status).toBe('completed');
    expect(hookCalls).toEqual([
      'before-start:test-hooks-workflow',
      'after-start:test-hooks-workflow',
      'after-end:test-hooks-workflow'
    ]);
  });

  it('should execute node execution hooks', async () => {
    const hookCalls: string[] = [];

    // Register node execution hooks
    hookManager.register('node:before-execute', {
      name: 'node-before-logger',
      handler: async (context) => {
        hookCalls.push(`before-execute:${context.nodeId}`);
      }
    });

    hookManager.register('node:after-execute', {
      name: 'node-after-logger',
      handler: async (context) => {
        hookCalls.push(`after-execute:${context.nodeId}`);
      }
    });

    // Create workflow with test node
    const workflow: ParsedWorkflow = {
      id: 'test-node-hooks',
      name: 'Test Node Hooks',
      version: '1.0.0',
      description: 'Test workflow for node hooks',
      initialState: {},
      nodes: [
        {
          nodeId: 'test-node',
          nodeType: 'test-node',
          isLoopNode: false,
          baseNodeType: 'test-node',
          config: {},
          edges: {}
        }
      ]
    };

    const result = await engine.execute(workflow);

    expect(result.status).toBe('completed');
    expect(hookCalls).toContain('before-execute:test-node');
    expect(hookCalls).toContain('after-execute:test-node');
  });

  it('should execute hooks with filters', async () => {
    const hookCalls: string[] = [];

    // Register hook with node filter
    hookManager.register('node:after-execute', {
      name: 'test-node-only-logger',
      nodeFilter: ['test-node'],
      handler: async (context) => {
        hookCalls.push(`filtered:${context.nodeId}`);
      }
    });

    // Register hook with condition filter
    hookManager.register('node:after-execute', {
      name: 'conditional-logger',
      filter: (context) => context.nodeId === 'test-node',
      handler: async (context) => {
        hookCalls.push(`conditional:${context.nodeId}`);
      }
    });

    // Create workflow
    const workflow: ParsedWorkflow = {
      id: 'test-filtered-hooks',
      name: 'Test Filtered Hooks',
      version: '1.0.0',
      description: 'Test workflow for filtered hooks',
      initialState: {},
      nodes: [
        {
          nodeId: 'test-node',
          nodeType: 'test-node',
          isLoopNode: false,
          baseNodeType: 'test-node',
          config: {},
          edges: {}
        }
      ]
    };

    const result = await engine.execute(workflow);

    expect(result.status).toBe('completed');
    expect(hookCalls).toContain('filtered:test-node');
    expect(hookCalls).toContain('conditional:test-node');
  });

  it('should handle hook execution errors gracefully', async () => {
    const hookCalls: string[] = [];

    // Register a hook that throws an error
    hookManager.register('workflow:before-start', {
      name: 'error-hook',
      handler: async () => {
        throw new Error('Hook error');
      }
    });

    // Register a hook that should still execute
    hookManager.register('workflow:after-start', {
      name: 'success-hook',
      handler: async (context) => {
        hookCalls.push(`success:${context.workflowId}`);
      }
    });

    // Create workflow
    const workflow: ParsedWorkflow = {
      id: 'test-error-handling',
      name: 'Test Error Handling',
      version: '1.0.0',
      description: 'Test workflow for error handling',
      initialState: {},
      nodes: [
        {
          nodeId: 'test-node',
          nodeType: 'test-node',
          isLoopNode: false,
          baseNodeType: 'test-node',
          config: {},
          edges: {}
        }
      ]
    };

    const result = await engine.execute(workflow);

    // Workflow should still complete successfully
    expect(result.status).toBe('completed');
    // Success hook should still execute
    expect(hookCalls).toContain('success:test-error-handling');
  });

  it('should provide access to hook manager from engine', () => {
    const retrievedHookManager = engine.getHookManager();
    expect(retrievedHookManager).toBe(hookManager);
    expect(retrievedHookManager.getHookCount()).toBe(0);
    
    // Register a hook
    retrievedHookManager.register('workflow:before-start', {
      name: 'test-hook',
      handler: async () => {}
    });
    
    expect(retrievedHookManager.getHookCount()).toBe(1);
  });
});