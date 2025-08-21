# WebSocket Implementation Technical Summary

## Overview

The monorepo implements a comprehensive WebSocket communication layer that enables real-time workflow execution and communication between the client and server environments. The implementation follows a distributed architecture pattern with dedicated components for different aspects of WebSocket functionality.

## Architecture Components

### 1. Server-Side WebSocket Infrastructure

#### WebSocketManager (`/server/src/services/WebSocketManager.ts`)
- **Pattern**: Singleton service managing all WebSocket connections
- **Technology**: Uses Node.js `ws` WebSocket library
- **Key Features**:
  - Client connection management with unique IDs and metadata
  - Subscription-based channel system for targeted messaging
  - Built-in message routing and handler registration
  - Automatic reconnection handling
  - Statistics and monitoring capabilities

**Core Functionality**:
```typescript
export class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private messageHandlers: Map<string, (client: WebSocketClient, message: WebSocketMessage) => void> = new Map();
  
  // Connection lifecycle management
  async initialize(server: Server): Promise<void>
  
  // Message handling system
  registerHandler(messageType: string, handler: Function): void
  private handleMessage(client: WebSocketClient, message: WebSocketMessage): void
  
  // Broadcasting capabilities
  broadcast(message: WebSocketMessage, excludeClientId?: string): void
  broadcastToChannel(channel: string, message: WebSocketMessage): void
}
```

#### Hono Integration (`/server/src/index.ts`)
- **WebSocket Upgrade**: Handles HTTP-to-WebSocket upgrades at `/ws` endpoint
- **Bun WebSocket Support**: Uses Bun's native WebSocket capabilities for better performance
- **Message Processing**: JSON message parsing with error handling
- **Connection Lifecycle**: Open/close event management with client tracking

### 2. Shared Event System

#### WebSocketEventSystem (`/shared/src/events/WebSocketEventSystem.ts`)
- **Purpose**: Standardized event emission system for workflow lifecycle events
- **Architecture**: Extends EventEmitter with WebSocket-specific functionality
- **Event Categories**:
  - **Workflow Lifecycle**: `workflow:started`, `workflow:completed`, `workflow:failed`
  - **Node Execution**: `node:started`, `node:completed`, `node:failed`
  - **Progress Tracking**: Real-time progress updates with percentage calculations
  - **Error Handling**: Categorized error notifications with severity levels
  - **System Notifications**: Info, warning, and success messages

**Event Structure**:
```typescript
export interface WorkflowLifecycleEvent {
  type: 'workflow:started' | 'workflow:completed' | 'workflow:failed';
  workflowId: string;
  executionId: string;
  timestamp: number;
  data?: {
    workflowDefinition?: WorkflowDefinition;
    result?: ExecutionResult;
    error?: string;
  };
}
```

#### Event Buffering System
- **Offline Support**: Events are buffered when WebSocket connection is unavailable
- **Automatic Flush**: Buffered events are sent when connection is restored
- **Size Management**: Configurable buffer size with automatic cleanup

### 3. Client-Side WebSocket Integration

#### useWebSocket Hook (`/client/src/hooks/useWebSocket.ts`)
- **React Integration**: Custom hook for WebSocket management in React components
- **Features**:
  - Automatic reconnection with exponential backoff
  - Connection state management
  - Message serialization/deserialization
  - Error handling and recovery

**Hook Interface**:
```typescript
export interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}
```

#### ClientWorkflowService Integration (`/client/src/services/ClientWorkflowService.ts`)
- **Workflow WebSocket Integration**: Direct WebSocket support within the workflow service
- **Auto-execution**: Configurable automatic workflow execution from WebSocket triggers
- **Event Handling**: Custom message type handlers with registration system
- **Connection Management**: Built-in WebSocket connection with manual management

### 4. Message Protocol & Serialization

#### Standardized Message Format
```typescript
export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}
```

#### Workflow-Specific Messages
- **WorkflowExecuteMessage**: Trigger workflow execution on server
- **WorkflowValidateMessage**: Request workflow validation
- **WorkflowResultMessage**: Execution results with metadata
- **WorkflowErrorMessage**: Error information with context

#### Message Serialization (`shared`)
- **WebSocketMessageSerializer**: Centralized message creation and validation
- **Type Guards**: Runtime type checking with `isWorkflowMessage()`
- **Error Responses**: Standardized error message format

## Usage Examples

### 1. Server-Side Workflow Execution

```typescript
// Setup WebSocket manager with workflow handlers
const wsManager = WebSocketManager.getInstance();
await wsManager.initialize(server);

// Register custom workflow execution handler
wsManager.registerHandler('workflow:execute', async (client, message) => {
  const { workflowDefinition, executionId } = message.payload;
  
  try {
    const result = await workflowService.executeWorkflow(workflowDefinition);
    wsManager.sendMessage(client, {
      type: 'workflow:result',
      payload: { executionId, result },
      timestamp: Date.now()
    });
  } catch (error) {
    wsManager.sendMessage(client, {
      type: 'workflow:error',
      payload: { executionId, error: error.message },
      timestamp: Date.now()
    });
  }
});
```

