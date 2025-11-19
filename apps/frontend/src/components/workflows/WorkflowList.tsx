/**
 * WorkflowList Component
 *
 * Displays a grid of workflow cards with loading states and empty state handling.
 * This component renders a list of workflows using the WorkflowCard component,
 * showing skeleton loaders while data is loading and an empty state when no
 * workflows are available.
 *
 * Features:
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Skeleton loading state with multiple placeholder cards
 * - Empty state with contextual message and optional action
 * - Action handlers passed to individual workflow cards
 * - Accessibility support with proper ARIA attributes
 *
 * Requirements Coverage:
 * - Requirement 4: Workflow List Management and Navigation
 *
 * @module components/workflows/WorkflowList
 */

import React from 'react';
import { FileQuestion } from 'lucide-react';
import { WorkflowCard } from './WorkflowCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Workflow } from '@/types/workflow.types';

/**
 * Props for the WorkflowList component
 */
export interface WorkflowListProps {
  /**
   * Array of workflows to display
   */
  workflows: Workflow[];

  /**
   * Whether the workflows are currently loading
   * When true, skeleton loaders are displayed
   */
  loading?: boolean;

  /**
   * Callback when "View" action is triggered on a workflow card
   */
  onView?: (workflowId: string) => void;

  /**
   * Callback when "Edit" action is triggered on a workflow card
   */
  onEdit?: (workflowId: string) => void;

  /**
   * Callback when "Delete" action is triggered on a workflow card
   */
  onDelete?: (workflowId: string) => void;

  /**
   * Callback when "Run" action is triggered on a workflow card
   */
  onRun?: (workflowId: string) => void;

  /**
   * Optional user permissions for controlling action visibility
   */
  permissions?: {
    canUpdate?: boolean;
    canDelete?: boolean;
    canExecute?: boolean;
  };

  /**
   * Optional CSS class name
   */
  className?: string;

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
}

/**
 * WorkflowCardSkeleton - Skeleton loader for workflow card
 *
 * Displays a placeholder card while workflows are loading.
 * Mimics the structure of the actual WorkflowCard component.
 */
const WorkflowCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </CardHeader>

    <CardContent>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      <div className="space-y-1.5 mt-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-32" />
      </div>
    </CardContent>

    <CardFooter className="flex gap-2">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 flex-1" />
    </CardFooter>
  </Card>
);

/**
 * WorkflowList Component
 *
 * Renders a responsive grid of workflow cards with support for loading states,
 * empty states, and various action handlers.
 *
 * @example
 * ```tsx
 * // Basic usage with loading state
 * <WorkflowList
 *   workflows={workflows}
 *   loading={isLoading}
 *   onView={(id) => navigate(`/workflows/${id}`)}
 *   onEdit={(id) => navigate(`/workflows/${id}/edit`)}
 *   onDelete={(id) => handleDelete(id)}
 *   onRun={(id) => handleRun(id)}
 * />
 *
 * // With permissions
 * <WorkflowList
 *   workflows={workflows}
 *   loading={isLoading}
 *   onView={handleView}
 *   permissions={{
 *     canUpdate: user.permissions.includes('WORKFLOW_UPDATE'),
 *     canDelete: user.permissions.includes('WORKFLOW_DELETE'),
 *     canExecute: user.permissions.includes('WORKFLOW_EXECUTE'),
 *   }}
 * />
 *
 * // With custom empty state
 * <WorkflowList
 *   workflows={[]}
 *   loading={false}
 *   emptyState={{
 *     title: "No matching workflows",
 *     description: "Try adjusting your search filters",
 *     actionButton: {
 *       label: "Clear Filters",
 *       onClick: handleClearFilters,
 *     }
 *   }}
 * />
 * ```
 */
export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onRun,
  permissions,
  className,
  emptyState,
}) => {
  /**
   * Render loading state with skeleton cards
   */
  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className || ''}`}
        role="status"
        aria-label="Loading workflows"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <WorkflowCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  /**
   * Render empty state when no workflows are available
   */
  if (workflows.length === 0) {
    const defaultEmptyState = {
      title: 'No workflows yet',
      description: 'Create your first workflow to get started with automation',
    };

    return (
      <EmptyState
        icon={FileQuestion}
        title={emptyState?.title || defaultEmptyState.title}
        description={emptyState?.description || defaultEmptyState.description}
        actionButton={emptyState?.actionButton}
        className={className}
      />
    );
  }

  /**
   * Render workflow grid
   */
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className || ''}`}
      role="list"
      aria-label="Workflows"
    >
      {workflows.map((workflow) => (
        <div key={workflow.id} role="listitem">
          <WorkflowCard
            workflow={workflow}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onRun={onRun}
            permissions={permissions}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Export WorkflowList as default
 */
export default WorkflowList;
