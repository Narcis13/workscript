/**
 * FlexTableNode - Workflow Node for FlexDB Table Operations
 *
 * This node provides workflow-level access to FlexDB table management operations.
 * It enables workflows to dynamically create, retrieve, and list database tables
 * at runtime without traditional migrations.
 *
 * ## Service Injection Pattern
 *
 * FlexTableNode expects the FlexDBService to be injected via `context.services.flexDB`.
 * The API's workflow executor is responsible for setting this before running workflows.
 *
 * ## Operations
 *
 * ### Create Table
 * Creates a new FlexDB table with the specified columns.
 * - Validates table name (snake_case required)
 * - Validates column definitions (type, constraints)
 * - Checks for duplicate table names within the application
 * - Automatically adds system columns (id, created_at, updated_at, deleted_at)
 * - Creates version history entry for audit
 *
 * ### Get Table
 * Retrieves a table by ID or by name within an application.
 * - Returns the table schema and metadata
 * - Useful for schema introspection before data operations
 *
 * ### List Tables
 * Lists all active tables for an application.
 * - Returns array of table records
 * - Useful for discovering available tables
 *
 * ## Edge Routing
 *
 * | Edge | When Triggered |
 * |------|----------------|
 * | success | Operation completed successfully |
 * | error | Validation failed, internal error, or service unavailable |
 * | exists | Table already exists (on create operation) |
 * | not_found | Table not found (on get operation) |
 *
 * ## State Variables
 *
 * After successful operations, these state variables are set:
 * - `flexTable` - Full table record
 * - `flexTableId` - Table's unique identifier
 * - `flexTableSchema` - Table's schema definition
 * - `flexTables` - Array of tables (on list operation)
 *
 * @example Create a new table
 * ```json
 * {
 *   "flex-table": {
 *     "operation": "create",
 *     "applicationId": "$.appId",
 *     "tableName": "customers",
 *     "displayName": "Customers",
 *     "columns": [
 *       { "name": "name", "dataType": "string", "required": true },
 *       { "name": "email", "dataType": "string", "unique": true, "indexed": true },
 *       { "name": "status", "dataType": "string", "defaultValue": "active" }
 *     ],
 *     "success?": { "log": { "message": "Created table {{$.flexTableId}}" } },
 *     "exists?": { "log": { "message": "Table already exists" } },
 *     "error?": { "log": { "message": "Failed: {{$.error}}" } }
 *   }
 * }
 * ```
 *
 * @example Get table by name
 * ```json
 * {
 *   "flex-table": {
 *     "operation": "get",
 *     "applicationId": "$.appId",
 *     "tableName": "customers",
 *     "success?": { "log": { "message": "Found table with {{$.flexTableSchema.columns.length}} columns" } },
 *     "not_found?": { "log": { "message": "Table not found" } }
 *   }
 * }
 * ```
 *
 * @example List all tables
 * ```json
 * {
 *   "flex-table": {
 *     "operation": "list",
 *     "applicationId": "$.appId",
 *     "success?": { "log": { "message": "Found {{$.flexTables.length}} tables" } }
 *   }
 * }
 * ```
 *
 * @module FlexTableNode
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * Interface for FlexDB service results
 * Matches the ServiceResult type from FlexDBService
 */
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Interface for FlexDB table record
 */
interface FlexTable {
  id: string;
  applicationId: string;
  name: string;
  displayName: string | null;
  schema: FlexTableSchema;
  indexedColumns: Record<string, string>;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Interface for FlexDB table schema
 */
interface FlexTableSchema {
  columns: FlexColumnDefinition[];
  version: number;
}

/**
 * Interface for column definition
 */
interface FlexColumnDefinition {
  name: string;
  dataType: string;
  displayName?: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: unknown;
  system?: boolean;
}

/**
 * Interface for FlexDB service
 * This interface defines the methods that FlexTableNode expects from FlexDBService
 */
interface FlexDBServiceInterface {
  createTable(
    applicationId: string,
    name: string,
    columns: FlexColumnDefinition[],
    options?: { displayName?: string; createdBy?: string }
  ): Promise<ServiceResult<FlexTable>>;

