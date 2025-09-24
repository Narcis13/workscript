import { Hono } from 'hono'
import { AutomationRepository } from '../../db/repositories/automationRepository'
import { WorkflowRepository } from '../../db/repositories/workflowRepository'
import type { NewAutomation } from '../../db/schema'
import { createId } from '@paralleldrive/cuid2'

const automationRepository = new AutomationRepository()
const workflowRepository = new WorkflowRepository()
const automationsApp = new Hono()

// GET /automations - List all automations (with optional filtering)
automationsApp.get('/', async (c) => {
  try {
    const { agencyId, enabled, triggerType } = c.req.query()
    
    let automations
    if (agencyId) {
      if (enabled === 'true') {
        automations = await automationRepository.findEnabledByAgencyId(Number(agencyId))
      } else {
        automations = await automationRepository.findByAgencyId(Number(agencyId))
      }
    } else if (enabled === 'true') {
      automations = await automationRepository.findEnabled()
    } else if (triggerType) {
      automations = await automationRepository.findByTriggerType(triggerType as 'immediate' | 'cron' | 'webhook')
    } else {
      automations = await automationRepository.findAll()
    }
    
    return c.json(automations)
  } catch (error) {
    console.error('Error fetching automations:', error)
    return c.json({ error: 'Failed to fetch automations' }, 500)
  }
})

// GET /automations/:id - Get single automation
automationsApp.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const automation = await automationRepository.findById(id)
    
    if (!automation) {
      return c.json({ error: 'Automation not found' }, 404)
    }
    
    return c.json(automation)
  } catch (error) {
    console.error('Error fetching automation:', error)
    return c.json({ error: 'Failed to fetch automation' }, 500)
  }
})

// POST /automations - Create new automation
automationsApp.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    const newAutomation: NewAutomation = {
      id: createId(),
      agencyId: body.agencyId,
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig,
      workflowId: body.workflowId,
      enabled: body.enabled ?? true,
      nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const automation = await automationRepository.create(newAutomation)
    return c.json(automation, 201)
  } catch (error) {
    console.error('Error creating automation:', error)
    return c.json({ error: 'Failed to create automation' }, 500)
  }
})

// PUT /automations/:id - Update automation
automationsApp.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    const updates: Partial<NewAutomation> = {
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig,
      workflowId: body.workflowId,
      enabled: body.enabled,
      nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : undefined,
      updatedAt: new Date()
    }
    
    const automation = await automationRepository.update(id, updates)
    
    if (!automation) {
      return c.json({ error: 'Automation not found' }, 404)
    }
    
    return c.json(automation)
  } catch (error) {
    console.error('Error updating automation:', error)
    return c.json({ error: 'Failed to update automation' }, 500)
  }
})

// DELETE /automations/:id - Delete automation
automationsApp.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const deleted = await automationRepository.delete(id)
    
    if (!deleted) {
      return c.json({ error: 'Automation not found' }, 404)
    }
    
    return c.json({ message: 'Automation deleted successfully' })
  } catch (error) {
    console.error('Error deleting automation:', error)
    return c.json({ error: 'Failed to delete automation' }, 500)
  }
})

// GET /automations/:id/executions - Get automation execution history
automationsApp.get('/:id/executions', async (c) => {
  try {
    const id = c.req.param('id')
    const executions = await automationRepository.findExecutionsByAutomationId(id)
    
    return c.json(executions)
  } catch (error) {
    console.error('Error fetching automation executions:', error)
    return c.json({ error: 'Failed to fetch automation executions' }, 500)
  }
})

// PUT /automations/:id/toggle - Toggle automation enabled status
automationsApp.put('/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    const automation = await automationRepository.toggleEnabled(id, body.enabled)
    
    if (!automation) {
      return c.json({ error: 'Automation not found' }, 404)
    }
    
    return c.json(automation)
  } catch (error) {
    console.error('Error toggling automation:', error)
    return c.json({ error: 'Failed to toggle automation' }, 500)
  }
})

// POST /automations/:id/execute - Execute automation immediately
automationsApp.post('/:id/execute', async (c) => {
  try {
    const id = c.req.param('id')
    const automation = await automationRepository.findById(id)
    
    if (!automation) {
      return c.json({ error: 'Automation not found' }, 404)
    }
    
    if (!automation.enabled) {
      return c.json({ error: 'Automation is disabled' }, 400)
    }
    
    // Create execution record
    const executionId = createId()
    await automationRepository.createExecution({
      id: executionId,
      automationId: id,
      status: 'running',
      startedAt: new Date(),
      triggerSource: 'manual'
    })
    
    // Execute workflow via /workflows/run API
    setTimeout(async () => {
      try {
        // Get the workflow definition
        const workflow = await workflowRepository.findById(automation.workflowId)
        if (!workflow) {
          throw new Error('Workflow not found')
        }

        console.log('Raw workflow from database:', JSON.stringify(workflow, null, 2))
        console.log('Workflow definition type:', typeof workflow.definition)
        console.log('Workflow definition:', JSON.stringify(workflow.definition, null, 2))

        // Ensure workflow.definition is an object and add execution context
        let workflowDefinition
        if (typeof workflow.definition === 'object' && workflow.definition !== null) {
          workflowDefinition = {
            ...(workflow.definition as any),
            executionContext: {
              automationId: id,
              executionId: executionId,
              triggeredBy: 'manual'
            }
          }
        } else {
          workflowDefinition = workflow.definition
        }

        console.log('Final workflow definition for execution:', JSON.stringify(workflowDefinition, null, 2))

        // Make POST request to /workflows/run
        const workflowRunResponse = await fetch('http://localhost:3013/workflows/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowDefinition)
        })

        if (!workflowRunResponse.ok) {
          const errorData = await workflowRunResponse.json().catch(() => ({})) as { error?: string }
          throw new Error(errorData.error || `Workflow execution failed: ${workflowRunResponse.status}`)
        }

        const workflowResult = await workflowRunResponse.json()
        
        // Mark as completed with workflow result
        await automationRepository.completeExecution(
          executionId, 
          'completed', 
          workflowResult
        )
        
        // Update automation run stats
        await automationRepository.updateRunStats(id, true)
      } catch (error) {
        console.error('Workflow execution error:', error)
        
        // Mark as failed
        await automationRepository.completeExecution(
          executionId, 
          'failed', 
          null,
          error instanceof Error ? error.message : 'Unknown error'
        )
        
        // Update automation run stats
        await automationRepository.updateRunStats(id, false, error instanceof Error ? error.message : 'Unknown error')
      }
    }, 100)
    
    return c.json({ 
      message: 'Automation execution started',
      executionId,
      automation
    })
  } catch (error) {
    console.error('Error executing automation:', error)
    return c.json({ error: 'Failed to execute automation' }, 500)
  }
})

export default automationsApp
