import { Hono } from 'hono'
import type { WorkflowDefinition } from '@workscript/engine'
import { WorkflowService } from '../services/WorkflowService'
import { WorkflowRepository } from '../repositories/workflowRepository'
import { writeFile, mkdir, readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { authenticate, optionalAuth, requirePermission } from '../../../shared-services/auth/middleware'
import { Permission, type AuthContext } from '../../../shared-services/auth/types'

const workflows = new Hono<{ Variables: AuthContext }>()

// Create workflow endpoint - saves workflow to database
workflows.post('/create', authenticate, requirePermission(Permission.WORKFLOW_CREATE), async (c) => {
  try {
    // Parse the request body as CreateWorkflowPayload
    const payload = await c.req.json() as {
      name: string
      description?: string
      version?: string
      definition: WorkflowDefinition
      isActive?: boolean
    }

    if (!payload.name) {
      return c.json({
        error: 'Workflow name is required',
        success: false
      }, { status: 400 })
    }

    if (!payload.definition) {
      return c.json({
        error: 'Workflow definition is required',
        success: false
      }, { status: 400 })
    }

    if (!payload.definition.id) {
      return c.json({
        error: 'Workflow definition must have an id field',
        success: false
      }, { status: 400 })
    }

    // Validate workflow before saving
    const workflowService = await WorkflowService.getInstance()
    const validationResult = workflowService.validateWorkflow(payload.definition)

    if (!validationResult.valid) {
      return c.json({
        error: 'Workflow validation failed',
        valid: false,
        validationErrors: validationResult.errors
      }, { status: 400 })
    }

    // Create workflow in database
    const workflowRepository = new WorkflowRepository()
    const createdWorkflow = await workflowRepository.create({
      id: payload.definition.id,
      name: payload.name,
      description: payload.description || null,
      definition: payload.definition,
      version: payload.version || '1.0.0',
      isActive: payload.isActive !== undefined ? payload.isActive : true
    })

    return c.json({
      message: 'Workflow created successfully',
      success: true,
      workflow: createdWorkflow
    }, { status: 201 })

  } catch (error) {
    console.error('Workflow creation error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Workflow validation endpoint
workflows.post('/validate', authenticate, requirePermission(Permission.WORKFLOW_READ), async (c) => {
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
workflows.post('/run', authenticate, requirePermission(Permission.WORKFLOW_EXECUTE), async (c) => {
  try {
    const body = await c.req.json()
    const { definition, workflowId, initialState } = body
    const workflowService = await WorkflowService.getInstance()

    // Execute workflow using definition or workflowId
    const workflowDefinition = definition || workflowId
    if (!workflowDefinition) {
      return c.json({
        error: 'Either "definition" or "workflowId" must be provided',
        status: 'failed'
      }, { status: 400 })
    }

    // Execute workflow using singleton service with optional initial state
    const result = await workflowService.executeWorkflow(workflowDefinition, initialState)

    return c.json(result, { status: 202 })
  } catch (error) {
    console.error('[API] Workflow execution error:', error)

    // If it's a WorkflowValidationError, log the validation errors in detail
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
      console.error('[API] Validation errors:', JSON.stringify((error as any).errors, null, 2))
    }

    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error && typeof error === 'object' && 'errors' in error ? (error as any).errors : undefined,
      status: 'failed'
    }, { status: 400 })
  }
})

// Workflow store endpoint
workflows.post('/store', authenticate, requirePermission(Permission.WORKFLOW_CREATE), async (c) => {
  try {
    const workflowDefinition = await c.req.json() as WorkflowDefinition
    const subfolder = c.req.query('subfolder')
    
    if (!workflowDefinition.id) {
      return c.json({
        error: 'Workflow definition must have an id field',
        success: false
      }, { status: 400 })
    }

    // Validate subfolder name if provided
    if (subfolder && !/^[a-zA-Z0-9_-]+$/.test(subfolder)) {
      return c.json({
        error: 'Subfolder name must contain only letters, numbers, underscores, and hyphens',
        success: false
      }, { status: 400 })
    }

    // Define the file path using workflow ID
    const fileName = `${workflowDefinition.id}.json`
    const workflowsDir = join(process.cwd(), 'apps', 'api', 'src', 'workflows')
    
    let filePath: string
    let relativePath: string
    
    if (subfolder) {
      const subfolderPath = join(workflowsDir, subfolder)
      
      // Create subfolder if it doesn't exist
      try {
        await mkdir(subfolderPath, { recursive: true })
      } catch (mkdirError) {
        console.error('Failed to create subfolder:', mkdirError)
        return c.json({
          error: `Failed to create subfolder: ${subfolder}`,
          success: false
        }, { status: 500 })
      }
      
      filePath = join(subfolderPath, fileName)
      relativePath = `workflows/${subfolder}/${fileName}`
    } else {
      filePath = join(workflowsDir, fileName)
      relativePath = `workflows/${fileName}`
    }
    
    // Write workflow definition to file
    await writeFile(filePath, JSON.stringify(workflowDefinition, null, 2))
    
    return c.json({
      message: `Workflow stored successfully as ${fileName}${subfolder ? ` in subfolder ${subfolder}` : ''}`,
      success: true,
      filePath: relativePath,
      subfolder: subfolder || null
    })
  } catch (error) {
    console.error('Workflow store error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Run workflow by ID endpoint
workflows.post('/run/:workflowId', authenticate, requirePermission(Permission.WORKFLOW_EXECUTE), async (c) => {
  try {
    const workflowId = c.req.param('workflowId')
    
    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        status: 'failed'
      }, { status: 400 })
    }

    // Find the workflow file
    const workflowData = await findWorkflowById(workflowId)
    
    if (!workflowData) {
      return c.json({
        error: `Workflow with ID '${workflowId}' not found in workflows directory`,
        status: 'failed',
        searchedIn: 'server/workflows (including subfolders)'
      }, { status: 404 })
    }

    const { definition, filePath, subfolder } = workflowData

    // Validate the workflow before execution
    const workflowService = await WorkflowService.getInstance()
    const validationResult = workflowService.validateWorkflow(definition)
    
    if (!validationResult.valid) {
      return c.json({
        error: 'Workflow validation failed',
        status: 'failed',
        validationErrors: validationResult.errors,
        workflowFile: filePath,
        subfolder
      }, { status: 400 })
    }

    // Execute the workflow
    const result = await workflowService.executeWorkflow(definition)

    return c.json({
      ...result,
      workflowId,
      workflowFile: filePath,
      subfolder,
      loadedFrom: `workflows/${filePath}`
    }, { status: 202 })
    
  } catch (error) {
    console.error('Workflow execution error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    }, { status: 500 })
  }
})

// Get all available nodes endpoint
workflows.get('/allnodes', authenticate, requirePermission(Permission.WORKFLOW_READ), async (c) => {
  try {
    const workflowService = await WorkflowService.getInstance()
    const availableNodes = workflowService.getAvailableNodes()

    return c.json({
      success: true,
      count: availableNodes.length,
      nodes: availableNodes
    })
  } catch (error) {
    console.error('Failed to retrieve available nodes:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      nodes: []
    }, { status: 500 })
  }
})

// Get all workflows from database endpoint
workflows.get('/allfromdb', authenticate, requirePermission(Permission.WORKFLOW_READ), async (c) => {
  try {
    const workflowRepository = new WorkflowRepository()
    const allWorkflows = await workflowRepository.findAll()

    return c.json({
      success: true,
      count: allWorkflows.length,
      workflows: allWorkflows
    })
  } catch (error) {
    console.error('Failed to retrieve workflows from database:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      workflows: []
    }, { status: 500 })
  }
})

// Get all workflows endpoint
workflows.get('/all', authenticate, requirePermission(Permission.WORKFLOW_READ), async (c) => {
  try {
    const workflowsDir = join(process.cwd(), 'apps', 'api', 'src', 'workflows')
    const allWorkflows = await getAllWorkflows(workflowsDir)
    
    return c.json({
      success: true,
      count: allWorkflows.length,
      workflows: allWorkflows
    })
  } catch (error) {
    console.error('Failed to retrieve workflows:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      workflows: []
    }, { status: 500 })
  }
})

// Helper function to find a specific workflow file by ID
async function findWorkflowById(workflowId: string): Promise<{
  definition: WorkflowDefinition,
  filePath: string,
  subfolder: string | null
} | null> {
  const workflowsDir = join(process.cwd(), 'apps', 'api', 'src', 'workflows')
  
  try {
    // Search for the workflow file recursively
    const result = await searchWorkflowRecursively(workflowsDir, workflowId)
    return result
  } catch (error) {
    console.warn(`Error searching for workflow ${workflowId}:`, error)
    return null
  }
}

// Recursive search function for workflow files
async function searchWorkflowRecursively(dir: string, workflowId: string, baseDir?: string): Promise<{
  definition: WorkflowDefinition,
  filePath: string,
  subfolder: string | null
} | null> {
  if (!baseDir) baseDir = dir

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const result = await searchWorkflowRecursively(fullPath, workflowId, baseDir)
        if (result) return result
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Check if filename matches (with or without .json extension)
        const fileBaseName = entry.name.replace('.json', '')
        
        if (fileBaseName === workflowId || entry.name === `${workflowId}.json`) {
          try {
            const fileContent = await readFile(fullPath, 'utf-8')
            const workflowDefinition: WorkflowDefinition = JSON.parse(fileContent)
            
            // Also check if the workflow's ID field matches
            if (workflowDefinition.id === workflowId || fileBaseName === workflowId) {
              // Determine subfolder relative to workflows directory
              const relativePath = fullPath.replace(baseDir, '').replace(/^\//, '')
              const pathParts = relativePath.split('/')
              const subfolder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null
              
              return {
                definition: workflowDefinition,
                filePath: relativePath,
                subfolder
              }
            }
          } catch (parseError) {
            console.warn(`Failed to parse workflow file ${fullPath}:`, parseError)
            // Continue searching other files
          }
        }
      }
    }
  } catch (readdirError) {
    console.warn(`Failed to read directory ${dir}:`, readdirError)
  }
  
  return null
}

// Helper function to recursively find all workflow JSON files
async function getAllWorkflows(dir: string): Promise<Array<{
  id: string,
  name: string,
  version: string,
  description: string,
  filePath: string,
  subfolder: string | null
}>> {
  const workflows: Array<{
    id: string,
    name: string,
    version: string,
    description: string,
    filePath: string,
    subfolder: string | null
  }> = []
  
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subfolderWorkflows = await getAllWorkflows(fullPath)
        workflows.push(...subfolderWorkflows)
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const fileContent = await readFile(fullPath, 'utf-8')
          const workflowDefinition: WorkflowDefinition = JSON.parse(fileContent)

          // Determine subfolder relative to workflows directory
          const workflowsDir = join(process.cwd(), 'apps', 'api', 'src', 'workflows')
          const relativePath = fullPath.replace(workflowsDir, '').replace(/^\//, '')
          const pathParts = relativePath.split('/')
          const subfolder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null
          
          workflows.push({
            id: workflowDefinition.id || entry.name.replace('.json', ''),
            name: workflowDefinition.name || 'Untitled Workflow',
            version: workflowDefinition.version || '1.0.0',
            description: workflowDefinition.description || 'No description available',
            filePath: relativePath,
            subfolder
          })
        } catch (parseError) {
          console.warn(`Failed to parse workflow file ${fullPath}:`, parseError)
          // Continue processing other files even if one fails
        }
      }
    }
  } catch (readdirError) {
    console.warn(`Failed to read directory ${dir}:`, readdirError)
  }
  
  return workflows
}

