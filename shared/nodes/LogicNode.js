import { WorkflowNode } from '../src/types';
export class LogicNode extends WorkflowNode {
    metadata = {
        id: 'logic',
        name: 'Logic Operations',
        version: '1.0.0',
        description: 'Universal logic node - performs boolean logic operations',
        inputs: ['operation', 'values'],
        outputs: ['result'],
        ai_hints: {
            purpose: 'Perform boolean logic operations and comparisons',
            when_to_use: 'When you need conditional branching based on boolean logic (and, or, not) or value comparisons (equal, greater, less)',
            expected_edges: ['true', 'false', 'error'],
            example_usage: '{"logic-1": {"operation": "equal", "values": [10, 10], "true?": "success-path", "false?": "failure-path"}}',
            example_config: '{"operation": "and|or|not|equal|greater|less", "values": "[any, ...]"}',
            get_from_state: [],
            post_to_state: ['logicResult']
        }
    };
    async execute(context, config) {
        const { operation, values } = config || {};
        if (!operation || !values) {
            return {
                error: () => ({ error: 'Missing operation or values' })
            };
        }
        let result;
        try {
            switch (operation) {
                case 'and':
                    result = values.every((value) => Boolean(value));
                    break;
                case 'or':
                    result = values.some((value) => Boolean(value));
                    break;
                case 'not':
                    result = !Boolean(values[0]);
                    break;
                case 'equal':
                    result = values.length > 1 && values[0] === values[1];
                    break;
                case 'greater':
                    result = values.length > 1 && values[0] > values[1];
                    break;
                case 'less':
                    result = values.length > 1 && values[0] < values[1];
                    break;
                default:
                    return {
                        error: () => ({ error: `Unknown operation: ${operation}` })
                    };
            }
            context.state.logicResult = result;
            return {
                [result ? 'true' : 'false']: () => ({ result })
            };
        }
        catch (error) {
            return {
                error: () => ({ error: error instanceof Error ? error.message : 'Logic operation failed' })
            };
        }
    }
}
export default LogicNode;
