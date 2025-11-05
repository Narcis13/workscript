import { WorkflowNode } from '../types';
import type { NodeMetadata } from '../types';

// Conditional imports for Node.js-only features
let glob: any, path: any, fs: any;
if (typeof globalThis === 'undefined' || !('window' in globalThis)) {
  // Server environment - import Node.js modules
  glob = require('glob').glob;
  path = require('path');
  fs = require('fs').promises;
}

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

type NodeSource = 'universal' | 'server' | 'client';
type Environment = 'server' | 'client' | 'universal';

interface NodeRegistration {
  nodeClass: typeof WorkflowNode;
  metadata: NodeMetadata;
  singleton: boolean;
  source: NodeSource;
}

export class NodeRegistry {
  private nodes: Map<string, NodeRegistration> = new Map();
  private instances: Map<string, WorkflowNode> = new Map();
  private builtInNodesRegistered: boolean = false;

  /**
   * Register built-in nodes that are always available
   * This is called automatically when needed
   */
  private async registerBuiltInNodes(): Promise<void> {
    if (this.builtInNodesRegistered) {
      return; // Already registered
    }

    try {
      // Import and register StateSetterNode
      const { StateSetterNode } = await import('../../nodes/StateSetterNode');
      await this.register(StateSetterNode, {
        singleton: false,
        source: 'universal'
      });

      this.builtInNodesRegistered = true;
    } catch (error) {
      console.warn('Failed to register built-in nodes:', error);
      throw new NodeRegistrationError(
        'Failed to register built-in nodes: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Ensure built-in nodes are registered before operations
   */
  private async ensureBuiltInNodes(): Promise<void> {
    if (!this.builtInNodesRegistered) {
      await this.registerBuiltInNodes();
    }
  }

  /**
   * Register a workflow node class
   * @param nodeClass The node class to register
   * @param options Registration options
   */
  async register(
    nodeClass: typeof WorkflowNode,
    options?: { singleton?: boolean; source?: NodeSource }
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
      singleton: options?.singleton ?? false,
      source: options?.source ?? 'universal'
    });

    // If singleton, create the instance now
    if (options?.singleton) {
      this.instances.set(metadata.id, instance);
    }
  }

  /**
   * Discover and register nodes from multiple package directories
   * @param environment Target environment ('server' | 'client' | 'universal')
   */
  async discoverFromPackages(environment: Environment = 'universal'): Promise<void> {
    // Register built-in nodes first
    await this.ensureBuiltInNodes();

    // In browser environment, log warning and suggest manual registration
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      console.warn('File-based node discovery is not available in browser environment. Use registerClientNodes() method instead.');
      return;
    }

    const discoveryPaths = this.getDiscoveryPaths(environment);

    for (const { path: discoveryPath, source } of discoveryPaths) {
      await this.discoverFromPath(discoveryPath, source);
    }
  }

  /**
   * Manually register client-specific nodes (for browser environments)
   * @param nodeClasses Array of node classes to register
   */
  async registerClientNodes(nodeClasses: Array<typeof WorkflowNode>): Promise<void> {
    for (const nodeClass of nodeClasses) {
      await this.register(nodeClass, { source: 'client' });
    }
  }

  /**
   * Get discovery paths based on environment
   */
  private getDiscoveryPaths(environment: Environment): Array<{ path: string; source: NodeSource }> {
    // Only available in Node.js environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      return [];
    }
    
    // Find monorepo root by looking for package.json files in parent directories
    const basePath = this.findMonorepoRoot();
    const paths: Array<{ path: string; source: NodeSource }> = [];
    
    // Always include shared/nodes (universal nodes)
    paths.push({ path: path.join(basePath, 'shared/nodes'), source: 'universal' });
    
    if (environment === 'server' || environment === 'universal') {
      paths.push({ path: path.join(basePath, 'server/nodes'), source: 'server' });
    }
    
    if (environment === 'client' || environment === 'universal') {
      paths.push({ path: path.join(basePath, 'client/nodes'), source: 'client' });
    }
    
