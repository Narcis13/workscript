/**
 * RealtimeMonitor Component
 *
 * Displays a list of active workflow executions with real-time progress tracking.
 * Uses WebSocket store to retrieve currently executing workflows and renders them
 * as a responsive grid of execution cards. Shows an empty state when no executions
 * are running.
 *
 * Features:
 * - Real-time execution tracking via WebSocket
 * - Responsive grid layout (auto-adjusts to screen size)
 * - Click handling for navigation to execution details
 * - Empty state when no active executions
 * - Automatic updates when executions are added/removed/updated
 * - Accessibility features (keyboard navigation, ARIA labels)
 *
 * @module components/monitoring/RealtimeMonitor
 *
 * @example
 * ```tsx
 * import { RealtimeMonitor } from '@/components/monitoring/RealtimeMonitor';
 *
 * function MonitoringPage() {
 *   const navigate = useNavigate();
 *
 *   return (
 *     <RealtimeMonitor
 *       onExecutionClick={(executionId) =>
 *         navigate(`/executions/${executionId}`)
 *       }
 *     />
 *   );
 * }
 * ```
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveExecutions } from '@/stores/useWebSocketStore';
import { ExecutionCard } from '@/components/executions/ExecutionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Activity } from 'lucide-react';

/**
 * Props for the RealtimeMonitor component
 */
export interface RealtimeMonitorProps {
  /**
   * Optional CSS class name for the container
   */
  className?: string;

  /**
   * Optional callback fired when an execution card is clicked
   * If not provided, clicking will navigate to the execution detail page
   */
  onExecutionClick?: (executionId: string) => void;

  /**
   * Optional callback fired when an execution completes
   */
  onExecutionComplete?: (executionId: string) => void;

  /**
   * Optional callback fired when an execution fails
   */
  onExecutionFailed?: (executionId: string) => void;
}

/**
 * RealtimeMonitor Component
 *
 * Shows all currently active workflow executions with real-time progress updates.
 * Automatically removes executions from display when they complete or fail.
 *
 * @component
 */
export const RealtimeMonitor: React.FC<RealtimeMonitorProps> = ({
  className,
  onExecutionClick,
  onExecutionComplete,
  onExecutionFailed,
}) => {
  const navigate = useNavigate();
  const activeExecutions = useActiveExecutions();

  // Convert Map to array for rendering
  const executions = Array.from(activeExecutions.values());

  // Handle execution card click
  const handleExecutionClick = (executionId: string) => {
    if (onExecutionClick) {
      onExecutionClick(executionId);
    } else {
      // Default: navigate to execution detail page
      navigate(`/executions/${executionId}`);
    }
  };

  // Show empty state when no active executions
  if (executions.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title="No Active Executions"
          description="There are currently no running workflows. Active executions will appear here in real-time."
          icon={Activity}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Grid Container */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max"
        role="region"
        aria-label="Active workflow executions"
        aria-live="polite"
        aria-atomic="false"
      >
        {executions.map((execution) => (
          <ExecutionCard
            key={execution.executionId}
            execution={execution}
            onClick={handleExecutionClick}
            className="transition-all duration-200 hover:shadow-lg"
          />
        ))}
      </div>

      {/* Status indicator - visible to screen readers */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {executions.length} active execution{executions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

/**
 * Export RealtimeMonitor as default
 */
export default RealtimeMonitor;
