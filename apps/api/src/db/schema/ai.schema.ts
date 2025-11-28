/**
 * AI Models and Usage Database Schema
 *
 * This schema provides database persistence for the Ask-AI shared service:
 * - AI model catalog with pricing and capabilities (cached from OpenRouter)
 * - Usage tracking for billing, analytics, and quota management
 *
 * The Ask-AI service wraps OpenRouter APIs to provide workscript plugins with
 * unified access to 300+ AI models from multiple providers (OpenAI, Anthropic,
 * Google, Meta, Mistral, etc.) through a single, consistent interface.
 *
 * **Key Features:**
 * - Model caching: 24-hour database cache with 1-hour memory cache
 * - Usage tracking: Full token and cost tracking per plugin/user/tenant
 * - Cost calculation: Automatic cost calculation using real-time model pricing
 * - Analytics: Aggregated usage queries by plugin, user, tenant, and time range
 *
 * @module ai.schema
 * @see {@link https://openrouter.ai/docs} OpenRouter API documentation
 * @example
 * import { db } from '../index';
 * import { aiModels, aiUsage, eq } from 'drizzle-orm';
 *
 * // Find active models by modality
 * const textModels = await db.query.aiModels.findMany({
 *   where: and(eq(aiModels.isActive, true), eq(aiModels.modality, 'text->text'))
 * });
 *
 * // Get usage for a plugin
 * const usage = await db.query.aiUsage.findMany({
 *   where: eq(aiUsage.pluginId, 'workscript')
 * });
 */

import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  json,
  decimal,
  index,
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * AI Models Table
 *
 * Stores AI model information cached from OpenRouter API.
 * Models are synced daily and cached in memory for fast lookups.
 *
 * **Caching Strategy:**
 * - Database cache: 24-hour TTL, refreshed by daily cron job
 * - Memory cache: 1-hour TTL, refreshed from database
 * - Force refresh available via API
 *
 * **Key Fields:**
 * - id: OpenRouter model ID (e.g., 'openai/gpt-4', 'anthropic/claude-3-opus')
 * - name: Human-readable model name
 * - pricing: Per-token costs in USD (stored as decimal with 12 decimal places)
 * - contextLength: Maximum context window in tokens
 * - modality: Input/output type (e.g., 'text->text', 'text+image->text')
 *
 * **Pricing Notes:**
 * - All prices are stored in USD per token
 * - OpenRouter returns prices per million tokens; convert before storing
 * - Use decimal(18,12) for precision in cost calculations
 *
 * **Indexes:**
 * - modality: Filter models by capability
 * - isActive: Exclude deprecated/unavailable models
 * - lastSyncedAt: Track cache staleness
 */
export const aiModels = mysqlTable('ai_models', {
  // Primary identifier - OpenRouter model ID
  id: varchar('id', { length: 128 })
    .primaryKey(),
    // OpenRouter model ID format: "provider/model-name"
    // Examples: "openai/gpt-4", "anthropic/claude-3-opus", "google/gemini-pro"
    // This ID is used in completion requests

  // Model information
  name: varchar('name', { length: 255 })
    .notNull(),
    // Human-readable model name
    // Examples: "GPT-4", "Claude 3 Opus", "Gemini Pro"

  description: text('description'),
    // Model description from OpenRouter
    // May include capabilities, use cases, and limitations

  // Context and token limits
  contextLength: int('context_length'),
    // Maximum context window in tokens
    // Examples: 8192, 32768, 128000, 200000
    // Used for request validation and model selection

  maxCompletionTokens: int('max_completion_tokens'),
    // Maximum tokens in completion response
    // May be null if not specified by provider
    // Used for maxTokens parameter validation

  // Pricing - stored as USD per token with 12 decimal places
  // OpenRouter returns prices per million tokens; divide by 1,000,000 before storing
  promptPrice: decimal('prompt_price', { precision: 18, scale: 12 }),
    // Cost per prompt/input token in USD
    // Example: 0.00003 = $30 per million tokens

  completionPrice: decimal('completion_price', { precision: 18, scale: 12 }),
    // Cost per completion/output token in USD
    // Example: 0.00006 = $60 per million tokens

  requestPrice: decimal('request_price', { precision: 18, scale: 12 }),
    // Fixed cost per request in USD (if applicable)
    // Most models don't have per-request pricing

  imagePrice: decimal('image_price', { precision: 18, scale: 12 }),
    // Cost per image in USD (for vision models)
    // May be null for text-only models

  // Model capabilities
  modality: varchar('modality', { length: 50 }),
    // Input->Output modality string
    // Examples: "text->text", "text+image->text", "text->image"
    // Used for filtering models by capability

  inputModalities: json('input_modalities').$type<string[]>(),
    // Array of supported input types
    // Examples: ["text"], ["text", "image"], ["text", "audio"]

  outputModalities: json('output_modalities').$type<string[]>(),
    // Array of supported output types
    // Examples: ["text"], ["text", "image"]

  // Tokenizer and parameters
  tokenizer: varchar('tokenizer', { length: 50 }),
    // Tokenizer identifier for token counting
    // Examples: "cl100k_base", "claude", "gpt-4"

  supportedParameters: json('supported_parameters').$type<string[]>(),
    // Array of supported API parameters
    // Examples: ["temperature", "top_p", "max_tokens", "stop"]
    // Used for request validation

  // Status and caching
  isActive: boolean('is_active')
    .default(true)
    .notNull(),
    // Whether the model is currently available
    // Set to false when model is deprecated or removed from OpenRouter
    // Inactive models are excluded from listing results

  lastSyncedAt: timestamp('last_synced_at'),
    // When this model was last synced from OpenRouter
    // Used to determine cache staleness
    // Updated on every sync, even if model data unchanged

  // Timestamps
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .onUpdateNow()
    .notNull(),
}, (table) => ({
  // **Modality filtering** - Find models by capability
  modalityIdx: index('ai_models_modality_idx').on(table.modality),

  // **Active model filtering** - Exclude deprecated models
  isActiveIdx: index('ai_models_is_active_idx').on(table.isActive),

  // **Cache staleness check** - Find stale models for refresh
  lastSyncedAtIdx: index('ai_models_last_synced_at_idx').on(table.lastSyncedAt),
}));

