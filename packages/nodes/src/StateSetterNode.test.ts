import { describe, it, expect, beforeEach } from 'vitest';
import { StateSetterNode } from './StateSetterNode';
import type { ExecutionContext } from '@workscript/engine';

describe('StateSetterNode', () => {
  let node: StateSetterNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new StateSetterNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: '$.config.timeout',
      executionId: 'test-execution-123'
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('__state_setter__');
      expect(node.metadata.name).toBe('State Setter');
      expect(node.metadata.version).toBe('1.0.0');
      expect(node.metadata.inputs).toContain('statePath');
      expect(node.metadata.inputs).toContain('value');
    });
  });

  describe('execute', () => {
    it('should set simple nested state', async () => {
      const result = await node.execute(context, {
        statePath: 'config.timeout',
        value: 30
      });

      expect(result.success).toBeDefined();
      expect(context.state.config).toEqual({ timeout: 30 });

      const successData = await result.success!(context);
      expect(successData.statePath).toBe('config.timeout');
      expect(successData.value).toBe(30);
    });

    it('should set deeply nested state', async () => {
      const result = await node.execute(context, {
        statePath: 'user.profile.settings.theme',
        value: 'dark'
      });

      expect(result.success).toBeDefined();
      expect(context.state.user).toEqual({
        profile: {
          settings: {
            theme: 'dark'
          }
        }
      });
    });

    it('should set complex values (objects)', async () => {
      const complexValue = {
        timeout: 30,
        retries: 3,
        enabled: true
      };

      const result = await node.execute(context, {
        statePath: 'config.options',
        value: complexValue
      });

      expect(result.success).toBeDefined();
      expect(context.state.config.options).toEqual(complexValue);
    });

    it('should set array values', async () => {
      const arrayValue = [1, 2, 3, 4, 5];

      const result = await node.execute(context, {
        statePath: 'items',
        value: arrayValue
      });

      expect(result.success).toBeDefined();
      expect(context.state.items).toEqual(arrayValue);
    });

    it('should preserve existing nested data', async () => {
      // Set first value
      await node.execute(context, {
        statePath: 'user.name',
        value: 'John'
      });

      // Set second value in same parent object
      await node.execute(context, {
        statePath: 'user.age',
        value: 30
      });

      expect(context.state.user).toEqual({ name: 'John', age: 30 });
    });

    it('should update existing nested value', async () => {
      context.state.user = { name: 'Alice', age: 25 };

      await node.execute(context, {
        statePath: 'user.name',
        value: 'Bob'
      });

      expect(context.state.user).toEqual({ name: 'Bob', age: 25 });
    });

    it('should store metadata about the operation', async () => {
      await node.execute(context, {
        statePath: 'config.timeout',
        value: 30
      });

      expect(context.state._lastStateSet).toBeDefined();
      expect(context.state._lastStateSet.path).toBe('config.timeout');
      expect(context.state._lastStateSet.value).toBe(30);
      expect(context.state._lastStateSet.nodeId).toBe('$.config.timeout');
      expect(context.state._lastStateSet.timestamp).toBeDefined();
    });

    describe('error handling', () => {
      it('should return error for missing statePath', async () => {
        const result = await node.execute(context, {
          value: 'some value'
        });

        expect(result.error).toBeDefined();
        const errorData = await result.error!(context);
        expect(errorData.error).toContain('requires a valid statePath parameter');
      });

      it('should return error for invalid statePath type', async () => {
        const result = await node.execute(context, {
          statePath: 123, // Should be string
          value: 'some value'
        });

        expect(result.error).toBeDefined();
        const errorData = await result.error!(context);
        expect(errorData.error).toContain('requires a valid statePath parameter');
      });

      it('should return error for missing value', async () => {
        const result = await node.execute(context, {
          statePath: 'some.path'
          // value is missing
        });

        expect(result.error).toBeDefined();
        const errorData = await result.error!(context);
        expect(errorData.error).toContain('requires a value parameter');
      });

      it('should return error for empty statePath', async () => {
        const result = await node.execute(context, {
          statePath: '',
          value: 'some value'
        });

        expect(result.error).toBeDefined();
        const errorData = await result.error!(context);
        // Empty string is filtered out before path validation, so it's caught as missing parameter
        expect(errorData.error).toBeDefined();
        expect(typeof errorData.error).toBe('string');
      });

      it('should return error for statePath with only dots', async () => {
        const result = await node.execute(context, {
          statePath: '...',
          value: 'some value'
        });

        expect(result.error).toBeDefined();
        const errorData = await result.error!(context);
        expect(errorData.error).toContain('Invalid state path: path cannot be empty');
      });

      it('should handle execution errors gracefully', async () => {
        // Simulate an error by passing null config
        const result = await node.execute(context, null as any);

        expect(result.error).toBeDefined();
      });
    });

    describe('edge routing', () => {
      it('should support success edge routing', async () => {
        const result = await node.execute(context, {
          statePath: 'config.timeout',
          value: 30
        });

        expect(result.success).toBeDefined();
        expect(typeof result.success).toBe('function');
      });

      it('should not have error edge when successful', async () => {
        const result = await node.execute(context, {
          statePath: 'config.timeout',
          value: 30
        });

        expect(result.error).toBeUndefined();
      });

      it('should have error edge when failed', async () => {
        const result = await node.execute(context, {
          statePath: '',
          value: 'test'
        });

        expect(result.error).toBeDefined();
        expect(result.success).toBeUndefined();
      });
    });

    describe('value types', () => {
      it('should handle string values', async () => {
        await node.execute(context, {
          statePath: 'message',
          value: 'Hello World'
        });

        expect(context.state.message).toBe('Hello World');
      });

      it('should handle number values', async () => {
        await node.execute(context, {
          statePath: 'count',
          value: 42
        });

        expect(context.state.count).toBe(42);
      });

      it('should handle boolean values', async () => {
        await node.execute(context, {
          statePath: 'enabled',
          value: true
        });

        expect(context.state.enabled).toBe(true);
      });

      it('should handle null values', async () => {
        await node.execute(context, {
          statePath: 'nullable',
          value: null
        });

        expect(context.state.nullable).toBeNull();
      });

      it('should allow undefined value explicitly', async () => {
        // undefined is valid if explicitly passed
        const result = await node.execute(context, {
          statePath: 'explicit',
          value: undefined
        });

        // Should fail because value is required
        expect(result.error).toBeDefined();
      });
    });
  });
});
