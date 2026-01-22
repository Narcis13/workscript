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

---

## PHASE 4: AI INTEGRATION - CLAUDE SDK

### 4.1 Claude Client Setup

- [ ] **Task 4.1.1: Install Anthropic SDK**
  - Run `bun add @anthropic-ai/sdk` in apps/api
  - _Requirements: 17_

- [ ] **Task 4.1.2: Create ClaudeClient class**
  - Create `/apps/api/src/shared-services/ai/ClaudeClient.ts`
  - Import Anthropic from @anthropic-ai/sdk
  - Define ClaudeClientConfig interface
  - _Requirements: 17_

- [ ] **Task 4.1.3: Implement constructor**
  - Accept config with apiKey, model, maxTokens
  - Initialize Anthropic client
  - _Requirements: 17_

- [ ] **Task 4.1.4: Implement generate method**
  - Accept systemPrompt, userMessage, options
  - Build messages array with conversation history
  - Make API call with model, max_tokens, system, messages
  - Support tool use for structured output
  - Parse and return response
  - _Requirements: 17_

- [ ] **Task 4.1.5: Implement stream method**
  - Accept systemPrompt, userMessage, onChunk callback
  - Create streaming message request
  - Iterate chunks and call onChunk with text delta
  - _Requirements: 17_

- [ ] **Task 4.1.6: Implement parseResponse helper**
  - Handle text content blocks
  - Handle tool use content blocks
  - Extract generated component from tool call
  - Return typed response
  - _Requirements: 17_

- [ ] **Task 4.1.7: Add error handling**
  - Catch API errors
  - Handle rate limits with retry logic
  - Handle authentication errors
  - Return meaningful error messages
  - _Requirements: 17_

### 4.2 AI Generation Prompts

- [ ] **Task 4.2.1: Create prompts directory**
  - Create `/apps/api/src/plugins/rad/services/prompts/`
  - _Requirements: 7_

- [ ] **Task 4.2.2: Create schema generation prompt**
  - Create `schemaGeneration.ts`
  - Define SCHEMA_GENERATION_PROMPT constant
  - Include FlexDB schema format documentation
  - Include context placeholders: APPLICATION_CONTEXT, EXISTING_TABLES, TERMINOLOGY
  - Include Romanian validation patterns (CNP, phone, email)
  - Include generation rules
  - _Requirements: 7_

- [ ] **Task 4.2.3: Create form generation prompt**
  - Create `formGeneration.ts`
  - Define FORM_GENERATION_PROMPT constant
  - Include FormDefinition format documentation
  - Include TABLE_SCHEMA placeholder
  - Include UX rules for field grouping and layout
  - _Requirements: 9_

- [ ] **Task 4.2.4: Create report generation prompt**
  - Create `reportGeneration.ts`
  - Define REPORT_GENERATION_PROMPT constant
  - Include ReportDefinition format documentation
  - Include TABLE_SCHEMA and REPORT_REQUIREMENT placeholders
  - Include band layout rules
  - _Requirements: 10_

- [ ] **Task 4.2.5: Create JSON schemas for tool use**
  - Create `schemas.ts` with JSON Schema definitions
  - Define FLEX_TABLE_JSON_SCHEMA
  - Define FORM_DEFINITION_JSON_SCHEMA
  - Define REPORT_DEFINITION_JSON_SCHEMA
  - _Requirements: 7, 9, 10_

### 4.3 AI Conversation Management

- [ ] **Task 4.3.1: Create AI conversations schema**
  - Create `/apps/api/src/db/schema/ai-conversations.schema.ts`
  - Define ai_conversations table: id, application_id, messages (JSON), current_component_type, current_component_definition (JSON), status, accepted_component_id, created_at, updated_at, expires_at
  - _Requirements: 8_

- [ ] **Task 4.3.2: Run migration for conversations**
  - Add schema to index exports
  - Run `bun run db:push`
  - _Requirements: 8_

