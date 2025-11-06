import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Logo } from './Logo';
export function Sidebar({ items, currentRoute, onRouteChange, isOpen, onClose }) {
    const handleItemClick = (route) => {
        onRouteChange(route);
        onClose(); // Close mobile menu after selection
    };
    return (_jsxs(_Fragment, { children: [isOpen && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden", onClick: onClose })), _jsxs("div", { className: `
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-800 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `, children: [_jsx("div", { className: "lg:hidden flex justify-end p-4", children: _jsx("button", { onClick: onClose, className: "text-gray-300 hover:text-white", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) }) }), _jsx("div", { className: "lg:block hidden", children: _jsx(Logo, {}) }), _jsx("div", { className: "lg:hidden block px-4 pb-4 border-b border-slate-700", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "w-6 h-6 bg-purple-500 rounded" }), _jsx("span", { className: "text-lg font-semibold", children: "AI ZOCA" })] }) }), _jsx("nav", { className: "flex-1 px-3 py-4 overflow-y-auto", children: _jsx("ul", { className: "space-y-1", children: items.map((item) => (_jsx("li", { children: _jsxs("button", { onClick: () => handleItemClick(item.route), className: `w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentRoute === item.route
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-300 hover:text-white hover:bg-slate-700'}`, children: [_jsx("span", { className: "mr-3 text-base", children: item.icon }), _jsx("span", { className: "truncate", children: item.label })] }) }, item.id))) }) })] })] }));
}
