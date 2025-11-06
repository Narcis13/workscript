/**
 * Integration test for WorkflowParser + ExecutionEngine
 * Tests the complete flow from JSON workflow to AST to execution
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, ExecutionEngine, StateManager, NodeRegistry } from 'shared';
import { WorkflowNode } from 'shared';
// Test nodes for integration testing
class LoopNode extends WorkflowNode {
    metadata = {
        id: 'loop-node',
        name: 'Loop Node',
        version: '1.0.0'
    };
    async execute(context, config) {
        context.state.loopCount++;
        console.log(`Loop execution count: ${context.state.loopCount}`);
        if (context.state.loopCount < 5) {
            return {
                again: () => ({ message: 'Loop Node' })
            };
        }
        else {
            return {
                stop: () => ({ message: 'Exit Loop Node' })
            };
        }
    }
}
class PrintRandomNumber extends WorkflowNode {
    metadata = {
        id: 'print-random-number',
        name: 'Print Random Number',
        version: '1.0.0'
    };
    async execute(context, config) {
        const randomNumber = Math.floor(Math.random() * 100);
        context.state.randomNumber = randomNumber;
        console.log(`Random number: ${randomNumber}`);
        return {
            success: () => ({ randomNumber })
        };
    }
}
class PrintMessage extends WorkflowNode {
    metadata = {
        id: 'print-message',
        name: 'Print Message',
        version: '1.0.0'
    };
    async execute(context, config) {
        console.log(`My message is: ${config.message}`);
        return {
            success: () => ({ message: config.message })
        };
    }
}
class IntegrationDecisionNode extends WorkflowNode {
    metadata = {
        id: 'decision-node',
        name: 'Integration Decision Node',
        version: '1.0.0'
    };
    async execute(context, config) {
        console.log(`Random number: ${context.state.randomNumber}`);
        if (context.state.randomNumber > 50) {
            return {
                big: () => ({ result: 'true_path' })
            };
        }
        else {
            return {
                small: () => ({ result: 'false_path' })
            };
        }
    }
}
describe('WorkflowParser + ExecutionEngine Integration', () => {
    let parser;
    let engine;
    let registry;
    let stateManager;
    beforeEach(async () => {
        registry = new NodeRegistry();
        stateManager = new StateManager();
        parser = new WorkflowParser(registry);
        engine = new ExecutionEngine(registry, stateManager);
        // Register integration test nodes
        await registry.register(PrintRandomNumber);
        await registry.register(IntegrationDecisionNode);
        await registry.register(PrintMessage);
        await registry.register(LoopNode);
    });
    it('should parse and execute a workflow end-to-end', async () => {
        console.log('Starting integration test for workflow execution');
        const workflowDefinition = {
            id: 'integration-nested-workflow',
            name: 'Integration Nested Workflow',
            version: '1.0.0',
            initialState: { condition: true, executionTrace: [], loopCount: 0 },
            workflow: [
                'print-random-number',
                { 'decision-node': {
                        'big?': { 'loop-node...': {
                                'again?': {
                                    'print-message': {
                                        'message': 'Loop Node'
                                    }
                                }
                            } },
                        'small?': {
                            'print-message': {
                                'message': 'Random number is small'
                            }
                        }
                    } }
            ]
        };
        // Step 1: Parse the workflow definition into AST
        let parsedWorkflow;
        try {
            parsedWorkflow = parser.parse(workflowDefinition);
        }
        catch (error) {
            console.log('Validation errors:', JSON.stringify(error.errors, null, 2));
            throw error;
        }
        // Verify AST structure
        expect(parsedWorkflow.nodes.length).toBeGreaterThan(0);
        // Step 2: Execute the parsed workflow
        const result = await engine.execute(parsedWorkflow);
    });
});
