import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse } from 'shared/dist'
import { securityHeaders, logger, errorHandler } from './middleware'
import { WorkflowService } from './services/WorkflowService'
import { WebSocketManager } from './services/WebSocketManager'
import { initializeTokenStorage } from './lib/token-storage';
import workflows from './api/workflows'
import googleAuthRoutes from './api/google'

initializeTokenStorage();    
const app = new Hono()
const wsManager = WebSocketManager.getInstance()

// Initialize workflow service singleton (lazy initialization on first API call)

// Global middleware
app.use('*', logger)
app.use('*', securityHeaders)
app.use('*', cors())

// Error handling
app.onError(errorHandler)

// API routes
app.route('/workflows', workflows)
app.route('/auth', googleAuthRoutes)
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/hello', async (c) => {
  const data: ApiResponse = {
    message: "Hello BHVR!",
    success: true
  }

  return c.json(data, { status: 200 })
})


app.get('/nodes', async (c) => {
  try {
    const workflowService = await WorkflowService.getInstance()
    const nodes = workflowService.getAvailableNodes()
    
    return c.json({
      nodes,
      serviceInfo: workflowService.getServiceInfo()
    })
  } catch (error) {
    console.error('Error listing nodes:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

app.get('/nodes/:source', async (c) => {
  try {
    const source = c.req.param('source') as 'universal' | 'server'
    if (source !== 'universal' && source !== 'server') {
      return c.json({ error: 'Invalid source. Must be "universal" or "server"' }, { status: 400 })
    }
    
    const workflowService = await WorkflowService.getInstance()
    const nodes = workflowService.getNodesBySource(source)
    
    return c.json({ nodes, source })
  } catch (error) {
    console.error('Error listing nodes by source:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})


app.get('/service/info', async (c) => {
  try {
    const workflowService = await WorkflowService.getInstance()
    return c.json(workflowService.getServiceInfo())
  } catch (error) {
    console.error('Error getting service info:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

// WebSocket endpoints
app.get('/ws/stats', async (c) => {
  try {
    const stats = wsManager.getStats()
    return c.json(stats)
  } catch (error) {
    console.error('Error getting WebSocket stats:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

app.get('/ws/clients', async (c) => {
  try {
    const clients = wsManager.getConnectedClients().map(client => ({
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      metadata: client.metadata
    }))
    return c.json({ clients })
  } catch (error) {
    console.error('Error getting WebSocket clients:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

// Simple Hono server with basic WebSocket note for now
// WebSocket functionality can be added later using Bun's native WebSocket support

const PORT = process.env.PORT || 3013;

console.log(`🚀 Server starting on http://localhost:${PORT}`);
console.log(`🔌 WebSocket server available at ws://localhost:${PORT}/ws`);

export default {
  port: PORT,
  fetch(request: Request, server: any) {
    // Handle WebSocket upgrade requests specifically for /ws path
    const url = new URL(request.url);
    if (request.headers.get('upgrade') === 'websocket' && url.pathname === '/ws') {
      const success = server.upgrade(request, {
        data: {
          clientId: Math.random().toString(36).substring(7),
          path: url.pathname,
        },
      });
      
      if (!success) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return; // Connection is handled by websocket handlers below
    }
    
    // Handle regular HTTP requests
    return app.fetch(request);
  },
  websocket: {
    async message(ws: any, message: any) {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('WebSocket message received:', parsedMessage);
        
        // Handle workflow execution messages
        if (parsedMessage.type === 'workflow:execute') {
          try {
            const { workflowDefinition, executionId, options } = parsedMessage.payload;
            console.log(`🚀 Executing workflow via WebSocket: ${executionId}`);
            
            // Get workflow service and execute
            const workflowService = await WorkflowService.getInstance();
            const startTime = Date.now();
            const result = await workflowService.executeWorkflow(workflowDefinition);
            const duration = Date.now() - startTime;
            
            // Send success response
            ws.send(JSON.stringify({
              type: 'workflow:result',
              payload: {
                executionId,
                success: true,
                result,
                duration,
                timestamp: Date.now()
              },
              timestamp: Date.now()
            }));
            
            console.log(`✅ Workflow ${executionId} completed successfully in ${duration}ms`);
            
          } catch (executionError) {
            console.error(`❌ Workflow execution failed:`, executionError);
            
            ws.send(JSON.stringify({
              type: 'workflow:error',
              payload: {
                executionId: parsedMessage.payload?.executionId,
                success: false,
                error: executionError instanceof Error ? executionError.message : 'Unknown execution error',
                timestamp: Date.now()
              },
              timestamp: Date.now()
            }));
          }
        }
        // Handle workflow validation messages
        else if (parsedMessage.type === 'workflow:validate') {
          try {
            const { workflowDefinition, validationId } = parsedMessage.payload;
            console.log(`🔍 Validating workflow via WebSocket: ${validationId}`);
            
            const workflowService = await WorkflowService.getInstance();
            const validation = workflowService.validateWorkflow(workflowDefinition);
            
            ws.send(JSON.stringify({
              type: 'workflow:validation-result',
              payload: {
                validationId,
                result: validation,
                timestamp: Date.now()
              },
              timestamp: Date.now()
            }));
            
            console.log(`✅ Workflow validation ${validationId} completed`);
            
          } catch (validationError) {
            console.error(`❌ Workflow validation failed:`, validationError);
            
            ws.send(JSON.stringify({
              type: 'workflow:validation-error',
              payload: {
                validationId: parsedMessage.payload?.validationId,
                error: validationError instanceof Error ? validationError.message : 'Unknown validation error',
                timestamp: Date.now()
              },
              timestamp: Date.now()
            }));
          }
        }
        // Handle ping messages
        else if (parsedMessage.type === 'ping' || parsedMessage.type === 'system:ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            payload: { 
              timestamp: Date.now(),
              serverId: process.env.SERVER_ID || 'workflow-server'
            },
            timestamp: Date.now()
          }));
        }
        // Echo other messages for debugging
        else {
          ws.send(JSON.stringify({
            type: 'echo',
            payload: parsedMessage,
            timestamp: Date.now()
          }));
        }
        
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
          timestamp: Date.now()
        }));
      }
    },
    open(ws: any) {
      console.log('WebSocket connection opened for client:', ws.data?.clientId);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection:open',
        payload: { 
          clientId: ws.data?.clientId,
          message: 'Connected to workflow service'
        },
        timestamp: Date.now()
      }));
    },
    close(ws: any, code: number, reason: string) {
      console.log('WebSocket connection closed for client:', ws.data?.clientId, 'Code:', code, 'Reason:', reason);
    },
  },
}