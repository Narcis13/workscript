# Requirements Document: Server-Only Node Architecture Migration

## Introduction

This document outlines the requirements for migrating the Workscript monorepo from a distributed multi-environment node architecture to a simplified server-only architecture. Currently, nodes are distributed across multiple locations (`/packages/engine/nodes/`, `/apps/api/src/nodes/`, `/apps/frontend/nodes/`, `/server/nodes/`, `/client/nodes/`) with complex environment-specific discovery logic. This migration will consolidate all nodes into a single dedicated package (`@workscript/nodes`) while maintaining the frontend management application.

The primary goals are to:
- Eliminate client-side workflow execution complexity
- Create a single source of truth for all workflow nodes
- Simplify the NodeRegistry discovery mechanism
- Maintain the frontend application as a management/monitoring UI that calls the API for workflow execution
- Remove legacy code while preserving CRM functionality
- Improve maintainability and developer experience

This migration aligns with the architectural decision to execute all workflows server-side via the API, with the frontend application serving as a management interface rather than an execution environment.

Key technologies involved include TypeScript, Bun runtime, the existing ExecutionEngine from `@workscript/engine`, and the monorepo workspace structure with packages and apps.

---

## Requirements

### Requirement 1: Create Dedicated Nodes Package

**User Story:** As a developer, I want all workflow nodes consolidated in a single dedicated package, so that I have a clear single source of truth for node definitions and can easily discover and import them.

#### Acceptance Criteria

1. WHEN creating the package structure THEN a new directory `/packages/nodes/` is created in the monorepo
2. WHEN setting up the package THEN a `package.json` file is created with name `@workscript/nodes`
3. WHEN configuring the package THEN it includes proper TypeScript configuration with `tsconfig.json`
4. WHEN defining package exports THEN `package.json` has a main export pointing to `dist/index.js`
5. WHEN building the package THEN TypeScript compiles all `.ts` files to the `dist/` directory
6. WHEN importing the package THEN developers can use `import { ALL_NODES } from '@workscript/nodes'`
7. WHEN reviewing the structure THEN the package follows monorepo best practices for shared libraries
8. WHEN checking workspace configuration THEN `@workscript/nodes` is included in the root `package.json` workspaces array
9. WHEN examining dependencies THEN all server-specific dependencies (mysql2, bcryptjs, googleapis, etc.) are listed in the nodes package
10. WHEN validating the package THEN it has proper `"type": "module"` configuration for ESM support

### Requirement 2: Consolidate All Nodes into Single Location

**User Story:** As a developer, I want all nodes (formerly universal, API, and server nodes) moved to the new nodes package, so that I don't have to search multiple locations to find node implementations.

#### Acceptance Criteria

1. WHEN migrating universal nodes THEN all 27 nodes from `/packages/engine/nodes/` are moved to `/packages/nodes/`
2. WHEN migrating API nodes THEN all 9 nodes from `/apps/api/src/nodes/` are moved to `/packages/nodes/`
3. WHEN checking legacy nodes THEN any unique implementations from `/server/nodes/` are merged into `/packages/nodes/`
4. WHEN organizing the structure THEN nodes are organized logically by category (data/, custom/google/, custom/zoca/, etc.)
5. WHEN validating completeness THEN all node types are accounted for: Math, Logic, DataTransform, StateSetter, Empty, Log, Filter, Sort, Aggregate, Summarize, Limit, SplitOut, RemoveDuplicates, EditFields, TransformObject, JSONExtract, CompareDatasets, Switch, FileSystem, Database, Auth, and custom integrations
6. WHEN moving files THEN relative imports within nodes are updated to reflect new paths
7. WHEN consolidating THEN duplicate node implementations are identified and removed
8. WHEN reviewing node files THEN each node file maintains its existing class structure and metadata
9. WHEN checking node exports THEN all nodes are exported from `/packages/nodes/index.ts`
10. WHEN validating node integrity THEN all node tests are moved alongside their implementations

### Requirement 3: Create Unified Node Export

**User Story:** As a developer, I want a single export array containing all available nodes, so that I can easily register all nodes with the NodeRegistry without environment-specific logic.

#### Acceptance Criteria

