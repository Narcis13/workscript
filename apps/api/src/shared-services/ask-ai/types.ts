/**
 * @module ask-ai/types
 * @description Type definitions for the Ask-AI shared service.
 *
 * This module provides comprehensive TypeScript type definitions for:
 * - Chat message formats (OpenAI-compatible)
 * - Completion requests and responses
 * - AI model metadata and pricing
 * - Usage tracking and analytics
 * - Error handling with structured codes
 *
 * All types are designed to be OpenAI-compatible for easy portability
 * and follow the OpenRouter API conventions.
 *
 * @example
 * ```typescript
 * import {
 *   ChatMessage,
 *   CompletionRequest,
 *   CompletionResult,
 *   AIModel,
 *   AIServiceError
 * } from '../shared-services/ask-ai/types';
 *
 * const request: CompletionRequest = {
 *   model: 'openai/gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   pluginId: 'my-plugin'
 * };
 * ```
 */

// ============================================================================
// Chat Message Types
// ============================================================================

/**
 * Represents a single message in a chat conversation.
 * Follows OpenAI's chat completion message format for compatibility.
 *
 * @example
 * ```typescript
 * const userMessage: ChatMessage = {
 *   role: 'user',
 *   content: 'What is the capital of France?'
 * };
 *
 * const assistantMessage: ChatMessage = {
 *   role: 'assistant',
 *   content: 'The capital of France is Paris.'
 * };
 * ```
 */
export interface ChatMessage {
  /**
   * The role of the message author.
   * - 'system': System instructions that guide the model's behavior
   * - 'user': Messages from the human user
   * - 'assistant': Messages from the AI assistant (previous responses)
   */
  role: 'system' | 'user' | 'assistant';

  /**
   * The content of the message.
   * Must be a non-empty string.
   */
  content: string;
}

// ============================================================================
// Completion Request/Response Types
// ============================================================================

/**
 * Request parameters for an AI chat completion.
 * Required fields: model, messages, pluginId
 *
 * @example
 * ```typescript
 * const request: CompletionRequest = {
 *   model: 'anthropic/claude-3.5-sonnet',
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Explain quantum computing.' }
 *   ],
 *   pluginId: 'workscript-plugin',
 *   temperature: 0.7,
 *   maxTokens: 1000
 * };
 * ```
 */
export interface CompletionRequest {
  /**
   * The model ID to use for completion.
   * Format: provider/model-name (e.g., 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet')
   */
  model: string;

  /**
   * Array of chat messages representing the conversation.
   * Must contain at least one message.
   */
  messages: ChatMessage[];

  /**
   * ID of the plugin making this request.
   * Used for usage tracking and analytics.
   */
  pluginId: string;

  /**
   * Optional user ID for usage tracking and isolation.
   */
  userId?: string;

  /**
   * Optional tenant ID for multi-tenant usage tracking.
   */
  tenantId?: string;

  /**
   * Sampling temperature between 0 and 2.
   * Higher values (e.g., 0.8) make output more random.
   * Lower values (e.g., 0.2) make output more focused and deterministic.
   * @default Model's default (typically 1.0)
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate.
   * The total length of input + output tokens is limited by the model's context length.
   */
  maxTokens?: number;

  /**
   * Top-p (nucleus) sampling between 0 and 1.
   * An alternative to temperature sampling.
   * Considers results of tokens with top_p probability mass.
   */
  topP?: number;

  /**
   * Frequency penalty between -2.0 and 2.0.
   * Positive values penalize new tokens based on their existing frequency.
   */
  frequencyPenalty?: number;

  /**
   * Presence penalty between -2.0 and 2.0.
   * Positive values penalize new tokens based on whether they appear in the text so far.
   */
  presencePenalty?: number;

  /**
   * Optional system prompt to prepend as a system message.
   * Convenience alternative to adding a system message manually.
   */
  systemPrompt?: string;

  /**
   * Optional metadata to store with usage record.
   * Can include workflow ID, execution ID, or other tracking data.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a successful AI chat completion.
 *
 * @example
 * ```typescript
 * const result: CompletionResult = {
 *   id: 'chatcmpl-123abc',
 *   model: 'openai/gpt-4o',
 *   content: 'The capital of France is Paris.',
 *   finishReason: 'stop',
 *   usage: {
 *     promptTokens: 15,
 *     completionTokens: 8,
 *     totalTokens: 23,
 *     cost: 0.000345
 *   },
 *   durationMs: 1250
 * };
 * ```
 */
export interface CompletionResult {
  /**
   * Unique identifier for this completion from OpenRouter.
   */
  id: string;

  /**
   * The model that was actually used for completion.
   * May differ from requested model if fallback was used.
   */
  model: string;

  /**
   * The generated text content from the AI.
   */
  content: string;

  /**
   * Reason why the model stopped generating.
   * - 'stop': Model completed naturally
   * - 'length': Maximum tokens reached
   * - 'error': An error occurred
   */
  finishReason: 'stop' | 'length' | 'error';

