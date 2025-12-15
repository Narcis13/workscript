---
name: new-workflow
description: Generate production-ready Workscript workflow JSON files for the Workscript Agentic Workflow Engine. Use when asked to create workflows, automations, data pipelines, or generate workflow JSON. Fetches up-to-date node documentation from the Reflection API when available. Outputs validated .json files to the sandbox prompts folder. Also suitable for Claude Code subagents needing to compose workflows programmatically.
---

# Workscript Workflow Generator

Generate valid, production-ready workflow JSON files for the Workscript Agentic Workflow Engine.

## Workflow Generation Process

### Step 1: Understand Requirements

Ask clarifying questions to understand:
- What should this workflow accomplish?
- What is the input data structure?
- What are the expected outputs/side effects?
- Are there error handling requirements?
- Will it need loops, conditionals, or API calls?

### Step 2: Fetch Node Documentation

**If API server is running**, fetch the compact node manifest:

```bash
curl -s http://localhost:3013/workscript/reflection/manifest/compact | jq .
```

**If API is not running**, start the dev server:

```bash
cd /Users/narcisbrindusescu/teste/workscript && bun run dev
```

Wait for the server to start, then retry the manifest fetch.

**Alternatively**, use the offline reference: [references/node-quick-reference.md](references/node-quick-reference.md)

### Step 3: Design Workflow Structure

Based on requirements, identify:
1. **Entry point node(s)** - First node(s) to execute
2. **Data flow** - How data moves through nodes
3. **Branching points** - Where edges are needed (conditionals, error handling)
4. **Sequential steps** - Nodes that should run one after another (use workflow array)
5. **State keys** - What to read (`$.key`) and write
6. **Loop requirements** - Use `nodeType...` suffix for loops

Use patterns from [references/patterns.md](references/patterns.md) as templates.

### Step 4: Generate Valid JSON - FLAT BY DEFAULT

**CRITICAL: Prefer flat, linear workflows. Use edges only for actual branching.**

The workflow array supports sequential execution - nodes run one after another automatically. Reserve edges for:
- **Conditional branching**: `true?`/`false?`, `valid?`/`invalid?`, `found?`/`not_found?`
- **Error handling**: `error?` edges
- **Loop control**: `continue?`/`exit?` with `nodeType...`
- **Multi-way routing**: `switch` node dynamic edges

#### WRONG - Excessive Nesting (Anti-Pattern)

```json
{
  "workflow": [
    {
      "googleConnect": {
        "email": "$.email",
        "success?": {
          "listEmails": {
            "maxResults": 10,
            "success?": {
              "ask-ai": {
                "userPrompt": "Analyze...",
                "success?": {
                  "resource-write": {
                    "content": "$.aiResponse",
                    "created?": {
                      "log": { "message": "Done" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

**Problems:**
- 5+ levels of nesting
- Hard to read and maintain
- `success?` edges don't add value when next step is unconditional

#### CORRECT - Flat Sequential (Preferred)

```json
{
  "workflow": [
    {
      "googleConnect": {
        "email": "$.email",
        "error?": { "log": { "message": "Connection failed: {{$.error}}" } }
      }
    },
    {
      "listEmails": {
        "maxResults": 10,
        "no_results?": { "log": { "message": "No emails found" } },
        "error?": { "log": { "message": "Failed: {{$.error}}" } }
      }
    },
    {
      "ask-ai": {
        "userPrompt": "Analyze...",
        "error?": { "log": { "message": "AI failed: {{$.error}}" } }
      }
    },
    {
      "resource-write": {
        "content": "$.aiResponse",
        "created?": { "log": { "message": "Created: {{$.writtenResourceId}}" } },
        "updated?": { "log": { "message": "Updated: {{$.writtenResourceId}}" } },
        "error?": { "log": { "message": "Write failed: {{$.error}}" } }
      }
    }
  ]
}
```

**Benefits:**
- Linear, easy to read
- Each node handles its own edge cases
- Sequential flow is implicit

#### WHEN TO USE EDGES FOR CHAINING

Use edges for **actual branching** - when different paths lead to different outcomes:

```json
{
  "workflow": [
    {
      "logic": {
        "operation": "equal",
        "values": ["$.user.role", "admin"],
        "true?": {
          "editFields": {
            "fieldsToSet": [{ "name": "access", "value": "full", "type": "string" }]
          }
        },
        "false?": {
          "editFields": {
            "fieldsToSet": [{ "name": "access", "value": "limited", "type": "string" }]
          }
        }
      }
    },
    {
      "log": { "message": "User {{$.user.name}} has {{$.access}} access" }
    }
  ]
}
```

Here `true?`/`false?` are meaningful branches - they execute different logic.

### Step 5: Validate Workflow

Run the validation script before saving:

```bash
bun /Users/narcisbrindusescu/teste/workscript/.claude/skills/new-workflow/scripts/validate-workflow.ts <workflow.json>
```

The script checks:
- JSON Schema compliance (required fields, patterns)
- Node type existence (all nodeTypes must be registered)
- State setter syntax validity (`$.path` format)
- Edge name format

Exit codes: `0` = valid, `1` = schema errors, `2` = semantic errors

### Step 6: Save to Output Folder

Save validated workflow to:
```
/Users/narcisbrindusescu/teste/workscript/apps/sandbox/resources/shared/prompts/<kebab-case-name>.json
```

**File naming:**
- Use kebab-case matching workflow id
- Examples: `user-registration.json`, `data-pipeline.json`, `email-processor.json`

## Workflow Structure Guidelines

### Flat vs Nested Decision Matrix

| Scenario | Use Flat (Workflow Array) | Use Edges (Nesting) |
|----------|---------------------------|---------------------|
| Sequential operations | YES | NO |
| Error handling only | YES (with `error?` edge) | NO |
| Conditional logic (`if/else`) | NO | YES (`true?`/`false?`) |
| Validation branching | NO | YES (`valid?`/`invalid?`) |
| Database lookup | NO | YES (`found?`/`not_found?`) |
| Switch/routing | NO | YES (dynamic edges) |
| Loops | NO | YES (`continue?`/`exit?`) |

### Template: Flat Sequential Workflow

```json
{
  "id": "kebab-case-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "Optional description",
  "initialState": { ... },
  "workflow": [
    { "node1": { "config": "...", "error?": { "log": {...} } } },
    { "node2": { "config": "...", "error?": { "log": {...} } } },
    { "node3": { "config": "..." } }
  ]
}
```

### Template: Branching Workflow

```json
{
  "id": "kebab-case-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "initialState": { ... },
  "workflow": [
    {
      "logic": {
        "operation": "equal",
        "values": ["$.condition", true],
        "true?": { "node-for-true": { ... } },
        "false?": { "node-for-false": { ... } }
      }
    },
    { "final-node": { "message": "After branch" } }
  ]
}
```

## API Integration

### Reflection API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workscript/reflection/manifest` | GET | Full AI manifest with complete documentation |
| `/workscript/reflection/manifest/compact` | GET | Token-optimized manifest (~5000 tokens) |
| `/workscript/reflection/manifest/custom` | POST | Filtered manifest for specific use cases |
| `/workscript/reflection/nodes` | GET | List all nodes with introspection data |
| `/workscript/reflection/nodes/:nodeId` | GET | Complete introspection for specific node |
| `/workscript/reflection/patterns` | GET | Browse workflow patterns library |

