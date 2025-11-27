/**
 * ConnectionCardSkeleton Component
 *
 * Loading skeleton that matches the dimensions and layout of ConnectionCard.
 * Displays animated placeholder elements while connection data is loading.
 *
 * Features:
 * - Matches ConnectionCard dimensions exactly
 * - Animated pulse effect for loading indication
 * - Accessible loading state
 *
 * Requirements Coverage:
 * - Requirement 14: Loading States
 *
 * @module components/integrations/ConnectionCardSkeleton
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Props for the ConnectionCardSkeleton component
 */
export interface ConnectionCardSkeletonProps {
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * ConnectionCardSkeleton Component
 *
 * Displays a loading skeleton that matches the ConnectionCard layout.
 * Use this component while connection data is being fetched.
 *
 * @example
 * ```tsx
 * // Show skeleton while loading
 * {isLoading ? (
 *   <ConnectionCardSkeleton />
 * ) : (
 *   <ConnectionCard connection={connection} />
 * )}
 *
 * // Multiple skeletons in a grid
 * <div className="grid grid-cols-2 gap-4">
 *   {[...Array(2)].map((_, i) => (
 *     <ConnectionCardSkeleton key={i} />
 *   ))}
 * </div>
 * ```
 */
export const ConnectionCardSkeleton: React.FC<ConnectionCardSkeletonProps> = ({
  className,
}) => {
  return (
    <Card
      className={cn('animate-pulse', className)}
      aria-busy="true"
      aria-label="Loading connection"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left side: Icon and account info skeleton */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Provider Icon skeleton */}
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />

            {/* Account Info skeleton */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Email skeleton */}
              <Skeleton className="h-4 w-48" />
              {/* Name skeleton */}
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          {/* Right side: Status badge and actions skeleton */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Badge skeleton */}
            <Skeleton className="h-5 w-16 rounded-full" />
            {/* Actions button skeleton */}
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Metadata skeleton */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {/* Last Used skeleton */}
          <Skeleton className="h-3 w-28" />
          {/* Created skeleton */}
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionCardSkeleton;
