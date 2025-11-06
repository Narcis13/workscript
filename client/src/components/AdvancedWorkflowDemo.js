import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './ui/button';
import { useWorkflowService } from '../hooks/useWorkflowService';
export function AdvancedWorkflowDemo() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    // Use the new workflow service hook for automatic node discovery and service management
    const { service, initialized, executeWorkflow: executeWorkflowService, } = useWorkflowService();
    const executeWorkflow = async () => {
        if (!service || !initialized) {
            setResult({
                error: 'Workflow service not initialized',
                status: 'failed'
            });
            return;
        }
        setLoading(true);
        try {
            const workflowDefinition = {
                id: 'client-demo',
                name: 'Client Workflow Demo',
                version: '1.0.0',
                description: 'Demo workflow that creates a container and renders a button inside it',
                initialState: {
                    developer: 'Narcis Brindusescu'
                },
                workflow: [
                    {
                        'container': {
                            containerId: 'my-workflow-container',
                            className: 'custom-container-class',
                            'rendered?': [{
                                    'button': {
                                        caption: 'Click Me!',
                                        variant: 'default',
                                        size: 'lg',
                                        onClick: ['log-input', 'empty']
                                    }
                                },
                                {
                                    'button': {
                                        caption: 'Another one!',
                                        variant: 'default',
                                        size: 'lg'
                                    }
                                }
                            ]
                        }
                    }
                    //    'log-input',
                    //   'empty'
                ]
            };
            // Execute workflow using the service (no manual engine setup needed!)
            const executionResult = await executeWorkflowService(workflowDefinition);
            setResult(executionResult);
        }
        catch (error) {
            setResult({
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 'failed'
            });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-6", children: [_jsx("h2", { className: "text-3xl font-bold mb-4", children: "Advanced Client Workflow " }), _jsx(Button, { onClick: executeWorkflow, disabled: loading || !initialized, className: "mb-6", children: loading ? 'Executing...' : 'Run Container Workflow' }), result && (_jsxs("div", { className: "mt-4 p-4 bg-gray-100 rounded-lg", children: [_jsx("h3", { className: "font-semibold mb-2", children: "Workflow Result:" }), _jsx("pre", { className: "text-sm overflow-auto", children: JSON.stringify(result, null, 2) })] })), _jsx("div", { id: "advanced-workflow-demo", className: "mt-6" })] }));
}
