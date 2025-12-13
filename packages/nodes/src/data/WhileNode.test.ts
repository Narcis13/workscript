import { describe, it, expect, beforeEach } from 'vitest';
import { WhileNode } from './WhileNode';
import type { ExecutionContext } from '@workscript/engine';

describe('WhileNode', () => {
  let node: WhileNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new WhileNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'test-while',
      executionId: 'test-exec-123'
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('while');
      expect(node.metadata.name).toBe('While Loop');
      expect(node.metadata.version).toBe('1.0.0');
      expect(node.metadata.ai_hints.expected_edges).toContain('do');
      expect(node.metadata.ai_hints.expected_edges).toContain('done');
      expect(node.metadata.ai_hints.expected_edges).toContain('error');
    });
  });

  describe('single-edge return', () => {
    it('should return only one edge key on do', async () => {
      const result = await node.execute(context, { condition: true });
      expect(Object.keys(result)).toHaveLength(1);
      expect(result.do).toBeDefined();
    });

    it('should return only one edge key on done', async () => {
      const result = await node.execute(context, { condition: false });
      expect(Object.keys(result)).toHaveLength(1);
      expect(result.done).toBeDefined();
    });

    it('should return only one edge key on error', async () => {
      const result = await node.execute(context, { condition: undefined as any });
      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });
  });

  describe('boolean condition', () => {
    it('should emit do edge when condition is true', async () => {
      const result = await node.execute(context, { condition: true });

      expect(result.do).toBeDefined();
      const data = result.do!(context);
      expect(data.conditionWasTrue).toBe(true);
      expect(data.iteration).toBe(0);
      expect(data.isFirst).toBe(true);
    });

    it('should emit done edge when condition is false', async () => {
      const result = await node.execute(context, { condition: false });

      expect(result.done).toBeDefined();
      const data = result.done!(context);
      expect(data.message).toContain('false');
      expect(data.totalIterations).toBe(0);
    });

    it('should track iteration count across multiple executions', async () => {
      // First iteration
      let result = await node.execute(context, { condition: true });
      expect(result.do).toBeDefined();
      expect(context.state.whileIteration).toBe(0);
      expect(context.state.whileIsFirst).toBe(true);

      // Second iteration
      result = await node.execute(context, { condition: true });
      expect(result.do).toBeDefined();
      expect(context.state.whileIteration).toBe(1);
      expect(context.state.whileIsFirst).toBe(false);

      // Third iteration
      result = await node.execute(context, { condition: true });
      expect(result.do).toBeDefined();
      expect(context.state.whileIteration).toBe(2);
    });

    it('should exit loop when condition becomes false', async () => {
      // First iteration - condition true
      await node.execute(context, { condition: true });
      expect(context.state.whileIteration).toBe(0);

      // Second iteration - condition true
      await node.execute(context, { condition: true });
      expect(context.state.whileIteration).toBe(1);

      // Third iteration - condition false, exit loop
      const result = await node.execute(context, { condition: false });
      expect(result.done).toBeDefined();
      const data = result.done!(context);
      expect(data.totalIterations).toBe(2);
    });
  });

  describe('comparison condition', () => {
    it('should evaluate equals operator', async () => {
      const result = await node.execute(context, {
        condition: { left: 5, operator: '==', right: 5 }
      });
      expect(result.do).toBeDefined();
    });

    it('should evaluate not equals operator', async () => {
      const result = await node.execute(context, {
        condition: { left: 5, operator: '!=', right: 10 }
      });
      expect(result.do).toBeDefined();
    });

    it('should evaluate less than operator', async () => {
      const result = await node.execute(context, {
        condition: { left: 3, operator: '<', right: 5 }
      });
      expect(result.do).toBeDefined();
    });

    it('should evaluate greater than operator', async () => {
      const result = await node.execute(context, {
        condition: { left: 10, operator: '>', right: 5 }
      });
      expect(result.do).toBeDefined();
    });

    it('should evaluate less or equal operator', async () => {
      const result = await node.execute(context, {
        condition: { left: 5, operator: '<=', right: 5 }
      });
      expect(result.do).toBeDefined();
    });

    it('should evaluate greater or equal operator', async () => {
      const result = await node.execute(context, {
        condition: { left: 5, operator: '>=', right: 5 }
      });
      expect(result.do).toBeDefined();
    });

    it('should emit done when comparison is false', async () => {
      const result = await node.execute(context, {
        condition: { left: 10, operator: '<', right: 5 }
      });
      expect(result.done).toBeDefined();
    });

    it('should support word operators', async () => {
      let result = await node.execute(context, {
        condition: { left: 5, operator: 'equals', right: 5 }
      });
      expect(result.do).toBeDefined();

      // Reset state for next test
      delete context.state['__while_test-while'];

      result = await node.execute(context, {
        condition: { left: 5, operator: 'less', right: 10 }
      });
      expect(result.do).toBeDefined();
    });
  });

  describe('max iterations', () => {
    it('should error when max iterations exceeded', async () => {
      const config = { condition: true, maxIterations: 3 };

      // Execute 3 times (0, 1, 2)
      await node.execute(context, config);
      await node.execute(context, config);
      await node.execute(context, config);

      // Fourth execution should error
      const result = await node.execute(context, config);
      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Maximum iterations');
      expect(data.iterationsExecuted).toBe(3);
    });

    it('should use default max iterations of 1000', async () => {
      const result = await node.execute(context, { condition: true });
      expect(result.do).toBeDefined();
      // Internal state should have maxIterations = 1000
      const internalState = context.state['__while_test-while'];
      expect(internalState.maxIterations).toBe(1000);
    });

    it('should reject invalid maxIterations', async () => {
      const result = await node.execute(context, {
        condition: true,
        maxIterations: -5
      });
      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('maxIterations');
    });
  });

  describe('custom keys', () => {
    it('should use custom iteration key', async () => {
      const result = await node.execute(context, {
        condition: true,
        iterationKey: 'myLoopCount'
      });

      expect(result.do).toBeDefined();
      expect(context.state.myLoopCount).toBe(0);
    });

    it('should use custom state key for internal tracking', async () => {
      const result = await node.execute(context, {
        condition: true,
        stateKey: '__my_custom_while'
      });

      expect(result.do).toBeDefined();
      expect(context.state['__my_custom_while']).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should error when condition is missing', async () => {
      const result = await node.execute(context, {} as any);
      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Missing required parameter: condition');
    });
  });

  describe('state cleanup', () => {
    it('should clean up internal state on done', async () => {
      // Start loop
      await node.execute(context, { condition: true });
      expect(context.state['__while_test-while']).toBeDefined();

      // Exit loop
      await node.execute(context, { condition: false });
      expect(context.state['__while_test-while']).toBeUndefined();
    });

    it('should clean up internal state on max iterations error', async () => {
      const config = { condition: true, maxIterations: 2 };

      await node.execute(context, config);
      await node.execute(context, config);
      expect(context.state['__while_test-while']).toBeDefined();

      // Max iterations exceeded
      await node.execute(context, config);
      expect(context.state['__while_test-while']).toBeUndefined();
    });
  });

  describe('static methods', () => {
    it('should reset iteration state', async () => {
      // Start loop
      await node.execute(context, { condition: true });
      expect(context.state['__while_test-while']).toBeDefined();

      // Reset
      WhileNode.resetIteration(context);
      expect(context.state['__while_test-while']).toBeUndefined();
    });

    it('should reset custom state key', async () => {
      await node.execute(context, {
        condition: true,
        stateKey: '__my_loop'
      });
      expect(context.state['__my_loop']).toBeDefined();

      WhileNode.resetIteration(context, '__my_loop');
      expect(context.state['__my_loop']).toBeUndefined();
    });
  });
});
