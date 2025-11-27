import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap, NodeMetadata } from '@workscript/engine';

/**
 * GoogleConnectNode - Connects to a Google account using OAuth integration
 *
 * This node supports two modes:
 * 1. **connectionId** (recommended): Uses the new integrations system with automatic token refresh
 * 2. **email** (legacy/deprecated): Uses the old API endpoint for backward compatibility
 *
 * @example Using connectionId (recommended)
 * ```json
 * {
 *   "googleConnect": {
 *     "connectionId": "cm3x7abc123...",
 *     "success?": "sendEmail"
 *   }
 * }
 * ```
 *
 * @example Using email (legacy - deprecated)
 * ```json
 * {
 *   "googleConnect": {
 *     "email": "user@gmail.com",
 *     "success?": "sendEmail"
 *   }
 * }
 * ```
 */
export class GoogleConnectNode extends WorkflowNode {
    metadata: NodeMetadata = {
        id: 'googleConnect',
        name: 'Google Connect',
        description: 'Connects to a Google account using OAuth integration with automatic token refresh',
        version: '2.0.0',
        inputs: ['connectionId', 'email'],
        outputs: ['success', 'error'],
        ai_hints: {
            purpose: 'Connect to a Google account for Gmail operations',
            when_to_use: 'When you need to authenticate with Google for sending/listing emails',
            expected_edges: ['success', 'error'],
            example_usage: '{"googleConnect": {"connectionId": "cm3x7abc123", "success?": "sendEmail"}}',
            example_config: '{"connectionId": "connection-id-from-integrations"} or {"email": "user@gmail.com"} (deprecated)',
            get_from_state: [],
            post_to_state: ['google_token', 'gmail_profile', 'current_connection_id']
        }
    };

    /**
     * Base URL for the integrations API
     * Configurable via environment variable or defaults to localhost
     */
    private getApiBaseUrl(): string {
        return process.env.API_BASE_URL || 'http://localhost:3013';
    }

    async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
        const connectionId = config?.connectionId;
        const email = config?.email;

        // Use connectionId-based approach if provided (recommended)
        if (connectionId) {
            return this.connectWithConnectionId(context, connectionId);
        }

        // Fall back to email-based approach (legacy/deprecated)
        if (email) {
            console.warn('[GoogleConnect] Using email-based lookup is deprecated. Please use connectionId instead.');
            return this.connectWithEmail(context, email);
        }

        // Neither provided - return error
        return {
            error: () => ({
                message: 'Configuration error: Either connectionId or email is required',
                hint: 'Use connectionId (recommended) from the integrations system, or email (deprecated) for legacy compatibility'
            })
        };
    }

    /**
     * Connect using the new integrations system with connectionId
     * This is the recommended approach with automatic token refresh
     */
    private async connectWithConnectionId(context: ExecutionContext, connectionId: string): Promise<EdgeMap> {
        const baseUrl = this.getApiBaseUrl();

        context.state.lastGmailConnectAttempt = {
            connectionId,
            method: 'connectionId',
            timestamp: Date.now()
        };

        try {
            // Fetch valid token from integrations API (auto-refreshes if expired)
            const tokenUrl = `${baseUrl}/integrations/connections/${connectionId}/token`;
            const tokenResponse = await fetch(tokenUrl);

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({})) as {
                    error?: string;
                    code?: string;
                    requiresReauth?: boolean;
                };

                context.state.lastGmailConnectError = {
                    connectionId,
                    timestamp: Date.now(),
                    error: errorData.error || 'Failed to get token'
                };

                return {
                    error: () => ({
                        message: errorData.error || 'Failed to retrieve access token',
                        code: errorData.code,
                        requiresReauth: errorData.requiresReauth || false,
                        connectionId
                    })
                };
            }

            const tokenData = await tokenResponse.json() as { success: boolean; token: string };

            // Fetch connection info for profile data
            const infoUrl = `${baseUrl}/integrations/connections/${connectionId}`;
            const infoResponse = await fetch(infoUrl);

            if (!infoResponse.ok) {
                // Token retrieved but info fetch failed - still usable
                console.warn('[GoogleConnect] Could not fetch connection info, proceeding with token only');

                context.state.google_token = tokenData.token;
                context.state.gmail_profile = { emailAddress: 'unknown' };
                context.state.current_connection_id = connectionId;

                return {
                    success: () => ({
                        connectionId,
                        email: 'unknown',
                        warning: 'Connection info could not be retrieved'
                    })
                };
            }

            const infoData = await infoResponse.json() as {
                success: boolean;
                connection: {
                    id: string;
                    name: string;
                    provider: string;
                    accountEmail?: string;
                    accountName?: string;
                    isActive: boolean;
                };
            };

            // Set state for downstream nodes
            context.state.google_token = tokenData.token;
            context.state.gmail_profile = {
                emailAddress: infoData.connection.accountEmail,
                displayName: infoData.connection.accountName
            };
            context.state.current_connection_id = connectionId;

            console.log(`[GoogleConnect] Successfully connected using connectionId. Account: ${infoData.connection.accountEmail}`);

            return {
                success: () => ({
                    connectionId,
                    email: infoData.connection.accountEmail,
                    name: infoData.connection.accountName,
                    provider: infoData.connection.provider
                })
            };

        } catch (error) {
            console.error('[GoogleConnect] Error connecting with connectionId:', error);

            context.state.lastGmailConnectError = {
                connectionId,
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error)
            };

            return {
                error: () => ({
                    message: 'Failed to connect to Google account',
                    details: error instanceof Error ? error.message : String(error),
                    connectionId
                })
            };
        }
    }

    /**
     * Connect using email-based lookup (legacy approach)
     * @deprecated Use connectionId-based approach instead
     */
    private async connectWithEmail(context: ExecutionContext, email: string): Promise<EdgeMap> {
        const baseUrl = this.getApiBaseUrl();
        const apiUrl = `${baseUrl}/api/auth/gmail/profile?email=${encodeURIComponent(email)}`;

        context.state.lastGmailConnectAttempt = {
            email,
            method: 'email',
            apiUrl,
            timestamp: Date.now()
        };

        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                context.state.lastGmailConnectError = { email, timestamp: Date.now() };
                return {
                    error: () => ({
                        message: 'Failed to fetch Gmail profile from the authentication service.',
                        status: response.status,
                        deprecationWarning: 'Email-based lookup is deprecated. Please migrate to connectionId-based approach.'
                    })
                };
            }

            const data = await response.json() as { profile: any; token: string };

            // Store results in shared state
            context.state.gmail_profile = data.profile;
            context.state.google_token = data.token;

            console.log(`[GoogleConnect] Successfully connected using email (deprecated). Account: ${data.profile.emailAddress}`);

            return {
                success: () => ({
                    profile: data.profile,
                    email: data.profile.emailAddress,
                    deprecationWarning: 'Email-based lookup is deprecated. Please migrate to connectionId-based approach.'
                })
            };
        } catch (error) {
            console.error('[GoogleConnect] Error connecting with email:', error);
            return {
                error: () => ({
                    message: 'Cannot connect to Google account',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
}