import { eq, desc, like, and } from 'drizzle-orm';
import { db } from '../index';
import { agents } from '../schema';
export class AgentsRepository {
    async create(agent) {
        await db.insert(agents).values(agent);
        // For MySQL with serial ID, get the last inserted record
        const created = await this.findByEmail(agent.email);
        if (!created)
            throw new Error('Failed to create agent');
        return created;
    }
    async findById(id) {
        const [agent] = await db.select().from(agents).where(eq(agents.id, id));
        return agent || null;
    }
    async findByEmail(email) {
        const [agent] = await db.select().from(agents).where(eq(agents.email, email));
        return agent || null;
    }
    async findByPhone(phone) {
        const [agent] = await db.select().from(agents).where(eq(agents.phone, phone));
        return agent || null;
    }
    async findByFirstName(firstName) {
        const [agent] = await db.select().from(agents).where(eq(agents.firstName, firstName));
        return agent || null;
    }
    async findAll() {
        return db.select().from(agents).orderBy(desc(agents.createdAt));
    }
    async findByAgency(agencyId) {
        return db.select()
            .from(agents)
            .where(eq(agents.agencyId, agencyId))
            .orderBy(desc(agents.createdAt));
    }
    async findActive() {
        return db.select()
            .from(agents)
            .where(eq(agents.isActive, true))
            .orderBy(desc(agents.createdAt));
    }
    async findActiveByAgency(agencyId) {
        return db.select()
            .from(agents)
            .where(and(eq(agents.agencyId, agencyId), eq(agents.isActive, true)))
            .orderBy(desc(agents.createdAt));
    }
    async findByRole(role) {
        return db.select()
            .from(agents)
            .where(eq(agents.role, role))
            .orderBy(desc(agents.createdAt));
    }
    async search(searchTerm) {
        return db.select()
            .from(agents)
            .where(like(agents.firstName, `%${searchTerm}%`) ||
            like(agents.lastName, `%${searchTerm}%`) ||
            like(agents.email, `%${searchTerm}%`))
            .orderBy(desc(agents.createdAt));
    }
    async searchByAgency(agencyId, searchTerm) {
        return db.select()
            .from(agents)
            .where(and(eq(agents.agencyId, agencyId), like(agents.firstName, `%${searchTerm}%`) ||
            like(agents.lastName, `%${searchTerm}%`) ||
            like(agents.email, `%${searchTerm}%`)))
            .orderBy(desc(agents.createdAt));
    }
    async update(id, updates) {
        await db.update(agents).set(updates).where(eq(agents.id, id));
        return this.findById(id);
    }
    async delete(id) {
        const result = await db.delete(agents).where(eq(agents.id, id));
        return result.affectedRows > 0;
    }
    async deactivate(id) {
        return this.update(id, { isActive: false });
    }
    async activate(id) {
        return this.update(id, { isActive: true });
    }
    async updateLastLogin(id) {
        return this.update(id, { lastLoginAt: new Date() });
    }
    async updateCommission(id, commission) {
        return this.update(id, { commission });
    }
}
