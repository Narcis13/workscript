// Action Button Group UI Node - Interactive button groups
import { UINode } from 'shared';
export class ActionButtonGroupUINode extends UINode {
    metadata = {
        id: 'ui-action-buttons',
        name: 'Action Button Group UI',
        description: 'Creates groups of interactive action buttons',
        version: '1.0.0',
        category: 'ui',
        renderMode: 'component',
        inputs: ['buttons', 'layout', 'title'],
        outputs: ['button_clicked', 'action_triggered']
    };
    async prepareRenderData(context, config) {
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
    async getEdges(context, config) {
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
    getComponentName() {
        return 'ActionButtonGroup';
    }
    handleInteraction(event, context) {
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
    handleButtonClick(data, context) {
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
    handleButtonGroupEnable(context) {
        context.state.buttonGroupDisabled = false;
    }
    handleButtonGroupDisabled(context) {
        context.state.buttonGroupDisabled = true;
    }
    handleButtonUpdate(data, context) {
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
    processButtons(buttons) {
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
    enableButton(context, buttonIndex) {
        this.updateButton(context, buttonIndex, { disabled: false });
    }
    disableButton(context, buttonIndex) {
        this.updateButton(context, buttonIndex, { disabled: true });
    }
    updateButton(context, buttonIndex, updates) {
        if (!context.state.buttonUpdates) {
            context.state.buttonUpdates = {};
        }
        context.state.buttonUpdates[buttonIndex] = {
            ...context.state.buttonUpdates[buttonIndex],
            ...updates
        };
    }
    setButtonLoading(context, buttonIndex, loading) {
        this.updateButton(context, buttonIndex, { loading });
    }
    addButton(context, button) {
        if (!context.state.dynamicButtons) {
            context.state.dynamicButtons = [];
        }
        context.state.dynamicButtons.push(button);
    }
    removeButton(context, buttonIndex) {
        if (context.state.dynamicButtons && context.state.dynamicButtons[buttonIndex]) {
            context.state.dynamicButtons.splice(buttonIndex, 1);
        }
    }
}
