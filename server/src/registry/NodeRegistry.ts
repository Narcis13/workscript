import { WorkflowNode } from 'shared/dist';
import type { NodeMetadata } from 'shared/dist';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';
import { pathToFileURL } from 'url';

/**
 * NodeRegistry class responsible for registering, discovering, and managing workflow nodes
 * Implements node discovery, registration, metadata retrieval, and validation
 */
export class NodeRegistry {
  private nodes: Map<string, typeof WorkflowNode>;
  private nodeInstances: Map<string, WorkflowNode>;

  constructor() {
    this.nodes = new Map();
    this.nodeInstances = new Map();
  }

  /**
   * Registers a workflow node class in the registry
   * @param nodeClass - The WorkflowNode class to register
   * @throws Error if node validation fails or node ID already exists
   */
  register(nodeClass: typeof WorkflowNode): void {
    // Validate that the class extends WorkflowNode
    if (!this.isValidNodeClass(nodeClass)) {
      throw new Error('Invalid node class: must extend WorkflowNode');
    }

    // Create a temporary instance to get metadata
    let tempInstance: WorkflowNode;
    try {
      tempInstance = new (nodeClass as any)();
    } catch (error) {
      throw new Error(`Failed to instantiate node class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    const metadata = tempInstance.metadata;

    // Validate metadata
    if (!this.isValidMetadata(metadata)) {
      throw new Error('Invalid node metadata: missing required fields');
    }

    // Check for duplicate node ID
    if (this.nodes.has(metadata.id)) {
      throw new Error(`Node with ID '${metadata.id}' is already registered`);
    }

    // Register the node class
    this.nodes.set(metadata.id, nodeClass);
    this.nodeInstances.set(metadata.id, tempInstance);
  }

  /**
   * Retrieves a workflow node class by ID
   * @param nodeId - The ID of the node to retrieve
   * @returns The node class or undefined if not found
   */
  get(nodeId: string): typeof WorkflowNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Retrieves metadata for a specific node
   * @param nodeId - The ID of the node
   * @returns Node metadata or undefined if not found
   */
  getMetadata(nodeId: string): NodeMetadata | undefined {
    const instance = this.nodeInstances.get(nodeId);
    return instance?.metadata;
  }

  /**
   * Lists metadata for all registered nodes
   * @returns Array of NodeMetadata for all registered nodes
   */
  listAll(): NodeMetadata[] {
    const metadataList: NodeMetadata[] = [];
    
    for (const instance of this.nodeInstances.values()) {
      metadataList.push(instance.metadata);
    }
    
    return metadataList;
  }

  /**
   * Discovers and registers nodes from the filesystem
   * Scans the nodes directory for node implementations
   * @param nodesDirectory - Path to the directory containing node implementations
   */
  async discover(nodesDirectory?: string): Promise<void> {
    const defaultNodesDir = join(process.cwd(), 'src', 'nodes');
    const scanDirectory = nodesDirectory || defaultNodesDir;

    try {
      const files = await readdir(scanDirectory, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
          // Skip test files and type definition files
          if (file.name.includes('.test.') || file.name.includes('.spec.') || file.name.endsWith('.d.ts')) {
            continue;
          }

          const filePath = join(scanDirectory, file.name);
          
          try {
            // Dynamic import with file URL for cross-platform compatibility
            const fileUrl = pathToFileURL(filePath).href;
            const moduleExports = await import(fileUrl);
            
            // Check all exports for WorkflowNode classes
            for (const exportName of Object.keys(moduleExports)) {
              const exportedClass = moduleExports[exportName];
              
              if (this.isConstructor(exportedClass) && this.isValidNodeClass(exportedClass)) {
                try {
                  this.register(exportedClass);
                  console.log(`Registered node: ${exportedClass.name} from ${file.name}`);
                } catch (error) {
                  console.warn(`Failed to register node from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to load module ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to discover nodes in directory ${scanDirectory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Node discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that a class extends WorkflowNode
   * @param nodeClass - The class to validate
   * @returns True if the class is a valid WorkflowNode subclass
   */
  private isValidNodeClass(nodeClass: any): nodeClass is typeof WorkflowNode {
    if (typeof nodeClass !== 'function') {
      return false;
    }

    // Check if it's a constructor and can be instantiated
    try {
      const instance = new (nodeClass as any)();
      
      // Check if instance has required properties and methods
      return (
        instance instanceof WorkflowNode ||
        (typeof instance.execute === 'function' && 
         typeof instance.metadata === 'object' &&
         instance.metadata !== null)
      );
    } catch {
      return false;
    }
  }

  /**
   * Validates node metadata structure
   * @param metadata - The metadata to validate
   * @returns True if metadata contains all required fields
   */
  private isValidMetadata(metadata: any): metadata is NodeMetadata {
    return (
      metadata &&
      typeof metadata === 'object' &&
      typeof metadata.id === 'string' &&
      metadata.id.length > 0 &&
      typeof metadata.name === 'string' &&
      metadata.name.length > 0 &&
      typeof metadata.version === 'string' &&
      metadata.version.length > 0
    );
  }

  /**
   * Checks if a value is a constructor function
   * @param value - The value to check
   * @returns True if the value is a constructor
   */
  private isConstructor(value: any): value is new (...args: any[]) => any {
    return typeof value === 'function' && value.prototype !== undefined;
  }

  /**
   * Clears all registered nodes
   * Useful for testing or resetting the registry
   */
  clear(): void {
    this.nodes.clear();
    this.nodeInstances.clear();
  }

  /**
   * Gets the count of registered nodes
   * @returns The number of registered nodes
   */
  size(): number {
    return this.nodes.size;
  }
}

// Export a singleton instance for global use
export const nodeRegistry = new NodeRegistry();