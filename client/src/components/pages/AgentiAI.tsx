import { useState, useEffect } from 'react';
import { AIAgent, AgentCard } from '../agenti-ai/AgentCard';

// API functions
const API_BASE_URL = 'http://localhost:3013/api/zoca/ai-agents';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

const aiAgentApi = {
  async getAll(): Promise<AIAgent[]> {
    const response = await fetch(API_BASE_URL);
    const result: ApiResponse<AIAgent[]> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch agents');
    return result.data || [];
  },

  async create(agent: { agentName: string; description?: string; systemPrompt: string; aiModel: string }): Promise<AIAgent> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent)
    });
    const result: ApiResponse<AIAgent> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create agent');
    return result.data!;
  },

  async updateSystemPrompt(id: string, systemPrompt: string): Promise<AIAgent> {
    const response = await fetch(`${API_BASE_URL}/${id}/system-prompt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt })
    });
    const result: ApiResponse<AIAgent> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update system prompt');
    return result.data!;
  },

  async updateModel(id: string, aiModel: string): Promise<AIAgent> {
    const response = await fetch(`${API_BASE_URL}/${id}/model`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiModel })
    });
    const result: ApiResponse<AIAgent> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update AI model');
    return result.data!;
  },

  async update(id: string, updates: Partial<{ agentName: string; description: string; systemPrompt: string; aiModel: string }>): Promise<AIAgent> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result: ApiResponse<AIAgent> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update agent');
    return result.data!;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    const result: ApiResponse<null> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete agent');
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


interface AgentModalProps {
  agent: AIAgent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: AIAgent) => void;
  mode: 'create' | 'edit';
}

function AgentModal({ agent, isOpen, onClose, onSave, mode }: AgentModalProps) {
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
    } else if (!agent && isOpen && mode === 'create') {
      setFormData({
        agentName: '',
        description: '',
        systemPrompt: '',
        aiModel: 'gpt-4'
      });
    }
    setError('');
  }, [agent, isOpen, mode]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.agentName.trim() || !formData.systemPrompt.trim()) {
      setError('Agent name and system prompt are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let savedAgent: AIAgent;
      
      if (mode === 'create') {
        savedAgent = await aiAgentApi.create({
          agentName: formData.agentName.trim(),
          description: formData.description.trim() || undefined,
          systemPrompt: formData.systemPrompt.trim(),
          aiModel: formData.aiModel
        });
      } else {
        savedAgent = await aiAgentApi.update(agent!.id, {
          agentName: formData.agentName.trim(),
          description: formData.description.trim() || undefined,
          systemPrompt: formData.systemPrompt.trim(),
          aiModel: formData.aiModel
        });
      }
      
      onSave(savedAgent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? 'Create AI Agent' : 'Edit AI Agent'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'create' ? 'Configure a new AI agent' : agent?.agentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                value={formData.agentName}
                onChange={(e) => handleInputChange('agentName', e.target.value)}
                placeholder="Enter agent name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model *
              </label>
              <select
                value={formData.aiModel}
                onChange={(e) => handleInputChange('aiModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {AI_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt *
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                placeholder="Enter the system prompt for this AI agent..."
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mt-4">
            <p>Define how this AI agent should behave and respond to user interactions.</p>
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            <span>{loading ? 'Saving...' : (mode === 'create' ? 'Create Agent' : 'Save Changes')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}



export function AgentiAI() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    agent: AIAgent | null;
    mode: 'create' | 'edit';
  }>({
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
      const agentsWithUI: AIAgent[] = agentsData.map(agent => ({
        ...agent,
        icon: '🤖',
        status: (agent.systemPrompt ? 'inactive' : 'configuring') as 'active' | 'inactive' | 'configuring'
      }));
      setAgents(agentsWithUI);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setModalState({ isOpen: true, agent: null, mode: 'create' });
  };

  const handleEditAgent = (agent: AIAgent) => {
    setModalState({ isOpen: true, agent, mode: 'edit' });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, agent: null, mode: 'create' });
  };

  const handleSaveAgent = (savedAgent: AIAgent) => {
    const agentWithUI: AIAgent = {
      ...savedAgent,
      icon: '🤖',
      status: (savedAgent.systemPrompt ? 'inactive' : 'configuring') as 'active' | 'inactive' | 'configuring'
    };
    
    if (modalState.mode === 'create') {
      setAgents(prev => [...prev, agentWithUI]);
    } else {
      setAgents(prev => 
        prev.map(agent => 
          agent.id === savedAgent.id ? agentWithUI : agent
        )
      );
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">🤖</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Agenti AI</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Configurează și gestionează agenții AI pentru automatizarea proceselor
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Your AI Agents</h2>
            <button
              onClick={handleCreateAgent}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Agent</span>
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span className="text-gray-600">Loading agents...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl sm:text-6xl mb-4">⚠️</div>
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                Error Loading Agents
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
              <button
                onClick={loadAgents}
                className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50"
              >
                Try Again
              </button>
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSetupPrompt={handleEditAgent}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl sm:text-6xl mb-4">🤖</div>
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                No AI Agents Yet
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Create your first AI agent to get started with automation.
              </p>
              <button
                onClick={handleCreateAgent}
                className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                Create Your First Agent
              </button>
            </div>
          )}
        </div>
      </div>

      <AgentModal
        agent={modalState.agent}
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAgent}
        mode={modalState.mode}
      />
    </div>
  );
}