- [ ] **Task 4.3.3: Create ConversationRepository**
  - Create `/apps/api/src/plugins/rad/repositories/ConversationRepository.ts`
  - Implement: create, get, addMessage, updateComponent, markAccepted, markRejected, cleanup
  - _Requirements: 8_

- [ ] **Task 4.3.4: Define AIMessage interface**
  - Create in types file
  - Include: id, role, content, timestamp, generatedComponent, tokenUsage
  - _Requirements: 8_

### 4.4 AI Generation Service

- [ ] **Task 4.4.1: Create AIGenerationService class**
  - Create `/apps/api/src/plugins/rad/services/AIGenerationService.ts`
  - Inject ClaudeClient, FlexDBService, ConversationRepository
  - _Requirements: 7_

- [ ] **Task 4.4.2: Implement buildContext method**
  - Fetch application details
  - Fetch existing tables for application
  - Build context object with description, existing tables, terminology
  - _Requirements: 7_

- [ ] **Task 4.4.3: Implement interpolatePrompt method**
  - Replace template placeholders with values
  - Handle APPLICATION_CONTEXT, EXISTING_TABLES, TERMINOLOGY, TABLE_SCHEMA
  - _Requirements: 7_

- [ ] **Task 4.4.4: Implement generateSchema method**
  - Load or create conversation
  - Build context and system prompt
  - Build user message (description or feedback)
  - Call Claude with tool use
  - Validate generated schema
  - Auto-fix invalid schemas by asking Claude to correct
  - Save conversation messages
  - Generate suggestions
  - Return schema, explanation, suggestions, conversationId
  - _Requirements: 7_

- [ ] **Task 4.4.5: Implement generateForm method**
  - Fetch table schema
  - Build form generation prompt with table schema
  - Call Claude
  - Validate form definition
  - Return form definition
  - _Requirements: 9_

- [ ] **Task 4.4.6: Implement generateReport method**
  - Fetch table schema
  - Build report generation prompt
  - Call Claude
  - Validate report definition
  - Return report definition
  - _Requirements: 10_

- [ ] **Task 4.4.7: Implement continueConversation method**
  - Load existing conversation
  - Add user message
  - Determine component type and re-generate
  - Return updated component
  - _Requirements: 8_

- [ ] **Task 4.4.8: Implement acceptComponent method**
  - Load conversation
  - Save component to appropriate table (flex_tables, form_definitions, etc.)
  - Mark conversation as accepted
  - Return component ID
  - _Requirements: 8_

- [ ] **Task 4.4.9: Implement rejectComponent method**
  - Mark conversation as rejected
  - Store optional feedback
  - _Requirements: 8_

- [ ] **Task 4.4.10: Implement generateSuggestions method**
  - Analyze generated schema
  - Check for missing common fields (notes, etc.)
  - Check for unindexed frequently-used fields
  - Check for missing relationships
  - Return suggestions array
  - _Requirements: 7_

- [ ] **Task 4.4.11: Implement validateSchema method**
  - Check required properties
  - Validate column definitions
  - Check index slot limits
  - Return validation result
  - _Requirements: 7_

### 4.5 AI Usage Tracking

- [ ] **Task 4.5.1: Create AI usage schema**
  - Create `/apps/api/src/db/schema/ai-usage.schema.ts`
  - Define ai_usage table: id, application_id, request_type, input_tokens, output_tokens, model, created_at
  - _Requirements: 18_

- [ ] **Task 4.5.2: Create AIUsageTracker service**
  - Create `/apps/api/src/plugins/rad/services/AIUsageTracker.ts`
  - Implement: trackUsage, checkQuota, getUsageReport
  - _Requirements: 18_

- [ ] **Task 4.5.3: Implement rate limiting**
  - Define limits per tier (free, pro, enterprise)
  - Check quota before AI requests
  - Block requests exceeding limits
  - _Requirements: 18_

