/**
 * Resources React Query Hooks
 *
 * Custom hooks for resource CRUD operations using TanStack Query.
 * Provides caching, optimistic updates, and error handling.
 *
 * @module hooks/api/useResources
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as resourcesApi from '@/services/api/resources.api';
import type {
  ResourceFilters,
  CreateResourcePayload,
  UpdateResourcePayload,
} from '@/types/resource.types';

/**
 * Query key factory for resources
 */
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filters?: ResourceFilters) => [...resourceKeys.lists(), filters] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  content: (id: string) => [...resourceKeys.detail(id), 'content'] as const,
};

/**
 * Fetch resources list with filters
 */
export function useResources(filters?: ResourceFilters) {
  return useQuery({
    queryKey: resourceKeys.list(filters),
    queryFn: () => resourcesApi.fetchResources(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single resource by ID
 */
export function useResource(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => resourcesApi.fetchResource(id),
    enabled: !!id,
  });
}

/**
 * Fetch resource content (for text-based resources)
 */
export function useResourceContent(id: string, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.content(id),
    queryFn: () => resourcesApi.fetchResourceContent(id),
    enabled: !!id && enabled,
  });
}

/**
 * Create a new resource
 */
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResourcePayload) => resourcesApi.createResource(data),
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      queryClient.setQueryData(resourceKeys.detail(resource.id), resource);
      toast.success('Resource created', {
        description: `"${resource.name}" has been created.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to create resource', {
        description: error?.response?.data?.message || 'An unexpected error occurred.',
      });
    },
  });
}

/**
 * Update resource metadata
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResourcePayload }) =>
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

/**
 * Update resource content
 */
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

/**
 * Delete a resource
 */
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

/**
 * Copy a resource
 */
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

/**
 * Test interpolation
 */
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
