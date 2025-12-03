# Implementation Plan: Resources Feature

This document provides a concrete, actionable implementation plan for the Resources feature - a sandboxed file management system for the Workscript agentic workflow platform. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: DATABASE SCHEMA & PERMISSIONS

### 1.1 Create Resource Schema

- [x] **Task 1.1.1: Create resources schema file**
  - Create file: `apps/api/src/plugins/workscript/schema/resources.schema.ts`
  - Import mysqlTable, varchar, text, int, timestamp, boolean, json, index from drizzle-orm
  - Import createId from @paralleldrive/cuid2
  - _Requirements: 12_

- [x] **Task 1.1.2: Define resources table**
  - Add id field: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId())
  - Add name field: varchar('name', { length: 255 }).notNull()
  - Add path field: varchar('path', { length: 512 }).notNull()
  - Add type field: varchar('type', { length: 50 }).notNull()
  - Add mimeType field: varchar('mime_type', { length: 100 }).notNull()
  - Add size field: int('size').notNull()
  - Add checksum field: varchar('checksum', { length: 64 })
  - _Requirements: 12.1-12.5_

- [x] **Task 1.1.3: Add authorship and tenancy fields**
  - Add authorType field: varchar('author_type', { length: 50 }).notNull()
  - Add authorId field: varchar('author_id', { length: 128 })
  - Add tenantId field: varchar('tenant_id', { length: 128 })
  - Add pluginId field: varchar('plugin_id', { length: 128 }).notNull().default('workscript')
  - _Requirements: 12.4-12.6_

- [x] **Task 1.1.4: Add metadata fields**
  - Add description field: text('description')
  - Add tags field: json('tags').$type<string[]>().default([])
  - Add metadata field: json('metadata').$type<Record<string, unknown>>()
  - _Requirements: 12.7_

- [x] **Task 1.1.5: Add status and timestamp fields**
  - Add isActive field: boolean('is_active').notNull().default(true)
  - Add isPublic field: boolean('is_public').notNull().default(false)
  - Add createdAt field: timestamp('created_at').notNull().defaultNow()
  - Add updatedAt field: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
  - Add deletedAt field: timestamp('deleted_at') (nullable for soft delete)
  - _Requirements: 12.8-12.12_

- [x] **Task 1.1.6: Add resources table indexes**
  - Add pathIdx: index('resources_path_idx').on(table.path)
  - Add tenantTypeIdx: index('resources_tenant_type_idx').on(table.tenantId, table.type)
  - Add authorIdx: index('resources_author_idx').on(table.authorType, table.authorId)
  - Add pluginIdx: index('resources_plugin_idx').on(table.pluginId)
  - _Requirements: 12.10_

- [x] **Task 1.1.7: Define resource_operations table**
  - Add id field: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId())
  - Add resourceId field: varchar('resource_id', { length: 128 }).notNull()
  - Add operation field: varchar('operation', { length: 50 }).notNull()
  - Add actorType field: varchar('actor_type', { length: 50 }).notNull()
  - Add actorId field: varchar('actor_id', { length: 128 })
  - _Requirements: 13.1-13.4_

- [x] **Task 1.1.8: Add workflow context fields to operations table**
  - Add workflowId field: varchar('workflow_id', { length: 128 })
  - Add executionId field: varchar('execution_id', { length: 128 })
  - Add nodeId field: varchar('node_id', { length: 128 })
  - _Requirements: 13.4_

- [x] **Task 1.1.9: Add operation details fields**
  - Add details field: json('details').$type<Record<string, unknown>>()
  - Add previousChecksum field: varchar('previous_checksum', { length: 64 })
  - Add newChecksum field: varchar('new_checksum', { length: 64 })
  - Add status field: varchar('status', { length: 50 }).notNull()
  - Add errorMessage field: text('error_message')
  - Add durationMs field: int('duration_ms')
  - Add createdAt field: timestamp('created_at').notNull().defaultNow()
  - _Requirements: 13.5-13.10_

- [x] **Task 1.1.10: Add resource_operations table indexes**
  - Add resourceIdx: index('resource_ops_resource_idx').on(table.resourceId)
  - Add actorIdx: index('resource_ops_actor_idx').on(table.actorType, table.actorId)
  - Add workflowIdx: index('resource_ops_workflow_idx').on(table.workflowId)
  - Add createdAtIdx: index('resource_ops_created_at_idx').on(table.createdAt)
  - _Requirements: 13.9_

- [x] **Task 1.1.11: Export TypeScript types**
  - Export type Resource = typeof resources.$inferSelect
  - Export type NewResource = typeof resources.$inferInsert
  - Export type ResourceOperation = typeof resourceOperations.$inferSelect
  - Export type NewResourceOperation = typeof resourceOperations.$inferInsert
  - _Requirements: 12_

### 1.2 Update Drizzle Configuration

- [x] **Task 1.2.1: Update drizzle.config.ts**
  - Open: `apps/api/drizzle.config.ts`
  - Add './src/plugins/workscript/schema/resources.schema.ts' to schema array
  - _Requirements: 12_

