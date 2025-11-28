/**
 * @module ask-ai/ModelRegistry
 * @description Model cache management with database and in-memory caching.
 *
 * The ModelRegistry provides a two-tier caching system for AI model data:
 * - **In-memory cache**: 1-hour TTL for fast lookups without database queries
 * - **Database cache**: 24-hour TTL with daily sync from OpenRouter
 *
 * Features:
 * - Singleton pattern for consistent state across the application
 * - Automatic cache refresh when TTL expires
 * - Request coalescing to prevent thundering herd on cache expiration
 * - Graceful degradation: uses stale cache if sync fails
 * - Force refresh capability for manual updates
 *
 * @example
 * ```typescript
 * import { ModelRegistry } from './ModelRegistry';
 *
 * const registry = ModelRegistry.getInstance();
 *
 * // Get all active models
 * const models = await registry.getModels();
 *
 * // Get a specific model
 * const model = await registry.getModel('openai/gpt-4o');
 *
 * // Force refresh from OpenRouter
 * await registry.getModels({ forceRefresh: true });
 *
 * // Sync models from OpenRouter
 * await registry.syncModels();
 * ```
 */

import { db, aiModels } from '../../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { OpenRouterClient } from './OpenRouterClient';
import {
  type AIModel as AIModelType,
  type ModelPricing,
  type OpenRouterModel,
  AIServiceError,
} from './types';
import type { AIModel as DBModel } from '../../db/schema/ai.schema';

/**
 * Options for getModels method.
 */
export interface GetModelsOptions {
  /**
   * If true, bypass cache and sync from OpenRouter.
   * @default false
   */
  forceRefresh?: boolean;
}

/**
 * Model cache registry with two-tier caching (memory + database).
 *
 * Manages AI model data from OpenRouter with efficient caching:
 * - Memory cache (1 hour): Instant lookups for frequent requests
 * - Database cache (24 hours): Persistent storage across server restarts
 *
 * The registry implements the singleton pattern to ensure consistent
 * cache state across all service requests.
 *
 * @example
 * ```typescript
 * const registry = ModelRegistry.getInstance();
 *
 * // List all models (uses cache)
 * const allModels = await registry.getModels();
 *
 * // Get specific model
 * const gpt4 = await registry.getModel('openai/gpt-4o');
 * if (gpt4) {
 *   console.log(`Context length: ${gpt4.contextLength}`);
 *   console.log(`Price per token: $${gpt4.pricing.prompt}`);
 * }
 *
 * // Force refresh from OpenRouter
 * await registry.getModels({ forceRefresh: true });
 * ```
 */
export class ModelRegistry {
  /**
   * Singleton instance.
   */
  private static instance: ModelRegistry | null = null;

  /**
   * In-memory cache of models for fast lookups.
   * Key: model ID, Value: AIModel
   */
  private memoryCache: Map<string, AIModelType> = new Map();

  /**
   * When the memory cache expires.
   * After this time, cache will be refreshed from database.
   */
  private cacheExpiresAt: Date | null = null;

  /**
   * OpenRouter API client for fetching models.
   */
  private client: OpenRouterClient;

  /**
   * Memory cache time-to-live in milliseconds (1 hour).
   */
  private readonly memoryCacheTTL: number = 60 * 60 * 1000;

  /**
   * Database cache time-to-live in milliseconds (24 hours).
   */
  private readonly dbCacheTTL: number = 24 * 60 * 60 * 1000;

  /**
   * Whether a sync operation is currently in progress.
   * Used for request coalescing.
   */
  private syncInProgress: boolean = false;

  /**
   * Promise for the current sync operation.
   * Used for request coalescing - multiple callers wait on the same promise.
   */
  private syncPromise: Promise<void> | null = null;

  /**
   * Private constructor for singleton pattern.
   * Use ModelRegistry.getInstance() to get the instance.
   */
  private constructor() {
    this.client = new OpenRouterClient();
  }

