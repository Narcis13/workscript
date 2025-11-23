/**
 * FilterNode - Universal node for filtering items based on conditions
 *
 * Comprehensive filtering with multiple data types and operations:
 * - String operations: equals, contains, regex, isEmpty, etc.
 * - Number operations: equals, gt, gte, lt, lte, between
 * - Boolean operations: true, false
 * - Date operations: before, after, between, equals
 * - Array operations: contains, notContains, isEmpty, isNotEmpty
 * - Object operations: isEmpty, isNotEmpty
 *
 * @example
 * ```json
 * {
 *   "filter-1": {
 *     "items": [
 *       {"name": "Product A", "price": 25.99, "inStock": true},
 *       {"name": "Product B", "price": 15.50, "inStock": false}
 *     ],
 *     "conditions": [
 *       {"field": "price", "dataType": "number", "operation": "gt", "value": 20},
 *       {"field": "inStock", "dataType": "boolean", "operation": "true"}
 *     ],
 *     "matchMode": "all",
 *     "passed?": "process-items"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface FilterCondition {
  field: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  operation: string;
  value?: any;
  value2?: any;
  combineWith?: 'AND' | 'OR';
}

interface FilterNodeConfig {
  items?: any[];
  conditions?: FilterCondition[];
  matchMode?: 'all' | 'any';
}

export class FilterNode extends WorkflowNode {
  metadata = {
    id: 'filter',
    name: 'Filter',
    version: '1.0.0',
    description: 'Universal node - filters items based on complex conditions with multiple data types and operations',
    inputs: ['items', 'conditions', 'matchMode'],
    outputs: ['passed', 'filtered', 'passedCount', 'filteredCount', 'totalCount'],
    ai_hints: {
      purpose: 'Filter items based on conditions with support for multiple data types and operations',
      when_to_use: 'When you need to filter arrays of items based on string, number, boolean, date, array, or object conditions',
      expected_edges: ['passed', 'filtered', 'error'],
      example_usage: '{"filter-1": {"items": [{"price": 25, "active": true}], "conditions": [{"field": "price", "dataType": "number", "operation": "gt", "value": 20}], "matchMode": "all", "passed?": "process-items"}}',
      example_config: '{"items": "[object, ...]", "conditions": "[{field: string, dataType: string|number|boolean|date|array|object, operation: string, value: any, value2?: any, combineWith?: AND|OR}, ...]", "matchMode?": "all|any"}',
      get_from_state: [],
      post_to_state: ['filterPassed', 'filterFiltered', 'filterStats']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { items, conditions, matchMode = 'all' } = (config as FilterNodeConfig) || {};

    // Validate inputs
    if (!items || !Array.isArray(items)) {
      return {
        error: () => ({
          error: 'Missing or invalid items parameter',
          expected: 'array of objects',
          received: typeof items,
          nodeId: context.nodeId
        })
      };
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return {
        error: () => ({
          error: 'Missing or invalid conditions parameter',
          expected: 'non-empty array of condition objects',
          received: typeof conditions,
          nodeId: context.nodeId
        })
      };
    }

    if (matchMode !== 'all' && matchMode !== 'any') {
      return {
        error: () => ({
          error: 'Invalid matchMode parameter',
          expected: '"all" or "any"',
          received: matchMode,
          nodeId: context.nodeId
        })
      };
    }

    try {
      // Filter items based on conditions
      const passed: any[] = [];
      const filtered: any[] = [];

      for (const item of items) {
        const matches = this.evaluateConditions(item, conditions, matchMode);

        if (matches) {
          passed.push(item);
        } else {
          filtered.push(item);
        }
      }

      // Store results in state
      context.state.filterPassed = passed;
      context.state.filterFiltered = filtered;
      context.state.filterStats = {
        passedCount: passed.length,
        filteredCount: filtered.length,
        totalCount: items.length,
        passRate: items.length > 0 ? (passed.length / items.length) * 100 : 0
      };

  
      return {
     /*   filtered: () => ({
          items: filtered,
          passedCount: passed.length,
          filteredCount: filtered.length,
          totalCount: items.length
        }),*/
        passed: () => ({
          items: passed,
          passedCount: passed.length,
          filteredCount: filtered.length,
          totalCount: items.length
        })

      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Filter operation failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Evaluate all conditions for an item
   */
  private evaluateConditions(item: any, conditions: FilterCondition[], matchMode: 'all' | 'any'): boolean {
    if (matchMode === 'all') {
      // All conditions must pass (AND logic)
      return conditions.every(condition => this.evaluateCondition(item, condition));
    } else {
      // Any condition can pass (OR logic)
      return conditions.some(condition => this.evaluateCondition(item, condition));
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(item: any, condition: FilterCondition): boolean {
    const { field, dataType, operation, value, value2 } = condition;

    // Get field value from item (supports dot notation)
    const fieldValue = this.getNestedValue(item, field);

    // Route to appropriate evaluator based on data type
    switch (dataType) {
      case 'string':
        return this.evaluateStringCondition(fieldValue, operation, value);
      case 'number':
        return this.evaluateNumberCondition(fieldValue, operation, value, value2);
      case 'boolean':
        return this.evaluateBooleanCondition(fieldValue, operation);
      case 'date':
        return this.evaluateDateCondition(fieldValue, operation, value, value2);
      case 'array':
        return this.evaluateArrayCondition(fieldValue, operation, value);
      case 'object':
        return this.evaluateObjectCondition(fieldValue, operation);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  /**
   * Evaluate string conditions
   */
  private evaluateStringCondition(fieldValue: any, operation: string, value: any): boolean {
    const str = String(fieldValue ?? '');
    const compareValue = String(value ?? '');

    switch (operation) {
      case 'equals':
        return str === compareValue;
      case 'notEquals':
        return str !== compareValue;
      case 'contains':
        return str.includes(compareValue);
      case 'notContains':
        return !str.includes(compareValue);
      case 'startsWith':
        return str.startsWith(compareValue);
      case 'endsWith':
        return str.endsWith(compareValue);
      case 'regex':
        try {
          const regex = new RegExp(compareValue);
          return regex.test(str);
        } catch {
          return false;
        }
      case 'isEmpty':
        return str.length === 0 || fieldValue === null || fieldValue === undefined;
      case 'isNotEmpty':
        return str.length > 0 && fieldValue !== null && fieldValue !== undefined;
      default:
        throw new Error(`Unsupported string operation: ${operation}`);
    }
  }

  /**
   * Evaluate number conditions
   */
  private evaluateNumberCondition(fieldValue: any, operation: string, value: any, value2?: any): boolean {
    // Handle null/undefined
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    const num = Number(fieldValue);
    const compareValue = Number(value);

    // Check for NaN
    if (isNaN(num) || isNaN(compareValue)) {
      return false;
    }

    switch (operation) {
      case 'equals':
        return num === compareValue;
      case 'notEquals':
        return num !== compareValue;
      case 'gt':
        return num > compareValue;
      case 'gte':
        return num >= compareValue;
      case 'lt':
        return num < compareValue;
      case 'lte':
        return num <= compareValue;
      case 'between':
        if (value2 === undefined) {
          throw new Error('Between operation requires value2 parameter');
        }
        const compareValue2 = Number(value2);
        if (isNaN(compareValue2)) {
          return false;
        }
        return num >= compareValue && num <= compareValue2;
      default:
        throw new Error(`Unsupported number operation: ${operation}`);
    }
  }

  /**
   * Evaluate boolean conditions
   */
  private evaluateBooleanCondition(fieldValue: any, operation: string): boolean {
    switch (operation) {
      case 'true':
        return fieldValue === true;
      case 'false':
        return fieldValue === false;
      default:
        throw new Error(`Unsupported boolean operation: ${operation}`);
    }
  }

  /**
   * Evaluate date conditions
   */
  private evaluateDateCondition(fieldValue: any, operation: string, value: any, value2?: any): boolean {
    // Handle null/undefined
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    const date = new Date(fieldValue);
    const compareDate = new Date(value);

    // Check for invalid dates
    if (isNaN(date.getTime()) || isNaN(compareDate.getTime())) {
      return false;
    }

    switch (operation) {
      case 'before':
        return date < compareDate;
      case 'after':
        return date > compareDate;
      case 'equals':
        return date.getTime() === compareDate.getTime();
      case 'between':
        if (value2 === undefined) {
          throw new Error('Between operation requires value2 parameter');
        }
        const compareDate2 = new Date(value2);
        if (isNaN(compareDate2.getTime())) {
          return false;
        }
        return date >= compareDate && date <= compareDate2;
      default:
        throw new Error(`Unsupported date operation: ${operation}`);
    }
  }

  /**
   * Evaluate array conditions
   */
  private evaluateArrayCondition(fieldValue: any, operation: string, value: any): boolean {
    if (!Array.isArray(fieldValue)) {
      return false;
    }

    switch (operation) {
      case 'contains':
        return fieldValue.includes(value);
      case 'notContains':
        return !fieldValue.includes(value);
      case 'isEmpty':
        return fieldValue.length === 0;
      case 'isNotEmpty':
        return fieldValue.length > 0;
      default:
        throw new Error(`Unsupported array operation: ${operation}`);
    }
  }

  /**
   * Evaluate object conditions
   */
  private evaluateObjectCondition(fieldValue: any, operation: string): boolean {
    switch (operation) {
      case 'isEmpty':
        if (fieldValue === null || fieldValue === undefined) {
          return true;
        }
        if (typeof fieldValue !== 'object') {
          return false;
        }
        return Object.keys(fieldValue).length === 0;
      case 'isNotEmpty':
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        if (typeof fieldValue !== 'object') {
          return false;
        }
        return Object.keys(fieldValue).length > 0;
      default:
        throw new Error(`Unsupported object operation: ${operation}`);
    }
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

export default FilterNode;
