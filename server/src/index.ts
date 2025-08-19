import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse } from 'shared/dist'
import { securityHeaders, logger, errorHandler } from './middleware'
import { WorkflowService } from './services/WorkflowService'
import { WebSocketManager } from './services/WebSocketManager'
import workflows from './api/workflows'

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

const PORT = process.env.PORT || 3000;

console.log(`🚀 Server starting on http://localhost:${PORT}`);
console.log(`🔌 WebSocket functionality available - will be implemented using Bun's native WebSocket support`);

export default {
  port: PORT,
  fetch: app.fetch,
  // Bun WebSocket support would go here in the future
  websocket: {
    message(ws: any, message: any) {
      // WebSocket message handling would go here
      console.log('WebSocket message received:', message);
    },
    open(ws: any) {
      console.log('WebSocket connection opened');
    },
    close(ws: any) {
      console.log('WebSocket connection closed');
    },
  },
}