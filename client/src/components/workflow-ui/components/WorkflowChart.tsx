// WorkflowChart - Chart visualization component

import React from 'react';
import { WorkflowUIComponent, ChartData } from '@workscript/engine';

interface WorkflowChartProps extends WorkflowUIComponent {
  data: ChartData;
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title?: string;
  interactive?: boolean;
}

export const WorkflowChart: React.FC<WorkflowChartProps> = ({
  data,
  type,
  title,
  interactive = true,
  nodeId,
  onInteraction
}) => {
  return (
    <div className="workflow-chart">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-placeholder">
        <p>Chart Type: {type}</p>
        <p>Data Points: {data.datasets[0]?.data.length || 0}</p>
        <p>Interactive: {interactive ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default WorkflowChart;