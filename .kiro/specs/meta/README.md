# Meta-Workflow Generator - Specification

**Feature:** AI-powered workflow generation from natural language requirements
**Target Application:** `/apps/sandbox/resources/shared/prompts/workflow-generator.json`
**Status:** Ready for Implementation
**Created:** 2025-12-21
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 15 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, reliability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 85 actionable tasks organized in 8 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 2-3 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

The Meta-Workflow Generator is a foundational feature that embodies the core vision of Workscript:

- **Self-generating workflows** - A workflow that creates other workflows
- **Natural language input** - Users describe what they need in plain English
- **AI-powered generation** - Uses frontier AI models (Claude, GPT-4) to generate valid workflow JSON
- **Automatic validation** - Multi-step validation ensures generated workflows are valid
- **Retry logic** - Up to 3 automatic retries for transient AI failures
- **Database persistence** - Generated workflows are saved directly to the database
- **Configurable AI model** - Users can choose which AI model to use

### Example Usage

**Input:**
```json
{
  "userRequest": "Create a workflow that sends an email with a cake recipe to test@example.com",
  "model": "anthropic/claude-sonnet-4-20250514"
}
```

**Output:**
```json
{
  "result": {
    "success": true,
    "workflowId": "cake-recipe-emailer",
    "attempts": 1,
    "workflow": { /* complete workflow JSON */ }
  }
}
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Workflow Engine | Workscript Engine |
| AI Integration | ask-ai node → OpenRouter API |
| API Framework | Hono 4.7.x |
| Database | MySQL + Drizzle ORM |
| Node Documentation | Reflection API |
| Validation | ValidateDataNode (json, required_fields) |
| Cleanup | StringOperationsNode (regex) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Meta-Workflow Generator                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌─────────────────────────┐   │
│  │  Input   │───▶│  Fetch   │───▶│   Retry Loop (max 3)   │   │
│  │Validation│    │  Docs    │    │                         │   │
│  └──────────┘    └──────────┘    │ ┌─────┐ ┌─────┐ ┌─────┐│   │
│                                   │ │Prompt│─▶│ AI  │─▶│Clean││   │
│                                   │ │Build │ │Gen  │ │ Up  ││   │
│                                   │ └─────┘ └─────┘ └─────┘│   │
│                                   │           │             │   │
│                                   │     ┌─────▼─────┐       │   │
│                                   │     │  JSON     │       │   │
│                                   │     │Validation │       │   │
│                                   │     └─────┬─────┘       │   │
│                                   │           │             │   │
│                                   │     ┌─────▼─────┐       │   │
│                                   │     │ Structure │       │   │
│                                   │     │Validation │       │   │
│                                   │     └───────────┘       │   │
│                                   └───────────┬─────────────┘   │
│                                               │                  │
│  ┌──────────────────────────────────────────┐│                  │
│  │           On Success                      ││                  │
│  │  ┌──────────┐    ┌──────────┐            │◀                  │
│  │  │  Save to │───▶│  Build   │            │                   │
│  │  │ Database │    │  Result  │            │                   │
│  │  └──────────┘    └──────────┘            │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Node Type | Purpose |
|-----------|-----------|---------|
| Input Validation | `validateData` | Ensure userRequest and JWT_token are present |
| Documentation Fetch | `fetchApi` | Get node documentation from Reflection API |
| Prompt Builder | `editFields` | Construct AI prompt with retry context |
| AI Generation | `ask-ai` | Generate workflow JSON using AI |
| Response Cleanup | `stringOperations` | Remove markdown code blocks |
| JSON Validation | `validateData` | Verify response is valid JSON |
| Structure Validation | `validateData` | Verify workflow has required fields |
| Loop Control | `logic...` | Manage retry attempts |
| Database Save | `fetchApi` | Persist workflow via API |
| Result Builder | `editFields` | Construct final result object |

---

## Implementation Phases

| Phase | Description | Tasks | Time |
|-------|-------------|-------|------|
| 1. Environment Preparation | Verify prerequisites, API endpoints | 5 | 0.5 days |
| 2. Workflow JSON Structure | Create base file, input validation | 8 | 0.5 days |
| 3. Retry Loop Implementation | Loop node, AI generation, validation | 22 | 0.5 days |
| 4. Post-Generation Handling | Database save, result construction | 12 | 0.5 days |
| 5. Workflow Validation | Syntax, nodes, API validation | 6 | 0.25 days |
| 6. Testing | Unit, integration, retry, model tests | 15 | 0.5 days |
| 7. Documentation | Skill docs, examples, API docs | 6 | 0.25 days |
| 8. Final Verification | Build, E2E tests, acceptance | 6 | 0.25 days |

**Total: 85 tasks, 2-3 days**

---

## Quick Start Guide

### For Developers

1. **Read the requirements document**
   ```bash
   cat .kiro/specs/meta_workflow_generator/requirements.md
   ```

2. **Start the API server**
   ```bash
   cd apps/api && bun run dev
   ```

3. **Verify Reflection API**
   ```bash
   curl http://localhost:3013/workscript/reflection/manifest/compact
   ```

4. **Create the workflow file**
   ```bash
   # Copy workflow JSON from plan file to:
   # /apps/sandbox/resources/shared/prompts/workflow-generator.json
   ```

5. **Test execution**
   ```bash
   curl -X POST http://localhost:3013/workscript/workflows/run \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "workflowId": "workflow-generator",
       "initialState": {
         "userRequest": "Create a workflow that logs Hello World"
       }
     }'
   ```

### For Reviewers

1. Check `requirements.md` for complete feature specification
2. Verify all 15 requirements are implemented
3. Run through test scenarios in implementation plan Phase 6
4. Verify success metrics are met

---

## Success Criteria

- [ ] Workflow generator creates valid workflows 80%+ of the time
- [ ] Retry logic recovers from AI errors 90%+ of the time
- [ ] Generated workflows pass validation on first save attempt
- [ ] Average generation time under 30 seconds
- [ ] All 15 requirements have acceptance criteria met
- [ ] Workflow executable via API and frontend UI
- [ ] Self-documenting and follows Workscript conventions
- [ ] Error messages clear and actionable

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| JWT Token Exposure | Tokens never logged or included in error messages |
| Generated Workflow Safety | No arbitrary code execution from user input |
| API Authentication | All endpoints require valid JWT |
| HTTPS in Production | All API calls use HTTPS |
| Secret Injection | Generated workflows cannot contain hardcoded secrets |

---

## Progress Tracking

Track implementation progress using the checkboxes in `implementation_plan.md`:

```bash
# Count completed tasks
grep -c "\[x\]" implementation_plan.md

