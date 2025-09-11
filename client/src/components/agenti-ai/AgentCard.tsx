
export interface AIAgent {
    id: string;
    agentName: string;
    description: string | null;
    systemPrompt: string;
    aiModel: string;
    createdAt: string;
    updatedAt: string;
    // UI-specific fields
    icon?: string;
    status?: 'active' | 'inactive' | 'configuring';
  }

export function AgentCard({ agent, onSetupPrompt }: { agent: AIAgent; onSetupPrompt: (agent: AIAgent) => void }) {
    const getStatusBadge = () => {
      switch (agent.status) {
        case 'active':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Activ
            </span>
          );
        case 'inactive':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Inactiv
            </span>
          );
        case 'configuring':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Configurare
            </span>
          );
      }
    };
  
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{agent.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{agent.agentName}</h3>
              {getStatusBadge()}
            </div>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-6 line-clamp-3">
          {agent.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {agent.systemPrompt ? 'Prompt configured' : 'No prompt set'}
          </div>
          <button
            onClick={() => onSetupPrompt(agent)}
            className="px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
          >
            Setup Prompt
          </button>
        </div>
      </div>
    );
  }