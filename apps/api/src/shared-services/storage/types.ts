/**
 * Storage Service Types
 *
 * Type definitions for the sandboxed file management system.
 * Includes error codes, configuration constants, and data interfaces.
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Storage error codes for categorizing storage operation failures.
 */
export enum StorageErrorCode {
  /** Path attempts to access files outside the sandbox */
  SANDBOX_VIOLATION = 'SANDBOX_VIOLATION',
  /** Sandbox root directory does not exist */
  SANDBOX_NOT_FOUND = 'SANDBOX_NOT_FOUND',
  /** Requested file does not exist */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  /** Resource already exists at the specified path */
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',
  /** File type is not in the allowed list */
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  /** File exceeds maximum allowed size */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  /** Failed to write file to disk */
  WRITE_ERROR = 'WRITE_ERROR',
  /** Failed to read file from disk */
  READ_ERROR = 'READ_ERROR',
  /** Storage system is full */
  STORAGE_FULL = 'STORAGE_FULL',
  /** File system permission denied */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** Invalid resource type for the requested operation */
  INVALID_RESOURCE_TYPE = 'INVALID_RESOURCE_TYPE',
  /** Unexpected internal error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Maps storage error codes to appropriate HTTP status codes.
 */
export const ErrorCodeToHttpStatus: Record<StorageErrorCode, number> = {
  [StorageErrorCode.SANDBOX_VIOLATION]: 400,
  [StorageErrorCode.SANDBOX_NOT_FOUND]: 500,
  [StorageErrorCode.FILE_NOT_FOUND]: 404,
  [StorageErrorCode.RESOURCE_EXISTS]: 409,
  [StorageErrorCode.INVALID_FILE_TYPE]: 400,
  [StorageErrorCode.FILE_TOO_LARGE]: 400,
  [StorageErrorCode.WRITE_ERROR]: 500,
  [StorageErrorCode.READ_ERROR]: 500,
  [StorageErrorCode.STORAGE_FULL]: 507,
  [StorageErrorCode.PERMISSION_DENIED]: 403,
  [StorageErrorCode.INVALID_RESOURCE_TYPE]: 400,
  [StorageErrorCode.INTERNAL_ERROR]: 500,
};

// ============================================================================
// Storage Error Class
// ============================================================================

/**
 * Custom error class for storage operations.
 * Extends Error with code, details, and HTTP status code mapping.
 */
export class StorageError extends Error {
  /** Storage error code for categorization */
  public readonly code: StorageErrorCode;
  /** Additional details about the error */
  public readonly details: Record<string, unknown>;
  /** HTTP status code to return in API responses */
  public readonly statusCode: number;

