/**
 * StringOperationsNode - Universal node for string manipulation operations
 *
 * Performs various string transformations and manipulations:
 * - Case transformations: uppercase, lowercase, capitalize, titleCase
 * - Trimming and padding: trim, pad (left/right/both)
 * - Text replacement: replace, replaceAll, replaceRegex
 * - Extraction: substring, slice, split
 * - Concatenation: concat
 * - Formatting: stripHTML, slugify
 *
 * @example
 * ```json
 * {
 *   "trim-title": {
 *     "operation": "trim",
 *     "field": "title",
 *     "outputField": "cleanTitle",
 *     "success?": "titlecase-title"
 *   }
 * }
 * ```
 */
import { WorkflowNode } from '../../src/types';
export class StringOperationsNode extends WorkflowNode {
    metadata = {
        id: 'stringOperations',
        name: 'String Operations',
        version: '1.0.0',
        description: 'Universal node - perform various string manipulation operations including case conversion, trimming, replacement, extraction, and formatting',
        inputs: ['operation', 'field', 'outputField', 'searchValue', 'replaceValue', 'separator', 'start', 'end', 'values', 'length', 'padChar', 'side'],
        outputs: ['result', 'success'],
        ai_hints: {
            purpose: 'Perform various string manipulation operations on text data',
            when_to_use: 'When you need to transform, clean, format, or manipulate string values in your workflow',
            expected_edges: ['success', 'error'],
            example_usage: '{"str-1": {"operation": "trim", "field": "title", "outputField": "cleanTitle", "success?": "next-node"}}',
            example_config: '{"operation": "trim|uppercase|lowercase|capitalize|titleCase|replace|replaceAll|replaceRegex|split|substring|slice|concat|pad|stripHTML|slugify", "field": "string", "outputField?": "string", "searchValue?": "string", "replaceValue?": "string", "separator?": "string", "start?": "number", "end?": "number", "values?": "[string, ...]", "length?": "number", "padChar?": "string", "side?": "left|right|both"}',
            get_from_state: [],
            post_to_state: ['stringOperationResult']
        }
    };
    async execute(context, config) {
        const { operation, field, outputField, searchValue, replaceValue, separator, start, end, values, length, padChar = ' ', side = 'right' } = config || {};
        // Validate required parameters
        if (!operation) {
            return {
                error: () => ({
                    error: 'Missing required parameter: operation',
                    nodeId: context.nodeId
                })
            };
        }
        if (!field) {
            return {
                error: () => ({
                    error: 'Missing required parameter: field',
                    nodeId: context.nodeId
                })
            };
        }
        try {
            // Get field value from context.state
            const fieldValue = this.getNestedValue(context.state, field);
            // Handle null/undefined input
            if (fieldValue === null || fieldValue === undefined) {
                return {
                    error: () => ({
                        error: `Field value is null or undefined: ${field}`,
                        field,
                        nodeId: context.nodeId
                    })
                };
            }
            // Convert to string for processing
            const inputString = String(fieldValue);
            // Perform the requested operation
            let result;
            switch (operation) {
                case 'trim':
                    result = this.trim(inputString);
                    break;
                case 'uppercase':
                    result = this.uppercase(inputString);
                    break;
                case 'lowercase':
                    result = this.lowercase(inputString);
                    break;
                case 'capitalize':
                    result = this.capitalize(inputString);
                    break;
                case 'titleCase':
                    result = this.titleCase(inputString);
                    break;
                case 'replace':
                    if (searchValue === undefined) {
                        return {
                            error: () => ({
                                error: 'Replace operation requires searchValue parameter',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.replace(inputString, searchValue, replaceValue ?? '');
                    break;
                case 'replaceAll':
                    if (searchValue === undefined) {
                        return {
                            error: () => ({
                                error: 'ReplaceAll operation requires searchValue parameter',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.replaceAll(inputString, searchValue, replaceValue ?? '');
                    break;
                case 'replaceRegex':
                    if (searchValue === undefined) {
                        return {
                            error: () => ({
                                error: 'ReplaceRegex operation requires searchValue parameter (regex pattern)',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.replaceRegex(inputString, searchValue, replaceValue ?? '');
                    break;
                case 'split':
                    if (separator === undefined) {
                        return {
                            error: () => ({
                                error: 'Split operation requires separator parameter',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.split(inputString, separator);
                    break;
                case 'substring':
                    if (start === undefined) {
                        return {
                            error: () => ({
                                error: 'Substring operation requires start parameter',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.substring(inputString, start, end);
                    break;
                case 'slice':
                    if (start === undefined) {
                        return {
                            error: () => ({
                                error: 'Slice operation requires start parameter',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.slice(inputString, start, end);
                    break;
                case 'concat':
                    if (!values || !Array.isArray(values)) {
                        return {
                            error: () => ({
                                error: 'Concat operation requires values parameter (array of strings)',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.concat(inputString, values);
                    break;
                case 'pad':
                    if (length === undefined) {
                        return {
                            error: () => ({
                                error: 'Pad operation requires length parameter',
                                operation,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    result = this.pad(inputString, length, padChar, side);
                    break;
                case 'stripHTML':
                    result = this.stripHTML(inputString);
                    break;
                case 'slugify':
                    result = this.slugify(inputString);
                    break;
                default:
                    return {
                        error: () => ({
                            error: `Unknown operation: ${operation}`,
                            operation,
                            supportedOperations: ['trim', 'uppercase', 'lowercase', 'capitalize', 'titleCase', 'replace', 'replaceAll', 'replaceRegex', 'split', 'substring', 'slice', 'concat', 'pad', 'stripHTML', 'slugify'],
                            nodeId: context.nodeId
                        })
                    };
            }
            // Determine output field
            const outputFieldName = outputField || field;
            // Store result in state
            this.setNestedValue(context.state, outputFieldName, result);
            context.state.stringOperationResult = result;
            return {
                success: () => ({
                    result,
                    field: outputFieldName,
                    operation,
                    originalValue: inputString
                })
            };
        }
        catch (error) {
            return {
                error: () => ({
                    error: error instanceof Error ? error.message : 'String operation failed',
                    operation,
                    field,
                    nodeId: context.nodeId,
                    details: error instanceof Error ? error.stack : undefined
                })
            };
        }
    }
    // ===== String Operation Helper Methods =====
    /**
     * Remove whitespace from both ends
     */
    trim(str) {
        return str.trim();
    }
    /**
     * Convert to uppercase
     */
    uppercase(str) {
        return str.toUpperCase();
    }
    /**
     * Convert to lowercase
     */
    lowercase(str) {
        return str.toLowerCase();
    }
    /**
     * Capitalize first letter only
     */
    capitalize(str) {
        if (str.length === 0)
            return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    /**
     * Title Case All Words
     */
    titleCase(str) {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => {
            if (word.length === 0)
                return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
            .join(' ');
    }
    /**
     * Replace first occurrence
     */
    replace(str, searchValue, replaceValue) {
        return str.replace(searchValue, replaceValue);
    }
    /**
     * Replace all occurrences
     */
    replaceAll(str, searchValue, replaceValue) {
        // Escape special regex characters in searchValue
        const escapedSearch = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearch, 'g');
        return str.replace(regex, replaceValue);
    }
    /**
     * Replace using regex pattern
     */
    replaceRegex(str, pattern, replaceValue) {
        try {
            const regex = new RegExp(pattern, 'g');
            return str.replace(regex, replaceValue);
        }
        catch (error) {
            throw new Error(`Invalid regex pattern: ${pattern}. ${error instanceof Error ? error.message : ''}`);
        }
    }
    /**
     * Split string by separator
     */
    split(str, separator) {
        return str.split(separator);
    }
    /**
     * Extract substring (start, end)
     */
    substring(str, start, end) {
        return str.substring(start, end);
    }
    /**
     * Slice string (start, end)
     */
    slice(str, start, end) {
        return str.slice(start, end);
    }
    /**
     * Concatenate values
     */
    concat(str, values) {
        return str + values.join('');
    }
    /**
     * Pad string (left/right/both)
     */
    pad(str, targetLength, padChar, side) {
        if (str.length >= targetLength) {
            return str;
        }
        const padLength = targetLength - str.length;
        switch (side) {
            case 'left':
                return padChar.repeat(padLength) + str;
            case 'right':
                return str + padChar.repeat(padLength);
            case 'both': {
                const leftPadding = Math.floor(padLength / 2);
                const rightPadding = padLength - leftPadding;
                return padChar.repeat(leftPadding) + str + padChar.repeat(rightPadding);
            }
            default:
                return str + padChar.repeat(padLength);
        }
    }
    /**
     * Remove HTML tags
     * Safe implementation using regex without external parser
     */
    stripHTML(str) {
        // Remove HTML tags
        let result = str.replace(/<[^>]*>/g, '');
        // Decode common HTML entities
        const entities = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'"
        };
        for (const [entity, char] of Object.entries(entities)) {
            result = result.split(entity).join(char);
        }
        return result;
    }
    /**
     * Create URL-friendly slug
     */
    slugify(str) {
        return str
            .toLowerCase()
            .trim()
            // Replace spaces with hyphens
            .replace(/\s+/g, '-')
            // Remove special characters
            .replace(/[^\w\-]+/g, '')
            // Replace multiple hyphens with single hyphen
            .replace(/\-\-+/g, '-')
            // Remove leading/trailing hyphens
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
    // ===== Utility Helper Methods =====
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        if (!path) {
            return undefined;
        }
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
     * Set nested value in object using dot notation
     * Creates intermediate objects as needed
     */
    setNestedValue(obj, path, value) {
        const segments = path.split('.');
        let current = obj;
        // Navigate to parent, creating intermediate objects
        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
                current[segment] = {};
            }
            current = current[segment];
        }
        // Set final value
        const finalSegment = segments[segments.length - 1];
        current[finalSegment] = value;
    }
}
export default StringOperationsNode;
