# ObjectUtilitiesNode Examples

## Overview

The ObjectUtilitiesNode provides a comprehensive set of utilities for manipulating objects in workflows. It supports 12 different operations covering common object manipulation needs.

## Operations Reference

| Operation | Description | Required Parameters |
|-----------|-------------|---------------------|
| `keys` | Extract all keys from an object | `field` |
| `values` | Extract all values from an object | `field` |
| `entries` | Convert object to [key, value] pairs | `field` |
| `has_field` | Check if a field exists (supports nested paths) | `field`, `path` |
| `is_empty` | Check if object has no properties | `field` |
| `merge` | Shallow merge two objects | `field`, `mergeWith` |
| `deep_merge` | Deep merge two objects | `field`, `mergeWith` |
| `clone` | Create shallow copy of object | `field` |
| `deep_clone` | Create deep copy of object | `field` |
| `get_nested` | Get value at nested path | `field`, `path` |
| `set_nested` | Set value at nested path | `field`, `path`, `value` |
| `delete_nested` | Delete field at nested path | `field`, `path` |

---

## Example Workflows

### Example 1: Extract Object Keys

**Use Case:** Get all property names from a user object.

```json
{
  "id": "extract-keys-example",
  "name": "Extract Object Keys",
  "version": "1.0.0",
  "initialState": {
    "user": {
      "name": "Alice",
      "email": "alice@example.com",
      "age": 30,
      "active": true
    }
  },
  "workflow": [
    {
      "extract-keys": {
        "operation": "keys",
        "field": "user",
        "outputField": "userFields",
        "success?": "log-result"
      }
    },
    {
      "log-result": {
        "message": "User has these fields: $.userFields"
      }
    }
  ]
}
```

**Output:**
```javascript
userFields: ["name", "email", "age", "active"]
```

---

### Example 2: Check Field Existence

**Use Case:** Validate that required nested fields exist before processing.

```json
{
  "id": "check-field-example",
  "name": "Check Field Existence",
  "version": "1.0.0",
  "initialState": {
    "apiResponse": {
      "data": {
        "user": {
          "profile": {
            "email": "user@example.com"
          }
        }
      }
    }
  },
  "workflow": [
    {
      "check-email": {
        "operation": "has_field",
        "field": "apiResponse",
        "path": "data.user.profile.email",
        "success?": "process-email",
        "not_found?": "handle-missing-email"
      }
    },
    {
      "process-email": {
        "message": "Email found, processing..."
      }
    },
    {
      "handle-missing-email": {
        "message": "Email field is missing!"
      }
    }
  ]
}
```

---

### Example 3: Merge User Data

**Use Case:** Combine user profile with additional settings.

```json
{
  "id": "merge-objects-example",
  "name": "Merge User Data",
  "version": "1.0.0",
  "initialState": {
    "userProfile": {
      "name": "Bob",
      "email": "bob@example.com",
      "age": 35
    },
    "userSettings": {
      "theme": "dark",
      "notifications": true,
      "language": "en"
    }
  },
  "workflow": [
    {
      "merge-data": {
        "operation": "merge",
        "field": "userProfile",
        "mergeWith": "userSettings",
        "overwrite": true,
        "outputField": "completeUserData",
        "success?": "save-user"
      }
    },
    {
      "save-user": {
        "message": "Merged user data: $.completeUserData"
      }
    }
  ]
}
```

**Output:**
```javascript
completeUserData: {
  "name": "Bob",
  "email": "bob@example.com",
  "age": 35,
  "theme": "dark",
  "notifications": true,
  "language": "en"
}
```

---

### Example 4: Deep Merge Nested Configuration

**Use Case:** Merge default config with user overrides while preserving nested structures.

```json
{
  "id": "deep-merge-example",
  "name": "Deep Merge Configuration",
  "version": "1.0.0",
  "initialState": {
    "defaultConfig": {
      "server": {
        "host": "localhost",
        "port": 3000,
        "ssl": {
          "enabled": false,
          "cert": null
        }
      },
      "database": {
        "type": "postgres",
        "pool": {
          "min": 2,
          "max": 10
        }
      }
    },
    "userConfig": {
      "server": {
        "port": 8080,
        "ssl": {
          "enabled": true,
          "cert": "/path/to/cert"
        }
      },
      "database": {
        "pool": {
          "max": 20
        }
      }
    }
  },
  "workflow": [
    {
      "merge-config": {
        "operation": "deep_merge",
        "field": "defaultConfig",
        "mergeWith": "userConfig",
        "overwrite": true,
        "outputField": "finalConfig",
        "success?": "apply-config"
      }
    },
    {
      "apply-config": {
        "message": "Final config: $.finalConfig"
      }
    }
  ]
}
```

