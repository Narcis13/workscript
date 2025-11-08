import { WorkflowNode } from '@workscript/engine';
export class FetchNode extends WorkflowNode {
    metadata = {
        id: 'fetch',
        name: 'HTTP Fetch Operations',
        version: '1.0.0',
        description: 'Browser-specific HTTP fetch operations - make API calls from the browser',
        inputs: ['url', 'method', 'headers', 'body'],
        outputs: ['result', 'success', 'error'],
        ai_hints: {
            purpose: 'Make HTTP requests from the browser using the Fetch API',
            when_to_use: 'When you need to call REST APIs, fetch data from external services, or send HTTP requests from the client',
            expected_edges: ['success', 'error'],
            example_usage: '{"fetch-1": {"url": "https://api.example.com/data", "method": "GET", "success?": "process-response"}}',
            example_config: '{"url": "string", "method?": "GET|POST|PUT|DELETE|PATCH", "headers?": "{}", "body?": "any"}',
            get_from_state: [],
            post_to_state: ['fetchResponse', 'fetchError']
        }
    };
    async execute(context, config) {
        const { url, method = 'GET', headers = {}, body } = config || {};
        if (!url) {
            return {
                error: () => ({ error: 'Missing URL for fetch operation' })
            };
        }
        // Check if we're in a browser environment
        if (typeof fetch === 'undefined') {
            return {
                error: () => ({ error: 'fetch is not available in this environment' })
            };
        }
        try {
            const requestOptions = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            // Add body for non-GET requests
            if (body && method.toUpperCase() !== 'GET') {
                requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
            }
            const response = await fetch(url, requestOptions);
            // Try to parse response as JSON, fallback to text
            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                }
                catch {
                    responseData = await response.text();
                }
            }
            else {
                responseData = await response.text();
            }
            const result = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData,
                url: response.url
            };
            context.state.fetchResponse = result;
            if (response.ok) {
                return {
                    success: () => ({
                        ...result,
                        ok: true
                    })
                };
            }
            else {
                return {
                    error: () => ({
                        ...result,
                        ok: false,
                        error: `HTTP ${response.status}: ${response.statusText}`
                    })
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Fetch operation failed';
            context.state.fetchError = {
                error: errorMessage,
                url,
                method
            };
            return {
                error: () => ({
                    error: errorMessage,
                    url,
                    method,
                    type: 'network_error'
                })
            };
        }
    }
}
