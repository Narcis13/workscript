# Workflow Patterns Reference

Common workflow patterns with complete, production-ready examples.

**IMPORTANT:** These patterns follow the "flat by default" principle - use the workflow array for sequential operations and reserve edges for actual branching (conditionals, loops, error handling).

## Table of Contents

1. [Data Processing Pipeline (Flat)](#1-data-processing-pipeline-flat)
2. [Conditional Branching (Edges Required)](#2-conditional-branching-edges-required)
3. [Error Handling Chain (Flat + Error Edges)](#3-error-handling-chain-flat--error-edges)
4. [Loop with Counter (Edges Required)](#4-loop-with-counter-edges-required)
5. [File Read-Process-Write (Flat)](#5-file-read-process-write-flat)
6. [Multi-Path Switch Routing (Edges Required)](#6-multi-path-switch-routing-edges-required)
7. [AI Content Processing (Flat)](#7-ai-content-processing-flat)
8. [Validation Pipeline (Mixed)](#8-validation-pipeline-mixed)
9. [Database Find-or-Create (Edges Required)](#9-database-find-or-create-edges-required)
10. [AI with JSON Validation (Guards Required)](#10-ai-with-json-validation-guards-required)
11. [Guarded API Pipeline (Defense Required)](#11-guarded-api-pipeline-defense-required)

---

## 1. Data Processing Pipeline (Flat)

**Use case:** Filter, deduplicate, sort, and summarize data sequentially.

```json
{
  "id": "data-pipeline-flat",
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
        "filtered?": {
          "log": { "message": "No active records found" }
        },
        "error?": {
          "log": { "message": "Filter error: {{$.error}}" }
        }
      }
    },
    {
      "removeDuplicates": {
        "operation": "current_input",
        "compareMode": "selected_fields",
        "fieldsToCompare": ["name"],
        "error?": {
          "log": { "message": "Dedup error: {{$.error}}" }
        }
      }
    },
    {
      "sort": {
        "type": "simple",
        "fieldsToSortBy": [
          { "fieldName": "score", "order": "descending" }
        ],
        "error?": {
          "log": { "message": "Sort error: {{$.error}}" }
        }
      }
    },
    {
      "summarize": {
        "fieldsToSummarize": [
          { "fieldToAggregate": "score", "aggregation": "average", "outputFieldName": "avgScore" }
        ]
      }
    },
    {
      "log": { "message": "Pipeline complete. Average score: {{$.avgScore}}" }
    }
  ]
}
```

**Why flat:** Each step runs unconditionally after the previous. Error handling is per-node, not branching.

**State keys written:** `filterPassed`, `filterFiltered`, `filterStats`, `keptItems`, `sortedItems`, `summarizeResult`

---

## 2. Conditional Branching (Edges Required)

**Use case:** Execute different paths based on conditions. **Edges are necessary here.**

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
            ]
          }
        },
        "false?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "permissions", "value": "limited", "type": "string" },
              { "name": "accessLevel", "value": 1, "type": "number" }
            ]
          }
        }
      }
    },
    {
      "log": { "message": "User {{$.user.name}} granted {{$.permissions}} permissions" }
    }
  ]
}
```

**Why edges:** `true?` and `false?` lead to different logic - this is actual branching.

**State keys written:** `logicResult`, `editFieldsResult`, `fieldsModified`

---

## 3. Error Handling Chain (Flat + Error Edges)

**Use case:** Sequential operations with per-node error handling.

```json
{
  "id": "error-handling-flat",
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
        "not_found?": {
          "log": { "message": "User {{$.userId}} not found in database" }
        },
        "error?": {
          "log": { "message": "Database connection error: {{$.error}}" }
        }
      }
    },
    {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email", "name"],
        "invalid?": {
          "log": { "message": "User data incomplete: {{$.validationErrors}}" }
        },
        "error?": {
          "log": { "message": "Validation error: {{$.error}}" }
        }
      }
    },
    {
      "log": { "message": "User {{$.dbRecord.name}} is valid and ready" }
    }
  ]
}
```

**Why flat + edges:** Sequential flow, but `not_found?`, `invalid?`, and `error?` handle edge cases.

**State keys written:** `dbRecord`, `validationResult`, `validationErrors`

---

## 4. Loop with Counter (Edges Required)

**Use case:** Process items iteratively with a counter. **Loops require edge nesting.**

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
      "log": { "message": "Starting loop..." }
    },
    {
      "logic...": {
        "operation": "less",
        "values": ["$.index", 5],
        "true?": [
          { "log": { "message": "Processing item {{$.index}}" } },
          { "$.index": "$.index + 1" },
          { "$.processed": "$.processed + 1" }
        ],
        "false?": null
      }
    },
    {
      "log": { "message": "Loop complete. Processed {{$.processed}} items." }
    }
  ]
}
```

