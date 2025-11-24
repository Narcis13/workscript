import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry, HookManager } from '@workscript/engine';
import type { WorkflowDefinition, ParsedWorkflow, ValidationResult } from '@workscript/engine';
import { ALL_NODES } from '@workscript/nodes';
import { WebSocketManager } from './WebSocketManager';

/**
 * Singleton service for workflow engine components
 * Registers all nodes from @workscript/nodes package using consolidated exports.
 */
export class WorkflowService {
  private static instance: WorkflowService | null = null;
  
  private registry: NodeRegistry;
  private stateManager: StateManager;
  private executionEngine: ExecutionEngine;
  private hookManager: HookManager;
  private parser: WorkflowParser;
  private webSocketManager: WebSocketManager;
  private initialized: boolean = false;

  private constructor() {
    this.registry = new NodeRegistry();
    this.stateManager = new StateManager();
    this.hookManager = new HookManager();
    this.executionEngine = new ExecutionEngine(this.registry, this.stateManager, this.hookManager);
    this.parser = new WorkflowParser(this.registry);
    this.webSocketManager = WebSocketManager.getInstance();
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
   * Initialize the service by registering all server-compatible nodes
   * from the consolidated ALL_NODES export in @workscript/nodes.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing WorkflowService (Legacy Server)...');

    try {
      // Register all nodes from the consolidated ALL_NODES array
      // This uses the registerFromArray() method which is simpler and
      // avoids workspace dependency resolution issues with dynamic imports
      const registeredCount = await this.registry.registerFromArray(ALL_NODES, { source: 'server' });

      const nodeCount = this.registry.size;
      const serverNodes = this.registry.listNodesBySource('server');

      console.log(`✅ WorkflowService initialized successfully`);
      console.log(`📦 Registered ${registeredCount} nodes from @workscript/nodes package`);
      console.log(`   - ${serverNodes.length} server-compatible nodes available`);

      this.setupHooks();
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize WorkflowService:', error);
      throw new Error(`WorkflowService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup workflow hooks to broadcast events via WebSocket
   */
  private setupHooks(): void {
    console.log('🎣 Setting up workflow hooks for server with WebSocket broadcasting..');

    // Hook: Workflow execution started
    this.hookManager.register('workflow:before-start', {
      name: 'websocket-workflow-start-broadcaster',
      handler: async (context) => {
        console.log('🚀 HOOK TRIGGERED: Workflow is about to start!');
        console.log('📋 Workflow ID:', context.workflowId);

        // Broadcast to WebSocket clients
        this.webSocketManager.broadcastToChannel('workflow-events', {
          type: 'workflow:started',
          payload: {
            workflowId: context.workflowId,
            timestamp: Date.now(),
            state: 'starting'
          },
          timestamp: Date.now()
        });
      }
    });

    // Hook: Workflow execution completed
    this.hookManager.register('workflow:after-end', {
      name: 'websocket-workflow-end-broadcaster',
      handler: async (context) => {
        console.log('✅ HOOK TRIGGERED: Workflow has completed!');
        console.log('📋 Workflow ID:', context.workflowId);

        // Broadcast to WebSocket clients
        this.webSocketManager.broadcastToChannel('workflow-events', {
          type: 'workflow:completed',
          payload: {
            workflowId: context.workflowId,
            result: context.data?.result,
            timestamp: Date.now(),
            state: 'completed'
          },
          timestamp: Date.now()
        });
      }
    });

    // Hook: Node execution started
    this.hookManager.register('node:before-execute', {
      name: 'websocket-node-start-broadcaster',
      handler: async (context) => {
        console.log(`🔧 HOOK TRIGGERED: About to execute node: ${context.nodeId}`);
        console.log('📊 Node data:', context.data);

        // Broadcast to WebSocket clients
        this.webSocketManager.broadcastToChannel('workflow-events', {
          type: 'node:started',
          payload: {
            workflowId: context.workflowId,
            nodeId: context.nodeId,
            nodeType: context.data?.nodeType,
            data: context.data,
            timestamp: Date.now(),
            state: 'executing'
          },
          timestamp: Date.now()
        });
      }
    });

    // Hook: Node execution completed
    this.hookManager.register('node:after-execute', {
      name: 'websocket-node-end-broadcaster',
      handler: async (context) => {
        console.log(`✅ HOOK TRIGGERED: Node execution completed: ${context.nodeId}`);

        // Broadcast to WebSocket clients
        this.webSocketManager.broadcastToChannel('workflow-events', {
          type: 'node:completed',
          payload: {
            workflowId: context.workflowId,
            nodeId: context.nodeId,
            nodeType: context.data?.nodeType,
            result: context.data?.result,
            timestamp: Date.now(),
            state: 'completed'
          },
          timestamp: Date.now()
        });
      }
    });

    // Hook: Workflow error
    this.hookManager.register('workflow:error', {
      name: 'websocket-workflow-error-broadcaster',
      handler: async (context) => {
        console.log('❌ HOOK TRIGGERED: Workflow error occurred!');
        console.log('📋 Workflow ID:', context.workflowId);
        console.log('❌ Error:', context.data?.error);

        // Broadcast to WebSocket clients
        this.webSocketManager.broadcastToChannel('workflow-events', {
          type: 'workflow:error',
          payload: {
            workflowId: context.workflowId,
            error: context.data?.error instanceof Error ? {
              message: context.data.error.message,
              stack: context.data.error.stack
            } : context.data?.error,
            timestamp: Date.now(),
            state: 'error'
          },
          timestamp: Date.now()
        });
      }
    });

    // Hook: Node error
    this.hookManager.register('node:error', {
      name: 'websocket-node-error-broadcaster',
      handler: async (context) => {
        console.log(`❌ HOOK TRIGGERED: Node execution error: ${context.nodeId}`);
        console.log('❌ Error:', context.data?.error);

        // Broadcast to WebSocket clients
        this.webSocketManager.broadcastToChannel('workflow-events', {
          type: 'node:error',
          payload: {
            workflowId: context.workflowId,
            nodeId: context.nodeId,
            nodeType: context.data?.nodeType,
            error: context.data?.error instanceof Error ? {
              message: context.data.error.message,
              stack: context.data.error.stack
            } : context.data?.error,
            timestamp: Date.now(),
            state: 'error'
          },
          timestamp: Date.now()
        });
      }
    });

    console.log('✅ WebSocket workflow hooks registered successfully!');
  }
  /**
   * Execute a workflow definition
   * @param workflowDefinition The workflow to execute
   * @param initialState Optional initial state to inject into workflow
   * @returns The execution result
   */
  public async executeWorkflow(workflowDefinition: WorkflowDefinition, initialState?: any) {
    // Parse and validate workflow
    const parsedWorkflow = this.parser.parse(workflowDefinition);

    // Inject initial state if provided
    // The execution engine will handle state initialization with the parsed workflow's execution ID
    // We'll pass initialState through the workflow definition itself
    if (initialState && Object.keys(initialState).length > 0) {
      // Merge initial state into workflow definition metadata
      (parsedWorkflow as any).initialState = initialState;
    }

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
   * Get all available nodes
   * @returns Array of node metadata
   */
  public getAvailableNodes() {
    return this.registry.listNodes();
  }

  /**
   * Get all server nodes
   * @returns Array of node metadata
   */
  public getServerNodes() {
    return this.registry.listNodesBySource('server');
  }

  /**
   * Get nodes by source type (for backward compatibility)
   * Since all nodes are now server nodes, this always returns server nodes.
   * @param source The source type to filter by (only 'server' is valid now)
   * @returns Array of node metadata
   */
  public getNodesBySource(source: string) {
    // All nodes are now registered as 'server' source
    return this.registry.listNodesBySource('server');
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
      serverNodes: this.registry.listNodesBySource('server').length,
      environment: 'server' as const,
      package: '@workscript/nodes'
    };
  }
}