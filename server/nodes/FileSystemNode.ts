import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
import fs from 'fs/promises';
import path from 'path';

export class FileSystemNode extends WorkflowNode {
  metadata = {
    id: 'filesystem',
    name: 'File System Operations',
    version: '1.0.0',
    description: 'Server-specific file system operations - read, write, and manage files',
    inputs: ['operation', 'path', 'content'],
    outputs: ['result', 'content', 'exists']
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, path: filePath, content } = config || {};
    
    if (!operation || !filePath) {
      return {
        error: () => ({ error: 'Missing operation or path' })
      };
    }

    try {
      switch (operation) {
        case 'read': {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          context.state.fileContent = fileContent;
          return {
            success: () => ({ content: fileContent })
          };
        }
        
        case 'write': {
          if (content === undefined) {
            return {
              error: () => ({ error: 'Missing content for write operation' })
            };
          }
          await fs.writeFile(filePath, content, 'utf-8');
          context.state.fileWritten = filePath;
          return {
            success: () => ({ path: filePath })
          };
        }
        
        case 'exists': {
          try {
            await fs.access(filePath);
            context.state.fileExists = true;
            return {
              exists: () => ({ exists: true, path: filePath })
            };
          } catch {
            context.state.fileExists = false;
            return {
              not_exists: () => ({ exists: false, path: filePath })
            };
          }
        }
        
        case 'delete': {
          await fs.unlink(filePath);
          context.state.fileDeleted = filePath;
          return {
            success: () => ({ path: filePath })
          };
        }
        
        case 'mkdir': {
          await fs.mkdir(filePath, { recursive: true });
          context.state.dirCreated = filePath;
          return {
            success: () => ({ path: filePath })
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
          error: error instanceof Error ? error.message : 'File system operation failed',
          operation,
          path: filePath
        })
      };
    }
  }
}

export default FileSystemNode;