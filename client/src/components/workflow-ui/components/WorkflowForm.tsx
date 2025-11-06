// WorkflowForm - Dynamic form component for UI workflows

import React, { useState } from 'react';
import { WorkflowUIComponent, FormField, UIEventFactory } from '@workscript/engine';

interface WorkflowFormProps extends WorkflowUIComponent {
  fields: FormField[];
  validation?: any;
  title?: string;
  initialData?: Record<string, any>;
  loading?: boolean;
  errors?: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}

export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  fields,
  validation,
  title,
  initialData = {},
  loading = false,
  errors = {},
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  showCancel = false,
  nodeId,
  workflowState,
  onInteraction
}) => {
  const [formData, setFormData] = useState(initialData);
  const [localErrors, setLocalErrors] = useState(errors);

  const handleFieldChange = (fieldName: string, value: any) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitEvent = UIEventFactory.createFormSubmitEvent(nodeId, formData);
    onInteraction(submitEvent);
  };

  const handleCancel = () => {
    const cancelEvent = UIEventFactory.createCustomEvent('form_cancel', nodeId, {});
    onInteraction(cancelEvent);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const error = localErrors[field.name] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={value}
            placeholder={field.placeholder}
            required={field.required}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`workflow-textarea ${error ? 'error' : ''}`}
          />
        );
      
      case 'select':
        return (
          <select
            id={field.name}
            name={field.name}
            value={value}
            required={field.required}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`workflow-select ${error ? 'error' : ''}`}
          >
            <option value="">Choose...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            type={field.type}
            id={field.name}
            name={field.name}
            value={value}
            placeholder={field.placeholder}
            required={field.required}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`workflow-input ${error ? 'error' : ''}`}
          />
        );
    }
  };

  return (
    <div className="workflow-form-container">
      {title && <h3 className="form-title">{title}</h3>}
      
      <form onSubmit={handleSubmit} className="workflow-form">
        {fields.map(field => (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            
            {renderField(field)}
            
            {localErrors[field.name] && (
              <span className="field-error">{localErrors[field.name]}</span>
            )}
          </div>
        ))}
        
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Submitting...' : submitLabel}
          </button>
          
          {showCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="cancel-button"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default WorkflowForm;