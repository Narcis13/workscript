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
| **AI** | Claude SDK (@anthropic-ai/sdk) | Generare inteligentă |
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
Integrare Claude SDK pentru generare conversațională.

**Capabilități:**
- Generare scheme din descrieri text
- Generare formulare din scheme existente
- Generare rapoarte din cerințe
- Conversații cu refinement iterativ

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
- Claude SDK client
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
- API key Anthropic (Claude)

### Setup

```bash
# Clone și install
cd workscript
bun install

# Configurare environment
cp apps/api/.env.example apps/api/.env
# Editează .env cu:
# - DATABASE_URL
# - ANTHROPIC_API_KEY

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
│   │   ├── shared-services/ai/
│   │   │   └── ClaudeClient.ts   # Claude SDK wrapper
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
- [ ] Claude generează scheme valide din descrieri
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
