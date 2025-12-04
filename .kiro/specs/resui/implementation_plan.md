# Implementation Plan: Resources UI

This document provides a concrete, actionable implementation plan for the Resources UI feature. Tasks are organized by phases and include checkboxes for tracking progress. Each task references the requirements it addresses.

---

## PHASE 1: PROJECT SETUP & DEPENDENCIES

### 1.1 Install Dependencies

- [ ] **Task 1.1.1: Install Monaco Editor package**
  - Run: `cd apps/frontend && bun add @monaco-editor/react`
  - Verify installation in package.json
  - _Requirements: 9, 11_

- [ ] **Task 1.1.2: Install react-dropzone package**
  - Run: `cd apps/frontend && bun add react-dropzone`
  - Verify installation in package.json
  - _Requirements: 8_

- [ ] **Task 1.1.3: Install react-json-view-lite package**
  - Run: `cd apps/frontend && bun add react-json-view-lite`
  - Verify installation in package.json
  - _Requirements: 7_

- [ ] **Task 1.1.4: Verify all dependencies are compatible**
  - Run: `cd apps/frontend && bun install`
  - Run: `cd apps/frontend && bun run build` to check for conflicts
  - Fix any peer dependency warnings
  - _Requirements: Code Quality_

### 1.2 Create Folder Structure

- [ ] **Task 1.2.1: Create pages directory**
  - Create: `apps/frontend/src/pages/resources/`
  - Create placeholder files: `ResourcesPage.tsx`, `ResourceCreatePage.tsx`, `ResourceDetailPage.tsx`, `ResourceEditPage.tsx`
  - _Requirements: 1, 6, 8, 9, 10, 11_

- [ ] **Task 1.2.2: Create components directory**
  - Create: `apps/frontend/src/components/resources/`
  - Create placeholder files for all components
  - _Requirements: All_

- [ ] **Task 1.2.3: Create types file**
  - Create: `apps/frontend/src/types/resource.types.ts`
  - _Requirements: All_

- [ ] **Task 1.2.4: Create API service file**
  - Create: `apps/frontend/src/services/api/resources.api.ts`
  - _Requirements: All_

- [ ] **Task 1.2.5: Create hooks file**
  - Create: `apps/frontend/src/hooks/api/useResources.ts`
  - _Requirements: All_

---

## PHASE 2: TYPE DEFINITIONS

### 2.1 Core Types

- [ ] **Task 2.1.1: Define ResourceType union type**
  - Add: `export type ResourceType = 'prompt' | 'image' | 'audio' | 'document' | 'data';`
  - _Requirements: 2_

- [ ] **Task 2.1.2: Define Resource interface**
  - Include all fields: id, name, path, type, mimeType, size, checksum, authorType, authorId, tenantId, pluginId, description, tags, metadata, isActive, isPublic, createdAt, updatedAt, deletedAt
  - _Requirements: 1, 6_

- [ ] **Task 2.1.3: Define ResourceFilterOptions interface**
  - Include: type, authorType, tags, search, limit, offset, sortBy
  - _Requirements: 3, 4, 5_

- [ ] **Task 2.1.4: Define CreateResourcePayload interface**
  - Include: name, content, path, type, description, tags, isPublic
  - _Requirements: 8, 9_

- [ ] **Task 2.1.5: Define UpdateResourcePayload interface**
  - Include: name, description, tags, isPublic (all optional)
  - _Requirements: 10_

- [ ] **Task 2.1.6: Define InterpolatePayload interface**
  - Include: state, workflowId, executionId, nodeId
  - _Requirements: 15_

- [ ] **Task 2.1.7: Define InterpolateResponse interface**
  - Include: content, placeholders (found, replaced, unresolved)
  - _Requirements: 15_

- [ ] **Task 2.1.8: Define ResourceListResponse interface**
  - Include: success, items, count, pagination
  - _Requirements: 1, 5_

- [ ] **Task 2.1.9: Define API error types**
  - Define ResourceApiError with code, message, details
  - _Requirements: 18_

---

## PHASE 3: API SERVICE LAYER

### 3.1 API Client Functions

- [ ] **Task 3.1.1: Implement fetchResources function**
  - GET `/workscript/resources` with query params
  - Handle filters, pagination, sorting
  - Return typed ResourceListResponse
  - _Requirements: 1, 3, 4, 5_

- [ ] **Task 3.1.2: Implement fetchResource function**
  - GET `/workscript/resources/:id`
  - Return single Resource
  - _Requirements: 6_

- [ ] **Task 3.1.3: Implement fetchResourceContent function**
  - GET `/workscript/resources/:id/content`
  - Return blob for binary, text for text-based
  - Handle Content-Type header
  - _Requirements: 7, 13_

- [ ] **Task 3.1.4: Implement createResource function**
  - POST `/workscript/resources/create`
  - Send JSON payload for content creation
  - _Requirements: 9_

- [ ] **Task 3.1.5: Implement uploadResource function**
  - POST `/workscript/resources/upload`
  - Use FormData for multipart upload
  - Include file, name, description, tags, isPublic, path
  - _Requirements: 8_

- [ ] **Task 3.1.6: Implement updateResource function**
  - PUT `/workscript/resources/:id`
  - Send metadata updates
  - _Requirements: 10_

- [ ] **Task 3.1.7: Implement updateResourceContent function**
  - PUT `/workscript/resources/:id/content`
  - Send new content
  - _Requirements: 11_

