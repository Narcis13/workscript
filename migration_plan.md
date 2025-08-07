# Workflow Engine Shared Architecture Refactoring Plan

## Overview

This plan outlines the migration of the workflow engine from server-only implementation to a shared architecture that can be used across server, client, and future CLI implementations. The current engine is perfectly suited for this migration due to its clean dependencies and infrastructure-agnostic design.

## Current State Analysis

### ✅ **Strengths of Current Implementation**
- **Clean Dependencies**: Core components (ExecutionEngine, WorkflowParser, StateManager, NodeRegistry) have minimal external dependencies - mostly just `ajv` for validation and standard Node.js modules
- **No Infrastructure Dependencies**: The engine doesn't depend on databases, file systems, or server-specific APIs
- **Modular Design**: Components are well-separated with clear interfaces
- **Advanced Features**: Already supports AST parsing, loop nodes, edge routing, state management with snapshots
- **Type Safety**: Comprehensive TypeScript implementation with shared types

### 🎯 **Perfect Candidate for Shared Architecture**
The engine components are already infrastructure-agnostic and can run in any JavaScript environment (browser, server, CLI).

## Phase 1: Core Engine Migration (Priority 1)

### 1. Move Core Engine Components to Shared Package
- **From**: `/server/src/engine/` → **To**: `/shared/src/engine/`
- **From**: `/server/src/parser/` → **To**: `/shared/src/parser/`
- **From**: `/server/src/state/` → **To**: `/shared/src/state/`
- **From**: `/server/src/schemas/` → **To**: `/shared/src/schemas/`
- Update imports throughout codebase

### 2. Enhanced NodeRegistry for Multi-Package Architecture
- Extend NodeRegistry to support multiple discovery paths
- Add package-aware node loading (`shared/nodes/`, `server/nodes/`, `client/nodes/`)
- Implement environment-specific node filtering
- Add node source tracking (universal, server, client)

### 3. Update Package Dependencies
- Add `ajv` and `glob` to shared package dependencies
- Update shared package exports for new components
- Configure build order: shared → server → client

## Phase 2: Distributed Node Architecture (Priority 1)

### 4. Create Node Directory Structure
- Create `/shared/nodes/` for universal nodes (no external dependencies)
- Create `/server/nodes/` for server-specific nodes (filesystem, auth, etc.)
- Create `/client/nodes/` for browser-specific nodes (DOM, localStorage, etc.)

### 5. Universal Nodes Implementation
- Move basic computational nodes to shared
- Ensure zero external dependencies
- Include: DataTransformNode, MathNode, LogicNode, etc.

### 6. Server-Specific Nodes
- Keep infrastructure-dependent nodes in server
- Include: FileSystemNode, DatabaseNode, AuthNode, etc.

### 7. Client-Specific Nodes
- Create browser-specific nodes in client
- Include: DOMNode, LocalStorageNode, FetchNode, etc.

## Phase 3: Integration & Testing (Priority 2)

### 8. Update All Import References
- Update server imports to use shared engine
- Update client to import shared engine
- Ensure type consistency across packages

### 9. Migrate and Update Tests
- Move core engine tests to shared package
- Update test imports and dependencies
- Ensure all tests pass with new structure

### 10. Update Build & Development Scripts
- Ensure proper dependency building
- Update dev commands to work with new structure
- Verify hot reloading across packages

## Phase 4: Enhanced Features (Priority 3)

### 11. Environment-Aware Engine Initialization
- Add factory methods for different environments
- Implement automatic node discovery based on environment
- Add configuration for node package loading

### 12. Update Documentation
- Update CLAUDE.md with new architecture
- Document distributed node development
- Update API documentation

## Target Architecture

### Shared Package (`/shared`)
```
shared/
├── src/
│   ├── types/           # Already exists
│   ├── engine/          # From server/src/engine/
│   ├── parser/          # From server/src/parser/
│   ├── state/           # From server/src/state/
│   ├── registry/        # Enhanced from server/src/registry/
│   └── schemas/         # From server/src/schemas/
└── nodes/               # Universal nodes (no external deps)
    ├── DataTransformNode.ts
    ├── MathNode.ts
    └── LogicNode.ts
```

