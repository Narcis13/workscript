export type ApiResponse = {
  message: string;
  success: true;
}

// Core workflow types and interfaces
export interface AIHints {
  purpose: string;
  when_to_use: string;
  expected_edges: string[];
  example_usage?: string;
}
export interface NodeMetadata {
  id: string;
  name: string;
  description?: string;
  version?: string;
  inputs?: string[];
  outputs?: string[];
  ai_hints?: AIHints;
}

export interface ExecutionContext {
  state: Record<string, any>;
  inputs: Record<string, any>;
  workflowId: string;
  nodeId: string;
  executionId: string;
}

export type EdgeMap = Record<string, any>;

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  initialState?: Record<string, any>;
  workflow: WorkflowStep[];
}

export type WorkflowStep = 
  | string                           // Simple node reference without configuration
  | { [nodeId: string]: NodeConfiguration };  // Node with configuration

export interface NodeConfiguration {
  [key: string]: ParameterValue | EdgeRoute;
}

export type ParameterValue = 
  | string 
  | number
  | boolean
  | Array<ParameterValue>
  | { [key: string]: ParameterValue };

export type EdgeRoute = 
  | string                    // Single node reference
  | EdgeRouteItem[]           // Sequence of nodes/configs
  | NestedNodeConfiguration;  // Nested configuration

export type EdgeRouteItem = 
  | string                    // Node ID in sequence
  | NestedNodeConfiguration;  // Nested config in sequence

export interface NestedNodeConfiguration {
  [nodeId: string]: NodeConfiguration;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  finalState?: Record<string, any>;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

// Abstract WorkflowNode base class
export abstract class WorkflowNode {
  abstract metadata: NodeMetadata;
  
  abstract execute(
    context: ExecutionContext, 
    config?: Record<string, any>
  ): Promise<EdgeMap>;
}

// UI Workflow Infrastructure Types

export interface UINodeMetadata extends NodeMetadata {
  category: 'ui' | 'ui-layout' | 'ui-visualization' | 'ui-form' | 'ui-data';
  renderMode?: 'component' | 'container' | 'overlay';
}

export interface UIInteractionEvent {
  type: string;
  data: any;
  nodeId: string;
  timestamp: number;
}

export interface UIRenderData {
  component: string;
  props: Record<string, any>;
  nodeId: string;
  onInteraction?: (event: UIInteractionEvent) => void;
}

export interface UIEdgeMap extends EdgeMap {
  __ui_render?: () => UIRenderData;
}

export interface UIWorkflowDefinition extends WorkflowDefinition {
  renderMode: 'artifact' | 'inline' | 'modal';
  metadata: {
    title: string;
    description: string;
    aiGenerated: boolean;
    conversationContext?: string;
  };
}

// Component Library Types
export interface WorkflowUIComponent {
  nodeId: string;
  workflowState: any;
  onInteraction: (event: UIInteractionEvent) => void;
}

export interface FormField {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: ValidationRules;
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: any) => string | null;
}

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'action';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface ActionButton {
  label: string;
  action: string;
  payload?: any;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: string;
}

export interface DashboardSection {
  id: string;
  title: string;
  component: string;
  props?: Record<string, any>;
  layout?: {
    width?: string;
    height?: string;
    position?: 'left' | 'right' | 'center' | 'full';
  };
}

export interface ChartData {
  labels?: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface ChartConfig {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: { display: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
    tooltip?: { enabled: boolean };
  };
  scales?: {
    x?: { display: boolean; title?: { display: boolean; text: string } };
    y?: { display: boolean; title?: { display: boolean; text: string } };
  };
}

// Abstract UINode base class
export abstract class UINode extends WorkflowNode {
  abstract metadata: UINodeMetadata;
  
  // UI nodes return both execution edges AND render instructions
  async execute(context: ExecutionContext, config?: any): Promise<UIEdgeMap> {
    const renderData = await this.prepareRenderData(context, config);
    const edges = await this.getEdges(context, config);
    
    return {
      ...edges,
      __ui_render: () => ({
        component: this.getComponentName(),
        props: renderData,
        nodeId: context.nodeId,
        onInteraction: this.createInteractionHandler(context)
      })
    };
  }
  
  protected abstract prepareRenderData(context: ExecutionContext, config?: any): Promise<any>;
  
  protected abstract getEdges(context: ExecutionContext, config?: any): Promise<EdgeMap>;
  
  protected abstract getComponentName(): string;
  
  // Create interaction handler for the UI component
  protected createInteractionHandler(context: ExecutionContext) {
    return (event: UIInteractionEvent) => {
      this.handleInteraction(event, context);
    };
  }
  
  // Handle UI interactions and update workflow state
  protected handleInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    // Default implementation - can be overridden by specific nodes
    this.updateStateFromInteraction(event, context);
    this.emitWorkflowEvent(event, context);
  }
  
  protected updateStateFromInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    // Update context state based on interaction
    const stateKey = `${context.nodeId}_interaction`;
    context.state[stateKey] = event;
    
