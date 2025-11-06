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
import { getModel, parseSchema } from './utils';
let AiDataExtractorNode = class AiDataExtractorNode {
    metadata = {
        name: 'aiDataExtractor',
        description: 'Extract structured data from unstructured text',
        type: 'action',
        ai_hints: {
            purpose: 'Parse and extract specific data from text',
            when_to_use: 'For data mining and information extraction',
            expected_edges: ['extracted', 'noData', 'error'],
            example_usage: 'Extract emails, dates, entities from documents'
        }
    };
    async execute({ state, config }) {
        const extractConfig = config;
        if (!extractConfig?.model) {
            return {
                error: () => ({
                    message: 'Model is required',
                    code: 'MISSING_MODEL'
                })
            };
        }
        if (!extractConfig?.extractionSchema) {
            return {
                error: () => ({
                    message: 'Extraction schema is required',
                    code: 'MISSING_SCHEMA'
                })
            };
        }
        // Get text
        let text = extractConfig.text;
        if (!text && extractConfig.textPath) {
            text = state.get(extractConfig.textPath);
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
            // Parse schema
            const parsedSchema = parseSchema(extractConfig.extractionSchema);
            // Build extraction prompt
            let prompt = `Extract the following information from this text:\n\n`;
            prompt += `Text: ${text}\n\n`;
            prompt += `Please extract all relevant data according to the schema. If a field cannot be found, set it to null.`;
            const requestParams = {
                model: getModel(extractConfig.model),
                schema: parsedSchema,
                prompt,
                temperature: extractConfig.temperature || 0.1 // Low temperature for accuracy
            };
            if (extractConfig.systemPrompt) {
                requestParams.system = extractConfig.systemPrompt;
            }
            const result = await generateObject(requestParams);
            // Check if any data was extracted
            const hasData = Object.values(result.object).some(value => value !== null &&
                value !== undefined &&
                value !== '' &&
                (Array.isArray(value) ? value.length > 0 : true));
            if (!hasData) {
                return {
                    noData: () => ({
                        message: 'No relevant data found in text',
                        textLength: text.length,
                        schema: extractConfig.extractionSchema
                    })
                };
            }
            // Store extracted data in state
            state.set('lastExtractedData', {
                data: result.object,
                sourceTextLength: text.length,
                usage: result.usage,
                model: extractConfig.model,
                timestamp: Date.now()
            });
            // Calculate extraction confidence based on how many fields were extracted
            const totalFields = Object.keys(result.object).length;
            const extractedFields = Object.values(result.object).filter(v => v !== null && v !== undefined && v !== '').length;
            const confidence = totalFields > 0 ? extractedFields / totalFields : 0;
            return {
                extracted: () => ({
                    data: result.object,
                    confidence,
                    extractedFields,
                    totalFields,
                    usage: result.usage
                })
            };
        }
        catch (error) {
            console.error('Error in aiDataExtractor:', error);
            return {
                error: () => ({
                    message: error instanceof Error ? error.message : String(error),
                    code: error.code || 'EXTRACTION_ERROR'
                })
            };
        }
    }
};
AiDataExtractorNode = __decorate([
    RegisterNode
], AiDataExtractorNode);
export { AiDataExtractorNode };
export const aiDataExtractor = new AiDataExtractorNode();
