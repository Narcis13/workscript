# Node Quick Reference

All 45 registered workflow nodes, organized by category.

## Table of Contents

1. [Core Nodes (6)](#core-nodes-6)
2. [AI Nodes (1)](#ai-nodes-1)
3. [Orchestration Nodes (1)](#orchestration-nodes-1)
4. [Data Manipulation Nodes (28)](#data-manipulation-nodes-28)
5. [Server Nodes (3)](#server-nodes-3)
6. [Custom Integration Nodes (6)](#custom-integration-nodes-6)

---

## Core Nodes (6)

| Node ID | Name | Edges | State Written | Description |
|---------|------|-------|---------------|-------------|
| `math` | Math Operations | `success`, `error` | `mathResult` | Basic arithmetic: add, subtract, multiply, divide |
| `logic` | Logic Operations | `true`, `false`, `error` | `logicResult` | Boolean: and, or, not, equal, greater, less |
| `transform` | Data Transform | `success`, `error` | `transformResult` | stringify, parse, uppercase, lowercase, trim, reverse |
| `log` | Log Node | `success` | `lastLoggedMessage` | Log messages to console |
| `empty` | Empty Node | `nothing` | - | Placeholder node, does nothing |
| `__state_setter__` | State Setter | `success`, `error` | (user-defined) | Internal: set nested state via $.path |

### math

```json
{
  "math": {
    "operation": "add",
    "values": [10, 20, "$.multiplier"],
    "success?": { ... },
    "error?": { ... }
  }
}
```

Operations: `add`, `subtract`, `multiply`, `divide`

### logic

```json
{
  "logic": {
    "operation": "equal",
    "values": ["$.user.role", "admin"],
    "true?": { ... },
    "false?": { ... }
  }
}
```

Operations: `and`, `or`, `not`, `equal`, `greater`, `less`

### transform

```json
{
  "transform": {
    "operation": "parse",
    "data": "$.jsonString",
    "success?": { ... }
  }
}
```

Operations: `stringify`, `parse`, `uppercase`, `lowercase`, `trim`, `length`, `reverse`

---

## AI Nodes (1)

| Node ID | Name | Edges | State Written | Description |
|---------|------|-------|---------------|-------------|
| `ask-ai` | Ask AI | `success`, `error` | `aiResponse`, `aiResponseData` | Send prompts to AI models |

### ask-ai

```json
{
  "ask-ai": {
    "userPrompt": "Summarize: $.inputText",
    "model": "openai/gpt-4o-mini",
    "systemPrompt": "You are a helpful assistant",
    "success?": { ... },
    "error?": { ... }
  }
}
```

Required: `userPrompt`, `model`

---

## Orchestration Nodes (1)

| Node ID | Name | Edges | State Written | Description |
|---------|------|-------|---------------|-------------|
| `runWorkflow` | Run Workflow | `success`, `error` | `runWorkflowResult`, `runWorkflowFinalState` | Execute sub-workflow |

### runWorkflow

```json
{
  "runWorkflow": {
    "workflowId": "data-processor",
    "initialState": { "input": "$.data" },
    "timeout": 60000,
    "success?": { ... },
    "error?": { ... }
  }
}
```

---

## Data Manipulation Nodes (28)

### Array Operations (9)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `filter` | Filter | `passed`, `filtered`, `error` | `filterPassed`, `filterFiltered`, `filterStats` |
| `sort` | Sort Items | `success`, `error` | `sortedItems` |
| `aggregate` | Aggregate | `success`, `empty`, `error` | `aggregateResult` |
| `splitOut` | Split Out | `success`, `empty`, `error` | `splitItems` |
| `limit` | Limit | `success`, `all_items`, `error` | `limitedItems`, `limitCount` |
| `removeDuplicates` | Remove Duplicates | `kept`, `discarded`, `error` | `keptItems`, `discardedItems` |
| `arrayUtilities` | Array Utilities | `success`, `error` | `arrayResult` |
| `range` | Range | `success`, `error` | `rangeResult` |
| `while` | While | `continue`, `exit` | - |

#### filter

```json
{
  "filter": {
    "items": "$.products",
    "conditions": [
      { "field": "price", "dataType": "number", "operation": "gt", "value": 100 },
      { "field": "inStock", "dataType": "boolean", "operation": "true" }
    ],
    "matchMode": "all",
    "passed?": { ... },
    "filtered?": { ... }
  }
}
```

#### sort

```json
{
  "sort": {
    "type": "simple",
    "fieldsToSortBy": [
      { "fieldName": "price", "order": "ascending" },
      { "fieldName": "name", "order": "descending" }
    ],
    "success?": { ... }
  }
}
```

### Data Transformation (3)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `editFields` | Edit Fields | `success`, `error` | `editFieldsResult`, `fieldsModified` |
| `summarize` | Summarize | `success`, `error` | `summarizeResult`, `summarizeGroups` |
| `transformObject` | Transform Object | `success`, `error` | `transformedObject` |

#### editFields

```json
{
  "editFields": {
    "mode": "manual_mapping",
    "fieldsToSet": [
      { "name": "fullName", "value": "{{firstName}} {{lastName}}", "type": "string" },
      { "name": "age", "value": "$.userAge", "type": "number" }
    ],
    "includeOtherFields": true,
    "success?": { ... }
  }
}
```

#### summarize

```json
{
  "summarize": {
    "fieldsToSummarize": [
      { "fieldToAggregate": "price", "aggregation": "sum", "outputFieldName": "totalPrice" },
      { "fieldToAggregate": "quantity", "aggregation": "average", "outputFieldName": "avgQty" }
    ],
    "fieldsToSplitBy": ["category"],
    "success?": { ... }
  }
}
```

Aggregations: `append`, `average`, `concatenate`, `count`, `countUnique`, `max`, `min`, `sum`

### Parsing & Extraction (3)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `jsonExtract` | JSON Extract | `success`, `error` | `extractedValue` |
| `stringOperations` | String Operations | `success`, `error` | `stringResult` |
| `extractText` | Extract Text | `success`, `error` | `extractedText` |

### HTTP/API (1)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `fetchApi` | Fetch API | `success`, `clientError`, `serverError`, `error` | `apiResponse`, `apiStatus` |

#### fetchApi

```json
{
  "fetchApi": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": { "Authorization": "Bearer $.token" },
    "timeout": 30000,
    "success?": { ... },
    "clientError?": { ... },
    "serverError?": { ... },
    "error?": { ... }
  }
}
```

### Resource Operations (4)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `resource-read` | Resource Read | `success`, `not_found`, `error` | `resourceContent` |
| `resource-write` | Resource Write | `success`, `error` | `resourceWritten` |
| `resource-list` | Resource List | `success`, `error` | `resourceList` |
| `resource-interpolate` | Resource Interpolate | `success`, `error` | `interpolatedContent` |

### Filtering & Comparison (3)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `switch` | Switch | `<dynamic>`, `default`, `error` | `switchResult`, `selectedEdge` |
| `compareDatasets` | Compare Datasets | `success`, `error` | `compareResult` |
| `everyArrayItem` | Every Array Item | `success`, `failed`, `error` | `everyResult` |

#### switch

```json
{
  "switch": {
    "mode": "rules",
    "item": "$.request",
    "rules": [
      { "outputKey": "premium", "conditions": [{ "field": "priority", "operation": "gte", "value": 8 }] },
      { "outputKey": "standard", "conditions": [{ "field": "priority", "operation": "lt", "value": 8 }] }
    ],
    "fallbackOutput": "default",
    "premium?": { ... },
    "standard?": { ... },
    "default?": { ... }
  }
}
```

Modes: `rules`, `expression`

### Calculations (2)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `calculateField` | Calculate Field | `success`, `error` | `calculatedValue` |
| `mathOperations` | Math Operations | `success`, `error` | `mathOpResult` |

### Date/Time (1)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `dateTime` | Date/Time | `success`, `error` | `dateTimeResult` |

### Validation (1)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `validateData` | Validate Data | `valid`, `invalid`, `error` | `validationResult`, `validationErrors` |

#### validateData

```json
{
  "validateData": {
    "validationType": "required_fields",
    "requiredFields": ["name", "email", "phone"],
    "stopOnError": true,
    "valid?": { ... },
    "invalid?": { ... }
  }
}
```

Validation types: `json_schema`, `type_check`, `required_fields`, `range`, `pattern`, `custom`

### Object Utilities (1)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `objectUtilities` | Object Utilities | `success`, `error` | `objectResult` |

---

## Server Nodes (3)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `filesystem` | File System | `success`, `error`, `exists`, `not_exists` | `fileContent`, `fileWritten`, `fileExists` |
| `database` | Database | `success`, `found`, `not_found`, `error` | `dbInserted`, `dbRecord`, `dbUpdated`, `dbDeleted`, `dbRecords` |
| `auth` | Authentication | `success`, `valid`, `invalid`, `error` | `hashedPassword`, `authValid`, `authToken` |

### filesystem

```json
{
  "filesystem": {
    "operation": "read",
    "path": "/data/config.json",
    "success?": { ... },
    "not_exists?": { ... }
  }
}
```

Operations: `read`, `write`, `exists`, `delete`, `mkdir`

### database

```json
{
  "database": {
    "operation": "find",
    "table": "users",
    "query": { "id": "$.userId" },
    "found?": { ... },
    "not_found?": { ... }
  }
}
```

Operations: `insert`, `find`, `update`, `delete`, `list`

### auth

```json
{
  "auth": {
    "operation": "hash",
    "data": "$.password",
    "success?": { ... }
  }
}
```

Operations: `hash`, `verify`, `generate_token`, `sign`, `verify_signature`

---

## Custom Integration Nodes (6)

### Google Gmail (3)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `google-connect` | Google Connect | `success`, `error` | `googleAuth` |
| `send-email` | Send Email | `success`, `error` | `emailSent` |
| `list-emails` | List Emails | `success`, `error` | `emails` |

### Zoca CRM (3)

| Node ID | Name | Edges | State Written |
|---------|------|-------|---------------|
| `toateContactele` | Toate Contactele | `success`, `error` | `contacts` |
| `fiecareElement` | Fiecare Element | `success`, `error` | `elementResult` |
| `aplicaFiltre` | Aplica Filtre | `success`, `error` | `filteredData` |

---

## Node ID Quick List

### All 45 Node IDs

**Core (6):**
`math`, `logic`, `transform`, `log`, `empty`, `__state_setter__`

**AI (1):**
`ask-ai`

**Orchestration (1):**
`runWorkflow`

**Data Manipulation (28):**
- Array: `filter`, `sort`, `aggregate`, `splitOut`, `limit`, `removeDuplicates`, `arrayUtilities`, `range`, `while`
- Transform: `editFields`, `summarize`, `transformObject`
- Parse: `jsonExtract`, `stringOperations`, `extractText`
- HTTP: `fetchApi`
- Resource: `resource-read`, `resource-write`, `resource-list`, `resource-interpolate`
- Filter/Compare: `switch`, `compareDatasets`, `everyArrayItem`
- Calculate: `calculateField`, `mathOperations`
- Date: `dateTime`
- Validate: `validateData`
- Object: `objectUtilities`

**Server (3):**
`filesystem`, `database`, `auth`

**Custom (6):**
- Gmail: `google-connect`, `send-email`, `list-emails`
- Zoca: `toateContactele`, `fiecareElement`, `aplicaFiltre`

---

## Edge Quick Reference

| Edge Pattern | Meaning |
|--------------|---------|
| `success?` | Operation completed successfully |
| `error?` | Generic error occurred |
| `true?` / `false?` | Boolean logic result |
| `passed?` / `filtered?` | Filter result edges |
| `found?` / `not_found?` | Database lookup result |
| `valid?` / `invalid?` | Validation result |
| `exists?` / `not_exists?` | File existence check |
| `clientError?` / `serverError?` | HTTP status categories |
| `continue?` / `exit?` | Loop control |
| `<dynamic>?` | Switch node dynamic edge |
