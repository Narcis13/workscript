/**
 * AI Completion Routes
 *
 * REST API endpoints for AI completions, model discovery, and usage tracking.
 * Wraps the Ask-AI shared service for use by future nodes and external consumers.
 *
 * **Endpoints:**
 * POST   /ai/complete         - Send a completion request to an AI model
 * GET    /ai/models           - List available AI models
 * GET    /ai/models/:modelId  - Get specific model details
 * GET    /ai/usage            - Get usage statistics
 * POST   /ai/sync-models      - Manually trigger model sync
 *
 * @module routes/ai
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../shared-services/auth/middleware';
import type { AuthContext } from '../shared-services/auth/types';
import {
  AskAIService,
  type CompletionRequest,
  type ModelFilters,
  type UsageQueryParams,
  AIServiceError,
} from '../shared-services/ask-ai';

// Initialize AskAI service
const askAIService = AskAIService.getInstance();

// Create AI router
const aiRoutes = new Hono<{ Variables: AuthContext }>();

/**
 * POST /ai/complete
 *
 * Send a chat completion request to an AI model.
 *
 * Requires authentication (JWT or API Key).
 *
 * **Request:**
 * ```json
 * {
 *   "model": "openai/gpt-4o",
 *   "messages": [
 *     { "role": "system", "content": "You are a helpful assistant." },
 *     { "role": "user", "content": "What is TypeScript?" }
 *   ],
 *   "temperature": 0.7,
 *   "maxTokens": 1000,
 *   "systemPrompt": "Optional system prompt",
 *   "metadata": { "workflowId": "optional-workflow-id" }
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "chatcmpl-123",
 *     "model": "openai/gpt-4o",
 *     "content": "TypeScript is a typed superset of JavaScript...",
 *     "finishReason": "stop",
 *     "usage": {
 *       "promptTokens": 25,
 *       "completionTokens": 150,
 *       "totalTokens": 175,
 *       "cost": 0.00035
 *     },
 *     "durationMs": 1250
 *   }
 * }
 * ```
 *
 * **Errors:**
 * - 400: Invalid request (missing model, messages, etc.)
 * - 401: Not authenticated
 * - 404: Model not found
 * - 429: Rate limited
 * - 500: Provider error
 *
 * @route POST /ai/complete
 */
aiRoutes.post('/complete', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    // Build completion request
    const request: CompletionRequest = {
      model: body.model,
      messages: body.messages,
      pluginId: body.pluginId || 'api-route', // Default plugin ID if not specified
      userId: user?.id,
      tenantId: user?.tenantId,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      topP: body.topP,
      frequencyPenalty: body.frequencyPenalty,
      presencePenalty: body.presencePenalty,
      systemPrompt: body.systemPrompt,
      metadata: body.metadata,
    };

    // Send completion request
    const result = await askAIService.complete(request);

    return c.json(
      {
        success: true,
        data: result,
      },
      200
    );
  } catch (error: any) {
    console.error('[AI Routes] Completion error:', error);

    // Handle AIServiceError with appropriate status codes
    if (error instanceof AIServiceError) {
      let statusCode = 500;
      switch (error.code) {
        case 'INVALID_REQUEST':
          statusCode = 400;
          break;
        case 'MODEL_NOT_FOUND':
          statusCode = 404;
          break;
        case 'RATE_LIMITED':
          statusCode = 429;
          break;
        case 'AUTH_FAILED':
        case 'MISSING_API_KEY':
          statusCode = 401;
          break;
        case 'TIMEOUT':
          statusCode = 504;
          break;
        default:
          statusCode = 500;
      }

      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        statusCode
      );
    }

    return c.json(
      {
        success: false,
        error: error.message || 'Completion failed',
      },
      500
    );
  }
});

/**
 * GET /ai/models
 *
 * List available AI models with optional filtering.
 *
 * Requires authentication (JWT or API Key).
 *
 * **Query Parameters:**
 * - provider: Filter by provider (e.g., 'openai', 'anthropic')
 * - modality: Filter by modality (e.g., 'text->text', 'text+image->text')
 * - inputModality: Filter by input modality (e.g., 'text', 'image')
 * - minContextLength: Minimum context length in tokens
 * - maxPrice: Maximum price per prompt token in USD
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "openai/gpt-4o",
 *       "name": "GPT-4o",
 *       "description": "...",
 *       "contextLength": 128000,
 *       "pricing": { "prompt": 0.000005, "completion": 0.000015 },
 *       "modality": "text+image->text",
 *       "inputModalities": ["text", "image"],
 *       "outputModalities": ["text"]
 *     }
 *   ],
 *   "count": 150
 * }
 * ```
 *
 * @route GET /ai/models
 */
