/**
 * Multi-Outcome Node Template
 *
 * Pattern: Multiple conditional edges (e.g., high/medium/low/error)
 * Use case: Categorization, scoring, or multi-branch routing
 *
 * INSTRUCTIONS:
 * 1. Replace [NodeName] with your node class name (PascalCase)
 * 2. Replace [nodeId] with unique identifier (camelCase or kebab-case)
 * 3. Define your outcome categories
 * 4. Implement the categorization logic
 * 5. Export in /packages/nodes/src/index.ts
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface
interface [NodeName]Config {
  value: number | string;
  thresholds?: {
    high?: number;
    medium?: number;
    low?: number;
  };
  customCategories?: Record<string, unknown>;
}

// Define outcome types for type safety
type Outcome = 'high' | 'medium' | 'low' | 'zero_or_negative' | 'unknown' | 'error';

/**
 * [NodeName] - Categorizes input and routes to multiple possible outcomes
 *
 * Evaluates input against thresholds or categories and routes
 * to the appropriate edge. Each execution returns exactly ONE edge.
 *
 * @example
 * ```json
 * {
 *   "[nodeId]-1": {
 *     "value": "$.score",
 *     "thresholds": { "high": 80, "medium": 50 },
 *     "high?": "send-premium",
 *     "medium?": "send-standard",
 *     "low?": "send-basic",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 */
export class [NodeName] extends WorkflowNode {
  metadata = {
    id: '[nodeId]',
    name: '[Node Name]',
    version: '1.0.0',
    description: 'Categorizes input and routes to multiple possible outcomes',
    inputs: ['value', 'thresholds', 'customCategories'],
    outputs: ['category', 'value'],
    ai_hints: {
      purpose: 'Categorize values and route to multiple outcome paths',
      when_to_use: 'When you need to route workflow based on value categories or scoring',
      expected_edges: ['high', 'medium', 'low', 'zero_or_negative', 'unknown', 'error'],
      example_usage: '{"[nodeId]-1": {"value": "$.score", "high?": "premium", "medium?": "standard", "low?": "basic"}}',
      example_config: '{"value": "number|string", "thresholds?": {"high": 80, "medium": 50}, "customCategories?": "object"}',
      get_from_state: [],
      post_to_state: ['[nodeId]Category', '[nodeId]Value']
    }
  };

  // Default thresholds
  private readonly defaultThresholds = {
    high: 100,
    medium: 50,
    low: 0
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { value, thresholds, customCategories } = (config as [NodeName]Config) || {};

    // ============================================
    // VALIDATION
    // ============================================
    if (value === undefined) {
      return {
        error: () => ({
          error: 'Missing required parameter: value',
          nodeId: context.nodeId
        })
      };
    }

    // ============================================
    // BUSINESS LOGIC - Determine category
    // ============================================
    try {
      const outcome = this.categorize(value, thresholds, customCategories);

      // Store in state
      context.state.[nodeId]Category = outcome.category;
      context.state.[nodeId]Value = value;

      // ============================================
      // RETURN SINGLE APPROPRIATE EDGE
      // ============================================
      return this.createEdgeResult(outcome);

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Categorization failed',
          nodeId: context.nodeId,
          value
        })
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private categorize(
    value: number | string,
    thresholds?: [NodeName]Config['thresholds'],
    customCategories?: Record<string, unknown>
  ): { category: Outcome; value: number | string } {
    // Handle custom categories for string values
    if (customCategories && typeof value === 'string') {
      for (const [category, match] of Object.entries(customCategories)) {
        if (value === match || (Array.isArray(match) && match.includes(value))) {
          return { category: category as Outcome, value };
        }
      }
      return { category: 'unknown', value };
    }

    // Handle numeric values with thresholds
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));

    if (isNaN(numValue)) {
      return { category: 'unknown', value };
    }

    const t = { ...this.defaultThresholds, ...thresholds };

    if (numValue > t.high) {
      return { category: 'high', value: numValue };
    } else if (numValue > t.medium) {
      return { category: 'medium', value: numValue };
    } else if (numValue > t.low) {
      return { category: 'low', value: numValue };
    } else {
      return { category: 'zero_or_negative', value: numValue };
    }
  }

  private createEdgeResult(outcome: { category: Outcome; value: number | string }): EdgeMap {
    const edgeData = () => ({
      category: outcome.category,
      value: outcome.value
    });

    // Return SINGLE edge based on category
    switch (outcome.category) {
      case 'high':
        return { high: edgeData };
      case 'medium':
        return { medium: edgeData };
      case 'low':
        return { low: edgeData };
      case 'zero_or_negative':
        return { zero_or_negative: edgeData };
      case 'unknown':
        return { unknown: edgeData };
      default:
        return {
          error: () => ({
            error: `Unexpected category: ${outcome.category}`,
            value: outcome.value
          })
        };
    }
  }
}

export default [NodeName];