  /**
   * Gets the singleton instance of ModelRegistry.
   *
   * Creates the instance on first call, returns existing instance on subsequent calls.
   * Thread-safe: concurrent calls during initialization will return the same instance.
   *
   * @returns The ModelRegistry singleton instance
   *
   * @example
   * ```typescript
   * const registry = ModelRegistry.getInstance();
   * const models = await registry.getModels();
   * ```
   */
  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Resets the singleton instance.
   * **Only use in tests** to ensure clean state between test cases.
   *
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   ModelRegistry.resetInstance();
   * });
   * ```
   */
  public static resetInstance(): void {
    ModelRegistry.instance = null;
  }

  /**
   * Gets all available AI models.
   *
   * Cache strategy:
   * 1. Check memory cache (1-hour TTL)
   * 2. If memory cache expired, load from database
   * 3. If database cache expired (24 hours), trigger sync from OpenRouter
   * 4. If forceRefresh=true, sync from OpenRouter immediately
   *
   * @param options Optional configuration
   * @param options.forceRefresh If true, bypass cache and sync from OpenRouter
   * @returns Array of active AI models
   *
   * @example
   * ```typescript
   * const registry = ModelRegistry.getInstance();
   *
   * // Normal usage - uses cache
   * const models = await registry.getModels();
   *
   * // Force fresh data from OpenRouter
   * const freshModels = await registry.getModels({ forceRefresh: true });
   * ```
   */
  public async getModels(options?: GetModelsOptions): Promise<AIModelType[]> {
    // Force refresh if requested
    if (options?.forceRefresh) {
      await this.syncModels();
      return Array.from(this.memoryCache.values());
    }

    // Check if memory cache is still valid
    if (this.isCacheValid()) {
      return Array.from(this.memoryCache.values());
    }

    // Load from database (will trigger sync if DB cache is stale)
    await this.loadFromDatabase();
    return Array.from(this.memoryCache.values());
  }

  /**
   * Gets a specific AI model by ID.
   *
   * Lookup order:
   * 1. Check memory cache (fastest)
   * 2. If not in memory cache or cache expired, load from database
   * 3. Return null if model not found
   *
   * @param modelId The model ID (e.g., 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet')
   * @returns The model if found and active, null otherwise
   *
   * @example
   * ```typescript
   * const registry = ModelRegistry.getInstance();
   *
   * const model = await registry.getModel('openai/gpt-4o');
   * if (model) {
   *   console.log(`Model: ${model.name}`);
   *   console.log(`Context: ${model.contextLength} tokens`);
   * } else {
   *   console.log('Model not found');
   * }
   * ```
   */
  public async getModel(modelId: string): Promise<AIModelType | null> {
    // Check memory cache first if valid
    if (this.isCacheValid() && this.memoryCache.has(modelId)) {
      return this.memoryCache.get(modelId) || null;
    }

    // If cache expired or model not in cache, try loading from database
    if (!this.isCacheValid()) {
      await this.loadFromDatabase();
      if (this.memoryCache.has(modelId)) {
        return this.memoryCache.get(modelId) || null;
      }
    }

    // Model not in cache, try direct database lookup
    try {
      const [dbModel] = await db
        .select()
        .from(aiModels)
        .where(and(eq(aiModels.id, modelId), eq(aiModels.isActive, true)))
        .limit(1);

      if (dbModel) {
        const model = this.transformToAIModel(dbModel);
        this.memoryCache.set(modelId, model);
        return model;
      }
    } catch (error) {
      console.error(`❌ Error fetching model ${modelId} from database:`, error);
    }

    return null;
  }

  /**
   * Gets pricing information for a specific model.
   *
   * Convenience method that extracts just the pricing from the model data.
   * Returns null if the model is not found.
   *
   * @param modelId The model ID
   * @returns Pricing object or null if model not found
   *
   * @example
   * ```typescript
   * const registry = ModelRegistry.getInstance();
   *
   * const pricing = await registry.getModelPricing('openai/gpt-4o');
   * if (pricing) {
   *   const inputCost = promptTokens * pricing.prompt;
   *   const outputCost = completionTokens * pricing.completion;
   *   console.log(`Total cost: $${inputCost + outputCost}`);
   * }
   * ```
   */
  public async getModelPricing(modelId: string): Promise<ModelPricing | null> {
    const model = await this.getModel(modelId);
    if (!model) {
      console.warn(`⚠️ Model ${modelId} not found for pricing lookup`);
      return null;
    }
    return model.pricing;
  }

  /**
   * Synchronizes models from OpenRouter API.
   *
   * Features:
   * - Request coalescing: Multiple concurrent calls share one API request
   * - Upsert logic: New models added, existing models updated
   * - Soft delete: Models removed from OpenRouter marked as inactive
   * - Error resilience: Sync failures don't crash the service
   *
   * @returns Promise that resolves when sync is complete
   *
   * @example
   * ```typescript
   * const registry = ModelRegistry.getInstance();
   *
   * // Manual sync
   * await registry.syncModels();
   *
   * // Check model count
   * const models = await registry.getModels();
   * console.log(`Synced ${models.length} models`);
   * ```
   */
  public async syncModels(): Promise<void> {
    // Request coalescing: if sync is already in progress, wait for it
    if (this.syncInProgress && this.syncPromise) {
      console.log('🔄 Sync already in progress, waiting for completion...');
      return this.syncPromise;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting model sync from OpenRouter...');
    const startTime = Date.now();

    this.syncPromise = this.performSync(startTime);

    try {
      await this.syncPromise;
    } finally {
      this.syncInProgress = false;
      this.syncPromise = null;
    }
  }

  /**
   * Performs the actual sync operation.
   * Separated from syncModels() for cleaner error handling.
   */
  private async performSync(startTime: number): Promise<void> {
    try {
      // Fetch models from OpenRouter
      const openRouterModels = await this.client.listModels();
      console.log(`📥 Received ${openRouterModels.length} models from OpenRouter`);

      // Update database
      await this.updateDatabase(openRouterModels);

      // Refresh memory cache from database
      await this.loadFromDatabase();

      const duration = Date.now() - startTime;
      console.log(`✅ Model sync completed: ${this.memoryCache.size} active models in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Model sync failed after ${duration}ms:`, error);

      // If cache is empty, this is a critical error
      if (this.memoryCache.size === 0) {
        console.error('⚠️ No cached models available - using stale database cache');
        try {
          await this.loadFromDatabase();
        } catch (dbError) {
          console.error('❌ Failed to load from database:', dbError);
          throw new AIServiceError(
            'Failed to sync models and no cache available',
            'DATABASE_ERROR',
            'openrouter'
          );
        }
      }
      // If we have cached data, log warning but don't throw
      // The cache will continue to serve requests
    }
  }

  /**
   * Clears the in-memory cache.
   *
   * Forces the next getModels() or getModel() call to reload from database.
   * Useful for testing or when you know the cache is stale.
   *
   * @example
   * ```typescript
   * const registry = ModelRegistry.getInstance();
   *
   * // Clear cache
   * registry.clearCache();
   *
   * // Next call will reload from database
   * const models = await registry.getModels();
   * ```
   */
  public clearCache(): void {
    this.memoryCache.clear();
    this.cacheExpiresAt = null;
    console.log('🗑️ Model cache cleared');
  }

  /**
   * Checks if the memory cache is still valid (within TTL).
   */
  private isCacheValid(): boolean {
    if (this.memoryCache.size === 0) {
      return false;
    }
    if (!this.cacheExpiresAt) {
      return false;
    }
    return new Date() < this.cacheExpiresAt;
  }

  /**
   * Loads models from the database into memory cache.
   *
   * If the database cache is older than 24 hours, triggers a background sync
   * from OpenRouter (but doesn't wait for it - returns stale data immediately).
   */
  private async loadFromDatabase(): Promise<void> {
    console.log('📂 Loading models from database...');

    try {
      // Get all active models from database
      const dbModels = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.isActive, true))
        .orderBy(desc(aiModels.lastSyncedAt));

      // Transform and populate memory cache
      this.memoryCache.clear();
      for (const dbModel of dbModels) {
        const model = this.transformToAIModel(dbModel);
        this.memoryCache.set(model.id, model);
      }

      // Set cache expiration
      this.cacheExpiresAt = new Date(Date.now() + this.memoryCacheTTL);

      console.log(`✅ Loaded ${this.memoryCache.size} models from database`);

      // Check if database cache is stale
      if (dbModels.length > 0) {
        const latestSync = dbModels[0].lastSyncedAt;
        if (latestSync) {
          const cacheAge = Date.now() - latestSync.getTime();
          if (cacheAge > this.dbCacheTTL) {
            console.log('⏰ Database cache is stale, triggering background sync...');
            // Trigger sync but don't wait for it
            this.syncModels().catch(err => {
              console.error('Background sync failed:', err);
            });
          }
        }
      } else {
        // No models in database, trigger sync
        console.log('📭 No models in database, triggering sync...');
        await this.syncModels();
      }
    } catch (error) {
      console.error('❌ Error loading models from database:', error);
      throw new AIServiceError(
        'Failed to load models from database',
        'DATABASE_ERROR',
        undefined,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Updates the database with models from OpenRouter.
   *
   * Performs upsert operations:
   * - New models are inserted
   * - Existing models are updated with latest pricing/metadata
   * - Models not in the API response are marked as inactive
   */
  private async updateDatabase(openRouterModels: OpenRouterModel[]): Promise<void> {
    const syncTimestamp = new Date();
    const receivedIds = new Set(openRouterModels.map(m => m.id));

    console.log(`📝 Updating database with ${openRouterModels.length} models...`);

    // Process models in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < openRouterModels.length; i += batchSize) {
      const batch = openRouterModels.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (model) => {
          try {
            // First check if model exists
            const existing = await db
              .select({ id: aiModels.id })
              .from(aiModels)
              .where(eq(aiModels.id, model.id))
              .limit(1);

            const dbRecord = this.transformToDBModel(model, syncTimestamp);

            if (existing.length > 0) {
              // Update existing model
              await db
                .update(aiModels)
                .set({
                  name: dbRecord.name,
                  description: dbRecord.description,
                  contextLength: dbRecord.contextLength,
                  maxCompletionTokens: dbRecord.maxCompletionTokens,
                  promptPrice: dbRecord.promptPrice,
                  completionPrice: dbRecord.completionPrice,
                  requestPrice: dbRecord.requestPrice,
                  imagePrice: dbRecord.imagePrice,
                  modality: dbRecord.modality,
                  inputModalities: dbRecord.inputModalities,
                  outputModalities: dbRecord.outputModalities,
                  tokenizer: dbRecord.tokenizer,
                  supportedParameters: dbRecord.supportedParameters,
                  isActive: true,
                  lastSyncedAt: syncTimestamp,
                })
                .where(eq(aiModels.id, model.id));
            } else {
              // Insert new model
              await db.insert(aiModels).values(dbRecord);
            }
          } catch (error) {
            console.error(`❌ Failed to upsert model ${model.id}:`, error);
          }
        })
      );

      console.log(`📊 Processed ${Math.min(i + batchSize, openRouterModels.length)}/${openRouterModels.length} models`);
    }

    // Mark models not in the response as inactive
    try {
      // Get all current model IDs from database
      const existingModels = await db
        .select({ id: aiModels.id })
        .from(aiModels)
        .where(eq(aiModels.isActive, true));

      const modelsToDeactivate = existingModels
        .filter(m => !receivedIds.has(m.id))
        .map(m => m.id);

      if (modelsToDeactivate.length > 0) {
        console.log(`⚠️ Marking ${modelsToDeactivate.length} models as inactive...`);

        // Deactivate in batches
        for (let j = 0; j < modelsToDeactivate.length; j += batchSize) {
          const deactivateBatch = modelsToDeactivate.slice(j, j + batchSize);
          await Promise.all(
            deactivateBatch.map(id =>
              db
                .update(aiModels)
                .set({ isActive: false, lastSyncedAt: syncTimestamp })
                .where(eq(aiModels.id, id))
            )
          );
        }
      }
    } catch (error) {
      console.error('❌ Error deactivating old models:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Transforms a database model record to the AIModel interface.
   *
   * Converts database types (decimals, JSON strings) to proper TypeScript types.
   */
  private transformToAIModel(dbModel: DBModel): AIModelType {
    return {
      id: dbModel.id,
      name: dbModel.name,
      description: dbModel.description || '',
      contextLength: dbModel.contextLength || 0,
      pricing: {
        prompt: this.parseDecimal(dbModel.promptPrice),
        completion: this.parseDecimal(dbModel.completionPrice),
        request: this.parseDecimal(dbModel.requestPrice),
        image: this.parseDecimal(dbModel.imagePrice),
      },
      modality: dbModel.modality || 'text->text',
      inputModalities: dbModel.inputModalities || ['text'],
      outputModalities: dbModel.outputModalities || ['text'],
      tokenizer: dbModel.tokenizer || '',
      maxCompletionTokens: dbModel.maxCompletionTokens || 0,
      supportedParameters: dbModel.supportedParameters || [],
    };
  }

  /**
   * Transforms an OpenRouter model to database insert format.
   *
   * Converts OpenRouter API response format to database schema.
   * Prices are converted from per-million-tokens to per-token.
   */
  private transformToDBModel(
    model: OpenRouterModel,
    syncTimestamp: Date
  ): typeof aiModels.$inferInsert {
    return {
      id: model.id,
      name: model.name,
      description: model.description || null,
      contextLength: model.context_length || null,
      maxCompletionTokens: model.top_provider?.max_completion_tokens || null,
      promptPrice: this.formatPrice(model.pricing?.prompt),
      completionPrice: this.formatPrice(model.pricing?.completion),
      requestPrice: this.formatPrice(model.pricing?.request),
      imagePrice: this.formatPrice(model.pricing?.image),
      modality: model.architecture?.modality || null,
      inputModalities: model.architecture?.input_modalities || ['text'],
      outputModalities: model.architecture?.output_modalities || ['text'],
      tokenizer: model.architecture?.tokenizer || null,
      supportedParameters: model.supported_parameters || [],
      isActive: true,
      lastSyncedAt: syncTimestamp,
    };
  }

  /**
   * Parses a decimal string or value to a number.
   * Returns 0 for null/undefined/invalid values.
   */
  private parseDecimal(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  }

  /**
   * Formats a price value for database storage.
   *
   * OpenRouter returns prices in various formats (strings, numbers).
   * This normalizes them for decimal storage.
   *
   * @param price Price value from OpenRouter API
   * @returns Formatted price string for database, or null
   */
  private formatPrice(price: string | number | undefined): string | null {
    if (price === undefined || price === null) {
      return null;
    }

    const numValue = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numValue)) {
      return null;
    }

    // Store with full precision (up to 12 decimal places)
    return numValue.toFixed(12);
  }
}

export default ModelRegistry;
