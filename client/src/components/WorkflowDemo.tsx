import { useState } from 'react';
import type { WorkflowDefinition } from 'shared';
import { Button } from './ui/button';
import { useWorkflowService } from '../hooks/useWorkflowService';

export function WorkflowDemo() {
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  
  // Use the new workflow service hook for automatic node discovery and service management
  const { 
    service, 
    loading: serviceLoading, 
    error: serviceError, 
    initialized,
    executeWorkflow: executeWorkflowService,
    getServiceInfo
  } = useWorkflowService();

  const executeWorkflow = async () => {
    if (!service || !initialized) {
      setResult({ 
        error: 'Workflow service not initialized',
        status: 'failed'
      });
      return;
    }

    setLoading(true);
    try {

      const workflowDefinition: WorkflowDefinition = {
        id: 'client-demo',
        name: 'Client Workflow Demo',
        version: '1.0.0',
        description: 'Demo workflow running in browser with client nodes',
        workflow: [
          {
            'fetch': {
              url: 'http://localhost:3000/hello'
            }
          },
          'log-input'
        ]
      };

      // Execute workflow using the service (no manual engine setup needed!)
      const executionResult = await executeWorkflowService(workflowDefinition);
      
      setResult(executionResult);
    } catch (error) {
      setResult({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while service initializes
  if (serviceLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-4">Client Workflow Engine Demo</h2>
        <div className="flex items-center gap-2 mb-6">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Initializing workflow service...</span>
        </div>
      </div>
    );
  }

  // Show error state if service failed to initialize
  if (serviceError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-4">Client Workflow Engine Demo</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Service Initialization Error:</strong>
          <span className="block sm:inline"> {serviceError.message}</span>
        </div>
      </div>
    );
  }

  // Get service information for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceInfo = getServiceInfo() as any;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Client Workflow Engine Demo</h2>
      <p className="mb-4 text-gray-600">
        This demonstrates the shared workflow engine running in the browser with automatic client node discovery.
      </p>
      
      {/* Service Status Display */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Service Status:</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>✅ Service initialized: {initialized ? 'Yes' : 'No'}</div>
          <div>📦 Total nodes registered: {serviceInfo.totalNodes}</div>
          <div>🌐 Universal nodes: {serviceInfo.universalNodes}</div>
          <div>💻 Client nodes: {serviceInfo.clientNodes}</div>
          <div>
            Available nodes: {' '}
            {service?.getAvailableNodes().map(n => n.id).join(', ') || 'None'}
          </div>
        </div>
      </div>
      
      <Button 
        onClick={executeWorkflow} 
        disabled={loading || !initialized}
        className="mb-6"
      >
        {loading ? 'Executing...' : 'Run Client Workflow'}
      </Button>

      {result && (
        <div className="bg-gray-100 p-4 rounded-md">
          <h3 className="font-bold mb-2">Execution Result:</h3>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}