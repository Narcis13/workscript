/**
 * Unit tests for HookManager functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookManager } from './HookManager';
import type { HookContext } from './types';

describe('HookManager Unit Tests', () => {
  let hookManager: HookManager;

  beforeEach(() => {
    hookManager = new HookManager();
  });

  it('should register and execute hooks', async () => {
    const hookCalls: string[] = [];

    const hookId = hookManager.register('workflow:before-start', {
      name: 'test-hook',
      handler: async (context) => {
        hookCalls.push(`executed:${context.eventType}`);
      }
    });

    expect(hookId).toBeDefined();
    expect(hookManager.hasHooks('workflow:before-start')).toBe(true);
    expect(hookManager.getHookCount()).toBe(1);

    const context: HookContext = {
      eventType: 'workflow:before-start',
      timestamp: new Date(),
      workflowId: 'test-workflow'
    };

    const results = await hookManager.executeHooks('workflow:before-start', context);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(hookCalls).toEqual(['executed:workflow:before-start']);
  });

  it('should execute hooks in priority order', async () => {
    const hookCalls: string[] = [];

    // Register hooks with different priorities
    hookManager.register('workflow:before-start', {
      name: 'low-priority',
      priority: 1,
      handler: async () => {
        hookCalls.push('low');
      }
    });

    hookManager.register('workflow:before-start', {
      name: 'high-priority',
      priority: 10,
      handler: async () => {
        hookCalls.push('high');
      }
    });

    hookManager.register('workflow:before-start', {
      name: 'medium-priority',
      priority: 5,
      handler: async () => {
        hookCalls.push('medium');
      }
    });

    const context: HookContext = {
      eventType: 'workflow:before-start',
      timestamp: new Date(),
      workflowId: 'test-workflow'
    };

    await hookManager.executeHooks('workflow:before-start', context);

    // Should execute in priority order (highest first)
    expect(hookCalls).toEqual(['high', 'medium', 'low']);
  });

  it('should apply filters correctly', async () => {
    const hookCalls: string[] = [];

    // Hook with node filter
    hookManager.register('node:after-execute', {
      name: 'node-filtered',
      nodeFilter: ['math'],
      handler: async (context) => {
        hookCalls.push(`filtered:${context.nodeId}`);
      }
    });

    // Hook with condition filter
    hookManager.register('node:after-execute', {
      name: 'conditional',
      filter: (context) => context.nodeId === 'logic',
      handler: async (context) => {
        hookCalls.push(`conditional:${context.nodeId}`);
      }
    });

    // Test with math node (should trigger node-filtered)
    const mathContext: HookContext = {
      eventType: 'node:after-execute',
      timestamp: new Date(),
      nodeId: 'math'
    };

    await hookManager.executeHooks('node:after-execute', mathContext);

    // Test with logic node (should trigger conditional)
    const logicContext: HookContext = {
      eventType: 'node:after-execute',
      timestamp: new Date(),
      nodeId: 'logic'
    };

    await hookManager.executeHooks('node:after-execute', logicContext);

    // Test with other node (should trigger neither)
    const otherContext: HookContext = {
      eventType: 'node:after-execute',
      timestamp: new Date(),
      nodeId: 'other'
    };

    await hookManager.executeHooks('node:after-execute', otherContext);

    expect(hookCalls).toEqual(['filtered:math', 'conditional:logic']);
  });

  it('should handle once hooks correctly', async () => {
    const hookCalls: string[] = [];

    hookManager.register('workflow:before-start', {
      name: 'once-hook',
      once: true,
      handler: async () => {
        hookCalls.push('executed');
      }
    });

    const context: HookContext = {
      eventType: 'workflow:before-start',
      timestamp: new Date(),
      workflowId: 'test-workflow'
    };

    // Execute twice
    await hookManager.executeHooks('workflow:before-start', context);
    await hookManager.executeHooks('workflow:before-start', context);

    // Should only execute once
    expect(hookCalls).toEqual(['executed']);
  });

  it('should handle hook errors gracefully', async () => {
    const hookCalls: string[] = [];

    // Hook that throws error
    hookManager.register('workflow:before-start', {
      name: 'error-hook',
      handler: async () => {
        throw new Error('Hook error');
      }
    });

    // Hook that succeeds
    hookManager.register('workflow:before-start', {
      name: 'success-hook',
      handler: async () => {
        hookCalls.push('success');
      }
    });

    const context: HookContext = {
      eventType: 'workflow:before-start',
      timestamp: new Date(),
      workflowId: 'test-workflow'
    };

    const results = await hookManager.executeHooks('workflow:before-start', context);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeInstanceOf(Error);
    expect(results[1].success).toBe(true);
    expect(hookCalls).toEqual(['success']);
  });

  it('should manage hook registration and unregistration', () => {
    const hookId = hookManager.register('workflow:before-start', {
      name: 'test-hook',
      handler: async () => {}
    });

    expect(hookManager.hasHooks('workflow:before-start')).toBe(true);
    expect(hookManager.getHookCount()).toBe(1);

    const success = hookManager.unregister(hookId);
    expect(success).toBe(true);
    expect(hookManager.hasHooks('workflow:before-start')).toBe(false);
    expect(hookManager.getHookCount()).toBe(0);

    // Try to unregister again
    const failed = hookManager.unregister(hookId);
    expect(failed).toBe(false);
  });

  it('should provide event emitter access', () => {
    const eventEmitter = hookManager.getEventEmitter();
    expect(eventEmitter).toBeDefined();
    expect(typeof eventEmitter.on).toBe('function');
    expect(typeof eventEmitter.emit).toBe('function');
  });

  it('should clear all hooks', () => {
    hookManager.register('workflow:before-start', {
      name: 'hook1',
      handler: async () => {}
    });

    hookManager.register('node:after-execute', {
      name: 'hook2',
      handler: async () => {}
    });

    expect(hookManager.getHookCount()).toBe(2);
    expect(hookManager.getEventTypes()).toEqual(['workflow:before-start', 'node:after-execute']);

    hookManager.clear();

    expect(hookManager.getHookCount()).toBe(0);
    expect(hookManager.getEventTypes()).toEqual([]);
  });
});