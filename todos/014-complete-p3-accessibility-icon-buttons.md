---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, accessibility, a11y]
dependencies: []
---

# Missing Accessibility Labels for Icon Buttons

## Problem Statement

Icon-only buttons throughout the Resources UI lack `aria-label` attributes, making them inaccessible to screen reader users.

**Why it matters:** WCAG compliance, users with disabilities cannot use these buttons.

## Findings

### Location
- **File:** `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`
- **Lines:** 155-167

### Current Pattern
```tsx
<Button variant="outline" size="icon" onClick={handleDownload}>
  <Download className="size-4" />
</Button>
```

## Proposed Solutions

### Option 1: Add aria-label to all icon buttons (Recommended)
**Pros:** Simple fix, immediate accessibility improvement
**Cons:** None
**Effort:** Small (15 min)
**Risk:** None

```tsx
<Button
  variant="outline"
  size="icon"
  onClick={handleDownload}
  aria-label="Download resource"
>
  <Download className="size-4" />
</Button>
```

## Recommended Action

Add aria-label to all icon-only buttons across Resources UI.

## Technical Details

**Affected Files:**
- `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`
- `apps/frontend/src/components/resources/ResourceList.tsx`
- `apps/frontend/src/components/resources/ResourceUploader.tsx`

## Acceptance Criteria

- [ ] All icon buttons have aria-label
- [ ] Screen reader can identify button purpose
- [ ] axe accessibility audit passes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
