# Server-Only Node Architecture Migration - Specification

**Feature:** Consolidate workflow nodes into dedicated `@workscript/nodes` package with server-only execution
**Target Application:** Workscript Monorepo (all packages and apps)
**Status:** 📋 Ready for Implementation
**Created:** 2025-01-23
**Version:** 1.0.0

---

## 📁 Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, maintainability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 168+ actionable tasks organized in 12 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 8-12 days

3. **[README.md](./README.md)** - This overview document

---

## 🎯 Feature Overview

### What We're Building

This migration transforms the Workscript monorepo from a distributed multi-environment node architecture to a simplified server-only architecture:

- **Single Source of Truth**: All workflow nodes consolidated in `/packages/nodes/`
- **Server-Only Execution**: Workflows execute exclusively on the API server
- **Simplified Discovery**: NodeRegistry no longer needs environment-specific logic
- **Lightweight Engine**: Engine package focused purely on orchestration
- **Management UI**: Frontend becomes a management interface (no local execution)
- **Clean Codebase**: Remove legacy client-side execution code

### Technology Stack

- **Runtime**: Bun 1.x
- **Language**: TypeScript 5.8.x
- **Monorepo Tool**: Bun workspaces
- **Core Engine**: `@workscript/engine`
- **New Package**: `@workscript/nodes` (to be created)
- **Server Framework**: Hono 4.7.x
- **Database**: MySQL with Drizzle ORM
- **Frontend**: Vite 6.x + React 19.x (management UI only)

---

## 🏗️ Architecture

### Current State (Before Migration)

```
Distributed Node Architecture:
├── /packages/engine/nodes/         # 27 universal nodes
├── /apps/api/src/nodes/            # 9 API server nodes
├── /apps/frontend/nodes/           # 14 frontend nodes
├── /server/nodes/                  # Legacy server nodes
└── /client/nodes/                  # Legacy client nodes

NodeRegistry supports 3 environments:
- 'universal' - Zero-dependency nodes
- 'server' - API server nodes
- 'client' - Frontend browser nodes
```

### Target State (After Migration)

```
Centralized Server-Only Architecture:
└── /packages/nodes/                # NEW: All 36+ nodes in one package
    ├── src/
    │   ├── MathNode.ts             # Core nodes
    │   ├── LogicNode.ts
    │   ├── DataTransformNode.ts
    │   ├── data/                   # Data manipulation nodes
    │   ├── FileSystemNode.ts       # Server nodes
    │   ├── DatabaseNode.ts
    │   ├── AuthNode.ts
    │   └── custom/                 # Custom integrations
    │       ├── google/gmail/
    │       └── zoca/
    ├── dist/                       # Built output
    └── index.ts                    # Exports ALL_NODES array

NodeRegistry simplified:
- Only scans /packages/nodes/
- No environment parameter needed
- Server-only execution model
```

### Key Components

1. **`@workscript/nodes` Package** (NEW)
   - Dedicated package for all workflow nodes
   - Exports `ALL_NODES` array with all node classes
   - Includes all server-specific dependencies
   - Single import: `import { ALL_NODES } from '@workscript/nodes'`

2. **`@workscript/engine` Package** (UPDATED)
   - No longer contains node implementations
   - Focused purely on orchestration (ExecutionEngine, StateManager, etc.)
   - Lightweight with no server-specific dependencies
   - NodeRegistry simplified to server-only discovery

3. **API Server** (UPDATED)
   - Depends on `@workscript/nodes`
   - No local `src/nodes/` directory
   - All workflow execution happens server-side
   - Simplified node registration

4. **Frontend App** (UPDATED)
   - No local `nodes/` directory
   - No client-side workflow execution
   - Management UI only (create, monitor, view workflows)
   - Calls API for all workflow execution

5. **Legacy Code** (DELETED)
   - `/client/` directory removed entirely
   - `/server/nodes/` removed (CRM uses new package)
   - `/apps/frontend/nodes/` removed
   - `/apps/api/src/nodes/` removed

---

## 📋 Implementation Phases

### Phase 1: Setup and Preparation (0.5 days)
- Create migration branch
- Document current state and baseline metrics
- Create `/packages/nodes/` package structure
- Set up package.json, tsconfig.json, dependencies

### Phase 2: Migrate Nodes to New Package (2 days)
- Move 27 universal nodes from `/packages/engine/nodes/`
- Move 9 API nodes from `/apps/api/src/nodes/`
- Merge unique nodes from `/server/nodes/`
- Update imports and organize structure

### Phase 3: Create Node Exports (0.5 days)
- Create `/packages/nodes/src/index.ts`
- Export `ALL_NODES` array with all 36+ nodes
- Export individual node classes
- Build and validate exports

### Phase 4: Update Node Registry (1 day)
- Simplify to server-only discovery
- Remove environment parameter logic
- Update path resolution for `/packages/nodes/`
- Handle production builds (dist/ directory)

### Phase 5: Update Engine Package (0.5 days)
- Delete `/packages/engine/nodes/` directory
- Remove server dependencies from package.json
- Remove `/nodes` export from package
- Validate engine independence

