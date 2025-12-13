// List emails from Gmail account
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap, NodeMetadata } from '@workscript/engine';
import { google } from 'googleapis';

export class ListEmailsNode extends WorkflowNode {
    metadata: NodeMetadata = {
        id: 'listEmails',
        name: 'List Gmail Emails',
        description: 'Lists emails from a Gmail account with optional filtering and detailed retrieval',
        version: '1.0.0',
        inputs: ['userId', 'mailbox', 'query', 'labelIds', 'maxResults', 'pageToken', 'includeSpamTrash', 'getFullDetails'],
        outputs: ['emails', 'nextPageToken', 'resultSizeEstimate', 'error', 'message', 'details', 'body'],
        ai_hints: {
            purpose: 'List emails from a Gmail account with optional filtering and detailed retrieval',
            when_to_use: 'When you need to retrieve a list of emails from a Gmail account',
            expected_edges: ['success', 'error', 'config_error', 'no_results'],
            get_from_state: ['google_token', 'gmail_profile'],
            post_to_state: ['lastGmailListAttempt'],
            example_config: '{"mailbox": "inbox|sent|drafts|spam|trash|all", "maxResults?": "number (default 25)", "getFullDetails?": "boolean", "query?": "string (Gmail search syntax)", "labelIds?": "string[]", "includeSpamTrash?": "boolean"}',
            example_usage: '{"listEmails": {"mailbox": "inbox", "maxResults": 10, "getFullDetails": true, "success?": "process-emails", "no_results?": "handle-empty", "config_error?": "auth-error", "error?": "log-error"}}'
        }
    }

    async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
        const accessToken = context.state.google_token;
        const profile = context.state.gmail_profile;

        // Validation before try-catch
        if (!accessToken) {
            return { config_error: () => ({ error: "Configuration Error - No access token found", nodeId: context.nodeId }) };
        }

        interface EmailHeader {
            name?: string | null | undefined;
            value?: string | null | undefined;
        }

        const findHeader = (headers: EmailHeader[] | undefined, name: string): string => {
            const header = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
            return header?.value || '';
        };

        // Helper to decode base64 URL-safe encoded content
        const decodeBase64 = (data: string | null | undefined): string => {
            if (!data) return '';
            // Gmail uses URL-safe base64, replace chars and decode
            const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
            try {
                return Buffer.from(base64, 'base64').toString('utf-8');
            } catch {
                return '';
            }
        };

        // Helper to extract email body from payload
        const extractBody = (payload: any): { text: string; html: string } => {
            const result = { text: '', html: '' };

            if (!payload) return result;

            // Simple message with body directly in payload
            if (payload.body?.data) {
                const mimeType = payload.mimeType || '';
                const decoded = decodeBase64(payload.body.data);
                if (mimeType.includes('text/html')) {
                    result.html = decoded;
                } else {
                    result.text = decoded;
                }
            }

            // Multipart message - recursively search parts
            if (payload.parts && Array.isArray(payload.parts)) {
                for (const part of payload.parts) {
                    const mimeType = part.mimeType || '';

                    if (part.body?.data) {
                        const decoded = decodeBase64(part.body.data);
                        if (mimeType === 'text/plain' && !result.text) {
                            result.text = decoded;
                        } else if (mimeType === 'text/html' && !result.html) {
                            result.html = decoded;
                        }
                    }

                    // Nested multipart (e.g., multipart/alternative inside multipart/mixed)
                    if (part.parts) {
                        const nested = extractBody(part);
                        if (!result.text && nested.text) result.text = nested.text;
                        if (!result.html && nested.html) result.html = nested.html;
                    }
                }
            }

            return result;
        };

        try {

            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: accessToken });
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Map user-friendly mailbox parameter to Gmail labelIds
            let labelIds = config?.labelIds;
            if (config?.mailbox && !labelIds) {
                const mailboxMap: Record<string, string[]> = {
                    'inbox': ['INBOX'],
                    'sent': ['SENT'],
                    'drafts': ['DRAFT'],
                    'spam': ['SPAM'],
                    'trash': ['TRASH'],
                    'all': undefined as any, // Explicitly fetch all
                };

                const mailboxLower = config.mailbox.toLowerCase();
                if (mailboxMap[mailboxLower] !== undefined) {
                    labelIds = mailboxMap[mailboxLower];
                } else {
                    console.warn(`Unknown mailbox value: ${config.mailbox}. Using default (all emails).`);
                }
            }

            const requestParams = {
                userId: config?.userId || profile?.emailAddress || "me",
                q: config?.query,
                labelIds: labelIds,
                maxResults: config?.maxResults || 25,
                pageToken: config?.pageToken,
                includeSpamTrash: config?.includeSpamTrash || false,
            };

            // Remove undefined values
            Object.keys(requestParams).forEach(key =>
                requestParams[key as keyof typeof requestParams] === undefined &&
                delete requestParams[key as keyof typeof requestParams]
            );

            const listResponse = await gmail.users.messages.list(requestParams);
            const messageStubs = listResponse.data.messages || [];

            if (messageStubs.length === 0) {
                console.log('No emails found for query.');
                return { 
                    no_results: () => ({ 
                        emails: [], 
                        nextPageToken: null, 
                        resultSizeEstimate: 0 
                    }) 
                };
            }

            let finalEmails = messageStubs;

            // Get full details if requested
            if (config?.getFullDetails) {
                const detailPromises = messageStubs
                    .filter(stub => stub.id != null)
                    .map(stub =>
                        gmail.users.messages.get({
                            userId: requestParams.userId,
                            id: stub.id!,
                            format: 'full',
                        })
                    );

                const detailedResponses = await Promise.all(detailPromises);

                finalEmails = detailedResponses.map(res => {
                    const message = res.data;
                    const headers = message?.payload?.headers;
                    const body = extractBody(message?.payload);
                    return {
                        id: message.id,
                        threadId: message.threadId,
                        from: findHeader(headers, 'From'),
                        subject: findHeader(headers, 'Subject'),
                        date: findHeader(headers, 'Date'),
                        snippet: message.snippet,
                        body: body.text || body.html,
                        bodyText: body.text,
                        bodyHtml: body.html,
                    };
                });
            }

            const resultPayload = {
                emails: finalEmails,
                nextPageToken: listResponse.data.nextPageToken || null,
                resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
            };

            context.state.lastGmailListAttempt = {
                status: 'success',
                resultsCount: finalEmails.length,
                resultPayload
            };

            return { success: () => resultPayload };

        } catch (error) {
            console.error('Error in listEmails:', error);
            return {
                error: () => ({
                    message: 'Cannot list emails from Gmail account',
                    details: error instanceof Error ? error.message : String(error),
                    nodeId: context.nodeId
                })
            };
        }
    }
}

export default ListEmailsNode;