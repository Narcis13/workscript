# Data Manipulation Nodes Implementation Plan

## Overview
This document provides a comprehensive implementation plan for 20 data manipulation nodes for the FlowScript agentic workflow system, inspired by n8n's data transformation capabilities.

---

## Array Manipulation Nodes

### 1. Split Out Node
**Status:** ⬜ Not Started

**Purpose:** Convert a single item containing an array into multiple items

**Configuration Parameters:**
- `arrayPath` (string): JSONPath to the array field (e.g., "$.users", "$.items")
- `keepParentData` (boolean): Whether to include parent object data in each split item
- `as` (string): Optional name for the split item in output (default: "item")

**Input Example:**
```json
{
  "order_id": "12345",
  "items": [
    {"product": "Widget", "quantity": 2},
    {"product": "Gadget", "quantity": 1}
  ]
}
```

**Output Example:**
```json
// Item 1
{
  "order_id": "12345",
  "item": {"product": "Widget", "quantity": 2}
}
// Item 2
{
  "order_id": "12345",
  "item": {"product": "Gadget", "quantity": 1}
}
```

**Expected Edges:**
- `success`: Split completed successfully
- `empty`: Array was empty
- `error`: Invalid path or not an array

**Implementation Notes:**
- Use JSONPath library for field access
- Handle nested arrays
- Validate that the target field is actually an array

---

### 2. Aggregate Node
**Status:** ⬜ Not Started

**Purpose:** Combine multiple items into a single item with grouped data

**Configuration Parameters:**
- `mode` (enum): "individual_fields" | "all_data"
- `fields` (array): List of field configurations when mode is "individual_fields"
  - `inputFieldName` (string): Field to aggregate
  - `outputFieldName` (string): Name in output (optional, uses input name if not set)
  - `mergeLists` (boolean): If field contains arrays, flatten them into single array
- `outputField` (string): Field name to wrap all data when mode is "all_data"
- `includeBinaries` (boolean): Include binary data attachments
- `keepMissingValues` (boolean): Add null for missing values

**Input Example:**
```json
// Item 1
{"name": "Alice", "email": "alice@example.com", "score": 85}
// Item 2
{"name": "Bob", "email": "bob@example.com", "score": 92}
// Item 3
{"name": "Charlie", "email": "charlie@example.com", "score": 78}
```

**Output Example (Individual Fields Mode):**
```json
{
  "names": ["Alice", "Bob", "Charlie"],
  "emails": ["alice@example.com", "bob@example.com", "charlie@example.com"],
  "scores": [85, 92, 78]
}
```

**Output Example (All Data Mode):**
```json
{
  "data": [
    {"name": "Alice", "email": "alice@example.com", "score": 85},
    {"name": "Bob", "email": "bob@example.com", "score": 92},
    {"name": "Charlie", "email": "charlie@example.com", "score": 78}
  ]
}
```

**Expected Edges:**
- `success`: Aggregation completed
- `empty`: No items to aggregate
- `error`: Configuration error

**Implementation Notes:**
- Support dot notation for nested field access
- Handle missing fields gracefully based on `keepMissingValues`
- Optimize for large datasets

---

### 3. Remove Duplicates Node
**Status:** ⬜ Not Started

**Purpose:** Identify and remove duplicate items based on field comparison

**Configuration Parameters:**
- `operation` (enum): "current_input" | "previous_executions" | "clear_history"
- `compareMode` (enum): "all_fields" | "all_except" | "selected_fields"
- `fieldsToCompare` (array): Field names for comparison (when not using all_fields)
- `fieldsToExclude` (array): Field names to exclude (when using all_except)
- `removeOtherFields` (boolean): Remove fields not used in comparison
- `disableDotNotation` (boolean): Disable dot notation for field names
- `scope` (enum): "node" | "workflow" (for previous_executions mode)
- `keepItemsWhere` (enum): "value_is_new" | "value_is_higher" | "date_is_later"
- `historySize` (number): Number of items to store for deduplication (default: 1000)

**Input Example:**
```json
[
  {"id": 1, "email": "alice@example.com", "name": "Alice"},
  {"id": 2, "email": "bob@example.com", "name": "Bob"},
  {"id": 3, "email": "alice@example.com", "name": "Alice Smith"}
]
```

