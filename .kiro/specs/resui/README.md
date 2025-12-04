# Resources UI - Specification

**Feature:** Comprehensive file and content management interface for Workscript workflows
**Target Application:** `/apps/frontend`
**Status:** Ready for Implementation
**Created:** 2025-12-04
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, accessibility)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 147 actionable tasks organized in 20 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 5-7 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

A complete Resources management UI that enables users to:

- **Browse resources** in a sortable, filterable data table
- **Upload files** via drag-and-drop (images, audio, documents, data files)
- **Create content** directly in-browser using Monaco Editor (prompts, JSON, CSV)
- **Preview content** with type-specific viewers (markdown, images, audio player, JSON tree)
- **Edit resources** including metadata and text-based content
- **Test prompt templates** with interactive interpolation using workflow state
- **Manage resources** with copy, download, and soft-delete operations
- **Navigate seamlessly** from the sidebar (positioned after Dashboard)

### User Preferences (Confirmed)

| Decision | Choice |
|----------|--------|
| List View | **Data Table** (compact, sortable rows) |
| Text Editor | **Monaco Editor** (VS Code-style syntax highlighting) |
| Sidebar Position | **After Dashboard** (resources as foundational) |
| Media Previews | **Icons only** (no thumbnails for performance) |

### Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19.1 + TypeScript |
| Routing | React Router v7 |
| State | React Query (TanStack Query) |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v4 (OkLCH colors) |
| Code Editor | @monaco-editor/react |
| File Upload | react-dropzone |
| JSON Preview | react-json-view-lite |
| Forms | react-hook-form + zod |

---

## Architecture

### Backend API (Already Implemented)

All endpoints at `/workscript/resources`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/create` | Create from content |
| POST | `/upload` | Multipart file upload |
| GET | `/` | List with filters |
| GET | `/:id` | Get metadata |
| GET | `/:id/content` | Download content |
| PUT | `/:id` | Update metadata |
| PUT | `/:id/content` | Update content |
| DELETE | `/:id` | Soft delete |
| POST | `/:id/interpolate` | Template interpolation |
| POST | `/:id/copy` | Copy resource |

### Frontend Structure

```
apps/frontend/src/
├── pages/resources/
│   ├── ResourcesPage.tsx           # Data table list view
│   ├── ResourceCreatePage.tsx      # Upload/create tabs
│   ├── ResourceDetailPage.tsx      # Preview + metadata
│   └── ResourceEditPage.tsx        # Edit metadata/content
├── components/resources/
│   ├── ResourceTable.tsx           # Data table
│   ├── ResourceTableSkeleton.tsx   # Loading state
│   ├── ResourceTypeIcon.tsx        # Type icons
│   ├── ResourceForm.tsx            # Create/edit form
│   ├── ResourcePreview.tsx         # Type-specific preview
│   ├── ResourceFilters.tsx         # Search, type, sort
│   ├── ResourceUploadZone.tsx      # Drag & drop
│   ├── ResourceEditor.tsx          # Monaco wrapper
│   ├── ResourceInterpolation.tsx   # Template testing
│   └── ResourceActions.tsx         # Action dropdown
├── services/api/
│   └── resources.api.ts            # API client
├── hooks/api/
│   └── useResources.ts             # React Query hooks
└── types/
    └── resource.types.ts           # TypeScript types
