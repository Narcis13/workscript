import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse, WorkflowDefinition } from 'shared/dist'
import { securityHeaders, logger, errorHandler } from './middleware'
import { ExecutionEngine, StateManager, WorkflowParser, NodeRegistry } from 'shared'

const app = new Hono()

// Initialize engine components
const registry = new NodeRegistry()
const stateManager = new StateManager()
const executionEngine = new ExecutionEngine(registry, stateManager)
const parser = new WorkflowParser(registry)

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

    // Parse and validate workflow
    const parsedWorkflow = parser.parse(workflowDefinition)

    // Execute workflow
    const result = await executionEngine.execute(parsedWorkflow)

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
    const nodes = registry.listNodes()
    return c.json(nodes)
  } catch (error) {
    console.error('Error listing nodes:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

app.post('/workflows/validate', async (c) => {
  try {
    const workflowDefinition = await c.req.json()
    const validationResult = parser.validate(workflowDefinition)
    
    return c.json(validationResult)
  } catch (error) {
    console.error('Workflow validation error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      valid: false
    }, { status: 400 })
  }
})



export default app