    // Store specific interaction data
    if (event.data) {
      const dataKey = `${context.nodeId}_data`;
      context.state[dataKey] = event.data;
    }
  }
  
  protected emitWorkflowEvent(event: UIInteractionEvent, context: ExecutionContext): void {
    // This would integrate with the workflow engine's event system
    // For now, we just store the event for the engine to pick up
    const eventsKey = `${context.nodeId}_events`;
    if (!context.state[eventsKey]) {
      context.state[eventsKey] = [];
    }
    context.state[eventsKey].push(event);
  }
}

// UI Event System Types
export interface UIEventEmitter {
  on(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;
  off(event: string, handler?: (data: any) => void): void;
}

// Security and Validation Types
export interface UISecurityConfig {
  allowedComponents: Set<string>;
  allowedActions: Set<string>;
  maxComplexity: number;
  allowExternalData: boolean;
}

export interface UIValidationResult extends ValidationResult {
  securityWarnings?: SecurityWarning[];
}

export interface SecurityWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  path: string;
  recommendation?: string;
}

// WebSocket Message Types and Communication Protocol

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = any> {
  type: string;
  payload?: T;
  timestamp?: number;
  requestId?: string;
  correlationId?: string;
}

/**
 * WebSocket connection lifecycle messages
 */
export interface ConnectionOpenMessage extends WebSocketMessage {
  type: 'connection:open';
  payload: {
    timestamp: number;
    clientId?: string;
    protocols?: string[];
  };
}

export interface ConnectionCloseMessage extends WebSocketMessage {
  type: 'connection:close';
  payload: {
    code: number;
    reason: string;
    timestamp: number;
  };
}

export interface ConnectionErrorMessage extends WebSocketMessage {
  type: 'connection:error';
  payload: {
    error: string;
    timestamp: number;
  };
}

/**
 * System health and ping messages
 */
export interface SystemPingMessage extends WebSocketMessage {
  type: 'system:ping';
  payload: {
    timestamp: number;
    clientId?: string;
  };
}

export interface SystemPongMessage extends WebSocketMessage {
  type: 'system:pong';
  payload: {
    timestamp: number;
    serverId?: string;
  };
}

/**
 * Workflow execution messages
 */
export interface WorkflowExecuteMessage extends WebSocketMessage {
  type: 'workflow:execute';
  payload: {
    workflowDefinition: WorkflowDefinition;
    executionId: string;
    initialState?: Record<string, any>;
    options?: {
      timeout?: number;
      debug?: boolean;
      skipValidation?: boolean;
    };
  };
}

export interface WorkflowResultMessage extends WebSocketMessage {
  type: 'workflow:result';
  payload: {
    executionId: string;
    success: true;
    result: ExecutionResult;
    timestamp: number;
    duration?: number;
  };
}

export interface WorkflowErrorMessage extends WebSocketMessage {
  type: 'workflow:error';
  payload: {
    executionId: string;
    success: false;
    error: string;
    timestamp: number;
    details?: {
      nodeId?: string;
      step?: number;
      stackTrace?: string;
    };
  };
}

/**
 * Workflow validation messages
 */
export interface WorkflowValidateMessage extends WebSocketMessage {
  type: 'workflow:validate';
  payload: {
    workflowDefinition: WorkflowDefinition | unknown;
    validationId: string;
    options?: {
      strict?: boolean;
      checkNodeAvailability?: boolean;
    };
  };
}

export interface WorkflowValidationResultMessage extends WebSocketMessage {
  type: 'workflow:validation-result';
  payload: {
    validationId: string;
    result: ValidationResult;
    timestamp: number;
  };
}

export interface WorkflowValidationErrorMessage extends WebSocketMessage {
  type: 'workflow:validation-error';
  payload: {
    validationId: string;
    error: string;
    timestamp: number;
  };
}

/**
 * Workflow status and progress messages
 */
export interface WorkflowStatusMessage extends WebSocketMessage {
  type: 'workflow:status';
  payload: {
    executionId: string;
    status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
    currentNode?: string;
    progress?: {
      completed: number;
      total: number;
      percentage: number;
    };
    timestamp: number;
  };
}

export interface WorkflowProgressMessage extends WebSocketMessage {
  type: 'workflow:progress';
  payload: {
    executionId: string;
    nodeId: string;
    nodeStatus: 'starting' | 'executing' | 'completed' | 'failed';
    timestamp: number;
    data?: Record<string, any>;
  };
}

/**
 * Node registry and discovery messages
 */
export interface NodeListRequestMessage extends WebSocketMessage {
  type: 'node:list-request';
  payload: {
    requestId: string;
    environment?: 'universal' | 'server' | 'client';
    category?: string;
  };
}

export interface NodeListResponseMessage extends WebSocketMessage {
  type: 'node:list-response';
  payload: {
    requestId: string;
    nodes: Array<NodeMetadata & { source: string }>;
    timestamp: number;
  };
}

