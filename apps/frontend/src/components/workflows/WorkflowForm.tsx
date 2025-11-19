/**
 * WorkflowForm Component
 *
 * A form component for creating and editing workflow metadata (name, description, version).
 * Uses shadcn/ui Form components with react-hook-form for validation and state management.
 *
 * Features:
 * - Name field (required, min 3 characters)
 * - Description field (optional, textarea)
 * - Version field (defaults to "1.0.0", semantic version validation)
 * - Real-time validation with error messages
 * - Loading state support
 * - Accessible form with proper labels and ARIA attributes
 *
 * Requirements Coverage:
 * - Requirement 5: Workflow Creation with Monaco Editor
 * - Requirement 6: Workflow Editing with Version Control
 *
 * @module components/workflows/WorkflowForm
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Workflow form data structure
 */
export interface WorkflowFormData {
  /**
   * Workflow name (required)
   * Must be at least 3 characters long
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Semantic version (e.g., "1.0.0")
   * Defaults to "1.0.0" if not provided
   */
  version: string;
}

/**
 * Props for the WorkflowForm component
 */
export interface WorkflowFormProps {
  /**
   * Initial form data (for editing existing workflows)
   * If not provided, form starts with empty/default values
   */
  initialData?: Partial<WorkflowFormData>;

  /**
   * Callback when form is submitted with valid data
   */
  onSubmit: (data: WorkflowFormData) => void | Promise<void>;

  /**
   * Whether the form is in a loading state (e.g., during API request)
   * Disables all form fields when true
   */
  loading?: boolean;

  /**
   * Optional CSS class name for the form container
   */
  className?: string;

  /**
   * Optional children to render below the form fields
   * (e.g., action buttons, additional controls)
   */
  children?: React.ReactNode;
}

/**
 * Validate semantic version format (e.g., 1.0.0, 2.1.3)
 */
const isValidSemanticVersion = (version: string): boolean => {
  const semanticVersionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  return semanticVersionRegex.test(version);
};

/**
 * WorkflowForm Component
 *
 * Form component for creating and editing workflow metadata.
 * Uses react-hook-form for validation and shadcn/ui components for UI.
 *
 * @example
 * ```tsx
 * // Create new workflow
 * <WorkflowForm
 *   onSubmit={(data) => createWorkflow(data)}
 *   loading={isCreating}
 * >
 *   <div className="flex gap-2">
 *     <Button type="submit" disabled={isCreating}>Save</Button>
 *     <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
 *   </div>
 * </WorkflowForm>
 *
 * // Edit existing workflow
 * <WorkflowForm
 *   initialData={{
 *     name: workflow.name,
 *     description: workflow.description,
 *     version: workflow.version,
 *   }}
 *   onSubmit={(data) => updateWorkflow(workflow.id, data)}
 *   loading={isUpdating}
 * >
 *   <Button type="submit" disabled={isUpdating}>Update</Button>
 * </WorkflowForm>
 * ```
 */
export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
  className,
  children,
}) => {
  /**
   * Initialize react-hook-form with default values and validation rules
   */
  const form = useForm<WorkflowFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      version: initialData?.version || '1.0.0',
    },
    mode: 'onChange', // Validate on change for better UX
  });

  /**
   * Handle form submission
   * Validates all fields and calls onSubmit callback with data
   */
  const handleSubmit = async (data: WorkflowFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling is done by parent component
      console.error('Form submission error:', error);
    }
  };

  /**
   * Check if form has been modified
   */
  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={className}
        noValidate
      >
        <div className="space-y-6">
          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            rules={{
              required: 'Workflow name is required',
              minLength: {
                value: 3,
                message: 'Name must be at least 3 characters long',
              },
              maxLength: {
                value: 100,
                message: 'Name must not exceed 100 characters',
              },
              validate: (value) => {
                const trimmed = value.trim();
                if (trimmed.length === 0) {
                  return 'Name cannot be only whitespace';
                }
                return true;
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter workflow name"
                    disabled={loading}
                    aria-required="true"
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  A descriptive name for your workflow (required)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description Field */}
          <FormField
            control={form.control}
            name="description"
            rules={{
              maxLength: {
                value: 500,
                message: 'Description must not exceed 500 characters',
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter workflow description (optional)"
                    disabled={loading}
                    rows={4}
                    className="resize-none"
                  />
                </FormControl>
                <FormDescription>
                  Optional description of what this workflow does
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Version Field */}
          <FormField
            control={form.control}
            name="version"
            rules={{
              required: 'Version is required',
              validate: (value) => {
                if (!isValidSemanticVersion(value)) {
                  return 'Version must be in semantic version format (e.g., 1.0.0)';
                }
                return true;
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Version <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="1.0.0"
                    disabled={loading}
                    aria-required="true"
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Semantic version (e.g., 1.0.0, 2.1.3)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Render children (action buttons) */}
          {children}
        </div>
      </form>
    </Form>
  );
};

/**
 * Export WorkflowForm as default
 */
export default WorkflowForm;
