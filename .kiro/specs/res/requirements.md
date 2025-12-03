# Requirements Document: Resources Feature

## Introduction

The Resources feature is a comprehensive sandboxed file management system for the Workscript agentic workflow orchestration platform. This feature enables workflows, automations, and users to create, read, update, and delete files within a secure, curated environment located at `/apps/sandbox/`. Resources serve as the foundational infrastructure for multi-modal workflow capabilities, supporting AI prompt templates with dynamic interpolation, images, audio files, and other assets that workflows need to operate.

The Resources feature addresses a critical need in the Workscript ecosystem: the ability to persist and manage files that workflows generate or consume during execution. Currently, workflows operate with transient state that doesn't persist between executions. With Resources, workflows can now store prompt templates that get dynamically interpolated at runtime, save generated reports, manage media files for multi-modal AI operations, and track all file operations for auditing purposes.

The architecture follows the established patterns in the Workscript codebase, consisting of three main layers: a Storage Service in `shared-services/storage/` that provides the foundational file operations infrastructure (similar to the ask-ai service), a Resources API plugin at `/plugins/workscript/resources/` with Hono endpoints for CRUD operations, and database tables for resource metadata tracking and operation auditing. Multi-tenancy, permission-based access control, and path security (preventing directory traversal attacks) are built-in from the ground up.

---

## Functional Requirements

### Requirement 1: Sandbox Directory Structure

**User Story:** As a system administrator, I want resources stored in a structured sandbox directory, so that files are organized and isolated from the rest of the system.

#### Acceptance Criteria

1. WHEN the API server starts THEN a sandbox root directory exists at `/apps/sandbox/`
2. WHEN the sandbox is initialized THEN a `resources/` subdirectory exists for file storage
3. WHEN the sandbox is initialized THEN a `tmp/` subdirectory exists for temporary processing
4. WHEN a tenant creates their first resource THEN a tenant-specific directory is created at `resources/{tenant-id}/`
5. WHEN files are uploaded THEN they are organized by type subdirectories (prompts/, media/, documents/, data/, exports/)
6. IF the sandbox directories don't exist THEN the system creates them on startup
7. WHEN checking sandbox structure THEN `.gitkeep` files exist to preserve empty directories in git
8. WHEN resources are stored THEN relative paths within the sandbox are used (not absolute paths)

---

### Requirement 2: Path Security and Sandbox Enforcement

**User Story:** As a security engineer, I want all file operations restricted to the sandbox directory, so that malicious actors cannot access or modify files outside the sandbox.

#### Acceptance Criteria

1. WHEN a file path is provided THEN the SandboxManager validates it is within the sandbox root
2. WHEN a path contains `../` traversal sequences THEN the operation is rejected with an error
3. WHEN a path resolves outside the sandbox THEN the operation fails with a SANDBOX_VIOLATION error
4. WHEN symlinks are encountered THEN they are not followed if they point outside the sandbox
5. IF an absolute path is provided THEN it is rejected (only relative paths accepted)
6. WHEN validating paths THEN the path is resolved and normalized before checking boundaries
7. WHEN a path violation is detected THEN the attempt is logged for security auditing
8. IF the sandbox root doesn't exist THEN operations fail with SANDBOX_NOT_FOUND error
9. WHEN multiple tenants exist THEN each tenant can only access their own subdirectory (or public resources)
10. WHEN the isPublic flag is false THEN resources are not accessible to other tenants

---

### Requirement 3: Resource Creation via Content

**User Story:** As a workflow developer, I want to create resources by providing content directly, so that workflows can generate and store files programmatically.

#### Acceptance Criteria

