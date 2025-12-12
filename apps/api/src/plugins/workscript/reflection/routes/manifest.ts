/**
 * Manifest Reflection Routes
 *
 * AI manifest generation endpoints that create optimized system prompts
 * and documentation for workflow-building AI agents.
 *
 * Endpoints:
 * - GET /manifest - Get full AI manifest with complete documentation
 * - GET /manifest/compact - Get compressed manifest for smaller context windows
 * - POST /manifest/custom - Generate filtered manifest for specific use cases
 */

import { Hono } from 'hono';
import { getManifestGenerator } from '../services/ManifestGenerator';
import type {
  AIManifest,
  CompactManifest,
  CustomManifestOptions,
  NodeCategory,
  ErrorResponse,
} from '../types/reflection.types';

// Create the manifest router
const manifestRouter = new Hono();

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Valid use cases for custom manifest generation
 */
const VALID_USE_CASES = ['data-pipeline', 'ai-workflow', 'integration', 'full'] as const;

/**
 * Valid categories for filtering
 */
const VALID_CATEGORIES: NodeCategory[] = [
  'core',
  'ai',
  'orchestration',
  'data-manipulation',
  'server',
  'integrations',
];

/**
 * Valid output formats
 */
const VALID_FORMATS = ['markdown', 'json', 'structured'] as const;

/**
 * Validate custom manifest options
 */