1. WHEN creating the export file THEN `/packages/nodes/index.ts` exports a named array `ALL_NODES`
2. WHEN populating the array THEN it includes all node classes from the consolidated package
3. WHEN importing nodes THEN developers can destructure specific nodes: `import { MathNode, DatabaseNode } from '@workscript/nodes'`
4. WHEN registering nodes THEN the `ALL_NODES` array can be iterated to register all nodes at once
5. WHEN checking types THEN the export file includes proper TypeScript type definitions
6. WHEN examining the array THEN it contains approximately 36+ node classes
7. WHEN validating the export THEN all node classes extend the `WorkflowNode` base class
8. WHEN reviewing organization THEN the export is organized with clear comments separating node categories
9. WHEN importing in API THEN the import resolves correctly via workspace dependency
10. WHEN building THEN the export is compiled to `dist/index.js` with proper module resolution

### Requirement 4: Simplify NodeRegistry for Server-Only Execution

**User Story:** As a developer, I want the NodeRegistry to support only server-side node discovery, so that the codebase is simpler and doesn't carry unnecessary multi-environment complexity.

#### Acceptance Criteria

1. WHEN updating `NodeRegistry.ts` THEN the `Environment` type is removed or simplified to only 'server'
2. WHEN refactoring `discoverFromPackages()` THEN the environment parameter is removed or always defaults to 'server'
3. WHEN updating `getDiscoveryPaths()` THEN it returns only the path to `/packages/nodes/`
4. WHEN discovering nodes THEN the method scans `/packages/nodes/**/*.ts` for node files
5. WHEN handling production builds THEN the discovery also checks `/packages/nodes/dist/**/*.js`
6. WHEN removing legacy logic THEN references to 'client', 'universal', `/apps/frontend/nodes/`, `/client/nodes/`, and `/server/nodes/` are removed
7. WHEN keeping backward compatibility THEN existing workflow definitions continue to work without changes
8. WHEN discovering nodes THEN the registry still uses `findMonorepoRoot()` to resolve paths correctly in dev and production
9. WHEN registering nodes THEN all nodes are registered with source: 'server'
10. WHEN validating THEN the simplified logic reduces code complexity by at least 30%
11. WHEN testing THEN node discovery works in both development (source files) and production (built files) environments
12. WHEN checking errors THEN clear error messages are provided if the nodes package is not found

### Requirement 5: Update Engine Package Dependencies

**User Story:** As a developer, I want the engine package to be lightweight and focused on orchestration, so that it doesn't carry unnecessary server-specific dependencies.

#### Acceptance Criteria

1. WHEN reviewing `/packages/engine/package.json` THEN server-specific dependencies are removed
2. WHEN checking dependencies THEN packages like mysql2, bcryptjs, googleapis are not in the engine package
3. WHEN updating exports THEN the `/nodes` subpath export is removed from `package.json`
4. WHEN building the engine THEN the `nodes/` directory is not included in the build output
5. WHEN importing the engine THEN only core types and classes are available: ExecutionEngine, StateManager, WorkflowParser, NodeRegistry, HookManager, EventEmitter
6. WHEN checking TypeScript config THEN the build excludes the old `nodes/**/*` directory
7. WHEN validating the package THEN it remains compatible with existing code that imports core engine functionality
8. WHEN reviewing size THEN the engine package is significantly smaller without node implementations
9. WHEN checking peer dependencies THEN the engine doesn't require `@workscript/nodes` as a dependency
10. WHEN testing THEN the engine package builds successfully without node-related code

### Requirement 6: Update API Package Dependencies and Imports

**User Story:** As a developer working on the API server, I want to import nodes from the dedicated nodes package, so that I can access all workflow nodes with a simple import statement.

#### Acceptance Criteria

1. WHEN updating `/apps/api/package.json` THEN `"@workscript/nodes": "workspace:*"` is added to dependencies
2. WHEN removing old paths THEN the `src/nodes/` directory is deleted from the API package
3. WHEN updating WorkflowService THEN imports change from relative paths to `import { ALL_NODES } from '@workscript/nodes'`
4. WHEN initializing NodeRegistry THEN the code uses the simplified discovery method
5. WHEN registering nodes THEN the service can optionally manually register nodes using `ALL_NODES` array
6. WHEN building the API THEN it correctly resolves the workspace dependency to `@workscript/nodes`
7. WHEN running in development THEN hot reload works correctly with the new import structure
8. WHEN testing THEN all existing API tests pass with the new node imports
9. WHEN checking imports THEN there are no remaining imports from `/apps/api/src/nodes/`
10. WHEN validating THEN the API server starts successfully and can execute workflows

