# Requirements: FoxPro 2.6 AI - RAD Platform

**Defined:** 2026-01-23
**Core Value:** Users can build data-driven applications by describing what they need in natural language, without writing code or managing database migrations.

## v1 Requirements

Requirements for initial release (all 12 phases). Each maps to roadmap phases.

### FlexDB Tables

- [ ] **FLEX-01**: User can create database tables at runtime through workflows using `flex-table` node
- [ ] **FLEX-02**: System validates table name uniqueness within application
- [ ] **FLEX-03**: System accepts column definitions with name, dataType, required, unique, validation
- [ ] **FLEX-04**: System assigns indexed columns to slots (3 string, 2 numeric, 2 date max)
- [ ] **FLEX-05**: System automatically adds id, created_at, updated_at, deleted_at metadata
- [ ] **FLEX-06**: System stores version history in flex_table_versions on schema changes

### FlexDB Column Types

- [ ] **TYPE-01**: System supports string dataType with maxLength validation (default 255)
- [ ] **TYPE-02**: System supports text dataType for long-form content
- [ ] **TYPE-03**: System supports integer dataType with min/max bounds
- [ ] **TYPE-04**: System supports decimal dataType (DECIMAL 18,4)
- [ ] **TYPE-05**: System supports boolean dataType (true/false only)
- [ ] **TYPE-06**: System supports date dataType (ISO YYYY-MM-DD)
- [ ] **TYPE-07**: System supports datetime dataType (ISO format)
- [ ] **TYPE-08**: System supports json dataType (nested objects/arrays)
- [ ] **TYPE-09**: System supports reference dataType with target table validation
- [ ] **TYPE-10**: System supports validation patterns (regex, enum, computed expressions)

### FlexDB Record Operations

- [ ] **REC-01**: User can insert records via `flex-record` node with data in JSON column
- [ ] **REC-02**: System extracts indexed values to idx_str_1-3, idx_num_1-2, idx_date_1-2
- [ ] **REC-03**: System populates search_text column for full-text search
- [ ] **REC-04**: User can find single record by ID
- [ ] **REC-05**: User can findMany records with filter and pagination
- [ ] **REC-06**: User can update records with version increment
- [ ] **REC-07**: User can soft-delete records (deleted_at) or hard-delete
- [ ] **REC-08**: System triggers appropriate edges (found, not_found, empty, conflict)

### FlexDB Query Language

- [ ] **QRY-01**: Filter supports equality: `{ field: value }` and `{ field: { eq: value } }`
- [ ] **QRY-02**: Filter supports comparison: gt, gte, lt, lte, ne
- [ ] **QRY-03**: Filter supports IN: `{ field: { in: [values] } }`
- [ ] **QRY-04**: Filter supports string ops: contains, startsWith, endsWith
- [ ] **QRY-05**: Filter supports range: between, isNull
- [ ] **QRY-06**: Filter supports full-text: `{ field: { search: "text" } }`
- [ ] **QRY-07**: Filter supports logic: AND, OR, NOT conjunctions
- [ ] **QRY-08**: Query supports orderBy with multiple fields and directions
- [ ] **QRY-09**: Query supports limit and offset pagination

### FlexDB Relationships

- [ ] **REL-01**: User can define reference columns to other FlexDB tables
- [ ] **REL-02**: System supports one-to-one, one-to-many, many-to-many relationships
- [ ] **REL-03**: Query can include related records via `include: [{ relation: "name" }]`
- [ ] **REL-04**: System supports onDelete behavior (cascade, set-null, restrict)
- [ ] **REL-05**: System validates referenced records exist on insert

### FlexDB Schema Versioning

- [ ] **VER-01**: System creates version entry on schema modification
- [ ] **VER-02**: Version stores previous_schema, new_schema, changes array
- [ ] **VER-03**: Changes include type (add_column, remove_column, modify_column)
- [ ] **VER-04**: User can query version history chronologically

### AI Schema Generation

