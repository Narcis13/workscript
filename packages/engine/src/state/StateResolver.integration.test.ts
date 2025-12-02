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
import type { ExecutionContext, EdgeMap, WorkflowDefinition } from '../types';

// Test node that verifies it receives resolved configuration
class TestStateAccessNode extends WorkflowNode {
  metadata = {
    id: 'test-state-access',
    name: 'Test State Access Node',
    version: '1.0.0',
    description: 'A test node that verifies state access functionality'
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
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

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
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

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, values, multiplier } = config || {};

    let result = 0;
    switch (operation) {
      case 'add':
        result = values.reduce((a: number, b: number) => a + b, 0);
        break;
      case 'multiply':
        result = values.reduce((a: number, b: number) => a * b, 1);
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
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;
  let parser: WorkflowParser;

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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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
      const workflow: WorkflowDefinition = {
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

  describe('Template interpolation {{$.path}} integration', () => {
    test('should resolve templates during workflow execution', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-test',
        name: 'Template Test',
        version: '1.0.0',
        initialState: {
          user: { name: 'Alice' },
          score: 100
        },
        workflow: [
          {
            'test-log': {
              message: 'Hello {{$.user.name}}, score: {{$.score}}!'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.loggedMessage).toBe('Hello Alice, score: 100!');
      expect(result.finalState?.logExecuted).toBe(true);
    });

    test('should resolve templates with current state between nodes', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-state-change',
        name: 'Template State Change Test',
        version: '1.0.0',
        initialState: {
          counter: 10,
          user: { name: 'Bob' }
        },
        workflow: [
          // First node: log initial state with template
          {
            'test-log': {
              message: 'Counter is {{$.counter}}, user is {{$.user.name}}'
            }
          },
          // Second node: modify state
          {
            'test-math': {
              operation: 'add',
              values: ['$.counter', 5]
            }
          },
          // Third node: log updated state with template - should see new values
          {
            'test-state-access': {
              updatedMessage: 'Counter now {{$.mathResult}}, original was {{$.counter}}',
              userName: 'User: {{$.user.name}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.loggedMessage).toBe('Counter is 10, user is Bob');
      expect(result.finalState?.mathResult).toBe(15); // 10 + 5
      expect(result.finalState?.receivedConfig).toEqual({
        updatedMessage: 'Counter now 15, original was 10',
        userName: 'User: Bob'
      });
    });

    test('should handle templates with missing keys (silent empty string)', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-missing-keys',
        name: 'Template Missing Keys Test',
        version: '1.0.0',
        initialState: {
          existingKey: 'value'
        },
        workflow: [
          {
            'test-log': {
              message: 'Exists: {{$.existingKey}}, Missing: {{$.nonExistent}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.loggedMessage).toBe('Exists: value, Missing: ');
    });

    test('should handle templates in nested configurations', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-nested-config',
        name: 'Template Nested Config Test',
        version: '1.0.0',
        initialState: {
          user: { name: 'Charlie', role: 'admin' },
          system: { version: '2.0' }
        },
        workflow: [
          {
            'test-state-access': {
              greeting: 'Hello {{$.user.name}}!',
              nested: {
                info: 'User {{$.user.name}} is {{$.user.role}}',
                system: 'Version: {{$.system.version}}'
              },
              array: [
                'First: {{$.user.name}}',
                'Second: {{$.user.role}}'
              ]
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.receivedConfig).toEqual({
        greeting: 'Hello Charlie!',
        nested: {
          info: 'User Charlie is admin',
          system: 'Version: 2.0'
        },
        array: [
          'First: Charlie',
          'Second: admin'
        ]
      });
    });

    test('should handle multiple templates in a single string', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-multiple',
        name: 'Template Multiple Test',
        version: '1.0.0',
        initialState: {
          firstName: 'Jane',
          lastName: 'Doe',
          age: 30,
          city: 'New York'
        },
        workflow: [
          {
            'test-log': {
              message: '{{$.firstName}} {{$.lastName}}, age {{$.age}}, lives in {{$.city}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.loggedMessage).toBe('Jane Doe, age 30, lives in New York');
    });

    test('should handle templates with complex values (objects and arrays)', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-complex-values',
        name: 'Template Complex Values Test',
        version: '1.0.0',
        initialState: {
          user: { name: 'Alice', role: 'admin' },
          tags: ['javascript', 'typescript', 'bun']
        },
        workflow: [
          {
            'test-state-access': {
              userObject: 'User data: {{$.user}}',
              tagsArray: 'Tags: {{$.tags}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.receivedConfig?.userObject).toContain('"name"');
      expect(result.finalState?.receivedConfig?.userObject).toContain('Alice');
      expect(result.finalState?.receivedConfig?.tagsArray).toBe('Tags: ["javascript","typescript","bun"]');
    });

    test('should preserve type for full $.path references while interpolating templates', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-mixed-references',
        name: 'Template Mixed References Test',
        version: '1.0.0',
        initialState: {
          count: 42,
          message: 'Hello',
          active: true
        },
        workflow: [
          {
            'test-state-access': {
              // Full reference - should preserve number type
              numericValue: '$.count',
              // Template - should return interpolated string
              templateString: 'Count is {{$.count}}',
              // Full reference - should preserve boolean type
              boolValue: '$.active',
              // Template with boolean - should convert to string
              templateBool: 'Active: {{$.active}}',
              // Mixed: full reference and template
              fullRef: '$.message',
              template: 'Message: {{$.message}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      const config = result.finalState?.receivedConfig;

      // Verify type preservation for full references
      expect(config?.numericValue).toBe(42);
      expect(typeof config?.numericValue).toBe('number');
      expect(config?.boolValue).toBe(true);
      expect(typeof config?.boolValue).toBe('boolean');
      expect(config?.fullRef).toBe('Hello');

      // Verify template interpolation returns strings
      expect(config?.templateString).toBe('Count is 42');
      expect(typeof config?.templateString).toBe('string');
      expect(config?.templateBool).toBe('Active: true');
      expect(config?.template).toBe('Message: Hello');
    });

    test('should handle adjacent templates without spacing', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-adjacent',
        name: 'Template Adjacent Test',
        version: '1.0.0',
        initialState: {
          firstName: 'John',
          lastName: 'Smith'
        },
        workflow: [
          {
            'test-log': {
              message: '{{$.firstName}}{{$.lastName}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.loggedMessage).toBe('JohnSmith');
    });

    test('should handle same template appearing multiple times', async () => {
      const workflow: WorkflowDefinition = {
        id: 'template-duplicate',
        name: 'Template Duplicate Test',
        version: '1.0.0',
        initialState: {
          name: 'Alice'
        },
        workflow: [
          {
            'test-log': {
              message: '{{$.name}} loves {{$.name}}'
            }
          }
        ]
      };

      const parsedWorkflow = parser.parse(workflow);
      const result = await engine.execute(parsedWorkflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.loggedMessage).toBe('Alice loves Alice');
    });
  });
});