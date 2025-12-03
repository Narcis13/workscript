/**
 * SandboxManager
 *
 * Provides path validation and security enforcement for the sandboxed file system.
 * All file operations must go through the SandboxManager to ensure paths are
 * within the sandbox boundaries and prevent directory traversal attacks.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageError, StorageErrorCode, getSandboxRoot, RESOURCE_TYPE_DIRECTORIES, type ResourceType } from './types';

/**
 * Logger interface for security event logging.
 */
interface SecurityLogger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console-based security logger.
 */
const defaultLogger: SecurityLogger = {
  warn: (message, context) => console.warn(`[SECURITY] ${message}`, context || ''),
  error: (message, context) => console.error(`[SECURITY] ${message}`, context || ''),
  info: (message, context) => console.info(`[STORAGE] ${message}`, context || ''),
};

/**
 * SandboxManager - Singleton class for managing sandboxed file system access.
 *
 * This class is responsible for:
 * - Validating all file paths are within the sandbox
 * - Preventing directory traversal attacks
 * - Initializing sandbox directory structure
 * - Providing path resolution utilities
 *
 * @example
 * ```typescript
 * const sandbox = SandboxManager.getInstance();
 *
 * // Validate a path
 * const absolutePath = sandbox.validatePath('prompts/greeting.md');
 *
 * // Initialize sandbox on startup
 * await sandbox.initializeSandbox();
 * ```
 */
export class SandboxManager {
  private static instance: SandboxManager | null = null;
  private readonly sandboxRoot: string;
  private readonly logger: SecurityLogger;
  private initialized: boolean = false;

  /**
   * Private constructor - use getInstance() instead.
   *
   * @param sandboxRoot - Absolute path to sandbox root directory
   * @param logger - Optional logger for security events
   */
  private constructor(sandboxRoot?: string, logger?: SecurityLogger) {
    // Resolve sandbox root to absolute path
    const configuredRoot = sandboxRoot || getSandboxRoot();
    this.sandboxRoot = path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(process.cwd(), configuredRoot);
    this.logger = logger || defaultLogger;
  }

  /**
   * Gets the singleton instance of SandboxManager.
   *
   * @param sandboxRoot - Optional custom sandbox root (only used on first call)
   * @param logger - Optional logger for security events
   * @returns The SandboxManager singleton instance
   */
  public static getInstance(sandboxRoot?: string, logger?: SecurityLogger): SandboxManager {
    if (!SandboxManager.instance) {
      SandboxManager.instance = new SandboxManager(sandboxRoot, logger);
    }
    return SandboxManager.instance;
  }

  /**
   * Resets the singleton instance (for testing purposes only).
   * @internal
   */
  public static resetInstance(): void {
    SandboxManager.instance = null;
  }

  /**
   * Gets the sandbox root path.
   *
   * @returns The absolute path to the sandbox root directory
   */
  public getSandboxRoot(): string {
    return this.sandboxRoot;
  }

  /**
   * Gets the resources directory path.
   *
   * @returns The absolute path to the resources directory
   */
  public getResourcesDirectory(): string {
    return path.join(this.sandboxRoot, 'resources');
  }

  /**
   * Gets the temporary directory path.
   *
   * @returns The absolute path to the tmp directory
   */
  public getTmpDirectory(): string {
    return path.join(this.sandboxRoot, 'tmp');
  }

  /**
   * Validates a path is within the sandbox and returns the absolute path.
   *
   * This method:
   * 1. Rejects absolute paths (only relative paths accepted)
   * 2. Normalizes the path (removes .., multiple slashes)
   * 3. Resolves to absolute path within sandbox
   * 4. Verifies the resolved path is within sandbox boundaries
   *
   * @param relativePath - The relative path to validate
   * @returns The validated absolute path
   * @throws StorageError with SANDBOX_VIOLATION if path is outside sandbox
   *
   * @example
   * ```typescript
   * // Valid path
   * const abs = sandbox.validatePath('prompts/greeting.md');
   *
   * // Invalid path - throws SANDBOX_VIOLATION
   * sandbox.validatePath('../../../etc/passwd');
   * ```
   */
  public validatePath(relativePath: string): string {
    // Reject absolute paths
    if (path.isAbsolute(relativePath)) {
      this.logSecurityViolation('Absolute path rejected', { attemptedPath: relativePath });
      throw new StorageError(
        StorageErrorCode.SANDBOX_VIOLATION,
        'Absolute paths are not allowed. Use relative paths within the sandbox.',
        { providedPath: relativePath }
      );
    }

    // Reject explicit traversal attempts
    if (relativePath.includes('..')) {
      this.logSecurityViolation('Path traversal attempt detected', { attemptedPath: relativePath });
      throw new StorageError(
        StorageErrorCode.SANDBOX_VIOLATION,
        'Path traversal sequences (..) are not allowed.',
        { providedPath: relativePath }
      );
    }

    // Resolve and normalize the path
    const normalizedPath = path.normalize(relativePath);
    const absolutePath = path.resolve(this.sandboxRoot, normalizedPath);

    // Verify the resolved path is within sandbox
    if (!this.isWithinSandbox(absolutePath)) {
      this.logSecurityViolation('Path resolves outside sandbox', {
        attemptedPath: relativePath,
        resolvedPath: absolutePath,
      });
      throw new StorageError(
        StorageErrorCode.SANDBOX_VIOLATION,
        'The specified path is outside the sandbox boundaries.',
        { providedPath: relativePath }
      );
    }

    return absolutePath;
  }

