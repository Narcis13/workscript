/**
 * Client package exports
 * 
 * This file exports the main services and utilities from the client package
 * for use within the monorepo or for potential external consumption.
 */

// Core service and hook exports
export { ClientWorkflowService } from './services/ClientWorkflowService';
export { 
  useWorkflowService, 
  useWorkflowServiceInstance,
  useWorkflowServiceStatus,
  type UseWorkflowServiceResult 
} from './hooks/useWorkflowService';

// Client nodes (re-export from nodes index)
export * from '../nodes';

// UI Components (for potential reuse across the monorepo)
export { Button } from './components/ui/button';
export { WorkflowDemo } from './components/WorkflowDemo';

// Types (if any client-specific types are needed)
// Add client-specific types here as they are developed