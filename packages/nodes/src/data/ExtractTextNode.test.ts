import { describe, it, expect, beforeEach } from 'vitest';
import { ExtractTextNode } from './ExtractTextNode';
import type { ExecutionContext } from '@workscript/engine';

describe('ExtractTextNode', () => {
  let node: ExtractTextNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new ExtractTextNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'extract-1',
      executionId: 'test-execution-123'
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('extractText');
      expect(node.metadata.name).toBe('Extract Text');
      expect(node.metadata.version).toBe('1.0.0');
    });

    it('should have ai_hints', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints?.purpose).toBeDefined();
      expect(node.metadata.ai_hints?.expected_edges).toContain('success');
      expect(node.metadata.ai_hints?.expected_edges).toContain('not_found');
      expect(node.metadata.ai_hints?.expected_edges).toContain('error');
    });
  });

  describe('extractAll method - email', () => {
    it('should extract all emails from text', async () => {
      context.state.text = 'Contact us at support@example.com or sales@example.com for more info.';

      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'text',
        extractType: 'email',
        outputField: 'emails'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['support@example.com', 'sales@example.com']);
      expect(data.matches).toBe(2);
      expect(context.state.emails).toEqual(['support@example.com', 'sales@example.com']);
      expect(context.state.extractedText).toEqual(['support@example.com', 'sales@example.com']);
    });

    it('should deduplicate email matches', async () => {
      context.state.text = 'Email: test@example.com. Contact: test@example.com again.';

      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'text',
        extractType: 'email',
        outputField: 'emails'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['test@example.com']);
      expect(data.matches).toBe(1);
    });
  });

  describe('extractAll method - url', () => {
    it('should extract all URLs from text', async () => {
      context.state.text = 'Visit https://example.com or http://test.org for info.';

      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'text',
        extractType: 'url',
        outputField: 'urls'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['https://example.com', 'http://test.org']);
      expect(data.matches).toBe(2);
      expect(context.state.urls).toEqual(['https://example.com', 'http://test.org']);
    });
  });

  describe('extractAll method - phone', () => {
    it('should extract phone numbers', async () => {
      context.state.text = 'Call us at 555-1234 or (555) 678-9012.';

      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'text',
        extractType: 'phone',
        outputField: 'phones'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.matches).toBeGreaterThan(0);
      expect(context.state.phones).toBeDefined();
    });
  });

  describe('between method', () => {
    it('should extract text between delimiters', async () => {
      context.state.text = 'Contact us at support@example.com or sales@example.com for help.';

      const result = await node.execute(context, {
        method: 'between',
        field: 'text',
        startDelimiter: 'Contact ',
        endDelimiter: ' or',
        outputField: 'contactInfo'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['us at support@example.com']);
      expect(data.matches).toBe(1);
      expect(context.state.contactInfo).toEqual(['us at support@example.com']);
    });

    it('should extract multiple occurrences between delimiters', async () => {
      context.state.text = 'Name: John, Age: 30, Name: Jane, Age: 25';

      const result = await node.execute(context, {
        method: 'between',
        field: 'text',
        startDelimiter: 'Name: ',
        endDelimiter: ',',
        outputField: 'names'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['John', 'Jane']);
      expect(data.matches).toBe(2);
    });

    it('should handle special regex characters in delimiters', async () => {
      context.state.text = 'Price: $25.99 (sale), Price: $19.99 (sale)';

      const result = await node.execute(context, {
        method: 'between',
        field: 'text',
        startDelimiter: '$',
        endDelimiter: ' (',
        outputField: 'prices'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['25.99', '19.99']);
    });
  });

  describe('regex method', () => {
    it('should extract with custom regex pattern', async () => {
      context.state.text = 'Product ID: ABC123, Product ID: XYZ789';

      const result = await node.execute(context, {
        method: 'regex',
        field: 'text',
        pattern: 'Product ID: ([A-Z0-9]+)',
        flags: 'g',
        outputField: 'productIds'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['ABC123', 'XYZ789']);
      expect(data.matches).toBe(2);
    });

    it('should use full match when no capture group', async () => {
      context.state.text = 'ID-123 and ID-456';

      const result = await node.execute(context, {
        method: 'regex',
        field: 'text',
        pattern: 'ID-\\d+',
        flags: 'g',
        outputField: 'ids'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['ID-123', 'ID-456']);
    });

    it('should handle case-insensitive matching', async () => {
      context.state.text = 'ERROR: Something failed, Error: Another issue';

      const result = await node.execute(context, {
        method: 'regex',
        field: 'text',
        pattern: 'error: ([^,]+)',
        flags: 'gi',
        outputField: 'errors'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.matches).toBe(2);
    });
  });

  describe('extractSpecific method', () => {
    it('should extract specific occurrence of email', async () => {
      context.state.text = 'Emails: first@test.com, second@test.com, third@test.com';

      const result = await node.execute(context, {
        method: 'extractSpecific',
        field: 'text',
        extractType: 'email',
        occurrence: 1,
        outputField: 'secondEmail'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toBe('second@test.com');
      expect(data.matches).toBe(1);
    });

    it('should extract first occurrence when occurrence is 0', async () => {
      context.state.text = 'Visit https://first.com or https://second.com';

      const result = await node.execute(context, {
        method: 'extractSpecific',
        field: 'text',
        extractType: 'url',
        occurrence: 0,
        outputField: 'firstUrl'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toBe('https://first.com');
    });

    it('should return not_found when occurrence does not exist', async () => {
      context.state.text = 'Email: test@example.com';

      const result = await node.execute(context, {
        method: 'extractSpecific',
        field: 'text',
        extractType: 'email',
        occurrence: 5,
        outputField: 'email'
      });

      expect(result.not_found).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return error for missing method', async () => {
      const result = await node.execute(context, {
        field: 'text'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!(context);
      expect(errorData.error).toContain('Missing required parameter: method');
    });

    it('should return error for invalid method', async () => {
      const result = await node.execute(context, {
        method: 'invalid',
        field: 'text'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!(context);
      expect(errorData.error).toContain('Invalid method');
    });

    it('should return error for missing field', async () => {
      const result = await node.execute(context, {
        method: 'extractAll'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!(context);
      expect(errorData.error).toContain('Missing required parameter: field');
    });

    it('should return not_found when field does not exist in state', async () => {
      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'nonexistent',
        extractType: 'email'
      });

      expect(result.not_found).toBeDefined();
      const data = result.not_found!(context);
      expect(data.message).toContain('not found in state');
    });

    it('should return error for invalid regex pattern', async () => {
      context.state.text = 'Some text';

      const result = await node.execute(context, {
        method: 'regex',
        field: 'text',
        pattern: '[invalid(regex',
        outputField: 'result'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!(context);
      expect(errorData.error).toContain('Invalid regex pattern');
    });

    it('should return error when regex method missing pattern', async () => {
      context.state.text = 'Some text';

      const result = await node.execute(context, {
        method: 'regex',
        field: 'text'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!(context);
      expect(errorData.error).toContain('Missing required parameter for regex method: pattern');
    });

    it('should return error when between method missing delimiters', async () => {
      context.state.text = 'Some text';

      const result = await node.execute(context, {
        method: 'between',
        field: 'text',
        startDelimiter: 'start'
      });

      expect(result.error).toBeDefined();
      const errorData = result.error!(context);
      expect(errorData.error).toContain('Missing required parameters for between method');
    });
  });

  describe('nested state access', () => {
    it('should extract from nested state path', async () => {
      context.state.user = {
        profile: {
          bio: 'Contact me at user@example.com'
        }
      };

      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'user.profile.bio',
        extractType: 'email',
        outputField: 'contactEmail'
      });

      expect(result.success).toBeDefined();
      const data = result.success!(context);
      expect(data.extracted).toEqual(['user@example.com']);
    });
  });

  describe('not_found edge', () => {
    it('should return not_found when no matches', async () => {
      context.state.text = 'No emails here!';

      const result = await node.execute(context, {
        method: 'extractAll',
        field: 'text',
        extractType: 'email',
        outputField: 'emails'
      });

      expect(result.not_found).toBeDefined();
      const data = result.not_found!(context);
      expect(data.message).toContain('No matches found');
      expect(data.count).toBe(0);
      expect(context.state.emails).toEqual([]);
    });
  });
});
