/**
 * Pattern Library Routes
 *
 * Endpoints for browsing, detecting, and generating workflows from common patterns.
 * These routes enable AI agents and developers to learn workflow patterns,
 * detect existing patterns in workflows, and generate new workflows from templates.
 *
 * Endpoints:
 * - GET /patterns - List all recognized workflow patterns
 * - GET /patterns/:patternId - Get complete pattern details
 * - POST /patterns/detect - Detect patterns in a workflow
 * - POST /patterns/generate - Generate workflow from pattern
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { WorkflowDefinition } from '@workscript/engine';

import { getPatternLibrary } from '../services/PatternLibrary';
import type {
  Pattern,
  PatternDetectionResponse,
  PatternGenerationResponse,
  ErrorResponse,
} from '../types/reflection.types';

// Create the patterns router
const patternsRouter = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate that required workflow fields are present for pattern detection
 */
function validateWorkflowStructure(workflow: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!workflow) {
    errors.push('Workflow definition is required');
    return { valid: false, errors };
  }

  if (typeof workflow.id !== 'string' || !workflow.id) {
    errors.push('Workflow must have a valid string id');
  }

  if (!Array.isArray(workflow.workflow)) {
    errors.push('Workflow must have a workflow array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format pattern for list response (without full template details)
 */
function formatPatternSummary(pattern: Pattern) {
  return {
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    category: pattern.category,
    complexity: pattern.complexity,
    structure: pattern.structure,
    variationCount: pattern.variations.length,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /patterns
 *
 * List all recognized workflow patterns.
 *
 * Query Parameters:
 * - category: Filter by pattern category (data-processing, control-flow, integration, error-handling)
 *
 * Response:
 * - { patterns: PatternSummary[], metadata: { totalPatterns, byCategory } }
 */
patternsRouter.get('/', async (c) => {
  try {
    const categoryFilter = c.req.query('category');

    // Get the PatternLibrary service
    const patternLibrary = getPatternLibrary();

    // Get patterns (filtered by category if specified)
    let patterns: Pattern[];
    if (categoryFilter) {
      // Validate category
      const validCategories = patternLibrary.getCategories();
      if (!validCategories.includes(categoryFilter as Pattern['category'])) {
        const errorResponse: ErrorResponse = {
          error: `Invalid category: ${categoryFilter}`,
          code: 'INVALID_CATEGORY',
          details: { validCategories },
        };
        return c.json(errorResponse, 400);
      }
      patterns = patternLibrary.getPatternsByCategory(categoryFilter as Pattern['category']);
    } else {
      patterns = patternLibrary.getAllPatterns();
    }

    // Get category breakdown
    const byCategory = patternLibrary.getPatternsByCategories();
    const categoryCounts: Record<string, number> = {};
    for (const [category, categoryPatterns] of Object.entries(byCategory)) {
      categoryCounts[category] = categoryPatterns.length;
    }

    // Format response with pattern summaries (excluding full templates)
    const patternSummaries = patterns.map(formatPatternSummary);

    return c.json({
      patterns: patternSummaries,
      metadata: {
        totalPatterns: patternLibrary.getPatternCount(),
        byCategory: categoryCounts,
        categories: patternLibrary.getCategories(),
      },
    });
  } catch (error) {
    console.error('[Reflection/Patterns] Error listing patterns:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to list patterns',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /patterns/:patternId
 *
 * Get complete details for a specific pattern.
 *
 * Path Parameters:
 * - patternId: The pattern ID to retrieve
 *
 * Response:
 * - Complete Pattern object including full template
 * - 404 if pattern not found
 */
patternsRouter.get('/:patternId', async (c) => {
  try {
    const patternId = c.req.param('patternId');

    // Get the PatternLibrary service
    const patternLibrary = getPatternLibrary();

    // Get the pattern
    const pattern = patternLibrary.getPattern(patternId);

    if (!pattern) {
      const errorResponse: ErrorResponse = {
        error: `Pattern not found: ${patternId}`,
        code: 'NOT_FOUND',
        details: { availablePatterns: patternLibrary.getPatternSummaries().map(p => p.id) },
      };
      return c.json(errorResponse, 404);
    }

    // Return complete pattern including template
    return c.json({
      ...pattern,
      // Add helpful metadata
      requiredParameters: getRequiredParameters(pattern),
      usageHints: getUsageHints(pattern),
    });
  } catch (error) {
    console.error('[Reflection/Patterns] Error getting pattern:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get pattern',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * POST /patterns/detect
 *
 * Detect patterns in a workflow.
 *
 * Request Body:
 * - Complete workflow definition JSON
 *
 * Response:
 * - PatternDetectionResponse with detectedPatterns and suggestions
 * - 400 if workflow JSON is invalid
 */
patternsRouter.post('/detect', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);

    if (!body) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
      };
      return c.json(errorResponse, 400);
    }

    // Validate workflow structure
    const validation = validateWorkflowStructure(body);
    if (!validation.valid) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid workflow structure',
        code: 'INVALID_WORKFLOW',
        details: { errors: validation.errors },
      };
      return c.json(errorResponse, 400);
    }

    const workflow = body as WorkflowDefinition;

    // Get the PatternLibrary service
    const patternLibrary = getPatternLibrary();

    // Detect patterns
    const result: PatternDetectionResponse = patternLibrary.detectPatterns(workflow);

    // Enhance response with pattern names
    const enhancedDetectedPatterns = result.detectedPatterns.map(detected => {
      const pattern = patternLibrary.getPattern(detected.patternId);
      return {
        ...detected,
        patternName: pattern?.name || detected.patternId,
        patternDescription: pattern?.description || '',
      };
    });

    const enhancedSuggestions = result.suggestions.map(suggestion => {
      const pattern = patternLibrary.getPattern(suggestion.patternId);
      return {
        ...suggestion,
        patternName: pattern?.name || suggestion.patternId,
      };
    });

    return c.json({
      detectedPatterns: enhancedDetectedPatterns,
      suggestions: enhancedSuggestions,
      summary: generateDetectionSummary(enhancedDetectedPatterns, enhancedSuggestions),
    });
  } catch (error) {
    console.error('[Reflection/Patterns] Error detecting patterns:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to detect patterns',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * POST /patterns/generate
 *
 * Generate a workflow from a pattern template.
 *
 * Request Body:
 * - patternId: The pattern to generate from
 * - parameters: Object with parameter values to substitute
 *
 * Response:
 * - PatternGenerationResponse with workflow and explanation
 * - 400 if missing parameters
 * - 404 if pattern not found
 */
patternsRouter.post('/generate', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);

    if (!body) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
      };
      return c.json(errorResponse, 400);
    }

    // Validate request body structure
    if (!body.patternId || typeof body.patternId !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'patternId is required and must be a string',
        code: 'INVALID_REQUEST',
      };
      return c.json(errorResponse, 400);
    }

    if (!body.parameters || typeof body.parameters !== 'object') {
      const errorResponse: ErrorResponse = {
        error: 'parameters is required and must be an object',
        code: 'INVALID_REQUEST',
      };
      return c.json(errorResponse, 400);
    }

    const { patternId, parameters } = body;

    // Get the PatternLibrary service
    const patternLibrary = getPatternLibrary();

    // Check if pattern exists
    if (!patternLibrary.hasPattern(patternId)) {
      const errorResponse: ErrorResponse = {
        error: `Pattern not found: ${patternId}`,
        code: 'NOT_FOUND',
        details: { availablePatterns: patternLibrary.getPatternSummaries().map(p => p.id) },
      };
      return c.json(errorResponse, 404);
    }

    // Generate workflow from pattern
    try {
      const result: PatternGenerationResponse = patternLibrary.generateFromPattern(patternId, parameters);

      // Get pattern metadata
      const pattern = patternLibrary.getPattern(patternId);

      return c.json({
        ...result,
        patternId,
        patternName: pattern?.name || patternId,
        appliedParameters: parameters,
      });
    } catch (genError) {
      // Handle missing parameters error
      if (genError instanceof Error && genError.message.includes('Missing required parameters')) {
        const errorResponse: ErrorResponse = {
          error: genError.message,
          code: 'MISSING_PARAMETERS',
          details: {
            requiredParameters: getRequiredParameters(patternLibrary.getPattern(patternId)!),
            providedParameters: Object.keys(parameters),
          },
        };
        return c.json(errorResponse, 400);
      }
      throw genError;
    }
  } catch (error) {
    console.error('[Reflection/Patterns] Error generating workflow:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to generate workflow',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract required parameters from a pattern template
 */
function getRequiredParameters(pattern: Pattern): string[] {
  const params: string[] = [];
  const templateStr = JSON.stringify(pattern.template);

  // Find all {{param}} placeholders
  const matches = templateStr.match(/\{\{(\w+)\}\}/g);
  if (matches) {
    for (const match of matches) {
      const param = match.replace(/\{\{|\}\}/g, '');
      if (!params.includes(param)) {
        params.push(param);
      }
    }
  }

  return params;
}

/**
 * Generate usage hints for a pattern
 */
function getUsageHints(pattern: Pattern): string[] {
  const hints: string[] = [];

  switch (pattern.id) {
    case 'etl-pipeline':
      hints.push('Use sourceTable and targetTable parameters to specify database tables');
      hints.push('filterConditions should be a valid query object for the database node');
      hints.push('transformations should be an array of field mappings');
      break;
    case 'conditional-branching':
      hints.push('operation should be a logic operation like "equal", "greater", "less"');
      hints.push('conditionValue is read from state, compareValue is the comparison target');
      break;
    case 'loop-with-counter':
      hints.push('maxIterations controls how many times the loop executes');
      hints.push('items can be an array to process in the loop body');
      break;
    case 'ai-processing-pipeline':
      hints.push('promptTemplate should include {{$.inputData}} reference to process input');
      hints.push('extractionPath specifies the JSON path to extract from AI response');
      hints.push('aiModel specifies which AI model to use (e.g., "gpt-4")');
      break;
    case 'error-handling':
      hints.push('The error? edge captures any errors from the operation');
      hints.push('lastError and errorCount are tracked in state');
      break;
    case 'parallel-processing':
      hints.push('items should be an array to split and process');
      hints.push('transformations define how each item is processed');
      break;
    default:
      hints.push(`See the pattern template for ${pattern.name} usage`);
  }

  return hints;
}

/**
 * Generate a summary of pattern detection results
 */
function generateDetectionSummary(
  detectedPatterns: Array<{ patternId: string; patternName: string; confidence: number }>,
  suggestions: Array<{ patternId: string; patternName: string; reason: string }>
): string {
  const parts: string[] = [];

  if (detectedPatterns.length === 0) {
    parts.push('No standard patterns were detected in this workflow.');
  } else {
    parts.push(`Detected ${detectedPatterns.length} pattern(s):`);
    for (const pattern of detectedPatterns) {
      const confidencePercent = Math.round(pattern.confidence * 100);
      parts.push(`  - ${pattern.patternName} (${confidencePercent}% confidence)`);
    }
  }

  if (suggestions.length > 0) {
    parts.push('');
    parts.push('Suggestions for improvement:');
    for (const suggestion of suggestions) {
      parts.push(`  - Consider using ${suggestion.patternName}: ${suggestion.reason}`);
    }
  }

  return parts.join('\n');
}

export default patternsRouter;