### Requirement 7: Remove Client-Side Workflow Execution

**User Story:** As a developer, I want client-side workflow execution removed from the frontend, so that all workflows are executed server-side via the API for consistency and security.

#### Acceptance Criteria

1. WHEN cleaning up the frontend THEN `/apps/frontend/nodes/` directory is completely deleted
2. WHEN removing client services THEN `ClientWorkflowService.ts` is deleted if it exists
3. WHEN updating frontend code THEN any imports of client nodes are removed
4. WHEN refactoring frontend THEN workflow execution calls are replaced with API calls to the server
5. WHEN checking components THEN no frontend component attempts to execute workflows locally
6. WHEN validating THEN the frontend application still compiles and runs successfully
7. WHEN testing frontend THEN workflows can be triggered via API and results are displayed
8. WHEN reviewing code THEN no references to `CLIENT_NODES` or `discoverFromPackages('client')` remain
9. WHEN checking services THEN the frontend only uses API clients to interact with workflows
10. WHEN preserving functionality THEN all frontend management UI features (viewing workflows, monitoring executions, etc.) remain functional

### Requirement 8: Delete Legacy Code Directories

**User Story:** As a developer, I want legacy code directories removed, so that the codebase is clean and there's no confusion about which code is active.

#### Acceptance Criteria

1. WHEN removing legacy client THEN `/client/` directory is completely deleted
2. WHEN removing legacy server nodes THEN `/server/nodes/` directory is completely deleted
3. WHEN checking the server THEN `/server/` CRM application code remains (only nodes are removed)
4. WHEN validating CRM THEN existing CRM features continue to work with nodes from `@workscript/nodes`
5. WHEN updating server imports THEN any imports from `/server/nodes/` are updated to use `@workscript/nodes`
6. WHEN checking git history THEN deleted directories are properly tracked in version control
7. WHEN reviewing workspace THEN `package.json` workspaces array is updated if needed
8. WHEN validating build THEN build scripts no longer reference deleted directories
9. WHEN checking references THEN no code references deleted paths
10. WHEN testing THEN the entire application builds and runs without the deleted directories

### Requirement 9: Update NodeRegistry Path Resolution

**User Story:** As a developer, I want NodeRegistry to correctly resolve node paths in both development and production environments, so that workflows execute successfully regardless of the environment.

#### Acceptance Criteria

1. WHEN in development THEN NodeRegistry scans `/packages/nodes/**/*.ts` for TypeScript source files
2. WHEN in production THEN NodeRegistry scans `/packages/nodes/dist/**/*.js` for compiled JavaScript files
3. WHEN using `findMonorepoRoot()` THEN it correctly identifies the monorepo root by looking for `packages/` and `apps/` directories
4. WHEN the root is not found THEN it falls back to `process.cwd()` with a warning
5. WHEN resolving paths THEN the registry uses absolute paths to avoid resolution issues
6. WHEN discovering nodes THEN it uses glob patterns that match both `.ts` and `.js` extensions
7. WHEN filtering files THEN test files (`*.test.ts`, `*.spec.ts`) are excluded
8. WHEN filtering files THEN index files (`index.ts`) are excluded from node class discovery
9. WHEN loading node modules THEN dynamic imports handle both ESM and CommonJS formats
10. WHEN handling errors THEN clear error messages indicate whether the issue is with path resolution or node loading
11. WHEN testing THEN the registry successfully discovers all nodes in both environments
12. WHEN validating THEN the discovery count matches the expected number of nodes (36+)

### Requirement 10: Update Build Configuration

**User Story:** As a developer, I want the build process to correctly compile the new nodes package, so that production deployments work without issues.

#### Acceptance Criteria

