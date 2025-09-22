import { useState, useEffect } from 'react';
import { WorkflowSelector } from '../WorkflowSelector';

interface Automation {
  id: string;
  name: string;
  description?: string;
  triggerType: 'immediate' | 'cron' | 'webhook';
  triggerConfig: {
    cronExpression?: string;
    webhookUrl?: string;
    immediate?: boolean;
  };
  workflowId: string;
  workflowName?: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
}

type TriggerType = 'immediate' | 'cron' | 'webhook';

export function Automatizari() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'immediate' as TriggerType,
    cronExpression: '',
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
      
      // For development, use mock data directly
      // TODO: Replace with actual API call when backend is ready
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        setAutomations([
          {
            id: '1',
            name: 'Daily Email Report',
            description: 'Send daily summary email',
            triggerType: 'cron',
            triggerConfig: { cronExpression: '0 9 * * *' },
            workflowId: '1',
            workflowName: 'Email Notification Workflow',
            enabled: true,
            createdAt: new Date().toISOString(),
            lastRun: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: '2',
            name: 'Contact Form Processing',
            description: 'Process contact form submissions',
            triggerType: 'webhook',
            triggerConfig: { webhookUrl: '/webhook/contact-form' },
            workflowId: '2',
            workflowName: 'Data Processing Workflow',
            enabled: true,
            createdAt: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Weekly Report Generation',
            description: 'Generate weekly performance reports',
            triggerType: 'cron',
            triggerConfig: { cronExpression: '0 8 * * 1' },
            workflowId: '3',
            workflowName: 'Report Generation Workflow',
            enabled: false,
            createdAt: new Date(Date.now() - 604800000).toISOString()
          }
        ]);
        return;
      }

      const response = await fetch('/api/automations');
      if (!response.ok) {
        throw new Error('Failed to fetch automations');
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      setAutomations(data);
    } catch (err) {
      console.warn('Failed to fetch automations from API, using mock data:', err);
      // Fallback to mock data
      setAutomations([
        {
          id: '1',
          name: 'Daily Email Report',
          description: 'Send daily summary email',
          triggerType: 'cron',
          triggerConfig: { cronExpression: '0 9 * * *' },
          workflowId: '1',
          workflowName: 'Email Notification Workflow',
          enabled: true,
          createdAt: new Date().toISOString(),
          lastRun: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          name: 'Contact Form Processing',
          description: 'Process contact form submissions',
          triggerType: 'webhook',
          triggerConfig: { webhookUrl: '/webhook/contact-form' },
          workflowId: '2',
          workflowName: 'Data Processing Workflow',
          enabled: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Weekly Report Generation',
          description: 'Generate weekly performance reports',
          triggerType: 'cron',
          triggerConfig: { cronExpression: '0 8 * * 1' },
          workflowId: '3',
          workflowName: 'Report Generation Workflow',
          enabled: false,
          createdAt: new Date(Date.now() - 604800000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const automationData = {
      name: formData.name,
      description: formData.description,
      triggerType: formData.triggerType,
      triggerConfig: {
        ...(formData.triggerType === 'cron' && { cronExpression: formData.cronExpression }),
        ...(formData.triggerType === 'webhook' && { webhookUrl: formData.webhookUrl }),
        ...(formData.triggerType === 'immediate' && { immediate: true })
      },
      workflowId: formData.workflowId,
      enabled: formData.enabled
    };

    try {
      // For development, simulate successful save
      if (process.env.NODE_ENV === 'development') {
        console.log('Saving automation (dev mode):', automationData);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchAutomations();
        resetForm();
        return;
      }

      const url = editingAutomation 
        ? `/api/automations/${editingAutomation.id}`
        : '/api/automations';
      const method = editingAutomation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automationData)
      });

      if (!response.ok) {
        throw new Error('Failed to save automation');
      }

      await fetchAutomations();
      resetForm();
    } catch (err) {
      console.error('Error saving automation:', err);
      alert('Eroare la salvarea automatizării. Încearcă din nou.');
    }
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      triggerType: automation.triggerType,
      cronExpression: automation.triggerConfig.cronExpression || '',
      webhookUrl: automation.triggerConfig.webhookUrl || '',
      workflowId: automation.workflowId,
      enabled: automation.enabled
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această automatizare?')) return;

    try {
      // For development, simulate successful delete
      if (process.env.NODE_ENV === 'development') {
        console.log('Deleting automation (dev mode):', id);
        await new Promise(resolve => setTimeout(resolve, 300));
        await fetchAutomations();
        return;
      }

      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete automation');
      }

      await fetchAutomations();
    } catch (err) {
      console.error('Error deleting automation:', err);
      alert('Eroare la ștergerea automatizării. Încearcă din nou.');
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      // For development, simulate successful toggle
      if (process.env.NODE_ENV === 'development') {
        console.log('Toggling automation (dev mode):', id, enabled);
        await new Promise(resolve => setTimeout(resolve, 200));
        await fetchAutomations();
        return;
      }

      const response = await fetch(`/api/automations/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle automation');
      }

      await fetchAutomations();
    } catch (err) {
      console.error('Error toggling automation:', err);
      alert('Eroare la modificarea stării automatizării. Încearcă din nou.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'immediate',
      cronExpression: '',
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
        return `Cron: ${automation.triggerConfig.cronExpression}`;
      case 'webhook':
        return `Webhook: ${automation.triggerConfig.webhookUrl}`;
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
            )}

            {formData.triggerType === 'webhook' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Webhook *
                </label>
                <input
                  type="text"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="/webhook/my-automation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow *
              </label>
              <WorkflowSelector
                selectedWorkflowId={formData.workflowId}
                onWorkflowSelect={(workflowId) => setFormData({ ...formData, workflowId })}
              />
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
                      {automation.lastRun && (
                        <span>
                          <strong>Ultima execuție:</strong> {new Date(automation.lastRun).toLocaleString('ro-RO')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
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
    </div>
  );
}