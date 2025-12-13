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
2. **Data flow** - How data moves through nodes (inline configuration)
3. **Edge routing** - success?, error?, true?, false?, etc.
4. **State keys** - What to read (`$.key`) and write
5. **Loop requirements** - Use `nodeType...` suffix for loops

Use patterns from [references/patterns.md](references/patterns.md) as templates.

### Step 4: Generate Valid JSON

Create workflow JSON following [references/workflow-syntax.md](references/workflow-syntax.md):

```json
{
  "id": "kebab-case-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "Optional description",
  "initialState": { ... },
  "workflow": [ ... ]
}
```

**CRITICAL RULES:**

1. **Inline configuration** - Configure next nodes INSIDE edges, NOT as flat sequential steps
2. **Edge names end with `?`** - e.g., `success?`, `error?`, `true?`, `false?`
3. **State references** - Use `$.key` for values, `{{$.key}}` for string templates
4. **Loop syntax** - Use `nodeType...` with `null` exit edge
5. **Pre-registered nodes only** - All nodes must exist in the registry

**WRONG - Flat sequential:**
```json
{
  "workflow": [
    { "filter": { "passed?": "sort" } },
    { "sort": { "success?": "log" } }
  ]
}
```

**CORRECT - Inline nested:**
```json
{
  "workflow": [
    {
      "filter": {
        "passed?": {
          "sort": {
            "success?": {
              "log": { "message": "Done" }
            }
          }
        }
      }
    }
  ]
}
```

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
| Inline object | `"success?": { "log": {...} }` | Execute next node |
| Array | `"success?": [{ "$.x": 1 }, { "log": {...} }]` | Execute sequence |
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

## Scripts

- **Validate**: `scripts/validate-workflow.ts` - Validate workflow JSON
- **Fetch Manifest**: `scripts/fetch-manifest.sh` - Fetch node manifest from API
- **Start Server**: `scripts/start-dev-server.sh` - Start dev server if not running
