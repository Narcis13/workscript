import { Hono } from 'hono'
import { createId } from '@paralleldrive/cuid2'
import { AiAgentsRepository } from '../../../db/repositories/aiAgentsRepository'

const aiAgents = new Hono()
const aiAgentsRepository = new AiAgentsRepository()

// Get all AI agents endpoint
aiAgents.get('/', async (c) => {
  try {
    const allAiAgents = await aiAgentsRepository.findAll()
    
    return c.json({
      success: true,
      count: allAiAgents.length,
      data: allAiAgents
    })
  } catch (error) {
    console.error('Failed to retrieve AI agents:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      data: []
    }, { status: 500 })
  }
})

// Get AI agent by ID endpoint
aiAgents.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const aiAgent = await aiAgentsRepository.findById(id)
    
    if (!aiAgent) {
      return c.json({
        error: 'AI agent not found',
        success: false,
        data: null
      }, { status: 404 })
    }
    
    return c.json({
      success: true,
      data: aiAgent
    })
  } catch (error) {
    console.error('Failed to retrieve AI agent:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      data: null
    }, { status: 500 })
  }
})

// Create new AI agent endpoint
aiAgents.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    // Validate required fields
    if (!body.agentName || !body.systemPrompt || !body.aiModel) {
      return c.json({
        error: 'Missing required fields: agentName, systemPrompt, and aiModel are required',
        success: false
      }, { status: 400 })
    }

    // Check if agent with same name already exists
    const existingAgent = await aiAgentsRepository.findByName(body.agentName)
    if (existingAgent) {
      return c.json({
        error: 'AI agent with this name already exists',
        success: false
      }, { status: 409 })
    }

    // Create new AI agent object with generated ID
    const newAiAgent = {
      id: createId(),
      agentName: body.agentName.trim(),
      description: body.description?.trim() || null,
      systemPrompt: body.systemPrompt.trim(),
      aiModel: body.aiModel.trim()
    }

    const createdAgent = await aiAgentsRepository.create(newAiAgent)
    
    return c.json({
      success: true,
      message: 'AI agent created successfully',
      data: createdAgent
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create AI agent:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Update AI agent endpoint
aiAgents.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    // Check if agent exists
    const existingAgent = await aiAgentsRepository.findById(id)
    if (!existingAgent) {
      return c.json({
        error: 'AI agent not found',
        success: false
      }, { status: 404 })
    }

    // If updating name, check for duplicates
    if (body.agentName && body.agentName !== existingAgent.agentName) {
      const nameConflict = await aiAgentsRepository.findByName(body.agentName)
      if (nameConflict) {
        return c.json({
          error: 'AI agent with this name already exists',
          success: false
        }, { status: 409 })
      }
    }

    // Prepare updates object
    const updates: any = {}
    if (body.agentName !== undefined) updates.agentName = body.agentName.trim()
    if (body.description !== undefined) updates.description = body.description?.trim() || null
    if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt.trim()
    if (body.aiModel !== undefined) updates.aiModel = body.aiModel.trim()

    const updatedAgent = await aiAgentsRepository.update(id, updates)
    
    return c.json({
      success: true,
      message: 'AI agent updated successfully',
      data: updatedAgent
    })
  } catch (error) {
    console.error('Failed to update AI agent:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Delete AI agent endpoint
aiAgents.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Check if agent exists
    const existingAgent = await aiAgentsRepository.findById(id)
    if (!existingAgent) {
      return c.json({
        error: 'AI agent not found',
        success: false
      }, { status: 404 })
    }

    const deleted = await aiAgentsRepository.delete(id)
    
    if (!deleted) {
      return c.json({
        error: 'Failed to delete AI agent',
        success: false
      }, { status: 500 })
    }
    
    return c.json({
      success: true,
      message: 'AI agent deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete AI agent:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Search AI agents endpoint
aiAgents.get('/search/:term', async (c) => {
  try {
    const searchTerm = c.req.param('term')
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return c.json({
        error: 'Search term must be at least 2 characters long',
        success: false,
        data: []
      }, { status: 400 })
    }
    
    const results = await aiAgentsRepository.search(searchTerm)
    
    return c.json({
      success: true,
      count: results.length,
      searchTerm,
      data: results
    })
  } catch (error) {
    console.error('Failed to search AI agents:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      data: []
    }, { status: 500 })
  }
})

// Get agents by AI model endpoint
aiAgents.get('/model/:modelName', async (c) => {
  try {
    const modelName = c.req.param('modelName')
    const agents = await aiAgentsRepository.findByModel(modelName)
    
    return c.json({
      success: true,
      count: agents.length,
      model: modelName,
      data: agents
    })
  } catch (error) {
    console.error('Failed to retrieve agents by model:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      data: []
    }, { status: 500 })
  }
})

// Update system prompt endpoint
aiAgents.patch('/:id/system-prompt', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    if (!body.systemPrompt) {
      return c.json({
        error: 'systemPrompt is required',
        success: false
      }, { status: 400 })
    }

    const updatedAgent = await aiAgentsRepository.updateSystemPrompt(id, body.systemPrompt.trim())
    
    if (!updatedAgent) {
      return c.json({
        error: 'AI agent not found',
        success: false
      }, { status: 404 })
    }
    
    return c.json({
      success: true,
      message: 'System prompt updated successfully',
      data: updatedAgent
    })
  } catch (error) {
    console.error('Failed to update system prompt:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

// Update AI model endpoint
aiAgents.patch('/:id/model', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    if (!body.aiModel) {
      return c.json({
        error: 'aiModel is required',
        success: false
      }, { status: 400 })
    }

    const updatedAgent = await aiAgentsRepository.updateModel(id, body.aiModel.trim())
    
    if (!updatedAgent) {
      return c.json({
        error: 'AI agent not found',
        success: false
      }, { status: 404 })
    }
    
    return c.json({
      success: true,
      message: 'AI model updated successfully',
      data: updatedAgent
    })
  } catch (error) {
    console.error('Failed to update AI model:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
})

export default aiAgents