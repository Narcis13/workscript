/**
 * Tests for HookManager integration with ExecutionEngine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { HookManager } from './HookManager';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { WorkflowParser } from '../parser/WorkflowParser';
describe('HookManager Integration', () => {
    let hookManager;
    let engine;
    let parser;
    let registry;
    let stateManager;
    beforeEach(async () => {
        hookManager = new HookManager();
        registry = new NodeRegistry();
        stateManager = new StateManager();
        engine = new ExecutionEngine(registry, stateManager, hookManager);
        // Load nodes first
        await registry.discoverFromPackages('shared');
        // Create parser with registry
        parser = new WorkflowParser(registry);
    });
    it('should execute workflow lifecycle hooks', async () => {
        const hookCalls = [];
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
        // Execute a simple workflow
        const workflowJson = {
            id: 'test-hooks-workflow',
            name: 'Test Hooks Workflow',
            version: '1.0.0',
            workflow: [
                {
                    math: {
                        operation: 'add',
                        values: [1, 2, 3]
                    }
                }
            ]
        };
        const parsed = await parser.parse(workflowJson);
        const result = await engine.execute(parsed);
        expect(result.status).toBe('completed');
        expect(hookCalls).toEqual([
            'before-start:test-hooks-workflow',
            'after-start:test-hooks-workflow',
            'after-end:test-hooks-workflow'
        ]);
    });
    it('should execute node execution hooks', async () => {
        const hookCalls = [];
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
        // Execute a simple workflow
        const workflowJson = {
            id: 'test-node-hooks',
            name: 'Test Node Hooks',
            version: '1.0.0',
            workflow: [
                {
                    math: {
                        operation: 'add',
                        values: [1, 2]
                    }
                },
                {
                    logic: {
                        operation: 'and',
                        values: [true, true]
                    }
                }
            ]
        };
        const parsed = await parser.parse(workflowJson);
        const result = await engine.execute(parsed);
        expect(result.status).toBe('completed');
        expect(hookCalls).toContain('before-execute:math');
        expect(hookCalls).toContain('after-execute:math');
        expect(hookCalls).toContain('before-execute:logic');
        expect(hookCalls).toContain('after-execute:logic');
    });
    it('should execute hooks with filters', async () => {
        const hookCalls = [];
        // Register hook with node filter
        hookManager.register('node:after-execute', {
            name: 'math-only-logger',
            nodeFilter: ['math'],
            handler: async (context) => {
                hookCalls.push(`filtered:${context.nodeId}`);
            }
        });
        // Register hook with condition filter
        hookManager.register('node:after-execute', {
            name: 'conditional-logger',
            filter: (context) => context.nodeId === 'logic',
            handler: async (context) => {
                hookCalls.push(`conditional:${context.nodeId}`);
            }
        });
        // Execute workflow with multiple node types
        const workflowJson = {
            id: 'test-filtered-hooks',
            name: 'Test Filtered Hooks',
            version: '1.0.0',
            workflow: [
                {
                    math: {
                        operation: 'add',
                        values: [1, 2]
                    }
                },
                {
                    logic: {
                        operation: 'and',
                        values: [true, true]
                    }
                }
            ]
        };
        const parsed = await parser.parse(workflowJson);
        const result = await engine.execute(parsed);
        expect(result.status).toBe('completed');
        expect(hookCalls).toContain('filtered:math');
        expect(hookCalls).toContain('conditional:logic');
        expect(hookCalls).not.toContain('filtered:logic');
        expect(hookCalls).not.toContain('conditional:math');
    });
    it('should handle hook execution errors gracefully', async () => {
        const hookCalls = [];
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
        // Execute workflow
        const workflowJson = {
            id: 'test-error-handling',
            name: 'Test Error Handling',
            version: '1.0.0',
            workflow: [
                {
                    math: {
                        operation: 'add',
                        values: [1, 2]
                    }
                }
            ]
        };
        const parsed = await parser.parse(workflowJson);
        const result = await engine.execute(parsed);
        // Workflow should still complete successfully
        expect(result.status).toBe('completed');
        // Success hook should still execute
        expect(hookCalls).toContain('success:test-error-handling');
    });
    it('should execute hooks with priority order', async () => {
        const hookCalls = [];
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
        // Execute workflow
        const workflowJson = {
            id: 'test-priority',
            name: 'Test Priority',
            version: '1.0.0',
            workflow: [
                {
                    math: {
                        operation: 'add',
                        values: [1]
                    }
                }
            ]
        };
        const parsed = await parser.parse(workflowJson);
        await engine.execute(parsed);
        // Hooks should execute in priority order (highest first)
        expect(hookCalls).toEqual(['high', 'medium', 'low']);
    });
});