- [ ] **Task 3.1.8: Implement deleteResource function**
  - DELETE `/workscript/resources/:id`
  - Return success status
  - _Requirements: 12_

- [ ] **Task 3.1.9: Implement interpolateResource function**
  - POST `/workscript/resources/:id/interpolate`
  - Send state object, return interpolated content
  - _Requirements: 15_

- [ ] **Task 3.1.10: Implement copyResource function**
  - POST `/workscript/resources/:id/copy`
  - Send name and path for new resource
  - _Requirements: 14_

- [ ] **Task 3.1.11: Implement downloadResource function**
  - Use fetchResourceContent with download handling
  - Trigger browser download with correct filename
  - _Requirements: 13_

---

## PHASE 4: REACT QUERY HOOKS

### 4.1 Query Keys

- [ ] **Task 4.1.1: Define resourceKeys factory**
  - Create keys for: all, lists, list(filters), details, detail(id), content(id)
  - Follow existing pattern from useWorkflows.ts
  - _Requirements: All_

### 4.2 Query Hooks

- [ ] **Task 4.2.1: Implement useResources hook**
  - Accept filters parameter
  - Use staleTime of 5 minutes
  - Enable refetchOnWindowFocus
  - Return data, isLoading, error, refetch
  - _Requirements: 1, 3, 4, 5_

- [ ] **Task 4.2.2: Implement useResource hook**
  - Accept id parameter
  - Return single resource data
  - Handle 404 case
  - _Requirements: 6_

- [ ] **Task 4.2.3: Implement useResourceContent hook**
  - Accept id parameter
  - Return content blob/text
  - Enable/disable based on resource type
  - _Requirements: 7_

### 4.3 Mutation Hooks

- [ ] **Task 4.3.1: Implement useCreateResource mutation**
  - Call createResource API
  - Invalidate resources list on success
  - Show success toast
  - _Requirements: 9_

- [ ] **Task 4.3.2: Implement useUploadResource mutation**
  - Call uploadResource API with FormData
  - Track upload progress if possible
  - Invalidate resources list on success
  - Show success toast
  - _Requirements: 8_

- [ ] **Task 4.3.3: Implement useUpdateResource mutation**
  - Call updateResource API
  - Invalidate both list and detail cache
  - Show success toast
  - _Requirements: 10_

- [ ] **Task 4.3.4: Implement useUpdateResourceContent mutation**
  - Call updateResourceContent API
  - Invalidate detail and content cache
  - Show success toast
  - _Requirements: 11_

- [ ] **Task 4.3.5: Implement useDeleteResource mutation**
  - Call deleteResource API
  - Invalidate resources list on success
  - Show success toast
  - _Requirements: 12_

- [ ] **Task 4.3.6: Implement useInterpolateResource mutation**
  - Call interpolateResource API
  - Return interpolation result
  - _Requirements: 15_

- [ ] **Task 4.3.7: Implement useCopyResource mutation**
  - Call copyResource API
  - Invalidate resources list on success
  - Show success toast
  - Return new resource
  - _Requirements: 14_

---

## PHASE 5: ROUTING & NAVIGATION

### 5.1 Route Configuration

- [ ] **Task 5.1.1: Add lazy imports for resource pages**
  - Add to routes.tsx: `const ResourcesPage = lazy(() => import('@/pages/resources/ResourcesPage'))`
  - Add imports for Create, Detail, Edit pages
  - _Requirements: 1, 6, 8, 10_

- [ ] **Task 5.1.2: Add resources route**
  - Add route: `{ path: 'resources', element: <ResourcesPage /> }`
  - Wrap with RouteErrorBoundary
  - _Requirements: 1_

- [ ] **Task 5.1.3: Add resources/new route**
  - Add route: `{ path: 'resources/new', element: <ResourceCreatePage /> }`
  - Wrap with RouteErrorBoundary with fallbackPath="/resources"
  - _Requirements: 8, 9_

- [ ] **Task 5.1.4: Add resources/:id route**
  - Add route: `{ path: 'resources/:id', element: <ResourceDetailPage /> }`
  - Wrap with RouteErrorBoundary
  - _Requirements: 6_

- [ ] **Task 5.1.5: Add resources/:id/edit route**
  - Add route: `{ path: 'resources/:id/edit', element: <ResourceEditPage /> }`
  - Wrap with RouteErrorBoundary
  - _Requirements: 10, 11_

### 5.2 Navigation Integration

- [ ] **Task 5.2.1: Add Resources to sidebar navigation**
  - Open: `apps/frontend/src/components/layout/Sidebar.tsx`
  - Add link object after Dashboard: `{ href: '/resources', label: 'Resources', icon: FolderOpen }`
  - Import FolderOpen from lucide-react
  - _Requirements: 16_

- [ ] **Task 5.2.2: Verify active link highlighting**
  - Test that `/resources/*` paths show active state
  - Verify blue background and left border appear
  - _Requirements: 16_

---

## PHASE 6: BASE COMPONENTS

### 6.1 ResourceTypeIcon Component

- [ ] **Task 6.1.1: Create ResourceTypeIcon component**
  - Create: `apps/frontend/src/components/resources/ResourceTypeIcon.tsx`
  - Accept props: type, size, className
  - _Requirements: 2_

- [ ] **Task 6.1.2: Implement icon mapping**
  - prompt → FileCode (text-blue-500)
  - image → Image (text-green-500)
  - audio → Music (text-purple-500)
  - document → FileText (text-orange-500)
  - data → Database (text-cyan-500)
  - _Requirements: 2_

