import { Hono } from 'hono'
import { PropertyRepository } from '../../../db/repositories/propertyRepository'
import { AgentsRepository } from '../../../db/repositories/agentsRepository'
import { ContactRepository } from '../../../db/repositories/contactRepository'

const properties = new Hono()
const propertiesRepository = new PropertyRepository()
const agentsRepository = new AgentsRepository()
const contactRepository = new ContactRepository()

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
    try {
        const body = await c.req.json()
       // console.log('Import request body:', JSON.stringify(body, null, 2))
        
        // Ensure body is an array
        const propertyData = Array.isArray(body) ? body : [body]
        
        const importResults = []
        const errors = []
        
        for (const item of propertyData) {
            try {
                // Check if property already exists by original ID (only if ID exists)
                if (item.id) {
                    const existingProperty = await propertiesRepository.findByOriginalId(item.id)
                    if (existingProperty) {
                        importResults.push({
                            success: true,
                            propertyId: existingProperty.id,
                            originalId: item.id,
                            title: existingProperty.title,
                            status: 'already_exists'
                        })
                        continue
                    }
                }

                // Transform incoming data to match database schema
                const transformedProperty = await transformPropertyData(item)
                
                if (transformedProperty) {
                    // Create the property in database
                    const createdProperty = await propertiesRepository.create(transformedProperty)
                    importResults.push({
                        success: true,
                        propertyId: createdProperty.id,
                        originalId: item.id,
                        title: transformedProperty.title,
                        status: 'created'
                    })
                } else {
                    errors.push({
                        originalId: item.id,
                        error: 'Failed to transform property data - missing required fields'
                    })
                }
            } catch (error) {
                console.error('Error importing property:', error)
                errors.push({
                    originalId: item.id || 'unknown',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }
        
        return c.json({
            success: true,
            message: `Properties import completed: ${importResults.length} successful, ${errors.length} errors`,
            imported: importResults.length,
            errors: errors.length,
            results: importResults,
            errorDetails: errors
        })
        
    } catch (error) {
        console.error('Import endpoint error:', error)
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
})

// Helper function to transform incoming data to database schema
async function transformPropertyData(incomingData: any) {
    try {
        // Extract and parse values from incoming data
        const price = parsePrice(incomingData.price)
        const pricePerSqm = parsePrice(incomingData.pricePerSqm)
        const surfaceArea = parseSurface(incomingData.usefulSurface)
        const builtArea = parseSurface(incomingData.constructedSurface)
        const rooms = parseRooms(incomingData.rooms)
        const bedrooms = parseRooms(incomingData.bedrooms)
        const { floor, totalFloors } = parseFloorData(incomingData.floor)
        const address = incomingData.address || ''
        const locationData = parseAddress(address)
        
        // Look up agent_id by agent name
        let agentId = null
        if (incomingData.agent) {
            const agent = await findAgentByName(incomingData.agent)
            agentId = agent ? agent.id : null
        }
        
        // Look up owner_contact_id by landlord phone
        let ownerContactId = null
        if (incomingData.landlordPhone) {
            const contact = await contactRepository.findByPhone(incomingData.landlordPhone)
            ownerContactId = contact ? contact.id : null
        }
        
        // Default values for required fields
        const agencyId = 1 // Default agency - you might want to make this configurable
        const finalAgentId = agentId || 1 // Default agent if not found
        
        // Determine property and transaction types
        // The JSON seems to have generic values "Tip" and "Tranzactie", we need to infer from other data
        const propertyType = inferPropertyType(incomingData)
        const transactionType = inferTransactionType(incomingData)
        
        // Generate title if not provided
        const title = generateTitle(propertyType, transactionType, rooms, locationData.city || locationData.neighborhood || '')
        
        // Build the transformed property object
        const transformedProperty = {
            agencyId,
            agentId: finalAgentId,
            ownerContactId,
            title,
            description: generateDescription(incomingData),
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
            latitude: null,
            longitude: null,
            
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
            features: JSON.stringify([]),
            amenities: JSON.stringify([]),
            appliances: JSON.stringify([]),
            photos: JSON.stringify(extractPhotos(incomingData)),
            virtualTourUrl: null,
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
        }
        
        return transformedProperty
        
    } catch (error) {
        console.error('Error transforming property data:', error)
        return null
    }
}

// Helper functions for data parsing and transformation
function parsePrice(priceStr: string): number {
    if (!priceStr) return 0
    
    // Handle formats like "10,00€/mp" or "121.000€" or "550€"
    let cleanStr = priceStr.replace(/[€\/mp\s]/g, '')
    
    // Handle comma as decimal separator in smaller numbers (like "10,00") 
    // vs period as thousands separator in larger numbers (like "121.000")
    if (cleanStr.includes(',') && cleanStr.includes('.')) {
        // Both comma and period - European format (123.456,78)
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
    } else if (cleanStr.includes(',') && (cleanStr.split(',')[1]?.length || 0) <= 2) {
        // Only comma with <= 2 digits after - decimal separator
        cleanStr = cleanStr.replace(',', '.')
    } else if (cleanStr.includes('.') && (cleanStr.split('.')[1]?.length || 0) > 2) {
        // Period with > 2 digits after - thousands separator
        cleanStr = cleanStr.replace(/\./g, '')
    }
    
    const num = parseFloat(cleanStr)
    return isNaN(num) ? 0 : Math.round(num)
}

function parseSurface(surfaceStr: string | undefined): number {
    if (!surfaceStr) return 0
    // Extract number from strings like "66.00 m" or "55.00 m"
    const match = surfaceStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0
}

function parseRooms(roomStr: string | undefined): number {
    if (!roomStr) return 0
    // Extract number from strings like "2 cam." or "1 dorm."
    const match = roomStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0
}

function parseFloorData(floorStr: string): { floor: number | null, totalFloors: number | null } {
    if (!floorStr) return { floor: null, totalFloors: null }
    
    // Handle formats like "3/4", "3", "12/18"
    if (floorStr.includes('/')) {
        const parts = floorStr.split('/')
        const floorPart = parts[0]?.trim()
        const totalFloorsPart = parts[1]?.trim()
        
        const floor = floorPart ? parseInt(floorPart, 10) : null
        const totalFloors = totalFloorsPart ? parseInt(totalFloorsPart, 10) : null
        
        return {
            floor: isNaN(floor!) ? null : floor,
            totalFloors: isNaN(totalFloors!) ? null : totalFloors
        }
    }
    
    const num = parseInt(floorStr, 10)
    return { 
        floor: isNaN(num) ? null : num,
        totalFloors: null
    }
}

function parseAddress(address: string): { county?: string, city?: string, sector?: string, neighborhood?: string } {
    if (!address) return {}
    
    // Parse address like "B Bucuresti, Soseaua Chitilei, Nr.18"
    const parts = address.split(',').map(part => part.trim())
    const result: any = {}
    
    if (parts.length > 0) {
        const firstPart = parts[0]
        if (firstPart && firstPart.includes('Bucuresti')) {
            result.city = 'București'
            result.county = 'București'
            // Extract sector if present
            const sectorMatch = firstPart.match(/S(\d+)/i)
            if (sectorMatch) {
                result.sector = `Sector ${sectorMatch[1]}`
            }
        } else if (firstPart) {
            result.city = firstPart
        }
    }
    
    if (parts.length > 1) {
        result.neighborhood = parts[1]
    }
    
    return result
}

async function findAgentByName(agentName: string) {
    if (!agentName) return null
    
    // Try to find agent by searching in the name
    const agents = await agentsRepository.search(agentName)
    return agents.length > 0 ? agents[0] : null
}

function inferPropertyType(incomingData: any): 'apartament' | 'casa' | 'vila' | 'duplex' | 'penthouse' | 'studio' | 'garsoniera' | 'teren' | 'spatiu_comercial' | 'birou' | 'hala' | 'depozit' {
    const propertyTypeStr = incomingData.propertyType || ''
    
    // If we have the actual property type from the fixed Chrome extension
    if (propertyTypeStr && propertyTypeStr !== 'Tip') {
        const typeStr = propertyTypeStr.toLowerCase()
        if (typeStr.includes('apartament')) return 'apartament'
        if (typeStr.includes('casa')) return 'casa'
        if (typeStr.includes('vila')) return 'vila'
        if (typeStr.includes('studio')) return 'studio'
        if (typeStr.includes('garsoniera')) return 'garsoniera'
        if (typeStr.includes('duplex')) return 'duplex'
        if (typeStr.includes('penthouse')) return 'penthouse'
        if (typeStr.includes('teren')) return 'teren'
        if (typeStr.includes('birou')) return 'birou'
        if (typeStr.includes('comercial')) return 'spatiu_comercial'
        if (typeStr.includes('hala')) return 'hala'
        if (typeStr.includes('depozit')) return 'depozit'
    }
    
    // Fallback inference logic
    const rooms = parseRooms(incomingData.rooms)
    if (rooms === 1) {
        return 'studio'
    }
    
    return 'apartament' // default
}

function inferTransactionType(incomingData: any): 'vanzare' | 'inchiriere' {
    const transactionStr = incomingData.transaction || ''
    
    // If we have the actual transaction type from the fixed Chrome extension
    if (transactionStr && transactionStr !== 'Tranzactie') {
        const transStr = transactionStr.toLowerCase()
        if (transStr.includes('vanzare') || transStr.includes('vanzari')) return 'vanzare'
        if (transStr.includes('inchiriere') || transStr.includes('inchirieri')) return 'inchiriere'
    }
    
    // Fallback inference based on price
    const price = parsePrice(incomingData.price || '0')
    if (price > 50000) {
        return 'vanzare'
    }
    
    return 'inchiriere' // default for lower prices
}

function determineCurrency(priceStr: string): string {
    if (!priceStr) return 'RON'
    
    if (priceStr.includes('€') || priceStr.includes('EUR')) return 'EUR'
    if (priceStr.includes('$') || priceStr.includes('USD')) return 'USD'
    
    return 'RON' // default
}

function generateTitle(propertyType: string, transactionType: string, rooms: number, location: string): string {
    const typeMap: { [key: string]: string } = {
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
    }
    
    const transactionMap: { [key: string]: string } = {
        'vanzare': 'de vânzare',
        'inchiriere': 'de închiriat'
    }
    
    const propertyName = typeMap[propertyType] || 'Proprietate'
    const transactionName = transactionMap[transactionType] || 'de închiriat'
    const roomsText = rooms > 0 ? ` ${rooms} camere` : ''
    const locationText = location ? ` în ${location}` : ''
    
    return `${propertyName}${roomsText} ${transactionName}${locationText}`
}

function generateDescription(incomingData: any): string {
    const parts = []
    
    if (incomingData.rooms) parts.push(`${incomingData.rooms}`)
    if (incomingData.bedrooms) parts.push(`${incomingData.bedrooms}`)
    if (incomingData.usefulSurface) parts.push(`Suprafață utilă: ${incomingData.usefulSurface}`)
    if (incomingData.constructedSurface) parts.push(`Suprafață construită: ${incomingData.constructedSurface}`)
    if (incomingData.floor) parts.push(`Etaj: ${incomingData.floor}`)
    if (incomingData.compartmentType) parts.push(`Compartimentare: ${incomingData.compartmentType}`)
    if (incomingData.landlord) parts.push(`Proprietar: ${incomingData.landlord}`)
    
    return parts.join('. ')
}

function extractPhotos(incomingData: any): string[] {
    const photos = []
    if (incomingData.image) {
        photos.push(incomingData.image)
    }
    return photos
}

function extractPlatformLinks(incomingData: any): any[] {
    const platformLinks = []
    
    if (incomingData.platforms && Array.isArray(incomingData.platforms)) {
        for (const platform of incomingData.platforms) {
            if (platform.url || platform.name) {
                platformLinks.push({
                    platform: platform.name || 'Unknown',
                    code: platform.code || null,
                    url: platform.url || null
                })
            }
        }
    }
    
    return platformLinks
}

function mapStatus(status: string): 'activ' | 'rezervat' | 'vandut' | 'inchiriat' | 'suspendat' | 'expirat' {
    if (!status) return 'activ'
    
    const statusStr = status.toLowerCase()
    if (statusStr.includes('activ')) return 'activ'
    if (statusStr.includes('rezervat')) return 'rezervat'
    if (statusStr.includes('vandut')) return 'vandut'
    if (statusStr.includes('inchiriat')) return 'inchiriat'
    if (statusStr.includes('suspendat')) return 'suspendat'
    if (statusStr.includes('expirat')) return 'expirat'
    
    return 'activ' // default
}

function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null
    
    try {
        // Handle date format like "25.08.2025"
        const parts = dateStr.split('.')
        if (parts.length === 3) {
            const day = parts[0]?.padStart(2, '0')
            const month = parts[1]?.padStart(2, '0')
            const year = parts[2]
            if (day && month && year) {
                return new Date(`${year}-${month}-${day}T00:00:00.000Z`)
            }
        }
        
        return new Date(dateStr)
    } catch {
        return null
    }
}

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .trim()
}

async function generateUniqueSlug(title: string, originalId?: string): Promise<string> {
    const baseSlug = generateSlug(title)
    
    // Use original ID if provided, otherwise use timestamp
    const uniqueId = originalId || Date.now().toString()
    return `${baseSlug}-${uniqueId}`
}

export default properties