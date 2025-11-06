import { jsx as _jsx } from "react/jsx-runtime";
export function TabNavigation({ tabs, activeTab, onTabChange }) {
    return (_jsx("div", { className: "border-b border-gray-200 px-4", children: _jsx("nav", { className: "flex space-x-8 overflow-x-auto", children: tabs.map((tab) => (_jsx("button", { onClick: () => onTabChange(tab.id), className: `py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: tab.label }, tab.id))) }) }));
}
