/**
 * Integration test for WorkflowParser + ExecutionEngine
 * Tests the complete flow from JSON workflow to AST to execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser } from './parser/WorkflowParser';
import { ExecutionEngine } from './engine/ExecutionEngine';
import { NodeRegistry } from './registry/NodeRegistry';
import { StateManager } from './state/StateManager';
import { WorkflowNode } from '../../shared/src/types';

// Test nodes for integration testing
class IntegrationActionNode extends WorkflowNode {
  metadata = {
    id: 'action',
    name: 'Integration Action Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    // Store execution trace
    if (!context.state.executionTrace) {
      context.state.executionTrace = [];
    }
    context.state.executionTrace.push({
      nodeId: 'action',
      message: config?.message || 'action executed',
      uniqueId: context.nodeId
    });

    // Return edge map based on configuration
    return {
      success: () => ({ processed: true }),
      done: () => ({ completed: true }),
      next: () => ({ continue: true })
    };
  }
}

class IntegrationDecisionNode extends WorkflowNode {
  metadata = {
    id: 'decision',
    name: 'Integration Decision Node',
    version: '1.0.0'
  };

  async execute(context: any, config?: any) {
    // Store execution trace
    if (!context.state.executionTrace) {
      context.state.executionTrace = [];
    }
    context.state.executionTrace.push({
      nodeId: 'decision',
      condition: config?.condition || 'default'
    });

    const condition = config?.condition || context.state.condition || true;
    
    return {
      true: () => condition ? { result: 'true_path' } : undefined,
      false: () => !condition ? { result: 'false_path' } : undefined
    };
  }
}

describe('WorkflowParser + ExecutionEngine Integration', () => {
  let parser: WorkflowParser;
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;

  beforeEach(async () => {
    registry = new NodeRegistry();
    stateManager = new StateManager();
    parser = new WorkflowParser(registry);
    engine = new ExecutionEngine(registry, stateManager);

    // Register integration test nodes
    await registry.register(IntegrationActionNode);
    await registry.register(IntegrationDecisionNode);
  });

  it('should parse and execute a nested workflow end-to-end', async () => {
    const workflowDefinition = {
      id: 'integration-nested-workflow',
      name: 'Integration Nested Workflow',
      version: '1.0.0',
      initialState: { condition: true, executionTrace: [] },
      workflow: [
        {
          decision: {
            condition: 'user.isAuthenticated',
            'true?': {
              action: {
                message: 'Welcome authenticated user',
                'success?': 'action'
              }
            },
            'false?': {
              action: {
                message: 'Please authenticate',
                'done?': 'action'
              }
            }
          }
        },
        'action'
      ]
    };

    // Step 1: Parse the workflow definition into AST
    const parsedWorkflow = parser.parse(workflowDefinition);
    
    // Verify AST structure
    expect(parsedWorkflow.nodes).toHaveLength(2);
    
    const rootDecision = parsedWorkflow.nodes[0];
    expect(rootDecision?.nodeId).toBe('decision');
    expect(rootDecision?.children.length).toBeGreaterThan(0);
    
    // Verify nested structure
    const trueEdge = rootDecision?.edges['true'];
    expect(trueEdge?.type).toBe('nested');
    expect(trueEdge?.nestedNode?.nodeId).toBe('action');
    expect(trueEdge?.nestedNode?.config).toEqual({ message: 'Welcome authenticated user' });

    // Step 2: Execute the parsed workflow
    const result = await engine.execute(parsedWorkflow);
    
    expect(result.status).toBe('completed');
    expect(result.finalState?.executionTrace).toBeDefined();
    
    const trace = result.finalState?.executionTrace || [];
    
    // Should have executed the decision node
    expect(trace.some((entry: any) => entry.nodeId === 'decision')).toBe(true);
    
    // Should have executed at least one action node
    expect(trace.some((entry: any) => entry.nodeId === 'action')).toBe(true);
    
    console.log('Integration test execution trace:', JSON.stringify(trace, null, 2));
  });

  it('should handle simple nested configuration', async () => {
    const workflowDefinition = {
      id: 'simple-nested-workflow',
      name: 'Simple Nested Workflow',
      version: '1.0.0',
      initialState: { condition: true, executionTrace: [] },
      workflow: [
        {
          action: {
            message: 'Root action',
            'success?': {
              action: {
                message: 'Nested action',
                'done?': 'action'
              }
            }
          }
        },
        'action'
      ]
    };

    // Parse and execute
    const parsedWorkflow = parser.parse(workflowDefinition);
    const result = await engine.execute(parsedWorkflow);
    
    expect(result.status).toBe('completed');
    
    const trace = result.finalState?.executionTrace || [];
    console.log('Simple nested execution trace:', JSON.stringify(trace, null, 2));
    
    // Should have executed root action
    expect(trace.some((entry: any) => entry.message === 'Root action')).toBe(true);
  });

  it('should handle array sequences', async () => {
    const workflowDefinition = {
      id: 'sequence-workflow',
      name: 'Sequence Workflow',
      version: '1.0.0',
      initialState: { executionTrace: [] },
      workflow: [
        {
          action: {
            message: 'Start sequence',
            'success?': [
              'action',
              {
                action: {
                  message: 'Middle of sequence'
                }
              },
              'action'
            ]
          }
        }
      ]
    };

    // Parse and execute
    const parsedWorkflow = parser.parse(workflowDefinition);
    const result = await engine.execute(parsedWorkflow);
    
    expect(result.status).toBe('completed');
    
    const trace = result.finalState?.executionTrace || [];
    console.log('Sequence execution trace:', JSON.stringify(trace, null, 2));
    
    // Should have executed the start action
    expect(trace.some((entry: any) => entry.message === 'Start sequence')).toBe(true);
  });

  it('should demonstrate complete AST traversal capabilities', async () => {
    const workflowDefinition = {
      id: 'ast-demo-workflow',
      name: 'AST Demo Workflow',
      version: '1.0.0',
      workflow: [
        {
          decision: {
            'true?': {
              action: {
                message: 'Deeply nested action',
                'next?': 'action'
              }
            }
          }
        },
        'action'
      ]
    };

    // Parse the workflow
    const parsedWorkflow = parser.parse(workflowDefinition);
    
    // Demonstrate AST traversal
    function traverseAST(node: any, depth = 0): any[] {
      const result = [{
        nodeId: node.nodeId,
        uniqueId: node.uniqueId,
        depth: node.depth,
        hasChildren: node.children.length > 0,
        edgeCount: Object.keys(node.edges).length
      }];
      
      // Recursively traverse children
      for (const child of node.children) {
        result.push(...traverseAST(child, depth + 1));
      }
      
      return result;
    }
    
    const astStructure = parsedWorkflow.nodes.flatMap(node => traverseAST(node));
    console.log('AST Structure:', JSON.stringify(astStructure, null, 2));
    
    // Verify AST structure
    expect(astStructure.length).toBeGreaterThan(1);
    expect(astStructure.some(node => node.depth > 0)).toBe(true);
    expect(astStructure.some(node => node.hasChildren)).toBe(true);
  });
});