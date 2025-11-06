var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
import { streamText as aiStreamText } from 'ai';
import { getModel, loadTools } from './utils';
let StreamTextNode = class StreamTextNode {
    metadata = {
        name: 'streamText',
        description: 'Stream text generation for real-time responses',
        type: 'action',
        ai_hints: {
            purpose: 'Stream AI responses for better UX with long outputs',
            when_to_use: 'When generating long content or need real-time feedback',
            expected_edges: ['streaming', 'complete', 'error', 'toolCallStreaming'],
            example_usage: 'Chat interfaces, real-time content generation'
        }
    };
    async execute({ state, runtime, config }) {
        const streamConfig = config;
        if (!streamConfig?.model) {
            return {
                error: () => ({
                    message: 'Model is required',
                    code: 'MISSING_MODEL'
                })
            };
        }
        // Get prompt or messages
        let prompt = streamConfig.prompt;
        let messages = streamConfig.messages;
        if (!prompt && streamConfig.promptPath) {
            prompt = state.get(streamConfig.promptPath);
        }
        if (!messages && streamConfig.messagesPath) {
            messages = state.get(streamConfig.messagesPath);
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
            const requestParams = {
                model: getModel(streamConfig.model),
                temperature: streamConfig.temperature,
                maxTokens: streamConfig.maxTokens
            };
            // Add system prompt if provided
            if (streamConfig.systemPrompt) {
                requestParams.system = streamConfig.systemPrompt;
            }
            // Use prompt or messages
            if (prompt) {
                requestParams.prompt = prompt;
            }
            else if (messages) {
                requestParams.messages = messages;
            }
            // Add tools if provided
            if (streamConfig.tools) {
                requestParams.tools = loadTools(streamConfig.tools);
            }
            const result = await aiStreamText(requestParams);
            // Store stream reference for potential interruption
            state.set('activeAiStream', {
                streamId: runtime?.executionId || Date.now().toString(),
                model: streamConfig.model,
                startedAt: Date.now()
            });
            // Handle streaming in background
            (async () => {
                try {
                    let fullText = '';
                    let hasToolCalls = false;
                    for await (const chunk of result.textStream) {
                        fullText += chunk;
                        // Emit chunk event if runtime is available
                        if (runtime) {
                            runtime.emit({
                                type: 'ai_stream_chunk',
                                chunk,
                                accumulatedText: fullText
                            });
                        }
                        // Update state if onChunk is enabled
                        if (streamConfig.onChunk) {
                            state.set('lastStreamChunk', {
                                chunk,
                                accumulatedText: fullText,
                                timestamp: Date.now()
                            });
                        }
                    }
                    // Wait for the full response
                    const finalResult = await result.response;
                    // Check for tool calls
                    if (finalResult.toolCalls && finalResult.toolCalls.length > 0) {
                        hasToolCalls = true;
                    }
                    // Store final result
                    state.set('lastStreamResult', {
                        text: fullText,
                        finishReason: finalResult.finishReason,
                        usage: finalResult.usage,
                        toolCalls: finalResult.toolCalls,
                        model: streamConfig.model,
                        timestamp: Date.now()
                    });
                    // Emit completion event
                    if (runtime) {
                        runtime.emit({
                            type: 'ai_stream_complete',
                            text: fullText,
                            finishReason: finalResult.finishReason,
                            usage: finalResult.usage,
                            hasToolCalls
                        });
                    }
                }
                catch (streamError) {
                    console.error('Error during streaming:', streamError);
                    if (runtime) {
                        runtime.emit({
                            type: 'ai_stream_error',
                            error: streamError instanceof Error ? streamError.message : String(streamError)
                        });
                    }
                }
            })();
            return {
                streaming: () => ({
                    streamId: runtime?.executionId || Date.now().toString(),
                    startedAt: Date.now(),
                    model: streamConfig.model
                })
            };
        }
        catch (error) {
            console.error('Error in streamText:', error);
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : String(error),
                    code: error.code || 'STREAM_ERROR'
                })
            };
        }
    }
};
StreamTextNode = __decorate([
    RegisterNode
], StreamTextNode);
export { StreamTextNode };
export const streamText = new StreamTextNode();
