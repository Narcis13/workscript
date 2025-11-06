var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../../core/types/node';
import { ExecutionContext } from '../../../../core/types/context';
import { RegisterNode } from '../../../registry';
import { google } from 'googleapis';
let MarkAsUnreadNode = class MarkAsUnreadNode {
    metadata = {
        name: 'markAsUnread',
        description: 'Marks an email as unread in Gmail',
        type: 'action',
        ai_hints: {
            purpose: 'Mark an email message as unread',
            when_to_use: 'When you need to mark an email as unread',
            expected_edges: ['success', 'error', 'not_found', 'config_error'],
            example_usage: 'Mark email as unread using message ID'
        }
    };
    async execute(context) {
        const { config, state } = context;
        const accessToken = state.get("google_token");
        const profile = state.get("gmail_profile");
        try {
            if (!accessToken) {
                return { config_error: () => ({ error: "No Google access token found. Please connect to Google first." }) };
            }
            if (!config?.messageId) {
                return { config_error: () => ({ error: "Message ID is required" }) };
            }
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: accessToken });
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            // Add the UNREAD label to mark as unread
            await gmail.users.messages.modify({
                userId: config.userId || profile?.emailAddress || 'me',
                id: config.messageId,
                requestBody: {
                    addLabelIds: ['UNREAD']
                }
            });
            const resultPayload = {
                messageId: config.messageId,
                markedAsUnreadAt: new Date().toISOString()
            };
            state.set('lastEmailMarkedAsUnread', resultPayload);
            return { success: () => resultPayload };
        }
        catch (error) {
            console.error('Error in markAsUnread:', error);
            if (error.code === 404) {
                return { not_found: () => ({ messageId: config?.messageId }) };
            }
            return {
                error: () => ({
                    message: 'Failed to mark email as unread',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
MarkAsUnreadNode = __decorate([
    RegisterNode
], MarkAsUnreadNode);
export { MarkAsUnreadNode };
export const markAsUnread = new MarkAsUnreadNode();
