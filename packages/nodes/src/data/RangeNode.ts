/**
 * RangeNode - Iterate through a numeric range like Python's range() function
 *
 * This node is designed to work with the workflow loop pattern (... suffix). It tracks iteration
 * progress in state and emits a different edge depending on whether there are more values to process.
 *
 * On each execution:
 * - First execution: Initialize with start value, emit first value via `current_step` edge
 * - Subsequent executions (loop re-entry): Increment by step, emit next value
 * - When value reaches/exceeds stop: Emit `complete` edge instead of `current_step`
 * - Empty ranges (where start >= stop for positive step, or start <= stop for negative step): Emit `complete` immediately
 *
 * Common use cases:
 * - Counting from 1 to 10
 * - Processing numbered items in sequence
 * - Creating countdown timers (using negative step)
 * - Generating sequences with custom intervals
 * - Any scenario where you need for-loop-like iteration in a workflow
 *
 * @example
 * ```json
 * {
 *   "range...": {
 *     "start": 1,
 *     "stop": 11,
 *     "step": 1,
 *     "current_step?": "process-number",
 *     "complete?": "done-counting",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "countdown...": {
 *     "start": 10,
 *     "stop": 0,
 *     "step": -1,
 *     "current_step?": "show-countdown",
 *     "complete?": "blast-off"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * Configuration interface for RangeNode
 */
interface RangeConfig {
  /** Starting value (inclusive, default: 0) */
  start?: number;
  /** Ending value (exclusive, like Python range) - REQUIRED */
  stop?: number;
  /** Step increment (default: 1, can be negative for counting down) */
  step?: number;
  /** Optional key to track iteration progress in state (default: '__range_<nodeId>') */
  stateKey?: string;
  /** Key name to store current value in state (default: 'rangeValue') */
  valueKey?: string;
  /** Key name to store current index in state (default: 'rangeIndex') */
  indexKey?: string;
}

/**
 * Internal state structure for tracking iteration progress
 */
interface RangeIterationState {
  /** Starting value */
  start: number;
  /** Ending value (exclusive) */
  stop: number;
  /** Step increment */
  step: number;
  /** Current value in the range */
  currentValue: number;
  /** Current iteration index (0-based) */
  currentIndex: number;
  /** Total number of iterations */
  totalIterations: number;
  /** Whether iteration has started */
  initialized: boolean;
}

/**
 * Calculate the total number of iterations for a range
 * @param start - Starting value
 * @param stop - Ending value (exclusive)
 * @param step - Step increment
 * @returns Number of iterations (0 if range is empty)
 */
function calculateTotalIterations(start: number, stop: number, step: number): number {
  if (step === 0) {
    return 0; // Invalid, will be caught in validation
  }
  if (step > 0 && start >= stop) {
    return 0; // Empty range (positive step but start >= stop)
  }
  if (step < 0 && start <= stop) {
    return 0; // Empty range (negative step but start <= stop)
  }
  return Math.ceil(Math.abs((stop - start) / step));
}

export class RangeNode extends WorkflowNode {
  metadata = {
    id: 'range',
    name: 'Range Iterator',
    version: '1.0.0',
    description: 'Iterate through a numeric range like Python\'s range() function. Designed for loop workflows with ... suffix.',
    inputs: ['start', 'stop', 'step', 'stateKey', 'valueKey', 'indexKey'],
    outputs: ['rangeValue', 'rangeIndex', 'rangeTotal', 'rangeIsFirst', 'rangeIsLast'],
    ai_hints: {
      purpose: 'Iterate through numeric ranges one value at a time, like a for-loop in programming. Emits current_step edge for each value and complete edge when done.',
      when_to_use: 'When you need to iterate through a sequence of numbers within a workflow loop. Use with the ... suffix on the node ID to enable automatic loop-back behavior. Similar to Python\'s range(start, stop, step).',
      expected_edges: ['current_step', 'complete', 'error'],
      example_usage: '{"range...": {"start": 1, "stop": 11, "step": 1, "current_step?": "process-number", "complete?": "done-counting", "error?": "handle-error"}}',
      example_config: '{"start?": "number (default: 0)", "stop": "number (required, exclusive)", "step?": "number (default: 1, can be negative)", "valueKey?": "string (default: rangeValue)", "indexKey?": "string (default: rangeIndex)"}',
      get_from_state: ['iteration progress (internal tracking)'],
      post_to_state: ['rangeValue (or custom valueKey)', 'rangeIndex (or custom indexKey)', 'rangeTotal', 'rangeIsFirst', 'rangeIsLast']
    }
  };

