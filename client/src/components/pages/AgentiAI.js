import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AIAgent, AgentCard } from '../agenti-ai/AgentCard';
// API functions
const API_BASE_URL = 'http://localhost:3013/api/zoca/ai-agents';
const aiAgentApi = {
    async getAll() {
        const response = await fetch(API_BASE_URL);
        const result = await response.json();
        if (!result.success)
            throw new Error(result.error || 'Failed to fetch agents');
        return result.data || [];
    },
    async create(agent) {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agent)
        });
        const result = await response.json();
        if (!result.success)
            throw new Error(result.error || 'Failed to create agent');
        return result.data;
    },
    async updateSystemPrompt(id, systemPrompt) {
        const response = await fetch(`${API_BASE_URL}/${id}/system-prompt`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt })
        });
        const result = await response.json();
        if (!result.success)
            throw new Error(result.error || 'Failed to update system prompt');
        return result.data;
    },
    async updateModel(id, aiModel) {
        const response = await fetch(`${API_BASE_URL}/${id}/model`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aiModel })
        });
        const result = await response.json();
        if (!result.success)
            throw new Error(result.error || 'Failed to update AI model');
        return result.data;
    },
    async update(id, updates) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const result = await response.json();
        if (!result.success)
            throw new Error(result.error || 'Failed to update agent');
        return result.data;
    },
    async delete(id) {
        const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!result.success)
            throw new Error(result.error || 'Failed to delete agent');
    }
};
// Available AI models
const AI_MODELS = [
    { value: 'openai/gpt-5', label: 'GPT-5' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'openai/o4-mini', label: 'OpenAI O4 mini' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'x-ai/grok-3-mini', label: 'Grok 3 Mini' },
    { value: 'x-ai/grok-4', label: 'Grok 4' },
    { value: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek Chat V3.1 Free' },
    { value: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat V3.1' },
    { value: 'openrouter/sonoma-sky-alpha', label: 'Sonoma Sky Alpha' },
    { value: 'x-ai/grok-4-fast:free', label: 'Grok 4 Fast' },
];
function AgentModal({ agent, isOpen, onClose, onSave, mode }) {
    const [formData, setFormData] = useState({
        agentName: '',
        description: '',
        systemPrompt: '',
        aiModel: 'gpt-4'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (agent && isOpen) {
            setFormData({
                agentName: agent.agentName || '',
                description: agent.description || '',
                systemPrompt: agent.systemPrompt || '',
                aiModel: agent.aiModel || 'gpt-4'
            });
        }
        else if (!agent && isOpen && mode === 'create') {
            setFormData({
                agentName: '',
                description: '',
                systemPrompt: '',
                aiModel: 'gpt-4'
            });
        }
        setError('');
    }, [agent, isOpen, mode]);
    if (!isOpen)
        return null;
    const handleSave = async () => {
        if (!formData.agentName.trim() || !formData.systemPrompt.trim()) {
            setError('Agent name and system prompt are required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            let savedAgent;
            if (mode === 'create') {
                savedAgent = await aiAgentApi.create({
                    agentName: formData.agentName.trim(),
                    description: formData.description.trim() || undefined,
                    systemPrompt: formData.systemPrompt.trim(),
                    aiModel: formData.aiModel
                });
            }
            else {
                savedAgent = await aiAgentApi.update(agent.id, {
                    agentName: formData.agentName.trim(),
                    description: formData.description.trim() || undefined,
                    systemPrompt: formData.systemPrompt.trim(),
                    aiModel: formData.aiModel
                });
            }
            onSave(savedAgent);
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error)
            setError('');
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("span", { className: "text-2xl", children: "\uD83E\uDD16" }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: mode === 'create' ? 'Create AI Agent' : 'Edit AI Agent' }), _jsx("p", { className: "text-sm text-gray-600", children: mode === 'create' ? 'Configure a new AI agent' : agent?.agentName })] })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("div", { className: "flex-1 p-6 overflow-y-auto", children: [error && (_jsx("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-md", children: _jsx("p", { className: "text-sm text-red-600", children: error }) })), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Agent Name *" }), _jsx("input", { type: "text", value: formData.agentName, onChange: (e) => handleInputChange('agentName', e.target.value), placeholder: "Enter agent name...", className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Description" }), _jsx("input", { type: "text", value: formData.description, onChange: (e) => handleInputChange('description', e.target.value), placeholder: "Enter description...", className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "AI Model *" }), _jsx("select", { value: formData.aiModel, onChange: (e) => handleInputChange('aiModel', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent", children: AI_MODELS.map((model) => (_jsx("option", { value: model.value, children: model.label }, model.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "System Prompt *" }), _jsx("textarea", { value: formData.systemPrompt, onChange: (e) => handleInputChange('systemPrompt', e.target.value), placeholder: "Enter the system prompt for this AI agent...", className: "w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none" })] })] }), _jsx("div", { className: "text-sm text-gray-500 mt-4", children: _jsx("p", { children: "Define how this AI agent should behave and respond to user interactions." }) })] }), _jsxs("div", { className: "flex items-center justify-end space-x-3 p-6 border-t bg-gray-50", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50", children: "Cancel" }), _jsxs("button", { onClick: handleSave, disabled: loading, className: "px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2", children: [loading && (_jsxs("svg", { className: "animate-spin h-4 w-4 text-white", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8v8H4z" })] })), _jsx("span", { children: loading ? 'Saving...' : (mode === 'create' ? 'Create Agent' : 'Save Changes') })] })] })] }) }));
}
export function AgentiAI() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalState, setModalState] = useState({
        isOpen: false,
        agent: null,
        mode: 'create'
    });
    // Load agents on component mount
    useEffect(() => {
        loadAgents();
    }, []);
    const loadAgents = async () => {
        try {
            setLoading(true);
            setError('');
            const agentsData = await aiAgentApi.getAll();
            // Add UI-specific fields
            const agentsWithUI = agentsData.map(agent => ({
                ...agent,
                icon: '🤖',
                status: (agent.systemPrompt ? 'inactive' : 'configuring')
            }));
            setAgents(agentsWithUI);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load agents');
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateAgent = () => {
        setModalState({ isOpen: true, agent: null, mode: 'create' });
    };
    const handleEditAgent = (agent) => {
        setModalState({ isOpen: true, agent, mode: 'edit' });
    };
    const handleCloseModal = () => {
        setModalState({ isOpen: false, agent: null, mode: 'create' });
    };
    const handleSaveAgent = (savedAgent) => {
        const agentWithUI = {
            ...savedAgent,
            icon: '🤖',
            status: (savedAgent.systemPrompt ? 'inactive' : 'configuring')
        };
        if (modalState.mode === 'create') {
            setAgents(prev => [...prev, agentWithUI]);
        }
        else {
            setAgents(prev => prev.map(agent => agent.id === savedAgent.id ? agentWithUI : agent));
        }
    };
    return (_jsxs("div", { className: "flex-1 p-4 sm:p-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center mb-4", children: [_jsx("span", { className: "text-2xl sm:text-3xl mr-3 sm:mr-4", children: "\uD83E\uDD16" }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl sm:text-2xl font-semibold text-gray-900", children: "Agenti AI" }), _jsx("p", { className: "text-sm sm:text-base text-gray-600", children: "Configureaz\u0103 \u0219i gestioneaz\u0103 agen\u021Bii AI pentru automatizarea proceselor" })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow", children: _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Your AI Agents" }), _jsxs("button", { onClick: handleCreateAgent, className: "px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center space-x-2", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }), _jsx("span", { children: "Create Agent" })] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("svg", { className: "animate-spin h-6 w-6 text-purple-600", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8v8H4z" })] }), _jsx("span", { className: "text-gray-600", children: "Loading agents..." })] }) })) : error ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "text-4xl sm:text-6xl mb-4", children: "\u26A0\uFE0F" }), _jsx("h2", { className: "text-lg sm:text-xl font-medium text-gray-900 mb-2", children: "Error Loading Agents" }), _jsx("p", { className: "text-sm sm:text-base text-gray-600 mb-6", children: error }), _jsx("button", { onClick: loadAgents, className: "px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50", children: "Try Again" })] })) : agents.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: agents.map((agent) => (_jsx(AgentCard, { agent: agent, onSetupPrompt: handleEditAgent }, agent.id))) })) : (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "text-4xl sm:text-6xl mb-4", children: "\uD83E\uDD16" }), _jsx("h2", { className: "text-lg sm:text-xl font-medium text-gray-900 mb-2", children: "No AI Agents Yet" }), _jsx("p", { className: "text-sm sm:text-base text-gray-600 mb-6", children: "Create your first AI agent to get started with automation." }), _jsx("button", { onClick: handleCreateAgent, className: "px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700", children: "Create Your First Agent" })] }))] }) }), _jsx(AgentModal, { agent: modalState.agent, isOpen: modalState.isOpen, onClose: handleCloseModal, onSave: handleSaveAgent, mode: modalState.mode })] }));
}
