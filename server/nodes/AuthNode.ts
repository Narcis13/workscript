import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';
import crypto from 'crypto';

export class AuthNode extends WorkflowNode {
  metadata = {
    id: 'auth',
    name: 'Authentication Operations',
    version: '1.0.0',
    description: 'Server-specific authentication operations - hash passwords, validate tokens, etc.',
    inputs: ['operation', 'data', 'secret'],
    outputs: ['result', 'valid', 'invalid']
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, data, secret } = context.inputs;
    
    if (!operation || !data) {
      return {
        error: () => ({ error: 'Missing operation or data' })
      };
    }

    try {
      switch (operation) {
        case 'hash': {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
          const result = `${salt}:${hash}`;
          context.state.hashedPassword = result;
          return {
            success: () => ({ hash: result, salt })
          };
        }
        
        case 'verify': {
          const { password, hash } = data;
          if (!password || !hash) {
            return {
              error: () => ({ error: 'Missing password or hash for verification' })
            };
          }
          
          const [salt, storedHash] = hash.split(':');
          const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
          const isValid = storedHash === verifyHash;
          
          context.state.authValid = isValid;
          return {
            [isValid ? 'valid' : 'invalid']: () => ({ valid: isValid })
          };
        }
        
        case 'generate_token': {
          const token = crypto.randomBytes(32).toString('hex');
          context.state.authToken = token;
          return {
            success: () => ({ token })
          };
        }
        
        case 'sign': {
          if (!secret) {
            return {
              error: () => ({ error: 'Missing secret for signing operation' })
            };
          }
          
          const signature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
            
          context.state.signature = signature;
          return {
            success: () => ({ signature, data })
          };
        }
        
        case 'verify_signature': {
          const { message, signature, verifySecret } = data;
          if (!message || !signature || !verifySecret) {
            return {
              error: () => ({ error: 'Missing message, signature, or secret for verification' })
            };
          }
          
          const expectedSignature = crypto
            .createHmac('sha256', verifySecret)
            .update(message)
            .digest('hex');
            
          const isValid = expectedSignature === signature;
          context.state.signatureValid = isValid;
          return {
            [isValid ? 'valid' : 'invalid']: () => ({ valid: isValid })
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
          error: error instanceof Error ? error.message : 'Authentication operation failed',
          operation
        })
      };
    }
  }
}