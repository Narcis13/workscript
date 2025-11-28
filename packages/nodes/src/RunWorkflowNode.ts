/**
 * RunWorkflowNode - Execute a workflow via the Workscript API
 *
 * This node makes an authenticated request to the Workscript plugin API
 * to trigger execution of another workflow. Uses JWT_token from state
 * for authentication.
 *
 * @example
 * ```json
 * {
 *   "run-workflow": {
 *     "workflowId": "my-other-workflow",
 *     "initialState": {
 *       "inputData": "$.someData",
 *       "customParam": 123
 *     },
 *     "success?": "process-result",
 *     "error?": "handle-error"
 *   }
 * }
 * ```
 */

import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

// Define config interface
interface RunWorkflowConfig {
  workflowId: string;
  initialState?: Record<string, unknown>;
  baseUrl?: string;
  timeout?: number;
}

// Define response type
interface WorkflowExecutionResponse {
  status: string;
  executionId?: string;
  result?: unknown;
  finalState?: Record<string, unknown>;
  error?: string;
  details?: unknown;
}

/**
 * RunWorkflowNode - Execute a workflow via the Workscript API
 *
 * Makes an authenticated POST request to /workscript/workflows/run
 * to trigger execution of a specified workflow. Requires JWT_token in state.
 */
export class RunWorkflowNode extends WorkflowNode {
  metadata = {
    id: 'runWorkflow',
    name: 'Run Workflow',
    version: '1.0.0',
    description: 'Execute another workflow via the Workscript API with authentication',
    inputs: ['workflowId', 'initialState', 'baseUrl', 'timeout'],
    outputs: ['executionId', 'result', 'finalState', 'status'],
    ai_hints: {
      purpose: 'Trigger execution of another workflow through the Workscript API',
      when_to_use: 'When you need to execute a sub-workflow or chain workflows together',
      expected_edges: ['success', 'error'],
      example_usage: '{"run-workflow-1": {"workflowId": "process-data", "initialState": {"data": "$.inputData"}, "success?": "next"}}',
      example_config: '{"workflowId": "string (required)", "initialState?": "object", "baseUrl?": "string", "timeout?": "number (ms)"}',
      get_from_state: ['JWT_token'],
      post_to_state: ['runWorkflowResult', 'runWorkflowExecutionId', 'runWorkflowFinalState']
    }
  };

  // Default timeout (60 seconds for workflow execution)
  private readonly defaultTimeout = 60000;

  async execute(context: ExecutionContext, config?: unknown): Promise<EdgeMap> {
    const {
      workflowId,
      initialState = {},
      baseUrl,
      timeout
    } = (config as RunWorkflowConfig) || {};

    // ============================================
    // VALIDATION
    // ============================================
    if (!workflowId) {
      return {
        error: () => ({
          error: 'Missing required parameter: workflowId',
          nodeId: context.nodeId
        })
      };
    }

    // Get JWT token from state
    const jwtToken = context.state.JWT_token as string | undefined;

    if (!jwtToken) {
      return {
        error: () => ({
          error: 'Missing JWT_token in state. Authentication required to execute workflows.',
          nodeId: context.nodeId,
          suggestion: 'Ensure JWT_token is set in the workflow state before calling runWorkflow'
        })
      };
    }

    // ============================================
    // BUILD REQUEST
    // ============================================
    try {
      const apiBaseUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:3013';
      const url = `${apiBaseUrl}/workscript/workflows/run`;

      const requestBody = {
        workflowId,
        initialState
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      };

      // ============================================
      // MAKE API CALL
      // ============================================
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeout || this.defaultTimeout
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ============================================
      // PROCESS RESPONSE
      // ============================================
      const responseData = await response.json() as WorkflowExecutionResponse;

      // Store results in state
      context.state.runWorkflowResult = responseData.result || responseData;
      context.state.runWorkflowExecutionId = responseData.executionId;
      context.state.runWorkflowFinalState = responseData.finalState;

      // Check for HTTP errors or workflow execution errors
      if (!response.ok || responseData.status === 'failed') {
        return {
          error: () => ({
            error: responseData.error || `HTTP ${response.status}: Workflow execution failed`,
            workflowId,
            executionId: responseData.executionId,
            status: response.status,
            details: responseData.details,
            nodeId: context.nodeId
          })
        };
      }

      // ============================================
      // RETURN SINGLE SUCCESS EDGE
      // ============================================
      return {
        success: () => ({
          executionId: responseData.executionId,
          result: responseData.result,
          finalState: responseData.finalState,
          status: responseData.status,
          workflowId
        })
      };

    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: () => ({
              error: `Workflow execution timeout after ${timeout || this.defaultTimeout}ms`,
              workflowId,
              nodeId: context.nodeId
            })
          };
        }
      }

      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'Failed to execute workflow',
          workflowId,
          nodeId: context.nodeId
        })
      };
    }
  }
}

export default RunWorkflowNode;
