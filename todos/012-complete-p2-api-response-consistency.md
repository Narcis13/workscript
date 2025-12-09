---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, architecture, consistency]
dependencies: []
---

# API Response Handling Inconsistency

## Problem Statement

The resources API service uses inconsistent response extraction compared to workflows/automations pattern, creating maintenance burden.

**Why it matters:** Inconsistent patterns make the codebase harder to maintain and understand.

## Findings

### Location
- **File:** `apps/frontend/src/services/api/resources.api.ts`
- **Lines:** 35, 54, 58, 66, 74, 89, 116

### Current Pattern
```typescript
return response.data.resource || response.data;
```

### Workflows Pattern
```typescript
if (response.data.workflow) {
  return response.data.workflow;
}
if (response.data.data) {
  return response.data.data;
}
return response.data as unknown as Workflow;
```

## Proposed Solutions

### Option 1: Standardize across all API services (Recommended)
**Pros:** Consistent codebase
**Cons:** Need to update multiple files
**Effort:** Medium (30 min)
**Risk:** Low

```typescript
export async function fetchResource(id: string): Promise<Resource> {
  const response = await apiClient.get(`${BASE_URL}/${id}`);

  if (response.data.resource) {
    return response.data.resource;
  }
  if (response.data.data) {
    return response.data.data;
  }
  return response.data as unknown as Resource;
}
```

## Recommended Action

Option 1 - Standardize response extraction pattern across all API services.

## Technical Details

**Affected Files:**
- `apps/frontend/src/services/api/resources.api.ts`

## Acceptance Criteria

- [ ] Response extraction pattern matches workflows.api.ts
- [ ] All response handlers follow same order
- [ ] Type safety maintained

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