**Output Example (Compare by email):**
```json
// Kept Items
[
  {"id": 1, "email": "alice@example.com", "name": "Alice"},
  {"id": 2, "email": "bob@example.com", "name": "Bob"}
]
// Discarded Items (separate output)
[
  {"id": 3, "email": "alice@example.com", "name": "Alice Smith"}
]
```

**Expected Edges:**
- `kept`: Items that passed deduplication
- `discarded`: Duplicate items removed
- `cleared`: History cleared (for clear_history operation)
- `error`: Configuration error

**Implementation Notes:**
- Implement persistent storage for history 
- Support multiple comparison strategies
- Optimize comparison algorithm for performance
- Handle edge cases (null values, missing fields)

---

### 4. Sort Node
**Status:** ⬜ Not Started

**Purpose:** Sort items based on field values or custom logic

**Configuration Parameters:**
- `type` (enum): "simple" | "random" | "code"
- `fieldsToSortBy` (array): List of sort configurations (for simple mode)
  - `fieldName` (string): Field to sort by
  - `order` (enum): "ascending" | "descending"
- `disableDotNotation` (boolean): Disable dot notation for field names
- `customCode` (string): JavaScript sort function (for code mode)

**Input Example:**
```json
[
  {"name": "Charlie", "age": 35, "score": 78},
  {"name": "Alice", "age": 28, "score": 92},
  {"name": "Bob", "age": 42, "score": 85}
]
```

**Output Example (Sort by score descending, then name ascending):**
```json
[
  {"name": "Alice", "age": 28, "score": 92},
  {"name": "Bob", "age": 42, "score": 85},
  {"name": "Charlie", "age": 35, "score": 78}
]
```

**Expected Edges:**
- `success`: Sorting completed
- `error`: Sort configuration error

**Implementation Notes:**
- Use stable sort algorithm
- Support multiple sort criteria
- Handle null/undefined values appropriately
- Implement random shuffle using Fisher-Yates algorithm

---

### 5. Limit Node
**Status:** ⬜ Not Started

**Purpose:** Limit the number of items passing through

**Configuration Parameters:**
- `maxItems` (number): Maximum number of items to keep
- `keepFrom` (enum): "beginning" | "end"

**Input Example:**
```json
[
  {"id": 1, "name": "Item 1"},
  {"id": 2, "name": "Item 2"},
  {"id": 3, "name": "Item 3"},
  {"id": 4, "name": "Item 4"},
  {"id": 5, "name": "Item 5"}
]
```

**Output Example (maxItems: 3, keepFrom: "beginning"):**
```json
[
  {"id": 1, "name": "Item 1"},
  {"id": 2, "name": "Item 2"},
  {"id": 3, "name": "Item 3"}
]
```

**Expected Edges:**
- `success`: Limit applied
- `all_items`: When input has fewer items than limit
- `error`: Configuration error

**Implementation Notes:**
- Simple implementation using array slice
- Consider memory efficiency for large datasets
- Add option for offset/skip functionality

---

## Data Transformation Nodes

### 6. Edit Fields (Set) Node
**Status:** ⬜ Not Started

**Purpose:** Create, modify, or remove fields in items

**Configuration Parameters:**
- `mode` (enum): "manual_mapping" | "json_output"
- `fieldsToSet` (array): List of field operations (for manual_mapping mode)
  - `name` (string): Field name (supports dot notation)
  - `value` (any): Value or expression to set
  - `type` (enum): "string" | "number" | "boolean" | "object" | "array" | "expression"
- `jsonOutput` (string): JSON template with expressions (for json_output mode)
- `includeOtherFields` (boolean): Include fields not specified in fieldsToSet
- `includeBinaryData` (boolean): Include binary data in output
- `supportDotNotation` (boolean): Enable dot notation for nested fields
- `ignoreTypeErrors` (boolean): Continue on type conversion errors

**Input Example:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "age": 30
}
```

**Output Example (Add fullName, remove age):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe"
}
```

**Expected Edges:**
- `success`: Fields set successfully
- `error`: Field setting error

