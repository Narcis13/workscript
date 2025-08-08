import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser, ExecutionEngine, StateManager, NodeRegistry } from './index';
import { WorkflowNode } from './types';
import type { ExecutionContext, EdgeMap, WorkflowDefinition } from './types';

/**
 * Demo: When and HOW to use context.inputs
 * 
 * context.inputs contains:
 * 1. Edge context data - from previous node's edge function return value
 * 2. Current workflow state - accumulated state from all nodes
 * 3. _nodeConfig - the node's static configuration from workflow JSON
 */

// Producer Node - Uses config, produces data via edge function
class ProducerNode extends WorkflowNode {
  metadata = {
    id: 'producer',
    name: 'Producer Node',
    version: '1.0.0',
    description: 'Uses config parameters, stores state, returns edge data',
    outputs: ['data']
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // ✅ USE config for static node configuration from workflow JSON
    const baseValue = config?.baseValue || 10;
    const multiplier = config?.multiplier || 1;
    
    const result = baseValue * multiplier;
    
    // ✅ Store in workflow state (persistent across nodes)
    context.state.producedValue = result;
    context.state.producerStep = 'completed';
    
    return {
      success: () => ({
        // ✅ This data becomes available to next node via context.inputs
        edgeData: result,
        metadata: 'from-producer',
        timestamp: new Date().toISOString()
      })
    };
  }
}

// Consumer Node - Uses BOTH config AND context.inputs
class ConsumerNode extends WorkflowNode {
  metadata = {
    id: 'consumer',
    name: 'Consumer Node',
    version: '1.0.0',
    description: 'Demonstrates using both config and context.inputs',
    outputs: ['processed']
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    // ✅ USE config for static node configuration from workflow JSON
    const operation = config?.operation || 'add';
    const configValue = config?.value || 0;
    
    // ✅ USE context.inputs for:
    // 1. Edge data from previous node
    const edgeData = context.inputs?.edgeData || 0;
    const metadata = context.inputs?.metadata || 'unknown';
    
    // 2. Current workflow state (accumulated from all nodes)
    const producedValue = context.inputs?.producedValue || 0;
    const producerStep = context.inputs?.producerStep || 'unknown';
    
    // 3. Own node config (available as _nodeConfig)
    const nodeConfig = context.inputs?._nodeConfig || {};
    
    // Process using both sources
    let processed;
    switch (operation) {
      case 'add':
        processed = edgeData + configValue;
        break;
      case 'multiply':
        processed = edgeData * configValue;
        break;
      default:
        processed = edgeData;
    }
    
    // Store results in state
    context.state.consumerProcessed = processed;
    context.state.dataSource = {
      fromEdge: { edgeData, metadata },
      fromState: { producedValue, producerStep },
      fromConfig: { operation, configValue, nodeConfig }
    };
    
    return {
      success: () => ({
        processed,
        summary: `${operation}(${edgeData}, ${configValue}) = ${processed}`,
        sources: 'edge+state+config'
      })
    };
  }
}

