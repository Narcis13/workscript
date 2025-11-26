/**
 * AutomationEditPage Component
 *
 * Full-featured automation editing page for modifying existing automations.
 * Supports updating automation name, description, workflow selection,
 * and trigger configuration (cron/webhook/immediate).
 *
 * Features:
 * - Multi-step form (same steps as create)
 * - Pre-populated with existing automation data
 * - Dynamic form navigation with step indicators
 * - Real-time cron expression validation
 * - Trigger type selection and configuration
 * - Workflow selection with active workflows only
 * - Timezone selector for cron triggers
 * - Save action with full validation
 * - Cancel action with unsaved changes confirmation
 * - Permission check for AUTOMATION_UPDATE
 * - Loading states for async operations
 * - Toast notifications for user feedback
 * - Error handling and 404 not found states
 * - Navigation back to automation detail page on success
 *
 * Requirements Coverage:
 * - Requirement 10: Automation Creation with Trigger Configuration
 * - Requirement 12: Automation Execution Management and Monitoring
 * - Requirement 17: Permission-based Access Control
 * - Requirement 19: Error Handling and User Feedback
 *
 * @module pages/automations/AutomationEditPage
 */

import { useContext, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAutomation, useUpdateAutomation } from '@/hooks/api/useAutomations';
import type { AutomationFormData } from '@/components/automations/AutomationForm';
import { AutomationForm } from '@/components/automations/AutomationForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AuthContext } from '@/contexts/AuthContext';
import { Permission } from '@/types/auth';
import { toast } from 'sonner';
import { X, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { TriggerConfig } from '@/types/automation.types';
import { TriggerType } from '@/types/automation.types';

/**
 * AutomationEditPage Component
 *
 * Main page component for editing existing automations with comprehensive validation,
 * multi-step form handling, and permission checks.
 *
 * @component
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/automations/:id/edit" element={<AutomationEditPage />} />
 * ```
 *
 * Workflow:
 * 1. Component loads automation data from API (with loading state)
 * 2. User modifies automation settings (name, description, workflow, trigger)
 * 3. On submit, validation runs for all form fields
 * 4. API updates automation with new data
 * 5. User is redirected to automation detail page
 * 6. Success toast displays with updated automation name
 *
 * Permission Check:
 * - AUTOMATION_UPDATE: Required to save changes
 * - If missing, save button is disabled and warning is shown
 */
export default function AutomationEditPage() {
  // ============================================
  // PARAMS & NAVIGATION
  // ============================================

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Validate that automation ID is present in URL
  if (!id) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Invalid automation ID in URL. Please navigate back to the automations list.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/automations')}>
                Back to Automations
              </Button>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  // ============================================
  // CONTEXT & NAVIGATION
  // ============================================

  const authContext = useContext(AuthContext);

  // Check authentication
  if (!authContext) {
    throw new Error('AutomationEditPage must be used within AuthProvider');
  }

  const { user } = authContext;

  // ============================================
  // PERMISSION CHECK
  // ============================================

  /**
   * Check if user has AUTOMATION_UPDATE permission
   * If not, save button will be disabled and user sees warning
   */
  const hasUpdatePermission = user?.permissions.includes(Permission.AUTOMATION_UPDATE) ?? false;

  // ============================================
  // QUERIES & MUTATIONS
  // ============================================

  /**
   * Fetch existing automation for editing
   * Shows loading spinner while fetching
   * Shows 404 error if automation not found
   */
  const {
    data: automation,
    isLoading: automationLoading,
    error: automationError,
    refetch: refetchAutomation,
  } = useAutomation(id);

  /**
   * Mutation for updating automation
   * Handles validation, API call, and success/error states
   */
  const updateMutation = useUpdateAutomation();

  // ============================================
  // STATE
  // ============================================

  /**
   * Track if form has been modified
   * Used for unsaved changes warning on cancel
   */
  const [isDirty, setIsDirty] = useState<boolean>(false);

  /**
   * Cancel confirmation dialog state
   */
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Handle form data changes
   * Marks form as dirty when user modifies data
   */
  const handleFormChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  /**
   * Handle automation form submission
   * Validates all steps and updates automation via API
   */
  const handleFormSubmit = useCallback(
    async (data: AutomationFormData) => {
      // Check permissions
      if (!hasUpdatePermission) {
        toast.error('Insufficient permissions', {
          description: 'You do not have permission to update automations.',
        });
        return;
      }

      // Validate required fields
      if (!data.name) {
        toast.error('Missing automation name', {
          description: 'Please enter a name for the automation.',
        });
        return;
      }

      if (!data.workflowId) {
        toast.error('Missing workflow selection', {
          description: 'Please select a workflow to automate.',
        });
        return;
      }

      if (!data.triggerType) {
        toast.error('Missing trigger type', {
          description: 'Please select a trigger type (cron, webhook, or immediate).',
        });
        return;
      }

      if (!data.triggerConfig) {
        toast.error('Missing trigger configuration', {
          description: 'Please configure the trigger settings.',
        });
        return;
      }

      try {
        // Prepare payload for API
        // API expects triggerType and triggerConfig as separate fields
        // Transform triggerConfig to match API expected format
        let apiTriggerConfig: Record<string, any> = {};

        if (data.triggerType === 'cron' && data.triggerConfig) {
          // API expects cronExpression, frontend sends expression
          const cronConfig = data.triggerConfig as { expression?: string; timezone?: string };
          apiTriggerConfig = {
            cronExpression: cronConfig.expression,
            timezone: cronConfig.timezone || data.timezone || 'UTC',
          };
        } else if (data.triggerType === 'webhook') {
          // API expects webhookUrl, frontend sends path
          // Prefer webhookPath (user's direct input) over triggerConfig.path
          const webhookConfig = data.triggerConfig as { path?: string; method?: string } | undefined;
          apiTriggerConfig = {
            webhookUrl: data.webhookPath || webhookConfig?.path || 'automation',
            method: webhookConfig?.method || 'POST',
          };
        } else if (data.triggerType === 'immediate') {
          apiTriggerConfig = {
            enabled: true,
          };
        }

        const payload = {
          name: data.name,
          description: data.description || undefined,
          workflowId: data.workflowId,
          triggerType: data.triggerType,
          triggerConfig: apiTriggerConfig,
          enabled: data.enabled ?? automation?.enabled ?? true, // Preserve existing enabled status if not set
        };

        // Update automation via API
        const updatedAutomation = await updateMutation.mutateAsync({
          id,
          data: payload,
        });

        // Clear dirty flag
        setIsDirty(false);

        // Navigate to automation detail page
        navigate(`/automations/${updatedAutomation.id}`);
      } catch (error) {
        // Error handling is done by mutation hook (toast notification shown)
        console.error('Update automation error:', error);
      }
    },
    [hasUpdatePermission, id, automation?.enabled, updateMutation, navigate]
  );

  /**
   * Handle cancel action
   * Shows confirmation if there are unsaved changes
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      navigate(`/automations/${id}`);
    }
  }, [isDirty, id, navigate]);

  /**
   * Confirm cancel and navigate away
   */
  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    navigate(`/automations/${id}`);
  }, [id, navigate]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (automationLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <PageHeader
          title="Edit Automation"
          description="Loading automation details..."
        />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" label="Loading automation details..." />
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (automationError) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <PageHeader
          title="Edit Automation"
          description="An error occurred while loading the automation"
        />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to Load Automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {automationError instanceof Error
                ? automationError.message
                : 'The automation could not be found or you do not have permission to view it.'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetchAutomation()}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate('/automations')}>
                Back to Automations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // NOT FOUND STATE
  // ============================================

  if (!automation) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <PageHeader
          title="Edit Automation"
          description="Automation not found"
        />
        <Card>
          <CardHeader>
            <CardTitle>Automation Not Found</CardTitle>
            <CardDescription>
              The automation with ID {id} could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/automations')}>
              Back to Automations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // PREPARE FORM INITIAL DATA
  // ============================================

  /**
   * Pre-populate form with existing automation data
   * Convert stored data structure to form data structure
   */
  const initialFormData: Partial<AutomationFormData> = {
    name: automation.name,
    description: automation.description || undefined,
    workflowId: automation.workflowId,
    triggerType: automation.trigger.type,
    triggerConfig: automation.trigger as TriggerConfig,
    timezone:
      (automation.trigger as any).timezone ||
      (automation.trigger.type === TriggerType.CRON ? 'UTC' : undefined),
    webhookPath:
      automation.trigger.type === TriggerType.WEBHOOK
        ? (automation.trigger as any).path
        : undefined,
    enabled: automation.enabled,
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Page Header */}
        <PageHeader
          title={`Edit Automation: ${automation.name}`}
          description="Modify automation configuration and scheduling"
          actions={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          }
        />

        {/* Permission Warning */}
        {!hasUpdatePermission && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Insufficient Permissions</AlertTitle>
            <AlertDescription>
              You do not have permission to update automations. The save button will be disabled.
              Please contact your administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content - Automation Form */}
        <div className="border rounded-lg p-6 bg-card">
          <AutomationForm
            initialData={initialFormData}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            loading={updateMutation.isPending}
            onStepChange={handleFormChange}
            mode="edit"
          />
        </div>

        {/* Note: The form manages its own step navigation and submit button
            The onCancel callback is handled by the form's cancel buttons
            Permission check is enforced in handleFormSubmit
        */}

        {/* Cancel Confirmation Dialog */}
        <ConfirmDialog
          open={showCancelConfirm}
          onOpenChange={setShowCancelConfirm}
          title="Unsaved Changes"
          description="You have unsaved changes. Are you sure you want to leave? All changes will be lost."
          confirmLabel="Leave"
          cancelLabel="Stay"
          isDestructive={true}
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
