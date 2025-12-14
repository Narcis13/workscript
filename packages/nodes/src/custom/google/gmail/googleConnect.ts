import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap, NodeMetadata } from '@workscript/engine';

/**
 * GoogleConnectNode - Connects to a Google account using OAuth integration
 *
 * This node supports two modes:
 * 1. **connectionId**: Uses the connection ID directly from the integrations system
 * 2. **email**: Looks up the connection by email address (resolves to connectionId internally)
 *
 * Both approaches use the new integrations system with automatic token refresh.
 *
 * @example Using connectionId
 * ```json
 * {
 *   "googleConnect": {
 *     "connectionId": "cm3x7abc123...",
 *     "success?": "sendEmail"
 *   }
 * }
 * ```
 *
 * @example Using email (recommended for readability)
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
            example_config: '{"connectionId": "connection-id"} or {"email": "user@gmail.com"} (resolves to connectionId)',
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

        // Resolve email to connectionId via integrations API
        if (email) {
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
     * Connect using email-based lookup
     * Resolves email to connectionId via the integrations API, then uses connectionId flow
     */
    private async connectWithEmail(context: ExecutionContext, email: string): Promise<EdgeMap> {
        const baseUrl = this.getApiBaseUrl();

        context.state.lastGmailConnectAttempt = {
            email,
            method: 'email-to-connectionId',
            timestamp: Date.now()
        };

        try {
            // Fetch all Google connections from integrations API
            const connectionsUrl = `${baseUrl}/integrations/connections?provider=google`;
            const response = await fetch(connectionsUrl);

            if (!response.ok) {
                context.state.lastGmailConnectError = { email, timestamp: Date.now() };
                return {
                    error: () => ({
                        message: 'Failed to fetch connections from integrations API',
                        status: response.status
                    })
                };
            }

            const data = await response.json() as {
                success: boolean;
                count: number;
                connections: Array<{
                    id: string;
                    name: string;
                    provider: string;
                    accountEmail: string;
                    accountName?: string;
                    isActive: boolean;
                    createdAt: string | Date;
                }>;
            };

            // Find ALL connections matching the email
            const matchingConnections = data.connections.filter(
                (conn) => conn.accountEmail?.toLowerCase() === email.toLowerCase()
            );

            if (matchingConnections.length === 0) {
                context.state.lastGmailConnectError = { email, timestamp: Date.now() };
                return {
                    error: () => ({
                        message: `No Google connection found for email: ${email}`,
                        hint: `Please connect your Google account first via: ${baseUrl}/integrations/oauth/google/auth`,
                        availableEmails: data.connections.map(c => c.accountEmail)
                    })
                };
            }

            // Sort connections: prefer active ones first, then by newest creation date
            matchingConnections.sort((a, b) => {
                // Active connections come first
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                // Among same status, prefer newest (by createdAt descending)
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            // Pick the best connection (active + newest)
            const connection = matchingConnections[0];

            if (!connection.isActive) {
                return {
                    error: () => ({
                        message: `Google connection for ${email} is inactive. Re-authentication required.`,
                        connectionId: connection.id,
                        requiresReauth: true,
                        reauthUrl: `${baseUrl}/integrations/oauth/google/auth`
                    })
                };
            }

            console.log(`[GoogleConnect] Resolved email '${email}' to connectionId '${connection.id}'`);

            // Delegate to connectionId-based flow
            return this.connectWithConnectionId(context, connection.id);

        } catch (error) {
            console.error('[GoogleConnect] Error resolving email to connectionId:', error);
            context.state.lastGmailConnectError = {
                email,
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error)
            };
            return {
                error: () => ({
                    message: 'Failed to resolve email to connection',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
}