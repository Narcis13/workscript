import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RunWorkflowNode } from './RunWorkflowNode';
import type { ExecutionContext } from '@workscript/engine';

describe('RunWorkflowNode', () => {
  let node: RunWorkflowNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new RunWorkflowNode();
    context = {
      state: {
        JWT_token: 'test-jwt-token-123'
      },
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'run-workflow-1',
      executionId: 'test-execution-123'
    };

    // Reset fetch mock
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('runWorkflow');
      expect(node.metadata.name).toBe('Run Workflow');
      expect(node.metadata.version).toBe('1.0.0');
      expect(node.metadata.inputs).toContain('workflowId');
      expect(node.metadata.inputs).toContain('initialState');
      expect(node.metadata.ai_hints.expected_edges).toEqual(['success', 'error']);
    });
  });

  describe('validation', () => {
    it('should return error edge when workflowId is missing', async () => {
      const result = await node.execute(context, {});

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();

      const errorData = result.error!();
      expect(errorData.error).toBe('Missing required parameter: workflowId');
      expect(errorData.nodeId).toBe('run-workflow-1');
    });

    it('should return error edge when JWT_token is missing from state', async () => {
      context.state = {}; // Remove JWT_token

      const result = await node.execute(context, { workflowId: 'test-workflow' });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();

      const errorData = result.error!();
      expect(errorData.error).toContain('Missing JWT_token in state');
    });
  });

  describe('single-edge return pattern', () => {
    it('should return only one edge key on success', async () => {
      // Mock successful fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({
          status: 'completed',
          executionId: 'exec-456',
          result: { data: 'success' },
          finalState: { outputData: 'processed' }
        })
      });

      const result = await node.execute(context, {
        workflowId: 'target-workflow',
        initialState: { inputData: 'test' }
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.success).toBeDefined();
    });

    it('should return only one edge key on error', async () => {
      // Mock failed fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          status: 'failed',
          error: 'Workflow not found'
        })
      });

      const result = await node.execute(context, {
        workflowId: 'non-existent-workflow'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });

    it('should return only one edge key on network error', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await node.execute(context, {
        workflowId: 'target-workflow'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });
  });

  describe('successful execution', () => {
    it('should make authenticated API call with correct payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({
          status: 'completed',
          executionId: 'exec-789',
          result: { processed: true },
          finalState: { done: true }
        })
      });
      global.fetch = mockFetch;

      await node.execute(context, {
        workflowId: 'target-workflow',
        initialState: { inputValue: 42 }
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/workscript/workflows/run');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-jwt-token-123');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.workflowId).toBe('target-workflow');
      expect(body.initialState).toEqual({ inputValue: 42 });
    });

    it('should store results in state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({
          status: 'completed',
          executionId: 'exec-result-123',
          result: { outputData: 'processed' },
          finalState: { completed: true }
        })
      });

      await node.execute(context, {
        workflowId: 'target-workflow'
      });

      expect(context.state.runWorkflowExecutionId).toBe('exec-result-123');
      expect(context.state.runWorkflowResult).toEqual({ outputData: 'processed' });
      expect(context.state.runWorkflowFinalState).toEqual({ completed: true });
    });

    it('should return execution details on success edge', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({
          status: 'completed',
          executionId: 'exec-detail-456',
          result: { message: 'done' },
          finalState: { finished: true }
        })
      });

      const result = await node.execute(context, {
        workflowId: 'my-workflow'
      });

      const successData = result.success!();
      expect(successData.executionId).toBe('exec-detail-456');
      expect(successData.result).toEqual({ message: 'done' });
      expect(successData.finalState).toEqual({ finished: true });
      expect(successData.status).toBe('completed');
      expect(successData.workflowId).toBe('my-workflow');
    });
  });

  describe('error handling', () => {
    it('should handle workflow not found error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          status: 'failed',
          error: 'Workflow not found: missing-workflow'
        })
      });

      const result = await node.execute(context, {
        workflowId: 'missing-workflow'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!();
      expect(errorData.error).toContain('Workflow not found');
      expect(errorData.workflowId).toBe('missing-workflow');
    });

    it('should handle workflow execution failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          status: 'failed',
          error: 'Workflow execution failed at node xyz',
          executionId: 'failed-exec-123'
        })
      });

      const result = await node.execute(context, {
        workflowId: 'failing-workflow'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!();
      expect(errorData.error).toContain('Workflow execution failed');
      expect(errorData.executionId).toBe('failed-exec-123');
    });

    it('should handle timeout error', async () => {
      // Create an abort error
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await node.execute(context, {
        workflowId: 'slow-workflow',
        timeout: 1000
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!();
      expect(errorData.error).toContain('timeout');
    });
  });

  describe('configuration options', () => {
    it('should use custom baseUrl when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({ status: 'completed', executionId: 'test' })
      });
      global.fetch = mockFetch;

      await node.execute(context, {
        workflowId: 'test-workflow',
        baseUrl: 'https://custom-api.example.com'
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://custom-api.example.com/workscript/workflows/run');
    });

    it('should use default empty object for initialState when not provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => Promise.resolve({ status: 'completed', executionId: 'test' })
      });
      global.fetch = mockFetch;

      await node.execute(context, {
        workflowId: 'test-workflow'
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.initialState).toEqual({});
    });
  });
});
