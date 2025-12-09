---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, react-query, ux]
dependencies: []
---

# Missing Optimistic Updates on Resource Update

## Problem Statement

The `useUpdateResource` mutation lacks optimistic updates present in the workflows feature. Users must wait for API response before seeing changes, creating a sluggish feel.

**Why it matters:** Perceived performance - UI should respond immediately while API catches up.

## Findings

### Location
- **File:** `apps/frontend/src/hooks/api/useResources.ts`
- **Lines:** 90-107

### Current Pattern (No Optimistic Update)
```typescript
export function useUpdateResource() {
  return useMutation({
    mutationFn: ({ id, data }) => resourcesApi.updateResource(id, data),
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.setQueryData(resourceKeys.detail(resource.id), resource);
      toast.success('Resource updated');
    },
  });
}
```

### Desired Pattern (With Optimistic Update)
See workflows implementation for reference.

## Proposed Solutions

### Option 1: Add full optimistic update (Recommended)
**Pros:** Best UX, matches workflow pattern
**Cons:** More complex, need rollback handling
**Effort:** Medium (30 min)
**Risk:** Low

```typescript
export function useUpdateResource() {
  return useMutation({
    mutationFn: ...,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: resourceKeys.detail(id) });
      const previous = queryClient.getQueryData<Resource>(resourceKeys.detail(id));

      if (previous) {
        queryClient.setQueryData<Resource>(resourceKeys.detail(id), {
          ...previous,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onSuccess: ...,
    onError: (error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(resourceKeys.detail(id), context.previous);
      }
      toast.error(...);
    },
  });
}
```

## Recommended Action

Option 1 - Add optimistic updates matching workflows pattern.

## Technical Details

**Affected Files:**
- `apps/frontend/src/hooks/api/useResources.ts`

## Acceptance Criteria

- [ ] UI updates immediately on resource update
- [ ] Rollback occurs on API error
- [ ] Toast shown on error
- [ ] Consistent with useUpdateWorkflow pattern

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
