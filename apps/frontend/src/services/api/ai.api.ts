/**
 * AI API Service
 *
 * Provides functions for interacting with AI-related API endpoints.
 * Handles model syncing, usage statistics, and cost tracking.
 *
 * @module services/api/ai.api
 */

import { apiClient } from './client';

/**
 * Base path for AI API endpoints
 */
const AI_BASE_PATH = '/ai';

// ============================================
// TYPES
// ============================================

/**
 * Usage statistics by model
 */
export interface ModelUsageStats {
  requests: number;
  tokens: number;
  cost: number;
}

/**
 * AI usage summary returned from the API
 */
export interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, ModelUsageStats>;
}

/**
 * Parameters for querying AI usage
 */
export interface AIUsageQueryParams {
  pluginId?: string;
  userId?: string;
  tenantId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * AI model information
 */
export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextLength: number;
  maxCompletionTokens?: number;
  pricing: {
    prompt: number;
    completion: number;
    request?: number;
    image?: number;
  };
  modality: string;
  inputModalities: string[];
  outputModalities: string[];
  tokenizer?: string;
  supportedParameters?: string[];
  isActive: boolean;
  lastSyncedAt?: string;
}

/**
 * Model sync result
 */
export interface ModelSyncResult {
  success: boolean;
  message: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch AI usage statistics
 *
 * @param params - Optional query parameters for filtering
 * @returns Promise resolving to usage summary
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * // Get all usage
 * const usage = await fetchAIUsage();
 *
 * // Get usage for specific date range
 * const usage = await fetchAIUsage({
 *   fromDate: '2024-01-01',
 *   toDate: '2024-01-31'
 * });
 * ```
 */
export async function fetchAIUsage(
  params?: AIUsageQueryParams
): Promise<AIUsageSummary> {
  const response = await apiClient.get<{ success: boolean; data: AIUsageSummary }>(
    `${AI_BASE_PATH}/usage`,
    { params }
  );

  return response.data.data;
}

/**
 * Trigger manual model synchronization from OpenRouter
 *
 * Requires admin privileges.
 *
 * @returns Promise resolving to sync result
 * @throws Error if request fails or user is not admin
 *
 * @example
 * ```typescript
 * const result = await syncAIModels();
 * if (result.success) {
 *   console.log('Models synced successfully');
 * }
 * ```
 */
export async function syncAIModels(): Promise<ModelSyncResult> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `${AI_BASE_PATH}/sync-models`
  );

  return {
    success: response.data.success,
    message: response.data.message,
  };
}

/**
 * Fetch available AI models
 *
 * @param filters - Optional filters for models
 * @returns Promise resolving to array of models
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const models = await fetchAIModels();
 * const textModels = await fetchAIModels({ modality: 'text->text' });
 * ```
 */
export async function fetchAIModels(filters?: {
  provider?: string;
  modality?: string;
  inputModality?: string;
  minContextLength?: number;
  maxPrice?: number;
}): Promise<AIModel[]> {
  const response = await apiClient.get<{
    success: boolean;
    data: AIModel[];
    count: number;
  }>(`${AI_BASE_PATH}/models`, { params: filters });

  return response.data.data;
}

/**
 * Get count of active AI models
 *
 * @returns Promise resolving to model count
 *
 * @example
 * ```typescript
 * const count = await getAIModelCount();
 * console.log(`${count} AI models available`);
 * ```
 */
export async function getAIModelCount(): Promise<number> {
  const response = await apiClient.get<{
    success: boolean;
    data: AIModel[];
    count: number;
  }>(`${AI_BASE_PATH}/models`);

  return response.data.count;
}
