import { useState, useEffect, useCallback } from 'react';
import { ClientWorkflowService } from '../services/ClientWorkflowService';
import type { WorkflowDefinition, ValidationResult } from 'shared';

export interface UseWorkflowServiceResult {
  /** The initialized workflow service instance */
  service: ClientWorkflowService | null;
  /** Whether the service is currently initializing */
  loading: boolean;
  /** Initialization error if any */
  error: Error | null;
  /** Whether the service has been successfully initialized */
  initialized: boolean;
  /** Execute a workflow with loading state management */
  executeWorkflow: (workflow: WorkflowDefinition) => Promise<unknown>;
  /** Validate a workflow */
  validateWorkflow: (workflow: unknown) => ValidationResult | null;
  /** Check if a node is available */
  hasNode: (nodeId: string) => boolean;
  /** Get available nodes */
  getAvailableNodes: () => unknown[];
  /** Get service information */
  getServiceInfo: () => unknown;
  /** Force re-initialization of the service */
  reinitialize: () => Promise<void>;
}

/**
 * React hook for easy integration with ClientWorkflowService
 * 
 * Handles async initialization, loading states, and provides
 * convenient methods for workflow operations in React components.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     service, 
 *     loading, 
 *     error, 
 *     executeWorkflow, 
 *     validateWorkflow 
 *   } = useWorkflowService();
 * 
 *   const handleExecute = async () => {
 *     if (!service) return;
 *     
 *     const workflow = { ... };
 *     const result = await executeWorkflow(workflow);
 *     console.log(result);
 *   };
 * 
 *   if (loading) return <div>Loading workflow service...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 * 
 *   return <button onClick={handleExecute}>Run Workflow</button>;
 * }
 * ```
 */
export function useWorkflowService(): UseWorkflowServiceResult {
  const [service, setService] = useState<ClientWorkflowService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize the service
  const initializeService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const serviceInstance = await ClientWorkflowService.getInstance();
      setService(serviceInstance);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize workflow service');
      setError(error);
      console.error('useWorkflowService initialization error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeService();
  }, [initializeService]);

  // Execute workflow with loading state
  const executeWorkflow = useCallback(async (workflow: WorkflowDefinition) => {
    if (!service) {
      throw new Error('Workflow service not initialized');
    }

    try {
      return await service.executeWorkflow(workflow);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Workflow execution failed');
      console.error('Workflow execution error:', error);
      throw error;
    }
  }, [service]);

  // Validate workflow
  const validateWorkflow = useCallback((workflow: unknown): ValidationResult | null => {
    if (!service) {
      return null;
    }

    try {
      return service.validateWorkflow(workflow);
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
  }, [service]);

  // Check if node is available
  const hasNode = useCallback((nodeId: string): boolean => {
    return service?.hasNode(nodeId) ?? false;
  }, [service]);

  // Get available nodes
  const getAvailableNodes = useCallback(() => {
    return service?.getAvailableNodes() ?? [];
  }, [service]);

  // Get service information
  const getServiceInfo = useCallback(() => {
    return service?.getServiceInfo() ?? {
      initialized: false,
      totalNodes: 0,
      universalNodes: 0,
      clientNodes: 0,
      environment: 'client' as const,
      browser: typeof window !== 'undefined'
    };
  }, [service]);

  // Reinitialize service
  const reinitialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setService(null);
      const newService = await ClientWorkflowService.reinitialize();
      setService(newService);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reinitialize workflow service');
      setError(error);
      console.error('Service reinitialization error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    service,
    loading,
    error,
    initialized: service !== null && !loading && error === null,
    executeWorkflow,
    validateWorkflow,
    hasNode,
    getAvailableNodes,
    getServiceInfo,
    reinitialize
  };
}

/**
 * Hook for getting just the service instance (without extra utilities)
 * Useful when you only need the raw service instance
 * 
 * @example
 * ```tsx
 * function SimpleComponent() {
 *   const service = useWorkflowServiceInstance();
 *   
 *   if (!service) return <div>Loading...</div>;
 *   
 *   return <button onClick={() => service.getServiceInfo()}>
 *     Get Info
 *   </button>;
 * }
 * ```
 */
export function useWorkflowServiceInstance(): ClientWorkflowService | null {
  const { service } = useWorkflowService();
  return service;
}

/**
 * Hook for workflow service initialization status
 * Useful for showing loading states or initialization errors
 * 
 * @example
 * ```tsx
 * function StatusComponent() {
 *   const { loading, error, initialized } = useWorkflowServiceStatus();
 *   
 *   if (loading) return <div>Initializing workflow engine...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (initialized) return <div>Workflow engine ready!</div>;
 *   
 *   return null;
 * }
 * ```
 */
export function useWorkflowServiceStatus() {
  const { loading, error, initialized, getServiceInfo } = useWorkflowService();
  return { loading, error, initialized, getServiceInfo };
}