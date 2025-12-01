# String Template Interpolation - Specification

**Feature:** Mustache-style string template interpolation with `{{$.path}}` syntax
**Target Application:** `@workscript/engine` (packages/engine)
**Status:** Ready for Implementation
**Created:** 2025-12-01
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 12 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, maintainability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 52 actionable tasks organized in 8 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 2-3 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

Add support for inline state value substitution within strings using mustache-style `{{$.path}}` syntax:

- **Before (not supported):** `"Hello $.user.name, welcome!"` → unchanged
- **After (with this feature):** `"Hello {{$.user.name}}, welcome!"` → `"Hello Alice, welcome!"`

### Key Capabilities

- Single template interpolation: `"Hello {{$.name}}!"`
- Multiple templates: `"{{$.firstName}} {{$.lastName}}"`
- Nested paths: `"Email: {{$.user.profile.email}}"`
- Object/array values: JSON.stringify'd automatically
- Missing keys: Silently replaced with empty string
- Backward compatibility: Existing `$.key` syntax preserved with type safety

### Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.8.x |
| Runtime | Bun 1.x |
| Testing | Vitest 3.2.x |
| Pattern Matching | JavaScript RegExp |

---

## Architecture

### Where It Fits

```
Workflow JSON
    ↓
[WorkflowParser]
    ↓
ParsedNode.config
    ↓
[ExecutionEngine.executeNode()]
    ↓
[StateResolver.resolve(config, state)]  ← Template interpolation happens HERE
    ↓
resolvedConfig (values substituted)
    ↓
[node.execute(context, resolvedConfig)]
```

### Key Components

| Component | File | Changes |
|-----------|------|---------|
| StateResolver | `/packages/engine/src/state/StateResolver.ts` | Add template pattern, methods |
| StateResolver Tests | `/packages/engine/src/state/StateResolver.test.ts` | Add 20+ new tests |
| ExecutionEngine | `/packages/engine/src/engine/ExecutionEngine.ts` | No changes needed |

### Design Decision: Extend StateResolver

Why StateResolver instead of a new class:
- Keeps all resolution logic in one place
- Reuses existing `getNestedValue()` infrastructure
- No changes needed to ExecutionEngine or nodes
- Minimal code (~50 lines of new code)

---

## Implementation Phases

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| **Phase 1** | Preparation & Analysis | 0.5 days |
| **Phase 2** | Core Implementation | 0.5 days |
| **Phase 3** | Static Utility Methods | 0.25 days |
| **Phase 4** | Unit Tests | 0.5 days |
| **Phase 5** | Integration Tests | 0.25 days |
| **Phase 6** | Documentation | 0.25 days |
| **Phase 7** | Build & Verify | 0.25 days |
| **Phase 8** | Final Verification | 0.5 days |

**Total:** 2-3 days

---

## Quick Start Guide

### For Developers

1. **Read the requirements:** Start with [requirements.md](./requirements.md) to understand what we're building
2. **Follow the implementation plan:** Work through [implementation_plan.md](./implementation_plan.md) phase by phase
3. **Check off tasks:** Mark tasks complete as you go using the checkboxes
4. **Run tests frequently:** `bun test StateResolver.test.ts` after each change

### For Reviewers

1. **Verify backward compatibility:** Ensure `$.key` syntax still preserves types
2. **Check test coverage:** All new methods should have comprehensive tests
3. **Review pattern matching:** The regex should only match valid `{{$.path}}` patterns
4. **Test edge cases:** Missing keys, null values, nested objects

---

## Success Criteria

- [ ] All 12 requirements have passing tests
- [ ] Existing StateResolver tests continue to pass
- [ ] `$.key` full references still preserve types (numbers, booleans, objects)
- [ ] Templates resolve correctly in nested configs (objects, arrays)
- [ ] Missing keys silently resolve to empty string
- [ ] Performance overhead < 1ms for typical configs
- [ ] Code coverage > 95% for new code
- [ ] Documentation updated

---

## Security Considerations

- **No code execution:** Templates only substitute values, no eval() or expressions
- **No injection risk:** Template syntax cannot execute arbitrary code
- **Type safety:** JSON.stringify used safely for object values
- **Bounded recursion:** Max depth limit prevents infinite loops

---

## Progress Tracking

Use the checkboxes in [implementation_plan.md](./implementation_plan.md) to track progress:

```markdown
- [x] Completed task
- [ ] Pending task
```

**Current Progress:** 0/52 tasks (0%)

---

## Out of Scope (V1)

These features are explicitly NOT included:

- Escaped braces (`\{\{` → literal `{{`)
- Filters/formatters (`{{$.date | format}}`)
- Default values (`{{$.name || "Unknown"}}`)
- Expressions (`{{$.age + 5}}`)
- Conditional blocks (`{{#if $.active}}`)
- Iteration (`{{#each $.items}}`)

---

## Related Documentation

- [Engine CLAUDE.md](/packages/engine/CLAUDE.md) - Engine package documentation
- [Root CLAUDE.md](/CLAUDE.md) - Project-wide documentation
- [StateResolver source](/packages/engine/src/state/StateResolver.ts) - Implementation file
- [StateResolver tests](/packages/engine/src/state/StateResolver.test.ts) - Test file

---

## Contributing

### Code Style

- Follow existing TypeScript patterns in the codebase
- Use meaningful variable names
- Add JSDoc comments for public methods
- Keep methods focused and testable

### Testing

- Write tests alongside implementation
- Cover edge cases (null, undefined, empty, nested)
- Verify backward compatibility with every change
- Run full test suite before considering complete

### Documentation

- Update JSDoc comments in code
- Update CLAUDE.md files with new syntax
- Add examples to help future developers

---

**Happy Coding!**
