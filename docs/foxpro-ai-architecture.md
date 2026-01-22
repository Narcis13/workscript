# Plan: FoxPro 2.6 AI - RAD Platform pe Workscript

## Viziune

Recreerea paradigmei FoxPro 2.6 (RAD - Rapid Application Development) pe infrastructura Workscript, cu AI ca "development partner":

| Component FoxPro | Echivalent Workscript | Status |
|------------------|----------------------|--------|
| PRG files | Workflows JSON | ✅ Există |
| SCX (Forms) | FormDefinition JSON + Visual Designer | ❌ De construit |
| FRX (Reports) | ReportDefinition JSON + Generator | ❌ De construit |
| DBF (Tables) | FlexDB (EAV pattern) | ❌ De construit |
| PJX (Project) | ApplicationDefinition | ❌ De construit |

**Diferențiatorul AI**: Utilizatorul descrie ce vrea, AI generează schemas/forms/reports/workflows.

---

## Arhitectură Propusă

### 1. FlexDB - Database Flexibil (Arhitectură Detaliată)

#### Problema pe care o rezolvă

În FoxPro puteai face `CREATE TABLE customers (name C(50), age N(3))` la runtime. În MySQL/Drizzle tradițional trebuie:
1. Să scrii schema în cod
2. Să rulezi migrări
3. Să recompilezi aplicația

**FlexDB** permite crearea de tabele la runtime, fără migrări, fără rebuild.

#### Structura Bazei de Date (3 tabele)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         flex_tables                                  │
│ (Schema definitions - echivalent .DBF structure)                    │
├─────────────────────────────────────────────────────────────────────┤
│ id            │ cuid    │ Primary key                               │
│ application_id│ cuid    │ FK → applications (multi-app support)     │
│ name          │ varchar │ "customers", "products" (unic per app)    │
│ display_name  │ varchar │ "Clienți", "Produse"                      │
│ columns       │ JSON    │ Array de FlexColumnDefinition (vezi mai jos)│
│ indexes       │ JSON    │ Array de FlexIndexDefinition              │
│ relationships │ JSON    │ Array de FlexRelationship                 │
│ version       │ int     │ Schema version (pentru migrări)           │
│ created_at    │ datetime│                                           │
│ updated_at    │ datetime│                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         flex_records                                 │
│ (Data storage - echivalent .DBF records)                            │
├─────────────────────────────────────────────────────────────────────┤
│ id            │ cuid    │ Primary key                               │
│ table_id      │ cuid    │ FK → flex_tables                          │
│ data          │ JSON    │ {"name": "Ion", "email": "ion@x.ro", ...} │
│               │         │                                           │
│ # Indexed columns pentru query performance:                         │
│ idx_str_1     │ varchar │ Prima coloană string marcată ca indexată  │
│ idx_str_2     │ varchar │ A doua coloană string indexată            │
│ idx_str_3     │ varchar │ A treia coloană string indexată           │
│ idx_num_1     │ decimal │ Prima coloană numerică indexată           │
│ idx_num_2     │ decimal │ A doua coloană numerică indexată          │
│ idx_date_1    │ datetime│ Prima coloană dată indexată               │
│ idx_date_2    │ datetime│ A doua coloană dată indexată              │
│ search_text   │ TEXT    │ Full-text search (concatenare câmpuri)    │
│               │         │                                           │
│ version       │ int     │ Optimistic locking                        │
│ created_at    │ datetime│                                           │
│ updated_at    │ datetime│                                           │
│ deleted_at    │ datetime│ Soft delete                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     flex_table_versions                              │
│ (Schema history - pentru rollback/audit)                            │
├─────────────────────────────────────────────────────────────────────┤
│ id            │ cuid    │ Primary key                               │
│ table_id      │ cuid    │ FK → flex_tables                          │
│ version       │ int     │ Version number                            │
│ previous_schema│ JSON   │ Schema înainte de modificare              │
│ new_schema    │ JSON    │ Schema după modificare                    │
│ changes       │ JSON    │ Lista de modificări (add/remove/alter)    │
│ migrated_at   │ datetime│                                           │
└─────────────────────────────────────────────────────────────────────┘
```

#### FlexColumnDefinition (JSON în `columns`)

```typescript
interface FlexColumnDefinition {
  name: string;              // "first_name" (snake_case, unic)
  displayName: string;       // "Prenume"

  dataType:
    | 'string'              // VARCHAR - text scurt
    | 'text'                // TEXT - memo field (lung)
    | 'integer'             // INT
    | 'decimal'             // DECIMAL(18,4)
    | 'boolean'             // TINYINT(1)
    | 'date'                // DATE
    | 'datetime'            // DATETIME
    | 'json'                // JSON nested object
    | 'reference';          // Foreign key to another FlexTable

  // Constraints
  required: boolean;         // NOT NULL equivalent
  unique: boolean;           // UNIQUE constraint
  defaultValue?: any;        // DEFAULT value

  // Validation rules
  validation?: {
    min?: number;            // Pentru numere: valoare minimă
    max?: number;            // Pentru numere: valoare maximă
    minLength?: number;      // Pentru string: lungime minimă
    maxLength?: number;      // Pentru string: lungime maximă (default 255)
    pattern?: string;        // Regex: "^[A-Z]{2}[0-9]{6}$" pentru CNP
    enumValues?: string[];   // Lista valori permise: ["activ", "inactiv"]
  };

  // Index configuration
  indexed?: boolean;         // Va fi extras în idx_str_1, idx_num_1 etc.
  indexSlot?: 1 | 2 | 3;     // Care slot de index folosește
  fullTextSearch?: boolean;  // Include în search_text

  // Pentru 'reference' type
  referenceTable?: string;   // Numele tabelului referențiat
  referenceDisplay?: string; // Câmpul de afișat: "name"
  onDelete?: 'cascade' | 'set-null' | 'restrict';

