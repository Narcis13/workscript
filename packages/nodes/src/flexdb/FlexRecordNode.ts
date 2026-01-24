/**
 * FlexRecordNode - Workflow Node for FlexDB Record Operations
 *
 * This node provides workflow-level access to FlexDB record CRUD operations.
 * It enables workflows to create, read, update, and delete records in FlexDB tables
 * at runtime with full query support.
 *
 * ## Service Injection Pattern
 *
 * FlexRecordNode expects the FlexRecordService to be injected via `context.state._services.flexRecord`.
 * The API's WorkflowService injects services into initialState._services before running workflows.
 * This pattern works because initialState flows into context.state during execution.
 *
 * ## Operations
 *
 * ### Insert
 * Creates a new record in a FlexDB table.
 * - Validates data against table schema
 * - Validates reference columns exist
 * - Auto-generates ID and timestamps
 *
 * ### FindOne
 * Retrieves a single record by ID.
 * - Returns the record if found
 * - Returns not_found edge if record doesn't exist
 *
 * ### FindMany
 * Queries records with filtering, ordering, and pagination.
 * - Supports complex filter conditions
 * - Can include related records via reference columns
 * - Returns empty edge if no records match
 *
 * ### Update
 * Updates an existing record with optimistic locking.
 * - Validates updated data against schema
 * - Detects version conflicts
 * - Returns conflict edge if version mismatch
 *
 * ### Delete
 * Removes a record (soft delete by default).
 * - Checks for restrict references before delete
 * - Handles cascade and set-null behaviors
 * - Can perform hard delete if requested
 *
 * ## Edge Routing
 *
 * | Edge | When Triggered |
 * |------|----------------|
 * | success | Operation completed successfully |
 * | found | Record found (findOne operation) |
 * | not_found | Record not found |
 * | empty | Query returned no results (findMany) |
 * | conflict | Version conflict during update |
 * | error | Operation failed - check error message |
 *
 * ## State Variables
 *
 * After successful operations, these state variables are set:
 * - `flexRecord` - Single record result (insert, findOne, update)
 * - `flexRecordId` - Record's unique identifier
 * - `flexRecords` - Array of records (findMany)
 * - `flexRecordCount` - Number of records returned (findMany)
 * - `deleted` - True after successful delete
 *
 * @example Insert a new record
 * ```json
 * {
 *   "flex-record": {
 *     "operation": "insert",
 *     "tableId": "$.flexTableId",
 *     "data": {
 *       "name": "John Doe",
 *       "email": "john@example.com"
 *     },
 *     "success?": { "log": { "message": "Created record {{$.flexRecordId}}" } },
 *     "error?": { "log": { "message": "Failed: {{$.error}}" } }
 *   }
 * }
 * ```
 *
 * @example Find a record by ID
 * ```json
 * {
 *   "flex-record": {
 *     "operation": "findOne",
 *     "recordId": "$.recordId",
 *     "found?": { "log": { "message": "Found: {{$.flexRecord.data.name}}" } },
 *     "not_found?": { "log": { "message": "Record not found" } }
 *   }
 * }
 * ```
 *
 * @example Query records with filter
 * ```json
 * {
 *   "flex-record": {
 *     "operation": "findMany",
 *     "tableId": "$.flexTableId",
 *     "filter": { "status": "active" },
 *     "orderBy": [{ "field": "created_at", "direction": "desc" }],
 *     "limit": 10,
 *     "success?": { "log": { "message": "Found {{$.flexRecordCount}} records" } },
 *     "empty?": { "log": { "message": "No records found" } }
 *   }
 * }
 * ```
 *
 * @example Update a record
 * ```json
 * {
 *   "flex-record": {
 *     "operation": "update",
 *     "recordId": "$.flexRecordId",
 *     "data": { "status": "inactive" },
 *     "version": "$.flexRecord.version",
 *     "success?": { "log": { "message": "Updated successfully" } },
 *     "conflict?": { "log": { "message": "Version conflict - record was modified" } },
 *     "not_found?": { "log": { "message": "Record not found" } }
 *   }
 * }
 * ```
 *
 * @example Delete a record
 * ```json
 * {
 *   "flex-record": {
 *     "operation": "delete",
 *     "recordId": "$.flexRecordId",
 *     "hardDelete": false,
 *     "success?": { "log": { "message": "Record deleted" } },
 *     "not_found?": { "log": { "message": "Record not found" } },
 *     "error?": { "log": { "message": "Cannot delete: {{$.error}}" } }
 *   }
 * }
 * ```
 *
 * @module FlexRecordNode
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Interface for FlexRecord service results
 * Matches the RecordServiceResult type from FlexRecordService
 */
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Interface for FlexDB record
 */
