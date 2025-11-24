import { useState } from 'react';
import type { WorkflowDefinition } from '@workscript/engine';
import { Button } from './ui/button';
import { useWorkflowService } from '../hooks/useWorkflowService';

export function WorkflowDemo() {
  const [result, setResult] = useState<unknown>(null);

  // Use the workflow service hook for API-based workflow execution
  const {
    loading,
    error: serviceError,
    executeWorkflow: executeWorkflowService,
  } = useWorkflowService();

  const executeWorkflow = async () => {
    try {
      const workflowDefinition: WorkflowDefinition = {
        id: 'api-demo',
        name: 'API Workflow Demo',
        version: '1.0.0',
        description: 'Demo workflow running on the API server',
        initialState: {
          developer: 'Narcis Brindusescu'
        },
        workflow: [
          'empty',
          'log-input',
          {'$.author': {'name': 'Narcis Brindusescu'}},
          'log'
        ]
      };

      // Execute workflow via API
      const executionResult = await executeWorkflowService(workflowDefinition);

      setResult(executionResult);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    }
  };

  // Show error state if service encountered an error
  if (serviceError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-4">Server Workflow Engine Demo</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Execution Error:</strong>
          <span className="block sm:inline"> {serviceError.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Server Workflow Engine Demo</h2>
      <p className="mb-4 text-gray-600">
        This demonstrates workflows executing on the API server. All workflow execution
        happens server-side for consistency and security.
      </p>

      {/* Service Status Display */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Execution Mode:</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>✅ API-based workflow execution</div>
          <div>🔒 Server-side processing for security</div>
          <div>🌐 All nodes available on server</div>
        </div>
      </div>

      <Button
        onClick={executeWorkflow}
        disabled={loading}
        className="mb-6"
      >
        {loading ? 'Executing on server...' : 'Run Server Workflow'}
      </Button>

      {result !== null && (
        <div className="bg-gray-100 p-4 rounded-md">
          <h3 className="font-bold mb-2">Execution Result:</h3>
          <pre className="text-sm overflow-auto max-h-96">
            {typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
