/**
 * Resources API Routes
 *
 * REST API endpoints for managing sandboxed file resources.
 * Resources enable workflows, automations, and users to create, read, update,
 * and delete files within a secure, curated environment.
 *
 * **Endpoints:**
 * POST   /resources/create        - Create resource from content
 * POST   /resources/upload        - Upload file via multipart form
 * GET    /resources               - List resources with filters
 * GET    /resources/:id           - Get resource metadata
 * GET    /resources/:id/content   - Download raw file content
 * PUT    /resources/:id           - Update resource metadata
 * PUT    /resources/:id/content   - Update file content
 * DELETE /resources/:id           - Soft delete resource
 * POST   /resources/:id/interpolate - Interpolate template with state
 * POST   /resources/:id/copy      - Copy resource to new location
 *
 * **Authorization:**
 * All endpoints require authentication with appropriate RESOURCE_* permissions.
 *
 * @module plugins/workscript/resources
 * @see requirements.md - Requirements 3-11 for endpoint specifications
 * @see requirements.md#requirement-17 - API Response Consistency
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { createId } from '@paralleldrive/cuid2';
import { authenticate, requirePermission } from '../../../shared-services/auth/middleware';
import { type AuthContext, Permission } from '../../../shared-services/auth/types';
import {
  getStorageService,
  StorageError,
  StorageErrorCode,
  type ResourceType,
  getMimeType,
  getResourceTypeFromFilename,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
} from '../../../shared-services/storage';
import { ResourceRepository, type ResourceFilters } from './ResourceRepository';
import type { NewResource, NewResourceOperation, Resource, AuthorType, OperationType } from '../schema/resources.schema';

// Initialize repository and storage service
const repository = new ResourceRepository();

/**
 * Creates an operation log entry
 */
function createOperationLog(
  resourceId: string,
  operation: OperationType,
  actorType: AuthorType,
  actorId: string | undefined,
  status: 'success' | 'failed',
  options?: {
    workflowId?: string;
    executionId?: string;
    nodeId?: string;
    details?: Record<string, unknown>;
    previousChecksum?: string;
    newChecksum?: string;
    errorMessage?: string;
    durationMs?: number;
  }
): NewResourceOperation {
  return {
    id: createId(),
    resourceId,
    operation,
    actorType,
    actorId,
    status,
    ...options,
  };
}

/**
 * Maps StorageError to HTTP response
 */
function handleStorageError(c: Context, error: StorageError) {
  return c.json(
    {
      success: false,
      error: error.message,
      code: error.code,
    },
    error.statusCode as 400 | 403 | 404 | 409 | 500 | 507
  );
}

// Create Hono router with auth context type
const resourceRoutes = new Hono<{ Variables: AuthContext }>();

// =============================================================================
// POST /create - Create resource from content
// =============================================================================

/**
 * POST /create
 *
 * Creates a new resource by providing content directly.
 *
 * **Request Body:**
 * ```json
 * {
 *   "name": "greeting-prompt",
 *   "content": "Hello {{$.name}}, welcome!",
 *   "path": "prompts/greeting.md",
 *   "type": "prompt",
 *   "description": "A greeting prompt template",
 *   "tags": ["greeting", "onboarding"],
 *   "isPublic": false
 * }
 * ```
 *
 * **Response (201):**
 * ```json
 * {
 *   "success": true,
 *   "resource": { ... }
 * }
 * ```
 *
 * @see requirements.md#requirement-3 - Resource Creation via Content
 */
