import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (workflowDefinition: string) => void;
}

export function NewWorkflowModal({ isOpen, onClose, onSave }: NewWorkflowModalProps) {
  const [workflowDefinition, setWorkflowDefinition] = useState('{\n  "id": "",\n  "name": "",\n  "version": "1.0.0",\n  "description": "",\n  "workflow": [\n    \n  ]\n}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!workflowDefinition.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Validate JSON format
      const parsedWorkflow = JSON.parse(workflowDefinition);

      // Call the API endpoint
      const response = await fetch('http://localhost:3013/workflows/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedWorkflow)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();

      // Call optional onSave callback if provided
      if (onSave) {
        onSave(workflowDefinition);
      }

      // Reset form and close modal
      setWorkflowDefinition('{\n  "id": "",\n  "name": "",\n  "version": "1.0.0",\n  "description": "",\n  "workflow": [\n    \n  ]\n}');
      onClose();

      // Show success message
      alert('Workflow salvat cu succes în baza de date!');

    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Format JSON invalid. Verifică sintaxa workflow-ului.');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută';
        setError(`Eroare la salvarea workflow-ului: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setWorkflowDefinition('{\n  "id": "",\n  "name": "",\n  "version": "1.0.0",\n  "description": "",\n  "workflow": [\n    \n  ]\n}');
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Workflow nou</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="mb-4">
            <label htmlFor="workflow-definition" className="block text-sm font-medium text-gray-700 mb-2">
              Definiția workflow-ului (JSON)
            </label>
            <textarea
              id="workflow-definition"
              value={workflowDefinition}
              onChange={(e) => setWorkflowDefinition(e.target.value)}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
              placeholder="Introdu definiția workflow-ului în format JSON..."
              spellCheck={false}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p className="mb-1">
              <strong>Exemplu de structură:</strong>
            </p>
            <p>• <code>id</code>: identificator unic pentru workflow</p>
            <p>• <code>name</code>: numele workflow-ului</p>
            <p>• <code>version</code>: versiunea workflow-ului</p>
            <p>• <code>description</code>: descrierea workflow-ului</p>
            <p>• <code>workflow</code>: array cu nodurile workflow-ului</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? 'Se salvează...' : 'Salvează workflow'}
          </button>
        </div>
      </div>
    </div>
  );
}