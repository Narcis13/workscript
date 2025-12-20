# Enhancement Patterns

Detailed patterns for common skill enhancement scenarios.

## Table of Contents

1. [Description Enhancements](#description-enhancements)
2. [Structure Enhancements](#structure-enhancements)
3. [Content Enhancements](#content-enhancements)
4. [Resource Enhancements](#resource-enhancements)
5. [Performance Enhancements](#performance-enhancements)

---

## Description Enhancements

### Pattern: Trigger Expansion

**Problem**: Skill doesn't activate for valid use cases.

**Diagnosis**: Description too narrow, missing keywords or scenarios.

**Solution template**:
```yaml
# Structure
description: [Core capability]. [Secondary capabilities]. Use when [trigger scenarios]. [Additional trigger keywords].
```

**Before/After example**:
```yaml
# Before: Misses related scenarios
description: Create PowerPoint presentations

# After: Comprehensive coverage
description: PowerPoint creation, editing, and formatting with support for themes, animations, and speaker notes. Use when creating presentations, modifying slides, adding visual content, or exporting to PDF.
```

### Pattern: Trigger Refinement

**Problem**: Skill activates for unrelated requests.

**Diagnosis**: Description too broad or ambiguous.

**Solution**: Add specificity, include "NOT for" clarifications if needed.

```yaml
# Before: Too broad
description: Handle all document processing tasks

# After: Focused
description: Microsoft Word document (.docx) creation and editing. Use for Word documents specifically. For PDFs, use the pdf skill. For spreadsheets, use the excel skill.
```

### Pattern: Clarity Improvement

**Problem**: Description is technically accurate but hard to parse.

**Solution**: Restructure for scannability.

```yaml
# Before: Dense paragraph
description: This skill provides comprehensive functionality for working with databases including schema design, query optimization, migration management, and connection pooling across multiple database types.

# After: Scannable structure
description: Database operations including schema design, query optimization, migrations, and connection management. Supports PostgreSQL, MySQL, SQLite. Use when designing schemas, writing queries, managing migrations, or troubleshooting database issues.
```

---

## Structure Enhancements

### Pattern: Section Reorganization

**Problem**: Information hard to find, illogical flow.

**Solution**: Restructure following natural workflow.

```markdown
# Before: Random organization
## Advanced Features
## Installation
## Quick Start
## Troubleshooting
## Basic Usage

# After: Logical flow
## Quick Start
## Basic Usage
## Advanced Features
## Troubleshooting
```

### Pattern: Progressive Disclosure

**Problem**: Too much detail in SKILL.md, overwhelming context.

**Solution**: Move detailed content to references.

**Steps**:
1. Identify sections over 50 lines
2. Create reference file with that content
3. Replace with summary + link
4. Add guidance on when to read reference

```markdown
# Before: 200-line API reference in body

## API Reference
[200 lines of endpoints, parameters, examples...]

# After: Concise pointer
## API Reference

For complete API documentation, see `references/api.md`.

**Quick reference:**
- `GET /users` - List users
- `POST /users` - Create user
- `PUT /users/:id` - Update user

Read the full reference when implementing complex queries or debugging API issues.
```

### Pattern: Decision Tree Addition

**Problem**: Unclear which path to take for different scenarios.

**Solution**: Add explicit decision tree.

```markdown
## Workflow Selection

Choose your workflow based on the task:

**Creating new content?**
→ Follow [Creation Workflow](#creation-workflow)

**Editing existing content?**
→ Follow [Editing Workflow](#editing-workflow)

**Converting formats?**
→ Follow [Conversion Workflow](#conversion-workflow)
```

---

## Content Enhancements

### Pattern: Example Addition

**Problem**: Instructions unclear without concrete examples.

**Solution**: Add input/output examples.

```markdown
# Before: Abstract instruction
Use the transform function to modify data structures.

# After: Concrete example
Use the transform function to modify data structures.

**Example:**
Input:
```json
{"users": [{"name": "Alice"}, {"name": "Bob"}]}
```

Output after `transform --flatten`:
```json
[{"name": "Alice"}, {"name": "Bob"}]
```
```

### Pattern: Edge Case Coverage

**Problem**: Skill fails on edge cases.

**Solution**: Document edge cases explicitly.

```markdown
## Edge Cases

**Empty input**: Return empty result, don't error
**Special characters**: Escape before processing
**Large files**: Stream instead of loading to memory
**Missing fields**: Use defaults, warn in output
```

### Pattern: Error Guidance

**Problem**: Users stuck when errors occur.

**Solution**: Add troubleshooting section.

```markdown
## Common Issues

**"Permission denied" error**
→ Check file permissions: `chmod 644 <file>`

**"Invalid format" error**
→ Verify input matches expected schema. See examples above.

**Slow processing**
→ For files >10MB, use streaming mode: `--stream`
```

---

## Resource Enhancements

### Pattern: Script Improvement

**Problem**: Script has bugs, poor error handling, or unclear output.

**Solution checklist**:
- [ ] Add input validation
- [ ] Add meaningful error messages
- [ ] Add progress output for long operations
- [ ] Add usage documentation in script header
- [ ] Test with edge cases

```python
# Before: Minimal script
def process(file):
    data = open(file).read()
    return transform(data)

# After: Robust script
#!/usr/bin/env python3
"""
Process data files with transformation.

Usage: process.py <input-file> [--output <output-file>]

Examples:
    process.py data.json
    process.py data.json --output result.json
"""

import sys
from pathlib import Path

def process(file_path):
    path = Path(file_path)

    if not path.exists():
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        return None

    try:
        data = path.read_text()
        result = transform(data)
        print(f"Successfully processed {path.name}")
        return result
    except Exception as e:
        print(f"Error processing {path.name}: {e}", file=sys.stderr)
        return None
```

### Pattern: Reference Expansion

**Problem**: Missing documentation for important functionality.

**Solution**: Add comprehensive reference file.

**Reference file structure**:
```markdown
# [Feature] Reference

## Overview
[1-2 sentence summary]

## Quick Reference
[Table or bullet list of key items]

## Detailed Documentation
[Full documentation organized by topic]

## Examples
[Practical examples for common use cases]

## Troubleshooting
[Common issues and solutions]
```

---

## Performance Enhancements

### Pattern: Context Reduction

**Problem**: Skill loads too much context for simple tasks.

**Diagnosis**: Long SKILL.md, embedded references, verbose examples.

**Solution strategies**:

1. **Move to references**: Detailed docs → reference files
2. **Trim redundancy**: Remove repeated information
3. **Condense examples**: One good example beats three okay ones
4. **Remove obvious content**: Claude already knows programming basics

**Metrics**:
- SKILL.md should be under 500 lines
- Individual reference files under 300 lines
- Total loaded context under 5k tokens for typical use

### Pattern: Lazy Loading Guidance

**Problem**: All references loaded even when not needed.

**Solution**: Add explicit loading guidance.

```markdown
## Reference Files

Load these files only when needed:

- `references/api.md` - For API implementation tasks
- `references/schemas.md` - When designing data structures
- `references/migrations.md` - For database migration tasks

For quick tasks, the information in this SKILL.md is sufficient.
```
