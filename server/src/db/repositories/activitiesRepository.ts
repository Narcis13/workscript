import { eq, desc, like, and, or, gte, lte, sql, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../index';
import { activities, contacts, agents, properties, clientRequests, type Activity, type NewActivity } from '../schema';

interface ActivityFilters {
  agencyId?: number;
  agentId?: number;
  contactId?: number;
  propertyId?: number;
  requestId?: number;
  activityType?: 'call' | 'meeting' | 'viewing' | 'task' | 'other';
  status?: 'future' | 'inprogress' | 'passed' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  hasContact?: boolean;
  hasProperty?: boolean;
  hasRequest?: boolean;
  searchTerm?: string;
}

interface ImportActivityData {
  originalActivityId: string;
  agencyId: number;
  agentName: string;
  name: string;
  memo?: string;
  activityType: 'call' | 'meeting' | 'viewing' | 'task' | 'other';
  status: 'future' | 'inprogress' | 'passed' | 'completed' | 'cancelled';
  statusClass?: string;
  statusIcon?: string;
  typeColor?: string;
  typeIcon?: string;
  typeDuration?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  contactName?: string;
  contactPhone?: string;
  propertyCode?: string;
  requestCode?: string;
  editUrl?: string;
  slideUrl?: string;
}

export class ActivitiesRepository {
  
  /**
   * Create a new activity
   */
  async create(activityData: NewActivity): Promise<Activity> {
    await db.insert(activities).values(activityData);
    
    // Get the created activity by originalActivityId if available, otherwise by latest created
    if (activityData.originalActivityId) {
      const created = await this.findByOriginalId(activityData.originalActivityId);
      if (created) return created;
    }
    
    // Fallback: get latest activity for this agency
    const [latest] = await db
      .select()
      .from(activities)
      .where(eq(activities.agencyId, activityData.agencyId))
      .orderBy(desc(activities.createdAt))
      .limit(1);
      
    if (!latest) throw new Error('Failed to create activity');
    return latest;
  }

  /**
   * Find activity by internal ID
   */
  async findById(id: number): Promise<Activity | null> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || null;
  }

  /**
   * Find activity by original system ID
   */
  async findByOriginalId(originalActivityId: string): Promise<Activity | null> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.originalActivityId, originalActivityId));
    return activity || null;
  }

  /**
   * Get all activities with optional filters
   */
  async findAll(filters: ActivityFilters = {}): Promise<Activity[]> {
    let query = db.select().from(activities);
    
    const conditions = this.buildWhereConditions(filters);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(activities.scheduledDateTime), desc(activities.createdAt));
  }

  /**
   * Get activities for a specific agency
   */
  async findByAgency(agencyId: number, filters: Omit<ActivityFilters, 'agencyId'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, agencyId });
  }

  /**
   * Get activities for a specific agent
   */
  async findByAgent(agentId: number, filters: Omit<ActivityFilters, 'agentId'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, agentId });
  }

  /**
   * Get activities for a specific contact
   */
  async findByContact(contactId: number, filters: Omit<ActivityFilters, 'contactId'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, contactId });
  }

  /**
   * Get activities for a specific property
   */
  async findByProperty(propertyId: number, filters: Omit<ActivityFilters, 'propertyId'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, propertyId });
  }

  /**
   * Get activities for a specific client request
   */
  async findByRequest(requestId: number, filters: Omit<ActivityFilters, 'requestId'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, requestId });
  }

  /**
   * Search activities by name, memo, or contact name
   */
  async search(searchTerm: string, filters: Omit<ActivityFilters, 'searchTerm'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, searchTerm });
  }

  /**
   * Get upcoming activities (scheduled for future)
   */
  async findUpcoming(agencyId?: number, limit = 50): Promise<Activity[]> {
    const filters: ActivityFilters = {
      status: 'future',
      startDate: new Date()
    };
    
    if (agencyId) {
      filters.agencyId = agencyId;
    }
    
    const activities = await this.findAll(filters);
    return activities.slice(0, limit);
  }

  /**
   * Get overdue activities
   */
  async findOverdue(agencyId?: number): Promise<Activity[]> {
    const filters: ActivityFilters = {
      status: 'future',
      endDate: new Date()
    };
    
    if (agencyId) {
      filters.agencyId = agencyId;
    }
    
    return this.findAll(filters);
  }

  /**
   * Get activities by type
   */
  async findByType(activityType: 'call' | 'meeting' | 'viewing' | 'task' | 'other', filters: Omit<ActivityFilters, 'activityType'> = {}): Promise<Activity[]> {
    return this.findAll({ ...filters, activityType });
  }

  /**
   * Update an activity
   */
  async update(id: number, updates: Partial<NewActivity>): Promise<Activity | null> {
    // Always update the updatedAt timestamp
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    await db.update(activities).set(updateData).where(eq(activities.id, id));
    return this.findById(id);
  }

  /**
   * Delete an activity
   */
  async delete(id: number): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return (result as any).affectedRows > 0;
  }

  /**
   * Mark activity as completed
   */
  async markCompleted(id: number): Promise<Activity | null> {
    return this.update(id, {
      status: 'completed',
      completedAt: new Date()
    });
  }

  /**
   * Mark activity as cancelled
   */
  async markCancelled(id: number): Promise<Activity | null> {
    return this.update(id, {
      status: 'cancelled'
    });
  }

  /**
   * Import activities from external source with ID resolution
   */
  async importActivities(activitiesData: ImportActivityData[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const activityData of activitiesData) {
      try {
        // Check if activity already exists
        const existing = await this.findByOriginalId(activityData.originalActivityId);
        if (existing) {
          skipped++;
          continue;
        }

        // Resolve agent ID by name
        let agentId: number | null = null;
        if (activityData.agentName) {
          const [agent] = await db
            .select({ id: agents.id })
            .from(agents)
            .where(
              and(
                eq(agents.agencyId, activityData.agencyId),
                or(
                  like(sql`CONCAT(${agents.firstName}, ' ', ${agents.lastName})`, `%${activityData.agentName}%`),
                  like(agents.firstName, `%${activityData.agentName}%`),
                  like(agents.lastName, `%${activityData.agentName}%`)
                )
              )
            )
            .limit(1);
          
          if (agent) {
            agentId = agent.id;
          }
        }

        if (!agentId) {
          errors.push(`Agent not found for activity ${activityData.originalActivityId}: ${activityData.agentName}`);
          continue;
        }

        // Resolve contact ID by phone number (last 9 digits)
        let contactId: number | null = null;
        if (activityData.contactPhone) {
          const phoneToSearch = activityData.contactPhone.slice(-9); // Last 9 digits
          const [contact] = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(
              and(
                eq(contacts.agencyId, activityData.agencyId),
                like(contacts.phone, `%${phoneToSearch}`)
              )
            )
            .limit(1);
          
          if (contact) {
            contactId = contact.id;
          }
        }

        // Resolve property ID by property code (P123456)
        let propertyId: number | null = null;
        if (activityData.propertyCode) {
          const [property] = await db
            .select({ id: properties.id })
            .from(properties)
            .where(
              and(
                eq(properties.agencyId, activityData.agencyId),
                eq(properties.internalCode, activityData.propertyCode)
              )
            )
            .limit(1);
          
          if (property) {
            propertyId = property.id;
          }
        }

        // Resolve request ID by request code (R1111)
        let requestId: number | null = null;
        if (activityData.requestCode) {
          const [request] = await db
            .select({ id: clientRequests.id })
            .from(clientRequests)
            .where(
              and(
                eq(clientRequests.agencyId, activityData.agencyId),
                eq(clientRequests.requestCode, activityData.requestCode)
              )
            )
            .limit(1);
          
          if (request) {
            requestId = request.id;
          }
        }

        // Parse scheduled date/time
        let scheduledDateTime: Date | null = null;
        if (activityData.scheduledDate) {
          try {
            const dateStr = activityData.scheduledDate;
            const timeStr = activityData.scheduledTime || '00:00:00';
            
            // Parse Romanian date format: "DD-MM-YYYY"
            const dateParts = dateStr.split('-').map(Number);
            const timeParts = timeStr.split(':').map(Number);
            
            if (dateParts.length === 3 && dateParts.every(part => !isNaN(part) && part != null)) {
              const [day, month, year] = dateParts;
              const [hour = 0, minute = 0, second = 0] = timeParts;
              if (year != null && month != null && day != null) {
                scheduledDateTime = new Date(year, month - 1, day, hour, minute, second);
              }
            }
          } catch (parseError) {
            console.warn(`Failed to parse date for activity ${activityData.originalActivityId}:`, parseError);
          }
        }

        // Create the activity record
        const newActivity: NewActivity = {
          originalActivityId: activityData.originalActivityId,
          agencyId: activityData.agencyId,
          agentId: agentId,
          contactId,
          propertyId,
          requestId,
          name: activityData.name,
          memo: activityData.memo,
          activityType: activityData.activityType,
          status: activityData.status,
          statusClass: activityData.statusClass,
          statusIcon: activityData.statusIcon,
          typeColor: activityData.typeColor,
          typeIcon: activityData.typeIcon,
          typeDuration: activityData.typeDuration,
          scheduledDate: activityData.scheduledDate,
          scheduledTime: activityData.scheduledTime,
          scheduledDateTime,
          contactName: activityData.contactName,
          contactPhone: activityData.contactPhone,
          propertyCode: activityData.propertyCode,
          requestCode: activityData.requestCode,
          agentName: activityData.agentName,
          editUrl: activityData.editUrl,
          slideUrl: activityData.slideUrl,
        };

        await this.create(newActivity);
        imported++;
        
      } catch (error) {
        errors.push(`Failed to import activity ${activityData.originalActivityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Get activity statistics for an agency
   */
  async getStats(agencyId: number): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    upcoming: number;
    overdue: number;
  }> {
    const allActivities = await this.findByAgency(agencyId);
    
    const stats = {
      total: allActivities.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      upcoming: 0,
      overdue: 0
    };

    const now = new Date();
    
    for (const activity of allActivities) {
      // Count by type
      stats.byType[activity.activityType] = (stats.byType[activity.activityType] || 0) + 1;
      
      // Count by status
      stats.byStatus[activity.status] = (stats.byStatus[activity.status] || 0) + 1;
      
      // Count upcoming and overdue
      if (activity.scheduledDateTime) {
        if (activity.status === 'future') {
          if (activity.scheduledDateTime > now) {
            stats.upcoming++;
          } else {
            stats.overdue++;
          }
        }
      }
    }
    
    return stats;
  }

  /**
   * Build WHERE conditions for filtering
   */
  private buildWhereConditions(filters: ActivityFilters): any[] {
    const conditions = [];
    
    if (filters.agencyId) {
      conditions.push(eq(activities.agencyId, filters.agencyId));
    }
    
    if (filters.agentId) {
      conditions.push(eq(activities.agentId, filters.agentId));
    }
    
    if (filters.contactId) {
      conditions.push(eq(activities.contactId, filters.contactId));
    }
    
    if (filters.propertyId) {
      conditions.push(eq(activities.propertyId, filters.propertyId));
    }
    
    if (filters.requestId) {
      conditions.push(eq(activities.requestId, filters.requestId));
    }
    
    if (filters.activityType) {
      conditions.push(eq(activities.activityType, filters.activityType));
    }
    
    if (filters.status) {
      conditions.push(eq(activities.status, filters.status));
    }
    
    if (filters.startDate) {
      conditions.push(gte(activities.scheduledDateTime, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(activities.scheduledDateTime, filters.endDate));
    }
    
    if (filters.hasContact === true) {
      conditions.push(isNotNull(activities.contactId));
    } else if (filters.hasContact === false) {
      conditions.push(isNull(activities.contactId));
    }
    
    if (filters.hasProperty === true) {
      conditions.push(isNotNull(activities.propertyId));
    } else if (filters.hasProperty === false) {
      conditions.push(isNull(activities.propertyId));
    }
    
    if (filters.hasRequest === true) {
      conditions.push(isNotNull(activities.requestId));
    } else if (filters.hasRequest === false) {
      conditions.push(isNull(activities.requestId));
    }
    
    if (filters.searchTerm) {
      const searchPattern = `%${filters.searchTerm}%`;
      conditions.push(
        or(
          like(activities.name, searchPattern),
          like(activities.memo, searchPattern),
          like(activities.contactName, searchPattern),
          like(activities.agentName, searchPattern)
        )
      );
    }
    
    return conditions;
  }
}