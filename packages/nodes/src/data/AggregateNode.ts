import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * AggregateNode - Combine multiple items into a single item with grouped data
 *
 * This universal node aggregates data from multiple items into a single output item.
 * It supports two modes:
 * 1. Individual Fields: Collect specific fields into arrays
 * 2. All Data: Collect all items into a single array
 *
 * The node handles missing fields gracefully and supports array merging for nested lists.
 *
 * @example Individual Fields Mode
 * ```json
 * {
 *   "aggregate-1": {
 *     "mode": "individual_fields",
 *     "fields": [
 *       {"inputFieldName": "name", "outputFieldName": "names"},
 *       {"inputFieldName": "email", "outputFieldName": "emails"}
 *     ],
 *     "success?": "next-node"
 *   }
 * }
 * ```
 *
 * @example All Data Mode
 * ```json
 * {
 *   "aggregate-2": {
 *     "mode": "all_data",
 *     "outputField": "data",
 *     "success?": "process-data"
 *   }
 * }
 * ```
 */
export class AggregateNode extends WorkflowNode {
  metadata = {
    id: 'aggregate',
    name: 'Aggregate Node',
    version: '1.0.0',
    description: 'Combine multiple items into a single item with grouped data',
    inputs: ['mode', 'fields', 'outputField', 'includeBinaries', 'keepMissingValues'],
    outputs: ['aggregatedData', 'itemCount'],
    ai_hints: {
      purpose: 'Combine multiple items into a single item with grouped data arrays',
      when_to_use: 'When you need to collect data from multiple items into arrays or aggregate all items into a single collection',
      expected_edges: ['success', 'empty', 'error'],
      example_usage: '{"aggregate-1": {"mode": "individual_fields", "fields": [{"inputFieldName": "name", "outputFieldName": "names"}], "success?": "next-node"}}',
      example_config: '{"mode": "individual_fields|all_data", "fields": "[{inputFieldName: string, outputFieldName?: string, mergeLists?: boolean}]", "outputField?": "string", "includeBinaries?": "boolean", "keepMissingValues?": "boolean"}',
      get_from_state: [],
      post_to_state: ['aggregatedData', 'itemCount']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
      const {
        mode = 'all_data',
        fields = [],
        outputField = 'data',
        includeBinaries = false,
        keepMissingValues = false
      } = config || {};

      // Validate mode
      if (mode !== 'individual_fields' && mode !== 'all_data') {
        return {
          error: () => ({
            error: `Invalid mode: ${mode}. Must be "individual_fields" or "all_data"`,
            nodeId: context.nodeId
          })
        };
      }

      // Get items from context inputs - expecting an array
      const items = context.inputs.items || [];

      // Handle empty items
      if (!Array.isArray(items) || items.length === 0) {
        context.state.aggregatedData = mode === 'all_data' ? { [outputField]: [] } : {};
        context.state.itemCount = 0;

        return {
          empty: () => ({
            aggregatedData: context.state.aggregatedData,
            itemCount: 0,
            message: 'No items to aggregate'
          })
        };
      }

      // Perform aggregation based on mode
      let result: any;

      if (mode === 'individual_fields') {
        result = this.aggregateIndividualFields(items, fields, keepMissingValues, includeBinaries);
      } else {
        // all_data mode
        result = this.aggregateAllData(items, outputField, includeBinaries);
      }

      // Store results in state
      context.state.aggregatedData = result;
      context.state.itemCount = items.length;

      return {
        success: () => ({
          aggregatedData: result,
          itemCount: items.length,
          mode
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Aggregation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Aggregate specific fields from items into arrays
   * @private
   */
  private aggregateIndividualFields(
    items: any[],
    fields: Array<{ inputFieldName: string; outputFieldName?: string; mergeLists?: boolean }>,
    keepMissingValues: boolean,
    includeBinaries: boolean
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // Validate fields configuration
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error('Fields configuration is required for individual_fields mode');
    }

    // Process each field configuration
    for (const fieldConfig of fields) {
      const { inputFieldName, outputFieldName, mergeLists = false } = fieldConfig;

      if (!inputFieldName) {
        throw new Error('inputFieldName is required for each field configuration');
      }

      const fieldName = outputFieldName || inputFieldName;
      const values: any[] = [];

      // Collect values from all items
      for (const item of items) {
        const value = this.getNestedValue(item, inputFieldName);

        if (value === undefined) {
          // Handle missing values
          if (keepMissingValues) {
            values.push(null);
          }
          // Otherwise, skip this value
        } else if (mergeLists && Array.isArray(value)) {
          // If mergeLists is true and value is array, flatten it
          values.push(...value);
        } else {
          values.push(value);
        }
      }

      result[fieldName] = values;
    }

    // Handle binary data if requested
    if (includeBinaries) {
      const binaries: any[] = [];
      for (const item of items) {
        if (item._binary) {
          binaries.push(item._binary);
        }
      }
      if (binaries.length > 0) {
        result._binaries = binaries;
      }
    }

    return result;
  }

  /**
   * Aggregate all item data into a single array
   * @private
   */
  private aggregateAllData(
    items: any[],
    outputField: string,
    includeBinaries: boolean
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // Filter items to exclude binary data if needed
    const processedItems = items.map(item => {
      if (!includeBinaries && item._binary) {
        const { _binary, ...itemWithoutBinary } = item;
        return itemWithoutBinary;
      }
      return item;
    });

    result[outputField] = processedItems;

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;

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
}

export default AggregateNode;
