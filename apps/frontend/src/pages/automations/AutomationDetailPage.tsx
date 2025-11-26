/**
 * AutomationDetailPage Component
 *
 * Full-featured automation detail page displaying comprehensive automation configuration,
 * execution statistics with charts, execution history, and management controls.
 *
 * Features:
 * - Fetch automation using useAutomation and useAutomationWithStats hooks
 * - Display AutomationStats component with charts and metrics
 * - Show AutomationExecutionHistory with pagination and auto-refresh
 * - Implement Execute Now action with confirmation dialog
 * - Implement Reschedule action for cron automations
 * - Implement Delete action with confirmation
 * - Display trigger-specific details (cron with next runs or webhook URL)
 * - Warning banner for recent failures
 * - Breadcrumb navigation (Automations > {Automation Name})
 * - Action buttons: Edit, Delete, Execute Now, Reschedule (cron only)
 * - Permission-based access control (AUTOMATION_READ)
 * - Loading states and error handling
 * - Toast notifications for user feedback
 *
 * Requirements Coverage:
 * - Requirement 12: Automation Execution Management and Monitoring
 * - Requirement 17: Permission-based Access Control
 * - Requirement 19: Error Handling and User Feedback
 *
 * @module pages/automations/AutomationDetailPage
 */

import { useContext, useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useAutomation,
  useAutomationWithStats,
  useExecuteAutomation,
  useDeleteAutomation,
  useRescheduleAutomation,
  useServerTime,
} from '@/hooks/api/useAutomations';
import { useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AutomationStats } from '@/components/automations/AutomationStats';
import { AutomationExecutionHistory } from '@/components/automations/AutomationExecutionHistory';
import { CronValidator } from '@/components/automations/CronValidator';
import { RescheduleAutomationDialog } from '@/components/automations/RescheduleAutomationDialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Clock,
  Copy,
  Edit2,
  Loader2,
  MoreVertical,
  Play,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
  Server,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '@/contexts/AuthContext';
import { Permission } from '@/types/auth';
import { TriggerType as TriggerTypeEnum } from '@/types/automation.types';
import { formatDate, formatDistanceToNow } from 'date-fns';
import { config } from '@/lib/config';

/**
 * AutomationDetailPage Component
 *
 * Main page component for viewing and managing automation details, statistics,
 * and execution history with full permission-based access control.
 *
 * @returns {React.ReactElement} The rendered automation detail page
 *
 * @throws {Error} If automation ID is not provided in route params
 *
 * @example
 * ```tsx
 * // Used in route: /automations/:id
 * <Route path="/automations/:id" element={<AutomationDetailPage />} />
 * ```
 */
