# Roadmap: FoxPro 2.6 AI - RAD Platform

## Overview

This roadmap delivers a modern Rapid Application Development platform that enables users to build data-driven applications through natural language descriptions. The journey begins with FlexDB infrastructure (runtime tables, records, queries), progresses through AI-powered generation (schemas, forms, reports), builds the visual components (dynamic forms and reports), and culminates in the application container that packages everything together. Each phase delivers a complete, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: FlexDB Schema Foundation** - Runtime table creation with column types and validation
- [x] **Phase 2: FlexDB Record Operations** - CRUD operations, queries, and relationships
- [ ] **Phase 3: FlexDB REST API** - HTTP endpoints for tables and records
- [ ] **Phase 4: AI Service Integration** - AskAI wrapper, prompts, and conversation management
- [ ] **Phase 5: AI Workflow Nodes** - Schema, form, and report generation nodes
- [ ] **Phase 6: AI Generation API** - HTTP endpoints for AI generation and conversations
- [ ] **Phase 7: Forms System** - Form definitions, workflow nodes, and API
- [ ] **Phase 8: Dynamic Form Renderer** - React component for runtime form rendering
- [ ] **Phase 9: Reports System** - Report definitions and generation engine
- [ ] **Phase 10: Application Container** - Application packaging, menus, and dashboards
- [ ] **Phase 11: Integration Testing** - End-to-end verification of all components
- [ ] **Phase 12: Final Verification** - Build, type check, and acceptance testing

## Phase Details

### Phase 1: FlexDB Schema Foundation
**Goal**: Users can create database tables at runtime with typed columns and validation rules
**Depends on**: Nothing (first phase)
**Requirements**: FLEX-01 to FLEX-06, TYPE-01 to TYPE-10, VER-01 to VER-04
**Plans**: 3 plans in 3 waves
**Success Criteria** (what must be TRUE):
  1. User can create a FlexDB table with columns via workflow node
  2. System enforces table name uniqueness within application
  3. System supports all 9 data types (string, text, integer, decimal, boolean, date, datetime, json, reference)
  4. System assigns indexed columns to appropriate slots (3 string, 2 numeric, 2 date)
  5. System creates version history entry when schema changes

Plans:
- [x] 01-01-PLAN.md — Database schema and TypeScript types (Wave 1)
- [x] 01-02-PLAN.md — FlexDB service layer and validation (Wave 2)
- [x] 01-03-PLAN.md — Version tracking and workflow node (Wave 3)

### Phase 2: FlexDB Record Operations
**Goal**: Users can perform full CRUD operations on records with queries and relationships
**Depends on**: Phase 1
**Requirements**: REC-01 to REC-08, QRY-01 to QRY-09, REL-01 to REL-05
**Plans**: 3 plans in 2 waves
**Success Criteria** (what must be TRUE):
  1. User can insert, read, update, and delete records via workflow node
  2. System extracts indexed values and populates search_text automatically
  3. User can query records with filters (eq, gt, contains, between, AND/OR/NOT)
  4. User can include related records in query results
  5. System enforces referential integrity on relationships

Plans:
- [x] 02-01-PLAN.md — Record infrastructure: flex_records table, FlexRecordService, FlexQueryBuilder (Wave 1)
- [x] 02-02-PLAN.md — FlexRecordNode workflow node and relationship handling (Wave 2)
- [x] 02-03-PLAN.md — Gap closure: FULLTEXT index migration for full-text search (Wave 1, gap_closure)

### Phase 3: FlexDB REST API
**Goal**: External systems can interact with FlexDB through REST endpoints
**Depends on**: Phase 2
**Requirements**: API-01 to API-11
**Success Criteria** (what must be TRUE):
  1. Client can create and manage tables via POST/GET/PUT/DELETE /api/flexdb/tables
  2. Client can CRUD records via /api/flexdb/tables/:tableId/records endpoints
  3. Client can execute complex queries via POST /api/flexdb/query
  4. All endpoints require authentication and scope to application
**Plans**: TBD

Plans:
- [ ] 03-01: FlexDB routes and plugin registration

### Phase 4: AI Service Integration
**Goal**: AI can generate FlexDB components with conversation-based refinement
**Depends on**: Phase 3
**Requirements**: AIINT-01 to AIINT-05, AISCH-01 to AISCH-07, CONV-01 to CONV-07, RATE-01 to RATE-04
**Success Criteria** (what must be TRUE):
  1. System generates valid FlexTable schema from natural language description
  2. AI receives context about existing tables and terminology
  3. User can refine generated schema through conversation
  4. User can accept schema to create table or reject to discard
  5. System tracks token usage per application with quota enforcement
**Plans**: TBD

Plans:
- [ ] 04-01: AskAI wrapper and generation prompts
- [ ] 04-02: Conversation management and acceptance workflow
- [ ] 04-03: Usage tracking and rate limiting

### Phase 5: AI Workflow Nodes
**Goal**: Workflows can invoke AI generation for schemas, forms, and reports
**Depends on**: Phase 4
**Requirements**: AIFORM-01 to AIFORM-08, AIRPT-01 to AIRPT-07
**Success Criteria** (what must be TRUE):
  1. Workflow can generate FlexTable schema via ai-generate-schema node
  2. Workflow can generate form definition via ai-generate-form node
  3. Workflow can generate report definition via ai-generate-report node
  4. All AI nodes support conversation continuation and auto-accept options
**Plans**: TBD

