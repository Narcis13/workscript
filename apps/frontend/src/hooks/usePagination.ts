/**
 * usePagination Hook
 *
 * A reusable custom hook for managing pagination state and calculations
 * for list views across the application.
 *
 * Features:
 * - Manages current page, page size, and total items
 * - Calculates total pages, has next/previous pages
 * - Provides methods to navigate and change page size
 * - Resets to first page when needed
 *
 * Part of Phase 7: Dashboard & Polish (Task 7.3.1)
 * Requirements: Req 1, 4, 9, 14 (Pagination)
 *
 * @module hooks/usePagination
 *
 * @example
 * ```tsx
 * // Basic usage in a component
 * const { currentPage, pageSize, totalPages, ...methods } = usePagination({
 *   totalItems: filteredItems.length,
 *   initialPageSize: 20
 * });
 *
 * const paginatedItems = filteredItems.slice(
 *   (currentPage - 1) * pageSize,
 *   currentPage * pageSize
 * );
 * ```
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * Configuration options for the usePagination hook
 */
export interface UsePaginationConfig {
  /** Total number of items to paginate */
  totalItems: number;
  /** Initial page size (default: 20) */
  initialPageSize?: number;
  /** Initial page number (default: 1) */
  initialPage?: number;
}

/**
 * Return type for the usePagination hook
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Starting index for current page items (0-indexed) */
  startIndex: number;
  /** Ending index for current page items (0-indexed) */
  endIndex: number;
  /** Navigate to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Change the page size */
  setPageSize: (size: number) => void;
  /** Reset to first page */
  resetPage: () => void;
}

/**
 * Custom hook for managing pagination state
 *
 * Provides a complete pagination interface for list-based views.
 * Automatically validates page numbers and resets to valid ranges.
 *
 * @param config - Configuration object with totalItems and optional initial values
 * @returns Pagination state and methods object
 *
 * @example
 * ```tsx
 * const pagination = usePagination({
 *   totalItems: 150,
 *   initialPageSize: 20,
 *   initialPage: 1
 * });
 *
 * // Use pagination state
 * console.log(`Page ${pagination.currentPage} of ${pagination.totalPages}`);
 *
 * // Navigate pages
 * pagination.nextPage();
 * pagination.previousPage();
 * pagination.goToPage(5);
 *
 * // Slice items for current page
 * const items = allItems.slice(
 *   pagination.startIndex,
 *   pagination.endIndex
 * );
 * ```
 */
export function usePagination(config: UsePaginationConfig): PaginationState {
  const {
    totalItems,
    initialPageSize = 20,
    initialPage = 1,
  } = config;

  // State for current page and page size
  const [currentPage, setCurrentPage] = useState(
    Math.max(1, initialPage)
  );
  const [pageSize, setPageSizeState] = useState(
    Math.max(1, initialPageSize)
  );

  // Calculate derived values
  const calculations = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // Ensure current page is valid
    const validPage = Math.min(currentPage, totalPages);

    return {
      totalPages,
      validPage,
      startIndex: (validPage - 1) * pageSize,
      endIndex: Math.min(validPage * pageSize, totalItems),
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    };
  }, [totalItems, currentPage, pageSize]);

  /**
   * Navigate to a specific page
   * Automatically validates the page number
   */
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, calculations.totalPages));
    setCurrentPage(validPage);
    // Scroll to top of page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [calculations.totalPages]);

  /**
   * Go to next page if available
   */
  const nextPage = useCallback(() => {
    if (calculations.hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, calculations.hasNextPage, goToPage]);

  /**
   * Go to previous page if available
   */
  const previousPage = useCallback(() => {
    if (calculations.hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, calculations.hasPreviousPage, goToPage]);

  /**
   * Change page size and reset to first page
   */
  const updatePageSize = useCallback((size: number) => {
    const validSize = Math.max(1, size);
    setPageSizeState(validSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  /**
   * Reset to first page
   */
  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage: calculations.validPage,
    pageSize,
    totalItems,
    totalPages: calculations.totalPages,
    hasNextPage: calculations.hasNextPage,
    hasPreviousPage: calculations.hasPreviousPage,
    startIndex: calculations.startIndex,
    endIndex: calculations.endIndex,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: updatePageSize,
    resetPage,
  };
}

export default usePagination;
