# Node Review Checklist

Comprehensive checklist for reviewing workscript node implementations.

## Table of Contents
1. [File Structure](#1-file-structure)
2. [Metadata Compliance](#2-metadata-compliance)
3. [ai_hints Consistency](#3-ai_hints-consistency)
4. [Execute Method](#4-execute-method)
5. [Single-Edge Return Pattern](#5-single-edge-return-pattern)
6. [State Management](#6-state-management)
7. [Error Handling](#7-error-handling)
8. [Documentation](#8-documentation)
9. [Exports](#9-exports)

---

## 1. File Structure

- [ ] Class extends `WorkflowNode`
- [ ] Correct imports:
  ```typescript
  import { WorkflowNode } from '@workscript/engine';
  import type { ExecutionContext, EdgeMap } from '@workscript/engine';
  ```
- [ ] File location matches category:
  - Core nodes: `/packages/nodes/src/`
  - Data nodes: `/packages/nodes/src/data/`
  - Custom: `/packages/nodes/src/custom/[provider]/`
- [ ] Has default export: `export default NodeClass;`
- [ ] Has named export: `export { NodeClass };`

---

## 2. Metadata Compliance

### Required Fields
- [ ] `id` - Unique identifier (camelCase or kebab-case, NO spaces)
- [ ] `name` - Human-readable name
- [ ] `version` - Semantic version (e.g., '1.0.0')

### Optional but Recommended
- [ ] `description` - Clear description of what node does
- [ ] `inputs` - Array of config parameter names
- [ ] `outputs` - Array of edge data output keys
- [ ] `ai_hints` - AI workflow generation hints

### Metadata Example
```typescript
metadata = {
  id: 'filterData',          // NOT 'filter-data-1', NOT 'filter data'
  name: 'Filter Data',
  version: '1.0.0',
  description: 'Filters arrays based on field conditions',
  inputs: ['data', 'field', 'operator', 'value'],
  outputs: ['filtered', 'count'],
  ai_hints: { ... }
};
```

---

## 3. ai_hints Consistency

### Required ai_hints Fields
- [ ] `purpose` - Brief 1-sentence purpose
- [ ] `when_to_use` - When to use this node
- [ ] `expected_edges` - Array of ALL possible edge names

### Recommended ai_hints Fields
- [ ] `example_usage` - JSON workflow snippet
- [ ] `example_config` - JSON config structure with types
- [ ] `get_from_state` - State keys this node reads (usually empty - resolved by engine)
- [ ] `post_to_state` - State keys this node writes

### Critical Consistency Checks

#### A. example_usage Node ID
The node id in example_usage MUST match metadata.id exactly:

```typescript
// If metadata.id = 'filterData'

// WRONG
example_usage: '{"filterData-1": {...}}'    // NO suffix!
example_usage: '{"filter-data": {...}}'     // Different format!

// CORRECT
example_usage: '{"filterData": {...}}'      // Exact match!
```

#### B. example_usage Edge Names
All edges in example_usage must be in expected_edges:

```typescript
// If expected_edges: ['success', 'error', 'empty']

// WRONG - 'done' not in expected_edges
example_usage: '{"filterData": {"done?": "next"}}'

// CORRECT - 'success' is in expected_edges
example_usage: '{"filterData": {"success?": "next", "error?": "handle"}}'
```

#### C. post_to_state Must Match Code
Every key in `post_to_state` must be actually written in execute():

```typescript
// If post_to_state: ['filterResult', 'filterCount']

// Code MUST include:
context.state.filterResult = ...;
context.state.filterCount = ...;
```

#### D. example_config Must Match inputs
All required config params should be shown:

```typescript
// If inputs: ['data', 'field', 'operator', 'value']

// WRONG - missing required params
example_config: '{"data": "array"}'

// CORRECT - shows all params
example_config: '{"data": "array", "field": "string", "operator": "equals|gt|lt", "value": "any"}'
```

---

## 4. Execute Method

- [ ] Signature: `async execute(context: ExecutionContext, config?: any): Promise<EdgeMap>`
- [ ] Destructures config with defaults: `const { param } = config || {};`
- [ ] Returns `EdgeMap` (object with function values)
- [ ] All code paths return an EdgeMap

### Execute Structure Template
```typescript
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
  const { param1, param2 } = config || {};

  // 1. VALIDATION (outside try-catch)
  if (!param1) {
    return { error: () => ({ error: 'Missing param1' }) };
  }

  // 2. BUSINESS LOGIC (inside try-catch)
  try {
    const result = await this.operation(param1);

    // 3. STATE MUTATION
    context.state.nodeResult = result;

    // 4. RETURN SINGLE EDGE
    return { success: () => ({ result }) };

  } catch (error) {
    // 5. ERROR EDGE FROM CATCH
    return {
      error: () => ({
        error: error instanceof Error ? error.message : 'Failed',
        nodeId: context.nodeId
      })
    };
  }
}
```

---

## 5. Single-Edge Return Pattern

**CRITICAL: Every return statement must return exactly ONE edge key.**

- [ ] No return statement has multiple keys
- [ ] Conditional logic returns different single edges
- [ ] Catch block returns single error edge

### Correct Patterns

```typescript
// Pattern 1: Success/Error
if (!valid) {
  return { error: () => ({ error: 'Invalid' }) };
}
try {
  return { success: () => ({ result }) };
} catch {
  return { error: () => ({ error: msg }) };
}

// Pattern 2: Boolean
if (condition) {
  return { true: () => ({ result: true }) };
} else {
  return { false: () => ({ result: false }) };
}

// Pattern 3: Found/Not Found
if (item) {
  return { found: () => ({ item }) };
} else {
  return { not_found: () => ({ key }) };
}

// Pattern 4: Multi-Outcome
if (score >= 90) return { high: () => ({ score }) };
if (score >= 50) return { medium: () => ({ score }) };
return { low: () => ({ score }) };
```

### WRONG - Multiple Keys
```typescript
// NEVER DO THIS!
return {
  success: () => ({ result }),
  error: () => ({ error: 'backup' })  // Multiple keys!
};
```

---

## 6. State Management

- [ ] Uses direct mutation: `context.state.key = value`
- [ ] Uses namespaced keys (e.g., `filterResult` not `result`)
- [ ] All writes documented in `post_to_state`
- [ ] No instance state (no `this.result = ...`)

### State Key Naming
```typescript
// GOOD - Namespaced
context.state.filterResult = filtered;
context.state.mathSum = sum;
context.state.httpResponse = data;

// BAD - Generic (may conflict)
context.state.result = filtered;
context.state.data = data;
```

---

## 7. Error Handling

- [ ] Input validation BEFORE try-catch
- [ ] Validation errors return error edge immediately
- [ ] Try-catch wraps business logic
- [ ] Catch returns single error edge
- [ ] Error messages are descriptive
- [ ] Errors include `nodeId` for debugging

### Error Message Quality
```typescript
// BAD
return { error: () => ({ error: 'Failed' }) };

// GOOD
return {
  error: () => ({
    error: `Invalid operation: ${operation}`,
    nodeId: context.nodeId,
    expected: 'add|subtract|multiply|divide',
    received: operation
  })
};
```

---

## 8. Documentation

- [ ] JSDoc comment on class with `@example`
- [ ] Config interface defined (if complex)
- [ ] ai_hints complete and accurate
- [ ] State interactions documented

### Complete Documentation Example
```typescript
interface FilterConfig {
  data: unknown[];
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

/**
 * FilterNode - Filters arrays based on field conditions
 *
 * Filters input array where item[field] matches condition.
 *
 * @example
 * ```json
 * {
 *   "filterData": {
 *     "data": "$.items",
 *     "field": "status",
 *     "operator": "equals",
 *     "value": "active",
 *     "success?": "process"
 *   }
 * }
 * ```
 */
export class FilterNode extends WorkflowNode {
  // ...
}
```

---

## 9. Exports

Check `/packages/nodes/src/index.ts`:

- [ ] Node imported: `import MyNode from './MyNode';`
- [ ] Added to `ALL_NODES` array
- [ ] Named export: `export { MyNode };`

```typescript
// In /packages/nodes/src/index.ts

import MyNode from './MyNode';

export const ALL_NODES = [
  // ... other nodes
  MyNode,
];

export { MyNode };
```

---

## Quick Review Scoring

| Category | Weight | Pass Criteria |
|----------|--------|---------------|
| Single-Edge Return | 30% | All returns have exactly 1 key |
| ai_hints Consistency | 25% | ID matches, edges match, state documented |
| Metadata Complete | 15% | id, name, version, inputs, outputs |
| Error Handling | 15% | Validation + try-catch + descriptive errors |
| Exports | 15% | In index.ts and ALL_NODES |

**PASS**: All critical items (Single-Edge, ai_hints ID match) + 80% overall
**NEEDS FIXES**: Any critical failure or <80% overall
