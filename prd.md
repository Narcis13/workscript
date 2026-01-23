# FoxPro AI - RAD Platform pe Workscript

## Viziune

Recreerea paradigmei **FoxPro 2.6 RAD (Rapid Application Development)** pe infrastructura Workscript, cu AI ca "development partner". Utilizatorii descriu ce vor în limbaj natural, iar sistemul generează automat scheme de date, formulare și rapoarte.

| Component FoxPro | Echivalent Workscript | Status |
|------------------|----------------------|--------|
| PRG files | Workflows JSON | ✅ Există |
| SCX (Forms) | FormDefinition JSON + Visual Designer | 🔨 De construit |
| FRX (Reports) | ReportDefinition JSON + Generator | 🔨 De construit |
| DBF (Tables) | FlexDB (EAV pattern) | 🔨 De construit |
| PJX (Project) | ApplicationDefinition | 🔨 De construit |

---

## Stack Tehnologic

| Categorie | Tehnologie | Rol |
|-----------|------------|-----|
| **Runtime** | Bun 1.x | Server runtime |
| **Backend** | Hono 4.7.x | API server |
| **Frontend** | React 19 + Vite 6 | Management UI |
| **Database** | MySQL + Drizzle ORM | Persistență |
| **AI** | AskAI Service (OpenRouter) | Generare inteligentă - 300+ modele AI |
| **UI Components** | shadcn/ui + Tailwind | Componente vizuale |
| **Validation** | Ajv + Zod | Schema validation |

---

## Arhitectură

### Diagrama de Ansamblu

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  AIAssistant  │  TableDesigner  │  FormDesigner  │ ReportViewer │
└───────┬───────┴────────┬────────┴───────┬────────┴──────┬───────┘
        │                │                │               │
        ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Server (Hono)                        │
