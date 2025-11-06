import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { WorkflowManager } from '../WorkflowManager';
import { Plus } from 'lucide-react';
export function Automatizari() {
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState(null);
    const [showWorkflowManager, setShowWorkflowManager] = useState(false);
    const [executingAutomations, setExecutingAutomations] = useState(new Set());
    // Form state
    const [formData, setFormData] = useState({
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
        }
        catch (err) {
            console.error('Failed to fetch automations from API:', err);
            // For development, show empty state instead of mock data
            setAutomations([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            console.error('Error saving automation:', err);
            alert(`Eroare la salvarea automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
        }
    };
    const handleEdit = (automation) => {
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
    const handleDelete = async (id) => {
        if (!confirm('Ești sigur că vrei să ștergi această automatizare?'))
            return;
        try {
            const response = await fetch(`http://localhost:3013/automations/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to delete automation: ${response.status}`);
            }
            await fetchAutomations();
        }
        catch (err) {
            console.error('Error deleting automation:', err);
            alert(`Eroare la ștergerea automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
        }
    };
    const toggleAutomation = async (id, enabled) => {
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
        }
        catch (err) {
            console.error('Error toggling automation:', err);
            alert(`Eroare la modificarea stării automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
        }
    };
    const executeAutomation = async (id) => {
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
        }
        catch (err) {
            console.error('Error executing automation:', err);
            alert(`Eroare la executarea automatizării: ${err instanceof Error ? err.message : 'Încearcă din nou.'}`);
        }
        finally {
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
    const getTriggerDisplayText = (automation) => {
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
        return (_jsx("div", { className: "p-6", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-300 rounded w-1/4 mb-4" }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "h-4 bg-gray-300 rounded" }), _jsx("div", { className: "h-4 bg-gray-300 rounded w-5/6" })] })] }) }));
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 flex items-center gap-2", children: "\u2699\uFE0F Automatiz\u0103ri" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Gestioneaz\u0103 automatiz\u0103rile \u0219i workflow-urile tale" })] }), _jsx("button", { onClick: () => setShowForm(true), className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: "+ Automatizare nou\u0103" })] }) }), showForm && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: editingAutomation ? 'Editează automatizarea' : 'Automatizare nouă' }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nume automatizare *" }), _jsx("input", { type: "text", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tip trigger *" }), _jsxs("select", { value: formData.triggerType, onChange: (e) => setFormData({ ...formData, triggerType: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "immediate", children: "Execu\u021Bie imediat\u0103" }), _jsx("option", { value: "cron", children: "Cron Job" }), _jsx("option", { value: "webhook", children: "Webhook" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descriere" }), _jsx("textarea", { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", rows: 3 })] }), formData.triggerType === 'cron' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Expresie Cron *" }), _jsx("input", { type: "text", value: formData.cronExpression, onChange: (e) => setFormData({ ...formData, cronExpression: e.target.value }), placeholder: "0 9 * * * (zilnic la 9:00)", className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", required: true }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Format: minute or\u0103 zi lun\u0103 zi_s\u0103pt\u0103m\u00E2n\u0103" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Timezone *" }), _jsxs("select", { value: formData.timezone, onChange: (e) => setFormData({ ...formData, timezone: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", required: true, children: [_jsx("option", { value: "Europe/Bucharest", children: "Europe/Bucharest (UTC+2/+3)" }), _jsx("option", { value: "Europe/London", children: "Europe/London (UTC+0/+1)" }), _jsx("option", { value: "Europe/Paris", children: "Europe/Paris (UTC+1/+2)" }), _jsx("option", { value: "Europe/Berlin", children: "Europe/Berlin (UTC+1/+2)" }), _jsx("option", { value: "America/New_York", children: "America/New_York (UTC-5/-4)" }), _jsx("option", { value: "America/Chicago", children: "America/Chicago (UTC-6/-5)" }), _jsx("option", { value: "America/Denver", children: "America/Denver (UTC-7/-6)" }), _jsx("option", { value: "America/Los_Angeles", children: "America/Los_Angeles (UTC-8/-7)" }), _jsx("option", { value: "Asia/Dubai", children: "Asia/Dubai (UTC+4)" }), _jsx("option", { value: "Asia/Tokyo", children: "Asia/Tokyo (UTC+9)" }), _jsx("option", { value: "Asia/Singapore", children: "Asia/Singapore (UTC+8)" }), _jsx("option", { value: "Australia/Sydney", children: "Australia/Sydney (UTC+10/+11)" }), _jsx("option", { value: "UTC", children: "UTC (UTC+0)" })] }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Cron-ul va fi executat conform acestui timezone" })] })] })), formData.triggerType === 'webhook' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Webhook Path *" }), _jsx("input", { type: "text", value: formData.webhookUrl, onChange: (e) => setFormData({ ...formData, webhookUrl: e.target.value }), placeholder: "my-automation-webhook", className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", required: true }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Doar caractere alfanumerice, cratime \u0219i underscore" })] }), formData.webhookUrl && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-md p-4", children: [_jsx("label", { className: "block text-sm font-medium text-blue-900 mb-2", children: "\uD83D\uDD17 URL Webhook Generat" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("code", { className: "flex-1 bg-white px-3 py-2 rounded border border-blue-300 text-sm font-mono text-blue-800", children: ["POST http://localhost:3013/automations/webhook/", formData.webhookUrl] }), _jsx("button", { type: "button", onClick: () => {
                                                            navigator.clipboard.writeText(`http://localhost:3013/automations/webhook/${formData.webhookUrl}`);
                                                            alert('URL copiat în clipboard!');
                                                        }, className: "px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm", children: "Copiaz\u0103" })] })] })), _jsx("div", { className: "bg-gray-50 border border-gray-200 rounded-md p-4", children: _jsxs("details", { className: "group", children: [_jsxs("summary", { className: "cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2", children: [_jsx("span", { className: "transform transition-transform group-open:rotate-90", children: "\u25B6" }), "\u2139\uFE0F Cum func\u021Bioneaz\u0103 webhook-urile?"] }), _jsxs("div", { className: "mt-3 space-y-3 text-sm text-gray-600", children: [_jsxs("p", { children: [_jsx("strong", { children: "1. Trimite un POST request" }), " la URL-ul webhook cu un body JSON."] }), _jsxs("p", { children: [_jsx("strong", { children: "2. Body-ul devine initialState" }), " \u0219i este injectat \u00EEn workflow."] }), _jsxs("p", { children: [_jsx("strong", { children: "3. Acceseaz\u0103 datele \u00EEn workflow" }), " folosind ", _jsx("code", { className: "bg-gray-200 px-1 rounded", children: "context.state.propertyId" })] }), _jsxs("div", { className: "bg-white border border-gray-300 rounded p-3 mt-2", children: [_jsx("p", { className: "font-medium text-gray-700 mb-2", children: "Exemplu POST request:" }), _jsx("pre", { className: "bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto", children: `curl -X POST \\
  http://localhost:3013/automations/webhook/${formData.webhookUrl || 'your-path'} \\
  -H "Content-Type: application/json" \\
  -d '{
    "propertyId": "123",
    "contactEmail": "user@example.com",
    "customData": {
      "source": "website"
    }
  }'` })] }), _jsxs("p", { className: "mt-2", children: [_jsx("strong", { children: "\uD83D\uDCA1 Tip:" }), " Body-ul JSON va fi disponibil \u00EEn workflow ca ", _jsx("code", { className: "bg-gray-200 px-1 rounded", children: "context.state" })] })] })] }) })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Workflow *" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "flex-1", children: _jsx(WorkflowManager, { mode: "selector", selectedWorkflowId: formData.workflowId, onWorkflowSelect: (workflowId) => setFormData({ ...formData, workflowId }), placeholder: "Selecteaz\u0103 un workflow..." }) }), _jsxs("button", { type: "button", onClick: () => setShowWorkflowManager(true), className: "px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-1 whitespace-nowrap shadow-md", title: "Gestioneaz\u0103 workflow-uri", children: [_jsx(Plus, { size: 16 }), "Gestioneaz\u0103..."] })] })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "enabled", checked: formData.enabled, onChange: (e) => setFormData({ ...formData, enabled: e.target.checked }), className: "mr-2" }), _jsx("label", { htmlFor: "enabled", className: "text-sm text-gray-700", children: "Activeaz\u0103 automatizarea" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "submit", className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: editingAutomation ? 'Actualizează' : 'Creează' }), _jsx("button", { type: "button", onClick: resetForm, className: "bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors", children: "Anuleaz\u0103" })] })] })] })), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: _jsx("h2", { className: "text-lg font-semibold", children: "Automatiz\u0103ri existente" }) }), automations.length === 0 ? (_jsxs("div", { className: "p-6 text-center text-gray-500", children: [_jsx("p", { children: "Nu exist\u0103 automatiz\u0103ri create \u00EEnc\u0103." }), _jsx("p", { children: "\u00CEncepe prin a crea prima ta automatizare!" })] })) : (_jsx("div", { className: "divide-y divide-gray-200", children: automations.map((automation) => (_jsx("div", { className: "p-6 hover:bg-gray-50", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "font-semibold text-gray-900", children: automation.name }), _jsx("span", { className: `px-2 py-1 text-xs rounded-full ${automation.enabled
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'}`, children: automation.enabled ? 'Activă' : 'Inactivă' })] }), automation.description && (_jsx("p", { className: "text-gray-600 mb-2", children: automation.description })), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-gray-500", children: [_jsxs("span", { children: [_jsx("strong", { children: "Trigger:" }), " ", getTriggerDisplayText(automation)] }), _jsxs("span", { children: [_jsx("strong", { children: "Workflow:" }), " ", automation.workflowName || automation.workflowId] }), automation.lastRunAt && (_jsxs("span", { children: [_jsx("strong", { children: "Ultima execu\u021Bie:" }), " ", new Date(automation.lastRunAt).toLocaleString('ro-RO')] })), _jsxs("span", { children: [_jsx("strong", { children: "Execu\u021Bii:" }), " ", automation.runCount, " (succes: ", automation.successCount, ", e\u0219ecuri: ", automation.failureCount, ")"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-4", children: [automation.enabled && automation.triggerType === 'immediate' && (_jsx("button", { onClick: () => executeAutomation(automation.id), disabled: executingAutomations.has(automation.id), className: `px-3 py-1 text-xs rounded-md transition-colors ${executingAutomations.has(automation.id)
                                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`, children: executingAutomations.has(automation.id) ? 'Se execută...' : 'Execută acum' })), automation.triggerType === 'webhook' && (_jsx("button", { onClick: () => {
                                                    const webhookUrl = `http://localhost:3013/automations/webhook/${automation.triggerConfig.webhookUrl}`;
                                                    navigator.clipboard.writeText(webhookUrl);
                                                    alert('URL webhook copiat în clipboard!');
                                                }, className: "px-3 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 transition-colors", title: "Copiaz\u0103 URL webhook", children: "\uD83D\uDCCB Copiaz\u0103 URL" })), _jsx("button", { onClick: () => toggleAutomation(automation.id, !automation.enabled), className: `px-3 py-1 text-xs rounded-md transition-colors ${automation.enabled
                                                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                    : 'bg-green-100 text-green-800 hover:bg-green-200'}`, children: automation.enabled ? 'Dezactivează' : 'Activează' }), _jsx("button", { onClick: () => handleEdit(automation), className: "px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors", children: "Editeaz\u0103" }), _jsx("button", { onClick: () => handleDelete(automation.id), className: "px-3 py-1 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors", children: "\u0218terge" })] })] }) }, automation.id))) }))] }), showWorkflowManager && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[95vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Workflow Manager" }), _jsx("button", { onClick: () => setShowWorkflowManager(false), className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx("div", { className: "flex-1 overflow-hidden", children: _jsx(WorkflowManager, { mode: "full", selectedWorkflowId: formData.workflowId, onWorkflowSelect: (workflowId) => {
                                    setFormData({ ...formData, workflowId });
                                    setShowWorkflowManager(false);
                                }, onWorkflowCreated: () => {
                                    // Optionally refresh workflows or show success message
                                }, onWorkflowUpdated: () => {
                                    // Optionally refresh workflows or show success message
                                }, onWorkflowDeleted: () => {
                                    // Clear selection if deleted workflow was selected
                                    if (formData.workflowId) {
                                        setFormData({ ...formData, workflowId: '' });
                                    }
                                }, className: "h-full" }) })] }) }))] }));
}
