import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse, WorkflowDefinition } from 'shared/dist'
import { securityHeaders, logger, errorHandler } from './middleware'
import { WorkflowService } from './services/WorkflowService'

const app = new Hono()

// Initialize workflow service singleton (lazy initialization on first API call)

// Global middleware
app.use('*', logger)
app.use('*', securityHeaders)
app.use('*', cors())

// Error handling
app.onError(errorHandler)

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

// Workflow execution endpoints
app.post('/workflows', async (c) => {
  try {
    const workflowDefinition = await c.req.json() as WorkflowDefinition
    const workflowService = await WorkflowService.getInstance()

    // Execute workflow using singleton service
    const result = await workflowService.executeWorkflow(workflowDefinition)

    return c.json(result, { status: 202 })
  } catch (error) {
    console.error('Workflow execution error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    }, { status: 400 })
  }
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

app.post('/workflows/validate', async (c) => {
  try {
    const workflowDefinition = await c.req.json()
    const workflowService = await WorkflowService.getInstance()
    const validationResult = workflowService.validateWorkflow(workflowDefinition)
    
    return c.json(validationResult)
  } catch (error) {
    console.error('Workflow validation error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      valid: false
    }, { status: 400 })
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

export default app