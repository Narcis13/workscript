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
import * as fs from 'fs';
import * as path from 'path';
let UploadFileNode = class UploadFileNode {
    metadata = {
        name: 'uploadFile',
        description: 'Uploads a file to Google Drive',
        type: 'action',
        ai_hints: {
            purpose: 'Upload a file to Google Drive',
            when_to_use: 'When you need to upload a file from local system or content to Drive',
            expected_edges: ['success', 'error', 'config_error'],
            example_usage: 'Upload file with optional folder destination and metadata'
        }
    };
    async execute(context) {
        const { config, state } = context;
        const accessToken = state.get("google_token");
        try {
            if (!accessToken) {
                return { config_error: () => ({ error: "No Google access token found. Please connect to Google first." }) };
            }
            if (!config?.filePath && !config?.content) {
                return { config_error: () => ({ error: "Either filePath or content is required" }) };
            }
            if (!config?.fileName && config?.filePath) {
                config.fileName = path.basename(config.filePath);
            }
            if (!config?.fileName) {
                return { config_error: () => ({ error: "fileName is required when uploading content" }) };
            }
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: accessToken });
            const drive = google.drive({ version: 'v3', auth: oauth2Client });
            // Prepare file metadata
            const fileMetadata = {
                name: config.fileName
            };
            if (config.folderId) {
                fileMetadata.parents = [config.folderId];
            }
            if (config.description) {
                fileMetadata.description = config.description;
            }
            // Prepare media
            let media;
            if (config.filePath) {
                // Upload from file path
                if (!fs.existsSync(config.filePath)) {
                    return { config_error: () => ({ error: `File not found: ${config.filePath}` }) };
                }
                media = {
                    mimeType: config.mimeType || 'application/octet-stream',
                    body: fs.createReadStream(config.filePath)
                };
            }
            else if (config.content) {
                // Upload from content
                const Readable = require('stream').Readable;
                const stream = new Readable();
                stream.push(config.content);
                stream.push(null);
                media = {
                    mimeType: config.mimeType || 'text/plain',
                    body: stream
                };
            }
            // Upload file
            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink'
            });
            const file = response.data;
            const resultPayload = {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size,
                createdTime: file.createdTime,
                webViewLink: file.webViewLink,
                webContentLink: file.webContentLink,
                uploadedAt: new Date().toISOString()
            };
            state.set('lastFileUploaded', resultPayload);
            return { success: () => resultPayload };
        }
        catch (error) {
            console.error('Error in uploadFile:', error);
            return {
                error: () => ({
                    message: 'Failed to upload file to Google Drive',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
UploadFileNode = __decorate([
    RegisterNode
], UploadFileNode);
export { UploadFileNode };
export const uploadFile = new UploadFileNode();