**Implementation Notes:**
- Support expression evaluation for values
- Handle nested object creation with dot notation
- Implement field removal by not including in output
- Validate JSON output template syntax

---

### 7. Summarize (Pivot) Node
**Status:** ⬜ Not Started

**Purpose:** Aggregate data similar to Excel pivot tables

**Configuration Parameters:**
- `fieldsToSummarize` (array): List of field aggregation configurations
  - `fieldToAggregate` (string): Field name to aggregate
  - `aggregation` (enum): "append" | "average" | "concatenate" | "count" | "countUnique" | "max" | "min" | "sum"
  - `outputFieldName` (string): Name for aggregated field
  - `separator` (string): Separator for concatenate (default: ", ")
  - `includeEmptyValues` (boolean): Include empty/null values
- `fieldsToSplitBy` (array): Fields to group by (create separate aggregations)
- `outputFormat` (enum): "separate_items" | "single_item"
- `disableDotNotation` (boolean): Disable dot notation
- `skipMissingFields` (boolean): Skip items missing split-by fields

**Input Example:**
```json
[
  {"region": "North", "product": "Widget", "sales": 100, "quantity": 5},
  {"region": "North", "product": "Gadget", "sales": 150, "quantity": 3},
  {"region": "South", "product": "Widget", "sales": 200, "quantity": 8},
  {"region": "South", "product": "Gadget", "sales": 120, "quantity": 4}
]
```

**Output Example (Group by region, sum sales and quantity):**
```json
[
  {
    "region": "North",
    "totalSales": 250,
    "totalQuantity": 8,
    "itemCount": 2
  },
  {
    "region": "South",
    "totalSales": 320,
    "totalQuantity": 12,
    "itemCount": 2
  }
]
```

**Expected Edges:**
- `success`: Summarization completed
- `error`: Aggregation error

**Implementation Notes:**
- Implement all aggregation functions efficiently
- Handle null/undefined values based on configuration
- Support multiple group-by fields
- Optimize for large datasets using Map/reduce patterns

---

## Object Manipulation Nodes

### 8. Transform Object Node
**Status:** ⬜ Not Started

**Purpose:** Perform various object transformations

**Configuration Parameters:**
- `operation` (enum): "flatten" | "unflatten" | "pick" | "omit" | "renameKeys"
- `separator` (string): Separator for flatten/unflatten (default: ".")
- `depth` (number): Maximum depth for flatten (default: unlimited)
- `keys` (array): Keys to pick or omit
- `renameMap` (object): Old key to new key mapping
- `recursive` (boolean): Apply recursively to nested objects

**Input Example (Flatten):**
```json
{
  "user": {
    "name": "John",
    "address": {
      "city": "Boston",
      "zip": "02101"
    }
  }
}
```

**Output Example (Flatten):**
```json
{
  "user.name": "John",
  "user.address.city": "Boston",
  "user.address.zip": "02101"
}
```

**Input Example (Pick):**
```json
{
  "id": 123,
  "name": "John",
  "email": "john@example.com",
  "password": "secret123",
  "role": "admin"
}
```

**Output Example (Pick: ["id", "name", "email"]):**
```json
{
  "id": 123,
  "name": "John",
  "email": "john@example.com"
}
```

**Expected Edges:**
- `success`: Transformation completed
- `error`: Transformation error

**Implementation Notes:**
- Use lodash or implement custom flatten/unflatten
- Handle circular references
- Support array indices in flattened keys
- Validate rename map structure

---

### 9. JSON Extract Node
**Status:** ⬜ Not Started

**Purpose:** Extract values from JSON using various query methods

**Configuration Parameters:**
- `method` (enum): "jsonpath" | "dot_notation" | "jmespath"
- `path` (string): Query path/expression
- `fallbackValue` (any): Value to use if path not found
- `multiple` (boolean): Extract all matches (for JSONPath)
- `outputField` (string): Field name for extracted value

**Input Example:**
```json
{
  "data": {
    "users": [
      {"name": "Alice", "age": 30, "active": true},
      {"name": "Bob", "age": 25, "active": false},
      {"name": "Charlie", "age": 35, "active": true}
    ]
  }
}
```

**Output Example (JSONPath: "$.data.users[?(@.active==true)].name"):**
```json
{
  "extractedNames": ["Alice", "Charlie"]
}
```