### 2. Client-Side Real-Time Communication

```typescript
// Initialize WebSocket connection in React component
const {
  isConnected,
  sendMessage,
  lastMessage
} = useWebSocket({
  url: 'ws://localhost:3013/ws',
  onMessage: (message) => {
    if (message.type === 'workflow:result') {
      handleWorkflowCompletion(message.payload);
    }
  }
});

// Execute workflow via WebSocket
const executeRemoteWorkflow = () => {
  const message = {
    type: 'workflow:execute',
    payload: {
      workflowDefinition: myWorkflow,
      executionId: `exec-${Date.now()}`,
      options: { debug: true }
    },
    timestamp: Date.now()
  };
  
  sendMessage(message);
};
```

### 3. Event-Driven Workflow Monitoring

```typescript
// Setup event system for workflow monitoring
const eventSystem = new WebSocketEventSystem();

// Listen for workflow lifecycle events
eventSystem.onWorkflowLifecycle(async (event) => {
  switch (event.type) {
    case 'workflow:started':
      console.log(`Workflow ${event.workflowId} started`);
      updateUI({ status: 'running', workflowId: event.workflowId });
      break;
      
    case 'workflow:completed':
      console.log(`Workflow ${event.workflowId} completed`);
      updateUI({ 
        status: 'completed', 
        result: event.data?.result,
        workflowId: event.workflowId 
      });
      break;
  }
});

// Emit progress events during execution
eventSystem.emitWorkflowProgress(
  'workflow-123',
  'exec-456',
  totalNodes: 5,
  completedNodes: 3,
  currentNode: 'data-transform',
  estimatedTimeRemaining: 2000
);
```

### 4. Multi-Environment Workflow Execution

```typescript
// Client-side workflow service with WebSocket integration
const workflowService = await ClientWorkflowService.getInstance();

// Enable WebSocket for remote execution capability
workflowService.enableWebSocket({
  url: 'ws://localhost:3013/ws',
  autoExecute: true,  // Automatically handle incoming execution requests
  reconnect: true,
  maxReconnectAttempts: 5
});

// Execute locally or remotely based on configuration
const result = await workflowService.executeWorkflow(workflowDefinition);

// Send results via WebSocket if connected
if (workflowService.getWebSocketStatus().connected) {
  workflowService.sendWebSocketMessage({
    type: 'workflow:result',
    payload: { result, executionId: 'local-123' },
    timestamp: Date.now()
  });
}
```

## Key Design Patterns

### 1. **Singleton Pattern**
- `WebSocketManager` uses singleton to ensure single point of connection management
- `ClientWorkflowService` maintains singleton pattern for consistency

### 2. **Observer Pattern**
- Event system with subscription-based message handling
- Channel-based broadcasting for targeted communication

### 3. **Strategy Pattern**
- Pluggable message handlers for different message types
- Environment-specific implementations (server vs client)

### 4. **Facade Pattern**
- Simplified interfaces hiding WebSocket complexity
- Unified API across client and server environments

## Performance Considerations

### Connection Management
- **Connection Pooling**: Efficient client connection tracking
- **Memory Management**: Automatic cleanup of disconnected clients
- **Resource Limits**: Configurable buffer sizes and connection limits

### Message Processing
- **JSON Serialization**: Optimized message parsing with error handling
- **Event Buffering**: Prevents message loss during connection issues
- **Batch Processing**: Efficient handling of multiple simultaneous messages

### Scalability Features
- **Channel-based Broadcasting**: Targeted message delivery
- **Client Metadata**: Efficient client categorization and routing
- **Statistics Tracking**: Real-time monitoring of connections and throughput

## Security Considerations

### Connection Security
- **Origin Validation**: Request origin checking for WebSocket upgrades
- **Client Metadata**: IP address and user agent tracking
- **Connection Limits**: Prevention of resource exhaustion attacks

### Message Validation
- **Schema Validation**: JSON schema validation for workflow messages
- **Type Guards**: Runtime type checking for message safety
- **Error Boundaries**: Graceful handling of malformed messages

## Integration Points

### 1. **Workflow Engine Integration**
- Direct integration with `ExecutionEngine` for real-time execution
- State management synchronization across WebSocket connections
- Progress tracking throughout workflow execution lifecycle

### 2. **Node Registry Integration**
- Real-time node availability updates
- Dynamic node discovery announcements
- Environment-specific node capability broadcasting

### 3. **Hook System Integration**
- WebSocket events trigger workflow hooks
- Hook execution results broadcast to connected clients
- Real-time hook registration and management

This WebSocket implementation provides a robust, scalable foundation for real-time workflow communication across the entire monorepo, enabling seamless interaction between client and server environments while maintaining type safety and error resilience.