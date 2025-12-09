---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, error-handling]
dependencies: []
---

# Unhandled Promise Rejection in Download Handlers

## Problem Statement

The `handleDownload` functions in ResourcesPage and ResourceDetailPage don't handle potential errors from the API call. If the download fails, users see no feedback.

**Why it matters:** Poor user experience - app appears frozen on download failure.

## Findings

### Locations
- **File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx` (Lines 81-89)
- **File:** `apps/frontend/src/pages/resources/ResourceDetailPage.tsx` (Lines 82-90)

### Current Code (No Error Handling)
```typescript
const handleDownload = async (resource: Resource) => {
  const blob = await downloadResource(resource.id); // Can throw!
  const url = URL.createObjectURL(blob);
  // ...
};
```

## Proposed Solutions

### Option 1: Extract to reusable utility with error handling (Recommended)
**Pros:** Single source of truth, consistent error handling
**Cons:** Need to create utility file
**Effort:** Small (15 min)
**Risk:** Low

```typescript
// src/lib/resourceDownload.ts
export async function downloadResourceFile(resource: { id: string; name: string }) {
  try {
    const blob = await downloadResource(resource.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resource.name;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    toast.error('Download failed', {
      description: 'The resource could not be downloaded. Please try again.',
    });
    return false;
  }
}
```

## Recommended Action

Option 1 - Extract to shared utility with proper error handling.

## Technical Details

**Affected Files:**
- `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`
- Create: `apps/frontend/src/lib/resourceDownload.ts`

## Acceptance Criteria

- [ ] Download errors show user-friendly toast message
- [ ] No unhandled promise rejections
- [ ] Download logic extracted to single utility
- [ ] Both pages use the shared utility

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
