# Workflow Patterns Reference

## Core Patterns for Example Documentation

### Pattern 1: Data Processing Pipeline

Shows filtering, sorting, limiting, and aggregation.

```json
{
  "initialState": {
    "products": [
      { "id": 1, "name": "Laptop", "price": 1299, "category": "Electronics", "inStock": true },
      { "id": 2, "name": "Mouse", "price": 29, "category": "Electronics", "inStock": false },
      { "id": 3, "name": "Book", "price": 49, "category": "Books", "inStock": true }
    ]
  },
  "workflow": [
    {
      "filter": {
        "items": "$.products",
        "conditions": [
          { "field": "inStock", "dataType": "boolean", "operation": "true" }
        ],
        "passed?": {
          "sort": {
            "type": "simple",
            "fieldsToSortBy": [{ "fieldName": "price", "order": "descending" }],
            "success?": {
              "limit": {
                "items": "$.sortedItems",
                "maxItems": 10,
                "success?": {
                  "log": { "message": "Top 10 in-stock products ready" }
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

### Pattern 2: Conditional Branching (Logic Node)

Shows boolean evaluation with true/false routing.

```json
{
  "initialState": {
    "user": { "role": "admin", "verified": true }
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
              { "name": "permissions", "value": "all", "type": "string" }
            ],
            "success?": {
              "log": { "message": "Admin permissions granted" }
            }
          }
        },
        "false?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [
              { "name": "permissions", "value": "limited", "type": "string" }
            ],
            "success?": {
              "log": { "message": "Standard permissions granted" }
            }
          }
        }
      }
    }
  ]
}
```

### Pattern 3: Validation Pipeline

Shows data validation with valid/invalid edges.

```json
{
  "initialState": {
    "userInput": {
      "email": "test@example.com",
      "name": "John Doe",
      "age": 25
    }
  },
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email", "name"],
        "valid?": {
          "validateData": {
            "validationType": "pattern",
            "patternValidations": [
              { "field": "email", "pattern": "^[^@]+@[^@]+\\.[^@]+$" }
            ],
            "valid?": {
              "log": { "message": "All validations passed" }
            },
            "invalid?": {
              "log": { "message": "Email format invalid: $.validationErrors" }
            }
          }
        },
        "invalid?": {
          "log": { "message": "Required fields missing: $.validationErrors" }
        }
      }
    }
  ]
}
```

### Pattern 4: Database CRUD Operations

Shows found/not_found/success/error edges.

```json
{
  "initialState": {
    "userId": "123",
    "newUserData": { "name": "Alice", "email": "alice@example.com" }
  },
  "workflow": [
    {
      "database": {
        "operation": "find",
        "table": "users",
        "query": { "id": "$.userId" },
        "found?": {
          "database": {
            "operation": "update",
            "table": "users",
            "query": { "id": "$.userId" },
            "data": { "lastSeen": "2024-01-01" },
            "success?": {
              "log": { "message": "User updated: $.dbUpdated" }
            }
          }
        },
        "not_found?": {
          "database": {
            "operation": "insert",
            "table": "users",
            "data": "$.newUserData",
            "success?": {
              "log": { "message": "User created: $.dbInserted" }
            }
          }
        },
        "error?": {
          "log": { "message": "Database error occurred" }
        }
      }
    }
  ]
}
```

### Pattern 5: File System Operations

Shows exists/not_exists edges.

```json
{
  "initialState": {
    "configPath": "/app/config.json",
    "defaultConfig": { "theme": "dark", "lang": "en" }
  },
  "workflow": [
    {
      "filesystem": {
        "operation": "exists",
        "path": "$.configPath",
        "exists?": {
          "filesystem": {
            "operation": "read",
            "path": "$.configPath",
            "success?": {
              "transform": {
                "operation": "parse",
                "data": "$.fileContent",
                "success?": {
                  "log": { "message": "Config loaded: $.transformResult" }
                }
              }
            }
          }
        },
        "not_exists?": {
          "transform": {
            "operation": "stringify",
            "data": "$.defaultConfig",
            "success?": {
              "filesystem": {
                "operation": "write",
                "path": "$.configPath",
                "content": "$.transformResult",
                "success?": {
                  "log": { "message": "Default config created" }
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

### Pattern 6: Loop with Counter

Shows loop nodes with `...` suffix.

```json
{
  "initialState": {
    "items": ["apple", "banana", "cherry"],
    "index": 0,
    "processed": []
  },
  "workflow": [
    {
      "logic...": {
        "operation": "less",
        "values": ["$.index", 3],
        "true?": [
          { "log": { "message": "Processing item $.index" } },
          { "$.index": "$.index + 1" }
        ],
        "false?": null
      }
    },
    {
      "log": { "message": "Loop complete. Processed $.index items." }
    }
  ]
}
```

### Pattern 7: Multi-Way Switch Routing

Shows dynamic edge routing based on rules.

```json
{
  "initialState": {
    "ticket": { "priority": 9, "type": "bug", "department": "engineering" }
  },
  "workflow": [
    {
      "switch": {
        "mode": "rules",
        "item": "$.ticket",
        "rules": [
          {
            "outputKey": "critical",
            "conditions": [{ "field": "priority", "operation": "gte", "value": 8 }]
          },
          {
            "outputKey": "normal",
            "conditions": [{ "field": "priority", "operation": "lt", "value": 8 }]
          }
        ],
        "fallbackOutput": "default",
        "critical?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [{ "name": "queue", "value": "urgent", "type": "string" }],
            "success?": { "log": { "message": "Critical ticket queued" } }
          }
        },
        "normal?": {
          "editFields": {
            "mode": "manual_mapping",
            "fieldsToSet": [{ "name": "queue", "value": "standard", "type": "string" }],
            "success?": { "log": { "message": "Normal ticket queued" } }
          }
        },
        "default?": {
          "log": { "message": "Default routing applied" }
        }
      }
    }
  ]
}
```

## Initial State Data Templates

### E-commerce Data

```json
{
  "products": [
    { "id": 1, "name": "Laptop Pro", "price": 1299.99, "category": "Electronics", "inStock": true, "rating": 4.5, "tags": ["premium", "featured"] },
    { "id": 2, "name": "Wireless Mouse", "price": 29.99, "category": "Electronics", "inStock": false, "rating": 4.0, "tags": ["accessories"] },
    { "id": 3, "name": "Programming Guide", "price": 49.99, "category": "Books", "inStock": true, "rating": 4.8, "tags": ["bestseller"] }
  ],
  "cart": { "items": [], "total": 0 }
}
```

### User Management Data

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "role": "admin", "verified": true, "createdAt": "2024-01-01" },
    { "id": 2, "name": "Bob", "email": "bob@example.com", "role": "user", "verified": false, "createdAt": "2024-02-15" }
  ],
  "currentUser": null,
  "session": { "token": null, "expiresAt": null }
}
```

### Text Processing Data

```json
{
  "emailText": "Contact us at support@example.com or sales@example.com",
  "urlText": "Visit https://example.com for more info",
  "phoneText": "Call us at 555-1234 or (555) 678-9012",
  "rawData": "Name: John, Age: 30 | Name: Jane, Age: 25"
}
```

### Numeric/Analytics Data

```json
{
  "numbers": [10, 20, 30, 40, 50],
  "sales": [
    { "month": "Jan", "revenue": 10000, "units": 150 },
    { "month": "Feb", "revenue": 12000, "units": 180 },
    { "month": "Mar", "revenue": 15000, "units": 200 }
  ],
  "metrics": { "total": 0, "average": 0, "count": 0 }
}
```

## Edge Reference Table

| Node Type | Common Edges | Description |
|-----------|--------------|-------------|
| math | success, error | Arithmetic results |
| logic | true, false, error | Boolean evaluation |
| filter | passed, filtered, error | Array filtering |
| sort | success, error | Array sorting |
| switch | dynamic + default, error | Multi-way routing |
| validateData | valid, invalid, error | Data validation |
| editFields | success, error | Field modification |
| database | success, found, not_found, empty, error | CRUD operations |
| filesystem | success, exists, not_exists, error | File operations |
| transform | success, error | Data transformation |
| auth | success, valid, invalid, error | Authentication |
