import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry, HookManager } from 'shared';
import type { WorkflowDefinition, ParsedWorkflow, ValidationResult } from 'shared';
import { UNIVERSAL_NODES } from 'shared/nodes';
import { CLIENT_NODES } from '../../nodes';
import { useWebSocket, type WebSocketMessage, type WebSocketOptions } from '../hooks/useWebSocket';

export interface WebSocketWorkflowOptions {
  enabled?: boolean;
  url?: string;
  protocols?: string | string[];
  autoExecute?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

/**
 * Singleton service for workflow engine components in browser environments
 * Automatically discovers and registers nodes from shared (universal) and client environments
 * 
 * This service provides the same API as the server WorkflowService but is optimized
 * for browser environments where file-based node discovery is not available.
 * 
 * Now includes WebSocket integration for real-time workflow triggering and communication.
 */
export class ClientWorkflowService {
  private static instance: ClientWorkflowService | null = null;
  
  private registry: NodeRegistry;
  private stateManager: StateManager;
  private hookManager: HookManager;
  private executionEngine: ExecutionEngine;
  private parser: WorkflowParser;
  private initialized: boolean = false;
  
  // WebSocket integration properties
  private webSocketOptions: WebSocketWorkflowOptions | null = null;
  private webSocketConnection: any = null;
  private webSocketEventHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();

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
      
      console.log('📦 Registering universal nodes...');
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

  /**
   * Enable WebSocket integration for real-time workflow communication
   * @param options WebSocket configuration options
   */
  public enableWebSocket(options: WebSocketWorkflowOptions): void {
    if (!this.initialized) {
      throw new Error('ClientWorkflowService not initialized. Call getInstance() first.');
    }

    this.webSocketOptions = {
      enabled: true,
      autoExecute: true,
      reconnect: true,
      maxReconnectAttempts: 5,
      ...options
    };

    if (this.webSocketOptions.enabled && this.webSocketOptions.url) {
      this.connectWebSocket();
    }
  }

  /**
   * Disable WebSocket integration and close any active connections
   */
  public disableWebSocket(): void {
    this.webSocketOptions = null;
    if (this.webSocketConnection) {
      this.webSocketConnection.disconnect();
      this.webSocketConnection = null;
    }
    this.webSocketEventHandlers.clear();
  }

  /**
   * Connect to WebSocket server
   */
  private connectWebSocket(): void {
    if (!this.webSocketOptions?.url) {
      console.error('❌ Cannot connect WebSocket: No URL provided');
      return;
    }

    console.log('🔌 Connecting to WebSocket for workflow communication...');

    // Note: Since useWebSocket is a React hook, we need to create a WebSocket manually here
    // or restructure to use the hook in a React component context
    const socket = new WebSocket(this.webSocketOptions.url, this.webSocketOptions.protocols);

    socket.onopen = (event) => {
      console.log('✅ WebSocket connected for workflow service');
      this.handleWebSocketMessage({
        type: 'connection:open',
        payload: { timestamp: Date.now() },
        timestamp: Date.now()
      });
    };

    socket.onclose = (event) => {
      console.log('🔌 WebSocket disconnected from workflow service');
      this.handleWebSocketMessage({
        type: 'connection:close',
        payload: { code: event.code, reason: event.reason, timestamp: Date.now() },
        timestamp: Date.now()
      });
      
      // Handle reconnection if enabled
      if (this.webSocketOptions?.reconnect && this.webSocketOptions?.maxReconnectAttempts) {
        setTimeout(() => this.connectWebSocket(), 1000);
      }
    };

    socket.onerror = (event) => {
      console.error('❌ WebSocket error in workflow service:', event);
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        // Handle non-JSON messages
        this.handleWebSocketMessage({
          type: 'raw',
          payload: event.data,
          timestamp: Date.now()
        });
      }
    };

