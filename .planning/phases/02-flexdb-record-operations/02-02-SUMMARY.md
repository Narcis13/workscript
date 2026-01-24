---
phase: 02-flexdb-record-operations
plan: 02
subsystem: flexdb-records
tags: [flexdb, records, crud, relationships, validation, workflow-nodes]

dependency-graph:
  requires: ["02-01"]
  provides: ["FlexRecordNode", "service-injection", "relationship-validation"]
  affects: ["03-query-builder", "04-schema-evolution"]

tech-stack:
  added: []
  patterns: ["context.state._services injection", "reference validation", "onDelete behaviors"]

key-files:
  created:
    - packages/nodes/src/flexdb/FlexRecordNode.ts
  modified:
    - apps/api/src/plugins/workscript/services/WorkflowService.ts
    - packages/nodes/src/flexdb/FlexTableNode.ts
    - packages/nodes/src/index.ts
    - apps/api/src/plugins/workscript/services/FlexRecordService.ts
    - apps/api/src/plugins/workscript/services/FlexQueryBuilder.ts

decisions:
  - id: service-injection-pattern
    decision: "Use initialState._services to inject services into workflow context"
    rationale: "ExecutionEngine only accepts ParsedWorkflow and builds ExecutionContext from initialState. Services flow through initialState._services to context.state._services."
  - id: relationship-validation
    decision: "Validate reference columns point to existing records before insert"
    rationale: "Prevents orphaned references and maintains data integrity"
  - id: ondelete-behaviors
    decision: "Support restrict, cascade, and set-null onDelete behaviors"
    rationale: "Standard relational database semantics for referential integrity"

metrics:
  duration: 5 min
  completed: 2026-01-24
---

# Phase 02 Plan 02: FlexRecordNode and Relationship Validation Summary

FlexRecordNode workflow node with CRUD operations and relationship validation via reference columns with onDelete behavior enforcement.

## What Was Built

### FlexRecordNode (`packages/nodes/src/flexdb/FlexRecordNode.ts`)
- Complete workflow node for FlexDB record operations
- 5 operations: `insert`, `findOne`, `findMany`, `update`, `delete`
- Edge routing: `success`, `found`, `not_found`, `empty`, `conflict`, `error`
- State variables: `flexRecord`, `flexRecords`, `flexRecordId`, `flexRecordCount`, `deleted`
- Accesses service via `context.state._services.flexRecord` (injected by WorkflowService)

### Service Injection Fix
- **Problem**: FlexTableNode expected `context.services.flexDB` but WorkflowService never injected it
- **Solution**: WorkflowService now injects services via `initialState._services` which flows to `context.state._services`
- Updated FlexTableNode to use `context.state._services.flexDB`
- Pattern documented in JSDoc headers

### Relationship Validation (`FlexRecordService.ts`)
- `validateReferences()`: Validates reference columns point to existing records before insert
- `includeRelated()`: Fetches related records and adds them to results with `_<column>` prefix
- `checkRestrictReferences()`: Prevents delete when records reference with `onDelete: 'restrict'`
- `handleCascadeDelete()`: Enforces `cascade` (soft delete) and `set-null` behaviors

### FlexQueryParams Enhancement
- Added `include?: Array<{ relation: string }>` parameter
- `findMany` now supports including related records via reference columns

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Service injection pattern | `initialState._services` | ExecutionEngine builds context from initialState, services must flow through it |
| Reference validation timing | Before insert | Prevents orphaned references at creation time |
| Related record prefix | `_<columnName>` | Distinguishes included data from original fields |
| onDelete default | `restrict` | Conservative default prevents accidental data loss |

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 416507b | FlexRecordNode and service injection fix |
| 2 | 957ef56 | Relationship validation and include support |

## Files Changed

### Created
- `packages/nodes/src/flexdb/FlexRecordNode.ts` (600+ lines)

### Modified
- `apps/api/src/plugins/workscript/services/WorkflowService.ts` - Service injection
- `packages/nodes/src/flexdb/FlexTableNode.ts` - Fixed service access pattern
- `packages/nodes/src/index.ts` - Registered FlexRecordNode
- `apps/api/src/plugins/workscript/services/FlexRecordService.ts` - Relationship functions
- `apps/api/src/plugins/workscript/services/FlexQueryBuilder.ts` - Include parameter

## Next Phase Readiness

Phase 02 (FlexDB Record Operations) is now complete:
- FlexRecordService provides full CRUD with validation
- FlexRecordNode enables workflow-level record operations
- Reference validation ensures data integrity
- onDelete behaviors maintain referential integrity

Ready for Phase 03 (Query Builder Enhancement) which will add:
- Advanced filter conditions
- Full-text search
- Complex ordering
