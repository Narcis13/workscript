import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Dashboard - Layout component for workflow dashboards
import React from 'react';
import { WorkflowUIComponent, DashboardSection } from 'shared';
export const Dashboard = ({ layout, title, sections, loading = false, nodeId, onInteraction }) => {
    return (_jsxs("div", { className: `workflow-dashboard layout-${layout}`, children: [_jsxs("header", { className: "dashboard-header", children: [_jsx("h1", { children: title }), loading && _jsx("div", { className: "loading-indicator", children: "Loading..." })] }), _jsx("div", { className: "dashboard-content", children: sections.map(section => (_jsxs("div", { className: "dashboard-section", children: [_jsx("h3", { children: section.title }), _jsxs("div", { children: ["Component: ", section.component] })] }, section.id))) })] }));
};
export default Dashboard;
