// ActionButtonGroup - Interactive button group component

import React from 'react';
import { WorkflowUIComponent, ActionButton } from '@workscript/engine';

interface ActionButtonGroupProps extends WorkflowUIComponent {
  buttons: ActionButton[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  title?: string;
}

export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  buttons,
  layout = 'horizontal',
  title,
  nodeId,
  onInteraction
}) => {
  const handleButtonClick = (button: ActionButton) => {
    onInteraction({
      type: 'button_click',
      data: {
        action: button.action,
        label: button.label,
        payload: button.payload
      },
      nodeId,
      timestamp: Date.now()
    });
  };

  return (
    <div className={`action-button-group layout-${layout}`}>
      {title && <h3 className="button-group-title">{title}</h3>}
      
      <div className="button-container">
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`action-button variant-${button.variant || 'primary'}`}
            onClick={() => handleButtonClick(button)}
            disabled={button.disabled}
            title={button.tooltip}
          >
            {button.icon && <span className="button-icon">{button.icon}</span>}
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionButtonGroup;