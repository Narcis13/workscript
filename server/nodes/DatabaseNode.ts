import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

export class DatabaseNode extends WorkflowNode {
  metadata = {
    id: 'database',
    name: 'Database Operations',
    version: '1.0.0',
    description: 'Server-specific database operations - mock database for demonstration',
    inputs: ['operation', 'table', 'data', 'query'],
    outputs: ['result', 'found', 'not_found']
  };

  private static mockDB: Map<string, Map<string, any>> = new Map();

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, table, data, query } = context.inputs;
    
    if (!operation || !table) {
      return {
        error: () => ({ error: 'Missing operation or table' })
      };
    }

    try {
      // Ensure table exists
      if (!DatabaseNode.mockDB.has(table)) {
        DatabaseNode.mockDB.set(table, new Map());
      }
      
      const tableData = DatabaseNode.mockDB.get(table)!;

      switch (operation) {
        case 'insert': {
          if (!data || !data.id) {
            return {
              error: () => ({ error: 'Missing data or id for insert operation' })
            };
          }
          
          tableData.set(data.id, { ...data, createdAt: new Date().toISOString() });
          context.state.dbInserted = { table, id: data.id };
          
          return {
            success: () => ({ inserted: data.id, table })
          };
        }
        
        case 'find': {
          if (!data || !data.id) {
            return {
              error: () => ({ error: 'Missing data or id for find operation' })
            };
          }
          
          const record = tableData.get(data.id);
          if (record) {
            context.state.dbRecord = record;
            return {
              found: () => ({ record, table })
            };
          } else {
            return {
              not_found: () => ({ id: data.id, table })
            };
          }
        }
        
        case 'update': {
          if (!data || !data.id) {
            return {
              error: () => ({ error: 'Missing data or id for update operation' })
            };
          }
          
          const existing = tableData.get(data.id);
          if (!existing) {
            return {
              not_found: () => ({ id: data.id, table })
            };
          }
          
          const updated = { 
            ...existing, 
            ...data, 
            updatedAt: new Date().toISOString() 
          };
          tableData.set(data.id, updated);
          context.state.dbUpdated = { table, id: data.id };
          
          return {
            success: () => ({ updated: data.id, table })
          };
        }
        
        case 'delete': {
          if (!data || !data.id) {
            return {
              error: () => ({ error: 'Missing data or id for delete operation' })
            };
          }
          
          const deleted = tableData.delete(data.id);
          if (deleted) {
            context.state.dbDeleted = { table, id: data.id };
            return {
              success: () => ({ deleted: data.id, table })
            };
          } else {
            return {
              not_found: () => ({ id: data.id, table })
            };
          }
        }
        
        case 'list': {
          const records = Array.from(tableData.entries()).map(([id, record]) => ({
            id,
            ...record
          }));
          
          context.state.dbRecords = records;
          return {
            success: () => ({ records, count: records.length, table })
          };
        }
        
        default:
          return {
            error: () => ({ error: `Unknown operation: ${operation}` })
          };
      }
    } catch (error) {
      return {
        error: () => ({ 
          error: error instanceof Error ? error.message : 'Database operation failed',
          operation,
          table
        })
      };
    }
  }
}