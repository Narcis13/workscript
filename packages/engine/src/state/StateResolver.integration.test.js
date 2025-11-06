/**
 * Integration tests for StateResolver with ExecutionEngine
 * Tests the complete workflow execution with state reference resolution
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from './StateManager';
import { WorkflowParser } from '../parser/WorkflowParser';
import { WorkflowNode } from '../types';
// Test node that verifies it receives resolved configuration
class TestStateAccessNode extends WorkflowNode {
    metadata = {
        id: 'test-state-access',
        name: 'Test State Access Node',
        version: '1.0.0',
        description: 'A test node that verifies state access functionality'
    };
    async execute(context, config) {
        // Store the received config in state for verification
        context.state.receivedConfig = config;
        context.state.nodeExecuted = true;
        return {
            success: () => ({ configReceived: config })
        };
    }
}
// Test node that logs messages (like the user's example)
class TestLogNode extends WorkflowNode {
    metadata = {
        id: 'test-log',
        name: 'Test Log Node',
        version: '1.0.0',
        description: 'A test log node'
    };
    async execute(context, config) {
        const { message } = config || {};
        // Store the logged message in state for verification
        context.state.loggedMessage = message;
        context.state.logExecuted = true;
        return {
            success: () => ({ message })
        };
    }
}
// Math node for testing complex scenarios
class TestMathNode extends WorkflowNode {
    metadata = {
        id: 'test-math',
        name: 'Test Math Node',
        version: '1.0.0',
        description: 'A test math node'
    };
    async execute(context, config) {
        const { operation, values, multiplier } = config || {};
        let result = 0;
        switch (operation) {
            case 'add':
                result = values.reduce((a, b) => a + b, 0);
                break;
            case 'multiply':
                result = values.reduce((a, b) => a * b, 1);
                break;
        }
        if (multiplier) {
            result *= multiplier;
        }
        context.state.mathResult = result;
        context.state.mathExecuted = true;
        return {
            success: () => ({ result })
        };
    }
}
describe('StateResolver Integration with ExecutionEngine', () => {
    let engine;
    let registry;
    let stateManager;
    let parser;
    beforeEach(async () => {
        registry = new NodeRegistry();
        stateManager = new StateManager();
        engine = new ExecutionEngine(registry, stateManager);
        parser = new WorkflowParser(registry);
        // Register test nodes
        await registry.register(TestStateAccessNode);
        await registry.register(TestLogNode);
        await registry.register(TestMathNode);
    });
    describe('Basic state reference resolution', () => {
        test('should resolve simple state reference in node configuration', async () => {
            const workflow = {
                id: 'test-state-resolution',
                name: 'Test State Resolution',
                version: '1.0.0',
                initialState: {
                    developer: 'Alice Johnson'
                },
                workflow: [
                    {
                        'test-log': {
                            message: '$.developer'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.loggedMessage).toBe('Alice Johnson');
            expect(result.finalState?.logExecuted).toBe(true);
        });
        test('should handle the exact user example: log node with $.developer', async () => {
            const workflow = {
                id: 'user-example',
                name: 'User Example Workflow',
                version: '1.0.0',
                initialState: {
                    developer: 'John Doe'
                },
                workflow: [
                    {
                        'test-log': {
                            message: '$.developer'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.loggedMessage).toBe('John Doe');
        });
    });
    describe('Complex state reference resolution', () => {
        test('should resolve nested state references', async () => {
            const workflow = {
                id: 'test-nested-resolution',
                name: 'Test Nested Resolution',
                version: '1.0.0',
                initialState: {
                    user: {
                        name: 'Bob Smith',
                        profile: {
                            email: 'bob@example.com'
                        }
                    },
                    settings: {
                        theme: 'dark'
                    }
                },
                workflow: [
                    {
                        'test-state-access': {
                            userName: '$.user.name',
                            userEmail: '$.user.profile.email',
                            theme: '$.settings.theme'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.receivedConfig).toEqual({
                userName: 'Bob Smith',
                userEmail: 'bob@example.com',
                theme: 'dark'
            });
        });
        test('should resolve state references in arrays and nested objects', async () => {
            const workflow = {
                id: 'test-complex-resolution',
                name: 'Test Complex Resolution',
                version: '1.0.0',
                initialState: {
                    multiplier: 2,
                    baseValues: [10, 20, 30]
                },
                workflow: [
                    {
                        'test-math': {
                            operation: 'add',
                            values: [1, 2, '$.multiplier', 4],
                            multiplier: '$.multiplier',
                            metadata: {
                                description: 'Math operation',
                                baseValues: '$.baseValues'
                            }
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.mathResult).toBe(18); // (1 + 2 + 2 + 4) * 2 = 18
            expect(result.finalState?.mathExecuted).toBe(true);
        });
    });
    describe('State updates and dynamic resolution', () => {
        test('should resolve state references that are updated during execution', async () => {
            const workflow = {
                id: 'test-dynamic-resolution',
                name: 'Test Dynamic Resolution',
                version: '1.0.0',
                initialState: {
                    counter: 5
                },
                workflow: [
                    // First node: use initial counter value
                    {
                        'test-math': {
                            operation: 'add',
                            values: ['$.counter', 10]
                        }
                    },
                    // Second node: use updated counter value (mathResult from first node)
                    {
                        'test-state-access': {
                            previousResult: '$.mathResult',
                            originalCounter: '$.counter'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.mathResult).toBe(15); // 5 + 10
            expect(result.finalState?.receivedConfig).toEqual({
                previousResult: 15,
                originalCounter: 5
            });
        });
    });
    describe('Error handling', () => {
        test('should handle missing state keys gracefully', async () => {
            const workflow = {
                id: 'test-missing-keys',
                name: 'Test Missing Keys',
                version: '1.0.0',
                initialState: {
                    existingKey: 'value'
                },
                workflow: [
                    {
                        'test-state-access': {
                            existing: '$.existingKey',
                            missing: '$.nonExistentKey',
                            regular: 'static value'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.receivedConfig).toEqual({
                existing: 'value',
                missing: undefined,
                regular: 'static value'
            });
        });
        test('should handle deeply nested missing keys', async () => {
            const workflow = {
                id: 'test-nested-missing',
                name: 'Test Nested Missing',
                version: '1.0.0',
                initialState: {
                    user: {
                        name: 'John'
                    }
                },
                workflow: [
                    {
                        'test-state-access': {
                            name: '$.user.name',
                            missingNested: '$.user.profile.email',
                            completelyMissing: '$.nonexistent.key.path'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.receivedConfig).toEqual({
                name: 'John',
                missingNested: undefined,
                completelyMissing: undefined
            });
        });
    });
    describe('Edge cases and special values', () => {
        test('should handle null and undefined state values', async () => {
            const workflow = {
                id: 'test-special-values',
                name: 'Test Special Values',
                version: '1.0.0',
                initialState: {
                    nullValue: null,
                    undefinedValue: undefined,
                    emptyString: '',
                    zero: 0,
                    falseValue: false
                },
                workflow: [
                    {
                        'test-state-access': {
                            nullVal: '$.nullValue',
                            undefinedVal: '$.undefinedValue',
                            emptyStr: '$.emptyString',
                            zeroVal: '$.zero',
                            falseVal: '$.falseValue'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.receivedConfig).toEqual({
                nullVal: null,
                undefinedVal: undefined,
                emptyStr: '',
                zeroVal: 0,
                falseVal: false
            });
        });
        test('should handle configurations with no state references', async () => {
            const workflow = {
                id: 'test-no-references',
                name: 'Test No References',
                version: '1.0.0',
                initialState: {
                    developer: 'Jane'
                },
                workflow: [
                    {
                        'test-state-access': {
                            staticMessage: 'Hello World',
                            numbers: [1, 2, 3],
                            nested: {
                                value: 'static'
                            }
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.receivedConfig).toEqual({
                staticMessage: 'Hello World',
                numbers: [1, 2, 3],
                nested: {
                    value: 'static'
                }
            });
        });
    });
    describe('Real-world scenario simulation', () => {
        test('should handle a complete workflow with multiple nodes and state references', async () => {
            const workflow = {
                id: 'real-world-scenario',
                name: 'Real World Scenario',
                version: '1.0.0',
                initialState: {
                    user: {
                        name: 'Alice',
                        age: 25,
                        preferences: {
                            notifications: true,
                            theme: 'light'
                        }
                    },
                    system: {
                        version: '2.1.0',
                        debug: false
                    }
                },
                workflow: [
                    // Log user login
                    {
                        'test-log': {
                            message: '$.user.name'
                        }
                    },
                    // Perform age calculation
                    {
                        'test-math': {
                            operation: 'add',
                            values: ['$.user.age', 5]
                        }
                    },
                    // Final verification with all data
                    {
                        'test-state-access': {
                            userName: '$.user.name',
                            userAge: '$.user.age',
                            calculatedAge: '$.mathResult',
                            systemInfo: {
                                version: '$.system.version',
                                debug: '$.system.debug',
                                notifications: '$.user.preferences.notifications'
                            },
                            logMessage: '$.loggedMessage'
                        }
                    }
                ]
            };
            const parsedWorkflow = parser.parse(workflow);
            const result = await engine.execute(parsedWorkflow);
            expect(result.status).toBe('completed');
            expect(result.finalState?.loggedMessage).toBe('Alice');
            expect(result.finalState?.mathResult).toBe(30); // 25 + 5
            expect(result.finalState?.receivedConfig).toEqual({
                userName: 'Alice',
                userAge: 25,
                calculatedAge: 30,
                systemInfo: {
                    version: '2.1.0',
                    debug: false,
                    notifications: true
                },
                logMessage: 'Alice'
            });
        });
    });
});