### Phase 6: Update API Package (1 day)
- Add `@workscript/nodes` workspace dependency
- Update imports to use new package
- Delete `/apps/api/src/nodes/` directory
- Test workflow execution

### Phase 7: Update Frontend Package (1 day)
- Remove client-side workflow execution
- Delete `/apps/frontend/nodes/` directory
- Update to API-only workflow execution
- Preserve management UI functionality

### Phase 8: Delete Legacy Code (0.5 days)
- Delete `/client/` directory entirely
- Delete `/server/nodes/` directory
- Update server imports to use `@workscript/nodes`
- Clean up workspace configuration

### Phase 9: Update Documentation (1 day)
- Update CLAUDE.md with new architecture
- Update README.md
- Remove multi-environment references
- Create migration guide

### Phase 10: Comprehensive Testing (2 days)
- Run all unit tests (engine, nodes, API, frontend)
- Integration testing (node discovery, workflow execution)
- Performance testing (discovery time, execution time)
- Compatibility testing (existing workflows)

### Phase 11: Build and Deployment Preparation (1 day)
- Production build validation
- Type checking and linting
- Staging environment testing
- Create rollback plan

### Phase 12: Final Verification (1 day)
- Final test suite run
- Documentation review
- Stakeholder demo and sign-off
- Merge to main branch

---

## 🚀 Quick Start Guide

### For Developers

To begin implementation, follow these steps:

1. **Read the Requirements Document**
   ```bash
   cat .kiro/specs/new_nodes/requirements.md
   ```
   Understand all 20 requirements and their acceptance criteria.

2. **Read the Implementation Plan**
   ```bash
   cat .kiro/specs/new_nodes/implementation_plan.md
   ```
   Review all 168 tasks and understand the phases.

3. **Create Migration Branch**
   ```bash
   git checkout -b migration/server-only-nodes
   ```

4. **Start with Phase 1**
   Follow the implementation plan phase by phase. Each task has clear instructions.

5. **Check Off Tasks as You Go**
   Use the checkboxes in the implementation plan to track progress.

6. **Run Tests Frequently**
   After each phase, run tests to catch issues early:
   ```bash
   bun run build
   bun run test
   bun run typecheck
   ```

### For Reviewers

To review this migration:

1. **Understand the Goal**: Server-only node execution with consolidated package
2. **Review Requirements**: Ensure all acceptance criteria are met
3. **Check Task Completion**: Verify all tasks in implementation plan are checked off
4. **Test Thoroughly**: Run full test suite and manual tests
5. **Verify Success Metrics**: Confirm all success criteria from requirements.md
6. **Check Documentation**: Ensure CLAUDE.md and other docs are updated

---

## ✅ Success Criteria

The migration is successful when:

- ✅ All nodes consolidated in `/packages/nodes/` package
- ✅ NodeRegistry simplified to server-only discovery (no environment logic)
- ✅ Engine package lightweight (no node implementations or server dependencies)
- ✅ API package successfully imports from `@workscript/nodes`
- ✅ Frontend application works for management tasks (no local execution)
- ✅ All legacy client directories deleted (`/client/`, `/apps/frontend/nodes/`)
- ✅ All tests passing across engine, nodes, and API packages (100% pass rate)
- ✅ Production build completes successfully
- ✅ Workflows execute successfully in production environment
- ✅ Node discovery time < 1 second
- ✅ All 36+ nodes discovered and registered correctly
- ✅ Documentation updated and accurate
- ✅ No broken imports or module resolution errors
- ✅ Code complexity reduced (measured by LOC in NodeRegistry)
- ✅ Team sign-off obtained
- ✅ Successfully deployed to staging environment

---

## 🔒 Security Considerations

### Benefits of Server-Only Execution

1. **No Client-Side Tampering**: Workflows cannot be manipulated by clients
2. **Secure Node Operations**: Database, auth, and file system operations remain server-only
3. **Centralized Security**: All security policies enforced server-side
4. **Audit Trail**: All workflow execution logged server-side

### Security Validation

- ✅ No sensitive node implementations exposed to client
- ✅ API endpoints properly authenticated and authorized
- ✅ Workflow definitions validated before execution
- ✅ No security regressions introduced during migration

---

## 📊 Progress Tracking

### How to Track Progress

1. **Use Implementation Plan Checkboxes**
   - Open `implementation_plan.md`
   - Check off `- [ ]` tasks as `- [x]` when complete
   - Track completion percentage per phase

2. **Use Git Commits**
   - Make frequent, descriptive commits
   - Reference task numbers in commit messages
   - Example: `git commit -m "Task 2.1.1: Copy universal nodes to new package"`

3. **Use Project Management Tool** (Optional)
   - Import tasks into Jira/Linear/GitHub Projects
   - Track status and blockers
   - Assign tasks to team members

4. **Daily Progress Updates**
   - End-of-day summary of completed tasks
   - Note any blockers or issues
   - Estimate remaining time

### Progress Metrics

Track these metrics throughout implementation:

- **Tasks Completed**: X / 168 (Target: 100%)
- **Tests Passing**: X / Total (Target: 100%)
- **Node Discovery Time**: X ms (Target: < 1000ms)
- **Build Time**: X seconds (Target: < baseline + 10%)
- **Code Complexity**: X LOC in NodeRegistry (Target: -30% from baseline)

