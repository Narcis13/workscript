/**
 * WhileNode - Loop while a condition is true, like JavaScript's while loop
 *
 * This node is designed to work with the workflow loop pattern (... suffix). It evaluates
 * a condition on each execution and emits the `do` edge while true, `done` edge when false.
 *
 * When the condition becomes false, the `done` edge is emitted and the loop exits automatically.
 * The workflow continues with the next step after the while block.
 *
 * On each execution:
 * - Evaluate the condition (can be a boolean state reference or comparison)
 * - If condition is true: Emit `do` edge for loop body execution
 * - If condition is false: Emit `done` edge to exit the loop
 * - Tracks iteration count for safety with configurable max iterations
 *
 * Common use cases:
 * - Processing until a flag becomes false
 * - Waiting for a condition to be met
 * - Polling-style loops with exit conditions
 * - Any scenario where you need while-loop-like iteration in a workflow
 *
 * @example Simple boolean condition
 * ```json
 * {
 *   "while...": {
 *     "condition": "$.shouldContinue",
 *     "do?": { "log": { "message": "Processing..." } }
 *   }
 * },
 * { "log": { "message": "Loop finished!" } }
 * ```
 *
 * @example Count to 10 using math node for increment
 * ```json
 * {
 *   "while...": {
 *     "condition": { "left": "$.count", "operator": "<", "right": 10 },
 *     "do?": [
 *       { "log": { "message": "Count is {{$.count}}" } },
 *       { "math": { "operation": "add", "values": ["$.count", 1] } },
 *       { "$.count": "$.mathResult" }
 *     ]
 *   }
 * },
 * { "log": { "message": "Finished! Final count: {{$.count}}" } }
 * ```
 *
 * @example With max iterations safeguard
 * ```json
 * {
 *   "while...": {
 *     "condition": "$.hasMoreData",
 *     "maxIterations": 100,
 *     "do?": { "fetchApi": { "url": "$.nextPageUrl" } }
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * Comparison operators supported for condition objects
 */
type ComparisonOperator = '==' | '===' | '!=' | '!==' | '<' | '<=' | '>' | '>=' | 'equals' | 'notEquals' | 'less' | 'lessOrEqual' | 'greater' | 'greaterOrEqual';

/**
 * Condition can be a direct boolean or a comparison object
 */
interface ComparisonCondition {
  /** Left operand (can be state reference like $.value) */
  left: unknown;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Right operand (can be state reference like $.value) */
  right: unknown;
}

/**
 * Configuration interface for WhileNode
 */
interface WhileConfig {
  /**
   * The condition to evaluate. Can be:
   * - A boolean value (true/false)
   * - A state reference that resolves to boolean ($.isRunning)
   * - A comparison object { left, operator, right }
   */
  condition: boolean | ComparisonCondition;
  /** Maximum iterations allowed (default: 1000, prevents infinite loops) */
  maxIterations?: number;
  /** Optional key to track iteration progress in state (default: '__while_<nodeId>') */
  stateKey?: string;
  /** Key name to store current iteration count in state (default: 'whileIteration') */
  iterationKey?: string;
}

/**
 * Internal state structure for tracking iteration progress
 */
interface WhileIterationState {
  /** Current iteration count (0-based) */
  currentIteration: number;
  /** Maximum allowed iterations */
  maxIterations: number;
  /** Whether iteration has started */
  initialized: boolean;
}

/**
 * Evaluate a comparison condition
 */
