import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './ui/button';
import { useWorkflowService } from '../hooks/useWorkflowService';
export function WorkflowDemo() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    // Use the new workflow service hook for automatic node discovery and service management
    const { service, loading: serviceLoading, error: serviceError, initialized, executeWorkflow: executeWorkflowService, getServiceInfo } = useWorkflowService();
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
                description: 'Demo workflow running in browser with client nodes',
                initialState: {
                    developer: 'Narcis Brindusescu'
                },
                workflow: [
                    'empty',
                    'log-input',
                    { '$.author': { 'name': 'Narcis Brindusescu' } },
                    'log'
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
    // Show loading state while service initializes
    if (serviceLoading) {
        return (_jsxs("div", { className: "max-w-2xl mx-auto p-6", children: [_jsx("h2", { className: "text-3xl font-bold mb-4", children: "Client Workflow Engine Demo" }), _jsxs("div", { className: "flex items-center gap-2 mb-6", children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" }), _jsx("span", { className: "text-gray-600", children: "Initializing workflow service..." })] })] }));
    }
    // Show error state if service failed to initialize
    if (serviceError) {
        return (_jsxs("div", { className: "max-w-2xl mx-auto p-6", children: [_jsx("h2", { className: "text-3xl font-bold mb-4", children: "Client Workflow Engine Demo" }), _jsxs("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6", children: [_jsx("strong", { className: "font-bold", children: "Service Initialization Error:" }), _jsxs("span", { className: "block sm:inline", children: [" ", serviceError.message] })] })] }));
    }
    // Get service information for display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceInfo = getServiceInfo();
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-6", children: [_jsx("h2", { className: "text-3xl font-bold mb-4", children: "Client Workflow Engine Demo" }), _jsx("p", { className: "mb-4 text-gray-600", children: "This demonstrates the shared workflow engine running in the browser with automatic client node discovery." }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 p-4 rounded-md mb-6", children: [_jsx("h3", { className: "font-semibold text-blue-800 mb-2", children: "Service Status:" }), _jsxs("div", { className: "text-sm text-blue-700 space-y-1", children: [_jsxs("div", { children: ["\u2705 Service initialized: ", initialized ? 'Yes' : 'No'] }), _jsxs("div", { children: ["\uD83D\uDCE6 Total nodes registered: ", serviceInfo.totalNodes] }), _jsxs("div", { children: ["\uD83C\uDF10 Universal nodes: ", serviceInfo.universalNodes] }), _jsxs("div", { children: ["\uD83D\uDCBB Client nodes: ", serviceInfo.clientNodes] }), _jsxs("div", { children: ["Available nodes: ", ' ', service?.getAvailableNodes().map(n => n.id).join(', ') || 'None'] })] })] }), _jsx(Button, { onClick: executeWorkflow, disabled: loading || !initialized, className: "mb-6", children: loading ? 'Executing...' : 'Run Client Workflow' }), result !== null && (_jsxs("div", { className: "bg-gray-100 p-4 rounded-md", children: [_jsx("h3", { className: "font-bold mb-2", children: "Execution Result:" }), _jsx("pre", { className: "text-sm overflow-auto max-h-96", children: typeof result === 'string'
                            ? result
                            : JSON.stringify(result, null, 2) })] }))] }));
}
