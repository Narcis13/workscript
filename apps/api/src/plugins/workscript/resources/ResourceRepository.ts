import { eq, and, desc, like, or, sql, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import {
  resources,
  resourceOperations,
  type Resource,
  type NewResource,
  type ResourceOperation,
  type NewResourceOperation,
  type ResourceType,
  type AuthorType,
} from '../schema/resources.schema';

/**
 * Filters for querying resources
 */
export interface ResourceFilters {
  /** Filter by resource type (prompt, image, audio, document, data) */
  type?: ResourceType;
  /** Filter by author type (user, workflow, automation, system) */
  authorType?: AuthorType;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Search in name and description */
  search?: string;
  /** Filter by tenant ID */
  tenantId?: string;
  /** Include public resources in results */
  includePublic?: boolean;
  /** Include inactive (soft-deleted) resources */
  includeInactive?: boolean;
  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'size';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Limit results (default 50, max 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Resource Repository
 *
 * Handles CRUD operations for resources and resource operations (audit log).
 * Uses the shared database connection from /apps/api/src/db
 *
 * @see requirements.md#requirement-16 - Resource Repository Pattern
 */
export class ResourceRepository {
  /**
   * Plugin ID for isolation - all queries filter by this
   */
  private readonly pluginId = 'workscript';

  /**
   * Create a new resource
   *
   * @param resource - Resource data to insert
   * @returns Created resource
   * @throws Error if creation fails
   *
   * @see requirements.md#requirement-16.2
   */
  async create(resource: NewResource): Promise<Resource> {
    // Ensure pluginId is set
    const resourceWithPlugin = {
      ...resource,
      pluginId: this.pluginId,
    };

    await db.insert(resources).values(resourceWithPlugin);

    // For MySQL, we need to fetch the created record separately
    if (resource.id) {
      const created = await this.findById(resource.id, true);
      if (!created) throw new Error('Failed to create resource');
      return created;
    }
    throw new Error('Resource ID is required');
  }

  /**
   * Find a resource by ID
   *
   * @param id - Resource ID
   * @param includeInactive - Include soft-deleted resources (default: false)
   * @returns Resource or null if not found
   *
   * @see requirements.md#requirement-16.3
   */
  async findById(id: string, includeInactive = false): Promise<Resource | null> {
    const conditions = [
      eq(resources.id, id),
      eq(resources.pluginId, this.pluginId),
    ];

    // Filter out inactive resources unless explicitly requested
    if (!includeInactive) {
      conditions.push(eq(resources.isActive, true));
    }

    const [resource] = await db
      .select()
      .from(resources)
      .where(and(...conditions));

    return resource || null;
  }

  /**
   * Find all resources matching filters
   *
   * @param filters - Query filters for resources
   * @returns Array of resources matching filters
   *
   * @see requirements.md#requirement-16.4
   */
  async findAll(filters: ResourceFilters = {}): Promise<Resource[]> {
    const {
      type,
      authorType,
      tags,
      search,
      tenantId,
      includePublic = true,
      includeInactive = false,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(resources.pluginId, this.pluginId),
    ];

    // Filter by active status
    if (!includeInactive) {
      conditions.push(eq(resources.isActive, true));
    }

    // Filter by type
    if (type) {
      conditions.push(eq(resources.type, type));
    }

    // Filter by author type
    if (authorType) {
      conditions.push(eq(resources.authorType, authorType));
    }

    // Tenant access control: own tenant OR public resources
    if (tenantId) {
      if (includePublic) {
        // Include resources from this tenant OR public resources
        conditions.push(
          or(
            eq(resources.tenantId, tenantId),
            eq(resources.isPublic, true)
          )!
        );
      } else {
        // Only this tenant's resources
        conditions.push(eq(resources.tenantId, tenantId));
      }
    }

    // Apply pagination
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    // Apply sorting
    const sortColumn = sortBy === 'name' ? resources.name
      : sortBy === 'size' ? resources.size
      : sortBy === 'updatedAt' ? resources.updatedAt
      : resources.createdAt;

    // Build the full query with all clauses
    let results = await db
      .select()
      .from(resources)
      .where(and(...conditions))
      .orderBy(sortOrder === 'asc' ? sortColumn : desc(sortColumn))
      .limit(safeLimit)
      .offset(safeOffset);

    // Post-filter by tags if provided (JSON array matching)
    if (tags && tags.length > 0) {
      results = results.filter((resource) => {
        const resourceTags = resource.tags || [];
        return tags.some((tag) => resourceTags.includes(tag));
      });
    }

    // Post-filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter((resource) =>
        resource.name.toLowerCase().includes(searchLower) ||
        (resource.description?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    return results;
  }

  /**
   * Count resources matching filters
   *
   * @param filters - Query filters for resources
   * @returns Total count of matching resources
   *
   * @see requirements.md#requirement-6.10
   */
  async count(filters: ResourceFilters = {}): Promise<number> {
    const {
      type,
      authorType,
      tags,
      search,
      tenantId,
      includePublic = true,
      includeInactive = false,
    } = filters;

    // Build where conditions (same as findAll)
    const conditions: ReturnType<typeof eq>[] = [
      eq(resources.pluginId, this.pluginId),
    ];

    if (!includeInactive) {
      conditions.push(eq(resources.isActive, true));
    }

    if (type) {
      conditions.push(eq(resources.type, type));
    }

    if (authorType) {
      conditions.push(eq(resources.authorType, authorType));
    }

    if (tenantId) {
      if (includePublic) {
        conditions.push(
          or(
            eq(resources.tenantId, tenantId),
            eq(resources.isPublic, true)
          )!
        );
      } else {
        conditions.push(eq(resources.tenantId, tenantId));
      }
    }

    // Get all matching resources for count (we need to post-filter)
    let results = await db.select().from(resources).where(and(...conditions));

    // Post-filter by tags if provided
    if (tags && tags.length > 0) {
      results = results.filter((resource) => {
        const resourceTags = resource.tags || [];
        return tags.some((tag) => resourceTags.includes(tag));
      });
    }

    // Post-filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter((resource) =>
        resource.name.toLowerCase().includes(searchLower) ||
        (resource.description?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    return results.length;
  }

  /**
   * Update a resource
   *
   * @param id - Resource ID
   * @param updates - Partial resource data to update
   * @returns Updated resource or null if not found
   *
   * @see requirements.md#requirement-16.5
   */
  async update(id: string, updates: Partial<NewResource>): Promise<Resource | null> {
    // Don't allow updating pluginId
    const { pluginId: _, ...safeUpdates } = updates;

    await db
      .update(resources)
      .set(safeUpdates)
      .where(
        and(
          eq(resources.id, id),
          eq(resources.pluginId, this.pluginId)
        )
      );

    return this.findById(id);
  }

  /**
   * Soft delete a resource
   *
   * Sets isActive=false and deletedAt timestamp
   *
   * @param id - Resource ID
   * @returns True if deleted, false if not found
   *
   * @see requirements.md#requirement-16.6
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(resources)
      .set({
        isActive: false,
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(resources.id, id),
          eq(resources.pluginId, this.pluginId),
          eq(resources.isActive, true) // Only delete if currently active
        )
      );

    return (result as any).affectedRows > 0;
  }

  /**
   * Log a resource operation to the audit log
   *
   * This is a fire-and-forget operation to avoid slowing down critical paths.
   * Errors are logged but don't propagate.
   *
   * @param operation - Operation data to log
   *
   * @see requirements.md#requirement-16.10
   * @see requirements.md#requirement-13.11-13.12
   */
  async logOperation(operation: NewResourceOperation): Promise<void> {
    try {
      await db.insert(resourceOperations).values(operation);
    } catch (error) {
      // Log error but don't throw - audit logging shouldn't block operations
      console.error('[ResourceRepository] Failed to log operation:', error);
    }
  }

  /**
   * Find all operations for a resource
   *
   * @param resourceId - Resource ID
   * @param limit - Maximum number of operations to return (default: 100)
   * @returns Array of operations ordered by createdAt descending
   *
   * @see requirements.md#requirement-13
   */
  async findOperations(resourceId: string, limit = 100): Promise<ResourceOperation[]> {
    return db
      .select()
      .from(resourceOperations)
      .where(eq(resourceOperations.resourceId, resourceId))
      .orderBy(desc(resourceOperations.createdAt))
      .limit(limit);
  }

  /**
   * Find a resource by path
   *
   * @param path - Resource path
   * @param tenantId - Optional tenant ID for access control
   * @returns Resource or null if not found
   */
  async findByPath(path: string, tenantId?: string): Promise<Resource | null> {
    const conditions = [
      eq(resources.path, path),
      eq(resources.pluginId, this.pluginId),
      eq(resources.isActive, true),
    ];

    // If tenantId provided, filter by tenant access
    if (tenantId) {
      conditions.push(
        or(
          eq(resources.tenantId, tenantId),
          eq(resources.isPublic, true)
        )!
      );
    }

    const [resource] = await db
      .select()
      .from(resources)
      .where(and(...conditions));

    return resource || null;
  }

  /**
   * Check if a path already exists
   *
   * @param path - Resource path to check
   * @returns True if path exists, false otherwise
   */
  async pathExists(path: string): Promise<boolean> {
    const [resource] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(
        and(
          eq(resources.path, path),
          eq(resources.pluginId, this.pluginId),
          eq(resources.isActive, true)
        )
      );

    return !!resource;
  }

  /**
   * Get storage usage statistics for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Usage statistics including total size and count by type
   *
   * @see requirements.md#requirement-19
   */
  async getUsageStats(tenantId: string): Promise<{
    totalSize: number;
    totalCount: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    const results = await db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.tenantId, tenantId),
          eq(resources.pluginId, this.pluginId),
          eq(resources.isActive, true)
        )
      );

    const stats = {
      totalSize: 0,
      totalCount: results.length,
      byType: {} as Record<string, { count: number; size: number }>,
    };

    for (const resource of results) {
      stats.totalSize += resource.size;

      const typeKey = resource.type;
      if (!stats.byType[typeKey]) {
        stats.byType[typeKey] = { count: 0, size: 0 };
      }
      const typeStats = stats.byType[typeKey];
      typeStats.count++;
      typeStats.size += resource.size;
    }

    return stats;
  }
}