- [ ] **Task 4.5.4: Integrate tracking in AIGenerationService**
  - Track tokens after each API call
  - Check quota before generating
  - _Requirements: 18_

---

## PHASE 5: AI WORKFLOW NODES

### 5.1 AIGenerateSchemaNode

- [ ] **Task 5.1.1: Create AI nodes directory**
  - Create `/packages/nodes/src/ai/`
  - _Requirements: 7_

- [ ] **Task 5.1.2: Create AIGenerateSchemaNode class**
  - Create `/packages/nodes/src/ai/AIGenerateSchemaNode.ts`
  - Extend WorkflowNode
  - _Requirements: 7_

- [ ] **Task 5.1.3: Define node metadata**
  - Set id: 'ai-generate-schema'
  - Define inputs: description, applicationId, conversationId, autoAccept
  - Define outputs: schema, explanation, suggestions, conversationId
  - Add ai_hints
  - _Requirements: 7_

- [ ] **Task 5.1.4: Implement execute method**
  - Extract config values
  - Call AIGenerationService.generateSchema
  - Store results in context.state
  - Auto-accept if configured
  - Return success or error edge
  - _Requirements: 7_

### 5.2 AIGenerateFormNode

- [ ] **Task 5.2.1: Create AIGenerateFormNode class**
  - Create `/packages/nodes/src/ai/AIGenerateFormNode.ts`
  - _Requirements: 9_

- [ ] **Task 5.2.2: Define node metadata**
  - Set id: 'ai-generate-form'
  - Define inputs: tableId, formType, description, conversationId, autoAccept
  - _Requirements: 9_

- [ ] **Task 5.2.3: Implement execute method**
  - Call AIGenerationService.generateForm
  - Store form definition in state
  - _Requirements: 9_

### 5.3 AIGenerateReportNode

- [ ] **Task 5.3.1: Create AIGenerateReportNode class**
  - Create `/packages/nodes/src/ai/AIGenerateReportNode.ts`
  - _Requirements: 10_

- [ ] **Task 5.3.2: Define node metadata**
  - Set id: 'ai-generate-report'
  - Define inputs: tableId, description, conversationId, autoAccept
  - _Requirements: 10_

- [ ] **Task 5.3.3: Implement execute method**
  - Call AIGenerationService.generateReport
  - Store report definition in state
  - _Requirements: 10_

### 5.4 Node Registration

- [ ] **Task 5.4.1: Create ai nodes index**
  - Create `/packages/nodes/src/ai/index.ts`
  - Export all AI nodes
  - _Requirements: 7_

- [ ] **Task 5.4.2: Register in main nodes index**
  - Add AI nodes to ALL_NODES in `/packages/nodes/src/index.ts`
  - Rebuild package
  - _Requirements: 7_

---

## PHASE 6: AI API ENDPOINTS

### 6.1 AI Generation Routes

- [ ] **Task 6.1.1: Create AI routes file**
  - Create `/apps/api/src/plugins/rad/routes/ai-generation.ts`
  - Set basePath to /api/ai
  - _Requirements: 20_

- [ ] **Task 6.1.2: Implement POST /generate/schema endpoint**
  - Parse description, applicationId, conversationId
  - Call AIGenerationService.generateSchema
  - Return schema, explanation, suggestions, conversationId
  - _Requirements: 20_

- [ ] **Task 6.1.3: Implement POST /generate/form endpoint**
  - Parse tableId, formType, description
  - Call AIGenerationService.generateForm
  - Return form definition
  - _Requirements: 20_

- [ ] **Task 6.1.4: Implement POST /generate/report endpoint**
  - Parse tableId, description
  - Call AIGenerationService.generateReport
  - Return report definition
  - _Requirements: 20_

- [ ] **Task 6.1.5: Implement POST /conversation/:id/message endpoint**
  - Parse message content
  - Call AIGenerationService.continueConversation
  - Return updated component
  - _Requirements: 20_

