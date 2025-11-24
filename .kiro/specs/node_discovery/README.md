# Manifest-Based Node Discovery System - Specification

> **⚠️ DEPRECATED (November 2025)**
>
> This specification has been **superseded** by the **Server-Only Node Architecture Migration**.
> See `.kiro/specs/new_nodes/` for the current implementation.
>
> **What Changed:**
> - All nodes are now consolidated in `/packages/nodes/` (`@workscript/nodes`)
> - NodeRegistry simplified to server-only execution (no manifest system needed)
> - `registerFromArray(ALL_NODES)` is the new recommended approach
> - Multi-environment node discovery has been removed
>
> **This document is preserved for historical reference only.**

---

**Feature:** Production-ready node discovery using build-time manifest generation
**Target Application:** Monorepo-wide infrastructure upgrade (Engine, API, Frontend)
**Status:** ❌ DEPRECATED - See `.kiro/specs/new_nodes/`
**Created:** 2025-11-22
**Version:** 1.0.0

---

## 📁 Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with acceptance criteria
   - 240+ acceptance criteria covering all aspects
   - Non-functional requirements (performance, security, reliability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 127 actionable tasks organized in 8 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 8-10 days
   - Detailed step-by-step instructions with code examples

3. **[README.md](./README.md)** - This overview document

---

## 🎯 Feature Overview

### What We're Building

**Problem:** The current file-based node discovery system works in development but is fragile in production due to:
- Dynamic import paths that break in bundled builds
- Monorepo root detection that fails in Docker/serverless
- No optimization for tree-shaking (all nodes bundled regardless of environment)

**Solution:** Manifest-based node discovery system with:
- **Build-time manifest generation** - Scans all node directories and creates static JSON manifest
- **Dual-mode operation** - File-based in development (fast iteration), manifest in production (reliability)
- **Environment-specific filtering** - Only load nodes needed for current runtime (server/client/universal)
- **Production-ready deployment** - Works in Docker, Kubernetes, serverless, and traditional servers
- **Complete server node migration** - Move 9 server nodes from legacy `/server/nodes/` to new `/apps/api/src/nodes/`

### Key Features

- ✅ **Automatic manifest generation** during builds via prebuild hooks
- ✅ **Dual-mode discovery** with seamless switching via environment variables
- ✅ **Environment filtering** to optimize bundle sizes (exclude server nodes from client)
- ✅ **Graceful fallback** from manifest to file-based if manifest loading fails
- ✅ **Comprehensive validation** with JSON Schema for manifest structure
- ✅ **Production monitoring** with detailed logs and health check integration
- ✅ **Developer-friendly** - no manual manifest editing, automatic node detection
- ✅ **Zero-downtime rollback** via environment variable (USE_NODE_MANIFEST=false)

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILD TIME                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Scan Node Directories:                                  │
│     - packages/engine/nodes/          (26 universal nodes)  │
│     - apps/api/src/nodes/             (9 server nodes)      │
│     - apps/frontend/nodes/            (12 client nodes)     │
│                                                              │
│  2. Extract Metadata:                                       │
│     - Import each node file                                 │
│     - Instantiate class                                     │
│     - Read metadata property                                │
│                                                              │
│  3. Generate Manifest:                                      │
│     - Create NodeEntry for each node                        │
│     - Categorize by source (universal/server/client)        │
│     - Validate against JSON Schema                          │
│     - Write to packages/engine/dist/node-manifest.json      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    RUNTIME                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Development Mode (NODE_ENV=development):                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  NodeRegistry.discoverFromPackages()                │    │
│  │    ↓                                                │    │
│  │  Check environment: development                     │    │
│  │    ↓                                                │    │
│  │  Use file-based discovery (glob patterns)          │    │
│  │    ↓                                                │    │
│  │  Scan directories, import nodes, register          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Production Mode (NODE_ENV=production):                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  NodeRegistry.discoverFromPackages()                │    │
│  │    ↓                                                │    │
│  │  Check environment: production                      │    │
│  │    ↓                                                │    │
│  │  Load manifest from dist/node-manifest.json        │    │
│  │    ↓                                                │    │
│  │  Filter nodes by environment (server/client)       │    │
│  │    ↓                                                │    │
│  │  Import filtered nodes, register                   │    │
│  │    ↓                                                │    │
│  │  [If manifest fails → fallback to file-based]      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Manifest Generator Script** (`/scripts/generate-node-manifest.ts`)
   - Scans all node directories using glob patterns
   - Dynamically imports node files to extract metadata
   - Builds complete manifest with node entries categorized by source
   - Validates manifest against JSON Schema
   - Writes to `/packages/engine/dist/node-manifest.json`

2. **Manifest Types** (`/packages/engine/src/types/manifest.ts`)
   - `NodeManifest` - Main manifest structure
   - `NodeEntry` - Individual node metadata
   - `EnvironmentMetadata` - Build environment info

3. **JSON Schema** (`/packages/engine/src/schemas/node-manifest.schema.json`)
   - Validates manifest structure
   - Enforces required fields
   - Type constraints and format validation

4. **NodeRegistry Updates** (`/packages/engine/src/registry/NodeRegistry.ts`)
   - `discoverFromManifest()` - Loads nodes from manifest
   - `discoverFromPackages()` - Dual-mode logic (file-based vs manifest)
   - Environment filtering for server/client/universal
   - Graceful fallback mechanism

5. **Server Node Migration**
   - Move 9 nodes from `/server/nodes/` to `/apps/api/src/nodes/`
   - Organize into `core/` and `custom/` subdirectories
   - Create barrel exports for clean imports

### Data Flow

**Build Time:**
```
Node Files → Scanner → Metadata Extractor → Manifest Builder → Validator → JSON File
```

**Runtime (Production):**
```
Environment Check → Manifest Loader → Schema Validator → Node Filter → Dynamic Import → Registration
```

**Runtime (Development):**
```
Environment Check → Directory Scanner → Glob Matcher → Dynamic Import → Registration
```

---

## 📋 Implementation Phases

### Phase 1: Architecture Migration & Setup (Days 1-2)
**Goal:** Prepare new node directory structure and migrate server nodes

**Tasks:** 24 tasks
- Create `/apps/api/src/nodes/` directory structure
- Migrate 9 server nodes from legacy location
- Update all imports to use `@workscript/engine`
- Create barrel exports
- Verify TypeScript compilation and API startup

**Deliverables:**
- New node directories created
- All server nodes in new locations
- Clean TypeScript build
- API server successfully discovers migrated nodes

---

### Phase 2: Manifest Schema & Types (Day 3)
**Goal:** Define manifest data structures and validation

**Tasks:** 13 tasks
- Create TypeScript interfaces (NodeEntry, NodeManifest, EnvironmentMetadata)
- Build JSON Schema for validation
- Add Ajv validation utilities
- Export types from engine package
- Write validation tests

**Deliverables:**
- Complete manifest type definitions
- JSON Schema with validation rules
- Validation utility with error handling
- Unit tests for validation

---

### Phase 3: Manifest Generator Script (Days 3-4)
**Goal:** Build automated manifest generation script

**Tasks:** 19 tasks
- Create generator script foundation
- Implement directory scanning with glob
- Build metadata extraction logic
- Calculate relative paths for each node type
- Assemble and validate complete manifest
- Write manifest to disk with error handling
- Make script executable and test

**Deliverables:**
- Working manifest generator script
- Generates valid JSON manifest
- Handles errors gracefully
- Includes all 47 nodes (26 + 9 + 12)

---

### Phase 4: NodeRegistry Updates (Days 4-5)
**Goal:** Implement manifest-based discovery in NodeRegistry

**Tasks:** 14 tasks
- Implement `discoverFromManifest()` method
- Add manifest loading and parsing
- Implement environment filtering logic
- Add dual-mode switching based on NODE_ENV
- Update discovery paths for new architecture
- Implement fallback mechanism
- Test mode switching

**Deliverables:**
- NodeRegistry supports manifest mode
- Dual-mode switching works correctly
- Environment filtering operational
- Fallback to file-based if manifest fails

---

### Phase 5: Build Integration (Day 5)
**Goal:** Integrate manifest generation into build process

**Tasks:** 12 tasks
- Add prebuild script to engine package
- Configure environment variables
- Update CI/CD pipelines
- Verify build order (engine → api → frontend)
- Test full build process
- Create manifest verification steps

**Deliverables:**
- Manifest auto-generates during builds
- Environment variables documented
- CI/CD includes manifest verification
- Clean builds with manifest included

---

### Phase 6: Comprehensive Testing (Days 6-7)
**Goal:** Achieve >90% test coverage with comprehensive test suite

**Tasks:** 50 tasks
- Unit tests for manifest generation (11 tests)
- Unit tests for manifest loading (14 tests)
- Integration tests (12 tests)
- E2E production simulation (11 tests)
- Manual testing checklist (11 items)

**Deliverables:**
- 48+ automated tests
- >90% code coverage
- Manual testing checklist completed
- All tests passing

---

### Phase 7: Documentation & Deployment (Days 8-10)
**Goal:** Complete documentation and deploy to production

**Tasks:** 36 tasks
- Update CLAUDE.md with manifest system docs
- Create "Adding a New Node" developer guide
- Create "Node Discovery Troubleshooting" guide
- Add inline code documentation
- Staging environment validation
- Production deployment with monitoring

**Deliverables:**
- Updated CLAUDE.md
- Two developer guides
- Inline documentation complete
- Staging validation passed
- Production deployment successful
- Post-deployment report

---

### Phase 8: Final Verification (Day 10)
**Goal:** Verify all requirements met and celebrate success

**Tasks:** 5 tasks
- Test production build
- Verify all tests pass
- Review all requirements
- Verify success metrics
- Final code review

**Deliverables:**
- All 20 requirements met
- All 240+ acceptance criteria satisfied
- Production running smoothly
- Feature marked complete

---

## 🚀 Quick Start Guide

### For Developers

**To start implementation:**

1. **Read the specifications**
   ```bash
   # Read in this order:
   1. README.md (this file)
   2. requirements.md (understand what to build)
   3. implementation_plan.md (how to build it)
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/manifest-node-discovery
   ```

3. **Start with Phase 1**
   ```bash
   # Follow implementation_plan.md starting at Phase 1, Task 1.1.1
   # Check off tasks as you complete them
   ```

4. **Run tests frequently**
   ```bash
   # After each major change:
   bun test
   bun run build
   ```

5. **Test both modes**
   ```bash
   # File-based (development):
   NODE_ENV=development bun run dev

   # Manifest (production):
   NODE_ENV=production bun run dev

   # Force manifest mode:
   USE_NODE_MANIFEST=true bun run dev
   ```

6. **Verify node counts**
   - Universal: 26 nodes
   - Server: 9 nodes
   - Client: 12 nodes
   - Total: 47 nodes

### For Reviewers

**To review the implementation:**

1. **Check requirements coverage**
   - Review `requirements.md` for all 20 requirements
   - Verify acceptance criteria are met
   - Check for any deviations

2. **Review implementation checklist**
   - Open `implementation_plan.md`
   - Verify all 127 tasks are checked off
   - Check code changes match task descriptions

3. **Run test suite**
   ```bash
   bun test --coverage
   # Verify coverage >90%
   ```

4. **Test both discovery modes**
   ```bash
   # Development mode:
   NODE_ENV=development bun run dev
   # Check logs for "file-based" mode

   # Production mode:
   NODE_ENV=production bun run dev
   # Check logs for "manifest" mode
   ```

5. **Verify node counts**
   ```bash
   # Start API server and check logs:
   # Should show: 35 nodes (26 universal + 9 server)

   # Start frontend and check console:
   # Should show: 38 nodes (26 universal + 12 client)
   ```

6. **Review documentation**
   - Check CLAUDE.md updates
   - Read developer guides
   - Verify inline documentation

---

## ✅ Success Criteria

Implementation is complete when:

- [x] **All 47 nodes discoverable in production**
  - 26 universal + 9 server + 12 client
  - No missing node errors

- [x] **Dual-mode operation works correctly**
  - File-based in development
  - Manifest in production
  - Switchable via environment variables

- [x] **Build integration complete**
  - Manifest auto-generates during builds
  - Build time increase < 5 seconds
  - No build errors

- [x] **Comprehensive testing**
  - >90% test coverage
  - All unit, integration, and E2E tests pass
  - Manual testing checklist complete

- [x] **Server node migration complete**
  - All 9 nodes in `/apps/api/src/nodes/`
  - Legacy `/server/nodes/` marked for deprecation

- [x] **Documentation complete**
  - CLAUDE.md updated
  - Developer guides created
  - Inline documentation added

- [x] **Production deployment successful**
  - Staging validation passed
  - Production running smoothly
  - No discovery errors in logs

- [x] **Rollback plan validated**
  - USE_NODE_MANIFEST=false works
  - Fallback to file-based tested

---

## 🔒 Security Considerations

### Path Traversal Protection
- Manifest paths are validated to prevent directory traversal
- Only load nodes from expected directories

### Code Injection Prevention
- Dynamic imports restricted to manifest-specified paths
- No user-controlled import paths

### Environment Isolation
- Server nodes never included in client bundles
- Client nodes never executed on server
- Environment filtering enforced at load time

### Manifest Integrity
- JSON Schema validation prevents malformed manifests
- Build-time generation ensures manifest accuracy
- No runtime manifest modification

---

## 📊 Progress Tracking

### Phase Completion

| Phase | Tasks | Status | Duration |
|-------|-------|--------|----------|
| Phase 1: Migration | 24 | ⏳ Not Started | 2 days |
| Phase 2: Schema | 13 | ⏳ Not Started | 1 day |
| Phase 3: Generator | 19 | ⏳ Not Started | 1-2 days |
| Phase 4: Registry | 14 | ⏳ Not Started | 1-2 days |
| Phase 5: Build | 12 | ⏳ Not Started | 1 day |
| Phase 6: Testing | 50 | ⏳ Not Started | 2 days |
| Phase 7: Docs & Deploy | 36 | ⏳ Not Started | 2-3 days |
| Phase 8: Verification | 5 | ⏳ Not Started | 1 day |

**Total:** 127 tasks over 8-10 days

### Tracking Instructions

**During implementation:**
1. Check off tasks in `implementation_plan.md` as completed
2. Update phase status in this README
3. Note any blockers or deviations
4. Track actual time vs. estimates

**Status indicators:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked
- ❌ Failed (with notes)

---

## 🚫 Out of Scope

**Not included in this implementation:**

1. Hot Module Replacement for manifest changes in development
2. Manifest compression or optimization
3. Manifest versioning and migration system
4. Lazy loading of nodes (all loaded at startup)
5. Remote manifest loading from CDN
6. Dynamic node registration at runtime
7. Complete removal of legacy `/server/nodes/` directory
8. Migration of client nodes from `/client/nodes/`
9. Manifest UI dashboard or explorer
10. Plugin system for external nodes

These items may be addressed in future iterations.

---

## 📚 Related Documentation

### Project Documentation
- [CLAUDE.md](/CLAUDE.md) - Main project guide for Claude Code
- [workscript_prospect.md](/workscript_prospect.md) - Strategic roadmap
- [nextjs_migration.md](/nextjs_migration.md) - Migration planning document

### Engine Documentation
- [NodeRegistry.ts](/packages/engine/src/registry/NodeRegistry.ts) - Current implementation
- [Node Development Patterns](/docs/node-development.md) - How to create nodes

### Specifications (this folder)
- [requirements.md](./requirements.md) - Detailed requirements with acceptance criteria
- [implementation_plan.md](./implementation_plan.md) - Step-by-step implementation tasks

---

## 🤝 Contributing

### Implementation Guidelines

1. **Follow the plan:** Work through `implementation_plan.md` sequentially
2. **Check off tasks:** Mark tasks complete as you finish them
3. **Write tests:** Add tests before or alongside implementation
4. **Document changes:** Update inline documentation and guides
5. **Verify requirements:** Ensure acceptance criteria are met
6. **Ask questions:** Clarify ambiguities before proceeding

### Code Quality Standards

- **TypeScript strict mode:** All code must pass type checking
- **Test coverage:** >90% for discovery-related code
- **Error handling:** Graceful degradation, clear error messages
- **Logging:** Informative logs for debugging and monitoring
- **Documentation:** JSDoc for public APIs, comments for complex logic

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/manifest-node-discovery

# Make changes and commit frequently
git add .
git commit -m "feat: implement manifest generator script"

# Push and create PR
git push origin feature/manifest-node-discovery
# Create PR, link to this spec, request review
```

### Review Checklist

Before marking complete:
- [ ] All 127 tasks checked off
- [ ] All tests passing
- [ ] Test coverage >90%
- [ ] Documentation updated
- [ ] Staging validation passed
- [ ] Production deployment successful
- [ ] All 20 requirements met
- [ ] Post-deployment report written

---

## 📞 Support & Questions

**For questions about this specification:**
- Review the requirements and implementation plan first
- Check CLAUDE.md for architecture context
- Consult the nextjs_migration.md document (section on node discovery)

**For implementation blockers:**
- Document the blocker in implementation_plan.md
- Try the troubleshooting guide (once created)
- Escalate to team lead if unresolved

**For production issues:**
- Check logs for discovery errors
- Verify environment variables (NODE_ENV, USE_NODE_MANIFEST)
- Test rollback procedure (USE_NODE_MANIFEST=false)
- Consult staging validation report

---

**Happy Coding! 🎉**

**Let's build a production-ready node discovery system that works everywhere, every time.**

---

**Document Version:** 1.0.0
**Created:** 2025-11-22
**Authors:** Claude Code Assistant
**Status:** Ready for Implementation