- [ ] **AISCH-01**: User can generate FlexTable schema from natural language via API
- [ ] **AISCH-02**: AI receives context about existing tables in application
- [ ] **AISCH-03**: AI automatically adds audit fields (created_at, updated_at)
- [ ] **AISCH-04**: AI selects appropriate data types from field names and context
- [ ] **AISCH-05**: Generated schema includes AI's decision explanation
- [ ] **AISCH-06**: AI validates schema and attempts fixes if invalid
- [ ] **AISCH-07**: User can accept to save schema and create table

### AI Conversation Management

- [ ] **CONV-01**: System creates new conversation when conversationId not provided
- [ ] **CONV-02**: System continues existing conversation when conversationId provided
- [ ] **CONV-03**: System stores messages with timestamp and role
- [ ] **CONV-04**: User can say "accept" to save generated component
- [ ] **CONV-05**: User can say "reject" to mark conversation rejected
- [ ] **CONV-06**: Inactive conversations expire after 24 hours
- [ ] **CONV-07**: System tracks token usage per message

### AI Form Generation

- [ ] **AIFORM-01**: User can generate FormDefinition from table schema
- [ ] **AIFORM-02**: User can generate FormDefinition from natural language
- [ ] **AIFORM-03**: AI groups related fields logically
- [ ] **AIFORM-04**: AI places required fields before optional
- [ ] **AIFORM-05**: AI selects appropriate input types (select for enum, datepicker for date)
- [ ] **AIFORM-06**: AI adds placeholders and helpText for UX
- [ ] **AIFORM-07**: AI creates tabbed/wizard layout for many columns
- [ ] **AIFORM-08**: AI includes Save and Cancel actions

### AI Report Generation

- [ ] **AIRPT-01**: User can generate ReportDefinition from table schema
- [ ] **AIRPT-02**: User can generate ReportDefinition from natural language
- [ ] **AIRPT-03**: AI interprets grouping, sorting, filtering needs
- [ ] **AIRPT-04**: AI creates appropriate bands (title, header, detail, footer, summary)
- [ ] **AIRPT-05**: AI adds group_header/group_footer with subtotals for grouped data
- [ ] **AIRPT-06**: AI sets appropriate page setup (A4, portrait/landscape)
- [ ] **AIRPT-07**: AI adds date range parameters for date-related data

### Form Definition Structure

- [ ] **FDEF-01**: FormDefinition includes name, displayName, dataSource
- [ ] **FDEF-02**: dataSource.type "flex_table" specifies tableId and optional recordId
- [ ] **FDEF-03**: layout.type supports vertical, grid, tabs, wizard
- [ ] **FDEF-04**: Field includes id, name, label, type
- [ ] **FDEF-05**: Field types include text, select, textarea, number, date, checkbox, reference
- [ ] **FDEF-06**: Field supports conditional hidden/disabled via expression evaluation
- [ ] **FDEF-07**: Actions array defines buttons (submit, cancel, workflow)

### Dynamic Form Renderer

- [ ] **FRND-01**: DynamicFormRenderer component renders complete form from definition
- [ ] **FRND-02**: Form loads existing data when recordId provided
- [ ] **FRND-03**: Required fields show visual indicator and enforce validation
- [ ] **FRND-04**: Fields display helpText and placeholder
- [ ] **FRND-05**: Validation errors display per field
- [ ] **FRND-06**: Conditional fields update visibility in real-time
- [ ] **FRND-07**: Reference fields render searchable lookup component
- [ ] **FRND-08**: Form supports view, edit, create modes

### Form Workflow Nodes

- [ ] **FWFL-01**: `form-render` node loads FormDefinition and prepares for UI
- [ ] **FWFL-02**: form-render loads existing record data when recordId provided
- [ ] **FWFL-03**: `form-submit` node validates and processes form data
- [ ] **FWFL-04**: form-submit triggers validation_error edge on failure
- [ ] **FWFL-05**: form-submit saves data to FlexDB and returns savedRecord

### Report Definition Structure

- [ ] **RDEF-01**: ReportDefinition includes name, displayName, dataSource
- [ ] **RDEF-02**: dataSource specifies tableId, filters, orderBy, groupBy
- [ ] **RDEF-03**: bands array defines report sections
- [ ] **RDEF-04**: Band types include title, page_header, detail, group_header, group_footer, summary
- [ ] **RDEF-05**: Band elements include field, label, expression, line
- [ ] **RDEF-06**: Parameters array allows user input for filtering