- [x] **Task 1.2.2: Update db/index.ts exports**
  - Open: `apps/api/src/db/index.ts`
  - Import resources and resourceOperations from workscript/schema/resources.schema
  - Add to schema object for query builder access
  - _Requirements: 12_

### 1.3 Add Permissions

- [x] **Task 1.3.1: Add resource permissions to Permission enum**
  - Open: `apps/api/src/shared-services/auth/types.ts`
  - Add RESOURCE_CREATE = 'resource:create' after EXECUTION_RERUN
  - Add RESOURCE_READ = 'resource:read'
  - Add RESOURCE_UPDATE = 'resource:update'
  - Add RESOURCE_DELETE = 'resource:delete'
  - _Requirements: 15.1-15.4_

- [x] **Task 1.3.2: Update PermissionManager role defaults**
  - Open: `apps/api/src/shared-services/auth/PermissionManager.ts`
  - Add RESOURCE_* permissions to ADMIN role default permissions
  - Add RESOURCE_* permissions to USER role default permissions
  - Add RESOURCE_READ, RESOURCE_CREATE to API role default permissions
  - _Requirements: 15.10-15.12_

### 1.4 Run Database Migrations

- [x] **Task 1.4.1: Generate migration files**
  - Run: `cd apps/api && bun run db:generate`
  - Verify migration file created in drizzle/ folder
  - Review generated SQL for correctness
  - _Requirements: 12, 13_

- [x] **Task 1.4.2: Apply migrations to database**
  - Run: `cd apps/api && bun run db:push`
  - Verify tables created in database
  - Check indexes were created
  - _Requirements: 12, 13_

---

## PHASE 2: STORAGE SERVICE INFRASTRUCTURE

### 2.1 Create Storage Types

- [x] **Task 2.1.1: Create storage service directory**
  - Create directory: `apps/api/src/shared-services/storage/`
  - _Requirements: 14_

- [x] **Task 2.1.2: Create types.ts file**
  - Create file: `apps/api/src/shared-services/storage/types.ts`
  - _Requirements: 14.8-14.9_

- [x] **Task 2.1.3: Define StorageErrorCode enum**
  - Add SANDBOX_VIOLATION = 'SANDBOX_VIOLATION'
  - Add SANDBOX_NOT_FOUND = 'SANDBOX_NOT_FOUND'
  - Add FILE_NOT_FOUND = 'FILE_NOT_FOUND'
  - Add RESOURCE_EXISTS = 'RESOURCE_EXISTS'
  - Add INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
  - Add FILE_TOO_LARGE = 'FILE_TOO_LARGE'
  - Add WRITE_ERROR = 'WRITE_ERROR'
  - Add READ_ERROR = 'READ_ERROR'
  - Add STORAGE_FULL = 'STORAGE_FULL'
  - Add PERMISSION_DENIED = 'PERMISSION_DENIED'
  - Add INVALID_RESOURCE_TYPE = 'INVALID_RESOURCE_TYPE'
  - Add INTERNAL_ERROR = 'INTERNAL_ERROR'
  - _Requirements: 20.6_

- [x] **Task 2.1.4: Create StorageError class**
  - Extend Error class
  - Add code: StorageErrorCode property
  - Add details: Record<string, unknown> property
  - Add statusCode: number property
  - Map error codes to HTTP status codes
  - _Requirements: 14.10, 20.6-20.7_

- [x] **Task 2.1.5: Define configuration constants**
  - Define MAX_FILE_SIZE = 50 * 1024 * 1024 (50MB)
  - Define ALLOWED_EXTENSIONS array with .md, .txt, .json, .csv, .png, .jpg, .jpeg, .gif, .webp, .mp3, .wav, .pdf
  - Define SANDBOX_ROOT from env or default path
  - Define RESOURCE_TYPES: 'prompt' | 'image' | 'audio' | 'document' | 'data'
  - _Requirements: 14.9_

- [x] **Task 2.1.6: Define ResourceType interfaces**
  - Create CreateResourceParams interface
  - Create UpdateResourceParams interface
  - Create UploadMetadata interface
  - Create ResourceFilters interface
  - Create ResourceContent interface
  - _Requirements: 14_

- [x] **Task 2.1.7: Define MIME type mappings**
  - Create extension to MIME type map
  - Create MIME type to resource type map
  - Add helper function getMimeType(filename)
  - Add helper function getResourceType(mimeType)
  - _Requirements: 4.9-4.12_

### 2.2 Implement SandboxManager

- [x] **Task 2.2.1: Create SandboxManager.ts file**
  - Create file: `apps/api/src/shared-services/storage/SandboxManager.ts`
  - Import path, fs/promises
  - Import StorageError, StorageErrorCode from types
  - _Requirements: 14.4_

- [x] **Task 2.2.2: Define SandboxManager class structure**
  - Add private sandboxRoot: string property
  - Add constructor that initializes sandboxRoot
  - Use singleton pattern with getInstance()
  - _Requirements: 14.4_

- [x] **Task 2.2.3: Implement validatePath method**
  - Take relativePath parameter
  - Resolve to absolute path
  - Normalize path (remove .., multiple slashes)
  - Check if path starts with sandboxRoot
  - Throw SANDBOX_VIOLATION if outside sandbox
  - Return normalized absolute path
  - _Requirements: 2.1-2.4_

