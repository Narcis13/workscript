---
description: Generate comprehensive specification documents (requirements.md, implementation_plan.md, README.md) for a new feature based on recent planning conversation
---

# Generate Feature Specification Documents

You are tasked with creating comprehensive specification documentation for a new feature based on the recent planning conversation in this chat.

## Context

The user has been planning a new feature and now wants to formalize it into specification documents. Review the conversation history above to understand:
- What feature is being planned
- The goals and objectives
- Technical architecture and approach
- Key components and structure
- Implementation details discussed

## Task

Create three specification documents in `.kiro/specs/{{FOLDER_NAME}}/`:

### 1. requirements.md (Product Requirements Document)

Create a comprehensive PRD following this structure:

#### Header
```markdown
# Requirements Document: [Feature Name]

## Introduction

[2-3 paragraphs describing:
- What the feature is
- Why it's needed
- How it integrates with the existing system
- Key technologies and approaches]
```

#### Requirements Section
Create 15-20+ detailed requirements following this format:

```markdown
### Requirement N: [Requirement Title]

**User Story:** As a [user type], I want to [action], so that [benefit].

#### Acceptance Criteria

1. WHEN [condition] THEN [expected outcome]
2. WHEN [condition] THEN [expected outcome]
3. IF [condition] THEN [expected outcome]
4. WHEN [condition] THEN [expected outcome]
[... 8-15 acceptance criteria per requirement]
```

**Requirements should cover:**
- Core functionality (login, registration, CRUD operations, etc.)
- User interface components
- Data management and state
- API integration
- Security and permissions
- Error handling and validation
- Navigation and routing
- Performance and optimization
- Testing and quality
- Configuration and setup

#### Additional Sections
```markdown
## Non-Functional Requirements

### Performance
[Performance expectations]

### Security
[Security requirements]

### Accessibility
[Accessibility requirements]

### Browser Support / Compatibility
[Compatibility requirements]

### Code Quality
[Code quality standards]

---

## Out of Scope

[Explicitly list features that are NOT included]

---

## Success Metrics

[List criteria for successful implementation]

---

**Document Version:** 1.0.0
**Last Updated:** [Current Date]
**Status:** Draft - Ready for Implementation
```

### 2. implementation_plan.md (Implementation Plan with Tasks)

Create a detailed implementation plan following this structure:

```markdown
# Implementation Plan: [Feature Name]

This document provides a concrete, actionable implementation plan for [feature description]. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: [PHASE NAME]

### 1.1 [Subsection Name]

- [ ] **Task 1.1.1: [Task title]**
  - [Detailed description of what to do]
  - [Any commands to run or files to create]
  - [Expected outcomes]
  - _Requirements: [List requirement numbers]_

- [ ] **Task 1.1.2: [Task title]**
  - [Task details]
  - _Requirements: [requirement numbers]_

[... more tasks]

### 1.2 [Subsection Name]

- [ ] **Task 1.2.1: [Task title]**
  - [Task details]
  - _Requirements: [requirement numbers]_

[... more tasks]

---

## PHASE 2: [PHASE NAME]

[... more phases]

---

## PHASE N: FINAL VERIFICATION

### N.1 Build & Deploy Readiness

- [ ] **Task N.1.1: Test production build**
  - Run build command
  - Fix any build errors
  - Test built application
  - _Requirements: Code Quality_

### N.2 Final Acceptance

- [ ] **Task N.2.1: Review all requirements**
  - Verify all acceptance criteria met
  - Document any deviations
  - _Requirements: All_

---

## Summary

**Total Tasks:** [Count]
**Estimated Time:** [X-Y days]

**Critical Path:**
1. Phase 1: [Phase name] (X days)
2. Phase 2: [Phase name] (X days)
[... list all phases with estimates]

**Key Milestones:**
- ✅ [Milestone 1]
- ✅ [Milestone 2]
[... list key milestones]

---

**Document Version:** 1.0.0
**Last Updated:** [Current Date]
**Status:** Ready for Implementation
```

