# Requirements Document: Manifest-Based Node Discovery System

## Introduction

The Manifest-Based Node Discovery System is a critical infrastructure upgrade that replaces file-based node discovery with a production-ready, build-time manifest approach. This system enables reliable node registration across all environments (development, staging, production) and deployment targets (Docker, serverless, traditional servers).

Currently, the NodeRegistry uses runtime file system scanning with glob patterns to discover workflow nodes. While this works in development, it creates fragility in production environments due to dynamic import paths, varying directory structures, and bundler limitations. The manifest-based approach generates a static JSON manifest at build time containing metadata for all available nodes, enabling predictable discovery regardless of deployment environment.

This feature also includes migrating server nodes from the legacy `/server/nodes/` location to the new architecture at `/apps/api/src/nodes/`, completing the monorepo migration initiated in the packages/apps restructuring. The implementation supports dual-mode operation: file-based discovery in development (preserving fast iteration) and manifest-based discovery in production (ensuring reliability).

Key technologies include TypeScript for type safety, JSON Schema for manifest validation, Bun for build tooling, and the existing NodeRegistry infrastructure. The solution integrates seamlessly with the current bhvr stack (Bun + Hono + Vite + React) and maintains backward compatibility during migration.

---

## Requirements

### Requirement 1: Manifest Schema Definition

**User Story:** As a developer, I want a well-defined manifest schema, so that the node discovery system has a clear, validated contract for build-time generation and runtime loading.

#### Acceptance Criteria

1. WHEN the manifest TypeScript interface is defined THEN it MUST include fields for version, buildTime, environment metadata, and categorized node arrays (universal, server, client)
2. WHEN a NodeEntry interface is defined THEN it MUST include id, name, version, description, path, source, inputs, and outputs fields
3. WHEN the manifest JSON Schema is created THEN it MUST validate the structure with required fields and proper type constraints
4. WHEN the schema is exported THEN it MUST be available from `@workscript/engine/types` for import by other packages
5. WHEN invalid manifest data is validated THEN the JSON Schema validator MUST reject it with specific error messages
6. WHEN the manifest schema is documented THEN it MUST include JSDoc comments explaining each field's purpose
7. IF the manifest version changes THEN the schema MUST support backward compatibility or provide migration guidance
8. WHEN the schema is created THEN it MUST be stored in `/packages/engine/src/types/manifest.ts`
9. WHEN environment metadata is included THEN it MUST capture Node.js version, Bun version, and build platform
10. WHEN node paths are stored THEN they MUST be relative paths from the manifest location to enable portability
11. WHEN the schema is used THEN it MUST support serialization to JSON and TypeScript type checking
12. IF additional node metadata is needed THEN the schema MUST be extensible without breaking existing manifests

---

### Requirement 2: Manifest Generator Script

**User Story:** As a build engineer, I want an automated script that scans all node directories and generates a complete manifest, so that all nodes are discoverable in production builds without manual maintenance.

#### Acceptance Criteria

1. WHEN the generator script is executed THEN it MUST scan `/packages/engine/nodes/` for universal nodes
2. WHEN the generator script is executed THEN it MUST scan `/apps/api/src/nodes/` for server nodes
3. WHEN the generator script is executed THEN it MUST scan `/apps/frontend/nodes/` for client nodes
4. WHEN scanning directories THEN the script MUST use glob patterns to find all `.ts` files excluding `.test.ts` and `index.ts`
5. WHEN a node file is found THEN the script MUST dynamically import it to extract metadata
6. WHEN importing a node THEN the script MUST instantiate the class and read the `metadata` property
7. WHEN node metadata is extracted THEN it MUST include id, name, version, description, inputs, and outputs
8. WHEN calculating file paths THEN the script MUST generate relative paths to compiled `.js` files in dist directories
9. WHEN all nodes are scanned THEN the manifest MUST be written to `/packages/engine/dist/node-manifest.json`
10. WHEN the manifest is written THEN it MUST include a buildTime timestamp in ISO 8601 format
11. WHEN the manifest is generated THEN it MUST validate against the JSON Schema before writing
12. IF a node has invalid or missing metadata THEN the script MUST log a warning but continue processing other nodes
13. IF a node file cannot be imported THEN the script MUST log the error with file path and continue
14. WHEN the script completes successfully THEN it MUST exit with code 0 and log the total node count
15. WHEN the script encounters fatal errors THEN it MUST exit with non-zero code and descriptive error message

