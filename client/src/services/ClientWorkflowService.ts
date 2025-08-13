import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry } from 'shared';
import type { WorkflowDefinition, ParsedWorkflow, ValidationResult } from 'shared';
import { UNIVERSAL_NODES } from 'shared/nodes';
import { CLIENT_NODES } from '../../nodes';

/**
 * Singleton service for workflow engine components in browser environments
 * Automatically discovers and registers nodes from shared (universal) and client environments
 * 
 * This service provides the same API as the server WorkflowService but is optimized
 * for browser environments where file-based node discovery is not available.
 */
export class ClientWorkflowService {
  private static instance: ClientWorkflowService | null = null;
  
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
   * Get the singleton instance of ClientWorkflowService
   * Automatically initializes on first access
   */
  public static async getInstance(): Promise<ClientWorkflowService> {
    if (ClientWorkflowService.instance === null) {
      ClientWorkflowService.instance = new ClientWorkflowService();
      await ClientWorkflowService.instance.initialize();
    }
    return ClientWorkflowService.instance;
  }

  /**
   * Initialize the service by discovering and registering all client-compatible nodes
   * This includes both shared (universal) nodes and client-specific nodes
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing ClientWorkflowService...');
    console.log('🌐 Running in browser environment - using manual node registration');
    
    try {
      // In browser environment, we manually register nodes from central indexes
      // This replaces the file-based discovery used on the server
      
      // Register universal nodes from shared package
      for (const nodeClass of UNIVERSAL_NODES) {
        await this.registry.register(nodeClass, { source: 'universal' });
      }
      
      // Register client-specific nodes
      await this.registry.registerClientNodes(CLIENT_NODES);

      const nodeCount = this.registry.size;
      const universalNodes = this.registry.listNodesBySource('universal');
      const clientNodes = this.registry.listNodesBySource('client');
      
      console.log(`✅ ClientWorkflowService initialized successfully`);
      console.log(`📦 Registered ${nodeCount} nodes total:`);
      console.log(`   - ${universalNodes.length} universal nodes from shared package`);
      console.log(`   - ${clientNodes.length} client-specific nodes`);

      // Log individual client nodes for debugging
      if (clientNodes.length > 0) {
        console.log('🔧 Available client nodes:', clientNodes.map(n => n.id).join(', '));
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize ClientWorkflowService:', error);
      throw new Error(`ClientWorkflowService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a workflow definition in the browser
   * @param workflowDefinition The workflow to execute
   * @returns The execution result
   */
  public async executeWorkflow(workflowDefinition: WorkflowDefinition) {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

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
  public validateWorkflow(workflowDefinition: unknown): ValidationResult {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

    return this.parser.validate(workflowDefinition);
  }

  /**
   * Parse a workflow definition without executing
   * @param workflowDefinition The workflow to parse
   * @returns Parsed workflow
   */
  public parseWorkflow(workflowDefinition: WorkflowDefinition): ParsedWorkflow {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

    return this.parser.parse(workflowDefinition);
  }

  /**
   * Get all available nodes for the client environment
   * @returns Array of node metadata
   */
  public getAvailableNodes() {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

    return this.registry.listNodes('client');
  }

  /**
   * Get nodes by source type
   * @param source The source type to filter by
   * @returns Array of node metadata
   */
  public getNodesBySource(source: 'universal' | 'client') {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

    return this.registry.listNodesBySource(source);
  }

  /**
   * Get node metadata by ID
   * @param nodeId The node ID
   * @returns Node metadata with source information
   */
  public getNodeMetadata(nodeId: string) {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

    return this.registry.getMetadata(nodeId);
  }

  /**
   * Check if a node is available
   * @param nodeId The node ID to check
   * @returns True if the node is registered
   */
  public hasNode(nodeId: string): boolean {
    if (!this.initialized) {
      return false;
    }

    return this.registry.hasNode(nodeId);
  }

  /**
   * Force re-initialization (useful for testing or hot reloading)
   * WARNING: This will reset the singleton instance
   */
  public static async reinitialize(): Promise<ClientWorkflowService> {
    ClientWorkflowService.instance = null;
    return await ClientWorkflowService.getInstance();
  }

  /**
   * Get service statistics and information
   * @returns Service information and statistics
   */
  public getServiceInfo() {
    return {
      initialized: this.initialized,
      totalNodes: this.registry.size,
      universalNodes: this.registry.listNodesBySource('universal').length,
      clientNodes: this.registry.listNodesBySource('client').length,
      environment: 'client' as const,
      browser: typeof window !== 'undefined'
    };
  }

  /**
   * Get the underlying registry instance (for advanced usage)
   * @returns NodeRegistry instance
   */
  public getRegistry(): NodeRegistry {
    return this.registry;
  }

  /**
   * Get the underlying execution engine (for advanced usage)
   * @returns ExecutionEngine instance
   */
  public getExecutionEngine(): ExecutionEngine {
    return this.executionEngine;
  }

  /**
   * Get the underlying state manager (for advanced usage)
   * @returns StateManager instance
   */
  public getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Get the underlying parser (for advanced usage)
   * @returns WorkflowParser instance
   */
  public getParser(): WorkflowParser {
    return this.parser;
  }
}