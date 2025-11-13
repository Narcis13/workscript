---
description: Plan a new feature following the architecture and create implementation checklist
---

You are helping plan a new feature for the Agentic Workflow Orchestration System.

## Your Task

1. **Understand the Feature Request** - Ask clarifying questions if needed
2. **Review Architecture** - Consider the shared-core architecture:
   - Core engine features → `/shared/src/`
   - Universal nodes (no deps) → `/shared/nodes/`
   - Server nodes (fs, db, network) → `/server/nodes/`
   - Client nodes (browser APIs) → `/client/nodes/`
3. **Check Existing Specs** - Look in `.kiro/specs/json-workflow-engine/` for:
   - `design.md` - Architecture guidance
   - `requirements.md` - Existing requirements
   - `tasks.md` - Implementation patterns
4. **Create Implementation Plan** with:
   - Feature description and scope
   - Architecture alignment (which packages affected)
   - Required changes (files to create/modify)
   - Testing strategy
   - Potential issues and considerations
5. **Generate TODO List** - Break down into actionable tasks

## Architecture Decision Rules

- **Node Placement:** Zero deps → shared, Server deps → server, Browser APIs → client
- **Core Engine:** State, hooks, registry, parser → `/shared/src/`
- **Business Logic:** Custom integrations → `/server/nodes/custom/` or `/client/nodes/custom/`
- **UI Components:** React components → `/client/src/components/`, UI nodes → `/client/nodes/ui/`

## Output Format

Provide:
1. Feature summary
2. Architecture impact assessment
3. Implementation checklist with file paths
4. Testing requirements
5. Estimated complexity (simple/moderate/complex)

Now, what feature would you like to plan?
