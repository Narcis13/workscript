/**
 * Resource Types for Workscript Resource Management
 *
 * TypeScript interfaces for resource CRUD operations, filtering,
 * and interpolation testing.
 *
 * @module types/resource.types
 */

/**
 * Resource types supported by the system
 */
export type ResourceType = 'prompt' | 'image' | 'audio' | 'document' | 'data';

/**
 * Author types for tracking resource origin
 */
export type AuthorType = 'user' | 'workflow' | 'automation' | 'system';

/**
 * Complete resource entity
 */
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

/**
 * Filter options for resource list queries
 */
export interface ResourceFilters {
  search?: string;
  type?: ResourceType;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'size';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Payload for creating a new resource
 */
export interface CreateResourcePayload {
  name: string;
  type: ResourceType;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  content?: string; // For text-based creation
  file?: File; // For file upload
}

/**
 * Payload for updating a resource
 */
export interface UpdateResourcePayload {
  name?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Result from interpolation testing
 */
export interface InterpolationResult {
  result: string;
  placeholders: {
    found: string[];
    replaced: string[];
    unresolved: string[];
  };
}

/**
 * Paginated response for resource list
 */
export interface ResourcesResponse {
  resources: Resource[];
  total: number;
}
