/**
 * Resources API Service
 *
 * API functions for resource CRUD operations, file upload,
 * content management, and interpolation testing.
 *
 * @module services/api/resources.api
 */

import { apiClient } from './client';
import type {
  Resource,
  ResourceFilters,
  CreateResourcePayload,
  UpdateResourcePayload,
  InterpolationResult,
  ResourcesResponse,
} from '@/types/resource.types';

const BASE_URL = '/workscript/resources';

/**
 * Fetch resources with optional filters
 */
export async function fetchResources(filters?: ResourceFilters): Promise<ResourcesResponse> {
  const response = await apiClient.get(BASE_URL, { params: filters });
  // Map API response fields to expected frontend interface
  const data = response.data;
  return {
    resources: data.items || data.resources || [],
    total: data.count ?? data.total ?? 0,
  };
}

/**
 * Fetch a single resource by ID
 */
export async function fetchResource(id: string): Promise<Resource> {
  const response = await apiClient.get(`${BASE_URL}/${id}`);
  if (response.data.resource) {
    return response.data.resource;
  }
  if (response.data.data) {
    return response.data.data;
  }
  return response.data as unknown as Resource;
}

/**
 * Create a new resource (text-based or file upload)
 */
export async function createResource(data: CreateResourcePayload): Promise<Resource> {
  if (data.file) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.description) formData.append('description', data.description);
    if (data.tags && data.tags.length > 0) formData.append('tags', data.tags.join(', '));
    if (data.isPublic !== undefined) formData.append('isPublic', String(data.isPublic));

    const response = await apiClient.post(`${BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.resource) {
      return response.data.resource;
    }
    if (response.data.data) {
      return response.data.data;
    }
    return response.data as unknown as Resource;
  }

  // Content-based resources go to /create endpoint
  const response = await apiClient.post(`${BASE_URL}/create`, {
    name: data.name,
    content: data.content,
    path: `${data.name.toLowerCase().replace(/\s+/g, '-')}.${data.type === 'prompt' ? 'md' : data.type === 'data' ? 'json' : 'txt'}`,
    type: data.type,
    description: data.description,
    tags: data.tags,
    isPublic: data.isPublic,
  });
  if (response.data.resource) {
    return response.data.resource;
  }
  if (response.data.data) {
    return response.data.data;
  }
  return response.data as unknown as Resource;
}

/**
 * Update resource metadata
 */
export async function updateResource(id: string, data: UpdateResourcePayload): Promise<Resource> {
  const response = await apiClient.put(`${BASE_URL}/${id}`, data);
  if (response.data.resource) {
    return response.data.resource;
  }
  if (response.data.data) {
    return response.data.data;
  }
  return response.data as unknown as Resource;
}

/**
 * Update resource content (text-based resources only)
 */
export async function updateResourceContent(id: string, content: string): Promise<Resource> {
  const response = await apiClient.put(`${BASE_URL}/${id}/content`, { content });
  if (response.data.resource) {
    return response.data.resource;
  }
  if (response.data.data) {
    return response.data.data;
  }
  return response.data as unknown as Resource;
}

/**
 * Delete a resource
 */
export async function deleteResource(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}`);
}

/**
 * Copy a resource
 */
export async function copyResource(id: string, name: string, path: string): Promise<Resource> {
  const response = await apiClient.post(`${BASE_URL}/${id}/copy`, { name, path });
  if (response.data.resource) {
    return response.data.resource;
  }
  if (response.data.data) {
    return response.data.data;
  }
  return response.data as unknown as Resource;
}

/**
 * Download resource content as blob
 */
export async function downloadResource(id: string): Promise<Blob> {
  const response = await apiClient.get(`${BASE_URL}/${id}/content`, { responseType: 'blob' });
  return response.data;
}

/**
 * Test interpolation with provided state
 */
export async function interpolateResource(
  id: string,
  state: Record<string, unknown>
): Promise<InterpolationResult> {
  const response = await apiClient.post(`${BASE_URL}/${id}/interpolate`, { state });
  // Map backend "content" field to frontend "result" field
  return {
    result: response.data.content || response.data.result || '',
    placeholders: response.data.placeholders,
  };
}

/**
 * Fetch resource content as text
 */
export async function fetchResourceContent(id: string): Promise<string> {
  const response = await apiClient.get(`${BASE_URL}/${id}/content`);
  if (response.data.content) {
    return response.data.content;
  }
  return response.data as unknown as string;
}
