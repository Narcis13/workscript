var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
let XWaitForRateLimitNode = class XWaitForRateLimitNode {
    metadata = {
        name: 'xWaitForRateLimit',
        description: 'Wait until rate limit resets',
        type: 'action',
        ai_hints: {
            purpose: 'Handle rate limiting gracefully',
            when_to_use: 'When rate limits are hit and workflow should continue',
            expected_edges: ['limit_reset', 'timeout', 'error']
        }
    };
    async execute({ config, state }) {
        const waitConfig = config;
        const maxWaitSeconds = waitConfig?.maxWaitSeconds || 900; // Default 15 minutes
        // Get the most recent rate limit info from state
        const stateKeys = Object.keys(state.getAll());
        const rateLimitKeys = stateKeys.filter(key => key.startsWith('x_rate_limit_'));
        if (rateLimitKeys.length === 0) {
            return {
                error: () => ({
                    error: 'No rate limit information found',
                    details: 'Run xRateLimitCheck first to get rate limit status'
                })
            };
        }
        // Find the endpoint with the longest wait time
        let longestWait = 0;
        let resetAt = null;
        let limitedEndpoint = '';
        for (const key of rateLimitKeys) {
            const rateLimitInfo = state.get(key);
            if (rateLimitInfo && rateLimitInfo.remaining === 0) {
                const reset = new Date(rateLimitInfo.resetAt);
                const waitTime = reset.getTime() - Date.now();
                if (waitTime > longestWait) {
                    longestWait = waitTime;
                    resetAt = reset;
                    limitedEndpoint = rateLimitInfo.endpoint;
                }
            }
        }
        if (!resetAt || longestWait <= 0) {
            return {
                limit_reset: () => ({
                    message: 'No rate limit wait required',
                    checkedAt: new Date().toISOString()
                })
            };
        }
        const waitSeconds = Math.ceil(longestWait / 1000);
        if (waitSeconds > maxWaitSeconds) {
            return {
                timeout: () => ({
                    error: 'Wait time exceeds maximum',
                    waitRequired: waitSeconds,
                    maxWaitAllowed: maxWaitSeconds,
                    endpoint: limitedEndpoint,
                    resetAt: resetAt.toISOString()
                })
            };
        }
        try {
            console.log(`Waiting ${waitSeconds} seconds for rate limit to reset...`);
            // Wait for the rate limit to reset
            await new Promise(resolve => setTimeout(resolve, longestWait + 1000)); // Add 1 second buffer
            return {
                limit_reset: () => ({
                    message: 'Rate limit reset complete',
                    waitedSeconds: waitSeconds,
                    endpoint: limitedEndpoint,
                    resetAt: resetAt.toISOString(),
                    resumedAt: new Date().toISOString()
                })
            };
        }
        catch (error) {
            console.error('Error in xWaitForRateLimit:', error);
            return {
                error: () => ({
                    error: 'Failed during rate limit wait',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
XWaitForRateLimitNode = __decorate([
    RegisterNode
], XWaitForRateLimitNode);
export { XWaitForRateLimitNode };
export const xWaitForRateLimit = new XWaitForRateLimitNode();
