import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from '../../src/components/ui/button';
import { ClientWorkflowService } from '../../src/services/ClientWorkflowService';
import type { WorkflowDefinition } from '@workscript/engine';

export class ButtonNode extends WorkflowNode {
  metadata = {
    id: 'button',
    name: 'Button Node',
    version: '1.0.0',
    description: 'A node that renders a shadcn Button component inside a container',
    inputs: ['caption', 'variant', 'size', 'disabled'],
    outputs: ['rendered', 'clicked', 'error']
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {

     const serviceInstance = await ClientWorkflowService.getInstance();
    try {
      // Check if there's a container ID in the context
      const containerId = context.state.containerId;
      
      if (!containerId) {
        console.error('No container found in context. ButtonNode requires a ContainerNode to be executed first.');
        return {
          error: () => ({ 
            message: 'No container found. Execute a ContainerNode first.',
            nodeId: context.nodeId
          })
        };
      }

      // Create the React Button component
      const ButtonComponent = () => {
        const handleClick = async () => {
          console.log('Button clicked:', context, config?.onClick);
          if (config?.onClick) {
            const workflow : WorkflowDefinition = {id:Date.now().toString(), name: 'Button Click Workflow', version: '1.0.0', description: 'Workflow triggered by button click', workflow: config.onClick};
            const result = await serviceInstance.executeWorkflow(workflow);
          }
          // Store click event in context state
          context.state.buttonClicked = {
            nodeId: context.nodeId,
            timestamp: Date.now(),
            caption: config?.caption || 'Button'
          };
        };

        return React.createElement(Button, {
          variant: config?.variant || 'default',
          size: config?.size || 'default',
          disabled: config?.disabled || false,
          onClick: handleClick,
          style: {
            margin: '10px'
          }
        }, config?.caption || 'Button');
      };

      // Find the container element to render the button inside
      const containerElement = document.getElementById(containerId);
      
      if (containerElement) {
        // Create a wrapper div for this button
        const buttonWrapper = document.createElement('div');
        buttonWrapper.id = `button-node-${context.nodeId}`;
        containerElement.appendChild(buttonWrapper);
        
        // Render the React Button component
        const root = ReactDOM.createRoot(buttonWrapper);
        root.render(React.createElement(ButtonComponent));
        
        // Store only the button wrapper ID
        context.state.buttonId = buttonWrapper.id;
        
        console.log('Button rendered successfully inside container:', context.nodeId);
        
        return {
          rendered: () => ({ 
            buttonId: buttonWrapper.id,
            nodeId: context.nodeId,
            caption: config?.caption || 'Button',
            timestamp: Date.now()
          })
        };
      } else {
        console.error('Container element not accessible');
        return {
          error: () => ({ 
            message: 'Container element not accessible',
            nodeId: context.nodeId
          })
        };
      }
    } catch (error) {
      console.error('Error rendering button:', error);
      return {
        error: () => ({ 
          message: error instanceof Error ? error.message : 'Unknown error',
          nodeId: context.nodeId
        })
      };
    }
  }
}

export default ButtonNode;