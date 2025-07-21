import { WorkflowNode } from '../../../shared/src/types';
import type { NodeMetadata } from '../../../shared/src/types';
import { glob } from 'glob';
import path from 'path';

export class NodeNotFoundError extends Error {
  constructor(public nodeId: string) {
    super(`Node not found: ${nodeId}`);
    this.name = 'NodeNotFoundError';
  }
}

export class NodeRegistrationError extends Error {
  constructor(message: string, public nodeId?: string) {
    super(message);
    this.name = 'NodeRegistrationError';
  }
}

interface NodeRegistration {
  nodeClass: typeof WorkflowNode;
  metadata: NodeMetadata;
  singleton: boolean;
}

export class NodeRegistry {
  private nodes: Map<string, NodeRegistration> = new Map();
  private instances: Map<string, WorkflowNode> = new Map();

  /**
   * Register a workflow node class
   * @param nodeClass The node class to register
   * @param options Registration options
   */
  async register(
    nodeClass: typeof WorkflowNode,
    options?: { singleton?: boolean }
  ): Promise<void> {
    // Create a temporary instance to get metadata
    let instance: WorkflowNode;
    try {
      instance = new (nodeClass as any)();
    } catch (error) {
      throw new NodeRegistrationError(
        `Failed to instantiate node class: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    const metadata = instance.metadata;

    // Validate metadata
    if (!metadata || !metadata.id || !metadata.name || !metadata.version) {
      throw new NodeRegistrationError(
        'Node metadata must include id, name, and version',
        metadata?.id
      );
    }

    // Check for duplicate registration
    if (this.nodes.has(metadata.id)) {
      const existing = this.nodes.get(metadata.id)!;
      if (existing.metadata.version !== metadata.version) {
        throw new NodeRegistrationError(
          `Node ${metadata.id} is already registered with version ${existing.metadata.version}`,
          metadata.id
        );
      }
    }

    // Register the node
    this.nodes.set(metadata.id, {
      nodeClass,
      metadata,
      singleton: options?.singleton ?? false
    });

    // If singleton, create the instance now
    if (options?.singleton) {
      this.instances.set(metadata.id, instance);
    }
  }

  /**
   * Discover and register nodes from a directory
   * @param directory Directory path to scan for node files
   */
  async discover(directory: string): Promise<void> {
    const pattern = path.join(directory, '**/*.{ts,js}');
    const files = await glob(pattern, { absolute: true });

    for (const file of files) {
      try {
        // Skip test files and index files
        if (file.includes('.test.') || file.endsWith('index.ts') || file.endsWith('index.js')) {
          continue;
        }

        const module = await import(file);
        
        // Check for default export
        if (module.default && this.isWorkflowNode(module.default)) {
          await this.register(module.default);
        }
        
        // Check for named exports
        for (const [exportName, exportValue] of Object.entries(module)) {
          if (exportName !== 'default' && this.isWorkflowNode(exportValue)) {
            await this.register(exportValue as typeof WorkflowNode);
          }
        }
      } catch (error) {
        console.warn(`Failed to load node from ${file}:`, error);
      }
    }
  }

  /**
   * Get an instance of a registered node
   * @param nodeId The node ID to instantiate
   * @returns A new or singleton instance of the node
   */
  getInstance(nodeId: string): WorkflowNode {
    const registration = this.nodes.get(nodeId);
    if (!registration) {
      throw new NodeNotFoundError(nodeId);
    }

    // Return singleton instance if available
    if (registration.singleton) {
      if (!this.instances.has(nodeId)) {
        this.instances.set(nodeId, new (registration.nodeClass as any)());
      }
      return this.instances.get(nodeId)!;
    }

    // Create new instance
    return new (registration.nodeClass as any)();
  }

  /**
   * Get metadata for a registered node
   * @param nodeId The node ID
   * @returns The node metadata
   */
  getMetadata(nodeId: string): NodeMetadata {
    const registration = this.nodes.get(nodeId);
    if (!registration) {
      throw new NodeNotFoundError(nodeId);
    }
    return registration.metadata;
  }

  /**
   * List all registered nodes
   * @returns Array of node metadata
   */
  listNodes(): NodeMetadata[] {
    return Array.from(this.nodes.values()).map(r => r.metadata);
  }

  /**
   * Check if a node is registered
   * @param nodeId The node ID to check
   * @returns True if the node is registered
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Unregister a node
   * @param nodeId The node ID to unregister
   */
  unregister(nodeId: string): void {
    if (!this.nodes.has(nodeId)) {
      throw new NodeNotFoundError(nodeId);
    }
    
    this.nodes.delete(nodeId);
    this.instances.delete(nodeId);
  }

  /**
   * Clear all registered nodes
   */
  clear(): void {
    this.nodes.clear();
    this.instances.clear();
  }

  /**
   * Get the number of registered nodes
   */
  get size(): number {
    return this.nodes.size;
  }

  /**
   * Check if a value is a WorkflowNode class
   */
  private isWorkflowNode(value: any): value is typeof WorkflowNode {
    return (
      typeof value === 'function' &&
      value.prototype &&
      (value.prototype instanceof WorkflowNode ||
        value.prototype.constructor === WorkflowNode ||
        // Check for matching interface structure
        (typeof value.prototype.execute === 'function' &&
         value.prototype.metadata !== undefined))
    );
  }
}