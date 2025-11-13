# Claude Code Productivity Tools

This directory contains custom productivity tools for working with the Agentic Workflow Orchestration System using Claude Code CLI.

## 📁 Directory Structure

```
.claude/
├── commands/           # Custom slash commands
│   ├── feature-plan.md
│   ├── add-node.md
│   ├── api-endpoint.md
│   ├── ui-component.md
│   ├── security-check.md
│   ├── code-review.md
│   └── test-suite.md
├── agents/            # Specialized sub-agent prompts
│   ├── frontend-specialist.md
│   ├── api-specialist.md
│   ├── node-developer.md
│   ├── test-engineer.md
│   ├── security-auditor.md
│   └── quality-reviewer.md
└── README.md          # This file
```

## 🚀 Quick Start

### Using Slash Commands

Slash commands are quick shortcuts for common development tasks. Simply type the command in Claude Code CLI:

```bash
/feature-plan
/add-node
/api-endpoint
/ui-component
/security-check
/code-review
/test-suite
```

### Using Sub-Agents

Sub-agents are specialized agents that handle complex, multi-step tasks autonomously. They are not directly invokable via slash commands but can be launched by Claude using the Task tool when appropriate.

## 📖 Slash Commands Reference

### `/feature-plan` - Plan New Features

**When to use:** Starting development of a new feature

**What it does:**
- Helps you plan a new feature following the architecture
- Reviews existing specs and design documents
- Creates implementation checklist with file paths
- Considers architecture alignment (shared/server/client)
- Generates TODO list for implementation

**Example usage:**
```
User: /feature-plan
Claude: What feature would you like to plan?
User: I want to add email notifications when workflows complete
Claude: [Analyzes architecture, creates detailed plan]
```

### `/add-node` - Add Workflow Node

**When to use:** Creating a new workflow node (universal/server/client)

**What it does:**
- Interactive guide for node creation
- Helps determine node type (universal/server/client)
- Generates complete node code with proper structure
- Creates tests for the node
- Ensures metadata completeness

**Example usage:**
```
User: /add-node
Claude: What kind of node would you like to create?
User: A server node that sends Slack notifications
Claude: [Guides through node creation process]
```

### `/api-endpoint` - Create API Endpoint

**When to use:** Adding a new REST API endpoint to the Hono server

**What it does:**
- Guides API endpoint creation
- Implements request validation with Zod
- Adds authentication/authorization
- Integrates with services (WorkflowService, WebSocketManager)
- Creates tests for the endpoint

**Example usage:**
```
User: /api-endpoint
Claude: What API endpoint would you like to create?
User: POST /api/notifications to send notifications
Claude: [Creates complete endpoint with validation and tests]
```

### `/ui-component` - Create UI Component

**When to use:** Building a new React component or UI workflow node

**What it does:**
- Creates React components with TypeScript
- Implements UI workflow nodes
- Applies Tailwind CSS styling
- Ensures accessibility (ARIA, keyboard nav)
- Generates component tests

**Example usage:**
```
User: /ui-component
Claude: What UI component would you like to create?
User: A data visualization chart component
Claude: [Creates component with proper structure]
```

### `/security-check` - Security Review

**When to use:** Reviewing code for security vulnerabilities

**What it does:**
- Comprehensive OWASP Top 10 analysis
- Identifies SQL injection, XSS, CSRF risks
- Checks authentication/authorization
- Reviews data handling and validation
- Generates detailed security report

**Example usage:**
```
User: /security-check
Claude: What code would you like me to review for security?
User: Review the new authentication endpoints
Claude: [Performs security audit, generates report]
```

### `/code-review` - Quality Review

**When to use:** Reviewing code for quality, completeness, and best practices

**What it does:**
- Architecture compliance verification
- Code quality analysis (TypeScript, error handling, etc.)
- Completeness review (metadata, tests, docs)
- Performance analysis
- Generates improvement recommendations

**Example usage:**
```
User: /code-review
Claude: What code would you like me to review?
User: Review /server/nodes/EmailNode.ts
Claude: [Performs quality review, provides feedback]
```

### `/test-suite` - Create Tests

**When to use:** Writing comprehensive tests for code

**What it does:**
- Creates unit tests (functions, nodes)
- Creates integration tests (APIs)
- Creates component tests (React)
- Ensures 80%+ coverage
- Follows testing best practices

**Example usage:**
```
User: /test-suite
Claude: What would you like to create tests for?
User: Create tests for the MathNode
Claude: [Generates comprehensive test suite]
```

## 🤖 Sub-Agent Reference

Sub-agents are specialized agents that Claude can invoke autonomously using the Task tool. They handle complex, multi-step tasks in their domain of expertise.

### Frontend Specialist

**Expertise:**
- React 19 + Vite 6
- Tailwind CSS v4 + shadcn/ui
- UI workflow nodes
- Component testing
- Accessibility

**Use cases:**
- Building complex React components
- Creating UI workflow nodes
- Implementing responsive designs
- Optimizing React performance

**How Claude uses it:**
When you ask for frontend work, Claude may say:
> "I'm going to launch a frontend specialist agent to handle this React component implementation..."

### API Specialist

**Expertise:**
- Hono framework
- Drizzle ORM + MySQL
- REST API design
- WebSocket integration
- Authentication/authorization

**Use cases:**
- Creating API endpoints
- Database schema design
- Implementing authentication
- WebSocket event handling
- API testing

**How Claude uses it:**
When you ask for API work, Claude may say:
> "I'm going to launch an API specialist agent to create this endpoint with full integration..."

### Node Developer