- [ ] **Task 6.1.6: Implement POST /conversation/:id/accept endpoint**
  - Call AIGenerationService.acceptComponent
  - Return component ID and type
  - _Requirements: 20_

- [ ] **Task 6.1.7: Implement POST /conversation/:id/reject endpoint**
  - Parse optional feedback
  - Call AIGenerationService.rejectComponent
  - Return success
  - _Requirements: 20_

- [ ] **Task 6.1.8: Implement GET /conversation/:id endpoint**
  - Fetch conversation
  - Return messages and current component
  - _Requirements: 20_

- [ ] **Task 6.1.9: Implement POST /generate/stream endpoint**
  - Use streamSSE from Hono
  - Stream generation chunks
  - _Requirements: 20_

- [ ] **Task 6.1.10: Add rate limiting middleware**
  - Check quota before processing
  - Return 429 if exceeded
  - _Requirements: 20_

### 6.2 Route Registration

- [ ] **Task 6.2.1: Register AI routes in plugin**
  - Update plugin.ts to include AI routes
  - _Requirements: 20_

---

## PHASE 7: FORMS SYSTEM

### 7.1 Form Types and Schema

- [ ] **Task 7.1.1: Create form types file**
  - Create `/packages/engine/src/types/forms.types.ts`
  - Define FormDefinition interface
  - Define FormDataSource interface
  - Define FormLayout interface
  - Define FormSection interface
  - _Requirements: 11_

- [ ] **Task 7.1.2: Define FormFieldDefinition interface**
  - Include: id, name, label, type, binding, required, validation
  - Include: placeholder, helpText, disabled, hidden, width
  - Include: options (FormFieldOptions)
  - _Requirements: 11_

- [ ] **Task 7.1.3: Define FormFieldType union**
  - Include: text, textarea, number, decimal, email, phone, date, datetime, time
  - Include: select, multiselect, checkbox, radio, switch
  - Include: file, image, richtext, code, json, reference, custom
  - _Requirements: 11_

- [ ] **Task 7.1.4: Define FormAction interface**
  - Include: id, label, type, variant, icon
  - Include: workflowId, navigateTo, closeForm
  - Include: disabled, hidden, confirmMessage
  - _Requirements: 11_

- [ ] **Task 7.1.5: Create form definitions schema**
  - Create `/apps/api/src/db/schema/forms.schema.ts`
  - Define form_definitions table
  - Run migration
  - _Requirements: 11_

- [ ] **Task 7.1.6: Create FormRepository**
  - Implement CRUD operations for form definitions
  - _Requirements: 11_

### 7.2 Form Workflow Nodes

- [ ] **Task 7.2.1: Create forms nodes directory**
  - Create `/packages/nodes/src/forms/`
  - _Requirements: 13_

- [ ] **Task 7.2.2: Create FormRenderNode**
  - Create `/packages/nodes/src/forms/FormRenderNode.ts`
  - Define metadata with inputs: formId, recordId, mode
  - Implement execute: load form, load record data, merge
  - Store in context.state.renderedForm
  - _Requirements: 13_

- [ ] **Task 7.2.3: Create FormSubmitNode**
  - Create `/packages/nodes/src/forms/FormSubmitNode.ts`
  - Define metadata with inputs: formId, data, recordId
  - Implement execute: validate, save to FlexDB
  - Return validation_error edge on failure
  - _Requirements: 13_

- [ ] **Task 7.2.4: Register form nodes**
  - Create index.ts
  - Add to ALL_NODES
  - _Requirements: 13_

### 7.3 Form API Endpoints

- [ ] **Task 7.3.1: Create forms routes file**
  - Create `/apps/api/src/plugins/rad/routes/forms.ts`
  - _Requirements: 19_

- [ ] **Task 7.3.2: Implement CRUD endpoints**
  - POST /forms - create
  - GET /forms - list
  - GET /forms/:id - get
  - PUT /forms/:id - update
  - DELETE /forms/:id - delete
  - _Requirements: 19_

