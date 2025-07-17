import type { EdgeMap, WorkflowDefinition } from 'shared/dist';
import type { EdgeRouteResult } from '../routing/EdgeRouter';

/**
 * Loop execution state tracking
 */
export interface LoopState {
  /** ID of the node that initiated the loop */
  nodeId: string;
  /** Current iteration count */
  iteration: number;
  /** Maximum allowed iterations */
  maxIterations: number;
  /** Loop sequence to execute */
  sequence: string[];
  /** Current position in the sequence */
  sequenceIndex: number;
  /** Whether the loop is currently executing */
  isActive: boolean;
  /** Timestamp when loop started */
  startTime: number;
  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;
}

/**
 * Loop execution result
 */
export interface LoopExecutionResult {
  /** Whether this is a loop operation */
  isLoop: boolean;
  /** Next node to execute */
  nextNode: string | null;
  /** Whether to continue loop execution */
  continueLoop: boolean;
  /** Whether loop has terminated */
  terminated: boolean;
  /** Loop termination reason */
  terminationReason?: 'completed' | 'max_iterations' | 'timeout' | 'non_loop_edge';
  /** Current loop state */
  loopState?: LoopState;
}

/**
 * LoopManager class responsible for handling loop construct execution
 * Manages loop iteration tracking, sequence execution, and termination logic
 */
export class LoopManager {
  private loops: Map<string, LoopState>;
  private readonly DEFAULT_MAX_ITERATIONS = 100;
  private readonly DEFAULT_MAX_EXECUTION_TIME = 30000; // 30 seconds

  constructor() {
    this.loops = new Map();
  }

  /**
   * Checks if an edge map contains a loop edge
   * @param edgeMap - Edge map from node execution
   * @returns True if contains loop edge
   */
  hasLoopEdge(edgeMap: EdgeMap): boolean {
    return edgeMap.hasOwnProperty('loop');
  }

  /**
   * Checks if an execution is currently in a loop
   * @param executionId - Execution ID
   * @returns True if in loop
   */
  isInLoop(executionId: string): boolean {
    const loopState = this.loops.get(executionId);
    return loopState?.isActive ?? false;
  }

  /**
   * Gets current loop state for an execution
   * @param executionId - Execution ID
   * @returns Loop state or undefined
   */
  getLoopState(executionId: string): LoopState | undefined {
    return this.loops.get(executionId);
  }

  /**
   * Starts a new loop execution
   * @param executionId - Execution ID
   * @param nodeId - Node that initiated the loop
   * @param loopSequence - Sequence of nodes to execute in loop
   * @param maxIterations - Maximum iterations allowed
   * @param maxExecutionTime - Maximum execution time
   * @returns Loop execution result
   */
  startLoop(
    executionId: string,
    nodeId: string,
    loopSequence: string[],
    maxIterations?: number,
    maxExecutionTime?: number
  ): LoopExecutionResult {
    // Check if already in loop
    if (this.isInLoop(executionId)) {
      throw new Error(`Execution ${executionId} is already in a loop`);
    }

    // Validate loop sequence
    if (!loopSequence || loopSequence.length === 0) {
      throw new Error('Loop sequence cannot be empty');
    }

    // Create loop state
    const loopState: LoopState = {
      nodeId,
      iteration: 0,
      maxIterations: maxIterations ?? this.DEFAULT_MAX_ITERATIONS,
      sequence: [...loopSequence],
      sequenceIndex: 0,
      isActive: true,
      startTime: Date.now(),
      maxExecutionTime: maxExecutionTime ?? this.DEFAULT_MAX_EXECUTION_TIME
    };

    this.loops.set(executionId, loopState);

    return {
      isLoop: true,
      nextNode: loopSequence[0],
      continueLoop: true,
      terminated: false,
      loopState
    };
  }

  /**
   * Continues loop execution after a node completes
   * @param executionId - Execution ID
   * @param completedNodeId - Node that just completed
   * @param edgeMap - Edge map from completed node
   * @returns Loop execution result
   */
  continueLoop(
    executionId: string,
    completedNodeId: string,
    edgeMap: EdgeMap
  ): LoopExecutionResult {
    const loopState = this.loops.get(executionId);
    
    if (!loopState || !loopState.isActive) {
      return {
        isLoop: false,
        nextNode: null,
        continueLoop: false,
        terminated: true,
        terminationReason: 'completed'
      };
    }

    // Check for timeout
    if (Date.now() - loopState.startTime > loopState.maxExecutionTime) {
      return this.terminateLoop(executionId, 'timeout');
    }

    // Check for max iterations
    if (loopState.iteration >= loopState.maxIterations) {
      return this.terminateLoop(executionId, 'max_iterations');
    }

    // Check if we're in the loop sequence (not at the loop node)
    if (loopState.sequenceIndex >= 0 && loopState.sequenceIndex < loopState.sequence.length) {
      // Move to next node in sequence
      loopState.sequenceIndex++;
      
      if (loopState.sequenceIndex < loopState.sequence.length) {
        // Continue with next node in sequence
        return {
          isLoop: true,
          nextNode: loopState.sequence[loopState.sequenceIndex],
          continueLoop: true,
          terminated: false,
          loopState
        };
      } else {
        // Sequence complete, return to loop node
        return this.returnToLoopNode(executionId);
      }
    }

    // We're back at the loop node, check the edge map
    return this.processLoopNodeResult(executionId, edgeMap);
  }

