/**
 * AutomationList Component
 *
 * Displays a grid of automation cards with loading states and empty state handling.
 * This component renders a collection of automations using the AutomationCard component
 * and provides visual feedback during loading and when no automations are available.
 *
 * Features:
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Skeleton loaders during data fetching
 * - Empty state with custom message and action button
 * - Passes action handlers to individual cards
 * - Consistent spacing and styling
 *
 * Requirements Coverage:
 * - Requirement 9: Automation List Management and Filtering
 *
 * @module components/automations/AutomationList
 */

import React from 'react';
import { Inbox } from 'lucide-react';
import { AutomationCard, type AutomationCardProps } from './AutomationCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Automation } from '@/types/automation.types';

/**
 * Props for the AutomationList component
 */
export interface AutomationListProps {
  /**
   * Array of automations to display
   */
  automations: Automation[];

  /**
   * Whether the automations are currently being loaded
   */
  loading?: boolean;

  /**
   * Callback when "View" action is triggered on a card
   */
  onView?: (automationId: string) => void;

  /**
   * Callback when "Edit" action is triggered on a card
   */
  onEdit?: (automationId: string) => void;

  /**
   * Callback when "Delete" action is triggered on a card
   */
  onDelete?: (automationId: string) => void;

  /**
   * Callback when enabled/disabled toggle is changed on a card
   */
  onToggle?: (automationId: string, enabled: boolean) => void;

  /**
   * Callback when "Execute Now" action is triggered on a card
   */
  onExecute?: (automationId: string) => void;

  /**
   * Optional callback when workflow link is clicked
   */
  onWorkflowClick?: (workflowId: string) => void;

  /**
   * User permissions for controlling action button visibility
   */
  permissions?: AutomationCardProps['permissions'];

  /**
   * Map of automation IDs to their toggle loading states
   * Used to show loading spinner on the toggle switch during API call
   */
  toggleLoadingStates?: Record<string, boolean>;

  /**
   * Optional map of automation statistics
   * If provided, stats will be passed to each automation card
   */
  stats?: Record<string, {
    totalRuns?: number;
    successCount?: number;
    failureCount?: number;
  }>;

  /**
   * Optional empty state configuration
   */
  emptyState?: {
    title?: string;
    description?: string;
    actionButton?: {
      label: string;
      onClick: () => void;
    };
  };

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * AutomationCardSkeleton Component
 *
 * Displays a skeleton loader placeholder for an automation card during loading.
 */
const AutomationCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        <div className="p-2 rounded-lg border">
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>

        <div className="space-y-1.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-36" />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardFooter>
    </Card>
  );
};

/**
 * AutomationList Component
 *
 * Displays a responsive grid of automation cards with loading and empty states.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AutomationList
 *   automations={automations}
 *   loading={isLoading}
 *   onView={(id) => navigate(`/automations/${id}`)}
 *   onEdit={(id) => navigate(`/automations/${id}/edit`)}
 *   onDelete={(id) => handleDelete(id)}
 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
 *   onExecute={(id) => handleExecute(id)}
 * />
 *
 * // With permissions and stats
 * <AutomationList
 *   automations={automations}
 *   loading={isLoading}
 *   onView={handleView}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onToggle={handleToggle}
 *   onExecute={handleExecute}
 *   onWorkflowClick={(id) => navigate(`/workflows/${id}`)}
 *   permissions={{
 *     canUpdate: hasPermission('AUTOMATION_UPDATE'),
 *     canDelete: hasPermission('AUTOMATION_DELETE'),
 *     canExecute: hasPermission('AUTOMATION_EXECUTE'),
 *     canToggle: hasPermission('AUTOMATION_UPDATE'),
 *   }}
 *   toggleLoadingStates={toggleLoadingMap}
 *   stats={automationStats}
 *   emptyState={{
 *     title: 'No automations yet',
 *     description: 'Create your first automation to schedule workflows',
 *     actionButton: {
 *       label: 'Create Automation',
 *       onClick: () => navigate('/automations/new'),
 *     },
 *   }}
 * />
 *
 * // Loading state
 * <AutomationList
 *   automations={[]}
 *   loading={true}
 * />
 * ```
 */
export const AutomationList: React.FC<AutomationListProps> = ({
  automations,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onToggle,
  onExecute,
  onWorkflowClick,
  permissions,
  toggleLoadingStates = {},
  stats = {},
  emptyState,
  className,
}) => {
  /**
   * Render skeleton loaders during loading state
   */
  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className || ''}`}
        role="status"
        aria-label="Loading automations"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <AutomationCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  /**
   * Render empty state when no automations are available
   */
  if (automations.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyState?.title || 'No automations found'}
        description={
          emptyState?.description ||
          'Try adjusting your search or filters, or create a new automation'
        }
        actionButton={emptyState?.actionButton}
        className={className}
      />
    );
  }

  /**
   * Render grid of automation cards
   */
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className || ''}`}
      role="list"
      aria-label="Automations list"
    >
      {automations.map((automation) => (
        <AutomationCard
          key={automation.id}
          automation={automation}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onExecute={onExecute}
          onWorkflowClick={onWorkflowClick}
          permissions={permissions}
          toggleLoading={toggleLoadingStates[automation.id] || false}
          stats={stats[automation.id]}
        />
      ))}
    </div>
  );
};

/**
 * Export AutomationList as default
 */
export default AutomationList;
