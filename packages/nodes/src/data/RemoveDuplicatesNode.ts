import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * RemoveDuplicatesNode - Identify and remove duplicate items based on field comparison
 *
 * This node supports multiple comparison modes and can maintain deduplication history
 * across workflow executions. It efficiently identifies duplicates using Maps and Sets
 * for optimal performance.
 *
 * **Comparison Modes:**
 * - `all_fields`: Compare all fields in items
 * - `all_except`: Compare all fields except those in `fieldsToExclude`
 * - `selected_fields`: Compare only fields in `fieldsToCompare`
 *
 * **Operations:**
 * - `current_input`: Deduplicate within current input items only
 * - `previous_executions`: Check against history from previous executions
 * - `clear_history`: Clear deduplication history
 *
 * @example
 * ```json
 * {
 *   "dedupe-1": {
 *     "operation": "current_input",
 *     "compareMode": "selected_fields",
 *     "fieldsToCompare": ["email"],
 *     "kept?": "process-unique",
 *     "discarded?": "log-duplicates"
 *   }
 * }
 * ```
 */
export class RemoveDuplicatesNode extends WorkflowNode {
  metadata = {
    id: 'removeDuplicates',
    name: 'Remove Duplicates',
    version: '1.0.0',
    description: 'Identify and remove duplicate items based on field comparison with optional history tracking',
    inputs: ['operation', 'compareMode', 'fieldsToCompare', 'fieldsToExclude', 'removeOtherFields', 'disableDotNotation', 'scope', 'historySize'],
    outputs: ['kept', 'discarded', 'keptCount', 'discardedCount'],
    ai_hints: {
      purpose: 'Remove duplicate items from datasets based on configurable field comparison strategies',
      when_to_use: 'When you need to deduplicate items by specific fields, maintain unique records, or track duplicates across workflow executions',
      expected_edges: ['kept', 'discarded', 'cleared', 'error'],
      example_usage: '{"dedupe-1": {"operation": "current_input", "compareMode": "selected_fields", "fieldsToCompare": ["email"], "kept?": "process-unique"}}',
      example_config: '{"operation": "current_input|previous_executions|clear_history", "compareMode": "all_fields|all_except|selected_fields", "fieldsToCompare": "[string, ...]", "fieldsToExclude?": "[string, ...]", "removeOtherFields?": "boolean", "disableDotNotation?": "boolean", "historySize?": "number"}',
      get_from_state: ['_deduplicationHistory'],
      post_to_state: ['keptItems', 'discardedItems', 'deduplicationSummary', '_deduplicationHistory']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const {
      operation = 'current_input',
      compareMode = 'all_fields',
      fieldsToCompare = [],
      fieldsToExclude = [],
      removeOtherFields = false,
      disableDotNotation = false,
      scope = 'node',
      historySize = 1000
    } = config || {};

    try {
      // Handle clear_history operation
      if (operation === 'clear_history') {
        context.state._deduplicationHistory = {
          items: [],
          nodeId: context.nodeId,
          workflowId: context.workflowId
        };

        return {
          cleared: () => ({
            message: 'Deduplication history cleared',
            scope: scope
          })
        };
      }

      // Get items from context inputs
      const items = context.inputs?.items || [];

      if (!Array.isArray(items)) {
        return {
          error: () => ({
            error: 'Input items must be an array',
            received: typeof items
          })
        };
      }

      // Validate configuration based on compareMode
      if (compareMode === 'selected_fields' && (!fieldsToCompare || fieldsToCompare.length === 0)) {
        return {
          error: () => ({
            error: 'fieldsToCompare is required when compareMode is "selected_fields"',
            compareMode
          })
        };
      }

      if (compareMode === 'all_except' && (!fieldsToExclude || fieldsToExclude.length === 0)) {
        return {
          error: () => ({
            error: 'fieldsToExclude is required when compareMode is "all_except"',
            compareMode
          })
        };
      }

      // Initialize or retrieve history
      let history: any[] = [];
      if (operation === 'previous_executions') {
        const historyKey = scope === 'workflow'
          ? `_dedup_${context.workflowId}`
          : `_dedup_${context.nodeId}`;

        if (!context.state._deduplicationHistory) {
          context.state._deduplicationHistory = {};
        }

        history = context.state._deduplicationHistory[historyKey] || [];
      }

      // Process items
      const kept: any[] = [];
      const discarded: any[] = [];
      const seenHashes = new Set<string>();

      // Add history items to seen hashes
      for (const historyItem of history) {
        const hash = this.getItemHash(historyItem, compareMode, fieldsToCompare, fieldsToExclude, disableDotNotation);
        seenHashes.add(hash);
      }

      // Process current items
      for (const item of items) {
        const hash = this.getItemHash(item, compareMode, fieldsToCompare, fieldsToExclude, disableDotNotation);

        if (seenHashes.has(hash)) {
          // Duplicate found
          discarded.push(item);
        } else {
          // Unique item
          seenHashes.add(hash);

          // Apply field filtering if removeOtherFields is true
          if (removeOtherFields && compareMode !== 'all_fields') {
            const filteredItem = this.filterFields(item, compareMode, fieldsToCompare, fieldsToExclude);
            kept.push(filteredItem);
          } else {
            kept.push(item);
          }
        }
      }

      // Update history if using previous_executions
      if (operation === 'previous_executions') {
        const historyKey = scope === 'workflow'
          ? `_dedup_${context.workflowId}`
          : `_dedup_${context.nodeId}`;

        // Combine new kept items with existing history, respecting historySize limit
        const updatedHistory = [...history, ...kept].slice(-historySize);
        context.state._deduplicationHistory[historyKey] = updatedHistory;
      }

      // Store results in state
      context.state.keptItems = kept;
      context.state.discardedItems = discarded;
      context.state.deduplicationSummary = {
        totalItems: items.length,
        keptCount: kept.length,
        discardedCount: discarded.length,
        operation,
        compareMode,
        timestamp: new Date().toISOString()
      };

      // Return appropriate edge based on results
      if (kept.length > 0 && discarded.length > 0) {
        return {
          kept: () => ({
            items: kept,
            keptCount: kept.length,
            discardedCount: discarded.length
          }),
          discarded: () => ({
            items: discarded,
            discardedCount: discarded.length
          })
        };
      } else if (kept.length > 0) {
        return {
          kept: () => ({
            items: kept,
            keptCount: kept.length,
            discardedCount: 0
          })
        };
      } else {
        return {
          discarded: () => ({
            items: discarded,
            discardedCount: discarded.length
          })
        };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Remove duplicates operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Generate a hash for an item based on comparison configuration
   *
   * @param item - The item to hash
   * @param compareMode - Comparison mode (all_fields, all_except, selected_fields)
   * @param fieldsToCompare - Fields to include in comparison (for selected_fields mode)
   * @param fieldsToExclude - Fields to exclude from comparison (for all_except mode)
   * @param disableDotNotation - Whether to disable dot notation for nested field access
   * @returns Hash string representing the item for comparison
   */
  private getItemHash(
    item: any,
    compareMode: string,
    fieldsToCompare: string[],
    fieldsToExclude: string[],
    disableDotNotation: boolean
  ): string {
    if (!item || typeof item !== 'object') {
      return JSON.stringify(item);
    }

    let fieldsToUse: string[] = [];

    switch (compareMode) {
      case 'all_fields':
        // Use all fields from the item
        fieldsToUse = Object.keys(item);
        break;

      case 'all_except':
        // Use all fields except those in fieldsToExclude
        fieldsToUse = Object.keys(item).filter(key => !fieldsToExclude.includes(key));
        break;

      case 'selected_fields':
        // Use only specified fields
        fieldsToUse = fieldsToCompare;
        break;

      default:
        fieldsToUse = Object.keys(item);
    }

    // Build comparison object with selected fields
    const comparisonObj: Record<string, any> = {};

    for (const field of fieldsToUse) {
      const value = disableDotNotation
        ? item[field]
        : this.getNestedValue(item, field);

      comparisonObj[field] = value;
    }

    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(comparisonObj).sort();
    const sortedObj: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = comparisonObj[key];
    }

    return JSON.stringify(sortedObj);
  }

  /**
   * Get a nested value from an object using dot notation
   *
   * @param obj - The object to extract from
   * @param path - Dot-notation path (e.g., "user.profile.name")
   * @returns The value at the path, or undefined if not found
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Filter fields from an item based on comparison configuration
   *
   * @param item - The item to filter
   * @param compareMode - Comparison mode
   * @param fieldsToCompare - Fields to keep (for selected_fields mode)
   * @param fieldsToExclude - Fields to exclude (for all_except mode)
   * @returns Filtered item with only specified fields
   */
  private filterFields(
    item: any,
    compareMode: string,
    fieldsToCompare: string[],
    fieldsToExclude: string[]
  ): any {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const filtered: Record<string, any> = {};

    switch (compareMode) {
      case 'all_except':
        // Keep all fields except those in fieldsToExclude
        for (const key of Object.keys(item)) {
          if (!fieldsToExclude.includes(key)) {
            filtered[key] = item[key];
          }
        }
        break;

      case 'selected_fields':
        // Keep only fields in fieldsToCompare
        for (const field of fieldsToCompare) {
          if (field in item) {
            filtered[field] = item[field];
          }
        }
        break;

      default:
        return item;
    }

    return filtered;
  }
}

export default RemoveDuplicatesNode;
