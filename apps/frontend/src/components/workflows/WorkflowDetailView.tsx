/**
 * WorkflowDetailView Component
 *
 * Displays complete workflow details including metadata and the workflow
 * definition in a read-only Monaco editor.
 *
 * Features:
 * - Displays workflow metadata (name, description, version, dates, active status)
 * - Shows workflow definition in a read-only Monaco editor with JSON syntax highlighting
 * - Organized layout with clear sections
 * - Formatted dates using date-fns
 * - Active/Inactive status badge
 * - Clean, professional design with shadcn/ui components
 *
 * Requirements Coverage:
 * - Requirement 8: Workflow Detail View and Execution History
 *
 * @module components/workflows/WorkflowDetailView
 */

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Info, FileJson } from 'lucide-react';
import { WorkflowEditor } from './WorkflowEditor';
import type { Workflow } from '@/types/workflow.types';

/**
 * Props for the WorkflowDetailView component
 */
export interface WorkflowDetailViewProps {
  /**
   * Workflow data to display
   */
  workflow: Workflow;

  /**
   * Optional CSS class name for the container
   */
  className?: string;
}

/**
 * Format a date to a readable string
 * @param date - Date to format (string or Date object)
 * @returns Formatted date string or 'N/A' if invalid
 */
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'PPpp'); // e.g., "Apr 29, 2023, 9:00:00 AM"
  } catch {
    return 'Invalid date';
  }
};

/**
 * WorkflowDetailView Component
 *
 * Displays complete workflow metadata and definition in a clean,
 * organized layout with read-only Monaco editor for the JSON definition.
 *
 * @example
 * ```tsx
 * <WorkflowDetailView workflow={workflow} />
 * ```
 */
export const WorkflowDetailView: React.FC<WorkflowDetailViewProps> = ({
  workflow,
  className,
}) => {
  /**
   * Convert workflow definition to formatted JSON string
   */
  const workflowJson = useMemo(() => {
    try {
      return JSON.stringify(workflow.definition, null, 2);
    } catch {
      return '// Error: Unable to parse workflow definition';
    }
  }, [workflow.definition]);

  return (
    <div className={className} data-testid="workflow-detail-view">
      {/* Metadata Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{workflow.name}</CardTitle>
                <Badge
                  variant={workflow.isActive ? 'default' : 'secondary'}
                  className={
                    workflow.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }
                >
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {workflow.description && (
                <CardDescription className="text-base mt-2">
                  {workflow.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Version */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileJson className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Version
                </div>
                <div className="text-base font-mono">{workflow.version}</div>
              </div>
            </div>

            {/* Workflow ID */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Workflow ID
                </div>
                <div
                  className="text-base font-mono truncate"
                  title={workflow.id}
                >
                  {workflow.id}
                </div>
              </div>
            </div>

            {/* Created At */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-base">{formatDate(workflow.createdAt)}</div>
                {workflow.createdBy && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    by {workflow.createdBy}
                  </div>
                )}
              </div>
            </div>

            {/* Updated At */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Last Updated
                </div>
                <div className="text-base">{formatDate(workflow.updatedAt)}</div>
                {workflow.updatedBy && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    by {workflow.updatedBy}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Definition Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Workflow Definition</CardTitle>
          <CardDescription>
            JSON representation of the workflow configuration and execution flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowEditor
            value={workflowJson}
            onChange={() => {
              // No-op: Read-only mode
            }}
            readOnly
            height="600px"
            showMinimap={true}
            className="mb-0"
          />
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Export WorkflowDetailView as default
 */
export default WorkflowDetailView;