---

### Requirement 3: Build Integration

**User Story:** As a developer, I want manifest generation to occur automatically during builds, so that the manifest is always up-to-date and I don't need to remember manual steps.

#### Acceptance Criteria

1. WHEN the engine package build starts THEN manifest generation MUST run before TypeScript compilation
2. WHEN `bun run build:engine` is executed THEN the manifest generator script MUST be invoked via prebuild hook
3. WHEN manifest generation fails THEN the build MUST fail with a clear error message
4. WHEN the manifest is generated THEN it MUST be written to the dist directory alongside compiled code
5. WHEN developers run `bun install` THEN the postinstall hook MUST trigger engine build and manifest generation
6. WHEN CI/CD pipelines build the project THEN manifest generation MUST occur in the correct build order
7. WHEN the manifest is generated THEN subsequent TypeScript compilation MUST include the manifest file in output
8. IF the generator script is missing THEN the build MUST fail with instructions to restore it
9. WHEN building for production THEN environment variable `NODE_ENV=production` MUST be set
10. WHEN the build completes THEN the manifest MUST exist at the expected path with valid JSON content
11. WHEN developers modify node files THEN running build again MUST regenerate the manifest with updated data
12. IF prebuild hooks fail THEN the main build MUST not proceed to prevent incomplete builds

---

### Requirement 4: Server Node Migration

**User Story:** As a developer, I want all server nodes migrated to the new architecture location, so that the codebase follows consistent patterns and legacy paths are eliminated.

#### Acceptance Criteria

1. WHEN the migration begins THEN a new directory `/apps/api/src/nodes/` MUST be created
2. WHEN organizing server nodes THEN subdirectories `/apps/api/src/nodes/core/` and `/apps/api/src/nodes/custom/` MUST be created
3. WHEN migrating core nodes THEN `FileSystemNode.ts`, `DatabaseNode.ts`, and `AuthNode.ts` MUST be moved from `/server/nodes/` to `/apps/api/src/nodes/core/`
4. WHEN migrating custom integrations THEN all Gmail-related nodes MUST be moved to `/apps/api/src/nodes/custom/google/gmail/`
5. WHEN migrating custom integrations THEN all Zoca-related nodes MUST be moved to `/apps/api/src/nodes/custom/zoca/`
6. WHEN node files are moved THEN all imports MUST be updated to use `@workscript/engine` package
7. WHEN barrel exports are created THEN `/apps/api/src/nodes/core/index.ts` MUST export all core nodes
8. WHEN barrel exports are created THEN `/apps/api/src/nodes/custom/index.ts` MUST export all custom integration nodes
9. WHEN barrel exports are created THEN `/apps/api/src/nodes/index.ts` MUST re-export from all subdirectories
10. WHEN WorkflowService is updated THEN it MUST import from new node locations instead of legacy paths
11. WHEN NodeRegistry is updated THEN discovery paths MUST reference `/apps/api/src/nodes/` instead of `/server/nodes/`
12. WHEN the migration is complete THEN `/server/nodes/` MUST remain unchanged (for backward compatibility until fully deprecated)
13. WHEN tests are run THEN all server node tests MUST pass with nodes in new locations
14. WHEN the API server starts THEN it MUST successfully discover and register all 9 migrated server nodes
15. IF any imports are broken THEN TypeScript compilation MUST fail with clear error messages indicating missing imports

---

### Requirement 5: Dual-Mode Discovery Implementation

**User Story:** As a developer, I want the NodeRegistry to use file-based discovery in development and manifest-based discovery in production, so that I have fast iteration locally and reliability in deployment.

#### Acceptance Criteria