interface FlexRecord {
  id: string;
  tableId: string;
  applicationId: string;
  data: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Query parameters for findMany
 */
interface FlexQueryParams {
  tableId: string;
  filter?: Record<string, unknown>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
  include?: Array<{ relation: string }>;
  includeDeleted?: boolean;
}

/**
 * Interface for FlexRecord service
 * This interface defines the methods that FlexRecordNode expects from FlexRecordService
 */
interface FlexRecordServiceInterface {
  insertRecord(
    tableId: string,
    data: Record<string, unknown>,
    userId?: string
  ): Promise<ServiceResult<FlexRecord>>;

  findOne(recordId: string): Promise<ServiceResult<FlexRecord>>;

  findMany(params: FlexQueryParams): Promise<ServiceResult<FlexRecord[]>>;

  updateRecord(
    recordId: string,
    updates: Record<string, unknown>,
    expectedVersion: number
  ): Promise<ServiceResult<FlexRecord>>;

  deleteRecord(
    recordId: string,
    hardDelete?: boolean
  ): Promise<ServiceResult<{ deleted: true }>>;
}

// =============================================================================
// FLEXRECORDNODE CLASS
// =============================================================================

/**
 * FlexRecordNode - Workflow node for FlexDB record operations
 *
 * Provides insert, findOne, findMany, update, and delete operations for FlexDB records.
 * Uses context.state._services.flexRecord for service injection.
 */
export class FlexRecordNode extends WorkflowNode {
  /**
   * Node metadata for registration and AI discovery
   */
  metadata = {
    id: 'flex-record',
    name: 'FlexDB Record Operations',
    version: '1.0.0',
    description: 'Create, read, update, and delete FlexDB records with query support',
    inputs: [
      'operation',
      'tableId',
      'tableName',
      'recordId',
      'data',
      'filter',
      'orderBy',
      'limit',
      'offset',
      'include',
      'version',
      'hardDelete',
    ],
    outputs: ['record', 'records', 'count', 'deleted', 'version'],
    edgeDescriptions: {
      success: 'Operation completed successfully',
      found: 'Record(s) found',
      not_found: 'Record not found',
      empty: 'Query returned no results',
      conflict: 'Version conflict during update',
      error: 'Operation failed - check error message',
    },
    ai_hints: {
      purpose: 'Perform CRUD operations on FlexDB records with filtering and relationships',
      when_to_use: 'When you need to insert, find, update, or delete records in a FlexDB table',
      expected_edges: ['success', 'found', 'not_found', 'empty', 'conflict', 'error'],
      example_usage:
        '{"flex-record": {"operation": "insert", "tableId": "$.flexTableId", "data": {"name": "John"}, "success?": {...}}}',
      example_config:
        '{"operation": "insert|findOne|findMany|update|delete", "tableId": "string", "data?": "object", "filter?": "object"}',
      get_from_state: ['applicationId', 'flexTableId'],
      post_to_state: ['flexRecord', 'flexRecords', 'flexRecordId', 'flexRecordCount'],
    },
  };

