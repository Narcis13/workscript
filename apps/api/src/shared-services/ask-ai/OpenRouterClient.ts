/**
 * @module ask-ai/OpenRouterClient
 * @description HTTP client for the OpenRouter API.
 *
 * This module provides a robust HTTP client for communicating with the OpenRouter API,
 * handling authentication, request formatting, timeout management, and error handling.
 *
 * Features:
 * - Automatic API key authentication from environment variables
 * - Configurable request timeout (default 30 seconds)
 * - Proper HTTP headers for OpenRouter (Authorization, HTTP-Referer, X-Title)
 * - Structured error handling with AIServiceError
 * - Support for model listing and chat completions
 *
 * @example
 * ```typescript
 * import { OpenRouterClient } from './OpenRouterClient';
 *
 * const client = new OpenRouterClient();
 *
 * // List available models
 * const models = await client.listModels();
 *
 * // Create a completion
 * const response = await client.createCompletion({
 *   model: 'openai/gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */

import {
  AIServiceError,
  type OpenRouterModel,
  type OpenRouterModelsResponse,
  type OpenRouterCompletionRequest,
  type OpenRouterCompletionResponse,
  type OpenRouterErrorResponse,
} from './types';

/**
 * HTTP client for communicating with the OpenRouter API.
 *
 * Handles all low-level HTTP communication with OpenRouter including:
 * - Authentication via Bearer token
 * - Request timeouts
 * - Error parsing and mapping to AIServiceError
 * - Proper header formatting
 *
 * @example
 * ```typescript
 * const client = new OpenRouterClient();
 *
 * // List all available models
 * const models = await client.listModels();
 * console.log(`Found ${models.length} models`);
 *
 * // Create a chat completion
 * const completion = await client.createCompletion({
 *   model: 'anthropic/claude-3.5-sonnet',
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'What is TypeScript?' }
 *   ],
 *   temperature: 0.7,
 *   max_tokens: 1000
 * });
 * console.log(completion.choices[0].message.content);
 * ```
 */
export class OpenRouterClient {
  /**
   * OpenRouter API key for authentication.
   * Read from OPENROUTER_API_KEY environment variable.
   */
  private readonly apiKey: string;

  /**
   * Base URL for OpenRouter API endpoints.
   */
  private readonly baseUrl: string = 'https://openrouter.ai/api/v1';

  /**
   * Site URL sent in HTTP-Referer header.
   * Helps OpenRouter track API usage by application.
   */
  private readonly siteUrl: string;

  /**
   * Site name sent in X-Title header.
   * Displayed in OpenRouter dashboard for request identification.
   */
  private readonly siteName: string;

  /**
   * Request timeout in milliseconds.
   * Requests taking longer than this will be aborted.
   */
  private readonly timeout: number;

