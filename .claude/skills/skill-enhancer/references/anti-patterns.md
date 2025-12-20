# Anti-Patterns in Skill Enhancement

Common mistakes to avoid when enhancing skills.

## Table of Contents

1. [Scope Anti-Patterns](#scope-anti-patterns)
2. [Structure Anti-Patterns](#structure-anti-patterns)
3. [Content Anti-Patterns](#content-anti-patterns)
4. [Process Anti-Patterns](#process-anti-patterns)

---

## Scope Anti-Patterns

### Over-Enhancement

**What it looks like**: User asks to fix a typo, you restructure the entire skill.

**Why it's harmful**: Introduces unnecessary risk, wastes time, may break working functionality.

**Correct approach**: Make only the requested change. If you notice other issues, mention them but don't fix unsolicited.

```markdown
# Bad: User asked to add "newsletters" to description
# You rewrote the entire skill

# Good: User asked to add "newsletters" to description
# Before
description: Email composition and management.

# After
description: Email composition, management, and newsletters.
```

### Scope Creep

**What it looks like**: "While I'm here, let me also add..."

**Why it's harmful**: Moves beyond user's intent, may conflict with their vision.

**Correct approach**: Stay focused on the requested enhancement. Propose additional improvements separately.

### Under-Enhancement

**What it looks like**: Addressing symptoms instead of root cause.

**Why it's harmful**: Problem recurs, user frustration.

```markdown
# Bad: User says "skill doesn't trigger for X"
# You add X to description but miss that description is fundamentally too narrow

# Good: Analyze why X wasn't covered, fix the underlying pattern
```

---

## Structure Anti-Patterns

### Orphaned Resources

**What it looks like**: Adding files not referenced from SKILL.md.

**Why it's harmful**: Files never discovered or used, wasted context if loaded.

**Correct approach**: Every resource file should be referenced from SKILL.md with guidance on when to use it.

### Reference Nesting

**What it looks like**: References that point to other references.

**Why it's harmful**: Creates confusion, increases loading overhead.

**Correct approach**: Keep references one level deep. All references link from SKILL.md directly.

```markdown
# Bad: Nested references
SKILL.md → references/main.md → references/detail.md

# Good: Flat structure
SKILL.md → references/topic-a.md
SKILL.md → references/topic-b.md
```

### Format Inconsistency

**What it looks like**: New sections don't match existing style.

**Why it's harmful**: Jarring reading experience, harder to maintain.

**Correct approach**: Match existing conventions for headings, lists, code blocks, emphasis.

---

## Content Anti-Patterns

### Redundant Information

**What it looks like**: Same information in multiple places.

**Why it's harmful**: Context bloat, maintenance burden, risk of inconsistency.

**Correct approach**: Single source of truth. Reference, don't repeat.

```markdown
# Bad: API details in SKILL.md AND references/api.md

# Good: API overview in SKILL.md, details in references/api.md only
```

### Obvious Documentation

**What it looks like**: Explaining what Claude already knows.

**Why it's harmful**: Wastes context, implies Claude needs basic tutoring.

```markdown
# Bad
JSON is a data format that uses key-value pairs...
To make an HTTP request, you need to specify the method and URL...

# Good: Skip basics, focus on skill-specific knowledge
Use the company's custom JSON schema (see references/schema.md).
Authenticate using the token pattern in Step 1.
```

### Example Bloat

**What it looks like**: 10 examples when 3 would suffice.

**Why it's harmful**: Context waste, diminishing returns.

**Correct approach**: Include examples that cover distinct scenarios. Quality over quantity.

### Premature Abstraction

**What it looks like**: Creating complex patterns for single use cases.

**Why it's harmful**: Over-engineering, harder to understand.

```markdown
# Bad: Abstract framework for one operation
## Operation Framework
1. Initialize context
2. Apply transformation matrix
3. Execute operation pipeline
4. Finalize and validate

# Good: Direct instructions
## Rotate Image
Run: scripts/rotate.py --angle 90 input.png output.png
```

---

## Process Anti-Patterns

### Blind Enhancement

**What it looks like**: Making changes without reading the full skill first.

**Why it's harmful**: May duplicate existing content, break dependencies, miss context.

**Correct approach**: Always analyze the complete skill before any changes.

### No Backup

**What it looks like**: Modifying skill without preserving original.

**Why it's harmful**: Can't compare, can't rollback, can't validate improvement.

**Correct approach**: Keep original version for comparison during validation.

### Skip Validation

**What it looks like**: Declaring "done" without testing.

**Why it's harmful**: Bugs shipped, broken functionality, user frustration.

**Correct approach**: Run validation script, test changed functionality, verify no regressions.

### Assumption Without Clarification

**What it looks like**: Interpreting ambiguous feedback without asking.

**Why it's harmful**: May implement wrong change, waste effort.

**Correct approach**: When feedback is unclear, ask for clarification before implementing.

```markdown
# Ambiguous: "Make the skill better"
# → Ask: What specifically isn't working? What would "better" look like?

# Clear: "Add pagination handling to the API section"
# → Implement directly
```

---

## Recovery Patterns

When you've fallen into an anti-pattern:

**Over-enhanced**: Diff against original, revert unnecessary changes.

**Orphaned resources**: Add references from SKILL.md or delete unused files.

**Broken skill**: Restore from backup, apply changes incrementally.

**Unclear requirements**: Pause, ask user for clarification, then proceed.
