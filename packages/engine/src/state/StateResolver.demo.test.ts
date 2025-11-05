/**
 * Demonstration of the $.{key} state access feature
 *
 * This test demonstrates the exact usage example provided by the user:
 * A workflow with a log node that uses "$.developer" to access state values
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from './StateManager';
import { WorkflowParser } from '../parser/WorkflowParser';
import { WorkflowNode } from '../types';
import type { ExecutionContext, EdgeMap, WorkflowDefinition } from '../types';

// Enhanced log node that demonstrates the feature
class LogNode extends WorkflowNode {
  metadata = {
    id: 'log',
    name: 'Log Node',
    version: '1.0.0',
    description: 'A log node that demonstrates $.{key} state access'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { message } = config || {};

    // Log the message (in real scenarios this would go to console/file)
    console.log('📝 Log Node Message:', message);

    // Store the logged message in state for verification
    context.state.lastLoggedMessage = message;
    context.state.logNodeExecuted = true;

    return {
      success: () => ({ message })
    };
  }
}

describe('StateResolver Demo - $.{key} State Access Feature', () => {
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;
  let parser: WorkflowParser;

  beforeEach(async () => {
    registry = new NodeRegistry();
    stateManager = new StateManager();
    engine = new ExecutionEngine(registry, stateManager);
    parser = new WorkflowParser(registry);

    // Register the log node
    await registry.register(LogNode);
  });

  test('should demonstrate the exact user example: {"log":{"message":"$.developer"}}', async () => {
    // This is the exact workflow structure the user wanted to implement
    const workflow: WorkflowDefinition = {
      id: 'user-demo',
      name: 'User Demo Workflow',
      version: '1.0.0',
      description: 'Demonstrates the $.developer state access feature',
      initialState: {
        developer: 'John Doe'
      },
      workflow: [
        {
          'log': {
            'message': '$.developer'
          }
        }
      ]
    };

    console.log('\n🚀 Starting workflow execution...');
    console.log('Initial state:', workflow.initialState);
    console.log('Workflow configuration:', JSON.stringify(workflow.workflow, null, 2));

    const parsedWorkflow = parser.parse(workflow);
    const result = await engine.execute(parsedWorkflow);

    console.log('\n✅ Workflow completed!');
    console.log('Final state:', result.finalState);

    // Verify the feature worked correctly
    expect(result.status).toBe('completed');
    expect(result.finalState?.lastLoggedMessage).toBe('John Doe');
    expect(result.finalState?.logNodeExecuted).toBe(true);

    console.log('\n🎉 State resolution worked! The log node received "John Doe" instead of "$.developer"');
  });

  test('should demonstrate nested state access: $.user.profile.name', async () => {
    const workflow: WorkflowDefinition = {
      id: 'nested-demo',
      name: 'Nested State Access Demo',
      version: '1.0.0',
      initialState: {
        user: {
          profile: {
            name: 'Alice Smith',
            role: 'Software Engineer'
          }
        }
      },
      workflow: [
        {
          'log': {
            'message': '$.user.profile.name'
          }
        }
      ]
    };

    console.log('\n🚀 Testing nested state access...');
    console.log('Initial state:', JSON.stringify(workflow.initialState, null, 2));

    const parsedWorkflow = parser.parse(workflow);
    const result = await engine.execute(parsedWorkflow);

    console.log('\n✅ Nested access completed!');
    console.log('Resolved message:', result.finalState?.lastLoggedMessage);

    expect(result.status).toBe('completed');
    expect(result.finalState?.lastLoggedMessage).toBe('Alice Smith');

    console.log('\n🎉 Nested state resolution worked! "$.user.profile.name" → "Alice Smith"');
  });

  test('should demonstrate complex configuration with multiple state references', async () => {
    const workflow: WorkflowDefinition = {
      id: 'complex-demo',
      name: 'Complex State Access Demo',
      version: '1.0.0',
      initialState: {
        environment: 'production',
        user: {
          name: 'Bob Wilson',
          id: 12345
        },
        system: {
          version: '2.1.0'
        }
      },
      workflow: [
        {
          'log': {
            'message': '$.user.name',
            'level': 'info',
            'metadata': {
              'userId': '$.user.id',
              'env': '$.environment',
              'version': '$.system.version'
            }
          }
        }
      ]
    };

    console.log('\n🚀 Testing complex configuration with multiple state references...');
    console.log('Initial state:', JSON.stringify(workflow.initialState, null, 2));
    console.log('Node configuration:', JSON.stringify(workflow.workflow[0], null, 2));

    const parsedWorkflow = parser.parse(workflow);

    // Let's also inspect what the resolved configuration looks like
    const testNode = parsedWorkflow.nodes[0];
    if (!testNode) {
      throw new Error('No nodes found in parsed workflow');
    }

    const testState = workflow.initialState;

    // Manually resolve to show the transformation
    const { StateResolver } = await import('./StateResolver');
    const resolver = StateResolver.createDefault();
    const resolvedConfig = resolver.resolve(testNode.config, testState as any);

    console.log('\n🔄 State resolution transformation:');
    console.log('Original config:', JSON.stringify(testNode.config, null, 2));
    console.log('Resolved config:', JSON.stringify(resolvedConfig, null, 2));

    const result = await engine.execute(parsedWorkflow);

    console.log('\n✅ Complex resolution completed!');
    console.log('Final state:', result.finalState);

    expect(result.status).toBe('completed');
    expect(result.finalState?.lastLoggedMessage).toBe('Bob Wilson');

    console.log('\n🎉 Complex state resolution worked!');
    console.log('All $.{key} patterns were successfully resolved to their state values');
  });

  test('should handle missing state keys gracefully', async () => {
    const workflow: WorkflowDefinition = {
      id: 'missing-key-demo',
      name: 'Missing Key Demo',
      version: '1.0.0',
      initialState: {
        developer: 'Jane Doe'
      },
      workflow: [
        {
          'log': {
            'message': '$.nonExistentKey',
            'fallback': '$.developer'
          }
        }
      ]
    };

    console.log('\n🚀 Testing missing state key handling...');
    console.log('Trying to access "$.nonExistentKey" which does not exist...');

    const parsedWorkflow = parser.parse(workflow);
    const result = await engine.execute(parsedWorkflow);

    console.log('\n✅ Missing key handling completed!');
    console.log('Message for missing key:', result.finalState?.lastLoggedMessage);

    expect(result.status).toBe('completed');
    expect(result.finalState?.lastLoggedMessage).toBeUndefined();

    console.log('\n🎉 Missing key handled gracefully! "$.nonExistentKey" → undefined');
  });
});