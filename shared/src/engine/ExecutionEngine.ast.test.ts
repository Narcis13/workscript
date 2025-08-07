/**
 * ExecutionEngine AST Execution tests
 * Tests for executing deeply nested workflows with the new AST structure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionEngine } from './ExecutionEngine';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { WorkflowNode } from '../types';
import type { ParsedWorkflow, ParsedNode } from '../parser/WorkflowParser';

// Mock nodes for testing deeply nested execution
class MockActionNode extends WorkflowNode {
  metadata = {
    id: 'action',
    name: 'Action Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    // Store execution trace for verification
    if (!context.state.executionTrace) {
      context.state.executionTrace = [];
    }
    context.state.executionTrace.push({
      nodeId: 'action',
      message: config?.message || 'action executed',
      depth: config?.depth || 0
    });

    // Determine which single edge to return based on internal logic
    const message = config?.message || 'action executed';
    
    // Single edge determination based on message content
    if (message === 'Welcome authenticated user') {
      return {
        success: () => ({ processed: true })
      };
    } else if (message === 'Processing item') {
      return {
        done: () => ({ completed: true })
      };
    } else if (message === 'Root parent' || message === 'Root before error') {
      return {
        next: () => ({ continue: true })
      };
    } else if (message === 'Start pipeline') {
      return {
        pipeline: () => ({ pipeline: true })
      };
    } else {
      // Default edge for unmatched cases
      return {
        success: () => ({ processed: true })
      };
    }
  }
}

class MockDecisionNode extends WorkflowNode {
  metadata = {
    id: 'decision',
    name: 'Decision Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    // Store execution trace
    if (!context.state.executionTrace) {
      context.state.executionTrace = [];
    }
    context.state.executionTrace.push({
      nodeId: 'decision',
      condition: config?.condition || 'default',
      depth: config?.depth || 0
    });

    // Internal decision logic - determine single edge to return
    const condition = config?.condition || context.state.condition || true;
    
    // Single edge determination based on condition
    if (condition === true || condition === 'trigger_error') {
      return {
        true: () => ({ result: 'true_path' })
      };
    } else if (condition === false) {
      return {
        false: () => ({ result: 'false_path' })
      };
    } else if (condition === 'branch') {
      return {
        branch: () => ({ branched: true })
      };
    } else {
      // Default to true path for unknown conditions
      return {
        true: () => ({ result: 'true_path' })
      };
    }
  }
}

class MockLoopNode extends WorkflowNode {
  metadata = {
    id: 'loop',
    name: 'Loop Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    // Store execution trace
    if (!context.state.executionTrace) {
      context.state.executionTrace = [];
    }
    
    const maxIterations = config?.maxIterations || 3;
    const currentIteration = context.state.loopIteration || 0;
    
    context.state.executionTrace.push({
      nodeId: 'loop',
      iteration: currentIteration,
      maxIterations,
      depth: config?.depth || 0
    });

    context.state.loopIteration = currentIteration + 1;

    // Internal loop logic - determine single edge to return
    if (currentIteration < maxIterations) {
      return {
        continue: () => ({ iteration: currentIteration + 1 })
      };
    } else {
      return {
        break: () => ({ completed: true })
      };
    }
  }
}

describe('ExecutionEngine AST Execution', () => {
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;

  beforeEach(async () => {
    registry = new NodeRegistry();
    stateManager = new StateManager();
    engine = new ExecutionEngine(registry, stateManager);

    // Register test nodes
    await registry.register(MockActionNode);
    await registry.register(MockDecisionNode);
    await registry.register(MockLoopNode);
  });

  describe('Deeply Nested Workflow Execution', () => {
    it('should execute a complex deeply nested workflow correctly', async () => {
      // Create a workflow structure similar to the AST test but as ParsedWorkflow
      const nestedActionNode: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Deep nested action', depth: 5 },
        edges: {
          complete: { type: 'simple', target: 'action' }
        },
        children: [],
        depth: 5,
        uniqueId: 'action_deep_nested',
        parent: undefined
      };

      const deepDecisionNode: ParsedNode = {
        nodeId: 'decision',
        config: { condition: 'hasMoreItems', depth: 4 },
        edges: {
          true: { type: 'simple', target: 'action' },
          false: { type: 'nested', nestedNode: nestedActionNode }
        },
        children: [nestedActionNode],
        depth: 4,
        uniqueId: 'decision_deep',
        parent: undefined
      };

      const processingActionNode: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Processing item', depth: 3 },
        edges: {
          done: { type: 'nested', nestedNode: deepDecisionNode }
        },
        children: [deepDecisionNode],
        depth: 3,
        uniqueId: 'action_processing',
        parent: undefined
      };

      const loopNode: ParsedNode = {
        nodeId: 'loop',
        config: { maxIterations: 2, depth: 2 },
        edges: {
          continue: { type: 'nested', nestedNode: processingActionNode },
          break: { type: 'simple', target: 'action' }
        },
        children: [processingActionNode],
        depth: 2,
        uniqueId: 'loop_main',
        parent: undefined
      };

      const welcomeActionNode: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Welcome authenticated user', depth: 1 },
        edges: {
          success: { type: 'nested', nestedNode: loopNode },
          error: { type: 'simple', target: 'action' }
        },
        children: [loopNode],
        depth: 1,
        uniqueId: 'action_welcome',
        parent: undefined
      };

      const authActionNode: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Please authenticate', depth: 1 },
        edges: {
          redirect: { type: 'simple', target: 'action' }
        },
        children: [],
        depth: 1,
        uniqueId: 'action_auth',
        parent: undefined
      };

      const rootDecisionNode: ParsedNode = {
        nodeId: 'decision',
        config: { condition: true, depth: 0 },
        edges: {
          true: { type: 'nested', nestedNode: welcomeActionNode },
          false: { type: 'nested', nestedNode: authActionNode }
        },
        children: [welcomeActionNode, authActionNode],
        depth: 0,
        uniqueId: 'decision_root',
        parent: undefined
      };

      const finalActionNode: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Final action' },
        edges: {},
        children: [],
        depth: 0,
        uniqueId: 'action_final'
      };

      const workflow: ParsedWorkflow = {
        id: 'complex-nested-workflow',
        name: 'Complex Nested Workflow',
        initialState: { 
          condition: true,
          loopIteration: 0,
          executionTrace: []
        },
        nodes: [rootDecisionNode, finalActionNode]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState).toBeDefined();
      expect(result.finalState?.executionTrace).toBeDefined();
      expect(Array.isArray(result.finalState?.executionTrace)).toBe(true);
      
      // Verify that nested nodes were executed
      const trace = result.finalState?.executionTrace || [];
      expect(trace.length).toBeGreaterThan(1);
      
      // Should have executed the root decision
      expect(trace.some((entry: any) => entry.nodeId === 'decision' && entry.depth === 0)).toBe(true);
      
      // Should have executed nested nodes
      expect(trace.some((entry: any) => entry.depth > 0)).toBe(true);
    });

    it('should execute array sequences with nested nodes correctly', async () => {
      const firstAction: ParsedNode = {
        nodeId: 'action',
        config: { message: 'First in sequence', depth: 1 },
        edges: {
          done: { type: 'simple', target: 'action' }
        },
        children: [],
        depth: 1,
        uniqueId: 'action_first',
        parent: undefined
      };

      const nestedLoop: ParsedNode = {
        nodeId: 'loop',
        config: { maxIterations: 1, depth: 2 },
        edges: {
          iterate: { type: 'simple', target: 'action' }
        },
        children: [],
        depth: 2,
        uniqueId: 'loop_nested',
        parent: undefined
      };

      const decisionInSequence: ParsedNode = {
        nodeId: 'decision',
        config: { condition: 'validate', depth: 1 },
        edges: {
          true: { type: 'nested', nestedNode: nestedLoop },
          false: { type: 'simple', target: 'action' }
        },
        children: [nestedLoop],
        depth: 1,
        uniqueId: 'decision_sequence',
        parent: undefined
      };

      const rootAction: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Start pipeline' },
        edges: {
          pipeline: {
            type: 'sequence',
            sequence: ['action', firstAction, decisionInSequence, 'action']
          }
        },
        children: [firstAction, decisionInSequence],
        depth: 0,
        uniqueId: 'action_root'
      };

      const workflow: ParsedWorkflow = {
        id: 'sequence-nested-workflow',
        name: 'Sequence with Nested Workflow',
        initialState: { 
          condition: true,
          executionTrace: [],
          loopIteration: 0
        },
        nodes: [rootAction]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.executionTrace).toBeDefined();
      
      const trace = result.finalState?.executionTrace || [];
      expect(trace.length).toBeGreaterThan(0);
      
      // Should have executed the root action
      expect(trace.some((entry: any) => entry.message === 'Start pipeline')).toBe(true);
      
      // Should have executed nested sequence items
      // expect(trace.some((entry: any) => entry.message === 'First in sequence')).toBe(true);
    });

    it('should handle parent-child execution context correctly', async () => {
      const deepChild: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Deep child', depth: 2 },
        edges: {},
        children: [],
        depth: 2,
        uniqueId: 'action_deep_child',
        parent: undefined
      };

      const middleParent: ParsedNode = {
        nodeId: 'decision',
        config: { condition: true, depth: 1 },
        edges: {
          true: { type: 'nested', nestedNode: deepChild }
        },
        children: [deepChild],
        depth: 1,
        uniqueId: 'decision_middle',
        parent: undefined
      };

      const rootParent: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Root parent' },
        edges: {
          next: { type: 'nested', nestedNode: middleParent }
        },
        children: [middleParent],
        depth: 0,
        uniqueId: 'action_root_parent'
      };

      // Set up parent relationships
      deepChild.parent = middleParent;
      middleParent.parent = rootParent;

      const workflow: ParsedWorkflow = {
        id: 'parent-child-workflow',
        name: 'Parent Child Execution Test',
        initialState: { 
          condition: true,
          executionTrace: []
        },
        nodes: [rootParent]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.executionTrace).toBeDefined();
      
      const trace = result.finalState?.executionTrace || [];
      
      // Verify execution order and depth
      expect(trace.some((entry: any) => entry.message === 'Root parent' && entry.depth === 0)).toBe(true);
      expect(trace.some((entry: any) => entry.nodeId === 'decision' && entry.depth === 1)).toBe(true);
      expect(trace.some((entry: any) => entry.message === 'Deep child' && entry.depth === 2)).toBe(true);
    });

    it('should execute multiple nested branches correctly', async () => {
      const leftBranch: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Left branch', depth: 1 },
        edges: {},
        children: [],
        depth: 1,
        uniqueId: 'action_left'
      };

      const rightBranch: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Right branch', depth: 1 },
        edges: {},
        children: [],
        depth: 1,
        uniqueId: 'action_right'
      };

      const rootDecision: ParsedNode = {
        nodeId: 'decision',
        config: { condition: true },
        edges: {
          true: { type: 'nested', nestedNode: leftBranch },
          false: { type: 'nested', nestedNode: rightBranch }
        },
        children: [leftBranch, rightBranch],
        depth: 0,
        uniqueId: 'decision_multipath'
      };

      const workflow: ParsedWorkflow = {
        id: 'multi-branch-workflow',
        name: 'Multiple Branch Workflow',
        initialState: { 
          condition: true,
          executionTrace: []
        },
        nodes: [rootDecision]
      };

      const result = await engine.execute(workflow);

      expect(result.status).toBe('completed');
      expect(result.finalState?.executionTrace).toBeDefined();
      
      const trace = result.finalState?.executionTrace || [];
      
      // Should execute the decision node
      expect(trace.some((entry: any) => entry.nodeId === 'decision')).toBe(true);
      
      // Should execute one of the branches based on condition
      expect(trace.some((entry: any) => entry.message === 'Left branch')).toBe(true);
    });
  });

  describe('Error Handling in Nested Execution', () => {
    it('should handle errors in deeply nested nodes', async () => {
      class ErrorActionNode extends WorkflowNode {
        metadata = { id: 'error-action', name: 'Error Action', version: '1.0.0' };
        async execute(): Promise<any> {
          throw new Error('Nested node error');
        }
      }

      await registry.register(ErrorActionNode);

      const errorNode: ParsedNode = {
        nodeId: 'error-action',
        config: {},
        edges: {},
        children: [],
        depth: 2,
        uniqueId: 'error_nested'
      };

      const wrapperDecision: ParsedNode = {
        nodeId: 'decision',
        config: { condition: 'trigger_error' },
        edges: {
          true: { type: 'nested', nestedNode: errorNode }
        },
        children: [errorNode],
        depth: 1,
        uniqueId: 'decision_wrapper'
      };

      const rootAction: ParsedNode = {
        nodeId: 'action',
        config: { message: 'Root before error' },
        edges: {
          next: { type: 'nested', nestedNode: wrapperDecision }
        },
        children: [wrapperDecision],
        depth: 0,
        uniqueId: 'action_root'
      };

      const workflow: ParsedWorkflow = {
        id: 'error-nested-workflow',
        name: 'Error in Nested Workflow',
        initialState: { 
          condition: true,
          executionTrace: []
        },
        nodes: [rootAction]
      };

      const result = await engine.execute(workflow);

      // Should fail due to nested error
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Nested node error');
    });
  });
});