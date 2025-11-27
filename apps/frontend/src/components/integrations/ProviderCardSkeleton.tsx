/**
 * ProviderCardSkeleton Component
 *
 * Loading skeleton that matches the dimensions and layout of ProviderCard.
 * Displays animated placeholder elements while provider data is loading.
 *
 * Features:
 * - Matches ProviderCard dimensions exactly
 * - Animated pulse effect for loading indication
 * - Accessible loading state
 *
 * Requirements Coverage:
 * - Requirement 14: Loading States
 *
 * @module components/integrations/ProviderCardSkeleton
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Props for the ProviderCardSkeleton component
 */
export interface ProviderCardSkeletonProps {
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * ProviderCardSkeleton Component
 *
 * Displays a loading skeleton that matches the ProviderCard layout.
 * Use this component while provider data is being fetched.
 *
 * @example
 * ```tsx
 * // Show skeleton while loading
 * {isLoading ? (
 *   <ProviderCardSkeleton />
 * ) : (
 *   <ProviderCard provider={provider} />
 * )}
 *
 * // Multiple skeletons in a grid
 * <div className="grid grid-cols-3 gap-4">
 *   {[...Array(3)].map((_, i) => (
 *     <ProviderCardSkeleton key={i} />
 *   ))}
 * </div>
 * ```
 */
export const ProviderCardSkeleton: React.FC<ProviderCardSkeletonProps> = ({
  className,
}) => {
  return (
    <Card
      className={cn('animate-pulse', className)}
      aria-busy="true"
      aria-label="Loading provider"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          {/* Icon skeleton */}
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />

          {/* Badge skeleton */}
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Title skeleton */}
        <Skeleton className="h-6 w-24 mt-3" />

        {/* Description skeletons (2 lines) */}
        <div className="space-y-2 mt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardHeader>

      <CardContent className="pb-0">
        {/* Empty content area - matches ProviderCard */}
      </CardContent>

      <CardFooter>
        {/* Button skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
};

export default ProviderCardSkeleton;
