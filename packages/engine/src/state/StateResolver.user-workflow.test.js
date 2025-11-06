/**
 * Test the exact user workflow to debug the $.max issue
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from './StateManager';
import { WorkflowParser } from '../parser/WorkflowParser';
import { WorkflowNode } from '../types';
// Mock node that simulates the listEmails behavior
class MockListEmailsNode extends WorkflowNode {
    metadata = {
        id: 'listEmails',
        name: 'Mock List Emails Node',
        version: '1.0.0',
        description: 'Mock node to test state resolution'
    };
    async execute(context, config) {
        // Log the received config to verify state resolution
        console.log('📧 MockListEmailsNode received config:', JSON.stringify(config, null, 2));
        // Store the config in state for test verification
        context.state.receivedListEmailsConfig = config;
        context.state.listEmailsExecuted = true;
        // Check if maxResults was resolved properly
        const maxResults = config?.maxResults;
        if (typeof maxResults === 'string') {
            console.log('❌ ERROR: maxResults is still a string:', maxResults);
            context.state.resolutionError = `maxResults received as string: ${maxResults}`;
        }
        else if (typeof maxResults === 'number') {
            console.log('✅ SUCCESS: maxResults resolved to number:', maxResults);
            context.state.resolutionSuccess = true;
        }
        return {
            success: () => ({
                message: 'Mock listEmails executed',
                maxResults: maxResults
            })
        };
    }
}
// Mock log node
class MockLogNode extends WorkflowNode {
    metadata = {
        id: 'log',
        name: 'Mock Log Node',
        version: '1.0.0',
        description: 'Mock log node'
    };
    async execute(context, config) {
        console.log('📝 MockLogNode executed');
        context.state.logExecuted = true;
        return { success: () => ({}) };
    }
}
// Mock Google connect node
class MockGoogleConnectNode extends WorkflowNode {
    metadata = {
        id: 'googleConnect',
        name: 'Mock Google Connect Node',
        version: '1.0.0',
        description: 'Mock Google connect node'
    };
    async execute(context, config) {
        console.log('🔗 MockGoogleConnectNode executed with config:', config);
        context.state.googleConnectExecuted = true;
        context.state.google_token = 'mock_token';
        context.state.gmail_profile = { emailAddress: config?.email || 'test@example.com' };
        return { success: () => ({}) };
    }
}
// Mock send email node
class MockSendEmailNode extends WorkflowNode {
    metadata = {
        id: 'sendEmail',
        name: 'Mock Send Email Node',
        version: '1.0.0',
        description: 'Mock send email node'
    };
    async execute(context, config) {
        console.log('📬 MockSendEmailNode executed with config:', config);
        context.state.sendEmailExecuted = true;
        context.state.receivedSendEmailConfig = config;
        return { success: () => ({}) };
    }
}
describe('StateResolver User Workflow Test', () => {
    let engine;
    let registry;
    let stateManager;
    let parser;
    beforeEach(async () => {
        registry = new NodeRegistry();
        stateManager = new StateManager();
        engine = new ExecutionEngine(registry, stateManager);
        parser = new WorkflowParser(registry);
        // Register mock nodes
        await registry.register(MockListEmailsNode);
        await registry.register(MockLogNode);
        await registry.register(MockGoogleConnectNode);
        await registry.register(MockSendEmailNode);
    });
    test('should resolve $.max in the exact user workflow', async () => {
        // This is the exact workflow the user provided
        const workflow = {
            id: "test-workflow",
            name: "Simple Test Workflow",
            version: "1.0.0",
            description: "Generate token and save to file!",
            initialState: { max: 7 }, // User's initial state
            workflow: [
                {
                    "googleConnect": {
                        "email": "smupitesti2001@gmail.com"
                    }
                },
                {
                    "listEmails": {
                        "maxResults": "$.max", // This should resolve to 7
                        "getFullDetails": true
                    }
                },
                {
                    "sendEmail": {
                        "to": "narcis75@gmail.com",
                        "body": "This is a test email sent from the workflow.",
                        "subject": "Email de test from workscript"
                    }
                },
                "log"
            ]
        };
        console.log('\n🚀 Testing user workflow with $.max resolution...');
        console.log('Initial state:', workflow.initialState);
        const parsedWorkflow = parser.parse(workflow);
        const result = await engine.execute(parsedWorkflow);
        console.log('\n📊 Execution Results:');
        console.log('Status:', result.status);
        console.log('Final state keys:', Object.keys(result.finalState || {}));
        // Verify the workflow executed successfully
        expect(result.status).toBe('completed');
        // Verify all nodes executed
        expect(result.finalState?.googleConnectExecuted).toBe(true);
        expect(result.finalState?.listEmailsExecuted).toBe(true);
        expect(result.finalState?.sendEmailExecuted).toBe(true);
        expect(result.finalState?.logExecuted).toBe(true);
        // Check what the listEmails node received
        const listEmailsConfig = result.finalState?.receivedListEmailsConfig;
        console.log('\n🔍 ListEmails received config:', listEmailsConfig);
        // This is the critical test - maxResults should be resolved to number 7
        expect(listEmailsConfig?.maxResults).toBe(7);
        expect(typeof listEmailsConfig?.maxResults).toBe('number');
        // Verify resolution success
        expect(result.finalState?.resolutionSuccess).toBe(true);
        expect(result.finalState?.resolutionError).toBeUndefined();
        console.log('\n✅ SUCCESS: $.max was properly resolved to', listEmailsConfig?.maxResults);
    });
    test('should show the difference between resolved and unresolved config', async () => {
        const workflow = {
            id: "comparison-test",
            name: "Comparison Test",
            version: "1.0.0",
            initialState: { max: 7 },
            workflow: [
                {
                    "listEmails": {
                        "maxResults": "$.max",
                        "staticValue": 42,
                        "stringValue": "hello"
                    }
                }
            ]
        };
        // Test with our resolver
        const parsedWorkflow = parser.parse(workflow);
        const result = await engine.execute(parsedWorkflow);
        const resolvedConfig = result.finalState?.receivedListEmailsConfig;
        console.log('\n🔄 Configuration Resolution Comparison:');
        console.log('Original config: { maxResults: "$.max", staticValue: 42, stringValue: "hello" }');
        console.log('Resolved config:', resolvedConfig);
        expect(resolvedConfig?.maxResults).toBe(7); // Resolved from state
        expect(resolvedConfig?.staticValue).toBe(42); // Unchanged
        expect(resolvedConfig?.stringValue).toBe("hello"); // Unchanged
        console.log('\n✅ Only the $.max pattern was resolved, other values unchanged');
    });
});