- [ ] **Task 7.3.3: Implement render endpoint**
  - GET /forms/:id/render - render with data
  - _Requirements: 19_

- [ ] **Task 7.3.4: Implement submit endpoint**
  - POST /forms/:id/submit - validate and save
  - _Requirements: 19_

### 7.4 Frontend Form Renderer

- [ ] **Task 7.4.1: Create RAD components directory**
  - Create `/apps/frontend/src/components/rad/`
  - Create subdirectory: FormRenderer/
  - _Requirements: 12_

- [ ] **Task 7.4.2: Create DynamicFormRenderer component**
  - Create `/apps/frontend/src/components/rad/FormRenderer/DynamicFormRenderer.tsx`
  - Accept FormDefinition prop
  - Use react-hook-form for state management
  - _Requirements: 12_

- [ ] **Task 7.4.3: Create field type mapping**
  - Map FormFieldType to shadcn/ui components
  - Create FieldRenderer component
  - _Requirements: 12_

- [ ] **Task 7.4.4: Implement text field rendering**
  - Use Input component for text, email, phone
  - Use Textarea for textarea
  - _Requirements: 12_

- [ ] **Task 7.4.5: Implement select field rendering**
  - Use Select component for select
  - Support dynamic options loading
  - _Requirements: 12_

- [ ] **Task 7.4.6: Implement date field rendering**
  - Use date picker component
  - Handle date/datetime/time types
  - _Requirements: 12_

- [ ] **Task 7.4.7: Implement checkbox/switch rendering**
  - Use Checkbox and Switch components
  - _Requirements: 12_

- [ ] **Task 7.4.8: Implement reference field rendering**
  - Create searchable lookup component
  - Load options from related table
  - _Requirements: 12_

- [ ] **Task 7.4.9: Implement validation display**
  - Show error messages per field
  - Style invalid fields
  - _Requirements: 12_

- [ ] **Task 7.4.10: Implement form submission**
  - Handle onSubmit with form data
  - Show loading state
  - Display success/error feedback
  - _Requirements: 12_

- [ ] **Task 7.4.11: Implement conditional fields**
  - Evaluate hidden/disabled expressions
  - Update visibility in real-time
  - _Requirements: 12_

---

## PHASE 8: REPORTS SYSTEM

### 8.1 Report Types and Schema

- [ ] **Task 8.1.1: Create report types file**
  - Create `/packages/engine/src/types/reports.types.ts`
  - Define ReportDefinition interface
  - Define ReportDataSource interface
  - Define ReportBand interface
  - Define ReportBandType union
  - _Requirements: 14_

- [ ] **Task 8.1.2: Define ReportElement interface**
  - Include: id, type, x, y, width, height, content, style
  - Define ReportElementType union
  - _Requirements: 14_

- [ ] **Task 8.1.3: Define ReportParameter interface**
  - Include: name, label, type, required, defaultValue, options
  - _Requirements: 14_

- [ ] **Task 8.1.4: Create report definitions schema**
  - Create `/apps/api/src/db/schema/reports.schema.ts`
  - Define report_definitions and report_executions tables
  - Run migration
  - _Requirements: 14_

- [ ] **Task 8.1.5: Create ReportRepository**
  - Implement CRUD for report definitions
  - Implement execution logging
  - _Requirements: 14_

### 8.2 Report Generation Engine

- [ ] **Task 8.2.1: Create ReportGeneratorService**
  - Create `/apps/api/src/plugins/rad/services/ReportGeneratorService.ts`
  - _Requirements: 15_

- [ ] **Task 8.2.2: Implement data fetching**
  - Load data from FlexDB based on dataSource
  - Apply filters from parameters
  - Apply grouping if specified
  - _Requirements: 15_

- [ ] **Task 8.2.3: Implement band processing**
  - Process bands in order
  - Handle group changes for group bands
  - Calculate aggregations for footers
  - _Requirements: 15_