1. WHEN POST /resources/create is called with name and content THEN a new resource file is created
2. WHEN creating a resource THEN a unique CUID2 ID is generated for the resource
3. WHEN content is provided THEN the file is written to the sandbox at the specified path
4. WHEN creating a resource THEN the file size is calculated and stored in metadata
5. WHEN creating a resource THEN a SHA-256 checksum is computed and stored
6. WHEN creating a resource THEN the MIME type is detected from content/extension
7. WHEN creating a resource THEN the author (user/workflow/system) and authorId are recorded
8. IF the file already exists at the path THEN return a RESOURCE_EXISTS error (409 Conflict)
9. WHEN creation succeeds THEN a database record is created in the resources table
10. WHEN creation succeeds THEN an operation log is written to resource_operations
11. IF content validation fails THEN the operation is rolled back (no partial state)
12. WHEN the resource type is 'prompt' THEN the file extension should be .md

---

### Requirement 4: Resource Upload via Multipart Form

**User Story:** As an admin panel user, I want to upload files through a form, so that I can add images, audio, and documents to the resource library.

#### Acceptance Criteria

1. WHEN POST /resources/upload receives a multipart form THEN the file is extracted and processed
2. WHEN uploading THEN the original filename is preserved in metadata
3. WHEN uploading THEN file size is validated against MAX_FILE_SIZE (50MB)
4. WHEN uploading THEN the MIME type is validated against allowed types
5. IF the file type is not allowed THEN reject with INVALID_FILE_TYPE error
6. IF the file exceeds size limit THEN reject with FILE_TOO_LARGE error
7. WHEN upload succeeds THEN the file is moved from tmp/ to its final location
8. WHEN uploading THEN optional metadata (description, tags) can be provided
9. WHEN uploading images THEN accept .png, .jpg, .jpeg, .gif, .webp formats
10. WHEN uploading audio THEN accept .mp3, .wav formats
11. WHEN uploading documents THEN accept .pdf, .md, .txt formats
12. WHEN uploading data files THEN accept .json, .csv formats

---

### Requirement 5: Resource Reading and Download

**User Story:** As a workflow or user, I want to read resource content, so that I can use the stored files in my operations.

#### Acceptance Criteria

1. WHEN GET /resources/:id is called THEN return resource metadata (not content)
2. WHEN GET /resources/:id/content is called THEN return the raw file content
3. WHEN reading content THEN set appropriate Content-Type header based on mimeType
4. WHEN reading content THEN set Content-Disposition header for downloads
5. IF the resource doesn't exist THEN return 404 RESOURCE_NOT_FOUND
6. IF the resource is inactive (soft deleted) THEN return 404 RESOURCE_NOT_FOUND
7. WHEN reading succeeds THEN log the operation in resource_operations
8. IF the user doesn't have RESOURCE_READ permission THEN return 403 Forbidden
9. WHEN reading a resource THEN check tenant access (own tenant or isPublic=true)
10. WHEN reading binary files (images, audio) THEN stream content efficiently

---

### Requirement 6: Resource Listing and Filtering

**User Story:** As an admin panel user, I want to list and filter resources, so that I can find and manage my files.

#### Acceptance Criteria

1. WHEN GET /resources/ is called THEN return paginated list of resources
2. WHEN listing THEN filter by current tenant (tenantId) by default
3. WHEN listing THEN include public resources (isPublic=true) in results
4. WHEN ?type=prompt is provided THEN filter by resource type
5. WHEN ?authorType=workflow is provided THEN filter by author type
6. WHEN ?tags=tag1,tag2 is provided THEN filter by tags (any match)
7. WHEN ?search=keyword is provided THEN search in name and description
8. WHEN ?limit=N is provided THEN limit results (default 50, max 100)
9. WHEN ?offset=N is provided THEN skip first N results for pagination
10. WHEN listing THEN return total count for pagination
11. WHEN listing THEN sort by createdAt descending (newest first) by default
12. WHEN ?sortBy=name is provided THEN sort alphabetically by name
13. IF no resources match THEN return empty array (not 404)

---

### Requirement 7: Resource Metadata Update

**User Story:** As a resource owner, I want to update resource metadata, so that I can correct descriptions, add tags, or change visibility.

