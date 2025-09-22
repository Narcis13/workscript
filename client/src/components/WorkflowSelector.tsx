import { useState, useEffect } from 'react';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
}

interface WorkflowSelectorProps {
  selectedWorkflowId?: string;
  onWorkflowSelect: (workflowId: string) => void;
  className?: string;
  placeholder?: string;
}

export function WorkflowSelector({ 
  selectedWorkflowId, 
  onWorkflowSelect, 
  className = "",
  placeholder = "Selectează un workflow..."
}: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3013/workflows/all');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.workflows)) {
        setWorkflows(data.workflows);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.warn('Failed to fetch workflows from API, using mock data:', err);
      // Fallback to mock data
      setWorkflows([
        { id: '1', name: 'Email Notification Workflow', description: 'Send automated emails', version: '1.0.0' },
        { id: '2', name: 'Data Processing Workflow', description: 'Process incoming data', version: '1.2.0' },
        { id: '3', name: 'Report Generation Workflow', description: 'Generate monthly reports', version: '2.0.0' },
        { id: '4', name: 'Contact Management Workflow', description: 'Manage contact information', version: '1.1.0' },
        { id: '5', name: 'File Processing Workflow', description: 'Process uploaded files', version: '1.0.0' }
      ]);
      setError(null); // Clear error since we have fallback data
    } finally {
      setLoading(false);
    }
  };

  const selectedWorkflow = Array.isArray(workflows) 
    ? workflows.find(w => w.id === selectedWorkflowId) 
    : undefined;

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedWorkflowId || ''}
        onChange={(e) => onWorkflowSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        disabled={loading}
      >
        <option value="">{loading ? 'Se încarcă...' : placeholder}</option>
        {Array.isArray(workflows) && workflows.map((workflow) => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.name} (v{workflow.version})
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">
          Eroare la încărcarea workflow-urilor: {error}
        </p>
      )}
      
      {selectedWorkflow && selectedWorkflow.description && (
        <p className="mt-1 text-sm text-gray-500">
          {selectedWorkflow.description}
        </p>
      )}
    </div>
  );
}