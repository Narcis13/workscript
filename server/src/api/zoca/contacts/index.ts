import { Hono } from 'hono'
import { ContactRepository } from '../../../db/repositories/contactRepository'

const contacts = new Hono()
const contactsRepository = new ContactRepository()

// Get all agencies endpoint
contacts.get('/', async (c) => {
  try {
    const allContacts = await contactsRepository.findAll()
    
    return c.json({
      success: true,
      count: allContacts.length,
      data: allContacts
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
contacts.post('/import', async (c) => {

    const body = await c.req.json()
    console.log('Import request body:', JSON.stringify(body, null, 2))
    return c.json({
        success: true,
        message: 'Import data received'
      })


 

})

export default contacts