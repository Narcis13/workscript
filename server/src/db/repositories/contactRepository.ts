import { eq, desc, like, and, or, sql, count, lte, gte, isNull } from 'drizzle-orm';
import { db } from '../index';
import { contacts, properties, clientRequests, activities, agents, type Contact, type NewContact } from '../schema';

export class ContactRepository {
  async create(contact: NewContact): Promise<Contact> {
    try {
      const result = await db.insert(contacts).values(contact);
      
      // Get the inserted ID from the result
      const insertId = Array.isArray(result) && result[0] ? result[0].insertId : (result as any).insertId;
      console.log('Insert result:', { insertId, result });
      
      if (insertId) {
        const created = await this.findById(insertId);
        if (created) return created;
        console.log('Failed to find contact by ID:', insertId);
      }

      // Fallback: find by email if no insertId
      if (contact.email) {
        console.log('Trying to find by email:', contact.email);
        const created = await this.findByEmail(contact.email);
        if (created) return created;
      }
      
      // Fallback: find by phone if no email
      if (contact.phone) {
        console.log('Trying to find by phone:', contact.phone);
        const created = await this.findByPhone(contact.phone);
        if (created) return created;
      }
      
      // Log the contact data for debugging
      console.log('Contact data that failed to retrieve:', JSON.stringify(contact, null, 2));
      throw new Error(`Failed to retrieve created contact. InsertId: ${insertId}, Email: ${contact.email}, Phone: ${contact.phone}`);
    } catch (error) {
      // Provide more detailed error information
      if (error instanceof Error) {
        if (error.message.includes('Duplicate entry')) {
          throw new Error(`Contact already exists: ${error.message}`);
        }
        if (error.message.includes('cannot be null') || error.message.includes('NOT NULL')) {
          throw new Error(`Missing required field: ${error.message}`);
        }
        if (error.message.includes('foreign key constraint')) {
          throw new Error(`Invalid reference: ${error.message}`);
        }
        if (error.message.includes('Failed to retrieve created contact')) {
          throw error; // Re-throw our custom error with more details
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error('Failed to create contact');
    }
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
    const [contact] = await db.select().from(contacts).where(sql`RIGHT(${contacts.phone}, 9) = RIGHT(${phone}, 9)`);
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

  async findAllWithCounts(): Promise<(Contact & { propertiesCount: number; clientRequestsCount: number; needFollowUp: boolean; assignedAgentName: string | null })[]> {
    // Calculate cutoff dates for follow-up logic (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const requestAgeCutoff = cutoffDate.toISOString();
    const activityCutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    const result = await db
      .select({
        id: contacts.id,
        agencyId: contacts.agencyId,
        assignedAgentId: contacts.assignedAgentId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        whatsapp: contacts.whatsapp,
        contactType: contacts.contactType,
        source: contacts.source,
        sourceDetails: contacts.sourceDetails,
        interestedIn: contacts.interestedIn,
        budgetMin: contacts.budgetMin,
        budgetMax: contacts.budgetMax,
        preferredAreas: contacts.preferredAreas,
        propertyPreferences: contacts.propertyPreferences,
        urgencyLevel: contacts.urgencyLevel,
        buyingReadiness: contacts.buyingReadiness,
        preferredContactMethod: contacts.preferredContactMethod,
        bestTimeToCall: contacts.bestTimeToCall,
        communicationNotes: contacts.communicationNotes,
        aiLeadScore: contacts.aiLeadScore,
        qualificationStatus: contacts.qualificationStatus,
        conversionProbability: contacts.conversionProbability,
        lastInteractionScore: contacts.lastInteractionScore,
        lastContactAt: contacts.lastContactAt,
        lastResponseAt: contacts.lastResponseAt,
        nextFollowUpAt: contacts.nextFollowUpAt,
        interactionCount: contacts.interactionCount,
        emailCount: contacts.emailCount,
        callCount: contacts.callCount,
        whatsappCount: contacts.whatsappCount,
        meetingCount: contacts.meetingCount,
        occupation: contacts.occupation,
        company: contacts.company,
        notes: contacts.notes,
        tags: contacts.tags,
        isBlacklisted: contacts.isBlacklisted,
        gdprConsent: contacts.gdprConsent,
        marketingConsent: contacts.marketingConsent,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        propertiesCount: sql<number>`COALESCE(${sql`p.property_count`}, 0)`.as('propertiesCount'),
        clientRequestsCount: sql<number>`COALESCE(${sql`cr.request_count`}, 0)`.as('clientRequestsCount'),
        needFollowUp: sql<boolean>`CASE WHEN COALESCE(${sql`fu.has_followup_needed`}, 0) > 0 THEN 1 ELSE 0 END`.as('needFollowUp'),
        assignedAgentName: sql<string>`CASE WHEN ${agents.firstName} IS NOT NULL THEN CONCAT(${agents.firstName}, ' ', COALESCE(${agents.lastName}, '')) ELSE NULL END`.as('assignedAgentName')
      })
      .from(contacts)
      .leftJoin(agents, eq(contacts.assignedAgentId, agents.id))
      .leftJoin(
        sql`(SELECT owner_contact_id, COUNT(*) as property_count FROM properties WHERE owner_contact_id IS NOT NULL GROUP BY owner_contact_id) p`,
        sql`p.owner_contact_id = ${contacts.id}`
      )
      .leftJoin(
        sql`(SELECT contact_id, COUNT(*) as request_count FROM client_requests GROUP BY contact_id) cr`,
        sql`cr.contact_id = ${contacts.id}`
      )
      .leftJoin(
        sql`(
          SELECT 
            contact_id, 
            COUNT(*) as has_followup_needed
          FROM client_requests cr_fu
          WHERE 
            cr_fu.status IN ('nou', 'in_procesare')
            AND cr_fu.created_at <= ${requestAgeCutoff}
            AND NOT EXISTS (
              SELECT 1 FROM activities a 
              WHERE a.request_id = cr_fu.id 
              AND STR_TO_DATE(a.scheduled_date, '%d-%m-%Y') >= ${activityCutoffDateStr}
            )
          GROUP BY contact_id
        ) fu`,
        sql`fu.contact_id = ${contacts.id}`
      )
      .orderBy(desc(contacts.createdAt));

    return result as (Contact & { propertiesCount: number; clientRequestsCount: number; needFollowUp: boolean; assignedAgentName: string | null })[];
  }

  async findAllPaginated(limit: number = 15, offset: number = 0): Promise<{ data: Contact[]; total: number }> {
    // Get total count
    const countResults = await db.select({ count: sql<number>`count(*)` }).from(contacts);
    const total = countResults[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select()
      .from(contacts)
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  async findAllPaginatedWithCounts(limit: number = 15, offset: number = 0): Promise<{ 
    data: (Contact & { propertiesCount: number; clientRequestsCount: number; needFollowUp: boolean; assignedAgentName: string | null })[];
    total: number 
  }> {
    // Get total count
    const countResults = await db.select({ count: sql<number>`count(*)` }).from(contacts);
    const total = countResults[0]?.count || 0;

    // Calculate cutoff dates for follow-up logic (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const requestAgeCutoff = cutoffDate.toISOString();
    const activityCutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get paginated data with counts
    const data = await db
      .select({
        id: contacts.id,
        agencyId: contacts.agencyId,
        assignedAgentId: contacts.assignedAgentId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        whatsapp: contacts.whatsapp,
        contactType: contacts.contactType,
        source: contacts.source,
        sourceDetails: contacts.sourceDetails,
        interestedIn: contacts.interestedIn,
        budgetMin: contacts.budgetMin,
        budgetMax: contacts.budgetMax,
        preferredAreas: contacts.preferredAreas,
        propertyPreferences: contacts.propertyPreferences,
        urgencyLevel: contacts.urgencyLevel,
        buyingReadiness: contacts.buyingReadiness,
        preferredContactMethod: contacts.preferredContactMethod,
        bestTimeToCall: contacts.bestTimeToCall,
        communicationNotes: contacts.communicationNotes,
        aiLeadScore: contacts.aiLeadScore,
        qualificationStatus: contacts.qualificationStatus,
        conversionProbability: contacts.conversionProbability,
        lastInteractionScore: contacts.lastInteractionScore,
        lastContactAt: contacts.lastContactAt,
        lastResponseAt: contacts.lastResponseAt,
        nextFollowUpAt: contacts.nextFollowUpAt,
        interactionCount: contacts.interactionCount,
        emailCount: contacts.emailCount,
        callCount: contacts.callCount,
        whatsappCount: contacts.whatsappCount,
        meetingCount: contacts.meetingCount,
        occupation: contacts.occupation,
        company: contacts.company,
        notes: contacts.notes,
        tags: contacts.tags,
        isBlacklisted: contacts.isBlacklisted,
        gdprConsent: contacts.gdprConsent,
        marketingConsent: contacts.marketingConsent,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        propertiesCount: sql<number>`COALESCE(${sql`p.property_count`}, 0)`.as('propertiesCount'),
        clientRequestsCount: sql<number>`COALESCE(${sql`cr.request_count`}, 0)`.as('clientRequestsCount'),
        needFollowUp: sql<boolean>`CASE WHEN COALESCE(${sql`fu.has_followup_needed`}, 0) > 0 THEN 1 ELSE 0 END`.as('needFollowUp'),
        assignedAgentName: sql<string>`CASE WHEN ${agents.firstName} IS NOT NULL THEN CONCAT(${agents.firstName}, ' ', COALESCE(${agents.lastName}, '')) ELSE NULL END`.as('assignedAgentName')
      })
      .from(contacts)
      .leftJoin(agents, eq(contacts.assignedAgentId, agents.id))
      .leftJoin(
        sql`(SELECT owner_contact_id, COUNT(*) as property_count FROM properties WHERE owner_contact_id IS NOT NULL GROUP BY owner_contact_id) p`,
        sql`p.owner_contact_id = ${contacts.id}`
      )
      .leftJoin(
        sql`(SELECT contact_id, COUNT(*) as request_count FROM client_requests GROUP BY contact_id) cr`,
        sql`cr.contact_id = ${contacts.id}`
      )
      .leftJoin(
        sql`(
          SELECT 
            contact_id, 
            COUNT(*) as has_followup_needed
          FROM client_requests cr_fu
          WHERE 
            cr_fu.status IN ('nou', 'in_procesare')
            AND cr_fu.created_at <= ${requestAgeCutoff}
            AND NOT EXISTS (
              SELECT 1 FROM activities a 
              WHERE a.request_id = cr_fu.id 
              AND STR_TO_DATE(a.scheduled_date, '%d-%m-%Y') >= ${activityCutoffDateStr}
            )
          GROUP BY contact_id
        ) fu`,
        sql`fu.contact_id = ${contacts.id}`
      )
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);

    return { 
      data: data as (Contact & { propertiesCount: number; clientRequestsCount: number; needFollowUp: boolean; assignedAgentName: string | null })[], 
      total 
    };
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