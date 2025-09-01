import { Hono } from 'hono'
import { PropertyRepository } from '../../../db/repositories/propertyRepository'
import { AgentsRepository } from '../../../db/repositories/agentsRepository'
import { ContactRepository } from '../../../db/repositories/contactRepository'
import { ClientRequestRepository } from '../../../db/repositories/clientRequestRepository'
import { ActivitiesRepository } from '../../../db/repositories/activitiesRepository'

const activities = new Hono()
const propertiesRepository = new PropertyRepository()
const agentsRepository = new AgentsRepository()
const contactRepository = new ContactRepository()
const clientRequestRepository = new ClientRequestRepository()
const activitiesRepository = new ActivitiesRepository()

// Get all agencies endpoint
activities.get('/', async (c) => {
  try {
    const allActivities = await activitiesRepository.findAll()

    return c.json({
      success: true,
      count: allActivities.length,
      data: allActivities
    })
  } catch (error) {
    console.error('Failed to retrieve activities:', error)
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      data: []
    }, { status: 500 })
  }
})

// Import endpoint
activities.post('/import', async (c) => {
  try {
    const body = await c.req.json()

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return c.json({
        success: false,
        error: 'Request body must be an array of activities',
      }, { status: 400 })
    }

    // Default to agency ID 1 for now - in production this should come from authentication/context
    const defaultAgencyId = 1;

    // Transform the incoming data to match our import format
    const activitiesData = body.map((item) => {
      // Map activity types from incoming format to our enum values
      const activityTypeMapping: Record<string, 'call' | 'meeting' | 'viewing' | 'task' | 'other'> = {
        'call': 'call',
        'meeting': 'meeting', 
        'viewing': 'viewing',
        'task': 'task'
      };

      // Map status from incoming format to our enum values
      const statusMapping: Record<string, 'future' | 'inprogress' | 'passed' | 'completed' | 'cancelled'> = {
        'future': 'future',
        'inprogress': 'inprogress', 
        'passed': 'passed',
        'completed': 'completed',
        'cancelled': 'cancelled'
      };

      return {
        originalActivityId: item.id?.toString() || '',
        agencyId: defaultAgencyId,
        agentName: item.agent || '',
        name: item.name || '',
        memo: item.memo || undefined,
        activityType: activityTypeMapping[item.type] || 'other',
        status: statusMapping[item.status] || 'future',
        statusClass: item.statusClass || undefined,
        statusIcon: item.statusIcon || undefined,
        typeColor: item.typeColor || undefined,
        typeIcon: item.typeIcon || undefined,
        typeDuration: item.typeDuration ? parseInt(item.typeDuration) : undefined,
        scheduledDate: item.date || undefined,
        scheduledTime: item.time || undefined,
        contactName: item.contact || undefined,
        contactPhone: item.contactPhone || undefined,
        propertyCode: item.properties || undefined,
        requestCode: item.requests || undefined,
        editUrl: item.editUrl || undefined,
        slideUrl: item.slideUrl || undefined,
      };
    });

    // Use the repository's import method which handles all the data transformation and ID resolution
    const result = await activitiesRepository.importActivities(activitiesData);

    return c.json({
      success: true,
      message: 'Activities imported successfully',
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      total: body.length
    });

  } catch (error) {
    console.error('Failed to import activities:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
})



export default activities