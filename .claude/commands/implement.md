---
description: Implement a specific phase or task from feature specifications with full context from requirements and implementation plan
args:
  - name: feature
    description: Feature name (matches folder in /specs/)
    required: true
  - name: task
    description: Phase or task identifier (e.g., "Phase 1", "Task 2.3", "Step 1")
    required: true
---

# Implementation Task Context

You are about to implement a specific task from a feature specification. Follow these instructions carefully:

## 1. Load Specification Documents

Read the following specification documents from `/specs/{{feature}}/`:

**REQUIRED FILES:**
- `requirements.md` - Feature requirements with acceptance criteria
- `implementation_plan.md` - Detailed implementation plan with phases and tasks
- `README.md` - Feature overview and context

## 2. Locate Specific Task

Search for the task identifier "{{task}}" in `implementation_plan.md`. This could be:
- A phase header (e.g., "Phase 1: Core Implementation")
- A task item (e.g., "Task 2.3: Implement validation")
- A numbered step in the implementation plan

Extract the complete task description including:
- Task objectives
- Implementation steps
- Dependencies
- Expected outcomes
- Testing requirements

## 3. Gather Related Requirements

From `requirements.md`, identify and extract:
- User stories related to this task
- Acceptance criteria that must be satisfied
- Functional requirements
- Non-functional requirements (performance, security, etc.)

## 4. Implementation Guidelines

**Architecture Alignment:**
- Follow the architecture patterns defined in CLAUDE.md
- Place code in the correct package/app based on dependencies:
  - Universal code → `/packages/engine/`
  - API server code → `/apps/api/`
  - Frontend code → `/apps/frontend/`
  - Legacy CRM code → `/server/` (only if CRM-specific)

**Code Quality Standards:**
- Use TypeScript strict mode
- Write comprehensive error handling
- Include JSDoc comments for public APIs
- Follow existing code conventions
- Add unit tests for new functionality

**State Management:**
- Use `@workscript/engine` imports for core types
- Leverage StateManager for state operations
- Use `$.key` syntax for state resolution where appropriate

## 5. Implementation Process

**Step-by-step approach:**

1. **Read all spec files** - Use the Read tool to load:
   - `/specs/{{feature}}/requirements.md`
   - `/specs/{{feature}}/implementation_plan.md`
   - `/specs/{{feature}}/README.md`

2. **Analyze the task** - Understand:
   - What needs to be built
   - Where it fits in the architecture
   - What acceptance criteria must be met
   - What dependencies exist

3. **Plan the implementation** - Use TodoWrite to create a task list:
   - Break down the task into concrete steps
   - Identify files to create/modify
   - Plan test cases

4. **Implement the task** - Follow the plan:
   - Write code following project conventions
   - Add appropriate error handling
   - Update/create tests
   - Verify against acceptance criteria

5. **Verify completion** - Ensure:
   - All acceptance criteria are met
   - Tests pass
   - Code follows architecture guidelines
   - Documentation is updated if needed

## 6. Context-Aware Implementation

**Use the specifications to:**
- Understand the "why" behind implementation decisions
- Ensure consistency with overall feature design
- Verify all requirements are addressed
- Follow the intended architecture

**Reference requirements when:**
- Making design decisions
- Handling edge cases
- Writing validation logic
- Creating error messages

**Follow implementation plan for:**
- Code organization
- Component structure
- Integration points
- Testing strategy

## 7. Completion Checklist

Before marking the task complete, verify:

- [ ] All task objectives from implementation plan are met
- [ ] Related acceptance criteria from requirements are satisfied
- [ ] Code follows project architecture and conventions
- [ ] Tests are written and passing
- [ ] Error handling is comprehensive
- [ ] Documentation is updated (if needed)
- [ ] No regressions in existing functionality

## 8. Output Format

After implementation, provide:

1. **Summary** - Brief description of what was implemented
2. **Files Modified/Created** - List with line references where applicable
3. **Testing** - What tests were added/updated and results
4. **Requirements Met** - Which acceptance criteria are now satisfied
5. **Next Steps** - What task should be implemented next (if any)

---

**Now proceed to implement the task: "{{task}}" for feature "{{feature}}"**

Start by reading the specification files and understanding the full context before writing any code.
