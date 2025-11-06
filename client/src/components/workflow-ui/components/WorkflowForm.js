import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// WorkflowForm - Dynamic form component for UI workflows
import React, { useState } from 'react';
import { WorkflowUIComponent, FormField, UIEventFactory } from 'shared';
export const WorkflowForm = ({ fields, validation, title, initialData = {}, loading = false, errors = {}, submitLabel = 'Submit', cancelLabel = 'Cancel', showCancel = false, nodeId, workflowState, onInteraction }) => {
    const [formData, setFormData] = useState(initialData);
    const [localErrors, setLocalErrors] = useState(errors);
    const handleFieldChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        // Clear field error when user starts typing
        if (localErrors[fieldName]) {
            setLocalErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
        // Emit field change event
        onInteraction({
            type: 'field_change',
            data: { name: fieldName, value },
            nodeId,
            timestamp: Date.now()
        });
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const submitEvent = UIEventFactory.createFormSubmitEvent(nodeId, formData);
        onInteraction(submitEvent);
    };
    const handleCancel = () => {
        const cancelEvent = UIEventFactory.createCustomEvent('form_cancel', nodeId, {});
        onInteraction(cancelEvent);
    };
    const renderField = (field) => {
        const value = formData[field.name] || '';
        const error = localErrors[field.name] || '';
        switch (field.type) {
            case 'textarea':
                return (_jsx("textarea", { id: field.name, name: field.name, value: value, placeholder: field.placeholder, required: field.required, onChange: (e) => handleFieldChange(field.name, e.target.value), className: `workflow-textarea ${error ? 'error' : ''}` }));
            case 'select':
                return (_jsxs("select", { id: field.name, name: field.name, value: value, required: field.required, onChange: (e) => handleFieldChange(field.name, e.target.value), className: `workflow-select ${error ? 'error' : ''}`, children: [_jsx("option", { value: "", children: "Choose..." }), field.options?.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value)))] }));
            default:
                return (_jsx("input", { type: field.type, id: field.name, name: field.name, value: value, placeholder: field.placeholder, required: field.required, onChange: (e) => handleFieldChange(field.name, e.target.value), className: `workflow-input ${error ? 'error' : ''}` }));
        }
    };
    return (_jsxs("div", { className: "workflow-form-container", children: [title && _jsx("h3", { className: "form-title", children: title }), _jsxs("form", { onSubmit: handleSubmit, className: "workflow-form", children: [fields.map(field => (_jsxs("div", { className: "form-field", children: [_jsxs("label", { htmlFor: field.name, className: "field-label", children: [field.label, field.required && _jsx("span", { className: "required", children: "*" })] }), renderField(field), localErrors[field.name] && (_jsx("span", { className: "field-error", children: localErrors[field.name] }))] }, field.name))), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "submit", disabled: loading, className: "submit-button", children: loading ? 'Submitting...' : submitLabel }), showCancel && (_jsx("button", { type: "button", onClick: handleCancel, className: "cancel-button", children: cancelLabel }))] })] })] }));
};
export default WorkflowForm;
