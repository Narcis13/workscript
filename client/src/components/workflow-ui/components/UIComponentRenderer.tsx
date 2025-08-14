// UIComponentRenderer - Dynamic component renderer for workflow UI components

import React from 'react';
import { UIRenderData, UIInteractionEvent } from 'shared';

interface UIComponentRendererProps {
  renderData: UIRenderData;
  workflowState: any;
  onInteraction: (event: UIInteractionEvent) => void;
}

// Component mapping - this would be expanded with actual implementations
const COMPONENT_MAP = {
  'WorkflowForm': React.lazy(() => import('./WorkflowForm')),
  'Dashboard': React.lazy(() => import('./Dashboard')),
  'DataTable': React.lazy(() => import('./DataTable')),
  'WorkflowChart': React.lazy(() => import('./WorkflowChart')),
  'ActionButtonGroup': React.lazy(() => import('./ActionButtonGroup')),
  'FileProcessor': React.lazy(() => import('./FileProcessor')),
};

export const UIComponentRenderer: React.FC<UIComponentRendererProps> = ({
  renderData,
  workflowState,
  onInteraction
}) => {
  const { component, props, nodeId } = renderData;
  
  // Get the component from the map
  const Component = COMPONENT_MAP[component as keyof typeof COMPONENT_MAP];
  
  if (!Component) {
    return (
      <div className="ui-component-error">
        <h4>Unknown Component: {component}</h4>
        <p>Component '{component}' is not registered in the component map.</p>
        <details>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({ component, nodeId, props }, null, 2)}</pre>
        </details>
      </div>
    );
  }
  
  return (
    <div className="ui-component-wrapper" data-node-id={nodeId} data-component={component}>
      <React.Suspense fallback={<div className="component-loading">Loading {component}...</div>}>
        <Component
          {...props}
          nodeId={nodeId}
          workflowState={workflowState}
          onInteraction={onInteraction}
        />
      </React.Suspense>
    </div>
  );
};

export default UIComponentRenderer;