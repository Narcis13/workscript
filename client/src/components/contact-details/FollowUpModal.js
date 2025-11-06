import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function FollowUpModal({ isOpen, onClose, response, isLoading }) {
    const [copySuccess, setCopySuccess] = useState(false);
    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(response);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
        catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };
    if (!isOpen)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-60 bg-black bg-opacity-50", onClick: onClose }), _jsx("div", { className: "fixed inset-0 z-70 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Follow Up Response" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: isLoading ? (_jsxs("div", { className: "flex items-center justify-center h-32", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Generating response..." })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx("textarea", { value: response, readOnly: true, className: "w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-mono", placeholder: "AI response will appear here..." }), response && (_jsx("div", { className: "flex justify-end", children: _jsx("button", { onClick: handleCopyToClipboard, className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copySuccess
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'}`, children: copySuccess ? (_jsxs(_Fragment, { children: [_jsx("svg", { className: "w-4 h-4 inline mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), "Copied!"] })) : (_jsxs(_Fragment, { children: [_jsx("svg", { className: "w-4 h-4 inline mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a1 1 0 011 1v3M9 12l2 2 4-4" }) }), "Copy to Clipboard"] })) }) }))] })) }), _jsx("div", { className: "flex justify-end p-6 border-t border-gray-200", children: _jsx("button", { onClick: onClose, className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors", children: "Close" }) })] }) })] }));
}
