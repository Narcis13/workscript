import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * Default system prompt used when none is provided
 * Follows best practices for general-purpose AI assistants
 */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful, accurate, and concise AI assistant integrated into an automated workflow system.

Guidelines:
- Provide clear, direct, and factual responses
- If you're uncertain about something, acknowledge it
- Structure your responses for easy parsing when appropriate
- Be concise but thorough - avoid unnecessary verbosity
- Focus on the specific task or question at hand
- If the request is ambiguous, make reasonable assumptions and state them`;

/**
 * Configuration for the AskAI node
 */
interface AskAIConfig {
  /** The user's prompt/message to send to the AI (required) */
  userPrompt: string;
  /** The AI model to use, e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet" (required) */
  model: string;
  /** Optional system prompt to set context (uses default if not provided) */
  systemPrompt?: string;
  /** Optional base URL for the API (defaults to http://localhost:3013) */
  baseUrl?: string;
}

/**
 * Response structure from the /ai/complete endpoint
 */
interface AICompleteResponse {
  success: boolean;
  data?: {
    id: string;
    model: string;
    content: string;
    finishReason: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    };
    durationMs: number;
  };
  error?: string;
}

/**
 * AskAINode - Sends prompts to AI models and receives completions
 *
 * This node integrates with the /ai/complete endpoint to enable AI-powered
 * workflow steps. It supports various AI models and handles authentication
 * via JWT tokens stored in workflow state.
 *
 * For automated workflows (cron jobs, webhooks), a service token is automatically
 * injected by WorkflowService when no user JWT is present.
 *
 * @example
 * ```json
 * {
 *   "ask-ai": {
 *     "userPrompt": "Summarize this text: $.inputText",
 *     "model": "openai/gpt-4o",
 *     "systemPrompt": "You are a helpful assistant that summarizes text concisely.",
 *     "success?": "process-response",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 */
export class AskAINode extends WorkflowNode {
  metadata = {
    id: 'ask-ai',
    name: 'Ask AI',
    version: '1.0.0',
    description: 'Send prompts to AI models and receive completions via the /ai/complete endpoint',
    inputs: ['userPrompt', 'model', 'systemPrompt', 'baseUrl'],
    outputs: ['content', 'usage', 'model', 'error'],
    ai_hints: {
      purpose: 'Send prompts to AI models and receive completions',
      when_to_use: 'When you need to get AI-generated responses, analyze text, or have conversational AI in your workflow',
      expected_edges: ['success', 'error'],
      example_usage: '{"ask-ai": {"userPrompt": "Summarize this text: $.inputText", "model": "openai/gpt-4o", "success?": "process-response"}}',
      example_config: '{"userPrompt": "string (required)", "model": "string (required)", "systemPrompt": "string (optional, has default)", "baseUrl": "string (optional)"}',
      get_from_state: ['JWT_token'],
      post_to_state: ['aiResponse', 'aiResponseData', 'PastAIResponses', 'PastAIResponsesData']
    }
  };

  async execute(context: ExecutionContext, config?: AskAIConfig): Promise<EdgeMap> {
    const { userPrompt, model, systemPrompt, baseUrl } = config || {};

    // Validate required configuration
    if (!userPrompt) {
      return {
        error: () => ({
          error: 'Missing required config: userPrompt',
          code: 'MISSING_USER_PROMPT'
        })
      };
    }

    if (!model) {
      return {
        error: () => ({
          error: 'Missing required config: model',
          code: 'MISSING_MODEL'
        })
      };
    }

    // Get JWT token from state (injected by WorkflowService for automated workflows)
    const jwtToken = context.state.JWT_token;
    if (!jwtToken) {
      return {
        error: () => ({
          error: 'JWT token not found in state. For automated workflows, ensure WorkflowService injects a service token.',
          code: 'MISSING_JWT_TOKEN'
        })
      };
    }

    // Build request payload
    const requestPayload: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      systemPrompt?: string;
    } = {
      model,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    };

    // Add system prompt (use default if not provided)
    requestPayload.systemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Determine API base URL
    const apiBaseUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:3013';
    const endpoint = `${apiBaseUrl}/ai/complete`;

    try {
      // Make the API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(requestPayload)
      });

      // Handle HTTP error responses
      if (!response.ok) {
        const errorCode = this.getErrorCodeFromStatus(response.status);
        let errorMessage = `AI API request failed with status ${response.status}`;

        try {
          const errorBody = await response.json() as { error?: string; message?: string };
          if (errorBody.error || errorBody.message) {
            errorMessage = errorBody.error || errorBody.message || errorMessage;
          }
        } catch {
          // Could not parse error body, use default message
        }

        return {
          error: () => ({
            error: errorMessage,
            code: errorCode,
            status: response.status
          })
        };
      }

      // Parse successful response
      const responseData = await response.json() as AICompleteResponse;

      // Validate response structure
      if (!responseData.success || !responseData.data) {
        return {
          error: () => ({
            error: responseData.error || 'AI API returned unsuccessful response',
            code: 'API_ERROR'
          })
        };
      }

      const { data } = responseData;

      // Archive previous responses before overwriting
      const timestamp = new Date().toISOString();

      if (context.state.aiResponse !== undefined) {
        // Initialize archive dictionaries if they don't exist
        if (!context.state.PastAIResponses) {
          context.state.PastAIResponses = {};
        }
        context.state.PastAIResponses[timestamp] = context.state.aiResponse;
      }

      if (context.state.aiResponseData !== undefined) {
        if (!context.state.PastAIResponsesData) {
          context.state.PastAIResponsesData = {};
        }
        context.state.PastAIResponsesData[timestamp] = context.state.aiResponseData;
      }

      // Update state with AI response
      context.state.aiResponse = data.content;
      context.state.aiResponseData = {
        id: data.id,
        model: data.model,
        content: data.content,
        finishReason: data.finishReason,
        usage: data.usage,
        durationMs: data.durationMs
      };

      // Return success edge with response data
      return {
        success: () => ({
          content: data.content,
          usage: data.usage,
          model: data.model
        })
      };

    } catch (error) {
      // Handle network or other errors
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error during AI API request';

      return {
        error: () => ({
          error: errorMessage,
          code: 'NETWORK_ERROR'
        })
      };
    }
  }

  /**
   * Maps HTTP status codes to error codes
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return `HTTP_${status}`;
    }
  }
}

export default AskAINode;
