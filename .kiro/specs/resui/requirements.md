# Requirements Document: Resources UI

## Introduction

The Resources UI is a comprehensive file and content management interface for the Workscript workflow orchestration system. It provides users with the ability to upload, create, manage, preview, and utilize various types of resources (prompts, images, audio, documents, and data files) that can be referenced and used within workflow executions.

This feature integrates with the existing backend Resources API (10 endpoints at `/workscript/resources`) and follows the established frontend patterns using React, shadcn/ui components, Tailwind CSS, and React Query for state management. The UI will be positioned as a foundational feature in the navigation sidebar, immediately after the Dashboard.

The implementation leverages Monaco Editor for syntax-highlighted text editing, react-dropzone for file uploads, and a data table view for efficient resource browsing. Key capabilities include template interpolation testing for prompt resources, multi-type content preview, comprehensive filtering/pagination, and permission-gated actions.

---

## Functional Requirements

### Requirement 1: Resource List View with Data Table

**User Story:** As a user, I want to view all my resources in a sortable data table, so that I can quickly scan and find the resources I need.

#### Acceptance Criteria

1. WHEN I navigate to `/resources` THEN I should see a data table displaying all resources
2. WHEN the page loads THEN the table should show columns: Icon, Name, Type, Size, Tags, Created, Actions
3. WHEN I click a column header THEN the table should sort by that column (ascending/descending toggle)
4. WHEN I have no resources THEN I should see an empty state with a "Create Resource" call-to-action
5. WHEN resources are loading THEN I should see skeleton rows (10 rows) as loading state
6. WHEN I hover over a row THEN I should see quick action icons appear
7. WHEN I click the actions button (⋮) THEN I should see a dropdown with View, Edit, Download, Copy, Delete options
8. WHEN the table has more items than the page size THEN pagination controls should appear at the bottom
9. WHEN I change pages THEN the URL should update with the page parameter for bookmarkability
10. WHEN I have RESOURCE_READ permission THEN I should see all resources in my tenant
11. WHEN a resource is public (isPublic=true) THEN it should be visible regardless of tenant

---

### Requirement 2: Resource Type Icons

**User Story:** As a user, I want to see distinctive icons for different resource types, so that I can quickly identify resource types visually.

#### Acceptance Criteria

1. WHEN a resource is type `prompt` THEN display a FileCode icon in blue
2. WHEN a resource is type `image` THEN display an Image icon in green
3. WHEN a resource is type `audio` THEN display a Music icon in purple
4. WHEN a resource is type `document` THEN display a FileText icon in orange
5. WHEN a resource is type `data` THEN display a Database icon in cyan
6. WHEN the icon is displayed in the table THEN it should be size 'sm' (16px)
7. WHEN the icon is displayed in detail view THEN it should be size 'lg' (32px)
8. WHEN dark mode is active THEN icon colors should remain visible with appropriate contrast

---

### Requirement 3: Resource Filtering

**User Story:** As a user, I want to filter resources by type, tags, and search terms, so that I can quickly find specific resources.

#### Acceptance Criteria

1. WHEN I type in the search input THEN results should filter after a 300ms debounce
2. WHEN I search THEN the search should match against resource name and description
3. WHEN I select a type from the Type dropdown THEN only resources of that type should show
4. WHEN I select "All Types" THEN resources of all types should show
5. WHEN I have active tag filters THEN they should appear as dismissible pills below the filter bar
6. WHEN I click the X on a tag pill THEN that tag filter should be removed
7. WHEN I click "Clear all" THEN all tag filters should be removed
8. WHEN filters are active THEN the URL should update with query parameters
9. WHEN I refresh the page with filter parameters THEN filters should be restored from URL
10. WHEN search returns no results THEN show "No resources found" empty state with "Clear filters" action
11. WHEN filtering THEN the result count should update to show "X of Y resources"

---

### Requirement 4: Resource Sorting

**User Story:** As a user, I want to sort resources by different criteria, so that I can organize my view according to my needs.

#### Acceptance Criteria

1. WHEN I select "Newest" from sort dropdown THEN resources should sort by createdAt descending
2. WHEN I select "Oldest" THEN resources should sort by createdAt ascending
3. WHEN I select "Name A-Z" THEN resources should sort alphabetically ascending
4. WHEN I select "Name Z-A" THEN resources should sort alphabetically descending
5. WHEN I select "Largest" THEN resources should sort by size descending
6. WHEN I select "Smallest" THEN resources should sort by size ascending
7. WHEN I click a sortable column header THEN the sort should toggle between ascending/descending
8. WHEN sorting is active THEN the column header should show a sort indicator arrow
9. WHEN the sort changes THEN the URL should update with the sortBy parameter
10. IF no sort is specified THEN default to "Newest" (createdAt descending)

