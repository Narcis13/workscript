/**
 * StorageService
 *
 * Main facade for all sandboxed file operations. Provides a unified interface
 * for creating, reading, updating, and deleting resources within the sandbox.
 *
 * This service integrates:
 * - SandboxManager for path validation and security
 * - ContentProcessor for content processing and checksums
 *
 * @example
 * ```typescript
 * const storage = StorageService.getInstance();
 *
 * // Create a resource
 * const result = await storage.createResource({
 *   name: 'greeting',
 *   content: 'Hello {{$.name}}!',
 *   path: 'resources/tenant-123/prompts/greeting.md',
 *   authorType: 'user',
 *   authorId: 'user-123'
 * });
 *
 * // Read a resource
 * const content = await storage.readResource('resources/tenant-123/prompts/greeting.md');
 *
 * // Interpolate a template
 * const interpolated = await storage.interpolateTemplate(
 *   'resources/tenant-123/prompts/greeting.md',
 *   { name: 'Alice' }
 * );
 * ```
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SandboxManager } from './SandboxManager';
import { ContentProcessor } from './ContentProcessor';
import {
  StorageError,
  StorageErrorCode,
  type CreateResourceParams,
  type FileOperationResult,
  type ResourceContent,
  type ContentUpdateResult,
  type InterpolationResult,
  type InterpolationContext,
  type CopyResourceParams,
  type UploadMetadata,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  getMimeType,
  getResourceType,
  getResourceTypeFromFilename,
  validateFileExtension,
  type ResourceType,
} from './types';

/**
 * Logger interface for storage operations.
 */
interface StorageLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console-based logger.
 */
const defaultLogger: StorageLogger = {
  info: (message, context) => console.info(`[STORAGE] ${message}`, context || ''),
  warn: (message, context) => console.warn(`[STORAGE] ${message}`, context || ''),
  error: (message, context) => console.error(`[STORAGE] ${message}`, context || ''),
};

/**
 * StorageService - Singleton class for sandboxed file operations.
 *
 * Provides a unified interface for all file operations within the sandbox,
 * with built-in security validation and content processing.
 */
export class StorageService {
  private static instance: StorageService | null = null;
  private readonly sandboxManager: SandboxManager;
  private readonly contentProcessor: ContentProcessor;
  private readonly logger: StorageLogger;
  private initialized: boolean = false;

  /**
   * Private constructor - use getInstance() instead.
   *
   * @param sandboxManager - SandboxManager instance for path validation
   * @param contentProcessor - ContentProcessor instance for content processing
   * @param logger - Optional logger for operations
   */
  private constructor(
    sandboxManager?: SandboxManager,
    contentProcessor?: ContentProcessor,
    logger?: StorageLogger
  ) {
    this.sandboxManager = sandboxManager || SandboxManager.getInstance();
    this.contentProcessor = contentProcessor || ContentProcessor.getInstance();
    this.logger = logger || defaultLogger;
  }

  /**
   * Gets the singleton instance of StorageService.
   *
   * @returns The StorageService singleton instance
   */
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Resets the singleton instance (for testing purposes only).
   * @internal
   */
  public static resetInstance(): void {
    StorageService.instance = null;
  }

