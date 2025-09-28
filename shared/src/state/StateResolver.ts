/**
 * StateResolver - Resolves state references in node configurations
 *
 * Implements sugar syntax for accessing state values using $.{key} notation
 * Example: "$.developer" resolves to the value of state.developer
 *
 * Features:
 * - Deep recursive resolution of nested objects and arrays
 * - Type preservation for resolved values
 * - Graceful handling of missing state keys
 * - Support for nested key paths (e.g., "$.user.name")
 */

export interface StateResolverOptions {
  /**
   * What to do when a state key is not found
   * - 'undefined': Replace with undefined
   * - 'preserve': Keep the original $.{key} string
   * - 'throw': Throw an error
   */
  onMissingKey?: 'undefined' | 'preserve' | 'throw';

  /**
   * Maximum depth for nested object resolution (prevents infinite recursion)
   */
  maxDepth?: number;

  /**
   * Custom pattern for state references (default: /^\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/)
   */
  pattern?: RegExp;
}

export class StateResolverError extends Error {
  constructor(
    message: string,
    public key: string,
    public path: string[] = []
  ) {
    super(message);
    this.name = 'StateResolverError';
  }
}

export class StateResolver {
  private static readonly DEFAULT_PATTERN = /^\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/;
  private static readonly DEFAULT_MAX_DEPTH = 10;

  private readonly options: Required<StateResolverOptions>;

  constructor(options: StateResolverOptions = {}) {
    this.options = {
      onMissingKey: options.onMissingKey ?? 'undefined',
      maxDepth: options.maxDepth ?? StateResolver.DEFAULT_MAX_DEPTH,
      pattern: options.pattern ?? StateResolver.DEFAULT_PATTERN
    };
  }

  /**
   * Resolve state references in a configuration object
   *
   * @param config - The configuration object to process
   * @param state - The current workflow state
   * @param path - Current path for error reporting (internal)
   * @param depth - Current recursion depth (internal)
   * @returns Resolved configuration with state values substituted
   */
  resolve(
    config: any,
    state: Record<string, any>,
    path: string[] = [],
    depth: number = 0
  ): any {
    // Prevent infinite recursion
    if (depth > this.options.maxDepth) {
      throw new StateResolverError(
        `Maximum resolution depth (${this.options.maxDepth}) exceeded`,
        '',
        path
      );
    }

    // Handle null/undefined
    if (config == null) {
      return config;
    }

    // Handle string values - check for state reference pattern
    if (typeof config === 'string') {
      return this.resolveStringValue(config, state, path);
    }

    // Handle arrays
    if (Array.isArray(config)) {
      return config.map((item, index) =>
        this.resolve(item, state, [...path, `[${index}]`], depth + 1)
      );
    }

    // Handle objects
    if (typeof config === 'object') {
      const resolved: Record<string, any> = {};

      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolve(value, state, [...path, key], depth + 1);
      }

      return resolved;
    }

    // For primitive types (number, boolean, etc.), return as-is
    return config;
  }

  /**
   * Resolve a string value that might contain a state reference
   */
  private resolveStringValue(
    value: string,
    state: Record<string, any>,
    path: string[]
  ): any {
    const match = value.match(this.options.pattern);

    if (!match) {
      // Not a state reference, return as-is
      return value;
    }

    const keyPath = match[1]; // Extract the key path (e.g., "developer" or "user.name")

    if (!keyPath) {
      // Malformed pattern, return original value
      return value;
    }

    try {
      const resolvedValue = this.getNestedValue(state, keyPath);

      if (resolvedValue === undefined) {
        return this.handleMissingKey(keyPath, value, path);
      }

      return resolvedValue;
    } catch (error) {
      return this.handleMissingKey(keyPath, value, path);
    }
  }

  /**
   * Get a nested value from an object using dot notation
   * Example: getNestedValue({user: {name: 'John'}}, 'user.name') => 'John'
   */
  private getNestedValue(obj: Record<string, any>, keyPath: string): any {
    const keys = keyPath.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Handle missing state key based on configured strategy
   */
  private handleMissingKey(
    keyPath: string,
    originalValue: string,
    path: string[]
  ): any {
    switch (this.options.onMissingKey) {
      case 'undefined':
        return undefined;

      case 'preserve':
        return originalValue;

      case 'throw':
        throw new StateResolverError(
          `State key '${keyPath}' not found`,
          keyPath,
          path
        );

      default:
        return undefined;
    }
  }

  /**
   * Check if a string contains a state reference pattern
   */
  static isStateReference(value: string, pattern?: RegExp): boolean {
    const regex = pattern ?? StateResolver.DEFAULT_PATTERN;
    return regex.test(value);
  }

  /**
   * Extract the key path from a state reference string
   * Example: extractKeyPath("$.developer") => "developer"
   */
  static extractKeyPath(value: string, pattern?: RegExp): string | null {
    const regex = pattern ?? StateResolver.DEFAULT_PATTERN;
    const match = value.match(regex);
    return match ? (match[1] ?? null) : null;
  }

  /**
   * Create a default resolver instance for common use cases
   */
  static createDefault(): StateResolver {
    return new StateResolver();
  }

  /**
   * Create a strict resolver that throws on missing keys
   */
  static createStrict(): StateResolver {
    return new StateResolver({ onMissingKey: 'throw' });
  }

  /**
   * Create a preserving resolver that keeps original strings when keys are missing
   */
  static createPreserving(): StateResolver {
    return new StateResolver({ onMissingKey: 'preserve' });
  }
}