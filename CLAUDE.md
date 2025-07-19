# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Agentic Workflow Engine built as a TypeScript monorepo using the bhvr stack (Bun + Hono + Vite + React). The project implements a node-based workflow system with JSON definitions and comprehensive validation.

## Essential Commands

### Development
- `bun run dev` - Start all services (client, server, shared)
- `bun run dev:client` - Start only the frontend
- `bun run dev:server` - Start only the backend
- `bun install` - Install dependencies and auto-build shared/server packages

### Build & Test
- `bun run build` - Build all packages in dependency order
- `cd server && bun run test` - Run server tests with Vitest
- `cd client && bun run lint` - Run ESLint on frontend code

### Testing Individual Components
- Run specific test: `cd server && bun test WorkflowParser.test.ts`
- Watch mode: `cd server && bun test --watch`

## Architecture Overview

The codebase follows a clean monorepo structure with three main packages:

### 1. Shared Package (`/shared`)
- Contains TypeScript type definitions used by both client and server
- Key types: `WorkflowDefinition`, `Node`, `Edge`, `SharedState`
- Auto-compiled on install and during development

### 2. Server Package (`/server`)
- Hono-based API server
- **WorkflowParser** (`/server/src/parser/WorkflowParser.ts`): Core validation and parsing logic
  - Validates JSON workflow definitions against schema
  - Performs semantic validation (edge consistency, node references)
  - Provides detailed error messages with line/column numbers
- **Workflow Schema** (`/server/src/schemas/workflow-schema.json`): JSON Schema for workflow validation

### 3. Client Package (`/client`)
- React 19 + Vite 6 frontend
- Tailwind CSS v4 with shadcn/ui components
- TypeScript with strict configuration

## Key Concepts

### Workflow System
- **Nodes**: Basic execution units with `nodeId`, `nodeType`, and `payload`
- **Edges**: Define workflow flow with conditions and routing
- **Loops**: Special node type for iteration with `maxIterations` control
- **Shared State**: Mutable state object accessible across all nodes

### Validation Layers
1. **JSON Schema Validation**: Structural validation against workflow-schema.json
2. **Semantic Validation**: Logic validation (edge references, loop constraints)
3. **Error Reporting**: Detailed errors with source location tracking

## Important Conventions

1. **TypeScript**: Use strict mode - all code must pass TypeScript checks
2. **Testing**: Write tests for parser logic in `/server/src/parser/`
3. **Error Handling**: Provide detailed, actionable error messages
4. **Monorepo**: Changes to shared types require rebuilding dependent packages

## Workflow Definition Example

```json
{
  "workflowId": "example",
  "description": "Sample workflow",
  "nodes": [
    {
      "nodeId": "start",
      "nodeType": "action",
      "payload": { "action": "initialize" }
    }
  ],
  "edges": [
    {
      "edgeId": "edge1",
      "from": "start",
      "to": "next",
      "condition": "success"
    }
  ]
}
```

## Development Tips

- When modifying workflow parsing logic, update both the parser and tests
- Use `bun run dev` for rapid development with hot reloading
- The shared package must be built before server/client can use updated types
- Workflow validation errors include line/column numbers for debugging

## Claude code AI agent workflow
- **CRITICAL** On every session and every prompt asked by user you must read, think and evaluate files in ./.kiro/specs/json-workflow-engine folder! Implement tasks taking in consideration design and requirements defined in this folder. THIS IS MANDATORY!

## AI-Assisted Software Development Framework

### Overview
This project includes a framework for transforming software specifications into structured development artifacts. The framework is located in `.kiro/framework/` and provides a systematic approach to generate requirements, design documents, and implementation tasks.

### Framework Components

1. **Requirements Generation** (`.kiro/framework/templates/requirements-prompt.md`)
   - Transforms specifications into user stories with acceptance criteria
   - Uses WHEN/THEN/IF format for testable conditions

2. **Design Generation** (`.kiro/framework/templates/design-prompt.md`)
   - Creates technical architecture from specifications
   - Includes component diagrams, interfaces, and data models

3. **Tasks Generation** (`.kiro/framework/templates/tasks-prompt.md`)
   - Breaks down implementation into ordered, actionable tasks
   - Links tasks to specific requirements

### Using the Framework

#### Manual Process:
1. Create a specification markdown file
2. Use each prompt template with the specification to generate artifacts
3. Save outputs to `.kiro/specs/[project-name]/`

#### Automated Process:
```bash
bun run .kiro/framework/generate-artifacts.ts path/to/spec.md project-name
```

### Working with Generated Artifacts

When implementing features:
1. Always reference the generated artifacts in `.kiro/specs/[project]/`
2. Follow the tasks checklist in `tasks.md`
3. Ensure implementations meet requirements in `requirements.md`
4. Adhere to the architecture defined in `design.md`

### Example
See `.kiro/specs/task-api-example/` for an example of generated artifacts from a task management API specification.