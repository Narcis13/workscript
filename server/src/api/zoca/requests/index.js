import { Hono } from 'hono';
import { PropertyRepository } from '../../../db/repositories/propertyRepository';
import { AgentsRepository } from '../../../db/repositories/agentsRepository';
import { ContactRepository } from '../../../db/repositories/contactRepository';
import { ClientRequestRepository } from '../../../db/repositories/clientRequestRepository';
const requests = new Hono();
const propertiesRepository = new PropertyRepository();
const agentsRepository = new AgentsRepository();
const contactRepository = new ContactRepository();
const clientRequestRepository = new ClientRequestRepository();
// Get all agencies endpoint
requests.get('/', async (c) => {
    try {
        const allRequests = await clientRequestRepository.findAll();
        return c.json({
            success: true,
            count: allRequests.length,
            data: allRequests
        });
    }
    catch (error) {
        console.error('Failed to retrieve agencies:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            data: []
        }, { status: 500 });
    }
});
// Get client requests that need follow-up
requests.get('/follow-up', async (c) => {
    try {
        // Get query parameters
        const days = parseInt(c.req.query('days') || '30');
        const agencyIdParam = c.req.query('agencyId');
        const agencyId = agencyIdParam ? parseInt(agencyIdParam) : undefined;
        // Validate days parameter
        if (isNaN(days) || days < 1 || days > 365) {
            return c.json({
                success: false,
                error: 'Days parameter must be between 1 and 365'
            }, { status: 400 });
        }
        // Get requests that need follow-up
        const requestsNeedingFollowUp = await clientRequestRepository.findNeedingFollowUp(days, agencyId);
        return c.json({
            success: true,
            message: `Found ${requestsNeedingFollowUp.length} client requests needing follow-up (no activities in last ${days} days)`,
            count: requestsNeedingFollowUp.length,
            days: days,
            agencyId: agencyId,
            data: requestsNeedingFollowUp
        });
    }
    catch (error) {
        console.error('Failed to retrieve follow-up requests:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            data: []
        }, { status: 500 });
    }
});
// Import endpoint
requests.post('/import', async (c) => {
    try {
        const body = await c.req.json();
        // console.log('Import request body:', JSON.stringify(body, null, 2))
        // Ensure body is an array
        if (!Array.isArray(body)) {
            return c.json({
                success: false,
                error: 'Request body must be an array of requests',
                data: []
            }, { status: 400 });
        }
        const importResults = [];
        const errors = [];
        let skipped = 0;
        for (const item of body) {
            try {
                // Check for duplicate request code
                const existingRequest = await clientRequestRepository.findByRequestCode(item.requestCode);
                if (existingRequest) {
                    skipped++;
                    console.log(`Skipping duplicate request with code: ${item.requestCode}`);
                    continue;
                }
                const transformedData = await transformRequestData(item);
                if (transformedData) {
                    const createdRequest = await clientRequestRepository.create(transformedData);
                    importResults.push({
                        originalId: item.id,
                        requestCode: item.requestCode,
                        contactPhone: item.contactPhone,
                        status: 'success',
                        dbId: createdRequest.id
                    });
                }
                else {
                    skipped++;
                    errors.push({
                        originalId: item.id,
                        requestCode: item.requestCode,
                        error: 'Failed to transform data - missing required mappings'
                    });
                }
            }
            catch (error) {
                console.error('Error processing item:', error);
                errors.push({
                    originalId: item.id,
                    requestCode: item.requestCode,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return c.json({
            success: true,
            message: `Client requests imported successfully`,
            imported: importResults.length,
            skipped: skipped,
            errors: errors,
            total: body.length
        });
    }
    catch (error) {
        console.error('Import endpoint error:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            data: []
        }, { status: 500 });
    }
});
// Helper function to transform incoming data to database schema
async function transformRequestData(incomingData) {
    try {
        // Step 1: Find contact by phone number (last 9 digits match)
        const contactId = await findContactByPhone(incomingData.contactPhone);
        if (!contactId) {
            console.warn(`Contact not found for phone: ${incomingData.contactPhone}`);
            return null;
        }
        // Step 2: Find agent by name
        const assignedAgentId = await findAgentByName(incomingData.agent);
        if (!assignedAgentId) {
            console.warn(`Agent not found for name: ${incomingData.agent}`);
            return null;
        }
        // Step 3: Find property by sourcePropertyCode (if provided)
        let propertyId = null;
        if (incomingData.sourcePropertyCode) {
            propertyId = await findPropertyByCode(incomingData.sourcePropertyCode);
        }
        // Step 4: Parse budget and extract min/max values
        const { budgetMin, budgetMax } = parseBudget(incomingData.budget);
        // Step 5: Map transaction type
        const requestType = mapTransactionType(incomingData.transaction);
        // Step 6: Map property type
        const propertyType = mapPropertyType(incomingData.propertyType);
        // Step 7: Parse property subtype for room requirements
        const { minRooms, maxRooms } = parsePropertySubtype(incomingData.propertySubtype);
        // Step 8: Parse zones/locations
        const preferredLocations = parseZones(incomingData.zones);
        // Step 9: Map status
        const { status, statusColorCode } = mapStatus(incomingData.status, incomingData.statusColor);
        // Step 10: Parse dates
        const createdAt = parseDate(incomingData.dateAdded);
        const updatedAt = parseDate(incomingData.dateModified);
        // Get agency ID (assuming same as contact's agency)
        const contact = await contactRepository.findById(contactId);
        if (!contact) {
            console.warn(`Contact details not found for ID: ${contactId}`);
            return null;
        }
        const transformedData = {
            contactId,
            agencyId: contact.agencyId,
            assignedAgentId,
            propertyId,
            requestType,
            title: `${incomingData.requestCode} - ${incomingData.contactName || 'Client'} - ${incomingData.propertyType}`,
            description: `Request from ${incomingData.source} for ${incomingData.propertyType} in ${incomingData.city || 'unspecified location'}`,
            propertyType,
            budgetMin,
            budgetMax,
            preferredLocations,
            minRooms,
            maxRooms,
            status,
            statusColorCode,
            requestCode: incomingData.requestCode,
            source: mapSource(incomingData.source),
            sourceDetails: `Original ID: ${incomingData.id}, Request Code: ${incomingData.requestCode}`,
            internalNotes: `Imported from ${incomingData.source}. Original sync status: ${incomingData.syncStatus}`,
            createdAt: createdAt,
            updatedAt: updatedAt
        };
        return transformedData;
    }
    catch (error) {
        console.error('Error transforming request data:', error);
        return null;
    }
}
// Helper function to find contact by phone (last 9 digits match)
async function findContactByPhone(phone) {
    try {
        const contact = await contactRepository.findByPhone(phone);
        return contact?.id || null;
    }
    catch (error) {
        console.error('Error finding contact by phone:', error);
        return null;
    }
}
// Helper function to find agent by name
async function findAgentByName(agentName) {
    try {
        const searchName = agentName.trim();
        // Get all agents and search through them
        const agents = await agentsRepository.findAll();
        // First try exact match with firstName (since full names are stored in firstName)
        let matchedAgent = agents.find(agent => agent.firstName?.toLowerCase().trim() === searchName.toLowerCase());
        // If no exact match, try partial matching
        if (!matchedAgent) {
            matchedAgent = agents.find(agent => agent.firstName?.toLowerCase().includes(searchName.toLowerCase()) ||
                searchName.toLowerCase().includes(agent.firstName?.toLowerCase() || ''));
        }
        // If still no match, try splitting the search name and matching parts
        if (!matchedAgent && searchName.includes(' ')) {
            const nameParts = searchName.split(' ');
            matchedAgent = agents.find(agent => {
                const agentFirstName = agent.firstName?.toLowerCase() || '';
                return nameParts.every(part => agentFirstName.includes(part.toLowerCase()));
            });
        }
        return matchedAgent?.id || null;
    }
    catch (error) {
        console.error('Error finding agent by name:', error);
        return null;
    }
}
// Helper function to find property by source property code
async function findPropertyByCode(sourcePropertyCode) {
    try {
        // Search for property by internal code
        const properties = await propertiesRepository.findAll();
        const matchedProperty = properties.find(property => property.internalCode === sourcePropertyCode);
        return matchedProperty?.id || null;
    }
    catch (error) {
        console.error('Error finding property by code:', error);
        return null;
    }
}
// Helper function to parse budget string
function parseBudget(budgetStr) {
    if (!budgetStr || budgetStr === '-') {
        return { budgetMin: null, budgetMax: null };
    }
    // Remove currency symbols and clean the string
    const cleaned = budgetStr.replace(/[€$£]/g, '').replace(/\./g, '').replace(/,/g, '').trim();
    // Check if it's a range (contains -)
    if (cleaned.includes(' - ')) {
        const [min, max] = cleaned.split(' - ').map(v => v.trim());
        return {
            budgetMin: min ? parseFloat(min).toString() : null,
            budgetMax: max ? parseFloat(max).toString() : null
        };
    }
    // Single value - use as max
    const value = parseFloat(cleaned);
    if (isNaN(value)) {
        return { budgetMin: null, budgetMax: null };
    }
    return {
        budgetMin: null,
        budgetMax: value.toString()
    };
}
// Helper function to map transaction type
function mapTransactionType(transaction) {
    const mapping = {
        'Cumparare': 'cumparare',
        'Inchiriere': 'inchiriere',
        'Vanzare': 'vanzare'
    };
    return mapping[transaction] || 'informatii';
}
// Helper function to map property type
function mapPropertyType(propertyType) {
    const mapping = {
        'Apartament': 'apartament',
        'Casa': 'casa',
        'Vila': 'vila',
        'Studio': 'studio',
        'Garsoniera': 'garsoniera',
        'Teren': 'teren'
    };
    return mapping[propertyType] || 'apartament';
}
// Helper function to parse property subtype for room requirements
function parsePropertySubtype(subtype) {
    if (!subtype) {
        return { minRooms: null, maxRooms: null };
    }
    // Extract number from "min X cam." format
    const match = subtype.match(/min\s+(\d+)\s+cam/i);
    if (match && match[1]) {
        const minRooms = parseInt(match[1]);
        return { minRooms, maxRooms: null };
    }
    return { minRooms: null, maxRooms: null };
}
// Helper function to parse zones/locations
function parseZones(zones) {
    if (!zones) {
        return JSON.stringify([]);
    }
    // Split by commas and clean up
    const locationsList = zones.split(',').map(zone => zone.trim()).filter(zone => zone.length > 0);
    // Remove "+X" indicators (e.g., "+1", "+5")
    const cleanedLocations = locationsList.map(location => location.replace(/\s*\+\d+$/, '').trim()).filter(location => location.length > 0);
    return JSON.stringify(cleanedLocations);
}
// Helper function to map status
function mapStatus(status, statusColor) {
    const statusMapping = {
        'Activa': 'nou',
        'Active': 'nou',
        'In procesare': 'in_procesare',
        'Finalizat': 'finalizat',
        'Anulat': 'anulat'
    };
    return {
        status: statusMapping[status] || 'nou',
        statusColorCode: statusColor || null
    };
}
// Helper function to map source
function mapSource(source) {
    const sourceMapping = {
        'MLS': 'other',
        'Website': 'website_form',
        'Facebook': 'social_media',
        'Phone': 'phone_call',
        'Email': 'email'
    };
    return sourceMapping[source] || 'other';
}
// Helper function to parse date strings
function parseDate(dateStr) {
    if (!dateStr) {
        return new Date();
    }
    // Parse format "29.08.2025 23:06:51"
    const parts = dateStr.split(' ');
    if (parts.length === 2 && parts[0] && parts[1]) {
        const [datePart, timePart] = parts;
        const dateSegments = datePart.split('.');
        const timeSegments = timePart.split(':');
        if (dateSegments.length === 3 && timeSegments.length === 3) {
            const [day, month, year] = dateSegments;
            const [hour, minute, second] = timeSegments;
            if (day && month && year && hour && minute && second) {
                const date = new Date(parseInt(year), parseInt(month) - 1, // Month is 0-indexed
                parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
    }
    return new Date();
}
export default requests;