1. WHEN `discoverFromPackages()` is called THEN it MUST check `process.env.NODE_ENV` to determine mode
2. WHEN `NODE_ENV=production` THEN the registry MUST use manifest-based discovery
3. WHEN `NODE_ENV` is undefined or `development` THEN the registry MUST use file-based discovery
4. WHEN `USE_NODE_MANIFEST=true` is set THEN manifest mode MUST be used regardless of NODE_ENV
5. WHEN `USE_NODE_MANIFEST=false` is set THEN file-based mode MUST be used regardless of NODE_ENV
6. WHEN manifest mode is active THEN the registry MUST call `discoverFromManifest()` private method
7. WHEN file-based mode is active THEN the registry MUST call existing `discoverFromPath()` methods
8. WHEN switching modes THEN no code changes should be required, only environment variable changes
9. WHEN developers add new nodes in development THEN they MUST be discoverable immediately without rebuilding
10. WHEN testing manifest mode locally THEN developers MUST be able to set `USE_NODE_MANIFEST=true` to simulate production
11. IF both modes are functional THEN the same workflows MUST execute identically in either mode
12. WHEN mode is selected THEN a debug log MUST indicate which discovery mode is active

---

### Requirement 6: Manifest Loading Implementation

**User Story:** As a system administrator, I want the NodeRegistry to reliably load nodes from the manifest in production, so that deployments work across all hosting environments.

#### Acceptance Criteria

1. WHEN `discoverFromManifest()` is called THEN it MUST resolve the manifest path from the engine package dist directory
2. WHEN the manifest path is resolved THEN it MUST work regardless of current working directory
3. WHEN the manifest file is loaded THEN it MUST be parsed as JSON and validated against the schema
4. WHEN manifest validation fails THEN the system MUST log the error and fall back to file-based discovery
5. WHEN the environment is `server` THEN only universal and server nodes from the manifest MUST be loaded
6. WHEN the environment is `client` THEN only universal and client nodes from the manifest MUST be loaded
7. WHEN the environment is `universal` THEN all nodes from the manifest MUST be loaded
8. WHEN loading nodes THEN the registry MUST iterate through applicable manifest entries
9. WHEN a manifest entry is processed THEN the node file MUST be dynamically imported using the entry's path
10. WHEN a node module is imported THEN the default export or first exported class MUST be registered
11. WHEN a node is registered THEN it MUST use the source type from the manifest entry
12. IF a manifest entry path is invalid THEN that node MUST be skipped with a warning, but loading MUST continue
13. IF the manifest file is missing in production THEN the system MUST log a critical error and attempt fallback
14. WHEN all manifest entries are processed THEN a summary log MUST show total nodes loaded per category
15. WHEN manifest loading completes THEN the NodeRegistry MUST contain all expected nodes ready for workflow execution

---

### Requirement 7: Environment-Based Node Filtering

**User Story:** As an application developer, I want the system to automatically load only nodes compatible with the current runtime environment, so that server-specific nodes don't leak into client bundles and vice versa.

#### Acceptance Criteria

1. WHEN the API server initializes THEN it MUST call `discoverFromPackages('server')`
2. WHEN the frontend initializes THEN it MUST call `discoverFromPackages('client')`
3. WHEN CLI tools initialize THEN they MUST call `discoverFromPackages('universal')`
4. WHEN `server` environment is specified THEN the registry MUST load universal nodes and server nodes only
5. WHEN `client` environment is specified THEN the registry MUST load universal nodes and client nodes only
6. WHEN `universal` environment is specified THEN the registry MUST load only universal nodes
7. WHEN filtering nodes THEN the system MUST use the `source` field from manifest entries
8. WHEN a node's source doesn't match the environment THEN it MUST be excluded from loading
9. WHEN the wrong environment is specified THEN workflows using unavailable nodes MUST fail with clear errors
10. IF a workflow requires a server node THEN it MUST only execute in server or universal environments
11. IF a workflow requires a client node THEN it MUST only execute in client or universal environments
12. WHEN environment filtering is applied THEN bundle sizes MUST reflect only included nodes (smaller client bundles)

---

### Requirement 8: Monorepo Root Detection Enhancement

**User Story:** As a DevOps engineer, I want the system to reliably detect the monorepo root in various deployment scenarios, so that path resolution works in Docker, serverless, and traditional deployments.

#### Acceptance Criteria

