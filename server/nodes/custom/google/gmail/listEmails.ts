// List emails from Gmail account
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap, NodeMetadata } from 'shared';
import { google } from 'googleapis';

export class ListEmailsNode extends WorkflowNode {
    metadata: NodeMetadata = {
        id: 'listEmails',
        name: 'List Gmail Emails',
        description: 'Lists emails from a Gmail account with optional filtering and detailed retrieval',
        version: '1.0.0',
        inputs: ['userId', 'mailbox', 'query', 'labelIds', 'maxResults', 'pageToken', 'includeSpamTrash', 'getFullDetails'],
        outputs: ['success', 'error', 'config_error', 'no_results'],
        ai_hints: {
            purpose: 'List emails from a Gmail account',
            when_to_use: 'When you need to retrieve a list of emails from a Gmail account',
            expected_edges: ['success', 'error', 'config_error', 'no_results'],
            example_usage: 'List emails from a Gmail account. Use mailbox parameter to specify "inbox", "sent", "drafts", "spam", "trash", or "all". Advanced users can use labelIds directly for custom label filtering.'
        }
    }

    async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
      //  console.log('========== ListEmailsNode.execute() START ==========');
      //  console.log('Config:', config);
        
        const accessToken = context.state.google_token;
        const profile = context.state.gmail_profile;
        
     //   console.log('Access token:', accessToken ? 'present' : 'missing');
      //  console.log('Profile:', profile);
      //  console.log(`Listing emails for user: ${profile?.emailAddress || 'unknown'}`);

        interface EmailHeader {
            name?: string | null | undefined;
            value?: string | null | undefined;
        }

        const findHeader = (headers: EmailHeader[] | undefined, name: string): string => {
            const header = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
            return header?.value || '';
        };

        try {
           // console.log('Inside try block');
            if (!accessToken) {
                console.log('No access token found, returning config_error');
                return { config_error: () => ({ error: "Configuration Error - No access token found" }) };
            }

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
                            format: 'metadata',
                            metadataHeaders: ['From', 'Subject', 'Date'],
                        })
                    );

                const detailedResponses = await Promise.all(detailPromises);

                finalEmails = detailedResponses.map(res => {
                    const message = res.data;
                    const headers = message?.payload?.headers;
                    return {
                        id: message.id,
                        threadId: message.threadId,
                        from: findHeader(headers, 'From'),
                        subject: findHeader(headers, 'Subject'),
                        date: findHeader(headers, 'Date'),
                        snippet: message.snippet,
                    };
                });
            }

            const resultPayload = {
                emails: finalEmails,
                nextPageToken: listResponse.data.nextPageToken || null,
                resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
            };

            context.state.lastGmailListAttempt = JSON.stringify({ 
                status: 'success', 
                resultsCount: finalEmails.length ,
                resultPayload
            });
            
          //  console.log(finalEmails[0]);
            return { success: () => resultPayload };

        } catch (error) {
            console.error('Error in listEmails:', error);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            return {
                error: () => ({
                    message: 'Cannot list emails from Gmail account',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
}