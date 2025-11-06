var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
import { generateObject as aiGenerateObject } from 'ai';
import { getModel, parseSchema } from './utils';
import { z } from 'zod';
let GenerateObjectNode = class GenerateObjectNode {
    metadata = {
        name: 'generateObject',
        description: 'Generate structured JSON objects using AI',
        type: 'action',
        ai_hints: {
            purpose: 'Generate validated structured data from AI',
            when_to_use: 'When you need AI to output specific data structures',
            expected_edges: ['success', 'validationError', 'error'],
            example_usage: 'Extract structured info, generate forms, create data models'
        }
    };
    async execute({ state, config }) {
        const objConfig = config;
        if (!objConfig?.model) {
            return {
                error: () => ({
                    message: 'Model is required',
                    code: 'MISSING_MODEL'
                })
            };
        }
        if (!objConfig?.schema) {
            return {
                error: () => ({
                    message: 'Schema is required',
                    code: 'MISSING_SCHEMA'
                })
            };
        }
        // Get prompt or messages
        let prompt = objConfig.prompt;
        let messages = objConfig.messages;
        if (!prompt && objConfig.promptPath) {
            prompt = state.get(objConfig.promptPath);
        }
        if (!messages && objConfig.messagesPath) {
            messages = state.get(objConfig.messagesPath);
        }
        if (!prompt && !messages) {
            return {
                error: () => ({
                    message: 'Either prompt or messages is required',
                    code: 'MISSING_INPUT'
                })
            };
        }
        try {
            // Parse schema
            const parsedSchema = parseSchema(objConfig.schema);
            const requestParams = {
                model: getModel(objConfig.model),
                schema: parsedSchema,
                temperature: objConfig.temperature,
                maxTokens: objConfig.maxTokens,
                mode: objConfig.mode || 'auto'
            };
            // Add system prompt if provided
            if (objConfig.systemPrompt) {
                requestParams.system = objConfig.systemPrompt;
            }
            // Use prompt or messages
            if (prompt) {
                requestParams.prompt = prompt;
            }
            else if (messages) {
                requestParams.messages = messages;
            }
            const result = await aiGenerateObject(requestParams);
            // Store result in state
            state.set('lastAiObject', {
                object: result.object,
                usage: result.usage,
                finishReason: result.finishReason,
                model: objConfig.model,
                timestamp: Date.now()
            });
            return {
                success: () => ({
                    object: result.object,
                    usage: result.usage,
                    finishReason: result.finishReason
                })
            };
        }
        catch (error) {
            console.error('Error in generateObject:', error);
            // Check if it's a validation error
            if (error instanceof z.ZodError) {
                return {
                    validationError: () => ({
                        message: 'Schema validation failed',
                        errors: error.errors.map(e => ({
                            path: e.path.join('.'),
                            message: e.message
                        }))
                    })
                };
            }
            // Check for validation errors in the AI SDK
            if (error.type === 'validation' || error.code === 'VALIDATION_ERROR') {
                return {
                    validationError: () => ({
                        message: error instanceof Error ? error.message : 'Validation failed',
                        errors: error.errors || []
                    })
                };
            }
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : String(error),
                    code: error.code || 'GENERATION_ERROR'
                })
            };
        }
    }
};
GenerateObjectNode = __decorate([
    RegisterNode
], GenerateObjectNode);
export { GenerateObjectNode };
export const generateObject = new GenerateObjectNode();