### Report Generation

- [ ] **RGEN-01**: `report-generate` node renders report with data
- [ ] **RGEN-02**: Format "html" generates HTML document
- [ ] **RGEN-03**: Format "pdf" generates PDF via Puppeteer/Playwright
- [ ] **RGEN-04**: Format "excel" generates XLSX via exceljs
- [ ] **RGEN-05**: Format "csv" generates CSV with proper escaping
- [ ] **RGEN-06**: Report applies parameters as filters
- [ ] **RGEN-07**: Report groups data and renders group bands
- [ ] **RGEN-08**: Report calculates aggregations for footers

### Application Container

- [ ] **APP-01**: ApplicationDefinition includes name, displayName, version
- [ ] **APP-02**: components arrays contain table, form, report, workflow IDs
- [ ] **APP-03**: entryPoints define mainMenu, defaultForm, or dashboard
- [ ] **APP-04**: aiContext stores description, businessRules, terminology
- [ ] **APP-05**: Application can be exported as JSON package
- [ ] **APP-06**: Application can be imported to target environment
- [ ] **APP-07**: Menu items define navigation structure
- [ ] **APP-08**: Dashboard widgets configure home page

### AskAI Service Integration

- [ ] **AIINT-01**: AIGenerationService uses existing AskAI Service (OpenRouter)
- [ ] **AIINT-02**: AI requests use askAI.complete() with model, messages, pluginId
- [ ] **AIINT-03**: System prompts guide JSON generation with validation
- [ ] **AIINT-04**: Conversation context includes message history
- [ ] **AIINT-05**: Token usage tracked via UsageTracker

### AI Rate Limiting

- [ ] **RATE-01**: Usage tracked per application
- [ ] **RATE-02**: Free tier limit blocks with upgrade message
- [ ] **RATE-03**: Token cap can be configured per application
- [ ] **RATE-04**: Usage logs include timestamp, user, tokens, cost

### FlexDB API Endpoints

- [ ] **API-01**: POST /api/flexdb/tables creates table
- [ ] **API-02**: GET /api/flexdb/tables lists tables for application
- [ ] **API-03**: GET /api/flexdb/tables/:id returns table schema
- [ ] **API-04**: PUT /api/flexdb/tables/:id updates table schema
- [ ] **API-05**: DELETE /api/flexdb/tables/:id soft-deletes table
- [ ] **API-06**: POST /api/flexdb/tables/:tableId/records inserts record
- [ ] **API-07**: GET /api/flexdb/tables/:tableId/records queries records
- [ ] **API-08**: GET /api/flexdb/tables/:tableId/records/:id returns record
- [ ] **API-09**: PUT /api/flexdb/tables/:tableId/records/:id updates record
- [ ] **API-10**: DELETE /api/flexdb/tables/:tableId/records/:id deletes record
- [ ] **API-11**: POST /api/flexdb/query executes complex query

### AI Generation API Endpoints

- [ ] **AIAPI-01**: POST /api/ai/generate/schema generates schema
- [ ] **AIAPI-02**: POST /api/ai/generate/form generates form
- [ ] **AIAPI-03**: POST /api/ai/generate/report generates report
- [ ] **AIAPI-04**: POST /api/ai/conversation/:id/message continues conversation
- [ ] **AIAPI-05**: POST /api/ai/conversation/:id/accept saves component
- [ ] **AIAPI-06**: POST /api/ai/conversation/:id/reject marks rejected
- [ ] **AIAPI-07**: GET /api/ai/conversation/:id returns history

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Collaboration

- **COLLAB-01**: Real-time collaborative editing of schemas/forms/reports
- **COLLAB-02**: Presence indicators for concurrent users

### Advanced Features