**Expertise:**
- Workflow node architecture
- Universal/server/client nodes
- State management
- Edge routing
- Node metadata

**Use cases:**
- Creating workflow nodes
- Implementing node validation
- Designing edge routing
- Writing node tests

**How Claude uses it:**
When you ask for node creation, Claude may say:
> "I'm going to launch a node developer agent to implement this workflow node..."

### Test Engineer

**Expertise:**
- Vitest testing framework
- React Testing Library
- Integration testing
- Test coverage analysis
- TDD/BDD practices

**Use cases:**
- Writing comprehensive test suites
- Improving test coverage
- Testing complex workflows
- API integration tests

**How Claude uses it:**
When you ask for tests, Claude may say:
> "I'm going to launch a test engineer agent to create comprehensive tests..."

### Security Auditor

**Expertise:**
- OWASP Top 10
- Secure coding practices
- Authentication/authorization
- Data protection
- Vulnerability assessment

**Use cases:**
- Security code reviews
- Vulnerability scanning
- Authentication audits
- Data handling reviews

**How Claude uses it:**
When you ask for security review, Claude may say:
> "I'm going to launch a security auditor agent to perform a comprehensive security audit..."

### Quality Reviewer

**Expertise:**
- Code quality analysis
- Architecture compliance
- Best practices
- Documentation review
- Performance analysis

**Use cases:**
- Code quality reviews
- Architecture validation
- Refactoring recommendations
- Performance optimization

**How Claude uses it:**
When you ask for code review, Claude may say:
> "I'm going to launch a quality reviewer agent to analyze this code..."

## 💡 Usage Tips

### For Quick Tasks
Use **slash commands** for quick, guided workflows:
- `/feature-plan` - Quick planning
- `/add-node` - Guided node creation
- `/api-endpoint` - Quick API setup

### For Complex Tasks
Claude will automatically use **sub-agents** for complex work:
- Multi-file changes
- Complete feature implementation
- Comprehensive reviews
- Complex testing scenarios

### Best Practices

1. **Start with planning:** Use `/feature-plan` before implementing
2. **Follow architecture:** Use `/add-node` to ensure correct node placement
3. **Security first:** Run `/security-check` before merging
4. **Quality gates:** Use `/code-review` for final review
5. **Test everything:** Use `/test-suite` to ensure coverage

### Example Workflow

```bash
# 1. Plan the feature
> /feature-plan
I want to add Slack notifications

# 2. Create the node
> /add-node
Create a server node for Slack integration

# 3. Create API endpoint
> /api-endpoint
Create POST /api/notifications/slack

# 4. Create UI component
> /ui-component
Create notification settings component

# 5. Add tests
> /test-suite
Create tests for Slack notification node

# 6. Security review
> /security-check
Review the Slack integration code

# 7. Quality review
> /code-review
Review all changes for quality

# 8. Commit and push
> git add . && git commit -m "Add Slack notifications" && git push
```

## 🎯 Development Scenarios

### Scenario 1: Adding a New Integration

```
1. /feature-plan - Plan the integration
2. /add-node - Create integration node (server)
3. /api-endpoint - Create API endpoints if needed
4. /test-suite - Write comprehensive tests
5. /security-check - Audit security
6. /code-review - Final quality check
```

### Scenario 2: Building UI Feature

```
1. /feature-plan - Plan UI feature
2. /ui-component - Create React components
3. /add-node - Create UI workflow nodes if needed
4. /test-suite - Write component tests
5. /code-review - Review for quality
```

### Scenario 3: Performance Optimization

```
1. /code-review - Identify bottlenecks
2. Implement optimizations
3. /test-suite - Add performance tests
4. /code-review - Verify improvements
```

### Scenario 4: Security Hardening

```
1. /security-check - Audit entire codebase
2. Fix identified vulnerabilities
3. /test-suite - Add security tests
4. /security-check - Re-audit
```

## 🔧 Customization

### Adding New Slash Commands

Create a new markdown file in `.claude/commands/`:

```markdown
---
description: Brief description of what this command does
---

# Your command prompt here

Instructions for Claude on how to handle this command...
```

### Adding New Sub-Agents

Create a new markdown file in `.claude/agents/`:

```markdown
# Agent Name

You are a [specialty] specialist...

## Your Expertise
- List of skills

## Your Responsibilities
- What this agent does

## Implementation Patterns
- Code examples

## Your Task
- How to handle invocations
```

## 📚 Resources

- **Architecture Guide:** `.kiro/specs/json-workflow-engine/design.md`
- **Requirements:** `.kiro/specs/json-workflow-engine/requirements.md`
- **Tasks Checklist:** `.kiro/specs/json-workflow-engine/tasks.md`
- **Project Instructions:** `CLAUDE.md` (root)

## 🤝 Contributing

When adding new productivity tools:

1. Follow existing patterns
2. Include comprehensive examples
3. Test with actual development scenarios
4. Update this README
5. Document usage tips

## 📝 Notes

- Slash commands are **interactive** - Claude will ask follow-up questions
- Sub-agents run **autonomously** - They complete tasks end-to-end
- All tools follow the **shared-core architecture**
- Tools are designed to **work together** - Use them in sequence

## 🎓 Learning Path

### For New Developers
1. Start with `/feature-plan` to understand architecture
2. Use `/add-node` to learn node patterns
3. Try `/code-review` on existing code to see best practices

### For Experienced Developers
1. Combine multiple slash commands for complex workflows
2. Let sub-agents handle time-consuming tasks
3. Use for consistency and architecture compliance

---

**Last Updated:** 2025-01-18
**Compatible with:** Claude Code CLI
**Project:** Agentic Workflow Orchestration System
