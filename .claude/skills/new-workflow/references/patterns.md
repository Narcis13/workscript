# Workflow Patterns Reference

Common workflow patterns with complete, production-ready examples.

## Table of Contents

1. [Data Processing Pipeline](#1-data-processing-pipeline)
2. [Conditional Branching](#2-conditional-branching)
3. [Error Handling Chain](#3-error-handling-chain)
4. [Loop with Counter](#4-loop-with-counter)
5. [File Read-Process-Write](#5-file-read-process-write)
6. [Multi-Path Switch Routing](#6-multi-path-switch-routing)
7. [AI Content Processing](#7-ai-content-processing)
8. [Validation Pipeline](#8-validation-pipeline)

---

## 1. Data Processing Pipeline

**Use case:** Filter, deduplicate, sort, and summarize data.

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
                      "log": { "message": "Pipeline complete. Average score: $.avgScore" }
                    }
                  }
                }
              }
            }
          }
        },
        "filtered?": {
          "log": { "message": "No active records found" }
        }
      }
    }
  ]
}
```

**State keys written:** `filterPassed`, `filterFiltered`, `filterStats`, `keptItems`, `sortedItems`, `summarizeResult`

---

## 2. Conditional Branching

**Use case:** Execute different paths based on conditions.

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
              "log": { "message": "Admin {{$.user.name}} granted full permissions" }
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
              "log": { "message": "User {{$.user.name}} granted limited permissions" }
            }
          }
        }
      }
    }
  ]
}
```

**State keys written:** `logicResult`, `editFieldsResult`, `fieldsModified`

---

## 3. Error Handling Chain

**Use case:** Handle database operations with comprehensive error handling.

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
              "log": { "message": "User $.dbRecord.name is valid" }
            },
            "invalid?": {
              "log": { "message": "User data incomplete: $.validationErrors" }
            }
          }
        },
        "not_found?": {
          "log": { "message": "User $.userId not found in database" }
        },
        "error?": {
          "log": { "message": "Database connection error" }
        }
      }
    }
  ]
}
```

**State keys written:** `dbRecord`, `validationResult`, `validationErrors`

---

## 4. Loop with Counter

**Use case:** Process items iteratively with a counter.

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
          {
            "log": { "message": "Processing item {{$.index}}" }
          },
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

**Key points:**
- `logic...` suffix creates a loop
- `false?`: null` exits the loop
- State setters (`$.index`) update counter

---

## 5. File Read-Process-Write

**Use case:** Read file, process content, write output.

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
                          "log": { "message": "Processed and saved to $.outputPath" }
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
          "log": { "message": "Input file not found: $.inputPath" }
        }
      }
    }
  ]
}
```

**State keys written:** `fileContent`, `transformResult`, `filterPassed`, `fileWritten`

---

## 6. Multi-Path Switch Routing

**Use case:** Route to different paths based on expression.

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

**Key points:**
- `switch` with `mode: "expression"` evaluates JavaScript
- Edge names match expression output (`critical?`, `normal?`, `low?`)
- Can also use `mode: "rules"` for condition-based routing

---

## 7. AI Content Processing

**Use case:** Use AI to process content.

```json
{
  "id": "ai-content",
  "name": "AI Content Processing",
  "version": "1.0.0",
  "initialState": {
    "inputText": "Technology is rapidly changing how we work and communicate."
  },
  "workflow": [
    {
      "ask-ai": {
        "userPrompt": "Summarize this text in one sentence: $.inputText",
        "model": "openai/gpt-4o-mini",
        "systemPrompt": "You are a professional content summarizer. Be concise.",
        "success?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "summary", "value": "$.aiResponse", "type": "string" }
            ],
            "success?": {
              "log": { "message": "AI Summary: {{$.summary}}" }
            }
          }
        },
        "error?": {
          "log": { "message": "AI processing failed" }
        }
      }
    }
  ]
}
```

**State keys written:** `aiResponse`, `aiResponseData`, `summary`

**AI Node Requirements:**
- `userPrompt`: Required - the prompt to send
- `model`: Required - model identifier (e.g., `openai/gpt-4o-mini`)
- `systemPrompt`: Optional - system message for context

---

## 8. Validation Pipeline

**Use case:** Validate data before database insert.

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
                    ]
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
                              "log": { "message": "User registered: {{$.userId}}" }
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

**Key points:**
- Chain multiple `validateData` nodes for different validation types
- Use `database` with `found?`/`not_found?` for uniqueness checks
- `auth` node for password hashing before storage

---

## Pattern Selection Guide

| Use Case | Pattern |
|----------|---------|
| Process data arrays | Data Processing Pipeline |
| Branch on conditions | Conditional Branching |
| Handle errors gracefully | Error Handling Chain |
| Iterate N times | Loop with Counter |
| File ETL | File Read-Process-Write |
| Multi-way routing | Multi-Path Switch Routing |
| AI text processing | AI Content Processing |
| Form validation | Validation Pipeline |

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
