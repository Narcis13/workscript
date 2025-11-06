import { WorkflowNode } from 'shared';
import React from 'react';
import ReactDOM from 'react-dom/client';
export class ContainerNode extends WorkflowNode {
    metadata = {
        id: 'container',
        name: 'Container Node',
        version: '1.0.0',
        description: 'A node that renders a React container component',
        inputs: ['containerId', 'className', 'children'],
        outputs: ['rendered', 'container_ref']
    };
    async execute(context, config) {
        try {
            // Create the React container component
            const ContainerComponent = () => {
                return React.createElement('div', {
                    id: config?.containerId || 'workflow-container',
                    className: config?.className || 'workflow-container',
                    style: {
                        padding: '20px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        minHeight: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                    }
                }, 'container...');
            };
            // Find the target element to render into
            const targetElement = document.getElementById('advanced-workflow-demo');
            if (targetElement) {
                // Create a container div for this specific node
                const containerDiv = document.createElement('div');
                containerDiv.id = `container-node-${context.nodeId}`;
                targetElement.appendChild(containerDiv);
                // Render the React component
                const root = ReactDOM.createRoot(containerDiv);
                root.render(React.createElement(ContainerComponent));
                // Store the actual inner container ID for other nodes to find it
                const innerContainerId = config?.containerId || 'workflow-container';
                context.state.containerId = innerContainerId;
                context.state.containerNodeId = context.nodeId;
                console.log('Container rendered successfully:', context.nodeId);
                return {
                    rendered: () => ({
                        containerId: containerDiv.id,
                        nodeId: context.nodeId,
                        timestamp: Date.now()
                    })
                };
            }
            else {
                console.error('Target element #advanced-workflow-demo not found');
                return {
                    error: () => ({
                        message: 'Target element not found',
                        targetId: 'advanced-workflow-demo'
                    })
                };
            }
        }
        catch (error) {
            console.error('Error rendering container:', error);
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : 'Unknown error',
                    nodeId: context.nodeId
                })
            };
        }
    }
}
export default ContainerNode;