**Expected Edges:**
- `success`: Extraction successful
- `not_found`: Path not found, used fallback
- `error`: Query syntax error

**Implementation Notes:**
- Use jsonpath-plus library
- Implement JMESPath support
- Handle edge cases (null values, missing paths)
- Provide clear error messages for invalid queries

---

## Comparison & Filtering Nodes

### 10. Filter Node
**Status:** ⬜ Not Started

**Purpose:** Filter items based on conditions

**Configuration Parameters:**
- `conditions` (array): List of condition groups
  - `field` (string): Field to check
  - `dataType` (enum): "string" | "number" | "boolean" | "date" | "array" | "object"
  - `operation` (enum): Varies by data type
    - String: "equals" | "notEquals" | "contains" | "notContains" | "startsWith" | "endsWith" | "regex" | "isEmpty" | "isNotEmpty"
    - Number: "equals" | "notEquals" | "gt" | "gte" | "lt" | "lte" | "between"
    - Boolean: "true" | "false"
    - Date: "before" | "after" | "between" | "equals"
  - `value` (any): Comparison value
  - `value2` (any): Second value for "between" operations
  - `combineWith` (enum): "AND" | "OR" (how to combine with next condition)
- `matchMode` (enum): "all" | "any" (applies to condition groups)

**Input Example:**
```json
[
  {"name": "Product A", "price": 25.99, "inStock": true, "category": "Electronics"},
  {"name": "Product B", "price": 15.50, "inStock": false, "category": "Books"},
  {"name": "Product C", "price": 45.00, "inStock": true, "category": "Electronics"}
]
```

**Output Example (Filter: price > 20 AND inStock = true AND category = "Electronics"):**
```json
[
  {"name": "Product A", "price": 25.99, "inStock": true, "category": "Electronics"},
  {"name": "Product C", "price": 45.00, "inStock": true, "category": "Electronics"}
]
```

**Expected Edges:**
- `passed`: Items that match conditions
- `filtered`: Items that don't match (optional separate output)
- `error`: Filter configuration error

**Implementation Notes:**
- Implement comprehensive condition evaluators for each data type
- Support regex with proper escaping
- Handle null/undefined values gracefully
- Optimize for performance with early exit on AND conditions

---

### 11. Compare Datasets (Merge) Node
**Status:** ⬜ Not Started

**Purpose:** Merge or compare two datasets with various join strategies

**Configuration Parameters:**
- `mode` (enum): "append" | "keep_matches" | "keep_non_matches" | "remove_matches" | "enrich" | "choose_branch"
- `input1Fields` (array): Fields from first input to include
- `input2Fields` (array): Fields from second input to include
- `matchFields` (array): Field pairs for matching
  - `field1` (string): Field name in input 1
  - `field2` (string): Field name in input 2
- `resolveConflicts` (enum): "prefer_input1" | "prefer_input2" | "merge_arrays" (for enrich mode)
- `selectedBranch` (enum): "input1" | "input2" (for choose_branch mode)

**Input 1 Example:**
```json
[
  {"userId": 1, "name": "Alice", "email": "alice@example.com"},
  {"userId": 2, "name": "Bob", "email": "bob@example.com"}
]
```

**Input 2 Example:**
```json
[
  {"userId": 1, "department": "Engineering", "salary": 90000},
  {"userId": 3, "department": "Sales", "salary": 75000}
]
```

**Output Example (Keep Matches - Inner Join on userId):**
```json
[
  {
    "userId": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "department": "Engineering",
    "salary": 90000
  }
]
```

**Output Example (Keep Non-Matches - Items only in Input 1):**
```json
[
  {"userId": 2, "name": "Bob", "email": "bob@example.com"}
]
```

**Expected Edges:**
- `success`: Merge/comparison completed
- `no_matches`: No matching items found (for keep_matches mode)
- `error`: Configuration error

**Implementation Notes:**
- Implement efficient join algorithms (hash joins for large datasets)
- Support multiple match fields
- Handle one-to-many and many-to-many relationships
- Provide clear output structure for each mode

---

### 12. Switch Node
**Status:** ⬜ Not Started

