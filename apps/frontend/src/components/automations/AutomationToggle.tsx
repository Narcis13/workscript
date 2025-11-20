/**
 * AutomationToggle Component
 *
 * A specialized toggle switch for enabling/disabling automations.
 * Handles the mutation request, loading state, and provides visual feedback
 * during the toggle operation.
 *
 * Features:
 * - shadcn/ui Switch component integration
 * - Loading state with disabled button feedback
 * - Automatic mutation handling via useToggleAutomation hook
 * - Accessible keyboard navigation
 * - Dark mode support
 * - Optional label display
 * - Proper TypeScript typing
 *
 * Requirements Coverage:
 * - Requirement 9: Automation List Management and Filtering
 * - Requirement 12: Automation Execution Management and Monitoring
 *
 * @module components/automations/AutomationToggle
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useToggleAutomation } from '@/hooks/api/useAutomations';
import { Loader2 } from 'lucide-react';

/**
 * Props for the AutomationToggle component
 */
export interface AutomationToggleProps {
  /**
   * Unique automation identifier (UUID)
   */
  automationId: string;

  /**
   * Current enabled/disabled status of the automation
   */
  enabled: boolean;

  /**
   * Optional callback fired after successful toggle
   * Useful for tracking UI state or triggering additional updates
   */
  onChange?: (enabled: boolean) => void;

  /**
   * Optional automation name for accessibility labels
   */
  automationName?: string;

  /**
   * Whether the toggle is disabled (e.g., due to lack of permissions)
   * @default false
   */
  disabled?: boolean;

  /**
   * Optional CSS class name for styling
   */
  className?: string;

  /**
   * Whether to show a label next to the toggle
   * @default false
   */
  showLabel?: boolean;

  /**
   * Size variant for the switch
   * @default "default"
   */
  size?: 'sm' | 'default';
}

/**
 * AutomationToggle Component
 *
 * Provides a user-friendly toggle for enabling/disabling automations.
 * Integrates with React Query mutation for handling the API request
 * and managing loading/error states.
 *
 * The component handles:
 * - Mutation request through useToggleAutomation hook
 * - Loading state during API call
 * - Disabled state when mutation is pending
 * - Toast notifications for success/error (handled by the hook)
 * - Accessibility features for screen readers
 *
 * @example
 * ```tsx
 * function AutomationCard({ automation }) {
 *   const [enabled, setEnabled] = useState(automation.enabled);
 *
 *   return (
 *     <AutomationToggle
 *       automationId={automation.id}
 *       automationName={automation.name}
 *       enabled={enabled}
 *       onChange={setEnabled}
 *     />
 *   );
 * }
 * ```
 *
 * @example With disabled state
 * ```tsx
 * <AutomationToggle
 *   automationId={automation.id}
 *   enabled={automation.enabled}
 *   disabled={!userPermissions.canToggle}
 *   showLabel
 * />
 * ```
 *
 * @example In a form
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <AutomationToggle
 *     automationId={automationId}
 *     enabled={formData.enabled}
 *     onChange={(enabled) => setFormData({ ...formData, enabled })}
 *     showLabel
 *   />
 *   <span className="text-sm text-muted-foreground">
 *     {formData.enabled ? 'This automation is enabled' : 'This automation is disabled'}
 *   </span>
 * </div>
 * ```
 */
export const AutomationToggle: React.FC<AutomationToggleProps> = ({
  automationId,
  enabled,
  onChange,
  automationName = 'automation',
  disabled = false,
  className = '',
  showLabel = false,
  size = 'default',
}) => {
  // Get toggle mutation hook
  const toggleMutation = useToggleAutomation();

  /**
   * Handle toggle change
   * Calls the mutation API and fires onChange callback on success
   */
  const handleToggle = async (checked: boolean) => {
    try {
      await toggleMutation.mutateAsync({
        id: automationId,
        enabled: checked,
      });

      // Call onChange callback if provided
      if (onChange) {
        onChange(checked);
      }
    } catch (error) {
      // Error is handled by the mutation hook's onError handler
      // Toast notification will be shown automatically
      console.error('Failed to toggle automation:', error);
    }
  };

  /**
   * Determine if the switch should be disabled
   * Disable if: mutation is pending, user lacks permissions, or explicitly disabled
   */
  const isDisabled = disabled || toggleMutation.isPending;

  /**
   * Size-specific classes for the container
   */
  const sizeClasses = size === 'sm' ? 'gap-1.5' : 'gap-2';

  return (
    <div
      className={`flex items-center ${sizeClasses} ${className}`}
      data-testid={`automation-toggle-${automationId}`}
    >
      {/* Loading spinner during mutation */}
      {toggleMutation.isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}

      {/* Toggle switch */}
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isDisabled}
        aria-label={`${enabled ? 'Disable' : 'Enable'} ${automationName}`}
        aria-describedby={`automation-toggle-status-${automationId}`}
      />

      {/* Optional status label */}
      {showLabel && (
        <span
          id={`automation-toggle-status-${automationId}`}
          className={`text-xs font-medium transition-colors ${
            enabled
              ? 'text-green-700 dark:text-green-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      )}
    </div>
  );
};

/**
 * Export AutomationToggle as default
 */
export default AutomationToggle;