- [x] **Task 2.2.4: Implement isWithinSandbox method**
  - Take absolutePath parameter
  - Normalize and compare to sandboxRoot
  - Return boolean (no throwing)
  - _Requirements: 2.6_

- [x] **Task 2.2.5: Implement resolvePath method**
  - Take relativePath parameter
  - Join with sandboxRoot
  - Validate path is within sandbox
  - Return absolute path
  - _Requirements: 2.5_

- [x] **Task 2.2.6: Implement getRelativePath method**
  - Take absolutePath parameter
  - Validate path is within sandbox
  - Return path relative to sandboxRoot
  - _Requirements: 1.8_

- [x] **Task 2.2.7: Implement ensureDirectory method**
  - Take directoryPath parameter (relative)
  - Validate path within sandbox
  - Create directory recursively (mkdir -p)
  - Handle errors appropriately
  - _Requirements: 1.6_

- [x] **Task 2.2.8: Implement initializeSandbox method**
  - Create sandboxRoot if not exists
  - Create resources/ subdirectory
  - Create tmp/ subdirectory
  - Log initialization status
  - _Requirements: 1.1-1.3, 1.6_

- [x] **Task 2.2.9: Implement checkSandboxExists method**
  - Verify sandboxRoot directory exists
  - Throw SANDBOX_NOT_FOUND if missing
  - Return true if exists
  - _Requirements: 2.8_

- [x] **Task 2.2.10: Add path security logging**
  - Log SANDBOX_VIOLATION attempts with attempted path
  - Include timestamp and caller context
  - Don't expose actual sandbox paths in logs
  - _Requirements: 2.7_

### 2.3 Implement ContentProcessor

- [x] **Task 2.3.1: Create ContentProcessor.ts file**
  - Create file: `apps/api/src/shared-services/storage/ContentProcessor.ts`
  - Import types from types.ts
  - _Requirements: 14.5-14.6_

- [x] **Task 2.3.2: Define ContentProcessor class structure**
  - Use singleton pattern with getInstance()
  - _Requirements: 14.5_

- [x] **Task 2.3.3: Implement interpolate method**
  - Take content (string) and state (Record<string, unknown>) parameters
  - Find all {{$.path}} patterns using regex
  - For each pattern, resolve path in state object
  - Replace pattern with resolved value (or leave as-is if not found)
  - Return interpolated string
  - _Requirements: 10.2-10.6_

- [x] **Task 2.3.4: Implement resolveStatePath helper**
  - Take path string (e.g., "nested.key") and state object
  - Split path by dots
  - Walk through nested object
  - Return value or undefined if path doesn't exist
  - _Requirements: 10.3-10.4_

- [x] **Task 2.3.5: Implement detectContentType method**
  - Take content (Buffer) and filename (string) parameters
  - Check magic bytes for common file types
  - Fallback to extension-based detection
  - Return { mimeType, resourceType }
  - _Requirements: 14.6_

- [x] **Task 2.3.6: Implement validateContent method**
  - Take content (Buffer) and expectedType (string) parameters
  - Detect actual content type
  - Compare with expected type
  - Return { valid: boolean, actualType, expectedType }
  - _Requirements: Security Non-functional_

- [x] **Task 2.3.7: Implement computeChecksum method**
  - Take content (Buffer) parameter
  - Compute SHA-256 hash
  - Return hex-encoded hash string
  - _Requirements: 3.5_

- [x] **Task 2.3.8: Implement escapeInterpolationValues method**
  - Take value (unknown) parameter
  - Convert to string if needed
  - Escape special characters based on context
  - Return safe string value
  - _Requirements: 10.12_

### 2.4 Implement StorageService

- [x] **Task 2.4.1: Create StorageService.ts file**
  - Create file: `apps/api/src/shared-services/storage/StorageService.ts`
  - Import fs/promises, path
  - Import SandboxManager, ContentProcessor
  - Import types from types.ts
  - _Requirements: 14.1-14.3_

- [x] **Task 2.4.2: Define StorageService class structure**
  - Add private sandboxManager: SandboxManager
  - Add private contentProcessor: ContentProcessor
  - Add private static instance: StorageService | null
  - Implement getInstance() method
  - Call sandboxManager.initializeSandbox() in constructor
  - _Requirements: 14.1-14.3_

- [x] **Task 2.4.3: Implement createResource method**
  - Take CreateResourceParams parameter
  - Validate path within sandbox
  - Check file doesn't already exist (RESOURCE_EXISTS error)
  - Ensure parent directory exists
  - Write content to file
  - Compute checksum
  - Return file metadata (size, checksum, path)
  - _Requirements: 3.1-3.11_

- [x] **Task 2.4.4: Implement readResource method**
  - Take relativePath parameter
  - Validate path within sandbox
  - Check file exists (FILE_NOT_FOUND error)
  - Read file content
  - Return content buffer and metadata
  - _Requirements: 5.3-5.4_