  // Computed field (calculat automat)
  computed?: {
    expression: string;      // "$.quantity * $.unit_price"
    dependencies: string[];  // ["quantity", "unit_price"]
  };

  // Display hints (pentru generare automată forms)
  displayHints?: {
    width?: number;          // Lățime în form
    format?: string;         // "currency", "percent", "DD/MM/YYYY"
    inputType?: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date';
    placeholder?: string;
    helpText?: string;
    hidden?: boolean;        // Nu apare în form (ex: audit fields)
  };
}
```

#### Cum funcționează Indexed Columns

**Problema**: JSON queries sunt lente pentru căutări frecvente.

**Soluția**: Extragem câmpurile indexate în coloane native MySQL.

```
Exemplu: Tabel "customers" cu columns:
[
  { name: "email", dataType: "string", indexed: true, indexSlot: 1 },
  { name: "name", dataType: "string", indexed: true, indexSlot: 2 },
  { name: "created_date", dataType: "date", indexed: true, indexSlot: 1 },
  { name: "phone", dataType: "string", indexed: false },  // NU indexat
  { name: "notes", dataType: "text", indexed: false }     // NU indexat
]

Record salvat în flex_records:
{
  id: "clx123...",
  table_id: "customers_table_id",
  data: {
    "email": "ion@example.com",
    "name": "Ion Popescu",
    "created_date": "2024-01-15",
    "phone": "0721123456",
    "notes": "Client fidel"
  },
  idx_str_1: "ion@example.com",      // ← extras automat din data.email
  idx_str_2: "Ion Popescu",          // ← extras automat din data.name
  idx_date_1: "2024-01-15 00:00:00", // ← extras automat din data.created_date
  search_text: "ion@example.com Ion Popescu 0721123456 Client fidel"
}
```

**Query optimization:**

```sql
-- Căutare după email (RAPID - folosește index pe idx_str_1)
SELECT * FROM flex_records
WHERE table_id = 'customers_id'
AND idx_str_1 = 'ion@example.com';

-- Căutare după phone (LENT - JSON extract, dar acceptabil pentru rare queries)
SELECT * FROM flex_records
WHERE table_id = 'customers_id'
AND JSON_EXTRACT(data, '$.phone') = '0721123456';

-- Full-text search (RAPID - MySQL FULLTEXT index)
SELECT * FROM flex_records
WHERE table_id = 'customers_id'
AND MATCH(search_text) AGAINST('ion popescu' IN NATURAL LANGUAGE MODE);
```

#### FlexDB Service Layer

```typescript
// FlexDBService - Business logic
class FlexDBService {

  // Schema operations
  async createTable(appId: string, definition: CreateFlexTableInput): Promise<FlexTable>
  async alterTable(tableId: string, changes: AlterTableInput): Promise<FlexTable>
  async dropTable(tableId: string): Promise<void>
  async getTableSchema(tableId: string): Promise<FlexTable>
  async listTables(appId: string): Promise<FlexTable[]>

  // Record operations
  async insertRecord(tableId: string, data: Record<string, any>): Promise<FlexRecord>
  async findRecord(tableId: string, recordId: string): Promise<FlexRecord | null>
  async findRecords(tableId: string, query: FlexQuery): Promise<PaginatedResult<FlexRecord>>
  async updateRecord(tableId: string, recordId: string, data: Partial<Record<string, any>>): Promise<FlexRecord>
  async deleteRecord(tableId: string, recordId: string, hard?: boolean): Promise<void>
  async countRecords(tableId: string, filter?: FlexFilter): Promise<number>

  // Advanced queries
  async query(sql: FlexQueryBuilder): Promise<QueryResult>
  async aggregate(tableId: string, groupBy: string[], aggregations: Aggregation[]): Promise<AggregateResult>

  // Internal helpers
  private validateData(schema: FlexTable, data: Record<string, any>): ValidationResult
  private extractIndexedValues(schema: FlexTable, data: Record<string, any>): IndexedValues
  private buildSearchText(schema: FlexTable, data: Record<string, any>): string
  private handleComputedFields(schema: FlexTable, data: Record<string, any>): Record<string, any>
}
```

#### FlexQuery - Query Language

```typescript
interface FlexQuery {
  // Selection
  select?: string[];           // Câmpuri de returnat (default: toate)

  // Filtering
  filter?: FlexFilter;

  // Sorting
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;

  // Pagination
  limit?: number;              // Default: 50, Max: 1000
  offset?: number;
  cursor?: string;             // Pentru cursor-based pagination

  // Include related
  include?: Array<{
    relation: string;          // Numele relației
    select?: string[];
    filter?: FlexFilter;
  }>;
}

interface FlexFilter {
  // Conjunctions
  AND?: FlexFilter[];
  OR?: FlexFilter[];
  NOT?: FlexFilter;

  // Field conditions
  [field: string]:
    | any                               // Equality: { email: "x@y.com" }
    | { eq: any }                       // Explicit equality
    | { ne: any }                       // Not equal
    | { gt: number | Date }             // Greater than
    | { gte: number | Date }            // Greater or equal
    | { lt: number | Date }             // Less than
    | { lte: number | Date }            // Less or equal
    | { in: any[] }                     // In list
    | { notIn: any[] }                  // Not in list
    | { contains: string }              // String contains
    | { startsWith: string }            // String starts with
    | { endsWith: string }              // String ends with
    | { isNull: boolean }               // Is NULL / Is NOT NULL
    | { between: [any, any] }           // Between range
    | { search: string };               // Full-text search
}
```

**Exemple de queries în workflow:**

```json
{
  "flex-record": {
    "operation": "findMany",
    "table": "customers",
    "query": {
      "filter": {
        "AND": [
          { "status": "active" },
          { "created_date": { "gte": "2024-01-01" } },
          { "OR": [
            { "email": { "endsWith": "@company.ro" } },
            { "vip": true }
          ]}
        ]
      },
      "orderBy": [
        { "field": "name", "direction": "asc" }
      ],
      "limit": 20,
      "include": [
        { "relation": "orders", "select": ["id", "total"], "filter": { "status": "completed" } }
      ]
    },
    "found?": { "log": { "message": "Găsiți {{$.flexCount}} clienți" } },
    "empty?": { "log": { "message": "Niciun client găsit" } }
  }
}
```

#### Relații între tabele

```typescript
interface FlexRelationship {
  name: string;                // "orders", "author"
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';

