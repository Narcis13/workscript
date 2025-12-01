# Workscript Workflow Creation Blueprint

**A Definitive Guide to Creating 100% Valid, Production-Ready Workflows**

Version: 3.0.0 | Last Updated: November 2025 | Workscript Engine v1.0.0

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Core Concepts](#2-core-concepts)
3. [Workflow Structure](#3-workflow-structure)
4. [Node Invocation](#4-node-invocation)
5. [Edge Routing & Inline Configuration](#5-edge-routing--inline-configuration)
6. [State Management](#6-state-management)
7. [Loop Patterns](#7-loop-patterns)
8. [Complete Node Catalog](#8-complete-node-catalog)
9. [Validation Rules](#9-validation-rules)
10. [Common Patterns](#10-common-patterns)
11. [Edge Cases & Gotchas](#11-edge-cases--gotchas)
12. [Troubleshooting Guide](#12-troubleshooting-guide)
13. [Complete Examples](#13-complete-examples)

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
- **Workflow array**: Contains the entry point(s) of your workflow
- **All nodes must be pre-registered** - You can only use nodes that exist in the NodeRegistry
- **Inline configuration** - When an edge leads to another node, configure that node INLINE within the edge
- **All execution is server-side**: Frontend is management UI only

---

## 2. Core Concepts

### FUNDAMENTAL RULE 1: Pre-Registered Nodes Only

> **You CANNOT define new node types in a workflow. All nodes must be pre-registered in the NodeRegistry.**

When you write `"filter"` or `"log"` in your workflow, these are node types that already exist in `@workscript/nodes`.

### FUNDAMENTAL RULE 2: Inline Node Configuration

> **When an edge leads to another node, you configure that node INLINE within the edge - NOT as a separate step.**

**WRONG - Flat sequential steps with string references:**

```json
{
  "workflow": [
    {
      "filter": {
        "items": "$.data",
        "conditions": [...],
        "passed?": "sort"
      }
    },
    {
      "sort": {
        "fieldsToSortBy": [...],
        "success?": "log"
      }
    },
    {
      "log": {
        "message": "Done"
      }
    }
  ]
}
```

**CORRECT - Inline nested configuration:**

```json
{
  "workflow": [
    {
      "filter": {
        "items": "$.data",
        "conditions": [...],
        "passed?": {
          "sort": {
            "fieldsToSortBy": [...],
            "success?": {
              "log": {
                "message": "Done"
              }
            }
          }
        }
      }
    }
  ]
}
```

### Why Inline Configuration?

1. **Flow is explicit** - The execution path is visible in the nesting structure
2. **No orphan nodes** - Every node is connected to its predecessor
3. **Self-documenting** - You can see the entire flow in one place
4. **No string reference errors** - No need to match string IDs

### When to Use Multiple Workflow Entries

The `workflow` array can have multiple top-level entries for:
- **Parallel starting points** - Multiple independent flows
- **State setters at the beginning** - Initialize state before the main flow

```json
{
  "workflow": [
    { "$.initialized": true },
    { "$.counter": 0 },
    {
      "log": {
        "message": "Starting workflow...",
        "success?": {
          "filter": {
            "items": "$.data",
            "passed?": { ... }
          }
        }
      }
    }
  ]
}
```

---

## 3. Workflow Structure

### Top-Level Schema

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | **YES** | `/^[a-zA-Z0-9_-]+$/` | Unique workflow identifier |
| `name` | string | **YES** | min: 1 char | Human-readable display name |
| `version` | string | **YES** | `/^\d+\.\d+\.\d+$/` | Semantic version (e.g., "1.0.0") |
| `description` | string | no | - | Optional description |
| `initialState` | object | no | - | Initial state values |
| `workflow` | array | **YES** | min: 1 item | Array of workflow entry points |

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
    {
      "entryNode": {
        "config": "...",
        "success?": {
          "nextNode": {
            "config": "...",
            "success?": { ... }
          }
        }
      }
    }
  ]
}
```

### ID Constraints

```
VALID IDs:
  my-workflow
  my_workflow
  MyWorkflow123
  workflow-v1-0-0

INVALID IDs:
  my workflow     (spaces not allowed)
  my.workflow     (dots not allowed)
  workflow@test   (special chars not allowed)
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

## 4. Node Invocation

### Understanding Node Invocation

Every node in a workflow is an **invocation** of a pre-registered node type with configuration:

```json
{
  "nodeType": {
    "param1": "value1",
    "param2": 123,
    "edgeName?": { ... next node inline ... }
  }
}
```

### Three Ways to Invoke Nodes

#### Method 1: Simple String Reference (Entry Point Only)

```json
{
  "workflow": [
    "empty"
  ]
}
```

Use when: Node needs no configuration and is a terminal node.

#### Method 2: Node with Configuration (Most Common)

```json
{
  "workflow": [
    {
      "math": {
        "operation": "add",
        "values": [10, 20, 30],
        "success?": {
          "log": {
            "message": "Result: $.mathResult"
          }
        }
      }
    }
  ]
}
```

#### Method 3: State Setter (Direct State Manipulation)

```json
{
  "workflow": [
    { "$.developer": "Alice" },
    { "$.config.timeout": 5000 },
    {
      "log": {
        "message": "Developer is $.developer"
      }
    }
  ]
}
```

### Node Configuration Structure

```json
{
  "node-type": {
    // Configuration parameters (node-specific)
    "param1": "value1",
    "param2": 123,

    // Edge routes (end with ?) - contain INLINE node configuration
    "success?": {
      "nextNodeType": {
        "config": "...",
        "success?": { ... }
      }
    },
    "error?": {
      "log": {
        "message": "An error occurred"
      }
    }
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

---

## 5. Edge Routing & Inline Configuration

### Edge Syntax

Edges are defined by keys ending with `?` and contain the **inline configuration** of the next node:

```json
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["name", "email"],
    "valid?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "status", "value": "validated", "type": "string" }
        ],
        "success?": {
          "log": {
            "message": "Validation successful"
          }
        }
      }
    },
    "invalid?": {
      "log": {
        "message": "Validation failed: $.validationErrors"
      }
    }
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
| `validateData` | `valid?`, `invalid?`, `error?` | Data validation |
| `database` | `success?`, `found?`, `not_found?`, `error?` | Database operations |

### Edge Route Types

#### Type 1: Inline Node Configuration (STANDARD)

```json
{
  "math": {
    "operation": "add",
    "values": [1, 2],
    "success?": {
      "log": {
        "message": "Result: $.mathResult"
      }
    }
  }
}
```

This is the **standard and preferred** way to define edges.

#### Type 2: Array of Inline Nodes (Execute Sequence)

```json
{
  "math": {
    "operation": "add",
    "values": [1, 2],
    "success?": [
      { "$.step": "first" },
      {
        "log": {
          "message": "Step: $.step"
        }
      },
      { "$.step": "second" },
      {
        "log": {
          "message": "Step: $.step"
        }
      }
    ]
  }
}
```

Each item in the array is executed sequentially.

#### Type 3: Null (Terminal / Exit Loop)

```json
{
  "logic": {
    "operation": "less",
    "values": ["$.index", 10],
    "true?": { ... continue ... },
    "false?": null
  }
}
```

`null` means: end execution or exit from a loop.

### Deep Nesting Example

```json
{
  "database": {
    "operation": "find",
    "table": "users",
    "query": { "id": "$.userId" },
    "found?": {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email", "name"],
        "valid?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "verified", "value": true, "type": "boolean" }
            ],
            "success?": {
              "database": {
                "operation": "update",
                "table": "users",
                "query": { "id": "$.userId" },
                "data": { "verified": true },
                "success?": {
                  "log": {
                    "message": "User $.userId verified successfully"
                  }
                }
              }
            }
          }
        },
        "invalid?": {
          "log": {
            "message": "User data invalid: $.validationErrors"
          }
        }
      }
    },
    "not_found?": {
      "log": {
        "message": "User $.userId not found"
      }
    }
  }
}
```

### Edge Resolution Rules

1. **Edge with inline object**: Execute the configured node
2. **Edge with array**: Execute sequence of inline nodes
3. **Edge with null**: End execution / exit loop
4. **No edge configured**: Continue to next sequential entry in workflow array (if any)

---

## 6. State Management

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
      "timeout": 5000
    }
  },
  "workflow": [...]
}
```

### State Resolution (`$.` Syntax)

```json
{
  "log": {
    "message": "User $.user.name has role $.user.role"
  }
}
```

At runtime: `"$.user.name"` -> `"Alice"`

### State Setter Nodes

```json
{ "$.developer": "Bob" }
{ "$.counter": 42 }
{ "$.data.nested.value": "deep" }
```

### State Path Rules

```
VALID PATHS:
  $.developer
  $.user.name
  $.config.api.timeout

INVALID PATHS:
  $.user[0]           (no array indexing)
  $.user-name         (hyphens not allowed)
  $user.name          (must start with $.)
```

### State Updates by Nodes

| Node | State Keys Written |
|------|-------------------|
| `math` | `mathResult` |
| `logic` | `logicResult` |
| `filter` | `filterPassed`, `filterFiltered`, `filterStats` |
| `sort` | `sortedItems` |
| `validateData` | `validationResult`, `validationErrors` |
| `editFields` | `editFieldsResult`, `fieldsModified` |
| `database` | `dbInserted`, `dbRecord`, `dbUpdated`, `dbDeleted`, `dbRecords` |
| `filesystem` | `fileContent`, `fileExists`, `fileWritten` |

---

## 7. Loop Patterns

### Loop Node Syntax

Any node invocation with ID ending in `...` becomes a loop:

```json
{
  "logic...": {
    "operation": "less",
    "values": ["$.index", 10],
    "true?": [
      {
        "log": {
          "message": "Processing index $.index"
        }
      },
      { "$.index": "$.index + 1" }
    ],
    "false?": null
  }
}
```

### Loop Execution Flow

```
+------------------------------------------+
| 1. Execute loop node                     |
| 2. Evaluate edge                         |
|    |-- If edge has inline config:        |
|    |   -> Execute inline node(s)         |
|    |   -> Return to loop node (step 1)   |
|    |                                     |
|    +-- If edge is null or missing:       |
|        -> Exit loop                      |
|        -> Continue to next workflow item |
+------------------------------------------+
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
    "processed": 0
  },
  "workflow": [
    {
      "logic...": {
        "operation": "less",
        "values": ["$.index", 3],
        "true?": [
          {
            "log": {
              "message": "Processing item $.index"
            }
          },
          { "$.index": "$.index + 1" },
          { "$.processed": "$.processed + 1" }
        ],
        "false?": null
      }
    },
    {
      "log": {
        "message": "Loop completed. Processed $.processed items."
      }
    }
  ]
}
```

### Loop Safety

- **Maximum iterations**: 1000 per loop node (configurable)
- **Loop exit**: Edge must be `null` or not taken
- **Nested loops**: Each tracks iterations independently

---

## 8. Complete Node Catalog

All nodes must be pre-registered in `@workscript/nodes`.

### Core Nodes

#### `math` - Mathematical Operations

```json
{
  "math": {
    "operation": "add",
    "values": [10, 20, 30],
    "success?": {
      "log": {
        "message": "Result: $.mathResult"
      }
    },
    "error?": {
      "log": {
        "message": "Math error occurred"
      }
    }
  }
}
```

Operations: `add`, `subtract`, `multiply`, `divide`
State: Writes `mathResult`

#### `logic` - Boolean Operations

```json
{
  "logic": {
    "operation": "equal",
    "values": ["$.user.role", "admin"],
    "true?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "permissions", "value": "all", "type": "string" }
        ]
      }
    },
    "false?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "permissions", "value": "limited", "type": "string" }
        ]
      }
    }
  }
}
```

Operations: `and`, `or`, `not`, `equal`, `greater`, `less`
State: Writes `logicResult`

#### `transform` - Data Transformation

```json
{
  "transform": {
    "operation": "parse",
    "data": "$.jsonString",
    "success?": {
      "log": {
        "message": "Parsed: $.transformResult"
      }
    }
  }
}
```

Operations: `stringify`, `parse`, `uppercase`, `lowercase`, `trim`, `length`, `reverse`
State: Writes `transformResult`

#### `log` - Logging

```json
{
  "log": {
    "message": "Processing complete"
  }
}
```

State: Writes `lastLoggedMessage`

#### `empty` - No Operation

```json
"empty"
```

### Data Manipulation Nodes

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
    "matchMode": "all",
    "passed?": {
      "sort": {
        "type": "simple",
        "fieldsToSortBy": [
          { "fieldName": "price", "order": "ascending" }
        ],
        "success?": {
          "log": {
            "message": "Found $.filterStats.passedCount matching products"
          }
        }
      }
    },
    "filtered?": {
      "log": {
        "message": "No products match criteria"
      }
    }
  }
}
```

