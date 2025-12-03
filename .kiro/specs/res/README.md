# Resources Feature - Specification

**Feature:** Sandboxed File Management System for Workscript Workflows
**Target Application:** `/apps/api/` (Backend) and `/apps/sandbox/` (File Storage)
**Status:** Ready for Implementation
**Created:** 2025-12-03
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, reliability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 124 actionable tasks organized in 8 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 3-5 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

The Resources feature enables sandboxed file management for the Workscript agentic workflow platform:

- **Sandboxed File Storage** - Secure file storage at `/apps/sandbox/` with path traversal prevention
- **Multi-Modal Support** - Store AI prompt templates (.md), images, audio, documents, and data files
- **Template Interpolation** - Dynamic `{{$.variable}}` syntax for runtime prompt generation
- **CRUD Operations** - Create, read, update, delete files via REST API
- **Audit Logging** - Track all file operations with actor, workflow, and execution context
- **Multi-Tenancy** - Tenant-isolated storage with optional public resource sharing
- **Author Tracking** - Track whether resources were created by users, workflows, or system

### Primary Use Cases

1. **AI Prompt Templates** - Store `.md` files with dynamic placeholders that get interpolated at workflow runtime
2. **Multi-Modal Workflows** - Upload images and audio files for workflows using vision/audio AI models
3. **Workflow Artifacts** - Store reports, exports, and generated content from workflow executions
4. **User Uploads** - Allow admin panel users to upload assets for use across workflows

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun 1.x |
| API Framework | Hono 4.7.x |
| Database | MySQL + Drizzle ORM 0.37.x |
| File Storage | Local filesystem (sandboxed) |
| Auth | JWT + RBAC permissions |
| ID Generation | CUID2 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Hono)                         │
│  /workscript/resources/*                                     │
│  POST /create, /upload | GET /:id, /:id/content             │
│  PUT /:id, /:id/content | DELETE /:id                       │
│  POST /:id/interpolate, /:id/copy                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Storage Service Layer                      │
│  /shared-services/storage/                                   │
│  StorageService (facade) → SandboxManager (security)         │
│                         → ContentProcessor (interpolation)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  resources table        - File metadata registry             │
│  resource_operations    - Audit log for all operations       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Sandbox Filesystem                          │
│  /apps/sandbox/                                              │
│  └── resources/{tenant-id}/                                  │
│      ├── prompts/   (AI templates)                          │
│      ├── media/     (images, audio)                         │
│      ├── documents/ (PDFs, docs)                            │
│      ├── data/      (JSON, CSV)                             │
│      └── exports/   (workflow outputs)                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| StorageService | `/shared-services/storage/` | Singleton facade for all file operations |
| SandboxManager | `/shared-services/storage/` | Path validation and security enforcement |
| ContentProcessor | `/shared-services/storage/` | Template interpolation and content detection |
| ResourceRepository | `/plugins/workscript/resources/` | Database access layer for resources |
| Resource Routes | `/plugins/workscript/resources/` | Hono API endpoints |
| resources table | `/plugins/workscript/schema/` | File metadata storage |
| resource_operations | `/plugins/workscript/schema/` | Audit log |

---

## Implementation Phases

| Phase | Description | Duration |
|-------|-------------|----------|
| **Phase 1** | Database Schema & Permissions | 0.5 days |
| **Phase 2** | Storage Service Infrastructure | 1 day |
| **Phase 3** | Resource Repository | 0.5 days |
| **Phase 4** | API Routes | 1 day |
| **Phase 5** | Plugin Integration | 0.25 days |
| **Phase 6** | Sandbox Directory Setup | 0.1 days |
| **Phase 7** | Testing & Verification | 0.5 days |
| **Phase 8** | Documentation & Cleanup | 0.25 days |

**Total Estimated Time:** 3-5 days

---

## Quick Start Guide

### For Developers

1. **Read the requirements document** to understand acceptance criteria:
   ```bash
   cat .kiro/specs/resources/requirements.md
   ```

2. **Follow the implementation plan** task by task:
   ```bash
   cat .kiro/specs/resources/implementation_plan.md
   ```

3. **Start with Phase 1** - Create the database schema first:
   - Create `apps/api/src/plugins/workscript/schema/resources.schema.ts`
   - Add permissions to auth types
   - Run migrations

4. **Track progress** by checking off tasks in the implementation plan

### For Reviewers

1. **Check schema design** - Review the resources and resource_operations table definitions
2. **Verify security** - Ensure SandboxManager prevents path traversal
3. **Test interpolation** - Verify `{{$.var}}` syntax works correctly
4. **Check audit logs** - All operations should be logged to resource_operations

---

## Success Criteria

Implementation is complete when:

- [ ] `resources` and `resource_operations` tables created in MySQL
- [ ] `RESOURCE_CREATE/READ/UPDATE/DELETE` permissions added
- [ ] StorageService singleton operational with path security
- [ ] All CRUD endpoints return correct responses and status codes
- [ ] Template interpolation substitutes `{{$.var}}` placeholders
- [ ] All operations logged to `resource_operations` table
- [ ] Tenant isolation enforced (users can only access own resources or public)
- [ ] Build passes without TypeScript errors
- [ ] aiManifest updated with resource endpoint documentation

---

## API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/workscript/resources/create` | Create resource from content |
| `POST` | `/workscript/resources/upload` | Upload file (multipart) |
| `GET` | `/workscript/resources` | List resources (filtered) |
| `GET` | `/workscript/resources/:id` | Get resource metadata |
| `GET` | `/workscript/resources/:id/content` | Download raw file |
| `PUT` | `/workscript/resources/:id` | Update metadata |
| `PUT` | `/workscript/resources/:id/content` | Update file content |
| `DELETE` | `/workscript/resources/:id` | Soft delete resource |
| `POST` | `/workscript/resources/:id/interpolate` | Render template with state |
| `POST` | `/workscript/resources/:id/copy` | Copy resource |

---

## Security Considerations

1. **Path Traversal Prevention** - SandboxManager validates all paths are within `/apps/sandbox/`
2. **MIME Type Validation** - Content is validated against expected file types
3. **Size Limits** - 50MB max file size enforced
4. **Tenant Isolation** - Resources filtered by tenantId unless marked public
5. **Permission-Based Access** - All endpoints require appropriate RESOURCE_* permissions
6. **Audit Logging** - All operations logged for security review

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Versioning** | No versioning | Keep only latest version for simplicity |
| **Quotas** | Track but don't enforce | Monitor usage, add limits later if needed |
| **Sharing** | Public flag supported | Allow cross-tenant sharing via isPublic |
| **Cleanup** | Manual only | Resources persist until explicitly deleted |

---

## File Structure After Implementation

```
apps/api/src/
├── shared-services/
│   └── storage/
│       ├── StorageService.ts      (new)
│       ├── SandboxManager.ts      (new)
│       ├── ContentProcessor.ts    (new)
│       ├── types.ts               (new)
│       └── index.ts               (new)
├── plugins/workscript/
│   ├── resources/
│   │   ├── index.ts               (new - routes)
│   │   └── ResourceRepository.ts  (new)
│   ├── schema/
│   │   └── resources.schema.ts    (new)
│   └── plugin.ts                  (modified)
└── db/
    └── index.ts                   (modified)

apps/sandbox/
├── resources/
│   └── .gitkeep                   (new)
├── tmp/
│   └── .gitkeep                   (new)
└── readme.md                      (modified)
```

---

## Out of Scope

Features NOT included in this implementation:

- File versioning / revision history
- Storage quota enforcement
- Auto-cleanup / expiration policies
- File compression
- CDN integration
- WebSocket real-time sync
- FileReadNode / FileWriteNode workflow nodes
- Frontend admin panel UI
- Bulk upload/delete operations
- Public shareable URL links

---

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Project architecture overview
- [apps/api/CLAUDE.md](../../../apps/api/CLAUDE.md) - API server documentation
- [WORKFLOW_CREATION_BLUEPRINT.md](../../../WORKFLOW_CREATION_BLUEPRINT.md) - Workflow syntax reference
- [Plan File](../../../.claude/plans/joyful-juggling-peach.md) - Original planning document

---

## Progress Tracking

Use the checkboxes in [implementation_plan.md](./implementation_plan.md) to track progress.

When complete, the implementation_plan.md file should show:
- All 124 tasks checked
- All 8 phases completed
- All success criteria met

---

## Contributing

When implementing this feature:

1. Follow existing codebase patterns (singleton services, repository pattern, Hono routes)
2. Use TypeScript strict mode - no `any` types
3. Add JSDoc comments to public APIs
4. Test each phase before moving to the next
5. Commit after completing each major phase

---

**Happy Coding!**
