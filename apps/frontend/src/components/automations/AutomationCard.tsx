/**
 * AutomationCard Component
 *
 * Displays an automation's summary information in a card format.
 * Shows name, description, workflow name (link), trigger type badge, next run time,
 * run statistics, enabled toggle, and provides action buttons (View, Edit, Delete, Execute).
 *
 * Features:
 * - Responsive card layout with hover effects
 * - Enabled/Disabled status badge and toggle
 * - Trigger type badge (cron/webhook/immediate)
 * - Next run time display (for cron triggers)
 * - Run statistics (total/success/failure counts)
 * - Action buttons with permission checks
 * - Dropdown menu for additional actions
 * - Formatted date displays
 * - Accessible keyboard navigation
 *
 * Requirements Coverage:
 * - Requirement 9: Automation List Management and Filtering
 * - Requirement 17: Permission-based Access Control and UI Restrictions
 *
 * @module components/automations/AutomationCard
 */

import React from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  Edit,
  Trash2,
  Play,
  MoreVertical,
  Calendar,
  Clock,
  Zap,
  Link as LinkIcon,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Automation, TriggerType } from '@/types/automation.types';
import { StatusBadge } from '@/components/shared/StatusBadge';

/**
 * Props for the AutomationCard component
 */
export interface AutomationCardProps {
  /**
   * Automation data to display
   */
  automation: Automation;

  /**
   * Callback when "View" action is triggered
   */
  onView?: (automationId: string) => void;

  /**
   * Callback when "Edit" action is triggered
   */
  onEdit?: (automationId: string) => void;

  /**
   * Callback when "Delete" action is triggered
   */
  onDelete?: (automationId: string) => void;

  /**
   * Callback when enabled/disabled toggle is changed
   */
  onToggle?: (automationId: string, enabled: boolean) => void;

  /**
   * Callback when "Execute Now" action is triggered
   */
  onExecute?: (automationId: string) => void;

  /**
   * Optional callback when workflow link is clicked
   */
  onWorkflowClick?: (workflowId: string) => void;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * User permissions (optional - for checking permissions before showing actions)
   * If not provided, all actions will be shown
   */
  permissions?: {
    canUpdate?: boolean;
    canDelete?: boolean;
    canExecute?: boolean;
    canToggle?: boolean;
  };

  /**
   * Whether the toggle is in a loading state
   */
  toggleLoading?: boolean;

  /**
   * Optional run statistics to display
   */
  stats?: {
    totalRuns?: number;
    successCount?: number;
    failureCount?: number;
  };
}

/**
 * Truncate text to a maximum number of characters
 */