- [ ] **Task 6.1.3: Implement size variants**
  - sm: 16px (w-4 h-4)
  - md: 24px (w-6 h-6)
  - lg: 32px (w-8 h-8)
  - _Requirements: 2_

- [ ] **Task 6.1.4: Add dark mode support**
  - Ensure colors remain visible in dark mode
  - Use oklch colors if needed for consistency
  - _Requirements: 2_

### 6.2 ResourceActions Component

- [ ] **Task 6.2.1: Create ResourceActions component**
  - Create: `apps/frontend/src/components/resources/ResourceActions.tsx`
  - Accept props: resource, onView, onEdit, onDownload, onCopy, onDelete, permissions
  - _Requirements: 6, 17_

- [ ] **Task 6.2.2: Implement dropdown menu**
  - Use shadcn DropdownMenu component
  - Add trigger button with MoreVertical icon
  - _Requirements: 1_

- [ ] **Task 6.2.3: Add action items**
  - View (Eye icon) - always visible if READ permission
  - Edit (Pencil icon) - visible if UPDATE permission
  - Download (Download icon) - visible if READ permission
  - Copy (Copy icon) - visible if CREATE permission
  - Delete (Trash2 icon, destructive) - visible if DELETE permission
  - _Requirements: 17_

- [ ] **Task 6.2.4: Implement permission-based visibility**
  - Check permissions prop for each action
  - Hide actions user cannot perform
  - _Requirements: 17_

---

## PHASE 7: LIST PAGE COMPONENTS

### 7.1 ResourceFilters Component

- [ ] **Task 7.1.1: Create ResourceFilters component**
  - Create: `apps/frontend/src/components/resources/ResourceFilters.tsx`
  - Accept props: filters, onChange, onClear, onCreate, canCreate
  - _Requirements: 3, 4_

- [ ] **Task 7.1.2: Implement search input**
  - Use SearchInput component from shared
  - Add 300ms debounce
  - Placeholder: "Search resources..."
  - _Requirements: 3_

- [ ] **Task 7.1.3: Implement type filter dropdown**
  - Use shadcn Select component
  - Options: All Types, Prompt, Image, Audio, Document, Data
  - _Requirements: 3_

- [ ] **Task 7.1.4: Implement sort dropdown**
  - Use shadcn Select component
  - Options: Newest, Oldest, Name A-Z, Name Z-A, Largest, Smallest
  - _Requirements: 4_

- [ ] **Task 7.1.5: Add Create button**
  - Show only if canCreate is true
  - Use Button with Plus icon
  - Link to /resources/new
  - _Requirements: 8, 17_

- [ ] **Task 7.1.6: Implement tag pills display**
  - Show active tags as Badge components
  - Add X button to remove each tag
  - Add "Clear all" link
  - _Requirements: 3_

- [ ] **Task 7.1.7: Implement responsive layout**
  - Stack filters on mobile
  - Horizontal layout on desktop
  - _Requirements: Accessibility_

### 7.2 ResourceTable Component

- [ ] **Task 7.2.1: Create ResourceTable component**
  - Create: `apps/frontend/src/components/resources/ResourceTable.tsx`
  - Accept props: resources, loading, onSort, sortBy, sortOrder, permissions
  - _Requirements: 1_

- [ ] **Task 7.2.2: Define table columns**
  - Icon (ResourceTypeIcon)
  - Name (clickable, links to detail)
  - Type (Badge)
  - Size (formatted: KB, MB)
  - Tags (Badge list, truncated)
  - Created (relative time with tooltip)
  - Actions (ResourceActions dropdown)
  - _Requirements: 1_

- [ ] **Task 7.2.3: Implement sortable headers**
  - Add click handler to sortable columns
  - Show sort indicator (arrow up/down)
  - Toggle between asc/desc on click
  - _Requirements: 4_

- [ ] **Task 7.2.4: Implement row click navigation**
  - Click anywhere on row navigates to detail
  - Except when clicking actions button
  - _Requirements: 1, 6_

- [ ] **Task 7.2.5: Add hover state styling**
  - Show subtle background color on hover
  - Show action icons more prominently on hover
  - _Requirements: 1_

- [ ] **Task 7.2.6: Implement empty state**
  - Use EmptyState component from shared
  - Icon: FolderOpen
  - Title: "No resources yet" or "No resources found"
  - Action: Create Resource button
  - _Requirements: 1, 3_

### 7.3 ResourceTableSkeleton Component

- [ ] **Task 7.3.1: Create ResourceTableSkeleton component**
  - Create: `apps/frontend/src/components/resources/ResourceTableSkeleton.tsx`
  - Render 10 skeleton rows
  - _Requirements: 19_

- [ ] **Task 7.3.2: Implement skeleton row**
  - Skeleton for each column matching widths
  - Use shadcn Skeleton component
  - Add subtle animation
  - _Requirements: 19_

---

## PHASE 8: RESOURCES LIST PAGE

### 8.1 ResourcesPage Implementation

- [ ] **Task 8.1.1: Create basic page structure**
  - Implement: `apps/frontend/src/pages/resources/ResourcesPage.tsx`
  - Use standard page layout pattern
  - _Requirements: 1_

- [ ] **Task 8.1.2: Add PageHeader**
  - Title: "Resources"
  - Description: "Manage files, prompts, and media for your workflows"
  - Actions: Create Resource button (permission-gated)
  - _Requirements: 1, 17_

