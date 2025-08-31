import { Hono } from 'hono'
import { PropertyRepository } from '../../../db/repositories/propertyRepository'
import { AgentsRepository } from '../../../db/repositories/agentsRepository'
import { ContactRepository } from '../../../db/repositories/contactRepository'
import { ClientRequestRepository } from '../../../db/repositories/clientRequestRepository'

const activities = new Hono()
const propertiesRepository = new PropertyRepository()
const agentsRepository = new AgentsRepository()
const contactRepository = new ContactRepository()
const clientRequestRepository = new ClientRequestRepository()

// Get all agencies endpoint
activities.get('/', async (c) => {
  try {
    const allRequests = await clientRequestRepository.findAll()

    return c.json({
      success: true,
      count: allRequests.length,
      data: allRequests
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
activities.post('/import', async (c) => {

    const body = await c.req.json()
    console.log('Import request body:', JSON.stringify(body, null, 2))

    return c.json({
      success: true,
      message: 'Import request received',
      data: body
    })

})



export default activities