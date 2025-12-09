---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, duplication, refactoring]
dependencies: ["006"]
---

# Duplicate Download Handler Logic

## Problem Statement

Identical `handleDownload` implementation (~9 lines) is duplicated across ResourcesPage and ResourceDetailPage.

**Why it matters:** DRY principle violation, bug fixes need to be applied in multiple places.

## Findings

### Locations
- **File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx` (Lines 81-89)
- **File:** `apps/frontend/src/pages/resources/ResourceDetailPage.tsx` (Lines 82-91)

### Duplicated Code
```typescript
const handleDownload = async (resource: Resource) => {
  const blob = await downloadResource(resource.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = resource.name;
  a.click();
  URL.revokeObjectURL(url);
};
```

## Proposed Solutions

### Option 1: Extract to utility function (Recommended)
**Pros:** Single source of truth
**Cons:** Need to create new file
**Effort:** Small (10 min)
**Risk:** Low

```typescript
// src/lib/resourceDownload.ts
export async function downloadResourceFile(id: string, filename: string) {
  const blob = await downloadResource(id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Usage:
import { downloadResourceFile } from '@/lib/resourceDownload';
const handleDownload = () => downloadResourceFile(resource.id, resource.name);
```

## Recommended Action

Option 1 - Extract to shared utility. Combine with error handling fix from issue 006.

## Technical Details

**Affected Files:**
- `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`
- Create: `apps/frontend/src/lib/resourceDownload.ts`

**Lines Saved:** ~18 lines

## Acceptance Criteria

- [ ] Download utility created in lib/
- [ ] Both pages use shared utility
- [ ] Error handling included in utility
- [ ] No duplicate code remains

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
