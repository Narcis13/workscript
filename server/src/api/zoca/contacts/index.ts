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
  try {
    const body = await c.req.json()
    
    if (!Array.isArray(body)) {
      return c.json({
        success: false,
        error: 'Request body must be an array of contact objects'
      }, { status: 400 })
    }

    const importResults = {
      total: body.length,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: [] as string[]
    }

    for (const [index, rawContact] of body.entries()) {
      try {
        const curatedContact = curateContactData(rawContact)
        
        if (!curatedContact) {
          importResults.skipped++
          continue
        }

        // Check for duplicate phone number
        if (curatedContact.phone) {
          const existingContact = await contactsRepository.findByPhone(curatedContact.phone)
          if (existingContact) {
            importResults.duplicates++
            console.log(`Skipping duplicate contact with phone: ${curatedContact.phone}`)
            continue
          }
        }

        await contactsRepository.create(curatedContact)
        importResults.imported++
      } catch (error) {
        const errorMsg = `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        importResults.errors.push(errorMsg)
        console.error('Failed to import contact at index', index, ':', error)
      }
    }

    return c.json({
      success: true,
      data: importResults
    })
  } catch (error) {
    console.error('Import endpoint error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

function curateContactData(rawContact: any) {
  const firstName = rawContact['Nume']
  const email = rawContact['Email']
  const phone = rawContact['Telefon']
  const adaugatModificat = rawContact['Adaugat Modificat']

  if (!firstName || firstName.trim() === '') {
    return null
  }

  let createdAt = new Date()
  let updatedAt = new Date()

  if (adaugatModificat && typeof adaugatModificat === 'string') {
    const dates = adaugatModificat.split(' ')
    if (dates.length >= 2) {
      const modificatDate = dates[1]
      if (modificatDate) {
        try {
          const [day, month, year] = modificatDate.split('.')
          const parsedDate = new Date(`${year}-${month}-${day}`)
          if (!isNaN(parsedDate.getTime())) {
            createdAt = parsedDate
            updatedAt = parsedDate
          }
        } catch (error) {
          console.warn('Failed to parse date:', modificatDate, error)
        }
      }
    }
  }

  const curatedContact: any = {
    firstName: firstName.trim(),
    agencyId: 1, // Default agency ID - you might want to make this configurable
    createdAt: createdAt,
    updatedAt: updatedAt
  }

  if (email && email.trim() !== '' && email.trim() !== 'E-mail') {
    curatedContact.email = email.trim()
  }

  if (phone && phone.trim() !== '') {
    curatedContact.phone = phone.replace(/\s+/g, '')
  }

  return curatedContact
}

export default contacts