---

### Requirement 5: Resource Pagination

**User Story:** As a user, I want to navigate through pages of resources, so that I can browse large collections efficiently.

#### Acceptance Criteria

1. WHEN there are more resources than page size (default 20) THEN pagination should appear
2. WHEN I click "Next" THEN I should see the next page of resources
3. WHEN I click "Previous" THEN I should see the previous page of resources
4. WHEN I'm on page 1 THEN the "Previous" button should be disabled
5. WHEN I'm on the last page THEN the "Next" button should be disabled
6. WHEN I change pages THEN the page number should update in the URL
7. WHEN I navigate directly to a URL with page parameter THEN that page should load
8. WHEN total resources change (after delete) THEN pagination should recalculate
9. WHEN on mobile THEN use MobilePagination component for touch-friendly controls
10. WHEN pagination is visible THEN show "Page X of Y" indicator

---

### Requirement 6: Resource Detail View

**User Story:** As a user, I want to view detailed information about a resource, so that I can understand its contents and metadata.

#### Acceptance Criteria

1. WHEN I click "View" on a resource THEN I should navigate to `/resources/:id`
2. WHEN the detail page loads THEN I should see breadcrumbs: "Resources > {resource.name}"
3. WHEN viewing THEN I should see a main content area (2/3 width) and sidebar (1/3 width)
4. WHEN viewing THEN the main area should show the content preview appropriate to the type
5. WHEN viewing THEN the sidebar should show metadata: Type, Size, Created, Updated, Author, Tags, Visibility, Checksum
6. WHEN viewing a prompt resource THEN the sidebar should include "Test Interpolation" panel
7. WHEN viewing THEN action buttons should appear: Edit, Download, Copy, Delete
8. WHEN the resource doesn't exist THEN show 404 error with "Back to Resources" link
9. WHEN the resource is loading THEN show skeleton placeholders for preview and metadata
10. WHEN I don't have RESOURCE_READ permission THEN show 403 forbidden message
11. WHEN viewing THEN file size should be human-readable (KB, MB)
12. WHEN viewing THEN dates should be relative ("2 days ago") with tooltip showing full date

---

### Requirement 7: Resource Content Preview

**User Story:** As a user, I want to preview resource contents inline, so that I can verify content without downloading.

#### Acceptance Criteria

1. WHEN viewing a `prompt` or `document` (.md, .txt) resource THEN show rendered markdown preview
2. WHEN viewing a `prompt` resource THEN highlight `{{$.path}}` template syntax
3. WHEN viewing an `image` resource THEN display the full image with zoom capability
4. WHEN viewing an `audio` resource THEN show an audio player with play/pause controls
5. WHEN viewing a `data` (.json) resource THEN show a collapsible JSON tree viewer
6. WHEN viewing a `data` (.csv) resource THEN show a formatted table preview
7. WHEN viewing a `document` (.pdf) resource THEN show first page preview or embed PDF viewer
8. WHEN content fails to load THEN show error message with "Retry" button
9. WHEN content is very large (>1MB text) THEN show truncated preview with "Download full" option
10. WHEN previewing THEN show a "Copy content" button for text-based resources
11. IF content contains sensitive data patterns THEN display warning banner

---

### Requirement 8: Resource Creation - File Upload

**User Story:** As a user, I want to upload files as resources, so that I can use them in my workflows.

#### Acceptance Criteria

1. WHEN I click "Create Resource" THEN I should navigate to `/resources/new`
2. WHEN on create page THEN I should see two tabs: "Upload File" and "Create Content"
3. WHEN on "Upload File" tab THEN I should see a drag-and-drop zone
4. WHEN I drag a file over the zone THEN the zone should highlight with "Drop file here"
5. WHEN I drop a file THEN it should appear in the preview area with name and size
6. WHEN I click the zone THEN a file browser should open
7. WHEN I select an invalid file type THEN show error "File type not allowed"
8. WHEN I select a file >50MB THEN show error "File exceeds 50MB limit"
9. WHEN file is selected THEN auto-detect and display the resource type
10. WHEN file is selected THEN show form fields: Name (pre-filled from filename), Description, Tags, Visibility
11. WHEN I click "Upload" THEN show progress bar during upload
12. WHEN upload succeeds THEN navigate to the new resource detail page
13. WHEN upload fails THEN show error toast and keep form state
14. WHEN I don't have RESOURCE_CREATE permission THEN the create button should be hidden

---

### Requirement 9: Resource Creation - Content Creation

