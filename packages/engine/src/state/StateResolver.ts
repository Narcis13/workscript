/**
 * StateResolver - Resolves state references in node configurations
 *
 * Implements two types of state reference syntax:
 *
 * 1. **Full reference syntax**: `"$.key"` - Direct state access with type preservation
 *    - Example: `"$.count"` → 42 (number), `"$.user"` → { name: "Alice" } (object)
 *    - Preserves original types (numbers, booleans, objects, arrays)
 *    - Use when you need the actual value, not a string
 *
 * 2. **Template interpolation syntax**: `"{{$.key}}"` - String building with embedded values
 *    - Example: `"Hello {{$.user.name}}!"` → "Hello Alice!"
 *    - Always returns a string (values are converted to strings)
 *    - Use when building messages, URLs, or any text with dynamic values
 *    - Supports multiple templates: `"{{$.firstName}} {{$.lastName}}"`
 *    - Objects/arrays are JSON.stringify'd: `"User: {{$.user}}"` → `"User: {\"name\":\"Alice\"}"`
 *    - Missing keys become empty strings: `"Value: {{$.missing}}"` → `"Value: "`
 *
 * Features:
 * - Deep recursive resolution of nested objects and arrays
 * - Type preservation for full references (`$.key`)
 * - Graceful handling of missing state keys
 * - Support for nested key paths (e.g., `"$.user.profile.email"`)
 * - Multiple templates in a single string
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
  private static readonly TEMPLATE_PATTERN = /\{\{\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;

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
   * Processes both full references (`"$.key"`) and template interpolations (`"{{$.key}}"`)
   * recursively through objects and arrays.
   *
   * @param config - The configuration object to process
   * @param state - The current workflow state
   * @param path - Current path for error reporting (internal)
   * @param depth - Current recursion depth (internal)
   * @returns Resolved configuration with state values substituted
   *
   * @example
   * // Full reference (type preserved)
   * resolver.resolve("$.count", { count: 42 }) // => 42 (number)
   *
   * @example
   * // Template interpolation (string result)
   * resolver.resolve("Count: {{$.count}}", { count: 42 }) // => "Count: 42" (string)
   *
   * @example
   * // Nested configuration
   * resolver.resolve(
   *   { message: "Hello {{$.user.name}}", value: "$.score" },
   *   { user: { name: "Alice" }, score: 100 }
   * ) // => { message: "Hello Alice", value: 100 }
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
   *
   * Supports two patterns:
   * 1. Full reference: "$.path" - Returns the raw value with type preservation
   * 2. Template interpolation: "Hello {{$.name}}" - Returns interpolated string
   */
  private resolveStringValue(
    value: string,
    state: Record<string, any>,
    path: string[]
  ): any {
    // FIRST: Check for full state reference pattern (existing behavior)
    // This preserves types (numbers, booleans, objects, arrays)
    const fullMatch = value.match(this.options.pattern);

    if (fullMatch) {
      const keyPath = fullMatch[1];

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

    // SECOND: Check for template interpolation patterns {{$.path}}
    // This always returns a string (templates are for string building)
    if (this.containsTemplatePattern(value)) {
      return this.interpolateTemplate(value, state);
    }

    // No patterns found, return as-is
    return value;
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
   * Check if a string contains template interpolation patterns {{$.path}}
   */
  private containsTemplatePattern(value: string): boolean {
    // Reset lastIndex for global regex (critical for correctness!)
    StateResolver.TEMPLATE_PATTERN.lastIndex = 0;
    return StateResolver.TEMPLATE_PATTERN.test(value);
  }

  /**
   * Interpolate template patterns {{$.path}} within a string
   * Replaces each {{$.path}} with the resolved state value (as string)
   * Missing keys are replaced with empty string (silent)
   *
   * @param template - String containing {{$.path}} patterns
   * @param state - Current workflow state
   * @returns Interpolated string with values substituted
   */
  private interpolateTemplate(
    template: string,
    state: Record<string, any>
  ): string {
    // Reset lastIndex for global regex
    StateResolver.TEMPLATE_PATTERN.lastIndex = 0;

    return template.replace(
      StateResolver.TEMPLATE_PATTERN,
      (match, keyPath) => {
        const value = this.getNestedValue(state, keyPath);

        // Missing keys become empty string (requirement: silent)
        if (value === undefined || value === null) {
          return '';
        }

        // Convert to string representation
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return '';
          }
        }

        return String(value);
      }
    );
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

  /**
   * Check if a string contains template patterns {{$.path}}
   * Useful for tooling and validation
   */
  static containsTemplate(value: string): boolean {
    StateResolver.TEMPLATE_PATTERN.lastIndex = 0;
    return StateResolver.TEMPLATE_PATTERN.test(value);
  }

  /**
   * Extract all template key paths from a string
   * Example: "Hello {{$.user.name}}, score: {{$.score}}" => ["user.name", "score"]
   */
  static extractTemplatePaths(value: string): string[] {
    const paths: string[] = [];
    StateResolver.TEMPLATE_PATTERN.lastIndex = 0;
    let match;

    while ((match = StateResolver.TEMPLATE_PATTERN.exec(value)) !== null) {
      if (match[1]) {
        paths.push(match[1]);
      }
    }

    return paths;
  }
}