**Why edges:** Loops inherently require `true?`/`false?` (or `continue?`/`exit?`) to control iteration.

**Key points:**
- `logic...` suffix creates a loop
- `false?`: null` exits the loop
- State setters (`$.index`) update counter

---

## 5. File Read-Process-Write (Flat)

**Use case:** Read file, process content, write output sequentially.

```json
{
  "id": "file-processing-flat",
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
        "not_exists?": {
          "log": { "message": "Input file not found: {{$.inputPath}}" }
        },
        "error?": {
          "log": { "message": "Read error: {{$.error}}" }
        }
      }
    },
    {
      "transform": {
        "operation": "parse",
        "data": "$.fileContent",
        "error?": {
          "log": { "message": "Parse error: {{$.error}}" }
        }
      }
    },
    {
      "filter": {
        "items": "$.transformResult",
        "conditions": [
          { "field": "valid", "dataType": "boolean", "operation": "true" }
        ]
      }
    },
    {
      "transform": {
        "operation": "stringify",
        "data": "$.filterPassed"
      }
    },
    {
      "filesystem": {
        "operation": "write",
        "path": "$.outputPath",
        "content": "$.transformResult",
        "error?": {
          "log": { "message": "Write error: {{$.error}}" }
        }
      }
    },
    {
      "log": { "message": "Processed and saved to {{$.outputPath}}" }
    }
  ]
}
```

**Why flat:** Sequential pipeline - read → parse → filter → stringify → write → log.

**State keys written:** `fileContent`, `transformResult`, `filterPassed`, `fileWritten`

---

## 6. Multi-Path Switch Routing (Edges Required)

**Use case:** Route to different paths based on expression. **Switch requires edge nesting.**

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
            ]
          }
        },
        "normal?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "queue", "value": "standard", "type": "string" },
              { "name": "sla", "value": "24h", "type": "string" }
            ]
          }
        },
        "low?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "queue", "value": "backlog", "type": "string" },
              { "name": "sla", "value": "1w", "type": "string" }
            ]
          }
        }
      }
    },
    {
      "log": { "message": "Ticket routed to {{$.queue}} queue with {{$.sla}} SLA" }
    }
  ]
}
```

**Why edges:** Switch nodes route to different paths - each edge is a distinct code path.

**Key points:**
- `switch` with `mode: "expression"` evaluates JavaScript
- Edge names match expression output (`critical?`, `normal?`, `low?`)
- Can also use `mode: "rules"` for condition-based routing

---

## 7. AI Content Processing (Flat)

**Use case:** Use AI to process content sequentially.

```json
{
  "id": "ai-content-flat",
  "name": "AI Content Processing",
  "version": "1.0.0",
  "initialState": {
    "inputText": "Technology is rapidly changing how we work and communicate."
  },
  "workflow": [
    {
      "ask-ai": {
        "userPrompt": "Summarize this text in one sentence: {{$.inputText}}",
        "model": "openai/gpt-4o-mini",
        "systemPrompt": "You are a professional content summarizer. Be concise.",
        "error?": {
          "log": { "message": "AI processing failed: {{$.error}}" }
        }
      }
    },
    {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "summary", "value": "$.aiResponse", "type": "string" }
        ]
      }
    },
    {
      "log": { "message": "AI Summary: {{$.summary}}" }
    }
  ]
}
```

**Why flat:** Simple sequential pipeline - AI call → store result → log.

**State keys written:** `aiResponse`, `aiResponseData`, `summary`

---

## 8. Validation Pipeline (Mixed)

**Use case:** Validate data with branching for valid/invalid paths.

