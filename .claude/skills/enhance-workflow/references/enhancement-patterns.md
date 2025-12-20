# Workflow Enhancement Patterns

Detailed patterns for common workflow enhancement scenarios.

## Table of Contents

1. [Defensive Guard Patterns](#defensive-guard-patterns)
2. [Structure Flattening Patterns](#structure-flattening-patterns)
3. [Error Handling Patterns](#error-handling-patterns)
4. [Loop Safety Patterns](#loop-safety-patterns)
5. [State Management Patterns](#state-management-patterns)
6. [AI Response Handling Patterns](#ai-response-handling-patterns)

---

## Defensive Guard Patterns

### Pattern: Entry Point Validation

**Problem**: Workflow fails when required input fields are missing.

**Solution**: Add `validateData` with `required_fields` as first node.

```json
// BEFORE: No input validation
{
  "workflow": [
    {
      "database": {
        "operation": "find",
        "table": "users",
        "query": { "id": "$.input.userId" }
      }
    }
  ]
}

// AFTER: Input validated at entry
{
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "data": "$.input",
        "requiredFields": ["userId"],
        "invalid?": {
          "log": { "message": "Missing required input: {{$.validationErrors}}" }
        }
      }
    },
    {
      "database": {
        "operation": "find",
        "table": "users",
        "query": { "id": "$.input.userId" }
      }
    }
  ]
}
```

### Pattern: Type Validation Before Operations

**Problem**: Math or comparison operations fail on wrong types.

**Solution**: Add type validation before type-sensitive operations.

```json
// BEFORE: Assumes correct type
{
  "workflow": [
    {
      "math": {
        "operation": "multiply",
        "values": ["$.data.amount", 1.1]
      }
    }
  ]
}

// AFTER: Type validated first
{
  "workflow": [
    {
      "validateData": {
        "validationType": "type_check",
        "data": "$.data",
        "typeChecks": [
          { "field": "amount", "expectedType": "number" }
        ],
        "valid?": {
          "math": {
            "operation": "multiply",
            "values": ["$.data.amount", 1.1]
          }
        },
        "invalid?": {
          "log": { "message": "Amount must be a number: {{$.validationErrors}}" }
        }
      }
    }
  ]
}
```

### Pattern: Pattern Validation for Formats

**Problem**: Invalid email, phone, or other format causes downstream errors.

**Solution**: Add pattern validation with regex.

```json
{
  "validateData": {
    "validationType": "pattern",
    "data": "$.user",
    "patternValidations": [
      {
        "field": "email",
        "pattern": "^[^@]+@[^@]+\\.[^@]+$",
        "errorMessage": "Invalid email format"
      },
      {
        "field": "phone",
        "pattern": "^\\+?[0-9]{10,14}$",
        "errorMessage": "Invalid phone format"
      }
    ],
    "valid?": { ... },
    "invalid?": {
      "log": { "message": "Validation failed: {{$.validationErrors}}" }
    }
  }
}
```

---

## Structure Flattening Patterns

### Pattern: Sequential Success Chain to Flat

**Problem**: Deeply nested `success?` edges for sequential operations.

**Before**:
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
                  "log": { "message": "Done" }
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

**After**:
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
        "error?": { "log": { "message": "List failed: {{$.error}}" } }
      }
    },
    {
      "ask-ai": {
        "userPrompt": "Analyze...",
        "error?": { "log": { "message": "AI failed: {{$.error}}" } }
      }
    },
    {
      "log": { "message": "Done" }
    }
  ]
}
```

### Pattern: Extract Deep Branches to Separate Entries

**Problem**: Complex conditional logic creates deep nesting.

**Before**: 6+ levels of nesting in single entry
```json
{
  "workflow": [
    {
      "logic": {
        "true?": {
          "logic": {
            "true?": { "deeply": { "nested": { "code": {...} } } }
          }
        }
      }
    }
  ]
}
```

**After**: Multiple workflow entries
```json
{
  "workflow": [
    {
      "logic": {
        "operation": "equal",
        "values": ["$.condition1", true],
        "true?": {
          "editFields": {
            "fieldsToSet": [{ "name": "path", "value": "branch1", "type": "string" }]
          }
        },
        "false?": {
          "editFields": {
            "fieldsToSet": [{ "name": "path", "value": "branch2", "type": "string" }]
          }
        }
      }
    },
    {
      "switch": {
        "mode": "expression",
        "item": "$.path",
        "expression": "item",
        "branch1?": { ... },
        "branch2?": { ... }
      }
    }
  ]
}
```

---

## Error Handling Patterns

### Pattern: Comprehensive Error Edges

**Problem**: Fallible nodes lack error handling.

**Solution**: Add `error?` edges to all nodes that can fail.

**Fallible node types:**
- `database` - Connection, query errors
- `filesystem` - File not found, permissions
- `fetchApi` - Network, timeout, HTTP errors
- `ask-ai` - API errors, rate limits
- `auth` - Invalid credentials
- `validateData` - Validation failures
- `runWorkflow` - Sub-workflow errors

```json
{
  "database": {
    "operation": "find",
    "table": "users",
    "query": { "id": "$.userId" },
    "found?": { ... },
    "not_found?": {
      "log": { "message": "User not found: {{$.userId}}" }
    },
    "error?": {
      "editFields": {
        "fieldsToSet": [
          { "name": "errorType", "value": "DATABASE_ERROR", "type": "string" },
          { "name": "errorMessage", "value": "$.error", "type": "string" }
        ]
      }
    }
  }
}
```

### Pattern: Error Accumulation

**Problem**: Need to continue despite errors and report all at end.

**Solution**: Accumulate errors in state array.

```json
{
  "initialState": {
    "errors": []
  },
  "workflow": [
    {
      "database": {
        "operation": "find",
        "table": "users",
        "error?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              {
                "name": "errors",
                "value": "[...$.errors, { node: 'database', error: $.error }]",
                "type": "array"
              }
            ]
          }
        }
      }
    },
    {
      "fetchApi": {
        "url": "https://api.example.com",
        "error?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              {
                "name": "errors",
                "value": "[...$.errors, { node: 'fetchApi', error: $.error }]",
                "type": "array"
              }
            ]
          }
        }
      }
    },
    {
      "logic": {
        "operation": "greater",
        "values": ["$.errors.length", 0],
        "true?": {
          "log": { "message": "Completed with {{$.errors.length}} error(s)" }
        },
        "false?": {
          "log": { "message": "Completed successfully" }
        }
      }
    }
  ]
}
```

---

## Loop Safety Patterns

### Pattern: Array Length Guard

**Problem**: Loop crashes on empty or undefined array.

**Solution**: Check array exists and has items before looping.

```json
{
  "logic": {
    "operation": "and",
    "values": [
      { "operation": "greater", "values": ["$.items.length", 0] }
    ],
    "true?": {
      "logic...": {
        "operation": "less",
        "values": ["$.index", "$.items.length"],
        "true?": [
          { "log": { "message": "Processing {{$.index}}" } },
          { "$.index": "$.index + 1" }
        ],
        "false?": null
      }
    },
    "false?": {
      "log": { "message": "No items to process" }
    }
  }
}
```

### Pattern: Loop with Max Iterations Guard

**Problem**: Infinite loop risk.

**Solution**: Add secondary exit condition based on iteration count.

```json
{
  "initialState": {
    "items": [],
    "index": 0,
    "maxIterations": 100
  },
  "workflow": [
    {
      "logic...": {
        "operation": "and",
        "values": [
          { "operation": "less", "values": ["$.index", "$.items.length"] },
          { "operation": "less", "values": ["$.index", "$.maxIterations"] }
        ],
        "true?": [
          { "log": { "message": "Processing {{$.index}}" } },
          { "$.index": "$.index + 1" }
        ],
        "false?": null
      }
    },
    {
      "logic": {
        "operation": "greater_equal",
        "values": ["$.index", "$.maxIterations"],
        "true?": {
          "log": { "message": "Warning: Loop terminated at max iterations" }
        }
      }
    }
  ]
}
```

---

## State Management Patterns

### Pattern: Explicit State Naming

**Problem**: Relying on implicit node output state keys causes confusion.

**Solution**: Explicitly copy to well-named state keys.

```json
{
  "workflow": [
    {
      "filter": { "items": "$.rawData", "conditions": [...] }
    },
    {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "activeUsers", "value": "$.filterPassed", "type": "array" }
        ]
      }
    },
    {
      "sort": {
        "type": "simple",
        "fieldsToSortBy": [{ "fieldName": "createdAt", "order": "descending" }]
      }
    },
    {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "sortedActiveUsers", "value": "$.sortedItems", "type": "array" }
        ]
      }
    }
  ]
}
```

### Pattern: State Reset Before Reuse

**Problem**: State from previous operations interferes with current.

**Solution**: Reset state keys before reusing.

```json
{
  "workflow": [
    {
      "editFields": {
        "mode": "manual_mapping",
        "fieldsToSet": [
          { "name": "filterPassed", "value": null, "type": "null" },
          { "name": "filterFiltered", "value": null, "type": "null" }
        ]
      }
    },
    {
      "filter": { "items": "$.newData", "conditions": [...] }
    }
  ]
}
```

---

## AI Response Handling Patterns

### Pattern: Full JSON Validation Chain

**Problem**: AI returns invalid JSON or missing expected fields.

**Solution**: Chain JSON validation, then structure validation.

```json
{
  "workflow": [
    {
      "ask-ai": {
        "userPrompt": "Extract entities as JSON: {{$.text}}",
        "model": "openai/gpt-4o-mini",
        "systemPrompt": "Return ONLY valid JSON: {\"entities\": [{\"name\": string, \"type\": string}]}",
        "error?": {
          "editFields": {
            "fieldsToSet": [
              { "name": "aiError", "value": "$.error", "type": "string" }
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
            "requiredFields": ["entities"],
            "valid?": {
              "validateData": {
                "validationType": "type_check",
                "data": "$.parsedJson",
                "typeChecks": [
                  { "field": "entities", "expectedType": "array" }
                ],
                "valid?": {
                  "editFields": {
                    "fieldsToSet": [
                      { "name": "extractedEntities", "value": "$.parsedJson.entities", "type": "array" },
                      { "name": "extractionSuccess", "value": true, "type": "boolean" }
                    ]
                  }
                },
                "invalid?": {
                  "editFields": {
                    "fieldsToSet": [
                      { "name": "extractionError", "value": "entities must be array", "type": "string" }
                    ]
                  }
                }
              }
            },
            "invalid?": {
              "editFields": {
                "fieldsToSet": [
                  { "name": "extractionError", "value": "Missing entities field", "type": "string" }
                ]
              }
            }
          }
        },
        "invalid?": {
          "editFields": {
            "fieldsToSet": [
              { "name": "extractionError", "value": "AI returned invalid JSON", "type": "string" }
            ]
          }
        }
      }
    }
  ]
}
```

### Pattern: AI Response Retry

**Problem**: AI occasionally fails, needs retry logic.

**Solution**: Use state-based retry counter.

```json
{
  "initialState": {
    "aiRetries": 0,
    "maxRetries": 3
  },
  "workflow": [
    {
      "logic...": {
        "operation": "less",
        "values": ["$.aiRetries", "$.maxRetries"],
        "true?": [
          {
            "ask-ai": {
              "userPrompt": "...",
              "model": "openai/gpt-4o-mini",
              "error?": {
                "editFields": {
                  "fieldsToSet": [
                    { "name": "aiRetries", "value": "$.aiRetries + 1", "type": "number" }
                  ]
                }
              }
            }
          },
          {
            "logic": {
              "operation": "and",
              "values": [
                { "operation": "not", "values": ["$.aiError"] }
              ],
              "true?": null,
              "false?": {
                "editFields": {
                  "fieldsToSet": [
                    { "name": "aiRetries", "value": "$.aiRetries + 1", "type": "number" }
                  ]
                }
              }
            }
          }
        ],
        "false?": {
          "log": { "message": "AI failed after {{$.maxRetries}} retries" }
        }
      }
    }
  ]
}
```

---

## Quick Reference: Enhancement Types

| Enhancement | Key Changes |
|-------------|-------------|
| Add guards | `validateData` at entry, after AI, before loops |
| Flatten | Convert `success?` chains to workflow array |
| Error handling | Add `error?` to database, filesystem, fetchApi, ask-ai |
| Loop safety | Add length check before loop, max iterations guard |
| State clarity | Explicit state names via `editFields` |
| AI robustness | JSON validation chain, retry logic |
