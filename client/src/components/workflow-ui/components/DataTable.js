import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// DataTable - Interactive data table component
import React from 'react';
import { WorkflowUIComponent, Column } from 'shared';
export const DataTable = ({ data, columns, title, nodeId, onInteraction }) => {
    const handleRowClick = (row, index) => {
        onInteraction({
            type: 'row_selected',
            data: { row, index },
            nodeId,
            timestamp: Date.now()
        });
    };
    return (_jsxs("div", { className: "workflow-data-table", children: [title && _jsx("h3", { className: "table-title", children: title }), _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsx("tr", { children: columns.map(column => (_jsx("th", { children: column.label }, column.key))) }) }), _jsx("tbody", { children: data.map((row, index) => (_jsx("tr", { onClick: () => handleRowClick(row, index), children: columns.map(column => (_jsx("td", { children: row[column.key] }, column.key))) }, index))) })] })] }));
};
export default DataTable;
