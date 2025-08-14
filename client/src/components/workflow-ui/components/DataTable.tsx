// DataTable - Interactive data table component

import React from 'react';
import { WorkflowUIComponent, Column } from 'shared';

interface DataTableProps extends WorkflowUIComponent {
  data: any[];
  columns: Column[];
  title?: string;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  title,
  nodeId,
  onInteraction
}) => {
  const handleRowClick = (row: any, index: number) => {
    onInteraction({
      type: 'row_selected',
      data: { row, index },
      nodeId,
      timestamp: Date.now()
    });
  };

  return (
    <div className="workflow-data-table">
      {title && <h3 className="table-title">{title}</h3>}
      
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} onClick={() => handleRowClick(row, index)}>
              {columns.map(column => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;