State: Writes `filterPassed`, `filterFiltered`, `filterStats`

#### `sort` - Sort Arrays

```json
{
  "sort": {
    "type": "simple",
    "fieldsToSortBy": [
      { "fieldName": "price", "order": "ascending" },
      { "fieldName": "name", "order": "descending" }
    ],
    "success?": {
      "limit": {
        "items": "$.sortedItems",
        "maxItems": 10,
        "success?": {
          "log": {
            "message": "Top 10 items ready"
          }
        }
      }
    }
  }
}
```

State: Writes `sortedItems`

#### `switch` - Conditional Routing

```json
{
  "switch": {
    "mode": "rules",
    "item": "$.request",
    "rules": [
      {
        "outputKey": "premium",
        "conditions": [
          { "field": "priority", "operation": "gte", "value": 8 }
        ]
      },
      {
        "outputKey": "standard",
        "conditions": [
          { "field": "priority", "operation": "lt", "value": 8 }
        ]
      }
    ],
    "fallbackOutput": "default",
    "premium?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "queue", "value": "urgent", "type": "string" }
        ],
        "success?": {
          "log": { "message": "Routed to urgent queue" }
        }
      }
    },
    "standard?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "queue", "value": "normal", "type": "string" }
        ],
        "success?": {
          "log": { "message": "Routed to normal queue" }
        }
      }
    },
    "default?": {
      "log": { "message": "Using default routing" }
    }
  }
}
```