├─────────────────────────────────────────────────────────────────┤
│  /api/ai/*  │  /api/flex/*  │  /api/forms/*  │  /api/reports/*  │
└──────┬──────┴───────┬───────┴───────┬────────┴────────┬─────────┘
       │              │               │                 │
       ▼              ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Services Layer                              │
├─────────────────────────────────────────────────────────────────┤
│ AIGenerationService │ FlexDBService │ FormService │ ReportService│
└──────────┬──────────┴───────┬───────┴──────┬──────┴──────┬──────┘
           │                  │              │             │
           ▼                  ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Engine                               │
├─────────────────────────────────────────────────────────────────┤
│ flex-table │ flex-record │ form-render │ report-generate │ ai-* │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MySQL Database                              │
├─────────────────────────────────────────────────────────────────┤
│ flex_tables │ flex_records │ form_definitions │ report_definitions│
└─────────────────────────────────────────────────────────────────┘
```

### Componente Principale

#### 1. FlexDB - Database Flexibil
Sistem EAV (Entity-Attribute-Value) care permite crearea de tabele la runtime fără migrări.

**Caracteristici:**
- Schema dinamică (JSON-based)
- 7 sloturi indexate pentru performanță
- Full-text search integrat
- Relații între tabele
- Soft delete și versionare

#### 2. AI Generation Layer
Integrare AskAI Service (OpenRouter) pentru generare inteligentă cu acces la 300+ modele AI.

**Capabilități:**
- Generare scheme din descrieri text
- Generare formulare din scheme existente
- Generare rapoarte din cerințe
- Conversații cu refinement iterativ
- Suport multi-provider (Anthropic, OpenAI, Google, Meta, Mistral, etc.)
- Tracking automat al utilizării și costurilor

#### 3. Forms System
Definire și randare dinamică de formulare.

**Features:**
- Layouturi multiple (vertical, grid, tabs, wizard)
- Validare integrată
- Câmpuri condiționale
- Integrare FlexDB

#### 4. Reports System
Rapoarte band-based cu export multiplu.

**Formate:**
- HTML (preview)
- PDF (print)
- Excel (export)
- CSV (date)

---

## Faze de Implementare

### Faza 1: FlexDB Foundation (Săpt. 1-2)
- Schema Drizzle pentru flex_tables, flex_records
- FlexDBService cu operații CRUD
- API endpoints REST

### Faza 2: FlexDB Nodes (Săpt. 2-3)
- FlexTableNode (create/alter/drop)
- FlexRecordNode (CRUD records)
- FlexQueryNode (queries complexe)

### Faza 3: AI Integration (Săpt. 3-4)
- AskAI Service integration (OpenRouter)
- System prompts pentru generare
- Conversation management

### Faza 4: AI Nodes (Săpt. 4-5)
- AIGenerateSchemaNode
- AIGenerateFormNode
- AIGenerateReportNode

### Faza 5: Forms System (Săpt. 5-7)
- FormDefinition types
- DynamicFormRenderer component
- FormRenderNode + FormSubmitNode

### Faza 6: Reports System (Săpt. 7-9)
- ReportDefinition types
- Band-based report engine
- HTML/PDF generators

### Faza 7: Visual Editors (Săpt. 9-11)
- Table Designer
- Form Designer
- Report Designer

### Faza 8: Application Container (Săpt. 11-13)
- ApplicationDefinition
- Menu system
- Dashboard builder

---

## Quick Start

### Prerequisite
- Bun 1.x instalat
- MySQL 8.x running
- API key OpenRouter (OPENROUTER_API_KEY)

### Setup

```bash
# Clone și install
cd workscript
bun install

# Configurare environment
cp apps/api/.env.example apps/api/.env
# Editează .env cu:
# - DATABASE_URL
# - OPENROUTER_API_KEY

# Push schema
cd apps/api && bun run db:push

# Start development
bun run dev
```

### Primul Workflow cu FlexDB

```json
{
  "id": "first-flexdb-workflow",
  "name": "Create Customer Table",
  "version": "1.0.0",
  "initialState": {},
  "workflow": [
    {
      "flex-table": {
        "operation": "create",
        "name": "customers",
        "displayName": "Clienți",
        "columns": [
          { "name": "name", "dataType": "string", "required": true, "indexed": true },
          { "name": "email", "dataType": "string", "required": true, "unique": true, "indexed": true },
          { "name": "phone", "dataType": "string" },
          { "name": "status", "dataType": "string", "validation": { "enumValues": ["active", "inactive"] } }
        ],
        "success?": {
          "log": { "message": "Tabel customers creat cu succes!" }
        }
      }
    }
  ]
}
```

### Prima Generare AI

```json
{
  "id": "ai-generate-example",
  "name": "AI Generate Schema",
  "version": "1.0.0",
  "initialState": {
    "description": "Am nevoie de un tabel pentru produse cu nume, preț, stoc și categorie"
  },
  "workflow": [
    {
      "ai-generate-schema": {
        "description": "$.description",
        "autoAccept": true,
        "success?": {
          "log": { "message": "Schema generată: {{$.schemaExplanation}}" }
        }
      }
    }
  ]
}
```

---

## Structura Fișiere

```
workscript/
├── packages/
│   ├── engine/src/types/
│   │   ├── flexdb.types.ts       # FlexTable, FlexRecord, FlexQuery
│   │   ├── forms.types.ts        # FormDefinition, FormField
│   │   ├── reports.types.ts      # ReportDefinition, ReportBand
│   │   └── application.types.ts  # ApplicationDefinition
│   │
│   └── nodes/src/
│       ├── flexdb/               # FlexTableNode, FlexRecordNode, FlexQueryNode
│       ├── forms/                # FormRenderNode, FormSubmitNode
│       ├── reports/              # ReportGenerateNode
│       └── ai/                   # AIGenerate*Node
│
├── apps/
│   ├── api/src/
│   │   ├── db/schema/
│   │   │   ├── flexdb.schema.ts
│   │   │   ├── forms.schema.ts
│   │   │   └── reports.schema.ts
│   │   │
│   │   ├── shared-services/ask-ai/  # Existing AskAI Service (OpenRouter)
│   │   │   ├── AskAIService.ts   # Main service facade
│   │   │   ├── OpenRouterClient.ts # OpenRouter API client
│   │   │   ├── ModelRegistry.ts  # Model caching & discovery
│   │   │   └── UsageTracker.ts   # Usage analytics
│   │   │
│   │   └── plugins/rad/
│   │       ├── routes/
│   │       ├── repositories/
│   │       └── services/
│   │
│   └── frontend/src/components/rad/
│       ├── AIAssistant/
│       ├── TableDesigner/
│       ├── FormDesigner/
│       ├── FormRenderer/
│       ├── ReportDesigner/
│       └── ReportViewer/
│
└── docs/
    └── foxpro-ai-architecture.md  # Documentație detaliată
```

---

## Criterii de Succes

### Milestone 1: FlexDB Funcțional (Săpt. 3)
- [ ] Pot crea tabele din workflow
- [ ] Pot face CRUD pe records
- [ ] Queries cu filtre funcționează
- [ ] Indexed columns oferă performanță bună

### Milestone 2: AI Generation (Săpt. 5)
- [ ] AskAI Service generează scheme valide din descrieri
- [ ] Conversațiile de refinement funcționează
- [ ] Accept/reject flow complet

### Milestone 3: Forms (Săpt. 7)
- [ ] Formulare se randează din FormDefinition
- [ ] Submit salvează în FlexDB
- [ ] Validare funcționează

### Milestone 4: Reports (Săpt. 9)
- [ ] Rapoarte HTML se generează
- [ ] Export PDF funcționează
- [ ] Grupări și totaluri corecte

### Milestone 5: End-to-End (Săpt. 13)
- [ ] Flow complet: descriere → schema → form → raport
- [ ] Application container funcțional
- [ ] Visual editors pentru ajustări

---

## Documente Conexe

| Document | Descriere |
|----------|-----------|
| [requirements.md](./requirements.md) | Product Requirements Document - 20 cerințe detaliate |
| [implementation_plan.md](./implementation_plan.md) | Plan implementare - 178 taskuri în 12 faze |
| [foxpro-ai-architecture.md](/docs/foxpro-ai-architecture.md) | Arhitectură tehnică detaliată |

---

## Estimări

| Metric | Valoare |
|--------|---------|
| **Total Taskuri** | 178 |
| **Faze** | 12 |
| **Timp Estimat** | 13-19 săptămâni |
| **Cerințe** | 20 |
| **Criterii Acceptare** | 74 |

---

## Contact & Support

Pentru întrebări despre implementare, consultă:
1. `/docs/foxpro-ai-architecture.md` - Detalii tehnice
2. `/WORKFLOW_CREATION_BLUEPRINT.md` - Sintaxă workflows
3. Package-specific CLAUDE.md files pentru fiecare modul

# Requirements Document: FoxPro 2.6 AI - RAD Platform

## Introduction

FoxPro 2.6 AI is a revolutionary Rapid Application Development (RAD) platform that recreates the paradigm of the classic FoxPro 2.6 development environment on modern Workscript infrastructure, enhanced with AI capabilities powered by the AskAI shared service (OpenRouter integration).

The platform addresses the need for a low-code/no-code development environment where users can describe what they want in natural language, and AI generates the necessary database schemas, forms, reports, and workflows automatically. This eliminates the traditional barrier between business requirements and technical implementation, allowing domain experts to build applications without deep programming knowledge.

FoxPro 2.6 AI integrates with the existing Workscript monorepo architecture (Bun + Hono + Vite + React), leveraging the powerful workflow engine with 45+ nodes, Drizzle ORM for database operations, and shadcn/ui for the frontend components. The key innovation is the FlexDB system - an Entity-Attribute-Value (EAV) pattern that enables runtime table creation without traditional database migrations, combined with the AskAI shared service (OpenRouter) for intelligent component generation.

---

## Functional Requirements

### Requirement 1: FlexDB Table Creation

**User Story:** As a developer, I want to create database tables at runtime through workflows, so that I can define data structures without writing migration files or restarting the application.

#### Acceptance Criteria

1. WHEN a workflow executes a `flex-table` node with operation "create" THEN a new table schema is stored in the `flex_tables` database table
2. WHEN creating a table THEN the system validates that the table name is unique within the application
3. WHEN creating a table THEN the system accepts an array of column definitions with name, dataType, required, unique, and validation properties
4. WHEN a column is marked as `indexed: true` THEN the system assigns it to one of the available index slots (idx_str_1-3, idx_num_1-2, idx_date_1-2)
5. WHEN more than 3 string columns are marked as indexed THEN the system returns a validation error
6. WHEN creating a table THEN the system automatically adds id, created_at, updated_at, and deleted_at metadata columns
7. WHEN a table is successfully created THEN the state variable `$.flexTableId` contains the new table's ID
8. WHEN a table with the same name already exists THEN the `exists` edge is triggered instead of `success`
9. WHEN validation fails THEN the `error` edge is triggered with detailed error messages
10. WHEN creating a table THEN the system stores a version history entry in `flex_table_versions`

### Requirement 2: FlexDB Column Types and Validation

**User Story:** As a developer, I want to define columns with specific data types and validation rules, so that my data is consistent and valid.

#### Acceptance Criteria

1. WHEN defining a column with dataType "string" THEN the system supports maxLength validation (default 255)
2. WHEN defining a column with dataType "text" THEN the system stores long-form content without length limit
3. WHEN defining a column with dataType "integer" THEN the system validates min/max numeric bounds
4. WHEN defining a column with dataType "decimal" THEN the system supports DECIMAL(18,4) precision
5. WHEN defining a column with dataType "boolean" THEN the system accepts true/false values only
6. WHEN defining a column with dataType "date" THEN the system validates ISO date format (YYYY-MM-DD)
7. WHEN defining a column with dataType "datetime" THEN the system validates ISO datetime format
8. WHEN defining a column with dataType "json" THEN the system accepts nested objects/arrays
9. WHEN defining a column with dataType "reference" THEN the system requires referenceTable and validates it exists
10. WHEN a column has validation.pattern THEN the system validates values against the regex pattern
11. WHEN a column has validation.enumValues THEN the system only accepts values from the list
12. WHEN a column has computed.expression THEN the system automatically calculates the value on insert/update

### Requirement 3: FlexDB Record Operations

**User Story:** As a developer, I want to perform CRUD operations on FlexDB records through workflows, so that I can manipulate data without writing SQL.

#### Acceptance Criteria

1. WHEN executing `flex-record` with operation "insert" THEN a new record is created in `flex_records` with data stored in JSON column
2. WHEN inserting a record THEN indexed columns are automatically extracted to idx_str_1, idx_num_1, etc.
3. WHEN inserting a record THEN the search_text column is populated with concatenated searchable values
4. WHEN executing `flex-record` with operation "find" THEN a single record is returned matching the ID
5. WHEN executing `flex-record` with operation "findMany" THEN records matching the filter are returned with pagination
6. WHEN executing `flex-record` with operation "update" THEN the record is modified and version is incremented
7. WHEN executing `flex-record` with operation "delete" THEN the record is soft-deleted (deleted_at set)
8. WHEN delete operation has `hard: true` THEN the record is permanently removed
9. WHEN a record is not found THEN the `not_found` edge is triggered
10. WHEN findMany returns zero results THEN the `empty` edge is triggered
11. WHEN findMany returns results THEN `$.flexRecords` contains the array and `$.flexCount` contains the count
12. WHEN optimistic locking conflict occurs THEN the `conflict` edge is triggered

### Requirement 4: FlexDB Query Language

**User Story:** As a developer, I want to query FlexDB using a powerful filter syntax, so that I can find records efficiently.

#### Acceptance Criteria

1. WHEN a filter uses `{ field: value }` THEN it performs equality matching
2. WHEN a filter uses `{ field: { eq: value } }` THEN it performs explicit equality matching
3. WHEN a filter uses `{ field: { ne: value } }` THEN it excludes matching records
4. WHEN a filter uses `{ field: { gt: value } }` THEN it matches greater than comparison
5. WHEN a filter uses `{ field: { gte: value } }` THEN it matches greater than or equal
6. WHEN a filter uses `{ field: { lt: value } }` THEN it matches less than comparison
7. WHEN a filter uses `{ field: { lte: value } }` THEN it matches less than or equal
8. WHEN a filter uses `{ field: { in: [values] } }` THEN it matches any value in the array
9. WHEN a filter uses `{ field: { contains: "text" } }` THEN it performs substring matching
10. WHEN a filter uses `{ field: { startsWith: "text" } }` THEN it matches prefix
11. WHEN a filter uses `{ field: { endsWith: "text" } }` THEN it matches suffix
12. WHEN a filter uses `{ field: { between: [a, b] } }` THEN it matches range inclusive
13. WHEN a filter uses `{ field: { search: "text" } }` THEN it performs full-text search on search_text column
14. WHEN a filter uses `{ AND: [conditions] }` THEN all conditions must match
15. WHEN a filter uses `{ OR: [conditions] }` THEN any condition can match
16. WHEN a filter uses `{ NOT: condition }` THEN the condition must not match
17. WHEN query has `orderBy: [{ field, direction }]` THEN results are sorted accordingly
18. WHEN query has `limit` and `offset` THEN pagination is applied

### Requirement 5: FlexDB Relationships

**User Story:** As a developer, I want to define relationships between FlexDB tables, so that I can model complex data structures.

#### Acceptance Criteria

1. WHEN a column has dataType "reference" THEN the system validates the target table exists
2. WHEN defining a relationship THEN the system accepts type: "one-to-one", "one-to-many", or "many-to-many"
3. WHEN querying with `include: [{ relation: "name" }]` THEN related records are fetched and nested
4. WHEN a relationship has onDelete: "cascade" THEN deleting parent deletes children
5. WHEN a relationship has onDelete: "set-null" THEN deleting parent sets reference to null
6. WHEN a relationship has onDelete: "restrict" THEN deleting parent with children fails
7. WHEN querying included relations THEN filters and select can be applied to nested data
8. WHEN a many-to-many relationship is defined THEN the junction table is automatically managed
9. WHEN inserting a record with reference THEN the system validates the referenced record exists
10. WHEN referenceDisplay is set THEN the UI shows that field value instead of ID

### Requirement 6: FlexDB Schema Versioning

**User Story:** As a developer, I want to track schema changes over time, so that I can audit modifications and potentially rollback.

#### Acceptance Criteria

1. WHEN a table schema is modified THEN a new version entry is created in `flex_table_versions`
2. WHEN a version is created THEN it stores previous_schema, new_schema, and changes array
3. WHEN adding a column THEN changes includes `{ type: "add_column", details: {...} }`
4. WHEN removing a column THEN changes includes `{ type: "remove_column", details: {...} }`
5. WHEN modifying a column THEN changes includes `{ type: "modify_column", details: {...} }`
6. WHEN querying table schema THEN the current version number is returned
7. WHEN querying version history THEN all versions are returned in chronological order
8. IF a column is removed THEN existing records retain the data in JSON but it's no longer validated
9. IF a new required column is added THEN existing records are not automatically updated
10. WHEN the system starts THEN schema version integrity is verified

### Requirement 7: AI Schema Generation

**User Story:** As a user, I want to describe a database table in natural language, so that AI generates the schema definition for me.

#### Acceptance Criteria

1. WHEN user sends a description to `/api/ai/generate/schema` THEN AskAI service generates a FlexTable definition
2. WHEN generating schema THEN AI receives context about existing tables in the application
3. WHEN generating schema THEN AI receives the application's terminology dictionary
4. WHEN generating schema THEN AI automatically adds audit fields (created_at, updated_at)
5. WHEN generating schema THEN AI selects appropriate data types based on field names and context
6. WHEN generating schema for Romanian business THEN AI uses proper validation patterns (CNP, telefon, email)
7. WHEN schema is generated THEN it includes an explanation of the AI's decisions
8. WHEN schema is generated THEN it includes suggestions for improvements
9. WHEN the schema is invalid THEN AI automatically attempts to fix it
10. WHEN generation fails THEN detailed error message is returned
11. WHEN user provides feedback THEN AI refines the schema maintaining conversation context
12. WHEN schema is accepted THEN it is saved to database and table is created

### Requirement 8: AI Conversation Management

**User Story:** As a user, I want to refine AI-generated components through conversation, so that I can iteratively improve the output.

#### Acceptance Criteria

1. WHEN a new generation request arrives without conversationId THEN a new conversation is created
2. WHEN a generation request includes conversationId THEN the existing conversation is continued
3. WHEN a conversation message is sent THEN it is stored with timestamp and role
4. WHEN an assistant message includes a generated component THEN it is stored for reference
5. WHEN user says "accept" THEN the current component is saved to the database
6. WHEN user says "reject" THEN the conversation is marked as rejected
7. WHEN conversation is inactive for 24 hours THEN it expires and is cleaned up
8. WHEN retrieving a conversation THEN all messages and current component are returned
9. WHEN generating with feedback THEN the AI receives the previous schema and user's modification request
10. WHEN token usage is tracked THEN input and output tokens are stored per message

### Requirement 9: AI Form Generation

**User Story:** As a user, I want to describe a form or have AI generate one from a table schema, so that I can quickly create data entry interfaces.

#### Acceptance Criteria

1. WHEN user requests form generation with tableId THEN AI creates FormDefinition based on table schema
2. WHEN user requests form generation with description THEN AI creates FormDefinition from description
3. WHEN generating form THEN AI groups related fields logically (personal info, contact, etc.)
4. WHEN generating form THEN required fields are placed before optional fields
5. WHEN generating form THEN appropriate input types are selected (select for enum, date picker for date)
6. WHEN generating form THEN placeholders and helpText are added for UX
7. WHEN table has many columns THEN AI creates tabbed or wizard layout
8. WHEN generating form THEN Save and Cancel actions are included
9. WHEN form is generated THEN it includes validation rules matching table constraints
10. WHEN formType is "create" THEN form is configured for new record entry
11. WHEN formType is "edit" THEN form is configured for existing record modification
12. WHEN formType is "list" THEN a data table view definition is generated

### Requirement 10: AI Report Generation

**User Story:** As a user, I want to describe a report requirement, so that AI generates a report definition for me.

#### Acceptance Criteria

1. WHEN user requests report generation with tableId THEN AI creates ReportDefinition based on table
2. WHEN user provides report description THEN AI interprets grouping, sorting, and filtering needs
3. WHEN generating report THEN AI creates appropriate bands (title, header, detail, footer, summary)
4. WHEN data should be grouped THEN AI adds group_header and group_footer bands with subtotals
5. WHEN report needs totals THEN AI adds summary band with aggregations
6. WHEN generating report THEN AI sets appropriate page setup (A4, portrait/landscape)
7. WHEN report has date-related data THEN AI adds date range parameters
8. WHEN report is generated THEN default output formats are set (HTML, PDF)
9. WHEN columns have numeric data THEN AI adds appropriate number formatting
10. WHEN columns have date data THEN AI adds appropriate date formatting

### Requirement 11: Form Definition Structure

**User Story:** As a developer, I want to define forms using a JSON schema, so that I can create dynamic user interfaces.

#### Acceptance Criteria

1. WHEN a FormDefinition is created THEN it includes name, displayName, and dataSource
2. WHEN dataSource.type is "flex_table" THEN tableId and optional recordId are specified
3. WHEN layout.type is "vertical" THEN fields are stacked vertically
4. WHEN layout.type is "grid" THEN fields are arranged in specified columns
5. WHEN layout.type is "tabs" THEN sections array defines tab content
6. WHEN layout.type is "wizard" THEN sections array defines step content
7. WHEN a field is defined THEN it includes id, name, label, and type
8. WHEN field.type is "text" THEN a text input is rendered
9. WHEN field.type is "select" THEN a dropdown with options is rendered
10. WHEN field.options.choicesSource is defined THEN options are loaded dynamically
11. WHEN field.hidden is a string THEN it's evaluated as an expression
12. WHEN field.disabled is a string THEN it's evaluated as an expression
13. WHEN actions array is defined THEN buttons are rendered at form bottom
14. WHEN action.type is "submit" THEN form data is validated and submitted
15. WHEN action.type is "workflow" THEN the specified workflow is executed

### Requirement 12: Dynamic Form Renderer

**User Story:** As a user, I want forms to be rendered dynamically from definitions, so that I can interact with data entry interfaces.

#### Acceptance Criteria

1. WHEN DynamicFormRenderer receives a FormDefinition THEN it renders the complete form
2. WHEN form has dataSource with recordId THEN existing data is loaded and populated
3. WHEN a field is required THEN visual indicator is shown and validation enforced
4. WHEN a field has helpText THEN it is displayed below the input
5. WHEN a field has placeholder THEN it is shown in empty input
6. WHEN validation fails THEN error messages are displayed per field
7. WHEN form is submitted successfully THEN success callback is triggered
8. WHEN form has conditional fields THEN visibility is updated in real-time
9. WHEN field.type is "reference" THEN a searchable lookup component is rendered
10. WHEN form is in "view" mode THEN all fields are read-only
11. WHEN form is in "edit" mode THEN all editable fields are enabled
12. WHEN form submission is in progress THEN loading state is shown

### Requirement 13: Form Workflow Nodes

**User Story:** As a developer, I want to render and process forms through workflow nodes, so that I can integrate forms into business processes.

#### Acceptance Criteria

1. WHEN `form-render` node executes THEN it loads FormDefinition and prepares for UI
2. WHEN form-render has recordId THEN existing record data is loaded
3. WHEN form-render succeeds THEN `$.renderedForm` contains the prepared definition
4. WHEN form-render fails THEN error edge is triggered with message
5. WHEN `form-submit` node executes THEN it validates and processes form data
6. WHEN form-submit validation fails THEN `validation_error` edge is triggered
7. WHEN form-submit succeeds THEN data is saved to FlexDB
8. WHEN form-submit completes THEN `$.savedRecord` contains the result
9. WHEN form has events.onSubmit THEN the specified workflow is executed
10. WHEN form has events.onFieldChange THEN field-specific workflows are triggered

### Requirement 14: Report Definition Structure

**User Story:** As a developer, I want to define reports using a JSON schema, so that I can create data presentations.

#### Acceptance Criteria

1. WHEN a ReportDefinition is created THEN it includes name, displayName, and dataSource
2. WHEN dataSource is defined THEN it specifies tableId, filters, orderBy, and groupBy
3. WHEN bands array is defined THEN report sections are configured
4. WHEN band.type is "title" THEN it appears once at report start
5. WHEN band.type is "page_header" THEN it appears at top of each page
6. WHEN band.type is "detail" THEN it repeats for each data record
7. WHEN band.type is "group_header" THEN it appears at start of each group
8. WHEN band.type is "group_footer" THEN it appears at end of each group with aggregations
9. WHEN band.type is "summary" THEN it appears once at report end with totals
10. WHEN band.elements array is defined THEN report elements are positioned
11. WHEN element.type is "field" THEN data field value is rendered
12. WHEN element.type is "expression" THEN calculated value is rendered
13. WHEN parameters array is defined THEN user can input filter criteria

### Requirement 15: Report Generation and Output

**User Story:** As a user, I want to generate reports in various formats, so that I can view and share data.

#### Acceptance Criteria

1. WHEN `report-generate` node executes THEN report is rendered with data
2. WHEN format is "html" THEN HTML document is generated
3. WHEN format is "pdf" THEN PDF document is generated using Puppeteer/Playwright
4. WHEN format is "excel" THEN XLSX file is generated using exceljs
5. WHEN format is "csv" THEN CSV file is generated with proper escaping
6. WHEN report has parameters THEN user values are applied as filters
7. WHEN report has groupBy THEN data is grouped and group bands are rendered
8. WHEN report has aggregations THEN calculated values appear in footers
9. WHEN report generation succeeds THEN `$.reportPath` contains output file path
10. WHEN report generation succeeds THEN `$.recordCount` contains number of records
11. WHEN report generation fails THEN error edge with details is triggered
12. WHEN output file is ready THEN it can be downloaded or emailed

### Requirement 16: Application Container

**User Story:** As a developer, I want to package tables, forms, reports, and workflows into an application, so that I can manage them as a unit.

#### Acceptance Criteria

1. WHEN an ApplicationDefinition is created THEN it includes name, displayName, and version
2. WHEN components are defined THEN arrays of table, form, report, and workflow IDs are specified
3. WHEN entryPoints are defined THEN mainMenu, defaultForm, or dashboard is specified
4. WHEN settings are defined THEN multiTenant, locale, and formatting options are set
5. WHEN aiContext is defined THEN description, businessRules, and terminology are stored
6. WHEN an application is published THEN publishedVersion is set
7. WHEN an application is exported THEN all components are packaged as JSON
8. WHEN an application is imported THEN all components are created in target environment
9. WHEN menu items are defined THEN navigation structure is established
10. WHEN dashboard widgets are defined THEN application home page is configured

### Requirement 17: AskAI Service Integration (OpenRouter)

**User Story:** As a developer, I want the system to use the existing AskAI shared service, so that AI features leverage the multi-provider OpenRouter integration with 300+ models.

#### Acceptance Criteria

1. WHEN AIGenerationService is initialized THEN it uses `getAskAIService()` from `@workscript/api/shared-services/ask-ai`
2. WHEN making an AI request THEN `askAI.complete()` is called with model, messages, and pluginId
3. WHEN structured output is needed THEN system prompts guide JSON generation with validation
4. WHEN streaming is requested THEN the service supports SSE through OpenRouter
5. WHEN conversation context is provided THEN messages array includes conversation history
6. WHEN temperature is specified THEN it is passed to the CompletionRequest
7. WHEN API call succeeds THEN CompletionResult contains content, usage, and cost
8. WHEN API call fails THEN AIServiceError is thrown with appropriate error code
9. WHEN rate limit is hit THEN OpenRouter handles retries automatically
10. WHEN token usage is tracked THEN UsageTracker records promptTokens, completionTokens, and cost
11. WHEN listing available models THEN `askAI.listModels()` returns AIModel[] with pricing
12. WHEN selecting a model THEN provider-agnostic model IDs (e.g., 'anthropic/claude-3.5-sonnet') are used

### Requirement 18: AI Rate Limiting and Cost Control

**User Story:** As an administrator, I want to control AI usage and costs, so that the platform remains sustainable.

#### Acceptance Criteria

1. WHEN a user makes an AI request THEN usage is tracked per application
2. WHEN checking quota THEN remaining requests and tokens are calculated
3. WHEN free tier limit is reached THEN requests are blocked with upgrade message
4. WHEN pro tier limit is reached THEN requests are blocked until reset
5. WHEN usage report is requested THEN daily/weekly/monthly breakdown is provided
6. WHEN token cap is configured THEN requests exceeding cap are rejected
7. WHEN usage approaches limit THEN warning notification is sent
8. WHEN day resets THEN daily counters are cleared
9. WHEN an application has custom limits THEN those override tier defaults
10. WHEN usage is logged THEN it includes timestamp, user, tokens, and cost estimate

### Requirement 19: FlexDB API Endpoints

**User Story:** As a frontend developer, I want REST API endpoints for FlexDB operations, so that I can integrate with the UI.

#### Acceptance Criteria

1. WHEN POST /api/flexdb/tables is called THEN a new table is created
2. WHEN GET /api/flexdb/tables is called THEN all tables for the application are returned
3. WHEN GET /api/flexdb/tables/:id is called THEN specific table schema is returned
4. WHEN PUT /api/flexdb/tables/:id is called THEN table schema is updated
5. WHEN DELETE /api/flexdb/tables/:id is called THEN table is soft-deleted
6. WHEN POST /api/flexdb/tables/:tableId/records is called THEN a record is inserted
7. WHEN GET /api/flexdb/tables/:tableId/records is called THEN records are queried with filters
8. WHEN GET /api/flexdb/tables/:tableId/records/:id is called THEN specific record is returned
9. WHEN PUT /api/flexdb/tables/:tableId/records/:id is called THEN record is updated
10. WHEN DELETE /api/flexdb/tables/:tableId/records/:id is called THEN record is deleted
11. WHEN POST /api/flexdb/query is called THEN complex query with joins is executed
12. WHEN request lacks authorization THEN 401 response is returned

### Requirement 20: AI Generation API Endpoints

**User Story:** As a frontend developer, I want REST API endpoints for AI generation, so that I can build the chat interface.

#### Acceptance Criteria

1. WHEN POST /api/ai/generate/schema is called THEN schema is generated from description
2. WHEN POST /api/ai/generate/form is called THEN form is generated from table or description
3. WHEN POST /api/ai/generate/report is called THEN report is generated from requirements
4. WHEN POST /api/ai/conversation/:id/message is called THEN conversation continues
5. WHEN POST /api/ai/conversation/:id/accept is called THEN component is saved
6. WHEN POST /api/ai/conversation/:id/reject is called THEN conversation is marked rejected
7. WHEN GET /api/ai/conversation/:id is called THEN conversation history is returned
8. WHEN POST /api/ai/generate/stream is called THEN SSE stream is returned
9. WHEN request exceeds rate limit THEN 429 response is returned
10. WHEN generation fails THEN 500 response with error details is returned

---

## Non-Functional Requirements

### Performance

1. FlexDB queries on indexed columns should complete within 100ms for up to 10,000 records
2. Full-text search should return results within 500ms for up to 100,000 records
3. AI schema generation should complete within 10 seconds
4. Form rendering should complete within 200ms
5. Report generation for 1,000 records should complete within 5 seconds
6. API endpoints should handle 100 concurrent requests

### Security

1. All API endpoints must require authentication
2. FlexDB operations must respect tenant isolation
3. AI prompts must be sanitized to prevent injection
4. Generated schemas must be validated before storage
5. Sensitive data must not be logged
6. API keys must be encrypted at rest
7. Rate limiting must prevent abuse

### Accessibility

1. All form components must support keyboard navigation
2. Error messages must be announced to screen readers
3. Color contrast must meet WCAG 2.1 AA standards
4. Form labels must be properly associated with inputs
5. Loading states must be communicated to assistive technology

### Browser Support / Compatibility

1. Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
2. Mobile browsers on iOS 14+ and Android 10+
3. Progressive degradation for older browsers
4. Server-side rendering not required

### Code Quality

1. TypeScript strict mode must be enabled
2. All code must pass ESLint with project configuration
3. Test coverage must exceed 80% for business logic
4. All public APIs must be documented with JSDoc
5. Node implementations must follow the WorkflowNode pattern

---

## Out of Scope

1. Real-time collaborative editing of schemas/forms/reports
2. Offline mode and local storage sync
3. Mobile native applications (web-only)
4. Import from existing FoxPro .DBF files
5. Visual workflow builder (workflows are JSON-defined)
6. Multi-language internationalization (Romanian primary)
7. Built-in backup and disaster recovery
8. White-labeling and custom branding per tenant
9. GraphQL API (REST only)
10. Third-party OAuth integration for user login

---

## Success Metrics

1. ✅ FlexDB table can be created and queried through workflows
2. ✅ AI generates valid schema from natural language description
3. ✅ Forms render dynamically and submit data to FlexDB
4. ✅ Reports generate in HTML and PDF formats
5. ✅ Conversation refinement improves AI output iteratively
6. ✅ All API endpoints are functional and documented
7. ✅ Performance requirements are met under load
8. ✅ Test coverage exceeds 80%

---
# Implementation Plan: FoxPro 2.6 AI - RAD Platform

This document provides a concrete, actionable implementation plan for the FoxPro 2.6 AI RAD Platform. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: FLEXDB DATABASE FOUNDATION

### 1.1 Database Schema Setup

- [ ] **Task 1.1.1: Create FlexDB Drizzle schema file**
  - Create `/apps/api/src/db/schema/flexdb.schema.ts`
  - Define `flex_tables` table with columns: id, application_id, name, display_name, columns (JSON), indexes (JSON), relationships (JSON), version, is_active, created_at, updated_at, created_by
  - Add composite index on (application_id, name)
  - _Requirements: 1, 2_

- [ ] **Task 1.1.2: Define flex_records table schema**
  - Add `flex_records` table to flexdb.schema.ts
  - Include: id, table_id, data (JSON), idx_str_1/2/3, idx_num_1/2, idx_date_1/2, search_text (TEXT), version, created_at, updated_at, created_by, updated_by, deleted_at
  - Add indexes on table_id, idx_str_1-3, idx_num_1-2, idx_date_1-2
  - Add FULLTEXT index on search_text
  - _Requirements: 3, 4_

- [ ] **Task 1.1.3: Define flex_table_versions table schema**
  - Add `flex_table_versions` table for schema versioning
  - Include: id, table_id, version, previous_schema (JSON), new_schema (JSON), changes (JSON), migrated_by, migrated_at
  - Add composite index on (table_id, version)
  - _Requirements: 6_

- [ ] **Task 1.1.4: Export schemas in index file**
  - Update `/apps/api/src/db/schema/index.ts` to export flexdb schemas
  - Ensure schemas are imported in db connection setup
  - _Requirements: 1_

- [ ] **Task 1.1.5: Run database migration**
  - Execute `bun run db:push` from apps/api directory
  - Verify tables are created in MySQL database
  - Test with Drizzle Studio: `bun run db:studio`
  - _Requirements: 1_

### 1.2 TypeScript Type Definitions

- [ ] **Task 1.2.1: Create FlexDB types file**
  - Create `/packages/engine/src/types/flexdb.types.ts`
  - Define `FlexTable` interface with all properties
  - Define `FlexColumnDefinition` interface with dataType union
  - Define `FlexDataType` type literal union
  - _Requirements: 1, 2_

- [ ] **Task 1.2.2: Define FlexColumnDefinition validation types**
  - Add `validation` property interface: min, max, minLength, maxLength, pattern, enumValues
  - Add `displayHints` property interface: width, format, inputType, placeholder, helpText, hidden
  - Add `computed` property interface: expression, dependencies
  - _Requirements: 2_

- [ ] **Task 1.2.3: Define FlexIndexDefinition interface**
  - Create interface: name, columns (string[]), unique, type
  - Define type as 'btree' | 'hash' | 'fulltext'
  - _Requirements: 1_

- [ ] **Task 1.2.4: Define FlexRelationship interface**
  - Create interface: name, type, targetTable, sourceColumn, targetColumn
  - Add many-to-many support: junctionTable, junctionSourceColumn, junctionTargetColumn
  - Add cascade behavior: onDelete, onUpdate
  - _Requirements: 5_

- [ ] **Task 1.2.5: Define FlexRecord interface**
  - Create interface: id, tableId, data (Record<string, any>), version
  - Add metadata: createdAt, updatedAt, createdBy, updatedBy, deletedAt
  - _Requirements: 3_

- [ ] **Task 1.2.6: Define FlexQuery interface**
  - Create interface: select, filter, orderBy, limit, offset, cursor, include
  - Define nested types for each property
  - _Requirements: 4_

- [ ] **Task 1.2.7: Define FlexFilter interface**
  - Create interface with AND, OR, NOT conjunctions
  - Define field condition types: eq, ne, gt, gte, lt, lte, in, notIn, contains, startsWith, endsWith, isNull, between, search
  - _Requirements: 4_

- [ ] **Task 1.2.8: Export types from engine package**
  - Update `/packages/engine/src/types/index.ts` to export flexdb types
  - Update `/packages/engine/src/index.ts` if needed
  - _Requirements: 1, 2, 3, 4, 5_

### 1.3 RAD Plugin Structure

- [ ] **Task 1.3.1: Create RAD plugin directory structure**
  - Create `/apps/api/src/plugins/rad/`
  - Create subdirectories: routes/, repositories/, services/
  - Create plugin.ts entry file
  - _Requirements: 19_

- [ ] **Task 1.3.2: Create FlexTableRepository**
  - Create `/apps/api/src/plugins/rad/repositories/FlexTableRepository.ts`
  - Implement: create, findById, findByName, findAll, update, delete methods
  - Use Drizzle ORM for database operations
  - _Requirements: 1, 6_

- [ ] **Task 1.3.3: Create FlexRecordRepository**
  - Create `/apps/api/src/plugins/rad/repositories/FlexRecordRepository.ts`
  - Implement: insert, findById, findMany, update, delete, count methods
  - Handle indexed column extraction
  - Build search_text from data
  - _Requirements: 3, 4_

- [ ] **Task 1.3.4: Create FlexTableVersionRepository**
  - Create `/apps/api/src/plugins/rad/repositories/FlexTableVersionRepository.ts`
  - Implement: create, findByTableId, findLatest methods
  - _Requirements: 6_

### 1.4 FlexDB Service Layer

- [ ] **Task 1.4.1: Create FlexDBService class**
  - Create `/apps/api/src/plugins/rad/services/FlexDBService.ts`
  - Inject repositories in constructor
  - _Requirements: 1, 3_

- [ ] **Task 1.4.2: Implement createTable method**
  - Validate table name uniqueness within application
  - Validate column definitions
  - Assign index slots to indexed columns
  - Store table schema
  - Create initial version entry
  - Return created table with ID
  - _Requirements: 1, 2_

- [ ] **Task 1.4.3: Implement alterTable method**
  - Compare new schema with existing
  - Generate changes array
  - Update table schema
  - Create version entry
  - Return updated table
  - _Requirements: 6_

- [ ] **Task 1.4.4: Implement getTableSchema method**
  - Fetch table by ID
  - Return full schema including columns, indexes, relationships
  - _Requirements: 1_

- [ ] **Task 1.4.5: Implement listTables method**
  - Fetch all tables for application
  - Support pagination and filtering
  - _Requirements: 19_

- [ ] **Task 1.4.6: Implement insertRecord method**
  - Validate data against table schema
  - Check required fields
  - Validate data types and constraints
  - Extract indexed values
  - Build search_text
  - Calculate computed fields
  - Insert record
  - Return created record with ID
  - _Requirements: 3_

- [ ] **Task 1.4.7: Implement findRecord method**
  - Fetch record by ID
  - Join with table schema for context
  - Return record or null
  - _Requirements: 3_

- [ ] **Task 1.4.8: Implement findRecords method**
  - Parse FlexQuery filter
  - Build SQL WHERE clause for indexed columns
  - Build JSON_EXTRACT for non-indexed columns
  - Apply sorting and pagination
  - Return paginated result with count
  - _Requirements: 4_

- [ ] **Task 1.4.9: Implement updateRecord method**
  - Validate data against schema
  - Check version for optimistic locking
  - Update indexed values and search_text
  - Increment version
  - Return updated record
  - _Requirements: 3_

- [ ] **Task 1.4.10: Implement deleteRecord method**
  - Support soft delete (default) and hard delete
  - Set deleted_at for soft delete
  - Remove record for hard delete
  - _Requirements: 3_

- [ ] **Task 1.4.11: Implement countRecords method**
  - Apply filter conditions
  - Return count only
  - _Requirements: 3_

- [ ] **Task 1.4.12: Implement validateData helper**
  - Check required fields
  - Validate data types
  - Validate min/max bounds
  - Validate string lengths
  - Validate patterns
  - Validate enum values
  - Return validation result with errors
  - _Requirements: 2_

- [ ] **Task 1.4.13: Implement extractIndexedValues helper**
  - Map indexed columns to idx_str_1/2/3, idx_num_1/2, idx_date_1/2
  - Handle type conversion
  - Return indexed values object
  - _Requirements: 3_

- [ ] **Task 1.4.14: Implement buildSearchText helper**
  - Concatenate all string and text fields
  - Include fullTextSearch marked columns
  - Return concatenated string
  - _Requirements: 3_

- [ ] **Task 1.4.15: Implement handleComputedFields helper**
  - Parse computed.expression
  - Resolve field references
  - Calculate values
  - Return data with computed fields
  - _Requirements: 2_

### 1.5 FlexDB Query Builder

- [ ] **Task 1.5.1: Create FlexQueryBuilder class**
  - Create `/apps/api/src/plugins/rad/services/FlexQueryBuilder.ts`
  - Accept table schema and FlexQuery
  - _Requirements: 4_

- [ ] **Task 1.5.2: Implement filter parsing**
  - Handle AND/OR/NOT conjunctions
  - Handle equality and comparison operators
  - Handle string operators (contains, startsWith, endsWith)
  - Handle null checks
  - Handle between ranges
  - Handle full-text search
  - _Requirements: 4_

- [ ] **Task 1.5.3: Implement indexed column detection**
  - Determine if field is indexed
  - Generate SQL using indexed column (idx_str_1, etc.)
  - Generate JSON_EXTRACT for non-indexed fields
  - _Requirements: 4_

- [ ] **Task 1.5.4: Implement sorting builder**
  - Parse orderBy array
  - Handle indexed and non-indexed columns
  - Support multiple sort fields
  - _Requirements: 4_

- [ ] **Task 1.5.5: Implement pagination builder**
  - Handle limit and offset
  - Support cursor-based pagination
  - _Requirements: 4_

- [ ] **Task 1.5.6: Implement relation inclusion**
  - Parse include array
  - Generate subqueries for related records
  - Apply filters to related queries
  - Nest results in response
  - _Requirements: 5_

---

## PHASE 2: FLEXDB WORKFLOW NODES

### 2.1 FlexTableNode Implementation

- [ ] **Task 2.1.1: Create FlexTableNode class**
  - Create `/packages/nodes/src/flexdb/FlexTableNode.ts`
  - Extend WorkflowNode base class
  - _Requirements: 1_

- [ ] **Task 2.1.2: Define node metadata**
  - Set id: 'flex-table'
  - Set name, version, description
  - Define inputs: operation, name, columns, indexes, relationships
  - Define outputs: tableId, schema
  - Add ai_hints for AI understanding
  - _Requirements: 1_

- [ ] **Task 2.1.3: Implement execute method**
  - Parse operation from config
  - Route to appropriate handler: create, alter, drop, describe
  - _Requirements: 1_

- [ ] **Task 2.1.4: Implement create operation**
  - Extract config values using context.resolveValue
  - Call FlexDBService.createTable
  - Store result in context.state.flexTableId
  - Return success edge with tableId
  - Handle existing table with exists edge
  - Handle errors with error edge
  - _Requirements: 1_

- [ ] **Task 2.1.5: Implement alter operation**
  - Extract changes from config
  - Call FlexDBService.alterTable
  - Return success or error edge
  - _Requirements: 6_

- [ ] **Task 2.1.6: Implement drop operation**
  - Extract tableId from config
  - Call FlexDBService.dropTable
  - Return success or error edge
  - _Requirements: 1_

- [ ] **Task 2.1.7: Implement describe operation**
  - Extract tableId from config
  - Call FlexDBService.getTableSchema
  - Store schema in context.state
  - Return success edge with schema
  - _Requirements: 1_

### 2.2 FlexRecordNode Implementation

- [ ] **Task 2.2.1: Create FlexRecordNode class**
  - Create `/packages/nodes/src/flexdb/FlexRecordNode.ts`
  - Extend WorkflowNode base class
  - _Requirements: 3_

- [ ] **Task 2.2.2: Define node metadata**
  - Set id: 'flex-record'
  - Define inputs: operation, table, tableId, data, recordId, filter, query
  - Define outputs: record, records, count
  - Add ai_hints
  - _Requirements: 3_

- [ ] **Task 2.2.3: Implement execute method routing**
  - Parse operation from config
  - Route to: insert, find, findMany, update, delete, count
  - _Requirements: 3_

- [ ] **Task 2.2.4: Implement insert operation**
  - Resolve table ID (by ID or name)
  - Extract data from config
  - Call FlexDBService.insertRecord
  - Store record in context.state.flexRecord
  - Return success edge
  - _Requirements: 3_

- [ ] **Task 2.2.5: Implement find operation**
  - Resolve table ID and record ID
  - Call FlexDBService.findRecord
  - Return found edge with record or not_found edge
  - _Requirements: 3_

- [ ] **Task 2.2.6: Implement findMany operation**
  - Resolve table ID
  - Parse query config into FlexQuery
  - Call FlexDBService.findRecords
  - Store results in context.state.flexRecords
  - Store count in context.state.flexCount
  - Return found edge or empty edge
  - _Requirements: 3, 4_

- [ ] **Task 2.2.7: Implement update operation**
  - Resolve table ID and record ID
  - Extract update data
  - Call FlexDBService.updateRecord
  - Handle optimistic locking conflict
  - Return success, not_found, or conflict edge
  - _Requirements: 3_

- [ ] **Task 2.2.8: Implement delete operation**
  - Resolve table ID and record ID
  - Check for hard delete flag
  - Call FlexDBService.deleteRecord
  - Return success or not_found edge
  - _Requirements: 3_

- [ ] **Task 2.2.9: Implement count operation**
  - Resolve table ID
  - Parse filter from config
  - Call FlexDBService.countRecords
  - Store count in context.state.flexCount
  - Return success edge
  - _Requirements: 3_

### 2.3 FlexQueryNode Implementation

- [ ] **Task 2.3.1: Create FlexQueryNode class**
  - Create `/packages/nodes/src/flexdb/FlexQueryNode.ts`
  - For advanced queries with joins
  - _Requirements: 4, 5_

- [ ] **Task 2.3.2: Define node metadata**
  - Set id: 'flex-query'
  - Define inputs: query (FlexQuery object), parameters
  - Define outputs: results, columns
  - _Requirements: 4_

- [ ] **Task 2.3.3: Implement complex query execution**
  - Parse query with multiple tables
  - Handle joins through relationships
  - Execute and return results
  - _Requirements: 5_

### 2.4 Node Registration

- [ ] **Task 2.4.1: Create flexdb nodes index file**
  - Create `/packages/nodes/src/flexdb/index.ts`
  - Export FlexTableNode, FlexRecordNode, FlexQueryNode
  - _Requirements: 1_

- [ ] **Task 2.4.2: Register nodes in main index**
  - Update `/packages/nodes/src/index.ts`
  - Import and add to ALL_NODES array
  - _Requirements: 1_

- [ ] **Task 2.4.3: Rebuild nodes package**
  - Run `bun run build:nodes`
  - Verify no build errors
  - _Requirements: 1_

---

## PHASE 3: FLEXDB API ENDPOINTS

### 3.1 FlexDB Routes Setup

- [ ] **Task 3.1.1: Create FlexDB routes file**
  - Create `/apps/api/src/plugins/rad/routes/flexdb.ts`
  - Import Hono and set basePath
  - _Requirements: 19_

- [ ] **Task 3.1.2: Implement POST /tables endpoint**
  - Parse request body
  - Validate required fields
  - Call FlexDBService.createTable
  - Return created table with 201 status
  - _Requirements: 19_

- [ ] **Task 3.1.3: Implement GET /tables endpoint**
  - Get applicationId from context
  - Call FlexDBService.listTables
  - Return tables array
  - _Requirements: 19_

- [ ] **Task 3.1.4: Implement GET /tables/:id endpoint**
  - Extract table ID from params
  - Call FlexDBService.getTableSchema
  - Return 404 if not found
  - Return table schema
  - _Requirements: 19_

- [ ] **Task 3.1.5: Implement PUT /tables/:id endpoint**
  - Parse update body
  - Call FlexDBService.alterTable
  - Return updated table
  - _Requirements: 19_

- [ ] **Task 3.1.6: Implement DELETE /tables/:id endpoint**
  - Extract table ID
  - Call FlexDBService.dropTable
  - Return 204 No Content
  - _Requirements: 19_

- [ ] **Task 3.1.7: Implement POST /tables/:tableId/records endpoint**
  - Extract table ID and data
  - Call FlexDBService.insertRecord
  - Return created record with 201
  - _Requirements: 19_

- [ ] **Task 3.1.8: Implement GET /tables/:tableId/records endpoint**
  - Parse query parameters (filter, sort, page, limit)
  - Build FlexQuery object
  - Call FlexDBService.findRecords
  - Return paginated response
  - _Requirements: 19_

- [ ] **Task 3.1.9: Implement GET /tables/:tableId/records/:id endpoint**
  - Extract table ID and record ID
  - Call FlexDBService.findRecord
  - Return 404 if not found
  - Return record
  - _Requirements: 19_

- [ ] **Task 3.1.10: Implement PUT /tables/:tableId/records/:id endpoint**
  - Parse update data
  - Call FlexDBService.updateRecord
  - Handle conflict response (409)
  - Return updated record
  - _Requirements: 19_

- [ ] **Task 3.1.11: Implement DELETE /tables/:tableId/records/:id endpoint**
  - Check for hard delete query param
  - Call FlexDBService.deleteRecord
  - Return 204 No Content
  - _Requirements: 19_

- [ ] **Task 3.1.12: Implement POST /query endpoint**
  - Parse complex query body
  - Execute query
  - Return results
  - _Requirements: 19_

### 3.2 Plugin Integration

- [ ] **Task 3.2.1: Create RAD plugin entry**
  - Update `/apps/api/src/plugins/rad/plugin.ts`
  - Import routes
  - Export createPlugin function
  - _Requirements: 19_

- [ ] **Task 3.2.2: Register plugin in API server**
  - Update `/apps/api/src/plugins/index.ts`
  - Import and register RAD plugin
  - _Requirements: 19_

- [ ] **Task 3.2.3: Add authentication middleware**
  - Ensure FlexDB routes require authentication
  - Extract tenant/application from context
  - _Requirements: 19_

