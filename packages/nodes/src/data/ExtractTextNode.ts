/**
 * ExtractTextNode - Universal node for extracting text using patterns and delimiters
 *
 * Supports multiple extraction methods:
 * - regex: Extract text using custom regular expression patterns
 * - between: Extract text between start and end delimiters
 * - extractAll: Extract all instances of predefined patterns (email, url, phone)
 * - extractSpecific: Extract a specific occurrence of a pattern
 *
 * Predefined patterns:
 * - email: Standard email addresses
 * - url: HTTP/HTTPS URLs
 * - phone: US phone numbers with optional country code
 *
 * @example
 * ```json
 * {
 *   "extract-emails": {
 *     "method": "extractAll",
 *     "field": "text",
 *     "extractType": "email",
 *     "outputField": "emails",
 *     "success?": "process-emails"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface ExtractTextNodeConfig {
  method?: 'regex' | 'between' | 'extractAll' | 'extractSpecific';
  field?: string;
  pattern?: string;
  flags?: string;
  startDelimiter?: string;
  endDelimiter?: string;
  extractType?: 'email' | 'url' | 'phone' | 'custom';
  occurrence?: number;
  outputField?: string;
}

export class ExtractTextNode extends WorkflowNode {
  metadata = {
    id: 'extractText',
    name: 'Extract Text',
    version: '1.0.0',
    description: 'Universal node - extracts text using regex patterns, delimiters, or predefined patterns',
    inputs: ['method', 'field', 'pattern', 'flags', 'startDelimiter', 'endDelimiter', 'extractType', 'occurrence', 'outputField'],
    outputs: ['extracted', 'matches', 'count'],
    ai_hints: {
      purpose: 'Extract text from strings using regex patterns, delimiters, or predefined patterns for emails, URLs, and phone numbers',
      when_to_use: 'When you need to extract emails, URLs, phone numbers, or custom patterns from text fields',
      expected_edges: ['success', 'not_found', 'error'],
      example_usage: '{"extract-1": {"method": "extractAll", "field": "text", "extractType": "email", "outputField": "emails", "success?": "next"}}',
      example_config: '{"method": "regex|between|extractAll|extractSpecific", "field": "string", "pattern?": "string", "flags?": "string", "startDelimiter?": "string", "endDelimiter?": "string", "extractType?": "email|url|phone|custom", "occurrence?": "number", "outputField": "string"}',
      get_from_state: [],
      post_to_state: ['extractedText', '<outputField>']
    }
  };

  /**
   * Predefined regex patterns for common extraction types
   */
  private readonly PREDEFINED_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    url: /https?:\/\/[^\s]+/g,
    phone: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      method,
      field,
      pattern,
      flags,
      startDelimiter,
      endDelimiter,
      extractType = 'custom',
      occurrence = 0,
      outputField = 'extractedText'
    } = (config as ExtractTextNodeConfig) || {};

    // Validate method
    if (!method) {
      return {
        error: () => ({
          error: 'Missing required parameter: method',
          expected: 'regex|between|extractAll|extractSpecific',
          nodeId: context.nodeId
        })
      };
    }

    if (!['regex', 'between', 'extractAll', 'extractSpecific'].includes(method)) {
      return {
        error: () => ({
          error: 'Invalid method parameter',
          expected: 'regex|between|extractAll|extractSpecific',
          received: method,
          nodeId: context.nodeId
        })
      };
    }

    // Validate field
    if (!field) {
      return {
        error: () => ({
          error: 'Missing required parameter: field',
          nodeId: context.nodeId
        })
      };
    }

    // Get field value from state
    const fieldValue = this.getNestedValue(context.state, field);

    if (fieldValue === null || fieldValue === undefined) {
      return {
        not_found: () => ({
          field,
          message: `Field '${field}' not found in state`,
          nodeId: context.nodeId
        })
      };
    }

    // Convert to string
    const text = String(fieldValue);

    try {
      let extractedData: string | string[];
      let matchCount: number;

      // Route to appropriate extraction method
      switch (method) {
        case 'regex':
          if (!pattern) {
            return {
              error: () => ({
                error: 'Missing required parameter for regex method: pattern',
                nodeId: context.nodeId
              })
            };
          }
          ({ extractedData, matchCount } = this.extractWithRegex(text, pattern, flags));
          break;

        case 'between':
          if (!startDelimiter || !endDelimiter) {
            return {
              error: () => ({
                error: 'Missing required parameters for between method: startDelimiter and endDelimiter',
                nodeId: context.nodeId
              })
            };
          }
          ({ extractedData, matchCount } = this.extractBetween(text, startDelimiter, endDelimiter));
          break;

        case 'extractAll':
          ({ extractedData, matchCount } = this.extractAll(text, extractType, pattern, flags));
          break;

        case 'extractSpecific':
          ({ extractedData, matchCount } = this.extractSpecific(text, extractType, occurrence, pattern, flags));
          break;

        default:
          return {
            error: () => ({
              error: `Unsupported method: ${method}`,
              nodeId: context.nodeId
            })
          };
      }

      // Check if any matches were found
      if (matchCount === 0) {
        context.state.extractedText = [];
        context.state[outputField] = [];

        return {
          not_found: () => ({
            field,
            method,
            message: 'No matches found',
            count: 0
          })
        };
      }

      // Store results in state
      context.state.extractedText = extractedData;
      context.state[outputField] = extractedData;

      return {
        success: () => ({
          extracted: extractedData,
          matches: matchCount,
          field,
          method
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Text extraction failed',
          nodeId: context.nodeId,
          method,
          field,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Extract text using custom regex pattern
   */
  private extractWithRegex(text: string, pattern: string, flags?: string): { extractedData: string[], matchCount: number } {
    try {
      // Create regex with flags (default to 'g' for global matching)
      const regexFlags = flags || 'g';
      const regex = new RegExp(pattern, regexFlags);

      const matches: string[] = [];
      let match: RegExpExecArray | null;

      // Extract all matches
      while ((match = regex.exec(text)) !== null) {
        // If there are capture groups, use the first one; otherwise, use the full match
        const extractedText = match.length > 1 && match[1] !== undefined ? match[1] : match[0];
        matches.push(extractedText);

        // Prevent infinite loop for non-global regex
        if (!regexFlags.includes('g')) {
          break;
        }
      }

      return {
        extractedData: matches,
        matchCount: matches.length
      };
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text between start and end delimiters
   */
  private extractBetween(text: string, startDelimiter: string, endDelimiter: string): { extractedData: string[], matchCount: number } {
    const matches: string[] = [];

    // Escape special regex characters in delimiters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedStart = escapeRegex(startDelimiter);
    const escapedEnd = escapeRegex(endDelimiter);

    // Create regex to find text between delimiters
    const pattern = new RegExp(`${escapedStart}(.*?)${escapedEnd}`, 'g');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match[1] !== undefined) {
        matches.push(match[1]);
      }
    }

    return {
      extractedData: matches,
      matchCount: matches.length
    };
  }

  /**
   * Extract all instances of predefined or custom pattern
   */
  private extractAll(text: string, extractType: string, customPattern?: string, flags?: string): { extractedData: string[], matchCount: number } {
    let regex: RegExp;

    if (extractType === 'custom') {
      if (!customPattern) {
        throw new Error('Custom extract type requires pattern parameter');
      }
      return this.extractWithRegex(text, customPattern, flags);
    }

    // Use predefined pattern
    if (extractType !== 'email' && extractType !== 'url' && extractType !== 'phone') {
      throw new Error(`Invalid extractType: ${extractType}. Expected: email, url, phone, or custom`);
    }

    regex = this.PREDEFINED_PATTERNS[extractType];

    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
    }

    // Deduplicate matches
    const uniqueMatches = Array.from(new Set(matches));

    return {
      extractedData: uniqueMatches,
      matchCount: uniqueMatches.length
    };
  }

  /**
   * Extract specific occurrence of a pattern (0-based index)
   */
  private extractSpecific(text: string, extractType: string, occurrence: number, customPattern?: string, flags?: string): { extractedData: string, matchCount: number } {
    if (occurrence < 0) {
      throw new Error('Occurrence must be a non-negative number');
    }

    let regex: RegExp;

    if (extractType === 'custom') {
      if (!customPattern) {
        throw new Error('Custom extract type requires pattern parameter');
      }
      try {
        const regexFlags = flags || 'g';
        regex = new RegExp(customPattern, regexFlags);
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Use predefined pattern
      if (extractType !== 'email' && extractType !== 'url' && extractType !== 'phone') {
        throw new Error(`Invalid extractType: ${extractType}. Expected: email, url, phone, or custom`);
      }
      regex = this.PREDEFINED_PATTERNS[extractType];
    }

    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
    }

    // Check if the requested occurrence exists
    if (occurrence >= matches.length) {
      return {
        extractedData: '',
        matchCount: 0
      };
    }

    return {
      extractedData: matches[occurrence] || '',
      matchCount: 1
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) {
      return undefined;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

export default ExtractTextNode;