  async execute(context: ExecutionContext, config?: RangeConfig): Promise<EdgeMap> {
    // Extract configuration with defaults
    const {
      start = 0,
      stop,
      step = 1,
      stateKey,
      valueKey = 'rangeValue',
      indexKey = 'rangeIndex'
    } = config || {};

    // Generate internal state key for tracking iteration progress
    const internalStateKey = stateKey || `__range_${context.nodeId}`;

    // Get or initialize iteration state
    let iterationState = context.state[internalStateKey] as RangeIterationState | undefined;

    // Validation BEFORE try-catch (only on first execution)
    if (!iterationState || !iterationState.initialized) {
      // Validate stop parameter (required)
      if (stop === undefined || stop === null) {
        return {
          error: () => ({
            error: 'Missing required parameter: stop',
            nodeId: context.nodeId,
            expected: 'number (the ending value, exclusive)',
            received: typeof stop
          })
        };
      }

      // Validate that stop is a number
      if (typeof stop !== 'number' || Number.isNaN(stop)) {
        return {
          error: () => ({
            error: 'Parameter "stop" must be a valid number',
            nodeId: context.nodeId,
            expected: 'number',
            received: typeof stop,
            value: stop
          })
        };
      }

      // Validate that start is a number
      if (typeof start !== 'number' || Number.isNaN(start)) {
        return {
          error: () => ({
            error: 'Parameter "start" must be a valid number',
            nodeId: context.nodeId,
            expected: 'number',
            received: typeof start,
            value: start
          })
        };
      }

      // Validate that step is a number
      if (typeof step !== 'number' || Number.isNaN(step)) {
        return {
          error: () => ({
            error: 'Parameter "step" must be a valid number',
            nodeId: context.nodeId,
            expected: 'number',
            received: typeof step,
            value: step
          })
        };
      }

      // Validate that step is not zero
      if (step === 0) {
        return {
          error: () => ({
            error: 'Parameter "step" cannot be zero (would cause infinite loop)',
            nodeId: context.nodeId,
            suggestion: 'Use a positive step to count up, or a negative step to count down'
          })
        };
      }
    }

    try {
      // First execution: Initialize iteration state
      if (!iterationState || !iterationState.initialized) {
        const totalIterations = calculateTotalIterations(start, stop!, step);

        // Initialize iteration state
        iterationState = {
          start,
          stop: stop!,
          step,
          currentValue: start,
          currentIndex: 0,
          totalIterations,
          initialized: true
        };

        // Handle empty range case - emit complete immediately
        if (totalIterations === 0) {
          // Clean up iteration state
          delete context.state[internalStateKey];

          // Set state indicators for empty range
          context.state[valueKey] = undefined;
          context.state[indexKey] = -1;
          context.state.rangeTotal = 0;
          context.state.rangeIsFirst = false;
          context.state.rangeIsLast = false;

          return {
            complete: () => ({
              message: 'Range is empty, no values to iterate',
              start,
              stop: stop!,
              step,
              totalIterations: 0,
              valuesProcessed: 0
            })
          };
        }

        // Store iteration state
        context.state[internalStateKey] = iterationState;
      }

      // Get current values
      const currentValue = iterationState.currentValue;
      const currentIndex = iterationState.currentIndex;
      const totalIterations = iterationState.totalIterations;

      // Check if we've processed all values
      if (currentIndex >= totalIterations) {
        // Clean up iteration state
        delete context.state[internalStateKey];

        // Set final state values
        context.state[valueKey] = undefined;
        context.state[indexKey] = totalIterations;
        context.state.rangeTotal = totalIterations;
        context.state.rangeIsFirst = false;
        context.state.rangeIsLast = true;

        return {
          complete: () => ({
            message: 'All values in range have been processed',
            start: iterationState!.start,
            stop: iterationState!.stop,
            step: iterationState!.step,
            totalIterations,
            valuesProcessed: totalIterations
          })
        };
      }

      // Calculate position flags
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === totalIterations - 1;

      // Update state with current value information
      context.state[valueKey] = currentValue;
      context.state[indexKey] = currentIndex;
      context.state.rangeTotal = totalIterations;
      context.state.rangeIsFirst = isFirst;
      context.state.rangeIsLast = isLast;

      // Increment for next iteration
      iterationState.currentValue = currentValue + iterationState.step;
      iterationState.currentIndex++;
      context.state[internalStateKey] = iterationState;

      // Emit current_step edge
      return {
        'current_step': () => ({
          value: currentValue,
          index: currentIndex,
          totalIterations,
          isFirst,
          isLast,
          remaining: totalIterations - currentIndex - 1,
          start: iterationState!.start,
          stop: iterationState!.stop,
          step: iterationState!.step
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Range iteration failed',
          nodeId: context.nodeId,
          details: error instanceof Error ? error.stack : undefined
        })
      };
    }
  }

  /**
   * Reset the iteration state for a specific node
   * Can be called if you need to restart iteration from the beginning
   *
   * @param context - Execution context
   * @param stateKey - Optional custom state key
   */
  static resetIteration(context: ExecutionContext, stateKey?: string): void {
    const nodeId = context.nodeId;
    const internalStateKey = stateKey || `__range_${nodeId}`;
    delete context.state[internalStateKey];
  }
}

export default RangeNode;
