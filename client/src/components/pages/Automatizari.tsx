import { useState, useEffect } from 'react';
import { WorkflowManager } from '../WorkflowManager';
import { Plus } from 'lucide-react';

interface Automation {
  id: string;
  agencyId: number;
  name: string;
  description?: string;
  triggerType: 'immediate' | 'cron' | 'webhook';
  triggerConfig: {
    cronExpression?: string;
    timezone?: string;
    webhookUrl?: string;
    immediate?: boolean;
  };
  workflowId: string;
  workflowName?: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  successCount: number;
  failureCount: number;
  lastError?: string;
  lastErrorAt?: string;
  updatedAt: string;
}

type TriggerType = 'immediate' | 'cron' | 'webhook';

export function Automatizari() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [executingAutomations, setExecutingAutomations] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    agencyId: 1, // TODO: Get from user context
    name: '',
    description: '',
    triggerType: 'immediate' as TriggerType,
    cronExpression: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    webhookUrl: '',
    workflowId: '',
    enabled: true
  });

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      
      // Use the actual API endpoint
      const agencyId = formData.agencyId; // TODO: Get from user context
      const response = await fetch(`http://localhost:3013/automations?agencyId=${agencyId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch automations: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      setAutomations(data);
    } catch (err) {
      console.error('Failed to fetch automations from API:', err);
      // For development, show empty state instead of mock data
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const automationData = {
      agencyId: formData.agencyId,
      name: formData.name,
      description: formData.description,
      triggerType: formData.triggerType,
      triggerConfig: {
        ...(formData.triggerType === 'cron' && {
          cronExpression: formData.cronExpression,
          timezone: formData.timezone
        }),
        ...(formData.triggerType === 'webhook' && { webhookUrl: formData.webhookUrl }),
        ...(formData.triggerType === 'immediate' && { immediate: true })
      },
      workflowId: formData.workflowId,
      enabled: formData.enabled
    };

    try {
      const url = editingAutomation 
        ? `http://localhost:3013/automations/${editingAutomation.id}`
        : 'http://localhost:3013/automations';
      const method = editingAutomation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automationData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save automation: ${response.status}`);
      }

      await fetchAutomations();
      resetForm();
    } catch (err) {
      console.error('Error saving automation:', err);
      alert(`Eroare la salvarea automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
    }
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      agencyId: automation.agencyId,
      name: automation.name,
      description: automation.description || '',
      triggerType: automation.triggerType,
      cronExpression: automation.triggerConfig.cronExpression || '',
      timezone: automation.triggerConfig.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      webhookUrl: automation.triggerConfig.webhookUrl || '',
      workflowId: automation.workflowId,
      enabled: automation.enabled
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această automatizare?')) return;

    try {
      const response = await fetch(`http://localhost:3013/automations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete automation: ${response.status}`);
      }

      await fetchAutomations();
    } catch (err) {
      console.error('Error deleting automation:', err);
      alert(`Eroare la ștergerea automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`http://localhost:3013/automations/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to toggle automation: ${response.status}`);
      }

      await fetchAutomations();
    } catch (err) {
      console.error('Error toggling automation:', err);
      alert(`Eroare la modificarea stării automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
    }
  };

  const executeAutomation = async (id: string) => {
    try {
      setExecutingAutomations(prev => new Set([...prev, id]));
      
      const response = await fetch(`http://localhost:3013/automations/${id}/execute`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to execute automation: ${response.status}`);
      }

      const result = await response.json();
      
      // Show success message with execution ID
      alert(`Automatizarea a fost executată cu succes!\nID execuție: ${result.executionId}`);
      
      // Refresh the automations list to show updated run counts
      await fetchAutomations();
    } catch (err) {
      console.error('Error executing automation:', err);
      alert(`Eroare la executarea automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
    } finally {
      setExecutingAutomations(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const resetForm = () => {
    setFormData({
      agencyId: 1, // TODO: Get from user context
      name: '',
      description: '',
      triggerType: 'immediate',
      cronExpression: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      webhookUrl: '',
      workflowId: '',
      enabled: true
    });
    setEditingAutomation(null);
    setShowForm(false);
  };


  const getTriggerDisplayText = (automation: Automation) => {
    switch (automation.triggerType) {
      case 'immediate':
        return 'Execuție imediată';
      case 'cron':
        return `Cron: ${automation.triggerConfig.cronExpression} (${automation.triggerConfig.timezone || 'UTC'})`;
      case 'webhook':
        return `Webhook: POST /automations/webhook/${automation.triggerConfig.webhookUrl}`;
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              ⚙️ Automatizări
            </h1>
            <p className="text-gray-600 mt-1">
              Gestionează automatizările și workflow-urile tale
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Automatizare nouă
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingAutomation ? 'Editează automatizarea' : 'Automatizare nouă'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume automatizare *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip trigger *
                </label>
                <select
                  value={formData.triggerType}
                  onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as TriggerType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="immediate">Execuție imediată</option>
                  <option value="cron">Cron Job</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {formData.triggerType === 'cron' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expresie Cron *
                  </label>
                  <input
                    type="text"
                    value={formData.cronExpression}
                    onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                    placeholder="0 9 * * * (zilnic la 9:00)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Format: minute oră zi lună zi_săptămână
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone *
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Europe/Bucharest">Europe/Bucharest (UTC+2/+3)</option>
                    <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                    <option value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</option>
                    <option value="America/New_York">America/New_York (UTC-5/-4)</option>
                    <option value="America/Chicago">America/Chicago (UTC-6/-5)</option>
                    <option value="America/Denver">America/Denver (UTC-7/-6)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                    <option value="Australia/Sydney">Australia/Sydney (UTC+10/+11)</option>
                    <option value="UTC">UTC (UTC+0)</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Cron-ul va fi executat conform acestui timezone
                  </p>
                </div>
              </div>
            )}

            {formData.triggerType === 'webhook' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook Path *
                  </label>
                  <input
                    type="text"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="my-automation-webhook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Doar caractere alfanumerice, cratime și underscore
                  </p>
                </div>

                {formData.webhookUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      🔗 URL Webhook Generat
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-300 text-sm font-mono text-blue-800">
                        POST http://localhost:3013/automations/webhook/{formData.webhookUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`http://localhost:3013/automations/webhook/${formData.webhookUrl}`);
                          alert('URL copiat în clipboard!');
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Copiază
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span className="transform transition-transform group-open:rotate-90">▶</span>
                      ℹ️ Cum funcționează webhook-urile?
                    </summary>
                    <div className="mt-3 space-y-3 text-sm text-gray-600">
                      <p>
                        <strong>1. Trimite un POST request</strong> la URL-ul webhook cu un body JSON.
                      </p>
                      <p>
                        <strong>2. Body-ul devine initialState</strong> și este injectat în workflow.
                      </p>
                      <p>
                        <strong>3. Accesează datele în workflow</strong> folosind <code className="bg-gray-200 px-1 rounded">context.state.propertyId</code>
                      </p>

                      <div className="bg-white border border-gray-300 rounded p-3 mt-2">
                        <p className="font-medium text-gray-700 mb-2">Exemplu POST request:</p>
                        <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`curl -X POST \\
  http://localhost:3013/automations/webhook/${formData.webhookUrl || 'your-path'} \\
  -H "Content-Type: application/json" \\
  -d '{
    "propertyId": "123",
    "contactEmail": "user@example.com",
    "customData": {
      "source": "website"
    }
  }'`}
                        </pre>
                      </div>

                      <p className="mt-2">
                        <strong>💡 Tip:</strong> Body-ul JSON va fi disponibil în workflow ca <code className="bg-gray-200 px-1 rounded">context.state</code>
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <WorkflowManager
                    mode="selector"
                    selectedWorkflowId={formData.workflowId}
                    onWorkflowSelect={(workflowId) => setFormData({ ...formData, workflowId })}
                    placeholder="Selectează un workflow..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowWorkflowManager(true)}
                  className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-1 whitespace-nowrap shadow-md"
                  title="Gestionează workflow-uri"
                >
                  <Plus size={16} />
                  Gestionează...
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                Activează automatizarea
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingAutomation ? 'Actualizează' : 'Creează'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Automatizări existente</h2>
        </div>
        
        {automations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>Nu există automatizări create încă.</p>
            <p>Începe prin a crea prima ta automatizare!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {automations.map((automation) => (
              <div key={automation.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        automation.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {automation.enabled ? 'Activă' : 'Inactivă'}
                      </span>
                    </div>
                    
                    {automation.description && (
                      <p className="text-gray-600 mb-2">{automation.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>
                        <strong>Trigger:</strong> {getTriggerDisplayText(automation)}
                      </span>
                      <span>
                        <strong>Workflow:</strong> {automation.workflowName || automation.workflowId}
                      </span>
                      {automation.lastRunAt && (
                        <span>
                          <strong>Ultima execuție:</strong> {new Date(automation.lastRunAt).toLocaleString('ro-RO')}
                        </span>
                      )}
                      <span>
                        <strong>Execuții:</strong> {automation.runCount} (succes: {automation.successCount}, eșecuri: {automation.failureCount})
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {automation.enabled && automation.triggerType === 'immediate' && (
                      <button
                        onClick={() => executeAutomation(automation.id)}
                        disabled={executingAutomations.has(automation.id)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          executingAutomations.has(automation.id)
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        }`}
                      >
                        {executingAutomations.has(automation.id) ? 'Se execută...' : 'Execută acum'}
                      </button>
                    )}

                    {automation.triggerType === 'webhook' && (
                      <button
                        onClick={() => {
                          const webhookUrl = `http://localhost:3013/automations/webhook/${automation.triggerConfig.webhookUrl}`;
                          navigator.clipboard.writeText(webhookUrl);
                          alert('URL webhook copiat în clipboard!');
                        }}
                        className="px-3 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 transition-colors"
                        title="Copiază URL webhook"
                      >
                        📋 Copiază URL
                      </button>
                    )}

                    <button
                      onClick={() => toggleAutomation(automation.id, !automation.enabled)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        automation.enabled
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {automation.enabled ? 'Dezactivează' : 'Activează'}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(automation)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Editează
                    </button>
                    
                    <button
                      onClick={() => handleDelete(automation.id)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Manager Modal */}
      {showWorkflowManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Workflow Manager
              </h2>
              <button
                onClick={() => setShowWorkflowManager(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <WorkflowManager
                mode="full"
                selectedWorkflowId={formData.workflowId}
                onWorkflowSelect={(workflowId) => {
                  setFormData({ ...formData, workflowId });
                  setShowWorkflowManager(false);
                }}
                onWorkflowCreated={() => {
                  // Optionally refresh workflows or show success message
                }}
                onWorkflowUpdated={() => {
                  // Optionally refresh workflows or show success message
                }}
                onWorkflowDeleted={() => {
                  // Clear selection if deleted workflow was selected
                  if (formData.workflowId) {
                    setFormData({ ...formData, workflowId: '' });
                  }
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}