  // One-to-one / One-to-many
  targetTable: string;         // Tabelul referențiat
  sourceColumn: string;        // Coloana din acest tabel
  targetColumn: string;        // Coloana din tabelul țintă (usually "id")

  // Many-to-many (necesită junction table)
  junctionTable?: string;      // "customer_products"
  junctionSourceColumn?: string;
  junctionTargetColumn?: string;

  // Cascade behavior
  onDelete: 'cascade' | 'set-null' | 'restrict';
  onUpdate: 'cascade' | 'set-null' | 'restrict';
}
```

**Exemplu relație:**
```
customers (1) ──────< (N) orders
     │
     └── FlexRelationship în "orders" table:
         {
           name: "customer",
           type: "one-to-many",  // Din perspectiva orders: many orders → one customer
           targetTable: "customers",
           sourceColumn: "customer_id",  // În orders
           targetColumn: "id",           // În customers
           onDelete: "restrict"
         }
```

#### Limitări și Trade-offs

| Aspect | FlexDB | MySQL Tradițional |
|--------|--------|-------------------|
| **Performanță queries** | Bună (7 indexed slots) | Excelentă |
| **Schema changes** | Instant (zero downtime) | Necesită migrări |
| **Type safety** | Runtime validation | Compile-time |
| **JOINs** | Limitat (emulat în cod) | Nativ SQL |
| **Transactions** | Suportat | Suportat |
| **Max indexed fields** | 7 per tabel | Nelimitat |
| **Full-text search** | 1 index per tabel | Nelimitat |
| **Complexitate** | Simplă pentru user | Necesită DBA |

#### Când să folosești FlexDB vs MySQL nativ

**FlexDB (dinamice, user-defined):**
- Tabele create de utilizatori
- Scheme care se schimbă frecvent
- Aplicații low-code/no-code
- Prototipare rapidă

**MySQL nativ (fixe, system-defined):**
- Auth (users, sessions)
- Audit logs
- System configuration
- Billing/Payments

### 2. Forms System

```typescript
FormDefinition {
  dataSource: { tableId, recordId }  // Legătură cu FlexDB
  layout: 'vertical' | 'grid' | 'tabs' | 'wizard'
  fields: FormFieldDefinition[]      // Input types + validation
  actions: FormAction[]              // Butoane (save, cancel, workflow)
  events: { onLoad, onSubmit, ... }  // Hooks pentru workflows
}
```

**Componente Frontend:**
- `FormDesigner` - Visual drag-drop builder
- `DynamicFormRenderer` - Runtime form rendering
- `FieldPalette` - Galerie de tipuri de câmpuri

### 3. Reports System

```typescript
ReportDefinition {
  dataSource: { tableId, filters, groupBy }
  bands: ReportBand[]  // title, header, detail, group_footer, summary
  parameters: ReportParameter[]
  pageSetup: { paperSize, orientation, margins }
  outputFormats: ['html', 'pdf', 'excel', 'csv']
}
```

**Componente:**
- `ReportDesigner` - Visual band editor
- `ReportGenerator` - HTML/PDF/Excel output
- `ReportViewer` - Preview și export

### 4. Application Container

```typescript
ApplicationDefinition {
  components: { tables[], forms[], reports[], workflows[] }
  entryPoints: { mainMenu, defaultForm, dashboard }
  settings: { multiTenant, locale, dateFormat }
  aiContext: { description, businessRules, terminology }
}
```

### 5. AI Integration Layer (Arhitectură Detaliată)

#### Filosofia: AI ca Development Partner

În loc de:
```
User → Visual Designer → Drag-drop fields → Configure → Save
```

Facem:
```
User: "Am nevoie de un tabel pentru clienți cu nume, email și telefon"
AI: [Generează schema + explică deciziile]
User: "Adaugă și CNP cu validare"
AI: [Modifică schema + validare regex]
User: "Fă și un formular de adăugare"
AI: [Generează FormDefinition bazat pe schema]
```

#### Arhitectura AI Layer

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Generation Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   User Input (Natural Language)                                     │
│         │                                                           │
│         ▼                                                           │
│   ┌─────────────────┐                                              │
│   │  AIController   │ ← API endpoint: POST /api/ai/generate        │
│   │  (Hono route)   │                                              │
│   └────────┬────────┘                                              │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐                                              │
│   │ AIGeneration    │ ← Business logic + conversation management   │
│   │ Service         │                                              │
│   └────────┬────────┘                                              │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐     ┌─────────────────┐                      │
│   │ ContextBuilder  │────▶│ SchemaRegistry  │ ← Existing schemas   │
│   │                 │     │ FormRegistry    │ ← Existing forms     │
│   │                 │     │ Terminology     │ ← Business terms     │
│   └────────┬────────┘     └─────────────────┘                      │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐                                              │
│   │ ClaudeClient    │ ← @anthropic-ai/sdk                          │
│   │ (Claude SDK)    │                                              │
│   └────────┬────────┘                                              │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐                                              │
│   │ ResponseParser  │ ← Parse AI response → typed object           │
│   │ + Validator     │ ← Validate against schema                    │
│   └────────┬────────┘                                              │
│            │                                                        │
│            ▼                                                        │
│   Generated Component (FlexTable | FormDefinition | ReportDefinition)
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### ClaudeClient - SDK Integration

```typescript
// /apps/api/src/shared-services/ai/ClaudeClient.ts

