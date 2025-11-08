import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// UIComponentRenderer - Dynamic component renderer for workflow UI components
import React from 'react';
import { UIRenderData, UIInteractionEvent } from '@workscript/engine';
// Component mapping - this would be expanded with actual implementations
const COMPONENT_MAP = {
    'WorkflowForm': React.lazy(() => import('./WorkflowForm')),
    'Dashboard': React.lazy(() => import('./Dashboard')),
    'DataTable': React.lazy(() => import('./DataTable')),
    'WorkflowChart': React.lazy(() => import('./WorkflowChart')),
    'ActionButtonGroup': React.lazy(() => import('./ActionButtonGroup')),
    'FileProcessor': React.lazy(() => import('./FileProcessor')),
};
export const UIComponentRenderer = ({ renderData, workflowState, onInteraction }) => {
    const { component, props, nodeId } = renderData;
    // Get the component from the map
    const Component = COMPONENT_MAP[component];
    if (!Component) {
        return (_jsxs("div", { className: "ui-component-error", children: [_jsxs("h4", { children: ["Unknown Component: ", component] }), _jsxs("p", { children: ["Component '", component, "' is not registered in the component map."] }), _jsxs("details", { children: [_jsx("summary", { children: "Debug Info" }), _jsx("pre", { children: JSON.stringify({ component, nodeId, props }, null, 2) })] })] }));
    }
    return (_jsx("div", { className: "ui-component-wrapper", "data-node-id": nodeId, "data-component": component, children: _jsx(React.Suspense, { fallback: _jsxs("div", { className: "component-loading", children: ["Loading ", component, "..."] }), children: _jsx(Component, { ...props, nodeId: nodeId, workflowState: workflowState, onInteraction: onInteraction }) }) }));
};
export default UIComponentRenderer;
