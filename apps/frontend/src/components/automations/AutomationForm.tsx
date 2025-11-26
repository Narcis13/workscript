/**
 * AutomationForm Component
 *
 * A multi-step form component for creating and editing automations with the following steps:
 * 1. Basic Info: name and description
 * 2. Workflow Selection: choose workflow to automate
 * 3. Trigger Configuration: select trigger type and configure (cron, webhook, immediate)
 * 4. Review & Submit: review all settings and confirm
 *
 * Uses shadcn/ui Form components with react-hook-form for validation and state management.
 *
 * Features:
 * - Multi-step form with step indicators
 * - Step-specific validation
 * - Back/Next navigation between steps
 * - Data persistence across steps
 * - Comprehensive error handling
 * - Responsive design
 *
 * Requirements Coverage:
 * - Requirement 10: Automation Creation with Trigger Configuration (Step 1)
 * - Requirement 11: Cron Expression Builder and Validator (Step 3)
 *
 * @module components/automations/AutomationForm
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Switch,
} from '@/components/ui/switch';
import { Check, ChevronsUpDown, Calendar, Globe, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TriggerType, type TriggerConfig, type CronTriggerConfig, type WebhookTriggerConfig, type ImmediateTriggerConfig } from '@/types/automation.types';
import { useWorkflows } from '@/hooks/api/useWorkflows';
import { useServerTime } from '@/hooks/api/useAutomations';
import { CronBuilder } from '@/components/automations/CronBuilder';
import { CronValidator } from '@/components/automations/CronValidator';
import { config } from '@/lib/config';

/**
 * Step identifiers in the form
 */
export type AutomationFormStep = 'basicInfo' | 'workflowSelection' | 'triggerConfig' | 'review';

/**
 * Complete automation form data structure spanning all steps
 */
export interface AutomationFormData {
  // Step 1: Basic Info
  name: string;
  description?: string;

  // Step 2: Workflow Selection
  workflowId?: string;

  // Step 3: Trigger Configuration
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  timezone?: string;
  webhookPath?: string;

  // Step 4: Review
  enabled?: boolean;
}

/**
 * Step 1 specific data (Basic Info)
 */
export interface Step1Data {
  name: string;
  description?: string;
}

/**
 * Step 2 specific data (Workflow Selection)
 */
export interface Step2Data {
  workflowId: string;
}

/**
 * Step 3 specific data (Trigger Configuration)
 */
export interface Step3Data {
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  timezone?: string;
}

/**
 * Step 4 specific data (Review & Submit)
 */
export interface Step4Data {
  enabled: boolean;
}

/**
 * Props for the AutomationForm component
 */
export interface AutomationFormProps {
  /**
   * Initial form data (for editing existing automations)
   * If not provided, form starts with empty/default values
   */
  initialData?: Partial<AutomationFormData>;

  /**
   * Callback when the entire form is submitted (Step 4 completion)
   */
  onSubmit: (data: AutomationFormData) => void | Promise<void>;

  /**
   * Callback when user cancels the form
   */
  onCancel?: () => void;

  /**
   * Whether the form is in a loading state (e.g., during API request)
   * Disables all form fields and buttons when true
   */
  loading?: boolean;

  /**
   * Optional CSS class name for the form container
   */
  className?: string;

  /**
   * Callback fired when current step changes
   * Useful for analytics or tracking
   */
  onStepChange?: (step: AutomationFormStep) => void;

  /**
   * Initial step to display (defaults to 'basicInfo')
   * Useful for resuming incomplete forms
   */
  initialStep?: AutomationFormStep;

  /**
   * Mode of the form: 'create' or 'edit'
   * Affects button labels and confirmation messages
   * Defaults to 'create'
   */
  mode?: 'create' | 'edit';
}

/**
 * Step configuration for the multi-step form
 */
const STEPS: { id: AutomationFormStep; label: string; title: string; description: string }[] = [
  {
    id: 'basicInfo',
    label: '1. Basic Info',
    title: 'Automation Details',
    description: 'Enter the name and description for your automation',
  },
  {
    id: 'workflowSelection',
    label: '2. Workflow Selection',
    title: 'Select Workflow',
    description: 'Choose which workflow to automate',
  },
  {
    id: 'triggerConfig',
    label: '3. Trigger Configuration',
    title: 'Configure Trigger',
    description: 'Set up how this automation will be triggered',
  },
  {
    id: 'review',
    label: '4. Review & Submit',
    title: 'Review Your Automation',
    description: 'Review all settings before creating the automation',
  },
];

