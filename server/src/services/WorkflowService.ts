import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry } from 'shared';
import type { WorkflowDefinition, ParsedWorkflow, ValidationResult } from 'shared';

/**
 * Singleton service for workflow engine components
 * Automatically discovers and registers nodes from shared (universal) and server environments
 */
export class WorkflowService {
  private static instance: WorkflowService | null = null;
  
  private registry: NodeRegistry;
  private stateManager: StateManager;
  private executionEngine: ExecutionEngine;
  private parser: WorkflowParser;
  private initialized: boolean = false;

  private constructor() {
    this.registry = new NodeRegistry();
    this.stateManager = new StateManager();
    this.executionEngine = new ExecutionEngine(this.registry, this.stateManager);
    this.parser = new WorkflowParser(this.registry);
  }

  /**
   * Get the singleton instance of WorkflowService
   * Automatically initializes on first access
   */
  public static async getInstance(): Promise<WorkflowService> {
    if (WorkflowService.instance === null) {
      WorkflowService.instance = new WorkflowService();
      await WorkflowService.instance.initialize();
    }
    return WorkflowService.instance;
  }

  /**
   * Initialize the service by discovering and registering all server-compatible nodes
   * This includes both shared (universal) nodes and server-specific nodes
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing WorkflowService...');
    console.log('🔍 Current working directory:', process.cwd());
    
    try {
      // Debug: Log the paths that will be searched
      const path = require('path');
      const basePath = process.cwd();
      // Go up one level from server directory to reach monorepo root
      const monorepoRoot = path.resolve(basePath, '..');
      const sharedPath = path.join(monorepoRoot, 'shared/nodes');
      const serverPath = path.join(monorepoRoot, 'server/nodes');
      
      console.log('📂 Searching for nodes in:');
      console.log(`   - Shared: ${sharedPath}`);
      console.log(`   - Server: ${serverPath}`);
      
      // Check if directories exist
      const fs = require('fs').promises;
      try {
        await fs.access(sharedPath);
        console.log('✅ Shared nodes directory exists');
      } catch {
        console.log('❌ Shared nodes directory not found');
      }
      
      try {
        await fs.access(serverPath);
        console.log('✅ Server nodes directory exists');
      } catch {
        console.log('❌ Server nodes directory not found');
      }
      
      // Discover nodes from both shared and server packages
      // This will scan:
      // - /shared/nodes/**/*.{ts,js} (universal nodes)  
      // - /server/nodes/**/*.{ts,js} (server-specific nodes)
      await this.registry.discoverFromPackages('server');
      
      const nodeCount = this.registry.size;
      const universalNodes = this.registry.listNodesBySource('universal');
      const serverNodes = this.registry.listNodesBySource('server');
      
      console.log(`✅ WorkflowService initialized successfully`);
      console.log(`📦 Registered ${nodeCount} nodes total:`);
      console.log(`   - ${universalNodes.length} universal nodes from shared package`);
      console.log(`   - ${serverNodes.length} server-specific nodes`);
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize WorkflowService:', error);
      throw new Error(`WorkflowService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a workflow definition
   * @param workflowDefinition The workflow to execute
   * @returns The execution result
   */
  public async executeWorkflow(workflowDefinition: WorkflowDefinition) {
    // Parse and validate workflow
    const parsedWorkflow = this.parser.parse(workflowDefinition);
    
    // Execute workflow
    return await this.executionEngine.execute(parsedWorkflow);
  }

  /**
   * Validate a workflow definition
   * @param workflowDefinition The workflow to validate
   * @returns Validation result
   */
  public validateWorkflow(workflowDefinition: any): ValidationResult {
    return this.parser.validate(workflowDefinition);
  }

  /**
   * Parse a workflow definition without executing
   * @param workflowDefinition The workflow to parse
   * @returns Parsed workflow
   */
  public parseWorkflow(workflowDefinition: WorkflowDefinition): ParsedWorkflow {
    return this.parser.parse(workflowDefinition);
  }

  /**
   * Get all available nodes for the server environment
   * @returns Array of node metadata
   */
  public getAvailableNodes() {
    return this.registry.listNodes('server');
  }

  /**
   * Get nodes by source type
   * @param source The source type to filter by
   * @returns Array of node metadata
   */
  public getNodesBySource(source: 'universal' | 'server') {
    return this.registry.listNodesBySource(source);
  }

  /**
   * Get node metadata by ID
   * @param nodeId The node ID
   * @returns Node metadata with source information
   */
  public getNodeMetadata(nodeId: string) {
    return this.registry.getMetadata(nodeId);
  }

  /**
   * Check if a node is available
   * @param nodeId The node ID to check
   * @returns True if the node is registered
   */
  public hasNode(nodeId: string): boolean {
    return this.registry.hasNode(nodeId);
  }

  /**
   * Force re-initialization (useful for testing or hot reloading)
   * WARNING: This will reset the singleton instance
   */
  public static async reinitialize(): Promise<WorkflowService> {
    WorkflowService.instance = null;
    return await WorkflowService.getInstance();
  }

  /**
   * Get service statistics
   * @returns Service information and statistics
   */
  public getServiceInfo() {
    return {
      initialized: this.initialized,
      totalNodes: this.registry.size,
      universalNodes: this.registry.listNodesBySource('universal').length,
      serverNodes: this.registry.listNodesBySource('server').length,
      environment: 'server' as const
    };
  }
}