import Anthropic from '@anthropic-ai/sdk';

interface ClaudeClientConfig {
  apiKey: string;
  model: 'claude-sonnet-4-20250514' | 'claude-opus-4-5-20251101';
  maxTokens: number;
}

class ClaudeClient {
  private client: Anthropic;
  private config: ClaudeClientConfig;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.config = config;
  }

  async generate<T>(
    systemPrompt: string,
    userMessage: string,
    options?: {
      conversationHistory?: Message[];
      responseSchema?: JSONSchema;  // Pentru structured output
      temperature?: number;
    }
  ): Promise<AIResponse<T>> {
    const messages = [
      ...(options?.conversationHistory || []),
      { role: 'user' as const, content: userMessage }
    ];

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages,
      // Tool use pentru structured output
      tools: options?.responseSchema ? [{
        name: 'generate_component',
        description: 'Generate the requested component',
        input_schema: options.responseSchema
      }] : undefined
    });

    return this.parseResponse<T>(response);
  }

  async stream(
    systemPrompt: string,
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const stream = await this.client.messages.stream({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text);
      }
    }
  }
}
```

#### System Prompts pentru fiecare tip de generare

```typescript
// /apps/api/src/plugins/rad/services/prompts/

// Schema Generation Prompt
const SCHEMA_GENERATION_PROMPT = `
Ești un expert în design de baze de date. Generezi scheme FlexDB din descrieri în limbaj natural.

## FlexDB Schema Format
FlexDB folosește JSON pentru a defini tabele dinamice. Formatul este:

\`\`\`typescript
interface FlexTable {
  name: string;              // snake_case, ex: "customers", "order_items"
  displayName: string;       // Human-readable, ex: "Clienți", "Articole Comandă"
  columns: FlexColumnDefinition[];
  indexes?: FlexIndexDefinition[];
  relationships?: FlexRelationship[];
}

interface FlexColumnDefinition {
  name: string;              // snake_case
  displayName: string;       // Human-readable
  dataType: 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'json' | 'reference';
  required: boolean;
  unique: boolean;
  indexed?: boolean;         // Max 3 string, 2 numeric, 2 date per table
  indexSlot?: 1 | 2 | 3;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;        // Regex
    enumValues?: string[];
  };
  referenceTable?: string;   // Pentru dataType: 'reference'
  displayHints?: {
    format?: string;
    inputType?: string;
    placeholder?: string;
  };
}
\`\`\`

## Context Aplicație
{{APPLICATION_CONTEXT}}

## Tabele Existente
{{EXISTING_TABLES}}

## Terminologie Business
{{TERMINOLOGY}}

## Reguli
1. ÎNTOTDEAUNA include câmpuri de audit: created_at, updated_at (datetime, required)
2. Folosește 'reference' pentru foreign keys, nu 'string' cu ID
3. Indexează câmpurile care vor fi căutate frecvent (max 7 total)
4. CNP românesc: pattern "^[1-9]\\d{12}$"
5. Email: pattern "^[^@]+@[^@]+\\.[^@]+$"
6. Telefon RO: pattern "^(\\+40|0)[0-9]{9}$"
7. Alege cele mai potrivite tipuri de date (nu pune totul ca string)
8. Adaugă validări logice (min/max pentru vârstă, enum pentru status)

## Răspuns
Returnează DOAR JSON valid, fără explicații în afara JSON-ului.
Folosește tool-ul generate_component pentru a returna schema.
`;

// Form Generation Prompt
const FORM_GENERATION_PROMPT = `
Ești un expert în UX/UI. Generezi definiții de formulare pentru FlexDB tables.

## FormDefinition Format
\`\`\`typescript
interface FormDefinition {
  name: string;
  displayName: string;
  dataSource: {
    type: 'flex_table';
    tableId: string;
  };
  layout: {
    type: 'vertical' | 'horizontal' | 'grid' | 'tabs' | 'wizard';
    columns?: number;
    sections?: FormSection[];
  };
  fields: FormFieldDefinition[];
  actions: FormAction[];
  validation?: {
    mode: 'onBlur' | 'onChange' | 'onSubmit';
  };
}
\`\`\`

## Schema Tabel
{{TABLE_SCHEMA}}

## Reguli UX
1. Grupează câmpurile logic (date personale, contact, adresă)
2. Pune câmpurile obligatorii primele
3. Folosește inputType potrivit (select pentru enum, date pentru date)
4. Adaugă placeholders și helpText utile
5. Butoane: Save (primary), Cancel (secondary)
6. Pentru formulare lungi, folosește tabs sau wizard

## Răspuns
Returnează FormDefinition complet ca JSON.
`;

// Report Generation Prompt
const REPORT_GENERATION_PROMPT = `
Ești un expert în raportare business. Generezi definiții de rapoarte pentru FlexDB.

## ReportDefinition Format
\`\`\`typescript
interface ReportDefinition {
  name: string;
  displayName: string;
  dataSource: {
    type: 'flex_table';
    tableId: string;
    filters?: FlexFilter[];
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    groupBy?: string[];
  };
  bands: ReportBand[];  // title, page_header, detail, group_footer, summary
  parameters?: ReportParameter[];
  pageSetup: {
    paperSize: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
    margins: { top: number; bottom: number; left: number; right: number };
  };
  outputFormats: Array<'html' | 'pdf' | 'excel' | 'csv'>;
}
\`\`\`

## Schema Tabel
{{TABLE_SCHEMA}}

## Cerință Raport
{{REPORT_REQUIREMENT}}

## Reguli
1. Include întotdeauna un band 'title' cu numele raportului
2. Pentru liste, folosește 'detail' band
3. Pentru grupări, adaugă 'group_header' și 'group_footer' cu subtotaluri
4. 'summary' band pentru totaluri generale
5. Adaugă parametri pentru date range dacă are sens
6. Default: A4, portrait, margins 10mm
`;
```

#### AIGenerationService - Core Logic

```typescript
// /apps/api/src/plugins/rad/services/AIGenerationService.ts