- [x] **Task 2.4.5: Implement updateResourceContent method**
  - Take relativePath and newContent parameters
  - Validate path within sandbox
  - Check file exists
  - Read old content for checksum
  - Write new content
  - Compute new checksum
  - Return { previousChecksum, newChecksum, size }
  - _Requirements: 8.1-8.6_

- [x] **Task 2.4.6: Implement deleteResourceFile method**
  - Take relativePath parameter (for hard delete if ever needed)
  - Validate path within sandbox
  - Check file exists
  - Delete file
  - Return success status
  - _Requirements: 9.10_

- [x] **Task 2.4.7: Implement uploadFile method**
  - Take File object and UploadMetadata parameters
  - Validate file size against MAX_FILE_SIZE
  - Validate file extension against ALLOWED_EXTENSIONS
  - Detect MIME type
  - Write to tmp/ first
  - Validate content
  - Move to final location
  - Return file metadata
  - _Requirements: 4.1-4.12_

- [x] **Task 2.4.8: Implement interpolateTemplate method**
  - Take relativePath and state parameters
  - Read file content
  - Verify it's a text file
  - Call contentProcessor.interpolate()
  - Return interpolated content
  - _Requirements: 10.1-10.11_

- [x] **Task 2.4.9: Implement copyResource method**
  - Take sourcePath and targetPath parameters
  - Validate both paths within sandbox
  - Check source exists
  - Check target doesn't exist (RESOURCE_EXISTS error)
  - Copy file
  - Return { size, checksum }
  - _Requirements: 11.2-11.5_

- [x] **Task 2.4.10: Implement ensureTenantDirectory method**
  - Take tenantId parameter
  - Create resources/{tenantId}/ if not exists
  - Create type subdirectories (prompts/, media/, etc.)
  - _Requirements: 1.4-1.5_

- [x] **Task 2.4.11: Implement error handling wrapper**
  - Create wrapOperation helper method
  - Catch file system errors
  - Map to appropriate StorageError
  - Log errors with context
  - _Requirements: 20.1-20.10_

### 2.5 Create Storage Index

- [x] **Task 2.5.1: Create index.ts file**
  - Create file: `apps/api/src/shared-services/storage/index.ts`
  - Export StorageService class
  - Export SandboxManager class
  - Export ContentProcessor class
  - Export all types from types.ts
  - Export StorageError class
  - Add getStorageService() convenience function
  - _Requirements: 14.7_

---

## PHASE 3: RESOURCE REPOSITORY

### 3.1 Create Repository

- [x] **Task 3.1.1: Create resources directory in plugin**
  - Create directory: `apps/api/src/plugins/workscript/resources/`
  - _Requirements: 16_

- [x] **Task 3.1.2: Create ResourceRepository.ts file**
  - Create file: `apps/api/src/plugins/workscript/resources/ResourceRepository.ts`
  - Import db from ../../../db
  - Import resources, resourceOperations from ../schema/resources.schema
  - Import eq, and, desc, like, inArray from drizzle-orm
  - _Requirements: 16.1_

- [x] **Task 3.1.3: Define ResourceRepository class**
  - Add private readonly pluginId = 'workscript'
  - _Requirements: 16.7_

- [x] **Task 3.1.4: Implement create method**
  - Take NewResource parameter
  - Insert into resources table
  - Return created resource by findById
  - _Requirements: 16.2_

- [x] **Task 3.1.5: Implement findById method**
  - Take id and optional includeInactive parameter
  - Query with pluginId filter
  - Filter isActive=true unless includeInactive
  - Return Resource or null
  - _Requirements: 16.3, 16.8_

- [x] **Task 3.1.6: Implement findAll method**
  - Take ResourceFilters parameter (type, authorType, tags, search, tenantId, limit, offset)
  - Build dynamic where clause
  - Add pluginId filter
  - Add isActive=true filter
  - Add tenantId filter (OR isPublic=true)
  - Order by createdAt desc
  - Apply limit and offset
  - _Requirements: 16.4_

- [x] **Task 3.1.7: Implement count method**
  - Take same filters as findAll
  - Return total count for pagination
  - _Requirements: 6.10_

- [x] **Task 3.1.8: Implement update method**
  - Take id and Partial<NewResource> parameter
  - Update resources table where id matches
  - Return updated resource by findById
  - _Requirements: 16.5_

- [x] **Task 3.1.9: Implement softDelete method**
  - Take id parameter
  - Update isActive=false, deletedAt=now()
  - Return boolean success
  - _Requirements: 16.6_