- [ ] **Task 8.1.3: Implement filter state management**
  - Use useState for search, type, sort, tags
  - Initialize from URL search params
  - _Requirements: 3, 4_

- [ ] **Task 8.1.4: Implement URL state sync**
  - Update URL when filters change
  - Read filters from URL on mount
  - Use useSearchParams hook
  - _Requirements: 3, 4, 5_

- [ ] **Task 8.1.5: Fetch resources with filters**
  - Use useResources hook with filter options
  - Handle loading and error states
  - _Requirements: 1_

- [ ] **Task 8.1.6: Implement pagination state**
  - Use usePagination hook from shared
  - Initialize page from URL
  - Update URL on page change
  - _Requirements: 5_

- [ ] **Task 8.1.7: Add ResourceFilters component**
  - Pass filter state and handlers
  - Handle filter changes
  - _Requirements: 3, 4_

- [ ] **Task 8.1.8: Add ResourceTable component**
  - Pass paginated resources
  - Pass loading state
  - Pass sort handlers
  - _Requirements: 1_

- [ ] **Task 8.1.9: Add MobilePagination component**
  - Pass pagination state
  - Show only when multiple pages exist
  - _Requirements: 5_

- [ ] **Task 8.1.10: Implement delete confirmation dialog**
  - Use ConfirmDialog from shared
  - Track delete target in state
  - Call delete mutation on confirm
  - _Requirements: 12_

- [ ] **Task 8.1.11: Implement copy dialog**
  - Create dialog with name and path inputs
  - Pre-fill with "Copy of {name}"
  - Call copy mutation on confirm
  - _Requirements: 14_

- [ ] **Task 8.1.12: Check permissions on mount**
  - Use useAuth hook to get permissions
  - Pass permissions to child components
  - _Requirements: 17_

- [ ] **Task 8.1.13: Implement keyboard shortcuts**
  - `/` to focus search
  - `n` to navigate to create (if permitted)
  - Use useEffect with keydown listener
  - _Requirements: 20_

---

## PHASE 9: RESOURCE DETAIL PAGE

### 9.1 ResourceDetailPage Implementation

- [ ] **Task 9.1.1: Create basic page structure**
  - Implement: `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`
  - Get id from useParams
  - _Requirements: 6_

- [ ] **Task 9.1.2: Add breadcrumbs navigation**
  - Use Breadcrumb component
  - Path: Resources > {resource.name}
  - Link back to /resources
  - _Requirements: 6_

- [ ] **Task 9.1.3: Fetch resource data**
  - Use useResource hook with id
  - Handle loading state with skeleton
  - Handle 404 with error message
  - _Requirements: 6_

- [ ] **Task 9.1.4: Implement two-column layout**
  - Main content: lg:col-span-2
  - Sidebar: lg:col-span-1
  - Stack on mobile
  - _Requirements: 6_

- [ ] **Task 9.1.5: Add ResourcePreview component**
  - Place in main content area
  - Pass resource data
  - _Requirements: 7_

- [ ] **Task 9.1.6: Add metadata card**
  - Display: Type, Size, Created, Updated, Author
  - Display: Tags (as badges), Visibility, Checksum
  - Format dates relatively with tooltip
  - Format size human-readable
  - _Requirements: 6_

- [ ] **Task 9.1.7: Add actions card**
  - Buttons: Edit, Download, Copy, Delete
  - Permission-gate each button
  - _Requirements: 6, 17_

- [ ] **Task 9.1.8: Add interpolation panel for prompts**
  - Show only when resource.type === 'prompt'
  - Use ResourceInterpolation component
  - _Requirements: 15_

- [ ] **Task 9.1.9: Implement download handler**
  - Call downloadResource function
  - Trigger browser download
  - _Requirements: 13_

- [ ] **Task 9.1.10: Implement copy dialog**
  - Show dialog with name/path inputs
  - Navigate to new resource on success
  - _Requirements: 14_

- [ ] **Task 9.1.11: Implement delete confirmation**
  - Show confirmation dialog
  - Navigate to list on success
  - _Requirements: 12_

- [ ] **Task 9.1.12: Handle permission errors**
  - Show 403 message if no READ permission
  - Redirect to list if accessing edit without UPDATE permission
  - _Requirements: 17, 18_

---

## PHASE 10: PREVIEW COMPONENT

### 10.1 ResourcePreview Implementation

- [ ] **Task 10.1.1: Create ResourcePreview component**
  - Create: `apps/frontend/src/components/resources/ResourcePreview.tsx`
  - Accept props: resourceId, resourceType, mimeType
  - _Requirements: 7_

- [ ] **Task 10.1.2: Fetch content**
  - Use useResourceContent hook
  - Handle loading state
  - Handle error state with retry
  - _Requirements: 7_

- [ ] **Task 10.1.3: Implement text/markdown preview**
  - Render markdown with syntax highlighting
  - Highlight `{{$.path}}` template syntax
  - Add "Copy content" button
  - _Requirements: 7_

- [ ] **Task 10.1.4: Implement image preview**
  - Display full image
  - Add zoom capability (click to expand)
  - Handle load error
  - _Requirements: 7_

- [ ] **Task 10.1.5: Implement audio preview**
  - Use native audio element
  - Add play/pause controls
  - Show duration
  - _Requirements: 7_

- [ ] **Task 10.1.6: Implement JSON preview**
  - Use react-json-view-lite
  - Collapsible tree view
  - Syntax highlighting
  - _Requirements: 7_

