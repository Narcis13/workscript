# Common Node Implementation Issues

Quick reference for frequent problems found during node reviews and how to fix them.

## Table of Contents
1. [ai_hints Inconsistencies](#1-ai_hints-inconsistencies)
2. [Multiple Edge Returns](#2-multiple-edge-returns)
3. [State Documentation Mismatches](#3-state-documentation-mismatches)
4. [Edge Naming Problems](#4-edge-naming-problems)
5. [Validation Placement](#5-validation-placement)
6. [Missing Exports](#6-missing-exports)
7. [Generic State Keys](#7-generic-state-keys)
8. [Poor Error Messages](#8-poor-error-messages)

---

## 1. ai_hints Inconsistencies

### Issue 1.1: Node ID Suffix in example_usage

**Problem**: Adding `-1` or other suffixes to node id in example_usage

```typescript
// WRONG
metadata = {
  id: 'calculateField',
  ai_hints: {
    example_usage: '{"calculateField-1": {"formula": "x + y", "success?": "next"}}'
    //              ^^^^^^^^^^^^^^^^^^^ WRONG - has '-1' suffix
  }
};
```

**Fix**: Use exact metadata.id

```typescript
// CORRECT
metadata = {
  id: 'calculateField',
  ai_hints: {
    example_usage: '{"calculateField": {"formula": "x + y", "success?": "next"}}'
    //              ^^^^^^^^^^^^^^^ CORRECT - exact match
  }
};
```

### Issue 1.2: Edge Names Not in expected_edges

**Problem**: Using edge names in example_usage that aren't declared in expected_edges

```typescript
// WRONG
ai_hints: {
  expected_edges: ['success', 'error'],
  example_usage: '{"myNode": {"done?": "next"}}'
  //                          ^^^^^ 'done' not in expected_edges
}
```

**Fix**: Use only declared edges

```typescript
// CORRECT
ai_hints: {
  expected_edges: ['success', 'error'],
  example_usage: '{"myNode": {"success?": "next", "error?": "handle"}}'
}
```

### Issue 1.3: Inconsistent example_config Format

**Problem**: example_config doesn't show all inputs or uses wrong format

```typescript
// WRONG - missing required params, unclear types
ai_hints: {
  inputs: ['operation', 'values', 'precision'],
  example_config: '{"operation": "add"}'  // Missing values, precision
}
```

**Fix**: Include all params with type hints

```typescript
// CORRECT
ai_hints: {
  inputs: ['operation', 'values', 'precision'],
  example_config: '{"operation": "add|subtract|multiply", "values": "[number, ...]", "precision?": "number"}'
}
```

---

## 2. Multiple Edge Returns

### Issue 2.1: Multiple Keys in Return Object

**Problem**: Returning EdgeMap with multiple keys

```typescript
// WRONG - Multiple keys in single return
return {
  success: () => ({ result }),
  error: () => ({ error: 'fallback' })  // NEVER include backup edge!
};
```

**Fix**: Return single key based on condition

```typescript
// CORRECT - Use conditional logic
if (result) {
  return { success: () => ({ result }) };
} else {
  return { error: () => ({ error: 'No result' }) };
}
```

### Issue 2.2: Default Case After Switch

**Problem**: Not returning edge in all code paths

```typescript
// WRONG - Missing default return
async execute(context, config) {
  switch (operation) {
    case 'add': return { success: () => ({ sum }) };
    case 'sub': return { success: () => ({ diff }) };
  }
  // What happens if operation is 'multiply'?
}
```

**Fix**: Always have default/else case

```typescript
// CORRECT
async execute(context, config) {
  switch (operation) {
    case 'add': return { success: () => ({ sum }) };
    case 'sub': return { success: () => ({ diff }) };
    default:
      return { error: () => ({ error: `Unknown operation: ${operation}` }) };
  }
}
```

---

## 3. State Documentation Mismatches

### Issue 3.1: post_to_state Doesn't Match Code

**Problem**: Documented state keys don't match what's actually written

```typescript
// WRONG - Documents filterResult but writes filtered
ai_hints: {
  post_to_state: ['filterResult', 'filterCount']
}

// In execute:
context.state.filtered = result;  // Wrong key name!
context.state.count = result.length;  // Wrong key name!
```

**Fix**: Sync documentation with code

```typescript
// CORRECT - Names match
ai_hints: {
  post_to_state: ['filteredData', 'filteredCount']
}

// In execute:
context.state.filteredData = result;
context.state.filteredCount = result.length;
```

### Issue 3.2: Missing State Writes

**Problem**: post_to_state lists keys that are never written

```typescript
// WRONG - Claims to write 'filterStats' but doesn't
ai_hints: {
  post_to_state: ['filterResult', 'filterCount', 'filterStats']
}

// execute() only writes:
context.state.filterResult = result;
context.state.filterCount = count;
// filterStats never written!
```

**Fix**: Remove unused or add missing writes

```typescript
// CORRECT - Only list what's actually written
ai_hints: {
  post_to_state: ['filterResult', 'filterCount']
}
```

---

## 4. Edge Naming Problems

### Issue 4.1: Vague Edge Names

**Problem**: Using unclear edge names

```typescript
// WRONG - What does 'ok' or 'done' mean?
return { ok: () => ({ data }) };
return { done: () => ({ result }) };
return { result: () => ({ value }) };  // 'result' as edge name
```

**Fix**: Use semantic edge names

```typescript
// CORRECT - Clear meaning
return { success: () => ({ data }) };
return { found: () => ({ result }) };
return { valid: () => ({ value }) };
return { high: () => ({ score }) };  // For multi-outcome
```

### Issue 4.2: Inconsistent Naming Convention

**Problem**: Mixing styles in same node

```typescript
// WRONG - Mixed naming
expected_edges: ['success', 'notFound', 'empty-result']
//               snake?     camelCase   kebab-case
```

**Fix**: Use consistent snake_case

```typescript
// CORRECT - Consistent snake_case
expected_edges: ['success', 'not_found', 'empty']
```

---

## 5. Validation Placement

### Issue 5.1: Validation Inside Try-Catch

**Problem**: Putting input validation inside try-catch

```typescript
// WRONG - Validation inside try-catch
async execute(context, config) {
  try {
    if (!config?.param) {  // Should be outside!
      return { error: () => ({ error: 'Missing param' }) };
    }
    // ...
  } catch (error) {
    return { error: () => ({ error: error.message }) };
  }
}
```

**Fix**: Validate before try-catch

```typescript
// CORRECT - Validation outside try-catch
async execute(context, config) {
  const { param } = config || {};

  // Validation FIRST
  if (!param) {
    return { error: () => ({ error: 'Missing param' }) };
  }

  // Then business logic in try-catch
  try {
    const result = await this.process(param);
    return { success: () => ({ result }) };
  } catch (error) {
    return { error: () => ({ error: error.message }) };
  }
}
```

### Issue 5.2: Throwing Instead of Returning Error Edge

**Problem**: Throwing errors instead of returning error edge

```typescript
// WRONG - Throws error
if (!param) {
  throw new Error('Missing param');  // Bad!
}
```

**Fix**: Return error edge

```typescript
// CORRECT - Returns error edge
if (!param) {
  return { error: () => ({ error: 'Missing param' }) };
}
```

---

## 6. Missing Exports

### Issue 6.1: Not in ALL_NODES Array

**Problem**: Node created but not registered

```typescript
// /packages/nodes/src/index.ts
import MyNode from './MyNode';
export { MyNode };  // Individual export exists

export const ALL_NODES = [
  MathNode,
  FilterNode,
  // MyNode missing from array!
];
```

**Fix**: Add to ALL_NODES

```typescript
// CORRECT
export const ALL_NODES = [
  MathNode,
  FilterNode,
  MyNode,  // Added!
];
```

### Issue 6.2: Missing Default Export

**Problem**: Only named export, no default

```typescript
// WRONG
export class MyNode extends WorkflowNode { ... }
// Missing: export default MyNode;
```

**Fix**: Add default export

```typescript
// CORRECT
export class MyNode extends WorkflowNode { ... }
export default MyNode;
```

---

## 7. Generic State Keys

### Issue 7.1: Using Conflicting Key Names

**Problem**: Generic keys that conflict across nodes

```typescript
// Node 1: FilterNode
context.state.result = filtered;  // Too generic!

// Node 2: MathNode
context.state.result = sum;  // Overwrites Node 1's result!

// Node 3: ApiNode
context.state.data = response;  // Also too generic
```

**Fix**: Use namespaced keys

```typescript
// CORRECT - Namespaced keys
context.state.filterResult = filtered;
context.state.mathResult = sum;
context.state.apiResponse = response;
```

### Issue 7.2: Not Documenting Namespace

**Problem**: Using namespaced keys but not documenting them

```typescript
// Code uses specific names but ai_hints are wrong
context.state.filterResult = result;
context.state.filterCount = count;

ai_hints: {
  post_to_state: ['result', 'count']  // Wrong! Doesn't match code
}
```

**Fix**: Document actual key names

```typescript
// CORRECT
ai_hints: {
  post_to_state: ['filterResult', 'filterCount']
}
```

---

## 8. Poor Error Messages

### Issue 8.1: Vague Error Messages

**Problem**: Error messages don't help debugging

```typescript
// WRONG
return { error: () => ({ error: 'Failed' }) };
return { error: () => ({ error: 'Invalid input' }) };
return { error: () => ({ error: 'Error occurred' }) };
```

**Fix**: Include context and suggestions

```typescript
// CORRECT
return {
  error: () => ({
    error: `Invalid operation: ${operation}`,
    nodeId: context.nodeId,
    expected: 'add | subtract | multiply | divide',
    received: operation,
    suggestion: 'Check the operation parameter value'
  })
};
```

### Issue 8.2: Missing nodeId in Errors

**Problem**: Errors don't include nodeId for debugging

```typescript
// WRONG - No nodeId
return { error: () => ({ error: msg }) };
```

**Fix**: Always include nodeId

```typescript
// CORRECT
return {
  error: () => ({
    error: msg,
    nodeId: context.nodeId
  })
};
```

---

## Quick Fix Reference

| Issue | Quick Fix |
|-------|-----------|
| ID suffix in example_usage | Remove `-1` or any suffix |
| Multiple edge keys | Split into conditional returns |
| Wrong state keys | Sync code with post_to_state |
| Vague edge names | Use: success, error, found, not_found, true, false, exists, not_exists, empty |
| Validation in try-catch | Move validation before try-catch |
| Missing export | Add to ALL_NODES in index.ts |
| Generic state key | Prefix with node name (e.g., `filterResult`) |
| No nodeId in error | Add `nodeId: context.nodeId` |
