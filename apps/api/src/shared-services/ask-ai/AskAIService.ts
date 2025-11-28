/**
 * @module ask-ai/AskAIService
 * @description Main service facade for AI completions, model discovery, and usage tracking.
 *
 * The AskAIService provides a unified interface for plugins to interact with AI models
 * through OpenRouter. It handles:
 * - Chat completions with automatic usage tracking
 * - Model discovery and filtering
 * - Usage analytics queries
 * - Cost calculation and recording
 * - Input validation
 * - Graceful shutdown
 *
 * Features:
 * - Singleton pattern for consistent state across the application
 * - OpenAI-compatible message format for easy portability
 * - Automatic cost calculation based on model pricing
 * - Non-blocking usage tracking (doesn't affect completion latency)
 * - Comprehensive input validation with structured errors
 *
 * @example
 * ```typescript
 * import { AskAIService, getAskAIService } from './ask-ai';
 *
 * // Get the service instance
 * const askAI = getAskAIService();
 *
 * // Send a completion request
 * const result = await askAI.complete({
 *   model: 'openai/gpt-4o',
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'What is TypeScript?' }
 *   ],
 *   pluginId: 'my-plugin',
 *   temperature: 0.7
 * });
 *
 * console.log(result.content);
 * console.log(`Cost: $${result.usage.cost}`);
 *
 * // List available models
 * const models = await askAI.listModels({ provider: 'anthropic' });
 *
 * // Get usage statistics
 * const usage = await askAI.getUsage({ pluginId: 'my-plugin' });
 * ```
 */

import { OpenRouterClient } from './OpenRouterClient';
import { ModelRegistry } from './ModelRegistry';
import { UsageTracker } from './UsageTracker';
import {
  type CompletionRequest,
  type CompletionResult,
  type AIModel,
  type ModelFilters,
  type UsageSummary,
  type UsageQueryParams,
  type ChatMessage,
  AIServiceError,
} from './types';

/**
 * Main service facade for AI completions, model discovery, and usage tracking.
 *
 * Provides a unified interface for plugins to interact with AI models through OpenRouter.
 * Implements the singleton pattern for consistent state management.
 *
 * @example
 * ```typescript
 * const askAI = AskAIService.getInstance();
 *
 * // Complete a chat
 * const result = await askAI.complete({
 *   model: 'anthropic/claude-3.5-sonnet',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   pluginId: 'workscript'
 * });
 *
 * // List models
 * const models = await askAI.listModels({ minContextLength: 100000 });
 *
 * // Get usage
 * const usage = await askAI.getUsage({ pluginId: 'workscript' });
 * ```
 */
export class AskAIService {
  /**
   * Singleton instance.
   */
  private static instance: AskAIService | null = null;

  /**
   * OpenRouter API client for sending requests.
   */
  private client: OpenRouterClient;

  /**
   * Model registry for model lookups and caching.
   */
  private modelRegistry: ModelRegistry;

  /**
   * Usage tracker for recording and querying usage data.
   */
  private usageTracker: UsageTracker;

  /**
   * Flag indicating if the service is shutting down.
   * When true, new requests are rejected.
   */
  private isShuttingDown: boolean = false;

  /**
   * Private constructor for singleton pattern.
   * Use AskAIService.getInstance() to get the instance.
   */
  private constructor() {
    this.client = new OpenRouterClient();
    this.modelRegistry = ModelRegistry.getInstance();
    this.usageTracker = UsageTracker.getInstance();

    console.log('🤖 AskAI Service initialized');
  }

  /**
   * Gets the singleton instance of AskAIService.
   *
   * Creates the instance on first call, returns existing instance on subsequent calls.
   * Thread-safe: concurrent calls during initialization will return the same instance.
   *
   * @returns The AskAIService singleton instance
   *
   * @example
   * ```typescript
   * const askAI = AskAIService.getInstance();
   * const result = await askAI.complete({ ... });
   * ```
   */
  public static getInstance(): AskAIService {
    if (!AskAIService.instance) {
      AskAIService.instance = new AskAIService();
    }
    return AskAIService.instance;
  }

