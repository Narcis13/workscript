/**
 * Tests for ResourceWriteNode
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResourceWriteNode } from './ResourceWriteNode';
import type { ExecutionContext } from '@workscript/engine';

describe('ResourceWriteNode', () => {
  let node: ResourceWriteNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new ResourceWriteNode();
    context = {
      state: {
        JWT_token: 'test-token-123'
      },
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'resource-write-1',
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
      expect(node.metadata.id).toBe('resource-write');
    });

    it('should have required ai_hints', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints.expected_edges).toContain('created');
      expect(node.metadata.ai_hints.expected_edges).toContain('updated');
      expect(node.metadata.ai_hints.expected_edges).toContain('error');
      expect(node.metadata.ai_hints.post_to_state).toContain('writtenResource');
      expect(node.metadata.ai_hints.post_to_state).toContain('writtenResourceId');
    });
  });

  // ===========================================================================
  // SINGLE-EDGE RETURN TESTS
  // ===========================================================================

  describe('single-edge return pattern', () => {
    it('should return only one edge key on created', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          success: true,
          resource: { id: 'new-id', name: 'test', path: 'test.md' }
        })
      });

      const result = await node.execute(context, {
        mode: 'create',
        path: 'test.md',
        content: 'Hello'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.created).toBeDefined();
    });

    it('should return only one edge key on updated', async () => {
      // Mock upsert - first search returns result
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [{ id: 'existing-id', path: 'test.md' }] })
        })
        // Then update succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            resource: { id: 'existing-id', name: 'test', path: 'test.md' }
          })
        });

      const result = await node.execute(context, {
        mode: 'upsert',
        path: 'test.md',
        content: 'Updated content'
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.updated).toBeDefined();
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
    it('should return error when mode is missing', async () => {
      const result = await node.execute(context, { content: 'test' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('mode');
    });

    it('should return error for invalid mode', async () => {
      const result = await node.execute(context, {
        mode: 'invalid',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid mode');
    });

    it('should return error when content is missing', async () => {
      const result = await node.execute(context, { mode: 'create' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('content');
    });

    it('should return error when path missing for create mode', async () => {
      const result = await node.execute(context, {
        mode: 'create',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Path is required');
    });

    it('should return error when JWT token is missing', async () => {
      context.state.JWT_token = undefined;

      const result = await node.execute(context, {
        mode: 'create',
        path: 'test.md',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('MISSING_JWT_TOKEN');
    });

    it('should return error for invalid type', async () => {
      const result = await node.execute(context, {
        mode: 'create',
        path: 'test.md',
        content: 'test',
        type: 'invalid'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Invalid type');
    });
  });

  // ===========================================================================
  // CREATE MODE TESTS
  // ===========================================================================

  describe('create mode', () => {
    it('should create resource successfully', async () => {
      const mockResource = {
        id: 'new-resource-id',
        name: 'greeting',
        path: 'prompts/greeting.md',
        type: 'prompt',
        mimeType: 'text/markdown',
        size: 18
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ success: true, resource: mockResource })
      });

      const result = await node.execute(context, {
        mode: 'create',
        path: 'prompts/greeting.md',
        name: 'greeting',
        content: 'Hello {{$.user}}!',
        type: 'prompt',
        tags: ['greeting', 'template']
      });

      expect(result.created).toBeDefined();
      const data = result.created!(context);
      expect(data.resource.id).toBe('new-resource-id');
      expect(data.resourceId).toBe('new-resource-id');

      // Verify state was updated
      expect(context.state.writtenResource).toEqual(mockResource);
      expect(context.state.writtenResourceId).toBe('new-resource-id');

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workscript/resources/create'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should serialize object content to JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          success: true,
          resource: { id: 'json-id', name: 'data', path: 'data/data.json' }
        })
      });

      const objectContent = { key: 'value', nested: { deep: true } };

      await node.execute(context, {
        mode: 'create',
        path: 'data/data.json',
        content: objectContent,
        type: 'data'
      });

      // Verify the content was JSON stringified
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.content).toBe(JSON.stringify(objectContent));
    });

    it('should return error on conflict (409)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ success: false, error: 'Resource exists' })
      });

      const result = await node.execute(context, {
        mode: 'create',
        path: 'existing.md',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('RESOURCE_EXISTS');
      expect(data.suggestion).toContain('upsert');
    });
  });

  // ===========================================================================
  // UPDATE MODE TESTS
  // ===========================================================================

  describe('update mode', () => {
    it('should update resource by ID successfully', async () => {
      const mockResource = {
        id: 'update-id',
        name: 'updated',
        path: 'prompts/updated.md',
        size: 25
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          resource: mockResource,
          previousChecksum: 'old-hash'
        })
      });

      const result = await node.execute(context, {
        mode: 'update',
        resourceId: 'update-id',
        content: 'Updated content here'
      });

      expect(result.updated).toBeDefined();
      const data = result.updated!(context);
      expect(data.resourceId).toBe('update-id');
      expect(data.previousChecksum).toBe('old-hash');
    });

    it('should update resource by path', async () => {
      // First: search finds resource
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            items: [{ id: 'found-id', path: 'prompts/test.md' }]
          })
        })
        // Then: update succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            resource: { id: 'found-id', path: 'prompts/test.md' }
          })
        });

      const result = await node.execute(context, {
        mode: 'update',
        path: 'prompts/test.md',
        content: 'New content'
      });

      expect(result.updated).toBeDefined();
    });

    it('should return error when resource not found for update', async () => {
      // Search returns empty
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] })
      });

      const result = await node.execute(context, {
        mode: 'update',
        path: 'nonexistent.md',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  // ===========================================================================
  // UPSERT MODE TESTS
  // ===========================================================================

  describe('upsert mode', () => {
    it('should create resource when it does not exist', async () => {
      // Search returns empty
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [] })
        })
        // Create succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            success: true,
            resource: { id: 'new-id', path: 'prompts/new.md' }
          })
        });

      const result = await node.execute(context, {
        mode: 'upsert',
        path: 'prompts/new.md',
        content: 'New content',
        name: 'new',
        type: 'prompt'
      });

      expect(result.created).toBeDefined();
      const data = result.created!(context);
      expect(data.resourceId).toBe('new-id');
    });

    it('should update resource when it exists', async () => {
      // Search returns existing resource
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            items: [{ id: 'existing-id', path: 'prompts/existing.md' }]
          })
        })
        // Update succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            resource: { id: 'existing-id', path: 'prompts/existing.md' }
          })
        });

      const result = await node.execute(context, {
        mode: 'upsert',
        path: 'prompts/existing.md',
        content: 'Updated content'
      });

      expect(result.updated).toBeDefined();
      const data = result.updated!(context);
      expect(data.resourceId).toBe('existing-id');
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

      const result = await node.execute(context, {
        mode: 'create',
        path: 'test.md',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Server error');
    });

    it('should return error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await node.execute(context, {
        mode: 'create',
        path: 'test.md',
        content: 'test'
      });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Connection refused');
      expect(data.code).toBe('NETWORK_ERROR');
    });
  });
});
