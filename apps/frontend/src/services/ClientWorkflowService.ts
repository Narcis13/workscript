import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry, HookManager } from '@workscript/engine';
import type { WorkflowDefinition, ParsedWorkflow, ValidationResult } from '@workscript/engine';
import { UNIVERSAL_NODES } from '@workscript/engine/nodes';
import { CLIENT_NODES } from '../../nodes';
import type { WebSocketMessage } from '../hooks/useWebSocket';

export interface WebSocketWorkflowHandlers {
  onExecutionResult?: (result: any, executionId?: string) => void;
  onExecutionError?: (error: string, executionId?: string) => void;
  onValidationResult?: (result: ValidationResult, validationId?: string) => void;
  onValidationError?: (error: string, validationId?: string) => void;
}

/**
 * Singleton service for workflow engine components in browser environments
 * Automatically discovers and registers nodes from shared (universal) and client environments
 *
 * This service provides the same API as the server WorkflowService but is optimized
 * for browser environments where file-based node discovery is not available.
 *
 * WebSocket Integration:
 * This service provides message handlers that can be used with the useWebSocket hook.
 * Components should manage WebSocket connections using useWebSocket and call the
 * handleWebSocketMessage method when messages are received.
 *
 * @example
 * ```tsx
 * const service = await ClientWorkflowService.getInstance();
 * const { sendMessage } = useWebSocket({
 *   url: 'ws://localhost:3013/ws',
 *   onMessage: (message) => service.handleWebSocketMessage(message, sendMessage)
 * });
 * ```
 */
export class ClientWorkflowService {
  private static instance: ClientWorkflowService | null = null;
  private static initPromise: Promise<void> | null = null;

  private registry: NodeRegistry;
  private stateManager: StateManager;
  private hookManager: HookManager;
  private executionEngine: ExecutionEngine;
  private parser: WorkflowParser;
  private initialized: boolean = false;

  // WebSocket message handlers
  private webSocketHandlers: WebSocketWorkflowHandlers = {};
  private customMessageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();

  private constructor() {
    this.registry = new NodeRegistry();
    this.stateManager = new StateManager();
    this.hookManager = new HookManager();
    this.executionEngine = new ExecutionEngine(this.registry, this.stateManager, this.hookManager);
    this.parser = new WorkflowParser(this.registry);
  }