function evaluateComparison(left: unknown, operator: ComparisonOperator, right: unknown): boolean {
  switch (operator) {
    case '==':
    case 'equals':
      return left == right;
    case '===':
      return left === right;
    case '!=':
    case 'notEquals':
      return left != right;
    case '!==':
      return left !== right;
    case '<':
    case 'less':
      return Number(left) < Number(right);
    case '<=':
    case 'lessOrEqual':
      return Number(left) <= Number(right);
    case '>':
    case 'greater':
      return Number(left) > Number(right);
    case '>=':
    case 'greaterOrEqual':
      return Number(left) >= Number(right);
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Evaluate the condition value
 */
function evaluateCondition(condition: boolean | ComparisonCondition): boolean {
  // Direct boolean value
  if (typeof condition === 'boolean') {
    return condition;
  }

  // Comparison object
  if (typeof condition === 'object' && condition !== null && 'operator' in condition) {
    const { left, operator, right } = condition;
    return evaluateComparison(left, operator, right);
  }

  // Truthy/falsy evaluation for other values
  return Boolean(condition);
}

export class WhileNode extends WorkflowNode {
  metadata = {
    id: 'while',
    name: 'While Loop',
    version: '1.0.0',
    description: 'Loop while a condition is true, like JavaScript\'s while loop. Designed for loop workflows with ... suffix.',
    inputs: ['condition', 'maxIterations', 'stateKey', 'iterationKey'],
    outputs: ['whileIteration', 'whileIsFirst'],
    ai_hints: {
      purpose: 'Execute a loop body repeatedly while a condition evaluates to true. Emits `do` edge for each iteration and `done` edge when condition becomes false.',
      when_to_use: 'When you need to repeat operations until a condition is no longer met. Use with the ... suffix on the node ID to enable automatic loop-back behavior. Similar to JavaScript\'s while(condition) { ... } loop.',
      expected_edges: ['do', 'done', 'error'],
      example_usage: '{"while...": {"condition": "$.shouldContinue", "do?": "process-item", "done?": "finish-processing"}}',
      example_config: '{"condition": "boolean | $.stateRef | {left, operator, right}", "maxIterations?": "number (default: 1000)", "iterationKey?": "string (default: whileIteration)"}',
      get_from_state: ['condition value (resolved from state reference)'],
      post_to_state: ['whileIteration (or custom iterationKey)', 'whileIsFirst']
    }
  };

  async execute(context: ExecutionContext, config?: WhileConfig): Promise<EdgeMap> {
    // Extract configuration with defaults
    const {
      condition,
      maxIterations = 1000,
      stateKey,
      iterationKey = 'whileIteration'
    } = config || {};

    // Generate internal state key for tracking iteration progress
    const internalStateKey = stateKey || `__while_${context.nodeId}`;

    // Get or initialize iteration state
    let iterationState = context.state[internalStateKey] as WhileIterationState | undefined;

    // Validation: condition must be provided
    if (condition === undefined) {
      return {
        error: () => ({
          error: 'Missing required parameter: condition',
          nodeId: context.nodeId,
          expected: 'boolean, state reference ($.key), or comparison object {left, operator, right}',
          received: 'undefined'
        })
      };
    }

    // Validate maxIterations
    if (typeof maxIterations !== 'number' || maxIterations <= 0) {
      return {
        error: () => ({
          error: 'Parameter "maxIterations" must be a positive number',
          nodeId: context.nodeId,
          expected: 'positive number',
          received: typeof maxIterations,
          value: maxIterations
        })
      };
    }

    try {
      // First execution: Initialize iteration state
      if (!iterationState || !iterationState.initialized) {
        iterationState = {
          currentIteration: 0,
          maxIterations,
          initialized: true
        };
        context.state[internalStateKey] = iterationState;
      }

      // Check for max iterations exceeded
      if (iterationState.currentIteration >= iterationState.maxIterations) {
        // Clean up iteration state
        delete context.state[internalStateKey];

        // Set final state values
        context.state[iterationKey] = iterationState.currentIteration;
        context.state.whileIsFirst = false;

        return {
          error: () => ({
            error: `Maximum iterations (${iterationState!.maxIterations}) exceeded`,
            nodeId: context.nodeId,
            iterationsExecuted: iterationState!.currentIteration,
            suggestion: 'Check your loop condition or increase maxIterations if intentional'
          })
        };
      }

      // Evaluate the condition
      const conditionResult = evaluateCondition(condition);

      // If condition is false, exit the loop
      if (!conditionResult) {
        // Clean up iteration state
        const finalIteration = iterationState.currentIteration;
        delete context.state[internalStateKey];

        // Set final state values
        context.state[iterationKey] = finalIteration;
        context.state.whileIsFirst = false;

        return {
          done: () => ({
            message: 'While loop condition is false, exiting loop',
            totalIterations: finalIteration,
            nodeId: context.nodeId
          })
        };
      }

      // Condition is true - execute loop body
      const currentIteration = iterationState.currentIteration;
      const isFirst = currentIteration === 0;

      // Update state with current iteration information
      context.state[iterationKey] = currentIteration;
      context.state.whileIsFirst = isFirst;

      // Increment for next iteration
      iterationState.currentIteration++;
      context.state[internalStateKey] = iterationState;

      // Emit do edge
      return {
        do: () => ({
          iteration: currentIteration,
          isFirst,
          conditionWasTrue: true,
          nodeId: context.nodeId
        })
      };

    } catch (error) {
      // Clean up on error
      delete context.state[internalStateKey];

      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'While loop execution failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Reset the iteration state for a specific node
   * Can be called if you need to restart the loop from the beginning
   *
   * @param context - Execution context
   * @param stateKey - Optional custom state key
   */
  static resetIteration(context: ExecutionContext, stateKey?: string): void {
    const nodeId = context.nodeId;
    const internalStateKey = stateKey || `__while_${nodeId}`;
    delete context.state[internalStateKey];
  }
}

export default WhileNode;
