---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, typescript, type-safety]
dependencies: []
---

# Use of `any` Type in React Query Hooks

## Problem Statement

Error handlers across all mutation hooks use `any` type for error objects without proper typing. This defeats TypeScript's type safety and could hide API contract changes.

**Why it matters:** Type safety is compromised, bugs will be harder to catch at compile time.

## Findings

### Locations
- **File:** `apps/frontend/src/hooks/api/useResources.ts`
- **Lines:** 79, 101, 123, 144, 165, 180

### Vulnerable Pattern
```typescript
onError: (error: any) => {
  toast.error('Failed to create resource', {
    description: error?.response?.data?.message || 'An unexpected error occurred.',
  });
}
```

## Proposed Solutions

### Option 1: Define proper error type (Recommended)
**Pros:** Full type safety, better IDE support
**Cons:** Need to maintain error type
**Effort:** Small (20 min)
**Risk:** Low

```typescript
interface ApiError {
  response?: {
    data?: {
      message?: string;
      code?: string;
    };
    status?: number;
  };
  message?: string;
}

onError: (error: ApiError) => {
  toast.error('Failed to create resource', {
    description: error?.response?.data?.message || error?.message || 'An unexpected error occurred.',
  });
}
```

### Option 2: Use axios error type
**Pros:** Built-in type
**Cons:** Couples to axios
**Effort:** Small (15 min)
**Risk:** Low

```typescript
import { AxiosError } from 'axios';

onError: (error: AxiosError<{ message?: string }>) => { ... }
```

## Recommended Action

Option 1 - Define ApiError type and use across all hooks.

## Technical Details

**Affected Files:**
- `apps/frontend/src/hooks/api/useResources.ts` (6 occurrences)
- Consider creating shared type in `apps/frontend/src/types/api.types.ts`

## Acceptance Criteria

- [ ] No `any` types in useResources.ts
- [ ] ApiError type defined and used consistently
- [ ] All error handlers properly typed
- [ ] TypeScript strict mode passes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
