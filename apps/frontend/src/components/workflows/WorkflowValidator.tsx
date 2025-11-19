/**
 * WorkflowValidator Component
 *
 * Provides workflow validation with visual feedback and error display.
 * Uses the useValidateWorkflow mutation hook to validate workflow definitions
 * against the Workscript engine validation rules.
 *
 * Features:
 * - Manual validation trigger via button
 * - Real-time validation status display (success/error)
 * - Detailed error messages with line numbers
 * - Visual indicators (green checkmark for success, red X for errors)
 * - Error list with paths and messages
 *
 * Requirements Coverage:
 * - Requirement 5: Workflow Creation with Monaco Editor (validation before save)
 * - Requirement 6: Workflow Editing with Version Control (validation on edit)
 *
 * @module components/workflows/WorkflowValidator
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { WorkflowDefinition } from '@workscript/engine';
import type { ValidationResult } from '../../types/workflow.types';
import { useValidateWorkflow } from '../../hooks/api/useWorkflows';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

/**
 * Props for the WorkflowValidator component
 */
export interface WorkflowValidatorProps {
  /** The workflow definition to validate */
  workflowDefinition: WorkflowDefinition | null;

  /** Callback when validation completes (optional) */
  onValidate?: (result: ValidationResult) => void;

  /** Whether to show the validate button (default: true) */
  showButton?: boolean;

  /** Whether to auto-validate on definition change (default: false) */
  autoValidate?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * WorkflowValidator Component
 *
 * Validates workflow definitions and displays validation results with
 * detailed error information.
 *
 * @example Basic usage
 * ```tsx
 * <WorkflowValidator
 *   workflowDefinition={definition}
 *   onValidate={(result) => {
 *     if (result.valid) {
 *       console.log('Workflow is valid!');
 *     }
 *   }}
 * />
 * ```
 *
 * @example Auto-validation
 * ```tsx
 * <WorkflowValidator
 *   workflowDefinition={definition}
 *   autoValidate={true}
 *   showButton={false}
 * />
 * ```
 */
export function WorkflowValidator({
  workflowDefinition,
  onValidate,
  showButton = true,
  autoValidate = false,
  className,
}: WorkflowValidatorProps) {
  const validateMutation = useValidateWorkflow();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  /**
   * Handle manual validation trigger
   */
  const handleValidate = async () => {
    if (!workflowDefinition) {
      return;
    }

    try {
      const result = await validateMutation.mutateAsync(workflowDefinition);
      setValidationResult(result);

      // Call the callback if provided
      if (onValidate) {
        onValidate(result);
      }
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Validation failed:', error);
    }
  };

  /**
   * Auto-validate when definition changes (if enabled)
   */
  useEffect(() => {
    if (autoValidate && workflowDefinition) {
      handleValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowDefinition, autoValidate]);

  /**
   * Clear validation result when definition becomes null
   */
  useEffect(() => {
    if (!workflowDefinition) {
      setValidationResult(null);
    }
  }, [workflowDefinition]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Validate Button */}
      {showButton && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={!workflowDefinition || validateMutation.isPending}
          >
            {validateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {!validateMutation.isPending && <CheckCircle2 className="size-4" />}
            Validate Workflow
          </Button>

          {/* Validation Status Indicator */}
          {validationResult && !validateMutation.isPending && (
            <div className="flex items-center gap-1.5 text-sm">
              {validationResult.valid ? (
                <>
                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
                  <span className="text-green-600 dark:text-green-500 font-medium">
                    Workflow validation passed ✓
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-red-600 dark:text-red-500" />
                  <span className="text-red-600 dark:text-red-500 font-medium">
                    Validation failed
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Validation Results Display */}
      {validationResult && !validateMutation.isPending && (
        <div className="space-y-2">
          {/* Success State */}
          {validationResult.valid && (
            <Alert>
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
              <AlertTitle>Validation Successful</AlertTitle>
              <AlertDescription>
                The workflow definition is valid and ready for execution.
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {!validationResult.valid && validationResult.errors && validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertTitle>
                Validation Failed ({validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''})
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p className="text-sm">
                    Please fix the following errors before saving:
                  </p>
                  <ul className="list-none space-y-1.5 ml-0">
                    {validationResult.errors.map((error, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm font-mono bg-destructive/10 dark:bg-destructive/20 rounded px-2 py-1.5"
                      >
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-0.5">
                          <div className="font-semibold text-destructive">
                            {error.path || 'General Error'}
                          </div>
                          <div className="text-muted-foreground">
                            {error.message}
                          </div>
                          {error.code && (
                            <div className="text-xs text-muted-foreground/80">
                              Error Code: {error.code}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings (if any) */}
          {validationResult.warnings && validationResult.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p className="text-sm">
                    The following non-blocking issues were detected:
                  </p>
                  <ul className="list-none space-y-1.5 ml-0">
                    {validationResult.warnings.map((warning, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm font-mono bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1.5"
                      >
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-500" />
                        <div className="flex-1 space-y-0.5">
                          <div className="font-semibold text-yellow-700 dark:text-yellow-500">
                            {warning.path}
                          </div>
                          <div className="text-muted-foreground">
                            {warning.message}
                          </div>
                          {warning.suggestion && (
                            <div className="text-xs text-muted-foreground/80 italic">
                              Suggestion: {warning.suggestion}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* No Definition Warning */}
      {!workflowDefinition && showButton && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>No Workflow Definition</AlertTitle>
          <AlertDescription>
            Please provide a valid workflow definition to validate.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default WorkflowValidator;