  getTable(tableId: string): Promise<ServiceResult<FlexTable>>;

  getTableByName(
    applicationId: string,
    name: string
  ): Promise<ServiceResult<FlexTable>>;

  listTables(applicationId: string): Promise<FlexTable[]>;
}

/**
 * FlexTableNode - Workflow node for FlexDB table operations
 *
 * Provides create, get, and list operations for FlexDB tables.
 * Uses context.services.flexDB for service injection.
 */
export class FlexTableNode extends WorkflowNode {
  /**
   * Node metadata for registration and AI discovery
   */
  metadata = {
    id: 'flex-table',
    name: 'FlexDB Table Operations',
    version: '1.0.0',
    description:
      'Create, update, and manage FlexDB tables at runtime without migrations',
    inputs: [
      'operation',
      'tableName',
      'columns',
      'tableId',
      'applicationId',
      'displayName',
    ],
    outputs: ['tableId', 'schema', 'version', 'table', 'tables', 'count'],
    edgeDescriptions: {
      success: 'Table operation completed successfully',
      error: 'Operation failed - check error message and code',
      exists: 'Table already exists (on create operation)',
      not_found: 'Table not found (on get/update/delete operation)',
    },
    ai_hints: {
      purpose: 'Create and manage database tables dynamically at runtime',
      when_to_use:
        'When you need to define data structures without traditional migrations',
      expected_edges: ['success', 'error', 'exists', 'not_found'],
      example_usage:
        '{"flex-table": {"operation": "create", "tableName": "customers", "columns": [...], "success?": {...}}}',
      example_config:
        '{"operation": "create|get|list", "tableName?": "string", "columns?": "[ColumnDefinition]", "applicationId": "$.appId", "tableId?": "string"}',
      get_from_state: ['applicationId', 'userId'],
      post_to_state: ['flexTable', 'flexTableId', 'flexTableSchema', 'flexTables'],
    },
  };

  /**
   * Execute the FlexDB table operation
   *
   * @param context - Workflow execution context
   * @param config - Node configuration
   * @param config.operation - Operation type: 'create', 'get', or 'list'
   * @param config.applicationId - Application ID (or resolved from state)
   * @param config.tableName - Table name (required for create/get by name)
   * @param config.tableId - Table ID (for get by ID)
   * @param config.columns - Column definitions (required for create)
   * @param config.displayName - Optional display name for the table
   * @returns EdgeMap with appropriate edge based on operation result
   */
  async execute(
    context: ExecutionContext,
    config?: Record<string, unknown>
  ): Promise<EdgeMap> {
    const {
      operation,
      tableName,
      columns,
      tableId,
      applicationId,
      displayName,
    } = config || {};

    // Get service from context (injected by API)
    const flexDBService = (
      context as ExecutionContext & {
        services?: { flexDB?: FlexDBServiceInterface };
      }
    ).services?.flexDB;

    if (!flexDBService) {
      return {
        error: () => ({
          error: 'FlexDBService not available in execution context',
          code: 'SERVICE_UNAVAILABLE',
        }),
      };
    }

    // Resolve state references - prefer state value, fallback to config
    const appId =
      (context.state.applicationId as string | undefined) ||
      (applicationId as string | undefined);

    if (!appId) {
      return {
        error: () => ({
          error: 'applicationId is required',
          code: 'MISSING_APPLICATION_ID',
        }),
      };
    }

    try {
      switch (operation) {
        case 'create':
          return await this.handleCreate(
            context,
            flexDBService,
            appId,
            tableName as string | undefined,
            columns as FlexColumnDefinition[] | undefined,
            displayName as string | undefined
          );

        case 'get':
          return await this.handleGet(
            context,
            flexDBService,
            tableId as string | undefined,
            appId,
            tableName as string | undefined
          );

        case 'list':
          return await this.handleList(context, flexDBService, appId);

        default:
          return {
            error: () => ({
              error: `Unknown operation: ${operation}`,
              code: 'UNKNOWN_OPERATION',
            }),
          };
      }
    } catch (err) {
      return {
        error: () => ({
          error: err instanceof Error ? err.message : 'Internal error',
          code: 'INTERNAL_ERROR',
        }),
      };
    }
  }

