# ExtractTextNode

**Version:** 1.0.0
**Type:** Universal Node (Zero Dependencies)
**Location:** `/shared/nodes/data/ExtractTextNode.ts`

## Overview

The ExtractTextNode is a production-ready universal workflow node for extracting text using patterns and delimiters. It provides four powerful extraction methods with support for predefined patterns (emails, URLs, phone numbers) and custom regex patterns.

## Features

- **Zero Dependencies**: Pure JavaScript/TypeScript implementation
- **Multiple Extraction Methods**: regex, between, extractAll, extractSpecific
- **Predefined Patterns**: Email, URL, and phone number extraction out of the box
- **Nested State Access**: Supports dot notation for field paths (e.g., `user.profile.bio`)
- **Comprehensive Error Handling**: Clear error messages for debugging
- **Deduplication**: Automatic deduplication for extractAll method
- **Capture Groups**: Regex method supports capture groups

## Extraction Methods

### 1. extractAll
Extract all instances of a predefined pattern or custom pattern.

**Predefined Patterns:**
- `email`: Standard email addresses (`user@example.com`)
- `url`: HTTP/HTTPS URLs (`https://example.com`)
- `phone`: US phone numbers with optional country code (`555-1234`, `(555) 678-9012`, `+1-555-999-8888`)

**Configuration:**
```json
{
  "method": "extractAll",
  "field": "text",
  "extractType": "email|url|phone|custom",
  "pattern": "custom-regex-pattern",
  "flags": "gi",
  "outputField": "results"
}
```

**Example:**
```json
{
  "extract-emails": {
    "method": "extractAll",
    "field": "emailText",
    "extractType": "email",
    "outputField": "allEmails"
  }
}
```

### 2. extractSpecific
Extract a specific occurrence (0-based index) of a pattern.

**Configuration:**
```json
{
  "method": "extractSpecific",
  "field": "text",
  "extractType": "email|url|phone|custom",
  "occurrence": 0,
  "pattern": "custom-regex-pattern",
  "flags": "gi",
  "outputField": "result"
}
```

**Example:**
```json
{
  "extract-first-email": {
    "method": "extractSpecific",
    "field": "emailText",
    "extractType": "email",
    "occurrence": 0,
    "outputField": "primaryEmail"
  }
}
```

### 3. between
Extract text between start and end delimiters.

**Configuration:**
```json
{
  "method": "between",
  "field": "text",
  "startDelimiter": "start-string",
  "endDelimiter": "end-string",
  "outputField": "results"
}
```

**Example:**
```json
{
  "extract-names": {
    "method": "between",
    "field": "userData",
    "startDelimiter": "Name: ",
    "endDelimiter": ",",
    "outputField": "names"
  }
}
```

### 4. regex
Extract text using custom regex patterns with support for capture groups.

**Configuration:**
```json
{
  "method": "regex",
  "field": "text",
  "pattern": "your-regex-pattern",
  "flags": "gi",
  "outputField": "matches"
}
```

**Example:**
```json
{
  "extract-product-ids": {
    "method": "regex",
    "field": "productData",
    "pattern": "Product: ([A-Z0-9]+)",
    "flags": "g",
    "outputField": "productIds"
  }
}
```

## Configuration Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | string | Yes | Extraction method: `regex`, `between`, `extractAll`, or `extractSpecific` |
| `field` | string | Yes | Field containing the text to extract from (supports dot notation) |
| `pattern` | string | Conditional | Regex pattern (required for `regex` method, optional for `extractAll`/`extractSpecific` with custom type) |
| `flags` | string | No | Regex flags (e.g., "g", "gi", "gm"). Defaults to "g" |
| `startDelimiter` | string | Conditional | Start delimiter (required for `between` method) |
| `endDelimiter` | string | Conditional | End delimiter (required for `between` method) |
| `extractType` | string | Conditional | Pattern type for `extractAll`/`extractSpecific`: `email`, `url`, `phone`, or `custom` |
| `occurrence` | number | Conditional | 0-based index for `extractSpecific` method. Defaults to 0 |
| `outputField` | string | No | Custom field name for extracted data. Defaults to `extractedText` |

## Edge Routes

### success
Returned when extraction succeeds and at least one match is found.

**Edge Data:**
```typescript
{
  extracted: string | string[],  // Single string for extractSpecific, array for others
  matches: number,               // Number of matches found
  field: string,                 // Field that was processed
  method: string                 // Extraction method used
}
```

### not_found
Returned when no matches are found or field doesn't exist.

**Edge Data:**
```typescript
{
  field: string,
  message: string,
  count: 0,
  method?: string
}
```

### error
Returned when configuration is invalid or extraction fails.

**Edge Data:**
```typescript
{
  error: string,
  nodeId: string,
  method?: string,
  field?: string,
  details?: string
}
```