#### Acceptance Criteria

1. WHEN PUT /resources/:id is called THEN update resource metadata fields
2. WHEN updating THEN allow changing: name, description, tags, isPublic
3. WHEN updating THEN automatically set updatedAt timestamp
4. IF updating name THEN validate it's not empty
5. IF resource doesn't exist THEN return 404 RESOURCE_NOT_FOUND
6. IF user doesn't have RESOURCE_UPDATE permission THEN return 403 Forbidden
7. WHEN update succeeds THEN return updated resource object
8. WHEN update succeeds THEN log operation in resource_operations
9. WHEN updating tags THEN replace entire tags array (not merge)
10. WHEN updating isPublic THEN validate user has admin permissions for public resources

---

### Requirement 8: Resource Content Update

**User Story:** As a resource owner, I want to update file content, so that I can modify prompt templates and other files.

#### Acceptance Criteria

1. WHEN PUT /resources/:id/content is called THEN replace file content
2. WHEN updating content THEN recompute file size
3. WHEN updating content THEN recompute SHA-256 checksum
4. WHEN updating content THEN store previousChecksum in operation log
5. WHEN updating content THEN update updatedAt timestamp
6. IF file write fails THEN rollback and return WRITE_ERROR
7. WHEN update succeeds THEN log operation in resource_operations with before/after checksums
8. IF resource doesn't exist THEN return 404 RESOURCE_NOT_FOUND
9. IF user doesn't have RESOURCE_UPDATE permission THEN return 403 Forbidden
10. WHEN updating THEN don't allow changing the file path (path is immutable)

---

### Requirement 9: Resource Deletion (Soft Delete)

**User Story:** As a resource owner, I want to delete resources, so that I can remove files I no longer need.

#### Acceptance Criteria

1. WHEN DELETE /resources/:id is called THEN soft delete the resource
2. WHEN soft deleting THEN set isActive=false (don't remove file immediately)
3. WHEN soft deleting THEN set deletedAt timestamp
4. IF resource doesn't exist THEN return 404 RESOURCE_NOT_FOUND
5. IF already deleted (isActive=false) THEN return 404 RESOURCE_NOT_FOUND
6. IF user doesn't have RESOURCE_DELETE permission THEN return 403 Forbidden
7. WHEN delete succeeds THEN log operation in resource_operations
8. WHEN delete succeeds THEN return { success: true, resourceId }
9. WHEN listing resources THEN exclude soft-deleted resources (isActive=false)
10. WHEN resource is soft-deleted THEN file remains on disk (manual cleanup only)

---

### Requirement 10: Template Interpolation

**User Story:** As a workflow developer, I want to interpolate variables into prompt templates, so that I can create dynamic AI prompts at runtime.

#### Acceptance Criteria

1. WHEN POST /resources/:id/interpolate is called with state THEN return interpolated content
2. WHEN interpolating THEN replace `{{$.key}}` with state.key value
3. WHEN interpolating THEN replace `{{$.nested.path}}` with state.nested.path value
4. IF a referenced key doesn't exist THEN leave the placeholder as-is (don't error)
5. WHEN interpolating THEN handle multiple placeholders in same content
6. WHEN interpolating THEN preserve non-placeholder content exactly
7. IF resource is not a text file THEN return 400 INVALID_RESOURCE_TYPE
8. WHEN interpolation succeeds THEN log operation in resource_operations
9. WHEN interpolating THEN include execution context (workflowId, executionId) in operation log
10. IF resource doesn't exist THEN return 404 RESOURCE_NOT_FOUND
11. WHEN interpolating THEN don't modify the source file (return interpolated content only)
12. WHEN state contains special characters THEN escape them appropriately for the context

---

### Requirement 11: Resource Copy

**User Story:** As a user, I want to copy resources, so that I can create variations of existing templates.

#### Acceptance Criteria

