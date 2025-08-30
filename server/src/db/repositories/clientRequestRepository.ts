import { eq, desc, like, and, or, lte, gte } from 'drizzle-orm';
import { db } from '../index';
import { clientRequests, type ClientRequest, type NewClientRequest } from '../schema';

export class ClientRequestRepository {
  async create(request: NewClientRequest): Promise<ClientRequest> {
    await db.insert(clientRequests).values(request);
    // Find the created record by contact and title (should be unique enough)
    const created = await this.findByContactAndTitle(request.contactId, request.title);
    if (!created) throw new Error('Failed to create client request');
    return created;
  }

  async findById(id: number): Promise<ClientRequest | null> {
    const [request] = await db.select().from(clientRequests).where(eq(clientRequests.id, id));
    return request || null;
  }

  async findByContactAndTitle(contactId: number, title: string): Promise<ClientRequest | null> {
    const [request] = await db.select()
      .from(clientRequests)
      .where(and(eq(clientRequests.contactId, contactId), eq(clientRequests.title, title)))
      .orderBy(desc(clientRequests.createdAt))
      .limit(1);
    return request || null;
  }

  async findByRequestCode(requestCode: string): Promise<ClientRequest | null> {
    const [request] = await db.select()
      .from(clientRequests)
      .where(eq(clientRequests.requestCode, requestCode))
      .limit(1);
    return request || null;
  }

  async findByContact(contactId: number): Promise<ClientRequest[]> {
    return db.select()
      .from(clientRequests)
      .where(eq(clientRequests.contactId, contactId))
      .orderBy(desc(clientRequests.createdAt));
  }

  async findByAgency(agencyId: number): Promise<ClientRequest[]> {
    return db.select()
      .from(clientRequests)
      .where(eq(clientRequests.agencyId, agencyId))
      .orderBy(desc(clientRequests.createdAt));
  }

  async findByAgent(agentId: number): Promise<ClientRequest[]> {
    return db.select()
      .from(clientRequests)
      .where(eq(clientRequests.assignedAgentId, agentId))
      .orderBy(desc(clientRequests.createdAt));
  }