1. WHEN the system needs the monorepo root THEN it MUST check for `packages/` and `apps/` directories
2. WHEN `packages/` and `apps/` exist THEN that directory MUST be identified as the monorepo root
3. WHEN the new architecture is not found THEN the system MUST check for legacy `shared/` and `server/` directories
4. WHEN walking up the directory tree THEN the system MUST stop at filesystem root to prevent infinite loops
5. WHEN no monorepo markers are found THEN the system MUST fall back to `process.cwd()`
6. WHEN running in Docker THEN the detection MUST work regardless of the container's working directory
7. WHEN deployed to serverless platforms THEN the detection MUST handle bundled code structures
8. WHEN the monorepo root is found THEN discovery paths MUST be constructed relative to it
9. IF manifest mode is active THEN monorepo root detection MUST be skipped (manifest paths are pre-computed)
10. WHEN detection completes THEN a debug log MUST show the detected root path

---

### Requirement 9: Error Handling and Validation

**User Story:** As a quality assurance engineer, I want comprehensive error handling throughout the discovery system, so that failures are caught early with actionable error messages.

#### Acceptance Criteria

1. WHEN manifest generation encounters a node with missing metadata THEN it MUST log a warning with the file path and continue
2. WHEN manifest generation cannot import a node file THEN it MUST log the import error and file path, then continue
3. WHEN manifest validation fails THEN the error MUST include which fields violated the schema
4. WHEN manifest file cannot be written THEN the build MUST fail with filesystem error details
5. WHEN manifest loading encounters a missing file THEN it MUST log a critical error and attempt fallback
6. WHEN manifest JSON is malformed THEN parsing errors MUST be caught and logged with context
7. WHEN a manifest entry has an invalid path THEN that entry MUST be skipped with a warning
8. WHEN node registration fails THEN the error MUST include the node ID and failure reason
9. WHEN falling back from manifest to file-based discovery THEN the system MUST log the reason for fallback
10. WHEN discovery completes THEN the total node count MUST be logged for verification
11. IF no nodes are discovered THEN a critical warning MUST be logged indicating a configuration issue
12. WHEN errors occur THEN error messages MUST be developer-friendly with troubleshooting hints
13. WHEN running in CI/CD THEN all errors MUST be visible in build logs with clear failure reasons
14. IF manifest version is incompatible THEN a clear upgrade message MUST be shown
15. WHEN production builds fail discovery THEN the system MUST provide a health check endpoint showing discovery status

---

### Requirement 10: Backward Compatibility

**User Story:** As a maintainer, I want the manifest system to maintain backward compatibility with existing code, so that the migration can be gradual and reversible.

#### Acceptance Criteria

1. WHEN file-based discovery is active THEN existing workflows MUST execute without modifications
2. WHEN the `discoverFromPackages()` API is called THEN the method signature MUST remain unchanged
3. WHEN legacy code uses `discover()` directly THEN it MUST continue to work in development mode
4. WHEN the manifest is not available THEN the system MUST gracefully fall back to file-based discovery
5. WHEN `USE_NODE_MANIFEST=false` is set THEN the system MUST behave exactly as it did before manifest implementation
6. WHEN node metadata format changes THEN both old and new formats MUST be supported
7. WHEN the manifest schema is updated THEN version checking MUST prevent incompatibility errors
8. IF a rollback is needed THEN disabling manifest mode MUST be achievable via environment variable only
9. WHEN testing both modes THEN a test suite MUST verify identical behavior between file-based and manifest discovery
10. WHEN documentation references discovery THEN it MUST explain both modes and when each is used

---

### Requirement 11: Unit Tests for Manifest Generation

**User Story:** As a test engineer, I want comprehensive unit tests for manifest generation, so that the build-time scanning and metadata extraction is reliable.

#### Acceptance Criteria

1. WHEN testing manifest generation THEN there MUST be a test for generating valid manifest structure
2. WHEN testing metadata extraction THEN there MUST be a test for correctly reading node metadata properties
3. WHEN testing error handling THEN there MUST be a test for nodes with missing metadata
4. WHEN testing error handling THEN there MUST be a test for nodes with invalid metadata
5. WHEN testing file scanning THEN there MUST be a test for correctly globbing node directories
6. WHEN testing path generation THEN there MUST be a test verifying relative paths are correct
7. WHEN testing validation THEN there MUST be a test for manifest JSON Schema validation
8. WHEN testing multiple directories THEN there MUST be a test for scanning universal, server, and client nodes
9. WHEN testing edge cases THEN there MUST be a test for empty node directories
10. WHEN testing edge cases THEN there MUST be a test for duplicate node IDs across directories
11. WHEN testing build timestamp THEN there MUST be a test verifying ISO 8601 format
12. WHEN testing environment metadata THEN there MUST be a test for capturing Node/Bun versions
13. WHEN all tests pass THEN manifest generation MUST be considered reliable for production use
14. WHEN tests run THEN code coverage for manifest generator MUST exceed 90%

