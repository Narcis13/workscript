---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security, xss]
dependencies: []
---

# XSS Vulnerability in Markdown Rendering

## Problem Statement

The `react-markdown` component renders user-provided Markdown content without sanitization or security restrictions. An attacker can inject malicious HTML/JavaScript through resource content that will execute in the context of other users' browsers.

**Why it matters:** Session tokens, cookies, and sensitive data can be stolen through XSS attacks. This is a CRITICAL security vulnerability that blocks merge.

## Findings

### Location
- **File:** `apps/frontend/src/components/resources/ResourcePreview.tsx`
- **Line:** 176

### Vulnerable Code
```tsx
<Markdown>{content}</Markdown>
```

### Attack Vector
1. Attacker creates a resource with malicious Markdown: `![XSS](javascript:alert(document.cookie))`
2. Attacker makes resource public or shares with victims
3. When victims view the resource, arbitrary JavaScript executes
4. Session tokens, cookies, and sensitive data can be stolen

## Proposed Solutions

### Option 1: Add rehype-sanitize plugin (Recommended)
**Pros:** Standard solution, well-maintained, comprehensive sanitization
**Cons:** Adds dependency (~5KB)
**Effort:** Small (15 min)
**Risk:** Low

```tsx
import rehypeSanitize from 'rehype-sanitize';

<Markdown
  rehypePlugins={[rehypeSanitize]}
  disallowedElements={['script', 'iframe', 'object', 'embed']}
  unwrapDisallowed={true}
>
  {content}
</Markdown>
```

### Option 2: Use DOMPurify wrapper
**Pros:** More control over sanitization
**Cons:** Additional processing step, slightly more complex
**Effort:** Small (20 min)
**Risk:** Low

## Recommended Action

Option 1 - Add rehype-sanitize plugin. This is the standard approach for react-markdown.

## Technical Details

**Affected Files:**
- `apps/frontend/src/components/resources/ResourcePreview.tsx`

**Dependencies to Add:**
- `rehype-sanitize`

## Acceptance Criteria

- [ ] Markdown rendering sanitizes all HTML
- [ ] Script tags are removed/escaped
- [ ] Event handlers (onerror, onclick, etc.) are stripped
- [ ] javascript: URLs are blocked
- [ ] Unit test covers XSS payload rendering

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |

## Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [rehype-sanitize docs](https://github.com/rehypejs/rehype-sanitize)
