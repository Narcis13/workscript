import { describe, it, expect, beforeEach } from 'vitest';
import { NodeRegistry, NodeNotFoundError, NodeRegistrationError } from './NodeRegistry';
import { WorkflowNode, NodeMetadata, ExecutionContext, EdgeMap } from '../../../shared/src/types';

// Mock workflow node for testing
class TestNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'test-node',
    name: 'Test Node',
    version: '1.0.0',
    description: 'A test node for unit testing',
    inputs: ['input1'],
    outputs: ['output1']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return {
      success: { result: 'test' }
    };
  }
}

// Another mock node
class AnotherTestNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'another-test-node',
    name: 'Another Test Node',
    version: '2.0.0'
  };

  async execute(context: ExecutionContext): Promise<EdgeMap> {
    return {
      complete: { done: true }
    };
  }
}

// Invalid node (missing metadata)
class InvalidNode extends WorkflowNode {
  metadata: any = null;

  async execute(context: ExecutionContext): Promise<EdgeMap> {
    return {};
  }
}

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  describe('register', () => {
    it('should register a valid node', async () => {
      await registry.register(TestNode);
      expect(registry.hasNode('test-node')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should register a node as singleton', async () => {
      await registry.register(TestNode, { singleton: true });
      
      const instance1 = registry.getInstance('test-node');
      const instance2 = registry.getInstance('test-node');
      
      expect(instance1).toBe(instance2); // Same instance
    });

    it('should register a node as non-singleton by default', async () => {
      await registry.register(TestNode);
      
      const instance1 = registry.getInstance('test-node');
      const instance2 = registry.getInstance('test-node');
      
      expect(instance1).not.toBe(instance2); // Different instances
    });

    it('should throw error for invalid node metadata', async () => {
      await expect(registry.register(InvalidNode)).rejects.toThrow(NodeRegistrationError);
    });

    it('should throw error for duplicate node with different version', async () => {
      await registry.register(TestNode);
      
      // Create a node with same ID but different version
      class DuplicateNode extends WorkflowNode {
        metadata: NodeMetadata = {
          id: 'test-node',
          name: 'Test Node Duplicate',
          version: '2.0.0'
        };
        async execute(): Promise<EdgeMap> {
          return {};
        }
      }
      
      await expect(registry.register(DuplicateNode)).rejects.toThrow(NodeRegistrationError);
    });

    it('should allow re-registering node with same version', async () => {
      await registry.register(TestNode);
      await expect(registry.register(TestNode)).resolves.not.toThrow();
    });
  });

  describe('getInstance', () => {
    it('should create instance of registered node', async () => {
      await registry.register(TestNode);
      const instance = registry.getInstance('test-node');
      
      expect(instance).toBeInstanceOf(TestNode);
      expect(instance.metadata.id).toBe('test-node');
    });

    it('should throw error for unregistered node', () => {
      expect(() => registry.getInstance('non-existent')).toThrow(NodeNotFoundError);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for registered node', async () => {
      await registry.register(TestNode);
      const metadata = registry.getMetadata('test-node');
      
      expect(metadata).toEqual({
        id: 'test-node',
        name: 'Test Node',
        version: '1.0.0',
        description: 'A test node for unit testing',
        inputs: ['input1'],
        outputs: ['output1']
      });
    });

    it('should throw error for unregistered node', () => {
      expect(() => registry.getMetadata('non-existent')).toThrow(NodeNotFoundError);
    });
  });

  describe('listNodes', () => {
    it('should return empty array when no nodes registered', () => {
      expect(registry.listNodes()).toEqual([]);
    });

    it('should return all registered node metadata', async () => {
      await registry.register(TestNode);
      await registry.register(AnotherTestNode);
      
      const nodes = registry.listNodes();
      expect(nodes).toHaveLength(2);
      expect(nodes.map(n => n.id)).toContain('test-node');
      expect(nodes.map(n => n.id)).toContain('another-test-node');
    });
  });

  describe('hasNode', () => {
    it('should return true for registered node', async () => {
      await registry.register(TestNode);
      expect(registry.hasNode('test-node')).toBe(true);
    });

    it('should return false for unregistered node', () => {
      expect(registry.hasNode('non-existent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove registered node', async () => {
      await registry.register(TestNode);
      expect(registry.hasNode('test-node')).toBe(true);
      
      registry.unregister('test-node');
      expect(registry.hasNode('test-node')).toBe(false);
      expect(registry.size).toBe(0);
    });

    it('should throw error for unregistered node', () => {
      expect(() => registry.unregister('non-existent')).toThrow(NodeNotFoundError);
    });

    it('should remove singleton instance', async () => {
      await registry.register(TestNode, { singleton: true });
      const instance = registry.getInstance('test-node');
      
      registry.unregister('test-node');
      expect(() => registry.getInstance('test-node')).toThrow(NodeNotFoundError);
    });
  });

  describe('clear', () => {
    it('should remove all registered nodes', async () => {
      await registry.register(TestNode);
      await registry.register(AnotherTestNode);
      expect(registry.size).toBe(2);
      
      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.listNodes()).toEqual([]);
    });
  });

  describe('discover', () => {
    // Note: This test would require actual files in the filesystem
    // For now, we'll skip the file-based discovery test
    it('should handle discovery of non-existent directory gracefully', async () => {
      await expect(registry.discover('/non/existent/path')).resolves.not.toThrow();
    });
  });
});