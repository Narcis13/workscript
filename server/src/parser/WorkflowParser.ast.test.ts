import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser } from './WorkflowParser';
import { NodeRegistry } from '../registry/NodeRegistry';
import { WorkflowNode } from '../../../shared/src/types';
import type { NodeMetadata, ExecutionContext, EdgeMap } from '../../../shared/src/types';

// Mock node implementations for testing
class MockActionNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'action',
    name: 'Action Node',
    version: '1.0.0',
    description: 'A mock action node for testing'
  };

  async execute(_context: ExecutionContext, _config?: Record<string, any>): Promise<EdgeMap> {
    return { success: true };
  }
}

class MockDecisionNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'decision',
    name: 'Decision Node',
    version: '1.0.0',
    description: 'A mock decision node for testing'
  };

  async execute(_context: ExecutionContext, _config?: Record<string, any>): Promise<EdgeMap> {
    return { true: 'yes', false: 'no' };
  }
}

class MockLoopNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'loop',
    name: 'Loop Node',
    version: '1.0.0',
    description: 'A mock loop node for testing'
  };

  async execute(_context: ExecutionContext, _config?: Record<string, any>): Promise<EdgeMap> {
    return { continue: 'next', break: 'exit' };
  }
}

describe('WorkflowParser AST Generation', () => {
  let parser: WorkflowParser;
  let registry: NodeRegistry;

  beforeEach(async () => {
    registry = new NodeRegistry();
    await registry.register(MockActionNode);
    await registry.register(MockDecisionNode);
    await registry.register(MockLoopNode);
    parser = new WorkflowParser(registry);
  });

  describe('Deeply Nested Workflow Parsing', () => {
    it('should parse a complex deeply nested workflow into AST structure', () => {
      const workflow = {
        id: 'complex-nested-workflow',
        name: 'Complex Nested Workflow',
        version: '1.0.0',
        workflow: [
          {
            decision: {
              condition: 'user.isAuthenticated',
              'true?': {
                action: {
                  message: 'Welcome authenticated user',
                  'success?': {
                    loop: {
                      maxIterations: 5,
                      'continue?': {
                        action: {
                          message: 'Processing item',
                          'done?': {
                            decision: {
                              condition: 'hasMoreItems',
                              'true?': 'action',
                              'false?': {
                                action: {
                                  message: 'All items processed',
                                  'complete?': 'action'
                                }
                              }
                            }
                          }
                        }
                      },
                      'break?': 'action'
                    }
                  },
                  'error?': 'action'
                }
              },
              'false?': {
                action: {
                  message: 'Please authenticate',
                  'redirect?': 'action'
                }
              }
            }
          },
          'action'
        ]
      };

      const parsed = parser.parse(workflow);
      
      // Root level assertions
      expect(parsed.nodes).toHaveLength(2);
      
      const rootDecision = parsed.nodes[0];
      expect(rootDecision?.nodeId).toBe('decision');
      expect(rootDecision?.depth).toBe(0);
      expect(rootDecision?.uniqueId).toBe('decision_0');
      expect(rootDecision?.config).toEqual({ condition: 'user.isAuthenticated' });
      
      // Check AST structure - root should have children
      expect(rootDecision?.children.length).toBeGreaterThan(0);
      
      // Verify 'true' edge structure
      const trueEdge = rootDecision?.edges['true'];
      expect(trueEdge?.type).toBe('nested');
      expect(trueEdge?.nestedNode?.nodeId).toBe('action');
      expect(trueEdge?.nestedNode?.depth).toBe(1);
      expect(trueEdge?.nestedNode?.parent).toBe(rootDecision);
      
      // Navigate deeper into the nested structure
      const welcomeAction = trueEdge?.nestedNode;
      expect(welcomeAction?.config).toEqual({ message: 'Welcome authenticated user' });
      expect(welcomeAction?.children.length).toBeGreaterThan(0);
      
      // Check the loop node nested within the success edge
      const successEdge = welcomeAction?.edges['success'];
      expect(successEdge?.type).toBe('nested');
      const loopNode = successEdge?.nestedNode;
      expect(loopNode?.nodeId).toBe('loop');
      expect(loopNode?.depth).toBe(2);
      expect(loopNode?.parent).toBe(welcomeAction);
      expect(loopNode?.config).toEqual({ maxIterations: 5 });
      
      // Check deeply nested structure within loop
      const continueEdge = loopNode?.edges['continue'];
      expect(continueEdge?.type).toBe('nested');
      const continueAction = continueEdge?.nestedNode;
      expect(continueAction?.nodeId).toBe('action');
      expect(continueAction?.depth).toBe(3);
      expect(continueAction?.config).toEqual({ message: 'Processing item' });
      
      // Check the deepest level - decision within the continue action
      const doneEdge = continueAction?.edges['done'];
      expect(doneEdge?.type).toBe('nested');
      const deepDecision = doneEdge?.nestedNode;
      expect(deepDecision?.nodeId).toBe('decision');
      expect(deepDecision?.depth).toBe(4);
      expect(deepDecision?.config).toEqual({ condition: 'hasMoreItems' });
      
      // Check the deepest nested action
      const falseEdge = deepDecision?.edges['false'];
      expect(falseEdge?.type).toBe('nested');
      const deepestAction = falseEdge?.nestedNode;
      expect(deepestAction?.nodeId).toBe('action');
      expect(deepestAction?.depth).toBe(5);
      expect(deepestAction?.config).toEqual({ message: 'All items processed' });
    });

    it('should parse array sequences with nested configurations', () => {
      const workflow = {
        id: 'sequence-nested-workflow',
        name: 'Sequence with Nested Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              message: 'Start pipeline',
              'pipeline?': [
                'action',
                {
                  decision: {
                    condition: 'validate',
                    'true?': {
                      loop: {
                        maxIterations: 3,
                        'iterate?': {
                          action: {
                            message: 'Processing batch',
                            'next?': 'action'
                          }
                        }
                      }
                    },
                    'false?': 'action'
                  }
                },
                'action'
              ]
            }
          }
        ]
      };

      const parsed = parser.parse(workflow);
      const rootAction = parsed.nodes[0];
      
      expect(rootAction?.nodeId).toBe('action');
      expect(rootAction?.config).toEqual({ message: 'Start pipeline' });
      
      // Check pipeline edge is a sequence
      const pipelineEdge = rootAction?.edges['pipeline'];
      expect(pipelineEdge?.type).toBe('sequence');
      expect(pipelineEdge?.sequence).toHaveLength(3);
      
      // First item should be a string reference
      expect(pipelineEdge?.sequence?.[0]).toBe('action');
      
      // Second item should be a parsed decision node
      const decisionInSequence = pipelineEdge?.sequence?.[1];
      expect(decisionInSequence).toBeTypeOf('object');
      if (typeof decisionInSequence === 'object') {
        expect(decisionInSequence.nodeId).toBe('decision');
        expect(decisionInSequence.depth).toBe(1);
        expect(decisionInSequence.parent).toBe(rootAction);
        
        // Check nested loop within decision
        const trueEdge = decisionInSequence.edges['true'];
        expect(trueEdge?.type).toBe('nested');
        const loopNode = trueEdge?.nestedNode;
        expect(loopNode?.nodeId).toBe('loop');
        expect(loopNode?.depth).toBe(2);
        
        // Check action nested within loop
        const iterateEdge = loopNode?.edges['iterate'];
        expect(iterateEdge?.type).toBe('nested');
        const iterateAction = iterateEdge?.nestedNode;
        expect(iterateAction?.nodeId).toBe('action');
        expect(iterateAction?.depth).toBe(3);
        expect(iterateAction?.config).toEqual({ message: 'Processing batch' });
      }
      
      // Third item should be a string reference
      expect(pipelineEdge?.sequence?.[2]).toBe('action');
    });

    it('should handle multiple nested nodes in a sequence edge', () => {
      const workflow = {
        id: 'multi-nested-workflow',
        name: 'Multiple Nested Nodes Workflow',
        version: '1.0.0',
        workflow: [
          {
            decision: {
              'parallel?': [
                {
                  action: {
                    message: 'First parallel action',
                    'done?': 'action'
                  }
                },
                {
                  loop: {
                    maxIterations: 2,
                    'iterate?': 'action'
                  }
                }
              ]
            }
          },
          'action'
        ]
      };

      const parsed = parser.parse(workflow);
      const rootDecision = parsed.nodes[0];
      
      expect(rootDecision?.nodeId).toBe('decision');
      expect(rootDecision?.children).toHaveLength(2);
      
      // Check parallel edge contains multiple nodes as sequence
      const parallelEdge = rootDecision?.edges['parallel'];
      expect(parallelEdge?.type).toBe('sequence');
      expect(parallelEdge?.sequence).toHaveLength(2);
      
      // Verify both nested nodes
      const firstNode = parallelEdge?.sequence?.[0];
      const secondNode = parallelEdge?.sequence?.[1];
      
      if (typeof firstNode === 'object') {
        expect(firstNode.nodeId).toBe('action');
        expect(firstNode.depth).toBe(1);
        expect(firstNode.config).toEqual({ message: 'First parallel action' });
      }
      
      if (typeof secondNode === 'object') {
        expect(secondNode.nodeId).toBe('loop');
        expect(secondNode.depth).toBe(1);
        expect(secondNode.config).toEqual({ maxIterations: 2 });
      }
    });

    it('should maintain parent-child relationships correctly', () => {
      const workflow = {
        id: 'parent-child-workflow',
        name: 'Parent Child Relationship Test',
        version: '1.0.0',
        workflow: [
          {
            action: {
              'next?': {
                decision: {
                  'branch?': {
                    action: {
                      'final?': 'action'
                    }
                  }
                }
              }
            }
          }
        ]
      };

      const parsed = parser.parse(workflow);
      const rootAction = parsed.nodes[0];
      
      // Navigate through the hierarchy
      const nextEdge = rootAction?.edges['next'];
      const decisionNode = nextEdge?.nestedNode;
      const branchEdge = decisionNode?.edges['branch'];
      const branchAction = branchEdge?.nestedNode;
      
      // Verify parent-child relationships
      expect(rootAction?.parent).toBeUndefined();
      expect(decisionNode?.parent).toBe(rootAction);
      expect(branchAction?.parent).toBe(decisionNode);
      
      // Verify children arrays
      expect(rootAction?.children).toContain(decisionNode);
      expect(decisionNode?.children).toContain(branchAction);
      expect(branchAction?.children).toHaveLength(0);
      
      // Verify depths
      expect(rootAction?.depth).toBe(0);
      expect(decisionNode?.depth).toBe(1);
      expect(branchAction?.depth).toBe(2);
      
      // Verify unique IDs are hierarchical
      expect(rootAction?.uniqueId).toBe('action_0');
      expect(decisionNode?.uniqueId).toContain('action_0_nested');
      expect(branchAction?.uniqueId).toContain(decisionNode?.uniqueId.split('_nested')[0]);
    });

    it('should generate unique IDs for all nodes in complex workflows', () => {
      const workflow = {
        id: 'unique-id-workflow',
        name: 'Unique ID Test Workflow',
        version: '1.0.0',
        workflow: [
          {
            action: {
              'path1?': {
                action: {
                  'nested?': {
                    action: { message: 'deep1' }
                  }
                }
              },
              'path2?': {
                action: {
                  'nested?': {
                    action: { message: 'deep2' }
                  }
                }
              }
            }
          }
        ]
      };

      const parsed = parser.parse(workflow);
      
      // Collect all unique IDs from the AST
      const allUniqueIds = new Set<string>();
      
      function collectIds(node: any): void {
        if (node?.uniqueId) {
          allUniqueIds.add(node.uniqueId);
        }
        if (node?.children) {
          node.children.forEach(collectIds);
        }
        if (node?.edges) {
          Object.values(node.edges).forEach((edge: any) => {
            if (edge?.nestedNode) {
              collectIds(edge.nestedNode);
            }
            if (edge?.sequence) {
              edge.sequence.forEach((item: any) => {
                if (typeof item === 'object') {
                  collectIds(item);
                }
              });
            }
          });
        }
      }
      
      collectIds(parsed.nodes[0]);
      
      // Should have 3 unique IDs: root action + 2 nested actions on each path  
      expect(allUniqueIds.size).toBeGreaterThanOrEqual(3);
      
      // All IDs should be different
      const idArray = Array.from(allUniqueIds);
      expect(idArray).toHaveLength(new Set(idArray).size);
    });
  });
});