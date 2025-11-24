import { useState, useCallback } from 'react';
import type { WorkflowDefinition, ValidationResult } from '@workscript/engine';
import { executeWorkflow, validateWorkflow } from '../services/api/workflows.api';

export interface UseWorkflowServiceResult {
  /** Whether a workflow is currently executing */
  loading: boolean;
  /** Execution error if any */
  error: Error | null;
  /** Execute a workflow via API with loading state management */
  executeWorkflow: (workflow: WorkflowDefinition) => Promise<unknown>;
  /** Validate a workflow via API */
  validateWorkflow: (workflow: unknown) => Promise<ValidationResult | null>;
}

/**
 * React hook for executing workflows via the API server
 *
 * This hook replaces the old ClientWorkflowService with API-based workflow execution.
 * All workflows are now executed server-side for consistency and security.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     loading,
 *     error,
 *     executeWorkflow,
 *     validateWorkflow
 *   } = useWorkflowService();
 *
 *   const handleExecute = async () => {
 *     const workflow = { ... };
 *     const result = await executeWorkflow(workflow);
 *     console.log(result);
 *   };
 *
 *   if (loading) return <div>Executing workflow...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <button onClick={handleExecute}>Run Workflow</button>;
 * }
 * ```
 */
export function useWorkflowService(): UseWorkflowServiceResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Execute workflow via API with loading state
  const executeWorkflowWrapper = useCallback(async (workflow: WorkflowDefinition) => {
    setLoading(true);
    setError(null);

    try {
      const result = await executeWorkflow(workflow);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Workflow execution failed');
      setError(error);
      console.error('Workflow execution error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate workflow via API
  const validateWorkflowWrapper = useCallback(async (workflow: unknown): Promise<ValidationResult | null> => {
    try {
      const result = await validateWorkflow(workflow as WorkflowDefinition);
      return result;
    } catch (err) {
      console.error('Workflow validation error:', err);
      return {
        valid: false,
        errors: [{
          path: '/',
          message: err instanceof Error ? err.message : 'Validation failed',
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }, []);

  return {
    loading,
    error,
    executeWorkflow: executeWorkflowWrapper,
    validateWorkflow: validateWorkflowWrapper
  };
}

/**
 * Hook for workflow service status (for backwards compatibility)
 * Returns loading and error state
 *
 * @example
 * ```tsx
 * function StatusComponent() {
 *   const { loading, error } = useWorkflowServiceStatus();
 *
 *   if (loading) return <div>Executing workflow...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <div>Ready to execute workflows</div>;
 * }
 * ```
 */
export function useWorkflowServiceStatus() {
  const { loading, error } = useWorkflowService();
  return { loading, error, initialized: true };
}
