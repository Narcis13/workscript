# Node Development Examples

Complete, production-ready examples demonstrating various node patterns.

## Example 1: StringFormatNode (Core Node)

A simple text formatting node demonstrating the standard success/error pattern.

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface StringFormatConfig {
  template: string;
  values?: Record<string, unknown>;
}

/**
 * StringFormatNode - Formats strings with template substitution
 *
 * Replaces {key} placeholders in template with values from config or state.
 *
 * @example
 * ```json
 * {
 *   "format-1": {
 *     "template": "Hello, {name}! Your score is {score}.",
 *     "values": { "name": "$.userName", "score": "$.userScore" },
 *     "success?": "send-message"
 *   }
 * }
 * ```
 */
export class StringFormatNode extends WorkflowNode {
  metadata = {
    id: 'stringFormat',
    name: 'String Format',
    version: '1.0.0',
    description: 'Formats strings using template substitution',
    inputs: ['template', 'values'],
    outputs: ['formatted'],
    ai_hints: {
      purpose: 'Format strings by replacing placeholders with values',
      when_to_use: 'When you need to create dynamic strings from templates',
      expected_edges: ['success', 'error'],
      example_usage: '{"format-1": {"template": "Hello, {name}!", "values": {"name": "John"}, "success?": "next"}}',
      example_config: '{"template": "string with {placeholders}", "values": "object"}',
      get_from_state: [],
      post_to_state: ['formattedString']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { template, values = {} } = (config as StringFormatConfig) || {};

    if (!template) {
      return {
        error: () => ({
          error: 'Missing required parameter: template',
          nodeId: context.nodeId
        })
      };
    }

    try {
      // Replace all {key} placeholders
      const formatted = template.replace(/\{(\w+)\}/g, (match, key) => {
        const value = values[key] ?? context.state[key] ?? match;
        return String(value);
      });

      context.state.formattedString = formatted;

      return {
        success: () => ({
          formatted,
          template,
          placeholdersReplaced: Object.keys(values).length
        })
      };

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'String formatting failed',
          nodeId: context.nodeId
        })
      };
    }
  }
}

export default StringFormatNode;
```

## Example 2: ArrayFindNode (Lookup Pattern)

A data node demonstrating the found/not_found pattern.

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface ArrayFindConfig {
  array: unknown[];
  field?: string;
  value: unknown;
}

/**
 * ArrayFindNode - Finds an item in an array
 *
 * Searches an array for an item matching criteria.
 * Returns found edge with item, or not_found edge.
 *
 * @example
 * ```json
 * {
 *   "find-user": {
 *     "array": "$.users",
 *     "field": "email",
 *     "value": "john@example.com",
 *     "found?": "update-user",
 *     "not_found?": "create-user"
 *   }
 * }
 * ```
 */
export class ArrayFindNode extends WorkflowNode {
  metadata = {
    id: 'arrayFind',
    name: 'Array Find',
    version: '1.0.0',
    description: 'Finds an item in an array by field value',
    inputs: ['array', 'field', 'value'],
    outputs: ['item', 'index'],
    ai_hints: {
      purpose: 'Search an array for an item matching specific criteria',
      when_to_use: 'When you need to find a specific item in an array',
      expected_edges: ['found', 'not_found', 'error'],
      example_usage: '{"find-1": {"array": "$.items", "field": "id", "value": 123, "found?": "process"}}',
      example_config: '{"array": "array", "field?": "string", "value": "any"}',
      get_from_state: [],
      post_to_state: ['foundItem', 'foundIndex']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { array, field, value } = (config as ArrayFindConfig) || {};

    // Validation
    if (!Array.isArray(array)) {
      return {
        error: () => ({
          error: 'Parameter "array" must be an array',
          nodeId: context.nodeId,
          received: typeof array
        })
      };
    }

    if (value === undefined) {
      return {
        error: () => ({
          error: 'Missing required parameter: value',
          nodeId: context.nodeId
        })
      };
    }

    try {
      let foundIndex = -1;
      let foundItem: unknown = undefined;

      if (field) {
        // Search by object field
        foundIndex = array.findIndex((item) => {
          if (typeof item === 'object' && item !== null) {
            return (item as Record<string, unknown>)[field] === value;
          }
          return false;
        });
      } else {
        // Search for exact value
        foundIndex = array.indexOf(value);
      }

      if (foundIndex !== -1) {
        foundItem = array[foundIndex];
        context.state.foundItem = foundItem;
        context.state.foundIndex = foundIndex;

        return {
          found: () => ({
            item: foundItem,
            index: foundIndex,
            field,
            value
          })
        };
      } else {
        context.state.foundItem = null;
        context.state.foundIndex = -1;

        return {
          not_found: () => ({
            field,
            value,
            searchedCount: array.length
          })
        };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Array search failed',
          nodeId: context.nodeId
        })
      };
    }
  }
}

export default ArrayFindNode;
```