    return paths;
  }

  /**
   * Find the monorepo root by looking for the directory that contains
   * both shared/ and server/ subdirectories
   */
  private findMonorepoRoot(): string {
    // Only available in Node.js environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      return process.cwd();
    }
    
    let currentDir = process.cwd();

    // Walk up the directory tree to find the monorepo root
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const sharedPath = path.join(currentDir, 'shared');
        const serverPath = path.join(currentDir, 'server');
        
        // Use require('fs') to ensure we have the right fs module
        const nodeFs = require('fs');
        const sharedExists = nodeFs.existsSync(sharedPath);
        const serverExists = nodeFs.existsSync(serverPath);

        if (sharedExists && serverExists) {
          return currentDir;
        }
      } catch (error) {
        // Continue searching
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to current working directory
    return process.cwd();
  }

  /**
   * Discover and register nodes from a directory
   * @param directory Directory path to scan for node files
   * @param source Node source type
   */
  async discoverFromPath(directory: string, source: NodeSource = 'universal'): Promise<void> {
    // Only available in Node.js environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      console.warn('Node discovery is not available in browser environment');
      return;
    }

    // Check if directory exists before trying to glob
    try {
      await fs.access(directory);
    } catch {
      // Directory doesn't exist, skip silently
      return;
    }

    await this.discover(directory, source);
  }

  /**
   * Discover and register nodes from a directory (legacy method)
   * @param directory Directory path to scan for node files
   * @param source Node source type
   */
  async discover(directory: string, source: NodeSource = 'universal'): Promise<void> {
    // Only available in Node.js environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      console.warn('Node discovery is not available in browser environment');
      return;
    }
    const pattern = path.join(directory, '**/*.{ts,js}');
    const files = await glob(pattern, { absolute: true });

    for (const file of files) {
      try {
        // Skip test files and index files
        if (file.includes('.test.') || file.endsWith('index.ts') || file.endsWith('index.js')) {
          continue;
        }

        const module = await import(/* @vite-ignore */ file);

        // Check for default export
        if (module.default && this.isWorkflowNode(module.default)) {
          await this.register(module.default, { source });
        }
        
        // Check for named exports
        for (const [exportName, exportValue] of Object.entries(module)) {
          if (exportName !== 'default' && this.isWorkflowNode(exportValue)) {
            await this.register(exportValue as typeof WorkflowNode, { source });
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
   * @param environment Optional environment check
   * @returns A new or singleton instance of the node
   */
  getInstance(nodeId: string, environment?: Environment): WorkflowNode {
    // Check if node is already registered first
    let registration = this.nodes.get(nodeId);

    // Only attempt lazy load if node is NOT registered and it's a built-in node
    // AND we're in Node.js environment (not browser)
    if (!registration && nodeId === '__state_setter__' && !this.builtInNodesRegistered) {
      // Check if we're in Node.js environment before attempting require()
      const isNodeEnvironment = typeof globalThis === 'undefined' || !('window' in globalThis);

      if (isNodeEnvironment) {
        // Register synchronously for built-in nodes
        try {
          const { StateSetterNode } = require('../../nodes/StateSetterNode');
          this.registerSync(StateSetterNode, { singleton: false, source: 'universal' });
          this.builtInNodesRegistered = true;
          registration = this.nodes.get(nodeId);
        } catch (error) {
          throw new NodeNotFoundError(`Failed to register built-in node: ${nodeId}`);
        }
      }
    }

    if (!registration) {
      throw new NodeNotFoundError(nodeId);
    }

    // Check environment compatibility
    if (environment && !this.isNodeCompatible(registration.source, environment)) {
      throw new NodeNotFoundError(`Node ${nodeId} is not available in ${environment} environment`);
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
   * Synchronous version of register for built-in nodes
   */
  private registerSync(
    nodeClass: typeof WorkflowNode,
    options?: { singleton?: boolean; source?: NodeSource }
  ): void {
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

    // Register the node
    this.nodes.set(metadata.id, {
      nodeClass,
      metadata,
      singleton: options?.singleton ?? false,
      source: options?.source ?? 'universal'
    });

    // If singleton, create the instance now
    if (options?.singleton) {
      this.instances.set(metadata.id, instance);
    }
  }

  /**
   * Get metadata for a registered node
   * @param nodeId The node ID
   * @returns The node metadata with source information
   */
  getMetadata(nodeId: string): NodeMetadata & { source: NodeSource } {
    const registration = this.nodes.get(nodeId);
    if (!registration) {
      throw new NodeNotFoundError(nodeId);
    }
    return { ...registration.metadata, source: registration.source };
  }

  /**
   * List all registered nodes
   * @returns Array of node metadata
   */
  listNodes(environment?: Environment): NodeMetadata[] {
    const nodes = Array.from(this.nodes.values());
    
    if (!environment) {
      return nodes.map(r => r.metadata);
    }
    
    return nodes
      .filter(r => this.isNodeCompatible(r.source, environment))
      .map(r => r.metadata);
  }

  /**
   * List nodes by source
   * @param source Filter by node source
   * @returns Array of node metadata
   */
  listNodesBySource(source: NodeSource): NodeMetadata[] {
    return Array.from(this.nodes.values())
      .filter(r => r.source === source)
      .map(r => r.metadata);
  }

  /**
   * Check if a node is compatible with an environment
   */
  private isNodeCompatible(nodeSource: NodeSource, environment: Environment): boolean {
    if (environment === 'universal') return true;
    if (nodeSource === 'universal') return true;
    return nodeSource === environment;
  }

  /**
   * Check if a node is registered
   * @param nodeId The node ID to check
   * @returns True if the node is registered
   */
  hasNode(nodeId: string): boolean {
    // Check if it's a built-in node that hasn't been registered yet
    if (nodeId === '__state_setter__' && !this.builtInNodesRegistered) {
      // Synchronously mark as true since we'll register it lazily
      return true;
    }
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
    if (typeof value !== 'function' || !value.prototype) {
      return false;
    }

    // Check if it has the required WorkflowNode structure
    const hasExecuteMethod = typeof value.prototype.execute === 'function';
    const hasMetadataProperty = 'metadata' in value.prototype;

    // Check if it extends from WorkflowNode by examining the prototype chain
    let proto = value.prototype;
    let extendsWorkflowNode = false;
    let depth = 0;

    while (proto && depth < 10) { // Prevent infinite loops
      if (proto.constructor.name === 'WorkflowNode') {
        extendsWorkflowNode = true;
        break;
      }
      proto = Object.getPrototypeOf(proto);
      depth++;
    }

    // A WorkflowNode must either:
    // 1. Extend from WorkflowNode class, OR
    // 2. Have the required interface (execute method and metadata property)
    return extendsWorkflowNode || (hasExecuteMethod && hasMetadataProperty);
  }
}