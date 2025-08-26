import { eq, desc, like } from 'drizzle-orm';
import { db } from '../index';
import { agencies, type Agency, type NewAgency } from '../schema';

export class AgencyRepository {
  async create(agency: NewAgency): Promise<Agency> {
    await db.insert(agencies).values(agency);
    // For MySQL with serial ID, get the last inserted record
    const created = await this.findByName(agency.name);
    if (!created) throw new Error('Failed to create agency');
    return created;
  }

  async findById(id: number): Promise<Agency | null> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
    return agency || null;
  }

  async findByName(name: string): Promise<Agency | null> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.name, name));
    return agency || null;
  }

  async findByEmail(email: string): Promise<Agency | null> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.email, email));
    return agency || null;
  }

  async findAll(): Promise<Agency[]> {
    return db.select().from(agencies).orderBy(desc(agencies.createdAt));
  }

  async findActive(): Promise<Agency[]> {
    return db.select().from(agencies).where(eq(agencies.isActive, true)).orderBy(desc(agencies.createdAt));
  }

  async search(searchTerm: string): Promise<Agency[]> {
    return db.select()
      .from(agencies)
      .where(like(agencies.name, `%${searchTerm}%`))
      .orderBy(desc(agencies.createdAt));
  }

  async update(id: number, updates: Partial<NewAgency>): Promise<Agency | null> {
    await db.update(agencies).set(updates).where(eq(agencies.id, id));
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(agencies).where(eq(agencies.id, id));
    return (result as any).affectedRows > 0;
  }

  async deactivate(id: number): Promise<Agency | null> {
    return this.update(id, { isActive: false });
  }

  async activate(id: number): Promise<Agency | null> {
    return this.update(id, { isActive: true });
  }
}