- [ ] **Task 10.1.7: Implement CSV preview**
  - Parse CSV to table
  - Use shadcn Table component
  - Limit rows for large files
  - _Requirements: 7_

- [ ] **Task 10.1.8: Implement PDF preview**
  - Embed PDF viewer or show first page
  - Fallback to download link
  - _Requirements: 7_

- [ ] **Task 10.1.9: Handle large content**
  - Truncate text >1MB with "Download full" option
  - Show warning for very large files
  - _Requirements: 7_

---

## PHASE 11: UPLOAD COMPONENT

### 11.1 ResourceUploadZone Implementation

- [ ] **Task 11.1.1: Create ResourceUploadZone component**
  - Create: `apps/frontend/src/components/resources/ResourceUploadZone.tsx`
  - Accept props: onFileSelect, disabled, accept
  - _Requirements: 8_

- [ ] **Task 11.1.2: Implement react-dropzone integration**
  - Use useDropzone hook
  - Configure accepted file types
  - Configure max file size (50MB)
  - _Requirements: 8_

- [ ] **Task 11.1.3: Implement default state UI**
  - Dashed border box
  - Upload icon centered
  - "Drag & drop file here or click to browse"
  - _Requirements: 8_

- [ ] **Task 11.1.4: Implement drag-over state**
  - Highlight border (blue)
  - Change text to "Drop file here"
  - Add subtle animation
  - _Requirements: 8_

- [ ] **Task 11.1.5: Implement file validation**
  - Check file extension against allowed list
  - Check file size against 50MB limit
  - Show error message for invalid files
  - _Requirements: 8_

- [ ] **Task 11.1.6: Implement file preview state**
  - Show selected file name and size
  - Show detected type icon
  - Add remove button to clear selection
  - _Requirements: 8_

- [ ] **Task 11.1.7: Implement upload progress**
  - Use Progress component
  - Show percentage during upload
  - _Requirements: 8, 19_

---

## PHASE 12: CREATE PAGE

### 12.1 ResourceCreatePage Implementation

- [ ] **Task 12.1.1: Create basic page structure**
  - Implement: `apps/frontend/src/pages/resources/ResourceCreatePage.tsx`
  - Add PageHeader with back navigation
  - _Requirements: 8, 9_

- [ ] **Task 12.1.2: Implement tabs**
  - Use shadcn Tabs component
  - Tab 1: "Upload File"
  - Tab 2: "Create Content"
  - _Requirements: 8, 9_

- [ ] **Task 12.1.3: Implement Upload File tab**
  - Add ResourceUploadZone
  - Show form fields when file selected
  - _Requirements: 8_

- [ ] **Task 12.1.4: Implement form fields**
  - Name (required, pre-fill from filename)
  - Description (optional, textarea)
  - Tags (multi-select, allow create)
  - Type (auto-detected, select override)
  - Visibility (switch: Private/Public)
  - Path (auto-generated from name, editable)
  - _Requirements: 8, 9_

- [ ] **Task 12.1.5: Implement Create Content tab**
  - Show ResourceEditor component
  - Show type selector
  - _Requirements: 9_

- [ ] **Task 12.1.6: Implement form validation**
  - Use react-hook-form with zod schema
  - Name: required, min 1 char
  - Content: required for create mode
  - Show inline errors
  - _Requirements: 8, 9_

- [ ] **Task 12.1.7: Implement upload submission**
  - Call useUploadResource mutation
  - Show progress during upload
  - Navigate to detail on success
  - Show error toast on failure
  - _Requirements: 8_

- [ ] **Task 12.1.8: Implement content creation submission**
  - Call useCreateResource mutation
  - Navigate to detail on success
  - Show error toast on failure
  - _Requirements: 9_

- [ ] **Task 12.1.9: Implement localStorage draft**
  - Auto-save content to localStorage (1s debounce)
  - Offer to restore draft on page load
  - Clear draft on successful submit
  - _Requirements: 9_

- [ ] **Task 12.1.10: Implement unsaved changes warning**
  - Track dirty state
  - Show confirmation on navigation away
  - Use beforeunload event
  - _Requirements: 9_

- [ ] **Task 12.1.11: Check create permission**
  - Redirect to list if no RESOURCE_CREATE permission
  - Show toast explaining redirect
  - _Requirements: 17_

---

## PHASE 13: EDITOR COMPONENT

### 13.1 ResourceEditor Implementation

- [ ] **Task 13.1.1: Create ResourceEditor component**
  - Create: `apps/frontend/src/components/resources/ResourceEditor.tsx`
  - Accept props: value, onChange, language, readOnly
  - _Requirements: 9, 11_

- [ ] **Task 13.1.2: Configure Monaco Editor**
  - Import from @monaco-editor/react
  - Set up lazy loading
  - _Requirements: 9, 11_

- [ ] **Task 13.1.3: Implement language detection**
  - markdown for .md files
  - json for .json files
  - plaintext for .csv, .txt
  - _Requirements: 9, 11_

- [ ] **Task 13.1.4: Configure editor options**
  - Enable line numbers
  - Enable word wrap
  - Enable minimap (optional, can be toggled)
  - Set font size and family
  - _Requirements: 9, 11_

- [ ] **Task 13.1.5: Implement dark mode support**
  - Detect app theme
  - Use vs-dark theme for dark mode
  - Use vs theme for light mode
  - _Requirements: 9, 11_

- [ ] **Task 13.1.6: Implement JSON validation**
  - Show syntax errors inline
  - Return validation status to parent
  - _Requirements: 11_

