/**
 * Client-side integration tests for StateResolver
 * Tests the complete client workflow execution with state reference resolution
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ExecutionEngine } from '../engine/ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from './StateManager';
import { WorkflowParser } from '../parser/WorkflowParser';
import { WorkflowNode } from '../types';
import type { ExecutionContext, EdgeMap, WorkflowDefinition } from '../types';

// Mock client-side nodes to simulate browser environment
class MockDOMNode extends WorkflowNode {
  metadata = {
    id: 'dom',
    name: 'Mock DOM Node',
    version: '1.0.0',
    description: 'Mock DOM manipulation node for client-side testing'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    console.log('🌐 MockDOMNode executed with config:', JSON.stringify(config, null, 2));

    // Store the received config for test verification
    context.state.receivedDOMConfig = config;
    context.state.domExecuted = true;

    const { selector, action, value } = config || {};

    // Simulate DOM operations based on resolved config
    if (action && selector) {
      context.state.domResult = {
        action,
        selector,
        value,
        resolved: true
      };
    }

    return {
      success: () => ({
        action,
        selector,
        value
      })
    };
  }
}

class MockLocalStorageNode extends WorkflowNode {
  metadata = {
    id: 'localStorage',
    name: 'Mock LocalStorage Node',
    version: '1.0.0',
    description: 'Mock localStorage node for client-side testing'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    console.log('💾 MockLocalStorageNode executed with config:', JSON.stringify(config, null, 2));

    // Store the received config for test verification
    context.state.receivedLocalStorageConfig = config;
    context.state.localStorageExecuted = true;

    const { operation, key, value } = config || {};

    // Simulate localStorage operations with resolved config
    if (operation && key) {
      context.state.localStorageResult = {
        operation,
        key,
        value: operation === 'get' ? `stored_${key}` : value,
        resolved: true
      };
    }

    return {
      success: () => ({
        operation,
        key,
        value: context.state.localStorageResult?.value
      })
    };
  }
}

class MockFetchNode extends WorkflowNode {
  metadata = {
    id: 'fetch',
    name: 'Mock Fetch Node',
    version: '1.0.0',
    description: 'Mock fetch node for client-side testing'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    console.log('🌍 MockFetchNode executed with config:', JSON.stringify(config, null, 2));

    // Store the received config for test verification
    context.state.receivedFetchConfig = config;
    context.state.fetchExecuted = true;

    const { url, method, body, headers } = config || {};

    // Check if URL was resolved from state
    if (typeof url === 'string' && !url.startsWith('$.')) {
      context.state.fetchResult = {
        url,
        method: method || 'GET',
        body,
        headers,
        resolved: true,
        response: { status: 200, data: 'mock_data' }
      };
    }

    return {
      success: () => ({
        url,
        method,
        response: context.state.fetchResult?.response
      })
    };
  }
}

// Simulate ClientWorkflowService behavior
class MockClientWorkflowService {
  private registry: NodeRegistry;
  private stateManager: StateManager;
  private executionEngine: ExecutionEngine;
  private parser: WorkflowParser;

  constructor() {
    this.registry = new NodeRegistry();
    this.stateManager = new StateManager();
    this.executionEngine = new ExecutionEngine(this.registry, this.stateManager);
    this.parser = new WorkflowParser(this.registry);
  }

  async initialize() {
    // Register mock client nodes
    await this.registry.register(MockDOMNode, { source: 'client' });
    await this.registry.register(MockLocalStorageNode, { source: 'client' });
    await this.registry.register(MockFetchNode, { source: 'client' });
  }

  async executeWorkflow(workflowDefinition: WorkflowDefinition) {
    const parsedWorkflow = this.parser.parse(workflowDefinition);
    return await this.executionEngine.execute(parsedWorkflow);
  }

  validateWorkflow(workflowDefinition: unknown) {
    return this.parser.validate(workflowDefinition);
  }
}

describe('StateResolver Client-Side Integration', () => {
  let clientService: MockClientWorkflowService;

  beforeEach(async () => {
    clientService = new MockClientWorkflowService();
    await clientService.initialize();
  });

  describe('Client-side state resolution', () => {
    test('should resolve state references in DOM manipulation workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'client-dom-workflow',
        name: 'Client DOM Workflow',
        version: '1.0.0',
        description: 'Test DOM manipulation with state resolution',
        initialState: {
          targetSelector: '#my-element',
          newText: 'Hello from State!',
          animationDuration: 300
        },
        workflow: [
          {
            'dom': {
              'selector': '$.targetSelector',
              'action': 'setText',
              'value': '$.newText',
              'duration': '$.animationDuration'
            }
          }
        ]
      };

      console.log('\n🌐 Testing client-side DOM workflow with state resolution...');
      console.log('Initial state:', workflow.initialState);

      const result = await clientService.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.domExecuted).toBe(true);

      const domConfig = result.finalState?.receivedDOMConfig;
      console.log('\n🔍 DOM node received config:', domConfig);

      // Verify state resolution worked
      expect(domConfig?.selector).toBe('#my-element');
      expect(domConfig?.value).toBe('Hello from State!');
      expect(domConfig?.duration).toBe(300);
      expect(domConfig?.action).toBe('setText'); // Static value unchanged

      console.log('✅ Client-side DOM state resolution successful!');
    });

    test('should resolve state references in localStorage workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'client-storage-workflow',
        name: 'Client Storage Workflow',
        version: '1.0.0',
        description: 'Test localStorage with state resolution',
        initialState: {
          storageKey: 'user_preferences',
          userData: {
            theme: 'dark',
            language: 'en',
            notifications: true
          }
        },
        workflow: [
          {
            'localStorage': {
              'operation': 'set',
              'key': '$.storageKey',
              'value': '$.userData'
            }
          }
        ]
      };

      console.log('\n💾 Testing client-side localStorage workflow with state resolution...');

      const result = await clientService.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.localStorageExecuted).toBe(true);

      const storageConfig = result.finalState?.receivedLocalStorageConfig;
      console.log('\n🔍 LocalStorage node received config:', storageConfig);

      // Verify state resolution worked
      expect(storageConfig?.key).toBe('user_preferences');
      expect(storageConfig?.value).toEqual({
        theme: 'dark',
        language: 'en',
        notifications: true
      });
      expect(storageConfig?.operation).toBe('set'); // Static value unchanged

      console.log('✅ Client-side localStorage state resolution successful!');
    });

    test('should resolve state references in fetch API workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'client-fetch-workflow',
        name: 'Client Fetch Workflow',
        version: '1.0.0',
        description: 'Test fetch API with state resolution',
        initialState: {
          apiEndpoint: 'https://api.example.com/users',
          authToken: 'bearer-token-123',
          requestData: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        },
        workflow: [
          {
            'fetch': {
              'url': '$.apiEndpoint',
              'method': 'POST',
              'headers': {
                'Authorization': '$.authToken',
                'Content-Type': 'application/json'
              },
              'body': '$.requestData'
            }
          }
        ]
      };

      console.log('\n🌍 Testing client-side fetch workflow with state resolution...');

      const result = await clientService.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.fetchExecuted).toBe(true);

      const fetchConfig = result.finalState?.receivedFetchConfig;
      console.log('\n🔍 Fetch node received config:', fetchConfig);

      // Verify state resolution worked
      expect(fetchConfig?.url).toBe('https://api.example.com/users');
      expect(fetchConfig?.headers?.Authorization).toBe('bearer-token-123');
      expect(fetchConfig?.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(fetchConfig?.method).toBe('POST'); // Static value unchanged

      console.log('✅ Client-side fetch state resolution successful!');
    });

    test('should handle complex client workflow with nested state references', async () => {
      const workflow: WorkflowDefinition = {
        id: 'complex-client-workflow',
        name: 'Complex Client Workflow',
        version: '1.0.0',
        description: 'Complex client workflow testing multiple state resolutions',
        initialState: {
          app: {
            config: {
              theme: 'dark-mode',
              baseUrl: 'https://myapp.com/api'
            },
            user: {
              id: 12345,
              profile: {
                name: 'Alice Johnson',
                settings: {
                  autoSave: true
                }
              }
            }
          }
        },
        workflow: [
          // First: Store user data in localStorage
          {
            'localStorage': {
              'operation': 'set',
              'key': 'currentUser',
              'value': '$.app.user.profile.name'
            }
          },
          // Then: Update DOM with user info
          {
            'dom': {
              'selector': '#user-name',
              'action': 'setText',
              'value': '$.app.user.profile.name'
            }
          },
          // Finally: Make API call with user data
          {
            'fetch': {
              'url': '$.app.config.baseUrl',
              'method': 'PUT',
              'body': {
                'userId': '$.app.user.id',
                'autoSave': '$.app.user.profile.settings.autoSave'
              }
            }
          }
        ]
      };

      console.log('\n🔄 Testing complex client workflow with nested state resolution...');

      const result = await clientService.executeWorkflow(workflow);

      expect(result.status).toBe('completed');

      // Verify all nodes executed
      expect(result.finalState?.localStorageExecuted).toBe(true);
      expect(result.finalState?.domExecuted).toBe(true);
      expect(result.finalState?.fetchExecuted).toBe(true);

      // Check localStorage config
      const storageConfig = result.finalState?.receivedLocalStorageConfig;
      expect(storageConfig?.value).toBe('Alice Johnson');

      // Check DOM config
      const domConfig = result.finalState?.receivedDOMConfig;
      expect(domConfig?.value).toBe('Alice Johnson');

      // Check fetch config
      const fetchConfig = result.finalState?.receivedFetchConfig;
      expect(fetchConfig?.url).toBe('https://myapp.com/api');
      expect(fetchConfig?.body?.userId).toBe(12345);
      expect(fetchConfig?.body?.autoSave).toBe(true);

      console.log('✅ Complex client workflow state resolution successful!');
    });

    test('should handle missing state keys gracefully in client environment', async () => {
      const workflow: WorkflowDefinition = {
        id: 'client-missing-keys-workflow',
        name: 'Client Missing Keys Workflow',
        version: '1.0.0',
        description: 'Test handling of missing state keys in client',
        initialState: {
          existingKey: 'I exist!'
        },
        workflow: [
          {
            'dom': {
              'selector': '$.existingKey',
              'action': 'setText',
              'value': '$.missingKey',
              'fallback': 'Default Value'
            }
          }
        ]
      };

      console.log('\n⚠️ Testing client-side missing key handling...');

      const result = await clientService.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.domExecuted).toBe(true);

      const domConfig = result.finalState?.receivedDOMConfig;
      console.log('\n🔍 DOM config with missing key:', domConfig);

      // Verify resolution behavior
      expect(domConfig?.selector).toBe('I exist!'); // Resolved
      expect(domConfig?.value).toBeUndefined(); // Missing key → undefined
      expect(domConfig?.fallback).toBe('Default Value'); // Static value unchanged

      console.log('✅ Client-side missing key handling successful!');
    });
  });

  describe('Client service workflow validation', () => {
    test('should validate client workflows with state references', async () => {
      const workflow = {
        id: 'validation-test',
        name: 'Validation Test',
        version: '1.0.0',
        workflow: [
          {
            'dom': {
              'selector': '$.targetElement',
              'action': 'setText'
            }
          }
        ]
      };

      const validation = clientService.validateWorkflow(workflow);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      console.log('✅ Client workflow validation with state references passed!');
    });

    test('should detect invalid node references in client workflows', async () => {
      const workflow = {
        id: 'invalid-test',
        name: 'Invalid Test',
        version: '1.0.0',
        workflow: [
          {
            'nonExistentNode': {
              'config': 'value'
            }
          }
        ]
      };

      const validation = clientService.validateWorkflow(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      console.log('✅ Client workflow validation correctly detected invalid node!');
    });
  });
});