## Example 3: NumberRangeNode (Multi-Outcome Pattern)

A node demonstrating multiple conditional outcomes.

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface NumberRangeConfig {
  value: number;
  ranges?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
}

type RangeCategory = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

/**
 * NumberRangeNode - Categorizes a number into ranges
 *
 * Routes workflow based on where a number falls within defined ranges.
 * Useful for scoring, priority assignment, or tiered processing.
 *
 * @example
 * ```json
 * {
 *   "categorize-score": {
 *     "value": "$.userScore",
 *     "ranges": { "critical": 90, "high": 70, "medium": 40, "low": 20 },
 *     "critical?": "urgent-action",
 *     "high?": "priority-action",
 *     "medium?": "standard-action",
 *     "low?": "batch-action",
 *     "minimal?": "skip-action"
 *   }
 * }
 * ```
 */
export class NumberRangeNode extends WorkflowNode {
  metadata = {
    id: 'numberRange',
    name: 'Number Range',
    version: '1.0.0',
    description: 'Categorizes numbers into configurable ranges',
    inputs: ['value', 'ranges'],
    outputs: ['category', 'value'],
    ai_hints: {
      purpose: 'Categorize numeric values into defined ranges for routing',
      when_to_use: 'When you need to route workflow based on numeric thresholds',
      expected_edges: ['critical', 'high', 'medium', 'low', 'minimal', 'error'],
      example_usage: '{"range-1": {"value": "$.score", "ranges": {"high": 80, "medium": 50}, "high?": "process-high"}}',
      example_config: '{"value": "number", "ranges?": {"critical": 90, "high": 70, "medium": 40, "low": 20}}',
      get_from_state: [],
      post_to_state: ['rangeCategory', 'rangeValue']
    }
  };

  private defaultRanges = {
    critical: 90,
    high: 70,
    medium: 40,
    low: 20
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { value, ranges } = (config as NumberRangeConfig) || {};

    // Validation
    if (value === undefined || value === null) {
      return {
        error: () => ({
          error: 'Missing required parameter: value',
          nodeId: context.nodeId
        })
      };
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return {
        error: () => ({
          error: `Value must be a number, received: ${typeof value}`,
          nodeId: context.nodeId,
          value
        })
      };
    }

    try {
      const r = { ...this.defaultRanges, ...ranges };
      const category = this.categorize(numValue, r);

      context.state.rangeCategory = category;
      context.state.rangeValue = numValue;

      // Return single edge based on category
      const edgeData = () => ({
        category,
        value: numValue,
        ranges: r
      });

      switch (category) {
        case 'critical':
          return { critical: edgeData };
        case 'high':
          return { high: edgeData };
        case 'medium':
          return { medium: edgeData };
        case 'low':
          return { low: edgeData };
        case 'minimal':
          return { minimal: edgeData };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Range categorization failed',
          nodeId: context.nodeId
        })
      };
    }
  }

  private categorize(value: number, ranges: Required<NumberRangeConfig['ranges']>): RangeCategory {
    if (value >= ranges.critical) return 'critical';
    if (value >= ranges.high) return 'high';
    if (value >= ranges.medium) return 'medium';
    if (value >= ranges.low) return 'low';
    return 'minimal';
  }
}