interface GenerateSchemaInput {
  description: string;           // "Am nevoie de un tabel pentru clienți..."
  applicationId: string;
  conversationId?: string;       // Pentru continuare conversație
  feedback?: string;             // "Adaugă și câmpul CNP"
}

interface GenerateSchemaOutput {
  schema: FlexTable;
  explanation: string;           // "Am creat tabelul customers cu..."
  suggestions: string[];         // ["Ai putea adăuga și...", "Recomand să..."]
  conversationId: string;
}

class AIGenerationService {
  constructor(
    private claude: ClaudeClient,
    private flexDbService: FlexDBService,
    private conversationRepo: ConversationRepository
  ) {}

  async generateSchema(input: GenerateSchemaInput): Promise<GenerateSchemaOutput> {
    // 1. Load or create conversation
    const conversation = input.conversationId
      ? await this.conversationRepo.get(input.conversationId)
      : await this.conversationRepo.create(input.applicationId);

    // 2. Build context
    const context = await this.buildContext(input.applicationId);

    // 3. Build system prompt with context
    const systemPrompt = this.interpolatePrompt(SCHEMA_GENERATION_PROMPT, {
      APPLICATION_CONTEXT: context.applicationDescription,
      EXISTING_TABLES: JSON.stringify(context.existingTables, null, 2),
      TERMINOLOGY: JSON.stringify(context.terminology, null, 2)
    });

    // 4. Build user message
    const userMessage = input.feedback
      ? `Modifică schema anterioară: ${input.feedback}`
      : input.description;

    // 5. Call Claude
    const response = await this.claude.generate<FlexTable>(
      systemPrompt,
      userMessage,
      {
        conversationHistory: conversation.messages,
        responseSchema: FLEX_TABLE_JSON_SCHEMA,
        temperature: 0.3  // Low temperature for consistent schemas
      }
    );

    // 6. Validate generated schema
    const validation = await this.validateSchema(response.data);
    if (!validation.valid) {
      // Ask Claude to fix
      return this.generateSchema({
        ...input,
        conversationId: conversation.id,
        feedback: `Schema invalidă: ${validation.errors.join(', ')}. Corectează.`
      });
    }

    // 7. Save conversation
    await this.conversationRepo.addMessage(conversation.id, {
      role: 'user',
      content: userMessage
    });
    await this.conversationRepo.addMessage(conversation.id, {
      role: 'assistant',
      content: response.explanation,
      generatedComponent: { type: 'schema', definition: response.data }
    });

    return {
      schema: response.data,
      explanation: response.explanation,
      suggestions: this.generateSuggestions(response.data, context),
      conversationId: conversation.id
    };
  }

  async generateForm(input: GenerateFormInput): Promise<GenerateFormOutput> {
    // Similar flow, but uses TABLE_SCHEMA in prompt
    const tableSchema = await this.flexDbService.getTableSchema(input.tableId);

    const systemPrompt = this.interpolatePrompt(FORM_GENERATION_PROMPT, {
      TABLE_SCHEMA: JSON.stringify(tableSchema, null, 2)
    });

    // ... rest similar to generateSchema
  }

  async generateReport(input: GenerateReportInput): Promise<GenerateReportOutput> {
    // Similar flow
  }

  // Context builder
  private async buildContext(appId: string): Promise<GenerationContext> {
    const app = await this.applicationRepo.get(appId);
    const tables = await this.flexDbService.listTables(appId);

    return {
      applicationDescription: app?.aiContext?.description || '',
      existingTables: tables.map(t => ({
        name: t.name,
        displayName: t.displayName,
        columns: t.columns.map(c => c.name)
      })),
      terminology: app?.aiContext?.terminology || {},
      businessRules: app?.aiContext?.businessRules || []
    };
  }

  // Suggestion generator
  private generateSuggestions(schema: FlexTable, context: GenerationContext): string[] {
    const suggestions: string[] = [];

    // Check for missing common patterns
    if (!schema.columns.find(c => c.name === 'notes')) {
      suggestions.push('Ai putea adăuga un câmp "notes" pentru observații.');
    }

    // Check for unindexed frequently-used fields
    const unindexedStrings = schema.columns
      .filter(c => c.dataType === 'string' && !c.indexed && c.name !== 'notes')
      .slice(0, 2);
    if (unindexedStrings.length > 0) {
      suggestions.push(`Recomand să indexezi: ${unindexedStrings.map(c => c.name).join(', ')}`);
    }

    // Check for relationships
    if (!schema.relationships?.length && context.existingTables.length > 0) {
      suggestions.push('Ai putea adăuga relații cu tabelele existente.');
    }

    return suggestions;
  }
}
```

#### Conversation Management

```typescript
// /apps/api/src/db/schema/ai-conversations.schema.ts