## State Updates

The node updates the following state keys:

- `extractedText`: Always contains the extracted data (array or string)
- `<outputField>`: Custom field specified in configuration (or defaults to `extractedText`)

## Usage Examples

### Example 1: Extract All Emails
```json
{
  "initialState": {
    "text": "Contact support@example.com or sales@example.com"
  },
  "workflow": [
    {
      "extract-emails": {
        "method": "extractAll",
        "field": "text",
        "extractType": "email",
        "outputField": "emails",
        "success?": "process-emails"
      }
    }
  ]
}
```

**Result State:**
```json
{
  "text": "Contact support@example.com or sales@example.com",
  "emails": ["support@example.com", "sales@example.com"],
  "extractedText": ["support@example.com", "sales@example.com"]
}
```

### Example 2: Extract Specific Occurrence
```json
{
  "extract-second-url": {
    "method": "extractSpecific",
    "field": "urlText",
    "extractType": "url",
    "occurrence": 1,
    "outputField": "blogUrl",
    "success?": "next-node"
  }
}
```

### Example 3: Extract with Custom Regex
```json
{
  "extract-prices": {
    "method": "regex",
    "field": "productData",
    "pattern": "\\$([0-9.]+)",
    "flags": "g",
    "outputField": "prices",
    "success?": "calculate-total"
  }
}
```

### Example 4: Extract Between Delimiters
```json
{
  "extract-names": {
    "method": "between",
    "field": "userData",
    "startDelimiter": "Name: ",
    "endDelimiter": ",",
    "outputField": "names",
    "success?": "process-names"
  }
}
```

### Example 5: Nested State Access
```json
{
  "extract-bio-email": {
    "method": "extractAll",
    "field": "user.profile.bio",
    "extractType": "email",
    "outputField": "contactEmail",
    "success?": "send-email"
  }
}
```

## Error Handling

The node provides comprehensive error handling:

1. **Missing Required Parameters**: Clear messages about which parameter is missing
2. **Invalid Method**: Validation of the extraction method
3. **Invalid Regex**: Try-catch wrapper for regex compilation errors
4. **Field Not Found**: Graceful handling when the field doesn't exist in state
5. **No Matches**: Returns `not_found` edge when no matches are found

## Testing

The node includes comprehensive tests covering:
- All extraction methods
- All predefined patterns (email, url, phone)
- Custom regex patterns
- Capture groups
- Deduplication
- Nested state access
- Error conditions
- Edge routing

Run tests:
```bash
cd shared
bun test ExtractTextNode.test.ts
```

## Advanced Features

### Capture Groups
When using the `regex` method, if your pattern includes capture groups, the node will extract the first capture group instead of the full match:

```json
{
  "pattern": "Product: ([A-Z0-9]+)"
}
```
This extracts just "ABC123" from "Product: ABC123" instead of the full "Product: ABC123".

### Deduplication
The `extractAll` method automatically deduplicates matches:

```
Input: "test@example.com and test@example.com"
Output: ["test@example.com"]  // Only one instance
```

### Special Character Escaping
The `between` method automatically escapes special regex characters in delimiters, so you can safely use characters like `$`, `(`, `)`, `.`, etc.

## AI Hints

The node includes comprehensive AI hints for workflow generation:

```typescript
ai_hints: {
  purpose: 'Extract text from strings using regex patterns, delimiters, or predefined patterns for emails, URLs, and phone numbers',
  when_to_use: 'When you need to extract emails, URLs, phone numbers, or custom patterns from text fields',
  expected_edges: ['success', 'not_found', 'error'],
  example_usage: '{"extract-1": {"method": "extractAll", "field": "text", "extractType": "email", "outputField": "emails", "success?": "next"}}',
  example_config: '{"method": "regex|between|extractAll|extractSpecific", "field": "string", "pattern?": "string", "flags?": "string", "startDelimiter?": "string", "endDelimiter?": "string", "extractType?": "email|url|phone|custom", "occurrence?": "number", "outputField": "string"}'
}
```

## Integration

The node is automatically registered in the universal node registry and available in all environments (server, client, CLI).

**Import:**
```typescript
import { ExtractTextNode } from 'shared/nodes/data/ExtractTextNode';
// or
import { ExtractTextNode } from 'shared';
```

## Performance Considerations

- **Regex Compilation**: Regex patterns are compiled once per execution
- **Memory**: For large texts with many matches, consider using `extractSpecific` to limit results
- **Global Flag**: The global flag (`g`) is automatically added for `extractAll` if not specified

## Version History

- **1.0.0** (2025-10-18): Initial production-ready release
  - Four extraction methods (regex, between, extractAll, extractSpecific)
  - Predefined patterns for email, url, and phone
  - Comprehensive error handling
  - Full test coverage
  - AI hints for workflow generation