### Server Package (`/server`)
```
server/
├── src/
│   ├── index.ts         # Hono API server
│   └── middleware/      # Server-specific middleware
└── nodes/               # Server-specific nodes
    ├── FileSystemNode.ts
    ├── DatabaseNode.ts
    └── AuthNode.ts
```

### Client Package (`/client`)
```
client/
├── src/
│   └── components/      # React components
└── nodes/               # Browser-specific nodes
    ├── DOMNode.ts
    ├── LocalStorageNode.ts
    └── FetchNode.ts
```

## Enhanced NodeRegistry Design

```typescript
// Enhanced NodeRegistry for multi-package architecture
export class NodeRegistry {
  private packageSources: Map<string, 'shared' | 'server' | 'client'> = new Map();
  
  /**
   * Discover nodes from multiple packages based on environment
   */
  async discoverFromPackages(environment: 'server' | 'client' | 'universal'): Promise<void> {
    const searchPaths = [];
    
    // Always include universal nodes
    searchPaths.push('./shared/nodes/');
    
    // Add environment-specific nodes
    if (environment === 'server' || environment === 'universal') {
      searchPaths.push('./server/nodes/');
    }
    
    if (environment === 'client' || environment === 'universal') {
      searchPaths.push('./client/nodes/');
    }
    
    for (const path of searchPaths) {
      await this.discover(path);
    }
  }
  
  /**
   * Get nodes by source package
   */
  getNodesBySource(source: 'shared' | 'server' | 'client'): NodeMetadata[] {
    return this.listNodes().filter(node => 
      this.packageSources.get(node.id) === source
    );
  }
}
```

## Expected Benefits

- ✅ **Universal Engine**: Use same engine in server API, browser, CLI tools
- ✅ **Better Node Organization**: Clear separation by environment capabilities  
- ✅ **Type Safety**: Maintain full TypeScript support across packages
- ✅ **Scalability**: Easy to add new node packages for different environments
- ✅ **Clean Dependencies**: Shared engine remains lightweight and portable
- ✅ **Future-Proof**: Easy to add CLI tools, Electron apps, or other environments

## Risk Mitigation

- All existing functionality preserved
- Comprehensive test coverage maintained
- Gradual migration approach with phases
- Rollback strategy if issues arise
- No breaking changes to existing API

## Usage Examples After Migration

### Server Usage (Hono API)
```typescript
import { ExecutionEngine, NodeRegistry } from 'shared';

const registry = new NodeRegistry();
await registry.discoverFromPackages('server');
const engine = new ExecutionEngine(registry, stateManager);
```

### Client Usage (React)
```typescript
import { ExecutionEngine, NodeRegistry } from 'shared';

const registry = new NodeRegistry();
await registry.discoverFromPackages('client');
const engine = new ExecutionEngine(registry, stateManager);
```

### CLI Usage (Future)
```typescript
import { ExecutionEngine, NodeRegistry } from 'shared';

const registry = new NodeRegistry();
await registry.discoverFromPackages('universal');
const engine = new ExecutionEngine(registry, stateManager);
```

## Implementation Checklist

### Phase 1: Core Engine Migration
- [ ] Move engine components to shared package
- [ ] Update package.json dependencies
- [ ] Enhance NodeRegistry for multi-package support
- [ ] Update all import statements
- [ ] Ensure builds work correctly

### Phase 2: Distributed Node Architecture  
- [ ] Create node directory structure
- [ ] Implement universal nodes in shared
- [ ] Create server-specific nodes
- [ ] Create client-specific nodes
- [ ] Test node discovery from multiple packages

### Phase 3: Integration & Testing
- [ ] Update all tests
- [ ] Verify functionality across environments
- [ ] Update build scripts
- [ ] Test hot reloading

### Phase 4: Documentation & Polish
- [ ] Update CLAUDE.md
- [ ] Create migration guide
- [ ] Document new node development patterns
- [ ] Add usage examples

---

*This migration plan maintains backward compatibility while enabling the workflow engine to be used across multiple environments, fulfilling the vision of a truly universal workflow execution system.*