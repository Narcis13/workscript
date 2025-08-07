import { useState } from 'react';
import { 
  ExecutionEngine, 
  WorkflowParser, 
  StateManager, 
  NodeRegistry,
  type WorkflowDefinition 
} from 'shared';
import { Button } from './ui/button';

export function WorkflowDemo() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const executeWorkflow = async () => {
    setLoading(true);
    try {
      // Initialize workflow engine in browser
      const registry = new NodeRegistry();
      const stateManager = new StateManager();
      const parser = new WorkflowParser(registry);
      const engine = new ExecutionEngine(registry, stateManager);

      // Discover client-specific nodes
      await registry.discoverFromPackages('client');

      const workflowDefinition: WorkflowDefinition = {
        id: 'client-demo',
        name: 'Client Workflow Demo',
        version: '1.0.0',
        description: 'Demo workflow running in browser with client nodes',
        workflow: [
          {
            localStorage: {
              operation: 'set',
              key: 'demo-key',
              value: 'Hello from workflow!',
              'success?': 'localStorage'
            }
          },
          {
            localStorage: {
              operation: 'get', 
              key: 'demo-key'
            }
          }
        ]
      };

      // Parse and execute workflow
      const parsedWorkflow = parser.parse(workflowDefinition);
      const executionResult = await engine.execute(parsedWorkflow);
      
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Client Workflow Engine Demo</h2>
      <p className="mb-6 text-gray-600">
        This demonstrates the shared workflow engine running in the browser with client-specific nodes.
      </p>
      
      <Button 
        onClick={executeWorkflow} 
        disabled={loading}
        className="mb-6"
      >
        {loading ? 'Executing...' : 'Run Client Workflow'}
      </Button>

      {result && (
        <div className="bg-gray-100 p-4 rounded-md">
          <h3 className="font-bold mb-2">Execution Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}