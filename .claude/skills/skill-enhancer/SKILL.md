---
name: skill-enhancer
description: Analyze user feedback and edit existing skills to perfection by applying targeted enhancements. Use when users want to improve, refine, iterate on, or perfect an existing skill based on specific feedback. Triggers on requests like "improve this skill", "enhance the X skill", "this skill needs...", "make this skill better", "refine the skill based on...", or when users provide critique, suggestions, or observations about skill behavior that should be incorporated.
---

# Skill Enhancer

Like Michelangelo sculpting marble, this skill refines existing skills through careful analysis and targeted improvements. Every enhancement removes what doesn't belong and reveals the skill's true potential.

## Core Philosophy

**Surgical precision over wholesale rewriting.** Enhancing a skill means understanding its essence and making focused changes that improve without disrupting. Changes should be:

- **Targeted**: Address specific issues without side effects
- **Preserving**: Maintain what already works well
- **Additive when needed**: Add only what's missing
- **Subtractive when possible**: Remove unnecessary complexity

## Enhancement Workflow

Skill enhancement follows these steps:

1. Identify the target skill
2. Analyze the skill thoroughly
3. Understand the enhancement request
4. Plan targeted changes
5. Implement enhancements
6. Validate improvements

### Step 1: Identify the Target Skill

The user must explicitly specify which skill to enhance. Accept:

- Direct path: `.claude/skills/my-skill/SKILL.md`
- Skill name: `my-skill` (resolve to standard locations)
- Contextual reference: "the PDF skill", "skill-creator"

If the target is ambiguous, ask for clarification before proceeding.

### Step 2: Analyze the Skill Thoroughly

Before making any changes, perform comprehensive analysis using `scripts/analyze_skill.py`:

```bash
scripts/analyze_skill.py <path/to/skill>
```

The analysis examines:

- **Structure**: SKILL.md organization, frontmatter quality, section layout
- **Resources**: Scripts, references, assets and their utilization
- **Description quality**: Trigger coverage, clarity, completeness
- **Progressive disclosure**: Context efficiency, reference usage
- **Consistency**: Naming, formatting, style alignment

Read the full skill contents and understand:

1. What the skill does
2. How it's structured
3. What resources it includes
4. How it guides Claude's behavior
5. What works well vs. what could improve

### Step 3: Understand the Enhancement Request

User feedback comes in several forms. See `references/enhancement-patterns.md` for detailed patterns.

**Direct requests**: "Add support for X", "Remove the section about Y"
**Observations**: "The skill struggles with Z", "It doesn't handle edge case W"
**Advice**: "It should be more concise", "The examples aren't clear"
**Critique**: "The description doesn't trigger properly", "Too much context loaded"

For each piece of feedback, identify:

1. **What** specifically needs to change
2. **Why** the change improves the skill
3. **Where** in the skill the change applies
4. **How** to implement without breaking existing functionality

### Step 4: Plan Targeted Changes

Map feedback to specific skill components:

| Feedback Type | Likely Target | Enhancement Approach |
|---------------|---------------|----------------------|
| Trigger issues | Frontmatter description | Refine description keywords and scenarios |
| Missing capability | Body sections | Add workflow/guidance for new capability |
| Too verbose | Body/references | Move details to references, trim redundancy |
| Unclear guidance | Body sections | Add examples, clarify instructions |
| Script bugs | scripts/ | Debug and fix, add error handling |
| Missing context | references/ | Add or expand reference documentation |

Create a change plan before implementing:

```markdown
## Enhancement Plan

### Target: skill-name

### Changes:
1. [Component] - [Change description] - [Rationale]
2. [Component] - [Change description] - [Rationale]

### Preserved:
- [What stays unchanged and why]

### Risk assessment:
- [Potential issues and mitigations]
```

### Step 5: Implement Enhancements

Apply changes following these principles:

**For SKILL.md edits:**

- Preserve working sections verbatim unless they need changes
- Use surgical edits, not full rewrites
- Maintain voice and style consistency
- Keep the skill concise (under 500 lines)

