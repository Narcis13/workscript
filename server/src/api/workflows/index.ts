import { Hono } from 'hono'
import type { WorkflowDefinition } from 'shared/dist'
import { WorkflowService } from '../../services/WorkflowService'

const workflows = new Hono()

// Workflow validation endpoint
workflows.post('/validate', async (c) => {
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

// Workflow execution endpoint
workflows.post('/run', async (c) => {
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

export default workflows