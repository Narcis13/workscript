import { eq, desc, like, and, or, lte, gte, isNull, sql } from 'drizzle-orm';
import { db } from '../index';
import { clientRequests, activities } from '../schema';
export class ClientRequestRepository {
    async create(request) {
        await db.insert(clientRequests).values(request);
        // Find the created record by contact and title (should be unique enough)
        const created = await this.findByContactAndTitle(request.contactId, request.title);
        if (!created)
            throw new Error('Failed to create client request');
        return created;
    }
    async findById(id) {
        const [request] = await db.select().from(clientRequests).where(eq(clientRequests.id, id));
        return request || null;
    }
    async findByContactAndTitle(contactId, title) {
        const [request] = await db.select()
            .from(clientRequests)
            .where(and(eq(clientRequests.contactId, contactId), eq(clientRequests.title, title)))
            .orderBy(desc(clientRequests.createdAt))
            .limit(1);
        return request || null;
    }
    async findByRequestCode(requestCode) {
        const [request] = await db.select()
            .from(clientRequests)
            .where(eq(clientRequests.requestCode, requestCode))
            .limit(1);
        return request || null;
    }
    async findByContact(contactId) {
        return db.select()
            .from(clientRequests)
            .where(eq(clientRequests.contactId, contactId))
            .orderBy(desc(clientRequests.createdAt));
    }
    async findByAgency(agencyId) {
        return db.select()
            .from(clientRequests)
            .where(eq(clientRequests.agencyId, agencyId))
            .orderBy(desc(clientRequests.createdAt));
    }
    async findByAgent(agentId) {
        return db.select()
            .from(clientRequests)
            .where(eq(clientRequests.assignedAgentId, agentId))
            .orderBy(desc(clientRequests.createdAt));
    }
    async findByStatus(status, agencyId) {
        const whereClause = agencyId
            ? and(eq(clientRequests.status, status), eq(clientRequests.agencyId, agencyId))
            : eq(clientRequests.status, status);
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.priority), desc(clientRequests.createdAt));
    }
    async findNew(agencyId) {
        return this.findByStatus('nou', agencyId);
    }
    async findInProgress(agencyId) {
        return this.findByStatus('in_procesare', agencyId);
    }
    async findByPriority(priority, agencyId) {
        const whereClause = agencyId
            ? and(eq(clientRequests.priority, priority), eq(clientRequests.agencyId, agencyId))
            : eq(clientRequests.priority, priority);
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.createdAt));
    }
    async findUrgent(agencyId) {
        const urgentCondition = or(eq(clientRequests.priority, 'urgent'), eq(clientRequests.urgencyLevel, 'urgent'), eq(clientRequests.urgencyLevel, 'foarte_urgent'));
        const whereClause = agencyId
            ? and(urgentCondition, eq(clientRequests.agencyId, agencyId))
            : urgentCondition;
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.urgencyLevel), desc(clientRequests.createdAt));
    }
    async findByRequestType(requestType, agencyId) {
        const whereClause = agencyId
            ? and(eq(clientRequests.requestType, requestType), eq(clientRequests.agencyId, agencyId))
            : eq(clientRequests.requestType, requestType);
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.createdAt));
    }
    async findByPropertyType(propertyType, agencyId) {
        const whereClause = agencyId
            ? and(eq(clientRequests.propertyType, propertyType), eq(clientRequests.agencyId, agencyId))
            : eq(clientRequests.propertyType, propertyType);
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.createdAt));
    }
    async findByBudgetRange(minBudget, maxBudget, agencyId) {
        let whereClause = and(gte(clientRequests.budgetMax, minBudget.toString()), lte(clientRequests.budgetMin, maxBudget.toString()));
        if (agencyId) {
            whereClause = and(whereClause, eq(clientRequests.agencyId, agencyId));
        }
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.createdAt));
    }
    async findExpiringSoon(days = 7, agencyId) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        let whereClause = and(lte(clientRequests.deadlineDate, futureDate.toISOString()), gte(clientRequests.deadlineDate, new Date().toISOString()));
        if (agencyId) {
            whereClause = and(whereClause, eq(clientRequests.agencyId, agencyId));
        }
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(clientRequests.deadlineDate);
    }
    async findAutoMatchEnabled(agencyId) {
        const whereClause = agencyId
            ? and(eq(clientRequests.autoMatchEnabled, true), eq(clientRequests.agencyId, agencyId))
            : eq(clientRequests.autoMatchEnabled, true);
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.createdAt));
    }
    async search(searchTerm, agencyId) {
        const searchCondition = or(like(clientRequests.title, `%${searchTerm}%`), like(clientRequests.description, `%${searchTerm}%`), like(clientRequests.internalNotes, `%${searchTerm}%`), like(clientRequests.clientNotes, `%${searchTerm}%`));
        const whereClause = agencyId
            ? and(searchCondition, eq(clientRequests.agencyId, agencyId))
            : searchCondition;
        return db.select()
            .from(clientRequests)
            .where(whereClause)
            .orderBy(desc(clientRequests.createdAt));
    }
    async findAll() {
        return db.select().from(clientRequests).orderBy(desc(clientRequests.createdAt));
    }
    async update(id, updates) {
        await db.update(clientRequests).set(updates).where(eq(clientRequests.id, id));
        return this.findById(id);
    }
    async updateStatus(id, status) {
        return this.update(id, {
            status: status,
            updatedAt: new Date().toISOString()
        });
    }
    async assignToAgent(id, agentId) {
        return this.update(id, { assignedAgentId: agentId });
    }
    async updatePriority(id, priority) {
        return this.update(id, { priority: priority });
    }
    async updateUrgencyLevel(id, urgencyLevel) {
        return this.update(id, { urgencyLevel: urgencyLevel });
    }
    async recordMatch(id) {
        const request = await this.findById(id);
        if (!request)
            return null;
        return this.update(id, {
            matchCount: (request.matchCount || 0) + 1,
            lastMatchedAt: new Date().toISOString()
        });
    }
    async updateFollowUp(id, nextFollowUpAt, notes) {
        const updates = {
            nextFollowUpAt: nextFollowUpAt.toISOString(),
            lastContactAt: new Date().toISOString()
        };
        if (notes) {
            updates.internalNotes = notes;
        }
        return this.update(id, updates);
    }
    async enableAutoMatch(id) {
        return this.update(id, { autoMatchEnabled: true });
    }
    async disableAutoMatch(id) {
        return this.update(id, { autoMatchEnabled: false });
    }
    async markAsFinalized(id) {
        return this.updateStatus(id, 'finalizat');
    }
    async markAsCanceled(id, reason) {
        const updates = {
            status: 'anulat'
        };
        if (reason) {
            updates.internalNotes = reason;
        }
        return this.update(id, updates);
    }
    async findNeedingFollowUp(days = 30, agencyId) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        // Create cutoff date for request age (requests should be older than 30 days)
        const requestAgeCutoff = new Date();
        requestAgeCutoff.setDate(requestAgeCutoff.getDate() - 30);
        // Build the query with LEFT JOIN to find requests with no recent activities
        let whereCondition = and(
        // Only active requests
        or(eq(clientRequests.status, 'nou'), eq(clientRequests.status, 'in_procesare')), 
        // No recent activities
        isNull(activities.id), 
        // Request must be older than 30 days
        lte(clientRequests.createdAt, requestAgeCutoff));
        // Add agency filter if provided
        if (agencyId) {
            whereCondition = and(whereCondition, eq(clientRequests.agencyId, agencyId));
        }
        const results = await db
            .select({
            id: clientRequests.id,
            contactId: clientRequests.contactId,
            agencyId: clientRequests.agencyId,
            assignedAgentId: clientRequests.assignedAgentId,
            requestType: clientRequests.requestType,
            title: clientRequests.title,
            description: clientRequests.description,
            propertyType: clientRequests.propertyType,
            budgetMin: clientRequests.budgetMin,
            budgetMax: clientRequests.budgetMax,
            preferredLocations: clientRequests.preferredLocations,
            minRooms: clientRequests.minRooms,
            maxRooms: clientRequests.maxRooms,
            minSurface: clientRequests.minSurface,
            maxSurface: clientRequests.maxSurface,
            requiredFeatures: clientRequests.requiredFeatures,
            preferredFeatures: clientRequests.preferredFeatures,
            status: clientRequests.status,
            statusColorCode: clientRequests.statusColorCode,
            requestCode: clientRequests.requestCode,
            priority: clientRequests.priority,
            urgencyLevel: clientRequests.urgencyLevel,
            propertyId: clientRequests.propertyId,
            expectedTimeframe: clientRequests.expectedTimeframe,
            deadlineDate: clientRequests.deadlineDate,
            preferredContactTime: clientRequests.preferredContactTime,
            communicationPreferences: clientRequests.communicationPreferences,
            lastContactAt: clientRequests.lastContactAt,
            nextFollowUpAt: clientRequests.nextFollowUpAt,
            aiMatchingCriteria: clientRequests.aiMatchingCriteria,
            autoMatchEnabled: clientRequests.autoMatchEnabled,
            matchCount: clientRequests.matchCount,
            lastMatchedAt: clientRequests.lastMatchedAt,
            internalNotes: clientRequests.internalNotes,
            clientNotes: clientRequests.clientNotes,
            tags: clientRequests.tags,
            source: clientRequests.source,
            sourceDetails: clientRequests.sourceDetails,
            createdAt: clientRequests.createdAt,
            updatedAt: clientRequests.updatedAt
        })
            .from(clientRequests)
            .leftJoin(activities, and(eq(activities.requestId, clientRequests.id), gte(sql `STR_TO_DATE(${activities.scheduledDate}, '%d-%m-%Y')`, cutoffDateStr)))
            .where(whereCondition)
            .orderBy(desc(clientRequests.createdAt));
        return results;
    }
    async delete(id) {
        const result = await db.delete(clientRequests).where(eq(clientRequests.id, id));
        return result.affectedRows > 0;
    }
}
