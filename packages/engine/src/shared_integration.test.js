import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, ExecutionEngine, StateManager, NodeRegistry } from './index';
import { WorkflowNode } from './types';
import { MathNode } from '../nodes/MathNode';
import { LogicNode } from '../nodes/LogicNode';
import { DataTransformNode } from '../nodes/DataTransformNode';
describe('Shared Package Integration Test', () => {
    let parser;
    let engine;
    let registry;
    let stateManager;
    beforeEach(async () => {
        registry = new NodeRegistry();
        stateManager = new StateManager();
        parser = new WorkflowParser(registry);
        engine = new ExecutionEngine(registry, stateManager);
        // Register the 3 shared nodes through NodeRegistry
        await registry.register(MathNode);
        await registry.register(LogicNode);
        await registry.register(DataTransformNode);
    });
    it('should load and execute all 3 shared nodes in a sequential workflow', async () => {
        const workflowDefinition = {
            id: 'shared-integration-test',
            name: 'Shared Nodes Integration Test',
            version: '1.0.0',
            description: 'Tests all 3 shared nodes working sequentially',
            initialState: { step: 1 },
            workflow: [
                {
                    'math': {
                        'operation': 'add',
                        'values': [5, 15, 25]
                    }
                },
                {
                    'logic': {
                        'operation': 'greater',
                        'values': [45, 30]
                    }
                },
                {
                    'transform': {
                        'operation': 'uppercase',
                        'data': 'Integration Test'
                    }
                }
            ]
        };
        // Parse the workflow
        const parsedWorkflow = parser.parse(workflowDefinition);
        // Verify all nodes are recognized
        expect(parsedWorkflow.nodes.length).toBe(3);
        // Execute the workflow
        const result = await engine.execute(parsedWorkflow);
        // Verify execution completed successfully
        expect(result.status).toBe('completed');
        expect(result.finalState).toBeDefined();
        // Verify each node executed and stored results in state
        expect(result.finalState.mathResult).toBe(45); // 5 + 15 + 25 = 45
        expect(result.finalState.logicResult).toBe(true); // 45 > 30 is true
        expect(result.finalState.transformResult).toBe('INTEGRATION TEST'); // uppercase transformation
    });
    it('should handle error paths in node execution', async () => {
        const workflowDefinition = {
            id: 'shared-error-test',
            name: 'Shared Nodes Error Test',
            version: '1.0.0',
            workflow: [
                {
                    'math': {
                        'operation': 'invalid-operation',
                        'values': [1, 2, 3]
                    }
                },
                {
                    'transform': {
                        'operation': 'stringify',
                        'data': 'Error handled gracefully'
                    }
                }
            ]
        };
        const parsedWorkflow = parser.parse(workflowDefinition);
        const result = await engine.execute(parsedWorkflow);
        // Math node should have completed with error edge, workflow continues
        expect(result.status).toBe('completed');
        expect(result.finalState.transformResult).toBe('"Error handled gracefully"');
        // Edge context should contain error from math node
        expect(result.finalState._edgeContext).toBeDefined();
    });
    it('should demonstrate data flow between nodes in sequential execution', async () => {
        const workflowDefinition = {
            id: 'shared-chaining-test',
            name: 'Shared Nodes Data Flow Test',
            version: '1.0.0',
            workflow: [
                {
                    'math': {
                        'operation': 'multiply',
                        'values': [3, 4, 5]
                    }
                },
                {
                    'logic': {
                        'operation': 'greater',
                        'values': [60, 50]
                    }
                },
                {
                    'transform': {
                        'operation': 'length',
                        'data': [1, 2, 3, 4, 5]
                    }
                }
            ]
        };
        const parsedWorkflow = parser.parse(workflowDefinition);
        const result = await engine.execute(parsedWorkflow);
        expect(result.status).toBe('completed');
        expect(result.finalState.mathResult).toBe(60); // 3 * 4 * 5 = 60
        expect(result.finalState.logicResult).toBe(true); // 60 > 50 is true
        expect(result.finalState.transformResult).toBe(5); // array length is 5
    });
    it('should verify NodeRegistry properly loaded all shared nodes', async () => {
        // Verify all 3 shared nodes are registered
        expect(registry.size).toBe(3);
        // Verify each shared node can be found
        expect(registry.hasNode('math')).toBe(true);
        expect(registry.hasNode('logic')).toBe(true);
        expect(registry.hasNode('transform')).toBe(true);
        // Verify metadata is correct for each node
        const mathMetadata = registry.getMetadata('math');
        expect(mathMetadata.name).toBe('Math Operations');
        expect(mathMetadata.version).toBe('1.0.0');
        expect(mathMetadata.inputs).toEqual(['operation', 'values']);
        const logicMetadata = registry.getMetadata('logic');
        expect(logicMetadata.name).toBe('Logic Operations');
        expect(logicMetadata.version).toBe('1.0.0');
        expect(logicMetadata.inputs).toEqual(['operation', 'values']);
        const transformMetadata = registry.getMetadata('transform');
        expect(transformMetadata.name).toBe('Data Transform');
        expect(transformMetadata.version).toBe('1.0.0');
        expect(transformMetadata.inputs).toEqual(['operation', 'data']);
    });
    it('should create different instances for non-singleton nodes', async () => {
        const mathInstance1 = registry.getInstance('math');
        const mathInstance2 = registry.getInstance('math');
        // Should be different instances (non-singleton by default)
        expect(mathInstance1).not.toBe(mathInstance2);
        expect(mathInstance1).toBeInstanceOf(MathNode);
        expect(mathInstance2).toBeInstanceOf(MathNode);
    });
});
