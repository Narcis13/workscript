// WorkflowArtifact - Main renderer for AI-generated UI workflows

import React, { useState, useEffect, useRef } from 'react';
import { ExecutionEngine, NodeRegistry, StateManager } from 'shared';
import { 
  UIWorkflowDefinition, 
  UIRenderData, 
  UIInteractionEvent,
  UIWorkflowContext,
  UIWorkflowSecurityValidator 
} from 'shared';

interface WorkflowArtifactProps {
  workflow: UIWorkflowDefinition;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onInteraction?: (event: UIInteractionEvent) => void;
  securityConfig?: any; // Security configuration
  className?: string;
  style?: React.CSSProperties;
}

interface WorkflowArtifactState {
  uiComponents: UIRenderData[];
  workflowState: any;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  validationWarnings: any[];
}

export const WorkflowArtifact: React.FC<WorkflowArtifactProps> = ({
  workflow,
  onComplete,
  onError,
  onInteraction,
  securityConfig,
  className = '',
  style = {}
}) => {
  const [state, setState] = useState<WorkflowArtifactState>({
    uiComponents: [],
    workflowState: {},
    loading: true,
    error: null,
    initialized: false,
    validationWarnings: []
  });

  const engineRef = useRef<ExecutionEngine | null>(null);
  const uiContextRef = useRef<UIWorkflowContext | null>(null);

  useEffect(() => {
    initializeWorkflow();
    
    // Cleanup on unmount
    return () => {
      if (uiContextRef.current) {
        uiContextRef.current.destroy();
      }
    };
  }, [workflow]);

  const initializeWorkflow = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Security validation
      const validator = new UIWorkflowSecurityValidator(securityConfig);
      const validationResult = validator.validateWorkflow(workflow);
      
      if (!validationResult.valid) {
        throw new Error(`Security validation failed: ${validationResult.errors[0]?.message}`);
      }

      // Store warnings for display
      setState(prev => ({ 
        ...prev, 
        validationWarnings: validationResult.securityWarnings || []
      }));

      // Initialize UI context
      const uiContext = new UIWorkflowContext();
      uiContextRef.current = uiContext;

      // Set up UI interaction handling
      uiContext.onInteraction((event: UIInteractionEvent) => {
        handleUIInteraction(event);
        onInteraction?.(event);
      });

      // Initialize workflow engine with client nodes (including UI nodes)
      const registry = new NodeRegistry();
      await registry.discoverFromPackages('client');
      
      const stateManager = new StateManager();
      const engine = new ExecutionEngine(registry, stateManager);
      engineRef.current = engine;

      // Listen for UI render events
      engine.on('ui_render', (renderData: UIRenderData) => {
        setState(prev => ({
          ...prev,
          uiComponents: [...prev.uiComponents, renderData]
        }));
      });

      // Listen for state changes
      engine.on('state_change', (newState: any) => {
        setState(prev => ({
          ...prev,
          workflowState: newState
        }));
        
        // Update UI context state
        uiContext.getStateManager().setNodeState('workflow', newState);
      });

      // Set initialized and start workflow execution
      setState(prev => ({ 
        ...prev, 
        initialized: true, 
        loading: false 
      }));

      // Execute workflow
      executeWorkflow(engine);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        loading: false 
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const executeWorkflow = async (engine: ExecutionEngine) => {
    try {
      const result = await engine.execute(workflow);
      onComplete?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const handleUIInteraction = (event: UIInteractionEvent) => {
    // Forward UI interactions back to workflow engine
    if (engineRef.current) {
      engineRef.current.handleUIInteraction?.(event);
    }
    
    // Update UI context
    if (uiContextRef.current) {
      uiContextRef.current.handleInteraction(event);
    }
  };

  const renderSecurityWarnings = () => {
    if (state.validationWarnings.length === 0) return null;

    return (
      <div className="workflow-security-warnings">
        {state.validationWarnings.map((warning, index) => (
          <div 
            key={index}
            className={`security-warning severity-${warning.severity}`}
          >
            <span className="warning-icon">⚠️</span>
            <span className="warning-message">{warning.message}</span>
            {warning.recommendation && (
              <span className="warning-recommendation">
                Recommendation: {warning.recommendation}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderUIComponents = () => {
    return state.uiComponents.map((component, index) => {
      // Here you would dynamically import/render the actual React components
      // For now, we'll render placeholder components
      return (
        <div key={`${component.nodeId}-${index}`} className="ui-node-container">
          <div className="ui-component-placeholder">
            <h4>UI Component: {component.component}</h4>
            <p>Node ID: {component.nodeId}</p>
            <pre>{JSON.stringify(component.props, null, 2)}</pre>
          </div>
        </div>
      );
    });
  };

  const renderArtifactContent = () => {
    if (state.loading) {
      return (
        <div className="workflow-loading">
          <div className="loading-spinner" />
          <p>Initializing workflow...</p>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="workflow-error">
          <h3>Workflow Error</h3>
          <p>{state.error}</p>
          <button onClick={initializeWorkflow}>Retry</button>
        </div>
      );
    }

    return (
      <div className="artifact-content">
        {renderSecurityWarnings()}
        {renderUIComponents()}
      </div>
    );
  };

  return (
    <div 
      className={`workflow-artifact ${workflow.renderMode} ${className}`}
      style={style}
    >
      <header className="artifact-header">
        <div className="artifact-title">
          <h2>{workflow.metadata.title}</h2>
          {workflow.metadata.aiGenerated && (
            <span className="ai-generated-badge">🤖 AI Generated</span>
          )}
        </div>
        <p className="artifact-description">{workflow.metadata.description}</p>
        {workflow.metadata.conversationContext && (
          <p className="conversation-context">
            Context: {workflow.metadata.conversationContext}
          </p>
        )}
      </header>
      
      {renderArtifactContent()}
      
      <footer className="artifact-footer">
        <div className="workflow-status">
          <span className={`status-indicator ${state.initialized ? 'ready' : 'initializing'}`} />
          <span className="status-text">
            {state.loading ? 'Loading...' : state.error ? 'Error' : 'Ready'}
          </span>
        </div>
        <div className="workflow-info">
          <span>Components: {state.uiComponents.length}</span>
          <span>Version: {workflow.version}</span>
        </div>
      </footer>
    </div>
  );
};

// Export default for easier importing
export default WorkflowArtifact;