/**
 * NodeList Component
 *
 * Displays a grid of node cards with support for loading states,
 * error states, and empty states. This component handles the
 * presentation layer for the node library browser.
 *
 * Features:
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Loading skeleton cards for better UX during data fetching
 * - Error state with retry functionality
 * - Empty state with helpful messaging
 * - Accessible and keyboard-navigable
 *
 * @module components/nodes/NodeList
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, PackageSearch } from 'lucide-react';
import { NodeCard } from './NodeCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { NodeMetadata } from '@/types/node.types';
import { cn } from '@/lib/utils';

/**
 * Props for the NodeList component
 */
export interface NodeListProps {
  /**
   * Array of nodes to display
   */
  nodes: NodeMetadata[];

  /**
   * Loading state - shows skeleton cards when true
   */
  loading?: boolean;

  /**
   * Error object if the fetch failed
   */
  error?: Error | null;

  /**
   * Callback to retry fetching nodes (used when error occurs)
   */
  onRetry?: () => void;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional number of skeleton cards to show during loading
   * @default 6
   */
  skeletonCount?: number;
}

/**
 * NodeSkeletonCard Component
 *
 * Displays a loading skeleton that matches the NodeCard layout.
 * Uses pulse animation to indicate loading state.
 *
 * @internal
 */
const NodeSkeletonCard: React.FC = () => {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title skeleton */}
            <div className="h-6 bg-muted rounded w-3/4" />
            {/* ID skeleton */}
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
          {/* Badge skeleton */}
          <div className="h-6 w-20 bg-muted rounded-full shrink-0" />
        </div>
      </CardHeader>

      <CardContent>
        {/* Description skeleton - 3 lines */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
        {/* Badges skeleton */}
        <div className="flex items-center gap-2 mt-3">
          <div className="h-5 w-12 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
      </CardContent>

      <CardFooter>
        {/* Button skeleton */}
        <div className="h-9 w-28 bg-muted rounded ml-auto" />
      </CardFooter>
    </Card>
  );
};

/**
 * NodeListError Component
 *
 * Displays an error state with retry functionality.
 * Provides clear feedback about what went wrong and how to fix it.
 *
 * @internal
 */
interface NodeListErrorProps {
  error: Error;
  onRetry?: () => void;
}

const NodeListError: React.FC<NodeListErrorProps> = ({ error, onRetry }) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">
        Failed to load nodes
      </h3>

      <p className="text-sm text-muted-foreground max-w-md mb-2">
        {error.message || 'An unexpected error occurred while fetching the node library.'}
      </p>

      <p className="text-xs text-muted-foreground max-w-md mb-6">
        This could be due to a network issue or a problem with the server.
        Please try again or contact support if the problem persists.
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="default"
          className="mt-2"
          aria-label="Retry loading nodes"
        >
          Retry
        </Button>
      )}
    </div>
  );
};

/**
 * NodeList Component
 *
 * Main component that orchestrates the display of nodes in a grid layout.
 * Handles loading, error, and empty states automatically.
 *
 * @example
 * ```tsx
 * // Basic usage with nodes
 * <NodeList
 *   nodes={nodeData}
 *   loading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 * />
 *
 * // With custom skeleton count
 * <NodeList
 *   nodes={nodeData}
 *   loading={isLoading}
 *   skeletonCount={9}
 * />
 *
 * // With custom className
 * <NodeList
 *   nodes={nodeData}
 *   className="mt-8"
 * />
 * ```
 *
 * @param {NodeListProps} props - Component props
 * @returns {React.ReactElement} The rendered NodeList component
 *
 * @remarks
 * - Used in: NodesPage (Req 1)
 * - Grid adapts to screen size: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
 * - Loading state shows skeleton cards for better perceived performance
 * - Error state provides actionable feedback with retry option
 * - Empty state guides users when no nodes match filters
 * - All states are accessible with proper ARIA attributes
 */
export const NodeList: React.FC<NodeListProps> = ({
  nodes,
  loading = false,
  error = null,
  onRetry,
  className,
  skeletonCount = 6,
}) => {
  // Show loading skeletons
  if (loading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
          className
        )}
        aria-busy="true"
        aria-label="Loading nodes"
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <NodeSkeletonCard key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={cn('w-full', className)}>
        <NodeListError error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Show empty state when no nodes
  if (nodes.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyState
          icon={PackageSearch}
          title="No nodes found matching your criteria"
          description="Try adjusting your search term or filters to see more results. You can also browse all nodes by clearing your filters."
        />
      </div>
    );
  }

  // Show node grid
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className
      )}
      role="list"
      aria-label={`${nodes.length} node${nodes.length === 1 ? '' : 's'} available`}
    >
      {nodes.map((node) => (
        <div key={node.id} role="listitem">
          <NodeCard node={node} />
        </div>
      ))}
    </div>
  );
};

/**
 * Export NodeList as default
 */
export default NodeList;