**User Story:** As a user, I want to create text-based resources directly in the browser, so that I can write prompts and data without uploading files.

#### Acceptance Criteria

1. WHEN on "Create Content" tab THEN I should see Monaco Editor for content input
2. WHEN I select type "prompt" THEN editor should use markdown language mode
3. WHEN I select type "data" (.json) THEN editor should use JSON language mode
4. WHEN I select type "data" (.csv) THEN editor should use plaintext mode
5. WHEN I type content THEN auto-save draft to localStorage every 1 second (debounced)
6. WHEN I return to create page THEN offer to restore draft if one exists
7. WHEN content is markdown THEN show side-by-side preview panel (togglable)
8. WHEN I fill required fields (name, content) THEN "Create" button should enable
9. WHEN I leave without saving THEN show "Unsaved changes" confirmation dialog
10. WHEN creation succeeds THEN clear localStorage draft and navigate to detail page
11. WHEN I type in Name field THEN auto-generate path suggestion (slugified name)
12. WHEN creating prompt THEN show hint about `{{$.path}}` interpolation syntax

---

### Requirement 10: Resource Editing - Metadata

**User Story:** As a user, I want to edit resource metadata, so that I can update names, descriptions, and tags.

#### Acceptance Criteria

1. WHEN I click "Edit" on a resource THEN I should navigate to `/resources/:id/edit`
2. WHEN edit page loads THEN I should see two tabs: "Metadata" and "Content"
3. WHEN on Metadata tab THEN I should see form with: Name, Description, Tags, Visibility
4. WHEN I modify fields THEN the "Save" button should enable
5. WHEN I click "Save" THEN PUT request should update metadata via API
6. WHEN save succeeds THEN show success toast "Resource updated"
7. WHEN save fails THEN show error toast with message from API
8. WHEN I click "Cancel" THEN navigate back to detail page without saving
9. WHEN I have unsaved changes and try to leave THEN show confirmation dialog
10. WHEN I don't have RESOURCE_UPDATE permission THEN Edit button should be hidden
11. WHEN editing tags THEN support multi-select with option to create new tags
12. WHEN toggling visibility THEN show explanation of public vs private

---

### Requirement 11: Resource Editing - Content

**User Story:** As a user, I want to edit text-based resource content, so that I can update prompts and data files.

#### Acceptance Criteria

1. WHEN on Content tab THEN I should see Monaco Editor with current content
2. WHEN resource is not text-based (image, audio, pdf) THEN Content tab should be disabled with tooltip "Cannot edit binary files"
3. WHEN I modify content THEN auto-save draft to localStorage (debounced 1s)
4. WHEN I click "Save Content" THEN PUT /:id/content should update the file
5. WHEN save succeeds THEN resource checksum and size should update
6. WHEN editing markdown THEN show side-by-side preview (togglable)
7. WHEN editing JSON THEN validate syntax and show errors inline
8. WHEN JSON is invalid THEN disable "Save" button with "Fix JSON errors" message
9. WHEN I've made changes THEN show "Unsaved changes" indicator in tab title
10. WHEN dark mode is active THEN Monaco Editor should use dark theme
11. WHEN editing THEN show character count and estimated file size

---

### Requirement 12: Resource Deletion

**User Story:** As a user, I want to delete resources I no longer need, so that I can keep my resources organized.

#### Acceptance Criteria

1. WHEN I click "Delete" on a resource THEN show confirmation dialog
2. WHEN confirmation dialog shows THEN display resource name and warning about permanent deletion
3. WHEN I confirm deletion THEN soft-delete the resource (isActive=false)
4. WHEN deletion succeeds THEN show success toast and remove from list
5. WHEN deletion fails THEN show error toast with reason
6. WHEN I cancel deletion THEN close dialog and do nothing
7. WHEN I don't have RESOURCE_DELETE permission THEN Delete button should be hidden
8. WHEN deleting from detail page THEN navigate to list page after success
9. WHEN deleting from list page THEN refresh list to reflect removal
10. WHEN resource is in use by workflows THEN show warning in confirmation

---

### Requirement 13: Resource Download

**User Story:** As a user, I want to download resources, so that I can use them outside the system.

#### Acceptance Criteria

1. WHEN I click "Download" THEN browser should download the file
2. WHEN downloading THEN filename should match resource name with appropriate extension
3. WHEN downloading THEN Content-Disposition header should trigger download
4. WHEN download fails THEN show error toast
5. WHEN downloading large file THEN show progress indication if possible
6. WHEN I have RESOURCE_READ permission THEN Download button should be available
7. WHEN downloading THEN log operation in audit trail

---

### Requirement 14: Resource Copy