```json
{
  "id": "validation-pipeline",
  "name": "User Registration Validation",
  "version": "1.0.0",
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
        "invalid?": {
          "log": { "message": "Missing required fields: {{$.validationErrors}}" }
        }
      }
    },
    {
      "validateData": {
        "validationType": "pattern",
        "patternValidations": [
          {
            "field": "email",
            "pattern": "^[^@]+@[^@]+\\.[^@]+$",
            "errorMessage": "Invalid email format"
          }
        ],
        "invalid?": {
          "log": { "message": "Email validation failed: {{$.validationErrors}}" }
        }
      }
    },
    {
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
            ]
          }
        },
        "not_found?": [
          {
            "auth": {
              "operation": "hash",
              "data": "$.input.password"
            }
          },
          {
            "database": {
              "operation": "insert",
              "table": "users",
              "data": {
                "email": "$.input.email",
                "password": "$.hashedPassword",
                "name": "$.input.name"
              }
            }
          },
          {
            "editFields": {
              "mode": "manual_mapping",
              "fieldsToSet": [
                { "name": "success", "value": true, "type": "boolean" },
                { "name": "userId", "value": "$.dbInserted.id", "type": "string" }
              ]
            }
          }
        ]
      }
    },
    {
      "log": { "message": "Registration result: success={{$.success}}" }
    }
  ]
}
```

**Why mixed:** Sequential validation steps, but `found?`/`not_found?` require branching for find-or-create logic.

---

## 9. Database Find-or-Create (Edges Required)

**Use case:** Find a record or create it if not found. **Edges required for this pattern.**

```json
{
  "id": "find-or-create",
  "name": "Find or Create User",
  "version": "1.0.0",
  "initialState": {
    "email": "alice@example.com",
    "defaultName": "New User"
  },
  "workflow": [
    {
      "database": {
        "operation": "find",
        "table": "users",
        "query": { "email": "$.email" },
        "found?": {
          "log": { "message": "Found existing user: {{$.dbRecord.name}}" }
        },
        "not_found?": {
          "database": {
            "operation": "insert",
            "table": "users",
            "data": {
              "email": "$.email",
              "name": "$.defaultName"
            },
            "success?": {
              "log": { "message": "Created new user: {{$.dbInserted.name}}" }
            }
          }
        },
        "error?": {
          "log": { "message": "Database error: {{$.error}}" }
        }
      }
    }
  ]
}
```

**Why edges:** `found?` and `not_found?` lead to fundamentally different operations.

---

## Pattern Selection Guide

| Use Case | Pattern | Style |
|----------|---------|-------|
| Process data arrays | Data Processing Pipeline | **Flat** |
| Branch on conditions | Conditional Branching | Edges |
| Handle errors gracefully | Error Handling Chain | **Flat + error edges** |
| Iterate N times | Loop with Counter | Edges |
| File ETL | File Read-Process-Write | **Flat** |
| Multi-way routing | Multi-Path Switch Routing | Edges |
| AI text processing | AI Content Processing | **Flat** |
| Form validation | Validation Pipeline | Mixed |
| Find or create records | Database Find-or-Create | Edges |

## When to Use Each Style

### Use FLAT (Workflow Array)

- Sequential operations that always run in order
- Pipeline processing (read → transform → write)
- Operations where "success" just means "continue"
- Adding error handling to sequential flows

### Use EDGES (Nesting)

- Conditional logic (`true?`/`false?`)
- Loops (`nodeType...` with `continue?`/`exit?`)
- Find-or-create patterns (`found?`/`not_found?`)
- Validation branching (`valid?`/`invalid?`)
- Multi-way routing (`switch` node)
- When different branches do completely different things

## Initial State Templates

### User Data
```json
{
  "user": {
    "id": "123",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "admin"
  }
}
```

### Product List
```json
{
  "products": [
    { "id": 1, "name": "Widget", "price": 29.99, "inStock": true },
    { "id": 2, "name": "Gadget", "price": 49.99, "inStock": false }
  ]
}
```

### API Request
```json
{
  "request": {
    "method": "POST",
    "endpoint": "/api/users",
    "body": { "name": "Bob" }
  }
}
```

### Loop Counter
```json
{
  "items": ["a", "b", "c"],
  "index": 0,
  "processed": 0
}
```

---

## 10. AI with JSON Validation (Guards Required)

