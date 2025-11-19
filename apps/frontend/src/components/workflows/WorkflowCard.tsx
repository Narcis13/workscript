/**
 * WorkflowCard Component
 *
 * Displays a workflow's summary information in a card format.
 * Shows name, description, version, active status, created/updated dates,
 * and provides action buttons (View, Edit, Delete, Run).
 *
 * Features:
 * - Responsive card layout with hover effects
 * - Active/Inactive status badge
 * - Action buttons with permission checks
 * - Dropdown menu for additional actions
 * - Formatted date displays
 * - Accessible keyboard navigation
 *
 * Requirements Coverage:
 * - Requirement 4: Workflow List Management and Navigation
 * - Requirement 17: Permission-based Access Control and UI Restrictions
 *
 * @module components/workflows/WorkflowCard
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
} from 'lucide-react';
import type { Workflow } from '@/types/workflow.types';

/**
 * Props for the WorkflowCard component
 */
export interface WorkflowCardProps {
  /**
   * Workflow data to display
   */
  workflow: Workflow;

  /**
   * Callback when "View" action is triggered
   */
  onView?: (workflowId: string) => void;

  /**
   * Callback when "Edit" action is triggered
   */
  onEdit?: (workflowId: string) => void;

  /**
   * Callback when "Delete" action is triggered
   */
  onDelete?: (workflowId: string) => void;

  /**
   * Callback when "Run" action is triggered
   */
  onRun?: (workflowId: string) => void;

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
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * WorkflowCard Component
 *
 * Displays a single workflow's information in a card format with action buttons.
 *
 * @example
 * ```tsx
 * <WorkflowCard
 *   workflow={workflow}
 *   onView={(id) => navigate(`/workflows/${id}`)}
 *   onEdit={(id) => navigate(`/workflows/${id}/edit`)}
 *   onDelete={(id) => handleDelete(id)}
 *   onRun={(id) => handleRun(id)}
 *   permissions={{
 *     canUpdate: user.permissions.includes('WORKFLOW_UPDATE'),
 *     canDelete: user.permissions.includes('WORKFLOW_DELETE'),
 *     canExecute: user.permissions.includes('WORKFLOW_EXECUTE'),
 *   }}
 * />
 * ```
 */
export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onView,
  onEdit,
  onDelete,
  onRun,
  className,
  permissions = {},
}) => {
  const { canUpdate = true, canDelete = true, canExecute = true } = permissions;

  /**
   * Handle view button click
   */
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) {
      onView(workflow.id);
    }
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(workflow.id);
    }
  };

  /**
   * Handle delete button click
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(workflow.id);
    }
  };

  /**
   * Handle run button click
   */
  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRun) {
      onRun(workflow.id);
    }
  };

  /**
   * Handle card click - default to view action
   */
  const handleCardClick = () => {
    if (onView) {
      onView(workflow.id);
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
      aria-label={`View workflow: ${workflow.name}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{workflow.name}</CardTitle>
            <CardDescription className="text-xs mt-1 flex items-center gap-2">
              <span className="truncate">v{workflow.version}</span>
              <span className="text-muted-foreground/50">•</span>
              <Badge
                variant={workflow.isActive ? 'default' : 'secondary'}
                className="text-xs"
              >
                {workflow.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardDescription>
          </div>

          {/* Action Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Workflow actions"
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
                <DropdownMenuItem onClick={handleRun}>
                  <Play className="mr-2 h-4 w-4" />
                  Run
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
          {truncateText(workflow.description)}
        </p>

        {/* Metadata */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>Created: {formatDate(workflow.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Updated: {formatDate(workflow.updatedAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleView}
          className="flex-1"
        >
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>

        {canUpdate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex-1"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}

        {canExecute && (
          <Button
            variant="default"
            size="sm"
            onClick={handleRun}
            className="flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

/**
 * Export WorkflowCard as default
 */
export default WorkflowCard;