**User Story:** As a user, I want to copy resources, so that I can create variations without starting from scratch.

#### Acceptance Criteria

1. WHEN I click "Copy" THEN show dialog with name and path inputs
2. WHEN dialog opens THEN pre-fill name with "Copy of {original name}"
3. WHEN dialog opens THEN pre-fill path with "{original path}-copy"
4. WHEN I submit copy THEN POST /:id/copy should create the copy
5. WHEN copy succeeds THEN navigate to the new resource detail page
6. WHEN copy fails (path conflict) THEN show error "Resource already exists at path"
7. WHEN I don't have RESOURCE_CREATE permission THEN Copy button should be hidden
8. WHEN copying THEN preserve all metadata (type, tags, description) from original
9. WHEN copying THEN show "Copying..." loading state on button

---

### Requirement 15: Template Interpolation Testing

**User Story:** As a user, I want to test prompt interpolation, so that I can verify my templates work correctly before using them in workflows.

#### Acceptance Criteria

1. WHEN viewing a prompt resource THEN show "Test Interpolation" panel in sidebar
2. WHEN panel loads THEN show JSON textarea for state input
3. WHEN I enter valid JSON state and click "Test" THEN POST /:id/interpolate should execute
4. WHEN interpolation succeeds THEN show result in "Result" section
5. WHEN interpolation succeeds THEN show placeholder report (found, replaced, unresolved)
6. WHEN placeholders are unresolved THEN highlight them in warning color
7. WHEN state JSON is invalid THEN disable "Test" button with "Invalid JSON" message
8. WHEN interpolation fails THEN show error message
9. WHEN I click "Copy Result" THEN copy interpolated content to clipboard
10. WHEN viewing non-prompt resource THEN hide interpolation panel
11. WHEN testing THEN show loading spinner on "Test" button
12. WHEN I clear state input THEN clear result display

---

### Requirement 16: Navigation Integration

**User Story:** As a user, I want to access Resources from the main navigation, so that I can easily manage my resources.

#### Acceptance Criteria

1. WHEN I view the sidebar THEN "Resources" should appear after "Dashboard"
2. WHEN I click "Resources" in sidebar THEN navigate to `/resources`
3. WHEN I'm on any `/resources/*` path THEN the sidebar link should show active state
4. WHEN active THEN link should have blue background and left border indicator
5. WHEN hovering THEN link should show hover state
6. WHEN in mobile view THEN Resources should appear in mobile sheet navigation
7. WHEN I have no resource permissions THEN Resources link should still be visible (permission check on page)

---

### Requirement 17: Permission-Based UI

**User Story:** As a user, I want the UI to respect my permissions, so that I only see actions I'm allowed to perform.

#### Acceptance Criteria

1. WHEN I have RESOURCE_CREATE permission THEN show "Create Resource" button
2. WHEN I don't have RESOURCE_CREATE permission THEN hide "Create Resource" button
3. WHEN I have RESOURCE_UPDATE permission THEN show "Edit" action
4. WHEN I don't have RESOURCE_UPDATE permission THEN hide "Edit" action
5. WHEN I have RESOURCE_DELETE permission THEN show "Delete" action
6. WHEN I don't have RESOURCE_DELETE permission THEN hide "Delete" action
7. WHEN I have RESOURCE_READ permission THEN allow View, Download, Interpolate actions
8. WHEN I have no resource permissions at all THEN show "No access" message on resources page
9. WHEN I try to access edit page without permission THEN redirect to detail page with toast
10. WHEN permissions change during session THEN UI should reflect on next navigation

---

### Requirement 18: Error Handling

**User Story:** As a user, I want clear error messages, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN API returns 400 THEN show validation error details from response
2. WHEN API returns 401 THEN redirect to login page
3. WHEN API returns 403 THEN show "Permission denied" message
4. WHEN API returns 404 THEN show "Resource not found" with navigation options
5. WHEN API returns 409 THEN show "Resource already exists" conflict message
6. WHEN API returns 413 THEN show "File too large" message
7. WHEN API returns 500 THEN show "Server error, please try again" with retry option
8. WHEN network error occurs THEN show "Network error, check connection" message
9. WHEN error occurs THEN use toast notifications for non-blocking errors
10. WHEN error occurs on page load THEN show error boundary with retry button
11. WHEN validation error occurs in form THEN show inline field errors
12. WHEN upload fails THEN preserve form state so user doesn't lose input

---

### Requirement 19: Loading States

**User Story:** As a user, I want to see loading indicators, so that I know the system is working on my request.

#### Acceptance Criteria