**Purpose:** Route items to different branches based on conditions

**Configuration Parameters:**
- `mode` (enum): "rules" | "expression"
- `rules` (array): List of routing rules (for rules mode)
  - `outputKey` (string): Edge name for this rule
  - `conditions` (array): Same as Filter node conditions
- `expression` (string): JavaScript expression returning edge name (for expression mode)
- `fallbackOutput` (string): Edge to use if no rules match (default: "default")

**Input Example:**
```json
{"orderTotal": 150, "customerType": "premium", "region": "US"}
```

**Output Example (Rules: premium customers to "vip", total > 100 to "high_value", else "standard"):**
- Routes to edge: `vip`

**Expected Edges:**
- Dynamic edges based on rules (e.g., `vip`, `high_value`, `standard`, `default`)
- `error`: Routing error

**Implementation Notes:**
- Evaluate rules in order, first match wins
- Support complex condition combinations
- Allow expression mode for custom logic
- Ensure all items route to exactly one edge

---

## String/Text Manipulation Nodes

### 13. String Operations Node
**Status:** ⬜ Not Started

**Purpose:** Perform various string manipulation operations

**Configuration Parameters:**
- `operation` (enum): "trim" | "uppercase" | "lowercase" | "capitalize" | "titleCase" | "replace" | "replaceAll" | "replaceRegex" | "split" | "substring" | "slice" | "concat" | "pad" | "stripHTML" | "slugify"
- `field` (string): Field to operate on
- `outputField` (string): Field name for result (default: overwrite input field)
- Operation-specific parameters:
  - `searchValue` (string): For replace operations
  - `replaceValue` (string): For replace operations
  - `separator` (string): For split operation
  - `start` (number): For substring/slice
  - `end` (number): For substring/slice
  - `values` (array): For concat operation
  - `length` (number): For pad operation
  - `padChar` (string): Character to pad with
  - `side` (enum): "left" | "right" | "both" (for pad operation)

**Input Example:**
```json
{
  "title": "  hello WORLD  ",
  "description": "<p>This is <strong>bold</strong> text</p>"
}
```

**Output Example (Operations: trim title, titleCase title, stripHTML description):**
```json
{
  "title": "Hello World",
  "description": "This is bold text"
}
```

**Expected Edges:**
- `success`: Operation completed
- `error`: Operation error

**Implementation Notes:**
- Use safe regex handling
- Implement HTML stripping with proper parser
- Handle null/undefined values gracefully
- Support multiple operations in sequence

---

### 14. Extract Text Node
**Status:** ⬜ Not Started

**Purpose:** Extract text using patterns and delimiters

**Configuration Parameters:**
- `method` (enum): "regex" | "between" | "extractAll" | "extractSpecific"
- `field` (string): Field containing text
- `pattern` (string): Regex pattern (for regex method)
- `flags` (string): Regex flags (e.g., "gi")
- `startDelimiter` (string): Starting delimiter (for between method)
- `endDelimiter` (string): Ending delimiter (for between method)
- `extractType` (enum): "email" | "url" | "phone" | "custom" (for extractAll method)
- `occurrence` (number): Which occurrence to extract (for extractSpecific method)
- `outputField` (string): Field name for extracted text

**Input Example:**
```json
{
  "text": "Contact us at support@example.com or sales@example.com. Visit https://example.com for more info. Call 555-1234."
}
```

**Output Example (Extract all emails):**
```json
{
  "text": "Contact us at support@example.com or sales@example.com. Visit https://example.com for more info. Call 555-1234.",
  "extractedEmails": ["support@example.com", "sales@example.com"]
}
```

**Expected Edges:**
- `success`: Extraction successful
- `not_found`: No matches found
- `error`: Pattern error

**Implementation Notes:**
- Provide predefined patterns for common extractions (email, URL, phone)
- Support capture groups in regex
- Handle multiple matches
- Validate regex patterns before execution

---

## Math/Calculation Nodes

### 15. Math Operations Node
**Status:** ⬜ Not Started

**Purpose:** Perform mathematical calculations