**Guidelines for tasks:**
- Break down into small, actionable tasks (15-30 minutes each)
- Group related tasks into subsections
- Order tasks by dependency (foundational tasks first)
- Include specific commands, file paths, and code snippets where helpful
- Reference requirements for traceability
- Add checkboxes (- [ ]) for progress tracking
- Aim for 80-150+ tasks total depending on complexity
- Include phases for: Setup, Core Implementation, UI/UX, Integration, Testing, Polish, Verification

### 3. README.md (Overview Document)

Create an overview document following this structure:

```markdown
# [Feature Name] - Specification

**Feature:** [Brief description]
**Target Application:** [App location]
**Status:** 📋 Ready for Implementation
**Created:** [Current Date]
**Version:** 1.0.0

---

## 📁 Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - [X] detailed user stories with acceptance criteria
   - Non-functional requirements
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - [X]+ actionable tasks organized in [N] phases
   - Checkboxes for progress tracking
   - Estimated timeline: [X-Y] days

3. **[README.md](./README.md)** - This overview document

---

## 🎯 Feature Overview

### What We're Building

[Bulleted list of key features]

### Technology Stack

[List of technologies, frameworks, libraries]

---

## 🏗️ Architecture

[Brief architecture description or diagram]

### Key Components

[List of main components]

---

## 📋 Implementation Phases

[Brief description of each phase with time estimate]

---

## 🚀 Quick Start Guide

### For Developers

[Step-by-step instructions to start implementation]

### For Reviewers

[How to review the implementation]

---

## ✅ Success Criteria

[Checklist of completion criteria]

---

## 🔒 Security Considerations

[Security-related notes]

---

## 📊 Progress Tracking

[Instructions for tracking progress]

---

## 🚫 Out of Scope

[List of out-of-scope features]

---

## 📚 Related Documentation

[Links to related docs]

---

## 🤝 Contributing

[Guidelines for implementation]

---

**Happy Coding! 🎉**
```

## Important Instructions

1. **Analyze the conversation history** to extract all relevant details about the feature
2. **Create comprehensive, detailed requirements** with thorough acceptance criteria
3. **Create actionable, granular tasks** that can be checked off during implementation
4. **Follow the exact structure** shown above (headers, formatting, sections)
5. **Use professional technical writing** style
6. **Be specific** with file paths, commands, component names, and technical details
7. **Map tasks to requirements** for traceability
8. **Estimate time realistically** based on complexity
9. **Include all three files** (requirements.md, implementation_plan.md, README.md)
10. **Create the folder structure** `.kiro/specs/{{FOLDER_NAME}}/` before writing files

## Folder Name

**IMPORTANT:** Check if the user provided a folder name after the `/generate-specs` command.

- If the user typed: `/generate-specs my_feature_name`
  - Use `my_feature_name` as the folder name
  - Extract it from the command text

- If the user typed: `/generate-specs` (no argument)
  - Ask the user: "What folder name should I use for these specs? (e.g., 'user_authentication', 'api_integration')"
  - Wait for their response before proceeding

The folder path will be: `.kiro/specs/[folder_name]/`

## Quality Standards

Match the quality and detail level of these reference specifications:
- `.kiro/specs/react_client_auth/requirements.md`
- `.kiro/specs/react_client_auth/implementation_plan.md`
- `.kiro/specs/react_client_auth/README.md`
- `.kiro/specs/json-workflow-engine/requirements.md`
- `.kiro/specs/json-workflow-engine/tasks.md`

Ensure the documents are:
✅ Comprehensive and detailed
✅ Professionally written
✅ Technically accurate
✅ Well-structured and organized
✅ Actionable and practical
✅ Easy to follow and understand

## Output

After creating all three files, provide a summary showing:
- File locations
- File sizes
- Key sections created
- Total requirements count
- Total tasks count
- Estimated implementation time

Begin now by analyzing the conversation and generating the specification documents.