1. WHEN configuring TypeScript THEN `/packages/nodes/tsconfig.json` is properly set up
2. WHEN building nodes THEN all TypeScript files compile to the `dist/` directory
3. WHEN checking output THEN compiled files maintain the same directory structure
4. WHEN building the monorepo THEN `bun run build` includes the nodes package in the build order
5. WHEN building dependencies THEN nodes package builds before the API package
6. WHEN checking package.json THEN build scripts are defined for the nodes package
7. WHEN building for production THEN source maps are generated for debugging
8. WHEN validating output THEN type declaration files (`.d.ts`) are generated
9. WHEN checking module resolution THEN the compiled output uses correct import paths
10. WHEN testing the build THEN the production build can execute workflows successfully
11. WHEN optimizing THEN the build process doesn't include unnecessary files (tests, source maps in production, etc.)

### Requirement 11: Update Workspace Configuration

**User Story:** As a developer, I want the monorepo workspace configuration to correctly reference the new package structure, so that dependency resolution works correctly across the monorepo.

#### Acceptance Criteria

1. WHEN updating root `package.json` THEN `"./packages/nodes"` is included in the workspaces array
2. WHEN removing old workspaces THEN any references to deleted directories are removed
3. WHEN installing dependencies THEN `bun install` correctly links workspace dependencies
4. WHEN checking hoisting THEN shared dependencies are hoisted to the root `node_modules`
5. WHEN validating links THEN `@workscript/nodes` is correctly symlinked in `/apps/api/node_modules/`
6. WHEN running scripts THEN workspace scripts execute in the correct order
7. WHEN building THEN workspace dependencies build in dependency order (nodes before API)
8. WHEN checking versions THEN workspace protocol (`workspace:*`) is used for internal dependencies
9. WHEN testing THEN `bun run test` executes tests across all workspace packages
10. WHEN validating THEN there are no broken workspace dependencies

### Requirement 12: Update Documentation

**User Story:** As a developer or new team member, I want updated documentation that accurately reflects the new architecture, so that I can quickly understand how nodes are organized and used.

#### Acceptance Criteria

1. WHEN updating CLAUDE.md THEN all references to multi-environment architecture are removed
2. WHEN documenting structure THEN the new `/packages/nodes/` structure is clearly explained
3. WHEN explaining imports THEN examples show `import { ALL_NODES } from '@workscript/nodes'`
4. WHEN documenting NodeRegistry THEN the simplified server-only discovery is explained
5. WHEN updating examples THEN code examples use the new import patterns
6. WHEN explaining architecture THEN the server-only execution model is clearly stated
7. WHEN documenting frontend THEN it's clear the frontend is for management UI only, not execution
8. WHEN removing outdated info THEN references to client/frontend/universal nodes are removed
9. WHEN adding migration notes THEN a section explains what changed and why
10. WHEN providing examples THEN the documentation includes example workflows that work with the new structure
11. WHEN documenting node development THEN guidelines explain where to add new nodes (`/packages/nodes/`)
12. WHEN updating architecture diagrams THEN visual representations show the new package structure

### Requirement 13: Preserve Existing Workflow Compatibility

**User Story:** As a user with existing workflows, I want my workflow definitions to continue working without modification, so that I don't have to update all my workflows.

#### Acceptance Criteria

1. WHEN executing old workflows THEN they run successfully without changes
2. WHEN referencing node types THEN all existing node type IDs remain valid
3. WHEN using node configs THEN node configuration schemas remain unchanged
4. WHEN checking edges THEN edge routing logic remains consistent
5. WHEN accessing state THEN state management behavior is unchanged
6. WHEN using hooks THEN lifecycle hooks continue to work as before
7. WHEN testing compatibility THEN a suite of existing workflow definitions executes successfully
8. WHEN validating results THEN workflow outputs match expected results from before migration
9. WHEN checking database THEN stored workflows execute without modification
10. WHEN monitoring execution THEN workflow execution events and logging remain consistent

### Requirement 14: Update Node Import Patterns in Engine

**User Story:** As a developer, I want the engine to not depend on node implementations, so that the engine remains a pure orchestration layer.

#### Acceptance Criteria

1. WHEN reviewing engine code THEN no engine files import from `@workscript/nodes`
2. WHEN checking NodeRegistry THEN it doesn't have hardcoded node imports
3. WHEN registering nodes THEN registration happens via dynamic discovery or manual registration
4. WHEN using StateSetterNode THEN it's the only built-in node in the engine (special case)
5. WHEN testing the engine THEN tests can mock nodes without importing real implementations
6. WHEN checking dependencies THEN engine tests don't require the nodes package
7. WHEN validating separation THEN engine code is agnostic to specific node implementations
8. WHEN reviewing types THEN only base `WorkflowNode` type is used in engine interfaces
9. WHEN checking coupling THEN engine can theoretically work with any node implementations
10. WHEN documenting THEN the separation between engine (orchestration) and nodes (implementations) is clear