  /**
   * Initializes the storage service and sandbox directories.
   * This method is idempotent - safe to call multiple times.
   *
   * @throws StorageError if initialization fails
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing StorageService');

    try {
      await this.sandboxManager.initializeSandbox();
      this.initialized = true;
      this.logger.info('StorageService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StorageService', { error });
      throw error;
    }
  }

  /**
   * Checks if the storage service is initialized and ready.
   *
   * @returns true if the service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Performs a health check on the storage service.
   *
   * Verifies that:
   * 1. The service is initialized
   * 2. The sandbox directory exists and is accessible
   *
   * @returns true if the service is healthy, false otherwise
   */
  public async isHealthy(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      return await this.sandboxManager.checkSandboxExists();
    } catch {
      return false;
    }
  }

  /**
   * Gets the SandboxManager instance.
   *
   * @returns The SandboxManager instance
   */
  public getSandboxManager(): SandboxManager {
    return this.sandboxManager;
  }

  /**
   * Gets the ContentProcessor instance.
   *
   * @returns The ContentProcessor instance
   */
  public getContentProcessor(): ContentProcessor {
    return this.contentProcessor;
  }

  // ===========================================================================
  // Resource Creation
  // ===========================================================================

  /**
   * Creates a new resource file in the sandbox.
   *
   * This method:
   * 1. Validates the path is within the sandbox
   * 2. Checks if file already exists (throws RESOURCE_EXISTS if so)
   * 3. Creates parent directories if needed
   * 4. Writes content to file
   * 5. Computes checksum and detects MIME type
   *
   * @param params - Resource creation parameters
   * @returns FileOperationResult with file metadata
   * @throws StorageError with RESOURCE_EXISTS if file already exists
   * @throws StorageError with SANDBOX_VIOLATION if path is invalid
   * @throws StorageError with WRITE_ERROR if write fails
   *
   * @example
   * ```typescript
   * const result = await storage.createResource({
   *   name: 'greeting',
   *   content: 'Hello {{$.name}}!',
   *   path: 'resources/tenant-123/prompts/greeting.md',
   *   authorType: 'user',
   *   authorId: 'user-123'
   * });
   * ```
   */
  public async createResource(params: CreateResourceParams): Promise<FileOperationResult> {
    const { name, content, path: relativePath, type } = params;

    return this.wrapOperation('createResource', async () => {
      // Validate path
      const absolutePath = this.sandboxManager.validatePath(relativePath);

      // Check if file already exists
      const exists = await this.sandboxManager.fileExists(relativePath);
      if (exists) {
        throw new StorageError(
          StorageErrorCode.RESOURCE_EXISTS,
          `Resource already exists at path: ${relativePath}`,
          { path: relativePath }
        );
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(relativePath);
      await this.sandboxManager.ensureDirectory(parentDir);

      // Convert content to Buffer if string
      const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

      // Write file
      try {
        await fs.writeFile(absolutePath, contentBuffer);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'write', relativePath);
      }

      // Compute checksum
      const checksum = this.contentProcessor.computeChecksum(contentBuffer);

      // Detect MIME type
      const mimeType = getMimeType(relativePath);
      const resourceType = type || getResourceTypeFromFilename(relativePath);

      this.logger.info('Resource created', {
        name,
        path: relativePath,
        size: contentBuffer.length,
        mimeType,
        resourceType,
      });

      return {
        absolutePath,
        relativePath,
        size: contentBuffer.length,
        checksum,
        mimeType,
        resourceType,
      };
    });
  }

  // ===========================================================================
  // Resource Reading
  // ===========================================================================

  /**
   * Reads a resource file from the sandbox.
   *
   * @param relativePath - Relative path to the resource
   * @returns ResourceContent with file content and metadata
   * @throws StorageError with FILE_NOT_FOUND if file doesn't exist
   * @throws StorageError with SANDBOX_VIOLATION if path is invalid
   * @throws StorageError with READ_ERROR if read fails
   *
   * @example
   * ```typescript
   * const resource = await storage.readResource('resources/tenant-123/prompts/greeting.md');
   * console.log(resource.content.toString('utf-8'));
   * ```
   */
  public async readResource(relativePath: string): Promise<ResourceContent> {
    return this.wrapOperation('readResource', async () => {
      // Validate path
      const absolutePath = this.sandboxManager.validatePath(relativePath);

      // Check if file exists
      const exists = await this.sandboxManager.fileExists(relativePath);
      if (!exists) {
        throw new StorageError(
          StorageErrorCode.FILE_NOT_FOUND,
          `Resource not found at path: ${relativePath}`,
          { path: relativePath }
        );
      }

      // Read file
      let content: Buffer;
      try {
        content = await fs.readFile(absolutePath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'read', relativePath);
      }

      // Get metadata
      const mimeType = getMimeType(relativePath);
      const checksum = this.contentProcessor.computeChecksum(content);

      return {
        content,
        mimeType,
        size: content.length,
        checksum,
      };
    });
  }

  /**
   * Reads a resource file and returns its content as a string.
   * Only use for text-based resources.
   *
   * @param relativePath - Relative path to the resource
   * @param encoding - Text encoding (default: 'utf-8')
   * @returns The file content as a string
   * @throws StorageError if file doesn't exist or read fails
   */
  public async readResourceAsText(relativePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const resource = await this.readResource(relativePath);
    return resource.content.toString(encoding);
  }

  // ===========================================================================
  // Resource Update
  // ===========================================================================

  /**
   * Updates the content of an existing resource.
   *
   * This method:
   * 1. Reads the existing content for checksum comparison
   * 2. Writes the new content
   * 3. Computes new checksum
   *
   * @param relativePath - Relative path to the resource
   * @param newContent - New content (string or Buffer)
   * @returns ContentUpdateResult with checksums and size
   * @throws StorageError with FILE_NOT_FOUND if file doesn't exist
   * @throws StorageError with SANDBOX_VIOLATION if path is invalid
   * @throws StorageError with WRITE_ERROR if write fails
   *
   * @example
   * ```typescript
   * const result = await storage.updateResourceContent(
   *   'resources/tenant-123/prompts/greeting.md',
   *   'Hello {{$.name}}, welcome back!'
   * );
   * console.log('Previous checksum:', result.previousChecksum);
   * console.log('New checksum:', result.newChecksum);
   * ```
   */
  public async updateResourceContent(
    relativePath: string,
    newContent: string | Buffer
  ): Promise<ContentUpdateResult> {
    return this.wrapOperation('updateResourceContent', async () => {
      // Validate path
      const absolutePath = this.sandboxManager.validatePath(relativePath);

      // Check if file exists
      const exists = await this.sandboxManager.fileExists(relativePath);
      if (!exists) {
        throw new StorageError(
          StorageErrorCode.FILE_NOT_FOUND,
          `Resource not found at path: ${relativePath}`,
          { path: relativePath }
        );
      }

      // Read existing content for previous checksum
      let previousContent: Buffer;
      try {
        previousContent = await fs.readFile(absolutePath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'read', relativePath);
      }

      const previousChecksum = this.contentProcessor.computeChecksum(previousContent);

      // Convert new content to Buffer if string
      const contentBuffer = typeof newContent === 'string' ? Buffer.from(newContent, 'utf-8') : newContent;

      // Write new content
      try {
        await fs.writeFile(absolutePath, contentBuffer);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'write', relativePath);
      }

      const newChecksum = this.contentProcessor.computeChecksum(contentBuffer);

      this.logger.info('Resource content updated', {
        path: relativePath,
        previousSize: previousContent.length,
        newSize: contentBuffer.length,
        checksumChanged: previousChecksum !== newChecksum,
      });

      return {
        previousChecksum,
        newChecksum,
        size: contentBuffer.length,
      };
    });
  }

  // ===========================================================================
  // Resource Deletion
  // ===========================================================================

  /**
   * Deletes a resource file from the sandbox (hard delete).
   *
   * Note: This is a hard delete that removes the actual file.
   * Soft delete is handled at the database level.
   *
   * @param relativePath - Relative path to the resource
   * @returns true if deletion was successful
   * @throws StorageError with FILE_NOT_FOUND if file doesn't exist
   * @throws StorageError with SANDBOX_VIOLATION if path is invalid
   *
   * @example
   * ```typescript
   * const success = await storage.deleteResourceFile('resources/tenant-123/prompts/greeting.md');
   * ```
   */
  public async deleteResourceFile(relativePath: string): Promise<boolean> {
    return this.wrapOperation('deleteResourceFile', async () => {
      // Validate path
      const absolutePath = this.sandboxManager.validatePath(relativePath);

      // Check if file exists
      const exists = await this.sandboxManager.fileExists(relativePath);
      if (!exists) {
        throw new StorageError(
          StorageErrorCode.FILE_NOT_FOUND,
          `Resource not found at path: ${relativePath}`,
          { path: relativePath }
        );
      }

      // Delete file
      try {
        await fs.unlink(absolutePath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'delete', relativePath);
      }

      this.logger.info('Resource file deleted', { path: relativePath });
      return true;
    });
  }

  // ===========================================================================
  // File Upload
  // ===========================================================================

  /**
   * Uploads a file with validation and processing.
   *
   * This method:
   * 1. Validates file size against MAX_FILE_SIZE
   * 2. Validates file extension against ALLOWED_EXTENSIONS
   * 3. Detects MIME type
   * 4. Writes to tmp/ first, then moves to final location
   *
   * @param file - The file to upload (Bun/Web File object)
   * @param metadata - Upload metadata
   * @returns FileOperationResult with file metadata
   * @throws StorageError with FILE_TOO_LARGE if file exceeds size limit
   * @throws StorageError with INVALID_FILE_TYPE if extension not allowed
   *
   * @example
   * ```typescript
   * const result = await storage.uploadFile(file, {
   *   originalFilename: 'photo.png',
   *   tenantId: 'tenant-123',
   *   authorType: 'user',
   *   authorId: 'user-123'
   * });
   * ```
   */
  public async uploadFile(file: File, metadata: UploadMetadata): Promise<FileOperationResult> {
    return this.wrapOperation('uploadFile', async () => {
      const { originalFilename, path: targetPath, tenantId, authorType } = metadata;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new StorageError(
          StorageErrorCode.FILE_TOO_LARGE,
          `File size ${file.size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
          { fileSize: file.size, maxSize: MAX_FILE_SIZE }
        );
      }

      // Validate file extension
      const { valid, extension } = validateFileExtension(originalFilename);
      if (!valid) {
        throw new StorageError(
          StorageErrorCode.INVALID_FILE_TYPE,
          `File extension ${extension || 'unknown'} is not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
          { extension, allowedExtensions: ALLOWED_EXTENSIONS }
        );
      }

      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const contentBuffer = Buffer.from(arrayBuffer);

      // Detect content type
      const detection = this.contentProcessor.detectContentType(contentBuffer, originalFilename);

      // Generate target path if not provided
      const finalPath = targetPath || this.generateUploadPath(tenantId, detection.resourceType, originalFilename);

      // Write to tmp first
      const tmpPath = `tmp/${Date.now()}-${originalFilename}`;
      const tmpAbsolutePath = this.sandboxManager.validatePath(tmpPath);

      // Ensure tmp directory exists
      await this.sandboxManager.ensureDirectory('tmp');

      try {
        await fs.writeFile(tmpAbsolutePath, contentBuffer);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'write', tmpPath);
      }

      // Validate content
      const validation = this.contentProcessor.validateContent(
        contentBuffer,
        detection.mimeType,
        originalFilename
      );

      if (!validation.valid) {
        // Clean up tmp file
        await fs.unlink(tmpAbsolutePath).catch(() => {});
        throw new StorageError(
          StorageErrorCode.INVALID_FILE_TYPE,
          validation.message || 'Content validation failed',
          { actualType: validation.actualType, expectedType: validation.expectedType }
        );
      }

      // Check if target already exists
      const exists = await this.sandboxManager.fileExists(finalPath);
      if (exists) {
        // Clean up tmp file
        await fs.unlink(tmpAbsolutePath).catch(() => {});
        throw new StorageError(
          StorageErrorCode.RESOURCE_EXISTS,
          `Resource already exists at path: ${finalPath}`,
          { path: finalPath }
        );
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(finalPath);
      await this.sandboxManager.ensureDirectory(parentDir);

      // Move from tmp to final location
      const finalAbsolutePath = this.sandboxManager.validatePath(finalPath);
      try {
        await fs.rename(tmpAbsolutePath, finalAbsolutePath);
      } catch (error) {
        // If rename fails (e.g., cross-device), copy and delete
        try {
          await fs.copyFile(tmpAbsolutePath, finalAbsolutePath);
          await fs.unlink(tmpAbsolutePath);
        } catch (copyError) {
          const err = copyError as NodeJS.ErrnoException;
          await fs.unlink(tmpAbsolutePath).catch(() => {});
          throw this.mapFileSystemError(err, 'write', finalPath);
        }
      }

      // Compute checksum
      const checksum = this.contentProcessor.computeChecksum(contentBuffer);

      this.logger.info('File uploaded', {
        originalFilename,
        finalPath,
        size: contentBuffer.length,
        mimeType: detection.mimeType,
        resourceType: detection.resourceType,
      });

      return {
        absolutePath: finalAbsolutePath,
        relativePath: finalPath,
        size: contentBuffer.length,
        checksum,
        mimeType: detection.mimeType,
        resourceType: detection.resourceType,
      };
    });
  }

  // ===========================================================================
  // Template Interpolation
  // ===========================================================================

  /**
   * Interpolates template placeholders with state values.
   *
   * Reads a template file and replaces {{$.path}} placeholders with
   * values from the provided state object.
   *
   * @param relativePath - Relative path to the template file
   * @param context - Interpolation context with state and optional workflow info
   * @returns InterpolationResult with original and interpolated content
   * @throws StorageError with FILE_NOT_FOUND if file doesn't exist
   * @throws StorageError with INVALID_RESOURCE_TYPE if file is not a text file
   *
   * @example
   * ```typescript
   * const result = await storage.interpolateTemplate(
   *   'resources/tenant-123/prompts/greeting.md',
   *   { state: { name: 'Alice', count: 5 } }
   * );
   * console.log(result.interpolated);
   * // 'Hello Alice, you have 5 new messages!'
   * ```
   */
  public async interpolateTemplate(
    relativePath: string,
    context: InterpolationContext
  ): Promise<InterpolationResult> {
    return this.wrapOperation('interpolateTemplate', async () => {
      // Read the file
      const resource = await this.readResource(relativePath);

      // Check if it's a text file
      if (!this.contentProcessor.isTextContent(resource.mimeType)) {
        throw new StorageError(
          StorageErrorCode.INVALID_RESOURCE_TYPE,
          `Cannot interpolate non-text resource. Resource type: ${resource.mimeType}`,
          { path: relativePath, mimeType: resource.mimeType }
        );
      }

      // Convert to string and interpolate
      const content = resource.content.toString('utf-8');
      const result = this.contentProcessor.interpolate(content, context.state);

      this.logger.info('Template interpolated', {
        path: relativePath,
        placeholdersFound: result.placeholdersFound.length,
        placeholdersReplaced: result.placeholdersReplaced.length,
        placeholdersUnresolved: result.placeholdersUnresolved.length,
        workflowId: context.workflowId,
        executionId: context.executionId,
      });

      return result;
    });
  }

  // ===========================================================================
  // Resource Copy
  // ===========================================================================

  /**
   * Copies a resource to a new location.
   *
   * @param params - Copy parameters with source and target paths
   * @returns FileOperationResult for the new copy
   * @throws StorageError with FILE_NOT_FOUND if source doesn't exist
   * @throws StorageError with RESOURCE_EXISTS if target already exists
   *
   * @example
   * ```typescript
   * const result = await storage.copyResource({
   *   sourcePath: 'resources/tenant-123/prompts/greeting.md',
   *   targetPath: 'resources/tenant-123/prompts/greeting-v2.md',
   *   newName: 'Greeting v2'
   * });
   * ```
   */
  public async copyResource(params: CopyResourceParams): Promise<FileOperationResult> {
    const { sourcePath, targetPath } = params;

    return this.wrapOperation('copyResource', async () => {
      // Validate source path
      const sourceAbsolutePath = this.sandboxManager.validatePath(sourcePath);

      // Check source exists
      const sourceExists = await this.sandboxManager.fileExists(sourcePath);
      if (!sourceExists) {
        throw new StorageError(
          StorageErrorCode.FILE_NOT_FOUND,
          `Source resource not found at path: ${sourcePath}`,
          { path: sourcePath }
        );
      }

      // Validate target path
      const targetAbsolutePath = this.sandboxManager.validatePath(targetPath);

      // Check target doesn't exist
      const targetExists = await this.sandboxManager.fileExists(targetPath);
      if (targetExists) {
        throw new StorageError(
          StorageErrorCode.RESOURCE_EXISTS,
          `Target path already exists: ${targetPath}`,
          { path: targetPath }
        );
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(targetPath);
      await this.sandboxManager.ensureDirectory(parentDir);

      // Copy file
      try {
        await fs.copyFile(sourceAbsolutePath, targetAbsolutePath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw this.mapFileSystemError(err, 'copy', targetPath);
      }

      // Read the copied file for metadata
      const content = await fs.readFile(targetAbsolutePath);
      const checksum = this.contentProcessor.computeChecksum(content);
      const mimeType = getMimeType(targetPath);
      const resourceType = getResourceTypeFromFilename(targetPath);

      this.logger.info('Resource copied', {
        sourcePath,
        targetPath,
        size: content.length,
      });

      return {
        absolutePath: targetAbsolutePath,
        relativePath: targetPath,
        size: content.length,
        checksum,
        mimeType,
        resourceType,
      };
    });
  }

  // ===========================================================================
  // Tenant Directory Management
  // ===========================================================================

  /**
   * Ensures a tenant-specific directory structure exists.
   *
   * Creates:
   * - resources/{tenantId}/
   * - resources/{tenantId}/prompts/
   * - resources/{tenantId}/media/
   * - resources/{tenantId}/documents/
   * - resources/{tenantId}/data/
   *
   * @param tenantId - The tenant ID
   * @returns The relative path to the tenant's resource directory
   *
   * @example
   * ```typescript
   * const tenantDir = await storage.ensureTenantDirectory('tenant-123');
   * // Returns: 'resources/tenant-123'
   * ```
   */
  public async ensureTenantDirectory(tenantId: string): Promise<string> {
    await this.sandboxManager.ensureTenantDirectory(tenantId);
    return `resources/${tenantId}`;
  }

  /**
   * Gets the path for storing a specific resource type for a tenant.
   *
   * @param tenantId - The tenant ID
   * @param resourceType - The type of resource
   * @returns The relative path for storing that resource type
   *
   * @example
   * ```typescript
   * const promptsDir = storage.getTenantTypePath('tenant-123', 'prompt');
   * // Returns: 'resources/tenant-123/prompts'
   * ```
   */
  public getTenantTypePath(tenantId: string, resourceType: ResourceType): string {
    return this.sandboxManager.getTenantTypePath(tenantId, resourceType);
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Checks if a file exists at the given path.
   *
   * @param relativePath - Relative path to check
   * @returns true if file exists, false otherwise
   */
  public async fileExists(relativePath: string): Promise<boolean> {
    return this.sandboxManager.fileExists(relativePath);
  }

  /**
   * Gets file stats for a resource.
   *
   * @param relativePath - Relative path to the resource
   * @returns File stats including size and timestamps
   * @throws StorageError with FILE_NOT_FOUND if file doesn't exist
   */
  public async getFileStats(relativePath: string): Promise<{ size: number; mtime: Date; ctime: Date }> {
    const absolutePath = this.sandboxManager.validatePath(relativePath);

    try {
      const stats = await fs.stat(absolutePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new StorageError(
          StorageErrorCode.FILE_NOT_FOUND,
          `Resource not found at path: ${relativePath}`,
          { path: relativePath }
        );
      }
      throw this.mapFileSystemError(err, 'stat', relativePath);
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Wraps an operation with error handling and logging.
   *
   * @param operationName - Name of the operation for logging
   * @param operation - The operation to execute
   * @returns The operation result
   * @internal
   */
  private async wrapOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        this.logger.warn(`Slow operation: ${operationName}`, { durationMs: duration });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof StorageError) {
        this.logger.error(`Operation failed: ${operationName}`, {
          code: error.code,
          message: error.message,
          durationMs: duration,
        });
        throw error;
      }

      // Wrap unexpected errors
      const err = error as Error;
      this.logger.error(`Unexpected error in ${operationName}`, {
        message: err.message,
        durationMs: duration,
      });

      throw new StorageError(
        StorageErrorCode.INTERNAL_ERROR,
        `An unexpected error occurred: ${err.message}`,
        { originalError: err.message }
      );
    }
  }

  /**
   * Maps file system errors to StorageError.
   *
   * @param error - The file system error
   * @param operation - The operation that failed
   * @param path - The path involved
   * @returns A StorageError with appropriate code
   * @internal
   */
  private mapFileSystemError(
    error: NodeJS.ErrnoException,
    operation: string,
    relativePath: string
  ): StorageError {
    switch (error.code) {
      case 'ENOENT':
        return new StorageError(
          StorageErrorCode.FILE_NOT_FOUND,
          `File not found: ${relativePath}`,
          { path: relativePath, operation }
        );

      case 'EEXIST':
        return new StorageError(
          StorageErrorCode.RESOURCE_EXISTS,
          `Resource already exists: ${relativePath}`,
          { path: relativePath, operation }
        );

      case 'ENOSPC':
        return new StorageError(
          StorageErrorCode.STORAGE_FULL,
          'Storage is full',
          { path: relativePath, operation }
        );

      case 'EACCES':
      case 'EPERM':
        return new StorageError(
          StorageErrorCode.PERMISSION_DENIED,
          `Permission denied: ${operation} on ${relativePath}`,
          { path: relativePath, operation }
        );

      default:
        if (operation === 'read') {
          return new StorageError(
            StorageErrorCode.READ_ERROR,
            `Failed to read file: ${error.message}`,
            { path: relativePath, errorCode: error.code }
          );
        }

        return new StorageError(
          StorageErrorCode.WRITE_ERROR,
          `Failed to ${operation} file: ${error.message}`,
          { path: relativePath, errorCode: error.code }
        );
    }
  }

  /**
   * Generates an upload path based on tenant and resource type.
   *
   * @param tenantId - The tenant ID (optional)
   * @param resourceType - The type of resource
   * @param filename - The original filename
   * @returns A generated path within the tenant's directory
   * @internal
   */
  private generateUploadPath(
    tenantId: string | undefined,
    resourceType: ResourceType,
    filename: string
  ): string {
    const tenant = tenantId || 'shared';
    const typePath = this.sandboxManager.getTenantTypePath(tenant, resourceType);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const uniqueName = `${baseName}-${timestamp}${ext}`;

    return path.join(typePath, uniqueName);
  }
}

export default StorageService;
