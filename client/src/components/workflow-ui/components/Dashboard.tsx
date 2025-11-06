// Dashboard - Layout component for workflow dashboards

import React from 'react';
import { WorkflowUIComponent, DashboardSection } from '@workscript/engine';

interface DashboardProps extends WorkflowUIComponent {
  layout: 'grid' | 'sidebar' | 'tabbed';
  title: string;
  sections: DashboardSection[];
  loading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  layout,
  title,
  sections,
  loading = false,
  nodeId,
  onInteraction
}) => {
  return (
    <div className={`workflow-dashboard layout-${layout}`}>
      <header className="dashboard-header">
        <h1>{title}</h1>
        {loading && <div className="loading-indicator">Loading...</div>}
      </header>
      
      <div className="dashboard-content">
        {/* Placeholder for dashboard sections */}
        {sections.map(section => (
          <div key={section.id} className="dashboard-section">
            <h3>{section.title}</h3>
            <div>Component: {section.component}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;