  /**
   * Creates a new OpenRouterClient instance.
   *
   * Reads configuration from environment variables:
   * - OPENROUTER_API_KEY (required): API key for authentication
   * - OPENROUTER_SITE_URL (optional): Site URL for HTTP-Referer header
   * - OPENROUTER_SITE_NAME (optional): Site name for X-Title header
   * - AI_REQUEST_TIMEOUT (optional): Request timeout in milliseconds (default: 30000)
   *
   * @throws {AIServiceError} If OPENROUTER_API_KEY is missing or empty
   *
   * @example
   * ```typescript
   * // Ensure OPENROUTER_API_KEY is set in environment
   * const client = new OpenRouterClient();
   * ```
   */
  constructor() {
    // Read and validate API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new AIServiceError(
        'OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.',
        'MISSING_API_KEY',
        'openrouter'
      );
    }
    this.apiKey = apiKey.trim();

    // Read optional configuration with defaults
    this.siteUrl = process.env.OPENROUTER_SITE_URL || process.env.CLIENT_URL || 'https://workscript.dev';
    this.siteName = process.env.OPENROUTER_SITE_NAME || 'Workscript';
    this.timeout = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10);

    // Validate timeout is a positive number
    if (isNaN(this.timeout) || this.timeout <= 0) {
      console.warn('⚠️ Invalid AI_REQUEST_TIMEOUT, using default 30000ms');
      this.timeout = 30000;
    }
  }

  /**
   * Makes an HTTP request to the OpenRouter API.
   *
   * Handles:
   * - Request timeout via AbortController
   * - Authentication headers
   * - JSON serialization
   * - Error response parsing
   * - Status code to error code mapping
   *
   * @template T The expected response type
   * @param endpoint API endpoint path (e.g., '/models', '/chat/completions')
   * @param method HTTP method ('GET' or 'POST')
   * @param body Optional request body for POST requests
   * @returns Parsed JSON response
   * @throws {AIServiceError} On any request failure
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      // Parse successful response
      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIServiceError(
          `Request timed out after ${this.timeout}ms`,
          'TIMEOUT',
          'openrouter',
          { timeout: this.timeout, endpoint }
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AIServiceError(
          `Network error: ${error.message}`,
          'NETWORK_ERROR',
          'openrouter',
          { originalError: error.message }
        );
      }

      // Re-throw AIServiceError as-is
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Handle unknown errors
      throw new AIServiceError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        'PROVIDER_ERROR',
        'openrouter',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Handles non-OK HTTP responses from OpenRouter.
   *
   * Parses the error response body and maps HTTP status codes
   * to appropriate AIServiceError codes:
   * - 401/403 → AUTH_FAILED
   * - 429 → RATE_LIMITED (includes retry-after if available)
   * - 4xx → INVALID_REQUEST
   * - 5xx → PROVIDER_ERROR
   *
   * @param response The HTTP response object
   * @throws {AIServiceError} Always throws with appropriate error code
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
    let errorDetails: Record<string, unknown> = {
      statusCode: response.status,
      statusText: response.statusText,
    };

    // Try to parse error response body
    try {
      const errorBody = await response.json() as OpenRouterErrorResponse;
      if (errorBody.error) {
        errorMessage = errorBody.error.message || errorMessage;
        errorDetails = {
          ...errorDetails,
          code: errorBody.error.code,
          metadata: errorBody.error.metadata,
        };
      }
    } catch {
      // If JSON parsing fails, try to get raw text
      try {
        const rawText = await response.text();
        if (rawText) {
          errorDetails.rawResponse = rawText.substring(0, 500); // Limit size
        }
      } catch {
        // Ignore if we can't read the response
      }
    }

    // Map status code to error code
    let errorCode: 'AUTH_FAILED' | 'RATE_LIMITED' | 'INVALID_REQUEST' | 'PROVIDER_ERROR';

    if (response.status === 401 || response.status === 403) {
      errorCode = 'AUTH_FAILED';
      errorMessage = 'OpenRouter authentication failed. Check your API key.';
    } else if (response.status === 429) {
      errorCode = 'RATE_LIMITED';
      // Check for retry-after header
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        errorDetails.retryAfter = parseInt(retryAfter, 10);
        errorMessage = `Rate limited. Retry after ${retryAfter} seconds.`;
      } else {
        errorMessage = 'Rate limited by OpenRouter. Please slow down requests.';
      }
    } else if (response.status >= 400 && response.status < 500) {
      errorCode = 'INVALID_REQUEST';
    } else {
      errorCode = 'PROVIDER_ERROR';
      errorMessage = `OpenRouter server error (${response.status}). Please retry later.`;
      // Include retry information for 5xx errors
      errorDetails.retryable = true;
    }

    throw new AIServiceError(errorMessage, errorCode, 'openrouter', errorDetails);
  }

  /**
   * Lists all available models from OpenRouter.
   *
   * Makes a GET request to /api/v1/models and returns the array of models.
   * Each model includes pricing, context length, and capability information.
   *
   * @returns Array of available OpenRouter models
   * @throws {AIServiceError} On network, auth, or server errors
   *
   * @example
   * ```typescript
   * const client = new OpenRouterClient();
   * const models = await client.listModels();
   *
   * // Find all Anthropic models
   * const anthropicModels = models.filter(m => m.id.startsWith('anthropic/'));
   * console.log(`Found ${anthropicModels.length} Anthropic models`);
   *
   * // Find models with large context
   * const largeContextModels = models.filter(m => m.context_length >= 100000);
   * ```
   */
  async listModels(): Promise<OpenRouterModel[]> {
    console.log('🔍 Fetching models from OpenRouter...');
    const response = await this.request<OpenRouterModelsResponse>('/models', 'GET');
    console.log(`✅ Retrieved ${response.data.length} models from OpenRouter`);
    return response.data;
  }

  /**
   * Creates a chat completion using the specified model.
   *
   * Makes a POST request to /api/v1/chat/completions with the provided
   * messages and optional parameters.
   *
   * @param request The completion request including model, messages, and options
   * @returns The completion response with generated text and usage info
   * @throws {AIServiceError} On validation, auth, rate limit, or server errors
   *
   * @example
   * ```typescript
   * const client = new OpenRouterClient();
   *
   * const response = await client.createCompletion({
   *   model: 'openai/gpt-4o',
   *   messages: [
   *     { role: 'system', content: 'You are a coding assistant.' },
   *     { role: 'user', content: 'Write a hello world in TypeScript.' }
   *   ],
   *   temperature: 0.3,
   *   max_tokens: 500
   * });
   *
   * console.log(response.choices[0].message.content);
   * console.log(`Tokens used: ${response.usage.total_tokens}`);
   * ```
   */
  async createCompletion(
    request: OpenRouterCompletionRequest
  ): Promise<OpenRouterCompletionResponse> {
    console.log(`🤖 Sending completion request to model: ${request.model}`);
    const response = await this.request<OpenRouterCompletionResponse>(
      '/chat/completions',
      'POST',
      request
    );
    console.log(
      `✅ Completion received: ${response.usage.total_tokens} tokens, finish_reason: ${response.choices[0]?.finish_reason}`
    );
    return response;
  }
}

export default OpenRouterClient;