1. WHEN resources list is loading THEN show 10 skeleton table rows
2. WHEN resource detail is loading THEN show skeleton for preview and metadata cards
3. WHEN upload is in progress THEN show progress bar with percentage
4. WHEN mutation is in progress THEN show spinner on action button
5. WHEN content is loading for preview THEN show skeleton placeholder
6. WHEN delete confirmation is processing THEN disable buttons and show spinner
7. WHEN searching THEN show subtle loading indicator (not full skeleton)
8. WHEN interpolation is running THEN show spinner on "Test" button
9. WHEN page is refreshing THEN show loading indicator without clearing content (stale-while-revalidate)
10. IF loading takes >5 seconds THEN show "This is taking longer than expected" message

---

### Requirement 20: Keyboard Shortcuts

**User Story:** As a power user, I want keyboard shortcuts, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN I press `/` on list page THEN focus the search input
2. WHEN I press `n` on list page THEN navigate to create page (if permitted)
3. WHEN I press `Escape` in search THEN clear search and blur input
4. WHEN I press `Escape` in modal THEN close the modal
5. WHEN I press `Enter` in confirmation dialog THEN confirm the action
6. WHEN I press `Cmd/Ctrl + S` in editor THEN save the content
7. WHEN I press `Cmd/Ctrl + Enter` in create form THEN submit the form
8. WHEN shortcuts are available THEN show hints in tooltips
9. WHEN in text input/editor THEN disable navigation shortcuts to avoid conflicts
10. IF user has custom keybindings in Monaco THEN respect those settings

---

## Non-Functional Requirements

### Performance

1. Initial list load should complete within 500ms for up to 100 resources
2. Pagination should feel instant (<100ms perceived)
3. Search debouncing at 300ms prevents excessive API calls
4. Image thumbnails are not loaded in list view (icons only) for performance
5. Monaco Editor should lazy load to avoid blocking initial page render
6. Content preview should lazy load when scrolled into view
7. React Query caching should prevent unnecessary refetches (5-minute stale time)

### Security

1. All API calls must include authentication token
2. Permission checks must occur both client-side (UI) and server-side (API)
3. File upload validation must prevent malicious file types
4. Path input must be sanitized to prevent directory traversal
5. Template interpolation results should be escaped if displayed as HTML
6. Sensitive fields (checksum) should be view-only
7. Session expiry should redirect to login with return URL

### Accessibility

1. All interactive elements must be keyboard accessible
2. All images must have alt text (resource name + type)
3. Form inputs must have associated labels
4. Error messages must be announced to screen readers
5. Color alone must not convey information (icons + text)
6. Focus management must work correctly in modals
7. ARIA labels must be present on icon-only buttons
8. Minimum touch target size of 44x44px on mobile

### Browser Support

1. Chrome 90+ (primary)
2. Firefox 88+
3. Safari 14+
4. Edge 90+
5. Mobile Safari (iOS 14+)
6. Chrome Mobile (Android 10+)

### Code Quality

1. TypeScript strict mode with no `any` types in new code
2. All components must be functional with hooks
3. All API hooks must use React Query patterns
4. All forms must use react-hook-form with zod validation
5. All components must follow existing shadcn/ui patterns
6. Test coverage for critical paths (CRUD operations)
7. ESLint and TypeScript errors must be zero

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Bulk operations** - Selecting and acting on multiple resources at once
2. **Folder/hierarchy structure** - Resources are flat, not nested in folders
3. **Version history** - No versioning or rollback of resource changes
4. **Sharing/collaboration** - No sharing resources with specific users
5. **Comments/annotations** - No commenting on resources
6. **Resource usage analytics** - No tracking of how often resources are used
7. **AI-assisted content generation** - No AI writing assistance in editor
8. **External storage integrations** - No S3, Google Drive, etc.
9. **Resource templates/blueprints** - No template system for creating resources
10. **Drag-and-drop reordering** - No manual ordering of resources
11. **Export to external formats** - No PDF/Word export of resources
12. **Real-time collaboration** - No live editing with multiple users

---

## Success Metrics

The implementation will be considered successful when:

1. All 20 requirements pass acceptance criteria testing
2. CRUD operations complete successfully with proper error handling
3. All 5 resource types can be created, viewed, and edited appropriately
4. Template interpolation works correctly for prompt resources
5. Permission-based UI correctly hides/shows actions
6. No TypeScript or ESLint errors in new code
7. UI matches existing app styling (shadcn/Tailwind patterns)
8. Page load time under 1 second on broadband connection
9. Mobile responsive design works on iPhone SE and larger
10. All keyboard shortcuts function as specified
11. Build completes without errors
12. No console errors during normal operation

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-04
**Status:** Draft - Ready for Implementation
