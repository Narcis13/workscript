import { WorkflowNode } from '../../src/types/index';
/**
 * SummarizeNode - Aggregate data similar to Excel pivot tables
 *
 * This node performs complex data aggregations with grouping capabilities,
 * similar to SQL GROUP BY or Excel pivot tables. It can aggregate multiple
 * fields using different aggregation functions (sum, average, count, etc.)
 * and group results by one or more fields.
 *
 * @example
 * ```json
 * {
 *   "summarize-1": {
 *     "fieldsToSummarize": [
 *       {
 *         "fieldToAggregate": "sales",
 *         "aggregation": "sum",
 *         "outputFieldName": "totalSales"
 *       },
 *       {
 *         "fieldToAggregate": "quantity",
 *         "aggregation": "average",
 *         "outputFieldName": "avgQuantity"
 *       }
 *     ],
 *     "fieldsToSplitBy": ["region", "product"],
 *     "outputFormat": "separate_items",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
export class SummarizeNode extends WorkflowNode {
    metadata = {
        id: 'summarize',
        name: 'Summarize (Pivot)',
        version: '1.0.0',
        description: 'Aggregate data similar to Excel pivot tables - group by fields and perform aggregations (sum, average, count, etc.)',
        inputs: ['fieldsToSummarize', 'fieldsToSplitBy', 'outputFormat', 'disableDotNotation', 'skipMissingFields'],
        outputs: ['result', 'summary', 'groups'],
        ai_hints: {
            purpose: 'Aggregate and summarize data with grouping, similar to Excel pivot tables or SQL GROUP BY',
            when_to_use: 'When you need to calculate totals, averages, counts, or other aggregations across grouped data',
            expected_edges: ['success', 'error'],
            example_usage: '{"summarize-1": {"fieldsToSummarize": [{"fieldToAggregate": "sales", "aggregation": "sum", "outputFieldName": "totalSales"}], "fieldsToSplitBy": ["region"], "success?": "next-node"}}',
            example_config: '{"fieldsToSummarize": "[{fieldToAggregate: string, aggregation: append|average|concatenate|count|countUnique|max|min|sum, outputFieldName: string, separator?: string, includeEmptyValues?: boolean}]", "fieldsToSplitBy?": "[string, ...]", "outputFormat?": "separate_items|single_item", "disableDotNotation?": "boolean", "skipMissingFields?": "boolean"}',
            get_from_state: [],
            post_to_state: ['summarizeResult', 'summarizeGroups', 'summarizeMetadata']
        }
    };
    async execute(context, config) {
        try {
            const { fieldsToSummarize, fieldsToSplitBy = [], outputFormat = 'separate_items', disableDotNotation = false, skipMissingFields = false } = config || {};
            // Validation
            if (!fieldsToSummarize || !Array.isArray(fieldsToSummarize) || fieldsToSummarize.length === 0) {
                return {
                    error: () => ({
                        error: 'Missing or invalid fieldsToSummarize parameter',
                        expected: 'Array of field aggregation configurations',
                        received: typeof fieldsToSummarize,
                        nodeId: context.nodeId
                    })
                };
            }
            // Validate each field configuration
            for (const field of fieldsToSummarize) {
                if (!field.fieldToAggregate || !field.aggregation || !field.outputFieldName) {
                    return {
                        error: () => ({
                            error: 'Invalid field configuration: fieldToAggregate, aggregation, and outputFieldName are required',
                            field,
                            nodeId: context.nodeId
                        })
                    };
                }
                // Validate aggregation type
                const validAggregations = [
                    'append', 'average', 'concatenate', 'count', 'countUnique', 'max', 'min', 'sum'
                ];
                if (!validAggregations.includes(field.aggregation)) {
                    return {
                        error: () => ({
                            error: `Invalid aggregation type: ${field.aggregation}`,
                            valid: validAggregations,
                            nodeId: context.nodeId
                        })
                    };
                }
            }
            // Get items from context.inputs (should be an array of items)
            const items = context.inputs.items || [];
            if (!Array.isArray(items)) {
                return {
                    error: () => ({
                        error: 'Input items must be an array',
                        received: typeof items,
                        nodeId: context.nodeId
                    })
                };
            }
            if (items.length === 0) {
                // Empty array - return empty result
                context.state.summarizeResult = outputFormat === 'single_item' ? {} : [];
                context.state.summarizeGroups = [];
                context.state.summarizeMetadata = {
                    itemCount: 0,
                    groupCount: 0,
                    timestamp: new Date().toISOString()
                };
                return {
                    success: () => ({
                        result: context.state.summarizeResult,
                        groups: [],
                        itemCount: 0
                    })
                };
            }
            // Perform aggregation
            const result = this.performAggregation(items, fieldsToSummarize, fieldsToSplitBy, outputFormat, disableDotNotation, skipMissingFields);
            // Store results in state
            context.state.summarizeResult = result.data;
            context.state.summarizeGroups = result.groups;
            context.state.summarizeMetadata = {
                itemCount: items.length,
                groupCount: result.groups.length,
                timestamp: new Date().toISOString(),
                fieldsAggregated: fieldsToSummarize.map(f => f.fieldToAggregate),
                groupedBy: fieldsToSplitBy
            };
            return {
                success: () => ({
                    result: result.data,
                    groups: result.groups,
                    itemCount: items.length,
                    groupCount: result.groups.length
                })
            };
        }
        catch (error) {
            return {
                error: () => ({
                    error: error instanceof Error ? error.message : 'Summarization failed',
                    nodeId: context.nodeId,
                    details: error instanceof Error ? error.stack : undefined
                })
            };
        }
    }
    /**
     * Perform aggregation on items with optional grouping
     */
    performAggregation(items, fieldsToSummarize, fieldsToSplitBy, outputFormat, disableDotNotation, skipMissingFields) {
        // If no grouping fields, aggregate all items together
        if (!fieldsToSplitBy || fieldsToSplitBy.length === 0) {
            const aggregated = this.aggregateGroup(items, fieldsToSummarize, disableDotNotation);
            if (outputFormat === 'single_item') {
                return { data: aggregated, groups: ['all'] };
            }
            else {
                return { data: [aggregated], groups: ['all'] };
            }
        }
        // Group items by specified fields
        const groups = new Map();
        const groupKeys = [];
        for (const item of items) {
            // Create group key from split fields
            const keyParts = [];
            let skipItem = false;
            for (const field of fieldsToSplitBy) {
                const value = this.getFieldValue(item, field, disableDotNotation);
                if (value === undefined || value === null) {
                    if (skipMissingFields) {
                        skipItem = true;
                        break;
                    }
                    keyParts.push('__null__');
                }
                else {
                    keyParts.push(String(value));
                }
            }
            if (skipItem)
                continue;
            const groupKey = keyParts.join('::');
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
                groupKeys.push(groupKey);
            }
            groups.get(groupKey).push(item);
        }
        // Aggregate each group
        const results = [];
        for (const [groupKey, groupItems] of groups.entries()) {
            const aggregated = this.aggregateGroup(groupItems, fieldsToSummarize, disableDotNotation);
            // Add group-by fields to the result
            const keyParts = groupKey.split('::');
            for (let i = 0; i < fieldsToSplitBy.length; i++) {
                const fieldName = fieldsToSplitBy[i];
                const value = keyParts[i] === '__null__' ? null : keyParts[i];
                aggregated[fieldName] = value;
            }
            results.push(aggregated);
        }
        if (outputFormat === 'single_item') {
            // Return a single object with all groups
            return {
                data: {
                    groups: results,
                    groupCount: results.length,
                    totalItems: items.length
                },
                groups: groupKeys
            };
        }
        else {
            // Return separate items for each group
            return { data: results, groups: groupKeys };
        }
    }
    /**
     * Aggregate a group of items based on field configurations
     */
    aggregateGroup(items, fieldsToSummarize, disableDotNotation) {
        const result = {};
        for (const fieldConfig of fieldsToSummarize) {
            const { fieldToAggregate, aggregation, outputFieldName, separator = ', ', includeEmptyValues = false } = fieldConfig;
            // Extract values for this field from all items
            const values = [];
            for (const item of items) {
                const value = this.getFieldValue(item, fieldToAggregate, disableDotNotation);
                if (value !== undefined && value !== null) {
                    values.push(value);
                }
                else if (includeEmptyValues) {
                    values.push(null);
                }
            }
            // Perform aggregation
            result[outputFieldName] = this.aggregate(values, aggregation, separator);
        }
        // Add item count to result
        result._itemCount = items.length;
        return result;
    }
    /**
     * Perform specific aggregation operation on values
     */
    aggregate(values, aggregation, separator) {
        switch (aggregation) {
            case 'append':
                return this.aggregateAppend(values);
            case 'average':
                return this.aggregateAverage(values);
            case 'concatenate':
                return this.aggregateConcatenate(values, separator);
            case 'count':
                return this.aggregateCount(values);
            case 'countUnique':
                return this.aggregateCountUnique(values);
            case 'max':
                return this.aggregateMax(values);
            case 'min':
                return this.aggregateMin(values);
            case 'sum':
                return this.aggregateSum(values);
            default:
                throw new Error(`Unknown aggregation type: ${aggregation}`);
        }
    }
    /**
     * Aggregation: Append - collect all values into an array
     */
    aggregateAppend(values) {
        return values;
    }
    /**
     * Aggregation: Average - calculate mean of numeric values
     */
    aggregateAverage(values) {
        const numericValues = values
            .filter(v => v !== null && v !== undefined)
            .map(v => Number(v))
            .filter(v => !isNaN(v));
        if (numericValues.length === 0)
            return null;
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        return sum / numericValues.length;
    }
    /**
     * Aggregation: Concatenate - join string values with separator
     */
    aggregateConcatenate(values, separator) {
        return values
            .filter(v => v !== null && v !== undefined)
            .map(v => String(v))
            .join(separator);
    }
    /**
     * Aggregation: Count - count all items in group (including nulls)
     */
    aggregateCount(values) {
        return values.length;
    }
    /**
     * Aggregation: Count Unique - count unique values only
     */
    aggregateCountUnique(values) {
        const unique = new Set(values
            .filter(v => v !== null && v !== undefined)
            .map(v => JSON.stringify(v)));
        return unique.size;
    }
    /**
     * Aggregation: Max - find maximum value
     */
    aggregateMax(values) {
        const numericValues = values
            .filter(v => v !== null && v !== undefined)
            .map(v => Number(v))
            .filter(v => !isNaN(v));
        if (numericValues.length === 0)
            return null;
        return Math.max(...numericValues);
    }
    /**
     * Aggregation: Min - find minimum value
     */
    aggregateMin(values) {
        const numericValues = values
            .filter(v => v !== null && v !== undefined)
            .map(v => Number(v))
            .filter(v => !isNaN(v));
        if (numericValues.length === 0)
            return null;
        return Math.min(...numericValues);
    }
    /**
     * Aggregation: Sum - sum all numeric values
     */
    aggregateSum(values) {
        const numericValues = values
            .filter(v => v !== null && v !== undefined)
            .map(v => Number(v))
            .filter(v => !isNaN(v));
        return numericValues.reduce((acc, val) => acc + val, 0);
    }
    /**
     * Get field value from object, supporting dot notation
     */
    getFieldValue(obj, fieldPath, disableDotNotation) {
        if (disableDotNotation) {
            return obj[fieldPath];
        }
        const keys = fieldPath.split('.');
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
export default SummarizeNode;