**Output:**
```javascript
finalConfig: {
  "server": {
    "host": "localhost",      // From defaultConfig
    "port": 8080,             // Overridden by userConfig
    "ssl": {
      "enabled": true,        // Overridden by userConfig
      "cert": "/path/to/cert" // Overridden by userConfig
    }
  },
  "database": {
    "type": "postgres",       // From defaultConfig
    "pool": {
      "min": 2,               // From defaultConfig
      "max": 20               // Overridden by userConfig
    }
  }
}
```

---

### Example 5: Deep Clone Object

**Use Case:** Create an independent copy of an object to avoid mutations.

```json
{
  "id": "deep-clone-example",
  "name": "Deep Clone Object",
  "version": "1.0.0",
  "initialState": {
    "originalData": {
      "user": {
        "name": "Charlie",
        "profile": {
          "age": 28,
          "address": {
            "city": "Boston",
            "zip": "02101"
          }
        }
      },
      "metadata": {
        "createdAt": "2025-01-15T10:00:00Z"
      }
    }
  },
  "workflow": [
    {
      "clone-data": {
        "operation": "deep_clone",
        "field": "originalData",
        "outputField": "workingCopy",
        "success?": "modify-copy"
      }
    },
    {
      "modify-copy": {
        "$.workingCopy.user.profile.age": 29
      }
    }
  ]
}
```

---

### Example 6: Get Nested Value

**Use Case:** Extract a specific value from a deeply nested object.

```json
{
  "id": "get-nested-example",
  "name": "Get Nested Value",
  "version": "1.0.0",
  "initialState": {
    "apiResponse": {
      "status": "success",
      "data": {
        "results": [
          {
            "user": {
              "profile": {
                "preferences": {
                  "theme": "dark"
                }
              }
            }
          }
        ]
      }
    }
  },
  "workflow": [
    {
      "get-theme": {
        "operation": "get_nested",
        "field": "apiResponse",
        "path": "data.results.0.user.profile.preferences.theme",
        "outputField": "userTheme",
        "success?": "apply-theme",
        "not_found?": "use-default-theme"
      }
    },
    {
      "apply-theme": {
        "message": "Using theme: $.userTheme"
      }
    },
    {
      "use-default-theme": {
        "message": "Theme not found, using default"
      }
    }
  ]
}
```

---

### Example 7: Set Nested Value

**Use Case:** Update a nested configuration value dynamically.

```json
{
  "id": "set-nested-example",
  "name": "Set Nested Value",
  "version": "1.0.0",
  "initialState": {
    "config": {
      "app": {
        "name": "MyApp"
      }
    },
    "newTimeout": 5000
  },
  "workflow": [
    {
      "update-timeout": {
        "operation": "set_nested",
        "field": "config",
        "path": "app.server.timeout",
        "value": "$.newTimeout",
        "outputField": "updatedConfig",
        "success?": "save-config"
      }
    },
    {
      "save-config": {
        "message": "Config updated: $.updatedConfig"
      }
    }
  ]
}
```

**Output:**
```javascript
updatedConfig: {
  "app": {
    "name": "MyApp",
    "server": {
      "timeout": 5000
    }
  }
}
```

---

### Example 8: Delete Nested Field

**Use Case:** Remove sensitive data from an object before sending.

```json
{
  "id": "delete-nested-example",
  "name": "Delete Nested Field",
  "version": "1.0.0",
  "initialState": {
    "userData": {
      "id": 123,
      "name": "Diana",
      "email": "diana@example.com",
      "auth": {
        "password": "hashed_password_123",
        "apiKey": "secret_key_456"
      }
    }
  },
  "workflow": [
    {
      "remove-password": {
        "operation": "delete_nested",
        "field": "userData",
        "path": "auth.password",
        "outputField": "sanitizedData",
        "success?": "remove-api-key"
      }
    },
    {
      "remove-api-key": {
        "operation": "delete_nested",
        "field": "sanitizedData",
        "path": "auth.apiKey",
        "outputField": "publicUserData",
        "success?": "send-data"
      }
    },
    {
      "send-data": {
        "message": "Sending public data: $.publicUserData"
      }
    }
  ]
}
```

**Output:**
```javascript
publicUserData: {
  "id": 123,
  "name": "Diana",
  "email": "diana@example.com",
  "auth": {}
}
```

---

### Example 9: Object Transformation Pipeline

**Use Case:** Complete object transformation workflow.

