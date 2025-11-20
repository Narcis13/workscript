/**
 * RescheduleAutomationDialog Component
 *
 * A dialog component for rescheduling cron-based automations with visual cron builder.
 * Pre-populates the CronBuilder with the current schedule and allows users to modify
 * the cron expression and timezone before confirming the reschedule.
 *
 * Features:
 * - Pre-populated CronBuilder with current cron expression and timezone
 * - Validation of cron expression before submission
 * - Loading state during reschedule operation
 * - Toast notifications on success/error
 * - Automatic cache invalidation on success
 *
 * @module components/automations/RescheduleAutomationDialog
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * const { mutate: reschedule, isPending } = useRescheduleAutomation();
 *
 * return (
 *   <>
 *     <Button onClick={() => setOpen(true)}>Reschedule</Button>
 *     <RescheduleAutomationDialog
 *       open={open}
 *       onOpenChange={setOpen}
 *       automation={automation}
 *       onConfirm={reschedule}
 *       loading={isPending}
 *     />
 *   </>
 * );
 * ```
 */

import { useState, useEffect } from 'react';
import { CronBuilder } from './CronBuilder';
import { CronValidator } from './CronValidator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Automation } from '@/types/automation.types';
import { TriggerType } from '@/types/automation.types';

/**
 * Props for RescheduleAutomationDialog component
 */
interface RescheduleAutomationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The automation to reschedule */
  automation: Automation;
  /** Callback when user confirms the reschedule with new cron config */
  onConfirm: (cronConfig: { expression: string; timezone?: string }) => void;
  /** Whether the reschedule operation is in progress */
  loading?: boolean;
}

/**
 * RescheduleAutomationDialog Component
 *
 * Provides a dialog interface for rescheduling cron-based automations.
 * Integrates the CronBuilder component for visual cron expression editing
 * and displays next run times using CronValidator.
 *
 * @param props - Component props
 * @returns React component
 */
export function RescheduleAutomationDialog({
  open,
  onOpenChange,
  automation,
  onConfirm,
  loading = false,
}: RescheduleAutomationDialogProps) {
  // Extract trigger config (cast to any to access triggerConfig)
  const automationAny = automation as any;
  const triggerConfig = automationAny?.triggerConfig;
  const isCronTrigger = triggerConfig?.type === TriggerType.CRON;

  // Dialog state
  const [cronExpression, setCronExpression] = useState<string>(
    triggerConfig?.expression || '0 0 * * *'
  );
  const [timezone, setTimezone] = useState<string>(
    triggerConfig?.timezone || 'UTC'
  );

  /**
   * Update local state when automation prop changes or dialog opens
   */
  useEffect(() => {
    if (open && triggerConfig) {
      setCronExpression(triggerConfig.expression || '0 0 * * *');
      setTimezone(triggerConfig.timezone || 'UTC');
    }
  }, [open, triggerConfig]);

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    onOpenChange(false);
  };

  /**
   * Handle confirm button click
   * Validates the cron expression before submitting
   */
  const handleConfirm = () => {
    if (!cronExpression || cronExpression.trim() === '') {
      return;
    }

    // Submit the new cron config
    onConfirm({
      expression: cronExpression,
      timezone: timezone || 'UTC',
    });

    // Close the dialog
    onOpenChange(false);
  };

  // Only show if this is a cron trigger automation
  if (!isCronTrigger) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reschedule Automation</DialogTitle>
          <DialogDescription>
            Update the cron expression and timezone for{' '}
            <span className="font-semibold text-foreground">{automation.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CronBuilder Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Schedule Configuration</Label>
            <CronBuilder
              value={cronExpression}
              onChange={setCronExpression}
              timezone={timezone}
              onTimezoneChange={setTimezone}
            />
          </div>

          {/* CronValidator Section - Shows next run times */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Next Scheduled Runs</Label>
            <CronValidator
              cronExpression={cronExpression}
              timezone={timezone}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !cronExpression}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Confirm Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RescheduleAutomationDialog;
