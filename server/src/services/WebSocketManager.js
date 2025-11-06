import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { WorkflowService } from './WorkflowService';
import { WebSocketMessageSerializer, isWorkflowMessage } from 'shared';
export class WebSocketManager {
    static instance = null;
    wss = null;
    clients = new Map();
    messageHandlers = new Map();
    workflowService = null;
    constructor() { }
    static getInstance() {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }
    async initialize(server) {
        // Initialize WorkflowService
        this.workflowService = await WorkflowService.getInstance();
        this.wss = new WebSocketServer({
            server,
            path: '/ws'
        });
        this.wss.on('connection', (ws, request) => {
            const clientId = this.generateClientId();
            const client = {
                id: clientId,
                socket: ws,
                subscriptions: new Set(),
                metadata: {
                    connectedAt: Date.now(),
                    userAgent: request.headers['user-agent'],
                    ip: request.socket.remoteAddress
                }
            };
            this.clients.set(clientId, client);
            console.log(`WebSocket client connected: ${clientId}`);
            // Send welcome message
            this.sendMessage(client, {
                type: 'connection.welcome',
                payload: { clientId },
                timestamp: Date.now()
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(client, message);
                }
                catch (error) {
                    console.error(`Error parsing message from client ${clientId}:`, error);
                    this.sendError(client, 'Invalid message format');
                }
            });
            ws.on('close', () => {
                console.log(`WebSocket client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
                this.clients.delete(clientId);
            });
        });
        this.setupDefaultHandlers();
        this.setupWorkflowHandlers();
    }
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    setupDefaultHandlers() {
        // Ping/Pong handler
        this.registerHandler('ping', (client) => {
            this.sendMessage(client, {
                type: 'pong',
                timestamp: Date.now()
            });
        });
        // Subscription handler
        this.registerHandler('subscribe', (client, message) => {
            const { channel } = message.payload || {};
            if (typeof channel === 'string') {
                client.subscriptions.add(channel);
                this.sendMessage(client, {
                    type: 'subscribed',
                    payload: { channel },
                    timestamp: Date.now()
                });
            }
        });
        // Unsubscription handler
        this.registerHandler('unsubscribe', (client, message) => {
            const { channel } = message.payload || {};
            if (typeof channel === 'string') {
                client.subscriptions.delete(channel);
                this.sendMessage(client, {
                    type: 'unsubscribed',
                    payload: { channel },
                    timestamp: Date.now()
                });
            }
        });
    }
    setupWorkflowHandlers() {
        // Workflow execution handler
        this.registerHandler('workflow:execute', async (client, message) => {
            await this.handleWorkflowExecution(client, message);
        });
        // Workflow validation handler
        this.registerHandler('workflow:validate', async (client, message) => {
            await this.handleWorkflowValidation(client, message);
        });
        // System ping handler (enhanced)
        this.registerHandler('system:ping', (client, message) => {
            this.sendMessage(client, {
                type: 'system:pong',
                payload: {
                    timestamp: Date.now(),
                    serverId: process.env.SERVER_ID || 'workflow-server'
                },
                timestamp: Date.now()
            });
        });
    }
    async handleWorkflowExecution(client, message) {
        if (!this.workflowService) {
            this.sendMessage(client, WebSocketMessageSerializer.createErrorResponse(message, 'Workflow service not available', 'SERVICE_UNAVAILABLE'));
            return;
        }
        const { workflowDefinition, executionId, initialState, options } = message.payload;
        console.log(`🚀 Executing workflow via WebSocket: ${executionId} for client ${client.id}`);
        try {
            // Validate workflow first if not skipped
            if (!options?.skipValidation) {
                const validation = this.workflowService.validateWorkflow(workflowDefinition);
                if (!validation.valid) {
                    this.sendMessage(client, WebSocketMessageSerializer.createMessage('workflow:error', {
                        executionId,
                        success: false,
                        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
                        timestamp: Date.now(),
                        details: { validationErrors: validation.errors }
                    }));
                    return;
                }
            }
            // Execute workflow
            const startTime = Date.now();
            const result = await this.workflowService.executeWorkflow(workflowDefinition);
            const duration = Date.now() - startTime;
            // Send success response
            const successMessage = WebSocketMessageSerializer.createWorkflowSuccessResponse(executionId, result, message);
            successMessage.payload.duration = duration;
            this.sendMessage(client, successMessage);
            console.log(`✅ Workflow ${executionId} completed successfully for client ${client.id} in ${duration}ms`);
        }
        catch (error) {
            console.error(`❌ Workflow execution failed for client ${client.id}:`, error);
            this.sendMessage(client, WebSocketMessageSerializer.createMessage('workflow:error', {
                executionId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown execution error',
                timestamp: Date.now(),
                details: {
                    stackTrace: error instanceof Error ? error.stack : undefined
                }
            }));
        }
    }
    async handleWorkflowValidation(client, message) {
        if (!this.workflowService) {
            this.sendMessage(client, WebSocketMessageSerializer.createErrorResponse(message, 'Workflow service not available', 'SERVICE_UNAVAILABLE'));
            return;
        }
        const { workflowDefinition, validationId, options } = message.payload;
        console.log(`🔍 Validating workflow via WebSocket: ${validationId} for client ${client.id}`);
        try {
            const result = this.workflowService.validateWorkflow(workflowDefinition);
            this.sendMessage(client, WebSocketMessageSerializer.createMessage('workflow:validation-result', {
                validationId,
                result,
                timestamp: Date.now()
            }));
            console.log(`✅ Workflow validation ${validationId} completed for client ${client.id}`);
        }
        catch (error) {
            console.error(`❌ Workflow validation failed for client ${client.id}:`, error);
            this.sendMessage(client, WebSocketMessageSerializer.createMessage('workflow:validation-error', {
                validationId,
                error: error instanceof Error ? error.message : 'Unknown validation error',
                timestamp: Date.now()
            }));
        }
    }
    registerHandler(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }
    handleMessage(client, message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            try {
                handler(client, message);
            }
            catch (error) {
                console.error(`Error handling message type ${message.type}:`, error);
                this.sendError(client, `Error processing ${message.type} message`);
            }
        }
        else {
            console.warn(`No handler found for message type: ${message.type}`);
            this.sendError(client, `Unknown message type: ${message.type}`);
        }
    }
    sendMessage(client, message) {
        if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(JSON.stringify(message));
        }
    }
    sendError(client, error) {
        this.sendMessage(client, {
            type: 'error',
            payload: { error },
            timestamp: Date.now()
        });
    }
    // Broadcasting methods
    broadcast(message, excludeClientId) {
        this.clients.forEach((client) => {
            if (excludeClientId && client.id === excludeClientId)
                return;
            this.sendMessage(client, message);
        });
    }
    broadcastToChannel(channel, message, excludeClientId) {
        this.clients.forEach((client) => {
            if (excludeClientId && client.id === excludeClientId)
                return;
            if (client.subscriptions.has(channel)) {
                this.sendMessage(client, message);
            }
        });
    }
    broadcastToClients(clientIds, message) {
        clientIds.forEach((clientId) => {
            const client = this.clients.get(clientId);
            if (client) {
                this.sendMessage(client, message);
            }
        });
    }
    // Client management
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    getConnectedClients() {
        return Array.from(this.clients.values());
    }
    getClientsInChannel(channel) {
        return Array.from(this.clients.values()).filter(client => client.subscriptions.has(channel));
    }
    disconnectClient(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.socket.close();
            this.clients.delete(clientId);
        }
    }
    // Server management
    close() {
        if (this.wss) {
            this.wss.close();
            this.clients.clear();
        }
    }
    getStats() {
        return {
            connectedClients: this.clients.size,
            totalSubscriptions: Array.from(this.clients.values())
                .reduce((total, client) => total + client.subscriptions.size, 0),
            channels: Array.from(new Set(Array.from(this.clients.values())
                .flatMap(client => Array.from(client.subscriptions)))),
            messageHandlers: Array.from(this.messageHandlers.keys())
        };
    }
}
