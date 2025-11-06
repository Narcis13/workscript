import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ActionButtonGroup - Interactive button group component
import React from 'react';
import { WorkflowUIComponent, ActionButton } from 'shared';
export const ActionButtonGroup = ({ buttons, layout = 'horizontal', title, nodeId, onInteraction }) => {
    const handleButtonClick = (button) => {
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
    return (_jsxs("div", { className: `action-button-group layout-${layout}`, children: [title && _jsx("h3", { className: "button-group-title", children: title }), _jsx("div", { className: "button-container", children: buttons.map((button, index) => (_jsxs("button", { className: `action-button variant-${button.variant || 'primary'}`, onClick: () => handleButtonClick(button), disabled: button.disabled, title: button.tooltip, children: [button.icon && _jsx("span", { className: "button-icon", children: button.icon }), button.label] }, index))) })] }));
};
export default ActionButtonGroup;