  /**
   * Get the singleton instance of ClientWorkflowService
   * Automatically initializes on first access
   */
  public static async getInstance(): Promise<ClientWorkflowService> {
    if (ClientWorkflowService.instance === null) {
      ClientWorkflowService.instance = new ClientWorkflowService();
      ClientWorkflowService.initPromise = ClientWorkflowService.instance.initialize();
    }

    // Always wait for initialization to complete, even if called multiple times concurrently
    if (ClientWorkflowService.initPromise) {
      await ClientWorkflowService.initPromise;
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

      console.log('📦 Registering universal nodes...');
      console.log('📊 UNIVERSAL_NODES type:', typeof UNIVERSAL_NODES);
      console.log('📊 UNIVERSAL_NODES is array:', Array.isArray(UNIVERSAL_NODES));
      console.log('📊 UNIVERSAL_NODES length:', UNIVERSAL_NODES?.length);

      if (!UNIVERSAL_NODES || !Array.isArray(UNIVERSAL_NODES)) {
        throw new Error(`UNIVERSAL_NODES is not properly loaded. Type: ${typeof UNIVERSAL_NODES}, Value: ${UNIVERSAL_NODES}`);
      }

      // Register universal nodes from shared package
      for (const nodeClass of UNIVERSAL_NODES) {
        try {
          await this.registry.register(nodeClass, { source: 'universal' });
        } catch (nodeError) {
          console.error(`❌ Failed to register universal node:`, nodeClass, nodeError);
          throw nodeError;
        }
      }

      console.log('🎯 Registering client-specific nodes...');
      // Register client-specific nodes
      try {
        await this.registry.registerClientNodes(CLIENT_NODES);
      } catch (clientNodesError) {
        console.error(`❌ Failed to register client nodes:`, clientNodesError);
        throw clientNodesError;
      }

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

      // Register hooks for demonstration
      console.log('🎣 Setting up workflow hooks...');
      try {
        this.setupHooks();
      } catch (hookError) {
        console.error(`❌ Failed to setup hooks:`, hookError);
        throw hookError;
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize ClientWorkflowService:', error);
      throw new Error(`ClientWorkflowService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup demo hooks to show the hook system in action
   */
  private setupHooks(): void {
    console.log('🎣 Setting up workflow hooks for demonstration...');

    // Register a hook that logs before workflow execution starts
    this.hookManager.register('workflow:before-start', {
      name: 'demo-before-start-logger',
      handler: async (context) => {
        console.log('🚀 HOOK TRIGGERED: Workflow is about to start!');
        console.log('📋 Workflow ID:', context.workflowId);
        console.log('📊 Workflow data:', context.data);
        console.log('⏰ Timestamp:', context.timestamp);
      }
    });

    // Register a hook that logs after workflow execution completes
    this.hookManager.register('workflow:after-end', {
      name: 'demo-after-end-logger',
      handler: async (context) => {
        console.log('✅ HOOK TRIGGERED: Workflow has completed!');
        console.log('📋 Workflow ID:', context.workflowId);
        console.log('📊 Execution result:', context.data);
        console.log('⏰ Timestamp:', context.timestamp);
      }
    });

    // Register a hook that logs before each node execution
    this.hookManager.register('node:before-execute', {
      name: 'demo-node-logger',
      handler: async (context) => {
        console.log(`🔧 HOOK TRIGGERED: About to execute node: ${context.nodeId}`);
        console.log('📊 Node data:', context.data);
      }
    });

    console.log('✅ Demo hooks registered successfully!');
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

  // ===========================
  // WebSocket Integration API
  // ===========================

  /**
   * Set handlers for WebSocket workflow events
   * These handlers will be called when workflows are executed/validated via WebSocket
   *
   * @param handlers Object containing callback functions for WebSocket events
   *
   * @example
   * ```tsx
   * service.setWebSocketHandlers({
   *   onExecutionResult: (result, executionId) => {
   *     console.log('Workflow completed:', result);
   *   },
   *   onExecutionError: (error, executionId) => {
   *     console.error('Workflow failed:', error);
   *   }
   * });
   * ```
   */
  public setWebSocketHandlers(handlers: WebSocketWorkflowHandlers): void {
    this.webSocketHandlers = { ...this.webSocketHandlers, ...handlers };
  }

  /**
   * Handle incoming WebSocket messages
   * Call this method from your useWebSocket hook's onMessage callback
   *
   * @param message The received WebSocket message
   * @param sendMessage Function to send messages back (from useWebSocket)
   *
   * @example
   * ```tsx
   * const { sendMessage } = useWebSocket({
   *   url: 'ws://localhost:3013/ws',
   *   onMessage: (message) => {
   *     service.handleWebSocketMessage(message, sendMessage);
   *   }
   * });
   * ```
   */
  public async handleWebSocketMessage(
    message: WebSocketMessage,
    sendMessage: (message: WebSocketMessage) => boolean
  ): Promise<void> {
    console.log('📨 WebSocket message received:', message.type, message.payload);

    // Check for custom message handlers first
    const customHandler = this.customMessageHandlers.get(message.type);
    if (customHandler) {
      customHandler(message);
      return;
    }

    // Handle built-in message types
    switch (message.type) {
      case 'workflow:execute':
        await this.handleWebSocketWorkflowExecution(message, sendMessage);
        break;

      case 'workflow:validate':
        await this.handleWebSocketWorkflowValidation(message, sendMessage);
        break;

      case 'system:ping':
        sendMessage({
          type: 'system:pong',
          payload: { timestamp: Date.now() },
          timestamp: Date.now()
        });
        break;

      case 'connection:open':
      case 'connection:close':
        // Connection state messages - can be handled by custom handlers if needed
        console.log('📡 Connection state changed:', message.type);
        break;

      default:
        console.log('📨 Unhandled WebSocket message type:', message.type);
    }
  }

  /**
   * Handle WebSocket-triggered workflow execution
   * @param message The workflow execution message
   * @param sendMessage Function to send responses
   */
  private async handleWebSocketWorkflowExecution(
    message: WebSocketMessage,
    sendMessage: (message: WebSocketMessage) => boolean
  ): Promise<void> {
    try {
      const { workflowDefinition, executionId } = message.payload;

      if (!workflowDefinition) {
        throw new Error('No workflow definition provided in WebSocket message');
      }

      console.log('🚀 Executing workflow via WebSocket trigger:', executionId);

      // Execute the workflow
      const result = await this.executeWorkflow(workflowDefinition);

      // Send result back via WebSocket
      sendMessage({
        type: 'workflow:result',
        payload: {
          executionId,
          success: true,
          result,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      // Call handler if registered
      this.webSocketHandlers.onExecutionResult?.(result, executionId);

    } catch (error) {
      console.error('❌ WebSocket workflow execution failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Send error back via WebSocket
      sendMessage({
        type: 'workflow:error',
        payload: {
          executionId: message.payload?.executionId,
          success: false,
          error: errorMessage,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      // Call error handler if registered
      this.webSocketHandlers.onExecutionError?.(errorMessage, message.payload?.executionId);
    }
  }

  /**
   * Handle WebSocket-triggered workflow validation
   * @param message The workflow validation message
   * @param sendMessage Function to send responses
   */
  private async handleWebSocketWorkflowValidation(
    message: WebSocketMessage,
    sendMessage: (message: WebSocketMessage) => boolean
  ): Promise<void> {
    try {
      const { workflowDefinition, validationId } = message.payload;

      if (!workflowDefinition) {
        throw new Error('No workflow definition provided in WebSocket message');
      }

      console.log('🔍 Validating workflow via WebSocket trigger:', validationId);

      // Validate the workflow
      const result = this.validateWorkflow(workflowDefinition);

      // Send result back via WebSocket
      sendMessage({
        type: 'workflow:validation-result',
        payload: {
          validationId,
          result,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      // Call handler if registered
      this.webSocketHandlers.onValidationResult?.(result, validationId);

    } catch (error) {
      console.error('❌ WebSocket workflow validation failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Send error back via WebSocket
      sendMessage({
        type: 'workflow:validation-error',
        payload: {
          validationId: message.payload?.validationId,
          error: errorMessage,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      // Call error handler if registered
      this.webSocketHandlers.onValidationError?.(errorMessage, message.payload?.validationId);
    }
  }

  /**
   * Register a custom WebSocket message handler
   * Use this to handle custom message types beyond the built-in workflow operations
   *
   * @param messageType The message type to handle
   * @param handler The handler function
   *
   * @example
   * ```tsx
   * service.registerWebSocketHandler('custom:action', (message) => {
   *   console.log('Custom action received:', message.payload);
   * });
   * ```
   */
  public registerWebSocketHandler(
    messageType: string,
    handler: (message: WebSocketMessage) => void
  ): void {
    this.customMessageHandlers.set(messageType, handler);
  }

  /**
   * Remove a custom WebSocket message handler
   * @param messageType The message type to remove handler for
   */
  public unregisterWebSocketHandler(messageType: string): void {
    this.customMessageHandlers.delete(messageType);
  }

  /**
   * Get registered WebSocket message handlers
   * @returns Array of registered message types
   */
  public getWebSocketHandlers(): string[] {
    return Array.from(this.customMessageHandlers.keys());
  }
}
