import { Hono } from 'hono';
import { AgentsRepository } from '../../../db/repositories/agentsRepository';
const agents = new Hono();
const agentsRepository = new AgentsRepository();
// Get all agencies endpoint
agents.get('/', async (c) => {
    try {
        const allAgents = await agentsRepository.findAll();
        return c.json({
            success: true,
            count: allAgents.length,
            data: allAgents
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
agents.post('/import', async (c) => {
    try {
        const body = await c.req.json();
        //console.log('Import request body:', JSON.stringify(body, null, 2))
        // Ensure body is an array
        if (!Array.isArray(body)) {
            return c.json({
                error: 'Expected an array of agent objects',
                success: false
            }, { status: 400 });
        }
        let processed = 0;
        let inserted = 0;
        let skipped = 0;
        const errors = [];
        for (const item of body) {
            processed++;
            try {
                // Extract and validate required fields
                const nume = item.Nume?.trim();
                const email = item.Email?.trim();
                const phone = item.Telefon?.trim();
                // Skip if missing essential data
                if (!nume || !email || !phone) {
                    skipped++;
                    errors.push(`Row ${processed}: Missing required fields (Nume: ${nume}, Email: ${email}, Phone: ${phone})`);
                    continue;
                }
                // Check if agent already exists by phone
                const existingAgent = await agentsRepository.findByPhone(phone);
                if (existingAgent) {
                    skipped++;
                    console.log(`Skipping duplicate agent with phone: ${phone}`);
                    continue;
                }
                // Parse first name from Nume (first two words)
                const nameParts = nume.split(' ').filter((part) => part.length > 0);
                const firstName = nameParts.slice(0, 2).join(' ');
                const lastName = nameParts.slice(2).join(' ') || '';
                // Create new agent object
                const newAgent = {
                    agencyId: 1, // Default agency ID - you might want to make this configurable
                    firstName,
                    lastName,
                    email,
                    phone,
                    role: 'agent',
                    isActive: true
                };
                // Insert into database
                await agentsRepository.create(newAgent);
                inserted++;
            }
            catch (itemError) {
                skipped++;
                errors.push(`Row ${processed}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
            }
        }
        return c.json({
            success: true,
            message: 'Agents imported successfully',
            imported: inserted,
            skipped: skipped,
            errors: errors,
            total: processed
        });
    }
    catch (error) {
        console.error('Failed to process import:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
        }, { status: 500 });
    }
});
export default agents;
