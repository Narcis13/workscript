# Resources UI Implementation Plan

## Overview

Implement a comprehensive file and content management interface for the Workscript workflow orchestration system. The Resources UI enables users to upload, create, manage, preview, and utilize various resource types (prompts, images, audio, documents, data files) that can be referenced in workflow executions.

**Backend Status:** Complete (10 endpoints at `/workscript/resources`)
**Frontend Status:** Not started
**Estimated Files:** ~25 new files
**Dependencies:** Existing shadcn/ui, React Query, Monaco Editor patterns

---

## Problem Statement / Motivation

Users currently have no way to manage resources through the UI. Workflow authors need to:
- Upload files (images, audio, PDFs) for use in workflows
- Create text-based resources (prompts, JSON data, CSV) directly in the browser
- Preview content before using in workflows
- Test prompt template interpolation with `{{$.path}}` syntax
- Organize resources with tags and filtering

The backend API is complete; this plan delivers the frontend interface.

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Routes (routes.tsx)                                             │
│  ├── /resources           → ResourcesPage (list)                 │
│  ├── /resources/new       → ResourceCreatePage                   │
│  ├── /resources/:id       → ResourceDetailPage                   │
│  └── /resources/:id/edit  → ResourceEditPage                     │
│                                                                  │
│  React Query Layer (hooks/api/useResources.ts)                   │
│  ├── useResources(filters)     → GET /resources                  │
│  ├── useResource(id)           → GET /resources/:id              │
│  ├── useCreateResource()       → POST /resources                 │
│  ├── useUpdateResource()       → PUT /resources/:id              │
│  ├── useUpdateContent()        → PUT /resources/:id/content      │
│  ├── useDeleteResource()       → DELETE /resources/:id           │
│  ├── useCopyResource()         → POST /resources/:id/copy        │
│  └── useInterpolate()          → POST /resources/:id/interpolate │
│                                                                  │
│  Components (components/resources/)                              │
│  ├── ResourceList.tsx          → Data table with actions         │
│  ├── ResourceCard.tsx          → Grid view card                  │
│  ├── ResourceForm.tsx          → Create/edit form                │
│  ├── ResourceUploader.tsx      → Drag-drop file upload           │
│  ├── ResourcePreview.tsx       → Type-specific preview           │
│  ├── ResourceFilterBar.tsx     → Search/type/tag filters         │
│  ├── ResourceTypeIcon.tsx      → Type-colored icons              │
│  ├── InterpolationTester.tsx   → Template testing panel          │
│  └── ContentEditor.tsx         → Monaco wrapper                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
apps/frontend/src/
├── components/
│   └── resources/
│       ├── ResourceList.tsx           # Data table component
│       ├── ResourceCard.tsx           # Card for grid view (future)
│       ├── ResourceForm.tsx           # Metadata form (name, desc, tags)
│       ├── ResourceUploader.tsx       # Drag-drop with react-dropzone
│       ├── ResourcePreview.tsx        # Type-specific content preview
│       ├── ResourceFilterBar.tsx      # Search + type + tag filters
│       ├── ResourceTypeIcon.tsx       # Icon per type with colors
│       ├── InterpolationTester.tsx    # JSON input + test button
│       └── ContentEditor.tsx          # Monaco wrapper for editing
├── hooks/
│   └── api/
│       └── useResources.ts            # React Query hooks
├── pages/
│   └── resources/
│       ├── ResourcesPage.tsx          # List page with filters
│       ├── ResourceCreatePage.tsx     # Upload or create tabs
│       ├── ResourceDetailPage.tsx     # View with preview + metadata
│       └── ResourceEditPage.tsx       # Edit metadata + content tabs
├── services/
│   └── api/
│       └── resources.api.ts           # API service functions
└── types/
    └── resource.types.ts              # TypeScript interfaces
```

---

## Implementation Phases

### Phase 1: Foundation (API Layer + Types + Navigation)

#### Task 1.1: TypeScript Types
**File:** `apps/frontend/src/types/resource.types.ts`

```typescript
export type ResourceType = 'prompt' | 'image' | 'audio' | 'document' | 'data';
export type AuthorType = 'user' | 'workflow' | 'automation' | 'system';