export const aiConversations = mysqlTable('ai_conversations', {
  id: varchar('id', { length: 128 }).primaryKey(),
  applicationId: varchar('application_id', { length: 128 }),

  messages: json('messages').$type<AIMessage[]>().notNull().default([]),

  // Current working component
  currentComponentType: varchar('current_component_type', { length: 50 }),
  currentComponentDefinition: json('current_component_definition'),

  // Status
  status: varchar('status', { length: 20 }).default('active'),  // active, accepted, rejected
  acceptedComponentId: varchar('accepted_component_id', { length: 128 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  expiresAt: timestamp('expires_at'),  // Auto-cleanup after 24h inactivity
});

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;

  // For assistant messages with generated components
  generatedComponent?: {
    type: 'schema' | 'form' | 'report' | 'workflow';
    definition: any;
    explanation?: string;
  };

  // Token usage for cost tracking
  tokenUsage?: {
    input: number;
    output: number;
  };
}
```

#### API Endpoints

```typescript
// /apps/api/src/plugins/rad/routes/ai-generation.ts

const aiRoutes = new Hono()
  .basePath('/api/ai')

  // Generate schema from description
  .post('/generate/schema', async (c) => {
    const body = await c.req.json<{
      description: string;
      applicationId: string;
      conversationId?: string;
    }>();

    const result = await aiService.generateSchema(body);

    return c.json({
      success: true,
      data: {
        schema: result.schema,
        explanation: result.explanation,
        suggestions: result.suggestions,
        conversationId: result.conversationId
      }
    });
  })

  // Continue conversation (refinement)
  .post('/conversation/:id/message', async (c) => {
    const conversationId = c.req.param('id');
    const { message } = await c.req.json<{ message: string }>();

    const result = await aiService.continueConversation(conversationId, message);

    return c.json({
      success: true,
      data: result
    });
  })

  // Accept generated component (save to DB)
  .post('/conversation/:id/accept', async (c) => {
    const conversationId = c.req.param('id');

    const result = await aiService.acceptComponent(conversationId);

    return c.json({
      success: true,
      data: {
        componentId: result.id,
        componentType: result.type
      }
    });
  })

  // Reject and provide feedback
  .post('/conversation/:id/reject', async (c) => {
    const conversationId = c.req.param('id');
    const { feedback } = await c.req.json<{ feedback?: string }>();

    await aiService.rejectComponent(conversationId, feedback);

    return c.json({ success: true });
  })

  // Generate form from table
  .post('/generate/form', async (c) => {
    const { tableId, formType, description, conversationId } = await c.req.json();
    const result = await aiService.generateForm({ tableId, formType, description, conversationId });
    return c.json({ success: true, data: result });
  })

  // Generate report
  .post('/generate/report', async (c) => {
    const { tableId, description, conversationId } = await c.req.json();
    const result = await aiService.generateReport({ tableId, description, conversationId });
    return c.json({ success: true, data: result });
  })

  // Stream generation (for long responses)
  .post('/generate/stream', async (c) => {
    const body = await c.req.json();

    return streamSSE(c, async (stream) => {
      await aiService.generateWithStream(body, async (chunk) => {
        await stream.write({
          event: 'chunk',
          data: chunk
        });
      });
      await stream.write({ event: 'done', data: '' });
    });
  });
```

#### Frontend AI Chat Interface

```typescript
// /apps/frontend/src/components/rad/AIAssistant/AIAssistant.tsx

interface AIAssistantProps {
  applicationId: string;
  onComponentGenerated: (component: GeneratedComponent) => void;
}

function AIAssistant({ applicationId, onComponentGenerated }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentComponent, setCurrentComponent] = useState<GeneratedComponent | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/generate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: userMessage,
          applicationId,
          conversationId
        })
      });

      const { data } = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.explanation,
        component: data.schema,
        suggestions: data.suggestions
      }]);

      setCurrentComponent({ type: 'schema', definition: data.schema });
      setConversationId(data.conversationId);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'A apărut o eroare. Încearcă din nou.'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!conversationId) return;

    const response = await fetch(`/api/ai/conversation/${conversationId}/accept`, {
      method: 'POST'
    });

    const { data } = await response.json();
    onComponentGenerated({ ...currentComponent!, id: data.componentId });

    setMessages(prev => [...prev, {
      role: 'system',
      content: `✅ ${currentComponent?.type === 'schema' ? 'Tabel' : 'Component'} salvat cu succes!`
    }]);
    setCurrentComponent(null);
  };

  const handleRefine = (feedback: string) => {
    setInput(feedback);
    // Sau direct:
    // handleSend() cu feedback pre-populat
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isGenerating && <LoadingIndicator />}
      </div>

      {/* Component preview */}
      {currentComponent && (
        <ComponentPreview
          component={currentComponent}
          onAccept={handleAccept}
          onRefine={handleRefine}
        />
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descrie ce ai nevoie..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={isGenerating}>
            Trimite
          </Button>
        </div>
        <QuickActions onSelect={setInput} />
      </div>
    </div>
  );
}