  /**
   * Token usage and cost information.
   */
  usage: {
    /** Number of tokens in the prompt */
    promptTokens: number;
    /** Number of tokens in the completion */
    completionTokens: number;
    /** Total tokens used (prompt + completion) */
    totalTokens: number;
    /** Total cost in USD */
    cost: number;
  };

  /**
   * Request duration in milliseconds.
   * Measures time from request start to response completion.
   */
  durationMs: number;
}

// ============================================================================
// AI Model Types
// ============================================================================

/**
 * Pricing information for an AI model.
 * All prices are in USD per token (not per 1M tokens).
 *
 * @example
 * ```typescript
 * const pricing: ModelPricing = {
 *   prompt: 0.000003,      // $3 per 1M input tokens
 *   completion: 0.000015,  // $15 per 1M output tokens
 *   request: 0,            // No per-request cost
 *   image: 0               // No image processing cost
 * };
 * ```
 */
export interface ModelPricing {
  /**
   * Cost per input/prompt token in USD.
   */
  prompt: number;

  /**
   * Cost per output/completion token in USD.
   */
  completion: number;

  /**
   * Fixed cost per request in USD (if any).
   */
  request: number;

  /**
   * Cost per image processed in USD (for multimodal models).
   */
  image: number;
}

/**
 * Complete information about an AI model.
 *
 * @example
 * ```typescript
 * const model: AIModel = {
 *   id: 'openai/gpt-4o',
 *   name: 'GPT-4o',
 *   description: 'OpenAI GPT-4o multimodal model',
 *   contextLength: 128000,
 *   pricing: { prompt: 0.000005, completion: 0.000015, request: 0, image: 0.001 },
 *   modality: 'text+image->text',
 *   inputModalities: ['text', 'image'],
 *   outputModalities: ['text'],
 *   tokenizer: 'o200k_base',
 *   maxCompletionTokens: 16384,
 *   supportedParameters: ['temperature', 'max_tokens', 'top_p']
 * };
 * ```
 */
export interface AIModel {
  /**
   * Unique model identifier in format: provider/model-name
   * Examples: 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'
   */
  id: string;

  /**
   * Human-readable model name.
   */
  name: string;

  /**
   * Detailed description of the model's capabilities.
   */
  description: string;

  /**
   * Maximum context length in tokens.
   * Total of input + output tokens must not exceed this.
   */
  contextLength: number;

  /**
   * Pricing information for this model.
   */
  pricing: ModelPricing;

  /**
   * Model's input/output modality string.
   * Examples: 'text->text', 'text+image->text'
   */
  modality: string;

  /**
   * List of supported input modalities.
   * Examples: ['text'], ['text', 'image']
   */
  inputModalities: string[];

  /**
   * List of supported output modalities.
   * Examples: ['text'], ['text', 'image']
   */
  outputModalities: string[];

  /**
   * Tokenizer used by this model.
   * Examples: 'o200k_base', 'cl100k_base'
   */
  tokenizer: string;

  /**
   * Maximum number of tokens the model can generate.
   */
  maxCompletionTokens: number;

  /**
   * List of API parameters this model supports.
   * Examples: ['temperature', 'max_tokens', 'top_p', 'stop']
   */
  supportedParameters: string[];
}

/**
 * Filters for querying available AI models.
 *
 * @example
 * ```typescript
 * const filters: ModelFilters = {
 *   provider: 'anthropic',
 *   minContextLength: 100000,
 *   maxPrice: 0.00001
 * };
 * ```
 */
export interface ModelFilters {
  /**
   * Filter by modality string.
   * Examples: 'text->text', 'text+image->text'
   */
  modality?: string;

  /**
   * Filter by input modality type.
   * Examples: 'text', 'image'
   */
  inputModality?: string;

  /**
   * Filter by provider name (extracted from model ID).
   * Examples: 'openai', 'anthropic', 'google', 'meta'
   */
  provider?: string;

  /**
   * Minimum context length in tokens.
   */
  minContextLength?: number;

  /**
   * Maximum prompt price per token in USD.
   */
  maxPrice?: number;
}

// ============================================================================
// Usage Tracking Types
// ============================================================================

/**
 * Date range for filtering usage queries.
 *
 * @example
 * ```typescript
 * const lastWeek: DateRange = {
 *   from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
 *   to: new Date()
 * };
 * ```
 */
export interface DateRange {
  /**
   * Start date (inclusive). If omitted, no lower bound.
   */
  from?: Date;

  /**
   * End date (inclusive). If omitted, no upper bound.
   */
  to?: Date;
}

/**
 * Aggregated usage statistics.
 *
 * @example
 * ```typescript
 * const summary: UsageSummary = {
 *   totalRequests: 150,
 *   totalTokens: 450000,
 *   totalCost: 2.35,
 *   byModel: {
 *     'openai/gpt-4o': { requests: 50, tokens: 200000, cost: 1.50 },
 *     'anthropic/claude-3.5-sonnet': { requests: 100, tokens: 250000, cost: 0.85 }
 *   }
 * };
 * ```
 */
export interface UsageSummary {
  /**
   * Total number of completion requests.
   */
  totalRequests: number;

