---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, react, hooks]
dependencies: []
---

# Missing Dependencies in useEffect Hooks

## Problem Statement

Multiple useEffect hooks have incomplete dependency arrays, which can cause stale closures and bugs where the latest values aren't used.

**Why it matters:** Can cause subtle bugs with outdated state values, violates React exhaustive-deps rule.

## Findings

### Location 1: ResourceFilterBar
- **File:** `apps/frontend/src/components/resources/ResourceFilterBar.tsx`
- **Lines:** 59-63

```typescript
useEffect(() => {
  if (debouncedSearch !== filters.search) {
    onFiltersChange({ ...filters, search: debouncedSearch || undefined, page: 1 });
  }
}, [debouncedSearch]); // Missing: filters, onFiltersChange
```

### Location 2: ResourcesPage Pagination
- **File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- **Lines:** 65-69

```typescript
useEffect(() => {
  if (pagination.currentPage !== filters.page) {
    setFilters((f) => ({ ...f, page: pagination.currentPage }));
  }
}, [pagination.currentPage]); // Missing: filters.page
```

### Location 3: ResourceEditPage Event Handler
- **File:** `apps/frontend/src/pages/resources/ResourceEditPage.tsx`
- **Lines:** 116-123

References `handleSubmit` but doesn't include it in dependencies.

## Proposed Solutions

### Option 1: Add missing dependencies (Recommended)
**Pros:** Follows React best practices
**Cons:** May require wrapping callbacks in useCallback
**Effort:** Small (20 min)
**Risk:** Low

```typescript
// ResourceFilterBar
useEffect(() => {
  if (debouncedSearch !== filters.search) {
    onFiltersChange({ ...filters, search: debouncedSearch || undefined, page: 1 });
  }
}, [debouncedSearch, filters.search, onFiltersChange]);
```

## Recommended Action

Add all missing dependencies and ensure callbacks are memoized with useCallback in parent components.

## Technical Details

**Affected Files:**
- `apps/frontend/src/components/resources/ResourceFilterBar.tsx`
- `apps/frontend/src/pages/resources/ResourcesPage.tsx`
- `apps/frontend/src/pages/resources/ResourceEditPage.tsx`

## Acceptance Criteria

- [ ] All useEffect hooks have complete dependency arrays
- [ ] ESLint exhaustive-deps rule passes
- [ ] Callbacks passed as props are memoized with useCallback
- [ ] No infinite render loops

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
