import { eq, desc, like } from 'drizzle-orm';
import { db } from '../index';
import { aiAgents, type AiAgent, type NewAiAgent } from '../schema';

export class AiAgentsRepository {
  async create(aiAgent: NewAiAgent): Promise<AiAgent> {
    await db.insert(aiAgents).values(aiAgent);
    // For varchar ID, find by the ID that was inserted
    const created = await this.findById(aiAgent.id!);
    if (!created) throw new Error('Failed to create AI agent');
    return created;
  }

  async findById(id: string): Promise<AiAgent | null> {
    const [aiAgent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
    return aiAgent || null;
  }

  async findByName(agentName: string): Promise<AiAgent | null> {
    const [aiAgent] = await db.select().from(aiAgents).where(eq(aiAgents.agentName, agentName));
    return aiAgent || null;
  }

  async findByModel(aiModel: string): Promise<AiAgent[]> {
    return db.select()
      .from(aiAgents)
      .where(eq(aiAgents.aiModel, aiModel))
      .orderBy(desc(aiAgents.createdAt));
  }

  async findAll(): Promise<AiAgent[]> {
    return db.select().from(aiAgents).orderBy(desc(aiAgents.createdAt));
  }

  async search(searchTerm: string): Promise<AiAgent[]> {
    return db.select()
      .from(aiAgents)
      .where(
        like(aiAgents.agentName, `%${searchTerm}%`) ||
        like(aiAgents.description, `%${searchTerm}%`)
      )
      .orderBy(desc(aiAgents.createdAt));
  }

  async update(id: string, updates: Partial<NewAiAgent>): Promise<AiAgent | null> {
    await db.update(aiAgents).set(updates).where(eq(aiAgents.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(aiAgents).where(eq(aiAgents.id, id));
    return (result as any).affectedRows > 0;
  }

  async updateSystemPrompt(id: string, systemPrompt: string): Promise<AiAgent | null> {
    return this.update(id, { systemPrompt });
  }

  async updateModel(id: string, aiModel: string): Promise<AiAgent | null> {
    return this.update(id, { aiModel });
  }
}