export interface Resource {
  id: string;
  name: string;
  path: string;
  type: ResourceType;
  mimeType: string;
  size: number;
  checksum: string;
  authorType: AuthorType;
  authorId: string;
  tenantId: string;
  description?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceFilters {
  search?: string;
  type?: ResourceType;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'size';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateResourcePayload {
  name: string;
  type: ResourceType;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  content?: string;       // For text-based creation
  file?: File;            // For file upload
}

export interface InterpolationResult {
  result: string;
  placeholders: {
    found: string[];
    replaced: string[];
    unresolved: string[];
  };
}
```

#### Task 1.2: API Service Functions
**File:** `apps/frontend/src/services/api/resources.api.ts`

```typescript
import { apiClient } from './client';
import type { Resource, ResourceFilters, CreateResourcePayload, InterpolationResult } from '@/types/resource.types';

const BASE_URL = '/workscript/resources';

export async function fetchResources(filters?: ResourceFilters): Promise<{ resources: Resource[]; total: number }> {
  const response = await apiClient.get(BASE_URL, { params: filters });
  return response.data;
}

export async function fetchResource(id: string): Promise<Resource> {
  const response = await apiClient.get(`${BASE_URL}/${id}`);
  return response.data.resource || response.data;
}

export async function createResource(data: CreateResourcePayload): Promise<Resource> {
  if (data.file) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.description) formData.append('description', data.description);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    if (data.isPublic !== undefined) formData.append('isPublic', String(data.isPublic));

    const response = await apiClient.post(`${BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.resource || response.data;
  }

  const response = await apiClient.post(BASE_URL, data);
  return response.data.resource || response.data;
}

export async function updateResource(id: string, data: Partial<CreateResourcePayload>): Promise<Resource> {
  const response = await apiClient.put(`${BASE_URL}/${id}`, data);
  return response.data.resource || response.data;
}

export async function updateResourceContent(id: string, content: string): Promise<Resource> {
  const response = await apiClient.put(`${BASE_URL}/${id}/content`, { content });
  return response.data.resource || response.data;
}

export async function deleteResource(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}`);
}

export async function copyResource(id: string, name: string, path: string): Promise<Resource> {
  const response = await apiClient.post(`${BASE_URL}/${id}/copy`, { name, path });
  return response.data.resource || response.data;
}

export async function downloadResource(id: string): Promise<Blob> {
  const response = await apiClient.get(`${BASE_URL}/${id}/download`, { responseType: 'blob' });
  return response.data;
}

export async function interpolateResource(id: string, state: Record<string, unknown>): Promise<InterpolationResult> {
  const response = await apiClient.post(`${BASE_URL}/${id}/interpolate`, { state });
  return response.data;
}

export async function fetchResourceContent(id: string): Promise<string> {
  const response = await apiClient.get(`${BASE_URL}/${id}/content`);
  return response.data.content || response.data;
}
```

#### Task 1.3: React Query Hooks
**File:** `apps/frontend/src/hooks/api/useResources.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as resourcesApi from '@/services/api/resources.api';
import type { Resource, ResourceFilters, CreateResourcePayload } from '@/types/resource.types';

// Query key factory
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filters?: ResourceFilters) => [...resourceKeys.lists(), filters] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  content: (id: string) => [...resourceKeys.detail(id), 'content'] as const,
};

export function useResources(filters?: ResourceFilters) {
  return useQuery({
    queryKey: resourceKeys.list(filters),
    queryFn: () => resourcesApi.fetchResources(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => resourcesApi.fetchResource(id),
    enabled: !!id,
  });
}

export function useResourceContent(id: string, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.content(id),
    queryFn: () => resourcesApi.fetchResourceContent(id),
    enabled: !!id && enabled,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResourcePayload) => resourcesApi.createResource(data),
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.setQueryData(resourceKeys.detail(resource.id), resource);
      toast.success('Resource created', { description: `"${resource.name}" has been created.` });
    },
    onError: (error: any) => {
      toast.error('Failed to create resource', {
        description: error?.response?.data?.message || 'An unexpected error occurred.',
      });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateResourcePayload> }) =>
      resourcesApi.updateResource(id, data),
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.setQueryData(resourceKeys.detail(resource.id), resource);
      toast.success('Resource updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update resource', {
        description: error?.response?.data?.message || 'An unexpected error occurred.',
      });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      resourcesApi.updateResourceContent(id, content),
    onSuccess: (resource) => {
      queryClient.setQueryData(resourceKeys.detail(resource.id), resource);
      queryClient.invalidateQueries({ queryKey: resourceKeys.content(resource.id) });
      toast.success('Content saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save content', {
        description: error?.response?.data?.message || 'An unexpected error occurred.',
      });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resourcesApi.deleteResource(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.removeQueries({ queryKey: resourceKeys.detail(id) });
      toast.success('Resource deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete resource', {
        description: error?.response?.data?.message || 'An unexpected error occurred.',
      });
    },
  });
}

export function useCopyResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, path }: { id: string; name: string; path: string }) =>
      resourcesApi.copyResource(id, name, path),
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      toast.success('Resource copied', { description: `Created "${resource.name}"` });
    },
    onError: (error: any) => {
      toast.error('Failed to copy resource', {
        description: error?.response?.data?.message || 'An unexpected error occurred.',
      });
    },
  });
}

