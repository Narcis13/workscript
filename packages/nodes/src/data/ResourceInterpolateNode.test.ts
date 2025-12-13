/**
 * Tests for ResourceInterpolateNode
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResourceInterpolateNode } from './ResourceInterpolateNode';
import type { ExecutionContext } from '@workscript/engine';

describe('ResourceInterpolateNode', () => {
  let node: ResourceInterpolateNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new ResourceInterpolateNode();
    context = {
      state: {
        JWT_token: 'test-token-123',
        userName: 'Alice',
        orderCount: 5,
        nested: { deep: { value: 'found' } }
      },
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'resource-interpolate-1',
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
      expect(node.metadata.id).toBe('resource-interpolate');
    });

    it('should have required ai_hints', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints.expected_edges).toContain('success');
      expect(node.metadata.ai_hints.expected_edges).toContain('not_found');
      expect(node.metadata.ai_hints.expected_edges).toContain('error');
      expect(node.metadata.ai_hints.post_to_state).toContain('interpolatedContent');
      expect(node.metadata.ai_hints.post_to_state).toContain('interpolationStats');
    });
  });

  // ===========================================================================
  // SINGLE-EDGE RETURN TESTS
  // ===========================================================================

  describe('single-edge return pattern', () => {
    it('should return only one edge key on success', async () => {
      // Mock search by path
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            items: [{ id: 'template-id', path: 'prompts/greeting.md' }]
          })
        })
        // Mock interpolate
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            content: 'Hello Alice!',
            original: 'Hello {{$.userName}}!',
            placeholders: { found: 1, replaced: 1, unresolved: [] }
          })
        });

      const result = await node.execute(context, { path: 'prompts/greeting.md' });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.success).toBeDefined();
    });

    it('should return only one edge key on not_found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] })
      });

      const result = await node.execute(context, { path: 'nonexistent.md' });

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

  describe('successful interpolation', () => {
    it('should interpolate template by ID successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          content: 'Hello Alice! You have 5 orders.',
          original: 'Hello {{$.userName}}! You have {{$.orderCount}} orders.',
          placeholders: { found: 2, replaced: 2, unresolved: [] }
        })
      });

      const result = await node.execute(context, { resourceId: 'template-id' });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.content).toBe('Hello Alice! You have 5 orders.');
      expect(data.placeholders.found).toBe(2);
      expect(data.placeholders.replaced).toBe(2);
      expect(data.placeholders.unresolved).toHaveLength(0);

      // Verify state was updated
      expect(context.state.interpolatedContent).toBe('Hello Alice! You have 5 orders.');
      expect(context.state.interpolationStats).toEqual({
        found: 2,
        replaced: 2,
        unresolved: []
      });
    });

    it('should interpolate template by path', async () => {
      // Mock search
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            items: [{ id: 'found-id', path: 'prompts/test.md' }]
          })
        })
        // Mock interpolate
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            content: 'Interpolated content',
            placeholders: { found: 1, replaced: 1, unresolved: [] }
          })
        });

      const result = await node.execute(context, { path: 'prompts/test.md' });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.content).toBe('Interpolated content');
    });

    it('should include workflow state when includeAllState is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          content: 'Hello Alice!',
          placeholders: { found: 1, replaced: 1, unresolved: [] }
        })
      });

      await node.execute(context, {
        resourceId: 'template-id',
        includeAllState: true
      });

      // Verify API was called with state
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Should include workflow state (excluding JWT_token and API_BASE_URL)
      expect(body.state.userName).toBe('Alice');
      expect(body.state.orderCount).toBe(5);
      expect(body.state.JWT_token).toBeUndefined();
      expect(body.state.API_BASE_URL).toBeUndefined();
    });

    it('should use only explicit state when includeAllState is false', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          content: 'Hello Bob!',
          placeholders: { found: 1, replaced: 1, unresolved: [] }
        })
      });

      await node.execute(context, {
        resourceId: 'template-id',
        includeAllState: false,
        state: { userName: 'Bob' }
      });

      // Verify API was called with only explicit state
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.state).toEqual({ userName: 'Bob' });
    });

    it('should merge explicit state with workflow state', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          content: 'Hello Bob!',
          placeholders: { found: 1, replaced: 1, unresolved: [] }
        })
      });

      await node.execute(context, {
        resourceId: 'template-id',
        includeAllState: true,
        state: { userName: 'Bob' }  // Override workflow state
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Explicit state should override workflow state
      expect(body.state.userName).toBe('Bob');
      // But other workflow state should be included
      expect(body.state.orderCount).toBe(5);
    });

    it('should include execution context in API call', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          content: 'content',
          placeholders: { found: 0, replaced: 0, unresolved: [] }
        })
      });

      await node.execute(context, { resourceId: 'template-id' });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.workflowId).toBe('test-workflow');
      expect(body.executionId).toBe('test-exec-123');
      expect(body.nodeId).toBe('resource-interpolate-1');
    });

    it('should report unresolved placeholders', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          content: 'Hello {{$.missingKey}}!',
          original: 'Hello {{$.missingKey}}!',
          placeholders: {
            found: 1,
            replaced: 0,
            unresolved: ['$.missingKey']
          }
        })
      });

      const result = await node.execute(context, { resourceId: 'template-id' });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.placeholders.unresolved).toContain('$.missingKey');
    });
  });

  // ===========================================================================
  // NOT FOUND CASES
  // ===========================================================================

  describe('resource not found', () => {
    it('should return not_found when path search yields no results', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] })
      });

      const result = await node.execute(context, { path: 'nonexistent.md' });

      expect(result.not_found).toBeDefined();
      const data = result.not_found!(context);
      expect(data.path).toBe('nonexistent.md');

      // State should be cleared
      expect(context.state.interpolatedContent).toBeNull();
      expect(context.state.interpolationStats).toBeNull();
    });

    it('should return not_found when interpolate returns 404', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Not found' })
      });

      const result = await node.execute(context, { resourceId: 'nonexistent' });

      expect(result.not_found).toBeDefined();
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('error handling', () => {
    it('should return error for non-text resource', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Cannot interpolate binary resource',
          code: 'INVALID_RESOURCE_TYPE'
        })
      });

      const result = await node.execute(context, { resourceId: 'image-id' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('INVALID_RESOURCE_TYPE');
    });

    it('should return error on HTTP 500', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Server error' })
      });

      const result = await node.execute(context, { resourceId: 'test-id' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.error).toContain('Server error');
    });

    it('should return error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(context, { resourceId: 'test-id' });

      expect(result.error).toBeDefined();
      const data = result.error!(context);
      expect(data.code).toBe('NETWORK_ERROR');
    });
  });
});
