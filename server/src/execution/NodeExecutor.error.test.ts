import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeExecutor } from './NodeExecutor';
import { NodeRegistry } from '../registry/NodeRegistry';
import { StateManager } from '../state/StateManager';
import { ErrorHandler, ErrorCategory } from '../error/ErrorHandler';
import { WorkflowNode } from 'shared/dist';
import type { ExecutionContext, NodeMetadata } from 'shared/dist';

// Mock classes for testing
class SuccessNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'success-node',
    name: 'Success Node',
    version: '1.0.0'
  };

  async execute(context: ExecutionContext): Promise<any> {
    return { success: true };
  }
}

class ErrorNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'error-node',
    name: 'Error Node',
    version: '1.0.0'
  };

  async execute(): Promise<any> {
    throw new Error('Simulated node execution error');
  }
}

class StateErrorNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'state-error-node',
    name: 'State Error Node',
    version: '1.0.0'
  };

  async execute(context: ExecutionContext): Promise<any> {
    // Modify state to trigger state update
    context.state.testValue = 'modified';
    return { success: true };
  }
}

describe('NodeExecutor Error Handling', () => {
  let nodeRegistry: NodeRegistry;
  let stateManager: StateManager;
  let errorHandler: ErrorHandler;
  let nodeExecutor: NodeExecutor;
  
  beforeEach(() => {
    nodeRegistry = new NodeRegistry();
    
    // Create a mock state manager
    stateManager = {
      get: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue(undefined),
      scheduleCleanup: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined)
    } as unknown as StateManager;
    
    errorHandler = new ErrorHandler();
    
    // Register test nodes
    nodeRegistry.register(SuccessNode);
    nodeRegistry.register(ErrorNode);
    nodeRegistry.register(StateErrorNode);
    
    nodeExecutor = new NodeExecutor(nodeRegistry, stateManager, errorHandler);
  });
  
  it('should handle missing node type', async () => {
    const result = await nodeExecutor.executeNode(
      'test-node',
      {}, // Missing type property
      'test-workflow',
      'test-execution',
      {}
    );
    
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('function');
    
    const error = result.error();
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.code).toBe('missing_node_type');
    expect(error.message).toContain('missing required \'type\' property');
  });
  
  it('should handle unknown node type', async () => {
    const result = await nodeExecutor.executeNode(
      'test-node',
      { type: 'non-existent-type' },
      'test-workflow',
      'test-execution',
      {}
    );
    
    expect(result).toHaveProperty('error');
    const error = result.error();
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.code).toBe('unknown_node_type');
    expect(error.message).toContain('Unknown node type');
  });
  
  it('should handle node execution errors', async () => {
    const result = await nodeExecutor.executeNode(
      'error-node',
      { type: 'error-node' },
      'test-workflow',
      'test-execution',
      {}
    );
    
    expect(result).toHaveProperty('error');
    const error = result.error();
    expect(error.category).toBe(ErrorCategory.NODE_EXECUTION);
    expect(error.code).toBe('node_execution_failed');
    expect(error.message).toContain('Simulated node execution error');
    expect(error.nodeId).toBe('error-node');
    expect(error.executionId).toBe('test-execution');
    expect(error.workflowId).toBe('test-workflow');
  });
  
  it('should handle state update errors', async () => {
    // Mock state manager to throw on update
    stateManager.update = vi.fn().mockRejectedValue(new Error('State update failed'));
    
    const result = await nodeExecutor.executeNode(
      'state-error-node',
      { type: 'state-error-node' },
      'test-workflow',
      'test-execution',
      {}
    );
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    
    const error = result.error();
    expect(error.category).toBe(ErrorCategory.RUNTIME);
    expect(error.code).toBe('state_update_failed');
    expect(error.message).toContain('Failed to update state');
  });
  
  it('should update state with error information on node execution failure', async () => {
    // Mock state manager to track updates
    const updatedState: Record<string, any> = {};
    stateManager.update = vi.fn().mockImplementation((executionId, state) => {
      Object.assign(updatedState, state);
      return Promise.resolve();
    });
    
    await nodeExecutor.executeNode(
      'error-node',
      { type: 'error-node' },
      'test-workflow',
      'test-execution',
      {}
    );
    
    expect(updatedState).toHaveProperty('lastError');
    expect(updatedState.lastError).toMatchObject({
      message: expect.stringContaining('Simulated node execution error'),
      code: 'node_execution_failed',
      nodeId: 'error-node'
    });
  });
  
  it('should successfully execute a node without errors', async () => {
    const result = await nodeExecutor.executeNode(
      'success-node',
      { type: 'success-node' },
      'test-workflow',
      'test-execution',
      {}
    );
    
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('error');
  });
});