  /**
   * Handle table creation operation
   *
   * Validates inputs, calls FlexDBService.createTable, and updates state.
   *
   * @param context - Execution context
   * @param flexDBService - The FlexDB service instance
   * @param applicationId - Application ID
   * @param tableName - Table name (snake_case)
   * @param columns - Column definitions
   * @param displayName - Optional display name
   * @returns EdgeMap with success, exists, or error edge
   */
  private async handleCreate(
    context: ExecutionContext,
    flexDBService: FlexDBServiceInterface,
    applicationId: string,
    tableName: string | undefined,
    columns: FlexColumnDefinition[] | undefined,
    displayName?: string
  ): Promise<EdgeMap> {
    if (!tableName) {
      return {
        error: () => ({
          error: 'tableName is required',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return {
        error: () => ({
          error: 'columns array is required and must not be empty',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Call FlexDBService.createTable
    const result = await flexDBService.createTable(
      applicationId,
      tableName,
      columns,
      {
        displayName,
        createdBy: context.state.userId as string | undefined,
      }
    );

    if (!result.success) {
      if (result.code === 'DUPLICATE') {
        // Store error info in state for downstream access
        context.state.error = result.error;
        context.state.errorCode = result.code;
        return {
          exists: () => ({
            error: result.error,
            code: result.code,
          }),
        };
      }
      context.state.error = result.error;
      context.state.errorCode = result.code;
      return {
        error: () => ({
          error: result.error,
          code: result.code,
        }),
      };
    }

    // Store in context state for downstream nodes
    context.state.flexTable = result.data;
    context.state.flexTableId = result.data!.id;
    context.state.flexTableSchema = result.data!.schema;

    return {
      success: () => ({
        tableId: result.data!.id,
        table: result.data,
        schema: result.data!.schema,
        version: result.data!.version,
      }),
    };
  }

  /**
   * Handle table retrieval operation
   *
   * Gets table by ID or by name within an application.
   *
   * @param context - Execution context
   * @param flexDBService - The FlexDB service instance
   * @param tableId - Table ID (optional)
   * @param applicationId - Application ID
   * @param tableName - Table name (optional)
   * @returns EdgeMap with success, not_found, or error edge
   */
  private async handleGet(
    context: ExecutionContext,
    flexDBService: FlexDBServiceInterface,
    tableId: string | undefined,
    applicationId: string,
    tableName: string | undefined
  ): Promise<EdgeMap> {
    if (!tableId && !tableName) {
      return {
        error: () => ({
          error: 'Either tableId or tableName is required',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Get by ID or by name
    const result = tableId
      ? await flexDBService.getTable(tableId)
      : await flexDBService.getTableByName(applicationId, tableName!);

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        context.state.error = result.error;
        context.state.errorCode = result.code;
        return {
          not_found: () => ({
            error: result.error,
            code: result.code,
          }),
        };
      }
      context.state.error = result.error;
      context.state.errorCode = result.code;
      return {
        error: () => ({
          error: result.error,
          code: result.code,
        }),
      };
    }

    // Store in context state for downstream nodes
    context.state.flexTable = result.data;
    context.state.flexTableId = result.data!.id;
    context.state.flexTableSchema = result.data!.schema;

    return {
      success: () => ({
        tableId: result.data!.id,
        table: result.data,
        schema: result.data!.schema,
        version: result.data!.version,
      }),
    };
  }

  /**
   * Handle table listing operation
   *
   * Lists all active tables for an application.
   *
   * @param context - Execution context
   * @param flexDBService - The FlexDB service instance
   * @param applicationId - Application ID
   * @returns EdgeMap with success edge containing tables array
   */
  private async handleList(
    context: ExecutionContext,
    flexDBService: FlexDBServiceInterface,
    applicationId: string
  ): Promise<EdgeMap> {
    const tables = await flexDBService.listTables(applicationId);

    // Store in context state for downstream nodes
    context.state.flexTables = tables;

    return {
      success: () => ({
        tables,
        count: tables.length,
      }),
    };
  }
}

export default FlexTableNode;