  /**
   * Checks if an absolute path is within the sandbox boundaries.
   * This method does not throw - it returns a boolean.
   *
   * @param absolutePath - The absolute path to check
   * @returns true if the path is within the sandbox, false otherwise
   *
   * @example
   * ```typescript
   * sandbox.isWithinSandbox('/apps/sandbox/resources/file.txt'); // true
   * sandbox.isWithinSandbox('/etc/passwd'); // false
   * ```
   */
  public isWithinSandbox(absolutePath: string): boolean {
    const normalizedPath = path.normalize(absolutePath);
    const normalizedRoot = path.normalize(this.sandboxRoot);

    // Check if path starts with sandbox root
    // Use path separator to prevent partial matches (e.g., /sandbox vs /sandbox2)
    return (
      normalizedPath === normalizedRoot ||
      normalizedPath.startsWith(normalizedRoot + path.sep)
    );
  }

  /**
   * Resolves a relative path to an absolute path within the sandbox.
   * Validates the path before returning.
   *
   * @param relativePath - The relative path to resolve
   * @returns The absolute path within the sandbox
   * @throws StorageError with SANDBOX_VIOLATION if path is invalid
   *
   * @example
   * ```typescript
   * const abs = sandbox.resolvePath('prompts/greeting.md');
   * // Returns: '/path/to/sandbox/prompts/greeting.md'
   * ```
   */
  public resolvePath(relativePath: string): string {
    return this.validatePath(relativePath);
  }

  /**
   * Converts an absolute path to a path relative to the sandbox root.
   *
   * @param absolutePath - The absolute path to convert
   * @returns The relative path within the sandbox
   * @throws StorageError with SANDBOX_VIOLATION if path is outside sandbox
   *
   * @example
   * ```typescript
   * const rel = sandbox.getRelativePath('/apps/sandbox/prompts/greeting.md');
   * // Returns: 'prompts/greeting.md'
   * ```
   */
  public getRelativePath(absolutePath: string): string {
    if (!this.isWithinSandbox(absolutePath)) {
      throw new StorageError(
        StorageErrorCode.SANDBOX_VIOLATION,
        'Cannot get relative path for a path outside the sandbox.',
        { providedPath: absolutePath }
      );
    }

    return path.relative(this.sandboxRoot, absolutePath);
  }

  /**
   * Ensures a directory exists within the sandbox, creating it if necessary.
   * Creates parent directories recursively.
   *
   * @param directoryPath - Relative path to the directory
   * @throws StorageError with SANDBOX_VIOLATION if path is outside sandbox
   * @throws StorageError with WRITE_ERROR if directory creation fails
   *
   * @example
   * ```typescript
   * await sandbox.ensureDirectory('resources/tenant-123/prompts');
   * ```
   */
  public async ensureDirectory(directoryPath: string): Promise<void> {
    const absolutePath = this.validatePath(directoryPath);

    try {
      await fs.mkdir(absolutePath, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // EEXIST is fine - directory already exists
      if (err.code === 'EEXIST') {
        return;
      }

      // ENOSPC - disk full
      if (err.code === 'ENOSPC') {
        throw new StorageError(
          StorageErrorCode.STORAGE_FULL,
          'Cannot create directory: storage is full.',
          { path: directoryPath }
        );
      }

      // EACCES - permission denied
      if (err.code === 'EACCES') {
        throw new StorageError(
          StorageErrorCode.PERMISSION_DENIED,
          'Cannot create directory: permission denied.',
          { path: directoryPath }
        );
      }

      throw new StorageError(
        StorageErrorCode.WRITE_ERROR,
        `Failed to create directory: ${err.message}`,
        { path: directoryPath, originalError: err.code }
      );
    }
  }

  /**
   * Initializes the sandbox directory structure.
   * Creates the sandbox root, resources directory, and tmp directory.
   *
   * This method is idempotent - safe to call multiple times.
   *
   * @throws StorageError if directory creation fails
   *
   * @example
   * ```typescript
   * await sandbox.initializeSandbox();
   * ```
   */
  public async initializeSandbox(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing sandbox directory structure', {
      sandboxRoot: this.sandboxRoot,
    });

