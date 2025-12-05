/**
 * ResourceFilterBar Component
 *
 * Filter controls for the resources list including search,
 * type filter, and sort options.
 *
 * @module components/resources/ResourceFilterBar
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import type { ResourceType, ResourceFilters } from '@/types/resource.types';

interface ResourceFilterBarProps {
  filters: ResourceFilters;
  onFiltersChange: (filters: ResourceFilters) => void;
  resultCount?: number;
  totalCount?: number;
}

const resourceTypes: { value: ResourceType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'prompt', label: 'Prompts' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'data', label: 'Data' },
];

const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'createdAt:asc', label: 'Oldest' },
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'name:desc', label: 'Name Z-A' },
  { value: 'size:desc', label: 'Largest' },
  { value: 'size:asc', label: 'Smallest' },
];

export function ResourceFilterBar({
  filters,
  onFiltersChange,
  resultCount,
  totalCount,
}: ResourceFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch || undefined, page: 1 });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === 'all' ? undefined : (value as ResourceType),
      page: 1,
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':') as [ResourceFilters['sortBy'], 'asc' | 'desc'];
    onFiltersChange({ ...filters, sortBy, sortOrder });
  };

  const handleRemoveTag = (tag: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags?.filter((t) => t !== tag),
      page: 1,
    });
  };

  const handleClearAll = () => {
    setSearchInput('');
    onFiltersChange({ page: 1, limit: filters.limit });
  };

  const hasActiveFilters =
    filters.search || filters.type || (filters.tags && filters.tags.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search resources..."
            className="pl-9"
          />
        </div>

        <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {resourceTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={`${filters.sortBy || 'createdAt'}:${filters.sortOrder || 'desc'}`}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(hasActiveFilters || (filters.tags && filters.tags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear all
            </Button>
          )}

          {resultCount !== undefined && totalCount !== undefined && (
            <span className="text-sm text-muted-foreground ml-auto">
              {resultCount} of {totalCount} resources
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ResourceFilterBar;