State: Writes `switchResult`, `selectedEdge`, `matchedRule`

#### `editFields` - Modify Fields

```json
{
  "editFields": {
    "mode": "manual_mapping",
    "fieldsToSet": [
      { "name": "fullName", "value": "{{firstName}} {{lastName}}", "type": "string" },
      { "name": "age", "value": "$.userAge", "type": "number" },
      { "name": "isActive", "value": true, "type": "boolean" }
    ],
    "includeOtherFields": true,
    "success?": {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["fullName", "age"],
        "valid?": {
          "log": { "message": "Fields edited and validated" }
        }
      }
    }
  }
}
```

State: Writes `editFieldsResult`, `fieldsModified`

#### `validateData` - Data Validation

```json
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["name", "email", "phone"],
    "stopOnError": true,
    "valid?": {
      "database": {
        "operation": "insert",
        "table": "users",
        "data": "$.input",
        "success?": {
          "log": { "message": "User created: $.dbInserted" }
        }
      }
    },
    "invalid?": {
      "log": {
        "message": "Validation failed: $.validationErrors"
      }
    }
  }
}
```

Validation types: `json_schema`, `type_check`, `required_fields`, `range`, `pattern`, `custom`
State: Writes `validationResult`, `validationErrors`

#### `limit` - Limit Results