- [ ] **Task 8.2.4: Implement HTML generator**
  - Generate HTML document from bands
  - Apply styling
  - _Requirements: 15_

- [ ] **Task 8.2.5: Implement PDF generator**
  - Install puppeteer: `bun add puppeteer`
  - Convert HTML to PDF
  - Apply page setup (size, orientation, margins)
  - _Requirements: 15_

- [ ] **Task 8.2.6: Implement Excel generator**
  - Install exceljs: `bun add exceljs`
  - Create workbook from data
  - Apply formatting
  - _Requirements: 15_

- [ ] **Task 8.2.7: Implement CSV generator**
  - Generate CSV with proper escaping
  - Handle headers
  - _Requirements: 15_

### 8.3 Report Workflow Nodes

- [ ] **Task 8.3.1: Create ReportGenerateNode**
  - Create `/packages/nodes/src/reports/ReportGenerateNode.ts`
  - Define inputs: reportId, parameters, format
  - Implement execute: generate report, save file
  - _Requirements: 15_

- [ ] **Task 8.3.2: Register report nodes**
  - Add to ALL_NODES
  - _Requirements: 15_

### 8.4 Report API Endpoints

- [ ] **Task 8.4.1: Create reports routes**
  - CRUD endpoints
  - POST /reports/:id/generate
  - GET /reports/:id/preview
  - GET /reports/executions/:id/download
  - _Requirements: 19_

---

## PHASE 9: FRONTEND AI ASSISTANT

### 9.1 AI Chat Interface

- [ ] **Task 9.1.1: Create AIAssistant directory**
  - Create `/apps/frontend/src/components/rad/AIAssistant/`
  - _Requirements: 8_

- [ ] **Task 9.1.2: Create AIAssistant component**
  - Create `AIAssistant.tsx`
  - Manage messages state
  - Manage input state
  - Manage conversationId state
  - _Requirements: 8_

- [ ] **Task 9.1.3: Implement message sending**
  - Handle send button click
  - Call API endpoint
  - Update messages with response
  - _Requirements: 8_

- [ ] **Task 9.1.4: Create ChatMessage component**
  - Render user and assistant messages
  - Style differently by role
  - Show generated component preview
  - _Requirements: 8_

- [ ] **Task 9.1.5: Create ComponentPreview component**
  - Show generated schema/form/report
  - Display as formatted JSON
  - Show accept/refine buttons
  - _Requirements: 8_

- [ ] **Task 9.1.6: Implement accept handler**
  - Call accept endpoint
  - Update UI with success message
  - Trigger callback with component ID
  - _Requirements: 8_

- [ ] **Task 9.1.7: Implement refine handler**
  - Pre-populate input with refinement text
  - Continue conversation
  - _Requirements: 8_

- [ ] **Task 9.1.8: Create QuickActions component**
  - Show suggestion buttons
  - Populate input on click
  - _Requirements: 8_

- [ ] **Task 9.1.9: Implement loading states**
  - Show spinner during generation
  - Disable input while loading
  - _Requirements: 8_

---

## PHASE 10: APPLICATION CONTAINER

### 10.1 Application Types and Schema

- [ ] **Task 10.1.1: Create application types**
  - Create `/packages/engine/src/types/application.types.ts`
  - Define ApplicationDefinition interface
  - Define MenuDefinition and MenuItem interfaces
  - Define DashboardConfig interface
  - _Requirements: 16_

- [ ] **Task 10.1.2: Create applications schema**
  - Create `/apps/api/src/db/schema/applications.schema.ts`
  - Run migration
  - _Requirements: 16_

- [ ] **Task 10.1.3: Create ApplicationRepository**
  - Implement CRUD operations
  - _Requirements: 16_

### 10.2 Application API Endpoints

- [ ] **Task 10.2.1: Create applications routes**
  - CRUD endpoints
  - POST /applications/:id/publish
  - GET /applications/:id/export
  - POST /applications/import
  - _Requirements: 19_

