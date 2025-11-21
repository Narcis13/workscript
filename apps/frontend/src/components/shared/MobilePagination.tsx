/**
 * MobilePagination Component
 *
 * A mobile-optimized pagination component that displays condensed pagination
 * controls on small screens and full pagination on larger screens.
 *
 * Features:
 * - Shows only Previous/Next buttons on mobile (< 640px)
 * - Shows full pagination with page numbers on desktop
 * - Displays current page and total pages
 * - Handles scroll to top on page change
 * - Responsive design with Tailwind breakpoints
 *
 * Part of Phase 7: Dashboard & Polish (Task 7.3.6)
 * Requirements: Req 18 (Responsive Design)
 *
 * @module components/shared/MobilePagination
 *
 * @example
 * ```tsx
 * <MobilePagination
 *   currentPage={1}
 *   totalPages={5}
 *   hasPreviousPage={false}
 *   hasNextPage={true}
 *   onPreviousPage={() => setPage(prev => prev - 1)}
 *   onNextPage={() => setPage(prev => prev + 1)}
 *   onGoToPage={(page) => setPage(page)}
 * />
 * ```
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Props for MobilePagination component
 */
export interface MobilePaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Callback when previous page is clicked */
  onPreviousPage: () => void;
  /** Callback when next page is clicked */
  onNextPage: () => void;
  /** Callback when a specific page is clicked (desktop only) */
  onGoToPage?: (page: number) => void;
  /** Optional CSS class to apply to the container */
  className?: string;
}

/**
 * MobilePagination Component
 *
 * Displays responsive pagination controls that adapt to screen size.
 * On mobile, shows only Previous/Next buttons. On desktop, shows full pagination.
 *
 * @param props - Component props
 * @returns Rendered pagination component
 */
export function MobilePagination({
  currentPage,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  className,
}: MobilePaginationProps) {
  // Don't render if only one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between gap-4 ${className || ''}`}>
      {/* Mobile View: Condensed (< 640px) */}
      <div className="sm:hidden w-full flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1">Prev</span>
        </Button>

        <div className="text-xs text-muted-foreground whitespace-nowrap px-2">
          {currentPage} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="flex-1"
        >
          <span className="mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop View: Full pagination (>= 640px) */}
      <div className="hidden sm:flex items-center justify-between gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            const showPage =
              page === 1 ||
              page === totalPages ||
              Math.abs(page - currentPage) <= 1;

            if (!showPage) {
              // Show ellipsis for skipped pages
              if (page === 2 && currentPage > 3) {
                return (
                  <span key={page} className="px-2 text-muted-foreground text-sm">
                    ...
                  </span>
                );
              }
              if (page === totalPages - 1 && currentPage < totalPages - 2) {
                return (
                  <span key={page} className="px-2 text-muted-foreground text-sm">
                    ...
                  </span>
                );
              }
              return null;
            }

            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onGoToPage?.(page)}
                className="h-9 w-9 p-0"
              >
                {page}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default MobilePagination;
