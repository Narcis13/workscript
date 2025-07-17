import { NodeExecutor } from '../execution/NodeExecutor';
import { EdgeRouter } from '../routing/EdgeRouter';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { SimpleNode, CounterNode, ConditionalNode } from '../nodes/test/MockNodes';
import type { WorkflowDefinition } from 'shared/dist';

/**
 * Example demonstrating edge routing system integration
 */
async function runEdgeRoutingExample() {
  // Setup components
  const nodeRegistry = new NodeRegistry();
  const stateManager = new StateManager();
  const nodeExecutor = new NodeExecutor(nodeRegistry, stateManager);

  // Register nodes
  nodeRegistry.register(SimpleNode);
  nodeRegistry.register(CounterNode);
  nodeRegistry.register(ConditionalNode);

  // Define workflow with different edge routing patterns
  const workflow: WorkflowDefinition = {
    id: 'edge-routing-example',
    name: 'Edge Routing Example',
    version: '1.0.0',
    initialState: { count: 0 },
    workflow: {
      'start': {
        type: 'counter',
        config: { increment: 1 },
        edges: {
          'success': 'check',
          'error?': 'error-handler'
        }
      },
      'check': {
        type: 'conditional',
        config: { condition: true },
        edges: {
          'true': 'process-sequence',
          'false?': 'alternative'
        }
      },
      'process-sequence': {
        type: 'simple',
        edges: {
          'success': ['increment1', 'increment2'],
          'complex?': {
            'increment3': {
              increment: 10
            }
          }
        }
      },
      'increment1': {
        type: 'counter',
        config: { increment: 2 }
      },
      'increment2': {
        type: 'counter',
        config: { increment: 3 }
      },
      'increment3': {
        type: 'counter',
        config: { increment: 5 }
      },
      'alternative': {
        type: 'simple'
      },
      'error-handler': {
        type: 'simple'
      }
    }
  };

  // Create edge router
  const edgeRouter = new EdgeRouter(workflow);

  // Create execution
  const executionId = await nodeExecutor.createExecution(
    workflow.id,
    workflow.initialState
  );

  console.log('🚀 Starting edge routing example...');
  console.log('Initial state:', await stateManager.get(executionId));

  // Simulate workflow execution with edge routing
  let currentNodeId = 'start';
  let executionCount = 0;
  const maxExecutions = 10; // Prevent infinite loops

  while (currentNodeId && executionCount < maxExecutions) {
    console.log(`\n📍 Executing node: ${currentNodeId}`);
    
    // Get node configuration
    const nodeConfig = workflow.workflow[currentNodeId];
    if (!nodeConfig) {
      console.log(`❌ Node '${currentNodeId}' not found in workflow`);
      break;
    }

    try {
      // Execute node
      const edgeMap = await nodeExecutor.executeNode(
        currentNodeId,
        nodeConfig,
        workflow.id,
        executionId
      );

      console.log(`✅ Node execution result:`, edgeMap);
      console.log(`📊 Current state:`, await stateManager.get(executionId));

      // Route to next nodes
      const routeResult = edgeRouter.routeEdges(currentNodeId, edgeMap);
      console.log(`🧭 Route result:`, {
        nextNodes: routeResult.nextNodes,
        hasInlineConfigs: Object.keys(routeResult.inlineConfigs).length > 0,
        isOptional: routeResult.isOptional,
        continueSequence: routeResult.continueSequence
      });

      // Handle routing result
      if (routeResult.nextNodes.length > 0) {
        // For demo, just take the first node
        currentNodeId = routeResult.nextNodes[0];
        
        // Apply inline config if present
        if (routeResult.inlineConfigs[currentNodeId]) {
          console.log(`🔧 Applying inline config to ${currentNodeId}:`, 
            routeResult.inlineConfigs[currentNodeId]);
          // In real implementation, you'd merge this config with the node config
        }
      } else if (routeResult.continueSequence) {
        // Continue to next node in sequence
        currentNodeId = edgeRouter.getNextInSequence(currentNodeId);
        console.log(`⏭️ Continuing to next in sequence: ${currentNodeId}`);
      } else {
        // End of workflow
        console.log(`🏁 Workflow execution complete`);
        break;
      }

      executionCount++;
    } catch (error) {
      console.error(`❌ Error executing node '${currentNodeId}':`, 
        error instanceof Error ? error.message : error);
      break;
    }
  }

  // Get final state
  const finalState = await nodeExecutor.getFinalState(executionId);
  console.log('\n🎯 Final state:', finalState);

  // Validate all edges
  const edgeErrors = edgeRouter.validateAllEdges();
  if (edgeErrors.length > 0) {
    console.log('\n⚠️ Edge validation errors:', edgeErrors);
  } else {
    console.log('\n✅ All edges validated successfully');
  }

  // Cleanup
  await nodeExecutor.completeExecution(executionId);
  console.log('\n🧹 Execution completed and cleanup scheduled');
}

// Run the example
if (require.main === module) {
  runEdgeRoutingExample().catch(console.error);
}

export { runEdgeRoutingExample };