export default NumberRangeNode;
```

## Example 4: HttpRequestNode (External API Pattern)

A complete HTTP client node with authentication and error handling.

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  bearerToken?: string;
  retries?: number;
}

/**
 * HttpRequestNode - Makes HTTP requests to external APIs
 *
 * Full-featured HTTP client with authentication, timeout, and retry support.
 *
 * @example
 * ```json
 * {
 *   "fetch-data": {
 *     "url": "https://api.example.com/users",
 *     "method": "GET",
 *     "bearerToken": "$.apiToken",
 *     "timeout": 5000,
 *     "success?": "process-users",
 *     "error?": "handle-api-error"
 *   }
 * }
 * ```
 */
export class HttpRequestNode extends WorkflowNode {
  metadata = {
    id: 'httpRequest',
    name: 'HTTP Request',
    version: '1.0.0',
    description: 'Makes HTTP requests to external APIs',
    inputs: ['url', 'method', 'headers', 'body', 'timeout', 'bearerToken', 'retries'],
    outputs: ['data', 'status', 'headers'],
    ai_hints: {
      purpose: 'Make HTTP requests to REST APIs and external services',
      when_to_use: 'When you need to call external APIs, webhooks, or REST endpoints',
      expected_edges: ['success', 'error'],
      example_usage: '{"api-1": {"url": "https://api.example.com/data", "method": "GET", "success?": "process"}}',
      example_config: '{"url": "string", "method?": "GET|POST|PUT|PATCH|DELETE", "headers?": "object", "body?": "any", "bearerToken?": "string"}',
      get_from_state: [],
      post_to_state: ['httpResponse', 'httpStatus']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      bearerToken,
      retries = 0
    } = (config as HttpRequestConfig) || {};

    // Validation
    if (!url) {
      return {
        error: () => ({
          error: 'Missing required parameter: url',
          nodeId: context.nodeId
        })
      };
    }

    try {
      new URL(url);
    } catch {
      return {
        error: () => ({
          error: `Invalid URL: ${url}`,
          nodeId: context.nodeId
        })
      };
    }

    // Build request
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (bearerToken) {
      requestHeaders['Authorization'] = `Bearer ${bearerToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Execute with retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Parse response
        let data: unknown;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Store in state
        context.state.httpResponse = data;
        context.state.httpStatus = response.status;

        // Check for HTTP errors
        if (!response.ok) {
          return {
            error: () => ({
              error: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
              data,
              url,
              nodeId: context.nodeId
            })
          };
        }

        // Success
        return {
          success: () => ({
            data,
            status: response.status,
            url
          })
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on timeout
        if (lastError.name === 'AbortError') {
          return {
            error: () => ({
              error: `Request timeout after ${timeout}ms`,
              url,
              nodeId: context.nodeId
            })
          };
        }

        // Retry if attempts remaining
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    return {
      error: () => ({
        error: lastError?.message || 'HTTP request failed',
        url,
        nodeId: context.nodeId,
        attempts: retries + 1
      })
    };
  }
}

export default HttpRequestNode;
```

## Example 5: DataValidatorNode (Boolean Pattern with Details)

A validation node that returns true/false with detailed validation results.

```typescript
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'range';
  value?: unknown;
  message?: string;
}

interface DataValidatorConfig {
  data: Record<string, unknown>;
  rules: ValidationRule[];
  stopOnFirst?: boolean;
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
}

/**
 * DataValidatorNode - Validates data against rules
 *
 * Checks data against validation rules and routes based on validity.
 * Returns detailed errors on failure.
 *
 * @example
 * ```json
 * {
 *   "validate-user": {
 *     "data": "$.formData",
 *     "rules": [
 *       { "field": "email", "type": "required" },
 *       { "field": "email", "type": "email" },
 *       { "field": "password", "type": "minLength", "value": 8 }
 *     ],
 *     "true?": "save-user",
 *     "false?": "show-errors"
 *   }
 * }
 * ```
 */
export class DataValidatorNode extends WorkflowNode {
  metadata = {
    id: 'dataValidator',
    name: 'Data Validator',
    version: '1.0.0',
    description: 'Validates data against configurable rules',
    inputs: ['data', 'rules', 'stopOnFirst'],
    outputs: ['valid', 'errors'],
    ai_hints: {
      purpose: 'Validate data against rules and route based on validity',
      when_to_use: 'When you need to validate form data, API inputs, or any structured data',
      expected_edges: ['true', 'false', 'error'],
      example_usage: '{"validate-1": {"data": "$.input", "rules": [{"field": "email", "type": "required"}], "true?": "process"}}',
      example_config: '{"data": "object", "rules": [{"field": "string", "type": "required|email|minLength", "value?": "any"}]}',
      get_from_state: [],
      post_to_state: ['validationResult', 'validationErrors']
    }
  };

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const { data, rules, stopOnFirst = false } = (config as DataValidatorConfig) || {};

