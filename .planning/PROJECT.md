# FoxPro 2.6 AI - RAD Platform

## What This Is

A modern Rapid Application Development (RAD) platform that recreates the FoxPro 2.6 development paradigm on Workscript infrastructure. Users describe what they want in natural language, and AI generates database schemas, forms, and reports automatically. Built as an extension to the existing Workscript monorepo, leveraging the workflow engine, AskAI service, and shadcn/ui components.

## Core Value

Users can build data-driven applications by describing what they need in natural language, without writing code or managing database migrations.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inherited from existing Workscript codebase -->

- ✓ Workflow engine with 45+ nodes — existing
- ✓ JSON workflow syntax with state management — existing
- ✓ AskAI Service (OpenRouter) with 300+ models — existing
- ✓ Hono API server with plugin architecture — existing
- ✓ React frontend with shadcn/ui components — existing
- ✓ Drizzle ORM with MySQL — existing
- ✓ Monorepo structure (engine, nodes, api, frontend) — existing

### Active

<!-- Current scope — v1 milestone, all 12 phases -->

**FlexDB Foundation (Phases 1-3)**
- [ ] FLEX-01: Create database tables at runtime through workflows (flex-table node)
- [ ] FLEX-02: Define columns with 8 data types (string, text, integer, decimal, boolean, date, datetime, json, reference)
- [ ] FLEX-03: Support column validation (required, unique, pattern, enum, min/max)
- [ ] FLEX-04: 7 indexed slots per table (3 string, 2 numeric, 2 date) for query performance
- [ ] FLEX-05: CRUD operations on records through flex-record node
- [ ] FLEX-06: Full-text search via search_text column
- [ ] FLEX-07: Query language with filters (eq, ne, gt, lt, contains, between, AND/OR/NOT)
- [ ] FLEX-08: Relationships between tables (one-to-one, one-to-many, many-to-many)
- [ ] FLEX-09: Schema versioning with change tracking
- [ ] FLEX-10: REST API endpoints for tables and records

**AI Generation (Phases 4-5)**
- [ ] AI-01: Generate FlexTable schema from natural language description
- [ ] AI-02: Conversation management for iterative refinement
- [ ] AI-03: Context-aware generation (existing tables, terminology)
- [ ] AI-04: Accept/reject workflow for generated components
- [ ] AI-05: Token usage tracking per application

**Forms System (Phases 6-7)**
- [ ] FORM-01: FormDefinition JSON schema for dynamic forms
- [ ] FORM-02: Multiple layouts (vertical, grid, tabs, wizard)
- [ ] FORM-03: Field types matching FlexDB data types
- [ ] FORM-04: DynamicFormRenderer React component
- [ ] FORM-05: Conditional fields with expression evaluation
- [ ] FORM-06: Form workflow nodes (form-render, form-submit)
- [ ] FORM-07: AI-generated forms from table schema
- [ ] FORM-08: AI-first editor with manual adjustments

**Reports System (Phases 8-9)**
- [ ] RPT-01: ReportDefinition JSON schema (band-based)
- [ ] RPT-02: Band types (title, header, detail, group_header, group_footer, summary)
- [ ] RPT-03: Grouping with subtotals and aggregations
- [ ] RPT-04: Output formats (HTML, PDF, Excel, CSV)
- [ ] RPT-05: Report parameters for filtering
- [ ] RPT-06: report-generate workflow node
- [ ] RPT-07: AI-generated reports from requirements
- [ ] RPT-08: AI-first editor with manual adjustments

**Application Container (Phases 10-12)**
- [ ] APP-01: ApplicationDefinition to package tables, forms, reports, workflows
- [ ] APP-02: Menu system and navigation structure
- [ ] APP-03: Dashboard with widgets
- [ ] APP-04: Application export/import
- [ ] APP-05: AI context storage (description, business rules, terminology)

### Out of Scope

- Real-time collaborative editing — complexity, not core to RAD value
- Offline mode — web-first platform
- Mobile native apps — web responsive is sufficient
- Import from legacy FoxPro .DBF files — focus on new development
- Visual workflow builder — workflows are JSON-defined
- Multi-language i18n — Romanian primary
- Built-in backup/DR — use standard MySQL backups
- GraphQL API — REST is sufficient
- Third-party OAuth login — internal auth first

## Context

**Existing Infrastructure:**
- Workscript monorepo (Bun + Hono + Vite + React)
- ExecutionEngine with lifecycle hooks
- WorkflowParser for JSON→AST
- StateManager with $.key syntax
- 45+ registered workflow nodes in @workscript/nodes
- AskAI Service fully operational with OpenRouter integration
- MySQL database with Drizzle ORM

**FoxPro Heritage:**
The FoxPro 2.6 development environment from the 1990s was revolutionary for its time — users could visually design databases (DBF), forms (SCX), and reports (FRX) with minimal coding. This project brings that paradigm to modern web development, enhanced with AI.

**Codebase Map:** `.planning/codebase/` contains detailed architecture analysis

## Constraints

- **Tech stack**: Must integrate with existing Workscript packages (engine, nodes, api, frontend)
- **Database**: MySQL via Drizzle ORM (existing schema patterns)
- **AI Provider**: OpenRouter via existing AskAI Service
- **Index limits**: 7 indexed slots per FlexDB table (3 str, 2 num, 2 date) — firm limit
- **Visual editors**: AI-first with form-based adjustments (no drag-drop builders for v1)
- **Language**: TypeScript strict mode, following existing code conventions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| EAV pattern for FlexDB | Allows runtime table creation without migrations | — Pending |
| 7 index slots per table | Balance between flexibility and query performance | — Pending |
| Band-based reports | Matches FoxPro paradigm, well-understood model | — Pending |
| AI-first visual editors | Faster to build than drag-drop, leverages existing AskAI | — Pending |
| Use existing AskAI Service | Already operational with OpenRouter, avoids duplication | — Pending |

---
*Last updated: 2026-01-23 after initialization*
