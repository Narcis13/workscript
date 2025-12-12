/**
 * SourceExtractor Service
 *
 * Singleton service responsible for extracting and parsing node source code.
 * This service:
 * - Resolves node IDs to file paths within packages/nodes/src/
 * - Reads TypeScript source files
 * - Parses source structure (class, methods, interfaces)
 * - Finds related test and example files
 * - Implements caching to avoid repeated file reads
 *
 * SECURITY: Source extraction is strictly limited to the packages/nodes/ directory.
 */

import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import type {
  ParsedStructure,
  ParsedMethod,
  ParsedInterface,
  RelatedFiles,
  CodeHighlight,
  ComplexityLevel,
} from '../types/reflection.types';
import { NODE_FILE_PATHS, getNodeFilePath } from './nodeCategories';

/**
 * Cached source information
 */
interface CachedSource {
  content: string;
  structure: ParsedStructure;
  highlights: CodeHighlight[];
  timestamp: number;
}

/**
 * SourceExtractor - Singleton service for node source code extraction
 *
 * Provides methods to:
 * - Resolve node paths within the packages/nodes/src directory
 * - Read and cache source file contents
 * - Parse TypeScript class structure
 * - Find related test and example files
 */
export class SourceExtractor {
  private static instance: SourceExtractor | null = null;
  private cache: Map<string, CachedSource> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly NODES_BASE_PATH: string;

  private constructor() {
    // Resolve the absolute path to packages/nodes/src from the current location
    // Path from: apps/api/src/plugins/workscript/reflection/services/
    // To: packages/nodes/src/
    // services -> reflection -> workscript -> plugins -> src -> api -> apps -> root
    this.NODES_BASE_PATH = resolve(__dirname, '../../../../../../..', 'packages/nodes/src');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): SourceExtractor {
    if (!SourceExtractor.instance) {
      SourceExtractor.instance = new SourceExtractor();
    }
    return SourceExtractor.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    SourceExtractor.instance = null;
  }

  /**
   * Clear the source cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get the base path for node files
   */
  getNodesBasePath(): string {
    return this.NODES_BASE_PATH;
  }

  // ============================================================================
  // PATH RESOLUTION
  // ============================================================================

  /**
   * Resolve a node ID to its absolute file path
   * SECURITY: Only returns paths within packages/nodes/src/
   *
   * @param nodeId - The node ID to resolve
   * @returns Absolute file path or null if not found
   */
  resolveNodePath(nodeId: string): string | null {
    const relativePath = getNodeFilePath(nodeId);
    if (!relativePath) {
      return null;
    }

    const absolutePath = resolve(this.NODES_BASE_PATH, relativePath);

    // Security check: ensure path is within packages/nodes/src
    if (!absolutePath.startsWith(this.NODES_BASE_PATH)) {
      console.warn(`[SourceExtractor] Security: Blocked path traversal attempt for nodeId: ${nodeId}`);
      return null;
    }

    return absolutePath;
  }

  /**
   * Check if a file path is safe (within packages/nodes/src)
   * @param filePath - Path to check
   * @returns true if path is safe
   */
  private isPathSafe(filePath: string): boolean {
    const normalizedPath = resolve(filePath);
    return normalizedPath.startsWith(this.NODES_BASE_PATH);
  }

  // ============================================================================
  // SOURCE FILE READING
  // ============================================================================

