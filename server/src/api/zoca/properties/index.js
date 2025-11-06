import { Hono } from 'hono';
import { PropertyRepository } from '../../../db/repositories/propertyRepository';
import { AgentsRepository } from '../../../db/repositories/agentsRepository';
import { ContactRepository } from '../../../db/repositories/contactRepository';
import { parse } from 'node-html-parser';
const properties = new Hono();
const propertiesRepository = new PropertyRepository();
const agentsRepository = new AgentsRepository();
const contactRepository = new ContactRepository();
// Get all agencies endpoint
properties.get('/', async (c) => {
    try {
        const allProperties = await propertiesRepository.findAll();
        return c.json({
            success: true,
            count: allProperties.length,
            data: allProperties
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
// Import endpoint
properties.post('/import', async (c) => {
    try {
        const body = await c.req.json();
        // console.log('Import request body:', JSON.stringify(body, null, 2))
        // Ensure body is an array
        const propertyData = Array.isArray(body) ? body : [body];
        const importResults = [];
        const errors = [];
        let skipped = 0;
        for (const item of propertyData) {
            try {
                // Check if property already exists by original ID (only if ID exists)
                if (item.id) {
                    const existingProperty = await propertiesRepository.findByOriginalId(item.id);
                    if (existingProperty) {
                        skipped++;
                        importResults.push({
                            success: true,
                            propertyId: existingProperty.id,
                            originalId: item.id,
                            title: existingProperty.title,
                            status: 'already_exists'
                        });
                        continue;
                    }
                }
                // Transform incoming data to match database schema
                const transformedProperty = await transformPropertyData(item);
                if (transformedProperty) {
                    // Create the property in database
                    const createdProperty = await propertiesRepository.create(transformedProperty);
                    importResults.push({
                        success: true,
                        propertyId: createdProperty.id,
                        originalId: item.id,
                        title: transformedProperty.title,
                        status: 'created'
                    });
                }
                else {
                    skipped++;
                    errors.push({
                        originalId: item.id,
                        error: 'Failed to transform property data - missing required fields'
                    });
                }
            }
            catch (error) {
                console.error('Error importing property:', error);
                errors.push({
                    originalId: item.id || 'unknown',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        const actualImported = importResults.filter(r => r.status === 'created').length;
        return c.json({
            success: true,
            message: `Properties import completed: ${actualImported} imported, ${skipped} skipped, ${errors.length} errors`,
            imported: actualImported,
            skipped: skipped,
            errors: errors,
            total: propertyData.length
        });
    }
    catch (error) {
        console.error('Import endpoint error:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
});
// Helper function to transform incoming data to database schema
async function transformPropertyData(incomingData) {
    try {
        // Extract and parse values from incoming data
        const price = parsePrice(incomingData.price);
        const pricePerSqm = parsePrice(incomingData.pricePerSqm);
        const surfaceArea = parseSurface(incomingData.usefulSurface);
        const builtArea = parseSurface(incomingData.constructedSurface);
        const rooms = parseRooms(incomingData.rooms);
        const bedrooms = parseRooms(incomingData.bedrooms);
        const { floor, totalFloors } = parseFloorData(incomingData.floor);
        const address = incomingData.address || '';
        const locationData = parseAddress(address);
        // Look up agent_id by agent name
        let agentId = null;
        if (incomingData.agent) {
            const agent = await findAgentByName(incomingData.agent);
            agentId = agent ? agent.id : null;
        }
        // Look up owner_contact_id by landlord phone
        let ownerContactId = null;
        if (incomingData.landlordPhone) {
            const contact = await contactRepository.findByPhone(incomingData.landlordPhone);
            ownerContactId = contact ? contact.id : null;
        }
        // Default values for required fields - get actual existing agent
        const agencyId = 1; // Default agency - you might want to make this configurable
        let finalAgentId = agentId;
        // If no agent found, get the first available active agent
        if (!finalAgentId) {
            const activeAgents = await agentsRepository.findActiveByAgency(agencyId);
            if (activeAgents.length > 0) {
                finalAgentId = activeAgents[0]?.id ?? null;
            }
            else {
                // Fallback: get any agent from the agency
                const allAgents = await agentsRepository.findByAgency(agencyId);
                if (allAgents.length > 0) {
                    finalAgentId = allAgents[0]?.id ?? null;
                }
                else {
                    throw new Error('No agents found in the agency. Please create at least one agent before importing properties.');
                }
            }
        }
        // Ensure finalAgentId is not null before creating property
        if (!finalAgentId) {
            throw new Error('Could not determine agent ID for property.');
        }
        // Determine property and transaction types
        // The JSON seems to have generic values "Tip" and "Tranzactie", we need to infer from other data
        const propertyType = inferPropertyType(incomingData);
        const transactionType = inferTransactionType(incomingData);
        // Generate title if not provided
        const title = generateTitle(propertyType, transactionType, rooms, locationData.city || locationData.neighborhood || '');
        const descriptionResult = await generateDescription(incomingData);
        // Build the transformed property object
        const transformedProperty = {
            agencyId,
            agentId: finalAgentId,
            ownerContactId,
            internalCode: incomingData.internalCode || null,
            title,
            description: descriptionResult.rawHTML, //descriptionResult.description,//
            propertyType,
            transactionType,
            price: price.toString(),
            currency: price > 0 ? determineCurrency(incomingData.price) : 'RON',
            pricePerSqm: pricePerSqm > 0 ? pricePerSqm.toString() : null,
            priceHistory: JSON.stringify([]),
            // Location data
            county: locationData.county,
            city: locationData.city,
            sector: locationData.sector,
            neighborhood: locationData.neighborhood,
            address: address,
            latitude: descriptionResult.latitude !== null ? descriptionResult.latitude.toString() : null,
            longitude: descriptionResult.longitude !== null ? descriptionResult.longitude.toString() : null,
            // Property details
            surfaceArea: surfaceArea > 0 ? surfaceArea.toString() : null,
            builtArea: builtArea > 0 ? builtArea.toString() : null,
            landArea: null,
            rooms: rooms > 0 ? rooms : null,
            bedrooms: bedrooms > 0 ? bedrooms : null,
            bathrooms: null,
            floor: floor !== null ? floor : null,
            totalFloors: totalFloors !== null ? totalFloors : null,
            constructionYear: null,
            condition: null,
            energyClass: null,
            // Features & Media
            features: JSON.stringify({ description: descriptionResult.description }),
            amenities: JSON.stringify([]),
            appliances: JSON.stringify([]),
            photos: JSON.stringify(extractPhotos(incomingData)),
            virtualTourUrl: `https://web.immoflux.ro/publicproperty/${incomingData.internalCode}`,
            floorPlanUrl: null,
            documents: JSON.stringify(extractPlatformLinks(incomingData)),
            // Status
            status: mapStatus(incomingData.status),
            availableFrom: parseDate(incomingData.dateAdded),
            exclusiveUntil: null,
            // Analytics
            aiValuationScore: null,
            aiValuationConfidence: null,
            marketTrendScore: null,
            viewsCount: 0,
            favoritesCount: 0,
            inquiriesCount: 0,
            // SEO
            slug: await generateUniqueSlug(title, incomingData.id),
            seoTitle: title,
            seoDescription: null,
            isPromoted: false,
            promotedUntil: null
        };
        return transformedProperty;
    }
    catch (error) {
        console.error('Error transforming property data:', error);
        return null;
    }
}
// Helper functions for data parsing and transformation
function parsePrice(priceStr) {
    if (!priceStr)
        return 0;
    // Handle formats like "10,00€/mp" or "121.000€" or "550€"
    let cleanStr = priceStr.replace(/[€\/mp\s]/g, '');
    // Handle comma as decimal separator in smaller numbers (like "10,00") 
    // vs period as thousands separator in larger numbers (like "121.000")
    if (cleanStr.includes(',') && cleanStr.includes('.')) {
        // Both comma and period - European format (123.456,78)
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    }
    else if (cleanStr.includes(',') && (cleanStr.split(',')[1]?.length || 0) <= 2) {
        // Only comma with <= 2 digits after - decimal separator
        cleanStr = cleanStr.replace(',', '.');
    }
    else if (cleanStr.includes('.') && (cleanStr.split('.')[1]?.length || 0) > 2) {
        // Period with > 2 digits after - thousands separator
        cleanStr = cleanStr.replace(/\./g, '');
    }
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : Math.round(num);
}
function parseSurface(surfaceStr) {
    if (!surfaceStr)
        return 0;
    // Extract number from strings like "66.00 m" or "55.00 m"
    const match = surfaceStr.match(/(\d+(?:\.\d+)?)/);
    return match && match[1] ? parseFloat(match[1]) : 0;
}
function parseRooms(roomStr) {
    if (!roomStr)
        return 0;
    // Extract number from strings like "2 cam." or "1 dorm."
    const match = roomStr.match(/(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
}
function parseFloorData(floorStr) {
    if (!floorStr)
        return { floor: null, totalFloors: null };
    // Handle formats like "3/4", "3", "12/18"
    if (floorStr.includes('/')) {
        const parts = floorStr.split('/');
        const floorPart = parts[0]?.trim();
        const totalFloorsPart = parts[1]?.trim();
        const floor = floorPart ? parseInt(floorPart, 10) : null;
        const totalFloors = totalFloorsPart ? parseInt(totalFloorsPart, 10) : null;
        return {
            floor: isNaN(floor) ? null : floor,
            totalFloors: isNaN(totalFloors) ? null : totalFloors
        };
    }
    const num = parseInt(floorStr, 10);
    return {
        floor: isNaN(num) ? null : num,
        totalFloors: null
    };
}
function parseAddress(address) {
    if (!address)
        return {};
    // Parse address like "B Bucuresti, Soseaua Chitilei, Nr.18"
    const parts = address.split(',').map(part => part.trim());
    const result = {};
    if (parts.length > 0) {
        const firstPart = parts[0];
        if (firstPart && firstPart.includes('Bucuresti')) {
            result.city = 'București';
            result.county = 'București';
            // Extract sector if present
            const sectorMatch = firstPart.match(/S(\d+)/i);
            if (sectorMatch) {
                result.sector = `Sector ${sectorMatch[1]}`;
            }
        }
        else if (firstPart) {
            result.city = firstPart;
        }
    }
    if (parts.length > 1) {
        result.neighborhood = parts[1];
    }
    return result;
}
async function findAgentByName(agentName) {
    if (!agentName)
        return null;
    // Try to find agent by searching in the name
    const agents = await agentsRepository.search(agentName);
    return agents.length > 0 ? agents[0] : null;
}
function inferPropertyType(incomingData) {
    const propertyTypeStr = incomingData.propertyType || '';
    // If we have the actual property type from the fixed Chrome extension
    if (propertyTypeStr && propertyTypeStr !== 'Tip') {
        const typeStr = propertyTypeStr.toLowerCase();
        if (typeStr.includes('apartament'))
            return 'apartament';
        if (typeStr.includes('casa'))
            return 'casa';
        if (typeStr.includes('vila'))
            return 'vila';
        if (typeStr.includes('studio'))
            return 'studio';
        if (typeStr.includes('garsoniera'))
            return 'garsoniera';
        if (typeStr.includes('duplex'))
            return 'duplex';
        if (typeStr.includes('penthouse'))
            return 'penthouse';
        if (typeStr.includes('teren'))
            return 'teren';
        if (typeStr.includes('birou'))
            return 'birou';
        if (typeStr.includes('comercial'))
            return 'spatiu_comercial';
        if (typeStr.includes('hala'))
            return 'hala';
        if (typeStr.includes('depozit'))
            return 'depozit';
    }
    // Fallback inference logic
    const rooms = parseRooms(incomingData.rooms);
    if (rooms === 1) {
        return 'studio';
    }
    return 'apartament'; // default
}
function inferTransactionType(incomingData) {
    const transactionStr = incomingData.transaction || '';
    // If we have the actual transaction type from the fixed Chrome extension
    if (transactionStr && transactionStr !== 'Tranzactie') {
        const transStr = transactionStr.toLowerCase();
        if (transStr.includes('vanzare') || transStr.includes('vanzari'))
            return 'vanzare';
        if (transStr.includes('inchiriere') || transStr.includes('inchirieri'))
            return 'inchiriere';
    }
    // Fallback inference based on price
    const price = parsePrice(incomingData.price || '0');
    if (price > 50000) {
        return 'vanzare';
    }
    return 'inchiriere'; // default for lower prices
}
function determineCurrency(priceStr) {
    if (!priceStr)
        return 'RON';
    if (priceStr.includes('€') || priceStr.includes('EUR'))
        return 'EUR';
    if (priceStr.includes('$') || priceStr.includes('USD'))
        return 'USD';
    return 'RON'; // default
}
function generateTitle(propertyType, transactionType, rooms, location) {
    const typeMap = {
        'apartament': 'Apartament',
        'casa': 'Casă',
        'vila': 'Vilă',
        'studio': 'Studio',
        'garsoniera': 'Garsonieră',
        'duplex': 'Duplex',
        'penthouse': 'Penthouse',
        'teren': 'Teren',
        'birou': 'Birou',
        'spatiu_comercial': 'Spațiu comercial'
    };
    const transactionMap = {
        'vanzare': 'de vânzare',
        'inchiriere': 'de închiriat'
    };
    const propertyName = typeMap[propertyType] || 'Proprietate';
    const transactionName = transactionMap[transactionType] || 'de închiriat';
    const roomsText = rooms > 0 ? ` ${rooms} camere` : '';
    const locationText = location ? ` în ${location}` : '';
    return `${propertyName}${roomsText} ${transactionName}${locationText}`;
}
async function generateDescription(incomingData) {
    const createFallbackResult = () => {
        const parts = [];
        if (incomingData.rooms)
            parts.push(`${incomingData.rooms}`);
        if (incomingData.bedrooms)
            parts.push(`${incomingData.bedrooms}`);
        if (incomingData.usefulSurface)
            parts.push(`Suprafață utilă: ${incomingData.usefulSurface}`);
        if (incomingData.constructedSurface)
            parts.push(`Suprafață construită: ${incomingData.constructedSurface}`);
        if (incomingData.floor)
            parts.push(`Etaj: ${incomingData.floor}`);
        if (incomingData.compartmentType)
            parts.push(`Compartimentare: ${incomingData.compartmentType}`);
        if (incomingData.landlord)
            parts.push(`Proprietar: ${incomingData.landlord}`);
        const fallbackDescription = parts.join('. ');
        return {
            rawHTML: fallbackDescription,
            description: fallbackDescription,
            latitude: null,
            longitude: null
        };
    };
    if (!incomingData.internalCode) {
        return createFallbackResult();
    }
    try {
        const url = `https://web.immoflux.ro/publicproperty/${incomingData.internalCode}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const htmlContent = await response.text();
        // Parse HTML and extract meta description content
        const root = parse(htmlContent);
        const metaDescription = root.querySelector('meta[name="description"]');
        const descriptionContent = metaDescription?.getAttribute('content') || '';
        // Extract latitude and longitude from hidden input elements
        const latitudeInput = root.querySelector('input#latitude');
        const longitudeInput = root.querySelector('input#longitude');
        const latitudeValue = latitudeInput?.getAttribute('value');
        const longitudeValue = longitudeInput?.getAttribute('value');
        const latitude = latitudeValue ? parseFloat(latitudeValue) : null;
        const longitude = longitudeValue ? parseFloat(longitudeValue) : null;
        return {
            rawHTML: htmlContent,
            description: descriptionContent,
            latitude: (latitude && !isNaN(latitude)) ? latitude : null,
            longitude: (longitude && !isNaN(longitude)) ? longitude : null
        };
    }
    catch (error) {
        console.error(`Failed to fetch HTML for internal code ${incomingData.internalCode}:`, error);
        return createFallbackResult();
    }
}
function extractPhotos(incomingData) {
    const photos = [];
    if (incomingData.image) {
        photos.push(incomingData.image);
    }
    return photos;
}
function extractPlatformLinks(incomingData) {
    const platformLinks = [];
    if (incomingData.platforms && Array.isArray(incomingData.platforms)) {
        for (const platform of incomingData.platforms) {
            if (platform.url || platform.name) {
                platformLinks.push({
                    platform: platform.name || 'Unknown',
                    code: platform.code || null,
                    url: platform.url || null
                });
            }
        }
    }
    return platformLinks;
}
function mapStatus(status) {
    if (!status)
        return 'activ';
    const statusStr = status.toLowerCase();
    if (statusStr.includes('activ'))
        return 'activ';
    if (statusStr.includes('rezervat'))
        return 'rezervat';
    if (statusStr.includes('vandut'))
        return 'vandut';
    if (statusStr.includes('inchiriat'))
        return 'inchiriat';
    if (statusStr.includes('suspendat'))
        return 'suspendat';
    if (statusStr.includes('expirat'))
        return 'expirat';
    return 'activ'; // default
}
function parseDate(dateStr) {
    if (!dateStr)
        return null;
    try {
        // Handle date format like "25.08.2025"
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            const day = parts[0]?.padStart(2, '0');
            const month = parts[1]?.padStart(2, '0');
            const year = parts[2];
            if (day && month && year) {
                return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
            }
        }
        return new Date(dateStr);
    }
    catch {
        return null;
    }
}
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .trim();
}
async function generateUniqueSlug(title, originalId) {
    const baseSlug = generateSlug(title);
    // Use original ID if provided, otherwise use timestamp
    const uniqueId = originalId || Date.now().toString();
    return `${baseSlug}-${uniqueId}`;
}
export default properties;