- [ ] **Task 13.1.7: Add character count display**
  - Show character count below editor
  - Show estimated file size
  - _Requirements: 11_

- [ ] **Task 13.1.8: Implement Cmd/Ctrl+S handler**
  - Capture save shortcut
  - Call onSave callback
  - Prevent default browser save dialog
  - _Requirements: 20_

---

## PHASE 14: EDIT PAGE

### 14.1 ResourceEditPage Implementation

- [ ] **Task 14.1.1: Create basic page structure**
  - Implement: `apps/frontend/src/pages/resources/ResourceEditPage.tsx`
  - Get id from useParams
  - _Requirements: 10, 11_

- [ ] **Task 14.1.2: Add breadcrumbs navigation**
  - Path: Resources > {resource.name} > Edit
  - Link back to detail page
  - _Requirements: 10_

- [ ] **Task 14.1.3: Fetch resource data**
  - Use useResource hook
  - Handle loading with skeleton
  - Handle 404
  - _Requirements: 10_

- [ ] **Task 14.1.4: Implement tabs**
  - Tab 1: "Metadata"
  - Tab 2: "Content" (disabled for binary types)
  - _Requirements: 10, 11_

- [ ] **Task 14.1.5: Implement Metadata tab form**
  - Name input (required)
  - Description textarea
  - Tags multi-select
  - Visibility switch
  - _Requirements: 10_

- [ ] **Task 14.1.6: Implement metadata save**
  - Call useUpdateResource mutation
  - Show success toast
  - Invalidate cache
  - _Requirements: 10_

- [ ] **Task 14.1.7: Implement Content tab**
  - Show ResourceEditor with current content
  - Fetch content with useResourceContent
  - _Requirements: 11_

- [ ] **Task 14.1.8: Disable Content tab for binary**
  - Check if type is image, audio, or pdf
  - Show disabled state with tooltip
  - _Requirements: 11_

- [ ] **Task 14.1.9: Implement content save**
  - Call useUpdateResourceContent mutation
  - Show success toast
  - Update checksum and size display
  - _Requirements: 11_

- [ ] **Task 14.1.10: Implement localStorage draft for content**
  - Auto-save to localStorage (1s debounce)
  - Key by resource id
  - Clear on save
  - _Requirements: 11_

- [ ] **Task 14.1.11: Implement unsaved changes tracking**
  - Track dirty state for both tabs
  - Show indicator in tab title
  - Warn on navigation
  - _Requirements: 10, 11_

- [ ] **Task 14.1.12: Implement markdown preview**
  - Toggle side-by-side preview for .md files
  - Render markdown in real-time
  - _Requirements: 11_

- [ ] **Task 14.1.13: Check update permission**
  - Redirect to detail if no RESOURCE_UPDATE permission
  - Show toast explaining redirect
  - _Requirements: 17_

---

## PHASE 15: INTERPOLATION COMPONENT

### 15.1 ResourceInterpolation Implementation

- [ ] **Task 15.1.1: Create ResourceInterpolation component**
  - Create: `apps/frontend/src/components/resources/ResourceInterpolation.tsx`
  - Accept props: resourceId
  - _Requirements: 15_

- [ ] **Task 15.1.2: Implement state input**
  - JSON textarea for state object
  - Syntax highlighting (optional)
  - _Requirements: 15_

- [ ] **Task 15.1.3: Implement JSON validation**
  - Validate on input change
  - Show error message if invalid
  - Disable Test button if invalid
  - _Requirements: 15_

- [ ] **Task 15.1.4: Implement Test button**
  - Call useInterpolateResource mutation
  - Show loading spinner during request
  - _Requirements: 15_

- [ ] **Task 15.1.5: Display interpolation result**
  - Show interpolated content in result area
  - Highlight syntax if markdown
  - _Requirements: 15_

- [ ] **Task 15.1.6: Display placeholder report**
  - Show found placeholders as green badges
  - Show replaced placeholders as green checkmarks
  - Show unresolved placeholders as yellow warnings
  - _Requirements: 15_

- [ ] **Task 15.1.7: Implement Copy Result button**
  - Copy interpolated content to clipboard
  - Show success feedback
  - _Requirements: 15_

- [ ] **Task 15.1.8: Handle errors**
  - Show error message if interpolation fails
  - Allow retry
  - _Requirements: 15, 18_

---

## PHASE 16: FORM COMPONENT

### 16.1 ResourceForm Implementation

- [ ] **Task 16.1.1: Create ResourceForm component**
  - Create: `apps/frontend/src/components/resources/ResourceForm.tsx`
  - Accept props: initialValues, onSubmit, isLoading, mode (create/edit)
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.2: Define zod schema**
  - name: string, required, min 1
  - description: string, optional
  - tags: array of strings, optional
  - isPublic: boolean, default false
  - path: string, optional (for create)
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.3: Implement react-hook-form**
  - Use useForm with zodResolver
  - Handle validation errors
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.4: Implement Name field**
  - Input with label
  - Show error message
  - Auto-focus on mount
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.5: Implement Description field**
  - Textarea with label
  - Optional indicator
  - Character count
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.6: Implement Tags field**
  - Multi-select with create option
  - Show as badges
  - Allow removal
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.7: Implement Visibility toggle**
  - Switch component
  - Label: "Make public"
  - Helper text explaining visibility
  - _Requirements: 8, 9, 10_

- [ ] **Task 16.1.8: Implement Path field (create mode only)**
  - Input with label
  - Auto-generate from name (slugified)
  - Allow manual override
  - Show full path preview
  - _Requirements: 8, 9_