```json
{
  "id": "transformation-pipeline",
  "name": "Object Transformation Pipeline",
  "version": "1.0.0",
  "initialState": {
    "rawData": {
      "user_name": "Eve",
      "user_email": "eve@example.com",
      "legacy_field": "deprecated"
    },
    "enrichmentData": {
      "userId": 456,
      "registered": "2025-01-01"
    }
  },
  "workflow": [
    {
      "check-empty": {
        "operation": "is_empty",
        "field": "rawData",
        "outputField": "isEmpty",
        "success?": "get-keys"
      }
    },
    {
      "get-keys": {
        "operation": "keys",
        "field": "rawData",
        "outputField": "availableFields",
        "success?": "merge-enrichment"
      }
    },
    {
      "merge-enrichment": {
        "operation": "merge",
        "field": "rawData",
        "mergeWith": "enrichmentData",
        "overwrite": false,
        "outputField": "enrichedData",
        "success?": "remove-legacy"
      }
    },
    {
      "remove-legacy": {
        "operation": "delete_nested",
        "field": "enrichedData",
        "path": "legacy_field",
        "outputField": "cleanData",
        "success?": "finalize"
      }
    },
    {
      "finalize": {
        "message": "Transformation complete: $.cleanData"
      }
    }
  ]
}
```

---

### Example 10: Convert Object to Entries Array

**Use Case:** Transform object into array of key-value pairs for iteration.

```json
{
  "id": "entries-example",
  "name": "Convert to Entries",
  "version": "1.0.0",
  "initialState": {
    "productPrices": {
      "widget": 19.99,
      "gadget": 29.99,
      "tool": 39.99
    }
  },
  "workflow": [
    {
      "to-entries": {
        "operation": "entries",
        "field": "productPrices",
        "outputField": "priceEntries",
        "success?": "process-entries"
      }
    },
    {
      "process-entries": {
        "message": "Price entries: $.priceEntries"
      }
    }
  ]
}
```

**Output:**
```javascript
priceEntries: [
  ["widget", 19.99],
  ["gadget", 29.99],
  ["tool", 39.99]
]
```

---

## Common Patterns

### Pattern 1: Safe Object Access

Always check if a field exists before accessing:

```json
{
  "workflow": [
    {
      "check-field": {
        "operation": "has_field",
        "field": "data",
        "path": "user.profile.email",
        "success?": "get-email",
        "not_found?": "use-default"
      }
    },
    {
      "get-email": {
        "operation": "get_nested",
        "field": "data",
        "path": "user.profile.email"
      }
    }
  ]
}
```

### Pattern 2: Immutable Updates

Create a copy before modifying:

```json
{
  "workflow": [
    {
      "clone-state": {
        "operation": "deep_clone",
        "field": "originalData",
        "outputField": "workingCopy"
      }
    },
    {
      "update-copy": {
        "operation": "set_nested",
        "field": "workingCopy",
        "path": "user.status",
        "value": "updated"
      }
    }
  ]
}
```

### Pattern 3: Configuration Merging

Combine default and custom configurations:

```json
{
  "workflow": [
    {
      "merge-config": {
        "operation": "deep_merge",
        "field": "defaultConfig",
        "mergeWith": "customConfig",
        "overwrite": true,
        "outputField": "finalConfig"
      }
    }
  ]
}
```

---

## Edge Cases and Limitations

### Circular References

The `deep_clone` operation handles circular references using a WeakMap to track visited objects.

### Array Handling

- `merge` and `deep_merge` treat arrays as values (they don't merge array contents)
- Use dedicated array nodes for array-specific operations

### Null vs Undefined

- `has_field` returns `false` for missing fields (undefined)
- Fields explicitly set to `null` are considered as existing
- `is_empty` returns `true` for null objects

### Performance Considerations

- Deep operations (`deep_clone`, `deep_merge`) can be expensive for large, deeply nested objects
- Consider using shallow operations when deep nesting is not required
- For large-scale transformations, consider splitting into multiple steps

---

## Troubleshooting

### Common Errors

**Error: "Field not found"**
- Ensure the field exists in state before the operation
- Check for typos in field names

**Error: "Missing required parameter: path"**
- Operations like `has_field`, `get_nested`, `set_nested`, `delete_nested` require a `path` parameter

**Error: "Missing required parameter: mergeWith"**
- `merge` and `deep_merge` operations require a `mergeWith` parameter pointing to another object in state

---

## Best Practices

1. **Always validate input**: Use `has_field` or `is_empty` before complex operations
2. **Use specific output fields**: Always specify `outputField` for clarity
3. **Prefer immutability**: Use `clone` or `deep_clone` before modifying objects
4. **Handle not_found edge**: Always route the `not_found` edge for operations that might fail
5. **Document your paths**: Use clear, descriptive nested paths (e.g., `user.profile.settings.theme`)

---

**Last Updated:** 2025-01-18
**Node Version:** 1.0.0
