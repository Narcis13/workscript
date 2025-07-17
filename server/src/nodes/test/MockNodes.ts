import { WorkflowNode } from 'shared/dist';
import type { 
  NodeMetadata, 
  ExecutionContext, 
  EdgeMap 
} from 'shared/dist';

/**
 * Simple mock node that returns a success edge
 */
export class SimpleNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'simple',
    name: 'Simple Node',
    version: '1.0.0',
    description: 'A simple node that always succeeds',
    outputs: ['success']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return { success: true };
  }
}

/**
 * Counter node that increments a value in state
 */
export class CounterNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'counter',
    name: 'Counter Node',
    version: '1.0.0',
    description: 'Increments a counter in state',
    inputs: ['increment'],
    outputs: ['success']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    const increment = config?.increment || context.inputs?.increment || 1;
    const currentCount = context.state.count || 0;
    
    // Update state
    context.state.count = currentCount + increment;
    
    return { success: context.state.count };
  }
}

/**
 * Conditional node that routes based on a condition
 */
export class ConditionalNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'conditional',
    name: 'Conditional Node',
    version: '1.0.0',
    description: 'Routes execution based on a condition',
    inputs: ['condition'],
    outputs: ['true', 'false']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    const condition = config?.condition || context.inputs?.condition;
    
    if (condition) {
      return { true: 'next-if-true' };
    } else {
      return { false: 'next-if-false' };
    }
  }
}

/**
 * Error node that throws an error for testing error handling
 */
export class ErrorNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'error',
    name: 'Error Node',
    version: '1.0.0',
    description: 'Throws an error for testing',
    outputs: ['error']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    const message = config?.message || 'Test error';
    throw new Error(message);
  }
}

/**
 * Delay node that waits for a specified time
 */
export class DelayNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'delay',
    name: 'Delay Node',
    version: '1.0.0',
    description: 'Delays execution for a specified time',
    inputs: ['duration'],
    outputs: ['success']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    const duration = config?.duration || context.inputs?.duration || 100;
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return { success: true };
  }
}

/**
 * Transform node that transforms data in state
 */
export class TransformNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'transform',
    name: 'Transform Node',
    version: '1.0.0',
    description: 'Transforms data in state',
    inputs: ['source', 'target', 'transform'],
    outputs: ['success']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    const source = config?.source || context.inputs?.source || 'input';
    const target = config?.target || context.inputs?.target || 'output';
    const transform = config?.transform || context.inputs?.transform;
    
    const sourceValue = context.state[source];
    
    if (transform === 'uppercase' && typeof sourceValue === 'string') {
      context.state[target] = sourceValue.toUpperCase();
    } else if (transform === 'double' && typeof sourceValue === 'number') {
      context.state[target] = sourceValue * 2;
    } else {
      context.state[target] = sourceValue;
    }
    
    return { success: context.state[target] };
  }
}

/**
 * Multi-edge node that returns multiple edges for testing complex routing
 */
export class MultiEdgeNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'multi-edge',
    name: 'Multi-Edge Node',
    version: '1.0.0',
    description: 'Returns multiple edges based on configuration',
    outputs: ['edge1', 'edge2', 'edge3', 'default']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    const edges: EdgeMap = {};
    
    if (config?.edge1) {
      edges.edge1 = config.edge1;
    }
    if (config?.edge2) {
      edges.edge2 = config.edge2;
    }
    if (config?.edge3) {
      edges.edge3 = config.edge3;
    }
    
    // Always include a default edge
    edges.default = config?.default || 'end';
    
    return edges;
  }
}