  /**
   * Total tokens consumed (prompt + completion).
   */
  totalTokens: number;

  /**
   * Total cost in USD.
   */
  totalCost: number;

  /**
   * Usage breakdown by model ID.
   */
  byModel: Record<string, {
    /** Number of requests to this model */
    requests: number;
    /** Total tokens used with this model */
    tokens: number;
    /** Total cost for this model in USD */
    cost: number;
  }>;
}

/**
 * Parameters for querying usage data.
 */
export interface UsageQueryParams {
  /**
   * Filter by plugin ID.
   */
  pluginId?: string;

  /**
   * Filter by user ID.
   */
  userId?: string;

  /**
   * Filter by tenant ID.
   */
  tenantId?: string;

  /**
   * Filter by date range.
   */
  dateRange?: DateRange;
}

/**
 * Parameters for recording a usage entry.
 * @internal Used internally by UsageTracker
 */
export interface RecordUsageParams {
  pluginId: string;
  userId?: string;
  tenantId?: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  status: 'success' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cost breakdown for a completion request.
 * @internal Used internally for cost calculation
 */
export interface CostBreakdown {
  promptCost: number;
  completionCost: number;
  totalCost: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for AI service errors.
 * Each code maps to a specific failure scenario.
 */
export type AIErrorCode =
  /** API key is missing or empty */
  | 'MISSING_API_KEY'
  /** Requested model does not exist or is inactive */
  | 'MODEL_NOT_FOUND'
  /** Request parameters are invalid */
  | 'INVALID_REQUEST'
  /** OpenRouter rate limit exceeded */
  | 'RATE_LIMITED'
  /** OpenRouter authentication failed */
  | 'AUTH_FAILED'
  /** Request timed out */
  | 'TIMEOUT'
  /** OpenRouter returned a server error */
  | 'PROVIDER_ERROR'
  /** Network connection failed */
  | 'NETWORK_ERROR'
  /** Database operation failed */
  | 'DATABASE_ERROR';

/**
 * Structured error for AI service failures.
 * Extends Error with additional context for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await askAI.complete(request);
 * } catch (error) {
 *   if (error instanceof AIServiceError) {
 *     console.error(`AI Error [${error.code}]: ${error.message}`);
 *     if (error.code === 'RATE_LIMITED') {
 *       const retryAfter = error.details?.retryAfter;
 *       // Handle rate limiting
 *     }
 *   }
 * }
 * ```
 */
export class AIServiceError extends Error {
  /**
   * Error code identifying the type of failure.
   */
  public readonly code: AIErrorCode;

  /**
   * Provider that caused the error (if applicable).
   * Examples: 'openrouter', 'openai', 'anthropic'
   */
  public readonly provider?: string;

  /**
   * Additional error details for debugging.
   * May include: retryAfter, statusCode, field name, etc.
   */
  public readonly details?: Record<string, unknown>;

  /**
   * Creates a new AIServiceError.
   *
   * @param message Human-readable error message
   * @param code Error code for programmatic handling
   * @param provider Optional provider that caused the error
   * @param details Optional additional error details
   */
  constructor(
    message: string,
    code: AIErrorCode,
    provider?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.provider = provider;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIServiceError);
    }
  }
}

// ============================================================================
// OpenRouter API Types
// ============================================================================

/**
 * Model data as returned by OpenRouter /api/v1/models endpoint.
 * @internal Used by OpenRouterClient
 */
export interface OpenRouterModel {
  /** Model ID in provider/name format */
  id: string;
  /** Human-readable name */
  name: string;
  /** Model description */
  description: string;
  /** Maximum context length */
  context_length: number;
  /** Pricing info (values as strings) */
  pricing: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  /** Model architecture info */
  architecture: {
    modality: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
  };
  /** Top provider info */
  top_provider?: {
    max_completion_tokens?: number;
  };
  /** Supported API parameters */
  supported_parameters?: string[];
}

/**
 * Request body for OpenRouter /api/v1/chat/completions endpoint.
 * @internal Used by OpenRouterClient
 */
export interface OpenRouterCompletionRequest {
  /** Model ID to use */
  model: string;
  /** Array of messages */
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  /** Optional parameters */
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * Response from OpenRouter /api/v1/chat/completions endpoint.
 * @internal Used by OpenRouterClient
 */
export interface OpenRouterCompletionResponse {
  /** Unique completion ID */
  id: string;
  /** Model used (may differ from requested) */
  model: string;
  /** Response choices array */
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'error';
  }>;
  /** Token usage information */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Response wrapper from OpenRouter /api/v1/models endpoint.
 * @internal Used by OpenRouterClient
 */
export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Error response from OpenRouter API.
 * @internal Used by OpenRouterClient for error parsing
 */
export interface OpenRouterErrorResponse {
  error: {
    code: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
}
