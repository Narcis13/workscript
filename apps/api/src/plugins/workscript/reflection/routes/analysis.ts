/**
 * Workflow Analysis Routes
 *
 * Endpoints for analyzing, validating, and optimizing workflow definitions.
 * These routes enable AI agents and developers to understand workflow behavior,
 * detect issues, and receive optimization suggestions.
 *
 * Endpoints:
 * - POST /analysis/explain - Get detailed workflow explanation
 * - POST /analysis/validate-deep - Perform semantic validation
 * - POST /analysis/optimize - Get optimization suggestions
 * - GET /analysis/:workflowId - Analyze stored workflow (auth required)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import type { WorkflowDefinition } from '@workscript/engine';

import { db } from '../../../../db';
import { workflows } from '../../schema/workscript.schema';
import { getWorkflowAnalyzer } from '../services/WorkflowAnalyzer';
import { authenticate } from '../../../../shared-services/auth/middleware';
import type { AuthContext } from '../../../../shared-services/auth/types';
import type {
  WorkflowAnalysis,
  SemanticValidation,
  OptimizationSuggestion,
  ErrorResponse,
} from '../types/reflection.types';

// Create the analysis router
const analysisRouter = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate workflow from request body
 */
async function parseWorkflowFromBody(c: Context): Promise<WorkflowDefinition | null> {
  try {
    const body = await c.req.json();

    // Check for required workflow fields
    if (!body.id || !body.workflow) {
      return null;
    }

    // Ensure workflow is an array
    if (!Array.isArray(body.workflow)) {
      return null;
    }

    return body as WorkflowDefinition;
  } catch {
    return null;
  }
}

/**
 * Validate that required workflow fields are present
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

  if (typeof workflow.name !== 'string') {
    // Name is recommended but not strictly required
  }

  if (typeof workflow.version !== 'string') {
    // Version is recommended but not strictly required
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /analysis/explain
 *
 * Get a detailed explanation of what a workflow does.
 *
 * Request Body:
 * - Complete workflow definition JSON
 *
 * Response:
 * - WorkflowAnalysis with summary, steps, stateFlow, dataTransformations,
 *   potentialIssues, and complexity metrics
 * - 400 if workflow JSON is invalid
 */
analysisRouter.post('/explain', async (c) => {
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

    // Get the WorkflowAnalyzer service
    const analyzer = getWorkflowAnalyzer();

    // Perform complete analysis
    const analysis: WorkflowAnalysis = await analyzer.analyzeWorkflow(workflow);

    return c.json(analysis);
  } catch (error) {
    console.error('[Reflection/Analysis] Error explaining workflow:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to analyze workflow',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * POST /analysis/validate-deep
 *
 * Perform semantic validation beyond JSON schema checks.
 * Identifies state consistency issues, unreachable code, and logical errors.
 *
 * Request Body:
 * - Complete workflow definition JSON
 *
 * Response:
 * - SemanticValidation with valid boolean, schemaErrors, semanticIssues,
 *   and stateConsistency analysis
 * - 400 if workflow JSON is invalid
 */
analysisRouter.post('/validate-deep', async (c) => {
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

    // Get the WorkflowAnalyzer service
    const analyzer = getWorkflowAnalyzer();

    // Perform semantic validation
    const result: SemanticValidation = await analyzer.validateSemantics(workflow);

    return c.json(result);
  } catch (error) {
    console.error('[Reflection/Analysis] Error validating workflow:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to validate workflow',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * POST /analysis/optimize
 *
 * Get optimization suggestions for a workflow.
 * Identifies patterns that could be improved for performance or maintainability.
 *
 * Request Body:
 * - Complete workflow definition JSON
 *
 * Response:
 * - { suggestions: OptimizationSuggestion[] }
 * - 400 if workflow JSON is invalid
 */
analysisRouter.post('/optimize', async (c) => {
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

    // Get the WorkflowAnalyzer service
    const analyzer = getWorkflowAnalyzer();

    // Detect optimizations
    const suggestions: OptimizationSuggestion[] = await analyzer.detectOptimizations(workflow);

    return c.json({ suggestions });
  } catch (error) {
    console.error('[Reflection/Analysis] Error optimizing workflow:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to generate optimization suggestions',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /analysis/:workflowId
 *
 * Analyze a workflow stored in the database.
 * Requires authentication - user must have access to the workflow.
 *
 * Path Parameters:
 * - workflowId: The ID of the workflow to analyze
 *
 * Response:
 * - WorkflowAnalysis for the stored workflow
 * - 401 if not authenticated
 * - 403 if user lacks permission
 * - 404 if workflow not found
 */
analysisRouter.get('/:workflowId', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const workflowId = c.req.param('workflowId');
    const user = c.get('user');

    if (!user) {
      const errorResponse: ErrorResponse = {
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      };
      return c.json(errorResponse, 401);
    }

    // Query the workflow from database
    const [storedWorkflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!storedWorkflow) {
      const errorResponse: ErrorResponse = {
        error: `Workflow not found: ${workflowId}`,
        code: 'NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Note: In a production system, you would check if the user has access to this workflow
    // For now, we allow access to any authenticated user
    // TODO: Add proper workflow ownership/permission checking when user-workflow relationship exists

    // Parse the workflow definition from JSON
    const workflowDefinition = storedWorkflow.definition as WorkflowDefinition;

    // Validate that we have a valid workflow structure
    if (!workflowDefinition || !Array.isArray(workflowDefinition.workflow)) {
      const errorResponse: ErrorResponse = {
        error: 'Stored workflow has invalid structure',
        code: 'INVALID_WORKFLOW',
      };
      return c.json(errorResponse, 500);
    }

    // Ensure the workflow has required fields
    const workflow: WorkflowDefinition = {
      id: workflowDefinition.id || storedWorkflow.id,
      name: workflowDefinition.name || storedWorkflow.name,
      version: workflowDefinition.version || storedWorkflow.version,
      initialState: workflowDefinition.initialState || {},
      workflow: workflowDefinition.workflow,
    };

    // Get the WorkflowAnalyzer service
    const analyzer = getWorkflowAnalyzer();

    // Perform complete analysis
    const analysis: WorkflowAnalysis = await analyzer.analyzeWorkflow(workflow);

    // Include workflow metadata in response
    return c.json({
      workflowId: storedWorkflow.id,
      workflowName: storedWorkflow.name,
      workflowVersion: storedWorkflow.version,
      analysis,
    });
  } catch (error) {
    console.error('[Reflection/Analysis] Error analyzing stored workflow:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to analyze workflow',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

export default analysisRouter;
