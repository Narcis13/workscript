import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AgentCard({ agent, onSetupPrompt }) {
    const getStatusBadge = () => {
        switch (agent.status) {
            case 'active':
                return (_jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800", children: "Activ" }));
            case 'inactive':
                return (_jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: "Inactiv" }));
            case 'configuring':
                return (_jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800", children: "Configurare" }));
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow", children: [_jsx("div", { className: "flex items-start justify-between mb-4", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "text-3xl", children: agent.icon }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: agent.agentName }), getStatusBadge()] })] }) }), _jsx("p", { className: "text-gray-600 text-sm mb-6 line-clamp-3", children: agent.description }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-xs text-gray-500", children: agent.systemPrompt ? 'Prompt configured' : 'No prompt set' }), _jsx("button", { onClick: () => onSetupPrompt(agent), className: "px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors", children: "Setup Prompt" })] })] }));
}
