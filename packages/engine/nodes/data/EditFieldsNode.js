/**
 * EditFieldsNode - Create, modify, or remove fields in items
 *
 * This universal node provides two modes for field manipulation:
 * 1. Manual Mapping: Set individual fields with type conversion and dot notation support
 * 2. JSON Output: Use a JSON template with expression evaluation for complex transformations
 *
 * Supports nested field creation using dot notation (e.g., "user.profile.name")
 * and field removal by excluding them from output (when includeOtherFields is false).
 *
 * @example Manual Mapping Mode
 * ```json
 * {
 *   "edit-fields-1": {
 *     "mode": "manual_mapping",
 *     "fieldsToSet": [
 *       {"name": "fullName", "value": "{{firstName}} {{lastName}}", "type": "expression"},
 *       {"name": "status", "value": "active", "type": "string"},
 *       {"name": "score", "value": "100", "type": "number"}
 *     ],
 *     "includeOtherFields": true,
 *     "success?": "next-node"
 *   }
 * }
 * ```
 *
 * @example JSON Output Mode
 * ```json
 * {
 *   "edit-fields-2": {
 *     "mode": "json_output",
 *     "jsonOutput": "{\"user\": {\"name\": \"{{firstName}} {{lastName}}\", \"age\": {{age}}}}",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
import { WorkflowNode } from '../../src/types';
export class EditFieldsNode extends WorkflowNode {
    metadata = {
        id: 'editFields',
        name: 'Edit Fields (Set)',
        version: '1.0.0',
        description: 'Create, modify, or remove fields in items with support for nested structures and type conversions',
        inputs: ['mode', 'fieldsToSet', 'jsonOutput', 'includeOtherFields', 'supportDotNotation'],
        outputs: ['result', 'fieldsModified'],
        ai_hints: {
            purpose: 'Transform item structure by adding, modifying, or removing fields with type conversion and expression support',
            when_to_use: 'When you need to reshape data, add computed fields, rename properties, or create nested structures',
            expected_edges: ['success', 'error'],
            example_usage: '{"edit-1": {"mode": "manual_mapping", "fieldsToSet": [{"name": "fullName", "value": "{{firstName}} {{lastName}}", "type": "expression"}], "includeOtherFields": true, "success?": "next"}}',
            example_config: '{"mode": "manual_mapping|json_output", "fieldsToSet": "[{name: string, value: any, type?: string}]", "jsonOutput?": "string", "includeOtherFields?": "boolean", "supportDotNotation?": "boolean", "ignoreTypeErrors?": "boolean"}',
            get_from_state: [],
            post_to_state: ['editFieldsResult', 'fieldsModified']
        }
    };
    async execute(context, config) {
        const { mode = 'manual_mapping', fieldsToSet = [], jsonOutput, includeOtherFields = true, includeBinaryData = false, supportDotNotation = true, ignoreTypeErrors = false } = config || {};
        // Validate mode
        if (mode !== 'manual_mapping' && mode !== 'json_output') {
            return {
                error: () => ({
                    error: `Invalid mode: ${mode}. Must be "manual_mapping" or "json_output"`,
                    nodeId: context.nodeId
                })
            };
        }
        try {
            let result;
            if (mode === 'manual_mapping') {
                result = await this.processManualMapping(context, fieldsToSet, includeOtherFields, supportDotNotation, ignoreTypeErrors);
            }
            else {
                // JSON output mode
                result = await this.processJsonOutput(context, jsonOutput, ignoreTypeErrors);
            }
            // Store result in state
            context.state.editFieldsResult = result;
            context.state.fieldsModified = Object.keys(result);
            return {
                success: () => ({
                    result,
                    fieldsModified: Object.keys(result),
                    mode
                })
            };
        }
        catch (error) {
            return {
                error: () => ({
                    error: error instanceof Error ? error.message : 'Edit fields operation failed',
                    nodeId: context.nodeId,
                    mode,
                    details: error instanceof Error ? error.stack : undefined
                })
            };
        }
    }
    /**
     * Process manual mapping mode - set individual fields with type conversion
     */
    async processManualMapping(context, fieldsToSet, includeOtherFields, supportDotNotation, ignoreTypeErrors) {
        // Start with existing inputs if includeOtherFields is true
        const result = includeOtherFields
            ? { ...context.inputs }
            : {};
        // Process each field to set
        for (const field of fieldsToSet) {
            try {
                const { name, value, type = 'string' } = field;
                if (!name) {
                    if (!ignoreTypeErrors) {
                        throw new Error('Field name is required in fieldsToSet');
                    }
                    continue;
                }
                // Evaluate value (handle expressions)
                let processedValue = this.evaluateValue(value, context, type);
                // Convert type if specified
                processedValue = this.convertType(processedValue, type, ignoreTypeErrors);
                // Set the value (with or without dot notation)
                if (supportDotNotation && name.includes('.')) {
                    this.setNestedValue(result, name.split('.'), processedValue);
                }
                else {
                    result[name] = processedValue;
                }
            }
            catch (error) {
                if (!ignoreTypeErrors) {
                    throw error;
                }
                // Continue processing other fields
            }
        }
        return result;
    }
    /**
     * Process JSON output mode - use template with expressions
     */
    async processJsonOutput(context, jsonOutput, ignoreTypeErrors) {
        if (!jsonOutput) {
            throw new Error('jsonOutput is required when mode is "json_output"');
        }
        try {
            // Replace expressions in JSON template
            const processedJson = this.replaceExpressions(jsonOutput, context);
            // Parse the JSON
            const result = JSON.parse(processedJson);
            if (typeof result !== 'object' || result === null) {
                throw new Error('JSON output must be an object');
            }
            return result;
        }
        catch (error) {
            if (!ignoreTypeErrors) {
                throw new Error(`Failed to process JSON output: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return {};
        }
    }
    /**
     * Evaluate a value - handle expressions with {{field}} syntax
     */
    evaluateValue(value, context, type) {
        // If it's an expression type or string with {{}} syntax, evaluate it
        if (type === 'expression' || (typeof value === 'string' && value.includes('{{'))) {
            return this.replaceExpressions(String(value), context);
        }
        return value;
    }
    /**
     * Replace {{fieldName}} expressions with actual values from context.inputs
     */
    replaceExpressions(template, context) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, fieldPath) => {
            const trimmedPath = fieldPath.trim();
            // Get value from inputs
            const value = this.getNestedValue(context.inputs, trimmedPath);
            // Return stringified value
            if (value === undefined || value === null) {
                return '';
            }
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
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
     * Convert value to specified type
     */
    convertType(value, type, ignoreErrors) {
        try {
            switch (type) {
                case 'string':
                    return String(value);
                case 'number': {
                    const num = Number(value);
                    if (isNaN(num)) {
                        throw new Error(`Cannot convert "${value}" to number`);
                    }
                    return num;
                }
                case 'boolean':
                    if (typeof value === 'boolean')
                        return value;
                    if (typeof value === 'string') {
                        const lower = value.toLowerCase();
                        if (lower === 'true' || lower === '1')
                            return true;
                        if (lower === 'false' || lower === '0')
                            return false;
                    }
                    return Boolean(value);
                case 'object':
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch {
                            throw new Error(`Cannot parse "${value}" as JSON object`);
                        }
                    }
                    if (typeof value === 'object' && value !== null) {
                        return value;
                    }
                    throw new Error(`Cannot convert "${value}" to object`);
                case 'array':
                    if (Array.isArray(value))
                        return value;
                    if (typeof value === 'string') {
                        try {
                            const parsed = JSON.parse(value);
                            if (Array.isArray(parsed))
                                return parsed;
                        }
                        catch {
                            // Try comma-separated values
                            return value.split(',').map(v => v.trim());
                        }
                    }
                    // Wrap single value in array
                    return [value];
                case 'expression':
                    // Expression type returns the evaluated string as-is
                    return value;
                default:
                    return value;
            }
        }
        catch (error) {
            if (ignoreErrors) {
                return value;
            }
            throw error;
        }
    }
    /**
     * Set nested value in object using dot notation path
     * Creates intermediate objects as needed
     */
    setNestedValue(obj, segments, value) {
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
export default EditFieldsNode;