  /**
   * Processes the result from a loop node execution
   * @param executionId - Execution ID
   * @param edgeMap - Edge map from loop node
   * @returns Loop execution result
   */
  private processLoopNodeResult(executionId: string, edgeMap: EdgeMap): LoopExecutionResult {
    const loopState = this.loops.get(executionId);
    
    if (!loopState) {
      throw new Error(`No loop state found for execution ${executionId}`);
    }

    // Check for non-loop edges (termination condition)
    const nonLoopEdges = Object.keys(edgeMap).filter(key => key !== 'loop');
    
    if (nonLoopEdges.length > 0 && !this.hasLoopEdge(edgeMap)) {
      // Non-loop edge found and no loop edge, terminate loop
      return this.terminateLoop(executionId, 'non_loop_edge');
    }

    // Loop edge found, continue iteration
    if (this.hasLoopEdge(edgeMap)) {
      return this.startNextIteration(executionId);
    }

    // No edges found, terminate loop
    return this.terminateLoop(executionId, 'completed');
  }

  /**
   * Starts the next iteration of the loop
   * @param executionId - Execution ID
   * @returns Loop execution result
   */
  private startNextIteration(executionId: string): LoopExecutionResult {
    const loopState = this.loops.get(executionId);
    
    if (!loopState) {
      throw new Error(`No loop state found for execution ${executionId}`);
    }

    // Check iteration limit before incrementing
    if (loopState.iteration + 1 >= loopState.maxIterations) {
      return this.terminateLoop(executionId, 'max_iterations');
    }

    // Check timeout
    if (Date.now() - loopState.startTime > loopState.maxExecutionTime) {
      return this.terminateLoop(executionId, 'timeout');
    }

    // Increment iteration
    loopState.iteration++;
    loopState.sequenceIndex = 0;

    // Start next iteration
    return {
      isLoop: true,
      nextNode: loopState.sequence[0],
      continueLoop: true,
      terminated: false,
      loopState
    };
  }

  /**
   * Returns execution to the loop node after sequence completion
   * @param executionId - Execution ID
   * @returns Loop execution result
   */
  private returnToLoopNode(executionId: string): LoopExecutionResult {
    const loopState = this.loops.get(executionId);
    
    if (!loopState) {
      throw new Error(`No loop state found for execution ${executionId}`);
    }

    // Reset sequence index to indicate we're back at the loop node
    loopState.sequenceIndex = -1;

    return {
      isLoop: true,
      nextNode: loopState.nodeId,
      continueLoop: true,
      terminated: false,
      loopState
    };
  }

  /**
   * Terminates a loop execution
   * @param executionId - Execution ID
   * @param reason - Termination reason
   * @returns Loop execution result
   */
  private terminateLoop(
    executionId: string,
    reason: 'completed' | 'max_iterations' | 'timeout' | 'non_loop_edge'
  ): LoopExecutionResult {
    const loopState = this.loops.get(executionId);
    
    if (loopState) {
      loopState.isActive = false;
    }

    this.loops.delete(executionId);

    return {
      isLoop: false,
      nextNode: null,
      continueLoop: false,
      terminated: true,
      terminationReason: reason,
      loopState
    };
  }

  /**
   * Extracts loop sequence from edge route result
   * @param routeResult - Edge route result
   * @returns Loop sequence or null if not a loop
   */
  extractLoopSequence(routeResult: EdgeRouteResult): string[] | null {
    // Check if this is a loop edge route
    if (routeResult.nextNodes.length > 0) {
      return routeResult.nextNodes;
    }
    
    return null;
  }

  /**
   * Validates if a loop sequence is valid
   * @param sequence - Loop sequence to validate
   * @param workflow - Workflow definition
   * @returns Validation errors or empty array if valid
   */
  validateLoopSequence(sequence: string[], workflow: WorkflowDefinition): string[] {
    const errors: string[] = [];
    
    for (const nodeId of sequence) {
      if (!workflow.workflow[nodeId]) {
        errors.push(`Loop sequence references non-existent node: ${nodeId}`);
      }
    }
    
    return errors;
  }

  /**
   * Gets loop statistics for monitoring
   * @param executionId - Execution ID
   * @returns Loop statistics
   */
  getLoopStats(executionId: string): any {
    const loopState = this.loops.get(executionId);
    
    if (!loopState) {
      return null;
    }

    return {
      nodeId: loopState.nodeId,
      iteration: loopState.iteration,
      maxIterations: loopState.maxIterations,
      sequenceLength: loopState.sequence.length,
      sequenceIndex: loopState.sequenceIndex,
      isActive: loopState.isActive,
      elapsedTime: Date.now() - loopState.startTime,
      maxExecutionTime: loopState.maxExecutionTime
    };
  }

  /**
   * Cleans up loop state for an execution
   * @param executionId - Execution ID
   */
  cleanup(executionId: string): void {
    this.loops.delete(executionId);
  }

  /**
   * Clears all loop states
   */
  clear(): void {
    this.loops.clear();
  }
}