  constructor(
    code: StorageErrorCode,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
    this.statusCode = ErrorCodeToHttpStatus[code];

    // Maintain proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }

  /**
   * Creates a JSON representation of the error suitable for API responses.
   * Does not expose internal paths or sensitive details.
   */
  toJSON(): { error: string; code: StorageErrorCode; details?: Record<string, unknown> } {
    // Filter out sensitive details like absolute paths
    const safeDetails = { ...this.details };
    delete safeDetails.absolutePath;
    delete safeDetails.sandboxRoot;

    return {
      error: this.message,
      code: this.code,
      ...(Object.keys(safeDetails).length > 0 && { details: safeDetails }),
    };
  }
}

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Maximum file size allowed for uploads (50MB).
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Allowed file extensions for uploads.
 */
export const ALLOWED_EXTENSIONS = [
  // Documents / Prompts
  '.md',
  '.txt',
  // Data files
  '.json',
  '.csv',
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  // Audio
  '.mp3',
  '.wav',
  // Documents
  '.pdf',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/**
 * Default sandbox root path (relative to project root).
 * Can be overridden via SANDBOX_ROOT environment variable.
 */
export const DEFAULT_SANDBOX_ROOT = 'apps/sandbox';

/**
 * Gets the sandbox root path from environment or default.
 */
export function getSandboxRoot(): string {
  return process.env.SANDBOX_ROOT || DEFAULT_SANDBOX_ROOT;
}

/**
 * Resource type categories for organizing files.
 */
export type ResourceType = 'prompt' | 'image' | 'audio' | 'document' | 'data';

/**
 * Resource type subdirectory mappings.
 */
export const RESOURCE_TYPE_DIRECTORIES: Record<ResourceType, string> = {
  prompt: 'prompts',
  image: 'media',
  audio: 'media',
  document: 'documents',
  data: 'data',
};

/**
 * Author types for tracking who created resources.
 */
export type AuthorType = 'user' | 'workflow' | 'automation' | 'system';

/**
 * Operation types for audit logging.
 */
export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'interpolate' | 'copy';

/**
 * Operation status for audit logging.
 */
export type OperationStatus = 'success' | 'failed';

// ============================================================================
// MIME Type Mappings
// ============================================================================

/**
 * Maps file extensions to MIME types.
 */
export const EXTENSION_TO_MIME_TYPE: Record<AllowedExtension, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

/**
 * Maps MIME types to resource types.
 */
export const MIME_TYPE_TO_RESOURCE_TYPE: Record<string, ResourceType> = {
  'text/markdown': 'prompt',
  'text/plain': 'document',
  'application/json': 'data',
  'text/csv': 'data',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'application/pdf': 'document',
};

/**
 * Gets the MIME type for a filename based on extension.
 * Returns 'application/octet-stream' for unknown extensions.
 */
export function getMimeType(filename: string): string {
  const ext = getExtension(filename);
  if (ext && isAllowedExtension(ext)) {
    return EXTENSION_TO_MIME_TYPE[ext];
  }
  return 'application/octet-stream';
}

/**
 * Gets the resource type for a given MIME type.
 * Returns 'data' as default for unknown MIME types.
 */
export function getResourceType(mimeType: string): ResourceType {
  return MIME_TYPE_TO_RESOURCE_TYPE[mimeType] || 'data';
}

/**
 * Gets the resource type for a filename based on extension.
 */
export function getResourceTypeFromFilename(filename: string): ResourceType {
  const mimeType = getMimeType(filename);
  return getResourceType(mimeType);
}

/**
 * Extracts the file extension from a filename (lowercase, with dot).
 */
export function getExtension(filename: string): string | null {
  const match = filename.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Checks if an extension is in the allowed list.
 */
export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return ALLOWED_EXTENSIONS.includes(ext as AllowedExtension);
}

/**
 * Validates a filename has an allowed extension.
 */
export function validateFileExtension(filename: string): { valid: boolean; extension: string | null } {
  const ext = getExtension(filename);
  return {
    valid: ext !== null && isAllowedExtension(ext),
    extension: ext,
  };
}

// ============================================================================
// Data Interfaces
// ============================================================================

/**
 * Parameters for creating a new resource from content.
 */
export interface CreateResourceParams {
  /** Display name for the resource */
  name: string;
  /** File content (string for text, Buffer for binary) */
  content: string | Buffer;
  /** Relative path within the sandbox (e.g., 'prompts/greeting.md') */
  path: string;
  /** Resource type (auto-detected from extension if not provided) */
  type?: ResourceType;
  /** Optional description */
  description?: string;
  /** Optional tags for filtering */
  tags?: string[];
  /** Whether the resource is public to all tenants */
  isPublic?: boolean;
  /** Tenant ID for multi-tenancy */
  tenantId?: string;
  /** Type of author (user, workflow, etc.) */
  authorType: AuthorType;
  /** ID of the author */
  authorId?: string;
}

/**
 * Parameters for updating resource metadata.
 */
export interface UpdateResourceParams {
  /** New display name */
  name?: string;
  /** New description */
  description?: string;
  /** New tags (replaces existing) */
  tags?: string[];
  /** Whether the resource is public */
  isPublic?: boolean;
}

/**
 * Parameters for updating resource content.
 */
export interface UpdateContentParams {
  /** New file content */
  content: string | Buffer;
}

/**
 * Metadata from file upload.
 */
export interface UploadMetadata {
  /** Original filename from upload */
  originalFilename: string;
  /** Display name (defaults to original filename) */
  name?: string;
  /** Target path within sandbox */
  path?: string;
  /** Optional description */
  description?: string;
  /** Optional tags */
  tags?: string[];
  /** Whether publicly accessible */
  isPublic?: boolean;
  /** Tenant ID */
  tenantId?: string;
  /** Author type */
  authorType: AuthorType;
  /** Author ID */
  authorId?: string;
}

/**
 * Filters for listing resources.
 */
export interface ResourceFilters {
  /** Filter by resource type */
  type?: ResourceType;
  /** Filter by author type */
  authorType?: AuthorType;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Search in name and description */
  search?: string;
  /** Filter by tenant ID */
  tenantId?: string;
  /** Include public resources */
  includePublic?: boolean;
  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'size';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Result from file creation/update operations.
 */
export interface FileOperationResult {
  /** Absolute path to the file */
  absolutePath: string;
  /** Relative path within sandbox */
  relativePath: string;
  /** File size in bytes */
  size: number;
  /** SHA-256 checksum of content */
  checksum: string;
  /** Detected or specified MIME type */
  mimeType: string;
  /** Resource type */
  resourceType: ResourceType;
}

/**
 * Result from content update operations.
 */
export interface ContentUpdateResult {
  /** Previous checksum before update */
  previousChecksum: string;
  /** New checksum after update */
  newChecksum: string;
  /** New file size */
  size: number;
}

/**
 * Resource content with metadata.
 */
export interface ResourceContent {
  /** File content */
  content: Buffer;
  /** MIME type */
  mimeType: string;
  /** File size */
  size: number;
  /** File checksum */
  checksum: string;
}

/**
 * Interpolation context for template processing.
 */
export interface InterpolationContext {
  /** State object with values to interpolate */
  state: Record<string, unknown>;
  /** Optional workflow ID for logging */
  workflowId?: string;
  /** Optional execution ID for logging */
  executionId?: string;
  /** Optional node ID for logging */
  nodeId?: string;
}

/**
 * Result from template interpolation.
 */
export interface InterpolationResult {
  /** Original content before interpolation */
  original: string;
  /** Interpolated content */
  interpolated: string;
  /** List of placeholders that were found */
  placeholdersFound: string[];
  /** List of placeholders that were replaced */
  placeholdersReplaced: string[];
  /** List of placeholders that couldn't be resolved */
  placeholdersUnresolved: string[];
}

/**
 * Parameters for copying a resource.
 */
export interface CopyResourceParams {
  /** Source resource path */
  sourcePath: string;
  /** Target path for the copy */
  targetPath: string;
  /** New name for the copy */
  newName?: string;
}

/**
 * Resource operation log entry for audit.
 */
export interface ResourceOperationLog {
  /** Resource ID */
  resourceId: string;
  /** Type of operation */
  operation: OperationType;
  /** Type of actor */
  actorType: AuthorType;
  /** Actor ID */
  actorId?: string;
  /** Associated workflow ID */
  workflowId?: string;
  /** Associated execution ID */
  executionId?: string;
  /** Associated node ID */
  nodeId?: string;
  /** Operation status */
  status: OperationStatus;
  /** Error message if failed */
  errorMessage?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Operation-specific details */
  details?: Record<string, unknown>;
  /** Previous checksum for updates */
  previousChecksum?: string;
  /** New checksum for creates/updates */
  newChecksum?: string;
}

/**
 * Content detection result.
 */
export interface ContentTypeDetection {
  /** Detected MIME type */
  mimeType: string;
  /** Corresponding resource type */
  resourceType: ResourceType;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** Detection method used */
  method: 'magic-bytes' | 'extension' | 'fallback';
}

/**
 * Content validation result.
 */
export interface ContentValidation {
  /** Whether content is valid for the expected type */
  valid: boolean;
  /** Actual detected type */
  actualType: string;
  /** Expected type */
  expectedType: string;
  /** Validation message */
  message?: string;
}

/**
 * Tenant usage statistics.
 */
export interface TenantUsageStats {
  /** Tenant ID */
  tenantId: string;
  /** Total storage used in bytes */
  totalBytes: number;
  /** Human-readable total storage */
  totalFormatted: string;
  /** Count by resource type */
  countByType: Record<ResourceType, number>;
  /** Size by resource type */
  sizeByType: Record<ResourceType, number>;
  /** Total resource count */
  totalCount: number;
}