  /**
   * Execute the FlexDB record operation
   *
   * @param context - Workflow execution context
   * @param config - Node configuration
   * @param config.operation - Operation type: 'insert', 'findOne', 'findMany', 'update', or 'delete'
   * @param config.tableId - Table ID (required for insert, findMany)
   * @param config.recordId - Record ID (required for findOne, update, delete)
   * @param config.data - Record data (required for insert, update)
   * @param config.filter - Filter conditions (for findMany)
   * @param config.orderBy - Sort order (for findMany)
   * @param config.limit - Maximum records to return (for findMany)
   * @param config.offset - Number of records to skip (for findMany)
   * @param config.include - Related records to include (for findMany)
   * @param config.version - Expected version for update (optional, uses state if not provided)
   * @param config.hardDelete - If true, permanently delete; otherwise soft delete
   * @returns EdgeMap with appropriate edge based on operation result
   */
  async execute(
    context: ExecutionContext,
    config?: Record<string, unknown>
  ): Promise<EdgeMap> {
    const {
      operation,
      tableId,
      recordId,
      data,
      filter,
      orderBy,
      limit,
      offset,
      include,
      version,
      hardDelete,
    } = config || {};

    // Get service from context.state._services (injected by WorkflowService)
    const flexRecordService = (
      context.state._services as { flexRecord?: FlexRecordServiceInterface }
    )?.flexRecord;

    if (!flexRecordService) {
      return {
        error: () => ({
          error: 'FlexRecordService not available. Ensure workflow is executed via WorkflowService.',
          code: 'SERVICE_UNAVAILABLE',
        }),
      };
    }

    try {
      switch (operation) {
        case 'insert':
          return await this.handleInsert(
            context,
            flexRecordService,
            tableId as string | undefined,
            data as Record<string, unknown> | undefined
          );

        case 'findOne':
          return await this.handleFindOne(
            context,
            flexRecordService,
            recordId as string | undefined
          );

        case 'findMany':
          return await this.handleFindMany(
            context,
            flexRecordService,
            tableId as string | undefined,
            filter as Record<string, unknown> | undefined,
            orderBy as Array<{ field: string; direction: 'asc' | 'desc' }> | undefined,
            limit as number | undefined,
            offset as number | undefined,
            include as Array<{ relation: string }> | undefined
          );

        case 'update':
          return await this.handleUpdate(
            context,
            flexRecordService,
            recordId as string | undefined,
            data as Record<string, unknown> | undefined,
            version as number | undefined
          );

        case 'delete':
          return await this.handleDelete(
            context,
            flexRecordService,
            recordId as string | undefined,
            hardDelete as boolean | undefined
          );

        default:
          return {
            error: () => ({
              error: `Unknown operation: ${operation}. Valid operations: insert, findOne, findMany, update, delete`,
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
   * Handle record insert operation
   *
   * @param context - Execution context
   * @param service - FlexRecord service instance
   * @param tableId - Table ID to insert into
   * @param data - Record data
   * @returns EdgeMap with success or error edge
   */
  private async handleInsert(
    context: ExecutionContext,
    service: FlexRecordServiceInterface,
    tableId: string | undefined,
    data: Record<string, unknown> | undefined
  ): Promise<EdgeMap> {
    // Resolve tableId from state if not in config
    const resolvedTableId =
      tableId || (context.state.flexTableId as string | undefined);

    if (!resolvedTableId) {
      return {
        error: () => ({
          error: 'tableId is required for insert operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        error: () => ({
          error: 'data object is required for insert operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Call service
    const result = await service.insertRecord(
      resolvedTableId,
      data,
      context.state.userId as string | undefined
    );

    if (!result.success) {
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
    context.state.flexRecord = result.data;
    context.state.flexRecordId = result.data!.id;

    return {
      success: () => ({
        record: result.data,
        recordId: result.data!.id,
        version: result.data!.version,
      }),
    };
  }

  /**
   * Handle find one record operation
   *
   * @param context - Execution context
   * @param service - FlexRecord service instance
   * @param recordId - Record ID to find
   * @returns EdgeMap with found, not_found, or error edge
   */
  private async handleFindOne(
    context: ExecutionContext,
    service: FlexRecordServiceInterface,
    recordId: string | undefined
  ): Promise<EdgeMap> {
    // Resolve recordId from state if not in config
    const resolvedRecordId =
      recordId || (context.state.flexRecordId as string | undefined);

    if (!resolvedRecordId) {
      return {
        error: () => ({
          error: 'recordId is required for findOne operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Call service
    const result = await service.findOne(resolvedRecordId);

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
    context.state.flexRecord = result.data;
    context.state.flexRecordId = result.data!.id;

    return {
      found: () => ({
        record: result.data,
        recordId: result.data!.id,
        version: result.data!.version,
      }),
    };
  }

  /**
   * Handle find many records operation
   *
   * @param context - Execution context
   * @param service - FlexRecord service instance
   * @param tableId - Table ID to query
   * @param filter - Filter conditions
   * @param orderBy - Sort order
   * @param limit - Max records
   * @param offset - Records to skip
   * @param include - Related records to include
   * @returns EdgeMap with success, empty, or error edge
   */
  private async handleFindMany(
    context: ExecutionContext,
    service: FlexRecordServiceInterface,
    tableId: string | undefined,
    filter: Record<string, unknown> | undefined,
    orderBy: Array<{ field: string; direction: 'asc' | 'desc' }> | undefined,
    limit: number | undefined,
    offset: number | undefined,
    include: Array<{ relation: string }> | undefined
  ): Promise<EdgeMap> {
    // Resolve tableId from state if not in config
    const resolvedTableId =
      tableId || (context.state.flexTableId as string | undefined);

    if (!resolvedTableId) {
      return {
        error: () => ({
          error: 'tableId is required for findMany operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Build query params
    const params: FlexQueryParams = {
      tableId: resolvedTableId,
      filter,
      orderBy,
      limit: limit ?? 50,
      offset: offset ?? 0,
      include,
    };

    // Call service
    const result = await service.findMany(params);

    if (!result.success) {
      context.state.error = result.error;
      context.state.errorCode = result.code;
      return {
        error: () => ({
          error: result.error,
          code: result.code,
        }),
      };
    }

    const records = result.data!;

    // Store in context state for downstream nodes
    context.state.flexRecords = records;
    context.state.flexRecordCount = records.length;

    // Return empty edge if no records found
    if (records.length === 0) {
      return {
        empty: () => ({
          records: [],
          count: 0,
        }),
      };
    }

    return {
      success: () => ({
        records,
        count: records.length,
      }),
    };
  }

  /**
   * Handle record update operation
   *
   * @param context - Execution context
   * @param service - FlexRecord service instance
   * @param recordId - Record ID to update
   * @param data - Fields to update
   * @param expectedVersion - Expected version for optimistic locking
   * @returns EdgeMap with success, conflict, not_found, or error edge
   */
  private async handleUpdate(
    context: ExecutionContext,
    service: FlexRecordServiceInterface,
    recordId: string | undefined,
    data: Record<string, unknown> | undefined,
    expectedVersion: number | undefined
  ): Promise<EdgeMap> {
    // Resolve recordId from state if not in config
    const resolvedRecordId =
      recordId || (context.state.flexRecordId as string | undefined);

    if (!resolvedRecordId) {
      return {
        error: () => ({
          error: 'recordId is required for update operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        error: () => ({
          error: 'data object is required for update operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Get version from config or from state (from a previous findOne)
    const version =
      expectedVersion ??
      (context.state.flexRecord as FlexRecord | undefined)?.version;

    if (version === undefined) {
      return {
        error: () => ({
          error:
            'version is required for update operation. Provide it in config or use findOne first.',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Call service
    const result = await service.updateRecord(resolvedRecordId, data, version);

    if (!result.success) {
      context.state.error = result.error;
      context.state.errorCode = result.code;

      if (result.code === 'CONFLICT') {
        return {
          conflict: () => ({
            error: result.error,
            code: result.code,
          }),
        };
      }

      if (result.code === 'NOT_FOUND') {
        return {
          not_found: () => ({
            error: result.error,
            code: result.code,
          }),
        };
      }

      return {
        error: () => ({
          error: result.error,
          code: result.code,
        }),
      };
    }

    // Store in context state for downstream nodes
    context.state.flexRecord = result.data;
    context.state.flexRecordId = result.data!.id;

    return {
      success: () => ({
        record: result.data,
        recordId: result.data!.id,
        version: result.data!.version,
      }),
    };
  }

  /**
   * Handle record delete operation
   *
   * @param context - Execution context
   * @param service - FlexRecord service instance
   * @param recordId - Record ID to delete
   * @param hardDelete - If true, permanently delete
   * @returns EdgeMap with success, not_found, or error edge
   */
  private async handleDelete(
    context: ExecutionContext,
    service: FlexRecordServiceInterface,
    recordId: string | undefined,
    hardDelete: boolean | undefined
  ): Promise<EdgeMap> {
    // Resolve recordId from state if not in config
    const resolvedRecordId =
      recordId || (context.state.flexRecordId as string | undefined);

    if (!resolvedRecordId) {
      return {
        error: () => ({
          error: 'recordId is required for delete operation',
          code: 'VALIDATION_ERROR',
        }),
      };
    }

    // Call service
    const result = await service.deleteRecord(resolvedRecordId, hardDelete ?? false);

    if (!result.success) {
      context.state.error = result.error;
      context.state.errorCode = result.code;

      if (result.code === 'NOT_FOUND') {
        return {
          not_found: () => ({
            error: result.error,
            code: result.code,
          }),
        };
      }

      return {
        error: () => ({
          error: result.error,
          code: result.code,
        }),
      };
    }

    // Store in context state
    context.state.deleted = true;

    return {
      success: () => ({
        deleted: true,
      }),
    };
  }
}

export default FlexRecordNode;