export default function AutomationDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);

  // Queries
  const {
    data: automation,
    isLoading: automationLoading,
    error: automationError,
    refetch: refetchAutomation,
  } = useAutomation(id || '', !!id);

  const {
    data: automationWithStats,
    isLoading: statsLoading,
  } = useAutomationWithStats(id || '', !!id);

  // Fetch server time for cron automations
  const { data: serverTime } = useServerTime();

  // Mutations
  const { mutate: executeAutomation, isPending: executeLoading } = useExecuteAutomation();
  const { mutate: deleteAutomation, isPending: deleteLoading } = useDeleteAutomation();
  const { mutate: rescheduleAutomation, isPending: rescheduleLoading } = useRescheduleAutomation();

  // Permission checks
  const canRead = user?.permissions?.includes(Permission.AUTOMATION_READ) ?? false;
  const canUpdate = user?.permissions?.includes(Permission.AUTOMATION_UPDATE) ?? false;
  const canDelete = user?.permissions?.includes(Permission.AUTOMATION_DELETE) ?? false;
  const canExecute = user?.permissions?.includes(Permission.AUTOMATION_EXECUTE) ?? false;

  // Handlers
  const handleExecuteNow = useCallback(() => {
    if (!id) return;
    if (!automation?.enabled) {
      toast.error('Cannot execute disabled automation', {
        description: 'Enable the automation first to execute it.',
      });
      setShowExecuteConfirm(false);
      return;
    }
    executeAutomation(
      { id },
      {
        onSuccess: () => {
          setShowExecuteConfirm(false);
          toast.success('Automation triggered successfully');
          // Refetch execution history
          queryClient.invalidateQueries({
            queryKey: ['automations', 'executions', id],
          });
        },
        onError: (error: any) => {
          toast.error(`Failed to execute automation: ${error?.message || 'Unknown error'}`);
        },
      }
    );
  }, [id, automation?.enabled, executeAutomation, queryClient]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    deleteAutomation(id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        toast.success('Automation deleted successfully');
        navigate('/automations');
      },
      onError: (error: any) => {
        toast.error(`Failed to delete automation: ${error?.message || 'Unknown error'}`);
      },
    });
  }, [id, deleteAutomation, navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/automations/${id}/edit`);
  }, [id, navigate]);

  const handleCopyWebhookUrl = useCallback(() => {
    if (!automation) return;

    const automationTrigger = (automation as any).trigger;
    if (!automationTrigger || automationTrigger.type !== TriggerTypeEnum.WEBHOOK) return;

    const webhookUrl = `${config.apiUrl}/workscript/automations/webhook/${automationTrigger.path}`;

    navigator.clipboard.writeText(webhookUrl).then(() => {
      toast.success('Webhook URL copied to clipboard');
    });
  }, [automation]);

  const handleReschedule = useCallback(
    (cronConfig: { expression: string; timezone?: string }) => {
      if (!id) return;
      rescheduleAutomation(
        { id, cronConfig },
        {
          onSuccess: () => {
            setShowRescheduleDialog(false);
            // Refetch automation to get updated nextRunAt
            refetchAutomation();
          },
          onError: (error: any) => {
            toast.error(`Failed to reschedule automation: ${error?.message || 'Unknown error'}`);
          },
        }
      );
    },
    [id, rescheduleAutomation, refetchAutomation]
  );

  // Loading states
  if (!id) {
    return (
      <EmptyState
        title="Invalid URL"
        description="Automation ID is missing from the URL"
        icon={AlertCircle}
      />
    );
  }

  if (automationLoading) {
    return (
      <LoadingSpinner label="Loading automation details..." />
    );
  }

  if (automationError) {
    return (
      <EmptyState
        title="Error Loading Automation"
        description={automationError.message || 'Failed to load automation details'}
        icon={AlertCircle}
        actionButton={{
          label: 'Retry',
          onClick: () => refetchAutomation(),
        }}
      />
    );
  }

  if (!automation) {
    return (
      <EmptyState
        title="Automation Not Found"
        description="The automation you're looking for doesn't exist or has been deleted"
        icon={AlertCircle}
        actionButton={{
          label: 'Back to Automations',
          onClick: () => navigate('/automations'),
        }}
      />
    );
  }

  if (!canRead) {
    return (
      <EmptyState
        title="Access Denied"
        description="You don't have permission to view this automation"
        icon={AlertCircle}
        actionButton={{
          label: 'Back to Automations',
          onClick: () => navigate('/automations'),
        }}
      />
    );
  }

  // Extract trigger config from the transformed automation object
  const automationAny = automation as any;
  const trigger = automationAny?.trigger;
  const isCronTrigger = trigger?.type === TriggerTypeEnum.CRON;
  const isWebhookTrigger = trigger?.type === TriggerTypeEnum.WEBHOOK;
  const isImmediateTrigger = trigger?.type === TriggerTypeEnum.IMMEDIATE;

  // Check for recent failures
  const hasRecentFailures = (automationWithStats?.stats?.failureCount || 0) > 0;

  // Check if automation is disabled
  const isAutomationDisabled = !automationAny.enabled;

  // Build action buttons
  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      {canExecute && (
        <Button
          onClick={() => setShowExecuteConfirm(true)}
          disabled={executeLoading || isAutomationDisabled}
          variant="default"
          title={isAutomationDisabled ? 'Enable the automation to execute it' : undefined}
        >
          {executeLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isAutomationDisabled ? 'Disabled' : 'Execute Now'}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isCronTrigger && (
                <DropdownMenuItem onClick={() => setShowRescheduleDialog(true)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Reschedule
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Page Header */}
        <PageHeader
          title={automation.name}
          description={automation.description || 'No description'}
          actions={actionButtons}
        />

        {/* Warning Banner for Recent Failures */}
        {hasRecentFailures && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recent Failures Detected</AlertTitle>
            <AlertDescription>
              This automation has failed{' '}
              {automationWithStats?.stats?.failureCount || 0} time(s) recently.
              Check the execution history below for details.
            </AlertDescription>
          </Alert>
        )}

        {/* Metadata Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Workflow Link */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Workflow</p>
                <p className="mt-1">
                  <Link
                    to={`/workflows/${automationAny.workflowId}`}
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {automationAny.workflowId}
                  </Link>
                </p>
              </div>

              {/* Trigger Type */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Trigger Type</div>
                <div className="mt-1">
                  <Badge variant="outline">
                    {trigger?.type || 'Unknown'}
                  </Badge>
                </div>
              </div>

              {/* Enabled Status */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div className="mt-1">
                  <Badge variant={automationAny.enabled ? 'default' : 'secondary'}>
                    {automationAny.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              {/* Created/Updated Dates */}
              {automationAny.createdAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm">
                    {formatDate(new Date(automationAny.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {automationAny.updatedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated</p>
                  <p className="mt-1 text-sm">
                    {formatDistanceToNow(new Date(automationAny.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}

              {/* Next Run Time for Cron */}
              {isCronTrigger && automationAny.nextRunAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Run</p>
                  <p className="mt-1 text-sm">
                    {formatDate(new Date(automationAny.nextRunAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Trigger-Specific Details */}
        {isCronTrigger && trigger && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cron Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Server Time Info */}
              {serverTime && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Server Time Reference</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Current Time</span>
                      </div>
                      <div className="mt-1 font-mono text-sm text-blue-900 dark:text-blue-100">
                        {serverTime.localTime}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Server Timezone</span>
                      </div>
                      <div className="mt-1 font-mono text-sm text-blue-900 dark:text-blue-100">
                        {serverTime.timezone}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cron Expression */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Expression</div>
                <div className="mt-2 font-mono text-sm">{trigger.expression}</div>
              </div>

              {/* Automation Timezone */}
              {trigger.timezone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Automation Timezone</div>
                  <div className="mt-1 text-sm">{trigger.timezone}</div>
                  {serverTime && trigger.timezone !== serverTime.timezone && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Note: Automation timezone differs from server timezone ({serverTime.timezone})
                    </p>
                  )}
                </div>
              )}

              {/* Next Run Times Preview */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  Next 5 Scheduled Runs
                </div>
                <CronValidator
                  cronExpression={trigger.expression}
                  timezone={trigger.timezone || 'UTC'}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {isWebhookTrigger && trigger && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Webhook URL
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-slate-100 px-3 py-2 font-mono text-sm dark:bg-slate-900">
                    {`${config.apiUrl}/workscript/automations/webhook/${trigger.path}`}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyWebhookUrl}
                    title="Copy webhook URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Example Curl Command */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Example Request
                </div>
                <code className="block rounded bg-slate-100 p-3 font-mono text-xs overflow-x-auto dark:bg-slate-900">
                  {`curl -X ${trigger.method || 'POST'} \\\n  "${config.apiUrl}/workscript/automations/webhook/${trigger.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"data": "example"}'`}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        {isImmediateTrigger && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This automation only runs when manually triggered. Use the "Execute Now"
                button above to run it.
              </p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Statistics */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : automationWithStats ? (
          <AutomationStats automation={automationWithStats} />
        ) : null}

        <Separator />

        {/* Execution History */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Execution History</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recent executions of this automation
            </p>
          </div>
          <AutomationExecutionHistory automationId={id} />
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Automation"
          description={`Are you sure you want to delete "${automation.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          confirmLabel="Delete"
          loading={deleteLoading}
          isDestructive
        />

        {/* Execute Confirmation Dialog */}
        <ConfirmDialog
          open={showExecuteConfirm}
          onOpenChange={setShowExecuteConfirm}
          title="Execute Automation Now"
          description={`Execute the automation "${automation.name}" immediately with its current configuration?`}
          onConfirm={handleExecuteNow}
          confirmLabel="Execute"
          loading={executeLoading}
        />

        {/* Reschedule Dialog */}
        {automation && (
          <RescheduleAutomationDialog
            open={showRescheduleDialog}
            onOpenChange={setShowRescheduleDialog}
            automation={automation}
            onConfirm={handleReschedule}
            loading={rescheduleLoading}
          />
        )}
    </div>
  );
}
