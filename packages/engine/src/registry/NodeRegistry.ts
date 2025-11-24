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

// Server-only architecture: all nodes are treated as 'server' nodes
type NodeSource = 'server';

interface NodeRegistration {
  nodeClass: typeof WorkflowNode;
  metadata: NodeMetadata;
  singleton: boolean;
  source: NodeSource;
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
      source: options?.source ?? 'server'
    });

    // If singleton, create the instance now
    if (options?.singleton) {
      this.instances.set(metadata.id, instance);
    }
  }

  /**
   * Register multiple nodes from an array of node classes
   * This is the recommended approach for server-only architecture
   * @param nodeClasses Array of node classes to register
   * @param options Registration options applied to all nodes
   * @returns Number of nodes successfully registered
   */
  async registerFromArray(
    nodeClasses: (typeof WorkflowNode)[],
    options?: { singleton?: boolean; source?: NodeSource }
  ): Promise<number> {
    let registeredCount = 0;
    const errors: Array<{ nodeClass: any; error: Error }> = [];

    for (const NodeClass of nodeClasses) {
      try {
        await this.register(NodeClass, options);
        registeredCount++;
      } catch (error) {
        // Collect errors but continue registering other nodes
        errors.push({
          nodeClass: NodeClass,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }

    // Log any errors encountered
    if (errors.length > 0) {
      console.warn(`⚠️  Failed to register ${errors.length} node(s):`);
      errors.forEach(({ nodeClass, error }) => {
        console.warn(`   - ${nodeClass.name || 'Unknown'}: ${error.message}`);
      });
    }

    return registeredCount;
  }

  /**
   * Discover and register nodes from the nodes package
   * Server-only architecture: all nodes are in /packages/nodes/
   *
   * @deprecated Use registerFromArray() with ALL_NODES from @workscript/nodes instead.
   * This method uses dynamic imports which have workspace dependency issues.
   */
  async discoverFromPackages(): Promise<void> {
    // In browser environment, log warning and suggest manual registration
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      console.warn('File-based node discovery is not available in browser environment.');
      return;
    }

    const discoveryPaths = this.getDiscoveryPaths();

    for (const { path: discoveryPath, source } of discoveryPaths) {
      await this.discoverFromPath(discoveryPath, source);
    }
  }


  /**
   * Get discovery paths for server-only architecture
   * Server-only: all nodes are in /packages/nodes/
   */
  private getDiscoveryPaths(): Array<{ path: string; source: NodeSource }> {
    // Only available in Node.js environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      return [];
    }

    // Find monorepo root
    const basePath = this.findMonorepoRoot();
    const paths: Array<{ path: string; source: NodeSource }> = [];

    // Server-only architecture: all nodes in /packages/nodes/
    const nodesSrcPath = path.join(basePath, 'packages/nodes/src');
    paths.push({ path: nodesSrcPath, source: 'server' });

    // Check for production build (dist/ directory)
    const nodesDistPath = path.join(basePath, 'packages/nodes/dist');
    try {
      const nodeFs = require('fs');
      if (nodeFs.existsSync(nodesDistPath)) {
        paths.push({ path: nodesDistPath, source: 'server' });
      }
    } catch (error) {
      // Ignore if fs is not available
    }

    return paths;
  }

  /**
   * Find the monorepo root by looking for the directory that contains
   * both packages/ and apps/ subdirectories (new architecture)
   * or shared/ and server/ subdirectories (legacy architecture)
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
        // Use require('fs') to ensure we have the right fs module
        const nodeFs = require('fs');

        // Check for new architecture (packages/ and apps/)
        const packagesPath = path.join(currentDir, 'packages');
        const appsPath = path.join(currentDir, 'apps');
        const packagesExists = nodeFs.existsSync(packagesPath);
        const appsExists = nodeFs.existsSync(appsPath);

        if (packagesExists && appsExists) {
          return currentDir;
        }

        // Check for legacy architecture (shared/ and server/)
        const sharedPath = path.join(currentDir, 'shared');
        const serverPath = path.join(currentDir, 'server');
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
   * @param source Node source type (always 'server' in server-only architecture)
   */
  async discoverFromPath(directory: string, source: NodeSource = 'server'): Promise<void> {
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
   * @param source Node source type (always 'server' in server-only architecture)
   */
  async discover(directory: string, source: NodeSource = 'server'): Promise<void> {
    // Only available in Node.js environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      console.warn('Node discovery is not available in browser environment');
      return;
    }
    const pattern = path.join(directory, '**/*.{ts,js}');
    const files = await glob(pattern, { absolute: true });

    for (const file of files) {
      try {
        // Skip test files, index files, and TypeScript declaration files
        if (file.includes('.test.') || file.endsWith('index.ts') || file.endsWith('index.js') || file.endsWith('.d.ts')) {
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
   * @returns A new or singleton instance of the node
   */
  getInstance(nodeId: string): WorkflowNode {
    // Check if node is already registered first
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
      source: options?.source ?? 'server'
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
   * @returns Array of node metadata with source information
   */
  listNodes(): (NodeMetadata & { source: NodeSource })[] {
    const nodes = Array.from(this.nodes.values());
    return nodes.map(r => ({ ...r.metadata, source: r.source }));
  }

  /**
   * List nodes by source
   * @param source Filter by node source
   * @returns Array of node metadata with source information
   */
  listNodesBySource(source: NodeSource): (NodeMetadata & { source: NodeSource })[] {
    return Array.from(this.nodes.values())
      .filter(r => r.source === source)
      .map(r => ({ ...r.metadata, source: r.source }));
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