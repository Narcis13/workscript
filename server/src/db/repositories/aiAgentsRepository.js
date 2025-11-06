import { eq, desc, like } from 'drizzle-orm';
import { db } from '../index';
import { aiAgents } from '../schema';
export class AiAgentsRepository {
    async create(aiAgent) {
        await db.insert(aiAgents).values(aiAgent);
        // For varchar ID, find by the ID that was inserted
        const created = await this.findById(aiAgent.id);
        if (!created)
            throw new Error('Failed to create AI agent');
        return created;
    }
    async findById(id) {
        const [aiAgent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
        return aiAgent || null;
    }
    async findByName(agentName) {
        const [aiAgent] = await db.select().from(aiAgents).where(eq(aiAgents.agentName, agentName));
        return aiAgent || null;
    }
    async findByModel(aiModel) {
        return db.select()
            .from(aiAgents)
            .where(eq(aiAgents.aiModel, aiModel))
            .orderBy(desc(aiAgents.createdAt));
    }
    async findAll() {
        return db.select().from(aiAgents).orderBy(desc(aiAgents.createdAt));
    }
    async search(searchTerm) {
        return db.select()
            .from(aiAgents)
            .where(like(aiAgents.agentName, `%${searchTerm}%`) ||
            like(aiAgents.description, `%${searchTerm}%`))
            .orderBy(desc(aiAgents.createdAt));
    }
    async update(id, updates) {
        await db.update(aiAgents).set(updates).where(eq(aiAgents.id, id));
        return this.findById(id);
    }
    async delete(id) {
        const result = await db.delete(aiAgents).where(eq(aiAgents.id, id));
        return result.affectedRows > 0;
    }
    async updateSystemPrompt(id, systemPrompt) {
        return this.update(id, { systemPrompt });
    }
    async updateModel(id, aiModel) {
        return this.update(id, { aiModel });
    }
}
