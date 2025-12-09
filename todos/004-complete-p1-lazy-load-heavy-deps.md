---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, performance, bundle-size]
dependencies: []
---

# Missing Lazy Loading for Heavy Dependencies

## Problem Statement

Monaco Editor (~300KB+) and react-markdown (~50KB) are imported eagerly, increasing initial bundle size by ~350KB for components that may not be used.

**Why it matters:** Every user visiting the resources list page loads Monaco and react-markdown unnecessarily, degrading First Contentful Paint (FCP) and Time to Interactive (TTI).

## Findings

### Locations
- **File:** `apps/frontend/src/components/resources/ResourcePreview.tsx` (Line 10)
- **File:** `apps/frontend/src/components/resources/ContentEditor.tsx` (Line 10)

### Current Impact
- Initial bundle size increased by ~350KB for components that may not be used
- Every page load downloads Monaco even if user never creates/edits a resource

## Proposed Solutions

### Option 1: Lazy load both components (Recommended)
**Pros:** 350KB savings, no functionality change
**Cons:** Slight delay on first use (acceptable with Suspense fallback)
**Effort:** Small (20 min)
**Risk:** Low

```typescript
// ResourcePreview.tsx
import { lazy, Suspense } from 'react';
const Markdown = lazy(() => import('react-markdown'));

// In render:
<Suspense fallback={<Skeleton className="h-96" />}>
  <Markdown>{content}</Markdown>
</Suspense>

// ContentEditor.tsx - lazy load entire component
export default lazy(() => import('./ContentEditor'));
```

### Option 2: Dynamic import on route
**Pros:** Even better code splitting
**Cons:** More complex setup
**Effort:** Medium (45 min)
**Risk:** Low

## Recommended Action

Option 1 - Wrap imports in lazy() with Suspense fallbacks.

## Technical Details

**Affected Files:**
- `apps/frontend/src/components/resources/ResourcePreview.tsx`
- `apps/frontend/src/components/resources/ContentEditor.tsx`

**Bundle Size Savings:**
- Monaco Editor: ~300KB gzipped
- react-markdown: ~50KB gzipped
- **Total: ~350KB (~78% reduction in resource preview bundle)**

## Acceptance Criteria

- [ ] Monaco editor loads lazily when ContentEditor renders
- [ ] react-markdown loads lazily when Markdown content renders
- [ ] Skeleton/spinner shown during lazy load
- [ ] No errors in console during lazy loading
- [ ] Bundle analyzer confirms size reduction

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |

## Resources

- [React Lazy Loading](https://react.dev/reference/react/lazy)