/**
 * Validate semantic version format (e.g., 1.0.0, 2.1.3)
 * Currently not used but kept for potential future use
 */
const _isValidSemanticVersion = (version: string): boolean => {
  const semanticVersionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  return semanticVersionRegex.test(version);
};

/**
 * AutomationForm Component
 *
 * Multi-step form for creating and editing automations.
 * Manages form state across multiple steps and validates data at each step.
 *
 * @example
 * ```tsx
 * // Create new automation
 * <AutomationForm
 *   onSubmit={(data) => createAutomation(data)}
 *   onCancel={() => navigate('/automations')}
 *   loading={isCreating}
 * />
 *
 * // Edit existing automation
 * <AutomationForm
 *   initialData={{
 *     name: automation.name,
 *     description: automation.description,
 *     workflowId: automation.workflowId,
 *     triggerType: automation.trigger.type,
 *     triggerConfig: automation.trigger,
 *   }}
 *   onSubmit={(data) => updateAutomation(automation.id, data)}
 *   loading={isUpdating}
 * />
 * ```
 */
export const AutomationForm: React.FC<AutomationFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  className,
  onStepChange,
  initialStep = 'basicInfo',
  mode = 'create',
}) => {
  /**
   * Track current step in the form
   */
  const [currentStep, setCurrentStep] = useState<AutomationFormStep>(initialStep);

  /**
   * Track completed steps (used for rendering step indicators)
   */
  const [completedSteps, setCompletedSteps] = useState<Set<AutomationFormStep>>(new Set());

  /**
   * Track workflow selector popover open state
   */
  const [workflowPopoverOpen, setWorkflowPopoverOpen] = useState(false);

  /**
   * Track search input in workflow selector
   */
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState('');

  /**
   * Track whether to use manual webhook path entry (vs auto-generated)
   * In edit mode with webhook trigger, start in manual mode to show the stored path
   */
  const [useManualWebhookPath, setUseManualWebhookPath] = useState(
    mode === 'edit' && initialData?.triggerType === TriggerType.WEBHOOK
  );

  /**
   * Fetch all active workflows for selection
   * Using React Query to handle caching and refetching
   */
  const { data: workflows = [], isLoading: workflowsLoading, isError: workflowsError } = useWorkflows();

  /**
   * Fetch server time to get default timezone
   */
  const { data: serverTime } = useServerTime();

  /**
   * Get the default timezone - prefer server timezone, fall back to UTC
   */
  const defaultTimezone = serverTime?.timezone || 'UTC';

  /**
   * Initialize react-hook-form with default values and validation rules
   */
  // Determine initial trigger config based on trigger type
  const getDefaultTriggerConfig = (): TriggerConfig => {
    if (initialData?.triggerConfig) {
      return initialData.triggerConfig;
    }
    const triggerType = initialData?.triggerType || TriggerType.CRON;
    switch (triggerType) {
      case TriggerType.CRON:
        return {
          type: TriggerType.CRON,
          expression: '0 9 * * *',
          timezone: initialData?.timezone || 'UTC',
        } as CronTriggerConfig;
      case TriggerType.WEBHOOK:
        return {
          type: TriggerType.WEBHOOK,
          path: initialData?.webhookPath || 'automation',
          method: 'POST',
        } as WebhookTriggerConfig;
      case TriggerType.IMMEDIATE:
        return {
          type: TriggerType.IMMEDIATE,
          enabled: true,
        } as ImmediateTriggerConfig;
      default:
        return {
          type: TriggerType.CRON,
          expression: '0 9 * * *',
          timezone: 'UTC',
        } as CronTriggerConfig;
    }
  };

  const form = useForm<AutomationFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      workflowId: initialData?.workflowId || '',
      triggerType: initialData?.triggerType || TriggerType.CRON,
      triggerConfig: getDefaultTriggerConfig(),
      timezone: initialData?.timezone || 'UTC',
      webhookPath: initialData?.webhookPath || '',
      enabled: initialData?.enabled !== false, // Default to enabled
    },
    mode: 'onChange', // Validate on change for better UX
  });

  // Use a single useWatch to minimize subscriptions and re-renders
  // Watching all fields that need reactive updates in JSX
  const watchedValues = useWatch({
    control: form.control,
  });

  // Destructure for convenience
  const watchedTriggerType = watchedValues.triggerType;
  const watchedTriggerConfig = watchedValues.triggerConfig;
  const watchedTimezone = watchedValues.timezone;
  const watchedWebhookPath = watchedValues.webhookPath;
  const watchedName = watchedValues.name;
  const watchedWorkflowId = watchedValues.workflowId;
  const watchedDescription = watchedValues.description;
  const watchedEnabled = watchedValues.enabled;

  // Store form in a ref so callbacks don't need it as a dependency
  const formRef = useRef(form);
  formRef.current = form;

  // Sync webhookPath to triggerConfig.path when in webhook mode
  // This ensures the triggerConfig stays in sync when user edits the webhook path
  useEffect(() => {
    if (watchedTriggerType === TriggerType.WEBHOOK && watchedWebhookPath) {
      const currentConfig = formRef.current.getValues('triggerConfig') as WebhookTriggerConfig;
      // Only update if the path actually changed
      if (currentConfig?.path !== watchedWebhookPath) {
        formRef.current.setValue('triggerConfig', {
          type: TriggerType.WEBHOOK,
          path: watchedWebhookPath,
          method: currentConfig?.method || 'POST',
        } as WebhookTriggerConfig);
      }
    }
  }, [watchedTriggerType, watchedWebhookPath]);

  // Set the default timezone from server when it loads (only for new automations)
  useEffect(() => {
    if (serverTime?.timezone && mode === 'create') {
      const currentTimezone = formRef.current.getValues('timezone');
      // Only update if still on default UTC (user hasn't changed it)
      if (currentTimezone === 'UTC') {
        formRef.current.setValue('timezone', serverTime.timezone);
        // Also update the triggerConfig if it's a cron trigger
        const currentConfig = formRef.current.getValues('triggerConfig') as CronTriggerConfig;
        if (currentConfig?.type === TriggerType.CRON) {
          formRef.current.setValue('triggerConfig', {
            ...currentConfig,
            timezone: serverTime.timezone,
          });
        }
      }
    }
  }, [serverTime?.timezone, mode]);

  // Memoize the CronBuilder onChange to prevent unnecessary re-renders
  // Using ref pattern to avoid form as dependency
  const handleCronBuilderChange = useCallback((expression: string) => {
    const currentTimezone = formRef.current.getValues('timezone') || 'UTC';
    const currentConfig = formRef.current.getValues('triggerConfig') as CronTriggerConfig;

    // Only update if the expression actually changed
    if (currentConfig?.expression === expression) return;

    formRef.current.setValue('triggerConfig', {
      type: TriggerType.CRON,
      expression,
      timezone: currentTimezone,
    } as CronTriggerConfig);
  }, []);

  /**
   * Get current step configuration
   */
  const currentStepConfig = STEPS.find((s) => s.id === currentStep);

  /**
   * Get step index (0-based)
   */
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  /**
   * Check if there's a previous step
   */
  const hasPreviousStep = currentStepIndex > 0;

  /**
   * Check if there's a next step
   */
  const hasNextStep = currentStepIndex < STEPS.length - 1;

  /**
   * Handle moving to the next step
   */
  const handleNextStep = useCallback(async () => {
    // Validate current step before moving to next
    const isValid = await form.trigger();

    if (isValid && hasNextStep) {
      // Mark current step as completed
      const newCompletedSteps = new Set(completedSteps);
      newCompletedSteps.add(currentStep);
      setCompletedSteps(newCompletedSteps);

      // Move to next step
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = STEPS[nextStepIndex];
      setCurrentStep(nextStep.id);

      // Fire callback
      onStepChange?.(nextStep.id);
    }
  }, [form, currentStep, currentStepIndex, completedSteps, hasNextStep, onStepChange]);

  /**
   * Handle moving to the previous step
   */
  const handlePreviousStep = useCallback(() => {
    if (hasPreviousStep) {
      const previousStepIndex = currentStepIndex - 1;
      const previousStep = STEPS[previousStepIndex];
      setCurrentStep(previousStep.id);
      onStepChange?.(previousStep.id);
    }
  }, [currentStepIndex, hasPreviousStep, onStepChange]);

  /**
   * Handle form submission (final step)
   */
  const handleSubmit = async (data: AutomationFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling is done by parent component
      console.error('Form submission error:', error);
    }
  };

  /**
   * Validate current step's fields before proceeding
   * This function maps step to the fields that need validation
   * Note: Kept for potential future use in step validation
   */
  const _getFieldsForStep = (step: AutomationFormStep): (keyof AutomationFormData)[] => {
    switch (step) {
      case 'basicInfo':
        return ['name'];
      case 'workflowSelection':
        return ['workflowId'];
      case 'triggerConfig':
        return ['triggerType', 'triggerConfig'];
      case 'review':
        return ['enabled'];
      default:
        return [];
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className || ''}`}>
      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = completedSteps.has(step.id);

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm
                    transition-colors duration-200
                    ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-2 transition-colors duration-200
                      ${
                        isCompleted
                          ? 'bg-green-500'
                          : isActive
                            ? 'bg-primary'
                            : 'bg-muted'
                      }
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {STEPS.map((step) => (
            <span key={step.id} className="text-center flex-1">
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Current Step Title & Description */}
      {currentStepConfig && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{currentStepConfig.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{currentStepConfig.description}</p>
        </div>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 'basicInfo' && (
            <div className="space-y-4">
              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: 'Automation name is required',
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
                        placeholder="Enter automation name (e.g., 'Daily Report')"
                        disabled={loading}
                        aria-required="true"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>A descriptive name for your automation</FormDescription>
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
                        placeholder="Enter automation description (optional)"
                        disabled={loading}
                        rows={3}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description of what this automation does
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 2: Workflow Selection */}
          {currentStep === 'workflowSelection' && (
            <div className="space-y-4">
              {/* Workflow Selector Field */}
              <FormField
                control={form.control}
                name="workflowId"
                rules={{
                  required: 'Please select a workflow',
                }}
                render={({ field }) => {
                  // Get the selected workflow for display
                  const selectedWorkflow = workflows.find((w) => w.id === field.value);

                  // Filter workflows based on search query
                  const filteredWorkflows = workflows.filter(
                    (w) =>
                      w.isActive && // Only show active workflows
                      (w.name.toLowerCase().includes(workflowSearchQuery.toLowerCase()) ||
                        w.id.toLowerCase().includes(workflowSearchQuery.toLowerCase()) ||
                        (w.description?.toLowerCase().includes(workflowSearchQuery.toLowerCase()) || false))
                  );

                  return (
                    <FormItem>
                      <FormLabel>
                        Workflow <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Popover open={workflowPopoverOpen} onOpenChange={setWorkflowPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={workflowPopoverOpen}
                              className="w-full justify-between"
                              disabled={loading || workflowsLoading}
                            >
                              {selectedWorkflow ? (
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{selectedWorkflow.name}</span>
                                  <span className="text-xs text-muted-foreground">v{selectedWorkflow.version}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Select a workflow...</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search workflows by name, ID, or description..."
                                value={workflowSearchQuery}
                                onValueChange={setWorkflowSearchQuery}
                                disabled={workflowsLoading}
                              />
                              <CommandList>
                                {workflowsLoading ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    Loading workflows...
                                  </div>
                                ) : workflowsError ? (
                                  <CommandEmpty>
                                    <div className="text-sm text-destructive">
                                      Failed to load workflows. Please try again.
                                    </div>
                                  </CommandEmpty>
                                ) : filteredWorkflows.length === 0 ? (
                                  <CommandEmpty>
                                    <div className="text-sm">
                                      {workflows.length === 0
                                        ? 'No workflows available. Please create a workflow first.'
                                        : 'No workflows match your search.'}
                                    </div>
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredWorkflows.map((workflow) => (
                                      <CommandItem
                                        key={workflow.id}
                                        value={workflow.id}
                                        onSelect={(currentValue) => {
                                          field.onChange(currentValue === field.value ? '' : currentValue);
                                          setWorkflowPopoverOpen(false);
                                          setWorkflowSearchQuery('');
                                        }}
                                        className="flex items-center justify-between"
                                      >
                                        <div className="flex flex-col items-start">
                                          <span className="font-medium">{workflow.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            v{workflow.version}
                                            {workflow.description && ` • ${workflow.description}`}
                                          </span>
                                        </div>
                                        <Check
                                          className={cn(
                                            'h-4 w-4',
                                            field.value === workflow.id ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormDescription>
                        Select the workflow you want to automate. Only active workflows are shown.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Selected Workflow Details Display */}
              {watchedWorkflowId && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  {(() => {
                    const selected = workflows.find((w) => w.id === watchedWorkflowId);
                    return selected ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {selected.name}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Version {selected.version}
                          </p>
                        </div>
                        {selected.description && (
                          <p className="text-sm text-blue-800 dark:text-blue-200">{selected.description}</p>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {currentStep === 'triggerConfig' && (
            <div className="space-y-6">
              {/* Trigger Type Selection */}
              <FormField
                control={form.control}
                name="triggerType"
                rules={{
                  required: 'Please select a trigger type',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Trigger Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value || TriggerType.CRON}
                        onValueChange={(value) => {
                          // Only update if value actually changed
                          if (value === field.value) return;

                          field.onChange(value as TriggerType);
                          // Reset trigger config when changing type
                          // Use getValues() instead of watch() to avoid subscription loops
                          const currentValues = form.getValues();
                          if (value === TriggerType.CRON) {
                            form.setValue('triggerConfig', {
                              type: TriggerType.CRON,
                              expression: '0 9 * * *',
                              timezone: currentValues.timezone || 'UTC',
                            } as CronTriggerConfig);
                          } else if (value === TriggerType.WEBHOOK) {
                            const webhookPath = currentValues.webhookPath || `${currentValues.name?.toLowerCase().replace(/\s+/g, '-') || 'automation'}`;
                            form.setValue('triggerConfig', {
                              type: TriggerType.WEBHOOK,
                              path: webhookPath,
                              method: 'POST',
                            } as WebhookTriggerConfig);
                            setUseManualWebhookPath(false);
                          } else if (value === TriggerType.IMMEDIATE) {
                            form.setValue('triggerConfig', {
                              type: TriggerType.IMMEDIATE,
                              enabled: true,
                            } as ImmediateTriggerConfig);
                          }
                        }}
                        disabled={loading}
                        className="space-y-3"
                      >
                        {/* Cron Trigger Option */}
                        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                          <RadioGroupItem value={TriggerType.CRON} id="trigger-cron" />
                          <div className="flex-1">
                            <label htmlFor="trigger-cron" className="font-medium cursor-pointer">
                              Cron Schedule
                            </label>
                            <p className="text-sm text-muted-foreground">
                              Run at specific times using cron expressions
                            </p>
                          </div>
                        </div>

                        {/* Webhook Trigger Option */}
                        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                          <RadioGroupItem value={TriggerType.WEBHOOK} id="trigger-webhook" />
                          <div className="flex-1">
                            <label htmlFor="trigger-webhook" className="font-medium cursor-pointer">
                              Webhook
                            </label>
                            <p className="text-sm text-muted-foreground">
                              Trigger via HTTP webhook endpoint
                            </p>
                          </div>
                        </div>

                        {/* Immediate Trigger Option */}
                        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                          <RadioGroupItem value={TriggerType.IMMEDIATE} id="trigger-immediate" />
                          <div className="flex-1">
                            <label htmlFor="trigger-immediate" className="font-medium cursor-pointer">
                              Manual Only
                            </label>
                            <p className="text-sm text-muted-foreground">
                              This automation will only run when manually triggered
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cron Trigger Configuration */}
              {watchedTriggerType === TriggerType.CRON && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  {/* Timezone Selector */}
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Select value={field.value || defaultTimezone} onValueChange={field.onChange} disabled={loading}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Show server timezone first if available */}
                              {serverTime?.timezone && (
                                <SelectItem value={serverTime.timezone}>
                                  {serverTime.timezone} (Server Default)
                                </SelectItem>
                              )}
                              {serverTime?.timezone !== 'UTC' && (
                                <SelectItem value="UTC">UTC</SelectItem>
                              )}
                              {/* Europe */}
                              {serverTime?.timezone !== 'Europe/Bucharest' && (
                                <SelectItem value="Europe/Bucharest">Europe/Bucharest (EET/EEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/London' && (
                                <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Paris' && (
                                <SelectItem value="Europe/Paris">Europe/Paris (CET/CEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Berlin' && (
                                <SelectItem value="Europe/Berlin">Europe/Berlin (CET/CEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Rome' && (
                                <SelectItem value="Europe/Rome">Europe/Rome (CET/CEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Madrid' && (
                                <SelectItem value="Europe/Madrid">Europe/Madrid (CET/CEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Amsterdam' && (
                                <SelectItem value="Europe/Amsterdam">Europe/Amsterdam (CET/CEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Athens' && (
                                <SelectItem value="Europe/Athens">Europe/Athens (EET/EEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Helsinki' && (
                                <SelectItem value="Europe/Helsinki">Europe/Helsinki (EET/EEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Kiev' && (
                                <SelectItem value="Europe/Kiev">Europe/Kiev (EET/EEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Europe/Moscow' && (
                                <SelectItem value="Europe/Moscow">Europe/Moscow (MSK)</SelectItem>
                              )}
                              {/* Americas */}
                              {serverTime?.timezone !== 'America/New_York' && (
                                <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'America/Chicago' && (
                                <SelectItem value="America/Chicago">America/Chicago (CST/CDT)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'America/Denver' && (
                                <SelectItem value="America/Denver">America/Denver (MST/MDT)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'America/Los_Angeles' && (
                                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                              )}
                              {/* Asia */}
                              {serverTime?.timezone !== 'Asia/Tokyo' && (
                                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Asia/Shanghai' && (
                                <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Asia/Singapore' && (
                                <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Asia/Dubai' && (
                                <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                              )}
                              {/* Australia */}
                              {serverTime?.timezone !== 'Australia/Sydney' && (
                                <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT/AEST)</SelectItem>
                              )}
                              {serverTime?.timezone !== 'Australia/Melbourne' && (
                                <SelectItem value="Australia/Melbourne">Australia/Melbourne (AEDT/AEST)</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the timezone for cron expression calculation.
                          {serverTime?.timezone && (
                            <span className="block mt-1 text-blue-600 dark:text-blue-400">
                              Server timezone: {serverTime.timezone}
                            </span>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cron Expression Builder */}
                  <div className="space-y-2">
                    <FormLabel>Cron Expression</FormLabel>
                    <CronBuilder
                      value={(watchedTriggerConfig as CronTriggerConfig)?.expression || '0 9 * * *'}
                      onChange={handleCronBuilderChange}
                      timezone={watchedTimezone || 'UTC'}
                    />
                    <FormDescription>
                      Use the visual builder or enter a custom cron expression
                    </FormDescription>
                  </div>

                  {/* Cron Validator */}
                  {(watchedTriggerConfig as CronTriggerConfig)?.expression && (
                    <div className="pt-2">
                      <CronValidator
                        cronExpression={(watchedTriggerConfig as CronTriggerConfig).expression}
                        timezone={watchedTimezone || 'UTC'}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Webhook Trigger Configuration */}
              {watchedTriggerType === TriggerType.WEBHOOK && (
                <div className="space-y-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950">
                  <FormField
                    control={form.control}
                    name="webhookPath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Webhook Path <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {!useManualWebhookPath ? (
                              <div className="flex gap-2">
                                <Input
                                  value={`${watchedName?.toLowerCase().replace(/\s+/g, '-') || 'automation'}`}
                                  disabled={true}
                                  placeholder="Auto-generated webhook path"
                                  className="bg-muted"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setUseManualWebhookPath(true)}
                                  disabled={loading}
                                >
                                  Customize
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  {...field}
                                  placeholder="my-automation"
                                  disabled={loading}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setUseManualWebhookPath(false);
                                    const currentName = form.getValues('name');
                                    field.onChange(`${currentName?.toLowerCase().replace(/\s+/g, '-') || 'automation'}`);
                                  }}
                                  disabled={loading}
                                >
                                  Reset
                                </Button>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          The HTTP path where this automation will be triggered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Webhook Display Info */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded border">
                    <p className="text-sm font-medium mb-2">Full Webhook URL:</p>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {`POST ${config.apiUrl}/workscript/automations/webhook/${watchedWebhookPath || 'automation'}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Immediate Trigger Configuration */}
              {watchedTriggerType === TriggerType.IMMEDIATE && (
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="space-y-2">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Manual Trigger Only
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      This automation will only run when manually triggered through the UI or API. No automatic scheduling is configured.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Automation Configuration Summary */}
              <div className="space-y-4">
                {/* Basic Information Section */}
                <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-semibold text-sm mb-3">Basic Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Name</p>
                      <p className="text-base font-medium">{watchedName || '(Not set)'}</p>
                    </div>
                    {watchedDescription && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        <p className="text-sm text-foreground">{watchedDescription}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Workflow Information Section */}
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/50">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Workflow
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const selectedWorkflow = workflows.find((w) => w.id === watchedWorkflowId);
                      return selectedWorkflow ? (
                        <>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Workflow Name</p>
                            <p className="text-base font-medium">{selectedWorkflow.name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Version</p>
                            <p className="text-sm text-foreground">v{selectedWorkflow.version}</p>
                          </div>
                          {selectedWorkflow.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Description</p>
                              <p className="text-sm text-foreground">{selectedWorkflow.description}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-destructive">(Workflow not selected)</p>
                      );
                    })()}
                  </div>
                </div>

                {/* Trigger Configuration Section */}
                <div
                  className={`p-4 border rounded-lg ${
                    watchedTriggerType === TriggerType.CRON
                      ? 'bg-orange-50 dark:bg-orange-950/50'
                      : watchedTriggerType === TriggerType.WEBHOOK
                        ? 'bg-purple-50 dark:bg-purple-950/50'
                        : 'bg-green-50 dark:bg-green-950/50'
                  }`}
                >
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    {watchedTriggerType === TriggerType.CRON ? (
                      <>
                        <Calendar className="w-4 h-4" />
                        Cron Schedule
                      </>
                    ) : watchedTriggerType === TriggerType.WEBHOOK ? (
                      <>
                        <Globe className="w-4 h-4" />
                        Webhook
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Manual Only
                      </>
                    )}
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Trigger Type</p>
                      <p className="text-base font-medium capitalize">
                        {watchedTriggerType?.replace('-', ' ') || '(Not set)'}
                      </p>
                    </div>

                    {/* Cron Trigger Details */}
                    {watchedTriggerType === TriggerType.CRON && (
                      <>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Cron Expression</p>
                          <p className="text-sm font-mono bg-background p-2 rounded border">
                            {(watchedTriggerConfig as CronTriggerConfig)?.expression || '(Not set)'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Timezone</p>
                          <p className="text-sm text-foreground">
                            {watchedTimezone || 'UTC'}
                          </p>
                        </div>
                        {(watchedTriggerConfig as CronTriggerConfig)?.expression && (
                          <div className="mt-3 p-2 bg-background rounded border text-xs text-muted-foreground">
                            <p className="font-medium mb-1">Next 5 runs will be displayed during creation</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Webhook Trigger Details */}
                    {watchedTriggerType === TriggerType.WEBHOOK && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Webhook Path</p>
                        <p className="text-sm font-mono bg-background p-2 rounded border break-all">
                          {watchedWebhookPath || '(Not set)'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Full URL: POST {config.apiUrl}/workscript/automations/webhook/
                          {watchedWebhookPath || 'automation'}
                        </p>
                      </div>
                    )}

                    {/* Immediate Trigger Details */}
                    {watchedTriggerType === TriggerType.IMMEDIATE && (
                      <p className="text-sm text-foreground">
                        This automation will only run when manually triggered through the UI or API.
                      </p>
                    )}
                  </div>
                </div>

                {/* Automation Status Section */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-sm mb-4">Automation Status</h3>
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Automation</FormLabel>
                          <FormDescription>
                            Enable this automation to activate scheduling or webhooks
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={loading}
                            aria-label="Enable automation"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-3 p-2 bg-background rounded">
                    {watchedEnabled
                      ? 'This automation is enabled and will be executed according to the trigger configuration.'
                      : 'This automation is disabled. It will not execute until enabled.'}
                  </p>
                </div>
              </div>

              {/* Review Information Banner */}
              <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <span className="font-medium">✓ Review Complete</span> - All settings look good. Click "{mode === 'edit' ? 'Save Changes' : 'Create Automation'}" to complete the setup.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            {/* Back Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              disabled={!hasPreviousStep || loading}
            >
              Back
            </Button>

            {/* Right Side Buttons */}
            <div className="flex gap-2">
              {currentStep === 'basicInfo' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}

              {hasNextStep && (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={loading}
                >
                  Next
                </Button>
              )}

              {currentStep === 'review' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Automation')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

/**
 * Export AutomationForm as default
 */
export default AutomationForm;