  /**
   * Resets the singleton instance.
   * **Only use in tests** to ensure clean state between test cases.
   *
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   AskAIService.resetInstance();
   * });
   * ```
   */
  public static resetInstance(): void {
    AskAIService.instance = null;
  }

  // ==========================================================================
  // INPUT VALIDATION
  // ==========================================================================

  /**
   * Validates a completion request.
   *
   * Checks all required fields and validates parameter ranges:
   * - model: Must be non-empty string
   * - messages: Must be non-empty array with valid messages
   * - pluginId: Must be non-empty string
   * - temperature: Must be between 0 and 2 (if provided)
   * - maxTokens: Must be positive (if provided)
   * - topP: Must be between 0 and 1 (if provided)
   *
   * @param request The completion request to validate
   * @throws {AIServiceError} With code INVALID_REQUEST if validation fails
   *
   * @internal
   */
  private validateCompletionRequest(request: CompletionRequest): void {
    // Validate model
    if (!request.model || request.model.trim() === '') {
      throw new AIServiceError(
        'Model ID is required',
        'INVALID_REQUEST',
        undefined,
        { field: 'model', value: request.model }
      );
    }

    // Validate pluginId
    if (!request.pluginId || request.pluginId.trim() === '') {
      throw new AIServiceError(
        'Plugin ID is required',
        'INVALID_REQUEST',
        undefined,
        { field: 'pluginId', value: request.pluginId }
      );
    }

    // Validate messages array
    if (!request.messages || !Array.isArray(request.messages)) {
      throw new AIServiceError(
        'Messages array is required',
        'INVALID_REQUEST',
        undefined,
        { field: 'messages', value: request.messages }
      );
    }

    if (request.messages.length === 0) {
      throw new AIServiceError(
        'Messages array cannot be empty',
        'INVALID_REQUEST',
        undefined,
        { field: 'messages' }
      );
    }

    // Validate each message
    const validRoles = ['system', 'user', 'assistant'];
    for (let i = 0; i < request.messages.length; i++) {
      const message = request.messages[i];

      if (!message.role || !validRoles.includes(message.role)) {
        throw new AIServiceError(
          `Invalid message role at index ${i}. Accepted roles: ${validRoles.join(', ')}`,
          'INVALID_REQUEST',
          undefined,
          { field: `messages[${i}].role`, value: message.role, acceptedValues: validRoles }
        );
      }

      if (!message.content || message.content.trim() === '') {
        throw new AIServiceError(
          `Message content cannot be empty at index ${i}`,
          'INVALID_REQUEST',
          undefined,
          { field: `messages[${i}].content` }
        );
      }
    }

    // Validate temperature (if provided)
    if (request.temperature !== undefined) {
      if (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2) {
        throw new AIServiceError(
          'Temperature must be a number between 0 and 2',
          'INVALID_REQUEST',
          undefined,
          { field: 'temperature', value: request.temperature, validRange: '0-2' }
        );
      }
    }

    // Validate maxTokens (if provided)
    if (request.maxTokens !== undefined) {
      if (typeof request.maxTokens !== 'number' || request.maxTokens <= 0) {
        throw new AIServiceError(
          'maxTokens must be a positive number',
          'INVALID_REQUEST',
          undefined,
          { field: 'maxTokens', value: request.maxTokens }
        );
      }
    }

    // Validate topP (if provided)
    if (request.topP !== undefined) {
      if (typeof request.topP !== 'number' || request.topP < 0 || request.topP > 1) {
        throw new AIServiceError(
          'topP must be a number between 0 and 1',
          'INVALID_REQUEST',
          undefined,
          { field: 'topP', value: request.topP, validRange: '0-1' }
        );
      }
    }

    // Validate frequencyPenalty (if provided)
    if (request.frequencyPenalty !== undefined) {
      if (typeof request.frequencyPenalty !== 'number' || request.frequencyPenalty < -2 || request.frequencyPenalty > 2) {
        throw new AIServiceError(
          'frequencyPenalty must be a number between -2 and 2',
          'INVALID_REQUEST',
          undefined,
          { field: 'frequencyPenalty', value: request.frequencyPenalty, validRange: '-2 to 2' }
        );
      }
    }

    // Validate presencePenalty (if provided)
    if (request.presencePenalty !== undefined) {
      if (typeof request.presencePenalty !== 'number' || request.presencePenalty < -2 || request.presencePenalty > 2) {
        throw new AIServiceError(
          'presencePenalty must be a number between -2 and 2',
          'INVALID_REQUEST',
          undefined,
          { field: 'presencePenalty', value: request.presencePenalty, validRange: '-2 to 2' }
        );
      }
    }
  }

