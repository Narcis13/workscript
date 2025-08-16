// Form UI Node - Dynamic form generation and handling

import { UINode } from 'shared';
import type { 
  UINodeMetadata, 
  ExecutionContext, 
  EdgeMap, 
  UIInteractionEvent,
  FormField 
} from 'shared';

export class FormUINode extends UINode {
  metadata: UINodeMetadata = {
    id: 'ui-form',
    name: 'Dynamic Form UI',
    description: 'Creates interactive forms with validation and submission handling',
    version: '1.0.0',
    category: 'ui-form',
    renderMode: 'component',
    inputs: ['fields', 'validation', 'submitAction', 'title'],
    outputs: ['formData', 'validation_error', 'form_submitted']
  };

  protected async prepareRenderData(context: ExecutionContext, config: any) {
    const fields = config.fields || [];
    const validation = config.validation || {};
    const title = config.title || 'Form';
    
    return {
      fields: this.processFields(fields),
      validation,
      title,
      initialData: context.state.formInitialData || {},
      loading: context.state.formLoading || false,
      errors: context.state.formErrors || {},
      submitLabel: config.submitLabel || 'Submit',
      cancelLabel: config.cancelLabel || 'Cancel',
      showCancel: config.showCancel || false
    };
  }

  protected async getEdges(context: ExecutionContext, config: any): Promise<EdgeMap> {
    // Check if form was submitted
    if (context.state.formSubmitted) {
      const hasErrors = context.state.formErrors && Object.keys(context.state.formErrors).length > 0;
      
      if (hasErrors) {
        return {
          validation_error: () => ({ 
            errors: context.state.formErrors,
            formData: context.state.formData 
          })
        };
      } else {
        return {
          success: () => ({ 
            formData: context.state.formData,
            submittedAt: new Date().toISOString()
          })
        };
      }
    }
    
    // Check if form was cancelled
    if (context.state.formCancelled) {
      return {
        cancelled: () => ({ reason: 'user_cancelled' })
      };
    }
    
    // Default - form is waiting for input
    return {
      waiting: () => ({ status: 'waiting_for_input' })
    };
  }

  protected getComponentName(): string {
    return 'WorkflowForm';
  }

  protected handleInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    switch (event.type) {
      case 'form_submit':
        this.handleFormSubmit(event.data, context);
        break;
      case 'form_cancel':
        this.handleFormCancel(context);
        break;
      case 'field_change':
        this.handleFieldChange(event.data, context);
        break;
      default:
        super.handleInteraction(event, context);
    }
  }

  private handleFormSubmit(formData: any, context: ExecutionContext): void {
    // Validate form data
    const errors = this.validateFormData(formData, context);
    
    if (Object.keys(errors).length > 0) {
      context.state.formErrors = errors;
      context.state.formSubmitted = false;
    } else {
      context.state.formData = formData;
      context.state.formErrors = {};
      context.state.formSubmitted = true;
    }
    
    // Clear loading state
    context.state.formLoading = false;
  }

  private handleFormCancel(context: ExecutionContext): void {
    context.state.formCancelled = true;
    context.state.formSubmitted = false;
    context.state.formData = null;
  }

  private handleFieldChange(fieldData: { name: string; value: any }, context: ExecutionContext): void {
    // Update form state with field changes (for real-time validation)
    if (!context.state.formFieldValues) {
      context.state.formFieldValues = {};
    }
    context.state.formFieldValues[fieldData.name] = fieldData.value;
  }

  private processFields(fields: any[]): FormField[] {
    return fields.map(field => ({
      name: field.name || '',
      type: field.type || 'text',
      label: field.label || field.name || '',
      placeholder: field.placeholder || '',
      required: field.required || false,
      options: field.options || [],
      validation: field.validation || {}
    }));
  }

  private validateFormData(formData: any, context: ExecutionContext): Record<string, string> {
    const errors: Record<string, string> = {};
    const fields = context.state.formFields || [];
    
    fields.forEach((field: FormField) => {
      const value = formData[field.name];
      
      // Check required fields
      if (field.required && (!value || value.toString().trim() === '')) {
        errors[field.name] = `${field.label} is required`;
        return;
      }
      
      // Skip validation for empty non-required fields
      if (!value || value.toString().trim() === '') {
        return;
      }
      
      // Type-specific validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.name] = 'Please enter a valid email address';
        }
      }
      
      if (field.type === 'number' && value) {
        if (isNaN(Number(value))) {
          errors[field.name] = 'Please enter a valid number';
        }
      }
      
      // Custom validation rules
      if (field.validation) {
        if (field.validation.min && value.toString().length < field.validation.min) {
          errors[field.name] = `Minimum length is ${field.validation.min}`;
        }
        
        if (field.validation.max && value.toString().length > field.validation.max) {
          errors[field.name] = `Maximum length is ${field.validation.max}`;
        }
        
        if (field.validation.pattern) {
          const pattern = new RegExp(field.validation.pattern);
          if (!pattern.test(value.toString())) {
            errors[field.name] = 'Please enter a valid value';
          }
        }
        
        if (field.validation.custom && typeof field.validation.custom === 'function') {
          const customError = field.validation.custom(value);
          if (customError) {
            errors[field.name] = customError;
          }
        }
      }
    });
    
    return errors;
  }
}