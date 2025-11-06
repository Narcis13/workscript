import { WorkflowNode } from '../../src/types';
/**
 * TransformObjectNode - Universal node for object transformations
 *
 * Performs various object transformation operations:
 * - flatten: Convert nested object to flat structure with dot notation keys
 * - unflatten: Convert flat object with dot notation keys to nested structure
 * - pick: Extract only specified keys from object
 * - omit: Remove specified keys from object
 * - renameKeys: Rename object keys using a mapping
 *
 * @example
 * ```json
 * {
 *   "transform-1": {
 *     "operation": "flatten",
 *     "separator": ".",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
export class TransformObjectNode extends WorkflowNode {
    metadata = {
        id: 'transformObject',
        name: 'Transform Object',
        version: '1.0.0',
        description: 'Universal node for object transformations (flatten, unflatten, pick, omit, renameKeys)',
        inputs: ['operation', 'separator', 'depth', 'keys', 'renameMap', 'recursive'],
        outputs: ['result'],
        ai_hints: {
            purpose: 'Perform various object transformations including flatten, unflatten, pick, omit, and renameKeys',
            when_to_use: 'When you need to restructure objects, extract specific fields, or rename keys in workflow data',
            expected_edges: ['success', 'error'],
            example_usage: '{"transform-1": {"operation": "flatten", "separator": ".", "success?": "next-node"}}',
            example_config: '{"operation": "flatten|unflatten|pick|omit|renameKeys", "separator?": "string", "depth?": "number", "keys?": "[string, ...]", "renameMap?": "{oldKey: newKey}", "recursive?": "boolean"}',
            get_from_state: [],
            post_to_state: ['transformedObject']
        }
    };
    async execute(context, config) {
        const { operation, separator = '.', depth, keys, renameMap, recursive = false } = config || {};
        // Validation
        if (!operation) {
            return {
                error: () => ({
                    error: 'Missing required parameter: operation',
                    nodeId: context.nodeId
                })
            };
        }
        // Get the data to transform from inputs
        const inputData = context.inputs.data !== undefined ? context.inputs.data : context.state;
        if (inputData === null || inputData === undefined) {
            return {
                error: () => ({
                    error: 'No data available to transform',
                    nodeId: context.nodeId
                })
            };
        }
        try {
            let result;
            switch (operation) {
                case 'flatten':
                    result = this.flatten(inputData, separator, depth);
                    break;
                case 'unflatten':
                    result = this.unflatten(inputData, separator);
                    break;
                case 'pick':
                    if (!keys || !Array.isArray(keys)) {
                        return {
                            error: () => ({
                                error: 'Missing or invalid keys parameter for pick operation',
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.pick(inputData, keys, recursive);
                    break;
                case 'omit':
                    if (!keys || !Array.isArray(keys)) {
                        return {
                            error: () => ({
                                error: 'Missing or invalid keys parameter for omit operation',
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.omit(inputData, keys, recursive);
                    break;
                case 'renameKeys':
                    if (!renameMap || typeof renameMap !== 'object') {
                        return {
                            error: () => ({
                                error: 'Missing or invalid renameMap parameter for renameKeys operation',
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.renameKeys(inputData, renameMap, recursive);
                    break;
                default:
                    return {
                        error: () => ({
                            error: `Unknown operation: ${operation}`,
                            supportedOperations: ['flatten', 'unflatten', 'pick', 'omit', 'renameKeys'],
                            nodeId: context.nodeId
                        })
                    };
            }
            // Store in state
            context.state.transformedObject = result;
            return {
                success: () => ({
                    result,
                    operation,
                    message: `Successfully applied ${operation} transformation`
                })
            };
        }
        catch (error) {
            return {
                error: () => ({
                    error: error instanceof Error ? error.message : 'Object transformation failed',
                    operation,
                    nodeId: context.nodeId,
                    details: error instanceof Error ? error.stack : undefined
                })
            };
        }
    }
    /**
     * Flatten a nested object into a single-level object with dot notation keys
     */
    flatten(obj, separator = '.', maxDepth, currentDepth = 0, prefix = '') {
        const result = {};
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }
        // Check if we've reached max depth
        if (maxDepth !== undefined && currentDepth >= maxDepth) {
            return obj;
        }
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}${separator}${key}` : key;
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively flatten nested objects
                const flattened = this.flatten(value, separator, maxDepth, currentDepth + 1, newKey);
                Object.assign(result, flattened);
            }
            else {
                result[newKey] = value;
            }
        }
        return result;
    }
    /**
     * Unflatten a flat object with dot notation keys into a nested structure
     */
    unflatten(obj, separator = '.') {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }
        const result = {};
        for (const [flatKey, value] of Object.entries(obj)) {
            const keys = flatKey.split(separator);
            let current = result;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const isLast = i === keys.length - 1;
                if (isLast) {
                    current[key] = value;
                }
                else {
                    // Create intermediate object if it doesn't exist
                    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
                        current[key] = {};
                    }
                    current = current[key];
                }
            }
        }
        return result;
    }
    /**
     * Pick only specified keys from object
     */
    pick(obj, keys, recursive = false) {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }
        const result = {};
        for (const key of keys) {
            if (key in obj) {
                if (recursive && obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    result[key] = this.pick(obj[key], keys, recursive);
                }
                else {
                    result[key] = obj[key];
                }
            }
        }
        return result;
    }
    /**
     * Omit specified keys from object
     */
    omit(obj, keys, recursive = false) {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }
        const result = {};
        const keysSet = new Set(keys);
        for (const [key, value] of Object.entries(obj)) {
            if (!keysSet.has(key)) {
                if (recursive && value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    result[key] = this.omit(value, keys, recursive);
                }
                else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    /**
     * Rename object keys using a mapping
     */
    renameKeys(obj, renameMap, recursive = false) {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const newKey = renameMap[key] || key;
            if (recursive && value !== null && typeof value === 'object' && !Array.isArray(value)) {
                result[newKey] = this.renameKeys(value, renameMap, recursive);
            }
            else {
                result[newKey] = value;
            }
        }
        return result;
    }
}
export default TransformObjectNode;