**Use case:** Call AI for structured output and validate the response is valid JSON with expected schema. **Guards prevent runtime errors from malformed AI responses.**

```json
{
  "id": "ai-json-guarded",
  "name": "AI Structured Output with Validation",
  "version": "1.0.0",
  "description": "Extract structured data from text with full validation guards",
  "initialState": {
    "text": "John Smith is the CEO of Acme Corp. Contact: john@acme.com"
  },
  "workflow": [
    {
      "ask-ai": {
        "userPrompt": "Extract person info from: {{$.text}}\n\nReturn ONLY valid JSON, no markdown.",
        "model": "openai/gpt-4o-mini",
        "systemPrompt": "You extract structured data. Return ONLY valid JSON in this format: {\"name\": string, \"title\": string, \"company\": string, \"email\": string}",
        "error?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "extractionFailed", "value": true, "type": "boolean" },
              { "name": "failureReason", "value": "AI call failed", "type": "string" }
            ]
          }
        }
      }
    },
    {
      "validateData": {
        "validationType": "json",
        "data": "$.aiResponse",
        "valid?": {
          "validateData": {
            "validationType": "required_fields",
            "data": "$.parsedJson",
            "requiredFields": ["name", "email"],
            "valid?": {
              "validateData": {
                "validationType": "pattern",
                "data": "$.parsedJson",
                "patternValidations": [
                  { "field": "email", "pattern": "^[^@]+@[^@]+\\.[^@]+$", "errorMessage": "Invalid email format" }
                ],
                "valid?": {
                  "editFields": {
                    "mode": "manual_mapping",
                    "fieldsToSet": [
                      { "name": "extractedPerson", "value": "$.parsedJson", "type": "object" },
                      { "name": "extractionSuccess", "value": true, "type": "boolean" }
                    ]
                  }
                },
                "invalid?": {
                  "editFields": {
                    "mode": "manual_mapping",
                    "fieldsToSet": [
                      { "name": "extractionFailed", "value": true, "type": "boolean" },
                      { "name": "failureReason", "value": "Email format invalid", "type": "string" }
                    ]
                  }
                }
              }
            },
            "invalid?": {
              "editFields": {
                "mode": "manual_mapping",
                "fieldsToSet": [
                  { "name": "extractionFailed", "value": true, "type": "boolean" },
                  { "name": "failureReason", "value": "Missing required fields in AI response", "type": "string" }
                ]
              }
            }
          }
        },
        "invalid?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "extractionFailed", "value": true, "type": "boolean" },
              { "name": "failureReason", "value": "AI did not return valid JSON", "type": "string" }
            ]
          }
        }
      }
    },
    {
      "logic": {
        "operation": "equal",
        "values": ["$.extractionSuccess", true],
        "true?": {
          "log": { "message": "Successfully extracted: {{$.extractedPerson.name}} ({{$.extractedPerson.email}})" }
        },
        "false?": {
          "log": { "message": "Extraction failed: {{$.failureReason}}" }
        }
      }
    }
  ]
}
```

**Why guards:** AI responses can be malformed JSON, missing fields, or have invalid data. Each layer of validation prevents runtime errors:
1. `json` validation ensures parseable JSON
2. `required_fields` ensures expected structure
3. `pattern` validation ensures data quality

**State keys written:** `aiResponse`, `parsedJson`, `validationResult`, `validationErrors`, `extractedPerson`, `extractionSuccess`, `extractionFailed`, `failureReason`

---

## 11. Guarded API Pipeline (Defense Required)

**Use case:** Fetch data from external API with full defensive validation. **Guards protect against malformed responses and network errors.**

