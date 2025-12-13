/**
 * Tests for ResourceListNode
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResourceListNode } from './ResourceListNode';
import type { ExecutionContext } from '@workscript/engine';

describe('ResourceListNode', () => {
  let node: ResourceListNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new ResourceListNode();
    context = {
      state: {
        JWT_token: 'test-token-123'
      },
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'resource-list-1',
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
      expect(node.metadata.id).toBe('resource-list');
    });

    it('should have required ai_hints', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints.expected_edges).toContain('success');
      expect(node.metadata.ai_hints.expected_edges).toContain('empty');
      expect(node.metadata.ai_hints.expected_edges).toContain('error');
      expect(node.metadata.ai_hints.post_to_state).toContain('resourceList');
      expect(node.metadata.ai_hints.post_to_state).toContain('resourceCount');
    });
  });

  // ===========================================================================
  // SINGLE-EDGE RETURN TESTS
  // ===========================================================================

  describe('single-edge return pattern', () => {
    it('should return only one edge key on success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [{ id: '1', name: 'test' }],
          count: 1
        })
      });

      const result = await node.execute(context, {});

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.success).toBeDefined();
    });

    it('should return only one edge key on empty', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      const result = await node.execute(context, { type: 'prompt' });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.empty).toBeDefined();
    });

    it('should return only one edge key on error', async () => {
      context.state.JWT_token = undefined;
      const result = await node.execute(context, {});

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('validation', () => {
    it('should return error when JWT token is missing', async () => {
      context.state.JWT_token = undefined;

      const result = await node.execute(context, {});

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('MISSING_JWT_TOKEN');
    });

    it('should return error for invalid type', async () => {
      const result = await node.execute(context, { type: 'invalid' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid type');
    });

    it('should return error for invalid authorType', async () => {
      const result = await node.execute(context, { authorType: 'invalid' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid authorType');
    });

    it('should return error for invalid sortBy', async () => {
      const result = await node.execute(context, { sortBy: 'invalid' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid sortBy');
    });

    it('should return error for invalid limit', async () => {
      const result = await node.execute(context, { limit: 150 });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid limit');
    });

    it('should return error for negative limit', async () => {
      const result = await node.execute(context, { limit: -5 });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid limit');
    });

    it('should return error for negative offset', async () => {
      const result = await node.execute(context, { offset: -10 });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid offset');
    });
  });

  // ===========================================================================
  // SUCCESS CASES
  // ===========================================================================

  describe('successful listing', () => {
    it('should list resources with default pagination', async () => {
      const mockItems = [
        { id: '1', name: 'resource1', type: 'prompt' },
        { id: '2', name: 'resource2', type: 'document' }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: mockItems, count: 2 })
      });

      const result = await node.execute(context, {});

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.items).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.pagination.limit).toBe(50); // Default
      expect(data.pagination.offset).toBe(0);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.hasMore).toBe(false);

      // Verify state was updated
      expect(context.state.resourceList).toEqual(mockItems);
      expect(context.state.resourceCount).toBe(2);
    });

    it('should filter by type', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [{ id: '1', name: 'prompt1', type: 'prompt' }],
          count: 1
        })
      });

      await node.execute(context, { type: 'prompt' });

      // Verify query parameter
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('type=prompt');
    });

    it('should filter by tags', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      await node.execute(context, { tags: ['email', 'marketing'] });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('tags=email%2Cmarketing');
    });

    it('should search by keyword', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      await node.execute(context, { search: 'greeting' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('search=greeting');
    });

    it('should filter by authorType', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      await node.execute(context, { authorType: 'workflow' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('authorType=workflow');
    });

    it('should apply pagination', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        name: `resource${i + 1}`
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: mockItems, count: 50 })
      });

      const result = await node.execute(context, { limit: 10, offset: 20 });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(20);
      expect(data.pagination.total).toBe(50);
      expect(data.pagination.hasMore).toBe(true);

      // Verify query params
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('limit=10');
      expect(callArgs[0]).toContain('offset=20');
    });

    it('should apply sorting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      await node.execute(context, { sortBy: 'name' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('sortBy=name');
    });

    it('should combine multiple filters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [{ id: '1', name: 'email-prompt' }],
          count: 1
        })
      });

      await node.execute(context, {
        type: 'prompt',
        tags: ['email'],
        search: 'welcome',
        authorType: 'user',
        limit: 5,
        sortBy: 'updatedAt'
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('type=prompt');
      expect(callArgs[0]).toContain('tags=email');
      expect(callArgs[0]).toContain('search=welcome');
      expect(callArgs[0]).toContain('authorType=user');
      expect(callArgs[0]).toContain('limit=5');
      expect(callArgs[0]).toContain('sortBy=updatedAt');
    });
  });

  // ===========================================================================
  // EMPTY RESULTS
  // ===========================================================================

  describe('empty results', () => {
    it('should return empty edge when no resources match', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      const result = await node.execute(context, { type: 'audio' });

      expect(result.empty).toBeDefined();
      const data = result.empty!(context);
      expect(data.items).toHaveLength(0);
      expect(data.count).toBe(0);
      expect(data.filters.type).toBe('audio');

      // Verify state
      expect(context.state.resourceList).toEqual([]);
      expect(context.state.resourceCount).toBe(0);
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('error handling', () => {
    it('should return error on HTTP 500', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Server error' })
      });

      const result = await node.execute(context, {});

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Server error');
    });

    it('should return error on HTTP 403', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          success: false,
          error: 'Forbidden',
          code: 'PERMISSION_DENIED'
        })
      });

      const result = await node.execute(context, {});

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('PERMISSION_DENIED');
    });

    it('should return error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await node.execute(context, {});

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('NETWORK_ERROR');
    });
  });

  // ===========================================================================
  // BASE URL RESOLUTION
  // ===========================================================================

  describe('base URL resolution', () => {
    it('should use config baseUrl when provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      await node.execute(context, { baseUrl: 'https://custom-api.example.com' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom-api.example.com'),
        expect.any(Object)
      );
    });

    it('should use state API_BASE_URL when config not provided', async () => {
      context.state.API_BASE_URL = 'https://state-api.example.com';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], count: 0 })
      });

      await node.execute(context, {});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://state-api.example.com'),
        expect.any(Object)
      );
    });
  });
});
