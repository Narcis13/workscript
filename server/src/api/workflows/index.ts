import { Hono } from 'hono'
import type { WorkflowDefinition } from 'shared/dist'
import { WorkflowService } from '../../services/WorkflowService'
import { WorkflowRepository } from '../../db/repositories/workflowRepository'
import { writeFile, mkdir, readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'

const workflows = new Hono()

// Create workflow endpoint - saves workflow to database
workflows.post('/create', async (c) => {
  try {
    const workflowDefinition = await c.req.json() as WorkflowDefinition
    
    if (!workflowDefinition.id) {
      return c.json({
        error: 'Workflow definition must have an id field',
        success: false
      }, { status: 400 })
    }

    if (!workflowDefinition.name) {
      return c.json({
        error: 'Workflow definition must have a name field',
        success: false
      }, { status: 400 })
    }

    // Validate workflow before saving
    const workflowService = await WorkflowService.getInstance()
    const validationResult = workflowService.validateWorkflow(workflowDefinition)
    
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
      id: workflowDefinition.id,
      name: workflowDefinition.name,
      description: workflowDefinition.description || null,
      definition: workflowDefinition,
      version: workflowDefinition.version || '1.0.0'
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

// Workflow store endpoint
workflows.post('/store', async (c) => {
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
    const workflowsDir = join(process.cwd(), 'workflows')
    
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
workflows.post('/run/:workflowId', async (c) => {
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

// Get all workflows from database endpoint
workflows.get('/allfromdb', async (c) => {
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
workflows.get('/all', async (c) => {
  try {
    const workflowsDir = join(process.cwd(), 'workflows')
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
  const workflowsDir = join(process.cwd(), 'workflows')
  
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
          const workflowsDir = join(process.cwd(), 'workflows')
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

// Get workflow by ID endpoint
workflows.get('/:workflowId', async (c) => {
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
workflows.put('/:workflowId', async (c) => {
  try {
    const workflowId = c.req.param('workflowId')
    const workflowData = await c.req.json()

    if (!workflowId) {
      return c.json({
        error: 'Workflow ID is required',
        success: false
      }, { status: 400 })
    }

    if (!workflowData.name) {
      return c.json({
        error: 'Workflow name is required',
        success: false
      }, { status: 400 })
    }

    // Validate workflow before updating
    const workflowService = await WorkflowService.getInstance()
    const validationResult = workflowService.validateWorkflow(workflowData)

    if (!validationResult.valid) {
      return c.json({
        error: 'Workflow validation failed',
        valid: false,
        validationErrors: validationResult.errors
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

    // Update workflow
    const updatedWorkflow = await workflowRepository.update(workflowId, {
      name: workflowData.name,
      description: workflowData.description || null,
      definition: workflowData,
      version: workflowData.version || existingWorkflow.version
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
workflows.delete('/:workflowId', async (c) => {
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