/**
 * CalculateFieldNode - Universal node for calculating new field values using expressions
 *
 * Performs mathematical calculations using formulas with field references:
 * - Supports field references like {fieldName}
 * - Basic arithmetic: +, -, *, /, %, ** (power)
 * - Parentheses for grouping: ()
 * - Math functions: sqrt, abs, round, ceil, floor, min, max, pow
 * - Safe expression evaluation without external dependencies
 * - Precision control for decimal results
 *
 * @example
 * ```json
 * {
 *   "calculate-1": {
 *     "calculations": [
 *       {
 *         "outputField": "profit",
 *         "formula": "{revenue} - {costs}"
 *       },
 *       {
 *         "outputField": "profitMargin",
 *         "formula": "({profit} / {revenue}) * 100",
 *         "precision": 2
 *       }
 *     ],
 *     "onError": "skip",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
import { WorkflowNode } from '../../src/types';
export class CalculateFieldNode extends WorkflowNode {
    metadata = {
        id: 'calculateField',
        name: 'Calculate Field',
        version: '1.0.0',
        description: 'Universal node - calculate new field values using mathematical expressions with field references',
        inputs: ['calculations', 'onError', 'defaultValue'],
        outputs: ['result', 'calculatedFields', 'errors'],
        ai_hints: {
            purpose: 'Calculate new field values using mathematical expressions with field references',
            when_to_use: 'When you need to compute derived fields from existing data using formulas (e.g., profit = revenue - costs)',
            expected_edges: ['success', 'error'],
            example_usage: '{"calculate-1": {"calculations": [{"outputField": "profit", "formula": "{revenue} - {costs}"}, {"outputField": "margin", "formula": "({profit} / {revenue}) * 100", "precision": 2}], "onError": "skip", "success?": "next-node"}}',
            example_config: '{"calculations": "[{outputField: string, formula: string, precision?: number}, ...]", "onError?": "stop|skip|use_default", "defaultValue?": "any"}',
            get_from_state: [],
            post_to_state: ['calculationResult', 'calculatedFields', 'calculationErrors']
        }
    };
    async execute(context, config) {
        const { calculations, onError = 'stop', defaultValue = null } = config || {};
        // Validate inputs
        if (!calculations || !Array.isArray(calculations) || calculations.length === 0) {
            return {
                error: () => ({
                    error: 'Missing or invalid calculations parameter',
                    expected: 'non-empty array of calculation objects',
                    received: typeof calculations,
                    nodeId: context.nodeId
                })
            };
        }
        // Validate onError parameter
        if (onError && !['stop', 'skip', 'use_default'].includes(onError)) {
            return {
                error: () => ({
                    error: 'Invalid onError parameter',
                    expected: '"stop", "skip", or "use_default"',
                    received: onError,
                    nodeId: context.nodeId
                })
            };
        }
        try {
            // Start with current state data
            const result = { ...context.state };
            const calculatedFields = {};
            const errors = [];
            // Process each calculation
            for (const calc of calculations) {
                const { outputField, formula, precision } = calc;
                // Validate calculation configuration
                if (!outputField || typeof outputField !== 'string') {
                    if (onError === 'stop') {
                        return {
                            error: () => ({
                                error: 'Invalid outputField in calculation',
                                expected: 'non-empty string',
                                received: typeof outputField,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    errors.push({ field: outputField || 'unknown', error: 'Invalid outputField' });
                    continue;
                }
                if (!formula || typeof formula !== 'string') {
                    if (onError === 'stop') {
                        return {
                            error: () => ({
                                error: `Invalid formula for field "${outputField}"`,
                                expected: 'non-empty string',
                                received: typeof formula,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    errors.push({ field: outputField, error: 'Invalid formula' });
                    continue;
                }
                try {
                    // Replace field references with actual values
                    const resolvedFormula = this.resolveFieldReferences(formula, result);
                    // Evaluate the expression
                    const calculatedValue = this.evaluateExpression(resolvedFormula);
                    // Apply precision if specified
                    const finalValue = precision !== undefined
                        ? this.applyPrecision(calculatedValue, precision)
                        : calculatedValue;
                    // Store the result
                    result[outputField] = finalValue;
                    calculatedFields[outputField] = finalValue;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
                    if (onError === 'stop') {
                        return {
                            error: () => ({
                                error: `Calculation error for field "${outputField}": ${errorMessage}`,
                                formula,
                                nodeId: context.nodeId
                            })
                        };
                    }
                    else if (onError === 'use_default') {
                        result[outputField] = defaultValue;
                        calculatedFields[outputField] = defaultValue;
                    }
                    // onError === 'skip' - just skip this calculation
                    errors.push({ field: outputField, error: errorMessage });
                }
            }
            // Update state with all calculated fields
            Object.assign(context.state, result);
            context.state.calculationResult = result;
            context.state.calculatedFields = calculatedFields;
            if (errors.length > 0) {
                context.state.calculationErrors = errors;
            }
            return {
                success: () => ({
                    result,
                    calculatedFields,
                    errors: errors.length > 0 ? errors : undefined,
                    totalCalculations: calculations.length,
                    successfulCalculations: Object.keys(calculatedFields).length,
                    failedCalculations: errors.length
                })
            };
        }
        catch (error) {
            return {
                error: () => ({
                    error: error instanceof Error ? error.message : 'Calculation processing failed',
                    nodeId: context.nodeId
                })
            };
        }
    }
    /**
     * Replace field references like {fieldName} with actual values
     */
    resolveFieldReferences(formula, data) {
        return formula.replace(/\{([^}]+)\}/g, (match, fieldName) => {
            const trimmedField = fieldName.trim();
            if (!(trimmedField in data)) {
                throw new Error(`Field "${trimmedField}" not found in data`);
            }
            const value = data[trimmedField];
            if (typeof value !== 'number') {
                throw new Error(`Field "${trimmedField}" is not a number (value: ${value}, type: ${typeof value})`);
            }
            return String(value);
        });
    }
    /**
     * Safely evaluate a mathematical expression
     * Supports: +, -, *, /, %, **, (), and Math functions
     */
    evaluateExpression(expression) {
        // Remove whitespace
        const expr = expression.replace(/\s+/g, '');
        // Validate the expression contains only allowed characters
        if (!/^[0-9+\-*/%().,\s]+$/.test(expr.replace(/Math\.(sqrt|abs|round|ceil|floor|min|max|pow)/g, ''))) {
            throw new Error('Expression contains invalid characters');
        }
        // Replace ** with Math.pow
        let safeExpr = expr.replace(/(\d+\.?\d*)\s*\*\*\s*(\d+\.?\d*)/g, 'Math.pow($1,$2)');
        try {
            // Create a safe evaluation context with only Math functions
            const safeEval = new Function('Math', `'use strict'; return (${safeExpr});`);
            // Execute with Math object
            const result = safeEval(Math);
            if (typeof result !== 'number' || !isFinite(result)) {
                throw new Error('Expression did not evaluate to a valid number');
            }
            return result;
        }
        catch (error) {
            throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Apply precision rounding to a number
     */
    applyPrecision(value, precision) {
        if (typeof precision !== 'number' || precision < 0 || !Number.isInteger(precision)) {
            throw new Error('Precision must be a non-negative integer');
        }
        const multiplier = Math.pow(10, precision);
        return Math.round(value * multiplier) / multiplier;
    }
}
export default CalculateFieldNode;
