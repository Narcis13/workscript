/**
 * Source Code Extraction Routes
 *
 * Endpoints for extracting and viewing node source code with parsed structure.
 * This enables AI agents to understand implementation details.
 *
 * SECURITY: Source extraction is strictly limited to packages/nodes/src/ directory.
 *
 * Endpoints:
 * - GET /source/:nodeId - Get structured source with parsed info
 * - GET /source/:nodeId/raw - Get raw TypeScript source
 */

import { Hono } from 'hono';
import {
  SourceExtractor,
  getSourceExtractor,
} from '../services/SourceExtractor';
import type {
  SourceCodeResponse,
  ErrorResponse,
} from '../types/reflection.types';

// Create the source router
const sourceRouter = new Hono();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /source/:nodeId
 *
 * Get full source code for a node with parsed structure.
 *
 * Path Parameters:
 * - nodeId: The node ID to get source for
 *
 * Response:
 * - language: 'typescript'
 * - content: Full source code
 * - path: File location
 * - structure: Parsed class, methods, interfaces
 * - highlights: Key code snippets (execute method, metadata)
 * - relatedFiles: Test and example file paths
 * - 404 if node not found
 * - 500 if source file cannot be read
 */
sourceRouter.get('/:nodeId', async (c) => {
  try {
    const nodeId = c.req.param('nodeId');
    const sourceExtractor = getSourceExtractor();

    // Check if node has a registered source file
    if (!sourceExtractor.hasSourceFile(nodeId)) {
      const errorResponse: ErrorResponse = {
        error: `Node not found: ${nodeId}`,
        code: 'NODE_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Resolve the file path
    const filePath = sourceExtractor.resolveNodePath(nodeId);
    if (!filePath) {
      const errorResponse: ErrorResponse = {
        error: `Node not found: ${nodeId}`,
        code: 'NODE_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Get cached source with structure
    const cachedSource = await sourceExtractor.getSourceWithCache(nodeId);
    if (!cachedSource) {
      const errorResponse: ErrorResponse = {
        error: 'Failed to read source file',
        code: 'SOURCE_READ_ERROR',
        details: { nodeId, path: filePath },
      };
      return c.json(errorResponse, 500);
    }

    // Get related files (test, example)
    const relatedFiles = await sourceExtractor.findRelatedFiles(nodeId);

    // Build the response
    const response: SourceCodeResponse = {
      language: 'typescript',
      content: cachedSource.content,
      path: filePath,
      structure: cachedSource.structure,
      highlights: cachedSource.highlights,
      relatedFiles,
    };

    return c.json(response);
  } catch (error) {
    console.error('[Reflection/Source] Error getting source:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get source code',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /source/:nodeId/raw
 *
 * Get raw TypeScript source code as plain text.
 *
 * Path Parameters:
 * - nodeId: The node ID to get raw source for
 *
 * Response:
 * - Content-Type: text/plain
 * - Raw source file contents
 * - 404 if node not found (plain text error)
 * - 500 if source file cannot be read (plain text error)
 */
sourceRouter.get('/:nodeId/raw', async (c) => {
  try {
    const nodeId = c.req.param('nodeId');
    const sourceExtractor = getSourceExtractor();

    // Check if node has a registered source file
    if (!sourceExtractor.hasSourceFile(nodeId)) {
      c.header('Content-Type', 'text/plain');
      return c.text(`Error: Node not found: ${nodeId}`, 404);
    }

    // Read the raw source
    const source = await sourceExtractor.readNodeSource(nodeId);
    if (!source) {
      c.header('Content-Type', 'text/plain');
      return c.text(`Error: Failed to read source file for node: ${nodeId}`, 500);
    }

    // Return raw source as plain text
    c.header('Content-Type', 'text/plain');
    return c.text(source);
  } catch (error) {
    console.error('[Reflection/Source] Error getting raw source:', error);
    c.header('Content-Type', 'text/plain');
    return c.text(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});

export default sourceRouter;