---

## 🚫 Out of Scope

The following are **NOT** part of this migration:

❌ Rewriting existing workflows to use new node features
❌ Adding new node types or functionality
❌ Changing workflow execution logic or engine behavior
❌ Modifying database schemas or adding new tables
❌ Creating new frontend features beyond maintaining existing functionality
❌ Performance optimization beyond maintaining current performance
❌ Refactoring individual node implementations
❌ Adding new integrations or custom nodes
❌ Changing the CRM application structure or features
❌ Implementing new testing frameworks or tools
❌ Migrating to different technologies or frameworks
❌ Creating new documentation beyond updating existing docs
❌ Training or onboarding materials beyond updated documentation

---

## 📚 Related Documentation

- **[CLAUDE.md](/CLAUDE.md)** - Main project documentation (will be updated)
- **[workscript_prospect.md](/workscript_prospect.md)** - Strategic roadmap
- **[.kiro/specs/json-workflow-engine/](/. kiro/specs/json-workflow-engine/)** - Core engine specifications
- **[packages/engine/README.md](/packages/engine/README.md)** - Engine package documentation
- **[apps/api/README.md](/apps/api/README.md)** - API documentation

### External References

- [Bun Workspaces Documentation](https://bun.sh/docs/install/workspaces)
- [TypeScript Monorepo Best Practices](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Node.js Package Design Patterns](https://nodejs.org/api/packages.html)

---

## 🤝 Contributing

### Implementation Guidelines

1. **Follow the Plan**: Stick to the implementation plan phases and tasks
2. **Test Frequently**: Run tests after each significant change
3. **Commit Often**: Make small, focused commits with clear messages
4. **Update Docs**: Update documentation as you make changes
5. **Ask Questions**: If unclear, ask before proceeding
6. **Check Off Tasks**: Mark tasks complete in implementation_plan.md

### Code Standards

- ✅ All TypeScript code passes strict type checking
- ✅ ESLint rules pass without warnings
- ✅ Code formatted with Prettier
- ✅ No console.logs in production code
- ✅ Comprehensive error handling
- ✅ Clear, descriptive variable and function names

### Testing Standards

- ✅ All existing tests must pass
- ✅ New tests added for new functionality
- ✅ Integration tests for critical paths
- ✅ Performance tests for node discovery and execution
- ✅ Manual testing of UI features

### Review Process

1. Complete all tasks in a phase
2. Run full test suite
3. Create pull request with phase summary
4. Request code review from senior developer
5. Address review feedback
6. Merge when approved

---

## 🎉 Migration Benefits

### For Developers

- **Simpler Codebase**: One location for all nodes, easier to find and maintain
- **Cleaner Imports**: Single import statement for all nodes
- **Better IDE Support**: Better IntelliSense and code navigation
- **Faster Development**: No context switching between environments
- **Easier Testing**: Simplified test setup and execution

### For DevOps

- **Simpler Deployments**: Only need to deploy API server
- **Better Monitoring**: Centralized execution logs
- **Easier Scaling**: Scale only the API server
- **Reduced Complexity**: Fewer build artifacts to manage

### For Users

- **More Reliable**: Server-side execution is more stable
- **Better Performance**: Optimized server execution
- **Consistent Behavior**: No client-side differences
- **Better Security**: Workflows cannot be tampered with

### For the Project

- **Maintainability**: Easier to maintain and extend
- **Scalability**: Easier to scale server-side execution
- **Quality**: Better code quality and testing
- **Future-Proof**: Simpler architecture for future changes

---

## 📝 Notes for Implementers

### Common Pitfalls to Avoid

1. **Don't skip tests**: Run tests frequently to catch issues early
2. **Don't batch too many changes**: Make small, incremental changes
3. **Don't ignore TypeScript errors**: Fix all type errors immediately
4. **Don't forget to update imports**: Search and replace systematically
5. **Don't delete code without verifying**: Ensure no references exist first

### Tips for Success

1. **Start with preparation**: Proper setup saves time later
2. **Follow the order**: Phases are ordered by dependency
3. **Use search tools**: grep, ripgrep, or IDE search for finding references
4. **Keep backups**: Use git branches and tags liberally
5. **Communicate**: Keep team informed of progress and blockers

### Key Files to Watch

- `/packages/engine/src/registry/NodeRegistry.ts` - Core discovery logic
- `/packages/nodes/src/index.ts` - Node exports (will be created)
- `/apps/api/src/plugins/workscript/services/WorkflowService.ts` - API node usage
- `/apps/frontend/src/services/` - Frontend services (check for ClientWorkflowService)
- Root `package.json` - Workspace configuration

---

**Happy Coding! 🎉**

This migration will significantly improve the codebase architecture and developer experience. Follow the plan, test thoroughly, and don't hesitate to ask questions. You've got this!

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-23
**Status:** Ready for Implementation
**Estimated Duration:** 8-12 days
**Complexity:** High
**Risk Level:** Medium (comprehensive testing and rollback plan mitigate risks)