```

### Resource Types Supported

| Type | Extensions | Preview |
|------|------------|---------|
| prompt | .md | Markdown with template syntax highlighting |
| image | .png, .jpg, .jpeg, .gif, .webp | Full image with zoom |
| audio | .mp3, .wav | Audio player |
| document | .pdf, .md, .txt | Text/PDF viewer |
| data | .json, .csv | JSON tree / Table |

---

## Implementation Phases

| Phase | Description | Time |
|-------|-------------|------|
| 1 | Setup & Dependencies | 0.5 days |
| 2 | Type Definitions | 0.25 days |
| 3 | API Service Layer | 0.5 days |
| 4 | React Query Hooks | 0.25 days |
| 5 | Routing & Navigation | 0.25 days |
| 6 | Base Components | 0.25 days |
| 7 | List Page Components | 0.5 days |
| 8 | Resources List Page | 0.5 days |
| 9 | Resource Detail Page | 0.5 days |
| 10 | Preview Component | 0.5 days |
| 11 | Upload Component | 0.25 days |
| 12 | Create Page | 0.5 days |
| 13 | Editor Component | 0.25 days |
| 14 | Edit Page | 0.5 days |
| 15 | Interpolation Component | 0.25 days |
| 16 | Form Component | 0.25 days |
| 17 | Error Handling | 0.25 days |
| 18 | Polish & UX | 0.5 days |
| 19 | Testing | 0.5 days |
| 20 | Final Verification | 0.25 days |

**Total: 5-7 days**

---

## Quick Start Guide

### For Developers

1. **Read the specification files:**
   ```bash
   cat .kiro/specs/resui/requirements.md
   cat .kiro/specs/resui/implementation_plan.md
   ```

2. **Start with Phase 1 - Install dependencies:**
   ```bash
   cd apps/frontend
   bun add @monaco-editor/react react-dropzone react-json-view-lite
   ```

3. **Create the folder structure (Phase 1.2)**

4. **Follow implementation_plan.md tasks in order**
   - Check off tasks as completed
   - Each task references its requirements

5. **Reference existing patterns:**
   - Page structure: `/pages/workflows/WorkflowsPage.tsx`
   - API hooks: `/hooks/api/useWorkflows.ts`
   - Shared components: `/components/shared/`

### For Reviewers

1. **Review requirements.md** for complete acceptance criteria
2. **Check implementation_plan.md** progress checkboxes
3. **Verify against success metrics** in requirements.md

---

## Success Criteria

- [ ] All 20 requirements pass acceptance criteria
- [ ] All 5 resource types work correctly (prompt, image, audio, document, data)
- [ ] CRUD operations complete with proper error handling
- [ ] Template interpolation works for prompt resources
- [ ] Permission-based UI correctly hides/shows actions
- [ ] No TypeScript or ESLint errors
- [ ] UI matches existing app styling
- [ ] Page load under 1 second
- [ ] Mobile responsive design works
- [ ] Keyboard shortcuts function
- [ ] Build completes without errors

---

## Security Considerations

- All API calls require authentication token
- Permission checks on both client and server
- File upload validation (type + size)
- Path sanitization for directory traversal prevention
- Template interpolation results properly escaped
- Session expiry redirects to login

---

## Progress Tracking

Track implementation progress in `implementation_plan.md`:

1. Open the file
2. Check off completed tasks: `- [ ]` → `- [x]`
3. Update phase status as you progress
4. Use the final verification checklist in Phase 20

**Current Progress:** 0 / 147 tasks (0%)

---

## Out of Scope

The following features are NOT included:

- Bulk operations (multi-select)
- Folder/hierarchy structure
- Version history
- Sharing/collaboration
- Comments/annotations
- Usage analytics
- AI-assisted generation
- External storage integrations
- Resource templates
- Drag-and-drop reordering
- External format export
- Real-time collaboration

---

## Related Documentation

- Backend Implementation: `/apps/api/src/shared-services/storage/`
- Backend Routes: `/apps/api/src/plugins/workscript/resources/`
- Resources Requirements Spec: `/.kiro/specs/res/requirements.md`
- Frontend Patterns: `/apps/frontend/CLAUDE.md`
- Existing UI Examples: `/apps/frontend/src/pages/workflows/`

---

## Contributing

When implementing:

1. Follow existing code patterns from WorkflowsPage
2. Use shadcn/ui components exclusively
3. Maintain TypeScript strict mode
4. Use React Query for all data fetching
5. Use react-hook-form + zod for forms
6. Test on mobile viewport sizes
7. Add ARIA labels for accessibility
8. Handle all error states gracefully

---

**Happy Coding!**