1. WHEN POST /resources/:id/copy is called THEN create a copy of the resource
2. WHEN copying THEN generate a new unique ID for the copy
3. WHEN copying THEN copy file content to new location
4. WHEN copying THEN allow specifying new name (default: "Copy of {original name}")
5. WHEN copying THEN allow specifying new path
6. WHEN copying THEN set authorType and authorId to current user
7. WHEN copying THEN log operation as 'copy' in resource_operations
8. IF source resource doesn't exist THEN return 404 RESOURCE_NOT_FOUND
9. IF target path already exists THEN return 409 CONFLICT
10. IF user doesn't have RESOURCE_CREATE permission THEN return 403 Forbidden

---

### Requirement 12: Resource Database Schema

**User Story:** As a system, I need to store resource metadata in the database, so that I can query, filter, and track resources efficiently.

#### Acceptance Criteria

1. WHEN defining resources table THEN include id (CUID2, 128 chars) as primary key
2. WHEN defining resources table THEN include name (varchar 255), path (varchar 512)
3. WHEN defining resources table THEN include type, mimeType, size, checksum fields
4. WHEN defining resources table THEN include authorType, authorId for tracking creators
5. WHEN defining resources table THEN include tenantId for multi-tenancy
6. WHEN defining resources table THEN include pluginId defaulting to 'workscript'
7. WHEN defining resources table THEN include description (text), tags (json), metadata (json)
8. WHEN defining resources table THEN include isActive (boolean), isPublic (boolean)
9. WHEN defining resources table THEN include createdAt, updatedAt, deletedAt timestamps
10. WHEN defining resources table THEN create indexes on path, tenant+type, author
11. WHEN creating records THEN automatically generate id via CUID2
12. WHEN updating records THEN automatically update updatedAt via onUpdateNow()

---

### Requirement 13: Resource Operations Audit Log

**User Story:** As an administrator, I want all resource operations logged, so that I can audit who did what and when.

#### Acceptance Criteria

1. WHEN defining resource_operations table THEN include id, resourceId, operation fields
2. WHEN logging THEN record operation type: create, read, update, delete, interpolate, copy
3. WHEN logging THEN record actorType (user, workflow, automation, system) and actorId
4. WHEN logging THEN optionally record workflowId, executionId, nodeId for workflow context
5. WHEN logging THEN record status (success, failed) and errorMessage if failed
6. WHEN logging THEN record durationMs for performance tracking
7. WHEN logging THEN record details (json) for operation-specific data
8. WHEN logging updates THEN record previousChecksum and newChecksum
9. WHEN logging THEN create indexes on resourceId, actor, workflow, createdAt
10. WHEN logging THEN automatically set createdAt timestamp
11. WHEN operations fail THEN still log the failure with error details
12. WHEN logging THEN ensure non-blocking writes don't slow down operations

---

### Requirement 14: Storage Service Architecture

**User Story:** As a developer, I want a well-structured storage service, so that I can easily use file operations from anywhere in the codebase.

#### Acceptance Criteria

1. WHEN implementing StorageService THEN use singleton pattern with getInstance()
2. WHEN implementing StorageService THEN inject SandboxManager and ContentProcessor
3. WHEN StorageService is created THEN initialize sandbox directories if needed
4. WHEN implementing SandboxManager THEN validate all paths before operations
5. WHEN implementing ContentProcessor THEN handle template interpolation logic
6. WHEN implementing ContentProcessor THEN detect content types from buffer/extension
7. WHEN exporting from storage/ THEN provide getStorageService() convenience function
8. WHEN defining types THEN create StorageError class with error codes
9. WHEN defining config THEN include MAX_FILE_SIZE, ALLOWED_EXTENSIONS constants
10. WHEN services fail THEN throw StorageError with appropriate code and details

---

### Requirement 15: Permission-Based Access Control

**User Story:** As a security-conscious platform, I want resources protected by permissions, so that only authorized users can perform operations.

#### Acceptance Criteria

