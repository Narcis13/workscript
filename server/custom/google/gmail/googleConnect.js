var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../../core/types/node';
import { ExecutionContext } from '../../../../core/types/context';
import { RegisterNode } from '../../../registry';
let GoogleConnectNode = class GoogleConnectNode {
    metadata = {
        name: 'googleConnect',
        description: 'Connects to a Google account',
        type: 'action',
        ai_hints: {
            purpose: 'Connect to a Google account',
            when_to_use: 'When you need to connect to a Google account',
            expected_edges: ['success', 'error'],
            example_usage: 'Connect to a Google account'
        }
    };
    async execute({ config, state }) {
        const email = config?.email;
        console.log(`Connecting to Google account for ${email}`);
        if (!email) {
            return {
                error: () => ({
                    message: 'Error connecting to Google account'
                })
            };
        }
        const apiUrl = `http://localhost:3013/api/auth/gmail/profile?email=${encodeURIComponent(email)}`;
        state.set('lastGmailConnectAttempt', { email, apiUrl, timestamp: Date.now() });
        try {
            console.log(`Attempting to fetch from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                state.set('lastGmailConnectError', { email, timestamp: Date.now() });
                return {
                    error: () => ({
                        message: "Failed to fetch Gmail profile from the authentication service.",
                        status: response.status
                    })
                };
            }
            const data = await response.json();
            state.set("gmail_profile", data.profile);
            state.set("google_token", data.token);
            console.log(`Successfully connected. Profile for ${data.profile.emailAddress} and token have been stored in state.`);
            return { success: () => data };
        }
        catch (error) {
            console.error('Error in googleConnect:', error);
            return {
                error: () => ({
                    message: 'Cannot connecting to Google account',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
GoogleConnectNode = __decorate([
    RegisterNode
], GoogleConnectNode);
export { GoogleConnectNode };
export const googleConnect = new GoogleConnectNode();
