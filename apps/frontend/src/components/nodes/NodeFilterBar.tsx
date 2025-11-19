/**
 * NodeFilterBar Component
 *
 * Provides filtering controls for the node library, including search input
 * and source filter dropdown (All/Universal/Server).
 *
 * Features:
 * - Real-time search with debouncing
 * - Source filter dropdown using shadcn/ui Select
 * - Clean, responsive layout
 * - Accessible keyboard navigation
 * - Proper TypeScript typing
 *
 * @module components/nodes/NodeFilterBar
 */

import React from 'react';
import { SearchInput } from '@/components/shared/SearchInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Filter } from 'lucide-react';
import { NodeSource } from '@/types/node.types';

/**
 * Props for the NodeFilterBar component
 */
export interface NodeFilterBarProps {
  /**
   * Callback fired when the source filter changes
   * @param source - The selected node source ('all', 'universal', 'server', or 'client')
   */
  onSourceChange: (source: string) => void;

  /**
   * Callback fired when the search query changes (debounced)
   * @param query - The search query string
   */
  onSearchChange: (query: string) => void;

  /**
   * Current search query value
   * @default ""
   */
  searchValue?: string;

  /**
   * Current source filter value
   * @default "all"
   */
  sourceValue?: string;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Whether the filters are disabled
   * @default false
   */
  disabled?: boolean;
}

/**
 * NodeFilterBar Component
 *
 * Provides search and filter controls for the node library.
 * Includes a search input with debouncing and a source filter dropdown.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const [source, setSource] = useState("all");
 *
 * <NodeFilterBar
 *   searchValue={search}
 *   sourceValue={source}
 *   onSearchChange={setSearch}
 *   onSourceChange={setSource}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom styling
 * <NodeFilterBar
 *   searchValue={searchQuery}
 *   sourceValue={selectedSource}
 *   onSearchChange={handleSearchChange}
 *   onSourceChange={handleSourceChange}
 *   className="mb-6"
 * />
 * ```
 */
export const NodeFilterBar: React.FC<NodeFilterBarProps> = ({
  onSourceChange,
  onSearchChange,
  searchValue = '',
  sourceValue = 'all',
  className,
  disabled = false,
}) => {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className || ''}`}
    >
      {/* Search Input */}
      <div className="flex-1 max-w-md">
        <Label htmlFor="node-search" className="sr-only">
          Search nodes
        </Label>
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search nodes by name, ID, or description..."
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Source Filter Dropdown */}
      <div className="flex items-center gap-2 sm:min-w-[200px]">
        <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" aria-hidden="true" />
        <div className="flex-1">
          <Label htmlFor="source-filter" className="sr-only">
            Filter by source
          </Label>
          <Select
            value={sourceValue}
            onValueChange={onSourceChange}
            disabled={disabled}
          >
            <SelectTrigger id="source-filter" className="w-full">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value={NodeSource.UNIVERSAL}>Universal Only</SelectItem>
              <SelectItem value={NodeSource.SERVER}>Server Only</SelectItem>
              <SelectItem value={NodeSource.CLIENT}>Client Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

/**
 * Export NodeFilterBar as default
 */
export default NodeFilterBar;