### Checking API Status

```bash
curl -s http://localhost:3013/health
```

### Starting Dev Server

```bash
cd /Users/narcisbrindusescu/teste/workscript && bun run dev
```

The API will be available at `http://localhost:3013`.

## Output Requirements

| Requirement | Value |
|-------------|-------|
| Output folder | `/apps/sandbox/resources/shared/prompts/` |
| File extension | `.json` |
| Naming convention | kebab-case (e.g., `my-workflow.json`) |
| Validation | Required before save |
| Schema version | Must be `X.Y.Z` format (e.g., `1.0.0`) |

## Quick Reference

### Required Workflow Fields

| Field | Type | Pattern | Required |
|-------|------|---------|----------|
| `id` | string | `/^[a-zA-Z0-9_-]+$/` | YES |
| `name` | string | min 1 char | YES |
| `version` | string | `/^\d+\.\d+\.\d+$/` | YES |
| `workflow` | array | min 1 item | YES |
| `description` | string | - | no |
| `initialState` | object | - | no |

### Edge Route Types

| Type | Example | Description |
|------|---------|-------------|
| Inline object | `"error?": { "log": {...} }` | Execute next node |
| Array | `"true?": [{ "$.x": 1 }, { "log": {...} }]` | Execute sequence |
| Null | `"false?": null` | End execution / exit loop |

### State Syntax

| Syntax | Purpose | Example |
|--------|---------|---------|
| `$.key` | Full reference (preserves type) | `"items": "$.data"` |
| `{{$.key}}` | Template interpolation (string) | `"message": "Hello {{$.name}}"` |
| `{ "$.path": value }` | State setter | `{ "$.counter": 0 }` |

### Common Edge Names

| Node Type | Edges |
|-----------|-------|
| `math`, `sort`, `editFields` | `success?`, `error?` |
| `logic` | `true?`, `false?`, `error?` |
| `filter` | `passed?`, `filtered?`, `error?` |
| `validateData` | `valid?`, `invalid?`, `error?` |
| `database` | `success?`, `found?`, `not_found?`, `error?` |
| `filesystem` | `success?`, `exists?`, `not_exists?`, `error?` |
| `switch` | `<dynamic>?`, `default?`, `error?` |

## Reference Documentation

- **Workflow Syntax**: [references/workflow-syntax.md](references/workflow-syntax.md) - Complete JSON structure reference
- **Patterns**: [references/patterns.md](references/patterns.md) - Common workflow patterns with examples
- **Node Reference**: [references/node-quick-reference.md](references/node-quick-reference.md) - All 45 nodes categorized
- **Flat vs Nested Comparison**: [references/flat-vs-nested.md](references/flat-vs-nested.md) - Side-by-side examples

## Scripts

- **Validate**: `scripts/validate-workflow.ts` - Validate workflow JSON
- **Fetch Manifest**: `scripts/fetch-manifest.sh` - Fetch node manifest from API
- **Start Server**: `scripts/start-dev-server.sh` - Start dev server if not running
