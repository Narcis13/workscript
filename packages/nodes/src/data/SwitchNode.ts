/**
 * SwitchNode - Route items to different branches based on conditions
 *
 * This universal node provides two modes for routing items:
 * 1. Rules Mode: Evaluate condition rules in order, first match wins
 * 2. Expression Mode: JavaScript expression returning edge name
 *
 * Each item is routed to exactly one edge based on the first matching rule
 * or the result of the expression evaluation. If no rules match, the item
 * is routed to the fallback edge (default: "default").
 *
 * @example Rules Mode
 * ```json
 * {
 *   "switch-1": {
 *     "mode": "rules",
 *     "rules": [
 *       {
 *         "outputKey": "vip",
 *         "conditions": [
 *           {"field": "customerType", "operation": "equals", "value": "premium"}
 *         ]
 *       },
 *       {
 *         "outputKey": "high_value",
 *         "conditions": [
 *           {"field": "orderTotal", "operation": "gt", "value": 100}
 *         ]
 *       }
 *     ],
 *     "fallbackOutput": "standard",
 *     "vip?": "vip-processing",
 *     "high_value?": "high-value-processing",
 *     "standard?": "standard-processing"
 *   }
 * }
 * ```
 *
 * @example Expression Mode
 * ```json
 * {
 *   "switch-2": {
 *     "mode": "expression",
 *     "expression": "item.score >= 90 ? 'excellent' : item.score >= 70 ? 'good' : 'needs_improvement'",
 *     "excellent?": "rewards-path",
 *     "good?": "normal-path",
 *     "needs_improvement?": "training-path"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface Condition {
  field: string;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  operation: string;
  value?: any;
  value2?: any;
  combineWith?: 'AND' | 'OR';
}

interface Rule {
  outputKey: string;
  conditions: Condition[];
}

interface SwitchConfig {
  mode?: 'rules' | 'expression';
  rules?: Rule[];
  expression?: string;
  fallbackOutput?: string;
  item?: any; // The item to evaluate (typically from context.inputs)
}

export class SwitchNode extends WorkflowNode {
  metadata = {
    id: 'switch',
    name: 'Switch Node',
    version: '1.0.0',
    description: 'Route items to different branches based on condition rules or JavaScript expressions',
    inputs: ['mode', 'rules', 'expression', 'fallbackOutput', 'item'],
    outputs: ['<dynamic>', 'error'],
    ai_hints: {
      purpose: 'Route workflow execution to different branches based on conditional logic or expressions',
      when_to_use: 'When you need to route items to different processing paths based on data conditions (e.g., VIP customers, high-value orders, regional processing)',
      expected_edges: ['<dynamic-based-on-rules>', 'default', 'error'],
      example_usage: '{"switch-1": {"mode": "rules", "rules": [{"outputKey": "vip", "conditions": [{"field": "customerType", "operation": "equals", "value": "premium"}]}], "fallbackOutput": "standard", "vip?": "vip-path", "standard?": "standard-path"}}',
      example_config: '{"mode": "rules|expression", "rules": "[{outputKey: string, conditions: Condition[]}]", "expression?": "string", "fallbackOutput?": "string", "item?": "any"}',
      get_from_state: [],
      post_to_state: ['switchResult', 'selectedEdge', 'matchedRule']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      mode = 'rules',
      rules = [],
      expression,
      fallbackOutput = 'default',
      item
    } = (config as SwitchConfig) || {};

    // Validate mode
    if (mode !== 'rules' && mode !== 'expression') {
      return {
        error: () => ({
          error: `Invalid mode: ${mode}. Must be "rules" or "expression"`,
          nodeId: context.nodeId
        })
      };
    }

    try {
      // Determine which item to evaluate (from config or context.inputs)
      const itemToEvaluate = item !== undefined ? item : context.inputs;

      let selectedEdge: string;
      let matchedRule: Rule | undefined;

      if (mode === 'rules') {
        // Rules mode: evaluate conditions in order
        const result = this.evaluateRules(rules, itemToEvaluate);
        selectedEdge = result.edge;
        matchedRule = result.rule;
      } else {
        // Expression mode: evaluate JavaScript expression
        selectedEdge = this.evaluateExpression(expression, itemToEvaluate);
      }

      // Use fallback if no edge determined
      if (!selectedEdge) {
        selectedEdge = fallbackOutput;
      }

      // Store result in state
      context.state.switchResult = itemToEvaluate;
      context.state.selectedEdge = selectedEdge;
      if (matchedRule) {
        context.state.matchedRule = matchedRule;
      }

      // Return dynamic edge based on selected edge
      return {
        [selectedEdge]: () => ({
          item: itemToEvaluate,
          edge: selectedEdge,
          matchedRule: matchedRule?.outputKey,
          mode
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Switch operation failed',
          nodeId: context.nodeId,
          mode,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Evaluate rules in order and return the first matching edge
   */
  private evaluateRules(rules: Rule[], item: any): { edge: string; rule?: Rule } {
    for (const rule of rules) {
      if (!rule.outputKey || !rule.conditions || rule.conditions.length === 0) {
        continue;
      }

      // Evaluate all conditions for this rule
      if (this.evaluateConditions(rule.conditions, item)) {
        return { edge: rule.outputKey, rule };
      }
    }

    // No matching rule
    return { edge: '' };
  }

  /**
   * Evaluate all conditions for a rule (with AND/OR logic)
   */
  private evaluateConditions(conditions: Condition[], item: any): boolean {
    if (conditions.length === 0) {
      return false;
    }

    let result = true;
    let combineMode: 'AND' | 'OR' = 'AND';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]!;
      const conditionResult = this.evaluateSingleCondition(condition, item);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (combineMode === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // Set combine mode for next iteration
      combineMode = condition.combineWith || 'AND';

      // Early exit optimization for AND chains
      if (combineMode === 'AND' && !result) {
        return false;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition against an item
   */
  private evaluateSingleCondition(condition: Condition, item: any): boolean {
    const { field, dataType = 'string', operation, value, value2 } = condition;

    // Get field value from item (supports dot notation)
    const fieldValue = this.getNestedValue(item, field);

    // Handle different data types
    switch (dataType) {
      case 'string':
        return this.evaluateStringCondition(fieldValue, operation, value);
      case 'number':
        return this.evaluateNumberCondition(fieldValue, operation, value, value2);
      case 'boolean':
        return this.evaluateBooleanCondition(fieldValue, operation, value);
      case 'date':
        return this.evaluateDateCondition(fieldValue, operation, value, value2);
      case 'array':
        return this.evaluateArrayCondition(fieldValue, operation, value);
      case 'object':
        return this.evaluateObjectCondition(fieldValue, operation, value);
      default:
        return false;
    }
  }

  /**
   * Evaluate string conditions
   */
  private evaluateStringCondition(fieldValue: any, operation: string, value: any): boolean {
    const fieldStr = String(fieldValue ?? '');
    const valueStr = String(value ?? '');

    switch (operation) {
      case 'equals':
        return fieldStr === valueStr;
      case 'notEquals':
        return fieldStr !== valueStr;
      case 'contains':
        return fieldStr.includes(valueStr);
      case 'notContains':
        return !fieldStr.includes(valueStr);
      case 'startsWith':
        return fieldStr.startsWith(valueStr);
      case 'endsWith':
        return fieldStr.endsWith(valueStr);
      case 'regex':
        try {
          const regex = new RegExp(valueStr);
          return regex.test(fieldStr);
        } catch {
          return false;
        }
      case 'isEmpty':
        return fieldStr.length === 0;
      case 'isNotEmpty':
        return fieldStr.length > 0;
      default:
        return false;
    }
  }

  /**
   * Evaluate number conditions
   */
  private evaluateNumberCondition(
    fieldValue: any,
    operation: string,
    value: any,
    value2?: any
  ): boolean {
    const fieldNum = Number(fieldValue);
    const valueNum = Number(value);
    const value2Num = value2 !== undefined ? Number(value2) : undefined;

    if (isNaN(fieldNum) || isNaN(valueNum)) {
      return false;
    }

    switch (operation) {
      case 'equals':
        return fieldNum === valueNum;
      case 'notEquals':
        return fieldNum !== valueNum;
      case 'gt':
        return fieldNum > valueNum;
      case 'gte':
        return fieldNum >= valueNum;
      case 'lt':
        return fieldNum < valueNum;
      case 'lte':
        return fieldNum <= valueNum;
      case 'between':
        if (value2Num === undefined || isNaN(value2Num)) {
          return false;
        }
        return fieldNum >= valueNum && fieldNum <= value2Num;
      default:
        return false;
    }
  }

  /**
   * Evaluate boolean conditions
   */
  private evaluateBooleanCondition(fieldValue: any, operation: string, value: any): boolean {
    const fieldBool = Boolean(fieldValue);
    const valueBool = Boolean(value);

    switch (operation) {
      case 'true':
        return fieldBool === true;
      case 'false':
        return fieldBool === false;
      case 'equals':
        return fieldBool === valueBool;
      default:
        return false;
    }
  }

  /**
   * Evaluate date conditions
   */
  private evaluateDateCondition(
    fieldValue: any,
    operation: string,
    value: any,
    value2?: any
  ): boolean {
    try {
      const fieldDate = new Date(fieldValue);
      const valueDate = new Date(value);

      if (isNaN(fieldDate.getTime()) || isNaN(valueDate.getTime())) {
        return false;
      }

      switch (operation) {
        case 'before':
          return fieldDate < valueDate;
        case 'after':
          return fieldDate > valueDate;
        case 'equals':
          return fieldDate.getTime() === valueDate.getTime();
        case 'between': {
          if (!value2) {
            return false;
          }
          const value2Date = new Date(value2);
          if (isNaN(value2Date.getTime())) {
            return false;
          }
          return fieldDate >= valueDate && fieldDate <= value2Date;
        }
        default:
          return false;
      }
    } catch {
      return false;
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
      case 'lengthEquals':
        return fieldValue.length === Number(value);
      case 'lengthGt':
        return fieldValue.length > Number(value);
      case 'lengthLt':
        return fieldValue.length < Number(value);
      default:
        return false;
    }
  }

  /**
   * Evaluate object conditions
   */
  private evaluateObjectCondition(fieldValue: any, operation: string, value: any): boolean {
    if (typeof fieldValue !== 'object' || fieldValue === null) {
      return false;
    }

    switch (operation) {
      case 'isEmpty':
        return Object.keys(fieldValue).length === 0;
      case 'isNotEmpty':
        return Object.keys(fieldValue).length > 0;
      case 'hasProperty':
        return value in fieldValue;
      case 'notHasProperty':
        return !(value in fieldValue);
      default:
        return false;
    }
  }

  /**
   * Evaluate JavaScript expression
   */
  private evaluateExpression(expression: string | undefined, item: any): string {
    if (!expression) {
      return '';
    }

    try {
      // Create a safe evaluation context
      // Note: In production, consider using a safer expression evaluator
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const func = new Function('item', `return ${expression}`);
      const result = func(item);

      // Return the result as a string (edge name)
      return String(result || '');

    } catch (error) {
      throw new Error(
        `Failed to evaluate expression: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) {
      return obj;
    }

    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

export default SwitchNode;