  // ==========================================================================
  // COMPLETION
  // ==========================================================================

  /**
   * Sends a chat completion request to an AI model.
   *
   * This is the main method for interacting with AI models. It:
   * 1. Validates the request parameters
   * 2. Verifies the model exists
   * 3. Sends the request to OpenRouter
   * 4. Records usage for billing and analytics
   * 5. Returns the completion result with cost information
   *
   * @param request The completion request parameters
   * @returns The completion result with content, usage, and cost
   * @throws {AIServiceError} With appropriate code on failure
   *
   * @example
   * ```typescript
   * const askAI = AskAIService.getInstance();
   *
   * // Basic completion
   * const result = await askAI.complete({
   *   model: 'openai/gpt-4o',
   *   messages: [{ role: 'user', content: 'Hello!' }],
   *   pluginId: 'my-plugin'
   * });
   *
   * console.log(result.content); // AI response
   * console.log(result.usage.cost); // Cost in USD
   *
   * // With system prompt and options
   * const result2 = await askAI.complete({
   *   model: 'anthropic/claude-3.5-sonnet',
   *   messages: [{ role: 'user', content: 'Explain quantum computing' }],
   *   pluginId: 'my-plugin',
   *   systemPrompt: 'You are a physics professor.',
   *   temperature: 0.7,
   *   maxTokens: 1000
   * });
   * ```
   */
  public async complete(request: CompletionRequest): Promise<CompletionResult> {
    // Check if service is shutting down
    if (this.isShuttingDown) {
      throw new AIServiceError(
        'AskAI Service is shutting down, not accepting new requests',
        'INVALID_REQUEST'
      );
    }

    // Validate request
    this.validateCompletionRequest(request);

    // Record start time
    const startTime = Date.now();

    // Verify model exists
    const model = await this.modelRegistry.getModel(request.model);
    if (!model) {
      throw new AIServiceError(
        `Model '${request.model}' not found or is inactive`,
        'MODEL_NOT_FOUND',
        undefined,
        { modelId: request.model }
      );
    }

    try {
      // Build messages array, prepending systemPrompt if provided
      const messages: ChatMessage[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push(...request.messages);

      // Build OpenRouter request
      const openRouterRequest = {
        model: request.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
        ...(request.topP !== undefined && { top_p: request.topP }),
        ...(request.frequencyPenalty !== undefined && { frequency_penalty: request.frequencyPenalty }),
        ...(request.presencePenalty !== undefined && { presence_penalty: request.presencePenalty }),
      };

      // Log request
      console.log(`🤖 Completion request: ${request.model} | Plugin: ${request.pluginId}`);

      // Send request to OpenRouter
      const response = await this.client.createCompletion(openRouterRequest);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Extract response data
      const content = response.choices[0]?.message?.content || '';
      const finishReason = response.choices[0]?.finish_reason || 'stop';
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;

      // Calculate cost
      const cost = await this.calculateCost(request.model, promptTokens, completionTokens);

      // Record usage (non-blocking)
      this.usageTracker.recordUsage({
        pluginId: request.pluginId,
        userId: request.userId,
        tenantId: request.tenantId,
        modelId: request.model,
        promptTokens,
        completionTokens,
        durationMs,
        status: 'success',
        metadata: request.metadata,
      }).catch(err => {
        console.error('Failed to record usage:', err);
      });

      // Log completion
      console.log(`✅ Completion success: ${totalTokens} tokens | ${durationMs}ms | $${cost.toFixed(6)}`);

      // Return result
      return {
        id: response.id,
        model: response.model,
        content,
        finishReason: finishReason as 'stop' | 'length' | 'error',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
        },
        durationMs,
      };
    } catch (error) {
      // Calculate duration for error tracking
      const durationMs = Date.now() - startTime;

      // Record failed usage (non-blocking)
      this.usageTracker.recordUsage({
        pluginId: request.pluginId,
        userId: request.userId,
        tenantId: request.tenantId,
        modelId: request.model,
        promptTokens: 0,
        completionTokens: 0,
        durationMs,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        metadata: request.metadata,
      }).catch(err => {
        console.error('Failed to record error usage:', err);
      });

      // Log error
      console.error(`❌ Completion failed: ${request.model} | ${durationMs}ms | ${error instanceof Error ? error.message : error}`);

      // Re-throw AIServiceError as-is
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Wrap unknown errors
      throw new AIServiceError(
        `Completion failed: ${error instanceof Error ? error.message : String(error)}`,
        'PROVIDER_ERROR',
        'openrouter',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Calculates the cost for a completion based on model pricing.
   *
   * @param modelId The model ID
   * @param promptTokens Number of prompt tokens
   * @param completionTokens Number of completion tokens
   * @returns Total cost in USD
   *
   * @internal
   */
  private async calculateCost(
    modelId: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<number> {
    const pricing = await this.modelRegistry.getModelPricing(modelId);

    if (!pricing) {
      console.warn(`⚠️ No pricing found for model ${modelId}, returning zero cost`);
      return 0;
    }

    const promptCost = promptTokens * pricing.prompt;
    const completionCost = completionTokens * pricing.completion;
    const requestCost = pricing.request || 0;

    return promptCost + completionCost + requestCost;
  }

  // ==========================================================================
  // MODEL DISCOVERY
  // ==========================================================================

  /**
   * Lists available AI models with optional filtering.
   *
   * Retrieves models from the cache (memory or database) and applies
   * the provided filters. Use this to discover available models and
   * their capabilities.
   *
   * @param filters Optional filters to apply
   * @returns Array of matching AI models
   *
   * @example
   * ```typescript
   * const askAI = AskAIService.getInstance();
   *
   * // List all models
   * const allModels = await askAI.listModels();
   *
   * // List Anthropic models
   * const anthropicModels = await askAI.listModels({ provider: 'anthropic' });
   *
   * // List models with large context
   * const largeContextModels = await askAI.listModels({ minContextLength: 100000 });
   *
   * // List cheap text models
   * const cheapModels = await askAI.listModels({
   *   modality: 'text->text',
   *   maxPrice: 0.000001
   * });
   * ```
   */
  public async listModels(filters?: ModelFilters): Promise<AIModel[]> {
    // Get all models from registry
    const allModels = await this.modelRegistry.getModels();

    // If no filters, return all
    if (!filters) {
      return allModels;
    }

    // Apply filters
    return allModels.filter(model => {
      // Filter by modality
      if (filters.modality && model.modality !== filters.modality) {
        return false;
      }

      // Filter by input modality
      if (filters.inputModality && !model.inputModalities.includes(filters.inputModality)) {
        return false;
      }

      // Filter by provider (extract from model ID: "provider/model-name")
      if (filters.provider) {
        const modelProvider = model.id.split('/')[0];
        if (modelProvider !== filters.provider) {
          return false;
        }
      }

      // Filter by minimum context length
      if (filters.minContextLength && model.contextLength < filters.minContextLength) {
        return false;
      }

      // Filter by maximum price (prompt price)
      if (filters.maxPrice && model.pricing.prompt > filters.maxPrice) {
        return false;
      }

      return true;
    });
  }

  /**
   * Gets a specific AI model by ID.
   *
   * Returns null if the model is not found or is inactive.
   *
   * @param modelId The model ID (e.g., 'openai/gpt-4o')
   * @returns The model if found, null otherwise
   *
   * @example
   * ```typescript
   * const askAI = AskAIService.getInstance();
   *
   * const model = await askAI.getModel('anthropic/claude-3.5-sonnet');
   * if (model) {
   *   console.log(`Context length: ${model.contextLength}`);
   *   console.log(`Input price: $${model.pricing.prompt} per token`);
   * }
   * ```
   */
  public async getModel(modelId: string): Promise<AIModel | null> {
    return this.modelRegistry.getModel(modelId);
  }

  // ==========================================================================
  // USAGE ANALYTICS
  // ==========================================================================

  /**
   * Gets usage statistics based on query parameters.
   *
   * Aggregates usage data by plugin, user, or tenant with optional date filtering.
   *
   * @param params Query parameters for filtering usage
   * @returns Aggregated usage summary
   *
   * @example
   * ```typescript
   * const askAI = AskAIService.getInstance();
   *
   * // Get usage for a plugin
   * const pluginUsage = await askAI.getUsage({ pluginId: 'workscript' });
   *
   * // Get usage for a user in the last week
   * const userUsage = await askAI.getUsage({
   *   userId: 'user-123',
   *   dateRange: {
   *     from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *     to: new Date()
   *   }
   * });
   *
   * console.log(`Total requests: ${userUsage.totalRequests}`);
   * console.log(`Total cost: $${userUsage.totalCost}`);
   * ```
   */
  public async getUsage(params: UsageQueryParams): Promise<UsageSummary> {
    // Route to appropriate usage tracker method
    if (params.pluginId) {
      return this.usageTracker.getUsageByPlugin(params.pluginId, params.dateRange);
    }

    if (params.userId) {
      return this.usageTracker.getUsageByUser(params.userId, params.dateRange);
    }

    if (params.tenantId) {
      return this.usageTracker.getUsageByTenant(params.tenantId, params.dateRange);
    }

    // No filter specified, return empty summary
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
    };
  }

  // ==========================================================================
  // MODEL SYNC
  // ==========================================================================

  /**
   * Manually triggers a model sync from OpenRouter.
   *
   * Normally models are synced automatically (daily via cron), but this
   * method allows manual triggering when needed.
   *
   * @example
   * ```typescript
   * const askAI = AskAIService.getInstance();
   *
   * // Force sync models from OpenRouter
   * await askAI.syncModels();
   * ```
   */
  public async syncModels(): Promise<void> {
    return this.modelRegistry.syncModels();
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Initiates graceful shutdown of the service.
   *
   * When called:
   * - Sets isShuttingDown flag to reject new requests
   * - Allows in-flight requests to complete
   * - Cleans up resources
   *
   * This method should be called when the server is shutting down.
   *
   * @returns Promise that resolves when shutdown is complete
   *
   * @example
   * ```typescript
   * // In server shutdown handler
   * process.on('SIGTERM', async () => {
   *   const askAI = AskAIService.getInstance();
   *   await askAI.shutdown();
   *   process.exit(0);
   * });
   * ```
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 AskAI Service shutting down...');

    // Set flag to reject new requests
    this.isShuttingDown = true;

    // Note: In-flight requests will complete naturally
    // The CronScheduler integration for auto-sync should be handled
    // separately if implemented

    console.log('✅ AskAI Service shutdown complete');
  }
}

export default AskAIService;