```json
{
  "limit": {
    "items": "$.allItems",
    "maxItems": 10,
    "keepFrom": "beginning",
    "success?": {
      "log": {
        "message": "Limited to $.limitCount items"
      }
    }
  }
}
```

State: Writes `limitedItems`, `limitCount`, `limitOriginalCount`

#### `removeDuplicates` - Deduplicate

```json
{
  "removeDuplicates": {
    "operation": "current_input",
    "compareMode": "selected_fields",
    "fieldsToCompare": ["email"],
    "kept?": {
      "log": {
        "message": "Kept $.keptItems.length unique items"
      }
    },
    "discarded?": {
      "log": {
        "message": "Discarded $.discardedItems.length duplicates"
      }
    }
  }
}
```

State: Writes `keptItems`, `discardedItems`, `deduplicationSummary`

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
    "fieldsToSplitBy": ["category"],
    "success?": {
      "log": {
        "message": "Summary complete"
      }
    }
  }
}
```

Aggregations: `append`, `average`, `concatenate`, `count`, `countUnique`, `max`, `min`, `sum`
State: Writes `summarizeResult`, `summarizeGroups`, `summarizeMetadata`

### Server Nodes

#### `filesystem` - File Operations

```json
{
  "filesystem": {
    "operation": "read",
    "path": "/data/config.json",
    "success?": {
      "transform": {
        "operation": "parse",
        "data": "$.fileContent",
        "success?": {
          "log": {
            "message": "Config loaded"
          }
        }
      }
    },
    "not_exists?": {
      "log": {
        "message": "Config file not found"
      }
    }
  }
}
```

Operations: `read`, `write`, `exists`, `delete`, `mkdir`
State: Writes `fileContent`, `fileWritten`, `fileExists`, `fileDeleted`, `dirCreated`

#### `database` - Database Operations

```json
{
  "database": {
    "operation": "find",
    "table": "users",
    "query": { "id": "$.userId" },
    "found?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "user", "value": "$.dbRecord", "type": "object" }
        ],
        "success?": {
          "log": { "message": "Found user: $.user.name" }
        }
      }
    },
    "not_found?": {
      "database": {
        "operation": "insert",
        "table": "users",
        "data": "$.newUserData",
        "success?": {
          "log": { "message": "Created user: $.dbInserted.id" }
        }
      }
    }
  }
}
```

Operations: `insert`, `find`, `update`, `delete`, `list`
State: Writes `dbInserted`, `dbRecord`, `dbUpdated`, `dbDeleted`, `dbRecords`

#### `auth` - Authentication

```json
{
  "auth": {
    "operation": "hash",
    "data": "$.password",
    "success?": {
      "database": {
        "operation": "insert",
        "table": "users",
        "data": {
          "email": "$.email",
          "password": "$.hashedPassword"
        },
        "success?": {
          "log": { "message": "User registered" }
        }
      }
    }
  }
}
```

Operations: `hash`, `verify`, `generate_token`, `sign`, `verify_signature`
State: Writes `hashedPassword`, `authValid`, `authToken`, `signature`, `signatureValid`

### AI & Orchestration Nodes

#### `ask-ai` - AI/LLM Integration

```json
{
  "ask-ai": {
    "userPrompt": "Summarize this text: $.inputText",
    "model": "openai/gpt-4o",
    "systemPrompt": "You are a helpful assistant",
    "success?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "summary", "value": "$.aiResponse", "type": "string" }
        ],
        "success?": {
          "log": { "message": "AI summary complete" }
        }
      }
    },
    "error?": {
      "log": { "message": "AI request failed" }
    }
  }
}
```

Required: `userPrompt`, `model`
State: Writes `aiResponse`, `aiResponseData`

#### `runWorkflow` - Execute Sub-Workflow

```json
{
  "runWorkflow": {
    "workflowId": "data-processing-workflow",
    "initialState": {
      "input": "$.dataToProcess"
    },
    "timeout": 60000,
    "success?": {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "processedData", "value": "$.runWorkflowResult", "type": "object" }
        ]
      }
    },
    "error?": {
      "log": { "message": "Sub-workflow failed" }
    }
  }
}
```

State: Writes `runWorkflowResult`, `runWorkflowFinalState`

---

## 9. Validation Rules

### JSON Schema Validation (Layer 1)

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

| Check | Error Code | Description |
|-------|------------|-------------|
| Node type exists | `NODE_TYPE_NOT_FOUND` | Node type must be registered in NodeRegistry |
| State setter syntax | `INVALID_STATE_SETTER_SYNTAX` | `$.path` must be valid identifier |

### Node Type Validation

```javascript
// Valid - These node types exist in NodeRegistry
"math"
"logic"
"filter"
"validateData"
"editFields"