### Requirement 15: Ensure Production Deployment Readiness

**User Story:** As a DevOps engineer, I want the new architecture to be production-ready, so that I can deploy it without runtime issues.

#### Acceptance Criteria

1. WHEN building for production THEN `bun run build` completes without errors
2. WHEN checking output THEN all packages have complete `dist/` directories
3. WHEN starting the API THEN it starts successfully with the new node structure
4. WHEN executing workflows THEN production environment can discover and execute all nodes
5. WHEN checking performance THEN node discovery time is acceptable (< 1 second)
6. WHEN monitoring THEN proper logging indicates successful node discovery
7. WHEN handling errors THEN production errors are clear and actionable
8. WHEN testing deployment THEN a production-like environment is tested before release
9. WHEN validating paths THEN all import paths resolve correctly in production
10. WHEN checking dependencies THEN production dependencies are correctly listed (no dev dependencies in production)
11. WHEN running health checks THEN API health endpoint reports node registry status
12. WHEN documenting deployment THEN deployment documentation is updated with any new requirements

### Requirement 16: Update Test Suite

**User Story:** As a developer, I want the test suite updated to reflect the new architecture, so that tests pass and provide confidence in the migration.

#### Acceptance Criteria

1. WHEN running tests THEN all tests in `/packages/engine/` pass
2. WHEN running tests THEN all tests in `/packages/nodes/` pass
3. WHEN running tests THEN all tests in `/apps/api/` pass
4. WHEN updating imports THEN test files import from `@workscript/nodes`
5. WHEN testing NodeRegistry THEN registry tests validate server-only discovery
6. WHEN testing nodes THEN node tests are moved with their implementations
7. WHEN adding tests THEN new tests validate the simplified NodeRegistry logic
8. WHEN checking coverage THEN test coverage remains at or above previous levels
9. WHEN running CI THEN continuous integration pipeline passes with new structure
10. WHEN validating THEN integration tests exercise the full workflow execution path with new node imports

### Requirement 17: Clean Up Import Statements

**User Story:** As a developer, I want all import statements across the codebase updated, so that there are no broken imports or references to deleted code.

#### Acceptance Criteria

1. WHEN searching for imports THEN no files import from `/apps/api/src/nodes/`
2. WHEN searching for imports THEN no files import from `/apps/frontend/nodes/`
3. WHEN searching for imports THEN no files import from `/client/nodes/`
4. WHEN searching for imports THEN no files import from `/server/nodes/`
5. WHEN checking engine imports THEN no files import from `@workscript/engine/nodes`
6. WHEN updating API imports THEN all node imports use `@workscript/nodes`
7. WHEN checking relative imports THEN no broken relative imports remain
8. WHEN validating imports THEN TypeScript compiler reports no module resolution errors
9. WHEN running linter THEN ESLint reports no import-related errors
10. WHEN performing search THEN grep/search for old import patterns returns no results

### Requirement 18: Validate Node Metadata and Discovery

**User Story:** As a developer, I want to ensure all nodes are properly discoverable and have correct metadata, so that the workflow system can use them correctly.

#### Acceptance Criteria

1. WHEN discovering nodes THEN all 36+ nodes are found by NodeRegistry
2. WHEN checking metadata THEN every node has a complete `metadata` object
3. WHEN validating IDs THEN every node has a unique `id` in metadata
4. WHEN checking versions THEN every node has a `version` in metadata
5. WHEN reviewing descriptions THEN every node has a `description` in metadata
6. WHEN checking AI hints THEN every node has complete `ai_hints` in metadata
7. WHEN validating interfaces THEN every node extends `WorkflowNode` base class
8. WHEN checking execute methods THEN every node implements `async execute()` method
9. WHEN testing registration THEN every node can be successfully registered with NodeRegistry
10. WHEN logging discovery THEN node discovery logs include count and list of discovered node IDs

### Requirement 19: Update Development Scripts and Commands