Plans:
- [ ] 05-01: AI generation workflow nodes

### Phase 6: AI Generation API
**Goal**: Frontend can access AI generation through HTTP endpoints
**Depends on**: Phase 5
**Requirements**: AIAPI-01 to AIAPI-07
**Success Criteria** (what must be TRUE):
  1. Client can generate schema via POST /api/ai/generate/schema
  2. Client can generate form via POST /api/ai/generate/form
  3. Client can generate report via POST /api/ai/generate/report
  4. Client can continue, accept, or reject conversations via API
  5. Rate limiting returns 429 when quota exceeded
**Plans**: TBD

Plans:
- [ ] 06-01: AI generation routes and rate limiting

### Phase 7: Forms System
**Goal**: System supports complete form definitions with workflow integration
**Depends on**: Phase 6
**Requirements**: FDEF-01 to FDEF-07, FWFL-01 to FWFL-05
**Success Criteria** (what must be TRUE):
  1. FormDefinition supports vertical, grid, tabs, and wizard layouts
  2. Form fields support all FlexDB data types with validation
  3. Workflow can load and prepare forms via form-render node
  4. Workflow can validate and save form data via form-submit node
  5. Form definitions persist in database with CRUD API
**Plans**: TBD

Plans:
- [ ] 07-01: Form types, schema, and repository
- [ ] 07-02: Form workflow nodes and API

### Phase 8: Dynamic Form Renderer
**Goal**: React component renders forms dynamically from definitions
**Depends on**: Phase 7
**Requirements**: FRND-01 to FRND-08
**Success Criteria** (what must be TRUE):
  1. DynamicFormRenderer renders complete form from FormDefinition
  2. Form loads existing data when recordId provided
  3. Validation errors display per field with visual indicators
  4. Conditional fields update visibility in real-time based on expressions
  5. Reference fields render searchable lookup from related table
**Plans**: TBD

Plans:
- [ ] 08-01: DynamicFormRenderer component and field types

### Phase 9: Reports System
**Goal**: System generates reports in multiple formats from definitions
**Depends on**: Phase 8
**Requirements**: RDEF-01 to RDEF-06, RGEN-01 to RGEN-08
**Success Criteria** (what must be TRUE):
  1. ReportDefinition supports band-based layout (title, header, detail, group, summary)
  2. Report generator produces HTML, PDF, Excel, and CSV outputs
  3. Reports support grouping with subtotals and aggregations
  4. Reports accept parameters for runtime filtering
  5. Workflow can generate reports via report-generate node
**Plans**: TBD

Plans:
- [ ] 09-01: Report types, schema, and repository
- [ ] 09-02: Report generation engine (HTML, PDF, Excel, CSV)
- [ ] 09-03: Report workflow nodes and API

### Phase 10: Application Container
**Goal**: Users can package tables, forms, reports into deployable applications
**Depends on**: Phase 9
**Requirements**: APP-01 to APP-08
**Success Criteria** (what must be TRUE):
  1. ApplicationDefinition packages tables, forms, reports, and workflows
  2. Application includes menu system and navigation structure
  3. Application supports dashboard with configurable widgets
  4. User can export application as JSON and import to another environment
  5. AI context (description, business rules, terminology) persists with application
**Plans**: TBD

Plans:
- [ ] 10-01: Application types, schema, and API
- [ ] 10-02: Frontend AI assistant interface

### Phase 11: Integration Testing
**Goal**: All components work together in end-to-end workflows
**Depends on**: Phase 10
**Requirements**: (verification of all prior requirements)
**Success Criteria** (what must be TRUE):
  1. E2E test: AI generates schema, creates table, inserts records, queries successfully
  2. E2E test: AI generates form from table, renders in frontend, submits data
  3. E2E test: AI generates report from table, produces PDF output
  4. All unit and integration tests pass with >80% coverage
**Plans**: TBD

Plans:
- [ ] 11-01: FlexDB service and node tests
- [ ] 11-02: AI generation and conversation tests
- [ ] 11-03: End-to-end workflow tests

### Phase 12: Final Verification
**Goal**: System is production-ready with clean build and passing verification
**Depends on**: Phase 11
**Requirements**: (code quality, build readiness)
**Success Criteria** (what must be TRUE):
  1. Full build completes without errors (bun run build)
  2. Type check passes (bun run typecheck)
  3. Linter passes (bun run lint)
  4. Manual acceptance tests pass for FlexDB, AI generation, forms, and reports
**Plans**: TBD

Plans:
- [ ] 12-01: Build verification and final acceptance

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> ... -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. FlexDB Schema Foundation | 3/3 | Complete | 2026-01-23 |
| 2. FlexDB Record Operations | 3/3 | Complete | 2026-01-24 |
| 3. FlexDB REST API | 0/1 | Not started | - |
| 4. AI Service Integration | 0/3 | Not started | - |
| 5. AI Workflow Nodes | 0/1 | Not started | - |
| 6. AI Generation API | 0/1 | Not started | - |
| 7. Forms System | 0/2 | Not started | - |
| 8. Dynamic Form Renderer | 0/1 | Not started | - |
| 9. Reports System | 0/3 | Not started | - |
| 10. Application Container | 0/2 | Not started | - |
| 11. Integration Testing | 0/3 | Not started | - |
| 12. Final Verification | 0/1 | Not started | - |

---
*Created: 2026-01-23*
*Updated: 2026-01-24 (phase 2 complete with gap closure)*
*Total phases: 12 | Total plans: 24*
