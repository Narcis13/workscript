var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
import { embed } from 'ai';
import { getEmbeddingModel } from './utils';
let GenerateEmbeddingNode = class GenerateEmbeddingNode {
    metadata = {
        name: 'generateEmbedding',
        description: 'Generate embeddings for text',
        type: 'action',
        ai_hints: {
            purpose: 'Convert text to vector embeddings',
            when_to_use: 'For semantic search, similarity, or RAG applications',
            expected_edges: ['success', 'error'],
            example_usage: 'Create searchable embeddings, find similar content'
        }
    };
    async execute({ state, config }) {
        const embedConfig = config;
        if (!embedConfig?.model) {
            return {
                error: () => ({
                    message: 'Model is required',
                    code: 'MISSING_MODEL'
                })
            };
        }
        // Get text
        let text = embedConfig.text;
        if (!text && embedConfig.textPath) {
            text = state.get(embedConfig.textPath);
        }
        if (!text) {
            return {
                error: () => ({
                    message: 'Text is required',
                    code: 'MISSING_TEXT'
                })
            };
        }
        // Ensure text is a string
        if (typeof text !== 'string') {
            text = JSON.stringify(text);
        }
        try {
            const requestParams = {
                model: getEmbeddingModel(embedConfig.model),
                value: text
            };
            // Add dimensions if specified
            if (embedConfig.dimensions) {
                requestParams.experimental_providerMetadata = {
                    openai: {
                        dimensions: embedConfig.dimensions
                    }
                };
            }
            const result = await embed(requestParams);
            // Store result in state
            state.set('lastEmbedding', {
                embedding: result.embedding,
                usage: result.usage,
                model: embedConfig.model,
                textLength: text.length,
                dimensions: result.embedding.length,
                timestamp: Date.now()
            });
            return {
                success: () => ({
                    embedding: result.embedding,
                    usage: result.usage,
                    dimensions: result.embedding.length,
                    textLength: text.length
                })
            };
        }
        catch (error) {
            console.error('Error in generateEmbedding:', error);
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : String(error),
                    code: error.code || 'EMBEDDING_ERROR'
                })
            };
        }
    }
};
GenerateEmbeddingNode = __decorate([
    RegisterNode
], GenerateEmbeddingNode);
export { GenerateEmbeddingNode };
export const generateEmbedding = new GenerateEmbeddingNode();
