# Claude Code Custom Commands

This directory contains custom slash commands for Claude Code.

## Available Commands

### `/generate-specs` - Generate Feature Specification Documents

Automatically generates comprehensive specification documentation for a new feature based on your planning conversation.

#### Usage

```
/generate-specs folder_name
```

**Example:**
```
/generate-specs react_client_auth
```

#### What it generates

Creates three files in `.kiro/specs/[folder_name]/`:

1. **requirements.md** - Complete Product Requirements Document (PRD)
   - Detailed user stories with acceptance criteria
   - Non-functional requirements
   - Success metrics
   - Out of scope items

2. **implementation_plan.md** - Concrete Implementation Plan
   - 80-150+ actionable tasks
   - Organized in phases
   - Checkboxes for progress tracking
   - Time estimates

3. **README.md** - Overview document
   - Feature summary
   - Architecture overview
   - Quick start guide
   - Progress tracking instructions

#### When to use it

Use this command when:
- ✅ You've finished planning a new feature in the conversation
- ✅ You've discussed architecture, components, and approach
- ✅ You're ready to formalize the plan into documentation
- ✅ You want to start implementation with clear requirements

#### Prerequisites

Before running the command:
1. Have a planning conversation with Claude about your feature
2. Discuss technical architecture and approach
3. Identify key components and structure
4. Decide on technologies and patterns

#### How it works

1. Analyzes the conversation history to understand the feature
2. Extracts requirements, architecture, and implementation details
3. Creates comprehensive documentation following PRD standards
4. Generates actionable tasks with checkboxes
5. Organizes everything into a structured format

#### Example workflow

```bash
# 1. Plan your feature in conversation
"I want to add user authentication to my React app..."
[... discussion about architecture, components, etc ...]

# 2. Generate specs
/generate-specs react_auth_system

# 3. Check the generated files
ls -lh .kiro/specs/react_auth_system/

# 4. Review and start implementing
cat .kiro/specs/react_auth_system/implementation_plan.md

# 5. Track progress by checking off tasks
# Edit implementation_plan.md and change:
# - [ ] Task not started
# to:
# - [x] Task completed

# 6. Count progress
grep -c "^- \[x\]" .kiro/specs/react_auth_system/implementation_plan.md
```

#### Quality standards

The generated docs match the quality of:
- `.kiro/specs/react_client_auth/` (example)
- `.kiro/specs/json-workflow-engine/` (example)

Documents are:
- ✅ Comprehensive and detailed
- ✅ Professionally written
- ✅ Technically accurate
- ✅ Well-structured and organized
- ✅ Actionable and practical
- ✅ Easy to follow

#### Tips

1. **Be detailed in your planning conversation** - The more detail you provide, the better the generated specs
2. **Discuss architecture thoroughly** - Include technical decisions, patterns, and approaches
3. **Review and refine** - Generated docs are a starting point; you can edit them
4. **Use consistent naming** - Choose clear, descriptive folder names (use underscores or hyphens)
5. **Track progress** - Check off tasks as you complete them in implementation_plan.md

#### Folder naming conventions

Good folder names:
- ✅ `react_client_auth`
- ✅ `user-management`
- ✅ `workflow-builder-ui`
- ✅ `api-integration`

Avoid:
- ❌ `Feature1` (not descriptive)
- ❌ `my feature` (spaces)
- ❌ `React Auth!!!` (special characters)

#### Troubleshooting

**Command not found:**
- Make sure you're using Claude Code (not regular Claude)
- Check that the file exists: `.claude/commands/generate-specs.md`
- Try restarting Claude Code

**Poor quality output:**
- Ensure you had a detailed planning conversation first
- The command needs context from the conversation history
- Provide more technical details in your planning discussion

**Wrong folder name:**
- You can manually rename the folder after generation
- Update references in README.md if needed

#### Support

For issues or questions:
1. Check this README
2. Review example specs in `.kiro/specs/`
3. Ask Claude for help in the conversation

---

## Creating Your Own Commands

To create a custom command:

1. Create a new `.md` file in `.claude/commands/`
2. Add a description in the frontmatter:
   ```markdown
   ---
   description: What your command does
   ---
   ```
3. Write the prompt/instructions in the file body
4. Use `{{FOLDER_NAME}}` or other placeholders for arguments
5. Save and use with `/command-name`

Example:
```markdown
---
description: Review code for security issues
---

Please review the code in the current file for security vulnerabilities...
```

---

**Last Updated:** 2025-11-12
**Version:** 1.0.0