aiRoutes.get('/models', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    // Parse query parameters
    const query = c.req.query();
    const filters: ModelFilters = {};

    if (query.provider) {
      filters.provider = query.provider;
    }
    if (query.modality) {
      filters.modality = query.modality;
    }
    if (query.inputModality) {
      filters.inputModality = query.inputModality;
    }
    if (query.minContextLength) {
      filters.minContextLength = parseInt(query.minContextLength, 10);
    }
    if (query.maxPrice) {
      filters.maxPrice = parseFloat(query.maxPrice);
    }

    // Get models with filters
    const models = await askAIService.listModels(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return c.json(
      {
        success: true,
        data: models,
        count: models.length,
      },
      200
    );
  } catch (error: any) {
    console.error('[AI Routes] List models error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Failed to list models',
      },
      500
    );
  }
});

/**
 * GET /ai/models/:modelId
 *
 * Get details for a specific AI model.
 *
 * Requires authentication (JWT or API Key).
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "anthropic/claude-3.5-sonnet",
 *     "name": "Claude 3.5 Sonnet",
 *     "description": "...",
 *     "contextLength": 200000,
 *     "pricing": { "prompt": 0.000003, "completion": 0.000015 },
 *     "modality": "text+image->text",
 *     "inputModalities": ["text", "image"],
 *     "outputModalities": ["text"],
 *     "tokenizer": "cl100k_base",
 *     "maxCompletionTokens": 8192,
 *     "supportedParameters": ["temperature", "max_tokens", "top_p"]
 *   }
 * }
 * ```
 *
 * **Errors:**
 * - 404: Model not found
 *
 * @route GET /ai/models/:modelId
 */
aiRoutes.get('/models/:modelId{.+}', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    // Model ID can contain slashes (e.g., 'openai/gpt-4o')
    const modelId = c.req.param('modelId');

    if (!modelId) {
      return c.json(
        {
          success: false,
          error: 'Model ID is required',
        },
        400
      );
    }

    const model = await askAIService.getModel(modelId);

    if (!model) {
      return c.json(
        {
          success: false,
          error: `Model '${modelId}' not found`,
        },
        404
      );
    }

    return c.json(
      {
        success: true,
        data: model,
      },
      200
    );
  } catch (error: any) {
    console.error('[AI Routes] Get model error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Failed to get model',
      },
      500
    );
  }
});

/**
 * GET /ai/usage
 *
 * Get usage statistics for AI completions.
 *
 * Requires authentication (JWT or API Key).
 *
 * **Query Parameters:**
 * - pluginId: Filter by plugin ID
 * - userId: Filter by user ID
 * - tenantId: Filter by tenant ID
 * - fromDate: Start date (ISO 8601 format)
 * - toDate: End date (ISO 8601 format)
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "totalRequests": 150,
 *     "totalTokens": 450000,
 *     "totalCost": 2.35,
 *     "byModel": {
 *       "openai/gpt-4o": { "requests": 50, "tokens": 200000, "cost": 1.50 },
 *       "anthropic/claude-3.5-sonnet": { "requests": 100, "tokens": 250000, "cost": 0.85 }
 *     }
 *   }
 * }
 * ```
 *
 * @route GET /ai/usage
 */
aiRoutes.get('/usage', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get('user');
    const query = c.req.query();

    // Build usage query params
    const params: UsageQueryParams = {};

    // If user is not admin, only allow querying their own usage
    if (user?.role !== 'admin') {
      params.userId = user?.id;
    } else {
      // Admins can filter by any criteria
      if (query.pluginId) {
        params.pluginId = query.pluginId;
      }
      if (query.userId) {
        params.userId = query.userId;
      }
      if (query.tenantId) {
        params.tenantId = query.tenantId;
      }
    }

    // Parse date range
    if (query.fromDate || query.toDate) {
      params.dateRange = {};
      if (query.fromDate) {
        params.dateRange.from = new Date(query.fromDate);
      }
      if (query.toDate) {
        params.dateRange.to = new Date(query.toDate);
      }
    }

    // Get usage statistics
    const usage = await askAIService.getUsage(params);

    return c.json(
      {
        success: true,
        data: usage,
      },
      200
    );
  } catch (error: any) {
    console.error('[AI Routes] Get usage error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Failed to get usage',
      },
      500
    );
  }
});

/**
 * POST /ai/sync-models
 *
 * Manually trigger synchronization of AI models from OpenRouter.
 *
 * Requires authentication (JWT or API Key) with admin role.
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Model sync triggered successfully"
 * }
 * ```
 *
 * **Errors:**
 * - 403: Forbidden (not admin)
 * - 500: Sync failed
 *
 * @route POST /ai/sync-models
 */
aiRoutes.post('/sync-models', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const user = c.get('user');

    // Only admins can trigger model sync
    if (user?.role !== 'admin') {
      return c.json(
        {
          success: false,
          error: 'Admin access required',
        },
        403
      );
    }

    // Trigger model sync
    await askAIService.syncModels();

    return c.json(
      {
        success: true,
        message: 'Model sync triggered successfully',
      },
      200
    );
  } catch (error: any) {
    console.error('[AI Routes] Sync models error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Model sync failed',
      },
      500
    );
  }
});

export default aiRoutes;