1. WHEN adding permissions THEN add RESOURCE_CREATE to Permission enum
2. WHEN adding permissions THEN add RESOURCE_READ to Permission enum
3. WHEN adding permissions THEN add RESOURCE_UPDATE to Permission enum
4. WHEN adding permissions THEN add RESOURCE_DELETE to Permission enum
5. WHEN calling create/upload endpoints THEN require RESOURCE_CREATE permission
6. WHEN calling read/list endpoints THEN require RESOURCE_READ permission
7. WHEN calling update endpoints THEN require RESOURCE_UPDATE permission
8. WHEN calling delete endpoint THEN require RESOURCE_DELETE permission
9. WHEN checking permissions THEN use existing authenticate and requirePermission middleware
10. WHEN user has ADMIN role THEN grant all RESOURCE_* permissions by default
11. WHEN user has USER role THEN grant RESOURCE_* permissions by default
12. WHEN user has API role THEN grant RESOURCE_READ and RESOURCE_CREATE only

---

### Requirement 16: Resource Repository Pattern

**User Story:** As a developer, I want database operations abstracted in a repository, so that routes remain clean and testable.

#### Acceptance Criteria

1. WHEN implementing ResourceRepository THEN follow existing repository patterns
2. WHEN creating resources THEN use repository.create(data) method
3. WHEN finding by ID THEN use repository.findById(id) returning null if not found
4. WHEN listing resources THEN use repository.findAll(filters) with pagination
5. WHEN updating resources THEN use repository.update(id, data) method
6. WHEN deleting resources THEN use repository.softDelete(id) method
7. WHEN querying THEN always filter by pluginId='workscript' for isolation
8. WHEN querying THEN filter isActive=true unless specifically requested
9. WHEN implementing THEN export repository class and types from index.ts
10. WHEN logging operations THEN use repository.logOperation(data) method

---

### Requirement 17: API Response Consistency

**User Story:** As an API consumer, I want consistent response formats, so that I can reliably parse and handle responses.

#### Acceptance Criteria

1. WHEN returning success THEN include { success: true, data/resource/resources }
2. WHEN returning errors THEN include { success: false, error: message, code: ERROR_CODE }
3. WHEN returning lists THEN include { items: [...], count: N, pagination: {...} }
4. WHEN returning created resources THEN use 201 status code
5. WHEN returning updates THEN use 200 status code
6. WHEN returning deletes THEN use 200 status code with confirmation
7. WHEN validation fails THEN use 400 status code
8. WHEN authentication fails THEN use 401 status code
9. WHEN authorization fails THEN use 403 status code
10. WHEN resource not found THEN use 404 status code
11. WHEN conflict occurs (duplicate) THEN use 409 status code
12. WHEN server error occurs THEN use 500 status code with generic message

---

### Requirement 18: Plugin Integration

**User Story:** As the platform, I want Resources integrated into the workscript plugin, so that it's discoverable and manageable.

#### Acceptance Criteria

1. WHEN mounting routes THEN add router.route('/resources', resourceRoutes)
2. WHEN updating plugin schema THEN add resources and resourceOperations to tables array
3. WHEN updating aiManifest THEN add resources section with endpoint documentation
4. WHEN updating root endpoint THEN include '/workscript/resources/*' in endpoints list
5. WHEN plugin loads THEN initialize StorageService and verify sandbox exists
6. WHEN plugin unloads THEN gracefully cleanup any pending operations
7. WHEN health checking THEN verify StorageService is operational
8. WHEN documenting THEN add capabilities for resource management to aiManifest
9. WHEN adding to aiManifest THEN include examples for common resource operations
10. WHEN adding to aiManifest THEN document all endpoint parameters and responses

---

### Requirement 19: Usage Tracking (Without Limits)

**User Story:** As an administrator, I want to track storage usage per tenant, so that I can monitor resource consumption.

#### Acceptance Criteria