    this.webSocketConnection = {
      socket,
      disconnect: () => socket.close(),
      send: (message: WebSocketMessage) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(message));
          return true;
        }
        return false;
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   * @param message The received WebSocket message
   */
  private async handleWebSocketMessage(message: WebSocketMessage): Promise<void> {
    console.log('📨 WebSocket message received:', message.type, message.payload);

    // Check for registered event handlers
    const handler = this.webSocketEventHandlers.get(message.type);
    if (handler) {
      handler(message);
      return;
    }

    // Handle built-in message types
    switch (message.type) {
      case 'workflow:execute':
        await this.handleWebSocketWorkflowExecution(message);
        break;
      
      case 'workflow:validate':
        this.handleWebSocketWorkflowValidation(message);
        break;
      
      case 'system:ping':
        this.sendWebSocketMessage({
          type: 'system:pong',
          payload: { timestamp: Date.now() },
          timestamp: Date.now()
        });
        break;
      
      default:
        console.log('📨 Unhandled WebSocket message type:', message.type);
    }
  }

  /**
   * Handle WebSocket-triggered workflow execution
   * @param message The workflow execution message
   */
  private async handleWebSocketWorkflowExecution(message: WebSocketMessage): Promise<void> {
    if (!this.webSocketOptions?.autoExecute) {
      console.log('⚠️ WebSocket workflow execution disabled');
      return;
    }

    try {
      const { workflowDefinition, executionId } = message.payload;
      
      if (!workflowDefinition) {
        throw new Error('No workflow definition provided in WebSocket message');
      }

      console.log('🚀 Executing workflow via WebSocket trigger:', executionId);
      
      // Execute the workflow
      const result = await this.executeWorkflow(workflowDefinition);
      
      // Send result back via WebSocket
      this.sendWebSocketMessage({
        type: 'workflow:result',
        payload: {
          executionId,
          success: true,
          result,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ WebSocket workflow execution failed:', error);
      
      // Send error back via WebSocket
      this.sendWebSocketMessage({
        type: 'workflow:error',
        payload: {
          executionId: message.payload?.executionId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle WebSocket-triggered workflow validation
   * @param message The workflow validation message
   */
  private handleWebSocketWorkflowValidation(message: WebSocketMessage): void {
    try {
      const { workflowDefinition, validationId } = message.payload;
      
      if (!workflowDefinition) {
        throw new Error('No workflow definition provided in WebSocket message');
      }

      console.log('🔍 Validating workflow via WebSocket trigger:', validationId);
      
      // Validate the workflow
      const result = this.validateWorkflow(workflowDefinition);
      
      // Send result back via WebSocket
      this.sendWebSocketMessage({
        type: 'workflow:validation-result',
        payload: {
          validationId,
          result,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ WebSocket workflow validation failed:', error);
      
      // Send error back via WebSocket
      this.sendWebSocketMessage({
        type: 'workflow:validation-error',
        payload: {
          validationId: message.payload?.validationId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send a message via WebSocket connection
   * @param message The message to send
   * @returns True if message was sent successfully
   */
  public sendWebSocketMessage(message: WebSocketMessage): boolean {
    if (!this.webSocketConnection) {
      console.warn('⚠️ No WebSocket connection available');
      return false;
    }

    return this.webSocketConnection.send(message);
  }

  /**
   * Register a custom WebSocket event handler
   * @param messageType The message type to handle
   * @param handler The handler function
   */
  public onWebSocketMessage(messageType: string, handler: (message: WebSocketMessage) => void): void {
    this.webSocketEventHandlers.set(messageType, handler);
  }

  /**
   * Remove a WebSocket event handler
   * @param messageType The message type to remove handler for
   */
  public offWebSocketMessage(messageType: string): void {
    this.webSocketEventHandlers.delete(messageType);
  }

  /**
   * Get WebSocket connection status
   * @returns WebSocket connection information
   */
  public getWebSocketStatus() {
    return {
      enabled: this.webSocketOptions?.enabled || false,
      connected: this.webSocketConnection?.socket?.readyState === WebSocket.OPEN,
      url: this.webSocketOptions?.url || null,
      autoExecute: this.webSocketOptions?.autoExecute || false,
      eventHandlers: Array.from(this.webSocketEventHandlers.keys())
    };
  }
}