export function useInterpolate() {
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: Record<string, unknown> }) =>
      resourcesApi.interpolateResource(id, state),
    onError: (error: any) => {
      toast.error('Interpolation failed', {
        description: error?.response?.data?.message || 'Invalid state object.',
      });
    },
  });
}
```

#### Task 1.4: Add Navigation Link
**File:** `apps/frontend/src/components/layout/Sidebar.tsx` (modify)

Add to `navigationLinks` array after Dashboard:
```typescript
{
  href: '/resources',
  label: 'Resources',
  icon: FolderOpen,  // from lucide-react
},
```

#### Task 1.5: Add Routes
**File:** `apps/frontend/src/routes.tsx` (modify)

Add routes under AppLayout children:
```typescript
{
  path: 'resources',
  element: (
    <RouteErrorBoundary fallbackPath="/dashboard">
      <Suspense fallback={<PageLoader />}>
        <ResourcesPage />
      </Suspense>
    </RouteErrorBoundary>
  ),
},
{
  path: 'resources/new',
  element: (
    <RouteErrorBoundary fallbackPath="/resources">
      <Suspense fallback={<PageLoader />}>
        <ResourceCreatePage />
      </Suspense>
    </RouteErrorBoundary>
  ),
},
{
  path: 'resources/:id',
  element: (
    <RouteErrorBoundary fallbackPath="/resources">
      <Suspense fallback={<PageLoader />}>
        <ResourceDetailPage />
      </Suspense>
    </RouteErrorBoundary>
  ),
},
{
  path: 'resources/:id/edit',
  element: (
    <RouteErrorBoundary fallbackPath="/resources">
      <Suspense fallback={<PageLoader />}>
        <ResourceEditPage />
      </Suspense>
    </RouteErrorBoundary>
  ),
},
```

---

### Phase 2: Core Components

#### Task 2.1: Resource Type Icon Component
**File:** `apps/frontend/src/components/resources/ResourceTypeIcon.tsx`

```typescript
import { FileCode, Image, Music, FileText, Database, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResourceType } from '@/types/resource.types';

const typeConfig: Record<ResourceType, { icon: LucideIcon; color: string }> = {
  prompt: { icon: FileCode, color: 'text-blue-500' },
  image: { icon: Image, color: 'text-green-500' },
  audio: { icon: Music, color: 'text-purple-500' },
  document: { icon: FileText, color: 'text-orange-500' },
  data: { icon: Database, color: 'text-cyan-500' },
};

interface ResourceTypeIconProps {
  type: ResourceType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'size-4', md: 'size-5', lg: 'size-8' };

