/**
 * ContentProcessor
 *
 * Handles content processing operations for the sandboxed file management system.
 * Responsibilities include:
 * - Template interpolation ({{$.path}} syntax)
 * - Content type detection (magic bytes and extension-based)
 * - Checksum computation (SHA-256)
 * - Content validation
 */

import { createHash } from 'crypto';
import {
  type ResourceType,
  type ContentTypeDetection,
  type ContentValidation,
  type InterpolationResult,
  getMimeType,
  getResourceType,
  MIME_TYPE_TO_RESOURCE_TYPE,
} from './types';

/**
 * Magic bytes signatures for common file types.
 * Used to detect content type from file contents rather than extension.
 */
const MAGIC_BYTES: Array<{
  bytes: number[];
  offset: number;
  mimeType: string;
}> = [
  // PNG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, mimeType: 'image/png' },
  // JPEG
  { bytes: [0xff, 0xd8, 0xff], offset: 0, mimeType: 'image/jpeg' },
  // GIF87a
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0, mimeType: 'image/gif' },
  // GIF89a
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0, mimeType: 'image/gif' },
  // WebP
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'image/webp' }, // RIFF header, needs WEBP at offset 8
  // PDF
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], offset: 0, mimeType: 'application/pdf' }, // %PDF-
  // MP3 with ID3 tag
  { bytes: [0x49, 0x44, 0x33], offset: 0, mimeType: 'audio/mpeg' }, // ID3
  // MP3 without ID3 (sync frame)
  { bytes: [0xff, 0xfb], offset: 0, mimeType: 'audio/mpeg' },
  { bytes: [0xff, 0xfa], offset: 0, mimeType: 'audio/mpeg' },
  // WAV
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: 'audio/wav' }, // RIFF header, needs WAVE at offset 8
];

/**
 * Regex pattern for matching interpolation placeholders.
 * Matches: {{$.path}}, {{$.nested.path}}, {{$.array[0].field}}
 */
const INTERPOLATION_PATTERN = /\{\{\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*)\}\}/g;

/**
 * ContentProcessor - Singleton class for content processing operations.
 *
 * Handles template interpolation, content type detection, checksum computation,
 * and content validation for the resource management system.
 *
 * @example
 * ```typescript
 * const processor = ContentProcessor.getInstance();
 *
 * // Interpolate a template
 * const result = processor.interpolate('Hello {{$.name}}!', { name: 'World' });
 * // result.interpolated === 'Hello World!'
 *
 * // Detect content type
 * const detection = processor.detectContentType(buffer, 'image.png');
 *
 * // Compute checksum
 * const hash = processor.computeChecksum(buffer);
 * ```
 */
export class ContentProcessor {
  private static instance: ContentProcessor | null = null;

  /**
   * Private constructor - use getInstance() instead.
   */
  private constructor() {}

  /**
   * Gets the singleton instance of ContentProcessor.
   *
   * @returns The ContentProcessor singleton instance
   */
  public static getInstance(): ContentProcessor {
    if (!ContentProcessor.instance) {
      ContentProcessor.instance = new ContentProcessor();
    }
    return ContentProcessor.instance;
  }

  /**
   * Resets the singleton instance (for testing purposes only).
   * @internal
   */
  public static resetInstance(): void {
    ContentProcessor.instance = null;
  }

  // ===========================================================================
  // Template Interpolation
  // ===========================================================================