---

### Requirement 12: Unit Tests for Manifest Loading

**User Story:** As a test engineer, I want comprehensive unit tests for manifest loading, so that runtime node registration from the manifest is reliable.

#### Acceptance Criteria

1. WHEN testing manifest loading THEN there MUST be a test for loading a valid manifest file
2. WHEN testing manifest loading THEN there MUST be a test for handling missing manifest file
3. WHEN testing manifest loading THEN there MUST be a test for handling malformed JSON
4. WHEN testing environment filtering THEN there MUST be a test for server environment loading only universal + server nodes
5. WHEN testing environment filtering THEN there MUST be a test for client environment loading only universal + client nodes
6. WHEN testing environment filtering THEN there MUST be a test for universal environment loading only universal nodes
7. WHEN testing manifest path resolution THEN there MUST be a test for correct path calculation
8. WHEN testing node registration THEN there MUST be a test for successfully registering nodes from manifest entries
9. WHEN testing error handling THEN there MUST be a test for invalid manifest entry paths
10. WHEN testing error handling THEN there MUST be a test for node import failures
11. WHEN testing fallback THEN there MUST be a test for falling back to file-based discovery
12. WHEN testing dual-mode THEN there MUST be a test for NODE_ENV-based mode selection
13. WHEN testing dual-mode THEN there MUST be a test for USE_NODE_MANIFEST flag override
14. WHEN all tests pass THEN manifest loading MUST be considered reliable for production use
15. WHEN tests run THEN code coverage for manifest loading MUST exceed 90%

---

### Requirement 13: Integration Tests

**User Story:** As a QA engineer, I want integration tests that verify the complete discovery flow, so that the end-to-end process from generation to loading is validated.

#### Acceptance Criteria

1. WHEN testing the full flow THEN there MUST be a test for generating manifest → loading manifest → registering nodes
2. WHEN testing node counts THEN there MUST be a test verifying all expected nodes are discovered (26 universal + 9 server + 12 client)
3. WHEN testing both modes THEN there MUST be a test ensuring file-based and manifest-based discovery produce identical results
4. WHEN testing workflow execution THEN there MUST be a test for executing a workflow with manifest-loaded nodes
5. WHEN testing API server initialization THEN there MUST be a test for server environment discovery
6. WHEN testing frontend initialization THEN there MUST be a test for client environment discovery
7. WHEN testing build process THEN there MUST be a test for the build script successfully generating the manifest
8. WHEN testing in production mode THEN there MUST be a test simulating production environment variables
9. WHEN testing error scenarios THEN there MUST be a test for discovery failures with clear error messages
10. WHEN testing different environments THEN there MUST be a test for switching between dev and prod modes
11. WHEN all integration tests pass THEN the system MUST be considered ready for staging deployment
12. WHEN integration tests run THEN they MUST complete in under 60 seconds

---

### Requirement 14: End-to-End Production Simulation

**User Story:** As a release manager, I want E2E tests that simulate production deployment, so that I can validate the manifest system works in real-world scenarios before going live.

#### Acceptance Criteria

1. WHEN running E2E tests THEN the system MUST build all packages with NODE_ENV=production
2. WHEN E2E tests start THEN the manifest MUST be verified to exist at the correct path
3. WHEN E2E tests validate the manifest THEN it MUST contain all expected nodes with correct metadata
4. WHEN E2E tests start the API server THEN it MUST successfully discover nodes from the manifest
5. WHEN E2E tests start the frontend THEN it MUST successfully discover nodes from the manifest
6. WHEN E2E tests execute workflows THEN they MUST run successfully using manifest-loaded nodes
7. WHEN E2E tests check node counts THEN they MUST match expected totals (universal + environment-specific)
8. WHEN E2E tests check logs THEN discovery mode MUST be logged as "manifest"
9. WHEN E2E tests verify bundles THEN client bundles MUST NOT include server-only nodes
10. WHEN E2E tests complete THEN a summary report MUST show all systems operational
11. IF E2E tests fail THEN the production deployment MUST be blocked
12. WHEN E2E tests pass THEN the system MUST be considered production-ready