resourceRoutes.post(
  '/create',
  authenticate,
  requirePermission(Permission.RESOURCE_CREATE),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const body = await c.req.json();

      // Validate required fields
      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        return c.json({ success: false, error: 'Name is required', code: 'VALIDATION_ERROR' }, 400);
      }

      if (!body.content) {
        return c.json({ success: false, error: 'Content is required', code: 'VALIDATION_ERROR' }, 400);
      }

      if (!body.path || typeof body.path !== 'string') {
        return c.json({ success: false, error: 'Path is required', code: 'VALIDATION_ERROR' }, 400);
      }

      // Get storage service
      const storage = getStorageService();

      // Build the full path (tenant-scoped)
      const tenantId = user.tenantId || 'shared';
      const fullPath = body.path.startsWith('resources/')
        ? body.path
        : `resources/${tenantId}/${body.path}`;

      // Check if resource already exists at path
      const existingResource = await repository.findByPath(fullPath);
      if (existingResource) {
        return c.json(
          { success: false, error: 'Resource already exists at this path', code: 'RESOURCE_EXISTS' },
          409
        );
      }

      // Create resource via StorageService
      const fileResult = await storage.createResource({
        name: body.name,
        content: body.content,
        path: fullPath,
        type: body.type,
        description: body.description,
        tags: body.tags,
        isPublic: body.isPublic || false,
        tenantId,
        authorType: 'user',
        authorId: user.id,
      });

      // Create database record
      const resourceId = createId();
      const newResource: NewResource = {
        id: resourceId,
        name: body.name.trim(),
        path: fileResult.relativePath,
        type: fileResult.resourceType,
        mimeType: fileResult.mimeType,
        size: fileResult.size,
        checksum: fileResult.checksum,
        authorType: 'user',
        authorId: user.id,
        tenantId,
        description: body.description || null,
        tags: body.tags || [],
        metadata: body.metadata || null,
        isActive: true,
        isPublic: body.isPublic || false,
      };

      const createdResource = await repository.create(newResource);

      // Log operation (fire-and-forget)
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(resourceId, 'create', 'user', user.id, 'success', {
          newChecksum: fileResult.checksum,
          durationMs,
          details: { name: body.name, path: fullPath, size: fileResult.size },
        })
      );

      return c.json({ success: true, resource: createdResource }, 201);
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof StorageError) {
        return handleStorageError(c, error);
      }

      console.error('[Resources Routes] Create error:', error);
      return c.json(
        { success: false, error: 'Failed to create resource', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// POST /upload - Upload file via multipart form
// =============================================================================

/**
 * POST /upload
 *
 * Uploads a file via multipart form data.
 *
 * **Request:** multipart/form-data with:
 * - file: The file to upload
 * - name (optional): Display name
 * - description (optional): Description
 * - tags (optional): Comma-separated tags
 * - isPublic (optional): "true" or "false"
 *
 * **Response (201):**
 * ```json
 * {
 *   "success": true,
 *   "resource": { ... }
 * }
 * ```
 *
 * @see requirements.md#requirement-4 - Resource Upload via Multipart Form
 */
resourceRoutes.post(
  '/upload',
  authenticate,
  requirePermission(Permission.RESOURCE_CREATE),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return c.json({ success: false, error: 'File is required', code: 'VALIDATION_ERROR' }, 400);
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return c.json(
          {
            success: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            code: 'FILE_TOO_LARGE',
          },
          400
        );
      }

      // Get storage service
      const storage = getStorageService();
      const tenantId = user.tenantId || 'shared';

      // Extract optional metadata from form
      const name = (formData.get('name') as string) || file.name;
      const description = formData.get('description') as string | null;
      const tagsStr = formData.get('tags') as string | null;
      const isPublicStr = formData.get('isPublic') as string | null;
      const customPath = formData.get('path') as string | null;

      const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const isPublic = isPublicStr === 'true';

      // Upload file via StorageService
      const fileResult = await storage.uploadFile(file, {
        originalFilename: file.name,
        name,
        path: customPath ? (customPath.startsWith('resources/') ? customPath : `resources/${tenantId}/${customPath}`) : undefined,
        description: description || undefined,
        tags,
        isPublic,
        tenantId,
        authorType: 'user',
        authorId: user.id,
      });

      // Create database record
      const resourceId = createId();
      const newResource: NewResource = {
        id: resourceId,
        name,
        path: fileResult.relativePath,
        type: fileResult.resourceType,
        mimeType: fileResult.mimeType,
        size: fileResult.size,
        checksum: fileResult.checksum,
        authorType: 'user',
        authorId: user.id,
        tenantId,
        description: description || null,
        tags,
        metadata: { originalFilename: file.name },
        isActive: true,
        isPublic,
      };

      const createdResource = await repository.create(newResource);

      // Log operation
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(resourceId, 'create', 'user', user.id, 'success', {
          newChecksum: fileResult.checksum,
          durationMs,
          details: { originalFilename: file.name, size: fileResult.size, mimeType: fileResult.mimeType },
        })
      );

      return c.json({ success: true, resource: createdResource }, 201);
    } catch (error) {
      if (error instanceof StorageError) {
        return handleStorageError(c, error);
      }

      console.error('[Resources Routes] Upload error:', error);
      return c.json(
        { success: false, error: 'Failed to upload file', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// GET / - List resources
// =============================================================================

/**
 * GET /
 *
 * Lists resources with optional filters and pagination.
 *
 * **Query Parameters:**
 * - type: Filter by resource type (prompt, image, audio, document, data)
 * - authorType: Filter by author type (user, workflow, automation, system)
 * - tags: Comma-separated tags (any match)
 * - search: Search in name and description
 * - limit: Max results (default 50, max 100)
 * - offset: Skip first N results
 * - sortBy: Sort field (name, createdAt, size)
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "items": [...],
 *   "count": 42,
 *   "pagination": { "limit": 50, "offset": 0 }
 * }
 * ```
 *
 * @see requirements.md#requirement-6 - Resource Listing and Filtering
 */
resourceRoutes.get(
  '/',
  authenticate,
  requirePermission(Permission.RESOURCE_READ),
  async (c: Context<{ Variables: AuthContext }>) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const query = c.req.query();

      // Parse filters from query params
      const filters: ResourceFilters = {
        tenantId: user.tenantId,
        includePublic: true,
      };

      // Type filter
      if (query.type) {
        const validTypes = ['prompt', 'image', 'audio', 'document', 'data'];
        if (validTypes.includes(query.type)) {
          filters.type = query.type as ResourceType;
        }
      }

      // Author type filter
      if (query.authorType) {
        const validAuthorTypes = ['user', 'workflow', 'automation', 'system'];
        if (validAuthorTypes.includes(query.authorType)) {
          filters.authorType = query.authorType as AuthorType;
        }
      }

      // Tags filter
      if (query.tags) {
        filters.tags = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }

      // Search filter
      if (query.search) {
        filters.search = query.search;
      }

      // Pagination
      const limit = Math.min(Math.max(1, parseInt(query.limit || '50', 10) || 50), 100);
      const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);
      filters.limit = limit;
      filters.offset = offset;

      // Sorting
      if (query.sortBy) {
        const validSortFields = ['name', 'createdAt', 'size', 'updatedAt'];
        if (validSortFields.includes(query.sortBy)) {
          filters.sortBy = query.sortBy as 'name' | 'createdAt' | 'size';
        }
      }

      // Get resources and count
      const [resources, count] = await Promise.all([
        repository.findAll(filters),
        repository.count(filters),
      ]);

      return c.json({
        success: true,
        items: resources,
        count,
        pagination: { limit, offset },
      });
    } catch (error) {
      console.error('[Resources Routes] List error:', error);
      return c.json(
        { success: false, error: 'Failed to list resources', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// GET /:id - Get resource metadata
// =============================================================================

/**
 * GET /:id
 *
 * Gets resource metadata by ID.
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "resource": { ... }
 * }
 * ```
 *
 * @see requirements.md#requirement-5 - Resource Reading and Download
 */
resourceRoutes.get(
  '/:id',
  authenticate,
  requirePermission(Permission.RESOURCE_READ),
  async (c: Context<{ Variables: AuthContext }>) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const id = c.req.param('id');

      const resource = await repository.findById(id);

      if (!resource) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access (own tenant or public)
      // Note: user.tenantId may be undefined, but resource uses 'shared' as fallback
      const userTenantId = user.tenantId || 'shared';
      if (resource.tenantId !== userTenantId && !resource.isPublic) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      return c.json({ success: true, resource });
    } catch (error) {
      console.error('[Resources Routes] Get error:', error);
      return c.json(
        { success: false, error: 'Failed to get resource', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// GET /:id/content - Download resource content
// =============================================================================

/**
 * GET /:id/content
 *
 * Downloads the raw file content.
 *
 * **Response:** Raw file content with appropriate Content-Type header
 *
 * @see requirements.md#requirement-5 - Resource Reading and Download
 */
resourceRoutes.get(
  '/:id/content',
  authenticate,
  requirePermission(Permission.RESOURCE_READ),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const id = c.req.param('id');

      const resource = await repository.findById(id);

      if (!resource) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access
      const userTenantId = user.tenantId || 'shared';
      if (resource.tenantId !== userTenantId && !resource.isPublic) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Read content via StorageService
      const storage = getStorageService();
      const content = await storage.readResource(resource.path);

      // Log read operation (fire-and-forget)
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(id, 'read', 'user', user.id, 'success', {
          durationMs,
          details: { size: content.size },
        })
      );

      // Return file content as a Response with appropriate headers
      return new Response(content.content, {
        headers: {
          'Content-Type': resource.mimeType,
          'Content-Disposition': `attachment; filename="${resource.name}"`,
          'Content-Length': content.size.toString(),
        },
      });
    } catch (error) {
      if (error instanceof StorageError) {
        return handleStorageError(c, error);
      }

      console.error('[Resources Routes] Content error:', error);
      return c.json(
        { success: false, error: 'Failed to get resource content', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// PUT /:id - Update resource metadata
// =============================================================================

/**
 * PUT /:id
 *
 * Updates resource metadata (name, description, tags, isPublic).
 *
 * **Request Body:**
 * ```json
 * {
 *   "name": "New name",
 *   "description": "Updated description",
 *   "tags": ["new", "tags"],
 *   "isPublic": true
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "resource": { ... }
 * }
 * ```
 *
 * @see requirements.md#requirement-7 - Resource Metadata Update
 */
resourceRoutes.put(
  '/:id',
  authenticate,
  requirePermission(Permission.RESOURCE_UPDATE),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const resource = await repository.findById(id);

      if (!resource) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access (must be owner or admin)
      const userTenantId = user.tenantId || 'shared';
      if (resource.tenantId !== userTenantId) {
        return c.json(
          { success: false, error: 'Access denied', code: 'FORBIDDEN' },
          403
        );
      }

      // Build updates object
      const updates: Partial<NewResource> = {};

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim() === '') {
          return c.json(
            { success: false, error: 'Name cannot be empty', code: 'VALIDATION_ERROR' },
            400
          );
        }
        updates.name = body.name.trim();
      }

      if (body.description !== undefined) {
        updates.description = body.description;
      }

      if (body.tags !== undefined) {
        if (!Array.isArray(body.tags)) {
          return c.json(
            { success: false, error: 'Tags must be an array', code: 'VALIDATION_ERROR' },
            400
          );
        }
        updates.tags = body.tags;
      }

      if (body.isPublic !== undefined) {
        updates.isPublic = Boolean(body.isPublic);
      }

      // No fields to update
      if (Object.keys(updates).length === 0) {
        return c.json(
          { success: false, error: 'No fields to update', code: 'VALIDATION_ERROR' },
          400
        );
      }

      // Update resource
      const updatedResource = await repository.update(id, updates);

      // Log operation
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(id, 'update', 'user', user.id, 'success', {
          durationMs,
          details: { updatedFields: Object.keys(updates) },
        })
      );

      return c.json({ success: true, resource: updatedResource });
    } catch (error) {
      console.error('[Resources Routes] Update error:', error);
      return c.json(
        { success: false, error: 'Failed to update resource', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// PUT /:id/content - Update resource content
// =============================================================================

/**
 * PUT /:id/content
 *
 * Updates the file content.
 *
 * **Request Body:**
 * ```json
 * {
 *   "content": "New content here..."
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "resource": { ... }
 * }
 * ```
 *
 * @see requirements.md#requirement-8 - Resource Content Update
 */
resourceRoutes.put(
  '/:id/content',
  authenticate,
  requirePermission(Permission.RESOURCE_UPDATE),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      if (!body.content) {
        return c.json(
          { success: false, error: 'Content is required', code: 'VALIDATION_ERROR' },
          400
        );
      }

      const resource = await repository.findById(id);

      if (!resource) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access
      const userTenantId = user.tenantId || 'shared';
      if (resource.tenantId !== userTenantId) {
        return c.json(
          { success: false, error: 'Access denied', code: 'FORBIDDEN' },
          403
        );
      }

      // Update content via StorageService
      const storage = getStorageService();
      const updateResult = await storage.updateResourceContent(resource.path, body.content);

      // Update database record with new size and checksum
      const updatedResource = await repository.update(id, {
        size: updateResult.size,
        checksum: updateResult.newChecksum,
      });

      // Log operation
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(id, 'update', 'user', user.id, 'success', {
          previousChecksum: updateResult.previousChecksum,
          newChecksum: updateResult.newChecksum,
          durationMs,
          details: { newSize: updateResult.size },
        })
      );

      return c.json({ success: true, resource: updatedResource });
    } catch (error) {
      if (error instanceof StorageError) {
        return handleStorageError(c, error);
      }

      console.error('[Resources Routes] Content update error:', error);
      return c.json(
        { success: false, error: 'Failed to update content', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// DELETE /:id - Soft delete resource
// =============================================================================

/**
 * DELETE /:id
 *
 * Soft deletes a resource (sets isActive=false).
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "resourceId": "..."
 * }
 * ```
 *
 * @see requirements.md#requirement-9 - Resource Deletion (Soft Delete)
 */
resourceRoutes.delete(
  '/:id',
  authenticate,
  requirePermission(Permission.RESOURCE_DELETE),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const id = c.req.param('id');

      const resource = await repository.findById(id);

      if (!resource) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access
      const userTenantId = user.tenantId || 'shared';
      if (resource.tenantId !== userTenantId) {
        return c.json(
          { success: false, error: 'Access denied', code: 'FORBIDDEN' },
          403
        );
      }

      // Soft delete
      const deleted = await repository.softDelete(id);

      if (!deleted) {
        // Double-check if it was actually deleted (MySQL/Drizzle may return 0 affected rows)
        const checkResource = await repository.findById(id, true); // include inactive
        if (!checkResource || checkResource.isActive === false) {
          // Resource was actually deleted, report success
          return c.json({ success: true, resourceId: id });
        }
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Log operation
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(id, 'delete', 'user', user.id, 'success', {
          durationMs,
        })
      );

      return c.json({ success: true, resourceId: id });
    } catch (error) {
      console.error('[Resources Routes] Delete error:', error);
      return c.json(
        { success: false, error: 'Failed to delete resource', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// POST /:id/interpolate - Interpolate template
// =============================================================================

/**
 * POST /:id/interpolate
 *
 * Interpolates template placeholders with state values.
 * Replaces {{$.path}} placeholders with corresponding state values.
 *
 * **Request Body:**
 * ```json
 * {
 *   "state": {
 *     "name": "Alice",
 *     "count": 5
 *   },
 *   "workflowId": "wf_123",
 *   "executionId": "exec_456",
 *   "nodeId": "node_789"
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "content": "Hello Alice, you have 5 messages!",
 *   "placeholders": {
 *     "found": ["{{$.name}}", "{{$.count}}"],
 *     "replaced": ["{{$.name}}", "{{$.count}}"],
 *     "unresolved": []
 *   }
 * }
 * ```
 *
 * @see requirements.md#requirement-10 - Template Interpolation
 */
resourceRoutes.post(
  '/:id/interpolate',
  authenticate,
  requirePermission(Permission.RESOURCE_READ),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      if (!body.state || typeof body.state !== 'object') {
        return c.json(
          { success: false, error: 'State object is required', code: 'VALIDATION_ERROR' },
          400
        );
      }

      const resource = await repository.findById(id);

      if (!resource) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access
      const userTenantId = user.tenantId || 'shared';
      if (resource.tenantId !== userTenantId && !resource.isPublic) {
        return c.json(
          { success: false, error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check resource is a text type
      const textTypes = ['prompt', 'document', 'data'];
      if (!textTypes.includes(resource.type)) {
        return c.json(
          { success: false, error: 'Cannot interpolate non-text resource', code: 'INVALID_RESOURCE_TYPE' },
          400
        );
      }

      // Interpolate via StorageService
      const storage = getStorageService();
      const result = await storage.interpolateTemplate(resource.path, {
        state: body.state,
        workflowId: body.workflowId,
        executionId: body.executionId,
        nodeId: body.nodeId,
      });

      // Log operation
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(id, 'interpolate', 'user', user.id, 'success', {
          workflowId: body.workflowId,
          executionId: body.executionId,
          nodeId: body.nodeId,
          durationMs,
          details: {
            placeholdersFound: result.placeholdersFound.length,
            placeholdersReplaced: result.placeholdersReplaced.length,
          },
        })
      );

      return c.json({
        success: true,
        content: result.interpolated,
        placeholders: {
          found: result.placeholdersFound,
          replaced: result.placeholdersReplaced,
          unresolved: result.placeholdersUnresolved,
        },
      });
    } catch (error) {
      if (error instanceof StorageError) {
        return handleStorageError(c, error);
      }

      console.error('[Resources Routes] Interpolate error:', error);
      return c.json(
        { success: false, error: 'Failed to interpolate template', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// =============================================================================
// POST /:id/copy - Copy resource
// =============================================================================

/**
 * POST /:id/copy
 *
 * Creates a copy of the resource at a new location.
 *
 * **Request Body:**
 * ```json
 * {
 *   "name": "Copy of greeting",
 *   "path": "prompts/greeting-copy.md"
 * }
 * ```
 *
 * **Response (201):**
 * ```json
 * {
 *   "success": true,
 *   "resource": { ... }
 * }
 * ```
 *
 * @see requirements.md#requirement-11 - Resource Copy
 */
resourceRoutes.post(
  '/:id/copy',
  authenticate,
  requirePermission(Permission.RESOURCE_CREATE),
  async (c: Context<{ Variables: AuthContext }>) => {
    const startTime = Date.now();
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    try {
      const sourceId = c.req.param('id');
      const body = await c.req.json();

      const sourceResource = await repository.findById(sourceId);

      if (!sourceResource) {
        return c.json(
          { success: false, error: 'Source resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Check tenant access for source (can copy own or public)
      const userTenantId = user.tenantId || 'shared';
      if (sourceResource.tenantId !== userTenantId && !sourceResource.isPublic) {
        return c.json(
          { success: false, error: 'Source resource not found', code: 'RESOURCE_NOT_FOUND' },
          404
        );
      }

      // Generate copy name and path if not provided
      const copyName = body.name || `Copy of ${sourceResource.name}`;
      const tenantId = userTenantId;

      let targetPath: string;
      if (body.path) {
        targetPath = body.path.startsWith('resources/')
          ? body.path
          : `resources/${tenantId}/${body.path}`;
      } else {
        // Generate path based on source
        const ext = sourceResource.path.substring(sourceResource.path.lastIndexOf('.'));
        const basePath = sourceResource.path.substring(0, sourceResource.path.lastIndexOf('.'));
        targetPath = `${basePath}-copy-${Date.now()}${ext}`;
      }

      // Check if target already exists
      const existingTarget = await repository.findByPath(targetPath);
      if (existingTarget) {
        return c.json(
          { success: false, error: 'Target path already exists', code: 'RESOURCE_EXISTS' },
          409
        );
      }

      // Copy via StorageService
      const storage = getStorageService();
      const copyResult = await storage.copyResource({
        sourcePath: sourceResource.path,
        targetPath,
        newName: copyName,
      });

      // Create new database record
      const newResourceId = createId();
      const newResource: NewResource = {
        id: newResourceId,
        name: copyName,
        path: copyResult.relativePath,
        type: sourceResource.type,
        mimeType: copyResult.mimeType,
        size: copyResult.size,
        checksum: copyResult.checksum,
        authorType: 'user',
        authorId: user.id,
        tenantId,
        description: sourceResource.description,
        tags: sourceResource.tags,
        metadata: { copiedFrom: sourceId },
        isActive: true,
        isPublic: false, // Copies are private by default
      };

      const createdResource = await repository.create(newResource);

      // Log operation
      const durationMs = Date.now() - startTime;
      repository.logOperation(
        createOperationLog(newResourceId, 'copy', 'user', user.id, 'success', {
          newChecksum: copyResult.checksum,
          durationMs,
          details: { sourceId, sourcePath: sourceResource.path, targetPath },
        })
      );

      return c.json({ success: true, resource: createdResource }, 201);
    } catch (error) {
      if (error instanceof StorageError) {
        return handleStorageError(c, error);
      }

      console.error('[Resources Routes] Copy error:', error);
      return c.json(
        { success: false, error: 'Failed to copy resource', code: 'INTERNAL_ERROR' },
        500
      );
    }
  }
);

// Export the router
export default resourceRoutes;