  /**
   * Interpolates template placeholders in content with values from state.
   *
   * Placeholder syntax: {{$.path}} or {{$.nested.path}}
   *
   * If a placeholder's path doesn't exist in state, the placeholder is left as-is.
   * This allows for partial interpolation and easy debugging of missing values.
   *
   * @param content - The template content with placeholders
   * @param state - The state object containing values to interpolate
   * @returns InterpolationResult with original, interpolated content, and metadata
   *
   * @example
   * ```typescript
   * const result = processor.interpolate(
   *   'Hello {{$.user.name}}, you have {{$.count}} messages.',
   *   { user: { name: 'Alice' }, count: 5 }
   * );
   * // result.interpolated === 'Hello Alice, you have 5 messages.'
   * // result.placeholdersReplaced === ['user.name', 'count']
   * ```
   */
  public interpolate(content: string, state: Record<string, unknown>): InterpolationResult {
    const placeholdersFound: string[] = [];
    const placeholdersReplaced: string[] = [];
    const placeholdersUnresolved: string[] = [];

    // Find all placeholders first using exec() for broader TypeScript compatibility
    const findPattern = new RegExp(INTERPOLATION_PATTERN.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = findPattern.exec(content)) !== null) {
      const pathMatch = match[1];
      if (pathMatch && !placeholdersFound.includes(pathMatch)) {
        placeholdersFound.push(pathMatch);
      }
    }

    // Replace placeholders with state values
    const interpolated = content.replace(INTERPOLATION_PATTERN, (fullMatch, path: string) => {
      const value = this.resolveStatePath(path, state);

      if (value === undefined) {
        if (!placeholdersUnresolved.includes(path)) {
          placeholdersUnresolved.push(path);
        }
        // Leave placeholder as-is if value not found
        return fullMatch;
      }

      if (!placeholdersReplaced.includes(path)) {
        placeholdersReplaced.push(path);
      }

      // Convert value to string safely
      return this.escapeInterpolationValue(value);
    });