- [ ] **Task 16.1.9: Implement submit button**
  - Show loading state when isLoading
  - Disable when form invalid
  - Text: "Create" or "Save Changes"
  - _Requirements: 8, 9, 10_

---

## PHASE 17: ERROR HANDLING & LOADING STATES

### 17.1 Error Boundaries

- [ ] **Task 17.1.1: Verify RouteErrorBoundary wrapping**
  - Check all resource routes have error boundary
  - Test fallback behavior
  - _Requirements: 18_

- [ ] **Task 17.1.2: Implement API error handling**
  - Handle 400 with validation details
  - Handle 401 with login redirect
  - Handle 403 with permission message
  - Handle 404 with not found message
  - Handle 409 with conflict message
  - Handle 500 with generic message
  - _Requirements: 18_

- [ ] **Task 17.1.3: Implement toast notifications**
  - Success toasts for mutations
  - Error toasts with messages from API
  - _Requirements: 18_

### 17.2 Loading States

- [ ] **Task 17.2.1: Implement list loading skeleton**
  - Show ResourceTableSkeleton when loading
  - _Requirements: 19_

- [ ] **Task 17.2.2: Implement detail loading skeleton**
  - Create skeleton for preview area
  - Create skeleton for metadata card
  - _Requirements: 19_

- [ ] **Task 17.2.3: Implement button loading states**
  - Show spinner on mutation buttons
  - Disable buttons during mutations
  - _Requirements: 19_

- [ ] **Task 17.2.4: Implement stale-while-revalidate**
  - Show current data while refetching
  - Add subtle loading indicator
  - _Requirements: 19_

---

## PHASE 18: POLISH & UX

### 18.1 Responsive Design

- [ ] **Task 18.1.1: Test mobile layout (375px)**
  - Stack filters vertically
  - Single column layout
  - Touch-friendly buttons (44x44px)
  - _Requirements: Accessibility_

- [ ] **Task 18.1.2: Test tablet layout (768px)**
  - Two-column layout where appropriate
  - Collapsible sidebar
  - _Requirements: Accessibility_

- [ ] **Task 18.1.3: Test desktop layout (1280px+)**
  - Three-column grid
  - Full filter bar
  - _Requirements: Accessibility_

### 18.2 Accessibility

- [ ] **Task 18.2.1: Add ARIA labels**
  - Label all icon-only buttons
  - Label form inputs
  - Label interactive elements
  - _Requirements: Accessibility_

- [ ] **Task 18.2.2: Test keyboard navigation**
  - Tab order is logical
  - Focus visible on all elements
  - Modal focus trap works
  - _Requirements: Accessibility_

- [ ] **Task 18.2.3: Test screen reader**
  - Error messages announced
  - Status changes announced
  - Images have alt text
  - _Requirements: Accessibility_

### 18.3 Empty States

- [ ] **Task 18.3.1: Implement default empty state**
  - Icon: FolderOpen
  - Title: "No resources yet"
  - Description: "Upload files or create content to use in your workflows"
  - Action: "Create Resource" button
  - _Requirements: 1_

- [ ] **Task 18.3.2: Implement search empty state**
  - Icon: Search
  - Title: "No resources found"
  - Description: "Try adjusting your search or filters"
  - Action: "Clear filters" button
  - _Requirements: 3_

### 18.4 Keyboard Shortcuts

- [ ] **Task 18.4.1: Implement list page shortcuts**
  - `/` to focus search
  - `n` to create (with permission)
  - `Escape` to clear search
  - _Requirements: 20_

- [ ] **Task 18.4.2: Implement detail page shortcuts**
  - `e` to edit (with permission)
  - `d` to download
  - `Backspace` to delete (with confirmation)
  - _Requirements: 20_

- [ ] **Task 18.4.3: Implement editor shortcuts**
  - `Cmd/Ctrl + S` to save
  - `Cmd/Ctrl + Enter` to submit form
  - _Requirements: 20_

- [ ] **Task 18.4.4: Add shortcut hints in tooltips**
  - Show keyboard shortcut in button tooltips
  - Format: "Edit (e)"
  - _Requirements: 20_

---

## PHASE 19: TESTING & VERIFICATION

### 19.1 Manual Testing

- [ ] **Task 19.1.1: Test list page functionality**
  - Resources display correctly
  - Filtering works
  - Sorting works
  - Pagination works
  - _Requirements: 1, 3, 4, 5_

- [ ] **Task 19.1.2: Test create functionality**
  - Upload file works
  - Create content works
  - Validation works
  - Navigation after create works
  - _Requirements: 8, 9_

- [ ] **Task 19.1.3: Test detail page**
  - Metadata displays correctly
  - Preview works for all types
  - Actions work
  - _Requirements: 6, 7_

- [ ] **Task 19.1.4: Test edit functionality**
  - Metadata edit works
  - Content edit works
  - Validation works
  - _Requirements: 10, 11_

- [ ] **Task 19.1.5: Test delete functionality**
  - Confirmation dialog appears
  - Delete succeeds
  - List updates
  - _Requirements: 12_

- [ ] **Task 19.1.6: Test copy functionality**
  - Dialog appears
  - Copy succeeds
  - Navigate to new resource
  - _Requirements: 14_

- [ ] **Task 19.1.7: Test download functionality**
  - Browser download triggers
  - Correct filename
  - _Requirements: 13_

