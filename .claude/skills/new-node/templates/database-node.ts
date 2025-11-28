/**
 * Database Node Template
 *
 * Pattern: success/found/empty/error
 * Use case: Database queries and operations (select, insert, update, delete)
 *
 * INSTRUCTIONS:
 * 1. Replace [NodeName] with your node class name (PascalCase)
 * 2. Replace [nodeId] with unique identifier (camelCase or kebab-case)
 * 3. Inject your database client/ORM in constructor or via config
 * 4. Implement actual database operations in helper methods
 * 5. Export in /packages/nodes/src/index.ts
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface
interface [NodeName]Config {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'count';
  table: string;
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

// Placeholder for your database client type
// Replace with your actual DB client (Drizzle, Prisma, etc.)
interface DatabaseClient {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
}

/**
 * [NodeName] - Performs database operations
 *
 * Executes database queries (select, insert, update, delete, count)
 * with parameterized queries to prevent SQL injection.
 *
 * @example
 * ```json
 * {
 *   "[nodeId]-1": {
 *     "operation": "select",
 *     "table": "users",
 *     "where": { "status": "active" },
 *     "orderBy": [{ "field": "created_at", "direction": "desc" }],
 *     "limit": 10,
 *     "found?": "process-users",
 *     "empty?": "no-users",
 *     "error?": "db-error"
 *   }
 * }
 * ```
 */
export class [NodeName] extends WorkflowNode {
  // Inject your database client
  private db?: DatabaseClient;

  metadata = {
    id: '[nodeId]',
    name: '[Node Name]',
    version: '1.0.0',
    description: 'Performs database queries and operations',
    inputs: ['operation', 'table', 'data', 'where', 'orderBy', 'limit', 'offset'],
    outputs: ['results', 'affected', 'insertedId'],
    ai_hints: {
      purpose: 'Execute database operations (select, insert, update, delete)',
      when_to_use: 'When you need to query or modify database records',
      expected_edges: ['success', 'found', 'empty', 'error'],
      example_usage: '{"[nodeId]-1": {"operation": "select", "table": "users", "where": {"active": true}, "found?": "process"}}',
      example_config: '{"operation": "select|insert|update|delete|count", "table": "string", "data?": "object", "where?": "object", "limit?": "number"}',
      get_from_state: [],
      post_to_state: ['[nodeId]Results', '[nodeId]Count', '[nodeId]InsertedId', '[nodeId]Affected']
    }
  };

  // Optional: Set database client via constructor
  constructor(db?: DatabaseClient) {
    super();
    this.db = db;
  }

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      operation,
      table,
      data,
      where,
      orderBy,
      limit,
      offset
    } = (config as [NodeName]Config) || {};

    // ============================================
    // VALIDATION
    // ============================================
    if (!operation) {
      return {
        error: () => ({
          error: 'Missing required parameter: operation',
          nodeId: context.nodeId
        })
      };
    }

    if (!table) {
      return {
        error: () => ({
          error: 'Missing required parameter: table',
          nodeId: context.nodeId
        })
      };
    }

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return {
        error: () => ({
          error: `Invalid table name: ${table}`,
          nodeId: context.nodeId
        })
      };
    }

    // ============================================
    // EXECUTE OPERATION
    // ============================================
    try {
      switch (operation) {
        case 'select':
          return await this.executeSelect(context, table, where, orderBy, limit, offset);

        case 'insert':
          if (!data || Object.keys(data).length === 0) {
            return {
              error: () => ({
                error: 'Missing data for insert operation',
                nodeId: context.nodeId
              })
            };
          }
          return await this.executeInsert(context, table, data);

        case 'update':
          if (!data || Object.keys(data).length === 0) {
            return {
              error: () => ({
                error: 'Missing data for update operation',
                nodeId: context.nodeId
              })
            };
          }
          if (!where || Object.keys(where).length === 0) {
            return {
              error: () => ({
                error: 'Missing where clause for update (safety check)',
                nodeId: context.nodeId,
                suggestion: 'Provide a where clause to prevent updating all records'
              })
            };
          }
          return await this.executeUpdate(context, table, data, where);

        case 'delete':
          if (!where || Object.keys(where).length === 0) {
            return {
              error: () => ({
                error: 'Missing where clause for delete (safety check)',
                nodeId: context.nodeId,
                suggestion: 'Provide a where clause to prevent deleting all records'
              })
            };
          }
          return await this.executeDelete(context, table, where);

        case 'count':
          return await this.executeCount(context, table, where);

        default:
          return {
            error: () => ({
              error: `Unknown operation: ${operation}`,
              nodeId: context.nodeId,
              validOperations: ['select', 'insert', 'update', 'delete', 'count']
            })
          };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Database operation failed',
          nodeId: context.nodeId,
          operation,
          table
        })
      };
    }
  }

  // ============================================
  // OPERATION IMPLEMENTATIONS
  // Replace these with your actual DB logic
  // ============================================

  private async executeSelect(
    context: ExecutionContext,
    table: string,
    where?: Record<string, unknown>,
    orderBy?: { field: string; direction: 'asc' | 'desc' }[],
    limit?: number,
    offset?: number
  ): Promise<EdgeMap> {
    // TODO: Replace with your actual database query
    // Example with raw SQL (replace with Drizzle/Prisma/etc.):
    // const results = await this.db.query(
    //   `SELECT * FROM ${table} WHERE ...`,
    //   [params]
    // );

    // Placeholder implementation
    const results: unknown[] = [];

    context.state.[nodeId]Results = results;
    context.state.[nodeId]Count = results.length;

    if (results.length > 0) {
      return {
        found: () => ({
          results,
          count: results.length,
          table
        })
      };
    } else {
      return {
        empty: () => ({
          count: 0,
          table
        })
      };
    }
  }

  private async executeInsert(
    context: ExecutionContext,
    table: string,
    data: Record<string, unknown>
  ): Promise<EdgeMap> {
    // TODO: Replace with your actual insert logic
    // Example:
    // const result = await this.db.insert(table).values(data);
    // const insertedId = result.insertId;

    // Placeholder implementation
    const insertedId = Date.now();

    context.state.[nodeId]InsertedId = insertedId;

    return {
      success: () => ({
        insertedId,
        table,
        data
      })
    };
  }

  private async executeUpdate(
    context: ExecutionContext,
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<EdgeMap> {
    // TODO: Replace with your actual update logic
    // Example:
    // const result = await this.db.update(table).set(data).where(conditions);
    // const affected = result.affectedRows;

    // Placeholder implementation
    const affected = 1;

    context.state.[nodeId]Affected = affected;

    return {
      success: () => ({
        affected,
        table
      })
    };
  }

  private async executeDelete(
    context: ExecutionContext,
    table: string,
    where: Record<string, unknown>
  ): Promise<EdgeMap> {
    // TODO: Replace with your actual delete logic
    // Example:
    // const result = await this.db.delete(table).where(conditions);
    // const deleted = result.affectedRows;

    // Placeholder implementation
    const deleted = 1;

    context.state.[nodeId]Deleted = deleted;

    return {
      success: () => ({
        deleted,
        table
      })
    };
  }

  private async executeCount(
    context: ExecutionContext,
    table: string,
    where?: Record<string, unknown>
  ): Promise<EdgeMap> {
    // TODO: Replace with your actual count logic
    // Example:
    // const result = await this.db.select({ count: count() }).from(table).where(conditions);
    // const total = result[0].count;

    // Placeholder implementation
    const total = 0;

    context.state.[nodeId]Count = total;

    return {
      success: () => ({
        count: total,
        table
      })
    };
  }
}

export default [NodeName];