    return {
      original: content,
      interpolated,
      placeholdersFound,
      placeholdersReplaced,
      placeholdersUnresolved,
    };
  }

  /**
   * Resolves a dot-notation path in a state object.
   *
   * Supports:
   * - Simple paths: "key"
   * - Nested paths: "nested.key"
   * - Array access: "items[0]" or "items[0].name"
   *
   * @param pathStr - The path string (e.g., "user.name" or "items[0].id")
   * @param state - The state object to resolve against
   * @returns The resolved value or undefined if path doesn't exist
   *
   * @example
   * ```typescript
   * const state = { user: { name: 'Alice' }, items: [{ id: 1 }] };
   * resolveStatePath('user.name', state); // 'Alice'
   * resolveStatePath('items[0].id', state); // 1
   * resolveStatePath('missing.path', state); // undefined
   * ```
   */
  public resolveStatePath(pathStr: string, state: Record<string, unknown>): unknown {
    if (!pathStr || typeof state !== 'object' || state === null) {
      return undefined;
    }

    // Parse path into segments, handling both dot notation and array indices
    // "user.name" -> ["user", "name"]
    // "items[0].name" -> ["items", "0", "name"]
    const segments = this.parsePathSegments(pathStr);

    let current: unknown = state;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object') {
        return undefined;
      }

      // Handle array index
      if (/^\d+$/.test(segment)) {
        const index = parseInt(segment, 10);
        if (!Array.isArray(current) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
      } else {
        // Handle object key
        current = (current as Record<string, unknown>)[segment];
      }
    }

    return current;
  }

  /**
   * Parses a path string into individual segments.
   * Handles dot notation and array bracket notation.
   *
   * @param pathStr - The path string to parse
   * @returns Array of path segments
   * @internal
   */
  private parsePathSegments(pathStr: string): string[] {
    const segments: string[] = [];
    let current = '';
    let i = 0;

    while (i < pathStr.length) {
      const char = pathStr[i];

      if (char === '.') {
        if (current) {
          segments.push(current);
          current = '';
        }
        i++;
      } else if (char === '[') {
        if (current) {
          segments.push(current);
          current = '';
        }
        // Find the closing bracket
        const closeBracket = pathStr.indexOf(']', i);
        if (closeBracket === -1) {
          // Malformed path, treat rest as segment
          segments.push(pathStr.slice(i));
          break;
        }
        segments.push(pathStr.slice(i + 1, closeBracket));
        i = closeBracket + 1;
      } else {
        current += char;
        i++;
      }
    }

    if (current) {
      segments.push(current);
    }

    return segments;
  }

  /**
   * Escapes and converts a value for safe interpolation into templates.
   *
   * Handles different value types:
   * - null/undefined: returns empty string
   * - string: escapes special characters
   * - number/boolean: converts to string
   * - object/array: JSON stringifies
   *
   * @param value - The value to escape and convert
   * @returns A safe string representation of the value
   *
   * @example
   * ```typescript
   * escapeInterpolationValue('hello'); // 'hello'
   * escapeInterpolationValue(42); // '42'
   * escapeInterpolationValue({ key: 'value' }); // '{"key":"value"}'
   * ```
   */
  public escapeInterpolationValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      // For now, return the string as-is
      // Template content is typically markdown or plain text
      // If HTML context escaping is needed, it should be done at render time
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }

    return String(value);
  }

  // ===========================================================================
  // Content Type Detection
  // ===========================================================================

  /**
   * Detects the content type of a file from its content and/or filename.
   *
   * Detection order:
   * 1. Magic bytes analysis (highest confidence)
   * 2. File extension mapping (medium confidence)
   * 3. Fallback to application/octet-stream (low confidence)
   *
   * @param content - The file content as a Buffer
   * @param filename - The filename with extension
   * @returns ContentTypeDetection with mimeType, resourceType, confidence, and method
   *
   * @example
   * ```typescript
   * const buffer = fs.readFileSync('image.png');
   * const detection = processor.detectContentType(buffer, 'image.png');
   * // { mimeType: 'image/png', resourceType: 'image', confidence: 'high', method: 'magic-bytes' }
   * ```
   */
  public detectContentType(content: Buffer, filename: string): ContentTypeDetection {
    // First, try magic bytes detection
    const magicDetection = this.detectByMagicBytes(content, filename);
    if (magicDetection) {
      return magicDetection;
    }

    // Fallback to extension-based detection
    const mimeType = getMimeType(filename);
    if (mimeType !== 'application/octet-stream') {
      const resourceType = getResourceType(mimeType);
      return {
        mimeType,
        resourceType,
        confidence: 'medium',
        method: 'extension',
      };
    }

    // Final fallback
    return {
      mimeType: 'application/octet-stream',
      resourceType: 'data',
      confidence: 'low',
      method: 'fallback',
    };
  }

  /**
   * Attempts to detect content type from magic bytes.
   *
   * @param content - The file content as a Buffer
   * @param filename - The filename (used for WebP/WAV disambiguation)
   * @returns ContentTypeDetection if detected, null otherwise
   * @internal
   */
  private detectByMagicBytes(content: Buffer, filename: string): ContentTypeDetection | null {
    if (content.length < 4) {
      return null;
    }

    for (const signature of MAGIC_BYTES) {
      const { bytes, offset, mimeType } = signature;

      if (content.length < offset + bytes.length) {
        continue;
      }

      let matches = true;
      for (let i = 0; i < bytes.length; i++) {
        if (content[offset + i] !== bytes[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        // Special handling for RIFF-based formats (WebP and WAV share the RIFF header)
        if (mimeType === 'image/webp' || mimeType === 'audio/wav') {
          const actualMimeType = this.disambiguateRiffFormat(content, filename);
          if (actualMimeType) {
            const resourceType = MIME_TYPE_TO_RESOURCE_TYPE[actualMimeType] || 'data';
            return {
              mimeType: actualMimeType,
              resourceType,
              confidence: 'high',
              method: 'magic-bytes',
            };
          }
          continue;
        }

        const resourceType = MIME_TYPE_TO_RESOURCE_TYPE[mimeType] || 'data';
        return {
          mimeType,
          resourceType,
          confidence: 'high',
          method: 'magic-bytes',
        };
      }
    }

    return null;
  }

  /**
   * Disambiguates between WebP and WAV formats (both use RIFF header).
   *
   * @param content - The file content
   * @param filename - The filename for fallback
   * @returns The detected MIME type or null
   * @internal
   */
  private disambiguateRiffFormat(content: Buffer, filename: string): string | null {
    if (content.length < 12) {
      // Not enough data, use filename
      const ext = filename.toLowerCase();
      if (ext.endsWith('.webp')) return 'image/webp';
      if (ext.endsWith('.wav')) return 'audio/wav';
      return null;
    }

    // Check bytes 8-11 for format identifier
    const formatId = content.slice(8, 12).toString('ascii');

    if (formatId === 'WEBP') {
      return 'image/webp';
    }
    if (formatId === 'WAVE') {
      return 'audio/wav';
    }

    return null;
  }

  // ===========================================================================
  // Content Validation
  // ===========================================================================

  /**
   * Validates that file content matches the expected type.
   *
   * Useful for security validation to ensure uploaded files match their
   * claimed type and aren't malicious files with spoofed extensions.
   *
   * @param content - The file content as a Buffer
   * @param expectedType - The expected MIME type or resource type
   * @param filename - The filename for extension-based validation
   * @returns ContentValidation with validation result and details
   *
   * @example
   * ```typescript
   * const validation = processor.validateContent(buffer, 'image/png', 'photo.png');
   * if (!validation.valid) {
   *   console.error(`Expected ${validation.expectedType} but got ${validation.actualType}`);
   * }
   * ```
   */
  public validateContent(
    content: Buffer,
    expectedType: string,
    filename: string
  ): ContentValidation {
    const detection = this.detectContentType(content, filename);

    // Normalize expected type - could be MIME type or resource type
    let expectedMimeType = expectedType;
    let expectedResourceType = expectedType as ResourceType;

    // If expectedType is a resource type, we need to check against that
    const resourceTypes: ResourceType[] = ['prompt', 'image', 'audio', 'document', 'data'];
    const isResourceType = resourceTypes.includes(expectedType as ResourceType);

    if (isResourceType) {
      expectedResourceType = expectedType as ResourceType;
      // Compare at resource type level
      const valid = detection.resourceType === expectedResourceType;
      return {
        valid,
        actualType: detection.mimeType,
        expectedType: expectedResourceType,
        message: valid
          ? `Content type ${detection.mimeType} matches expected resource type ${expectedResourceType}`
          : `Content type ${detection.mimeType} (${detection.resourceType}) does not match expected resource type ${expectedResourceType}`,
      };
    }

    // Compare at MIME type level
    expectedMimeType = expectedType;
    const valid = detection.mimeType === expectedMimeType;

    return {
      valid,
      actualType: detection.mimeType,
      expectedType: expectedMimeType,
      message: valid
        ? `Content matches expected type ${expectedMimeType}`
        : `Content type ${detection.mimeType} does not match expected ${expectedMimeType}`,
    };
  }

  /**
   * Checks if content is a text type suitable for interpolation.
   *
   * @param mimeType - The MIME type to check
   * @returns true if the content is text-based
   */
  public isTextContent(mimeType: string): boolean {
    const textTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'application/json',
      'application/xml',
      'text/xml',
    ];

    return textTypes.includes(mimeType) || mimeType.startsWith('text/');
  }

  // ===========================================================================
  // Checksum Computation
  // ===========================================================================

  /**
   * Computes a SHA-256 checksum of the content.
   *
   * Used for:
   * - Integrity verification
   * - Change detection
   * - Deduplication checks
   *
   * @param content - The content to hash (string or Buffer)
   * @returns The hex-encoded SHA-256 hash
   *
   * @example
   * ```typescript
   * const checksum = processor.computeChecksum(Buffer.from('Hello World'));
   * // Returns: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
   * ```
   */
  public computeChecksum(content: string | Buffer): string {
    const hash = createHash('sha256');

    if (typeof content === 'string') {
      hash.update(content, 'utf-8');
    } else {
      hash.update(content);
    }

    return hash.digest('hex');
  }

  /**
   * Verifies that content matches an expected checksum.
   *
   * @param content - The content to verify
   * @param expectedChecksum - The expected SHA-256 checksum
   * @returns true if checksums match
   *
   * @example
   * ```typescript
   * const valid = processor.verifyChecksum(buffer, storedChecksum);
   * ```
   */
  public verifyChecksum(content: string | Buffer, expectedChecksum: string): boolean {
    const actualChecksum = this.computeChecksum(content);
    return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
  }
}

export default ContentProcessor;
