import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry, HookManager } from '@workscript/engine';
import type { WorkflowDefinition, ParsedWorkflow, ValidationResult } from '@workscript/engine';
import { ALL_NODES } from '@workscript/nodes';
import { BunWebSocketManager } from '../../../shared-services/websocket';

/**
 * Workscript Plugin - Workflow Service
 *
 * Singleton service for workflow engine components.
 * Registers all nodes from @workscript/nodes package using consolidated exports:
 * - Core nodes (Math, Logic, DataTransform, etc.)
 * - Data manipulation nodes (Filter, Sort, Aggregate, etc.)
 * - Server nodes (FileSystem, Database, Auth)
 * - Custom integration nodes (Gmail, Zoca, etc.)
 */
export class WorkflowService {
  private static instance: WorkflowService | null = null;

  private registry: NodeRegistry;
  private stateManager: StateManager;
  private executionEngine: ExecutionEngine;
  private hookManager: HookManager;
  private parser: WorkflowParser;
  private webSocketManager: BunWebSocketManager;
  private initialized: boolean = false;

  private constructor() {
    this.registry = new NodeRegistry();
    this.stateManager = new StateManager();
    this.hookManager = new HookManager();
    this.executionEngine = new ExecutionEngine(this.registry, this.stateManager, this.hookManager);
    this.parser = new WorkflowParser(this.registry);
    this.webSocketManager = BunWebSocketManager.getInstance();
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
   * from the consolidated ALL_NODES export.
   *
   * This approach uses the consolidated export from @workscript/nodes instead
   * of dynamic file discovery, which resolves workspace dependency issues.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing WorkflowService (Workscript Plugin)...');

    try {
      // Register all nodes from the consolidated ALL_NODES array
      // This uses the new registerFromArray() method which is simpler and
      // avoids workspace dependency resolution issues with dynamic imports
      const registeredCount = await this.registry.registerFromArray(ALL_NODES, { source: 'server' });

      const nodeCount = this.registry.size;
      const serverNodes = this.registry.listNodesBySource('server');

      console.log(`✅ WorkflowService initialized successfully`);
      console.log(`📦 Registered ${registeredCount} nodes from @workscript/nodes package`);
      console.log(`   - ${serverNodes.length} server-compatible nodes available`);
      console.log(`   - Node IDs: ${serverNodes.slice(0, 5).join(', ')}${serverNodes.length > 5 ? '...' : ''}`);

      // Setup WebSocket hooks for real-time workflow monitoring
      this.setupHooks();

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize WorkflowService:', error);
      throw new Error(`WorkflowService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup workflow hooks to broadcast events via WebSocket
   * This enables real-time monitoring of workflow execution
   */
  private setupHooks(): void {
    console.log('🎣 Setting up workflow hooks for WebSocket broadcasting...');

    // Hook: Workflow execution started
    this.hookManager.register('workflow:before-start', {
      name: 'websocket-workflow-start-broadcaster',
      handler: async (context) => {
        console.log('🚀 HOOK: Workflow starting -', context.workflowId);

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
        console.log('✅ HOOK: Workflow completed -', context.workflowId);

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
        console.log(`🔧 HOOK: Executing node ${context.nodeId}`);

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
        console.log(`✅ HOOK: Node completed ${context.nodeId}`);

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
        console.log('❌ HOOK: Workflow error -', context.workflowId);

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
        console.log(`❌ HOOK: Node error ${context.nodeId}`);

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
   * @param workflowDefinition - The workflow to execute
   * @param initialState - Optional initial state to inject into workflow
   * @returns The execution result
   */
  public async executeWorkflow(workflowDefinition: WorkflowDefinition, initialState?: any) {
    // Parse and validate workflow
    const parsedWorkflow = this.parser.parse(workflowDefinition);

    // Inject initial state if provided
    if (initialState && Object.keys(initialState).length > 0) {
      (parsedWorkflow as any).initialState = initialState;
    }

    // Execute workflow
    return await this.executionEngine.execute(parsedWorkflow);
  }

  /**
   * Validate a workflow definition
   * @param workflowDefinition - The workflow to validate
   * @returns Validation result
   */
  public validateWorkflow(workflowDefinition: any): ValidationResult {
    return this.parser.validate(workflowDefinition);
  }

  /**
   * Parse a workflow definition without executing
   * @param workflowDefinition - The workflow to parse
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
   * Get node metadata by ID
   * @param nodeId - The node ID
   * @returns Node metadata with source information
   */
  public getNodeMetadata(nodeId: string) {
    return this.registry.getMetadata(nodeId);
  }

  /**
   * Check if a node is available
   * @param nodeId - The node ID to check
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
      plugin: 'workscript',
      package: '@workscript/nodes'
    };
  }
}
