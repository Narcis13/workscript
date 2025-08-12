import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

interface LocalStorageNodeConfig {
  operation?: string;
  key?: string;
  value?: string;
}

export class LocalStorageNode extends WorkflowNode {
  metadata = {
    id: 'localStorage',
    name: 'Local Storage Operations',
    version: '1.0.0',
    description: 'Browser-specific local storage operations - store and retrieve data in browser',
    inputs: ['operation', 'key', 'value'],
    outputs: ['result', 'found', 'not_found']
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { operation, key, value } = (config as LocalStorageNodeConfig) || {};
    
    if (!operation || !key) {
      return {
        error: () => ({ error: 'Missing operation or key' })
      };
    }

    // Check if we're in a browser environment
    if (typeof localStorage === 'undefined') {
      return {
        error: () => ({ error: 'localStorage is not available in this environment' })
      };
    }

    try {
      switch (operation) {
        case 'set': {
          if (value === undefined) {
            return {
              error: () => ({ error: 'Missing value for set operation' })
            };
          }
          
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, stringValue);
          context.state.localStorageSet = { key, value: stringValue };
          
          return {
            success: () => ({ key, value: stringValue })
          };
        }
        
        case 'get': {
          const storedValue = localStorage.getItem(key);
          if (storedValue !== null) {
            // Try to parse as JSON, fallback to string
            let parsedValue;
            try {
              parsedValue = JSON.parse(storedValue);
            } catch {
              parsedValue = storedValue;
            }
            
            context.state.localStorageValue = parsedValue;
            return {
              found: () => ({ key, value: parsedValue })
            };
          } else {
            return {
              not_found: () => ({ key })
            };
          }
        }
        
        case 'remove': {
          const existed = localStorage.getItem(key) !== null;
          localStorage.removeItem(key);
          context.state.localStorageRemoved = { key, existed };
          
          return {
            success: () => ({ key, existed })
          };
        }
        
        case 'clear': {
          const itemCount = localStorage.length;
          localStorage.clear();
          context.state.localStorageCleared = itemCount;
          
          return {
            success: () => ({ itemsCleared: itemCount })
          };
        }
        
        case 'keys': {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key !== null) keys.push(key);
          }
          
          context.state.localStorageKeys = keys;
          return {
            success: () => ({ keys, count: keys.length })
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
          error: error instanceof Error ? error.message : 'localStorage operation failed',
          operation,
          key
        })
      };
    }
  }
}