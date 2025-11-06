var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
import { generateText } from 'ai';
import { getModel, convertToModelMessages, loadConversationTools } from './utils';
let ContinueConversationNode = class ContinueConversationNode {
    metadata = {
        name: 'continueConversation',
        description: 'Continue an AI conversation with context',
        type: 'action',
        ai_hints: {
            purpose: 'Maintain conversation context across multiple turns',
            when_to_use: 'For chat interfaces and multi-turn interactions',
            expected_edges: ['responded', 'toolsUsed', 'error'],
            example_usage: 'Chatbots, conversational AI, context-aware responses'
        }
    };
    async execute({ state, config }) {
        const convConfig = config;
        if (!convConfig?.model) {
            return {
                error: () => ({
                    message: 'Model is required',
                    code: 'MISSING_MODEL'
                })
            };
        }
        if (!convConfig?.userMessage) {
            return {
                error: () => ({
                    message: 'User message is required',
                    code: 'MISSING_USER_MESSAGE'
                })
            };
        }
        try {
            // Get conversation history from state
            let messages = state.get('conversation.messages') || state.get('conversationMessages') || [];
            // Ensure messages is an array
            if (!Array.isArray(messages)) {
                messages = [];
            }
            // Add the new user message
            messages.push({
                role: 'user',
                content: convConfig.userMessage
            });
            const requestParams = {
                model: getModel(convConfig.model),
                messages: convertToModelMessages(messages),
                temperature: convConfig.temperature,
                maxTokens: convConfig.maxTokens,
                maxSteps: convConfig.maxSteps || 5
            };
            // Add system prompt if provided
            if (convConfig.systemPrompt) {
                requestParams.system = convConfig.systemPrompt;
            }
            // Add tools if requested
            if (convConfig.includeTools !== false) {
                requestParams.tools = loadConversationTools();
            }
            const result = await generateText(requestParams);
            // Update conversation history with assistant response
            messages.push({
                role: 'assistant',
                content: result.text
            });
            // If tools were used, add tool messages
            if (result.toolCalls && result.toolCalls.length > 0) {
                for (const toolCall of result.toolCalls) {
                    messages.push({
                        role: 'tool',
                        content: JSON.stringify({
                            toolName: toolCall.toolName,
                            args: toolCall.args,
                            result: toolCall.result
                        })
                    });
                }
            }
            // Store updated conversation in state
            state.set('conversation', {
                messages,
                lastUpdate: Date.now(),
                turnCount: messages.filter(m => m.role === 'user').length
            });
            state.set('conversationMessages', messages); // Alternative path for backward compatibility
            // Determine which edge to return
            if (result.toolCalls && result.toolCalls.length > 0) {
                return {
                    toolsUsed: () => ({
                        assistantMessage: result.text,
                        messages,
                        toolCalls: result.toolCalls.map(tc => ({
                            toolName: tc.toolName,
                            args: tc.args,
                            result: tc.result
                        })),
                        usage: result.usage,
                        turnCount: messages.filter(m => m.role === 'user').length
                    })
                };
            }
            return {
                responded: () => ({
                    assistantMessage: result.text,
                    messages,
                    toolsUsed: false,
                    usage: result.usage,
                    turnCount: messages.filter(m => m.role === 'user').length
                })
            };
        }
        catch (error) {
            console.error('Error in continueConversation:', error);
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : String(error),
                    code: error.code || 'CONVERSATION_ERROR'
                })
            };
        }
    }
};
ContinueConversationNode = __decorate([
    RegisterNode
], ContinueConversationNode);
export { ContinueConversationNode };
export const continueConversation = new ContinueConversationNode();
