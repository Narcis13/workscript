---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, performance, react]
dependencies: []
---

# Unstable Handler Functions Cause Unnecessary Re-renders

## Problem Statement

Multiple handler functions in ResourcesPage are recreated on every render and passed to ResourceList, causing all 20 table rows to re-render unnecessarily.

**Why it matters:** Performance degrades with list size - 100 resources = 100 unnecessary DOM reconciliations per parent render.

## Findings

### Location
- **File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- **Lines:** 71-93

### Current Pattern
```typescript
const handleFiltersChange = (newFilters: ResourceFilters) => { ... };
const handleView = (resource: Resource) => navigate(`/resources/${resource.id}`);
const handleEdit = (resource: Resource) => navigate(`/resources/${resource.id}/edit`);
const handleDownload = async (resource: Resource) => { ... };
const handleCopy = (resource: Resource) => { ... };
```

All handlers are recreated on every render.

## Proposed Solutions

### Option 1: Wrap handlers in useCallback (Recommended)
**Pros:** Standard React optimization
**Cons:** Slightly more verbose
**Effort:** Small (15 min)
**Risk:** Low

```typescript
const handleView = useCallback((resource: Resource) =>
  navigate(`/resources/${resource.id}`), [navigate]);

const handleEdit = useCallback((resource: Resource) =>
  navigate(`/resources/${resource.id}/edit`), [navigate]);

const handleDownload = useCallback(async (resource: Resource) => {
  // ... download logic
}, []);

const handleCopy = useCallback((resource: Resource) =>
  navigate(`/resources/${resource.id}?action=copy`), [navigate]);
```

### Option 2: Also add React.memo to ResourceList
**Pros:** Prevents re-render if props unchanged
**Cons:** Memory overhead for memoization
**Effort:** Small (5 min additional)
**Risk:** Low

## Recommended Action

Option 1 + Option 2 - Memoize handlers AND wrap ResourceList in React.memo.

## Technical Details

**Affected Files:**
- `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- `apps/frontend/src/components/resources/ResourceList.tsx`

## Acceptance Criteria

- [ ] All handlers wrapped in useCallback
- [ ] ResourceList wrapped in React.memo
- [ ] React DevTools shows fewer re-renders
- [ ] No functional changes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
