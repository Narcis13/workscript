import React, { useEffect, useCallback, useState } from 'react';
import { useValidateCron } from '@/hooks/api/useAutomations';
import { Check, X, Info, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';

/**
 * Props for CronValidator component
 */
interface CronValidatorProps {
  /** The cron expression to validate */
  cronExpression: string;
  /** The timezone to use for calculating next run times */
  timezone?: string;
}

/**
 * CronValidator Component
 *
 * Real-time validator for cron expressions with automatic debouncing.
 * Displays validation status and the next 5 execution times in the specified timezone.
 * Includes helpful tooltip with cron syntax examples.
 *
 * Features:
 * - 300ms debounce to avoid excessive API calls
 * - Real-time validation feedback with visual indicators
 * - Shows next 5 execution times formatted in user's timezone
 * - Info tooltip with cron syntax examples and best practices
 * - Handles loading and error states gracefully
 *
 * @example
 * ```tsx
 * <CronValidator
 *   cronExpression="0 9 * * *"
 *   timezone="America/New_York"
 * />
 * ```
 *
 * @param props - Component props
 * @returns React component
 */
export const CronValidator: React.FC<CronValidatorProps> = ({
  cronExpression,
  timezone = 'UTC',
}) => {
  const validateMutation = useValidateCron();
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  /**
   * Trigger validation with debounce
   * Debounces at 300ms to reduce API calls while user is typing
   */
  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounce timer
    if (cronExpression.trim()) {
      timerRef.current = setTimeout(() => {
        validateMutation.mutate({
          expression: cronExpression,
          timezone,
        });
      }, 300); // 300ms debounce as specified in requirements
    }

    // Cleanup on unmount or when effect runs again
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [cronExpression, timezone, validateMutation]);

  const result = validateMutation.data;
  const isLoading = validateMutation.isPending;
  const isValid = result?.valid;

  return (
    <div className="space-y-3">
      {/* Validation Status Indicator */}
      <div className="flex items-center gap-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Validating...</span>
          </div>
        )}

        {!isLoading && result && isValid && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Valid cron expression</span>
          </div>
        )}

        {!isLoading && result && !isValid && (
          <div className="flex items-center gap-2 text-red-600">
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Invalid cron expression</span>
          </div>
        )}
      </div>

      {/* Error message for invalid expressions */}
      {!isLoading && result && !isValid && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Validation Error</p>
          <p className="mt-1 text-xs">{result.error || 'Invalid cron expression format'}</p>
        </div>
      )}

      {/* Next execution times for valid expressions */}
      {!isLoading && result && isValid && result.nextRunTimes && result.nextRunTimes.length > 0 && (
        <div className="rounded-md bg-green-50 p-3">
          <p className="mb-2 text-sm font-medium text-green-900">Next scheduled runs:</p>
          <ul className="space-y-1">
            {result.nextRunTimes.slice(0, 5).map((time, index) => {
              try {
                // Parse the time and format it in the user's timezone
                const date = new Date(time);
                const formattedTime = format(date, 'PPpp');
                return (
                  <li key={index} className="text-xs text-green-800">
                    <span className="font-mono">{index + 1}.</span> {formattedTime}
                  </li>
                );
              } catch (error) {
                // Fallback if date parsing fails
                return (
                  <li key={index} className="text-xs text-green-800">
                    <span className="font-mono">{index + 1}.</span> {String(time)}
                  </li>
                );
              }
            })}
          </ul>
        </div>
      )}

      {/* Info tooltip with cron syntax examples */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm" side="right">
            <div className="space-y-2">
              <p className="font-semibold">Cron Expression Format</p>
              <p className="text-xs">Format: minute hour day month dayOfWeek</p>
              <p className="text-xs">Each field: 0-59 (min), 0-23 (hour), 1-31 (day), 1-12 (month), 0-6 (dow)</p>
              <div className="mt-2 space-y-1">
                <p className="font-semibold text-xs">Examples:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <span className="font-mono">0 9 * * *</span> - Daily at 9 AM</li>
                  <li>• <span className="font-mono">*/5 * * * *</span> - Every 5 minutes</li>
                  <li>• <span className="font-mono">0 0 1 * *</span> - First day of month</li>
                  <li>• <span className="font-mono">0 9 * * 1-5</span> - Weekdays at 9 AM</li>
                  <li>• <span className="font-mono">0 0 * * 0</span> - Every Sunday midnight</li>
                </ul>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        <span>Tip: Hover for cron syntax examples</span>
      </div>
    </div>
  );
};

export default CronValidator;