function validateCustomOptions(body: any): { valid: boolean; errors: string[]; options: CustomManifestOptions } {
  const errors: string[] = [];
  const options: CustomManifestOptions = {};

  // Validate useCase
  if (body.useCase !== undefined) {
    if (!VALID_USE_CASES.includes(body.useCase)) {
      errors.push(`Invalid useCase: ${body.useCase}. Valid options: ${VALID_USE_CASES.join(', ')}`);
    } else {
      options.useCase = body.useCase;
    }
  }

  // Validate includeCategories
  if (body.includeCategories !== undefined) {
    if (!Array.isArray(body.includeCategories)) {
      errors.push('includeCategories must be an array');
    } else {
      const invalidCategories = body.includeCategories.filter(
        (cat: string) => !VALID_CATEGORIES.includes(cat as NodeCategory)
      );
      if (invalidCategories.length > 0) {
        errors.push(`Invalid categories: ${invalidCategories.join(', ')}. Valid options: ${VALID_CATEGORIES.join(', ')}`);
      } else {
        options.includeCategories = body.includeCategories;
      }
    }
  }

  // Validate excludeNodes
  if (body.excludeNodes !== undefined) {
    if (!Array.isArray(body.excludeNodes)) {
      errors.push('excludeNodes must be an array of node IDs');
    } else if (!body.excludeNodes.every((n: any) => typeof n === 'string')) {
      errors.push('excludeNodes must contain only strings');
    } else {
      options.excludeNodes = body.excludeNodes;
    }
  }

  // Validate maxTokens
  if (body.maxTokens !== undefined) {
    if (typeof body.maxTokens !== 'number' || body.maxTokens < 100) {
      errors.push('maxTokens must be a number >= 100');
    } else if (body.maxTokens > 100000) {
      errors.push('maxTokens must be <= 100000');
    } else {
      options.maxTokens = body.maxTokens;
    }
  }

  // Validate format
  if (body.format !== undefined) {
    if (!VALID_FORMATS.includes(body.format)) {
      errors.push(`Invalid format: ${body.format}. Valid options: ${VALID_FORMATS.join(', ')}`);
    } else {
      options.format = body.format;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    options,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /manifest
 *
 * Generate a complete AI manifest with full documentation.
 *
 * Response includes:
 * - systemPrompt: Ready-to-use prompt for AI agents
 * - quickReference: Markdown formatted quick reference card
 * - capabilities: Nodes organized by category with descriptions
 * - syntaxReference: Complete syntax documentation
 * - tokenCount: Estimated token count for context planning
 * - optimizedFor: Target AI model (default: "claude-3")
 */
manifestRouter.get('/', async (c) => {
  try {
    const generator = getManifestGenerator();
    const manifest = await generator.generateFullManifest();

    return c.json(manifest);
  } catch (error) {
    console.error('[Reflection/Manifest] Error generating full manifest:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to generate manifest',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /manifest/compact
 *
 * Generate a compressed manifest for smaller context windows.
 * Target: ~5000 tokens or less.
 *
 * Response includes:
 * - systemPrompt: Shorter, essential-focused prompt
 * - nodeList: Array of { id, description } for all nodes
 * - syntaxReference: Complete syntax documentation
 * - tokenCount: Estimated token count
 * - optimizedFor: Target AI model
 */
manifestRouter.get('/compact', async (c) => {
  try {
    const generator = getManifestGenerator();
    const manifest = await generator.generateCompactManifest();

    return c.json(manifest);
  } catch (error) {
    console.error('[Reflection/Manifest] Error generating compact manifest:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to generate compact manifest',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * POST /manifest/custom
 *
 * Generate a filtered manifest for specific use cases.
 *
 * Request body options:
 * - useCase: 'data-pipeline' | 'ai-workflow' | 'integration' | 'full'
 *   - data-pipeline: Prioritizes data-manipulation, core, server nodes
 *   - ai-workflow: Prioritizes ai, orchestration, data-manipulation nodes
 *   - integration: Prioritizes integrations, server, data-manipulation nodes
 *   - full: Includes all nodes (default)
 *
 * - includeCategories: NodeCategory[] - Only include specific categories
 * - excludeNodes: string[] - Exclude specific node IDs
 * - maxTokens: number - Maximum token limit (will truncate if exceeded)
 * - format: 'markdown' | 'json' | 'structured'
 *   - markdown: Quick reference focused, markdown formatted
 *   - json: Standard JSON response (default)
 *   - structured: Detailed structured data
 *
 * Response:
 * - AIManifest or CompactManifest depending on maxTokens and content size
 */
manifestRouter.post('/custom', async (c) => {
  try {
    // Parse request body
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    // Validate options
    const validation = validateCustomOptions(body);
    if (!validation.valid) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid request options',
        code: 'VALIDATION_ERROR',
        details: { errors: validation.errors },
      };
      return c.json(errorResponse, 400);
    }

    // Generate custom manifest
    const generator = getManifestGenerator();
    const manifest = await generator.generateCustomManifest(validation.options);

    return c.json(manifest);
  } catch (error) {
    console.error('[Reflection/Manifest] Error generating custom manifest:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to generate custom manifest',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /manifest/syntax
 *
 * Get just the syntax reference documentation.
 * Useful for AI agents that already know the nodes but need syntax help.
 */
manifestRouter.get('/syntax', async (c) => {
  try {
    const generator = getManifestGenerator();
    const manifest = await generator.generateFullManifest();

    return c.json({
      syntaxReference: manifest.syntaxReference,
      tokenCount: generator.estimateTokens(JSON.stringify(manifest.syntaxReference)),
    });
  } catch (error) {
    console.error('[Reflection/Manifest] Error getting syntax reference:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get syntax reference',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /manifest/categories
 *
 * Get capabilities organized by category.
 * Useful for browsing available functionality.
 */
manifestRouter.get('/categories', async (c) => {
  try {
    const generator = getManifestGenerator();
    const manifest = await generator.generateFullManifest();

    return c.json({
      capabilities: manifest.capabilities,
      tokenCount: generator.estimateTokens(JSON.stringify(manifest.capabilities)),
    });
  } catch (error) {
    console.error('[Reflection/Manifest] Error getting categories:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get categories',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * DELETE /manifest/cache
 *
 * Clear the manifest cache.
 * Useful after node changes or for testing.
 */
manifestRouter.delete('/cache', async (c) => {
  try {
    const generator = getManifestGenerator();
    generator.clearCache();

    return c.json({
      success: true,
      message: 'Manifest cache cleared successfully',
    });
  } catch (error) {
    console.error('[Reflection/Manifest] Error clearing cache:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to clear cache',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

export default manifestRouter;
