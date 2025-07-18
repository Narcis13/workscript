import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ErrorHandler, 
  ErrorCategory, 
  ErrorSeverity, 
  WorkflowError 
} from './ErrorHandler';
import type { ExecutionContext } from 'shared/dist';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: Console;
  
  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      log: vi.fn()
    } as unknown as Console;
    
    errorHandler = new ErrorHandler(mockLogger);
  });
  
  describe('createError', () => {
    it('should create a workflow error with the correct properties', () => {
      const error = errorHandler.createError(
        ErrorCategory.RUNTIME,
        'test_error',
        'Test error message',
        ErrorSeverity.ERROR,
        {
          nodeId: 'test-node',
          executionId: 'test-execution',
          workflowId: 'test-workflow'
        }
      );
      
      expect(error).toMatchObject({
        category: ErrorCategory.RUNTIME,
        code: 'test_error',
        message: 'Test error message',
        severity: ErrorSeverity.ERROR,
        nodeId: 'test-node',
        executionId: 'test-execution',
        workflowId: 'test-workflow'
      });
      
      expect(error.id).toMatch(/^err_/);
      expect(error.timestamp).toBeInstanceOf(Date);
    });
    
    it('should log the error based on severity', () => {
      errorHandler.createError(
        ErrorCategory.RUNTIME,
        'fatal_error',
        'Fatal error message',
        ErrorSeverity.FATAL
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('FATAL ERROR'),
        expect.any(Object),
        undefined
      );
      
      errorHandler.createError(
        ErrorCategory.RUNTIME,
        'warning_error',
        'Warning message',
        ErrorSeverity.WARNING
      );
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING'),
        expect.any(Object)
      );
      
      errorHandler.createError(
        ErrorCategory.RUNTIME,
        'info_error',
        'Info message',
        ErrorSeverity.INFO
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        expect.any(Object)
      );
    });
  });
  
  describe('handleExecutionError', () => {
    it('should handle standard Error objects', () => {
      const context: ExecutionContext = {
        state: {},
        inputs: { test: 'value' },
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };
      
      const standardError = new Error('Standard error');
      const edgeName = errorHandler.handleExecutionError(standardError, context);
      
      expect(edgeName).toBe('error');
      expect(context.state).toHaveProperty('error');
      expect(context.state.error).toMatchObject({
        message: 'Standard error',
        code: 'node_execution_failed',
        category: ErrorCategory.NODE_EXECUTION
      });
    });
    
    it('should handle WorkflowError objects', () => {
      const context: ExecutionContext = {
        state: {},
        inputs: {},
        workflowId: 'test-workflow',
        nodeId: 'test-node',
        executionId: 'test-execution'
      };
      
      const workflowError = errorHandler.createError(
        ErrorCategory.VALIDATION,
        'validation_error',
        'Validation failed'
      );
      
      const edgeName = errorHandler.handleExecutionError(workflowError, context);
      
      expect(edgeName).toBe('error');
      expect(context.state).toHaveProperty('error');
      expect(context.state.error).toMatchObject({
        message: 'Validation failed',
        code: 'validation_error',
        category: ErrorCategory.VALIDATION
      });
    });
    
    it('should handle errors without context', () => {
      const standardError = new Error('No context error');
      const edgeName = errorHandler.handleExecutionError(standardError);
      
      expect(edgeName).toBe('error');
    });
  });
  
  describe('createErrorResponse', () => {
    it('should create a properly formatted API error response', () => {
      const error = errorHandler.createError(
        ErrorCategory.RUNTIME,
        'api_error',
        'API error message',
        ErrorSeverity.ERROR,
        {
          nodeId: 'test-node',
          executionId: 'test-execution'
        }
      );
      
      const response = errorHandler.createErrorResponse(error);
      
      expect(response).toMatchObject({
        success: false,
        error: {
          id: error.id,
          category: ErrorCategory.RUNTIME,
          code: 'api_error',
          message: 'API error message',
          severity: ErrorSeverity.ERROR,
          timestamp: expect.any(String),
          details: {
            nodeId: 'test-node',
            executionId: 'test-execution'
          }
        }
      });
    });
  });
  
  describe('getError and getExecutionErrors', () => {
    it('should retrieve an error by ID', () => {
      const error = errorHandler.createError(
        ErrorCategory.RUNTIME,
        'test_error',
        'Test error message'
      );
      
      const retrievedError = errorHandler.getError(error.id);
      expect(retrievedError).toBe(error);
    });
    
    it('should retrieve all errors for an execution', () => {
      const executionId = 'test-execution';
      
      errorHandler.createError(
        ErrorCategory.RUNTIME,
        'error1',
        'Error 1',
        ErrorSeverity.ERROR,
        { executionId }
      );
      
      errorHandler.createError(
        ErrorCategory.VALIDATION,
        'error2',
        'Error 2',
        ErrorSeverity.WARNING,
        { executionId }
      );
      
      errorHandler.createError(
        ErrorCategory.FLOW_CONTROL,
        'error3',
        'Error 3',
        ErrorSeverity.ERROR,
        { executionId: 'different-execution' }
      );
      
      const executionErrors = errorHandler.getExecutionErrors(executionId);
      
      expect(executionErrors).toHaveLength(2);
      expect(executionErrors[0].code).toBe('error1');
      expect(executionErrors[1].code).toBe('error2');
    });
  });
  
  describe('cleanupExecutionErrors', () => {
    it('should remove all errors for an execution', () => {
      const executionId = 'test-execution';
      
      errorHandler.createError(
        ErrorCategory.RUNTIME,
        'error1',
        'Error 1',
        ErrorSeverity.ERROR,
        { executionId }
      );
      
      errorHandler.createError(
        ErrorCategory.VALIDATION,
        'error2',
        'Error 2',
        ErrorSeverity.WARNING,
        { executionId }
      );
      
      const differentError = errorHandler.createError(
        ErrorCategory.FLOW_CONTROL,
        'error3',
        'Error 3',
        ErrorSeverity.ERROR,
        { executionId: 'different-execution' }
      );
      
      errorHandler.cleanupExecutionErrors(executionId);
      
      expect(errorHandler.getExecutionErrors(executionId)).toHaveLength(0);
      expect(errorHandler.getError(differentError.id)).toBeDefined();
    });
  });
});