---

### Requirement 15: Manual Testing Checklist

**User Story:** As a developer, I want a clear manual testing checklist, so that I can validate the manifest system before committing changes.

#### Acceptance Criteria

1. WHEN the checklist is followed THEN it MUST include verifying clean build completion
2. WHEN the checklist is followed THEN it MUST include verifying manifest JSON is valid and complete
3. WHEN the checklist is followed THEN it MUST include testing dev mode with file-based discovery
4. WHEN the checklist is followed THEN it MUST include testing prod mode with manifest discovery
5. WHEN the checklist is followed THEN it MUST include verifying API server node count in logs
6. WHEN the checklist is followed THEN it MUST include verifying frontend node count in console
7. WHEN the checklist is followed THEN it MUST include executing test workflows in both modes
8. WHEN the checklist is followed THEN it MUST include checking for missing node errors
9. WHEN the checklist is followed THEN it MUST include verifying hot reload works in development
10. WHEN the checklist is followed THEN it MUST include testing fallback from manifest to file-based discovery
11. WHEN all checklist items pass THEN the implementation MUST be considered complete
12. WHEN checklist is documented THEN it MUST be added to the implementation plan as a verification phase

---

### Requirement 16: CLAUDE.md Documentation Updates

**User Story:** As a new developer, I want updated documentation explaining the manifest system, so that I understand how node discovery works and how to add new nodes.

#### Acceptance Criteria

1. WHEN CLAUDE.md is updated THEN it MUST include a section on "Manifest-Based Node Discovery"
2. WHEN the manifest section is written THEN it MUST explain the dual-mode operation (dev vs prod)
3. WHEN documenting manifest generation THEN it MUST show the build script and when it runs
4. WHEN documenting node placement THEN it MUST explain how the manifest automatically picks up new nodes
5. WHEN documenting troubleshooting THEN it MUST include common issues and solutions
6. WHEN documenting production builds THEN it MUST explain NODE_ENV requirements
7. WHEN documenting environment variables THEN it MUST list USE_NODE_MANIFEST and its effect
8. WHEN documenting testing THEN it MUST explain how to test manifest mode locally
9. WHEN documenting the migration THEN it MUST note that server nodes are now in `/apps/api/src/nodes/`
10. WHEN examples are shown THEN they MUST include code snippets for both discovery modes
11. WHEN the update is complete THEN CLAUDE.md MUST be reviewed for accuracy and clarity
12. WHEN documentation is merged THEN it MUST be accessible to all developers via the repository

---

### Requirement 17: Developer Guides

**User Story:** As a developer adding a new node, I want step-by-step guides, so that I know exactly what to do and where to place files.

#### Acceptance Criteria

1. WHEN the "Adding a New Node" guide is created THEN it MUST include steps for universal, server, and client nodes
2. WHEN documenting node creation THEN it MUST show the file structure and required exports
3. WHEN documenting node placement THEN it MUST explain the three node directories and when to use each
4. WHEN documenting metadata THEN it MUST show a complete example of the metadata property
5. WHEN documenting development workflow THEN it MUST explain that new nodes are auto-discovered in dev mode
6. WHEN documenting production workflow THEN it MUST explain that running build regenerates the manifest
7. WHEN documenting testing THEN it MUST show how to write tests for the new node
8. WHEN documenting barrel exports THEN it MUST explain updating index.ts files if needed
9. WHEN the "Node Discovery Troubleshooting" guide is created THEN it MUST include common error scenarios
10. WHEN troubleshooting missing nodes THEN the guide MUST explain checking manifest contents
11. WHEN troubleshooting import errors THEN the guide MUST explain checking TypeScript compilation
12. WHEN troubleshooting production issues THEN the guide MUST explain checking environment variables and logs
13. WHEN guides are complete THEN they MUST be linked from CLAUDE.md for easy discovery
14. WHEN guides are written THEN they MUST include practical examples and code snippets

