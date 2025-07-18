# AI-Assisted Software Development Framework

## Overview

This framework provides a structured approach for transforming software specifications into actionable development artifacts using AI coding agents. It consists of three core prompts that generate requirements, design documents, and implementation tasks from any software specification.

## Framework Components

### 1. Requirements Generation (`templates/requirements-prompt.md`)
Transforms specifications into structured user stories with testable acceptance criteria.

**Output:** `requirements.md` containing:
- Numbered requirements for traceability
- User stories in standard format
- Acceptance criteria using WHEN/THEN/IF statements
- Clear, testable conditions

### 2. Design Generation (`templates/design-prompt.md`)
Creates comprehensive technical design from specifications and requirements.

**Output:** `design.md` containing:
- Architecture diagrams (using Mermaid)
- Component interfaces and data models
- Error handling strategies
- Testing approaches
- API design (when applicable)
- Implementation considerations

### 3. Tasks Generation (`templates/tasks-prompt.md`)
Breaks down implementation into ordered, actionable tasks.

**Output:** `tasks.md` containing:
- Numbered tasks with checkboxes
- Tasks linked to specific requirements
- Logical ordering based on dependencies
- Clear descriptions of work to be done

## Workflow Process

### Manual Process
1. Create your software specification in a markdown file
2. Use the requirements prompt to generate `requirements.md`
3. Use the design prompt (with spec + requirements) to generate `design.md`
4. Use the tasks prompt (with all previous artifacts) to generate `tasks.md`
5. Place generated files in `.kiro/specs/[project-name]/`

### Automated Process (using workflow script)
```bash
bun run .kiro/framework/generate-artifacts.ts path/to/spec.md project-name
```

This will:
1. Read your specification file
2. Generate all three artifacts sequentially
3. Save outputs to `.kiro/specs/[project-name]/`
4. Validate outputs meet framework standards

## Best Practices for Specifications

### Structure Your Spec with:
1. **Overview** - High-level description of what you're building
2. **Core Features** - Main functionality requirements
3. **Technical Requirements** - Technology stack, constraints
4. **User Interactions** - How users will interact with the system
5. **Data Models** - Key entities and relationships
6. **Success Criteria** - What defines project completion

### Writing Tips:
- Be specific about functionality but flexible on implementation
- Include examples of expected behavior
- Specify constraints and non-functional requirements
- Define key terms and concepts
- Include acceptance criteria where possible

## Example Usage

### Input Specification
```markdown
# Task Management API Specification

## Overview
A RESTful API for managing tasks with user authentication, task CRUD operations, and team collaboration features.

## Core Features
- User registration and authentication
- Create, read, update, delete tasks
- Assign tasks to team members
- Task status tracking
- Due date management
...
```

### Generated Outputs
- `requirements.md` - 15 user stories with acceptance criteria
- `design.md` - API architecture, database schema, auth flow
- `tasks.md` - 25 implementation tasks ordered by dependency

## Integration with AI Coding Agents

When using Claude Code or similar AI agents:
1. Reference the generated artifacts in your prompts
2. Point to specific requirements when implementing features
3. Use the design document for architectural decisions
4. Track progress using the tasks checklist

### CLAUDE.md Integration
Add to your project's CLAUDE.md:
```markdown
## Development Artifacts
- Requirements: .kiro/specs/[project]/requirements.md
- Design: .kiro/specs/[project]/design.md
- Tasks: .kiro/specs/[project]/tasks.md

Always reference these documents when implementing features.
```

## Validation Checklist

### Requirements Document
- [ ] All requirements numbered
- [ ] User stories follow "As a... I want... So that..." format
- [ ] Acceptance criteria use WHEN/THEN/IF format
- [ ] Requirements are testable and specific

### Design Document
- [ ] Includes architecture overview
- [ ] Defines all major components
- [ ] Specifies data models
- [ ] Addresses error handling
- [ ] Includes testing strategy

### Tasks Document
- [ ] Tasks are numbered and have checkboxes
- [ ] Each task references relevant requirements
- [ ] Tasks are ordered by dependency
- [ ] Includes testing and documentation tasks

## Framework Evolution

This framework is designed to evolve. When you discover patterns that work well:
1. Update the prompt templates
2. Add examples to the framework
3. Document lessons learned
4. Share improvements with the team

## Directory Structure

```
.kiro/
├── framework/
│   ├── README.md (this file)
│   ├── templates/
│   │   ├── requirements-prompt.md
│   │   ├── design-prompt.md
│   │   └── tasks-prompt.md
│   ├── examples/
│   │   └── task-api-example/
│   │       ├── spec.md
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── generate-artifacts.ts
└── specs/
    └── [project-name]/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```