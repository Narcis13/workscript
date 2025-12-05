---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, path-traversal]
dependencies: []
---

# Path Traversal Vulnerability in Resource Copy

## Problem Statement

The copy functionality allows users to specify arbitrary file paths without validation. An attacker can use path traversal sequences (e.g., `../../`) to write resources to unauthorized locations on the server.

**Why it matters:** Server file system compromise, unauthorized data access.

## Findings

### Location
- **File:** `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`
- **Lines:** 278-284

### Vulnerable Code
```tsx
<Input
  id="copyPath"
  value={copyPath}
  onChange={(e) => setCopyPath(e.target.value)}
/>
```

### Attack Vectors
1. Path traversal: `../../sensitive/location`
2. Overwrite system files (if permissions allow)
3. Write to unauthorized tenant directories

## Proposed Solutions

### Option 1: Client-side validation + Server-side enforcement (Recommended)
**Pros:** Defense in depth
**Cons:** Need to implement both client and server
**Effort:** Medium (30 min)
**Risk:** Low

```typescript
// Client-side validation
const validatePath = (path: string): boolean => {
  if (path.includes('..') || path.includes('~')) return false;
  if (path.startsWith('/')) return false;
  return /^[a-zA-Z0-9\-_\/]+$/.test(path);
};

// Server-side MUST also validate
```

### Option 2: Remove path input entirely
**Pros:** Simplest fix
**Cons:** Less flexibility
**Effort:** Small (10 min)
**Risk:** Low

## Recommended Action

Option 1 - Implement client-side validation AND ensure server validates. Client-side is UX improvement only.

## Technical Details

**Affected Files:**
- `apps/frontend/src/pages/resources/ResourceDetailPage.tsx` (client)
- Backend endpoint for copy (CRITICAL - server validation required)

## Acceptance Criteria

- [ ] Client rejects paths containing ".."
- [ ] Client rejects paths containing "~"
- [ ] Client rejects absolute paths starting with "/"
- [ ] Server validates and rejects malicious paths
- [ ] Toast error message shown for invalid paths

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |

## Resources

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
