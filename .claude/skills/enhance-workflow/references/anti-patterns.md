# Workflow Enhancement Anti-Patterns

What to avoid when enhancing workflows. These patterns cause regressions, complexity bloat, or maintainability issues.

## Table of Contents

1. [Over-Enhancement](#over-enhancement)
2. [Breaking Changes](#breaking-changes)
3. [Structure Anti-Patterns](#structure-anti-patterns)
4. [Guard Anti-Patterns](#guard-anti-patterns)
5. [State Anti-Patterns](#state-anti-patterns)

---

## Over-Enhancement

### Anti-Pattern: Scope Creep

**Problem**: Adding features not requested, changing unrelated code.

**Example**:
```
Request: "Add input validation"

BAD Enhancement:
- Added input validation ✓
- Also refactored all node configs (not requested)
- Added 5 new state keys (not requested)
- Changed the workflow ID (not requested)
- Upgraded version from 1.0.0 to 2.0.0 (not requested)
```

**Rule**: Only change what's explicitly requested. If you notice other issues, document them but don't fix them without asking.

### Anti-Pattern: Premature Optimization

**Problem**: Adding optimizations before they're needed.

**Example**:
```json
// Request: "Add error handling"

// BAD - Added caching, batching, retry logic not requested
{
  "workflow": [
    { "cache-check": {...} },
    { "batch-prepare": {...} },
    { "retry-wrapper...": {...} },
    { "database": {...} }
  ]
}

// GOOD - Just added error handling
{
  "workflow": [
    {
      "database": {
        "operation": "find",
        "error?": { "log": { "message": "Database error: {{$.error}}" } }
      }
    }
  ]
}
```

### Anti-Pattern: Gold Plating

**Problem**: Adding "nice to have" features without request.

**Signs**:
- Adding extra logging nodes "for debugging"
- Adding validation for fields that are never used
- Adding error handlers that just re-throw
- Adding state keys "in case they're needed later"

---

## Breaking Changes

### Anti-Pattern: Removing Functionality

**Problem**: Removing nodes or capabilities without replacement.

**Example**:
```json
// ORIGINAL: Has email sending
{
  "workflow": [
    { "process-data": {...} },
    { "send-email": { "to": "$.user.email" } }
  ]
}

// BAD ENHANCEMENT: Removed email sending
{
  "workflow": [
    { "process-data": {...} }
    // Email sending removed!
  ]
}
```

**Rule**: Never remove functionality unless explicitly requested. If something needs removal, ask first.

### Anti-Pattern: Changing State Keys

**Problem**: Renaming state keys breaks downstream consumers.

**Example**:
```json
// ORIGINAL: Uses $.userData
{
  "workflow": [
    { "database": { "operation": "find" } },
    { "log": { "message": "Found: {{$.dbRecord.name}}" } }
  ]
}

// BAD: Renamed to $.user (breaks the log node)
{
  "workflow": [
    {
      "database": { "operation": "find" },
      "editFields": {
        "fieldsToSet": [
          { "name": "user", "value": "$.dbRecord", "type": "object" }
        ]
      }
    },
    { "log": { "message": "Found: {{$.dbRecord.name}}" } }  // BROKEN!
  ]
}
```

**Rule**: When adding state key aliases, also update all references.

### Anti-Pattern: Changing Version Without Changes

**Problem**: Bumping version for cosmetic changes.

**Rule**: Only increment version when:
- Adding new features (minor version)
- Breaking changes (major version)
- Bug fixes (patch version)

---

## Structure Anti-Patterns

### Anti-Pattern: Over-Flattening

**Problem**: Flattening actual conditional branches loses logic.

**Example**:
```json
// ORIGINAL: Proper conditional branching
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
    }
  ]
}

// BAD FLATTENING: Lost the conditional logic!
{
  "workflow": [
    { "logic": { "operation": "equal", "values": ["$.user.role", "admin"] } },
    { "editFields": { "fieldsToSet": [{ "name": "access", "value": "full", "type": "string" }] } }
  ]
}
```

**Rule**: Only flatten `success?` chains for sequential operations. Keep `true?`/`false?`, `valid?`/`invalid?`, `found?`/`not_found?` as nested edges.

### Anti-Pattern: Inconsistent Nesting

**Problem**: Mix of flat and nested for similar operations.

**Example**:
```json
// BAD: Inconsistent style
{
  "workflow": [
    { "node1": {...} },
    { "node2": { "success?": { "node3": {...} } } },  // Why nested?
    { "node4": {...} }
  ]
}

// GOOD: Consistent style
{
  "workflow": [
    { "node1": {...} },
    { "node2": {...} },
    { "node3": {...} },
    { "node4": {...} }
  ]
}
```

### Anti-Pattern: Deep Nesting for Guards

**Problem**: Creating deep nesting to add guards.

**Example**:
```json
// BAD: Guards create deep nesting
{
  "workflow": [
    {
      "validateData": {
        "valid?": {
          "logic": {
            "true?": {
              "validateData": {
                "valid?": {
                  "actual-work": {...}
                }
              }
            }
          }
        }
      }
    }
  ]
}

// GOOD: Guards stay flat
{
  "workflow": [
    {
      "validateData": {
        "invalid?": { "log": { "message": "Invalid input" } }
      }
    },
    {
      "logic": {
        "false?": { "log": { "message": "Condition not met" } }
      }
    },
    {
      "validateData": {
        "invalid?": { "log": { "message": "Invalid data" } }
      }
    },
    {
      "actual-work": {...}
    }
  ]
}
```

---

## Guard Anti-Patterns

### Anti-Pattern: Redundant Validation

**Problem**: Validating the same thing multiple times.

**Example**:
```json
// BAD: Validates same field twice
{
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email"]
      }
    },
    {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email", "name"]  // email already validated!
      }
    }
  ]
}

// GOOD: Validate once
{
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "requiredFields": ["email", "name"]
      }
    }
  ]
}
```

### Anti-Pattern: Guards Without Handlers

**Problem**: Adding guards but not handling the failure path.

**Example**:
```json
// BAD: Guard without invalid? handler
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["email"]
    // No invalid? edge - what happens on failure?
  }
}

// GOOD: Guard with handler
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["email"],
    "invalid?": {
      "editFields": {
        "fieldsToSet": [
          { "name": "validationFailed", "value": true, "type": "boolean" },
          { "name": "errors", "value": "$.validationErrors", "type": "array" }
        ]
      }
    }
  }
}
```

### Anti-Pattern: Over-Guarding

**Problem**: Adding guards for things that can't fail.

**Example**:
```json
// BAD: Log node doesn't need guards
{
  "workflow": [
    {
      "validateData": {
        "validationType": "required_fields",
        "data": { "message": "$.message" },
        "requiredFields": ["message"],
        "valid?": {
          "log": { "message": "{{$.message}}" }
        }
      }
    }
  ]
}

// GOOD: Just log
{
  "workflow": [
    { "log": { "message": "{{$.message}}" } }
  ]
}
```

---

## State Anti-Patterns

### Anti-Pattern: State Pollution

**Problem**: Adding many unnecessary intermediate state keys.

**Example**:
```json
// BAD: Too many intermediate states
{
  "workflow": [
    { "filter": {...} },
    { "$.filteredItems": "$.filterPassed" },
    { "$.tempItems": "$.filteredItems" },
    { "$.processedItems": "$.tempItems" },
    { "sort": {...} },
    { "$.sortedItems": "$.sortedItems" },  // Already written by sort!
    { "$.finalItems": "$.sortedItems" }
  ]
}

// GOOD: Only needed states
{
  "workflow": [
    { "filter": {...} },
    { "sort": {...} },
    {
      "editFields": {
        "fieldsToSet": [
          { "name": "processedData", "value": "$.sortedItems", "type": "array" }
        ]
      }
    }
  ]
}
```

### Anti-Pattern: Orphaned State Keys

**Problem**: Setting state keys that are never used.

**Example**:
```json
// BAD: debugInfo is never used
{
  "workflow": [
    {
      "editFields": {
        "fieldsToSet": [
          { "name": "debugInfo", "value": "starting", "type": "string" },
          { "name": "timestamp", "value": "now", "type": "string" }
        ]
      }
    },
    { "actual-work": {...} }
    // debugInfo and timestamp never referenced again
  ]
}
```

### Anti-Pattern: Conflicting State Keys

**Problem**: Multiple nodes writing to same state key unexpectedly.

**Example**:
```json
// BAD: Both nodes write to $.result
{
  "workflow": [
    {
      "math": {
        "operation": "add",
        "values": [1, 2]
        // Writes to $.mathResult
      }
    },
    {
      "editFields": {
        "fieldsToSet": [
          { "name": "mathResult", "value": "overwritten!", "type": "string" }
        ]
      }
    },
    {
      "log": { "message": "Result: {{$.mathResult}}" }  // Will log "overwritten!" not 3
    }
  ]
}
```

---

## Quick Reference: Anti-Pattern Checklist

Before finalizing an enhancement, verify:

| Check | Anti-Pattern to Avoid |
|-------|----------------------|
| Scope | Only changed what was requested |
| Features | Didn't add unrequested features |
| Removal | Didn't remove any functionality |
| State Keys | Didn't rename existing state keys |
| References | Updated all state key references |
| Conditionals | Didn't flatten true conditional branches |
| Consistency | Used consistent nesting style |
| Guards | Guards have failure handlers |
| Redundancy | No duplicate validations |
| State | No orphaned or conflicting state keys |
