/**
 * @module ask-ai
 * @description Ask-AI Shared Service - OpenRouter API integration for AI completions.
 *
 * This module provides a centralized AI integration layer for Workscript plugins,
 * wrapping the OpenRouter API to provide access to 300+ AI models from multiple
 * providers (OpenAI, Anthropic, Google, Meta, Mistral, etc.) through a single,
 * consistent interface.
 *
 * Features:
 * - **AI Completions**: Send chat messages to any supported AI model
 * - **Model Discovery**: List available models with pricing and capabilities
 * - **Usage Tracking**: Full tracking of tokens, costs, and latency
 * - **Cost Calculation**: Automatic cost calculation using real-time model pricing
 * - **Model Caching**: Two-tier cache (memory + database) for fast lookups
 * - **Scheduled Sync**: Daily automatic synchronization of model data
 *
 * @example
 * ```typescript
 * import { getAskAIService, AskAIService } from '../shared-services/ask-ai';
 * import type { CompletionRequest, CompletionResult, AIModel } from '../shared-services/ask-ai';
 *
 * // Get the singleton service instance
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

// =============================================================================
// Main Service Export
// =============================================================================

export { AskAIService } from './AskAIService';

// =============================================================================
// Component Exports (for advanced usage)
// =============================================================================

export { ModelRegistry, type GetModelsOptions } from './ModelRegistry';
export { UsageTracker } from './UsageTracker';
export { OpenRouterClient } from './OpenRouterClient';

// =============================================================================
// Type Exports
// =============================================================================

export {
  // Chat types
  type ChatMessage,
  type CompletionRequest,
  type CompletionResult,

  // Model types
  type AIModel,
  type ModelPricing,
  type ModelFilters,

  // Usage types
  type UsageSummary,
  type DateRange,
  type UsageQueryParams,
  type RecordUsageParams,
  type CostBreakdown,

  // Error types
  type AIErrorCode,
  AIServiceError,

  // OpenRouter API types (internal, but exported for advanced use)
  type OpenRouterModel,
  type OpenRouterCompletionRequest,
  type OpenRouterCompletionResponse,
  type OpenRouterModelsResponse,
  type OpenRouterErrorResponse,
} from './types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the singleton instance of AskAIService.
 *
 * This is a convenience function that wraps `AskAIService.getInstance()`.
 * Use this function for most plugin integrations.
 *
 * @returns The AskAIService singleton instance
 *
 * @example
 * ```typescript
 * import { getAskAIService } from '../shared-services/ask-ai';
 *
 * const askAI = getAskAIService();
 *
 * // Send a completion
 * const result = await askAI.complete({
 *   model: 'anthropic/claude-3.5-sonnet',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   pluginId: 'my-plugin'
 * });
 *
 * // List models
 * const models = await askAI.listModels({ provider: 'openai' });
 *
 * // Get usage
 * const usage = await askAI.getUsage({ pluginId: 'my-plugin' });
 * ```
 */
export function getAskAIService(): import('./AskAIService').AskAIService {
  return (require('./AskAIService') as typeof import('./AskAIService')).AskAIService.getInstance();
}

// =============================================================================
// Cron Integration
// =============================================================================

import { CronScheduler } from '../scheduler';
import { AskAIService } from './AskAIService';
import { ModelRegistry } from './ModelRegistry';

/**
 * Automation ID for the Ask-AI model sync job.
 * Used to identify and manage the scheduled sync automation.
 */
export const ASK_AI_SYNC_AUTOMATION_ID = 'ask-ai-model-sync';

/**
 * Plugin ID for Ask-AI cron integration.
 */
export const ASK_AI_PLUGIN_ID = 'ask-ai';

/**
 * Initializes the Ask-AI cron integration for automatic model synchronization.
 *
 * This function:
 * 1. Registers an execution callback with the CronScheduler
 * 2. Schedules daily model sync at 3 AM UTC
 *
 * Call this function during API server startup to enable automatic model syncing.
 *
 * @example
 * ```typescript
 * import { initializeAskAICron } from '../shared-services/ask-ai';
 *
 * // During server startup
 * await initializeAskAICron();
 * ```
 */
export async function initializeAskAICron(): Promise<void> {
  const scheduler = CronScheduler.getInstance();

  // Register execution callback for ask-ai plugin
  scheduler.registerExecutionCallback(ASK_AI_PLUGIN_ID, async (context) => {
    console.log('🔄 Ask-AI: Executing scheduled model sync...');

    try {
      const registry = ModelRegistry.getInstance();
      await registry.syncModels();

      return {
        success: true,
        result: { message: 'Model sync completed successfully' },
      };
    } catch (error) {
      console.error('❌ Ask-AI: Scheduled model sync failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Model sync failed',
      };
    }
  });

  // Schedule daily model sync at 3 AM UTC
  // Cron expression: minute(0) hour(3) day(*) month(*) weekday(*)
  try {
    await scheduler.scheduleAutomation({
      id: ASK_AI_SYNC_AUTOMATION_ID,
      name: 'Ask-AI Model Sync',
      pluginId: ASK_AI_PLUGIN_ID,
      workflowId: 'model-sync', // Not a real workflow, just for identification
      cronExpression: '0 3 * * *', // 3 AM UTC daily
      timezone: 'UTC',
      metadata: {
        description: 'Daily synchronization of AI models from OpenRouter',
      },
    });

    console.log('✅ Ask-AI: Cron integration initialized (daily sync at 3 AM UTC)');
  } catch (error) {
    console.error('❌ Ask-AI: Failed to schedule model sync:', error);
    throw error;
  }
}

/**
 * Shuts down the Ask-AI cron integration.
 *
 * This function:
 * 1. Unschedules the model sync automation
 * 2. Unregisters the execution callback
 *
 * Call this function during graceful shutdown to clean up resources.
 *
 * @example
 * ```typescript
 * import { shutdownAskAICron } from '../shared-services/ask-ai';
 *
 * // During server shutdown
 * await shutdownAskAICron();
 * ```
 */
export async function shutdownAskAICron(): Promise<void> {
  const scheduler = CronScheduler.getInstance();

  try {
    // Unschedule the model sync automation
    await scheduler.unscheduleAutomation(ASK_AI_SYNC_AUTOMATION_ID);
    console.log('🛑 Ask-AI: Unscheduled model sync automation');
  } catch (error) {
    console.error('❌ Ask-AI: Error unscheduling model sync:', error);
  }

  // Unregister the execution callback
  scheduler.unregisterExecutionCallback(ASK_AI_PLUGIN_ID);
  console.log('🛑 Ask-AI: Unregistered cron execution callback');
}

/**
 * Manually triggers a model sync.
 *
 * This is a convenience function that wraps `ModelRegistry.syncModels()`.
 * Use this for manual syncing outside of the scheduled cron job.
 *
 * @example
 * ```typescript
 * import { triggerModelSync } from '../shared-services/ask-ai';
 *
 * // Manually sync models
 * await triggerModelSync();
 * ```
 */
export async function triggerModelSync(): Promise<void> {
  const registry = ModelRegistry.getInstance();
  await registry.syncModels();
}
