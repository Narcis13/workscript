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
import { useNodes } from '@/hooks/api/useNodes';
import { usePagination } from '@/hooks/usePagination';
import { PageHeader } from '@/components/shared/PageHeader';
import { NodeFilterBar } from '@/components/nodes/NodeFilterBar';
import { NodeList } from '@/components/nodes/NodeList';
import { MobilePagination } from '@/components/shared/MobilePagination';

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
  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

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
   * Pagination hook - manages current page and pagination calculations
   */
  const pagination = usePagination({
    totalItems: filteredNodes.length,
    initialPageSize: 20,
  });

  /**
   * Get paginated nodes for current page
   */
  const paginatedNodes = useMemo(
    () => filteredNodes.slice(pagination.startIndex, pagination.endIndex),
    [filteredNodes, pagination.startIndex, pagination.endIndex]
  );

  /**
   * Handle search input change
   * Resets to first page when search query changes
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    pagination.resetPage(); // Reset to first page on search
  };

  /**
   * Handle source filter change
   * Resets to first page when filter changes
   */
  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
    pagination.resetPage(); // Reset to first page on filter change
  };

  return (
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

      {/* Pagination - Mobile Optimized */}
      {!isLoading && !error && filteredNodes.length > pagination.pageSize && (
        <div className="mt-8">
          <MobilePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hasPreviousPage={pagination.hasPreviousPage}
            hasNextPage={pagination.hasNextPage}
            onPreviousPage={pagination.previousPage}
            onNextPage={pagination.nextPage}
            onGoToPage={pagination.goToPage}
            className="p-4 bg-card border rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