  /**
   * Read the source code for a node
   *
   * @param nodeId - The node ID to read source for
   * @returns Source code string or null if not found/error
   */
  async readNodeSource(nodeId: string): Promise<string | null> {
    const filePath = this.resolveNodePath(nodeId);
    if (!filePath) {
      return null;
    }

    try {
      // Check if file exists
      await access(filePath, constants.R_OK);
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.warn(`[SourceExtractor] Failed to read source for node ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Get cached or fresh source with parsed structure
   *
   * @param nodeId - The node ID to get source for
   * @returns Cached source data or null if not found
   */
  async getSourceWithCache(nodeId: string): Promise<CachedSource | null> {
    // Check cache first
    const cached = this.cache.get(nodeId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached;
    }

    // Read fresh source
    const content = await this.readNodeSource(nodeId);
    if (!content) {
      return null;
    }

    // Parse structure and highlights
    const structure = this.parseStructure(content);
    const highlights = this.extractHighlights(content);

    // Cache and return
    const cachedSource: CachedSource = {
      content,
      structure,
      highlights,
      timestamp: now,
    };

    this.cache.set(nodeId, cachedSource);
    return cachedSource;
  }

  // ============================================================================
  // TYPESCRIPT PARSING
  // ============================================================================

  /**
   * Parse TypeScript source code to extract structure
   * Uses regex-based parsing (not full AST) for simplicity and speed
   *
   * @param source - TypeScript source code
   * @returns Parsed structure with class, methods, and interfaces
   */
  parseStructure(source: string): ParsedStructure {
    const className = this.extractClassName(source);
    const extendsClass = this.extractExtendsClass(source);
    const methods = this.extractMethods(source);
    const interfaces = this.extractInterfaces(source);

    return {
      className,
      extendsClass,
      methods,
      interfaces,
    };
  }

  /**
   * Extract the main class name from source
   */
  private extractClassName(source: string): string {
    // Match: export class ClassName extends ...
    const classMatch = source.match(/export\s+class\s+(\w+)\s+extends/);
    if (classMatch && classMatch[1]) {
      return classMatch[1];
    }

    // Fallback: any class definition
    const anyClassMatch = source.match(/class\s+(\w+)/);
    return anyClassMatch && anyClassMatch[1] ? anyClassMatch[1] : 'Unknown';
  }

  /**
   * Extract the parent class name
   */
  private extractExtendsClass(source: string): string {
    const extendsMatch = source.match(/extends\s+(\w+)/);
    return extendsMatch && extendsMatch[1] ? extendsMatch[1] : '';
  }

  /**
   * Extract method definitions from source
   */
  private extractMethods(source: string): ParsedMethod[] {
    const methods: ParsedMethod[] = [];

    // Match method definitions: async/public/private/protected methodName(params): ReturnType
    const methodRegex = /((?:public|private|protected)\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;

    let match: RegExpExecArray | null;
    while ((match = methodRegex.exec(source)) !== null) {
      const visibility = match[1];
      const name = match[2];
      const paramsStr = match[3] ?? '';
      const returnType = match[4];

      // Skip constructor and property accessors, and invalid matches
      if (!name || name === 'constructor' || name === 'get' || name === 'set') {
        continue;
      }

      // Parse parameters
      const parameters = this.parseParameters(paramsStr);

      // Determine visibility
      let vis: 'public' | 'private' | 'protected' = 'public';
      if (visibility) {
        const trimmed = visibility.trim();
        if (trimmed === 'private') vis = 'private';
        else if (trimmed === 'protected') vis = 'protected';
      }

      // Try to extract JSDoc description
      const description = this.extractMethodDescription(source, match.index);

      methods.push({
        name,
        signature: `${name}(${paramsStr.trim()})${returnType ? `: ${returnType.trim()}` : ''}`,
        description,
        parameters,
        returnType: returnType?.trim() || 'void',
        visibility: vis,
      });
    }

    return methods;
  }

  /**
   * Parse method parameters string into structured format
   */
  private parseParameters(paramsStr: string): ParsedMethod['parameters'] {
    if (!paramsStr.trim()) {
      return [];
    }

    const params: ParsedMethod['parameters'] = [];
    // Split by comma, but be careful about nested types
    const parts = this.splitParameters(paramsStr);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Match: name?: Type or name: Type
      const paramMatch = trimmed.match(/^(\w+)(\?)?(?:\s*:\s*(.+))?$/);
      if (paramMatch && paramMatch[1]) {
        params.push({
          name: paramMatch[1],
          type: paramMatch[3] || 'any',
          optional: !!paramMatch[2],
        });
      }
    }

    return params;
  }

  /**
   * Split parameters handling nested angle brackets and parentheses
   */
  private splitParameters(paramsStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of paramsStr) {
      if (char === '<' || char === '(' || char === '{' || char === '[') {
        depth++;
        current += char;
      } else if (char === '>' || char === ')' || char === '}' || char === ']') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Extract JSDoc description for a method
   */
  private extractMethodDescription(source: string, methodIndex: number): string | undefined {
    // Look backwards for a JSDoc comment
    const beforeMethod = source.substring(Math.max(0, methodIndex - 500), methodIndex);
    const jsdocMatch = beforeMethod.match(/\/\*\*\s*\n([^*]|\*(?!\/))*\*\/\s*$/);

    if (jsdocMatch) {
      // Extract first line of JSDoc as description
      const descMatch = jsdocMatch[0].match(/\*\s+([^@\n*]+)/);
      return descMatch && descMatch[1] ? descMatch[1].trim() : undefined;
    }

    return undefined;
  }

  /**
   * Extract interface definitions from source
   */
  private extractInterfaces(source: string): ParsedInterface[] {
    const interfaces: ParsedInterface[] = [];

    // Match interface definitions
    const interfaceRegex = /interface\s+(\w+)\s*(?:extends[^{]+)?\{([^}]+)\}/g;

    let match: RegExpExecArray | null;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const name = match[1];
      const body = match[2];
      if (!name || !body) continue;

      const properties = this.parseInterfaceProperties(body);

      interfaces.push({
        name,
        properties,
      });
    }

    return interfaces;
  }

  /**
   * Parse interface properties
   */
  private parseInterfaceProperties(body: string): Record<string, string> {
    const properties: Record<string, string> = {};

    // Match property definitions: name?: Type; or name: Type;
    const propRegex = /(\w+)\??\s*:\s*([^;]+);/g;

    let match: RegExpExecArray | null;
    while ((match = propRegex.exec(body)) !== null) {
      const propName = match[1];
      const propType = match[2];
      if (propName && propType) {
        properties[propName] = propType.trim();
      }
    }

    return properties;
  }

  // ============================================================================
  // CODE HIGHLIGHTS EXTRACTION
  // ============================================================================

  /**
   * Extract key code snippets (highlights) from source
   *
   * @param source - TypeScript source code
   * @returns Array of code highlights
   */
  extractHighlights(source: string): CodeHighlight[] {
    const highlights: CodeHighlight[] = [];
    const lines = source.split('\n');

    // Find the execute method
    const executeHighlight = this.findMethodHighlight(source, lines, 'execute');
    if (executeHighlight) {
      highlights.push(executeHighlight);
    }

    // Find metadata definition
    const metadataHighlight = this.findMetadataHighlight(source, lines);
    if (metadataHighlight) {
      highlights.push(metadataHighlight);
    }

    return highlights;
  }

  /**
   * Find a specific method and extract it as a highlight
   */
  private findMethodHighlight(source: string, lines: string[], methodName: string): CodeHighlight | null {
    // Find method start
    const methodRegex = new RegExp(`(async\\s+)?${methodName}\\s*\\(`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !methodRegex.test(line)) {
        continue;
      }

      // Find method end by tracking braces
      const startLine = i;
      let braceCount = 0;
      let foundOpen = false;
      let endLine = i;

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        if (!currentLine) continue;

        for (const char of currentLine) {
          if (char === '{') {
            braceCount++;
            foundOpen = true;
          } else if (char === '}') {
            braceCount--;
          }
        }

        if (foundOpen && braceCount === 0) {
          endLine = j;
          break;
        }
      }

      const code = lines.slice(startLine, endLine + 1).join('\n');

      return {
        name: `${methodName} method`,
        description: `The main ${methodName} implementation`,
        code,
        lineNumbers: {
          start: startLine + 1, // 1-indexed
          end: endLine + 1,
        },
      };
    }

    return null;
  }

  /**
   * Find metadata definition and extract it as a highlight
   */
  private findMetadataHighlight(source: string, lines: string[]): CodeHighlight | null {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.includes('metadata') || !line.includes('=')) {
        continue;
      }

      // Find end of metadata object
      let braceCount = 0;
      let foundOpen = false;
      let endLine = i;

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        if (!currentLine) continue;

        for (const char of currentLine) {
          if (char === '{') {
            braceCount++;
            foundOpen = true;
          } else if (char === '}') {
            braceCount--;
          }
        }

        if (foundOpen && braceCount === 0) {
          endLine = j;
          break;
        }
      }

      const code = lines.slice(i, endLine + 1).join('\n');

      return {
        name: 'metadata',
        description: 'Node metadata including ai_hints',
        code,
        lineNumbers: {
          start: i + 1,
          end: endLine + 1,
        },
      };
    }

    return null;
  }

  // ============================================================================
  // RELATED FILES DETECTION
  // ============================================================================

  /**
   * Find related test and example files for a node
   *
   * @param nodeId - The node ID to find related files for
   * @returns Related files paths or null values if not found
   */
  async findRelatedFiles(nodeId: string): Promise<RelatedFiles> {
    const sourcePath = this.resolveNodePath(nodeId);
    if (!sourcePath) {
      return { testFile: null, exampleFile: null };
    }

    const dir = dirname(sourcePath);
    const baseName = basename(sourcePath, '.ts');

    // Check for test file
    const testFileName = `${baseName}.test.ts`;
    const testPath = join(dir, testFileName);
    const hasTestFile = await this.fileExists(testPath);

    // Check for example file
    const exampleFileName = `${baseName}.example.json`;
    const examplePath = join(dir, exampleFileName);
    const hasExampleFile = await this.fileExists(examplePath);

    return {
      testFile: hasTestFile ? testPath : null,
      exampleFile: hasExampleFile ? examplePath : null,
    };
  }

  /**
   * Check if a file exists and is readable
   */
  private async fileExists(filePath: string): Promise<boolean> {
    // Security check
    if (!this.isPathSafe(filePath)) {
      return false;
    }

    try {
      await access(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read an example JSON file for a node
   *
   * @param nodeId - The node ID to read example for
   * @returns Parsed JSON example or null if not found
   */
  async readExampleFile(nodeId: string): Promise<any | null> {
    const relatedFiles = await this.findRelatedFiles(nodeId);
    if (!relatedFiles.exampleFile) {
      return null;
    }

    try {
      const content = await readFile(relatedFiles.exampleFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`[SourceExtractor] Failed to read example file for ${nodeId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // COMPLEXITY CALCULATION
  // ============================================================================

  /**
   * Calculate complexity level based on source code lines
   *
   * @param source - Source code to analyze
   * @returns Complexity level: simple (<100), medium (100-300), complex (>300)
   */
  calculateComplexity(source: string): ComplexityLevel {
    // Count non-empty, non-comment lines
    const lines = source.split('\n');
    let codeLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
        codeLines++;
      }
    }

    if (codeLines < 100) {
      return 'simple';
    } else if (codeLines <= 300) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get all available node IDs that have source files
   */
  getAllNodeIds(): string[] {
    return Object.keys(NODE_FILE_PATHS);
  }

  /**
   * Check if a node ID has a registered source file
   */
  hasSourceFile(nodeId: string): boolean {
    return nodeId in NODE_FILE_PATHS;
  }
}

// Export singleton instance getter for convenience
export function getSourceExtractor(): SourceExtractor {
  return SourceExtractor.getInstance();
}