---

### Requirement 18: Inline Code Documentation

**User Story:** As a developer maintaining the codebase, I want clear inline documentation, so that I understand the manifest system's implementation without external docs.

#### Acceptance Criteria

1. WHEN the manifest generator script is written THEN it MUST include JSDoc comments explaining its purpose
2. WHEN `discoverFromManifest()` is implemented THEN it MUST include JSDoc explaining the algorithm
3. WHEN dual-mode logic is added THEN it MUST include comments explaining mode selection
4. WHEN complex path resolution occurs THEN it MUST include comments explaining the logic
5. WHEN environment filtering happens THEN it MUST include comments explaining which nodes are included
6. WHEN error handling is implemented THEN it MUST include comments explaining fallback behavior
7. WHEN the manifest schema is defined THEN it MUST include JSDoc comments for each field
8. WHEN validation logic is added THEN it MUST include comments explaining schema constraints
9. WHEN barrel exports are created THEN they MUST include comments listing exported nodes
10. WHEN all inline documentation is complete THEN it MUST aid in code review and maintenance

---

### Requirement 19: Staging Environment Validation

**User Story:** As a release manager, I want the manifest system validated in a staging environment, so that production deployment risk is minimized.

#### Acceptance Criteria

1. WHEN deploying to staging THEN the full build process MUST be executed with NODE_ENV=production
2. WHEN the staging deployment starts THEN the manifest MUST be present and valid
3. WHEN staging services start THEN discovery mode logs MUST show "manifest" mode active
4. WHEN checking staging logs THEN node counts MUST match expected values (26 universal + 9 server + 12 client)
5. WHEN executing workflows in staging THEN all workflows MUST complete successfully
6. WHEN monitoring staging THEN there MUST be no missing node errors or discovery failures
7. WHEN performance testing in staging THEN startup time MUST be measured and documented
8. WHEN load testing in staging THEN the system MUST handle expected traffic without discovery-related errors
9. WHEN checking bundle sizes THEN they MUST be appropriate for environment (client bundles smaller than server)
10. WHEN validating staging THEN a complete test suite MUST be run against the deployed system
11. IF staging validation fails THEN issues MUST be resolved before production deployment
12. WHEN staging validation passes THEN the system MUST be approved for production release

---

### Requirement 20: Production Deployment Readiness

**User Story:** As a DevOps engineer, I want clear production deployment criteria and procedures, so that the manifest system can be deployed safely.

#### Acceptance Criteria

1. WHEN preparing for production THEN a deployment checklist MUST be created and reviewed
2. WHEN the deployment checklist is created THEN it MUST include backup and rollback procedures
3. WHEN deploying to production THEN NODE_ENV=production MUST be set in the environment
4. WHEN production deployment begins THEN the build process MUST include manifest generation
5. WHEN production services start THEN discovery logs MUST be monitored for errors
6. WHEN production is live THEN a health check endpoint MUST verify node discovery status
7. WHEN monitoring production THEN error rates MUST be tracked for discovery-related failures
8. WHEN production is validated THEN node counts MUST match staging and development
9. IF production issues occur THEN USE_NODE_MANIFEST=false MUST be available as immediate rollback
10. WHEN rollback is triggered THEN the system MUST revert to file-based discovery without code changes
11. WHEN production is stable THEN performance metrics MUST be compared to pre-manifest baseline
12. WHEN production deployment is complete THEN a post-deployment report MUST document the process and any issues
13. WHEN production is running smoothly THEN the legacy `/server/nodes/` directory MUST be marked for deprecation
14. WHEN the feature is fully deployed THEN a retrospective MUST be conducted to identify improvements

---

## Non-Functional Requirements

### Performance

1. **Build Time:** Manifest generation MUST add less than 5 seconds to the total build time
2. **Startup Time:** Manifest loading MUST be faster than file-based discovery (target: <100ms vs ~500ms)
3. **Memory Usage:** Manifest storage in memory MUST be minimal (<1MB for ~50 nodes)
4. **Bundle Size:** Client bundles MUST only include universal and client nodes (server nodes excluded)
5. **Development Iteration:** File-based discovery in dev mode MUST enable instant node availability without rebuilding

