---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, simplification, react]
dependencies: []
---

# Dual Pagination System Creates Complexity

## Problem Statement

ResourcesPage manages pagination state in TWO places (filters state AND usePagination hook) with manual synchronization. This creates unnecessary complexity and potential for sync bugs.

**Why it matters:** Single source of truth principle violated, 15+ lines of sync code can be eliminated.

## Findings

### Location
- **File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- **Lines:** 58-76

### Current Pattern
```typescript
const pagination = usePagination({
  totalItems: data?.total || 0,
  initialPageSize: PAGE_SIZE,
  initialPage: filters.page || 1,
});

// Manual sync effect
useEffect(() => {
  if (pagination.currentPage !== filters.page) {
    setFilters((f) => ({ ...f, page: pagination.currentPage }));
  }
}, [pagination.currentPage]);
```

## Proposed Solutions

### Option 1: Remove usePagination, use filters only (Recommended)
**Pros:** Single source of truth, simpler code
**Cons:** Need to rewrite pagination props
**Effort:** Small (15 min)
**Risk:** Low

```typescript
// REMOVE usePagination entirely
// REMOVE sync effect

// In MobilePagination:
<MobilePagination
  currentPage={filters.page || 1}
  totalPages={Math.ceil((data?.total || 0) / PAGE_SIZE)}
  onGoToPage={(page) => setFilters(f => ({ ...f, page }))}
  hasPreviousPage={(filters.page || 1) > 1}
  hasNextPage={(filters.page || 1) < Math.ceil((data?.total || 0) / PAGE_SIZE)}
  onPreviousPage={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
  onNextPage={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
/>
```

## Recommended Action

Option 1 - Remove usePagination hook entirely, derive pagination state from filters.

## Technical Details

**Affected Files:**
- `apps/frontend/src/pages/resources/ResourcesPage.tsx`

**Lines to Remove:** ~15 lines

## Acceptance Criteria

- [ ] usePagination hook removed
- [ ] Pagination controlled through filters state only
- [ ] URL still syncs with page number
- [ ] No sync bugs or infinite loops

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