1. WHEN resources are created THEN accumulate size for tenant total tracking
2. WHEN resources are deleted THEN don't decrement (soft delete keeps size)
3. WHEN querying usage THEN calculate total size from active resources per tenant
4. WHEN listing resources THEN optionally include tenant usage summary
5. WHEN tracking THEN store in metadata or compute on demand (no enforcement)
6. IF usage tracking fails THEN log error but don't block operation
7. WHEN providing stats THEN group by type (prompts, images, audio, etc.)
8. WHEN providing stats THEN include resource count per type
9. WHEN providing stats THEN include total storage in human-readable format
10. WHEN quotas are eventually needed THEN the tracking infrastructure is ready

---

### Requirement 20: Error Handling and Recovery

**User Story:** As a reliable system, I want robust error handling, so that failures are handled gracefully without data corruption.

#### Acceptance Criteria

1. WHEN file write fails THEN rollback any partial writes
2. WHEN database insert fails after file write THEN cleanup orphaned file
3. WHEN operations timeout THEN cleanup any temporary files
4. WHEN catching errors THEN log with full context (resourceId, operation, actor)
5. WHEN returning errors THEN don't expose internal paths or system details
6. WHEN StorageError occurs THEN map to appropriate HTTP status code
7. WHEN unexpected errors occur THEN wrap in INTERNAL_ERROR with safe message
8. WHEN retrying operations THEN use idempotency keys to prevent duplicates
9. WHEN file system is full THEN return STORAGE_FULL error
10. WHEN file permissions fail THEN return PERMISSION_DENIED error

---

## Non-Functional Requirements

### Performance

1. File uploads should handle up to 50MB files efficiently
2. Resource listing should return within 200ms for up to 1000 resources
3. Interpolation should complete within 50ms for typical template sizes (< 100KB)
4. File streaming should not load entire files into memory for large files
5. Database queries should use indexes for all common filter patterns

### Security

1. All paths must be validated to prevent directory traversal attacks
2. File content should be validated against expected MIME types
3. Uploads should be stored in tmp/ before validation, then moved to final location
4. Error messages must not expose internal file system paths
5. Operations should be logged for audit trail and incident investigation

### Reliability

1. File operations should be atomic (complete fully or rollback)
2. Database and file system operations should be transactional where possible
3. Partial failures should not leave orphaned files or database records
4. Service should handle concurrent operations on same resource safely

### Maintainability

1. Code should follow existing patterns in the codebase (singleton, repository, etc.)
2. All public APIs should have TypeScript types and JSDoc documentation
3. Error codes should be enumerated and documented
4. Configuration should be externalized (not hardcoded)

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **File versioning** - Only latest version is kept, no version history
2. **Storage quota enforcement** - Usage is tracked but not enforced
3. **Auto-cleanup policies** - Resources persist until manually deleted
4. **File compression** - Files stored as-is, no compression
5. **CDN integration** - Files served directly from local filesystem
6. **Real-time sync** - No WebSocket events for resource changes (can be added later)
7. **Workflow nodes** - FileReadNode, FileWriteNode to be implemented separately
8. **Frontend UI** - Admin panel resource management pages (separate task)
9. **Bulk operations** - No bulk upload/delete endpoints
10. **Resource sharing links** - No public shareable URLs with tokens

---

## Success Metrics

Implementation is considered successful when:

- [ ] All 20 requirements pass acceptance criteria
- [ ] Sandbox directory structure is created and functional
- [ ] Path security prevents all directory traversal attempts
- [ ] CRUD operations work for all supported file types
- [ ] Template interpolation correctly substitutes variables
- [ ] All operations are logged to resource_operations table
- [ ] Permissions are enforced on all endpoints
- [ ] API responses follow consistent format
- [ ] Error handling is robust with appropriate status codes
- [ ] Plugin integration is complete with aiManifest documentation
- [ ] Database migrations run successfully
- [ ] Build completes without TypeScript errors

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-03
**Status:** Draft - Ready for Implementation
