# Workscript Workflow Creation Blueprint

**A Definitive Guide to Creating 100% Valid, Production-Ready Workflows**

Version: 1.0.0 | Last Updated: November 2025 | Workscript Engine v1.0.0

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Workflow Structure](#2-workflow-structure)
3. [Node Definitions](#3-node-definitions)
4. [Edge Routing](#4-edge-routing)
5. [State Management](#5-state-management)
6. [Loop Patterns](#6-loop-patterns)
7. [Complete Node Catalog](#7-complete-node-catalog)
8. [Validation Rules](#8-validation-rules)
9. [Common Patterns](#9-common-patterns)
10. [Edge Cases & Gotchas](#10-edge-cases--gotchas)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Complete Examples](#12-complete-examples)

---

## 1. Quick Start

### Minimal Valid Workflow

```json
{
  "id": "my-first-workflow",
  "name": "My First Workflow",
  "version": "1.0.0",
  "workflow": [
    {
      "log": {
        "message": "Hello, Workscript!"
      }
    }
  ]
}
```

### Key Points

- **All workflows require**: `id`, `name`, `version`, and `workflow` array
- **Workflow array**: Must contain at least one step
- **Nodes execute sequentially**: Top to bottom unless edges redirect
- **All execution is server-side**: Frontend is management UI only

---

## 2. Workflow Structure

### Top-Level Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | **YES** | `/^[a-zA-Z0-9_-]+$/` | Unique workflow identifier |
| `name` | string | **YES** | min: 1 char | Human-readable display name |
| `version` | string | **YES** | `/^\d+\.\d+\.\d+$/` | Semantic version (e.g., "1.0.0") |
| `description` | string | no | - | Optional description |
| `initialState` | object | no | - | Initial state values |
| `workflow` | array | **YES** | min: 1 item | Array of workflow steps |

### Complete Template

```json
{
  "id": "workflow-id-here",
  "name": "Workflow Display Name",
  "version": "1.0.0",
  "description": "Optional description of what this workflow does",
  "initialState": {
    "key1": "value1",
    "key2": 42,
    "nested": {
      "data": [1, 2, 3]
    }
  },
  "workflow": [
    // Workflow steps go here
  ]
}
```

### ID Constraints (IMPORTANT)

```
VALID IDs:
  my-workflow
  my_workflow
  MyWorkflow123
  workflow-v1-0-0
  user_registration_flow

INVALID IDs:
  my workflow     (spaces not allowed)
  my.workflow     (dots not allowed)
  workflow@test   (special chars not allowed)
  123-workflow    (can start with number, but be consistent)
```

### Version Format

```
VALID:
  1.0.0
  0.1.0
  10.20.30
  1.0.0-beta  (NOT VALID - only digits and dots)

INVALID:
  1.0
  v1.0.0
  1.0.0-rc1
```

---

## 3. Node Definitions

### Three Ways to Define Nodes

#### Method 1: Simple String Reference (Minimal Config)

```json
{
  "workflow": [
    "empty",
    "log",
    "fetch-data"
  ]
}
```

Use when: Node needs no configuration and uses default behavior.

#### Method 2: Node with Configuration (Most Common)

```json
{
  "workflow": [
    {
      "math": {
        "operation": "add",
        "values": [10, 20, 30],
        "success?": "log-result"
      }
    }
  ]
}
```

Use when: Node needs parameters and/or edge routing.

#### Method 3: State Setter (Direct State Manipulation)

```json
{
  "workflow": [
    { "$.developer": "Alice" },
    { "$.config.timeout": 5000 },
    { "$.data.items": [1, 2, 3] }
  ]
}
```

Use when: You need to set state values without using a dedicated node.

### Node Configuration Structure

```json
{
  "node-id": {
    // Configuration parameters (node-specific)
    "param1": "value1",
    "param2": 123,
    "param3": ["array", "values"],
    "param4": { "nested": "object" },

    // Edge routes (end with ?)
    "success?": "next-node",
    "error?": "error-handler",
    "customEdge?": ["step1", "step2"]
  }
}
```

### Parameter Value Types

| Type | Example | Notes |
|------|---------|-------|
| String | `"hello"` | Can contain `$.ref` for state resolution |
| Number | `42`, `3.14` | Integer or float |
| Boolean | `true`, `false` | Lowercase only |
| Array | `[1, "two", true]` | Mixed types allowed |
| Object | `{"key": "value"}` | Nested structures allowed |
| State Reference | `"$.keyPath"` | Resolved at runtime |

### State Reference in Parameters

```json
{
  "math": {
    "operation": "add",
    "values": ["$.baseValue", "$.multiplier", 10]
  }
}
```

State references (`$.key`) are resolved **before** node execution:
- `"$.baseValue"` → Looks up `state.baseValue`
- `"$.user.name"` → Looks up `state.user.name`
- `"$.items[0]"` → **NOT SUPPORTED** (no array indexing in path)

---

## 4. Edge Routing

### Edge Syntax

Edges are defined by keys ending with `?`:

```json
{
  "validate-data": {
    "data": "$.input",
    "valid?": "process-data",      // If validation passes
    "invalid?": "handle-error",     // If validation fails
    "error?": "log-error"           // If node throws error
  }
}
```

### Common Edge Names by Node Type

| Node Type | Common Edges | Description |
|-----------|--------------|-------------|
| `math` | `success?`, `error?` | Arithmetic operations |
| `logic` | `true?`, `false?`, `error?` | Boolean operations |
| `filter` | `passed?`, `filtered?`, `error?` | Data filtering |
| `switch` | `<dynamic>?`, `default?`, `error?` | Conditional routing |
| `filesystem` | `success?`, `error?`, `exists?`, `not_exists?` | File operations |
| `auth` | `success?`, `valid?`, `invalid?`, `error?` | Authentication |

### Edge Route Types

#### Type 1: Simple String (Jump to Node)

```json
{
  "math": {
    "success?": "log-result"
  }
}
```

Behavior: Jump directly to `log-result` node.

#### Type 2: Array Sequence (Execute in Order)

```json
{
  "math": {
    "success?": ["validate", "transform", "save"]
  }
}
```

Behavior: Execute `validate`, then `transform`, then `save` in sequence.

#### Type 3: Nested Inline Node

```json
{
  "math": {
    "success?": {
      "log": {
        "message": "Calculation complete"
      }
    }
  }
}
```

Behavior: Execute the inline `log` node immediately.

#### Type 4: Mixed Sequence

```json
{
  "math": {
    "success?": [
      "validate",
      {
        "log": {
          "message": "Validated successfully"
        }
      },
      "save"
    ]
  }
}
```

Behavior: Execute `validate`, then inline `log`, then `save`.

### Deep Nesting Example

```json
{
  "fetch-data": {
    "url": "https://api.example.com/data",
    "success?": {
      "transform": {
        "operation": "map",
        "success?": {
          "validate": {
            "schema": "user",
            "valid?": {
              "save": {
                "destination": "database"
              }
            },
            "invalid?": "error-handler"
          }
        }
      }
    },
    "error?": "error-handler"
  }
}
```

### Edge Resolution Rules

1. **No edge configured**: Continue to next sequential node
2. **Edge with null/undefined value**: Stay at current node (useful for terminals)
3. **Edge with string**: Jump to named node
4. **Edge with array**: Execute sequence, then continue
5. **Edge with object**: Execute nested node, then continue

---

## 5. State Management

### Initial State

```json
{
  "id": "my-workflow",
  "name": "State Demo",
  "version": "1.0.0",
  "initialState": {
    "counter": 0,
    "user": {
      "name": "Alice",
      "role": "admin"
    },
    "items": [],
    "config": {
      "timeout": 5000,
      "retries": 3
    }
  },
  "workflow": [...]
}
```

### State Resolution (`$.` Syntax)

#### Basic Resolution

```json
{
  "log": {
    "message": "$.user.name"
  }
}
```

At runtime: `"$.user.name"` → `"Alice"`

#### Resolution in Arrays

```json
{
  "math": {
    "values": ["$.baseValue", "$.multiplier", 100]
  }
}
```

Each state reference in the array is resolved independently.

#### Resolution in Objects

```json
{
  "http": {
    "headers": {
      "Authorization": "Bearer $.authToken",
      "X-User-Id": "$.user.id"
    }
  }
}
```

State references are resolved recursively in nested objects.

### State Setter Nodes

#### Shorthand Syntax (Simple Values)

```json
{ "$.developer": "Bob" }
{ "$.counter": 42 }
{ "$.enabled": true }
{ "$.data.nested.value": "deep" }
```

#### Explicit Syntax (With Edges)

```json
{
  "$.config.timeout": {
    "value": 30000,
    "success?": "next-node",
    "error?": "error-handler"
  }
}
```

### State Path Rules

```
VALID PATHS:
  $.developer
  $.user.name
  $.config.api.timeout
  $.items
  $._private

INVALID PATHS:
  $.user[0]           (no array indexing)
  $.user['name']      (no bracket notation)
  $.123invalid        (cannot start with number)
  $.user-name         (hyphens not allowed)
  $user.name          (must start with $.)
```

Pattern: `/^\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/`

### State Updates by Nodes

Nodes can update state via `context.state`:

```javascript
// Inside node execute() method
context.state.mathResult = result;
context.state.lastOperation = 'add';
```

Common state keys set by nodes:

| Node | State Keys Written |
|------|-------------------|
| `math` | `mathResult` |
| `logic` | `logicResult` |
| `filter` | `filterPassed`, `filterFiltered`, `filterStats` |
| `transform` | `transformResult` |
| `auth` | `authToken`, `authValid` |
| `filesystem` | `fileContent`, `fileExists` |

### Reading State in Subsequent Nodes

```json
{
  "workflow": [
    {
      "math": {
        "operation": "add",
        "values": [10, 20]
      }
    },
    {
      "log": {
        "message": "Result: $.mathResult"
      }
    }
  ]
}
```

---

## 6. Loop Patterns

### Loop Node Syntax

Any node ID ending with `...` becomes a loop node:

```json
{
  "process-items...": {
    "items": "$.dataArray",
    "continue?": "process-single-item",
    "done?": "finalize"
  }
}
```

### Loop Execution Flow

```
┌─────────────────────────────────────────┐
│ 1. Execute loop node                    │
│ 2. Evaluate edge                        │
│    ├─ If edge taken with target:        │
│    │   → Execute target                 │
│    │   → Return to loop node (step 1)   │
│    │                                    │
│    └─ If no edge taken OR edge is null: │
│        → Exit loop                      │
│        → Continue to next sequential    │
└─────────────────────────────────────────┘
```

### Complete Loop Example

```json
{
  "id": "loop-example",
  "name": "Process Items Loop",
  "version": "1.0.0",
  "initialState": {
    "items": ["apple", "banana", "cherry"],
    "index": 0,
    "processed": []
  },
  "workflow": [
    {
      "process-item...": {
        "continue?": {
          "logic": {
            "operation": "less",
            "values": ["$.index", 3],
            "true?": [
              { "$.currentItem": "$.items[$.index]" },
              {
                "transform": {
                  "operation": "uppercase",
                  "data": "$.currentItem",
                  "success?": {
                    "$.index": {
                      "value": "$.index + 1"
                    }
                  }
                }
              }
            ],
            "false?": null
          }
        }
      }
    },
    {
      "log": {
        "message": "Loop completed"
      }
    }
  ]
}
```

### Loop Safety

- **Maximum iterations**: 1000 per loop node (configurable)
- **Nested loops**: Each loop tracks iterations independently
- **Loop exit**: Return `null` from edge or don't take any edge

### Loop Naming

```json
// These are ALL loop nodes:
"process..."
"process-items..."
"processItems..."
"PROCESS_DATA..."

// These are NOT loop nodes:
"process"
"process-items"
"process...items"      // ... must be at the END
```

---

## 7. Complete Node Catalog

### Core Nodes (6)

#### `math` - Mathematical Operations

```json
{
  "math": {
    "operation": "add",           // add | subtract | multiply | divide
    "values": [10, 20, 30],       // Array of numbers
    "success?": "next",
    "error?": "error-handler"
  }
}
```

State: Writes `mathResult` (number)

#### `logic` - Boolean Operations

```json
{
  "logic": {
    "operation": "and",           // and | or | not | equal | greater | less
    "values": [true, "$.isValid"],
    "true?": "handle-true",
    "false?": "handle-false",
    "error?": "error-handler"
  }
}
```

State: Writes `logicResult` (boolean)

#### `transform` - Data Transformation

```json
{
  "transform": {
    "operation": "stringify",     // stringify | parse | uppercase | lowercase | trim | length | reverse
    "data": "$.inputData",
    "success?": "next",
    "error?": "error-handler"
  }
}
```

State: Writes `transformResult` (any)

#### `log` - Logging

```json
{
  "log": {
    "message": "Processing: $.currentItem"
  }
}
```

State: Writes `lastLoggedMessage` (string)

#### `empty` - No Operation

```json
"empty"
// or
{ "empty": {} }
```

Use for: Testing, placeholders, debugging.

#### `__state_setter__` (Internal)

Automatically invoked when using `$.path` syntax:

```json
{ "$.user.name": "Alice" }
```

### AI & Orchestration Nodes (2)

#### `ask-ai` - AI/LLM Integration

```json
{
  "ask-ai": {
    "userPrompt": "Summarize this text: $.inputText",
    "model": "openai/gpt-4o",
    "systemPrompt": "You are a helpful assistant",
    "success?": "process-response",
    "error?": "handle-error"
  }
}
```

Required: `userPrompt`, `model`
State: Reads `JWT_token`; Writes `aiResponse`, `aiResponseData`

#### `runWorkflow` - Execute Sub-Workflow

```json
{
  "runWorkflow": {
    "workflowId": "data-processing-workflow",
    "initialState": {
      "input": "$.dataToProcess"
    },
    "timeout": 60000,
    "success?": "handle-result",
    "error?": "handle-error"
  }
}
```

State: Reads `JWT_token`; Writes `runWorkflowResult`, `runWorkflowFinalState`

### Data Manipulation Nodes (20)

#### `filter` - Filter Arrays

```json
{
  "filter": {
    "items": "$.products",
    "conditions": [
      {
        "field": "price",
        "dataType": "number",
        "operation": "gt",
        "value": 100
      },
      {
        "field": "inStock",
        "dataType": "boolean",
        "operation": "true"
      }
    ],
    "matchMode": "all",          // all | any
    "passed?": "process-matched",
    "filtered?": "log-filtered",
    "error?": "handle-error"
  }
}
```

**Data Types**: `string`, `number`, `boolean`, `date`, `array`, `object`

**Operations by Type**:

| Type | Operations |
|------|------------|
| string | `equals`, `notEquals`, `contains`, `notContains`, `startsWith`, `endsWith`, `regex`, `isEmpty`, `isNotEmpty` |
| number | `equals`, `notEquals`, `gt`, `gte`, `lt`, `lte`, `between` |
| boolean | `true`, `false` |
| date | `before`, `after`, `equals`, `between` |
| array | `contains`, `notContains`, `isEmpty`, `isNotEmpty` |
| object | `isEmpty`, `isNotEmpty` |

State: Writes `filterPassed`, `filterFiltered`, `filterStats`

#### `sort` - Sort Arrays

```json
{
  "sort": {
    "type": "simple",            // simple | random
    "fieldsToSortBy": [
      { "fieldName": "price", "order": "ascending" },
      { "fieldName": "name", "order": "descending" }
    ],
    "disableDotNotation": false,
    "success?": "next",
    "error?": "handle-error"
  }
}
```

State: Writes `sortedItems`

#### `aggregate` - Combine Items

```json
{
  "aggregate": {
    "mode": "individual_fields",  // individual_fields | all_data
    "fields": [
      {
        "inputFieldName": "price",
        "outputFieldName": "prices",
        "mergeLists": false
      }
    ],
    "success?": "next",
    "empty?": "handle-empty",
    "error?": "handle-error"
  }
}
```

State: Writes `aggregatedData`, `itemCount`

#### `switch` - Conditional Routing

```json
{
  "switch": {
    "mode": "rules",             // rules | expression
    "item": "$.currentItem",
    "rules": [
      {
        "outputKey": "premium",
        "conditions": [
          { "field": "price", "operation": "gt", "value": 1000 }
        ]
      },
      {
        "outputKey": "standard",
        "conditions": [
          { "field": "price", "operation": "lte", "value": 1000 }
        ]
      }
    ],
    "fallbackOutput": "default",
    "premium?": "handle-premium",
    "standard?": "handle-standard",
    "default?": "handle-default",
    "error?": "handle-error"
  }
}
```

Expression mode:
```json
{
  "switch": {
    "mode": "expression",
    "item": "$.score",
    "expression": "item >= 90 ? 'excellent' : item >= 70 ? 'good' : 'needs_improvement'",
    "excellent?": "handle-excellent",
    "good?": "handle-good",
    "needs_improvement?": "handle-needs-improvement"
  }
}
```

State: Writes `switchResult`, `selectedEdge`, `matchedRule`

#### `splitOut` - Split Array to Items

```json
{
  "splitOut": {
    "arrayPath": "items",        // Path to array in item
    "keepParentData": true,
    "as": "item",                // Field name for each element
    "success?": "process-each",
    "empty?": "handle-empty",
    "error?": "handle-error"
  }
}
```

Input: `{orderId: 1, items: [{id: 'a'}, {id: 'b'}]}`
Output: `[{orderId: 1, item: {id: 'a'}}, {orderId: 1, item: {id: 'b'}}]`

State: Writes `splitOutResult`, `splitOutCount`

#### `limit` - Limit Results

```json
{
  "limit": {
    "items": "$.allItems",
    "maxItems": 10,
    "keepFrom": "beginning",     // beginning | end
    "success?": "process-limited",
    "all_items?": "no-limit-needed",
    "error?": "handle-error"
  }
}
```

State: Writes `limitedItems`, `limitCount`, `limitOriginalCount`

#### `editFields` - Modify Fields

```json
{
  "editFields": {
    "mode": "manual_mapping",    // manual_mapping | json_output
    "fieldsToSet": [
      { "name": "fullName", "value": "{{firstName}} {{lastName}}", "type": "string" },
      { "name": "age", "value": "$.userAge", "type": "number" },
      { "name": "isActive", "value": true, "type": "boolean" }
    ],
    "includeOtherFields": true,
    "supportDotNotation": true,
    "success?": "next",
    "error?": "handle-error"
  }
}
```

JSON output mode:
```json
{
  "editFields": {
    "mode": "json_output",
    "jsonOutput": "{\"user\": \"{{name}}\", \"email\": \"{{contact.email}}\"}"
  }
}
```

State: Writes `editFieldsResult`, `fieldsModified`

#### `summarize` - Aggregate/Pivot Data

```json
{
  "summarize": {
    "fieldsToSummarize": [
      {
        "fieldToAggregate": "price",
        "aggregation": "sum",
        "outputFieldName": "totalPrice"
      },
      {
        "fieldToAggregate": "quantity",
        "aggregation": "average",
        "outputFieldName": "avgQuantity"
      }
    ],
    "fieldsToSplitBy": ["category", "region"],
    "outputFormat": "separate_items",
    "success?": "next",
    "error?": "handle-error"
  }
}
```

Aggregations: `append`, `average`, `concatenate`, `count`, `countUnique`, `max`, `min`, `sum`

State: Writes `summarizeResult`, `summarizeGroups`, `summarizeMetadata`

#### `transformObject` - Transform Structure

```json
{
  "transformObject": {
    "operation": "flatten",      // flatten | unflatten | pick | omit | renameKeys
    "separator": ".",
    "depth": 2,
    "success?": "next",
    "error?": "handle-error"
  }
}
```

Operations:
- `flatten`: `{user: {name: "Alice"}}` → `{"user.name": "Alice"}`
- `unflatten`: Reverse of flatten
- `pick`: Keep only specified keys
- `omit`: Remove specified keys
- `renameKeys`: Rename using mapping

State: Writes `transformedObject`

#### `jsonExtract` - Extract from JSON

```json
{
  "jsonExtract": {
    "method": "dot_notation",    // dot_notation | bracket_notation | simple_path
    "path": "user.profile.name",
    "fallbackValue": "Unknown",
    "multiple": false,
    "outputField": "userName",
    "success?": "next",
    "not_found?": "handle-missing",
    "error?": "handle-error"
  }
}
```

State: Writes `<outputField>` (dynamic)

#### `removeDuplicates` - Deduplicate

```json
{
  "removeDuplicates": {
    "operation": "current_input",
    "compareMode": "selected_fields",
    "fieldsToCompare": ["email", "phone"],
    "kept?": "process-unique",
    "discarded?": "log-duplicates",
    "error?": "handle-error"
  }
}
```

State: Writes `keptItems`, `discardedItems`, `deduplicationSummary`

#### `validateData` - Data Validation

```json
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["name", "email", "phone"],
    "stopOnError": true,
    "outputErrors": true,
    "valid?": "process-valid",
    "invalid?": "handle-invalid",
    "error?": "handle-error"
  }
}
```

Validation types: `json_schema`, `type_check`, `required_fields`, `range`, `pattern`, `custom`

State: Writes `validationResult`, `validationErrors`

#### `compareDatasets` - Merge/Compare

```json
{
  "compareDatasets": {
    "mode": "keep_matches",      // append | keep_matches | keep_non_matches | remove_matches | enrich
    "input1": "$.existingUsers",
    "input2": "$.newUsers",
    "matchFields": [
      { "field1": "email", "field2": "emailAddress" }
    ],
    "success?": "process-matched",
    "no_matches?": "handle-no-match",
    "error?": "handle-error"
  }
}
```

State: Writes `compareResult`, `compareMetadata`

#### `dateTime` - Date/Time Operations

```json
{
  "dateTime": {
    "operation": "format",       // now | format | parse | add | subtract | diff | compare | extract
    "field": "$.createdAt",
    "outputFormat": "YYYY-MM-DD HH:mm:ss",
    "outputField": "formattedDate",
    "success?": "next",
    "error?": "handle-error"
  }
}
```

#### Additional Data Nodes

- `stringOperations` - String manipulation (trim, split, join, replace, regex)
- `mathOperations` - Advanced math (power, sqrt, abs, round, floor, ceil)
- `arrayUtilities` - Array ops (find, map, flatten, unique, intersection)
- `objectUtilities` - Object ops (merge, clone, keys, values, entries)
- `extractText` - Text extraction (email, url, phone, regex, between delimiters)
- `calculateField` - Field calculations

### Server Nodes (3)

#### `filesystem` - File Operations

```json
{
  "filesystem": {
    "operation": "read",         // read | write | exists | delete | mkdir
    "path": "/data/config.json",
    "content": "...",            // For write only
    "success?": "process-file",
    "error?": "handle-error",
    "exists?": "file-exists",
    "not_exists?": "file-missing"
  }
}
```

State: Writes `fileContent`, `fileWritten`, `fileExists`, `fileDeleted`, `dirCreated`

#### `database` - Database Operations

```json
{
  "database": {
    "operation": "find",         // insert | find | update | delete | list
    "table": "users",
    "query": { "id": "$.userId" },
    "data": { "name": "$.newName" },
    "success?": "process-data",
    "found?": "handle-found",
    "not_found?": "handle-missing",
    "error?": "handle-error"
  }
}
```

State: Writes `dbInserted`, `dbRecord`, `dbUpdated`, `dbDeleted`, `dbRecords`

#### `auth` - Authentication

```json
{
  "auth": {
    "operation": "hash",         // hash | verify | generate_token | sign | verify_signature
    "data": "$.password",
    "secret": "$.secretKey",
    "success?": "next",
    "valid?": "handle-valid",
    "invalid?": "handle-invalid",
    "error?": "handle-error"
  }
}
```

State: Writes `hashedPassword`, `authValid`, `authToken`, `signature`, `signatureValid`

---

## 8. Validation Rules

### JSON Schema Validation (Layer 1)

The parser uses AJV (draft-07) for schema validation:

| Constraint | Error If Violated |
|------------|-------------------|
| `id` required | "must have required property 'id'" |
| `id` pattern | "must match pattern '^[a-zA-Z0-9_-]+$'" |
| `name` required | "must have required property 'name'" |
| `version` required | "must have required property 'version'" |
| `version` pattern | "must match pattern '^\d+\.\d+\.\d+$'" |
| `workflow` required | "must have required property 'workflow'" |
| `workflow` min items | "must NOT have fewer than 1 items" |

### Semantic Validation (Layer 2)

After schema validation, the parser performs semantic checks:

| Check | Error Code | Description |
|-------|------------|-------------|
| Node type exists | `NODE_TYPE_NOT_FOUND` | Base node type must be registered |
| Edge target exists | `EDGE_TARGET_NOT_FOUND` | Edge references must resolve |
| State setter syntax | `INVALID_STATE_SETTER_SYNTAX` | `$.path` must be valid identifier |

### State Path Validation

```javascript
// Valid state paths
$.developer          // OK
$.user.name          // OK
$.config.api.key     // OK
$._private           // OK (underscore allowed)

// Invalid state paths
$.user-name          // FAIL: hyphen not allowed
$.123start           // FAIL: cannot start with number
$.user[0]            // FAIL: no array indexing
$.user['name']       // FAIL: no bracket notation
$user.name           // FAIL: missing dot after $
```

### Node ID Validation

```javascript
// Valid node IDs
my-node              // OK
my_node              // OK
myNode123            // OK
process-items...     // OK (loop node)

// Invalid node IDs
my node              // FAIL: no spaces
my.node              // FAIL: no dots
my@node              // FAIL: no special chars
```

### Validation Error Format

```typescript
interface ValidationError {
  path: string;      // JSON path to error (e.g., "/workflow/0/math")
  message: string;   // Human-readable message
  code?: string;     // Error code (e.g., "NODE_TYPE_NOT_FOUND")
}
```

---

## 9. Common Patterns

### Pattern 1: Sequential Processing

```json
{
  "workflow": [
    { "fetch": { "url": "$.apiEndpoint" } },
    { "transform": { "operation": "parse", "data": "$.fetchResult" } },
    { "validate": { "schema": "user" } },
    { "save": { "table": "users" } }
  ]
}
```

### Pattern 2: Conditional Branching

```json
{
  "workflow": [
    {
      "check-role": {
        "operation": "equal",
        "values": ["$.user.role", "admin"],
        "true?": "admin-flow",
        "false?": "user-flow"
      }
    },
    { "admin-flow": { "permissions": "all" } },
    { "user-flow": { "permissions": "limited" } }
  ]
}
```

### Pattern 3: Error Handling

```json
{
  "workflow": [
    {
      "risky-operation": {
        "data": "$.input",
        "success?": "process-result",
        "error?": {
          "log": {
            "message": "Operation failed: $.error",
            "success?": "fallback-operation"
          }
        }
      }
    }
  ]
}
```

### Pattern 4: Data Pipeline

```json
{
  "workflow": [
    {
      "filter": {
        "items": "$.rawData",
        "conditions": [{ "field": "active", "dataType": "boolean", "operation": "true" }],
        "passed?": "sort-results"
      }
    },
    {
      "sort-results": {
        "type": "simple",
        "fieldsToSortBy": [{ "fieldName": "createdAt", "order": "descending" }],
        "success?": "limit-results"
      }
    },
    {
      "limit-results": {
        "items": "$.sortedItems",
        "maxItems": 10,
        "success?": "output-results"
      }
    }
  ]
}
```

### Pattern 5: State Accumulation

```json
{
  "id": "accumulate-results",
  "version": "1.0.0",
  "name": "State Accumulation",
  "initialState": {
    "results": [],
    "total": 0
  },
  "workflow": [
    {
      "process...": {
        "continue?": [
          { "$.results": "$.results.concat([$.currentResult])" },
          { "$.total": "$.total + 1" }
        ]
      }
    }
  ]
}
```

### Pattern 6: Retry with Exponential Backoff

```json
{
  "workflow": [
    { "$.retryCount": 0 },
    {
      "attempt-operation...": {
        "url": "$.endpoint",
        "success?": "handle-success",
        "error?": {
          "logic": {
            "operation": "less",
            "values": ["$.retryCount", 3],
            "true?": [
              { "$.retryCount": "$.retryCount + 1" },
              { "delay": { "ms": "$.retryCount * 1000" } }
            ],
            "false?": "handle-final-error"
          }
        }
      }
    }
  ]
}
```

---

## 10. Edge Cases & Gotchas

### Gotcha 1: Missing Edge Route = Continue Sequential

```json
{
  "workflow": [
    { "math": { "operation": "add", "values": [1, 2] } },
    { "log": { "message": "$.mathResult" } }
  ]
}
```

Without `success?` on `math`, execution continues to `log` automatically.

### Gotcha 2: Edge with Null = Stay at Node

```json
{
  "workflow": [
    {
      "terminal-node": {
        "data": "$.result",
        "success?": null
      }
    }
  ]
}
```

The workflow ends here (useful for terminal states).

### Gotcha 3: Loop Exit Conditions

```json
{
  "process...": {
    "continue?": {
      "logic": {
        "operation": "less",
        "values": ["$.index", "$.maxIndex"],
        "true?": "process-item",
        "false?": null           // This exits the loop!
      }
    }
  }
}
```

If `false?` has no route or is null, the loop exits.

### Gotcha 4: State References Not Found

```json
{
  "log": {
    "message": "Name: $.user.name"
  }
}
```

If `state.user.name` doesn't exist:
- Default: `"Name: undefined"`
- With strict resolver: Throws error

### Gotcha 5: Circular Edge References

```json
{
  "workflow": [
    { "node-a": { "success?": "node-b" } },
    { "node-b": { "success?": "node-a" } }
  ]
}
```

This creates an infinite loop! Use loop nodes (`...`) instead with proper exit conditions.

### Gotcha 6: Edge Data Passing

When a node returns edge data:

```javascript
return {
  success: () => ({ processedData: result, count: items.length })
};
```

This data is available to the next node via `context.inputs`:

```json
{
  "log": {
    "message": "Processed $.inputs.count items"
  }
}
```

### Gotcha 7: State Setter with Complex Types

```json
{ "$.data.nested": { "key": "value", "array": [1, 2, 3] } }
```

This works! State setters accept any JSON-serializable value.

### Gotcha 8: Node ID Case Sensitivity

Node IDs are case-sensitive:

```json
{
  "workflow": [
    { "MyNode": { "success?": "mynode" } },
    { "mynode": { } }
  ]
}
```

`MyNode` and `mynode` are different nodes!

### Gotcha 9: Duplicate Node IDs

```json
{
  "workflow": [
    { "process": { "type": "a" } },
    { "process": { "type": "b" } }
  ]
}
```

Both have ID `process` - the second one shadows the first when referenced.

### Gotcha 10: Array Index in State Path (Not Supported)

```json
{ "$.items[0]": "value" }  // WRONG - won't work!
```

Instead, use a node to manipulate arrays:

```json
{
  "editFields": {
    "mode": "manual_mapping",
    "fieldsToSet": [
      { "name": "items.0", "value": "new-value" }
    ]
  }
}
```

---

## 11. Troubleshooting Guide

### Error: "must have required property 'id'"

**Cause**: Missing `id` field in workflow definition.

**Fix**:
```json
{
  "id": "my-workflow",  // Add this
  "name": "...",
  "version": "1.0.0",
  "workflow": [...]
}
```

### Error: "id must match pattern"

**Cause**: Invalid characters in workflow ID.

**Fix**: Use only `a-z`, `A-Z`, `0-9`, `_`, and `-`:
```json
"id": "my-valid-workflow_123"
```

### Error: "version must match pattern"

**Cause**: Invalid semantic version format.

**Fix**: Use `X.Y.Z` format with only digits:
```json
"version": "1.0.0"  // Correct
"version": "v1.0"   // Wrong
```

### Error: "NODE_TYPE_NOT_FOUND"

**Cause**: Using a node type that isn't registered.

**Fix**:
1. Check spelling of node ID
2. Ensure node is in `ALL_NODES` array
3. Verify registry has been initialized with nodes

### Error: "EDGE_TARGET_NOT_FOUND"

**Cause**: Edge references a node that doesn't exist.

**Fix**: Ensure target node is defined in workflow:
```json
{
  "workflow": [
    { "step1": { "success?": "step2" } },
    { "step2": { } }  // Must exist!
  ]
}
```

### Error: "INVALID_STATE_SETTER_SYNTAX"

**Cause**: Invalid `$.path` format.

**Fix**: Use valid identifier characters:
```json
{ "$.user.name": "Alice" }     // Correct
{ "$.user-name": "Alice" }     // Wrong (hyphen)
{ "$.user[0]": "Alice" }       // Wrong (brackets)
```

### Error: "Loop limit exceeded"

**Cause**: Loop ran more than 1000 iterations.

**Fix**:
1. Add proper exit condition
2. Ensure exit edge has `null` or no target
3. Check loop counter logic

### Error: State value is undefined

**Cause**: Accessing state key that doesn't exist.

**Fix**:
1. Initialize in `initialState`
2. Ensure previous node sets the value
3. Use optional chaining pattern in expression mode

### Workflow hangs / doesn't complete

**Causes**:
1. Circular edge references without loop (`...`)
2. Missing exit condition in loop
3. Edge pointing to non-existent node

**Fix**: Review edge routing, add exit conditions, use loop nodes properly.

---

## 12. Complete Examples

### Example 1: User Registration Flow

```json
{
  "id": "user-registration",
  "name": "User Registration Workflow",
  "version": "1.0.0",
  "description": "Complete user registration with validation and notification",
  "initialState": {
    "user": null,
    "validationErrors": []
  },
  "workflow": [
    {
      "validate-email": {
        "validationType": "pattern",
        "patternValidations": [
          {
            "field": "email",
            "pattern": "^[^@]+@[^@]+\\.[^@]+$",
            "errorMessage": "Invalid email format"
          }
        ],
        "valid?": "check-existing-user",
        "invalid?": "return-validation-error"
      }
    },
    {
      "check-existing-user": {
        "operation": "find",
        "table": "users",
        "query": { "email": "$.input.email" },
        "found?": "return-user-exists",
        "not_found?": "hash-password"
      }
    },
    {
      "hash-password": {
        "operation": "hash",
        "data": "$.input.password",
        "success?": "create-user",
        "error?": "return-hash-error"
      }
    },
    {
      "create-user": {
        "operation": "insert",
        "table": "users",
        "data": {
          "email": "$.input.email",
          "password": "$.hashedPassword",
          "createdAt": "$.timestamp"
        },
        "success?": "send-welcome-email",
        "error?": "return-create-error"
      }
    },
    {
      "send-welcome-email": {
        "to": "$.input.email",
        "subject": "Welcome to Our Platform",
        "body": "Thank you for registering!",
        "success?": "return-success",
        "error?": "log-email-error"
      }
    },
    {
      "log-email-error": {
        "message": "Failed to send welcome email",
        "success?": "return-success"
      }
    },
    {
      "return-success": {
        "status": "success",
        "user": "$.dbInserted"
      }
    },
    {
      "return-validation-error": {
        "status": "error",
        "code": "VALIDATION_ERROR",
        "errors": "$.validationErrors"
      }
    },
    {
      "return-user-exists": {
        "status": "error",
        "code": "USER_EXISTS",
        "message": "Email already registered"
      }
    },
    {
      "return-hash-error": {
        "status": "error",
        "code": "INTERNAL_ERROR",
        "message": "Failed to process password"
      }
    },
    {
      "return-create-error": {
        "status": "error",
        "code": "INTERNAL_ERROR",
        "message": "Failed to create user"
      }
    }
  ]
}
```

### Example 2: Data Processing Pipeline

```json
{
  "id": "data-pipeline",
  "name": "ETL Data Processing Pipeline",
  "version": "1.0.0",
  "description": "Extract, transform, and load data with error handling",
  "initialState": {
    "processedCount": 0,
    "errorCount": 0,
    "results": []
  },
  "workflow": [
    {
      "log-start": {
        "message": "Starting data pipeline...",
        "success?": "fetch-source-data"
      }
    },
    {
      "fetch-source-data": {
        "operation": "list",
        "table": "raw_data",
        "success?": "filter-valid-records",
        "error?": "handle-fetch-error"
      }
    },
    {
      "filter-valid-records": {
        "items": "$.dbRecords",
        "conditions": [
          { "field": "status", "dataType": "string", "operation": "notEquals", "value": "deleted" },
          { "field": "data", "dataType": "object", "operation": "isNotEmpty" }
        ],
        "matchMode": "all",
        "passed?": "transform-records",
        "filtered?": "log-filtered",
        "error?": "handle-filter-error"
      }
    },
    {
      "log-filtered": {
        "message": "Filtered out invalid records: $.filterStats",
        "success?": "transform-records"
      }
    },
    {
      "transform-records": {
        "operation": "map",
        "data": "$.filterPassed",
        "success?": "deduplicate",
        "error?": "handle-transform-error"
      }
    },
    {
      "deduplicate": {
        "operation": "current_input",
        "compareMode": "selected_fields",
        "fieldsToCompare": ["externalId"],
        "kept?": "sort-by-date",
        "error?": "handle-dedup-error"
      }
    },
    {
      "sort-by-date": {
        "type": "simple",
        "fieldsToSortBy": [
          { "fieldName": "updatedAt", "order": "descending" }
        ],
        "success?": "limit-batch",
        "error?": "handle-sort-error"
      }
    },
    {
      "limit-batch": {
        "items": "$.sortedItems",
        "maxItems": 100,
        "keepFrom": "beginning",
        "success?": "process-batch...",
        "error?": "handle-limit-error"
      }
    },
    {
      "process-batch...": {
        "continue?": {
          "switch": {
            "mode": "rules",
            "item": "$.currentItem",
            "rules": [
              {
                "outputKey": "highPriority",
                "conditions": [
                  { "field": "priority", "operation": "gte", "value": 8 }
                ]
              },
              {
                "outputKey": "normalPriority",
                "conditions": [
                  { "field": "priority", "operation": "lt", "value": 8 }
                ]
              }
            ],
            "highPriority?": "process-high-priority",
            "normalPriority?": "process-normal-priority",
            "error?": "handle-switch-error"
          }
        },
        "done?": "aggregate-results"
      }
    },
    {
      "process-high-priority": {
        "priority": "high",
        "success?": "update-counter"
      }
    },
    {
      "process-normal-priority": {
        "priority": "normal",
        "success?": "update-counter"
      }
    },
    {
      "update-counter": {
        "$.processedCount": "$.processedCount + 1"
      }
    },
    {
      "aggregate-results": {
        "mode": "all_data",
        "outputField": "processedRecords",
        "success?": "save-results",
        "error?": "handle-aggregate-error"
      }
    },
    {
      "save-results": {
        "operation": "write",
        "path": "/data/pipeline-output.json",
        "content": "$.aggregatedData",
        "success?": "log-completion",
        "error?": "handle-save-error"
      }
    },
    {
      "log-completion": {
        "message": "Pipeline completed. Processed: $.processedCount, Errors: $.errorCount"
      }
    },
    {
      "handle-fetch-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Fetch error occurred"
          }
        }
      }
    },
    {
      "handle-filter-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Filter error occurred"
          }
        }
      }
    },
    {
      "handle-transform-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Transform error occurred"
          }
        }
      }
    },
    {
      "handle-dedup-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Deduplication error occurred"
          }
        }
      }
    },
    {
      "handle-sort-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Sort error occurred"
          }
        }
      }
    },
    {
      "handle-limit-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Limit error occurred"
          }
        }
      }
    },
    {
      "handle-switch-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Switch error occurred"
          }
        }
      }
    },
    {
      "handle-aggregate-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Aggregate error occurred"
          }
        }
      }
    },
    {
      "handle-save-error": {
        "$.errorCount": "$.errorCount + 1",
        "success?": {
          "log": {
            "message": "Save error occurred"
          }
        }
      }
    }
  ]
}
```

### Example 3: AI-Powered Content Processor

```json
{
  "id": "ai-content-processor",
  "name": "AI Content Processing Workflow",
  "version": "1.0.0",
  "description": "Process content using AI for summarization and categorization",
  "initialState": {
    "articles": [],
    "summaries": [],
    "categories": {}
  },
  "workflow": [
    {
      "fetch-articles": {
        "operation": "list",
        "table": "articles",
        "success?": "filter-unprocessed"
      }
    },
    {
      "filter-unprocessed": {
        "items": "$.dbRecords",
        "conditions": [
          { "field": "processed", "dataType": "boolean", "operation": "false" }
        ],
        "passed?": "store-articles",
        "filtered?": "no-articles-to-process"
      }
    },
    {
      "store-articles": {
        "$.articles": "$.filterPassed"
      }
    },
    {
      "$.currentIndex": 0
    },
    {
      "process-article...": {
        "continue?": {
          "logic": {
            "operation": "less",
            "values": ["$.currentIndex", "$.articles.length"],
            "true?": "get-current-article",
            "false?": null
          }
        }
      }
    },
    {
      "get-current-article": {
        "$.currentArticle": "$.articles[$.currentIndex]"
      }
    },
    {
      "summarize-article": {
        "userPrompt": "Summarize this article in 2-3 sentences: $.currentArticle.content",
        "model": "openai/gpt-4o-mini",
        "systemPrompt": "You are a professional content summarizer. Be concise and capture key points.",
        "success?": "categorize-article",
        "error?": "handle-ai-error"
      }
    },
    {
      "categorize-article": {
        "userPrompt": "Categorize this article into one of: Technology, Business, Science, Health, Entertainment. Just respond with the category name. Article: $.currentArticle.title",
        "model": "openai/gpt-4o-mini",
        "success?": "store-results",
        "error?": "handle-ai-error"
      }
    },
    {
      "store-results": {
        "$.summaries": "$.summaries.concat([{ id: $.currentArticle.id, summary: $.aiResponse }])"
      }
    },
    {
      "increment-index": {
        "$.currentIndex": "$.currentIndex + 1"
      }
    },
    {
      "handle-ai-error": {
        "message": "AI processing failed for article: $.currentArticle.id",
        "success?": "increment-index"
      }
    },
    {
      "no-articles-to-process": {
        "message": "No unprocessed articles found"
      }
    },
    {
      "save-summaries": {
        "operation": "write",
        "path": "/data/summaries.json",
        "content": "$.summaries",
        "success?": "log-complete"
      }
    },
    {
      "log-complete": {
        "message": "Processed $.summaries.length articles"
      }
    }
  ]
}
```

### Example 4: Multi-Step Form Validation

```json
{
  "id": "form-validation",
  "name": "Multi-Step Form Validation",
  "version": "1.0.0",
  "description": "Validate complex form data with multiple validation rules",
  "initialState": {
    "errors": [],
    "validFields": []
  },
  "workflow": [
    {
      "validate-email": {
        "validationType": "pattern",
        "patternValidations": [
          {
            "field": "email",
            "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
            "errorMessage": "Invalid email format"
          }
        ],
        "valid?": "email-valid",
        "invalid?": "email-invalid"
      }
    },
    {
      "email-valid": {
        "$.validFields": "$.validFields.concat(['email'])"
      }
    },
    {
      "email-invalid": {
        "$.errors": "$.errors.concat([{ field: 'email', message: 'Invalid email format' }])"
      }
    },
    {
      "validate-phone": {
        "validationType": "pattern",
        "patternValidations": [
          {
            "field": "phone",
            "pattern": "^\\+?[1-9]\\d{1,14}$",
            "errorMessage": "Invalid phone number"
          }
        ],
        "valid?": "phone-valid",
        "invalid?": "phone-invalid"
      }
    },
    {
      "phone-valid": {
        "$.validFields": "$.validFields.concat(['phone'])"
      }
    },
    {
      "phone-invalid": {
        "$.errors": "$.errors.concat([{ field: 'phone', message: 'Invalid phone number' }])"
      }
    },
    {
      "validate-age": {
        "validationType": "range",
        "rangeValidations": [
          { "field": "age", "min": 18, "max": 120 }
        ],
        "valid?": "age-valid",
        "invalid?": "age-invalid"
      }
    },
    {
      "age-valid": {
        "$.validFields": "$.validFields.concat(['age'])"
      }
    },
    {
      "age-invalid": {
        "$.errors": "$.errors.concat([{ field: 'age', message: 'Age must be between 18 and 120' }])"
      }
    },
    {
      "check-errors": {
        "operation": "equal",
        "values": ["$.errors.length", 0],
        "true?": "validation-passed",
        "false?": "validation-failed"
      }
    },
    {
      "validation-passed": {
        "status": "valid",
        "message": "All fields validated successfully",
        "validFields": "$.validFields"
      }
    },
    {
      "validation-failed": {
        "status": "invalid",
        "message": "Validation failed",
        "errors": "$.errors"
      }
    }
  ]
}
```

---

## Appendix A: JSON Schema Reference

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "version", "workflow"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]+$"
    },
    "name": {
      "type": "string",
      "minLength": 1
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "description": {
      "type": "string"
    },
    "initialState": {
      "type": "object"
    },
    "workflow": {
      "type": "array",
      "minItems": 1,
      "items": {
        "oneOf": [
          { "type": "string" },
          { "type": "object" }
        ]
      }
    }
  }
}
```

## Appendix B: State Resolution Regex

```javascript
// State reference pattern
/^\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/

// Examples:
// $.user           → matches, captures "user"
// $.user.name      → matches, captures "user.name"
// $.config.api.key → matches, captures "config.api.key"
// $._private       → matches, captures "_private"
// $.user-name      → NO MATCH (hyphen invalid)
// $.123            → NO MATCH (starts with number)
```

## Appendix C: Node Metadata Structure

```typescript
interface NodeMetadata {
  id: string;           // Unique node identifier
  name: string;         // Display name
  version: string;      // Semantic version
  description?: string; // Node description
  inputs?: string[];    // Input parameters
  outputs?: string[];   // Output values
  ai_hints?: {
    purpose: string;
    when_to_use: string;
    expected_edges: string[];
    example_usage?: string;
    example_config?: string;
    get_from_state?: string[];
    post_to_state?: string[];
  };
}
```

---

## Quick Reference Card

### Required Fields
```
id       → ^[a-zA-Z0-9_-]+$
name     → min 1 char
version  → ^\d+\.\d+\.\d+$
workflow → min 1 item
```

### State Syntax
```
$.key              → state.key
$.nested.path      → state.nested.path
{ "$.path": val }  → Set state.path = val
```

### Edge Syntax
```
"success?": "node"           → Jump to node
"success?": ["a", "b"]       → Execute sequence
"success?": { "node": {} }   → Execute inline
"success?": null             → Stay/exit loop
```

### Loop Syntax
```
"node-id...": { }  → Loop until no edge taken
```

### Common Nodes
```
math      → success?, error?
logic     → true?, false?, error?
filter    → passed?, filtered?, error?
switch    → <dynamic>?, default?, error?
```

---

*This document is auto-generated from Workscript Engine v1.0.0*
*For updates, see: /packages/engine/src/*