**For frontmatter description:**

- Include what the skill does
- Include when/how it triggers
- Cover all relevant scenarios
- Keep it scannable (not a wall of text)

**For new resources:**

- Follow existing naming conventions
- Match the skill's organizational pattern
- Add references in SKILL.md to new files
- Test scripts before considering them complete

**For removals:**

- Delete cleanly without leaving orphaned references
- Update SKILL.md if it referenced removed content
- Consider if removal affects other sections

### Step 6: Validate Improvements

After implementing changes, validate using `scripts/validate_enhancement.py`:

```bash
scripts/validate_enhancement.py <path/to/skill> --original <path/to/backup>
```

Validation checks:

1. **Structural integrity**: Valid YAML frontmatter, proper sections
2. **No regressions**: Original capabilities preserved
3. **Enhancement applied**: Requested changes implemented correctly
4. **Context efficiency**: Not bloated by changes
5. **Reference integrity**: All links and paths valid

## Enhancement Categories

### Description Enhancement

The frontmatter description is the skill's trigger mechanism. Common issues:

- **Too narrow**: Misses valid use cases
- **Too broad**: Triggers inappropriately
- **Unclear**: Doesn't convey purpose

Enhancement approach:

```yaml
# Before: Too narrow
description: Create PDF documents from scratch

# After: Comprehensive trigger coverage
description: Comprehensive PDF manipulation including creation, editing, merging, splitting, form filling, and text extraction. Use when working with PDF files for any document task.
```

### Body Refinement

Skill body issues and solutions:

| Issue | Solution |
|-------|----------|
| Too long | Move details to references/, keep body lean |
| Missing examples | Add concrete input/output examples |
| Unclear workflow | Add numbered steps or decision tree |
| Inconsistent format | Standardize headings, lists, code blocks |

### Resource Optimization

**Scripts:**
- Fix bugs, add error handling
- Improve output formatting
- Add documentation comments

**References:**
- Add missing documentation
- Reorganize for discoverability
- Add table of contents for long files

**Assets:**
- Update outdated templates
- Add missing files referenced in body

## Anti-Patterns to Avoid

**Over-enhancement**: Adding more than requested, scope creep
**Breaking changes**: Removing capabilities without replacement
**Style drift**: Changing voice, format, or conventions unnecessarily
**Bloating**: Making the skill larger without proportional value
**Orphaning**: Adding resources not referenced from SKILL.md

## Examples

### Example 1: Trigger Improvement

**User feedback**: "The email skill doesn't activate when I ask about newsletters"

**Analysis**: Description says "email composition and management" but doesn't mention newsletters.

**Enhancement**:
```yaml
# Before
description: Email composition and management for professional communication.

# After
description: Email composition, management, and newsletter creation for professional communication. Use when drafting emails, managing inbox workflows, creating newsletters, or any email-related task.
```

### Example 2: Adding Missing Workflow

**User feedback**: "The API skill doesn't explain how to handle pagination"

**Enhancement**: Add new section to SKILL.md:

```markdown
## Pagination Handling

For APIs that return paginated results:

1. Check response for pagination indicators (`next_page`, `has_more`, `cursor`)
2. Loop until no more pages
3. Aggregate results across pages

Example pattern:
[code block with pagination handling]
```

### Example 3: Context Efficiency

**User feedback**: "The skill loads too much context for simple tasks"

**Analysis**: Detailed API reference in SKILL.md body.

**Enhancement**:
1. Move API reference to `references/api.md`
2. Add brief summary in SKILL.md: "See references/api.md for complete API documentation"
3. Add decision guidance: "For quick lookups, reference api.md section headers"

## Resources

### scripts/

- `analyze_skill.py`: Comprehensive skill analysis
- `validate_enhancement.py`: Post-enhancement validation
- `diff_skills.py`: Compare before/after versions

### references/

- `enhancement-patterns.md`: Detailed patterns for common enhancement types
- `anti-patterns.md`: What to avoid when enhancing skills
