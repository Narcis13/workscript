import { WorkflowNode } from '@workscript/engine';
export class GoogleConnectNode extends WorkflowNode {
    metadata = {
        id: 'googleConnect',
        name: 'Google Connect',
        description: 'Connects to a Google account and fetches profile information',
        version: '1.0.0',
        inputs: ['email'],
        outputs: ['success', 'error'],
        ai_hints: {
            purpose: 'Connect to a Google account',
            when_to_use: 'When you need to connect to a Google account',
            expected_edges: ['success', 'error'],
            example_usage: 'Connect to a Google account'
        }
    };
    async execute(context, config) {
        const email = config?.email;
        console.log(`Connecting to Google account for ${email}`);
        if (!email) {
            return {
                error: () => ({
                    message: 'Error connecting to Google account - email is required'
                })
            };
        }
        const apiUrl = `http://localhost:3013/api/auth/gmail/profile?email=${encodeURIComponent(email)}`;
        context.state.lastGmailConnectAttempt = { email, apiUrl, timestamp: Date.now() };
        try {
            console.log(`Attempting to fetch from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                context.state.lastGmailConnectError = { email, timestamp: Date.now() };
                return {
                    error: () => ({
                        message: "Failed to fetch Gmail profile from the authentication service.",
                        status: response.status
                    })
                };
            }
            const data = await response.json();
            // Store results in shared state
            context.state.gmail_profile = data.profile;
            context.state.google_token = data.token;
            console.log(`Successfully connected. Profile for ${data.profile.emailAddress} and token have been stored in state.`);
            return {
                success: () => ({
                    profile: data.profile,
                    token: data.token,
                    email: data.profile.emailAddress
                })
            };
        }
        catch (error) {
            console.error('Error in googleConnect:', error);
            return {
                error: () => ({
                    message: 'Cannot connect to Google account',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
}
