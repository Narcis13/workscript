import { useState } from 'react';
import type { WorkflowDefinition } from 'shared';
import { Button } from './ui/button';
import { useWorkflowService } from '../hooks/useWorkflowService';

export function AdvancedWorkflowDemo() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Use the new workflow service hook for automatic node discovery and service management
  const { 
    service, 

    initialized,
    executeWorkflow: executeWorkflowService,
   
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
        description: 'Demo workflow that creates a container and renders a button inside it',
        workflow: [
          {
            'container': {
              containerId: 'my-workflow-container',
              className: 'custom-container-class',
              'rendered?': [{
                        'button': {
                          caption: 'Click Me!',
                          variant: 'default',
                          size: 'lg',
                          onClick:['log-input', 'empty']
                        }
                        },
                        {
                        'button': {
                          caption: 'Another one!',
                          variant: 'default',
                          size: 'lg'
                        }
                        }
                      ]
            }
          }//,
       //    'log-input',
       //   'empty'
          
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



  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Advanced Client Workflow </h2>
      
      
      <Button 
        onClick={executeWorkflow} 
        disabled={loading || !initialized}
        className="mb-6"
      >
        {loading ? 'Executing...' : 'Run Container Workflow'}
      </Button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Workflow Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div id="advanced-workflow-demo" className="mt-6"></div>
    </div>
  );
}