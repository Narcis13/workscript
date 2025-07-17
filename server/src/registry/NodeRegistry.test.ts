import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeRegistry } from './NodeRegistry';
import { WorkflowNode } from 'shared/dist';
import type { NodeMetadata, ExecutionContext, EdgeMap } from 'shared/dist';

// Mock WorkflowNode implementation for testing
class MockNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'mock-node',
    name: 'Mock Node',
    version: '1.0.0',
    description: 'A mock node for testing',
    inputs: ['input1', 'input2'],
    outputs: ['output1']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return { success: 'next-node' };
  }
}

// Another mock node for testing multiple registrations
class AnotherMockNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'another-mock',
    name: 'Another Mock Node',
    version: '1.0.0'
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return { default: 'end' };
  }
}

// Invalid node class for testing validation
class InvalidNode {
  notMetadata = { id: 'invalid' };
  
  execute() {
    return {};
  }
}

// Node with invalid metadata
class NodeWithInvalidMetadata extends WorkflowNode {
  metadata: any = {
    // Missing required fields
    name: 'Invalid Metadata Node'
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    return {};
  }
}

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  describe('register', () => {
    it('should successfully register a valid node', () => {
      expect(() => registry.register(MockNode)).not.toThrow();
      expect(registry.size()).toBe(1);
    });

    it('should throw error when registering duplicate node ID', () => {
      registry.register(MockNode);
      expect(() => registry.register(MockNode)).toThrow('Node with ID \'mock-node\' is already registered');
    });

    it('should throw error for invalid node class', () => {
      expect(() => registry.register(InvalidNode as any)).toThrow('Invalid node class: must extend WorkflowNode');
    });

    it('should throw error for node with invalid metadata', () => {
      expect(() => registry.register(NodeWithInvalidMetadata)).toThrow('Invalid node metadata: missing required fields');
    });

    it('should register multiple different nodes', () => {
      registry.register(MockNode);
      registry.register(AnotherMockNode);
      expect(registry.size()).toBe(2);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      registry.register(MockNode);
    });

    it('should retrieve registered node class', () => {
      const nodeClass = registry.get('mock-node');
      expect(nodeClass).toBe(MockNode);
    });

    it('should return undefined for non-existent node', () => {
      const nodeClass = registry.get('non-existent');
      expect(nodeClass).toBeUndefined();
    });
  });

  describe('getMetadata', () => {
    beforeEach(() => {
      registry.register(MockNode);
    });

    it('should retrieve metadata for registered node', () => {
      const metadata = registry.getMetadata('mock-node');
      expect(metadata).toEqual({
        id: 'mock-node',
        name: 'Mock Node',
        version: '1.0.0',
        description: 'A mock node for testing',
        inputs: ['input1', 'input2'],
        outputs: ['output1']
      });
    });

    it('should return undefined for non-existent node', () => {
      const metadata = registry.getMetadata('non-existent');
      expect(metadata).toBeUndefined();
    });
  });

  describe('listAll', () => {
    it('should return empty array when no nodes registered', () => {
      const metadata = registry.listAll();
      expect(metadata).toEqual([]);
    });

    it('should return all registered node metadata', () => {
      registry.register(MockNode);
      registry.register(AnotherMockNode);
      
      const metadata = registry.listAll();
      expect(metadata).toHaveLength(2);
      expect(metadata.map(m => m.id)).toContain('mock-node');
      expect(metadata.map(m => m.id)).toContain('another-mock');
    });
  });

  describe('clear', () => {
    it('should remove all registered nodes', () => {
      registry.register(MockNode);
      registry.register(AnotherMockNode);
      expect(registry.size()).toBe(2);
      
      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.listAll()).toEqual([]);
    });
  });

  describe('discover', () => {
    it('should handle non-existent directory gracefully', async () => {
      const nonExistentPath = '/non/existent/path';
      await expect(registry.discover(nonExistentPath)).rejects.toThrow('Node discovery failed');
    });

    it('should discover nodes from a directory', async () => {
      // This test would require setting up a mock filesystem
      // For now, we'll test that the method exists and can be called
      // In a real implementation, you'd use something like memfs or mock-fs
      expect(registry.discover).toBeDefined();
      expect(typeof registry.discover).toBe('function');
    });
  });

  describe('validation helpers', () => {
    it('should validate WorkflowNode subclasses correctly', () => {
      // Test through the register method
      expect(() => registry.register(MockNode)).not.toThrow();
    });

    it('should reject non-constructor values', () => {
      const notAClass = { id: 'not-a-class' };
      expect(() => registry.register(notAClass as any)).toThrow('Invalid node class');
    });

    it('should validate metadata requirements', () => {
      class PartialMetadataNode extends WorkflowNode {
        metadata: any = {
          id: 'partial',
          name: 'Partial Node'
          // Missing version
        };

        async execute(context: ExecutionContext): Promise<EdgeMap> {
          return {};
        }
      }

      expect(() => registry.register(PartialMetadataNode)).toThrow('Invalid node metadata');
    });

    it('should reject empty string values in metadata', () => {
      class EmptyIdNode extends WorkflowNode {
        metadata: NodeMetadata = {
          id: '',
          name: 'Empty ID Node',
          version: '1.0.0'
        };

        async execute(context: ExecutionContext): Promise<EdgeMap> {
          return {};
        }
      }

      expect(() => registry.register(EmptyIdNode)).toThrow('Invalid node metadata');
    });
  });
});