    try {
      // Create sandbox root
      await fs.mkdir(this.sandboxRoot, { recursive: true });

      // Create resources directory
      await fs.mkdir(path.join(this.sandboxRoot, 'resources'), { recursive: true });

      // Create tmp directory
      await fs.mkdir(path.join(this.sandboxRoot, 'tmp'), { recursive: true });

      // Create .gitkeep files to preserve empty directories in git
      await this.createGitkeepFiles();

      this.initialized = true;
      this.logger.info('Sandbox initialized successfully', {
        resourcesDir: path.join(this.sandboxRoot, 'resources'),
        tmpDir: path.join(this.sandboxRoot, 'tmp'),
      });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw new StorageError(
        StorageErrorCode.WRITE_ERROR,
        `Failed to initialize sandbox: ${err.message}`,
        { sandboxRoot: this.sandboxRoot, originalError: err.code }
      );
    }
  }

  /**
   * Checks if the sandbox root directory exists.
   *
   * @returns true if sandbox exists
   * @throws StorageError with SANDBOX_NOT_FOUND if sandbox doesn't exist
   *
   * @example
   * ```typescript
   * const exists = await sandbox.checkSandboxExists();
   * ```
   */
  public async checkSandboxExists(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.sandboxRoot);
      if (!stats.isDirectory()) {
        throw new StorageError(
          StorageErrorCode.SANDBOX_NOT_FOUND,
          'Sandbox root exists but is not a directory.',
          { sandboxRoot: this.sandboxRoot }
        );
      }
      return true;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new StorageError(
          StorageErrorCode.SANDBOX_NOT_FOUND,
          'Sandbox root directory does not exist.',
          { sandboxRoot: this.sandboxRoot }
        );
      }
      throw error;
    }
  }

  /**
   * Ensures a tenant-specific directory structure exists.
   *
   * @param tenantId - The tenant ID
   * @returns The absolute path to the tenant's resource directory
   *
   * @example
   * ```typescript
   * const tenantDir = await sandbox.ensureTenantDirectory('tenant-123');
   * // Creates: resources/tenant-123/{prompts,media,documents,data}
   * ```
   */
  public async ensureTenantDirectory(tenantId: string): Promise<string> {
    // Validate tenant ID to prevent path injection
    if (!this.isValidTenantId(tenantId)) {
      throw new StorageError(
        StorageErrorCode.SANDBOX_VIOLATION,
        'Invalid tenant ID format.',
        { tenantId }
      );
    }

    const tenantBasePath = path.join('resources', tenantId);

    // Create tenant base directory
    await this.ensureDirectory(tenantBasePath);

    // Create type-specific subdirectories
    const typeDirectories = Object.values(RESOURCE_TYPE_DIRECTORIES);
    const uniqueDirs = [...new Set(typeDirectories)]; // Remove duplicates (media is used twice)

    for (const typeDir of uniqueDirs) {
      await this.ensureDirectory(path.join(tenantBasePath, typeDir));
    }

    return this.resolvePath(tenantBasePath);
  }

  /**
   * Gets the path for a specific resource type within a tenant's directory.
   *
   * @param tenantId - The tenant ID
   * @param resourceType - The type of resource
   * @returns The relative path for storing that resource type
   *
   * @example
   * ```typescript
   * const promptsDir = sandbox.getTenantTypePath('tenant-123', 'prompt');
   * // Returns: 'resources/tenant-123/prompts'
   * ```
   */
  public getTenantTypePath(tenantId: string, resourceType: ResourceType): string {
    if (!this.isValidTenantId(tenantId)) {
      throw new StorageError(
        StorageErrorCode.SANDBOX_VIOLATION,
        'Invalid tenant ID format.',
        { tenantId }
      );
    }

    const typeDir = RESOURCE_TYPE_DIRECTORIES[resourceType];
    return path.join('resources', tenantId, typeDir);
  }

  /**
   * Checks if a file exists at the given path.
   *
   * @param relativePath - Relative path to check
   * @returns true if file exists, false otherwise
   */
  public async fileExists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = this.validatePath(relativePath);
      const stats = await fs.stat(absolutePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Checks if a directory exists at the given path.
   *
   * @param relativePath - Relative path to check
   * @returns true if directory exists, false otherwise
   */
  public async directoryExists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = this.validatePath(relativePath);
      const stats = await fs.stat(absolutePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Logs a security violation attempt.
   * @internal
   */
  private logSecurityViolation(message: string, context: Record<string, unknown>): void {
    this.logger.warn(message, {
      ...context,
      timestamp: new Date().toISOString(),
      eventType: 'SANDBOX_VIOLATION',
      // Don't log the actual sandbox root for security
    });
  }

  /**
   * Validates a tenant ID format.
   * Allows alphanumeric characters, hyphens, and underscores.
   * @internal
   */
  private isValidTenantId(tenantId: string): boolean {
    // Allow CUID2 format and similar identifiers
    return /^[a-zA-Z0-9_-]+$/.test(tenantId) && tenantId.length > 0 && tenantId.length <= 128;
  }

  /**
   * Creates .gitkeep files in empty directories.
   * @internal
   */
  private async createGitkeepFiles(): Promise<void> {
    const gitkeepPaths = [
      path.join(this.sandboxRoot, 'resources', '.gitkeep'),
      path.join(this.sandboxRoot, 'tmp', '.gitkeep'),
    ];

    for (const gitkeepPath of gitkeepPaths) {
      try {
        // Only create if doesn't exist
        await fs.access(gitkeepPath);
      } catch {
        await fs.writeFile(gitkeepPath, '', 'utf-8');
      }
    }
  }
}

export default SandboxManager;
