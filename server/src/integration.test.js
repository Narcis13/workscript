/**
 * Integration test for WorkflowParser + ExecutionEngine
 * Tests the complete flow from JSON workflow to AST to execution
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, ExecutionEngine, StateManager, NodeRegistry } from '@workscript/engine';
import { WorkflowNode } from '@workscript/engine';
// Test nodes for integration testing
class IntegrationActionNode extends WorkflowNode {
    metadata = {
        id: 'action',
        name: 'Integration Action Node',
        version: '1.0.0'
    };
    async execute(context, config) {
        // Store execution trace
        if (!context.state.executionTrace) {
            context.state.executionTrace = [];
        }
        context.state.executionTrace.push({
            nodeId: 'action',
            message: config?.message || 'action executed',
            uniqueId: context.nodeId
        });
        // Single-edge pattern: determine which edge to return based on internal logic
        const message = config?.message || 'action executed';
        // Internal decision logic for which edge to return
        if (message === 'Welcome authenticated user') {
            return {
                success: () => ({ processed: true })
            };
        }
        else if (message === 'Please authenticate') {
            return {
                done: () => ({ completed: true })
            };
        }
        else if (message === 'Nested action') {
            return {
                done: () => ({ completed: true })
            };
        }
        else if (message === 'Root action' || message === 'Start sequence') {
            return {
                success: () => ({ processed: true })
            };
        }
        else if (message === 'Deeply nested action') {
            return {
                next: () => ({ continue: true })
            };
        }
        else {
            // Default edge for unmatched cases
            return {
                success: () => ({ processed: true })
            };
        }
    }
}
class IntegrationDecisionNode extends WorkflowNode {
    metadata = {
        id: 'decision',
        name: 'Integration Decision Node',
        version: '1.0.0'
    };
    async execute(context, config) {
        // Store execution trace
        if (!context.state.executionTrace) {
            context.state.executionTrace = [];
        }
        context.state.executionTrace.push({
            nodeId: 'decision',
            condition: config?.condition || 'default'
        });
        // Single-edge pattern: internal decision logic
        const condition = config?.condition || context.state.condition || true;
        // Determine which single edge to return based on condition evaluation
        if (condition === 'user.isAuthenticated' || condition === true) {
            return {
                true: () => ({ result: 'true_path' })
            };
        }
        else {
            return {
                false: () => ({ result: 'false_path' })
            };
        }
    }
}
describe('WorkflowParser + ExecutionEngine Integration', () => {
    let parser;
    let engine;
    let registry;
    let stateManager;
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
        expect(trace.some((entry) => entry.nodeId === 'decision')).toBe(true);
        // Should have executed at least one action node
        expect(trace.some((entry) => entry.nodeId === 'action')).toBe(true);
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
        // Should have executed root action
        expect(trace.some((entry) => entry.message === 'Root action')).toBe(true);
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
        // Should have executed the start action
        expect(trace.some((entry) => entry.message === 'Start sequence')).toBe(true);
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
        function traverseAST(node, depth = 0) {
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
        // Verify AST structure
        expect(astStructure.length).toBeGreaterThan(1);
        expect(astStructure.some(node => node.depth > 0)).toBe(true);
        expect(astStructure.some(node => node.hasChildren)).toBe(true);
    });
});
