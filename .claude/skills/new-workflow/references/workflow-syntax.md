# Workflow JSON Syntax Reference

Complete reference for creating valid Workscript workflow JSON files.

## Table of Contents

1. [Top-Level Schema](#top-level-schema)
2. [Fundamental Rules](#fundamental-rules)
3. [Node Invocation](#node-invocation)
4. [Edge Routing](#edge-routing)
5. [State Management](#state-management)
6. [Loop Patterns](#loop-patterns)
7. [Validation Rules](#validation-rules)
8. [Common Mistakes](#common-mistakes)

---

## Top-Level Schema

### Required Fields

| Field | Type | Pattern | Description |
|-------|------|---------|-------------|
| `id` | string | `/^[a-zA-Z0-9_-]+$/` | Unique workflow identifier |
| `name` | string | min 1 char | Human-readable display name |
| `version` | string | `/^\d+\.\d+\.\d+$/` | Semantic version (e.g., "1.0.0") |
| `workflow` | array | min 1 item | Array of workflow entry points |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Optional description |
| `initialState` | object | Initial state values (any data type) |

### Template

```json
{
  "id": "workflow-id-here",
  "name": "Workflow Display Name",
  "version": "1.0.0",
  "description": "Optional description",
  "initialState": {
    "key1": "value1",
    "key2": 42,
    "nested": { "data": [1, 2, 3] }
  },
  "workflow": [ ... ]
}
```

### ID Constraints

```
VALID:
  my-workflow
  my_workflow
  MyWorkflow123
  workflow-v1-0-0

INVALID:
  my workflow     (spaces)
  my.workflow     (dots)
  workflow@test   (special chars)
```

### Version Format

```
VALID:
  1.0.0
  0.1.0
  10.20.30

INVALID:
  1.0
  v1.0.0
  1.0.0-rc1
```

---

## Fundamental Rules

### RULE 1: Pre-Registered Nodes Only

You CANNOT define new node types in a workflow. All nodes must exist in `@workscript/nodes`.

```json
// VALID - Registered nodes
{ "filter": {...} }
{ "math": {...} }
{ "log": {...} }

// INVALID - Not registered
{ "my-custom-handler": {...} }
```

### RULE 2: Inline Configuration

When an edge leads to another node, configure that node INLINE within the edge - NOT as a separate step.

**WRONG - Flat sequential:**
```json
{
  "workflow": [
    { "filter": { "passed?": "sort" } },
    { "sort": { "success?": "log" } },
    { "log": { "message": "Done" } }
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

---

## Node Invocation

### Method 1: Simple String Reference

```json
{ "workflow": [ "empty" ] }
```

Use only for terminal nodes with no configuration.

### Method 2: Node with Configuration (Most Common)

```json
{
  "workflow": [
    {
      "math": {
        "operation": "add",
        "values": [10, 20, 30],
        "success?": {
          "log": { "message": "Result: $.mathResult" }
        }
      }
    }
  ]
}
```

### Method 3: State Setter

```json
{
  "workflow": [
    { "$.developer": "Alice" },
    { "$.config.timeout": 5000 },
    { "log": { "message": "Developer is $.developer" } }
  ]
}
```

### Node Configuration Structure

```json
{
  "node-type": {
    // Configuration parameters
    "param1": "value1",
    "param2": 123,

    // Edge routes (end with ?)
    "success?": { ... next node inline ... },
    "error?": { ... error handler inline ... }
  }
}
```

### Parameter Value Types

| Type | Example |
|------|---------|
| String | `"hello"`, `"$.key"`, `"prefix{{$.key}}suffix"` |
| Number | `42`, `3.14` |
| Boolean | `true`, `false` |
| Array | `[1, "two", true]` |
| Object | `{"key": "value"}` |
| State Ref | `"$.keyPath"` |

---

## Edge Routing

### Edge Syntax

Edges are keys ending with `?` containing the next node's inline config:

```json
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["name", "email"],
    "valid?": {
      "editFields": {
        "success?": { "log": { "message": "Valid!" } }
      }
    },
    "invalid?": {
      "log": { "message": "Invalid: $.validationErrors" }
    }
  }
}
```

### Common Edge Names

| Node Type | Edges |
|-----------|-------|
| `math` | `success?`, `error?` |
| `logic` | `true?`, `false?`, `error?` |
| `filter` | `passed?`, `filtered?`, `error?` |
| `switch` | `<dynamic>?`, `default?`, `error?` |
| `filesystem` | `success?`, `error?`, `exists?`, `not_exists?` |
| `auth` | `success?`, `valid?`, `invalid?`, `error?` |
| `validateData` | `valid?`, `invalid?`, `error?` |
| `database` | `success?`, `found?`, `not_found?`, `error?` |

### Edge Route Types

#### Type 1: Inline Node (Standard)

```json
{
  "math": {
    "success?": {
      "log": { "message": "Result: $.mathResult" }
    }
  }
}
```

#### Type 2: Array of Nodes (Sequential)

```json
{
  "math": {
    "success?": [
      { "$.step": "first" },
      { "log": { "message": "Step: $.step" } },
      { "$.step": "second" },
      { "log": { "message": "Step: $.step" } }
    ]
  }
}
```

#### Type 3: Null (Terminal / Exit Loop)

```json
{
  "logic": {
    "true?": { ... },
    "false?": null  // Ends execution or exits loop
  }
}
```

### Edge Resolution Rules

1. **Object** -> Execute inline node configuration
2. **Array** -> Execute sequence of inline nodes
3. **null** -> End execution / exit loop
4. **Missing** -> Continue to next workflow entry (if any)

---

## State Management

### Initial State

```json
{
  "initialState": {
    "counter": 0,
    "user": { "name": "Alice", "role": "admin" },
    "items": [],
    "config": { "timeout": 5000 }
  }
}
```

### State Resolution (`$.` Syntax)

```json
{ "log": { "message": "User $.user.name has role $.user.role" } }
```
At runtime: `$.user.name` -> `"Alice"`

### Template Interpolation (`{{$.}}` Syntax)

```json
{ "log": { "message": "Hello {{$.user.name}}, you have {{$.count}} messages" } }
```
Creates string: `"Hello Alice, you have 5 messages"`

### State Setter Nodes

```json
{ "$.developer": "Bob" }
{ "$.counter": 42 }
{ "$.data.nested.value": "deep" }
```

### State Path Rules

```
VALID:
  $.developer
  $.user.name
  $.config.api.timeout

INVALID:
  $.user[0]       (no array indexing)
  $.user-name     (no hyphens)
  $user.name      (must start with $.)
```

### State Written by Nodes

| Node | State Keys |
|------|------------|
| `math` | `mathResult` |
| `logic` | `logicResult` |
| `filter` | `filterPassed`, `filterFiltered`, `filterStats` |
| `sort` | `sortedItems` |
| `validateData` | `validationResult`, `validationErrors` |
| `editFields` | `editFieldsResult`, `fieldsModified` |
| `database` | `dbInserted`, `dbRecord`, `dbUpdated`, `dbDeleted`, `dbRecords` |
| `filesystem` | `fileContent`, `fileExists`, `fileWritten` |
| `log` | `lastLoggedMessage` |
| `ask-ai` | `aiResponse`, `aiResponseData` |
| `switch` | `switchResult`, `selectedEdge`, `matchedRule` |

---

## Loop Patterns

### Loop Node Syntax

Any node with ID ending in `...` becomes a loop:

```json
{
  "logic...": {
    "operation": "less",
    "values": ["$.index", 10],
    "true?": [
      { "log": { "message": "Processing index $.index" } },
      { "$.index": "$.index + 1" }
    ],
    "false?": null  // Exit loop
  }
}
```

### Loop Execution Flow

```
1. Execute loop node
2. Evaluate edge
   |-- If edge has config -> Execute inline nodes -> Return to step 1
   +-- If edge is null/missing -> Exit loop -> Continue workflow
```

### Loop Safety

- Maximum iterations: 1000 (safety limit)
- Exit via `null` edge or missing edge
- Nested loops track iterations independently

---

## Validation Rules

### JSON Schema (Layer 1)

| Constraint | Error |
|------------|-------|
| `id` required | "must have required property 'id'" |
| `id` pattern | "must match pattern '^[a-zA-Z0-9_-]+$'" |
| `name` required | "must have required property 'name'" |
| `version` required | "must have required property 'version'" |
| `version` pattern | "must match pattern '^\d+\.\d+\.\d+$'" |
| `workflow` required | "must have required property 'workflow'" |
| `workflow` min items | "must NOT have fewer than 1 items" |

### Semantic Validation (Layer 2)

| Check | Error Code |
|-------|------------|
| Node type exists | `NODE_TYPE_NOT_FOUND` |
| State setter syntax | `INVALID_STATE_SETTER_SYNTAX` |

---

## Common Mistakes

### Mistake 1: Flat Sequential References

```json
// WRONG
"workflow": [
  { "filter": { "passed?": "sort" } },
  { "sort": {...} }
]

// CORRECT
"workflow": [
  { "filter": { "passed?": { "sort": {...} } } }
]
```

### Mistake 2: Invalid Version

```json
// WRONG
"version": "v1.0.0"
"version": "1.0"

// CORRECT
"version": "1.0.0"
```

### Mistake 3: Invalid State Paths

```json
// WRONG
{ "$.user-name": "value" }
{ "$.user[0]": "value" }

// CORRECT
{ "$.user_name": "value" }
{ "$.user.name": "value" }
```

### Mistake 4: Wrong Case Sensitivity

```json
// WRONG
{ "EditFields": {...} }

// CORRECT
{ "editFields": {...} }
```

### Mistake 5: Template Instead of Reference

```json
// WRONG - If you need actual value type
{ "math": { "values": ["{{$.count}}", 10] } }  // Becomes strings!

// CORRECT - Preserves number type
{ "math": { "values": ["$.count", 10] } }
```

---

## Quick Reference Card

### Workflow Structure
```json
{
  "id": "string",
  "name": "string",
  "version": "X.Y.Z",
  "initialState": { ... },
  "workflow": [ ... ]
}
```

### Inline Edge Pattern
```json
{
  "nodeType": {
    "config": "...",
    "success?": { "nextNode": {...} },
    "error?": { "log": {...} }
  }
}
```

### State Syntax
```
$.key              -> state.key (preserves type)
{{$.key}}          -> string interpolation
{ "$.path": val }  -> set state.path = val
```

### Loop Syntax
```json
{ "nodeType...": { "edge?": [...], "exit?": null } }
```

### Edge Values
```
{ ... }    -> Execute inline node
[ ... ]    -> Execute sequence
null       -> End execution / exit loop
```
