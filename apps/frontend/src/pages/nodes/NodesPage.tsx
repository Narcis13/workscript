/**
 * NodesPage - Node Library Browser
 *
 * Main page for browsing and searching workflow nodes in the Workscript system.
 * Displays all available nodes (universal and server-specific) with filtering,
 * searching, and pagination capabilities.
 *
 * Features:
 * - Real-time search filtering by name, ID, or description
 * - Source filtering (All/Universal/Server/Client)
 * - Pagination for large node lists (20 nodes per page)
 * - Loading states with skeleton cards
 * - Error handling with retry functionality
 * - Empty state when no nodes match criteria
 *
 * Part of Phase 2: Node Library Implementation (Task 2.3.1)
 * Requirements: Req 1 (Node Library Browser)
 *
 * @module pages/nodes/NodesPage
 */

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useNodes } from '@/hooks/api/useNodes';
import { PageHeader } from '@/components/shared/PageHeader';
import { NodeFilterBar } from '@/components/nodes/NodeFilterBar';
import { NodeList } from '@/components/nodes/NodeList';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

/**
 * NodesPage Component
 *
 * Main page component that orchestrates the node library browser functionality.
 * Manages local state for search, filtering, and pagination, then passes data
 * down to child components for rendering.
 *
 * @example
 * ```tsx
 * // Used in routing configuration
 * <Route path="/nodes" element={<NodesPage />} />
 * ```
 *
 * @returns {JSX.Element} The rendered NodesPage component
 */
export default function NodesPage() {
  // Local state for filters and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Fetch nodes from API using React Query
  const { data: nodes, isLoading, error, refetch } = useNodes();

  /**
   * Filter nodes based on search query and source filter
   * Search matches against: name, id, and description (case-insensitive)
   */
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];

    let filtered = nodes;

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(node => node.source === sourceFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.id.toLowerCase().includes(query) ||
        node.name.toLowerCase().includes(query) ||
        node.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [nodes, searchQuery, sourceFilter]);

  /**
   * Calculate pagination values
   */
  const totalPages = Math.ceil(filteredNodes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNodes = filteredNodes.slice(startIndex, endIndex);

  /**
   * Handle search input change
   * Resets to first page when search query changes
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  /**
   * Handle source filter change
   * Resets to first page when filter changes
   */
  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
    setCurrentPage(1); // Reset to first page on filter change
  };

  /**
   * Handle page change
   * Scrolls to top of page for better UX
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of page when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Node Library"
          description="Browse and explore all available workflow nodes in the Workscript system"
        >
          {/* Total node count */}
          {nodes && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredNodes.length} of {nodes.length} nodes
              {searchQuery && ` matching "${searchQuery}"`}
              {sourceFilter !== 'all' && ` in ${sourceFilter}`}
            </p>
          )}
        </PageHeader>

        {/* Filter Bar */}
        <NodeFilterBar
          searchValue={searchQuery}
          sourceValue={sourceFilter}
          onSearchChange={handleSearchChange}
          onSourceChange={handleSourceChange}
          disabled={isLoading}
        />

        {/* Node List */}
        <NodeList
          nodes={paginatedNodes}
          loading={isLoading}
          error={error}
          onRetry={refetch}
        />

        {/* Pagination */}
        {!isLoading && !error && filteredNodes.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center mt-8">
            <Pagination>
              <PaginationContent>
                {/* Previous Button */}
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {/* Page Numbers */}
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
                        <PaginationItem key={page}>
                          <span className="px-4 text-muted-foreground">...</span>
                        </PaginationItem>
                      );
                    }
                    if (page === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <PaginationItem key={page}>
                          <span className="px-4 text-muted-foreground">...</span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  }

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {/* Next Button */}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
