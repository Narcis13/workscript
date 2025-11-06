import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PanelHeader({ firstName, lastName, onClose }) {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Contact';
    return (_jsxs("div", { className: "bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold truncate", children: fullName }), _jsx("button", { onClick: onClose, className: "text-white hover:text-gray-200 transition-colors p-2", "aria-label": "Close panel", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }));
}
