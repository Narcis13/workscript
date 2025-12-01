/**
 * @module ask-ai/UsageTracker
 * @description Usage tracking and analytics for AI completions.
 *
 * The UsageTracker records all AI completion requests to the database
 * for billing, analytics, and quota management purposes. It provides:
 * - Usage recording with cost calculation
 * - Aggregated usage queries by plugin, user, and tenant
 * - Date range filtering for historical analysis
 * - Non-blocking error handling (recording failures don't affect completions)
 *
 * @example
 * ```typescript
 * import { UsageTracker } from './UsageTracker';
 *
 * const tracker = UsageTracker.getInstance();
 *
 * // Record a successful completion
 * await tracker.recordUsage({
 *   pluginId: 'workscript',
 *   modelId: 'openai/gpt-4o',
 *   promptTokens: 100,
 *   completionTokens: 50,
 *   durationMs: 1500,
 *   status: 'success'
 * });
 *
 * // Get usage summary for a plugin
 * const summary = await tracker.getUsageByPlugin('workscript');
 * console.log(`Total cost: $${summary.totalCost}`);
 * ```
 */

import { db, aiUsage } from '../../db';
import { eq, and, gte, lte, sql, sum, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { ModelRegistry } from './ModelRegistry';
import {
  type RecordUsageParams,
  type UsageSummary,
  type DateRange,
  type CostBreakdown,
} from './types';
import type { AIUsage } from '../../db/schema/ai.schema';

/**
 * Usage tracking and analytics for AI completions.
 *
 * Records all AI requests to the database for billing and analytics.
 * Calculates costs based on model pricing from the ModelRegistry.
 *
 * @example
 * ```typescript
 * const tracker = UsageTracker.getInstance();
 *
 * // Record usage
 * await tracker.recordUsage({
 *   pluginId: 'my-plugin',
 *   modelId: 'openai/gpt-4o',
 *   promptTokens: 100,
 *   completionTokens: 50,
 *   durationMs: 1200,
 *   status: 'success'
 * });
 *
 * // Query usage
 * const lastWeek = await tracker.getUsageByPlugin('my-plugin', {
 *   from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
 *   to: new Date()
 * });
 * ```
 */
export class UsageTracker {
  /**
   * Singleton instance.
   */
  private static instance: UsageTracker | null = null;

  /**
   * Reference to ModelRegistry for pricing lookups.
   */
  private modelRegistry: ModelRegistry;

  /**
   * Private constructor for singleton pattern.
   * Use UsageTracker.getInstance() to get the instance.
   */
  private constructor() {
    this.modelRegistry = ModelRegistry.getInstance();
  }

  /**
   * Gets the singleton instance of UsageTracker.
   *
   * Creates the instance on first call, returns existing instance on subsequent calls.
   *
   * @returns The UsageTracker singleton instance
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   * await tracker.recordUsage({ ... });
   * ```
   */
  public static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  /**
   * Resets the singleton instance.
   * **Only use in tests** to ensure clean state between test cases.
   *
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   UsageTracker.resetInstance();
   * });
   * ```
   */
  public static resetInstance(): void {
    UsageTracker.instance = null;
  }

  /**
   * Records a usage entry for an AI completion request.
   *
   * This method is non-blocking - if recording fails, it logs the error
   * but does not throw, ensuring the completion result is still returned.
   *
   * @param params Usage parameters to record
   * @returns Promise that resolves when recording is complete (or fails silently)
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   *
   * // Record successful completion
   * await tracker.recordUsage({
   *   pluginId: 'workscript',
   *   userId: 'user-123',
   *   tenantId: 'tenant-456',
   *   modelId: 'openai/gpt-4o',
   *   promptTokens: 100,
   *   completionTokens: 50,
   *   durationMs: 1500,
   *   status: 'success',
   *   metadata: { workflowId: 'wf-789' }
   * });
   *
   * // Record failed completion
   * await tracker.recordUsage({
   *   pluginId: 'workscript',
   *   modelId: 'openai/gpt-4o',
   *   promptTokens: 100,
   *   completionTokens: 0,
   *   durationMs: 500,
   *   status: 'error',
   *   error: 'Rate limit exceeded'
   * });
   * ```
   */
  public async recordUsage(params: RecordUsageParams): Promise<void> {
    try {
      // Calculate costs based on model pricing
      const costs = await this.calculateCosts(
        params.modelId,
        params.promptTokens,
        params.completionTokens
      );

      // Generate unique ID
      const id = createId();

      // Insert usage record
      await db.insert(aiUsage).values({
        id,
        pluginId: params.pluginId,
        userId: params.userId || null,
        tenantId: params.tenantId || null,
        modelId: params.modelId,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
        promptCost: costs.promptCost.toFixed(12),
        completionCost: costs.completionCost.toFixed(12),
        totalCost: costs.totalCost.toFixed(12),
        requestDurationMs: params.durationMs,
        status: params.status,
        errorMessage: params.error || null,
        metadata: params.metadata || null,
      });

      console.log(
        `📊 Usage recorded: ${params.modelId} | ${params.promptTokens + params.completionTokens} tokens | $${costs.totalCost.toFixed(6)}`
      );
    } catch (error) {
      // Non-blocking: log error but don't throw
      console.error('❌ Failed to record usage:', error);
      console.error('Usage params:', {
        pluginId: params.pluginId,
        modelId: params.modelId,
        status: params.status,
      });
    }
  }

  /**
   * Calculates costs for a completion request based on model pricing.
   *
   * @param modelId The model ID used for the completion
   * @param promptTokens Number of prompt/input tokens
   * @param completionTokens Number of completion/output tokens
   * @returns Cost breakdown with prompt, completion, and total costs
   *
   * @internal
   */
  private async calculateCosts(
    modelId: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<CostBreakdown> {
    // Get model pricing
    const pricing = await this.modelRegistry.getModelPricing(modelId);

    if (!pricing) {
      console.warn(`⚠️ No pricing found for model ${modelId}, using zero costs`);
      return {
        promptCost: 0,
        completionCost: 0,
        totalCost: 0,
      };
    }

    // Calculate costs with full precision
    const promptCost = promptTokens * pricing.prompt;
    const completionCost = completionTokens * pricing.completion;
    const requestCost = pricing.request || 0;
    const totalCost = promptCost + completionCost + requestCost;

    return {
      promptCost,
      completionCost,
      totalCost,
    };
  }

  /**
   * Gets aggregated usage statistics for a plugin.
   *
   * @param pluginId The plugin ID to query
   * @param dateRange Optional date range filter
   * @returns Aggregated usage summary
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   *
   * // All-time usage
   * const allTime = await tracker.getUsageByPlugin('workscript');
   *
   * // Last 7 days
   * const lastWeek = await tracker.getUsageByPlugin('workscript', {
   *   from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   to: new Date()
   * });
   * ```
   */
  public async getUsageByPlugin(
    pluginId: string,
    dateRange?: DateRange
  ): Promise<UsageSummary> {
    const records = await this.queryUsage({ pluginId }, dateRange);
    return this.buildUsageSummary(records);
  }

  /**
   * Gets aggregated usage statistics for a user.
   *
   * @param userId The user ID to query
   * @param dateRange Optional date range filter
   * @returns Aggregated usage summary
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   *
   * const userUsage = await tracker.getUsageByUser('user-123');
   * console.log(`User total cost: $${userUsage.totalCost}`);
   * ```
   */
  public async getUsageByUser(
    userId: string,
    dateRange?: DateRange
  ): Promise<UsageSummary> {
    const records = await this.queryUsage({ userId }, dateRange);
    return this.buildUsageSummary(records);
  }

  /**
   * Gets aggregated usage statistics for a tenant.
   *
   * @param tenantId The tenant ID to query
   * @param dateRange Optional date range filter
   * @returns Aggregated usage summary
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   *
   * const tenantUsage = await tracker.getUsageByTenant('tenant-456');
   * console.log(`Tenant total requests: ${tenantUsage.totalRequests}`);
   * ```
   */
  public async getUsageByTenant(
    tenantId: string,
    dateRange?: DateRange
  ): Promise<UsageSummary> {
    const records = await this.queryUsage({ tenantId }, dateRange);
    return this.buildUsageSummary(records);
  }

  /**
   * Gets aggregated usage statistics across all records.
   *
   * @param dateRange Optional date range filter
   * @returns Aggregated usage summary
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   *
   * // All-time usage
   * const allTime = await tracker.getAllUsage();
   *
   * // Last 30 days
   * const last30Days = await tracker.getAllUsage({
   *   from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
   *   to: new Date()
   * });
   * ```
   */
  public async getAllUsage(dateRange?: DateRange): Promise<UsageSummary> {
    const records = await this.queryUsage({}, dateRange);
    return this.buildUsageSummary(records);
  }

  /**
   * Gets the total cost across all usage records.
   *
   * @param dateRange Optional date range filter
   * @returns Total cost in USD
   *
   * @example
   * ```typescript
   * const tracker = UsageTracker.getInstance();
   *
   * // All-time total
   * const total = await tracker.getTotalCost();
   *
   * // This month
   * const thisMonth = await tracker.getTotalCost({
   *   from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
   * });
   * ```
   */
  public async getTotalCost(dateRange?: DateRange): Promise<number> {
    try {
      // Build conditions
      const conditions = [];

      if (dateRange?.from) {
        conditions.push(gte(aiUsage.createdAt, dateRange.from));
      }
      if (dateRange?.to) {
        conditions.push(lte(aiUsage.createdAt, dateRange.to));
      }

      // Query sum of totalCost
      const result = await db
        .select({
          total: sql<string>`COALESCE(SUM(${aiUsage.totalCost}), 0)`,
        })
        .from(aiUsage)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return parseFloat(result[0]?.total || '0');
    } catch (error) {
      console.error('❌ Error getting total cost:', error);
      return 0;
    }
  }

  /**
   * Queries usage records with optional filters.
   *
   * @param filters Filter criteria (pluginId, userId, or tenantId)
   * @param dateRange Optional date range filter
   * @returns Array of usage records
   *
   * @internal
   */
  private async queryUsage(
    filters: { pluginId?: string; userId?: string; tenantId?: string },
    dateRange?: DateRange
  ): Promise<AIUsage[]> {
    try {
      // Build conditions array
      const conditions = [];

      if (filters.pluginId) {
        conditions.push(eq(aiUsage.pluginId, filters.pluginId));
      }
      if (filters.userId) {
        conditions.push(eq(aiUsage.userId, filters.userId));
      }
      if (filters.tenantId) {
        conditions.push(eq(aiUsage.tenantId, filters.tenantId));
      }
      if (dateRange?.from) {
        conditions.push(gte(aiUsage.createdAt, dateRange.from));
      }
      if (dateRange?.to) {
        conditions.push(lte(aiUsage.createdAt, dateRange.to));
      }

      // Execute query
      const records = await db
        .select()
        .from(aiUsage)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return records;
    } catch (error) {
      console.error('❌ Error querying usage:', error);
      return [];
    }
  }

  /**
   * Builds a usage summary from an array of usage records.
   *
   * Aggregates totals and breaks down by model.
   *
   * @param records Array of usage records
   * @returns Aggregated usage summary
   *
   * @internal
   */
  private buildUsageSummary(records: AIUsage[]): UsageSummary {
    // Handle empty records
    if (records.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        byModel: {},
      };
    }

    // Aggregate totals
    let totalTokens = 0;
    let totalCost = 0;
    const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};

    for (const record of records) {
      // Parse token counts
      const tokens = record.totalTokens || 0;
      const cost = this.parseDecimal(record.totalCost);

      // Add to totals
      totalTokens += tokens;
      totalCost += cost;

      // Add to model breakdown
      if (!byModel[record.modelId]) {
        byModel[record.modelId] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }
      byModel[record.modelId].requests += 1;
      byModel[record.modelId].tokens += tokens;
      byModel[record.modelId].cost += cost;
    }

    return {
      totalRequests: records.length,
      totalTokens,
      totalCost,
      byModel,
    };
  }

  /**
   * Parses a decimal string or value to a number.
   * Returns 0 for null/undefined/invalid values.
   *
   * @internal
   */
  private parseDecimal(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  }
}

export default UsageTracker;