---

## PHASE 11: TESTING

### 11.1 FlexDB Tests

- [ ] **Task 11.1.1: Create FlexDB service tests**
  - Test createTable validation
  - Test insertRecord with indexed columns
  - Test findRecords with filters
  - Test updateRecord with optimistic locking
  - _Requirements: All FlexDB_

- [ ] **Task 11.1.2: Create FlexDB node tests**
  - Test FlexTableNode operations
  - Test FlexRecordNode operations
  - _Requirements: All FlexDB_

- [ ] **Task 11.1.3: Create FlexDB API tests**
  - Test all endpoints
  - Test error responses
  - _Requirements: 19_

### 11.2 AI Generation Tests

- [ ] **Task 11.2.1: Create AI service tests**
  - Mock Claude SDK
  - Test schema generation
  - Test conversation management
  - _Requirements: 7, 8_

- [ ] **Task 11.2.2: Create AI node tests**
  - Test AIGenerateSchemaNode
  - _Requirements: 7_

### 11.3 Integration Tests

- [ ] **Task 11.3.1: Create end-to-end test**
  - Generate schema with AI
  - Create table
  - Insert records
  - Query records
  - Generate form
  - _Requirements: All_

---

## PHASE 12: FINAL VERIFICATION

### 12.1 Build & Deploy Readiness

- [ ] **Task 12.1.1: Run full build**
  - Execute `bun run build`
  - Fix any build errors
  - _Requirements: Code Quality_

- [ ] **Task 12.1.2: Run all tests**
  - Execute `bun run test`
  - Ensure >80% coverage
  - _Requirements: Code Quality_

- [ ] **Task 12.1.3: Run type check**
  - Execute `bun run typecheck`
  - Fix any type errors
  - _Requirements: Code Quality_

- [ ] **Task 12.1.4: Run linter**
  - Execute `bun run lint`
  - Fix any lint errors
  - _Requirements: Code Quality_

### 12.2 Final Acceptance

- [ ] **Task 12.2.1: Test FlexDB workflow**
  - Create table via workflow
  - Insert and query records
  - Verify indexed columns work
  - _Requirements: 1, 3_

- [ ] **Task 12.2.2: Test AI schema generation**
  - Generate schema from description
  - Verify conversation refinement
  - Accept and create table
  - _Requirements: 7, 8_

- [ ] **Task 12.2.3: Test form rendering**
  - Generate form from table
  - Render in frontend
  - Submit data
  - _Requirements: 9, 12_

- [ ] **Task 12.2.4: Test report generation**
  - Generate report from table
  - Generate PDF output
  - _Requirements: 10, 15_

- [ ] **Task 12.2.5: Document API endpoints**
  - Create OpenAPI/Swagger spec
  - Verify all endpoints documented
  - _Requirements: All API_

---

## Summary

**Total Tasks:** 178
**Estimated Time:** 10-14 weeks

**Critical Path:**
1. Phase 1: FlexDB Foundation (2 weeks)
2. Phase 2: FlexDB Nodes (1 week)
3. Phase 3: FlexDB API (1 week)
4. Phase 4: AI Integration (2 weeks)
5. Phase 5: AI Nodes (1 week)
6. Phase 6: AI API (1 week)
7. Phase 7: Forms System (2 weeks)
8. Phase 8: Reports System (2 weeks)
9. Phase 9: AI Frontend (1 week)
10. Phase 10: Application Container (1 week)
11. Phase 11: Testing (1 week)
12. Phase 12: Final Verification (3 days)

**Key Milestones:**
- ✅ FlexDB tables can be created and queried through workflows
- ✅ AI generates valid schema from natural language
- ✅ Forms render dynamically from definitions
- ✅ Reports generate in PDF format
- ✅ Full end-to-end workflow completes successfully

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-21
**Status:** Ready for Implementation