# Count remaining tasks
grep -c "\[ \]" implementation_plan.md

# View current phase progress
grep -A 100 "## PHASE" implementation_plan.md | head -50
```

---

## Out of Scope

The following are explicitly NOT included:

- Interactive refinement/conversation
- Multi-model ensemble generation
- Automatic workflow execution
- Template-based generation
- Version control for generated workflows
- Automatic rollback on failure
- Cost estimation
- Parallel generation
- Custom validation rules
- Workflow optimization

---

## Related Documentation

| Document | Location |
|----------|----------|
| Plan File | `/.claude/plans/vast-booping-wigderson.md` |
| new-workflow Skill | `/.claude/skills/new-workflow/SKILL.md` |
| Node Quick Reference | `/.claude/skills/new-workflow/references/node-quick-reference.md` |
| Workflow Syntax | `/.claude/skills/new-workflow/references/workflow-syntax.md` |
| Engine CLAUDE.md | `/packages/engine/CLAUDE.md` |
| Nodes CLAUDE.md | `/packages/nodes/CLAUDE.md` |
| API CLAUDE.md | `/apps/api/CLAUDE.md` |

---

## Contributing

When implementing this feature:

1. Follow the task order in `implementation_plan.md`
2. Check off tasks as you complete them
3. Reference requirement numbers for traceability
4. Run validation after each major phase
5. Test incrementally, not just at the end
6. Document any deviations from the plan

---

## State Reference

### Input State
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `userRequest` | string | "" | Natural language workflow description |
| `model` | string | "anthropic/claude-sonnet-4-20250514" | AI model to use |
| `apiBaseUrl` | string | "http://localhost:3013" | API base URL |
| `maxRetries` | number | 3 | Maximum retry attempts |

### Output State
| Key | Type | Description |
|-----|------|-------------|
| `result.success` | boolean | Whether generation and save succeeded |
| `result.workflowId` | string | ID of saved workflow |
| `result.workflow` | object | The generated workflow JSON |
| `result.attempts` | number | Number of generation attempts |
| `result.error` | string | Error message if failed |

---

**Happy Coding!**
