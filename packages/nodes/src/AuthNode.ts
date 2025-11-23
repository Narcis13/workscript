import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
import crypto from 'crypto';

export class AuthNode extends WorkflowNode {
  metadata = {
    id: 'auth',
    name: 'Authentication Operations',
    version: '1.0.0',
    description: 'Server-specific authentication operations - hash passwords, validate tokens, etc.',
    inputs: ['operation', 'data', 'secret'],
    outputs: ['result', 'valid', 'invalid'],
    ai_hints: {
      purpose: 'Perform cryptographic operations for authentication (hashing, token generation, signature verification)',
      when_to_use: 'When you need to hash passwords, verify credentials, generate tokens, or sign/verify data in server environments',
      expected_edges: ['success', 'error', 'valid', 'invalid'],
      example_usage: '{"auth-1": {"operation": "hash", "data": "password123", "success?": "store-hash"}}',
      example_config: '{"operation": "hash|verify|generate_token|sign|verify_signature", "data": "string|object", "secret?": "string"}',
      get_from_state: [],
      post_to_state: ['hashedPassword', 'authValid', 'authToken', 'signature', 'signatureValid']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, data, secret } = config || {};
    
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

export default AuthNode;