  async findByStatus(status: string, agencyId?: number): Promise<ClientRequest[]> {
    const whereClause = agencyId 
      ? and(eq(clientRequests.status, status as any), eq(clientRequests.agencyId, agencyId))
      : eq(clientRequests.status, status as any);
    
    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.priority), desc(clientRequests.createdAt));
  }

  async findNew(agencyId?: number): Promise<ClientRequest[]> {
    return this.findByStatus('nou', agencyId);
  }

  async findInProgress(agencyId?: number): Promise<ClientRequest[]> {
    return this.findByStatus('in_procesare', agencyId);
  }

  async findByPriority(priority: string, agencyId?: number): Promise<ClientRequest[]> {
    const whereClause = agencyId 
      ? and(eq(clientRequests.priority, priority as any), eq(clientRequests.agencyId, agencyId))
      : eq(clientRequests.priority, priority as any);
    
    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.createdAt));
  }

  async findUrgent(agencyId?: number): Promise<ClientRequest[]> {
    const urgentCondition = or(
      eq(clientRequests.priority, 'urgent'),
      eq(clientRequests.urgencyLevel, 'urgent'),
      eq(clientRequests.urgencyLevel, 'foarte_urgent')
    );

    const whereClause = agencyId 
      ? and(urgentCondition, eq(clientRequests.agencyId, agencyId))
      : urgentCondition;
    
    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.urgencyLevel), desc(clientRequests.createdAt));
  }

  async findByRequestType(requestType: string, agencyId?: number): Promise<ClientRequest[]> {
    const whereClause = agencyId 
      ? and(eq(clientRequests.requestType, requestType as any), eq(clientRequests.agencyId, agencyId))
      : eq(clientRequests.requestType, requestType as any);
    
    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.createdAt));
  }

  async findByPropertyType(propertyType: string, agencyId?: number): Promise<ClientRequest[]> {
    const whereClause = agencyId 
      ? and(eq(clientRequests.propertyType, propertyType as any), eq(clientRequests.agencyId, agencyId))
      : eq(clientRequests.propertyType, propertyType as any);
    
    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.createdAt));
  }

  async findByBudgetRange(minBudget: number, maxBudget: number, agencyId?: number): Promise<ClientRequest[]> {
    let whereClause = and(
      gte(clientRequests.budgetMax, minBudget.toString()),
      lte(clientRequests.budgetMin, maxBudget.toString())
    );
    
    if (agencyId) {
      whereClause = and(whereClause, eq(clientRequests.agencyId, agencyId));
    }

    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.createdAt));
  }

  async findExpiringSoon(days = 7, agencyId?: number): Promise<ClientRequest[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    let whereClause = and(
      lte(clientRequests.deadlineDate, futureDate.toISOString() as any),
      gte(clientRequests.deadlineDate, new Date().toISOString() as any)
    );
    
    if (agencyId) {
      whereClause = and(whereClause, eq(clientRequests.agencyId, agencyId));
    }

    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(clientRequests.deadlineDate);
  }

  async findAutoMatchEnabled(agencyId?: number): Promise<ClientRequest[]> {
    const whereClause = agencyId 
      ? and(eq(clientRequests.autoMatchEnabled, true), eq(clientRequests.agencyId, agencyId))
      : eq(clientRequests.autoMatchEnabled, true);
    
    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.createdAt));
  }

  async search(searchTerm: string, agencyId?: number): Promise<ClientRequest[]> {
    const searchCondition = or(
      like(clientRequests.title, `%${searchTerm}%`),
      like(clientRequests.description, `%${searchTerm}%`),
      like(clientRequests.internalNotes, `%${searchTerm}%`),
      like(clientRequests.clientNotes, `%${searchTerm}%`)
    );

    const whereClause = agencyId 
      ? and(searchCondition, eq(clientRequests.agencyId, agencyId))
      : searchCondition;

    return db.select()
      .from(clientRequests)
      .where(whereClause)
      .orderBy(desc(clientRequests.createdAt));
  }

  async findAll(): Promise<ClientRequest[]> {
    return db.select().from(clientRequests).orderBy(desc(clientRequests.createdAt));
  }

  async update(id: number, updates: Partial<NewClientRequest>): Promise<ClientRequest | null> {
    await db.update(clientRequests).set(updates).where(eq(clientRequests.id, id));
    return this.findById(id);
  }

  async updateStatus(id: number, status: string): Promise<ClientRequest | null> {
    return this.update(id, { 
      status: status as any,
      updatedAt: new Date().toISOString() as any 
    });
  }

  async assignToAgent(id: number, agentId: number): Promise<ClientRequest | null> {
    return this.update(id, { assignedAgentId: agentId });
  }

  async updatePriority(id: number, priority: string): Promise<ClientRequest | null> {
    return this.update(id, { priority: priority as any });
  }

  async updateUrgencyLevel(id: number, urgencyLevel: string): Promise<ClientRequest | null> {
    return this.update(id, { urgencyLevel: urgencyLevel as any });
  }

  async recordMatch(id: number): Promise<ClientRequest | null> {
    const request = await this.findById(id);
    if (!request) return null;
    
    return this.update(id, { 
      matchCount: (request.matchCount || 0) + 1,
      lastMatchedAt: new Date().toISOString() as any 
    });
  }

  async updateFollowUp(id: number, nextFollowUpAt: Date, notes?: string): Promise<ClientRequest | null> {
    const updates: Partial<NewClientRequest> = {
      nextFollowUpAt: nextFollowUpAt.toISOString() as any,
      lastContactAt: new Date().toISOString() as any
    };
    
    if (notes) {
      updates.internalNotes = notes;
    }
    
    return this.update(id, updates);
  }

  async enableAutoMatch(id: number): Promise<ClientRequest | null> {
    return this.update(id, { autoMatchEnabled: true });
  }

  async disableAutoMatch(id: number): Promise<ClientRequest | null> {
    return this.update(id, { autoMatchEnabled: false });
  }

  async markAsFinalized(id: number): Promise<ClientRequest | null> {
    return this.updateStatus(id, 'finalizat');
  }

  async markAsCanceled(id: number, reason?: string): Promise<ClientRequest | null> {
    const updates: Partial<NewClientRequest> = {
      status: 'anulat'
    };
    
    if (reason) {
      updates.internalNotes = reason;
    }
    
    return this.update(id, updates);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(clientRequests).where(eq(clientRequests.id, id));
    return (result as any).affectedRows > 0;
  }
}