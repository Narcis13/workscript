import { Hono } from 'hono'
import type { WorkflowDefinition } from 'shared/dist'
import { WorkflowService } from '../../services/WorkflowService'
import { writeFile, mkdir, readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'

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

export default workflows