    // Validation
    if (!data || typeof data !== 'object') {
      return {
        error: () => ({
          error: 'Parameter "data" must be an object',
          nodeId: context.nodeId
        })
      };
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      return {
        error: () => ({
          error: 'Parameter "rules" must be a non-empty array',
          nodeId: context.nodeId
        })
      };
    }

    try {
      const errors: ValidationError[] = [];

      for (const rule of rules) {
        const error = this.validateRule(data, rule);
        if (error) {
          errors.push(error);
          if (stopOnFirst) break;
        }
      }

      const isValid = errors.length === 0;
      context.state.validationResult = isValid;
      context.state.validationErrors = errors;

      if (isValid) {
        return {
          true: () => ({
            valid: true,
            data,
            rulesChecked: rules.length
          })
        };
      } else {
        return {
          false: () => ({
            valid: false,
            errors,
            errorCount: errors.length
          })
        };
      }

    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Validation failed',
          nodeId: context.nodeId
        })
      };
    }
  }

  private validateRule(data: Record<string, unknown>, rule: ValidationRule): ValidationError | null {
    const value = data[rule.field];

    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return {
            field: rule.field,
            rule: 'required',
            message: rule.message || `${rule.field} is required`
          };
        }
        break;

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          return {
            field: rule.field,
            rule: 'email',
            message: rule.message || `${rule.field} must be a valid email`
          };
        }
        break;

      case 'minLength':
        if (value && String(value).length < Number(rule.value)) {
          return {
            field: rule.field,
            rule: 'minLength',
            message: rule.message || `${rule.field} must be at least ${rule.value} characters`
          };
        }
        break;

      case 'maxLength':
        if (value && String(value).length > Number(rule.value)) {
          return {
            field: rule.field,
            rule: 'maxLength',
            message: rule.message || `${rule.field} must be at most ${rule.value} characters`
          };
        }
        break;

      case 'pattern':
        if (value && !new RegExp(String(rule.value)).test(String(value))) {
          return {
            field: rule.field,
            rule: 'pattern',
            message: rule.message || `${rule.field} format is invalid`
          };
        }
        break;

      case 'range':
        const [min, max] = rule.value as [number, number];
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < min || numValue > max) {
          return {
            field: rule.field,
            rule: 'range',
            message: rule.message || `${rule.field} must be between ${min} and ${max}`
          };
        }
        break;
    }

    return null;
  }
}

export default DataValidatorNode;
```

## Workflow Examples Using These Nodes

### User Registration Workflow

```json
{
  "id": "user-registration",
  "name": "User Registration",
  "version": "1.0.0",
  "initialState": {},
  "workflow": [
    {
      "validate-input": {
        "data": "$.formData",
        "rules": [
          { "field": "email", "type": "required" },
          { "field": "email", "type": "email" },
          { "field": "password", "type": "minLength", "value": 8 }
        ],
        "true?": "check-existing",
        "false?": "validation-failed"
      }
    },
    {
      "check-existing": {
        "array": "$.users",
        "field": "email",
        "value": "$.formData.email",
        "found?": "user-exists",
        "not_found?": "create-user"
      }
    },
    {
      "create-user": {
        "url": "https://api.example.com/users",
        "method": "POST",
        "body": "$.formData",
        "success?": "send-welcome",
        "error?": "api-error"
      }
    },
    {
      "send-welcome": {
        "template": "Welcome, {name}! Your account has been created.",
        "values": { "name": "$.formData.name" },
        "success?": "complete"
      }
    }
  ]
}
```

### Score Processing Workflow

```json
{
  "id": "score-processing",
  "name": "Score Processing",
  "version": "1.0.0",
  "initialState": { "score": 75 },
  "workflow": [
    {
      "categorize": {
        "value": "$.score",
        "ranges": { "critical": 90, "high": 70, "medium": 50 },
        "critical?": "urgent-notification",
        "high?": "priority-queue",
        "medium?": "standard-queue",
        "low?": "batch-queue",
        "minimal?": "skip"
      }
    },
    {
      "priority-queue": {
        "template": "Priority item with score {score} added to queue",
        "values": { "score": "$.score" },
        "success?": "complete"
      }
    }
  ]
}
```
