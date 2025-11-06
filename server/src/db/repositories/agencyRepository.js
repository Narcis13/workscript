import { eq, desc, like } from 'drizzle-orm';
import { db } from '../index';
import { agencies } from '../schema';
export class AgencyRepository {
    async create(agency) {
        await db.insert(agencies).values(agency);
        // For MySQL with serial ID, get the last inserted record
        const created = await this.findByName(agency.name);
        if (!created)
            throw new Error('Failed to create agency');
        return created;
    }
    async findById(id) {
        const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
        return agency || null;
    }
    async findByName(name) {
        const [agency] = await db.select().from(agencies).where(eq(agencies.name, name));
        return agency || null;
    }
    async findByEmail(email) {
        const [agency] = await db.select().from(agencies).where(eq(agencies.email, email));
        return agency || null;
    }
    async findAll() {
        return db.select().from(agencies).orderBy(desc(agencies.createdAt));
    }
    async findActive() {
        return db.select().from(agencies).where(eq(agencies.isActive, true)).orderBy(desc(agencies.createdAt));
    }
    async search(searchTerm) {
        return db.select()
            .from(agencies)
            .where(like(agencies.name, `%${searchTerm}%`))
            .orderBy(desc(agencies.createdAt));
    }
    async update(id, updates) {
        await db.update(agencies).set(updates).where(eq(agencies.id, id));
        return this.findById(id);
    }
    async delete(id) {
        const result = await db.delete(agencies).where(eq(agencies.id, id));
        return result.affectedRows > 0;
    }
    async deactivate(id) {
        return this.update(id, { isActive: false });
    }
    async activate(id) {
        return this.update(id, { isActive: true });
    }
}