// Invalid - These are NOT registered node types
"my-custom-handler"    // FAIL: not registered
"admin-flow"           // FAIL: not registered
```

---

## 10. Common Patterns

### Pattern 1: Data Processing Pipeline

```json
{
  "id": "data-pipeline",
  "name": "Data Processing Pipeline",
  "version": "1.0.0",
  "initialState": {
    "rawData": [
      { "id": 1, "name": "Alice", "status": "active", "score": 85 },
      { "id": 2, "name": "Bob", "status": "deleted", "score": 92 },
      { "id": 3, "name": "Charlie", "status": "active", "score": 78 }
    ]
  },
  "workflow": [
    {
      "filter": {
        "items": "$.rawData",
        "conditions": [
          { "field": "status", "dataType": "string", "operation": "equals", "value": "active" }
        ],
        "passed?": {
          "removeDuplicates": {
            "operation": "current_input",
            "compareMode": "selected_fields",
            "fieldsToCompare": ["name"],
            "kept?": {
              "sort": {
                "type": "simple",
                "fieldsToSortBy": [
                  { "fieldName": "score", "order": "descending" }
                ],
                "success?": {
                  "summarize": {
                    "fieldsToSummarize": [
                      { "fieldToAggregate": "score", "aggregation": "average", "outputFieldName": "avgScore" }
                    ],
                    "success?": {
                      "log": {
                        "message": "Pipeline complete. Average score: $.avgScore"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "filtered?": {
          "log": {
            "message": "No active records found"
          }
        }
      }
    }
  ]
}
```

### Pattern 2: Conditional Branching

```json
{
  "id": "conditional-branch",
  "name": "Role-Based Processing",
  "version": "1.0.0",
  "initialState": {
    "user": { "name": "Alice", "role": "admin" }
  },
  "workflow": [
    {
      "logic": {
        "operation": "equal",
        "values": ["$.user.role", "admin"],
        "true?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "permissions", "value": "all", "type": "string" },
              { "name": "accessLevel", "value": 10, "type": "number" }
            ],
            "success?": {
              "log": {
                "message": "Admin user $.user.name granted full permissions"
              }
            }
          }
        },
        "false?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "permissions", "value": "limited", "type": "string" },
              { "name": "accessLevel", "value": 1, "type": "number" }
            ],
            "success?": {
              "log": {
                "message": "Standard user $.user.name granted limited permissions"
              }
            }
          }
        }
      }
    }
  ]
}
```

### Pattern 3: Error Handling Chain

```json
{
  "id": "error-handling",
  "name": "Database with Error Handling",
  "version": "1.0.0",
  "initialState": {
    "userId": "123"
  },
  "workflow": [
    {
      "database": {
        "operation": "find",
        "table": "users",
        "query": { "id": "$.userId" },
        "found?": {
          "validateData": {
            "validationType": "required_fields",
            "requiredFields": ["email", "name"],
            "valid?": {
              "log": {
                "message": "User $.dbRecord.name is valid"
              }
            },
            "invalid?": {
              "log": {
                "message": "User data incomplete: $.validationErrors"
              }
            }
          }
        },
        "not_found?": {
          "log": {
            "message": "User $.userId not found in database"
          }
        },
        "error?": {
          "log": {
            "message": "Database connection error"
          }
        }
      }
    }
  ]
}
```

### Pattern 4: Loop with Counter

```json
{
  "id": "loop-counter",
  "name": "Process N Items",
  "version": "1.0.0",
  "initialState": {
    "items": ["a", "b", "c", "d", "e"],
    "index": 0,
    "processed": 0
  },
  "workflow": [
    {
      "log": {
        "message": "Starting loop..."
      }
    },
    {
      "logic...": {
        "operation": "less",
        "values": ["$.index", 5],
        "true?": [
          {
            "log": {
              "message": "Processing item $.index"
            }
          },
          { "$.index": "$.index + 1" },
          { "$.processed": "$.processed + 1" }
        ],
        "false?": null
      }
    },
    {
      "log": {
        "message": "Loop complete. Processed $.processed items."
      }
    }
  ]
}
```

### Pattern 5: File Read-Process-Write

```json
{
  "id": "file-processing",
  "name": "File Processing Pipeline",
  "version": "1.0.0",
  "initialState": {
    "inputPath": "/data/input.json",
    "outputPath": "/data/output.json"
  },
  "workflow": [
    {
      "filesystem": {
        "operation": "read",
        "path": "$.inputPath",
        "success?": {
          "transform": {
            "operation": "parse",
            "data": "$.fileContent",
            "success?": {
              "filter": {
                "items": "$.transformResult",
                "conditions": [
                  { "field": "valid", "dataType": "boolean", "operation": "true" }
                ],
                "passed?": {
                  "transform": {
                    "operation": "stringify",
                    "data": "$.filterPassed",
                    "success?": {
                      "filesystem": {
                        "operation": "write",
                        "path": "$.outputPath",
                        "content": "$.transformResult",
                        "success?": {
                          "log": {
                            "message": "Processed and saved to $.outputPath"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "not_exists?": {
          "log": {
            "message": "Input file not found: $.inputPath"
          }
        }
      }
    }
  ]
}
```

### Pattern 6: Multi-Path Switch Routing

```json
{
  "id": "multi-switch",
  "name": "Priority-Based Routing",
  "version": "1.0.0",
  "initialState": {
    "ticket": { "priority": 9, "type": "bug" }
  },
  "workflow": [
    {
      "switch": {
        "mode": "expression",
        "item": "$.ticket.priority",
        "expression": "item >= 8 ? 'critical' : item >= 5 ? 'normal' : 'low'",
        "critical?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "queue", "value": "urgent", "type": "string" },
              { "name": "sla", "value": "1h", "type": "string" }
            ],
            "success?": {
              "log": { "message": "Critical ticket routed to urgent queue" }
            }
          }
        },
        "normal?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "queue", "value": "standard", "type": "string" },
              { "name": "sla", "value": "24h", "type": "string" }
            ],
            "success?": {
              "log": { "message": "Normal ticket routed to standard queue" }
            }
          }
        },
        "low?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "queue", "value": "backlog", "type": "string" },
              { "name": "sla", "value": "1w", "type": "string" }
            ],
            "success?": {
              "log": { "message": "Low priority ticket added to backlog" }
            }
          }
        }
      }
    }
  ]
}
```

---

## 11. Edge Cases & Gotchas

### Gotcha 1: No Flat Sequential Node References

**WRONG:**
```json
{
  "workflow": [
    { "filter": { "passed?": "sort" } },
    { "sort": { "success?": "log" } },
    { "log": { "message": "done" } }
  ]
}
```

**CORRECT:**
```json
{
  "workflow": [
    {
      "filter": {
        "passed?": {
          "sort": {
            "success?": {
              "log": { "message": "done" }
            }
          }
        }
      }
    }
  ]
}
```

### Gotcha 2: Edge with Null = End Execution

```json
{
  "logic": {
    "true?": { ... },
    "false?": null    // Ends execution if false
  }
}
```

### Gotcha 3: Loop Exit Conditions

```json
{
  "logic...": {
    "operation": "less",
    "values": ["$.index", "$.maxIndex"],
    "true?": [ ... ],   // Continue looping
    "false?": null      // Exit loop
  }
}
```

### Gotcha 4: State References Not Found

```json
{
  "log": {
    "message": "Name: $.user.name"
  }
}
```

If `state.user.name` doesn't exist: `"Name: undefined"`

### Gotcha 5: Node Type Case Sensitivity

```json
{ "editFields": {...} }   // OK
{ "EditFields": {...} }   // FAIL - NODE_TYPE_NOT_FOUND
```

### Gotcha 6: Multiple Workflow Entries Execute Sequentially

```json
{
  "workflow": [
    { "$.step": 1 },
    { "log": { "message": "Step $.step" } },
    { "$.step": 2 },
    { "log": { "message": "Step $.step" } }
  ]
}
```

These execute in order: set step=1, log, set step=2, log.

---

## 12. Troubleshooting Guide

### Error: "NODE_TYPE_NOT_FOUND"

**Cause**: Using a node type that isn't registered.

**Fix**: Use only registered node types from `@workscript/nodes`:
- `math`, `logic`, `filter`, `sort`, `editFields`, `validateData`, `log`, etc.

### Error: "INVALID_STATE_SETTER_SYNTAX"

**Cause**: Invalid `$.path` format.

**Fix**:
```json
{ "$.user.name": "Alice" }     // Correct
{ "$.user-name": "Alice" }     // Wrong (hyphen)
{ "$.user[0]": "Alice" }       // Wrong (brackets)
```

### Error: "Loop limit exceeded"

**Cause**: Loop ran more than 1000 iterations.

**Fix**: Ensure your loop has a proper exit condition (`false?`: null`).

### Workflow doesn't execute expected path

**Cause**: Likely using flat sequential references instead of inline configuration.

**Fix**: Ensure all edge targets contain inline node configuration, not string references.

---

## 13. Complete Examples

### Example 1: User Registration Flow

```json
{
  "id": "user-registration",
  "name": "User Registration Workflow",
  "version": "1.0.0",
  "description": "Complete user registration with validation",
  "initialState": {
    "input": {
      "email": "john@example.com",
      "password": "secret123",
      "name": "John Doe"
    }
  },
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email", "password", "name"],
        "valid?": {
          "validateData": {
            "validationType": "pattern",
            "patternValidations": [
              {
                "field": "email",
                "pattern": "^[^@]+@[^@]+\\.[^@]+$",
                "errorMessage": "Invalid email format"
              }
            ],
            "valid?": {
              "database": {
                "operation": "find",
                "table": "users",
                "query": { "email": "$.input.email" },
                "found?": {
                  "editFields": {
                    "mode": "manual_mapping",
                    "fieldsToSet": [
                      { "name": "error", "value": "Email already registered", "type": "string" },
                      { "name": "success", "value": false, "type": "boolean" }
                    ],
                    "success?": {
                      "log": { "message": "Registration failed: $.error" }
                    }
                  }
                },
                "not_found?": {
                  "auth": {
                    "operation": "hash",
                    "data": "$.input.password",
                    "success?": {
                      "database": {
                        "operation": "insert",
                        "table": "users",
                        "data": {
                          "email": "$.input.email",
                          "password": "$.hashedPassword",
                          "name": "$.input.name"
                        },
                        "success?": {
                          "editFields": {
                            "mode": "manual_mapping",
                            "fieldsToSet": [
                              { "name": "success", "value": true, "type": "boolean" },
                              { "name": "userId", "value": "$.dbInserted.id", "type": "string" }
                            ],
                            "success?": {
                              "log": { "message": "User registered successfully: $.userId" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "invalid?": {
              "log": { "message": "Email validation failed: $.validationErrors" }
            }
          }
        },
        "invalid?": {
          "log": { "message": "Missing required fields: $.validationErrors" }
        }
      }
    }
  ]
}
```

### Example 2: ETL Data Pipeline

```json
{
  "id": "etl-pipeline",
  "name": "ETL Data Pipeline",
  "version": "1.0.0",
  "description": "Extract, Transform, Load data pipeline",
  "initialState": {
    "sourceTable": "raw_events",
    "targetTable": "processed_events"
  },
  "workflow": [
    {
      "log": { "message": "Starting ETL pipeline..." }
    },
    {
      "database": {
        "operation": "list",
        "table": "$.sourceTable",
        "success?": {
          "filter": {
            "items": "$.dbRecords",
            "conditions": [
              { "field": "status", "dataType": "string", "operation": "notEquals", "value": "invalid" },
              { "field": "data", "dataType": "object", "operation": "isNotEmpty" }
            ],
            "matchMode": "all",
            "passed?": {
              "removeDuplicates": {
                "operation": "current_input",
                "compareMode": "selected_fields",
                "fieldsToCompare": ["eventId"],
                "kept?": {
                  "sort": {
                    "type": "simple",
                    "fieldsToSortBy": [
                      { "fieldName": "timestamp", "order": "descending" }
                    ],
                    "success?": {
                      "limit": {
                        "items": "$.sortedItems",
                        "maxItems": 1000,
                        "success?": {
                          "summarize": {
                            "fieldsToSummarize": [
                              { "fieldToAggregate": "value", "aggregation": "sum", "outputFieldName": "totalValue" },
                              { "fieldToAggregate": "eventId", "aggregation": "count", "outputFieldName": "eventCount" }
                            ],
                            "fieldsToSplitBy": ["category"],
                            "success?": {
                              "editFields": {
                                "mode": "manual_mapping",
                                "fieldsToSet": [
                                  { "name": "pipelineComplete", "value": true, "type": "boolean" },
                                  { "name": "processedAt", "value": "$.timestamp", "type": "string" }
                                ],
                                "success?": {
                                  "log": {
                                    "message": "ETL complete. Processed $.eventCount events. Total value: $.totalValue"
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "filtered?": {
              "log": { "message": "No valid records to process" }
            }
          }
        },
        "error?": {
          "log": { "message": "Failed to read source data" }
        }
      }
    }
  ]
}
```

### Example 3: AI Content Processor with Loop

```json
{
  "id": "ai-content-processor",
  "name": "AI Content Processing",
  "version": "1.0.0",
  "description": "Process multiple articles using AI",
  "initialState": {
    "articles": [
      { "id": 1, "title": "Tech News", "content": "Technology is advancing..." },
      { "id": 2, "title": "Business Update", "content": "Markets are growing..." }
    ],
    "index": 0,
    "summaries": []
  },
  "workflow": [
    {
      "log": { "message": "Starting AI content processing..." }
    },
    {
      "logic...": {
        "operation": "less",
        "values": ["$.index", 2],
        "true?": [
          {
            "ask-ai": {
              "userPrompt": "Summarize this article in one sentence: $.articles[$.index].content",
              "model": "openai/gpt-4o-mini",
              "systemPrompt": "You are a professional content summarizer. Be concise.",
              "success?": {
                "editFields": {
                  "mode": "manual_mapping",
                  "fieldsToSet": [
                    { "name": "currentSummary", "value": "$.aiResponse", "type": "string" }
                  ],
                  "success?": {
                    "log": {
                      "message": "Processed article $.index: $.currentSummary"
                    }
                  }
                }
              },
              "error?": {
                "log": {
                  "message": "AI processing failed for article $.index"
                }
              }
            }
          },
          { "$.index": "$.index + 1" }
        ],
        "false?": null
      }
    },
    {
      "log": {
        "message": "AI processing complete. Processed $.index articles."
      }
    }
  ]
}
```

### Example 4: Multi-Branch Decision Tree

```json
{
  "id": "decision-tree",
  "name": "Order Processing Decision Tree",
  "version": "1.0.0",
  "description": "Process orders based on multiple criteria",
  "initialState": {
    "order": {
      "total": 1500,
      "customerType": "premium",
      "items": 5
    }
  },
  "workflow": [
    {
      "logic": {
        "operation": "greater",
        "values": ["$.order.total", 1000],
        "true?": {
          "logic": {
            "operation": "equal",
            "values": ["$.order.customerType", "premium"],
            "true?": {
              "editFields": {
                "mode": "manual_mapping",
                "fieldsToSet": [
                  { "name": "discount", "value": 20, "type": "number" },
                  { "name": "shipping", "value": "free", "type": "string" },
                  { "name": "priority", "value": "high", "type": "string" }
                ],
                "success?": {
                  "log": {
                    "message": "Premium high-value order: $.discount% discount, $.shipping shipping"
                  }
                }
              }
            },
            "false?": {
              "editFields": {
                "mode": "manual_mapping",
                "fieldsToSet": [
                  { "name": "discount", "value": 10, "type": "number" },
                  { "name": "shipping", "value": "free", "type": "string" },
                  { "name": "priority", "value": "normal", "type": "string" }
                ],
                "success?": {
                  "log": {
                    "message": "Standard high-value order: $.discount% discount"
                  }
                }
              }
            }
          }
        },
        "false?": {
          "logic": {
            "operation": "equal",
            "values": ["$.order.customerType", "premium"],
            "true?": {
              "editFields": {
                "mode": "manual_mapping",
                "fieldsToSet": [
                  { "name": "discount", "value": 5, "type": "number" },
                  { "name": "shipping", "value": "discounted", "type": "string" },
                  { "name": "priority", "value": "normal", "type": "string" }
                ],
                "success?": {
                  "log": {
                    "message": "Premium regular order: $.discount% discount"
                  }
                }
              }
            },
            "false?": {
              "editFields": {
                "mode": "manual_mapping",
                "fieldsToSet": [
                  { "name": "discount", "value": 0, "type": "number" },
                  { "name": "shipping", "value": "standard", "type": "string" },
                  { "name": "priority", "value": "low", "type": "string" }
                ],
                "success?": {
                  "log": {
                    "message": "Standard order: no discount, $.shipping shipping"
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
      "minItems": 1
    }
  }
}
```

## Appendix B: Registered Node Types

All node types from `@workscript/nodes`:

**Core:**
- `math`, `logic`, `transform`, `log`, `empty`, `__state_setter__`

**AI & Orchestration:**
- `ask-ai`, `runWorkflow`

**Data Manipulation:**
- `filter`, `sort`, `aggregate`, `switch`, `splitOut`, `limit`
- `editFields`, `summarize`, `transformObject`, `jsonExtract`
- `removeDuplicates`, `validateData`, `compareDatasets`, `dateTime`
- `stringOperations`, `mathOperations`, `arrayUtilities`, `objectUtilities`
- `extractText`, `calculateField`

**Server:**
- `filesystem`, `database`, `auth`

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

### Inline Edge Configuration (STANDARD PATTERN)
```json
{
  "nodeType": {
    "config": "...",
    "success?": {
      "nextNodeType": {
        "config": "...",
        "success?": { ... }
      }
    },
    "error?": {
      "log": { "message": "Error occurred" }
    }
  }
}
```

### State Syntax
```
$.key              -> state.key
$.nested.path      -> state.nested.path
{ "$.path": val }  -> Set state.path = val
```

### Loop Syntax
```json
{
  "nodeType...": {
    "edge?": [ ... ],    // Continue loop
    "exit?": null        // Exit loop
  }
}
```

### Edge Values
```
{ ... }    -> Execute inline node
[ ... ]    -> Execute sequence of inline nodes
null       -> End execution / exit loop
```

---

*Document Version: 3.0.0*
*Last Updated: November 2025*
*Workscript Engine v1.0.0*

**REMEMBER:**
1. **All nodes must be pre-registered** - No custom node types in workflows
2. **Use inline configuration** - Configure next nodes INSIDE edges, not as flat sequential steps
