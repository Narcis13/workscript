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
let DeleteEmailNode = class DeleteEmailNode {
    metadata = {
        name: 'deleteEmail',
        description: 'Deletes an email from Gmail (moves to trash)',
        type: 'action',
        ai_hints: {
            purpose: 'Delete an email by moving it to trash',
            when_to_use: 'When you need to delete an email message',
            expected_edges: ['success', 'error', 'not_found', 'config_error'],
            example_usage: 'Delete email using message ID'
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
            // Gmail API doesn't have a delete method, we use trash instead
            await gmail.users.messages.trash({
                userId: config.userId || profile?.emailAddress || 'me',
                id: config.messageId
            });
            const resultPayload = {
                messageId: config.messageId,
                deletedAt: new Date().toISOString(),
                action: 'moved_to_trash'
            };
            state.set('lastEmailDeleted', resultPayload);
            return { success: () => resultPayload };
        }
        catch (error) {
            console.error('Error in deleteEmail:', error);
            if (error.code === 404) {
                return { not_found: () => ({ messageId: config?.messageId }) };
            }
            return {
                error: () => ({
                    message: 'Failed to delete email',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
DeleteEmailNode = __decorate([
    RegisterNode
], DeleteEmailNode);
export { DeleteEmailNode };
export const deleteEmail = new DeleteEmailNode();
