var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
import { generateObject } from 'ai';
import { getModel } from './utils';
import { z } from 'zod';
let AiTranslatorNode = class AiTranslatorNode {
    metadata = {
        name: 'aiTranslator',
        description: 'Translate text between languages',
        type: 'action',
        ai_hints: {
            purpose: 'Language translation with context awareness',
            when_to_use: 'For multilingual content processing',
            expected_edges: ['translated', 'unsupportedLanguage', 'error'],
            example_usage: 'Document translation, chat translation'
        }
    };
    async execute({ state, config }) {
        const transConfig = config;
        if (!transConfig?.model) {
            return {
                error: () => ({
                    message: 'Model is required',
                    code: 'MISSING_MODEL'
                })
            };
        }
        if (!transConfig?.targetLang) {
            return {
                error: () => ({
                    message: 'Target language is required',
                    code: 'MISSING_TARGET_LANG'
                })
            };
        }
        // Get text
        let text = transConfig.text;
        if (!text && transConfig.textPath) {
            text = state.get(transConfig.textPath);
        }
        if (!text) {
            return {
                error: () => ({
                    message: 'Text is required',
                    code: 'MISSING_TEXT'
                })
            };
        }
        try {
            // Define schema based on whether formatting should be preserved
            const schema = transConfig.preserveFormatting
                ? z.object({
                    translation: z.string(),
                    detectedSourceLang: z.string().optional(),
                    preservedElements: z.array(z.object({
                        type: z.string(),
                        original: z.string(),
                        translated: z.string()
                    })).optional(),
                    confidence: z.number().min(0).max(1),
                    notes: z.string().optional()
                })
                : z.object({
                    translation: z.string(),
                    detectedSourceLang: z.string().optional(),
                    confidence: z.number().min(0).max(1),
                    notes: z.string().optional()
                });
            // Build translation prompt
            let prompt = `Translate the following text from ${transConfig.sourceLang || 'auto-detect'} to ${transConfig.targetLang}.\n`;
            if (transConfig.tone) {
                prompt += `Tone: ${transConfig.tone}\n`;
            }
            if (transConfig.preserveFormatting) {
                prompt += `Preserve formatting elements like URLs, email addresses, code blocks, and special formatting.\n`;
                prompt += `List any preserved elements separately.\n`;
            }
            prompt += `Provide a confidence score (0-1) for the translation quality.\n`;
            prompt += `If the source language is auto-detected, specify it.\n\n`;
            prompt += `Text to translate:\n${text}`;
            const result = await generateObject({
                model: getModel(transConfig.model),
                schema,
                prompt,
                temperature: transConfig.temperature || 0.3
            });
            // Check for unsupported language scenarios
            if (result.object.confidence < 0.3) {
                return {
                    unsupportedLanguage: () => ({
                        message: 'Low confidence translation - language may be unsupported',
                        sourceLang: result.object.detectedSourceLang || transConfig.sourceLang || 'unknown',
                        targetLang: transConfig.targetLang,
                        confidence: result.object.confidence,
                        attemptedTranslation: result.object.translation
                    })
                };
            }
            // Store translation in state
            state.set('lastTranslation', {
                original: text,
                translation: result.object.translation,
                sourceLang: result.object.detectedSourceLang || transConfig.sourceLang || 'auto-detected',
                targetLang: transConfig.targetLang,
                confidence: result.object.confidence,
                preservedElements: result.object.preservedElements,
                model: transConfig.model,
                timestamp: Date.now()
            });
            return {
                translated: () => ({
                    translation: result.object.translation,
                    sourceLang: result.object.detectedSourceLang || transConfig.sourceLang || 'detected',
                    targetLang: transConfig.targetLang,
                    confidence: result.object.confidence,
                    preservedElements: result.object.preservedElements,
                    notes: result.object.notes
                })
            };
        }
        catch (error) {
            console.error('Error in aiTranslator:', error);
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : String(error),
                    code: error.code || 'TRANSLATION_ERROR'
                })
            };
        }
    }
};
AiTranslatorNode = __decorate([
    RegisterNode
], AiTranslatorNode);
export { AiTranslatorNode };
export const aiTranslator = new AiTranslatorNode();
