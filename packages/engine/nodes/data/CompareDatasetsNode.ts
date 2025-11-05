/**
 * CompareDatasetsNode - Universal node for merging and comparing two datasets
 *
 * Provides various join strategies for combining datasets based on field matching:
 * - append: Combine both datasets
 * - keep_matches: Inner join (only matching items)
 * - keep_non_matches: Items only in input1
 * - remove_matches: Anti-join (input1 items without match in input2)
 * - enrich: Add fields from input2 to matching input1 items
 * - choose_branch: Select one input
 *
 * Uses hash join algorithm for efficient matching on large datasets.
 * Supports one-to-many relationships and multiple match fields.
 *
 * @example
 * ```json
 * {
 *   "compare-1": {
 *     "mode": "keep_matches",
 *     "input1": [{"userId": 1, "name": "Alice"}],
 *     "input2": [{"userId": 1, "department": "Engineering"}],
 *     "matchFields": [{"field1": "userId", "field2": "userId"}],
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '../../src/types';
import type { ExecutionContext, EdgeMap } from '../../src/types';

interface MatchField {
  field1: string;
  field2: string;
}

interface CompareDatasetsConfig {
  mode?: 'append' | 'keep_matches' | 'keep_non_matches' | 'remove_matches' | 'enrich' | 'choose_branch';
  input1?: any[];
  input2?: any[];
  input1Fields?: string[];
  input2Fields?: string[];
  matchFields?: MatchField[];
  resolveConflicts?: 'prefer_input1' | 'prefer_input2' | 'merge_arrays';
  selectedBranch?: 'input1' | 'input2';
}

export class CompareDatasetsNode extends WorkflowNode {
  metadata = {
    id: 'compareDatasets',
    name: 'Compare Datasets (Merge)',
    version: '1.0.0',
    description: 'Merge or compare two datasets with various join strategies (inner join, anti-join, enrich, append)',
    inputs: ['mode', 'input1', 'input2', 'matchFields', 'input1Fields', 'input2Fields', 'resolveConflicts', 'selectedBranch'],
    outputs: ['result', 'count', 'matched', 'unmatched'],
    ai_hints: {
      purpose: 'Merge or compare two datasets using various join strategies (inner join, anti-join, enrich, append)',
      when_to_use: 'When you need to combine, filter, or enrich data from two sources based on matching field values',
      expected_edges: ['success', 'no_matches', 'error'],
      example_usage: '{"compare-1": {"mode": "keep_matches", "input1": [{"userId": 1, "name": "Alice"}], "input2": [{"userId": 1, "dept": "Eng"}], "matchFields": [{"field1": "userId", "field2": "userId"}], "success?": "next"}}',
      example_config: '{"mode": "append|keep_matches|keep_non_matches|remove_matches|enrich|choose_branch", "input1": "[object, ...]", "input2": "[object, ...]", "matchFields?": "[{field1: string, field2: string}, ...]", "resolveConflicts?": "prefer_input1|prefer_input2|merge_arrays", "selectedBranch?": "input1|input2"}',
      get_from_state: [],
      post_to_state: ['compareResult', 'compareMetadata']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      mode,
      input1,
      input2,
      input1Fields,
      input2Fields,
      matchFields,
      resolveConflicts,
      selectedBranch
    } = (config as CompareDatasetsConfig) || {};

    // Validate mode
    if (!mode) {
      return {
        error: () => ({
          error: 'Missing required parameter: mode',
          nodeId: context.nodeId
        })
      };
    }

    const validModes = ['append', 'keep_matches', 'keep_non_matches', 'remove_matches', 'enrich', 'choose_branch'];
    if (!validModes.includes(mode)) {
      return {
        error: () => ({
          error: `Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`,
          nodeId: context.nodeId
        })
      };
    }

    // Handle choose_branch mode
    if (mode === 'choose_branch') {
      if (!selectedBranch || (selectedBranch !== 'input1' && selectedBranch !== 'input2')) {
        return {
          error: () => ({
            error: 'choose_branch mode requires selectedBranch to be "input1" or "input2"',
            nodeId: context.nodeId
          })
        };
      }

      const selectedInput = selectedBranch === 'input1' ? input1 : input2;

      if (!selectedInput || !Array.isArray(selectedInput)) {
        return {
          error: () => ({
            error: `${selectedBranch} must be an array`,
            nodeId: context.nodeId
          })
        };
      }

      context.state.compareResult = selectedInput;
      context.state.compareMetadata = {
        mode,
        selectedBranch,
        count: selectedInput.length,
        timestamp: new Date().toISOString()
      };

      return {
        success: () => ({
          result: selectedInput,
          count: selectedInput.length,
          selectedBranch
        })
      };
    }

    // Validate inputs for other modes
    if (!input1 || !Array.isArray(input1)) {
      return {
        error: () => ({
          error: 'input1 must be an array',
          nodeId: context.nodeId
        })
      };
    }

    if (!input2 || !Array.isArray(input2)) {
      return {
        error: () => ({
          error: 'input2 must be an array',
          nodeId: context.nodeId
        })
      };
    }

    try {
      let result: any[];
      let metadata: any = {
        mode,
        input1Count: input1.length,
        input2Count: input2.length,
        timestamp: new Date().toISOString()
      };

      // Handle append mode (no matching required)
      if (mode === 'append') {
        result = [...input1, ...input2];
        metadata.resultCount = result.length;

        context.state.compareResult = result;
        context.state.compareMetadata = metadata;

        return {
          success: () => ({
            result,
            count: result.length
          })
        };
      }

      // For all other modes, we need matchFields
      if (!matchFields || !Array.isArray(matchFields) || matchFields.length === 0) {
        return {
          error: () => ({
            error: `mode "${mode}" requires matchFields to be a non-empty array`,
            nodeId: context.nodeId
          })
        };
      }

      // Validate matchFields structure
      for (const mf of matchFields) {
        if (!mf.field1 || !mf.field2) {
          return {
            error: () => ({
              error: 'Each matchField must have field1 and field2 properties',
              nodeId: context.nodeId,
              invalidMatchField: mf
            })
          };
        }
      }

      // Execute the appropriate merge strategy
      switch (mode) {
        case 'keep_matches':
          result = this.keepMatches(input1, input2, matchFields, input1Fields, input2Fields);
          break;
        case 'keep_non_matches':
          result = this.keepNonMatches(input1, input2, matchFields, input1Fields);
          break;
        case 'remove_matches':
          result = this.removeMatches(input1, input2, matchFields, input1Fields);
          break;
        case 'enrich':
          result = this.enrich(input1, input2, matchFields, input2Fields, resolveConflicts || 'prefer_input1');
          break;
        default:
          return {
            error: () => ({
              error: `Unhandled mode: ${mode}`,
              nodeId: context.nodeId
            })
          };
      }

      metadata.resultCount = result.length;
      metadata.matchedCount = this.countMatches(input1, input2, matchFields);

      context.state.compareResult = result;
      context.state.compareMetadata = metadata;

      // Return no_matches edge if no results for keep_matches mode
      if (mode === 'keep_matches' && result.length === 0) {
        return {
          no_matches: () => ({
            result: [],
            count: 0,
            message: 'No matching items found'
          })
        };
      }

      return {
        success: () => ({
          result,
          count: result.length,
          matched: metadata.matchedCount
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Dataset comparison failed',
          nodeId: context.nodeId,
          mode,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Inner join - keep only items that match in both datasets
   */
  private keepMatches(
    input1: any[],
    input2: any[],
    matchFields: MatchField[],
    input1Fields?: string[],
    input2Fields?: string[]
  ): any[] {
    const result: any[] = [];
    const input2Map = this.buildHashMap(input2, matchFields.map(mf => mf.field2));

    for (const item1 of input1) {
      const key = this.buildKey(item1, matchFields.map(mf => mf.field1));
      const matchingItems = input2Map.get(key);

      if (matchingItems && matchingItems.length > 0) {
        // One-to-many relationship support
        for (const item2 of matchingItems) {
          const merged = this.mergeItems(item1, item2, input1Fields, input2Fields);
          result.push(merged);
        }
      }
    }

    return result;
  }

  /**
   * Keep items from input1 that don't have a match in input2
   */
  private keepNonMatches(
    input1: any[],
    input2: any[],
    matchFields: MatchField[],
    input1Fields?: string[]
  ): any[] {
    const result: any[] = [];
    const input2Map = this.buildHashMap(input2, matchFields.map(mf => mf.field2));

    for (const item1 of input1) {
      const key = this.buildKey(item1, matchFields.map(mf => mf.field1));
      const hasMatch = input2Map.has(key);

      if (!hasMatch) {
        result.push(input1Fields ? this.pickFields(item1, input1Fields) : item1);
      }
    }

    return result;
  }

  /**
   * Anti-join - remove items from input1 that have a match in input2
   */
  private removeMatches(
    input1: any[],
    input2: any[],
    matchFields: MatchField[],
    input1Fields?: string[]
  ): any[] {
    // Same as keepNonMatches
    return this.keepNonMatches(input1, input2, matchFields, input1Fields);
  }

  /**
   * Enrich input1 items with fields from matching input2 items
   */
  private enrich(
    input1: any[],
    input2: any[],
    matchFields: MatchField[],
    input2Fields?: string[],
    resolveConflicts: 'prefer_input1' | 'prefer_input2' | 'merge_arrays' = 'prefer_input1'
  ): any[] {
    const result: any[] = [];
    const input2Map = this.buildHashMap(input2, matchFields.map(mf => mf.field2));

    for (const item1 of input1) {
      const key = this.buildKey(item1, matchFields.map(mf => mf.field1));
      const matchingItems = input2Map.get(key);

      if (matchingItems && matchingItems.length > 0) {
        // Clone item1 to avoid mutation
        const enriched = { ...item1 };

        // For one-to-many, merge all matching items
        for (const item2 of matchingItems) {
          const fieldsToAdd = input2Fields ? this.pickFields(item2, input2Fields) : item2;

          // Resolve conflicts based on strategy
          for (const [key, value] of Object.entries(fieldsToAdd)) {
            if (key in enriched) {
              // Conflict exists
              if (resolveConflicts === 'prefer_input2') {
                enriched[key] = value;
              } else if (resolveConflicts === 'merge_arrays') {
                // Convert to array and merge
                const existing = enriched[key];
                if (Array.isArray(existing)) {
                  if (!existing.includes(value)) {
                    existing.push(value);
                  }
                } else {
                  enriched[key] = [existing, value];
                }
              }
              // prefer_input1 - do nothing
            } else {
              // No conflict - add field
              enriched[key] = value;
            }
          }
        }

        result.push(enriched);
      } else {
        // No match - keep original item
        result.push({ ...item1 });
      }
    }

    return result;
  }

  /**
   * Build a hash map for efficient lookups
   * Uses composite key from multiple fields
   */
  private buildHashMap(items: any[], fields: string[]): Map<string, any[]> {
    const map = new Map<string, any[]>();

    for (const item of items) {
      const key = this.buildKey(item, fields);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(item);
    }

    return map;
  }

  /**
   * Build a composite key from multiple field values
   */
  private buildKey(item: any, fields: string[]): string {
    const values = fields.map(field => {
      const value = this.getNestedValue(item, field);
      // Handle null/undefined consistently
      return value === null ? '__NULL__' : value === undefined ? '__UNDEFINED__' : String(value);
    });

    return values.join('|||');
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
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
   * Merge two items, combining fields from both
   */
  private mergeItems(
    item1: any,
    item2: any,
    input1Fields?: string[],
    input2Fields?: string[]
  ): any {
    const fields1 = input1Fields ? this.pickFields(item1, input1Fields) : item1;
    const fields2 = input2Fields ? this.pickFields(item2, input2Fields) : item2;

    // Merge with input2 fields overwriting input1 in case of conflicts
    return { ...fields1, ...fields2 };
  }

  /**
   * Pick specific fields from an object
   */
  private pickFields(obj: any, fields: string[]): any {
    const result: any = {};

    for (const field of fields) {
      const value = this.getNestedValue(obj, field);
      if (value !== undefined) {
        // Set the value at the same path
        this.setNestedValue(result, field.split('.'), value);
      }
    }

    return result;
  }

  /**
   * Set nested value in object using path segments
   */
  private setNestedValue(obj: any, segments: string[], value: any): void {
    let current = obj;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;

      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {};
      }

      current = current[segment];
    }

    current[segments[segments.length - 1]!] = value;
  }

  /**
   * Count how many items from input1 have matches in input2
   */
  private countMatches(input1: any[], input2: any[], matchFields: MatchField[]): number {
    const input2Map = this.buildHashMap(input2, matchFields.map(mf => mf.field2));
    let count = 0;

    for (const item1 of input1) {
      const key = this.buildKey(item1, matchFields.map(mf => mf.field1));
      if (input2Map.has(key)) {
        count++;
      }
    }

    return count;
  }
}

export default CompareDatasetsNode;
