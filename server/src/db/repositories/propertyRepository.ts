import { eq, desc, like, and, or, gte, lte, between } from 'drizzle-orm';
import { db } from '../index';
import { properties, type Property, type NewProperty } from '../schema';

export class PropertyRepository {
  async create(property: NewProperty): Promise<Property> {
    await db.insert(properties).values(property);
    // For MySQL with serial ID, find by unique slug or title
    if (property.slug) {
      const created = await this.findBySlug(property.slug);
      if (created) return created;
    }
    // Fallback: find by title and agency (should be unique enough for recent insert)
    const created = await this.findByTitleAndAgency(property.title, property.agencyId);
    if (!created) throw new Error('Failed to create property');
    return created;
  }

  async findById(id: number): Promise<Property | null> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || null;
  }

  async findBySlug(slug: string): Promise<Property | null> {
    const [property] = await db.select().from(properties).where(eq(properties.slug, slug));
    return property || null;
  }

  async findByOriginalId(originalId: string): Promise<Property | null> {
    // Check if a property exists with this original ID in the slug
    const [property] = await db.select()
      .from(properties)
      .where(like(properties.slug, `%-${originalId}`))
      .limit(1);
    return property || null;
  }

  async findByTitleAndAgency(title: string, agencyId: number): Promise<Property | null> {
    const [property] = await db.select()
      .from(properties)
      .where(and(eq(properties.title, title), eq(properties.agencyId, agencyId)))
      .orderBy(desc(properties.createdAt))
      .limit(1);
    return property || null;
  }

  async findByAgency(agencyId: number): Promise<Property[]> {
    return db.select()
      .from(properties)
      .where(eq(properties.agencyId, agencyId))
      .orderBy(desc(properties.createdAt));
  }

  async findByAgent(agentId: number): Promise<Property[]> {
    return db.select()
      .from(properties)
      .where(eq(properties.agentId, agentId))
      .orderBy(desc(properties.createdAt));
  }

  async findByStatus(status: string, agencyId?: number): Promise<Property[]> {
    const whereClause = agencyId 
      ? and(eq(properties.status, status as any), eq(properties.agencyId, agencyId))
      : eq(properties.status, status as any);
    
    return db.select()
      .from(properties)
      .where(whereClause)
      .orderBy(desc(properties.createdAt));
  }

  async findActive(agencyId?: number): Promise<Property[]> {
    return this.findByStatus('activ', agencyId);
  }

  async findByType(propertyType: string, transactionType?: string, agencyId?: number): Promise<Property[]> {
    let whereClause = eq(properties.propertyType, propertyType as any);

    if (transactionType) {
      whereClause = and(whereClause, eq(properties.transactionType, transactionType as any))!;
    }

    if (agencyId) {
      whereClause = and(whereClause, eq(properties.agencyId, agencyId))!;
    }

    return db.select()
      .from(properties)
      .where(whereClause)
      .orderBy(desc(properties.createdAt));
  }

  async findByPriceRange(minPrice: number, maxPrice: number, agencyId?: number): Promise<Property[]> {
    let whereClause = between(properties.price, minPrice.toString(), maxPrice.toString());

    if (agencyId) {
      whereClause = and(whereClause, eq(properties.agencyId, agencyId))!;
    }

    return db.select()
      .from(properties)
      .where(whereClause)
      .orderBy(properties.price);
  }

  async findByCity(city: string, agencyId?: number): Promise<Property[]> {
    let whereClause = eq(properties.city, city);

    if (agencyId) {
      whereClause = and(whereClause, eq(properties.agencyId, agencyId))!;
    }

    return db.select()
      .from(properties)
      .where(whereClause)
      .orderBy(desc(properties.createdAt));
  }

  async search(searchTerm: string, agencyId?: number): Promise<Property[]> {
    const searchCondition = or(
      like(properties.title, `%${searchTerm}%`),
      like(properties.description, `%${searchTerm}%`),
      like(properties.address, `%${searchTerm}%`),
      like(properties.city, `%${searchTerm}%`),
      like(properties.neighborhood, `%${searchTerm}%`)
    );

    const whereClause = agencyId 
      ? and(searchCondition, eq(properties.agencyId, agencyId))
      : searchCondition;

    return db.select()
      .from(properties)
      .where(whereClause)
      .orderBy(desc(properties.createdAt));
  }

  async findSimilar(referenceProperty: Property, limit = 5): Promise<Property[]> {
    return db.select()
      .from(properties)
      .where(and(
        eq(properties.propertyType, referenceProperty.propertyType),
        eq(properties.transactionType, referenceProperty.transactionType),
        eq(properties.city, referenceProperty.city || ''),
        eq(properties.status, 'activ')
      ))
      .orderBy(desc(properties.createdAt))
      .limit(limit);
  }

  async findPromoted(agencyId?: number): Promise<Property[]> {
    let whereClause = and(
      eq(properties.isPromoted, true),
      gte(properties.promotedUntil, new Date().toISOString() as any)
    );
    
    if (agencyId) {
      whereClause = and(whereClause, eq(properties.agencyId, agencyId));
    }

    return db.select()
      .from(properties)
      .where(whereClause)
      .orderBy(desc(properties.createdAt));
  }

  async findAll(): Promise<Property[]> {
    return db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async update(id: number, updates: Partial<NewProperty>): Promise<Property | null> {
    await db.update(properties).set(updates).where(eq(properties.id, id));
    return this.findById(id);
  }

  async incrementViews(id: number): Promise<Property | null> {
    const property = await this.findById(id);
    if (!property) return null;
    
    return this.update(id, { 
      viewsCount: (property.viewsCount || 0) + 1 
    });
  }

  async incrementFavorites(id: number): Promise<Property | null> {
    const property = await this.findById(id);
    if (!property) return null;
    
    return this.update(id, { 
      favoritesCount: (property.favoritesCount || 0) + 1 
    });
  }

  async incrementInquiries(id: number): Promise<Property | null> {
    const property = await this.findById(id);
    if (!property) return null;
    
    return this.update(id, { 
      inquiriesCount: (property.inquiriesCount || 0) + 1 
    });
  }

  async updateStatus(id: number, status: string): Promise<Property | null> {
    return this.update(id, { status: status as any });
  }

  async markAsSold(id: number): Promise<Property | null> {
    return this.updateStatus(id, 'vandut');
  }

  async markAsRented(id: number): Promise<Property | null> {
    return this.updateStatus(id, 'inchiriat');
  }

  async markAsReserved(id: number): Promise<Property | null> {
    return this.updateStatus(id, 'rezervat');
  }

  async promote(id: number, promotedUntil: Date): Promise<Property | null> {
    return this.update(id, { 
      isPromoted: true, 
      promotedUntil: promotedUntil.toISOString() as any 
    });
  }

  async unpromote(id: number): Promise<Property | null> {
    return this.update(id, { 
      isPromoted: false, 
      promotedUntil: null 
    });
  }

  async updatePricing(id: number, newPrice: number, reason?: string): Promise<Property | null> {
    const property = await this.findById(id);
    if (!property) return null;

    // Update price history
    const currentHistory = Array.isArray(property.priceHistory) ? property.priceHistory : [];
    const newHistoryEntry = {
      price: property.price,
      date: new Date().toISOString(),
      reason: reason || 'Price update'
    };
    
    const updatedHistory = [...currentHistory, newHistoryEntry];

    return this.update(id, { 
      price: newPrice.toString(),
      priceHistory: JSON.stringify(updatedHistory) as any
    });
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result as any).affectedRows > 0;
  }
}