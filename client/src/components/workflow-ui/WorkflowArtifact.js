import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// WorkflowArtifact - Main renderer for AI-generated UI workflows
import React, { useState, useEffect, useRef } from 'react';
import { ExecutionEngine, NodeRegistry, StateManager, UIWorkflowContext } from '@workscript/engine';
import { UIWorkflowDefinition, UIRenderData, UIInteractionEvent, SecurityWarning } from '@workscript/engine';
export const WorkflowArtifact = ({ workflow, onComplete, onError, onInteraction, securityConfig, className = '', style = {} }) => {
    const [state, setState] = useState({
        uiComponents: [],
        workflowState: {},
        loading: true,
        error: null,
        initialized: false,
        validationWarnings: []
    });
    const engineRef = useRef(null);
    const uiContextRef = useRef(null);
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
            // TODO: Implement security validation when UIWorkflowSecurityValidator is available
            // For now, skip security validation
            const validationWarnings = [];
            // Store warnings for display
            setState(prev => ({
                ...prev,
                validationWarnings: validationWarnings
            }));
            // Initialize UI context
            const uiContext = new UIWorkflowContext();
            uiContextRef.current = uiContext;
            // Set up UI interaction handling
            uiContext.onInteraction((event) => {
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
            engine.on('ui_render', (renderData) => {
                setState(prev => ({
                    ...prev,
                    uiComponents: [...prev.uiComponents, renderData]
                }));
            });
            // Listen for state changes
            engine.on('state_change', (newState) => {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                loading: false
            }));
            onError?.(error instanceof Error ? error : new Error(errorMessage));
        }
    };
    const executeWorkflow = async (engine) => {
        try {
            const result = await engine.execute(workflow);
            onComplete?.(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Execution failed';
            setState(prev => ({ ...prev, error: errorMessage }));
            onError?.(error instanceof Error ? error : new Error(errorMessage));
        }
    };
    const handleUIInteraction = (event) => {
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
        if (state.validationWarnings.length === 0)
            return null;
        return (_jsx("div", { className: "workflow-security-warnings", children: state.validationWarnings.map((warning, index) => (_jsxs("div", { className: `security-warning severity-${warning.severity}`, children: [_jsx("span", { className: "warning-icon", children: "\u26A0\uFE0F" }), _jsx("span", { className: "warning-message", children: warning.message }), warning.recommendation && (_jsxs("span", { className: "warning-recommendation", children: ["Recommendation: ", warning.recommendation] }))] }, index))) }));
    };
    const renderUIComponents = () => {
        return state.uiComponents.map((component, index) => {
            // Here you would dynamically import/render the actual React components
            // For now, we'll render placeholder components
            return (_jsx("div", { className: "ui-node-container", children: _jsxs("div", { className: "ui-component-placeholder", children: [_jsxs("h4", { children: ["UI Component: ", component.component] }), _jsxs("p", { children: ["Node ID: ", component.nodeId] }), _jsx("pre", { children: JSON.stringify(component.props, null, 2) })] }) }, `${component.nodeId}-${index}`));
        });
    };
    const renderArtifactContent = () => {
        if (state.loading) {
            return (_jsxs("div", { className: "workflow-loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Initializing workflow..." })] }));
        }
        if (state.error) {
            return (_jsxs("div", { className: "workflow-error", children: [_jsx("h3", { children: "Workflow Error" }), _jsx("p", { children: state.error }), _jsx("button", { onClick: initializeWorkflow, children: "Retry" })] }));
        }
        return (_jsxs("div", { className: "artifact-content", children: [renderSecurityWarnings(), renderUIComponents()] }));
    };
    return (_jsxs("div", { className: `workflow-artifact ${workflow.renderMode} ${className}`, style: style, children: [_jsxs("header", { className: "artifact-header", children: [_jsxs("div", { className: "artifact-title", children: [_jsx("h2", { children: workflow.metadata.title }), workflow.metadata.aiGenerated && (_jsx("span", { className: "ai-generated-badge", children: "\uD83E\uDD16 AI Generated" }))] }), _jsx("p", { className: "artifact-description", children: workflow.metadata.description }), workflow.metadata.conversationContext && (_jsxs("p", { className: "conversation-context", children: ["Context: ", workflow.metadata.conversationContext] }))] }), renderArtifactContent(), _jsxs("footer", { className: "artifact-footer", children: [_jsxs("div", { className: "workflow-status", children: [_jsx("span", { className: `status-indicator ${state.initialized ? 'ready' : 'initializing'}` }), _jsx("span", { className: "status-text", children: state.loading ? 'Loading...' : state.error ? 'Error' : 'Ready' })] }), _jsxs("div", { className: "workflow-info", children: [_jsxs("span", { children: ["Components: ", state.uiComponents.length] }), _jsxs("span", { children: ["Version: ", workflow.version] })] })] })] }));
};
// Export default for easier importing
export default WorkflowArtifact;