export function ResourceTypeIcon({ type, size = 'md', className }: ResourceTypeIconProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return <Icon className={cn(sizeClasses[size], config.color, className)} />;
}
```

#### Task 2.2: Resource Filter Bar Component
**File:** `apps/frontend/src/components/resources/ResourceFilterBar.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export function ResourceFilterBar({ filters, onFiltersChange, resultCount, totalCount }: ResourceFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch || undefined, page: 1 });
    }
  }, [debouncedSearch]);

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
      tags: filters.tags?.filter(t => t !== tag),
      page: 1,
    });
  };

  const handleClearAll = () => {
    setSearchInput('');
    onFiltersChange({ page: 1, limit: filters.limit });
  };

  const hasActiveFilters = filters.search || filters.type || (filters.tags && filters.tags.length > 0);

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
            {resourceTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
            {sortOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(hasActiveFilters || filters.tags?.length) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.tags?.map(tag => (
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
```

#### Task 2.3: Resource List Component
**File:** `apps/frontend/src/components/resources/ResourceList.tsx`

```typescript
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Eye, Pencil, Download, Copy, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResourceTypeIcon } from './ResourceTypeIcon';
import { formatFileSize } from '@/lib/utils';
import type { Resource } from '@/types/resource.types';

interface ResourceListProps {
  resources: Resource[];
  loading?: boolean;
  onView: (resource: Resource) => void;
  onEdit?: (resource: Resource) => void;
  onDownload?: (resource: Resource) => void;
  onCopy?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
}

export function ResourceList({
  resources,
  loading,
  onView,
  onEdit,
  onDownload,
  onCopy,
  onDelete
}: ResourceListProps) {
  if (loading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-20">Size</TableHead>
              <TableHead className="w-32">Tags</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="size-5" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="size-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-20">Size</TableHead>
            <TableHead className="w-32">Tags</TableHead>
            <TableHead className="w-32">Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map(resource => (
            <TableRow
              key={resource.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(resource)}
            >
              <TableCell>
                <ResourceTypeIcon type={resource.type} size="sm" />
              </TableCell>
              <TableCell className="font-medium">
                <div>
                  <span>{resource.name}</span>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {resource.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{resource.type}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(resource.size)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {resource.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                  {resource.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">+{resource.tags.length - 2}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground" title={new Date(resource.createdAt).toLocaleString()}>
                {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(resource)}>
                      <Eye className="size-4 mr-2" /> View
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(resource)}>
                        <Pencil className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                    )}
                    {onDownload && (
                      <DropdownMenuItem onClick={() => onDownload(resource)}>
                        <Download className="size-4 mr-2" /> Download
                      </DropdownMenuItem>
                    )}
                    {onCopy && (
                      <DropdownMenuItem onClick={() => onCopy(resource)}>
                        <Copy className="size-4 mr-2" /> Copy
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(resource)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### Task 2.4: Resource Uploader Component
**File:** `apps/frontend/src/components/resources/ResourceUploader.tsx`

```typescript
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatFileSize } from '@/lib/utils';
import { ResourceTypeIcon } from './ResourceTypeIcon';
import type { ResourceType } from '@/types/resource.types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const mimeToType: Record<string, ResourceType> = {
  'text/plain': 'document',
  'text/markdown': 'prompt',
  'application/json': 'data',
  'text/csv': 'data',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/pdf': 'document',
};

const acceptedMimeTypes = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'audio/*': ['.mp3', '.wav', '.ogg'],
  'application/pdf': ['.pdf'],
};

interface ResourceUploaderProps {
  onFileSelect: (file: File, detectedType: ResourceType) => void;
  uploadProgress?: number;
  disabled?: boolean;
}

export function ResourceUploader({ onFileSelect, uploadProgress, disabled }: ResourceUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<ResourceType | null>(null);

  const detectType = (file: File): ResourceType => {
    // Check MIME type first
    if (mimeToType[file.type]) {
      return mimeToType[file.type];
    }

    // Fallback to extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'md') return 'prompt';
    if (ext === 'json' || ext === 'csv') return 'data';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (ext === 'pdf' || ext === 'txt') return 'document';

    return 'document'; // Default fallback
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
      } else {
        setError('File type not allowed');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const type = detectType(file);
      setSelectedFile(file);
      setDetectedType(type);
      onFileSelect(file, type);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedMimeTypes,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled,
  });

  const clearFile = () => {
    setSelectedFile(null);
    setDetectedType(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive && 'border-primary bg-primary/5',
          isDragAccept && 'border-green-500 bg-green-500/5',
          isDragReject && 'border-destructive bg-destructive/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragActive && 'hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg">Drop file here...</p>
        ) : (
          <>
            <p className="text-lg mb-1">Drag and drop a file, or click to select</p>
            <p className="text-sm text-muted-foreground">
              Images, audio, documents, JSON, CSV up to {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedFile && detectedType && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
          <ResourceTypeIcon type={detectedType} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)} • Detected as {detectedType}
            </p>
          </div>
          {uploadProgress !== undefined ? (
            <div className="w-24">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={clearFile}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Task 2.5: Content Editor Component
**File:** `apps/frontend/src/components/resources/ContentEditor.tsx`

```typescript
import { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResourceType } from '@/types/resource.types';

const languageMap: Record<ResourceType, string> = {
  prompt: 'markdown',
  document: 'markdown',
  data: 'json',
  image: 'text',
  audio: 'text',
};

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  resourceType: ResourceType;
  readOnly?: boolean;
  height?: string;
}

export function ContentEditor({
  value,
  onChange,
  resourceType,
  readOnly = false,
  height = '500px'
}: ContentEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const language = languageMap[resourceType] || 'text';

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger external save handler
      const event = new CustomEvent('editor-save', { detail: editor.getValue() });
      window.dispatchEvent(event);
    });
  };

  const handleChange: OnChange = (value) => {
    onChange(value || '');
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme={monacoTheme}
        loading={<Skeleton className="h-full w-full" />}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          formatOnPaste: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
```

#### Task 2.6: Resource Preview Component
**File:** `apps/frontend/src/components/resources/ResourcePreview.tsx`

```typescript
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ZoomIn, ZoomOut, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Resource } from '@/types/resource.types';

interface ResourcePreviewProps {
  resource: Resource;
  content?: string;
  loading?: boolean;
  error?: string;
  onDownload?: () => void;
}

export function ResourcePreview({ resource, content, loading, error, onDownload }: ResourcePreviewProps) {
  const [zoom, setZoom] = useState(1);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Image preview
  if (resource.type === 'image') {
    const imageUrl = `/api/workscript/resources/${resource.id}/download`;
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
            <ZoomIn className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground self-center">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="border rounded-lg overflow-auto max-h-[600px] bg-muted/20">
          <img
            src={imageUrl}
            alt={resource.name}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            className="max-w-none"
          />
        </div>
      </div>
    );
  }

  // Audio preview
  if (resource.type === 'audio') {
    const audioUrl = `/api/workscript/resources/${resource.id}/download`;
    return (
      <div className="p-6 border rounded-lg bg-muted/20">
        <audio controls className="w-full">
          <source src={audioUrl} type={resource.mimeType} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  // PDF preview
  if (resource.mimeType === 'application/pdf') {
    const pdfUrl = `/api/workscript/resources/${resource.id}/download`;
    return (
      <div className="border rounded-lg overflow-hidden">
        <embed
          src={pdfUrl}
          type="application/pdf"
          width="100%"
          height="600px"
          className="bg-white"
        />
      </div>
    );
  }

  // JSON preview
  if (resource.type === 'data' && resource.mimeType === 'application/json') {
    try {
      const parsed = JSON.parse(content || '');
      return (
        <div className="border rounded-lg p-4 bg-muted/20 overflow-auto max-h-[600px]">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Invalid JSON content</AlertDescription>
        </Alert>
      );
    }
  }

  // CSV preview
  if (resource.mimeType === 'text/csv') {
    const rows = (content || '').split('\n').filter(Boolean);
    const headers = rows[0]?.split(',') || [];
    const data = rows.slice(1, 101); // Limit to 100 rows

    return (
      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium border-b">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/50">
                {row.split(',').map((cell, j) => (
                  <td key={j} className="px-3 py-2">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 101 && (
          <p className="p-3 text-sm text-muted-foreground text-center border-t">
            Showing first 100 of {rows.length - 1} rows
          </p>
        )}
      </div>
    );
  }

  // Markdown/text preview (prompt, document)
  if (content !== undefined) {
    return (
      <div className="border rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-auto">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="text-center p-12 text-muted-foreground">
      <p>Preview not available for this file type</p>
      {onDownload && (
        <Button variant="outline" className="mt-4" onClick={onDownload}>
          <Download className="size-4 mr-2" /> Download to view
        </Button>
      )}
    </div>
  );
}
```

#### Task 2.7: Interpolation Tester Component
**File:** `apps/frontend/src/components/resources/InterpolationTester.tsx`

```typescript
import { useState } from 'react';
import { Play, Copy, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useInterpolate } from '@/hooks/api/useResources';
import { toast } from 'sonner';

interface InterpolationTesterProps {
  resourceId: string;
}

export function InterpolationTester({ resourceId }: InterpolationTesterProps) {
  const [stateInput, setStateInput] = useState('{\n  "key": "value"\n}');
  const [result, setResult] = useState<{
    output: string;
    found: string[];
    replaced: string[];
    unresolved: string[];
  } | null>(null);

  const interpolate = useInterpolate();
  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateJson = (input: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(input);
      setJsonError(null);
      return parsed;
    } catch (e) {
      setJsonError('Invalid JSON syntax');
      return null;
    }
  };

  const handleTest = async () => {
    const state = validateJson(stateInput);
    if (!state) return;

    const response = await interpolate.mutateAsync({ id: resourceId, state });
    setResult({
      output: response.result,
      found: response.placeholders.found,
      replaced: response.placeholders.replaced,
      unresolved: response.placeholders.unresolved,
    });
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result.output);
      toast.success('Copied to clipboard');
    }
  };

  const handleClear = () => {
    setResult(null);
    setStateInput('{\n  "key": "value"\n}');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Test Interpolation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">State (JSON)</label>
          <Textarea
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder='{ "$.key": "value" }'
            className="font-mono text-sm h-32"
          />
          {jsonError && (
            <p className="text-sm text-destructive mt-1">{jsonError}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTest}
            disabled={!!jsonError || interpolate.isPending}
            className="flex-1"
          >
            <Play className="size-4 mr-2" />
            {interpolate.isPending ? 'Testing...' : 'Test'}
          </Button>
          <Button variant="outline" onClick={handleClear}>Clear</Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Result</label>
                <Button variant="ghost" size="sm" onClick={handleCopyResult}>
                  <Copy className="size-3 mr-1" /> Copy
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap max-h-48 overflow-auto">
                {result.output}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {result.replaced.length > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="size-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Replaced:</span>
                  {result.replaced.map(p => (
                    <Badge key={p} variant="outline" className="text-xs text-green-600">{p}</Badge>
                  ))}
                </div>
              )}

              {result.unresolved.length > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="size-3 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Unresolved:</span>
                  {result.unresolved.map(p => (
                    <Badge key={p} variant="outline" className="text-xs text-amber-600">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Phase 3: Page Components

#### Task 3.1: Resources List Page
**File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobilePagination } from '@/components/shared/MobilePagination';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { ResourceList } from '@/components/resources/ResourceList';
import { ResourceFilterBar } from '@/components/resources/ResourceFilterBar';
import { useResources, useDeleteResource } from '@/hooks/api/useResources';
import { downloadResource } from '@/services/api/resources.api';
import { usePagination } from '@/hooks/usePagination';
import type { Resource, ResourceFilters } from '@/types/resource.types';

const PAGE_SIZE = 20;

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const [filters, setFilters] = useState<ResourceFilters>(() => ({
    search: searchParams.get('search') || undefined,
    type: (searchParams.get('type') as ResourceFilters['type']) || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    sortBy: (searchParams.get('sortBy') as ResourceFilters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    page: Number(searchParams.get('page')) || 1,
    limit: PAGE_SIZE,
  }));

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy!);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder!);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const { data, isLoading } = useResources(filters);
  const deleteMutation = useDeleteResource();

  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const pagination = usePagination({
    totalItems: data?.total || 0,
    initialPageSize: PAGE_SIZE,
    initialPage: filters.page || 1,
  });

  // Sync pagination with filters
  useEffect(() => {
    if (pagination.currentPage !== filters.page) {
      setFilters(f => ({ ...f, page: pagination.currentPage }));
    }
  }, [pagination.currentPage]);

  const handleFiltersChange = (newFilters: ResourceFilters) => {
    setFilters(newFilters);
    if (newFilters.page === 1) {
      pagination.goToPage(1);
    }
  };

  const handleView = (resource: Resource) => navigate(`/resources/${resource.id}`);
  const handleEdit = (resource: Resource) => navigate(`/resources/${resource.id}/edit`);

  const handleDownload = async (resource: Resource) => {
    const blob = await downloadResource(resource.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resource.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (resource: Resource) => {
    navigate(`/resources/${resource.id}?action=copy`);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const resources = data?.resources || [];
  const isEmpty = !isLoading && resources.length === 0 && !filters.search && !filters.type;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Resources"
        description="Manage prompts, files, and data for your workflows"
        actions={
          <Button onClick={() => navigate('/resources/new')}>
            <Plus className="size-4 mr-2" />
            Create Resource
          </Button>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={FolderOpen}
          title="No resources yet"
          description="Upload files or create content to use in your workflows"
          actionButton={{
            label: 'Create Resource',
            onClick: () => navigate('/resources/new'),
            icon: Plus,
          }}
        />
      ) : (
        <>
          <ResourceFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            resultCount={resources.length}
            totalCount={data?.total}
          />

          <ResourceList
            resources={resources}
            loading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onDelete={setDeleteTarget}
          />

          {pagination.totalPages > 1 && (
            <MobilePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              hasPreviousPage={pagination.hasPreviousPage}
              hasNextPage={pagination.hasNextPage}
              onPreviousPage={pagination.previousPage}
              onNextPage={pagination.nextPage}
              onGoToPage={pagination.goToPage}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Resource?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
```

#### Task 3.2: Resource Create Page
**File:** `apps/frontend/src/pages/resources/ResourceCreatePage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourceUploader } from '@/components/resources/ResourceUploader';
import { ContentEditor } from '@/components/resources/ContentEditor';
import { useCreateResource } from '@/hooks/api/useResources';
import type { ResourceType, CreateResourcePayload } from '@/types/resource.types';

const DRAFT_KEY = 'resource-draft';

interface FormData {
  name: string;
  description: string;
  type: ResourceType;
  tags: string;
  isPublic: boolean;
  content: string;
}

export default function ResourceCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateResource();

  const [tab, setTab] = useState<'upload' | 'create'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      type: 'document',
      tags: '',
      isPublic: false,
      content: '',
    },
  });

  const { watch, setValue } = form;
  const content = watch('content');
  const resourceType = watch('type');

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (window.confirm('Restore unsaved draft?')) {
          Object.entries(parsed).forEach(([key, value]) => {
            setValue(key as keyof FormData, value as any);
          });
          setTab('create');
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {}
    }
  }, [setValue]);

  // Auto-save draft
  useEffect(() => {
    if (tab === 'create' && content) {
      const timeout = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [content, tab, form]);

  const handleFileSelect = (file: File, detectedType: ResourceType) => {
    setSelectedFile(file);
    setValue('type', detectedType);
    setValue('name', file.name.replace(/\.[^/.]+$/, '')); // Remove extension
  };

  const handleSubmit = async (data: FormData) => {
    const payload: CreateResourcePayload = {
      name: data.name,
      type: data.type,
      description: data.description || undefined,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      isPublic: data.isPublic,
    };

    if (tab === 'upload' && selectedFile) {
      payload.file = selectedFile;
    } else if (tab === 'create') {
      payload.content = data.content;
    }

    const resource = await createMutation.mutateAsync(payload);
    localStorage.removeItem(DRAFT_KEY);
    navigate(`/resources/${resource.id}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/resources')}>
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader title="Create Resource" description="Upload a file or create content directly" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'upload' | 'create')}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
          <TabsTrigger value="create" className="flex-1">Create Content</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            <TabsContent value="upload" className="mt-0">
              <ResourceUploader
                onFileSelect={handleFileSelect}
                uploadProgress={uploadProgress}
                disabled={createMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="create" className="mt-0 space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prompt">Prompt (Markdown)</SelectItem>
                        <SelectItem value="data">Data (JSON/CSV)</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                    {resourceType === 'prompt' && (
                      <FormDescription>
                        Use {'{{$.path}}'} syntax for template interpolation
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <ContentEditor
                        value={field.value}
                        onChange={field.onChange}
                        resourceType={resourceType}
                        height="400px"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Common fields */}
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required', minLength: { value: 3, message: 'Min 3 characters' } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Resource" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Optional description..." />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="tag1, tag2, tag3" />
                  </FormControl>
                  <FormDescription>Comma-separated list of tags</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Public</FormLabel>
                    <FormDescription>Make this resource visible to all users in your organization</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/resources')}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || (tab === 'upload' && !selectedFile)}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Resource'}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}
```

#### Task 3.3: Resource Detail Page
**File:** `apps/frontend/src/pages/resources/ResourceDetailPage.tsx`

```typescript
import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Pencil, Download, Copy, Trash2, Eye, Lock, Globe } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ResourceTypeIcon } from '@/components/resources/ResourceTypeIcon';
import { ResourcePreview } from '@/components/resources/ResourcePreview';
import { InterpolationTester } from '@/components/resources/InterpolationTester';
import { useResource, useResourceContent, useDeleteResource, useCopyResource } from '@/hooks/api/useResources';
import { downloadResource } from '@/services/api/resources.api';
import { formatFileSize } from '@/lib/utils';

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: resource, isLoading, error } = useResource(id!);
  const { data: content, isLoading: contentLoading } = useResourceContent(
    id!,
    resource?.type === 'prompt' || resource?.type === 'document' || resource?.type === 'data'
  );

  const deleteMutation = useDeleteResource();
  const copyMutation = useCopyResource();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(searchParams.get('action') === 'copy');
  const [copyName, setCopyName] = useState('');
  const [copyPath, setCopyPath] = useState('');

  const handleDownload = async () => {
    if (!resource) return;
    const blob = await downloadResource(resource.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resource.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyOpen = () => {
    if (resource) {
      setCopyName(`Copy of ${resource.name}`);
      setCopyPath(`${resource.path}-copy`);
      setCopyOpen(true);
    }
  };

  const handleCopyConfirm = async () => {
    if (!resource) return;
    const newResource = await copyMutation.mutateAsync({
      id: resource.id,
      name: copyName,
      path: copyPath,
    });
    setCopyOpen(false);
    navigate(`/resources/${newResource.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!resource) return;
    await deleteMutation.mutateAsync(resource.id);
    navigate('/resources');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Resource not found</h2>
        <p className="text-muted-foreground mb-4">The resource you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/resources')}>Back to Resources</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/resources">Resources</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{resource.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/resources')}>
            <ArrowLeft className="size-4" />
          </Button>
          <ResourceTypeIcon type={resource.type} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{resource.name}</h1>
            {resource.description && (
              <p className="text-muted-foreground">{resource.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/resources/${resource.id}/edit`)}>
            <Pencil className="size-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="size-4 mr-2" /> Download
          </Button>
          <Button variant="outline" onClick={handleCopyOpen}>
            <Copy className="size-4 mr-2" /> Copy
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResourcePreview
                resource={resource}
                content={content}
                loading={contentLoading}
                onDownload={handleDownload}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline" className="capitalize">{resource.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span>{formatFileSize(resource.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visibility</span>
                <span className="flex items-center gap-1">
                  {resource.isPublic ? (
                    <><Globe className="size-3" /> Public</>
                  ) : (
                    <><Lock className="size-3" /> Private</>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span title={new Date(resource.createdAt).toLocaleString()}>
                  {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span title={new Date(resource.updatedAt).toLocaleString()}>
                  {formatDistanceToNow(new Date(resource.updatedAt), { addSuffix: true })}
                </span>
              </div>
              {resource.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground block mb-2">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-xs">Checksum</span>
                <p className="font-mono text-xs truncate" title={resource.checksum}>
                  {resource.checksum}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interpolation tester for prompts */}
          {resource.type === 'prompt' && (
            <InterpolationTester resourceId={resource.id} />
          )}
        </div>
      </div>

      {/* Copy Dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={copyName} onChange={(e) => setCopyName(e.target.value)} />
            </div>
            <div>
              <Label>Path</Label>
              <Input value={copyPath} onChange={(e) => setCopyPath(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button onClick={handleCopyConfirm} disabled={copyMutation.isPending}>
              {copyMutation.isPending ? 'Copying...' : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Resource?"
        description={`Are you sure you want to delete "${resource.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
```

#### Task 3.4: Resource Edit Page
**File:** `apps/frontend/src/pages/resources/ResourceEditPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ContentEditor } from '@/components/resources/ContentEditor';
import { useResource, useResourceContent, useUpdateResource, useUpdateContent } from '@/hooks/api/useResources';
import { toast } from 'sonner';

interface MetadataFormData {
  name: string;
  description: string;
  tags: string;
  isPublic: boolean;
}

export default function ResourceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: resource, isLoading } = useResource(id!);
  const { data: originalContent, isLoading: contentLoading } = useResourceContent(
    id!,
    resource?.type === 'prompt' || resource?.type === 'document' || resource?.type === 'data'
  );

  const updateMutation = useUpdateResource();
  const updateContentMutation = useUpdateContent();

  const [tab, setTab] = useState<'metadata' | 'content'>('metadata');
  const [content, setContent] = useState('');
  const [hasContentChanges, setHasContentChanges] = useState(false);

  const form = useForm<MetadataFormData>({
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      isPublic: false,
    },
  });

  // Populate form when resource loads
  useEffect(() => {
    if (resource) {
      form.reset({
        name: resource.name,
        description: resource.description || '',
        tags: resource.tags.join(', '),
        isPublic: resource.isPublic,
      });
    }
  }, [resource, form]);

  // Populate content when it loads
  useEffect(() => {
    if (originalContent !== undefined) {
      setContent(originalContent);
    }
  }, [originalContent]);

  // Track content changes
  useEffect(() => {
    setHasContentChanges(content !== originalContent);
  }, [content, originalContent]);

  // Save content shortcut
  useEffect(() => {
    const handleSave = (e: CustomEvent) => {
      if (tab === 'content' && hasContentChanges) {
        handleContentSave();
      }
    };
    window.addEventListener('editor-save', handleSave as EventListener);
    return () => window.removeEventListener('editor-save', handleSave as EventListener);
  }, [tab, hasContentChanges, content]);

  const handleMetadataSubmit = async (data: MetadataFormData) => {
    if (!resource) return;

    await updateMutation.mutateAsync({
      id: resource.id,
      data: {
        name: data.name,
        description: data.description || undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isPublic: data.isPublic,
      },
    });

    navigate(`/resources/${resource.id}`);
  };

  const handleContentSave = async () => {
    if (!resource) return;
    await updateContentMutation.mutateAsync({ id: resource.id, content });
    setHasContentChanges(false);
  };

  const isTextEditable = resource && ['prompt', 'document', 'data'].includes(resource.type);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Resource not found</h2>
        <Button onClick={() => navigate('/resources')}>Back to Resources</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/resources">Resources</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/resources/${resource.id}`}>{resource.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/resources/${resource.id}`)}>
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader title={`Edit ${resource.name}`} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'metadata' | 'content')}>
        <TabsList>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="content" disabled={!isTextEditable}>
            Content
            {!isTextEditable && <span className="ml-1 text-xs">(binary)</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleMetadataSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Name is required', minLength: { value: 3, message: 'Min 3 characters' } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="tag1, tag2, tag3" />
                    </FormControl>
                    <FormDescription>Comma-separated list of tags</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Public</FormLabel>
                      <FormDescription>
                        {field.value ? 'Visible to all users' : 'Only visible to you'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(`/resources/${resource.id}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="content" className="mt-6 space-y-4">
          {contentLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <>
              <ContentEditor
                value={content}
                onChange={setContent}
                resourceType={resource.type}
                height="500px"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {content.length} characters • {new Blob([content]).size} bytes
                  {hasContentChanges && ' • Unsaved changes'}
                </span>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setContent(originalContent || '')}
                    disabled={!hasContentChanges}
                  >
                    Discard Changes
                  </Button>
                  <Button
                    onClick={handleContentSave}
                    disabled={updateContentMutation.isPending || !hasContentChanges}
                  >
                    {updateContentMutation.isPending ? 'Saving...' : 'Save Content'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Phase 4: Polish & Integration

#### Task 4.1: Install Dependencies
```bash
cd apps/frontend
bun add react-dropzone react-markdown
```

#### Task 4.2: Add Utility Functions
**File:** `apps/frontend/src/lib/utils.ts` (add to existing)

```typescript
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
```

#### Task 4.3: Add useDebounce Hook
**File:** `apps/frontend/src/hooks/useDebounce.ts`

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

#### Task 4.4: Add Permission Types
**File:** `apps/frontend/src/types/auth.ts` (add to existing)

```typescript
export enum Permission {
  // ... existing permissions ...
  RESOURCE_CREATE = 'resource:create',
  RESOURCE_READ = 'resource:read',
  RESOURCE_UPDATE = 'resource:update',
  RESOURCE_DELETE = 'resource:delete',
}
```

#### Task 4.5: Keyboard Shortcuts
**File:** `apps/frontend/src/pages/resources/ResourcesPage.tsx` (add to existing)

```typescript
// Add to ResourcesPage component
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger if in input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.querySelector<HTMLInputElement>('[placeholder*="Search"]')?.focus();
    }

    if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      navigate('/resources/new');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [navigate]);
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] Resource list displays with columns: Icon, Name, Type, Size, Tags, Created, Actions
- [ ] Sorting works for all specified criteria (Newest, Oldest, Name A-Z, Name Z-A, Largest, Smallest)
- [ ] Filtering by type dropdown and search with 300ms debounce
- [ ] Pagination at 20 items per page with URL state sync
- [ ] File upload with drag-and-drop, 50MB limit, auto type detection
- [ ] Content creation with Monaco editor and localStorage draft auto-save
- [ ] Detail view with type-specific preview (markdown, image, audio, JSON, CSV, PDF)
- [ ] Interpolation testing for prompt resources
- [ ] Edit metadata and content with unsaved changes warning
- [ ] Delete with confirmation dialog
- [ ] Copy resource with name/path customization
- [ ] Download triggers browser download

### Non-Functional Requirements
- [ ] Initial list load < 500ms
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Monaco Editor lazy loads
- [ ] Mobile responsive design
- [ ] Keyboard shortcuts work (/, n, Escape, Cmd+S)

---

## Dependencies & Prerequisites

### Required Packages
- `react-dropzone` - File upload drag-and-drop
- `react-markdown` - Markdown preview rendering

### Existing Dependencies (already installed)
- `@monaco-editor/react` - Code editor
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form handling
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `sonner` - Toast notifications

### Backend API (already complete)
- 10 endpoints at `/workscript/resources`
- File upload, content management, interpolation

---

## Risk Analysis & Mitigation

| Risk | Mitigation |
|------|------------|
| Monaco Editor performance on large files | Limit preview to first 1MB, show "Download full" option |
| File upload failures | Show progress, keep form state on error, retry logic |
| Concurrent edit conflicts | Last-write-wins for MVP, warn user on save if updated |
| localStorage draft conflicts | Key by user ID + feature, offer restore on page load |

---

## References

### Internal References
- Existing page patterns: `/apps/frontend/src/pages/workflows/WorkflowsPage.tsx`
- Data table component: `/apps/frontend/src/components/shared/DataTable.tsx`
- React Query hooks: `/apps/frontend/src/hooks/api/useWorkflows.ts`
- Monaco Editor: `/apps/frontend/src/components/workflows/WorkflowEditor.tsx`
- Backend schema: `/apps/api/src/plugins/workscript/schema/resources.schema.ts`
- Backend repository: `/apps/api/src/plugins/workscript/resources/ResourceRepository.ts`

### External References
- [TanStack Table v8 Documentation](https://tanstack.com/table/latest)
- [React Dropzone Documentation](https://react-dropzone.js.org/)
- [Monaco Editor React](https://github.com/suren-atoyan/monaco-react)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-05
**Status:** Ready for Implementation