/**
 * AI Usage Table
 *
 * Tracks all AI completion requests for billing, analytics, and quota management.
 * Every completion request creates a usage record, regardless of success/failure.
 *
 * **Usage Recording:**
 * - Success: Records tokens used, costs calculated, duration measured
 * - Failure: Records status='error', errorMessage, no tokens/costs
 * - Non-blocking: Recording errors don't affect completion responses
 *
 * **Cost Calculation:**
 * - promptCost = promptTokens * model.promptPrice
 * - completionCost = completionTokens * model.completionPrice
 * - totalCost = promptCost + completionCost + requestPrice (if applicable)
 *
 * **Analytics Queries:**
 * - By plugin: Track AI costs per integration
 * - By user: Track individual user consumption
 * - By tenant: Multi-tenant billing isolation
 * - By time range: Historical usage analysis
 * - By model: Track model popularity and costs
 *
 * **Indexes:**
 * - pluginId: Plugin usage analytics
 * - userId: User usage analytics
 * - tenantId: Tenant isolation and billing
 * - modelId: Model popularity tracking
 * - createdAt: Time-range queries
 * - (pluginId, createdAt): Plugin time-series queries
 */
export const aiUsage = mysqlTable('ai_usage', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
    // CUID2 unique identifier for this usage record

  // Request context
  pluginId: varchar('plugin_id', { length: 128 })
    .notNull(),
    // Plugin that made the request
    // Examples: "workscript", "estateflow", "custom-plugin"
    // Required for all requests

  userId: varchar('user_id', { length: 128 }),
    // User who triggered the request (if applicable)
    // May be null for system/automated requests
    // Used for per-user analytics and quotas

  tenantId: varchar('tenant_id', { length: 128 }),
    // Tenant/agency/workspace context
    // Used for multi-tenant billing and isolation
    // May be null for single-tenant deployments

  // Model information
  modelId: varchar('model_id', { length: 128 })
    .notNull(),
    // OpenRouter model ID used for the request
    // Examples: "openai/gpt-4", "anthropic/claude-3-opus"
    // Stored for analytics and cost tracking

  // Token usage
  promptTokens: int('prompt_tokens')
    .notNull(),
    // Number of tokens in the prompt/input
    // Returned by OpenRouter in usage.prompt_tokens
    // Set to 0 on error

  completionTokens: int('completion_tokens')
    .notNull(),
    // Number of tokens in the completion/output
    // Returned by OpenRouter in usage.completion_tokens
    // Set to 0 on error

  totalTokens: int('total_tokens')
    .notNull(),
    // Total tokens (prompt + completion)
    // Returned by OpenRouter in usage.total_tokens
    // Set to 0 on error

  // Cost tracking - stored as USD with 12 decimal places
  promptCost: decimal('prompt_cost', { precision: 18, scale: 12 }),
    // Cost of prompt tokens in USD
    // = promptTokens * model.promptPrice

  completionCost: decimal('completion_cost', { precision: 18, scale: 12 }),
    // Cost of completion tokens in USD
    // = completionTokens * model.completionPrice

  totalCost: decimal('total_cost', { precision: 18, scale: 12 }),
    // Total request cost in USD
    // = promptCost + completionCost + requestPrice

  // Performance tracking
  requestDurationMs: int('request_duration_ms'),
    // Time from request start to response completion in milliseconds
    // Used for latency analytics and SLA monitoring

  // Request status
  status: varchar('status', { length: 20 }),
    // Request outcome: 'success' or 'error'
    // Used for error rate tracking

  errorMessage: text('error_message'),
    // Error message if status='error'
    // Contains error code and description
    // Null on success

  // Additional metadata
  metadata: json('metadata'),
    // JSON object with additional request context
    // Examples: { workflowId, nodeId, requestId, tags }
    // Used for detailed analytics and debugging

  // Timestamp
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
    // When the request was made
    // Used for time-range queries
}, (table) => ({
  // **Plugin analytics** - Track usage per plugin
  pluginIdIdx: index('ai_usage_plugin_id_idx').on(table.pluginId),

  // **User analytics** - Track usage per user
  userIdIdx: index('ai_usage_user_id_idx').on(table.userId),

  // **Tenant isolation** - Multi-tenant billing queries
  tenantIdIdx: index('ai_usage_tenant_id_idx').on(table.tenantId),

  // **Model popularity** - Track which models are most used
  modelIdIdx: index('ai_usage_model_id_idx').on(table.modelId),

  // **Time-range queries** - Historical usage analysis
  createdAtIdx: index('ai_usage_created_at_idx').on(table.createdAt),

  // **Plugin time-series** - Combined plugin + time queries
  // Most common analytics query pattern
  pluginCreatedAtIdx: index('ai_usage_plugin_created_at_idx').on(table.pluginId, table.createdAt),
}));

/**
 * Type Exports
 *
 * Export TypeScript types inferred from schema for use throughout the application.
 * Drizzle infers types automatically from table definitions.
 */

// AI Model types
export type AIModel = typeof aiModels.$inferSelect;
export type NewAIModel = typeof aiModels.$inferInsert;

// AI Usage types
export type AIUsage = typeof aiUsage.$inferSelect;
export type NewAIUsage = typeof aiUsage.$inferInsert;