- **ADV-01**: Offline mode with local storage sync
- **ADV-02**: Mobile native applications
- **ADV-03**: Import from legacy FoxPro .DBF files
- **ADV-04**: Visual workflow builder (drag-drop)
- **ADV-05**: Multi-language internationalization
- **ADV-06**: GraphQL API alternative

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | High complexity, not core to RAD value |
| Offline mode | Web-first platform, adds significant complexity |
| Mobile native apps | Web responsive sufficient for v1 |
| Import FoxPro .DBF files | Focus on new development, legacy import is niche |
| Visual workflow builder | Workflows are JSON-defined, visual builder is separate project |
| Multi-language i18n | Romanian primary for v1, i18n later |
| Built-in backup/DR | Use standard MySQL backup solutions |
| White-labeling | Not needed for v1 |
| GraphQL API | REST is sufficient, GraphQL adds complexity |
| Third-party OAuth | Internal auth first, OAuth later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLEX-01 | Phase 1 | Pending |
| FLEX-02 | Phase 1 | Pending |
| FLEX-03 | Phase 1 | Pending |
| FLEX-04 | Phase 1 | Pending |
| FLEX-05 | Phase 1 | Pending |
| FLEX-06 | Phase 1 | Pending |
| TYPE-01 | Phase 1 | Pending |
| TYPE-02 | Phase 1 | Pending |
| TYPE-03 | Phase 1 | Pending |
| TYPE-04 | Phase 1 | Pending |
| TYPE-05 | Phase 1 | Pending |
| TYPE-06 | Phase 1 | Pending |
| TYPE-07 | Phase 1 | Pending |
| TYPE-08 | Phase 1 | Pending |
| TYPE-09 | Phase 1 | Pending |
| TYPE-10 | Phase 1 | Pending |
| VER-01 | Phase 1 | Pending |
| VER-02 | Phase 1 | Pending |
| VER-03 | Phase 1 | Pending |
| VER-04 | Phase 1 | Pending |
| REC-01 | Phase 2 | Pending |
| REC-02 | Phase 2 | Pending |
| REC-03 | Phase 2 | Pending |
| REC-04 | Phase 2 | Pending |
| REC-05 | Phase 2 | Pending |
| REC-06 | Phase 2 | Pending |
| REC-07 | Phase 2 | Pending |
| REC-08 | Phase 2 | Pending |
| QRY-01 | Phase 2 | Pending |
| QRY-02 | Phase 2 | Pending |
| QRY-03 | Phase 2 | Pending |
| QRY-04 | Phase 2 | Pending |
| QRY-05 | Phase 2 | Pending |
| QRY-06 | Phase 2 | Pending |
| QRY-07 | Phase 2 | Pending |
| QRY-08 | Phase 2 | Pending |
| QRY-09 | Phase 2 | Pending |
| REL-01 | Phase 2 | Pending |
| REL-02 | Phase 2 | Pending |
| REL-03 | Phase 2 | Pending |
| REL-04 | Phase 2 | Pending |
| REL-05 | Phase 2 | Pending |
| API-01 | Phase 3 | Pending |
| API-02 | Phase 3 | Pending |
| API-03 | Phase 3 | Pending |
| API-04 | Phase 3 | Pending |
| API-05 | Phase 3 | Pending |
| API-06 | Phase 3 | Pending |
| API-07 | Phase 3 | Pending |
| API-08 | Phase 3 | Pending |
| API-09 | Phase 3 | Pending |
| API-10 | Phase 3 | Pending |
| API-11 | Phase 3 | Pending |
| AIINT-01 | Phase 4 | Pending |
| AIINT-02 | Phase 4 | Pending |
| AIINT-03 | Phase 4 | Pending |
| AIINT-04 | Phase 4 | Pending |
| AIINT-05 | Phase 4 | Pending |
| AISCH-01 | Phase 4 | Pending |
| AISCH-02 | Phase 4 | Pending |
| AISCH-03 | Phase 4 | Pending |
| AISCH-04 | Phase 4 | Pending |
| AISCH-05 | Phase 4 | Pending |
| AISCH-06 | Phase 4 | Pending |
| AISCH-07 | Phase 4 | Pending |
| CONV-01 | Phase 4 | Pending |
| CONV-02 | Phase 4 | Pending |
| CONV-03 | Phase 4 | Pending |
| CONV-04 | Phase 4 | Pending |
| CONV-05 | Phase 4 | Pending |
| CONV-06 | Phase 4 | Pending |
| CONV-07 | Phase 4 | Pending |
| RATE-01 | Phase 4 | Pending |
| RATE-02 | Phase 4 | Pending |
| RATE-03 | Phase 4 | Pending |
| RATE-04 | Phase 4 | Pending |
| AIFORM-01 | Phase 5 | Pending |
| AIFORM-02 | Phase 5 | Pending |
| AIFORM-03 | Phase 5 | Pending |
| AIFORM-04 | Phase 5 | Pending |
| AIFORM-05 | Phase 5 | Pending |
| AIFORM-06 | Phase 5 | Pending |
| AIFORM-07 | Phase 5 | Pending |
| AIFORM-08 | Phase 5 | Pending |
| AIRPT-01 | Phase 5 | Pending |
| AIRPT-02 | Phase 5 | Pending |
| AIRPT-03 | Phase 5 | Pending |
| AIRPT-04 | Phase 5 | Pending |
| AIRPT-05 | Phase 5 | Pending |
| AIRPT-06 | Phase 5 | Pending |
| AIRPT-07 | Phase 5 | Pending |
| AIAPI-01 | Phase 6 | Pending |
| AIAPI-02 | Phase 6 | Pending |
| AIAPI-03 | Phase 6 | Pending |
| AIAPI-04 | Phase 6 | Pending |
| AIAPI-05 | Phase 6 | Pending |
| AIAPI-06 | Phase 6 | Pending |
| AIAPI-07 | Phase 6 | Pending |
| FDEF-01 | Phase 7 | Pending |
| FDEF-02 | Phase 7 | Pending |
| FDEF-03 | Phase 7 | Pending |
| FDEF-04 | Phase 7 | Pending |
| FDEF-05 | Phase 7 | Pending |
| FDEF-06 | Phase 7 | Pending |
| FDEF-07 | Phase 7 | Pending |
| FWFL-01 | Phase 7 | Pending |
| FWFL-02 | Phase 7 | Pending |
| FWFL-03 | Phase 7 | Pending |
| FWFL-04 | Phase 7 | Pending |
| FWFL-05 | Phase 7 | Pending |
| FRND-01 | Phase 8 | Pending |
| FRND-02 | Phase 8 | Pending |
| FRND-03 | Phase 8 | Pending |
| FRND-04 | Phase 8 | Pending |
| FRND-05 | Phase 8 | Pending |
| FRND-06 | Phase 8 | Pending |
| FRND-07 | Phase 8 | Pending |
| FRND-08 | Phase 8 | Pending |
| RDEF-01 | Phase 9 | Pending |
| RDEF-02 | Phase 9 | Pending |
| RDEF-03 | Phase 9 | Pending |
| RDEF-04 | Phase 9 | Pending |
| RDEF-05 | Phase 9 | Pending |
| RDEF-06 | Phase 9 | Pending |
| RGEN-01 | Phase 9 | Pending |
| RGEN-02 | Phase 9 | Pending |
| RGEN-03 | Phase 9 | Pending |
| RGEN-04 | Phase 9 | Pending |
| RGEN-05 | Phase 9 | Pending |
| RGEN-06 | Phase 9 | Pending |
| RGEN-07 | Phase 9 | Pending |
| RGEN-08 | Phase 9 | Pending |
| APP-01 | Phase 10 | Pending |
| APP-02 | Phase 10 | Pending |
| APP-03 | Phase 10 | Pending |
| APP-04 | Phase 10 | Pending |
| APP-05 | Phase 10 | Pending |
| APP-06 | Phase 10 | Pending |
| APP-07 | Phase 10 | Pending |
| APP-08 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 109 total
- Mapped to phases: 109
- Unmapped: 0

---
*Requirements defined: 2026-01-23*
*Source: .kiro/specs/foxpro-ai-rad/requirements.md*
*Last updated: 2026-01-23 after roadmap creation*
