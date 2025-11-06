import { eq, desc, like, and, or, gte, lte, between } from 'drizzle-orm';
import { db } from '../index';
import { properties } from '../schema';
export class PropertyRepository {
    async create(property) {
        await db.insert(properties).values(property);
        // For MySQL with serial ID, find by unique slug or title
        if (property.slug) {
            const created = await this.findBySlug(property.slug);
            if (created)
                return created;
        }
        // Fallback: find by title and agency (should be unique enough for recent insert)
        const created = await this.findByTitleAndAgency(property.title, property.agencyId);
        if (!created)
            throw new Error('Failed to create property');
        return created;
    }
    async findById(id) {
        const [property] = await db.select().from(properties).where(eq(properties.id, id));
        return property || null;
    }
    async findBySlug(slug) {
        const [property] = await db.select().from(properties).where(eq(properties.slug, slug));
        return property || null;
    }
    async findByOriginalId(originalId) {
        // Check if a property exists with this original ID in the slug
        const [property] = await db.select()
            .from(properties)
            .where(like(properties.slug, `%-${originalId}`))
            .limit(1);
        return property || null;
    }
    async findByTitleAndAgency(title, agencyId) {
        const [property] = await db.select()
            .from(properties)
            .where(and(eq(properties.title, title), eq(properties.agencyId, agencyId)))
            .orderBy(desc(properties.createdAt))
            .limit(1);
        return property || null;
    }
    async findByAgency(agencyId) {
        return db.select()
            .from(properties)
            .where(eq(properties.agencyId, agencyId))
            .orderBy(desc(properties.createdAt));
    }
    async findByAgent(agentId) {
        return db.select()
            .from(properties)
            .where(eq(properties.agentId, agentId))
            .orderBy(desc(properties.createdAt));
    }
    async findByStatus(status, agencyId) {
        const whereClause = agencyId
            ? and(eq(properties.status, status), eq(properties.agencyId, agencyId))
            : eq(properties.status, status);
        return db.select()
            .from(properties)
            .where(whereClause)
            .orderBy(desc(properties.createdAt));
    }
    async findActive(agencyId) {
        return this.findByStatus('activ', agencyId);
    }
    async findByType(propertyType, transactionType, agencyId) {
        let whereClause = eq(properties.propertyType, propertyType);
        if (transactionType) {
            whereClause = and(whereClause, eq(properties.transactionType, transactionType));
        }
        if (agencyId) {
            whereClause = and(whereClause, eq(properties.agencyId, agencyId));
        }
        return db.select()
            .from(properties)
            .where(whereClause)
            .orderBy(desc(properties.createdAt));
    }
    async findByPriceRange(minPrice, maxPrice, agencyId) {
        let whereClause = between(properties.price, minPrice.toString(), maxPrice.toString());
        if (agencyId) {
            whereClause = and(whereClause, eq(properties.agencyId, agencyId));
        }
        return db.select()
            .from(properties)
            .where(whereClause)
            .orderBy(properties.price);
    }
    async findByCity(city, agencyId) {
        let whereClause = eq(properties.city, city);
        if (agencyId) {
            whereClause = and(whereClause, eq(properties.agencyId, agencyId));
        }
        return db.select()
            .from(properties)
            .where(whereClause)
            .orderBy(desc(properties.createdAt));
    }
    async search(searchTerm, agencyId) {
        const searchCondition = or(like(properties.title, `%${searchTerm}%`), like(properties.description, `%${searchTerm}%`), like(properties.address, `%${searchTerm}%`), like(properties.city, `%${searchTerm}%`), like(properties.neighborhood, `%${searchTerm}%`));
        const whereClause = agencyId
            ? and(searchCondition, eq(properties.agencyId, agencyId))
            : searchCondition;
        return db.select()
            .from(properties)
            .where(whereClause)
            .orderBy(desc(properties.createdAt));
    }
    async findSimilar(referenceProperty, limit = 5) {
        return db.select()
            .from(properties)
            .where(and(eq(properties.propertyType, referenceProperty.propertyType), eq(properties.transactionType, referenceProperty.transactionType), eq(properties.city, referenceProperty.city || ''), eq(properties.status, 'activ')))
            .orderBy(desc(properties.createdAt))
            .limit(limit);
    }
    async findPromoted(agencyId) {
        let whereClause = and(eq(properties.isPromoted, true), gte(properties.promotedUntil, new Date().toISOString()));
        if (agencyId) {
            whereClause = and(whereClause, eq(properties.agencyId, agencyId));
        }
        return db.select()
            .from(properties)
            .where(whereClause)
            .orderBy(desc(properties.createdAt));
    }
    async findAll() {
        return db.select().from(properties).orderBy(desc(properties.createdAt));
    }
    async update(id, updates) {
        await db.update(properties).set(updates).where(eq(properties.id, id));
        return this.findById(id);
    }
    async incrementViews(id) {
        const property = await this.findById(id);
        if (!property)
            return null;
        return this.update(id, {
            viewsCount: (property.viewsCount || 0) + 1
        });
    }
    async incrementFavorites(id) {
        const property = await this.findById(id);
        if (!property)
            return null;
        return this.update(id, {
            favoritesCount: (property.favoritesCount || 0) + 1
        });
    }
    async incrementInquiries(id) {
        const property = await this.findById(id);
        if (!property)
            return null;
        return this.update(id, {
            inquiriesCount: (property.inquiriesCount || 0) + 1
        });
    }
    async updateStatus(id, status) {
        return this.update(id, { status: status });
    }
    async markAsSold(id) {
        return this.updateStatus(id, 'vandut');
    }
    async markAsRented(id) {
        return this.updateStatus(id, 'inchiriat');
    }
    async markAsReserved(id) {
        return this.updateStatus(id, 'rezervat');
    }
    async promote(id, promotedUntil) {
        return this.update(id, {
            isPromoted: true,
            promotedUntil: promotedUntil.toISOString()
        });
    }
    async unpromote(id) {
        return this.update(id, {
            isPromoted: false,
            promotedUntil: null
        });
    }
    async updatePricing(id, newPrice, reason) {
        const property = await this.findById(id);
        if (!property)
            return null;
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
            priceHistory: JSON.stringify(updatedHistory)
        });
    }
    async delete(id) {
        const result = await db.delete(properties).where(eq(properties.id, id));
        return result.affectedRows > 0;
    }
}