// Get workflow executions endpoint
workflows.get('/:workflowId/executions', optionalAuth, async (c) => {
  try {
    const workflowId = c.req.param('workflowId')
    const limit = c.req.query('limit') || '20'

    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        success: false
      }, { status: 400 })
    }

    // Import necessary modules for querying executions
    const { db } = await import('../../../db')
    const { workflowExecutions } = await import('../schema/workscript.schema')
    const { eq, desc } = await import('drizzle-orm')

    // Query executions for this workflow
    const executions = await db.select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(parseInt(limit, 10))

    return c.json({
      success: true,
      items: executions,
      count: executions.length
    })
  } catch (error) {
    console.error('Failed to retrieve workflow executions:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      items: []
    }, { status: 500 })
  }
})

// Get workflow automations endpoint
workflows.get('/:workflowId/automations', optionalAuth, async (c) => {
  try {
    const workflowId = c.req.param('workflowId')

    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        success: false
      }, { status: 400 })
    }

    // Import necessary modules for querying automations
    const { db } = await import('../../../db')
    const { automations } = await import('../../../db/schema/automations.schema')
    const { eq, and, desc } = await import('drizzle-orm')

    // Query automations for this workflow
    const workflowAutomations = await db.select()
      .from(automations)
      .where(and(
        eq(automations.workflowId, workflowId),
        eq(automations.pluginId, 'workscript')
      ))
      .orderBy(desc(automations.createdAt))

    return c.json({
      success: true,
      items: workflowAutomations,
      count: workflowAutomations.length
    })
  } catch (error) {
    console.error('Failed to retrieve workflow automations:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      items: []
    }, { status: 500 })
  }
})