// Quick action suggestions
function QuickActions({ onSelect }: { onSelect: (text: string) => void }) {
  const suggestions = [
    "Creează un tabel pentru clienți",
    "Adaugă un formular de adăugare",
    "Fă un raport cu lista clienților"
  ];

  return (
    <div className="flex gap-2 mt-2">
      {suggestions.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
```

#### Workflow Node pentru AI Generation

```typescript
// /packages/nodes/src/ai/AIGenerateSchemaNode.ts

export class AIGenerateSchemaNode extends WorkflowNode {
  metadata = {
    id: 'ai-generate-schema',
    name: 'AI Generate Schema',
    version: '1.0.0',
    description: 'Generează schema FlexTable din descriere text folosind Claude AI',
    inputs: ['description', 'applicationId', 'conversationId'],
    outputs: ['schema', 'explanation', 'suggestions', 'conversationId'],
    ai_hints: {
      purpose: 'Transformă descrieri în limbaj natural în scheme de baze de date',
      when_to_use: 'Când vrei să creezi tabele din descrieri ale utilizatorilor',
      expected_edges: ['success', 'error', 'needs_clarification'],
      post_to_state: ['generatedSchema', 'schemaExplanation', 'aiConversationId']
    }
  };

  async execute(context: ExecutionContext, config?: AIGenerateSchemaConfig): Promise<EdgeMap> {
    const { description, applicationId, conversationId, autoAccept } = config || {};

    if (!description) {
      return {
        error: () => ({ error: 'Missing description' })
      };
    }

    try {
      // Call AI service
      const result = await this.aiService.generateSchema({
        description: context.resolveValue(description),
        applicationId: context.resolveValue(applicationId) || context.applicationId,
        conversationId: context.resolveValue(conversationId)
      });

      // Store in state
      context.state.generatedSchema = result.schema;
      context.state.schemaExplanation = result.explanation;
      context.state.schemaSuggestions = result.suggestions;
      context.state.aiConversationId = result.conversationId;

      // Auto-accept if configured
      if (autoAccept) {
        const accepted = await this.aiService.acceptComponent(result.conversationId);
        context.state.flexTableId = accepted.id;
      }

      return {
        success: () => ({
          schema: result.schema,
          explanation: result.explanation,
          suggestions: result.suggestions,
          conversationId: result.conversationId
        })
      };

    } catch (error) {
      return {
        error: () => ({ error: error.message })
      };
    }
  }
}
```

#### Exemplu Workflow cu AI Generation

```json
{
  "id": "ai-create-customer-system",
  "name": "Create Customer Management System with AI",
  "version": "1.0.0",
  "initialState": {
    "requirement": "Am nevoie de un sistem pentru gestionarea clienților: nume, email, telefon, adresă, status (activ/inactiv), data înregistrării"
  },
  "workflow": [
    {
      "ai-generate-schema": {
        "description": "$.requirement",
        "autoAccept": true,
        "success?": [
          {
            "log": { "message": "Schema generată: {{$.schemaExplanation}}" }
          },
          {
            "ai-generate-form": {
              "tableId": "$.flexTableId",
              "formType": "create",
              "autoAccept": true,
              "success?": {
                "log": { "message": "Formular creat pentru tabelul customers" }
              }
            }
          },
          {
            "ai-generate-form": {
              "tableId": "$.flexTableId",
              "formType": "list",
              "autoAccept": true,
              "success?": {
                "log": { "message": "View listă creat" }
              }
            }
          }
        ],
        "error?": {
          "log": { "message": "Eroare generare: {{$.error}}" }
        }
      }
    }
  ]
}
```

#### Cost Control și Rate Limiting

```typescript
// Token usage tracking
interface AIUsageTracker {
  trackUsage(appId: string, usage: TokenUsage): Promise<void>;
  checkQuota(appId: string): Promise<{ allowed: boolean; remaining: number }>;
  getUsageReport(appId: string, period: 'day' | 'week' | 'month'): Promise<UsageReport>;
}

// Rate limiting per application
const AI_LIMITS = {
  free: {
    requestsPerHour: 20,
    tokensPerDay: 50_000
  },
  pro: {
    requestsPerHour: 100,
    tokensPerDay: 500_000
  },
  enterprise: {
    requestsPerHour: 1000,
    tokensPerDay: 5_000_000
  }
};
```

#### Securitate

1. **Input sanitization** - Nu trimite cod executabil către AI
2. **Output validation** - Validează JSON generat contra schema
3. **Rate limiting** - Previne abuse
4. **Audit logging** - Log toate generările pentru troubleshooting
5. **Cost caps** - Limită de cost per tenant/zi

---

## Noduri Workflow Noi

| Nod | Scop |
|-----|------|
| `flex-table` | Create/alter/drop tables |
| `flex-record` | CRUD pe records |
| `flex-query` | Complex queries cu joins |
| `form-render` | Pregătește form pentru UI |
| `form-submit` | Validare + salvare |
| `report-generate` | Generează output |
| `ai-generate-*` | Generare cu AI |

---

## Structura Fișiere Noi

```
packages/
├── engine/src/types/
│   ├── flexdb.types.ts      # FlexTable, FlexRecord interfaces
│   ├── forms.types.ts       # FormDefinition interfaces
│   ├── reports.types.ts     # ReportDefinition interfaces
│   └── application.types.ts # ApplicationDefinition
│
└── nodes/src/
    ├── flexdb/              # FlexTableNode, FlexRecordNode, FlexQueryNode
    ├── forms/               # FormRenderNode, FormSubmitNode
    ├── reports/             # ReportGenerateNode
    └── ai/                  # AIGenerate*Node

apps/
├── api/src/
│   ├── db/schema/
│   │   ├── flexdb.schema.ts
│   │   ├── forms.schema.ts
│   │   ├── reports.schema.ts
│   │   └── applications.schema.ts
│   │
│   └── plugins/rad/         # Noul plugin RAD
│       ├── routes/
│       ├── repositories/
│       └── services/
│
└── frontend/src/components/rad/
    ├── TableDesigner/
    ├── FormDesigner/
    ├── FormRenderer/
    ├── ReportDesigner/
    ├── ReportViewer/
    ├── ApplicationDesigner/
    └── AIAssistant/
```

---

## Faze de Implementare

### Faza 1: FlexDB Foundation (2-3 săptămâni)
- [ ] Schema Drizzle pentru `flex_tables`, `flex_records`
- [ ] `FlexTableNode` + `FlexRecordNode`
- [ ] API endpoints CRUD
- [ ] Test cu workflow simplu

### Faza 2: Forms Basic (2-3 săptămâni)
- [ ] `FormDefinition` types
- [ ] `DynamicFormRenderer` component
- [ ] `FormRenderNode` + `FormSubmitNode`
- [ ] Integrare cu FlexDB

### Faza 3: Form Designer (2-3 săptămâni)
- [ ] Visual form builder (drag-drop)
- [ ] Field property editor
- [ ] Preview mode
- [ ] Conditional fields

### Faza 4: Reports (3-4 săptămâni)
- [ ] `ReportDefinition` types
- [ ] Band-based report engine
- [ ] HTML + PDF generators
- [ ] Report Designer UI

### Faza 5: AI Integration (2-3 săptămâni)
- [ ] Claude SDK integration (înlocuiește OpenRouter)
- [ ] `AIGenerate*Node` nodes
- [ ] Chat interface
- [ ] Refinement loop

### Faza 6: Application Builder (2-3 săptămâni)
- [ ] Application container
- [ ] Menu system
- [ ] Dashboard builder
- [ ] Export/Import

**Total estimat: 13-19 săptămâni**

---

## Fișiere Critice de Referință

| Ce să construiesc | Pattern de urmat |
|-------------------|------------------|
| FlexRecordNode | `/packages/nodes/src/DatabaseNode.ts` (dar real, nu mock) |
| DynamicFormRenderer | `/apps/frontend/src/components/workflows/WorkflowForm.tsx` |
| AI Generation | `/packages/nodes/src/AskAINode.ts` |
| API Plugin | `/apps/api/src/plugins/workscript/` |

---

## Decizii Confirmate

| Aspect | Decizie |
|--------|---------|
| **Focus** | FlexDB First - fundația pe care se construiește tot |
| **Design Mode** | AI-Driven - generare conversațională, visual editors doar pentru tweaks |
| **Target** | Platformă Deschisă - utilizatorii construiesc ce vor |

---

## Plan de Implementare Prioritizat

### Sprint 1: FlexDB Core (2 săptămâni)
**Obiectiv:** Database flexibil funcțional, testat cu workflow

**Fișiere de creat:**
1. `/apps/api/src/db/schema/flexdb.schema.ts`
   - `flex_tables` - schema definitions
   - `flex_records` - data storage (JSON + indexed columns)

2. `/packages/engine/src/types/flexdb.types.ts`
   - `FlexTable`, `FlexColumnDefinition`, `FlexRecord` interfaces

3. `/packages/nodes/src/flexdb/FlexTableNode.ts`
   - Operations: `create`, `alter`, `drop`, `describe`

4. `/packages/nodes/src/flexdb/FlexRecordNode.ts`
   - Operations: `insert`, `find`, `findMany`, `update`, `delete`, `count`

5. `/apps/api/src/plugins/rad/` - noul plugin
   - `routes/flexdb.ts` - CRUD endpoints
   - `repositories/FlexTableRepository.ts`
   - `repositories/FlexRecordRepository.ts`
   - `services/FlexDBService.ts`

**Workflow de test:**
```json
{
  "id": "flexdb-test",
  "workflow": [
    { "flex-table": { "operation": "create", "name": "customers", "columns": [...] } },
    { "flex-record": { "operation": "insert", "table": "customers", "data": {...} } },
    { "flex-record": { "operation": "findMany", "table": "customers", "filter": {...} } }
  ]
}
```

### Sprint 2: AI Generation Core (2 săptămâni)
**Obiectiv:** Claude SDK + generare schema din descriere

**Fișiere de creat:**
1. `/apps/api/src/shared-services/ai/ClaudeClient.ts`
   - Înlocuiește OpenRouter cu Claude SDK nativ

2. `/packages/nodes/src/ai/AIGenerateSchemaNode.ts`
   - Input: descriere text + context
   - Output: FlexTable definition

3. `/apps/api/src/plugins/rad/routes/ai-generation.ts`
   - `POST /api/ai/generate/schema`
   - Conversation management

**Exemplu interacțiune:**
```
User: "Am nevoie de un tabel pentru clienți cu nume, email, telefon și data nașterii"
AI: [generează FlexTable definition]
User: "Adaugă și un câmp pentru CNP și validare că email-ul e unic"
AI: [actualizează definition]
```

### Sprint 3: Forms Runtime (2 săptămâni)
**Obiectiv:** Rendering dinamic de formulare + submit

1. `/packages/engine/src/types/forms.types.ts`
2. `/packages/nodes/src/forms/FormRenderNode.ts`
3. `/packages/nodes/src/forms/FormSubmitNode.ts`
4. `/apps/frontend/src/components/rad/FormRenderer/DynamicFormRenderer.tsx`
5. `/packages/nodes/src/ai/AIGenerateFormNode.ts`

**Flow:**
```
AI generează FormDefinition → FormRenderNode pregătește pentru UI →
DynamicFormRenderer afișează → User completează → FormSubmitNode validează + salvează în FlexDB
```

### Sprint 4: Forms + Reports AI (2 săptămâni)
1. `/packages/nodes/src/ai/AIGenerateReportNode.ts`
2. `/packages/engine/src/types/reports.types.ts`
3. `/packages/nodes/src/reports/ReportGenerateNode.ts`
4. HTML + PDF generators

### Sprint 5: Visual Editors (2 săptămâni)
- Table Designer (pentru tweaks)
- Form Designer (drag-drop ajustări)
- Report Designer (band editor)

### Sprint 6: Application Container (2 săptămâni)
- ApplicationDefinition
- Menu system
- Dashboard builder
- Export/Import

---

## Verificare End-to-End

După Sprint 1+2, vom putea testa:
```
1. User: "Creează un tabel pentru produse cu nume, preț, stoc"
2. AI generează FlexTable → salvat în DB
3. Workflow inserează date test
4. Workflow face query și returnează rezultate
```

După Sprint 3:
```
1. User: "Fă un formular de adăugare produs"
2. AI generează FormDefinition
3. Frontend randează formularul
4. User completează → salvat în FlexDB
```

---

## Dependențe Externe Noi

| Library | Scop |
|---------|------|
| `@anthropic-ai/sdk` | Claude SDK nativ |
| `puppeteer` sau `playwright` | PDF generation |
| `xlsx` / `exceljs` | Excel export |
| `react-dnd` | Drag-drop pentru visual editors |

---

## Riscuri și Mitigări

| Risc | Mitigare |
|------|----------|
| FlexDB performance cu multe records | Indexed columns pentru top 3 câmpuri; pagination obligatorie |
| AI generează schema incorectă | Validation layer + preview + refinement |
| Complexitate visual editors | Le facem DUPĂ ce AI-driven funcționează |
