// Action Button Group UI Node - Interactive button groups

import { UINode } from '@workscript/engine';
import type { 
  UINodeMetadata, 
  ExecutionContext, 
  EdgeMap, 
  UIInteractionEvent,
  ActionButton 
} from '@workscript/engine';

export class ActionButtonGroupUINode extends UINode {
  metadata: UINodeMetadata = {
    id: 'ui-action-buttons',
    name: 'Action Button Group UI',
    description: 'Creates groups of interactive action buttons',
    version: '1.0.0',
    category: 'ui',
    renderMode: 'component',
    inputs: ['buttons', 'layout', 'title'],
    outputs: ['button_clicked', 'action_triggered']
  };

  protected async prepareRenderData(context: ExecutionContext, config: any) {
    const buttons = this.processButtons(config.buttons || []);
    const layout = config.layout || 'horizontal';
    
    return {
      buttons,
      layout,
      title: config.title || '',
      loading: context.state.buttonGroupLoading || false,
      disabled: context.state.buttonGroupDisabled || false,
      className: config.className || '',
      size: config.size || 'medium', // small, medium, large
      variant: config.variant || 'default', // default, outlined, ghost
      spacing: config.spacing || 'normal' // tight, normal, loose
    };
  }

  protected async getEdges(context: ExecutionContext, config: any): Promise<EdgeMap> {
    // Check if a button was clicked
    if (context.state.buttonClicked) {
      const buttonData = context.state.buttonClicked;
      context.state.buttonClicked = null; // Clear the click state
      
      // Route to the specific action edge
      if (buttonData.action) {
        return {
          [buttonData.action]: () => ({ 
            buttonLabel: buttonData.label,
            payload: buttonData.payload,
            timestamp: buttonData.timestamp
          })
        };
      }
      
      // Fallback to generic button clicked edge
      return {
        button_clicked: () => ({ 
          action: buttonData.action,
          label: buttonData.label,
          payload: buttonData.payload,
          timestamp: buttonData.timestamp
        })
      };
    }
    
    // Default - buttons ready for interaction
    return {
      ready: () => ({ 
        status: 'buttons_ready',
        buttonsCount: (config.buttons || []).length
      })
    };
  }

  protected getComponentName(): string {
    return 'ActionButtonGroup';
  }

  protected handleInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    switch (event.type) {
      case 'button_click':
        this.handleButtonClick(event.data, context);
        break;
      case 'button_group_enable':
        this.handleButtonGroupEnable(context);
        break;
      case 'button_group_disable':
        this.handleButtonGroupDisabled(context);
        break;
      case 'button_update':
        this.handleButtonUpdate(event.data, context);
        break;
      default:
        super.handleInteraction(event, context);
    }
  }

  private handleButtonClick(data: any, context: ExecutionContext): void {
    const { action, label, payload } = data;
    
    context.state.buttonClicked = {
      action,
      label,
      payload,
      timestamp: Date.now()
    };
    
    // Set loading state if specified
    if (data.showLoading) {
      context.state.buttonGroupLoading = true;
    }
  }

  private handleButtonGroupEnable(context: ExecutionContext): void {
    context.state.buttonGroupDisabled = false;
  }

  private handleButtonGroupDisabled(context: ExecutionContext): void {
    context.state.buttonGroupDisabled = true;
  }

  private handleButtonUpdate(data: any, context: ExecutionContext): void {
    // Update specific button properties
    const { buttonIndex, updates } = data;
    
    if (!context.state.buttonUpdates) {
      context.state.buttonUpdates = {};
    }
    
    context.state.buttonUpdates[buttonIndex] = {
      ...context.state.buttonUpdates[buttonIndex],
      ...updates
    };
  }

  private processButtons(buttons: any[]): ActionButton[] {
    return buttons.map((button, index) => ({
      label: button.label || `Button ${index + 1}`,
      action: button.action || `button_${index}`,
      payload: button.payload || {},
      variant: button.variant || 'primary',
      disabled: button.disabled || false,
      icon: button.icon || '',
      tooltip: button.tooltip || '',
      confirmRequired: button.confirmRequired || false,
      confirmMessage: button.confirmMessage || 'Are you sure?',
      showLoading: button.showLoading || false
    }));
  }

  // Helper methods for dynamic button management

  enableButton(context: ExecutionContext, buttonIndex: number): void {
    this.updateButton(context, buttonIndex, { disabled: false });
  }

  disableButton(context: ExecutionContext, buttonIndex: number): void {
    this.updateButton(context, buttonIndex, { disabled: true });
  }

  updateButton(context: ExecutionContext, buttonIndex: number, updates: Partial<ActionButton>): void {
    if (!context.state.buttonUpdates) {
      context.state.buttonUpdates = {};
    }
    
    context.state.buttonUpdates[buttonIndex] = {
      ...context.state.buttonUpdates[buttonIndex],
      ...updates
    };
  }

  setButtonLoading(context: ExecutionContext, buttonIndex: number, loading: boolean): void {
    this.updateButton(context, buttonIndex, { loading } as any);
  }

  addButton(context: ExecutionContext, button: ActionButton): void {
    if (!context.state.dynamicButtons) {
      context.state.dynamicButtons = [];
    }
    context.state.dynamicButtons.push(button);
  }

  removeButton(context: ExecutionContext, buttonIndex: number): void {
    if (context.state.dynamicButtons && context.state.dynamicButtons[buttonIndex]) {
      context.state.dynamicButtons.splice(buttonIndex, 1);
    }
  }
}