describe('Context.inputs Mechanism Demo', () => {
  let parser: WorkflowParser;
  let engine: ExecutionEngine;
  let registry: NodeRegistry;
  let stateManager: StateManager;

  beforeEach(async () => {
    registry = new NodeRegistry();
    stateManager = new StateManager();
    parser = new WorkflowParser(registry);
    engine = new ExecutionEngine(registry, stateManager);

    await registry.register(ProducerNode);
    await registry.register(ConsumerNode);
  });

  it('should demonstrate when and how to use context.inputs', async () => {
    const workflowDefinition: WorkflowDefinition = {
      id: 'context-inputs-demo',
      name: 'Context.inputs Usage Demo',
      version: '1.0.0',
      description: 'Shows the difference between config and context.inputs',
      initialState: { workflowId: 'demo-123' },
      workflow: [
        {
          'producer': {
            'baseValue': 20,    // ← config: static from JSON
            'multiplier': 3     // ← config: static from JSON
          }
        },
        {
          'consumer': {
            'operation': 'add', // ← config: static from JSON
            'value': 15         // ← config: static from JSON
          }
        }
      ]
    };

    const parsedWorkflow = parser.parse(workflowDefinition);
    const result = await engine.execute(parsedWorkflow);

    expect(result.status).toBe('completed');

    // ✅ Producer used config correctly
    expect(result.finalState!.producedValue).toBe(60); // 20 * 3 (config values)

    // ✅ Consumer used BOTH config AND context.inputs
    const dataSource = result.finalState!.dataSource;
    
    // From edge function of previous node
    expect(dataSource.fromEdge.edgeData).toBe(60);
    expect(dataSource.fromEdge.metadata).toBe('from-producer');
    
    // From workflow state (accumulated from all nodes)
    expect(dataSource.fromState.producedValue).toBe(60);
    expect(dataSource.fromState.producerStep).toBe('completed');
    
    // From own config 
    expect(dataSource.fromConfig.operation).toBe('add');
    expect(dataSource.fromConfig.configValue).toBe(15);
    expect(dataSource.fromConfig.nodeConfig).toEqual({ operation: 'add', value: 15 });
    
    // Final computation using both edge data and config
    expect(result.finalState!.consumerProcessed).toBe(75); // 60 (edge) + 15 (config)
  });

  it('should show context.inputs contains workflow state + edge data', async () => {
    // Test with initial state to show it flows through context.inputs
    const workflowDefinition: WorkflowDefinition = {
      id: 'state-flow-demo',
      name: 'State Flow Demo',
      version: '1.0.0',
      initialState: { 
        globalSetting: 'demo-mode',
        startTime: new Date().toISOString()
      },
      workflow: [
        {
          'producer': {
            'baseValue': 10,
            'multiplier': 2
          }
        },
        {
          'consumer': {
            'operation': 'multiply',
            'value': 3
          }
        }
      ]
    };

    const parsedWorkflow = parser.parse(workflowDefinition);
    const result = await engine.execute(parsedWorkflow);

    expect(result.status).toBe('completed');
    
    const dataSource = result.finalState!.dataSource;
    
    // Initial state is available in context.inputs
    expect(result.finalState!.globalSetting).toBe('demo-mode');
    expect(result.finalState!.startTime).toBeDefined();
    
    // Edge data flows correctly  
    expect(dataSource.fromEdge.edgeData).toBe(20); // 10 * 2
    
    // Both edge data AND workflow state are available
    expect(result.finalState!.consumerProcessed).toBe(60); // 20 * 3
  });

  it('should handle missing context.inputs gracefully', async () => {
    // Consumer node runs without a producer - no edge data
    const workflowDefinition: WorkflowDefinition = {
      id: 'missing-inputs-demo',
      name: 'Missing Inputs Demo',
      version: '1.0.0',
      workflow: [
        {
          'consumer': {  // No producer before it
            'operation': 'add',
            'value': 100
          }
        }
      ]
    };

    const parsedWorkflow = parser.parse(workflowDefinition);
    const result = await engine.execute(parsedWorkflow);

    expect(result.status).toBe('completed');
    
    const dataSource = result.finalState!.dataSource;
    
    // Should handle missing edge data with defaults
    expect(dataSource.fromEdge.edgeData).toBe(0);
    expect(dataSource.fromEdge.metadata).toBe('unknown');
    expect(dataSource.fromState.producedValue).toBe(0);
    expect(dataSource.fromState.producerStep).toBe('unknown');
    
    // Config should still work
    expect(dataSource.fromConfig.operation).toBe('add');
    expect(dataSource.fromConfig.configValue).toBe(100);
    
    // Final result should be default + config
    expect(result.finalState!.consumerProcessed).toBe(100); // 0 + 100
  });
});