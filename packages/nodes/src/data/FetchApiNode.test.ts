import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FetchApiNode } from './FetchApiNode';
import type { ExecutionContext } from '@workscript/engine';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FetchApiNode', () => {
  let node: FetchApiNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new FetchApiNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'fetch-api-test',
      executionId: 'test-exec-123'
    };
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('fetchApi');
      expect(node.metadata.name).toBe('Fetch API');
      expect(node.metadata.version).toBe('1.0.0');
    });

    it('should have ai_hints defined', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints?.purpose).toBeDefined();
      expect(node.metadata.ai_hints?.expected_edges).toContain('success');
      expect(node.metadata.ai_hints?.expected_edges).toContain('error');
      expect(node.metadata.ai_hints?.expected_edges).toContain('clientError');
      expect(node.metadata.ai_hints?.expected_edges).toContain('serverError');
    });

    it('should have correct inputs defined', () => {
      expect(node.metadata.inputs).toContain('url');
      expect(node.metadata.inputs).toContain('method');
      expect(node.metadata.inputs).toContain('body');
      expect(node.metadata.inputs).toContain('headers');
      expect(node.metadata.inputs).toContain('timeout');
      expect(node.metadata.inputs).toContain('responseType');
    });

    it('should have correct post_to_state defined', () => {
      expect(node.metadata.ai_hints?.post_to_state).toContain('fetchResponse');
      expect(node.metadata.ai_hints?.post_to_state).toContain('fetchStatus');
      expect(node.metadata.ai_hints?.post_to_state).toContain('fetchHeaders');
    });
  });

  describe('validation', () => {
    it('should return error for missing url', async () => {
      const result = await node.execute(context, {});

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Missing required parameter: url');
    });

    it('should return error for invalid url type', async () => {
      const result = await node.execute(context, { url: 123 });

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid url parameter type');
    });

    it('should return error for invalid url format', async () => {
      const result = await node.execute(context, { url: 'not-a-valid-url' });

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid URL format');
    });

    it('should return error for invalid HTTP method', async () => {
      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'INVALID'
      });

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid HTTP method');
    });

    it('should return error for invalid responseType', async () => {
      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        responseType: 'invalid'
      });

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid responseType');
    });

    it('should return error for invalid timeout', async () => {
      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        timeout: -1000
      });

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid timeout');
    });

    it('should return error for invalid headers type', async () => {
      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        headers: 'invalid'
      });

      expect(result.error).toBeDefined();
      expect(Object.keys(result)).toHaveLength(1);
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid headers');
    });
  });

  describe('single-edge return pattern', () => {
    it('should return only one edge key on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{"result": "success"}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.success).toBeDefined();
    });

    it('should return only one edge key on client error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{"error": "Not found"}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.clientError).toBeDefined();
    });

    it('should return only one edge key on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{"error": "Server error"}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.serverError).toBeDefined();
    });

    it('should return only one edge key on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{"success": true}')
      });
    });

    it('should default to GET method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support POST method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { name: 'test' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' })
        })
      );
    });

    it('should support PUT method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data/1',
        method: 'PUT',
        body: { name: 'updated' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should support PATCH method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data/1',
        method: 'PATCH',
        body: { name: 'patched' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data/1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should support DELETE method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data/1',
        method: 'DELETE'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should support HEAD method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'HEAD'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('should support OPTIONS method', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'OPTIONS'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'OPTIONS' })
      );
    });

    it('should normalize method case', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'get' as any
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('headers', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{}')
      });
    });

    it('should pass custom headers', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('should auto-set Content-Type for JSON body', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { data: 'test' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should not override explicit Content-Type', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { data: 'test' },
        headers: { 'Content-Type': 'text/plain' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain'
          })
        })
      );
    });
  });

  describe('request body', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{}')
      });
    });

    it('should stringify object body', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { name: 'test', value: 123 }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          body: JSON.stringify({ name: 'test', value: 123 })
        })
      );
    });

    it('should pass string body as-is', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: 'raw string body'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          body: 'raw string body'
        })
      );
    });

    it('should not include body for GET requests', async () => {
      await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'GET',
        body: { ignored: 'body' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.not.objectContaining({
          body: expect.anything()
        })
      );
    });
  });

  describe('response handling', () => {
    it('should parse JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{"message": "Hello", "count": 42}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        responseType: 'json'
      });

      expect(result.success).toBeDefined();
      const successData = await result.success!(context);
      expect(successData.data).toEqual({ message: 'Hello', count: 42 });
    });

    it('should handle text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('Plain text response')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        responseType: 'text'
      });

      expect(result.success).toBeDefined();
      const successData = await result.success!(context);
      expect(successData.data).toBe('Plain text response');
    });

    it('should fallback to text if JSON parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: vi.fn().mockResolvedValue('not valid json')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        responseType: 'json'
      });

      expect(result.success).toBeDefined();
      const successData = await result.success!(context);
      expect(successData.data).toBe('not valid json');
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'DELETE'
      });

      expect(result.success).toBeDefined();
      const successData = await result.success!(context);
      expect(successData.data).toBeNull();
    });
  });

  describe('status code handling', () => {
    it('should return success edge for 2xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('{}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: {}
      });

      expect(result.success).toBeDefined();
      const successData = await result.success!(context);
      expect(successData.status).toBe(201);
      expect(successData.statusText).toBe('Created');
    });

    it('should return clientError edge for 4xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('{"error": "Validation failed"}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(result.clientError).toBeDefined();
      const errorData = await result.clientError!(context);
      expect(errorData.status).toBe(400);
      expect(errorData.error).toContain('400');
    });

    it('should return clientError edge for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: 'https://api.example.com/data/999',
        redirected: false,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('{}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data/999'
      });

      expect(result.clientError).toBeDefined();
      const errorData = await result.clientError!(context);
      expect(errorData.status).toBe(404);
    });

    it('should return serverError edge for 5xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('{}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(result.serverError).toBeDefined();
      const errorData = await result.serverError!(context);
      expect(errorData.status).toBe(503);
      expect(errorData.error).toContain('503');
    });
  });

  describe('state management', () => {
    it('should store response data in state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({
          'content-type': 'application/json',
          'x-request-id': '12345'
        }),
        text: vi.fn().mockResolvedValue('{"result": "data"}')
      });

      await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(context.state.fetchResponse).toEqual({ result: 'data' });
      expect(context.state.fetchStatus).toBe(200);
      expect(context.state.fetchHeaders).toBeDefined();
      expect(context.state.fetchHeaders['content-type']).toBe('application/json');
      expect(context.state.fetchHeaders['x-request-id']).toBe('12345');
    });

    it('should store error response in state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        url: 'https://api.example.com/data',
        redirected: false,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('{"error": "Invalid input"}')
      });

      await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(context.state.fetchResponse).toEqual({ error: 'Invalid input' });
      expect(context.state.fetchStatus).toBe(400);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await node.execute(context, {
        url: 'https://api.example.com/data'
      });

      expect(result.error).toBeDefined();
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Failed to fetch');
      expect(errorData.url).toBe('https://api.example.com/data');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('Request timed out');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await node.execute(context, {
        url: 'https://api.example.com/data',
        timeout: 5000
      });

      expect(result.error).toBeDefined();
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('timeout');
      expect(errorData.timeout).toBe(5000);
    });
  });

  describe('redirect handling', () => {
    it('should include redirect information in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/redirected',
        redirected: true,
        headers: new Headers({}),
        text: vi.fn().mockResolvedValue('{}')
      });

      const result = await node.execute(context, {
        url: 'https://api.example.com/original'
      });

      expect(result.success).toBeDefined();
      const successData = await result.success!(context);
      expect(successData.redirected).toBe(true);
      expect(successData.url).toBe('https://api.example.com/redirected');
    });
  });
});
