import { WorkflowNode } from '@workscript/engine';
export class LogInputNode extends WorkflowNode {
    metadata = {
        id: 'log-input',
        name: 'Log Input Node',
        version: '1.0.0',
        description: 'A node that logs context.inputs',
        inputs: [],
        outputs: []
    };
    async execute(context) {
        console.log('Logging context.inputs:', context);
        return {
            nothing: () => ({})
        };
    }
}
export default LogInputNode;
