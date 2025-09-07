import { eq, desc, like, and } from 'drizzle-orm';
import { db } from '../index';
import { agents, type Agent, type NewAgent } from '../schema';

export class AgentsRepository {
  async create(agent: NewAgent): Promise<Agent> {
    await db.insert(agents).values(agent);
    // For MySQL with serial ID, get the last inserted record
    const created = await this.findByEmail(agent.email);
    if (!created) throw new Error('Failed to create agent');
    return created;
  }

  async findById(id: number): Promise<Agent | null> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || null;
  }

  async findByEmail(email: string): Promise<Agent | null> {
    const [agent] = await db.select().from(agents).where(eq(agents.email, email));
    return agent || null;
  }

  async findByPhone(phone: string): Promise<Agent | null> {
    const [agent] = await db.select().from(agents).where(eq(agents.phone, phone));
    return agent || null;
  }

  async findByFirstName(firstName: string): Promise<Agent | null> {
    const [agent] = await db.select().from(agents).where(eq(agents.firstName, firstName));
    return agent || null;
  }

  async findAll(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  async findByAgency(agencyId: number): Promise<Agent[]> {
    return db.select()
      .from(agents)
      .where(eq(agents.agencyId, agencyId))
      .orderBy(desc(agents.createdAt));
  }

  async findActive(): Promise<Agent[]> {
    return db.select()
      .from(agents)
      .where(eq(agents.isActive, true))
      .orderBy(desc(agents.createdAt));
  }

  async findActiveByAgency(agencyId: number): Promise<Agent[]> {
    return db.select()
      .from(agents)
      .where(and(eq(agents.agencyId, agencyId), eq(agents.isActive, true)))
      .orderBy(desc(agents.createdAt));
  }

  async findByRole(role: 'agent' | 'senior_agent' | 'team_leader' | 'manager' | 'admin'): Promise<Agent[]> {
    return db.select()
      .from(agents)
      .where(eq(agents.role, role))
      .orderBy(desc(agents.createdAt));
  }

  async search(searchTerm: string): Promise<Agent[]> {
    return db.select()
      .from(agents)
      .where(
        like(agents.firstName, `%${searchTerm}%`) ||
        like(agents.lastName, `%${searchTerm}%`) ||
        like(agents.email, `%${searchTerm}%`)
      )
      .orderBy(desc(agents.createdAt));
  }

  async searchByAgency(agencyId: number, searchTerm: string): Promise<Agent[]> {
    return db.select()
      .from(agents)
      .where(
        and(
          eq(agents.agencyId, agencyId),
          like(agents.firstName, `%${searchTerm}%`) ||
          like(agents.lastName, `%${searchTerm}%`) ||
          like(agents.email, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(agents.createdAt));
  }

  async update(id: number, updates: Partial<NewAgent>): Promise<Agent | null> {
    await db.update(agents).set(updates).where(eq(agents.id, id));
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id));
    return (result as any).affectedRows > 0;
  }

  async deactivate(id: number): Promise<Agent | null> {
    return this.update(id, { isActive: false });
  }

  async activate(id: number): Promise<Agent | null> {
    return this.update(id, { isActive: true });
  }

  async updateLastLogin(id: number): Promise<Agent | null> {
    return this.update(id, { lastLoginAt: new Date() });
  }

  async updateCommission(id: number, commission: string): Promise<Agent | null> {
    return this.update(id, { commission });
  }
}