### Reliability

1. **Production Deployment:** Manifest-based discovery MUST work in Docker, Kubernetes, serverless (Vercel, AWS Lambda), and traditional server deployments
2. **Fallback Mechanism:** If manifest loading fails, the system MUST gracefully fall back to file-based discovery with logged warnings
3. **Error Recovery:** Build failures due to invalid nodes MUST provide clear error messages with file paths
4. **Backward Compatibility:** Existing workflows MUST execute without modification in both discovery modes
5. **Zero Downtime:** Switching between discovery modes MUST not require application restarts (environment variable change only)

### Security

1. **Path Traversal:** Manifest paths MUST be validated to prevent directory traversal attacks
2. **Code Injection:** Dynamic imports from manifest MUST only load from expected node directories
3. **Manifest Tampering:** Manifest validation MUST detect and reject tampered or malformed manifests
4. **Environment Isolation:** Server nodes MUST never be included in client bundles to prevent leaking server capabilities

### Maintainability

1. **Code Coverage:** Test coverage for discovery code MUST exceed 90%
2. **Documentation:** All public APIs MUST have JSDoc comments
3. **Logging:** Discovery process MUST log key events (mode selection, node counts, errors) for debugging
4. **Extensibility:** Manifest schema MUST support future additions without breaking existing manifests
5. **Developer Experience:** Adding new nodes MUST not require manual manifest editing (automatic via build)

### Compatibility

1. **Node.js/Bun:** System MUST work with Bun 1.x and Node.js 18+
2. **Operating Systems:** Build scripts MUST work on macOS, Linux, and Windows
3. **CI/CD:** Manifest generation MUST integrate with GitHub Actions, GitLab CI, and other CI platforms
4. **Bundlers:** Manifest approach MUST be compatible with Vite, esbuild, and Bun bundler

---

## Out of Scope

The following are explicitly NOT included in this implementation:

1. **Hot Module Replacement for Manifest:** Manifest changes in development require manual rebuild (file-based discovery eliminates this need)
2. **Manifest Compression:** Manifest is stored as plain JSON (compression can be added later if needed)
3. **Manifest Versioning System:** Only current manifest version supported (migration system deferred)
4. **Lazy Loading of Nodes:** All applicable nodes are loaded at startup (lazy loading is future enhancement)
5. **Remote Manifest Loading:** Manifest must be in the build output (CDN-based manifests not supported)
6. **Dynamic Node Registration:** Nodes must exist at build time (runtime node registration not supported)
7. **Legacy `/server/nodes/` Removal:** Legacy directory remains for backward compatibility (full removal is separate effort)
8. **Legacy `/client/nodes/` Migration:** Client nodes in `/client/nodes/` are not migrated (out of scope)
9. **Manifest UI Dashboard:** No visual manifest explorer tool (CLI-only for now)
10. **Plugin System for Nodes:** Nodes are compiled into the application (external plugins deferred)

---

## Success Metrics

The implementation will be considered successful when:

1. ✅ **All nodes discoverable in production:** 26 universal + 9 server + 12 client = 47 total nodes
2. ✅ **Zero discovery errors in staging and production:** No missing node errors in logs
3. ✅ **Build time increase < 5 seconds:** Manifest generation adds minimal overhead
4. ✅ **Test coverage > 90%:** Comprehensive test suite for discovery code
5. ✅ **Successful production deployment:** Live deployment with manifest-based discovery
6. ✅ **Development workflow unchanged:** Developers can add nodes without rebuilding (file-based in dev)
7. ✅ **Documentation complete:** CLAUDE.md updated, developer guides created
8. ✅ **Staging validation passed:** All workflows execute successfully in staging
9. ✅ **Rollback plan validated:** USE_NODE_MANIFEST=false works as emergency fallback
10. ✅ **Server node migration complete:** All server nodes in `/apps/api/src/nodes/`
11. ✅ **Client bundle size reduced:** Server nodes excluded from frontend builds
12. ✅ **Performance baseline maintained:** No regression in workflow execution speed

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-22
**Status:** Draft - Ready for Implementation
**Total Requirements:** 20
**Total Acceptance Criteria:** 240+