**Configuration Parameters:**
- `operation` (enum): "add" | "subtract" | "multiply" | "divide" | "power" | "sqrt" | "round" | "ceil" | "floor" | "abs" | "min" | "max" | "sum" | "average" | "modulo"
- `mode` (enum): "single_field" | "multiple_fields" | "aggregate"
- `field1` (string): First operand field (for single/multiple field modes)
- `field2` (string): Second operand field (for multiple field mode)
- `value` (number): Static value operand (alternative to field2)
- `fields` (array): Fields to aggregate (for aggregate mode)
- `outputField` (string): Field name for result
- `precision` (number): Decimal places to round to (default: no rounding)

**Input Example:**
```json
{
  "quantity": 5,
  "price": 19.99,
  "taxRate": 0.08
}
```

**Output Example (Calculate total: (quantity * price) * (1 + taxRate)):**
```json
{
  "quantity": 5,
  "price": 19.99,
  "taxRate": 0.08,
  "subtotal": 99.95,
  "total": 107.95
}
```

**Expected Edges:**
- `success`: Calculation completed
- `error`: Math error (division by zero, invalid operands)

**Implementation Notes:**
- Handle division by zero gracefully
- Support chaining multiple operations
- Implement proper rounding with precision
- Handle null/undefined values with fallbacks

---

### 16. Calculate Field Node
**Status:** ⬜ Not Started

**Purpose:** Calculate new field values using expressions

**Configuration Parameters:**
- `calculations` (array): List of calculation configurations
  - `outputField` (string): Field name for result
  - `formula` (string): Mathematical expression (supports field references)
  - `precision` (number): Decimal places
- `onError` (enum): "stop" | "skip" | "use_default"
- `defaultValue` (any): Value to use on error

**Input Example:**
```json
{
  "revenue": 1000000,
  "costs": 650000,
  "employees": 50
}
```

**Output Example (Formulas: profit = revenue - costs, profitMargin = (profit / revenue) * 100, revenuePerEmployee = revenue / employees):**
```json
{
  "revenue": 1000000,
  "costs": 650000,
  "employees": 50,
  "profit": 350000,
  "profitMargin": 35.00,
  "revenuePerEmployee": 20000
}
```

**Expected Edges:**
- `success`: Calculations completed
- `error`: Formula evaluation error

**Implementation Notes:**
- Use safe expression evaluator (mathjs or similar)
- Support common mathematical functions (sin, cos, log, etc.)
- Allow field references in formulas
- Validate formulas before execution

---

## Date/Time Nodes

### 17. Date & Time Node
**Status:** ⬜ Not Started

**Purpose:** Manipulate and format dates and times

**Configuration Parameters:**
- `operation` (enum): "format" | "parse" | "add" | "subtract" | "round" | "compare" | "extract" | "convert_timezone"
- `field` (string): Field containing date
- `outputField` (string): Field for result
- Operation-specific parameters:
  - `inputFormat` (string): Input date format (for parse)
  - `outputFormat` (string): Output date format (for format)
  - `amount` (number): Amount to add/subtract
  - `unit` (enum): "years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds"
  - `roundTo` (enum): "start_of_day" | "start_of_week" | "start_of_month" | "start_of_year" | "end_of_day" | "end_of_week" | "end_of_month" | "end_of_year"
  - `compareWith` (string): Field or value to compare with
  - `extract` (enum): "year" | "month" | "day" | "hour" | "minute" | "second" | "dayOfWeek" | "weekOfYear"
  - `fromTimezone` (string): Source timezone
  - `toTimezone` (string): Target timezone

**Input Example:**
```json
{
  "createdAt": "2025-01-15T14:30:00Z",
  "updatedAt": "2025-01-20T09:15:00Z"
}
```

**Output Example (Operations: format to "MM/DD/YYYY", calculate daysSince):**
```json
{
  "createdAt": "2025-01-15T14:30:00Z",
  "updatedAt": "2025-01-20T09:15:00Z",
  "createdAtFormatted": "01/15/2025",
  "daysSinceCreated": 5
}
```

**Expected Edges:**
- `success`: Date operation completed
- `error`: Invalid date or operation error

**Implementation Notes:**
- Use Luxon library for date manipulation
- Support ISO 8601 and common date formats
- Handle timezone conversions properly
- Validate date strings before parsing

---

## Validation Nodes

