/**
 * React Query Hooks for AI Management
 *
 * Provides custom hooks for AI-related operations including:
 * - Usage statistics and cost tracking
 * - Model synchronization
 * - Model listing
 *
 * @module hooks/api/useAI
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchAIUsage,
  syncAIModels,
  fetchAIModels,
  getAIModelCount,
  type AIUsageSummary,
  type AIUsageQueryParams,
  type AIModel,
} from '../../services/api/ai.api';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query key factory for AI-related queries
 */
export const aiKeys = {
  all: ['ai'] as const,
  usage: () => [...aiKeys.all, 'usage'] as const,
  usageFiltered: (params?: AIUsageQueryParams) =>
    [...aiKeys.usage(), params] as const,
  models: () => [...aiKeys.all, 'models'] as const,
  modelsFiltered: (filters?: Record<string, any>) =>
    [...aiKeys.models(), filters] as const,
  modelCount: () => [...aiKeys.all, 'model-count'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch AI usage statistics
 *
 * @param params - Optional query parameters for filtering
 * @returns React Query result with usage summary
 *
 * @example
 * ```typescript
 * const { data: usage, isLoading } = useAIUsage();
 * console.log(`Total cost: $${usage?.totalCost.toFixed(2)}`);
 * ```
 */
export function useAIUsage(params?: AIUsageQueryParams) {
  return useQuery({
    queryKey: aiKeys.usageFiltered(params),
    queryFn: () => fetchAIUsage(params),
    staleTime: 1 * 60 * 1000, // 1 minute - usage changes frequently
    refetchOnWindowFocus: true,
    retry: 3,
  });
}

/**
 * Fetch available AI models
 *
 * @param filters - Optional filters
 * @returns React Query result with models array
 *
 * @example
 * ```typescript
 * const { data: models } = useAIModels();
 * ```
 */
export function useAIModels(filters?: {
  provider?: string;
  modality?: string;
  inputModality?: string;
  minContextLength?: number;
  maxPrice?: number;
}) {
  return useQuery({
    queryKey: aiKeys.modelsFiltered(filters),
    queryFn: () => fetchAIModels(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes - models don't change often
    refetchOnWindowFocus: false,
    retry: 3,
  });
}

/**
 * Fetch AI model count
 *
 * @returns React Query result with model count
 *
 * @example
 * ```typescript
 * const { data: count } = useAIModelCount();
 * ```
 */
export function useAIModelCount() {
  return useQuery({
    queryKey: aiKeys.modelCount(),
    queryFn: getAIModelCount,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Sync AI models from OpenRouter
 *
 * Requires admin privileges.
 *
 * @returns React Query mutation result
 *
 * @example
 * ```typescript
 * const syncMutation = useSyncAIModels();
 *
 * const handleSync = () => {
 *   syncMutation.mutate();
 * };
 * ```
 */
export function useSyncAIModels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncAIModels,
    onSuccess: (result) => {
      // Invalidate models cache to fetch fresh data
      queryClient.invalidateQueries({ queryKey: aiKeys.models() });
      queryClient.invalidateQueries({ queryKey: aiKeys.modelCount() });

      toast.success('AI Models Synced', {
        description: result.message || 'Models have been synchronized with OpenRouter.',
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to sync AI models';

      // Check for permission error
      if (error?.response?.status === 403) {
        toast.error('Permission Denied', {
          description: 'Admin access is required to sync models.',
        });
      } else {
        toast.error('Sync Failed', {
          description: errorMessage,
        });
      }
    },
  });
}