**User Story:** As a developer, I want development scripts to work with the new structure, so that my development workflow is smooth.

#### Acceptance Criteria

1. WHEN running `bun run dev` THEN all services start correctly including API with new node structure
2. WHEN running `bun run build` THEN the nodes package builds successfully
3. WHEN running `bun run test` THEN tests run with correct imports
4. WHEN running type checking THEN `bun run typecheck` passes across all packages
5. WHEN using hot reload THEN changes to nodes trigger appropriate rebuilds
6. WHEN adding new nodes THEN the development workflow documentation explains where to add them
7. WHEN running linting THEN `bun run lint` passes with new structure
8. WHEN formatting THEN `bun run format` works across all packages including nodes
9. WHEN using watch mode THEN TypeScript watch mode works for the nodes package
10. WHEN developing THEN VS Code or IDE provides correct IntelliSense for node imports

### Requirement 20: Migration Verification and Rollback Plan

**User Story:** As a project lead, I want a comprehensive verification checklist and rollback plan, so that we can safely execute the migration.

#### Acceptance Criteria

1. WHEN planning migration THEN a detailed step-by-step migration guide is created
2. WHEN creating backups THEN a backup of the current codebase is made before migration
3. WHEN verifying THEN a checklist validates all migration steps are complete
4. WHEN testing THEN a comprehensive test suite validates the migration
5. WHEN checking compatibility THEN all existing workflows are tested post-migration
6. WHEN monitoring THEN key metrics (node discovery time, execution time) are measured before and after
7. WHEN documenting THEN migration notes capture any issues encountered and solutions
8. WHEN planning rollback THEN a rollback procedure is documented in case of critical issues
9. WHEN communicating THEN team members are notified of the migration timeline and changes
10. WHEN validating THEN sign-off is obtained from key stakeholders before deployment
11. WHEN completing THEN a migration retrospective documents lessons learned

---

## Non-Functional Requirements

### Performance

- Node discovery must complete in under 1 second in production
- Workflow execution time must not increase by more than 5% after migration
- Build time for the nodes package should be under 10 seconds
- Memory usage should not increase significantly with consolidated node package

### Security

- Server-side execution ensures workflows cannot be manipulated by clients
- Node implementations with sensitive operations (database, auth) remain server-only
- No security regressions introduced during migration

### Maintainability

- Code complexity in NodeRegistry reduced by at least 30%
- Single source of truth for nodes improves maintainability
- Clear separation of concerns between packages
- Comprehensive documentation enables new developers to understand architecture quickly

### Code Quality

- All TypeScript code passes strict type checking
- ESLint rules pass without warnings
- Test coverage maintained at current levels or improved
- No TODO comments or temporary hacks introduced during migration

### Compatibility

- Existing workflow definitions continue to work without modification
- API contracts remain unchanged
- Database schemas require no migration
- Frontend application continues to function for management tasks

---

## Out of Scope

The following items are explicitly **not** included in this migration:

- Rewriting existing workflows to use new node features
- Adding new node types or functionality
- Changing workflow execution logic or engine behavior
- Modifying database schemas or adding new tables
- Creating new frontend features beyond maintaining existing functionality
- Performance optimization beyond maintaining current performance
- Refactoring individual node implementations
- Adding new integrations or custom nodes
- Changing the CRM application structure or features
- Implementing new testing frameworks or tools
- Migrating to different technologies or frameworks
- Creating new documentation beyond updating existing docs
- Training or onboarding materials beyond updated documentation

---

## Success Metrics

The migration is considered successful when:

✅ All nodes consolidated in `/packages/nodes/` package
✅ NodeRegistry simplified to server-only discovery
✅ Engine package no longer contains node implementations
✅ API package successfully imports from `@workscript/nodes`
✅ Frontend application works for management tasks (no local execution)
✅ All legacy client directories deleted
✅ All tests passing across engine, nodes, and API packages
✅ Production build completes successfully
✅ Workflows execute successfully in production environment
✅ Node discovery time < 1 second
✅ All 36+ nodes discovered and registered correctly
✅ Documentation updated and accurate
✅ No broken imports or module resolution errors
✅ Code complexity reduced (measured by LOC in NodeRegistry)
✅ Team sign-off obtained
✅ Successfully deployed to staging environment

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-23
**Status:** Draft - Ready for Implementation
