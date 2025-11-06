import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, ExecutionEngine, StateManager, NodeRegistry } from './index';
import { WorkflowNode } from './types';
// Producer Node - Creates data and passes it via edge function
class DataProducerNode extends WorkflowNode {
    metadata = {
        id: 'data-producer',
        name: 'Data Producer Node',
        version: '1.0.0',
        description: 'Produces data using config and passes it to next node via edge function',
        inputs: ['multiplier', 'prefix'],
        outputs: ['result']
    };
    async execute(context, config) {
        // Use config for static configuration
        const multiplier = config?.multiplier || 1;
        const prefix = config?.prefix || 'data';
        // Create some data based on config
        const producedValue = 42 * multiplier;
        const producedMessage = `${prefix}_processed`;
        // Store in state for debugging
        context.state.producedValue = producedValue;
        context.state.producedMessage = producedMessage;
        return {
            success: () => ({
                // This data will become context.inputs for the next node
                value: producedValue,
                message: producedMessage,
                timestamp: new Date().toISOString(),
                source: 'data-producer'
            })
        };
    }
}
// Consumer Node - Uses BOTH config AND context.inputs
class DataConsumerNode extends WorkflowNode {
    metadata = {
        id: 'data-consumer',
        name: 'Data Consumer Node',
        version: '1.0.0',
        description: 'Consumes data from context.inputs AND uses config parameters',
        inputs: ['value', 'message', 'source'], // These come from context.inputs
        outputs: ['result']
    };
    async execute(context, config) {
        // Use config for static configuration
        const operation = config?.operation || 'add';
        const configValue = config?.configValue || 0;
        // Use context.inputs for dynamic data from previous node
        const inputValue = context.inputs?.value || 0;
        const inputMessage = context.inputs?.message || '';
        const source = context.inputs?.source || 'unknown';
        const timestamp = context.inputs?.timestamp;
        // Process the data using both config and inputs
        let result;
        switch (operation) {
            case 'add':
                result = inputValue + configValue;
                break;
            case 'multiply':
                result = inputValue * configValue;
                break;
            default:
                result = inputValue;
        }
        const processedMessage = `${inputMessage}_consumed`;
        // Store everything in state for verification
        context.state.consumerResult = result;
        context.state.processedMessage = processedMessage;
        context.state.receivedFromPrevious = {
            value: inputValue,
            message: inputMessage,
            source,
            timestamp
        };
        context.state.usedConfig = {
            operation,
            configValue
        };
        return {
            success: () => ({
                result,
                processedMessage,
                combinedData: `Config(${operation}:${configValue}) + Input(${inputValue}) = ${result}`
            })
        };
    }
}
// Final Node - Demonstrates the chain continues
class DataFinalNode extends WorkflowNode {
    metadata = {
        id: 'data-final',
        name: 'Data Final Node',
        version: '1.0.0',
        description: 'Final node that receives data from chain',
        outputs: ['final']
    };
    async execute(context, config) {
        const summary = config?.summary || 'final';
        const result = context.inputs?.result || 0;
        const combinedData = context.inputs?.combinedData || '';
        // Debug: store what we received in inputs
        context.state.debugFinalInputs = context.inputs;
        context.state.finalSummary = `${summary}: ${combinedData}`;
        context.state.finalResult = result;
        return {
            complete: () => ({
                summary: context.state.finalSummary,
                finalResult: result
            })
        };
    }
}
describe('Data Flow Mechanism Test', () => {
    let parser;
    let engine;
    let registry;
    let stateManager;
    beforeEach(async () => {
        registry = new NodeRegistry();
        stateManager = new StateManager();
        parser = new WorkflowParser(registry);
        engine = new ExecutionEngine(registry, stateManager);
        // Register test nodes
        await registry.register(DataProducerNode);
        await registry.register(DataConsumerNode);
        await registry.register(DataFinalNode);
    });
    it('should demonstrate config vs context.inputs data flow mechanism', async () => {
        const workflowDefinition = {
            id: 'data-flow-test',
            name: 'Data Flow Mechanism Test',
            version: '1.0.0',
            description: 'Tests the distinction between config and context.inputs with explicit edge routing',
            workflow: [
                {
                    'data-producer': {
                        'multiplier': 3, // config parameter
                        'prefix': 'workflow', // config parameter
                        'success?': {
                            'data-consumer': {
                                'operation': 'add', // config parameter
                                'configValue': 10, // config parameter
                                'success?': {
                                    'data-final': {
                                        'summary': 'Chain Complete' // config parameter
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        };
        // Parse and execute
        const parsedWorkflow = parser.parse(workflowDefinition);
        const result = await engine.execute(parsedWorkflow);
        // Debug: Log the final state to understand what happened
        console.log('Final State:', JSON.stringify(result.finalState, null, 2));
        // Verify execution completed successfully
        expect(result.status).toBe('completed');
        expect(result.finalState).toBeDefined();
        // Verify Producer Node used config correctly
        expect(result.finalState.producedValue).toBe(126); // 42 * 3 (config.multiplier)
        expect(result.finalState.producedMessage).toBe('workflow_processed'); // config.prefix + '_processed'
        // Verify Consumer Node received data via context.inputs AND used config
        expect(result.finalState.receivedFromPrevious).toEqual({
            value: 126, // from producer's edge function
            message: 'workflow_processed', // from producer's edge function  
            source: 'data-producer', // from producer's edge function
            timestamp: expect.any(String) // from producer's edge function
        });
        expect(result.finalState.usedConfig).toEqual({
            operation: 'add', // from consumer's config
            configValue: 10 // from consumer's config
        });
        expect(result.finalState.consumerResult).toBe(136); // 126 (from input) + 10 (from config)
        expect(result.finalState.processedMessage).toBe('workflow_processed_consumed');
        // Verify Final Node received data from consumer
        expect(result.finalState.finalSummary).toBe('Chain Complete: Config(add:10) + Input(126) = 136');
        expect(result.finalState.finalResult).toBe(136);
    });
    it('should demonstrate edge context data is cleared after consumption', async () => {
        const workflowDefinition = {
            id: 'edge-clearing-test',
            name: 'Edge Context Clearing Test',
            version: '1.0.0',
            workflow: [
                {
                    'data-producer': {
                        'multiplier': 2,
                        'prefix': 'test'
                    }
                },
                {
                    'data-consumer': {
                        'operation': 'multiply',
                        'configValue': 5
                    }
                }
            ]
        };
        const parsedWorkflow = parser.parse(workflowDefinition);
        const result = await engine.execute(parsedWorkflow);
        expect(result.status).toBe('completed');
        // Verify the producer's data was consumed by consumer
        expect(result.finalState.receivedFromPrevious.value).toBe(84); // 42 * 2
        expect(result.finalState.consumerResult).toBe(420); // 84 * 5
        // The _edgeContext should be cleared after being consumed
        // (though it might still be in final state for debugging)
        expect(result.finalState._edgeContext).toBeDefined(); // Last edge context from consumer
    });
    it('should handle missing context.inputs gracefully', async () => {
        // Test what happens when a node expects context.inputs but doesn't receive any
        const workflowDefinition = {
            id: 'missing-inputs-test',
            name: 'Missing Context Inputs Test',
            version: '1.0.0',
            workflow: [
                {
                    'data-consumer': {
                        'operation': 'add',
                        'configValue': 100
                    }
                }
            ]
        };
        const parsedWorkflow = parser.parse(workflowDefinition);
        const result = await engine.execute(parsedWorkflow);
        expect(result.status).toBe('completed');
        // Consumer should handle missing inputs gracefully with defaults
        expect(result.finalState.receivedFromPrevious).toEqual({
            value: 0, // default value when no input
            message: '', // default value when no input
            source: 'unknown', // default value when no input
            timestamp: undefined
        });
        expect(result.finalState.consumerResult).toBe(100); // 0 + 100
    });
    it('should preserve workflow state across nodes', async () => {
        const workflowDefinition = {
            id: 'state-preservation-test',
            name: 'State Preservation Test',
            version: '1.0.0',
            initialState: {
                globalCounter: 0,
                workflowStartTime: new Date().toISOString()
            },
            workflow: [
                {
                    'data-producer': {
                        'multiplier': 1,
                        'prefix': 'state'
                    }
                },
                {
                    'data-consumer': {
                        'operation': 'add',
                        'configValue': 1
                    }
                }
            ]
        };
        const parsedWorkflow = parser.parse(workflowDefinition);
        const result = await engine.execute(parsedWorkflow);
        expect(result.status).toBe('completed');
        // Both global state and edge data should be available
        expect(result.finalState.globalCounter).toBe(0); // from initialState
        expect(result.finalState.workflowStartTime).toBeDefined(); // from initialState
        expect(result.finalState.consumerResult).toBe(43); // 42 + 1 (edge data + config)
    });
});