```json
{
  "id": "api-guarded-pipeline",
  "name": "Guarded API Data Pipeline",
  "version": "1.0.0",
  "description": "Fetch and process API data with comprehensive guards",
  "initialState": {
    "apiUrl": "https://api.example.com/users",
    "expectedFields": ["id", "name", "email"]
  },
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "data": { "url": "$.apiUrl" },
        "requiredFields": ["url"],
        "invalid?": {
          "log": { "message": "Missing API URL in configuration" }
        },
        "error?": {
          "log": { "message": "Config validation error: {{$.error}}" }
        }
      }
    },
    {
      "fetchApi": {
        "url": "$.apiUrl",
        "method": "GET",
        "headers": { "Accept": "application/json" },
        "timeout": 30000,
        "success?": {
          "log": { "message": "API returned status {{$.apiStatus}}" }
        },
        "clientError?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "pipelineError", "value": "Client error (4xx)", "type": "string" },
              { "name": "errorStatus", "value": "$.apiStatus", "type": "number" }
            ]
          }
        },
        "serverError?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "pipelineError", "value": "Server error (5xx)", "type": "string" },
              { "name": "errorStatus", "value": "$.apiStatus", "type": "number" }
            ]
          }
        },
        "error?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "pipelineError", "value": "Network or timeout error", "type": "string" }
            ]
          }
        }
      }
    },
    {
      "validateData": {
        "validationType": "type_check",
        "data": "$.apiResponse",
        "typeChecks": [
          { "field": "data", "expectedType": "array" }
        ],
        "valid?": {
          "logic": {
            "operation": "greater",
            "values": ["$.apiResponse.data.length", 0],
            "true?": {
              "log": { "message": "Received {{$.apiResponse.data.length}} records" }
            },
            "false?": {
              "editFields": {
                "mode": "manual_mapping",
                "fieldsToSet": [
                  { "name": "pipelineWarning", "value": "API returned empty data array", "type": "string" }
                ]
              }
            }
          }
        },
        "invalid?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "pipelineError", "value": "API response missing data array", "type": "string" }
            ]
          }
        }
      }
    },
    {
      "filter": {
        "items": "$.apiResponse.data",
        "conditions": [
          { "field": "email", "dataType": "string", "operation": "exists" }
        ],
        "passed?": {
          "log": { "message": "{{$.filterStats.passedCount}} records have valid email" }
        },
        "filtered?": {
          "log": { "message": "No records with valid email found" }
        },
        "error?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "pipelineError", "value": "Filter operation failed", "type": "string" }
            ]
          }
        }
      }
    },
    {
      "log": { "message": "Pipeline complete. Processed {{$.filterStats.passedCount}} valid records." }
    }
  ]
}
```

**Why guards:**
1. **Config validation** - Ensures required configuration exists before API call
2. **HTTP status handling** - Separate edges for client/server errors
3. **Response structure** - Validates expected array structure
4. **Empty array check** - Handles edge case of valid but empty response
5. **Field existence filter** - Ensures required fields exist before processing

**Guard layers:**
- Pre-call: URL validation
- Post-call: HTTP status handling, response structure validation
- Post-filter: Record quality validation

**State keys written:** `apiResponse`, `apiStatus`, `validationResult`, `filterPassed`, `filterStats`, `pipelineError`, `pipelineWarning`

---

## Guard Pattern Selection Guide

| Risk | Guard Type | Node | Example |
|------|------------|------|---------|
| Missing input | Required fields | `validateData` | Validate config before use |
| Malformed JSON | JSON validation | `validateData` | Check AI/API response |
| Wrong types | Type check | `validateData` | Verify numbers before math |
| Invalid format | Pattern validation | `validateData` | Email, phone, URL formats |
| Empty arrays | Length check | `logic` | Before loops or filter |
| Network failure | Error edges | `fetchApi` | `error?`, `clientError?` |
| Database miss | Not found edge | `database` | `not_found?` handling |
| File missing | Not exists edge | `filesystem` | `not_exists?` handling |

## Anti-Pattern: Unguarded AI Response

❌ **WRONG** - No validation of AI response:

```json
{
  "workflow": [
    { "ask-ai": { "userPrompt": "Get JSON data...", "model": "..." } },
    { "filter": { "items": "$.aiResponse.results" } }
  ]
}
```

✅ **CORRECT** - Validate AI response structure:

```json
{
  "workflow": [
    { "ask-ai": { "userPrompt": "Get JSON data...", "model": "..." } },
    {
      "validateData": {
        "validationType": "json",
        "data": "$.aiResponse",
        "valid?": {
          "validateData": {
            "validationType": "required_fields",
            "data": "$.parsedJson",
            "requiredFields": ["results"],
            "valid?": {
              "filter": { "items": "$.parsedJson.results" }
            }
          }
        }
      }
    }
  ]
}
```
