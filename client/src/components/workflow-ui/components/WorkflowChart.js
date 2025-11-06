import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// WorkflowChart - Chart visualization component
import React from 'react';
import { WorkflowUIComponent, ChartData } from 'shared';
export const WorkflowChart = ({ data, type, title, interactive = true, nodeId, onInteraction }) => {
    return (_jsxs("div", { className: "workflow-chart", children: [title && _jsx("h3", { className: "chart-title", children: title }), _jsxs("div", { className: "chart-placeholder", children: [_jsxs("p", { children: ["Chart Type: ", type] }), _jsxs("p", { children: ["Data Points: ", data.datasets[0]?.data.length || 0] }), _jsxs("p", { children: ["Interactive: ", interactive ? 'Yes' : 'No'] })] })] }));
};
export default WorkflowChart;
