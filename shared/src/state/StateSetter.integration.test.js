/**
 * Integration tests for State Setter syntactic sugar ($.path.to.state)
 * Tests the complete flow from workflow definition through parser to execution
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser } from '../parser/WorkflowParser';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from './StateManager';
import { HookManager } from '../hooks/HookManager';
describe('State Setter Integration Tests', () => {
    let parser;
    let engine;
    let registry;
    let stateManager;
    let hookManager;
    beforeEach(async () => {
        registry = new NodeRegistry();
        // Register StateSetterNode FIRST (before creating parser)
        const { StateSetterNode } = await import('../../nodes/StateSetterNode');
        await registry.register(StateSetterNode, { source: 'universal' });
        stateManager = new StateManager();
        hookManager = new HookManager();
        parser = new WorkflowParser(registry);
        engine = new ExecutionEngine(registry, stateManager, hookManager);
    });
    describe('Basic State Setter Functionality', () => {
        it('should set simple state value', async () => {
            const workflow = {
                id: 'test-simple-setter',
                name: 'Test Simple Setter',
                version: '1.0.0',
                workflow: [
                    {
                        '$.config.timeout': {
                            value: 30
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.config).toEqual({ timeout: 30 });
        });
        it('should preserve object structure with shorthand syntax (no explicit value key)', async () => {
            const workflow = {
                id: 'test-shorthand-object',
                name: 'Test Shorthand Object',
                version: '1.0.0',
                workflow: [
                    {
                        '$.author': {
                            name: 'Narcis Brindusescu'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            // Should store the entire object, not just the value
            expect(result.finalState?.author).toEqual({ name: 'Narcis Brindusescu' });
        });
        it('should preserve multi-property object structure with shorthand syntax', async () => {
            const workflow = {
                id: 'test-multi-property-object',
                name: 'Test Multi-Property Object',
                version: '1.0.0',
                workflow: [
                    {
                        '$.user': {
                            name: 'John Doe',
                            email: 'john@example.com',
                            age: 30
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.user).toEqual({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            });
        });
        it('should set deeply nested state', async () => {
            const workflow = {
                id: 'test-deep-nested',
                name: 'Test Deep Nested',
                version: '1.0.0',
                workflow: [
                    {
                        '$.user.profile.settings.theme': {
                            value: 'dark'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.user).toEqual({
                profile: {
                    settings: {
                        theme: 'dark'
                    }
                }
            });
        });
        it('should set complex object values', async () => {
            const workflow = {
                id: 'test-complex-value',
                name: 'Test Complex Value',
                version: '1.0.0',
                workflow: [
                    {
                        '$.config.options': {
                            value: {
                                timeout: 30,
                                retries: 3,
                                enabled: true
                            }
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.config.options).toEqual({
                timeout: 30,
                retries: 3,
                enabled: true
            });
        });
        it('should set array values', async () => {
            const workflow = {
                id: 'test-array-value',
                name: 'Test Array Value',
                version: '1.0.0',
                workflow: [
                    {
                        '$.items': {
                            value: [1, 2, 3, 4, 5]
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.items).toEqual([1, 2, 3, 4, 5]);
        });
    });
    describe('Multiple State Setters', () => {
        it('should execute multiple state setters in sequence', async () => {
            const workflow = {
                id: 'test-multiple-setters',
                name: 'Test Multiple Setters',
                version: '1.0.0',
                workflow: [
                    {
                        '$.config.timeout': {
                            value: 30
                        }
                    },
                    {
                        '$.config.retries': {
                            value: 3
                        }
                    },
                    {
                        '$.config.enabled': {
                            value: true
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.config).toEqual({
                timeout: 30,
                retries: 3,
                enabled: true
            });
        });
        it('should preserve state across multiple setters at different paths', async () => {
            const workflow = {
                id: 'test-multiple-paths',
                name: 'Test Multiple Paths',
                version: '1.0.0',
                workflow: [
                    {
                        '$.user.name': {
                            value: 'John'
                        }
                    },
                    {
                        '$.user.age': {
                            value: 30
                        }
                    },
                    {
                        '$.system.status': {
                            value: 'active'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.user).toEqual({ name: 'John', age: 30 });
            expect(result.finalState?.system).toEqual({ status: 'active' });
        });
    });
    describe('Edge Routing with State Setters', () => {
        it('should support success edge routing', async () => {
            const workflow = {
                id: 'test-edge-routing',
                name: 'Test Edge Routing',
                version: '1.0.0',
                workflow: [
                    {
                        '$.step1': {
                            value: 'completed',
                            'success?': '$.step2'
                        }
                    },
                    {
                        '$.step2': {
                            value: 'also completed'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.step1).toBe('completed');
            expect(result.finalState?.step2).toBe('also completed');
        });
        it('should work with nested state setters in edge routes', async () => {
            const workflow = {
                id: 'test-nested-edge',
                name: 'Test Nested Edge',
                version: '1.0.0',
                workflow: [
                    {
                        '$.initialize': {
                            value: true,
                            'success?': {
                                '$.config.settings': {
                                    value: { theme: 'dark', language: 'en' }
                                }
                            }
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.initialize).toBe(true);
            expect(result.finalState?.config?.settings).toEqual({
                theme: 'dark',
                language: 'en'
            });
        });
    });
    describe('State References in State Setters', () => {
        it('should support state references in values using StateResolver', async () => {
            const workflow = {
                id: 'test-state-references',
                name: 'Test State References',
                version: '1.0.0',
                initialState: {
                    baseUrl: 'https://api.example.com',
                    apiKey: 'secret-key-123'
                },
                workflow: [
                    {
                        '$.config.fullUrl': {
                            value: '{{baseUrl}}/v1/data'
                        }
                    },
                    {
                        '$.config.auth': {
                            value: 'Bearer {{apiKey}}'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.config.fullUrl).toBe('https://api.example.com/v1/data');
            expect(result.finalState?.config.auth).toBe('Bearer secret-key-123');
        });
    });
    describe('Workflow with Initial State', () => {
        it('should preserve initial state and add new state', async () => {
            const workflow = {
                id: 'test-initial-state',
                name: 'Test Initial State',
                version: '1.0.0',
                initialState: {
                    existing: 'value',
                    counter: 0
                },
                workflow: [
                    {
                        '$.newField': {
                            value: 'added'
                        }
                    },
                    {
                        '$.counter': {
                            value: 10
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.existing).toBe('value');
            expect(result.finalState?.newField).toBe('added');
            expect(result.finalState?.counter).toBe(10);
        });
    });
    describe('Parser Validation', () => {
        it('should validate state setter syntax during parsing', () => {
            const invalidWorkflow = {
                id: 'test-invalid',
                name: 'Test Invalid',
                version: '1.0.0',
                workflow: [
                    {
                        '$.': {
                            value: 'test'
                        }
                    }
                ]
            };
            const validationResult = parser.validate(invalidWorkflow);
            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors).toHaveLength(1);
            expect(validationResult.errors[0]?.code).toBe('INVALID_STATE_SETTER_SYNTAX');
        });
        it('should validate nested state setter syntax', () => {
            const invalidWorkflow = {
                id: 'test-invalid-nested',
                name: 'Test Invalid Nested',
                version: '1.0.0',
                workflow: [
                    {
                        validNode: {
                            'success?': {
                                '$..invalid': {
                                    value: 'test'
                                }
                            }
                        }
                    }
                ]
            };
            const validationResult = parser.validate(invalidWorkflow);
            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors.some(e => e.code === 'INVALID_STATE_SETTER_SYNTAX')).toBe(true);
        });
        it('should accept valid state setter syntax', () => {
            const validWorkflow = {
                id: 'test-valid',
                name: 'Test Valid',
                version: '1.0.0',
                workflow: [
                    {
                        '$.validPath': {
                            value: 'test'
                        }
                    },
                    {
                        '$.nested.path.is.valid': {
                            value: 42
                        }
                    },
                    {
                        '$.with_underscores': {
                            value: true
                        }
                    }
                ]
            };
            const validationResult = parser.validate(validWorkflow);
            expect(validationResult.valid).toBe(true);
            expect(validationResult.errors).toHaveLength(0);
        });
    });
    describe('Metadata Tracking', () => {
        it('should track state setter operations in metadata', async () => {
            const workflow = {
                id: 'test-metadata',
                name: 'Test Metadata',
                version: '1.0.0',
                workflow: [
                    {
                        '$.config.timeout': {
                            value: 30
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?._lastStateSet).toBeDefined();
            expect(result.finalState?._lastStateSet.path).toBe('config.timeout');
            expect(result.finalState?._lastStateSet.value).toBe(30);
        });
    });
    describe('Complex Integration Scenarios', () => {
        it('should handle workflow with mixed regular nodes and state setters', async () => {
            const workflow = {
                id: 'test-mixed',
                name: 'Test Mixed',
                version: '1.0.0',
                initialState: {
                    counter: 0
                },
                workflow: [
                    {
                        '$.config.initialized': {
                            value: true
                        }
                    },
                    // Note: If you have actual nodes registered, you can test mixing here
                    // For now, just test multiple state setters
                    {
                        '$.counter': {
                            value: 10
                        }
                    },
                    {
                        '$.results.final': {
                            value: {
                                status: 'completed',
                                count: 10
                            }
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.config.initialized).toBe(true);
            expect(result.finalState?.counter).toBe(10);
            expect(result.finalState?.results.final).toEqual({
                status: 'completed',
                count: 10
            });
        });
    });
});