### 18. Validate Data Node
**Status:** ⬜ Not Started

**Purpose:** Validate data against schemas and rules

**Configuration Parameters:**
- `validationType` (enum): "json_schema" | "type_check" | "required_fields" | "range" | "pattern" | "custom"
- `schema` (object): JSON Schema definition (for json_schema mode)
- `typeChecks` (array): Field type validations (for type_check mode)
  - `field` (string): Field name
  - `expectedType` (enum): "string" | "number" | "boolean" | "array" | "object" | "null"
- `requiredFields` (array): List of required field names
- `rangeValidations` (array): Min/max validations
  - `field` (string): Field name
  - `min` (number): Minimum value
  - `max` (number): Maximum value
- `patternValidations` (array): Regex pattern validations
  - `field` (string): Field name
  - `pattern` (string): Regex pattern
  - `errorMessage` (string): Custom error message
- `stopOnError` (boolean): Stop workflow on validation failure
- `outputErrors` (boolean): Include validation errors in output

**Input Example:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "age": 25,
  "phone": "555-1234"
}
```

**Output Example (Validation: email pattern, age range 18-65, required fields):**
```json
// Valid Output
{
  "data": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "age": 25,
    "phone": "555-1234"
  },
  "isValid": true
}
```

**Expected Edges:**
- `valid`: All validations passed
- `invalid`: Validation failed
- `error`: Validation configuration error

**Implementation Notes:**
- Use AJV for JSON Schema validation
- Provide detailed error messages
- Support custom validation functions
- Split outputs for valid/invalid items

---

## Array Helper Utilities

### 19. Array Utilities Node
**Status:** ⬜ Not Started

**Purpose:** Provide common array manipulation utilities

**Configuration Parameters:**
- `operation` (enum): "chunk" | "compact" | "difference" | "intersection" | "union" | "unique" | "reverse" | "shuffle" | "flatten" | "first" | "last" | "sample"
- `field` (string): Field containing array
- `outputField` (string): Field for result
- Operation-specific parameters:
  - `chunkSize` (number): Size of chunks (for chunk)
  - `compareArray` (string): Field with array to compare (for difference/intersection/union)
  - `uniqueBy` (string): Field to determine uniqueness (for unique)
  - `depth` (number): Depth to flatten (for flatten)
  - `sampleSize` (number): Number of items to sample (for sample)

**Input Example:**
```json
{
  "numbers": [1, 2, 2, 3, 4, 4, 5],
  "tags": ["a", "b", "c", "d", "e", "f"]
}
```

**Output Example (Operations: unique on numbers, chunk tags by 2):**
```json
{
  "numbers": [1, 2, 2, 3, 4, 4, 5],
  "tags": ["a", "b", "c", "d", "e", "f"],
  "uniqueNumbers": [1, 2, 3, 4, 5],
  "chunkedTags": [["a", "b"], ["c", "d"], ["e", "f"]]
}
```

**Expected Edges:**
- `success`: Operation completed
- `error`: Array operation error

**Implementation Notes:**
- Implement efficient algorithms for each operation
- Handle nested arrays appropriately
- Support object arrays with custom comparison
- Optimize for large arrays

---

### 20. Object Utilities Node
**Status:** ⬜ Not Started

**Purpose:** Provide common object manipulation utilities

**Configuration Parameters:**
- `operation` (enum): "keys" | "values" | "entries" | "has_field" | "is_empty" | "merge" | "deep_merge" | "clone" | "get_nested" | "set_nested" | "delete_nested"
- `field` (string): Field containing object
- `outputField` (string): Field for result
- Operation-specific parameters:
  - `path` (string): Nested path (for get/set/delete nested)
  - `value` (any): Value to set (for set_nested)
  - `mergeWith` (string): Field with object to merge
  - `overwrite` (boolean): Overwrite on merge conflicts

**Input Example:**
```json
{
  "user": {
    "profile": {
      "name": "John",
      "age": 30
    },
    "settings": {
      "theme": "dark"
    }
  }
}
```

**Output Example (Operations: get keys, check has_field "profile.email"):**
```json
{
  "user": {...},
  "userKeys": ["profile", "settings"],
  "hasEmail": false
}
```

**Expected Edges:**
- `success`: Operation completed
- `not_found`: Field not found (for has_field, get_nested)
- `error`: Object operation error

**Implementation Notes:**
- Support deep cloning to avoid mutations
- Handle circular references
- Implement safe nested access
- Provide clear error messages for invalid paths

---

## Implementation Priority & Dependencies

### Phase 1: Core Array Operations (Week 1-2)
1. ✓ Split Out Node - Foundation for array processing
2. ✓ Aggregate Node - Opposite of Split Out
3. ✓ Filter Node - Essential for data filtering
4. ✓ Sort Node - Basic data organization
5. ✓ Limit Node - Simple but necessary

### Phase 2: Data Transformation (Week 3-4)
6. ✓ Edit Fields Node - Most versatile transformation
7. ✓ String Operations Node - Common text manipulation
8. ✓ Math Operations Node - Basic calculations
9. ✓ Date & Time Node - Date handling
10. ✓ Transform Object Node - Object restructuring

### Phase 3: Advanced Analysis (Week 5-6)
11. ✓ Summarize Node - Complex aggregations
12. ✓ Remove Duplicates Node - Deduplication with history
13. ✓ Compare Datasets Node - Complex merging
14. ✓ Validate Data Node - Quality assurance
15. ✓ JSON Extract Node - Advanced querying

### Phase 4: Specialized Operations (Week 7-8)
16. ✓ Extract Text Node - Pattern extraction
17. ✓ Calculate Field Node - Formula-based calculations
18. ✓ Switch Node - Advanced routing
19. ✓ Array Utilities Node - Helper functions
20. ✓ Object Utilities Node - Helper functions

---

## Testing Strategy

### Unit Tests
- Test each node operation independently
- Cover edge cases (null, undefined, empty arrays)
- Test error handling
- Validate output format

### Integration Tests
- Test node chains
- Test with real-world data scenarios
- Performance testing with large datasets
- Test error propagation

### Example Test Cases Per Node
```typescript
describe('FilterNode', () => {
  test('filters items by string equality', async () => {
    // Test implementation
  });
  
  test('handles null values gracefully', async () => {
    // Test implementation
  });
  
  test('combines AND/OR conditions correctly', async () => {
    // Test implementation
  });
});
```

---

## Performance Considerations

### Optimization Guidelines
1. **Memory Efficiency**: Use streaming for large datasets where possible
2. **Lazy Evaluation**: Implement lazy evaluation for data transformations
3. **Indexing**: Use Map/Set for fast lookups in comparison operations
4. **Batch Processing**: Process items in batches for better performance
5. **Caching**: Cache compiled regex patterns and expressions

### Benchmarking Targets
- Process 1,000 items: < 100ms
- Process 10,000 items: < 1s
- Process 100,000 items: < 10s

---

## Documentation Requirements

For each node, provide:
1. **Purpose**: What the node does
2. **Use Cases**: When to use it
3. **Configuration**: All parameters explained
4. **Examples**: Input/output examples
5. **Common Patterns**: Best practices
6. **Troubleshooting**: Common issues and solutions

---

## Code Quality Standards

### All Nodes Must:
- Follow TypeScript strict mode
- Include comprehensive JSDoc comments
- Have 80%+ test coverage
- Handle errors gracefully
- Log meaningful error messages
- Support dot notation where applicable
- Validate configuration on initialization
- Include AI hints for LLM guidance

---

## Next Steps

1. Review and approve this implementation plan
2. Set up node development template
3. Create base classes for common functionality
4. Begin Phase 1 implementation
5. Iterate based on testing and feedback

---

**Last Updated:** 2025-10-17  
**Version:** 1.0  
**Status:** Planning Phase
Read this guide '/Users/narcisbrindusescu/teste/workscript/NODE_DEVELOPMENT_BLUEPRINT.md' and treat it as system prompt for developing new nodes. After this proceed to implement Object Utilities Node and only this nodes to not overwhelm you. Put the node implementation typescript file in /shared/nodes/data folder and make sure this new nodes are exported properly and imported in '/Users/narcisbrindusescu/teste/workscript/shared/nodes/index.ts' as universal nodes to be consumed in workflows.you might use subagents for this task