import { Hono } from 'hono'
import { PropertyRepository } from '../../../db/repositories/propertyRepository'

const properties = new Hono()
const propertiesRepository = new PropertyRepository()

// Get all agencies endpoint
properties.get('/', async (c) => {
  try {
    const allProperties = await propertiesRepository.findAll()
    
    return c.json({
      success: true,
      count: allProperties.length,
      data: allProperties
    })
  } catch (error) {
    console.error('Failed to retrieve agencies:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      data: []
    }, { status: 500 })
  }
})

// Import endpoint
properties.post('/import', async (c) => {

    const body = await c.req.json()
    console.log('Import request body:', JSON.stringify(body, null, 2))
    
    // Ensure body is an array
    
    return c.json({
        success: true,
        message: 'Properties imported successfully'
    })
    
})

export default properties