/**
 * Error and notification messages
 */
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: number;
  };
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  payload: {
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    actions?: Array<{
      label: string;
      action: string;
      data?: any;
    }>;
  };
}

/**
 * Custom and raw message types
 */
export interface CustomMessage extends WebSocketMessage {
  type: string; // Any custom type
  payload?: any;
}

export interface RawMessage extends WebSocketMessage {
  type: 'raw';
  payload: string | ArrayBuffer | Blob;
}

/**
 * Union type for all possible WebSocket messages
 */
export type AnyWebSocketMessage = 
  | ConnectionOpenMessage
  | ConnectionCloseMessage
  | ConnectionErrorMessage
  | SystemPingMessage
  | SystemPongMessage
  | WorkflowExecuteMessage
  | WorkflowResultMessage
  | WorkflowErrorMessage
  | WorkflowValidateMessage
  | WorkflowValidationResultMessage
  | WorkflowValidationErrorMessage
  | WorkflowStatusMessage
  | WorkflowProgressMessage
  | NodeListRequestMessage
  | NodeListResponseMessage
  | ErrorMessage
  | NotificationMessage
  | CustomMessage
  | RawMessage;

/**
 * WebSocket message type guards for type-safe handling
 */
export const isConnectionMessage = (msg: WebSocketMessage): msg is ConnectionOpenMessage | ConnectionCloseMessage | ConnectionErrorMessage => {
  return msg.type.startsWith('connection:');
};

export const isSystemMessage = (msg: WebSocketMessage): msg is SystemPingMessage | SystemPongMessage => {
  return msg.type.startsWith('system:');
};

export const isWorkflowMessage = (msg: WebSocketMessage): msg is 
  | WorkflowExecuteMessage 
  | WorkflowResultMessage 
  | WorkflowErrorMessage 
  | WorkflowValidateMessage 
  | WorkflowValidationResultMessage
  | WorkflowValidationErrorMessage
  | WorkflowStatusMessage
  | WorkflowProgressMessage => {
  return msg.type.startsWith('workflow:');
};

export const isNodeMessage = (msg: WebSocketMessage): msg is NodeListRequestMessage | NodeListResponseMessage => {
  return msg.type.startsWith('node:');
};

/**
 * WebSocket serialization/deserialization utilities
 */
export class WebSocketMessageSerializer {
  /**
   * Serialize a WebSocket message to JSON string
   */
  static serialize<T>(message: WebSocketMessage<T>): string {
    try {
      // Ensure timestamp is set
      const messageWithTimestamp: WebSocketMessage<T> = {
        timestamp: Date.now(),
        ...message
      };
      
      return JSON.stringify(messageWithTimestamp);
    } catch (error) {
      throw new Error(`Failed to serialize WebSocket message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize a JSON string to WebSocket message
   */
  static deserialize<T = any>(data: string): WebSocketMessage<T> {
    try {
      const parsed = JSON.parse(data);
      
      // Validate basic message structure
      if (!parsed.type || typeof parsed.type !== 'string') {
        throw new Error('Invalid message format: missing or invalid type field');
      }
      
      return parsed as WebSocketMessage<T>;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse WebSocket message: Invalid JSON');
      }
      throw error;
    }
  }

  /**
   * Create a typed message with automatic timestamp and ID generation
   */
  static createMessage<T>(type: string, payload?: T, options?: {
    requestId?: string;
    correlationId?: string;
  }): WebSocketMessage<T> {
    return {
      type,
      payload,
      timestamp: Date.now(),
      requestId: options?.requestId || crypto.randomUUID?.() || Math.random().toString(36),
      correlationId: options?.correlationId
    };
  }

  /**
   * Validate message structure
   */
  static isValidMessage(data: unknown): data is WebSocketMessage {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    const msg = data as any;
    return typeof msg.type === 'string' && msg.type.length > 0;
  }

  /**
   * Create error response message
   */
  static createErrorResponse(originalMessage: WebSocketMessage, error: string, code?: string): ErrorMessage {
    return this.createMessage('error', {
      code: code || 'UNKNOWN_ERROR',
      message: error,
      timestamp: Date.now(),
      details: {
        originalType: originalMessage.type,
        originalRequestId: originalMessage.requestId
      }
    }, {
      correlationId: originalMessage.requestId
    }) as ErrorMessage;
  }

  /**
   * Create success response message for workflow operations
   */
  static createWorkflowSuccessResponse(
    executionId: string, 
    result: ExecutionResult, 
    originalMessage?: WebSocketMessage
  ): WorkflowResultMessage {
    return this.createMessage('workflow:result', {
      executionId,
      success: true as const,
      result,
      timestamp: Date.now(),
      duration: result.endTime && result.startTime 
        ? result.endTime.getTime() - result.startTime.getTime() 
        : undefined
    }, {
      correlationId: originalMessage?.requestId
    }) as WorkflowResultMessage;
  }
}