// Get workflow by ID endpoint
workflows.get('/:workflowId', authenticate, requirePermission(Permission.WORKFLOW_READ), async (c) => {
  try {
    const workflowId = c.req.param('workflowId')

    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        success: false
      }, { status: 400 })
    }

    const workflowRepository = new WorkflowRepository()
    const workflow = await workflowRepository.findById(workflowId)

    if (!workflow) {
      return c.json({
        error: `Workflow with ID '${workflowId}' not found`,
        success: false
      }, { status: 404 })
    }

    return c.json({
      success: true,
      workflow
    })
  } catch (error) {
    console.error('Failed to retrieve workflow:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Update workflow by ID endpoint
workflows.put('/:workflowId', authenticate, requirePermission(Permission.WORKFLOW_UPDATE), async (c) => {
  try {
    const workflowId = c.req.param('workflowId')
    const payload = await c.req.json() as {
      name?: string
      description?: string
      version?: string
      definition?: WorkflowDefinition
      isActive?: boolean
    }

    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        success: false
      }, { status: 400 })
    }

    const workflowRepository = new WorkflowRepository()

    // Check if workflow exists
    const existingWorkflow = await workflowRepository.findById(workflowId)
    if (!existingWorkflow) {
      return c.json({
        error: `Workflow with ID '${workflowId}' not found`,
        success: false
      }, { status: 404 })
    }

    // Validate workflow definition if provided
    if (payload.definition) {
      const workflowService = await WorkflowService.getInstance()
      const validationResult = workflowService.validateWorkflow(payload.definition)

      if (!validationResult.valid) {
        return c.json({
          error: 'Workflow validation failed',
          valid: false,
          validationErrors: validationResult.errors
        }, { status: 400 })
      }
    }

    // Update workflow
    const updatedWorkflow = await workflowRepository.update(workflowId, {
      name: payload.name || existingWorkflow.name,
      description: payload.description !== undefined ? payload.description : existingWorkflow.description,
      definition: payload.definition || existingWorkflow.definition,
      version: payload.version || existingWorkflow.version,
      isActive: payload.isActive !== undefined ? payload.isActive : existingWorkflow.isActive
    })

    return c.json({
      message: 'Workflow updated successfully',
      success: true,
      workflow: updatedWorkflow
    })

  } catch (error) {
    console.error('Workflow update error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Delete workflow by ID endpoint
workflows.delete('/:workflowId', authenticate, requirePermission(Permission.WORKFLOW_DELETE), async (c) => {
  try {
    const workflowId = c.req.param('workflowId')

    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        success: false
      }, { status: 400 })
    }

    const workflowRepository = new WorkflowRepository()

    // Check if workflow exists
    const existingWorkflow = await workflowRepository.findById(workflowId)
    if (!existingWorkflow) {
      return c.json({
        error: `Workflow with ID '${workflowId}' not found`,
        success: false
      }, { status: 404 })
    }

    // Delete workflow
    await workflowRepository.delete(workflowId)

    return c.json({
      message: 'Workflow deleted successfully',
      success: true,
      workflowId
    })

  } catch (error) {
    console.error('Workflow deletion error:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

export default workflows