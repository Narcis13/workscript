import { Hono } from 'hono';
import { AgencyRepository } from '../../../db/repositories/agencyRepository';
const agencies = new Hono();
const agencyRepository = new AgencyRepository();
// Get all agencies endpoint
agencies.get('/', async (c) => {
    try {
        const allAgencies = await agencyRepository.findAll();
        return c.json({
            success: true,
            count: allAgencies.length,
            data: allAgencies
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
export default agencies;
