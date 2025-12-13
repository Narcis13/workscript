/**
 * Tests for ResourceReadNode
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResourceReadNode } from './ResourceReadNode';
import type { ExecutionContext } from '@workscript/engine';

describe('ResourceReadNode', () => {
  let node: ResourceReadNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new ResourceReadNode();
    context = {
      state: {
        JWT_token: 'test-token-123'
      },
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'resource-read-1',
      executionId: 'test-exec-123'
    };

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // METADATA TESTS
  // ===========================================================================

  describe('metadata', () => {
    it('should have correct node ID', () => {
      expect(node.metadata.id).toBe('resource-read');
    });

    it('should have required ai_hints', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints.expected_edges).toContain('success');
      expect(node.metadata.ai_hints.expected_edges).toContain('not_found');
      expect(node.metadata.ai_hints.expected_edges).toContain('error');
      expect(node.metadata.ai_hints.post_to_state).toContain('resourceContent');
      expect(node.metadata.ai_hints.post_to_state).toContain('resourceMetadata');
    });
  });

  // ===========================================================================
  // SINGLE-EDGE RETURN TESTS
  // ===========================================================================

  describe('single-edge return pattern', () => {
    it('should return only one edge key on success', async () => {
      // Mock successful metadata response
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            resource: {
              id: 'test-id',
              name: 'test.md',
              path: 'prompts/test.md',
              mimeType: 'text/markdown',
              size: 100
            }
          })
        })
        // Mock successful content response
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Hello World')
        });

      const result = await node.execute(context, { resourceId: 'test-id' });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.success).toBeDefined();
    });

    it('should return only one edge key on not_found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Not found' })
      });

      const result = await node.execute(context, { resourceId: 'nonexistent' });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.not_found).toBeDefined();
    });

    it('should return only one edge key on error', async () => {
      const result = await node.execute(context, {});

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('validation', () => {
    it('should return error when no resourceId or path provided', async () => {
      const result = await node.execute(context, {});

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('provide either resourceId or path');
    });

    it('should return error when JWT token is missing', async () => {
      context.state.JWT_token = undefined;

      const result = await node.execute(context, { resourceId: 'test-id' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('MISSING_JWT_TOKEN');
    });

    it('should return error for invalid responseType', async () => {
      const result = await node.execute(context, {
        resourceId: 'test-id',
        responseType: 'invalid'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid responseType');
    });

    it('should return error for invalid timeout', async () => {
      const result = await node.execute(context, {
        resourceId: 'test-id',
        timeout: -100
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid timeout');
    });
  });

  // ===========================================================================
  // SUCCESS CASES
  // ===========================================================================

  describe('successful resource read', () => {
    it('should read resource by ID successfully', async () => {
      const mockResource = {
        id: 'abc123',
        name: 'greeting.md',
        path: 'prompts/greeting.md',
        type: 'prompt',
        mimeType: 'text/markdown',
        size: 42,
        checksum: 'sha256-hash',
        authorType: 'user',
        tenantId: 'tenant-1',
        tags: ['greeting'],
        isActive: true,
        isPublic: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, resource: mockResource })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Hello {{$.userName}}!')
        });

      const result = await node.execute(context, { resourceId: 'abc123' });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.content).toBe('Hello {{$.userName}}!');
      expect(data.resource.id).toBe('abc123');
      expect(data.mimeType).toBe('text/markdown');
      expect(data.size).toBe(42);

      // Verify state was updated
      expect(context.state.resourceContent).toBe('Hello {{$.userName}}!');
      expect(context.state.resourceMetadata).toEqual(mockResource);
    });

    it('should read resource by path successfully', async () => {
      const mockResource = {
        id: 'found-id',
        name: 'test.md',
        path: 'prompts/test.md',
        mimeType: 'text/markdown',
        size: 20
      };

      // First call: search by path
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [mockResource], count: 1 })
        })
        // Second call: get metadata
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, resource: mockResource })
        })
        // Third call: get content
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Content from path')
        });

      const result = await node.execute(context, { path: 'prompts/test.md' });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.content).toBe('Content from path');
    });

    it('should parse JSON content when responseType is json', async () => {
      const mockResource = {
        id: 'json-id',
        name: 'data.json',
        path: 'data/data.json',
        mimeType: 'application/json',
        size: 50
      };

      const jsonContent = { key: 'value', nested: { deep: true } };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, resource: mockResource })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(jsonContent))
        });

      const result = await node.execute(context, {
        resourceId: 'json-id',
        responseType: 'json'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.content).toEqual(jsonContent);
      expect(context.state.resourceContent).toEqual(jsonContent);
    });

    it('should return base64 for binary content', async () => {
      const mockResource = {
        id: 'bin-id',
        name: 'image.png',
        path: 'media/image.png',
        mimeType: 'image/png',
        size: 1024
      };

      const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, resource: mockResource })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(binaryData.buffer)
        });

      const result = await node.execute(context, {
        resourceId: 'bin-id',
        responseType: 'binary'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      // Should be base64 encoded
      expect(typeof data.content).toBe('string');
    });
  });

  // ===========================================================================
  // NOT FOUND CASES
  // ===========================================================================

  describe('resource not found', () => {
    it('should return not_found when resource ID does not exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Resource not found' })
      });

      const result = await node.execute(context, { resourceId: 'nonexistent' });

      expect(result.not_found).toBeDefined();
      const data = result.not_found!(context);
      expect(data.error).toContain('not found');
      expect(data.resourceId).toBe('nonexistent');

      // State should be cleared
      expect(context.state.resourceContent).toBeNull();
      expect(context.state.resourceMetadata).toBeNull();
    });

    it('should return not_found when path search yields no results', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      const result = await node.execute(context, { path: 'nonexistent/path.md' });

      expect(result.not_found).toBeDefined();
      const data = result.not_found!(context);
      expect(data.path).toBe('nonexistent/path.md');
    });
  });

  // ===========================================================================
  // ERROR CASES
  // ===========================================================================

  describe('error handling', () => {
    it('should return error on HTTP 500', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Server error' })
      });

      const result = await node.execute(context, { resourceId: 'test-id' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('HTTP 500');
    });

    it('should return error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(context, { resourceId: 'test-id' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Network error');
      expect(data.code).toBe('NETWORK_ERROR');
    });
  });

  // ===========================================================================
  // BASE URL RESOLUTION
  // ===========================================================================

  describe('base URL resolution', () => {
    it('should use config baseUrl when provided', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, resource: { id: 'test' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('content')
        });

      await node.execute(context, {
        resourceId: 'test-id',
        baseUrl: 'https://custom-api.example.com'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom-api.example.com'),
        expect.any(Object)
      );
    });

    it('should use state API_BASE_URL when config not provided', async () => {
      context.state.API_BASE_URL = 'https://state-api.example.com';

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, resource: { id: 'test' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('content')
        });

      await node.execute(context, { resourceId: 'test-id' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://state-api.example.com'),
        expect.any(Object)
      );
    });
  });
});