- [x] **Task 3.1.10: Implement logOperation method**
  - Take NewResourceOperation parameter
  - Insert into resourceOperations table
  - Fire-and-forget (don't await in critical path)
  - _Requirements: 16.10, 13.11-13.12_

- [x] **Task 3.1.11: Implement findOperations method**
  - Take resourceId parameter
  - Query resourceOperations table
  - Order by createdAt desc
  - Return array of operations
  - _Requirements: 13_

---

## PHASE 4: API ROUTES

### 4.1 Create Routes File

- [x] **Task 4.1.1: Create index.ts routes file**
  - Create file: `apps/api/src/plugins/workscript/resources/index.ts`
  - Import Hono
  - Import authenticate, requirePermission from shared-services/auth
  - Import Permission from shared-services/auth/types
  - Import StorageService from shared-services/storage
  - Import ResourceRepository from ./ResourceRepository
  - _Requirements: 18.1_

- [x] **Task 4.1.2: Create Hono router instance**
  - Define type: Hono<{ Variables: AuthContext }>
  - _Requirements: 18.1_

### 4.2 Implement Create Endpoint

- [x] **Task 4.2.1: Implement POST /create route**
  - Add authenticate middleware
  - Add requirePermission(Permission.RESOURCE_CREATE) middleware
  - Parse JSON body: { name, content, path, type?, description?, tags?, isPublic? }
  - _Requirements: 3.1, 15.5_

- [x] **Task 4.2.2: Add request validation**
  - Validate name is not empty
  - Validate content is provided
  - Validate path is provided
  - Return 400 with error details if invalid
  - _Requirements: 17.7_

- [x] **Task 4.2.3: Create resource via StorageService**
  - Get StorageService instance
  - Get user from context: c.get('user')
  - Call storageService.createResource()
  - _Requirements: 3.1-3.6_

- [x] **Task 4.2.4: Save to database**
  - Create ResourceRepository instance
  - Build resource record with metadata
  - Set authorType='user', authorId=user.id
  - Set tenantId from user.tenantId
  - Call repository.create()
  - _Requirements: 3.9_

- [x] **Task 4.2.5: Log operation**
  - Call repository.logOperation with operation='create'
  - Include actorType='user', actorId=user.id
  - Include newChecksum
  - Set status='success'
  - _Requirements: 3.10_

- [x] **Task 4.2.6: Return success response**
  - Return 201 status
  - Return { success: true, resource: createdResource }
  - _Requirements: 17.4_

- [x] **Task 4.2.7: Handle errors**
  - Catch RESOURCE_EXISTS error, return 409
  - Catch StorageError, map to appropriate status
  - Catch general errors, return 500
  - _Requirements: 3.8, 17.11, 17.12_

### 4.3 Implement Upload Endpoint

- [x] **Task 4.3.1: Implement POST /upload route**
  - Add authenticate and RESOURCE_CREATE permission middleware
  - Parse multipart form data
  - Extract file from form
  - Extract optional metadata (name, description, tags, isPublic)
  - _Requirements: 4.1-4.2_

- [x] **Task 4.3.2: Validate upload**
  - Check file exists in form
  - Check file size against MAX_FILE_SIZE
  - Check file extension against ALLOWED_EXTENSIONS
  - Return 400 with FILE_TOO_LARGE or INVALID_FILE_TYPE errors
  - _Requirements: 4.3-4.6_

- [x] **Task 4.3.3: Upload via StorageService**
  - Call storageService.uploadFile()
  - Handle upload errors
  - _Requirements: 4.7_

- [x] **Task 4.3.4: Save to database and log**
  - Create resource record
  - Log operation as 'create'
  - Return 201 with created resource
  - _Requirements: 4.8_

### 4.4 Implement Read Endpoints

- [x] **Task 4.4.1: Implement GET /:id route**
  - Add authenticate and RESOURCE_READ permission middleware
  - Get resourceId from params
  - Find resource by ID via repository
  - Return 404 if not found
  - Return { success: true, resource }
  - _Requirements: 5.1, 5.5-5.6_

- [x] **Task 4.4.2: Implement GET /:id/content route**
  - Add authenticate and RESOURCE_READ permission middleware
  - Get resourceId from params
  - Find resource by ID
  - Check tenant access (own tenant or isPublic)
  - Read content via StorageService
  - Set Content-Type header from mimeType
  - Set Content-Disposition header for downloads
  - Stream content in response
  - _Requirements: 5.2-5.4, 5.9-5.10_

- [x] **Task 4.4.3: Log read operation**
  - Log operation='read' for content reads
  - Include actor context
  - Fire-and-forget (don't slow down response)
  - _Requirements: 5.7_

### 4.5 Implement List Endpoint

- [x] **Task 4.5.1: Implement GET / route**
  - Add authenticate and RESOURCE_READ permission middleware
  - Extract query params: type, authorType, tags, search, limit, offset, sortBy
  - _Requirements: 6.1_

- [x] **Task 4.5.2: Apply filters**
  - Get tenantId from user context
  - Build filters object
  - Parse tags from comma-separated string
  - Parse limit (default 50, max 100)
  - Parse offset (default 0)
  - _Requirements: 6.2-6.8_

- [x] **Task 4.5.3: Query resources**
  - Call repository.findAll(filters)
  - Call repository.count(filters) for total
  - _Requirements: 6.9-6.10_

- [x] **Task 4.5.4: Return paginated response**
  - Return { items: resources, count: total, pagination: { limit, offset } }
  - Return empty array if no matches (not 404)
  - _Requirements: 6.11-6.13, 17.3_

### 4.6 Implement Update Endpoints

- [x] **Task 4.6.1: Implement PUT /:id route (metadata update)**
  - Add authenticate and RESOURCE_UPDATE permission middleware
  - Get resourceId from params
  - Parse JSON body: { name?, description?, tags?, isPublic? }
  - Find existing resource
  - Return 404 if not found
  - _Requirements: 7.1-7.5_

- [x] **Task 4.6.2: Apply metadata updates**
  - Validate name not empty if provided
  - Call repository.update(id, updates)
  - Log operation='update' with details
  - Return { success: true, resource: updated }
  - _Requirements: 7.6-7.9_

- [x] **Task 4.6.3: Implement PUT /:id/content route**
  - Add authenticate and RESOURCE_UPDATE permission middleware
  - Get resourceId from params
  - Parse body for new content
  - Find existing resource
  - _Requirements: 8.1_

- [x] **Task 4.6.4: Update file content**
  - Call storageService.updateResourceContent()
  - Get previousChecksum and newChecksum
  - Update database record (size, checksum, updatedAt)
  - _Requirements: 8.2-8.5_

- [x] **Task 4.6.5: Log content update**
  - Log operation='update' with previousChecksum, newChecksum
  - Return { success: true, resource: updated }
  - _Requirements: 8.7_

### 4.7 Implement Delete Endpoint

- [x] **Task 4.7.1: Implement DELETE /:id route**
  - Add authenticate and RESOURCE_DELETE permission middleware
  - Get resourceId from params
  - Find existing resource
  - Return 404 if not found or already deleted
  - _Requirements: 9.1, 9.4-9.5_

- [x] **Task 4.7.2: Soft delete resource**
  - Call repository.softDelete(id)
  - Log operation='delete'
  - Return { success: true, resourceId }
  - _Requirements: 9.2-9.3, 9.7-9.8_

### 4.8 Implement Interpolate Endpoint

- [x] **Task 4.8.1: Implement POST /:id/interpolate route**
  - Add authenticate and RESOURCE_READ permission middleware
  - Get resourceId from params
  - Parse JSON body: { state, workflowId?, executionId?, nodeId? }
  - Find existing resource
  - _Requirements: 10.1_

- [x] **Task 4.8.2: Validate and interpolate**
  - Check resource is text type (prompt, document, data)
  - Return 400 INVALID_RESOURCE_TYPE if not
  - Call storageService.interpolateTemplate(path, state)
  - _Requirements: 10.7_

- [x] **Task 4.8.3: Return interpolated content**
  - Log operation='interpolate' with workflow context
  - Return { success: true, content: interpolatedContent }
  - _Requirements: 10.8-10.11_

### 4.9 Implement Copy Endpoint

- [x] **Task 4.9.1: Implement POST /:id/copy route**
  - Add authenticate and RESOURCE_CREATE permission middleware
  - Get sourceId from params
  - Parse JSON body: { name?, path? }
  - Find source resource
  - _Requirements: 11.1, 11.10_

- [x] **Task 4.9.2: Copy resource**
  - Generate new name (default: "Copy of {original}")
  - Generate new path if not provided
  - Call storageService.copyResource()
  - Create new database record
  - Set authorType='user', authorId=current user
  - _Requirements: 11.2-11.6_

- [x] **Task 4.9.3: Log and return**
  - Log operation='copy' with sourceId in details
  - Return 201 with new resource
  - _Requirements: 11.7, 11.8-11.9_

### 4.10 Export Router

- [x] **Task 4.10.1: Export router as default**
  - Export default resourceRouter
  - _Requirements: 18.1_

---

## PHASE 5: PLUGIN INTEGRATION

### 5.1 Update Plugin Configuration

- [x] **Task 5.1.1: Import resource routes in plugin.ts**
  - Open: `apps/api/src/plugins/workscript/plugin.ts`
  - Add: import resourceRoutes from './resources'
  - _Requirements: 18.1_

- [x] **Task 5.1.2: Import resource schema**
  - Add: import { resources, resourceOperations } from './schema/resources.schema'
  - _Requirements: 18.2_

- [x] **Task 5.1.3: Mount resource routes**
  - Add: router.route('/resources', resourceRoutes)
  - _Requirements: 18.1_

- [x] **Task 5.1.4: Update schema.tables**
  - Add resources and resourceOperations to tables array
  - _Requirements: 18.2_

- [x] **Task 5.1.5: Update root endpoint**
  - Add '/workscript/resources/*' to endpoints list in root GET handler
  - _Requirements: 18.4_

### 5.2 Update AI Manifest

- [x] **Task 5.2.1: Add resources section to aiManifest.endpoints**
  - Add description: 'Resource management - file storage and template interpolation'
  - _Requirements: 18.3_

- [x] **Task 5.2.2: Document create endpoint in aiManifest**
  - Path: POST /workscript/resources/create
  - Auth: Required (RESOURCE_CREATE permission)
  - Body: { name, content, path, type?, description?, tags?, isPublic? }
  - Response: { success, resource }
  - _Requirements: 18.8_

- [x] **Task 5.2.3: Document upload endpoint in aiManifest**
  - Path: POST /workscript/resources/upload
  - Auth: Required (RESOURCE_CREATE permission)
  - Body: multipart form with file
  - Response: { success, resource }
  - _Requirements: 18.8_

- [x] **Task 5.2.4: Document list endpoint in aiManifest**
  - Path: GET /workscript/resources
  - Auth: Required (RESOURCE_READ permission)
  - Query: type, authorType, tags, search, limit, offset
  - Response: { items, count, pagination }
  - _Requirements: 18.8_

- [x] **Task 5.2.5: Document read endpoints in aiManifest**
  - Path: GET /workscript/resources/:id (metadata)
  - Path: GET /workscript/resources/:id/content (raw file)
  - _Requirements: 18.8_

- [x] **Task 5.2.6: Document update endpoints in aiManifest**
  - Path: PUT /workscript/resources/:id (metadata)
  - Path: PUT /workscript/resources/:id/content (file content)
  - _Requirements: 18.8_

- [x] **Task 5.2.7: Document delete endpoint in aiManifest**
  - Path: DELETE /workscript/resources/:id
  - _Requirements: 18.8_

- [x] **Task 5.2.8: Document interpolate endpoint in aiManifest**
  - Path: POST /workscript/resources/:id/interpolate
  - Body: { state }
  - Response: { success, content }
  - _Requirements: 18.8_

- [x] **Task 5.2.9: Add resource capabilities to capabilities array**
  - Add: 'Store and manage files in sandboxed environment'
  - Add: 'Upload images, audio, and documents for multi-modal workflows'
  - Add: 'Create and interpolate AI prompt templates with {{$.var}} syntax'
  - Add: 'Track all file operations with audit logging'
  - _Requirements: 18.7_

- [x] **Task 5.2.10: Add resource examples to aiManifest**
  - Add example: Create a prompt template
  - Add example: Interpolate template with state
  - Add example: Upload an image
  - _Requirements: 18.9_

### 5.3 Update Plugin Lifecycle

- [x] **Task 5.3.1: Initialize StorageService in onLoad**
  - Import getStorageService from shared-services/storage
  - Call getStorageService() to initialize singleton
  - Log: 'StorageService initialized'
  - _Requirements: 18.5_

- [x] **Task 5.3.2: Update healthCheck to include storage**
  - Check StorageService is initialized
  - Check sandbox directory exists
  - Return false if storage check fails
  - _Requirements: 18.6_

---

## PHASE 6: SANDBOX DIRECTORY SETUP

### 6.1 Create Directory Structure

- [x] **Task 6.1.1: Create sandbox resources directory**
  - Run: mkdir -p apps/sandbox/resources
  - _Requirements: 1.1-1.2_

- [x] **Task 6.1.2: Create sandbox tmp directory**
  - Run: mkdir -p apps/sandbox/tmp
  - _Requirements: 1.3_

- [x] **Task 6.1.3: Create .gitkeep files**
  - Run: touch apps/sandbox/resources/.gitkeep
  - Run: touch apps/sandbox/tmp/.gitkeep
  - _Requirements: 1.7_

- [x] **Task 6.1.4: Update sandbox readme**
  - Update: apps/sandbox/readme.md
  - Document sandbox purpose and structure
  - Document allowed file types
  - Document security considerations
  - _Requirements: 1_

---

## PHASE 7: TESTING & VERIFICATION

### 7.1 Build Verification

- [x] **Task 7.1.1: Run TypeScript type check**
  - Run: bun run typecheck
  - Fix any TypeScript errors
  - _Requirements: Code Quality_
  - **Note:** Created missing tsconfig.json for apps/api. Fixed async isHealthy() issue in StorageService. Resources feature has no TypeScript errors. Pre-existing frontend errors remain.

- [x] **Task 7.1.2: Run build**
  - Run: bun run build
  - Fix any build errors
  - _Requirements: Code Quality_
  - **Note:** Engine, Nodes, and API build successfully. Frontend has pre-existing TypeScript errors unrelated to Resources feature.

### 7.2 API Testing

- [x] **Task 7.2.1: Start API server**
  - Run: cd apps/api && bun run dev
  - Verify server starts without errors
  - Check logs for StorageService initialization
  - _Requirements: 18.5_
  - **Note:** Server starts successfully with StorageService initialization confirmed.

- [x] **Task 7.2.2: Test create resource endpoint**
  - POST /workscript/resources/create with test content
  - Verify 201 response
  - Verify file created in sandbox
  - Verify database record created
  - _Requirements: 3_
  - **Note:** Tested successfully. Resources created with proper checksums and metadata.

- [x] **Task 7.2.3: Test read resource endpoints**
  - GET /workscript/resources/:id
  - Verify metadata returned
  - GET /workscript/resources/:id/content
  - Verify file content returned
  - _Requirements: 5_
  - **Note:** Both endpoints working correctly. Tenant isolation verified.

- [x] **Task 7.2.4: Test list resources endpoint**
  - GET /workscript/resources
  - Verify pagination works
  - Test type filter
  - Test search filter
  - _Requirements: 6_
  - **Note:** Pagination, type filters, and search all working correctly.

- [x] **Task 7.2.5: Test update endpoints**
  - PUT /workscript/resources/:id with metadata changes
  - PUT /workscript/resources/:id/content with new content
  - Verify changes persisted
  - _Requirements: 7, 8_
  - **Note:** Both metadata and content updates work. Checksums updated correctly.

- [x] **Task 7.2.6: Test delete endpoint**
  - DELETE /workscript/resources/:id
  - Verify soft delete (isActive=false)
  - Verify resource no longer appears in list
  - Verify file still exists on disk
  - _Requirements: 9_
  - **Note:** Fixed MySQL/Drizzle affectedRows inconsistency bug. Delete now works correctly with soft delete.

- [x] **Task 7.2.7: Test interpolation endpoint**
  - Create prompt template with {{$.var}} placeholders
  - POST /workscript/resources/:id/interpolate with state
  - Verify placeholders replaced correctly
  - _Requirements: 10_
  - **Note:** Interpolation working correctly with nested state paths.

- [x] **Task 7.2.8: Test upload endpoint**
  - POST /workscript/resources/upload with test file
  - Verify file saved correctly
  - Test with invalid file type (expect 400)
  - Test with oversized file (expect 400)
  - _Requirements: 4_
  - **Note:** Fixed tmp directory creation bug. Upload now works correctly with multipart forms.

- [x] **Task 7.2.9: Test copy endpoint**
  - POST /workscript/resources/:id/copy
  - Verify new resource created
  - Verify content identical to source
  - _Requirements: 11_
  - **Note:** Copy endpoint creates new resources with correct content and new checksums.

### 7.3 Security Testing

- [ ] **Task 7.3.1: Test path traversal prevention**
  - Attempt to create resource with ../../../etc/passwd path
  - Verify 400 SANDBOX_VIOLATION error
  - Verify no file access outside sandbox
  - _Requirements: 2_

- [ ] **Task 7.3.2: Test tenant isolation**
  - Create resource as tenant A
  - Attempt to read as tenant B
  - Verify 404 or 403 (not accessible)
  - Test isPublic=true allows access
  - _Requirements: 2.9-2.10_

- [ ] **Task 7.3.3: Test permission enforcement**
  - Attempt operations without authentication
  - Verify 401 Unauthorized
  - Attempt operations without required permission
  - Verify 403 Forbidden
  - _Requirements: 15_

### 7.4 Error Handling Testing

- [ ] **Task 7.4.1: Test 404 responses**
  - GET non-existent resource ID
  - Verify 404 RESOURCE_NOT_FOUND
  - _Requirements: 17.10_

- [ ] **Task 7.4.2: Test 409 responses**
  - Create resource at existing path
  - Verify 409 RESOURCE_EXISTS
  - _Requirements: 17.11_

- [ ] **Task 7.4.3: Test validation errors**
  - Create resource without required fields
  - Verify 400 with field errors
  - _Requirements: 17.7_

### 7.5 Audit Log Verification

- [ ] **Task 7.5.1: Verify operation logging**
  - Perform various operations
  - Query resource_operations table
  - Verify all operations logged correctly
  - Verify actor, operation, status fields
  - _Requirements: 13_

---

## PHASE 8: DOCUMENTATION & CLEANUP

### 8.1 Code Documentation

- [ ] **Task 8.1.1: Add JSDoc to StorageService methods**
  - Document all public methods
  - Include parameter descriptions
  - Include example usage
  - _Requirements: Maintainability_

- [ ] **Task 8.1.2: Add JSDoc to ResourceRepository methods**
  - Document all repository methods
  - Include return types
  - _Requirements: Maintainability_

- [ ] **Task 8.1.3: Add JSDoc to route handlers**
  - Document request/response formats
  - Document error cases
  - _Requirements: Maintainability_

### 8.2 Final Verification

- [ ] **Task 8.2.1: Review all requirements**
  - Go through requirements 1-20
  - Verify each acceptance criterion met
  - Document any deviations
  - _Requirements: All_

- [ ] **Task 8.2.2: Final build test**
  - Run: bun run build
  - Verify no errors
  - _Requirements: Code Quality_

- [ ] **Task 8.2.3: Update CLAUDE.md if needed**
  - Add Resources section to API documentation
  - Update node categories if relevant
  - _Requirements: Documentation_

---

## Summary

**Total Tasks:** 124
**Estimated Time:** 3-5 days

**Critical Path:**
1. Phase 1: Database Schema & Permissions (0.5 days)
2. Phase 2: Storage Service Infrastructure (1 day)
3. Phase 3: Resource Repository (0.5 days)
4. Phase 4: API Routes (1 day)
5. Phase 5: Plugin Integration (0.25 days)
6. Phase 6: Sandbox Directory Setup (0.1 days)
7. Phase 7: Testing & Verification (0.5 days)
8. Phase 8: Documentation & Cleanup (0.25 days)

**Key Milestones:**
- [x] Database tables created and migrated
- [x] StorageService operational with path security
- [x] All CRUD endpoints functional
- [x] Template interpolation working
- [x] Audit logging complete
- [x] API testing complete (Phase 7.2)
- [ ] Security testing (Phase 7.3)
- [ ] Error handling testing (Phase 7.4)
- [ ] Audit log verification (Phase 7.5)
- [ ] Documentation & Cleanup (Phase 8)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-03
**Status:** Ready for Implementation
