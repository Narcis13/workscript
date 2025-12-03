/**
 * Storage Service Module
 *
 * Provides sandboxed file management for the Workscript platform.
 *
 * Main components:
 * - StorageService: Main facade for all file operations
 * - SandboxManager: Path validation and security enforcement
 * - ContentProcessor: Content processing, interpolation, and checksums
 *
 * @example
 * ```typescript
 * import { getStorageService, StorageError, StorageErrorCode } from './shared-services/storage';
 *
 * // Get the singleton instance
 * const storage = getStorageService();
 *
 * // Initialize on startup
 * await storage.initialize();
 *
 * // Create a resource
 * try {
 *   const result = await storage.createResource({
 *     name: 'greeting',
 *     content: 'Hello {{$.name}}!',
 *     path: 'resources/tenant-123/prompts/greeting.md',
 *     authorType: 'user',
 *     authorId: 'user-123'
 *   });
 * } catch (error) {
 *   if (error instanceof StorageError) {
 *     console.error(`Storage error: ${error.code} - ${error.message}`);
 *   }
 * }
 * ```
 *
 * @module storage
 */

// Export main service classes
export { StorageService, default as StorageServiceClass } from './StorageService';
export { SandboxManager, default as SandboxManagerClass } from './SandboxManager';
export { ContentProcessor, default as ContentProcessorClass } from './ContentProcessor';

// Export all types
export {
  // Error types
  StorageError,
  StorageErrorCode,
  ErrorCodeToHttpStatus,

  // Configuration constants
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  DEFAULT_SANDBOX_ROOT,
  getSandboxRoot,
  RESOURCE_TYPE_DIRECTORIES,

  // Type enums
  type ResourceType,
  type AuthorType,
  type OperationType,
  type OperationStatus,
  type AllowedExtension,

  // MIME type mappings
  EXTENSION_TO_MIME_TYPE,
  MIME_TYPE_TO_RESOURCE_TYPE,
  getMimeType,
  getResourceType,
  getResourceTypeFromFilename,
  getExtension,
  isAllowedExtension,
  validateFileExtension,

  // Data interfaces
  type CreateResourceParams,
  type UpdateResourceParams,
  type UpdateContentParams,
  type UploadMetadata,
  type ResourceFilters,
  type FileOperationResult,
  type ContentUpdateResult,
  type ResourceContent,
  type InterpolationContext,
  type InterpolationResult,
  type CopyResourceParams,
  type ResourceOperationLog,
  type ContentTypeDetection,
  type ContentValidation,
  type TenantUsageStats,
} from './types';

/**
 * Gets the singleton instance of StorageService.
 *
 * This is the recommended way to access the StorageService throughout the application.
 * The service is lazily instantiated on first call.
 *
 * @returns The StorageService singleton instance
 *
 * @example
 * ```typescript
 * import { getStorageService } from './shared-services/storage';
 *
 * const storage = getStorageService();
 * await storage.initialize();
 * ```
 */
export function getStorageService(): import('./StorageService').StorageService {
  const { StorageService } = require('./StorageService');
  return StorageService.getInstance();
}

/**
 * Gets the singleton instance of SandboxManager.
 *
 * Useful for direct path validation operations without going through StorageService.
 *
 * @returns The SandboxManager singleton instance
 *
 * @example
 * ```typescript
 * import { getSandboxManager } from './shared-services/storage';
 *
 * const sandbox = getSandboxManager();
 * const absolutePath = sandbox.validatePath('resources/file.md');
 * ```
 */
export function getSandboxManager(): import('./SandboxManager').SandboxManager {
  const { SandboxManager } = require('./SandboxManager');
  return SandboxManager.getInstance();
}

/**
 * Gets the singleton instance of ContentProcessor.
 *
 * Useful for direct content processing operations without going through StorageService.
 *
 * @returns The ContentProcessor singleton instance
 *
 * @example
 * ```typescript
 * import { getContentProcessor } from './shared-services/storage';
 *
 * const processor = getContentProcessor();
 * const checksum = processor.computeChecksum(content);
 * ```
 */
export function getContentProcessor(): import('./ContentProcessor').ContentProcessor {
  const { ContentProcessor } = require('./ContentProcessor');
  return ContentProcessor.getInstance();
}

/**
 * Initializes the storage service and sandbox directories.
 *
 * Convenience function that gets the StorageService instance and initializes it.
 * This should be called during application startup.
 *
 * @throws StorageError if initialization fails
 *
 * @example
 * ```typescript
 * import { initializeStorage } from './shared-services/storage';
 *
 * // In your app initialization
 * await initializeStorage();
 * ```
 */
export async function initializeStorage(): Promise<void> {
  const storage = getStorageService();
  await storage.initialize();
}

/**
 * Checks if the storage service is initialized and ready.
 *
 * @returns true if the storage service has been initialized
 *
 * @example
 * ```typescript
 * import { isStorageReady } from './shared-services/storage';
 *
 * if (!isStorageReady()) {
 *   await initializeStorage();
 * }
 * ```
 */
export function isStorageReady(): boolean {
  const storage = getStorageService();
  return storage.isInitialized();
}
