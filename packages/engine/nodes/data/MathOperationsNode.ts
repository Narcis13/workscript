/**
 * MathOperationsNode - Universal node for performing mathematical calculations on data
 *
 * Comprehensive math operations with multiple modes:
 * - Single field: Perform operation on a single field value
 * - Multiple fields: Perform operation between two fields or field and static value
 * - Aggregate: Perform operation on multiple fields
 *
 * Supported operations:
 * - Basic: add, subtract, multiply, divide, modulo
 * - Advanced: power, sqrt, abs
 * - Rounding: round, ceil, floor
 * - Aggregate: min, max, sum, average
 *
 * @example
 * ```json
 * {
 *   "math-ops-1": {
 *     "operation": "multiply",
 *     "mode": "multiple_fields",
 *     "field1": "quantity",
 *     "field2": "price",
 *     "outputField": "subtotal",
 *     "precision": 2,
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '../../src/types';
import type { ExecutionContext, EdgeMap } from '../../src/types';

interface MathOperationsNodeConfig {
  operation?: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'round' | 'ceil' | 'floor' | 'abs' | 'min' | 'max' | 'sum' | 'average' | 'modulo';
  mode?: 'single_field' | 'multiple_fields' | 'aggregate';
  field1?: string;
  field2?: string;
  value?: number;
  fields?: string[];
  outputField?: string;
  precision?: number;
}

export class MathOperationsNode extends WorkflowNode {
  metadata = {
    id: 'mathOperations',
    name: 'Math Operations',
    version: '1.0.0',
    description: 'Universal node - perform mathematical calculations on data with support for single field, multiple fields, and aggregate operations',
    inputs: ['operation', 'mode', 'field1', 'field2', 'value', 'fields', 'outputField', 'precision'],
    outputs: ['result', 'outputField'],
    ai_hints: {
      purpose: 'Perform mathematical calculations on data fields with multiple operation modes and precision control',
      when_to_use: 'When you need to calculate totals, apply formulas, perform aggregations, or transform numeric data in workflows',
      expected_edges: ['success', 'error'],
      example_usage: '{"math-ops-1": {"operation": "multiply", "mode": "multiple_fields", "field1": "quantity", "field2": "price", "outputField": "subtotal", "precision": 2, "success?": "next-node"}}',
      example_config: '{"operation": "add|subtract|multiply|divide|power|sqrt|round|ceil|floor|abs|min|max|sum|average|modulo", "mode": "single_field|multiple_fields|aggregate", "field1?": "string", "field2?": "string", "value?": "number", "fields?": "[string, ...]", "outputField": "string", "precision?": "number"}',
      get_from_state: [],
      post_to_state: ['mathOperationsResult']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      operation,
      mode = 'multiple_fields',
      field1,
      field2,
      value,
      fields,
      outputField = 'result',
      precision
    } = (config as MathOperationsNodeConfig) || {};

    // Validate inputs
    if (!operation) {
      return {
        error: () => ({
          error: 'Missing operation parameter',
          expected: 'add|subtract|multiply|divide|power|sqrt|round|ceil|floor|abs|min|max|sum|average|modulo',
          nodeId: context.nodeId
        })
      };
    }

    if (!mode) {
      return {
        error: () => ({
          error: 'Missing mode parameter',
          expected: 'single_field|multiple_fields|aggregate',
          nodeId: context.nodeId
        })
      };
    }

    if (!outputField) {
      return {
        error: () => ({
          error: 'Missing outputField parameter',
          nodeId: context.nodeId
        })
      };
    }

    try {
      let result: number;

      // Route to appropriate mode handler
      switch (mode) {
        case 'single_field':
          result = await this.executeSingleFieldMode(context, operation, field1);
          break;
        case 'multiple_fields':
          result = await this.executeMultipleFieldsMode(context, operation, field1, field2, value);
          break;
        case 'aggregate':
          result = await this.executeAggregateMode(context, operation, fields);
          break;
        default:
          return {
            error: () => ({
              error: `Invalid mode: ${mode}`,
              expected: 'single_field|multiple_fields|aggregate',
              received: mode,
              nodeId: context.nodeId
            })
          };
      }

      // Apply precision if specified
      if (precision !== undefined && typeof precision === 'number' && precision >= 0) {
        result = this.applyPrecision(result, precision);
      }

      // Store result in state using the specified output field
      context.state[outputField] = result;
      context.state.mathOperationsResult = {
        operation,
        mode,
        result,
        outputField,
        timestamp: new Date().toISOString()
      };

      return {
        success: () => ({
          result,
          outputField,
          operation,
          mode
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Math operation failed',
          nodeId: context.nodeId,
          operation,
          mode,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Execute single field mode - operation on a single field value
   */
  private async executeSingleFieldMode(
    context: ExecutionContext,
    operation: string,
    field1?: string
  ): Promise<number> {
    if (!field1) {
      throw new Error('field1 parameter is required for single_field mode');
    }

    const fieldValue = this.getNestedValue(context.state, field1);

    if (fieldValue === null || fieldValue === undefined) {
      throw new Error(`Field "${field1}" not found in state or has null/undefined value`);
    }

    const num = Number(fieldValue);

    if (isNaN(num)) {
      throw new Error(`Field "${field1}" value is not a valid number: ${fieldValue}`);
    }

    return this.performUnaryOperation(operation, num);
  }

  /**
   * Execute multiple fields mode - operation between two fields or field and value
   */
  private async executeMultipleFieldsMode(
    context: ExecutionContext,
    operation: string,
    field1?: string,
    field2?: string,
    value?: number
  ): Promise<number> {
    if (!field1) {
      throw new Error('field1 parameter is required for multiple_fields mode');
    }

    // Get first operand from field1
    const fieldValue1 = this.getNestedValue(context.state, field1);

    if (fieldValue1 === null || fieldValue1 === undefined) {
      throw new Error(`Field "${field1}" not found in state or has null/undefined value`);
    }

    const num1 = Number(fieldValue1);

    if (isNaN(num1)) {
      throw new Error(`Field "${field1}" value is not a valid number: ${fieldValue1}`);
    }

    // Get second operand from field2 or static value
    let num2: number;

    if (field2) {
      const fieldValue2 = this.getNestedValue(context.state, field2);

      if (fieldValue2 === null || fieldValue2 === undefined) {
        throw new Error(`Field "${field2}" not found in state or has null/undefined value`);
      }

      num2 = Number(fieldValue2);

      if (isNaN(num2)) {
        throw new Error(`Field "${field2}" value is not a valid number: ${fieldValue2}`);
      }
    } else if (value !== undefined) {
      num2 = value;
    } else {
      throw new Error('Either field2 or value parameter is required for multiple_fields mode');
    }

    return this.performBinaryOperation(operation, num1, num2);
  }

  /**
   * Execute aggregate mode - operation on multiple fields
   */
  private async executeAggregateMode(
    context: ExecutionContext,
    operation: string,
    fields?: string[]
  ): Promise<number> {
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new Error('fields parameter is required for aggregate mode and must be a non-empty array');
    }

    // Collect all field values
    const values: number[] = [];

    for (const field of fields) {
      const fieldValue = this.getNestedValue(context.state, field);

      if (fieldValue === null || fieldValue === undefined) {
        // Skip null/undefined values in aggregate mode
        continue;
      }

      const num = Number(fieldValue);

      if (isNaN(num)) {
        throw new Error(`Field "${field}" value is not a valid number: ${fieldValue}`);
      }

      values.push(num);
    }

    if (values.length === 0) {
      throw new Error('No valid numeric values found in specified fields');
    }

    return this.performAggregateOperation(operation, values);
  }

  /**
   * Perform unary operation (single operand)
   */
  private performUnaryOperation(operation: string, num: number): number {
    switch (operation) {
      case 'sqrt':
        if (num < 0) {
          throw new Error('Cannot calculate square root of negative number');
        }
        return Math.sqrt(num);
      case 'round':
        return Math.round(num);
      case 'ceil':
        return Math.ceil(num);
      case 'floor':
        return Math.floor(num);
      case 'abs':
        return Math.abs(num);
      default:
        throw new Error(`Operation "${operation}" is not supported in single_field mode. Use sqrt, round, ceil, floor, or abs.`);
    }
  }

  /**
   * Perform binary operation (two operands)
   */
  private performBinaryOperation(operation: string, num1: number, num2: number): number {
    switch (operation) {
      case 'add':
        return num1 + num2;
      case 'subtract':
        return num1 - num2;
      case 'multiply':
        return num1 * num2;
      case 'divide':
        if (num2 === 0) {
          throw new Error('Division by zero is not allowed');
        }
        return num1 / num2;
      case 'power':
        return Math.pow(num1, num2);
      case 'modulo':
        if (num2 === 0) {
          throw new Error('Modulo by zero is not allowed');
        }
        return num1 % num2;
      default:
        throw new Error(`Operation "${operation}" is not supported in multiple_fields mode. Use add, subtract, multiply, divide, power, or modulo.`);
    }
  }

  /**
   * Perform aggregate operation (multiple operands)
   */
  private performAggregateOperation(operation: string, values: number[]): number {
    switch (operation) {
      case 'sum':
      case 'add':
        return values.reduce((acc, val) => acc + val, 0);
      case 'average':
        return values.reduce((acc, val) => acc + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'multiply':
        return values.reduce((acc, val) => acc * val, 1);
      default:
        throw new Error(`Operation "${operation}" is not supported in aggregate mode. Use sum, add, average, min, max, or multiply.`);
    }
  }

  /**
   * Apply precision rounding to result
   */
  private applyPrecision(num: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(num * multiplier) / multiplier;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
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
}

export default MathOperationsNode;
