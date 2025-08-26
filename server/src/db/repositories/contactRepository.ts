import { eq, desc, like, and, or } from 'drizzle-orm';
import { db } from '../index';
import { contacts, type Contact, type NewContact } from '../schema';

export class ContactRepository {
  async create(contact: NewContact): Promise<Contact> {
    await db.insert(contacts).values(contact);
    // For MySQL with serial ID, we need to find the created record
    if (contact.email) {
      const created = await this.findByEmail(contact.email);
      if (created) return created;
    }
    // Fallback: find by phone if no email
    if (contact.phone) {
      const created = await this.findByPhone(contact.phone);
      if (created) return created;
    }
    throw new Error('Failed to create contact');
  }

  async findById(id: number): Promise<Contact | null> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || null;
  }

  async findByEmail(email: string): Promise<Contact | null> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.email, email));
    return contact || null;
  }

  async findByPhone(phone: string): Promise<Contact | null> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.phone, phone));
    return contact || null;
  }

  async findByAgency(agencyId: number): Promise<Contact[]> {
    return db.select()
      .from(contacts)
      .where(eq(contacts.agencyId, agencyId))
      .orderBy(desc(contacts.createdAt));
  }

  async findByAgent(agentId: number): Promise<Contact[]> {
    return db.select()
      .from(contacts)
      .where(eq(contacts.assignedAgentId, agentId))
      .orderBy(desc(contacts.createdAt));
  }

  async findByType(contactType: string, agencyId?: number): Promise<Contact[]> {
    const whereClause = agencyId 
      ? and(eq(contacts.contactType, contactType as any), eq(contacts.agencyId, agencyId))
      : eq(contacts.contactType, contactType as any);
    
    return db.select()
      .from(contacts)
      .where(whereClause)
      .orderBy(desc(contacts.aiLeadScore), desc(contacts.createdAt));
  }

  async findLeads(agencyId: number): Promise<Contact[]> {
    return db.select()
      .from(contacts)
      .where(and(
        eq(contacts.agencyId, agencyId),
        eq(contacts.contactType, 'lead')
      ))
      .orderBy(desc(contacts.aiLeadScore), desc(contacts.createdAt));
  }

  async findHotLeads(agencyId: number, minScore = 7.0): Promise<Contact[]> {
    return db.select()
      .from(contacts)
      .where(and(
        eq(contacts.agencyId, agencyId),
        eq(contacts.qualificationStatus, 'hot_lead')
      ))
      .orderBy(desc(contacts.aiLeadScore), desc(contacts.createdAt));
  }

  async search(searchTerm: string, agencyId?: number): Promise<Contact[]> {
    const searchCondition = or(
      like(contacts.firstName, `%${searchTerm}%`),
      like(contacts.lastName, `%${searchTerm}%`),
      like(contacts.email, `%${searchTerm}%`),
      like(contacts.phone, `%${searchTerm}%`)
    );

    const whereClause = agencyId 
      ? and(searchCondition, eq(contacts.agencyId, agencyId))
      : searchCondition;

    return db.select()
      .from(contacts)
      .where(whereClause)
      .orderBy(desc(contacts.createdAt));
  }

  async findAll(): Promise<Contact[]> {
    return db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }

  async update(id: number, updates: Partial<NewContact>): Promise<Contact | null> {
    await db.update(contacts).set(updates).where(eq(contacts.id, id));
    return this.findById(id);
  }

  async updateLeadScore(id: number, score: number): Promise<Contact | null> {
    return this.update(id, { aiLeadScore: score.toString() });
  }

  async assignToAgent(id: number, agentId: number): Promise<Contact | null> {
    return this.update(id, { assignedAgentId: agentId });
  }

  async updateQualification(id: number, status: string): Promise<Contact | null> {
    return this.update(id, { qualificationStatus: status as any });
  }

  async recordInteraction(id: number, type: 'email' | 'call' | 'whatsapp' | 'meeting'): Promise<Contact | null> {
    const contact = await this.findById(id);
    if (!contact) return null;

    const updates: Partial<NewContact> = {
      lastContactAt: new Date().toISOString() as any,
      interactionCount: (contact.interactionCount || 0) + 1,
    };

    // Update specific interaction counters
    switch (type) {
      case 'email':
        updates.emailCount = (contact.emailCount || 0) + 1;
        break;
      case 'call':
        updates.callCount = (contact.callCount || 0) + 1;
        break;
      case 'whatsapp':
        updates.whatsappCount = (contact.whatsappCount || 0) + 1;
        break;
      case 'meeting':
        updates.meetingCount = (contact.meetingCount || 0) + 1;
        break;
    }

    return this.update(id, updates);
  }

  async blacklist(id: number): Promise<Contact | null> {
    return this.update(id, { isBlacklisted: true });
  }

  async unblacklist(id: number): Promise<Contact | null> {
    return this.update(id, { isBlacklisted: false });
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return (result as any).affectedRows > 0;
  }
}