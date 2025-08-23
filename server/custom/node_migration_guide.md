# Node Migration Guide

This guide documents the process of migrating nodes from the old workflow orchestrator implementation to the current workflow management system.

## Overview

The current system uses a **distributed node architecture** with a shared core engine that can execute across server, client, and universal environments. Nodes are categorized by their environment requirements.

## Migration Steps

### 1. Update Imports

**Old Implementation:**
```typescript
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../../core/types/node';
import { ExecutionContext } from '../../../../core/types/context';
import { RegisterNode } from '../../../registry';
```

**New Implementation:**
```typescript
import { WorkflowNode } from 'shared';
import { ExecutionContext, EdgeMap, NodeMetadata } from 'shared';
```

### 2. Update Class Declaration

**Old Implementation:**
```typescript
@RegisterNode
export class GoogleConnectNode implements Node {
```

**New Implementation:**
```typescript
export class GoogleConnectNode extends WorkflowNode {
```

**Key Changes:**
- Remove `@RegisterNode` decorator (not used in current system)
- Extend `WorkflowNode` instead of implementing `Node` interface

### 3. Update Metadata Structure

**Old Implementation:**
```typescript
metadata: NodeMetadata = {
    name: 'googleConnect',
    description: 'Connects to a Google account',
    type: 'action',
    ai_hints: {
        purpose: 'Connect to a Google account',
        when_to_use: 'When you need to connect to a Google account',
        expected_edges: ['success', 'error'],
        example_usage: 'Connect to a Google account'
    }
}
```

**New Implementation:**
```typescript
metadata: NodeMetadata = {
    id: 'googleConnect',              // Use old 'name' as 'id'
    name: 'Google Connect',           // Human-readable name
    description: 'Connects to a Google account and fetches profile information',
    version: '1.0.0',               // Add version
    inputs: ['email'],               // Define expected inputs
    outputs: ['success', 'error'],   // Define possible outputs/edges
    ai_hints: {                      // Keep existing ai_hints
        purpose: 'Connect to a Google account',
        when_to_use: 'When you need to connect to a Google account',
        expected_edges: ['success', 'error'],
        example_usage: 'Connect to a Google account'
    }
}
```

**Key Changes:**
- Add `id` field (use old `name` value)
- Convert `name` to human-readable format
- Remove `type` field (not used in current system)
- Add `version` field
- Add `inputs` and `outputs` arrays

### 4. Update Execute Method Signature

**Old Implementation:**
```typescript
async execute({ config, state }: ExecutionContext): Promise<SimpleEdgeMap> {
```

**New Implementation:**
```typescript
async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
```

**Key Changes:**
- Method receives full `context` object and separate `config` parameter
- Return type changed from `SimpleEdgeMap` to `EdgeMap`

### 5. Update State Access

**Old Implementation:**
```typescript
state.set('lastGmailConnectAttempt', { email, apiUrl, timestamp: Date.now() });
state.set("gmail_profile", data.profile);
state.set("google_token", data.token);
```

**New Implementation:**
```typescript
context.state.lastGmailConnectAttempt = { email, apiUrl, timestamp: Date.now() };
context.state.gmail_profile = data.profile;
context.state.google_token = data.token;
```

**Key Changes:**
- Access state directly via `context.state` instead of using `state.set()`
- State is a plain object, not a class with methods

### 6. Update Configuration Access

**Old Implementation:**
```typescript
const email = config?.email;
```

**New Implementation:**
```typescript
const email = config?.email;
```

**Key Changes:**
- Configuration access remains the same
- Config is now passed as separate parameter

## File Placement Guidelines

### Server Nodes (`/server/nodes/`)
Place nodes here if they:
- Use Node.js APIs (fs, http, crypto, etc.)
- Connect to databases or external services
- Require server-side authentication
- Need access to environment variables or server resources

**Examples:**
- FileSystemNode (uses `fs` module)
- DatabaseNode (connects to databases)
- AuthNode (server-side authentication)
- GoogleConnectNode (external API calls)

### Universal Nodes (`/shared/nodes/`)
Place nodes here if they:
- Have zero external dependencies
- Use only pure JavaScript/TypeScript
- Work in any environment (server, client, CLI)

**Examples:**
- MathNode (pure calculations)
- LogicNode (boolean operations)
- DataTransformNode (data manipulation)

### Client Nodes (`/client/nodes/`)
Place nodes here if they:
- Use browser APIs (localStorage, fetch, DOM)
- Require browser-specific functionality
- Handle UI interactions

**Examples:**
- LocalStorageNode (uses browser localStorage)
- FetchNode (browser fetch API)
- DOMNode (DOM manipulation)

## Directory Structure

```
/server/
├── nodes/
│   ├── custom/              # Custom business logic nodes
│   │   ├── googleConnect.ts
│   │   └── ...
│   ├── FileSystemNode.ts    # Core server nodes
│   ├── DatabaseNode.ts
│   └── AuthNode.ts

/shared/
├── nodes/                   # Universal nodes
│   ├── MathNode.ts
│   ├── LogicNode.ts
│   └── DataTransformNode.ts

/client/
├── nodes/                   # Client nodes
│   ├── LocalStorageNode.ts
│   ├── FetchNode.ts
│   └── DOMNode.ts
```

## Common Migration Patterns

### Error Handling
```typescript
// Both old and new systems use similar error patterns
return {
    error: () => ({
        message: 'Error description',
        details: error instanceof Error ? error.message : String(error)
    })
};
```

### Success Response
```typescript
// Return data for next node to use
return { 
    success: () => ({
        result: processedData,
        additionalInfo: metadata
    })
};
```

### State Management
```typescript
// Store results for other nodes to access
context.state.resultKey = processedData;
context.state.metadata = { timestamp: Date.now(), source: 'nodeId' };
```

## Migration Checklist

- [ ] Update imports to use shared types
- [ ] Change class to extend `WorkflowNode`
- [ ] Remove `@RegisterNode` decorator
- [ ] Add `id` field to metadata (use old `name` value)
- [ ] Add `version`, `inputs`, `outputs` to metadata
- [ ] Update execute method signature
- [ ] Change state access from `state.set()` to `context.state.property`
- [ ] Verify error handling follows EdgeMap pattern
- [ ] Place file in appropriate directory based on dependencies
- [ ] Test node functionality in new system

## Notes

- The current system automatically discovers nodes from their respective directories
- No registration decorators or manual registry needed
- State is shared across all nodes in a workflow execution
- Edge routing determines workflow flow based on node results
- Nodes should be stateless - all data goes through shared state or return values