- [ ] **Task 19.1.8: Test interpolation**
  - JSON input validates
  - Test executes
  - Result displays
  - Placeholders report correctly
  - _Requirements: 15_

- [ ] **Task 19.1.9: Test permission-based UI**
  - Actions hidden without permission
  - Pages redirect without permission
  - _Requirements: 17_

- [ ] **Task 19.1.10: Test error handling**
  - API errors show toasts
  - Form errors show inline
  - 404 shows not found
  - _Requirements: 18_

### 19.2 Build Verification

- [ ] **Task 19.2.1: Run TypeScript check**
  - Run: `cd apps/frontend && bun run typecheck`
  - Fix any type errors
  - _Requirements: Code Quality_

- [ ] **Task 19.2.2: Run ESLint**
  - Run: `cd apps/frontend && bun run lint`
  - Fix any lint errors
  - _Requirements: Code Quality_

- [ ] **Task 19.2.3: Run production build**
  - Run: `cd apps/frontend && bun run build`
  - Verify no build errors
  - _Requirements: Code Quality_

- [ ] **Task 19.2.4: Test built application**
  - Preview production build
  - Verify all features work
  - Check for console errors
  - _Requirements: All_

---

## PHASE 20: FINAL VERIFICATION

### 20.1 Requirements Checklist

- [ ] **Task 20.1.1: Verify Requirement 1 (List View)**
  - All acceptance criteria pass
  - _Requirements: 1_

- [ ] **Task 20.1.2: Verify Requirement 2 (Type Icons)**
  - All acceptance criteria pass
  - _Requirements: 2_

- [ ] **Task 20.1.3: Verify Requirement 3 (Filtering)**
  - All acceptance criteria pass
  - _Requirements: 3_

- [ ] **Task 20.1.4: Verify Requirement 4 (Sorting)**
  - All acceptance criteria pass
  - _Requirements: 4_

- [ ] **Task 20.1.5: Verify Requirement 5 (Pagination)**
  - All acceptance criteria pass
  - _Requirements: 5_

- [ ] **Task 20.1.6: Verify Requirement 6 (Detail View)**
  - All acceptance criteria pass
  - _Requirements: 6_

- [ ] **Task 20.1.7: Verify Requirement 7 (Content Preview)**
  - All acceptance criteria pass
  - _Requirements: 7_

- [ ] **Task 20.1.8: Verify Requirement 8 (File Upload)**
  - All acceptance criteria pass
  - _Requirements: 8_

- [ ] **Task 20.1.9: Verify Requirement 9 (Content Creation)**
  - All acceptance criteria pass
  - _Requirements: 9_

- [ ] **Task 20.1.10: Verify Requirement 10 (Metadata Editing)**
  - All acceptance criteria pass
  - _Requirements: 10_

- [ ] **Task 20.1.11: Verify Requirement 11 (Content Editing)**
  - All acceptance criteria pass
  - _Requirements: 11_

- [ ] **Task 20.1.12: Verify Requirement 12 (Deletion)**
  - All acceptance criteria pass
  - _Requirements: 12_

- [ ] **Task 20.1.13: Verify Requirement 13 (Download)**
  - All acceptance criteria pass
  - _Requirements: 13_

- [ ] **Task 20.1.14: Verify Requirement 14 (Copy)**
  - All acceptance criteria pass
  - _Requirements: 14_

- [ ] **Task 20.1.15: Verify Requirement 15 (Interpolation)**
  - All acceptance criteria pass
  - _Requirements: 15_

- [ ] **Task 20.1.16: Verify Requirement 16 (Navigation)**
  - All acceptance criteria pass
  - _Requirements: 16_

- [ ] **Task 20.1.17: Verify Requirement 17 (Permissions)**
  - All acceptance criteria pass
  - _Requirements: 17_

- [ ] **Task 20.1.18: Verify Requirement 18 (Error Handling)**
  - All acceptance criteria pass
  - _Requirements: 18_

- [ ] **Task 20.1.19: Verify Requirement 19 (Loading States)**
  - All acceptance criteria pass
  - _Requirements: 19_

- [ ] **Task 20.1.20: Verify Requirement 20 (Keyboard Shortcuts)**
  - All acceptance criteria pass
  - _Requirements: 20_

### 20.2 Documentation

- [ ] **Task 20.2.1: Update component exports**
  - Ensure all components are properly exported
  - Update index files if needed
  - _Requirements: Code Quality_

- [ ] **Task 20.2.2: Review inline documentation**
  - Verify complex functions have comments
  - JSDoc for public API
  - _Requirements: Code Quality_

---

## Summary

**Total Tasks:** 147
**Estimated Time:** 5-7 days

**Critical Path:**
1. Phase 1: Setup & Dependencies (0.5 days)
2. Phase 2-4: Types, API, Hooks (1 day)
3. Phase 5-6: Routing & Base Components (0.5 days)
4. Phase 7-8: List Page (1 day)
5. Phase 9-10: Detail Page & Preview (0.5 days)
6. Phase 11-14: Create & Edit Pages (1.5 days)
7. Phase 15-18: Interpolation, Form, Polish (1 day)
8. Phase 19-20: Testing & Verification (1 day)

**Key Milestones:**
- Resources appear in navigation
- List page displays resources
- Create page allows upload and content creation
- Detail page shows preview and metadata
- Edit page allows modifications
- All CRUD operations functional
- Template interpolation works for prompts
- Permission-based UI implemented
- All acceptance criteria verified

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-04
**Status:** Ready for Implementation
