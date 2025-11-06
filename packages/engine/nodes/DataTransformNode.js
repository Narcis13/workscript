import { WorkflowNode } from '../src/types';
export class DataTransformNode extends WorkflowNode {
    metadata = {
        id: 'transform',
        name: 'Data Transform',
        version: '1.0.0',
        description: 'Universal data transformation node - transforms data between formats',
        inputs: ['operation', 'data'],
        outputs: ['result'],
        ai_hints: {
            purpose: 'Transform data between different formats and apply string/array operations',
            when_to_use: 'When you need to convert JSON, change text case, trim strings, get lengths, or reverse arrays/strings',
            expected_edges: ['success', 'error'],
            example_usage: '{"transform-1": {"operation": "stringify", "data": {"key": "value"}, "success?": "next-node"}}',
            example_config: '{"operation": "stringify|parse|uppercase|lowercase|trim|length|reverse", "data": "any"}',
            get_from_state: [],
            post_to_state: ['transformResult']
        }
    };
    async execute(context, config) {
        const { operation, data } = config || {};
        if (!operation || data === undefined) {
            return {
                error: () => ({ error: 'Missing operation or data' })
            };
        }
        let result;
        try {
            switch (operation) {
                case 'stringify':
                    result = JSON.stringify(data);
                    break;
                case 'parse':
                    result = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                case 'uppercase':
                    result = typeof data === 'string' ? data.toUpperCase() : String(data).toUpperCase();
                    break;
                case 'lowercase':
                    result = typeof data === 'string' ? data.toLowerCase() : String(data).toLowerCase();
                    break;
                case 'trim':
                    result = typeof data === 'string' ? data.trim() : String(data).trim();
                    break;
                case 'length':
                    result = Array.isArray(data) ? data.length : String(data).length;
                    break;
                case 'reverse':
                    result = Array.isArray(data) ? [...data].reverse() : String(data).split('').reverse().join('');
                    break;
                default:
                    return {
                        error: () => ({ error: `Unknown operation: ${operation}` })
                    };
            }
            context.state.transformResult = result;
            return {
                success: () => ({ result })
            };
        }
        catch (error) {
            return {
                error: () => ({ error: error instanceof Error ? error.message : 'Data transformation failed' })
            };
        }
    }
}
export default DataTransformNode;
