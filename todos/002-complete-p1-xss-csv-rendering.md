---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, xss]
dependencies: []
---

# XSS Vulnerability in CSV Rendering

## Problem Statement

CSV content is directly rendered into table cells without HTML escaping. Malicious CSV files containing HTML/JavaScript will execute when previewed.

**Why it matters:** Any user can upload a crafted CSV that executes JavaScript in viewers' browsers.

## Findings

### Location
- **File:** `apps/frontend/src/components/resources/ResourcePreview.tsx`
- **Lines:** 144-158

### Vulnerable Code
```tsx
{headers.map((h, i) => (
  <th key={i} className="px-3 py-2 text-left font-medium border-b">
    {h}  {/* No escaping */}
  </th>
))}
```

### Attack Vector
1. Upload CSV with payload: `Name,Email\n<img src=x onerror=alert(1)>,victim@example.com`
2. CSV preview executes JavaScript when rendering headers/cells

## Proposed Solutions

### Option 1: Use DOMPurify (Recommended)
**Pros:** Comprehensive sanitization, widely used
**Cons:** Adds dependency
**Effort:** Small (15 min)
**Risk:** Low

```tsx
import DOMPurify from 'dompurify';

{headers.map((h, i) => (
  <th key={i} className="px-3 py-2 text-left font-medium border-b">
    {DOMPurify.sanitize(h, { ALLOWED_TAGS: [] })}
  </th>
))}
```

### Option 2: Use built-in text content
**Pros:** No dependency
**Cons:** May break legitimate formatting
**Effort:** Small (10 min)
**Risk:** Medium

## Recommended Action

Option 1 - Use DOMPurify with ALLOWED_TAGS: [] to strip all HTML.

## Technical Details

**Affected Files:**
- `apps/frontend/src/components/resources/ResourcePreview.tsx`

**Dependencies to Add:**
- `dompurify` + `@types/dompurify`

## Acceptance Criteria

- [ ] CSV headers are sanitized before rendering
- [ ] CSV cell values are sanitized before rendering
- [ ] HTML tags in CSV content are stripped/escaped
- [ ] Unit test covers XSS payload in CSV

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |

## Resources

- [DOMPurify docs](https://github.com/cure53/DOMPurify)