const truncateText = (text: string | undefined, maxLength: number = 150): string => {
  if (!text) return 'No description available';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Format date string to readable format
 */
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Get trigger type badge variant and icon
 */
const getTriggerBadge = (triggerType: TriggerType) => {
  switch (triggerType) {
    case 'cron':
      return {
        label: 'Cron',
        icon: Clock,
        className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
      };
    case 'webhook':
      return {
        label: 'Webhook',
        icon: LinkIcon,
        className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700',
      };
    case 'immediate':
      return {
        label: 'Manual',
        icon: Zap,
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700',
      };
    default:
      return {
        label: 'Unknown',
        icon: Zap,
        className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      };
  }
};

/**
 * AutomationCard Component
 *
 * Displays a single automation's information in a card format with action buttons.
 *
 * @example
 * ```tsx
 * <AutomationCard
 *   automation={automation}
 *   onView={(id) => navigate(`/automations/${id}`)}
 *   onEdit={(id) => navigate(`/automations/${id}/edit`)}
 *   onDelete={(id) => handleDelete(id)}
 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
 *   onExecute={(id) => handleExecute(id)}
 *   onWorkflowClick={(id) => navigate(`/workflows/${id}`)}
 *   permissions={{
 *     canUpdate: user.permissions.includes('AUTOMATION_UPDATE'),
 *     canDelete: user.permissions.includes('AUTOMATION_DELETE'),
 *     canExecute: user.permissions.includes('AUTOMATION_EXECUTE'),
 *     canToggle: user.permissions.includes('AUTOMATION_UPDATE'),
 *   }}
 *   stats={{
 *     totalRuns: 150,
 *     successCount: 145,
 *     failureCount: 5,
 *   }}
 * />
 * ```
 */
export const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  onView,
  onEdit,
  onDelete,
  onToggle,
  onExecute,
  onWorkflowClick,
  className,
  permissions = {},
  toggleLoading = false,
  stats,
}) => {
  const { canUpdate = true, canDelete = true, canExecute = true, canToggle = true } = permissions;

  const triggerBadge = getTriggerBadge(automation.trigger.type);
  const TriggerIcon = triggerBadge.icon;

  /**
   * Handle view button click
   */
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) {
      onView(automation.id);
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(automation.id);
    }
  };

  /**
   * Handle delete button click
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(automation.id);
    }
  };

  /**
   * Handle execute button click
   */
  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExecute) {
      onExecute(automation.id);
    }
  };

  /**
   * Handle workflow link click
   */
  const handleWorkflowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWorkflowClick && automation.workflowId) {
      onWorkflowClick(automation.workflowId);
    }
  };

  /**
   * Handle toggle change
   */
  const handleToggle = (checked: boolean) => {
    if (onToggle && canToggle) {
      onToggle(automation.id, checked);
    }
  };

  /**
   * Handle card click - default to view action
   */
  const handleCardClick = () => {
    if (onView) {
      onView(automation.id);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  /**
   * Calculate success rate if stats are available
   */
  const successRate = stats?.totalRuns && stats.totalRuns > 0
    ? Math.round((stats.successCount ?? 0) / stats.totalRuns * 100)
    : null;

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200
        hover:shadow-lg hover:scale-[1.01] hover:border-primary/50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${className || ''}
      `}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View automation: ${automation.name}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{automation.name}</CardTitle>
            <CardDescription className="text-xs mt-1 flex items-center gap-2 flex-wrap">
              {/* Trigger Type Badge */}
              <Badge variant="outline" className={`${triggerBadge.className} text-xs`}>
                <TriggerIcon className="mr-1 h-3 w-3" />
                {triggerBadge.label}
              </Badge>

              <span className="text-muted-foreground/50">•</span>

              {/* Enabled/Disabled Status */}
              <StatusBadge status={automation.enabled ? 'enabled' : 'disabled'} />

              {/* Workflow Link */}
              {automation.workflowName && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <button
                    onClick={handleWorkflowClick}
                    className="text-primary hover:underline focus:underline focus:outline-none"
                    aria-label={`View workflow: ${automation.workflowName}`}
                  >
                    {automation.workflowName}
                  </button>
                </>
              )}
            </CardDescription>
          </div>

          {/* Action Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Automation actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>

              {canUpdate && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {canExecute && (
                <DropdownMenuItem onClick={handleExecute}>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Now
                </DropdownMenuItem>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {truncateText(automation.description)}
        </p>

        {/* Next Run Time (for cron triggers) */}
        {automation.trigger.type === 'cron' && automation.nextRunAt && (
          <div className="mb-4 p-2 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-muted-foreground">Next run:</span>
              <span className="font-medium">{formatDate(automation.nextRunAt)}</span>
            </div>
          </div>
        )}

        {/* Run Statistics */}
        {stats && stats.totalRuns !== undefined && stats.totalRuns > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <div className="text-lg font-semibold">{stats.totalRuns}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Total</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="text-lg font-semibold text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {stats.successCount ?? 0}
              </div>
              <div className="text-[10px] text-green-600 dark:text-green-500 uppercase">Success</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
              <div className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center justify-center gap-1">
                <XCircle className="h-3 w-3" />
                {stats.failureCount ?? 0}
              </div>
              <div className="text-[10px] text-red-600 dark:text-red-500 uppercase">Failed</div>
            </div>
          </div>
        )}

        {/* Success Rate */}
        {successRate !== null && (
          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/30">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="text-sm font-semibold">{successRate}%</div>
            </div>
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 dark:bg-green-400 transition-all duration-300"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {automation.lastRunAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Last run: {formatDate(automation.lastRunAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Created: {formatDate(automation.createdAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        {/* Enabled Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={automation.enabled}
            onCheckedChange={handleToggle}
            disabled={!canToggle || toggleLoading}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${automation.enabled ? 'Disable' : 'Enable'} automation`}
          />
          <span className="text-xs text-muted-foreground">
            {automation.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>

          {canExecute && (
            <Button
              variant="default"
              size="sm"
              onClick={handleExecute}
            >
              <Play className="mr-2 h-4 w-4" />
              Execute
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

/**
 * Export AutomationCard as default
 */
export default AutomationCard;
