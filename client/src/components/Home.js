import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import beaver from '../assets/beaver.svg';
import { ApiResponse, WorkflowDefinition } from '@workscript/engine';
import { Button } from './ui/button';
import { WorkflowDemo } from './WorkflowDemo';
import { useWorkflowService } from '../hooks/useWorkflowService';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3013";
export function Home() {
    const [data, setData] = useState();
    const [workflowResult, setWorkflowResult] = useState();
    const [executionMode, setExecutionMode] = useState('server');
    const [clientLoading, setClientLoading] = useState(false);
    const [runByIdLoading, setRunByIdLoading] = useState(false);
    // Client-side workflow service
    const { executeWorkflow: executeClientWorkflow, validateWorkflow: validateClientWorkflow, initialized: clientInitialized, loading: clientServiceLoading } = useWorkflowService();
    async function sendRequest() {
        try {
            const req = await fetch(`${SERVER_URL}/hello`);
            const res = await req.json();
            setData(res);
        }
        catch (error) {
            console.log(error);
        }
    }
    async function runWorkflow() {
        if (executionMode === 'client') {
            return await runClientWorkflow();
        }
        else {
            return await runServerWorkflow();
        }
    }
    async function runClientWorkflow() {
        if (!clientInitialized || !executeClientWorkflow) {
            setWorkflowResult({
                status: 'failed',
                error: 'Client workflow service not initialized'
            });
            return;
        }
        setClientLoading(true);
        try {
            // Define a client-compatible workflow using localStorage and fetch nodes
            const workflow = {
                id: 'client-test-workflow',
                name: 'Client Test Workflow',
                version: '1.0.0',
                description: 'Fetch data and store in localStorage!',
                workflow: [
                    {
                        'fetch': {
                            url: 'http://localhost:3013/hello',
                            'success?': {
                                'localStorage': {
                                    operation: 'set',
                                    key: 'workflow-result',
                                    value: 'Workflow executed successfully in browser!'
                                }
                            }
                        }
                    }
                ]
            };
            // Validate workflow client-side
            const validation = validateClientWorkflow?.(workflow);
            if (!validation?.valid) {
                setWorkflowResult({
                    status: 'validation_failed',
                    error: 'Client workflow validation failed',
                    validation
                });
                return;
            }
            // Execute workflow client-side
            const result = await executeClientWorkflow(workflow);
            setWorkflowResult({
                status: result.status || 'completed',
                result: result,
                validation: { valid: true, message: 'Client-side validation passed' }
            });
        }
        catch (error) {
            console.error('Client workflow error:', error);
            setWorkflowResult({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown client error'
            });
        }
        finally {
            setClientLoading(false);
        }
    }
    async function runServerWorkflow() {
        try {
            // Define a server workflow using auth and filesystem nodes
            const workflow = {
                id: 'server-test-workflow',
                name: 'Server Test Workflow',
                version: '1.0.0',
                description: 'Generate token and save to file!',
                initialState: {
                    developer: 'Narcis Brindusescu'
                },
                workflow: [
                    {
                        'auth': {
                            operation: 'generate_token',
                            data: 'test-data',
                            'success?': {
                                'filesystem': {
                                    operation: 'write',
                                    path: '/tmp/workflow-token.txt',
                                    content: 'Token generated successfully!'
                                }
                            }
                        }
                    },
                    { '$.author': 'Petru Brindusescu' },
                    {
                        'log': {
                            message: '$.developer'
                        }
                    }
                ]
            };
            // First validate the workflow
            const validationResponse = await fetch(`${SERVER_URL}/workflows/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflow)
            });
            const validationResult = await validationResponse.json();
            // If validation fails, return early with validation errors
            if (!validationResult.valid) {
                setWorkflowResult({
                    status: 'validation_failed',
                    error: 'Workflow validation failed',
                    validation: validationResult
                });
                return;
            }
            // If validation passes, execute the workflow
            const response = await fetch(`${SERVER_URL}/workflows/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflow)
            });
            const result = await response.json();
            // If workflow executed successfully, store it
            if (result.status === 'completed') {
                try {
                    const storeResponse = await fetch(`${SERVER_URL}/workflows/store?subfolder=tests`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(workflow)
                    });
                    const storeResult = await storeResponse.json();
                    console.log('Workflow stored:', storeResult);
                    // Add store result to the workflow result
                    result.stored = storeResult.success;
                    result.storePath = storeResult.filePath;
                }
                catch (storeError) {
                    console.error('Failed to store workflow:', storeError);
                    result.storeError = storeError instanceof Error ? storeError.message : 'Unknown store error';
                }
            }
            // Prepend validation result to execution result
            result.validation = validationResult;
            setWorkflowResult(result);
        }
        catch (error) {
            console.error('Workflow error:', error);
            setWorkflowResult({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async function runWorkflowById() {
        setRunByIdLoading(true);
        try {
            // Test running workflow by ID using the server endpoint
            const response = await fetch(`${SERVER_URL}/workflows/run/test-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            setWorkflowResult({
                ...result,
                validation: { valid: true, message: 'Workflow executed by ID' }
            });
        }
        catch (error) {
            console.error('Run by ID error:', error);
            setWorkflowResult({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                validation: { valid: false, message: 'Failed to run workflow by ID' }
            });
        }
        finally {
            setRunByIdLoading(false);
        }
    }
    return (_jsxs("div", { className: "max-w-xl mx-auto flex flex-col gap-6 items-center justify-center min-h-screen", children: [_jsx("a", { href: "https://github.com/stevedylandev/bhvr", target: "_blank", children: _jsx("img", { src: beaver, className: "w-16 h-16 cursor-pointer", alt: "beaver logo" }) }), _jsx("h1", { className: "text-5xl font-black", children: "bhvr" }), _jsx("h2", { className: "text-2xl font-bold", children: "Bun + Hono + Vite + React" }), _jsx("p", { children: "A typesafe fullstack monorepo" }), _jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx("span", { className: "text-sm font-medium", children: "Execution Mode:" }), _jsxs("div", { className: "flex bg-gray-100 rounded-lg p-1", children: [_jsx("button", { onClick: () => setExecutionMode('server'), className: `px-3 py-1 rounded text-sm transition-colors ${executionMode === 'server'
                                    ? 'bg-white shadow-sm text-gray-900'
                                    : 'text-gray-600 hover:text-gray-900'}`, children: "Server API" }), _jsxs("button", { onClick: () => setExecutionMode('client'), disabled: clientServiceLoading, className: `px-3 py-1 rounded text-sm transition-colors ${executionMode === 'client'
                                    ? 'bg-white shadow-sm text-gray-900'
                                    : 'text-gray-600 hover:text-gray-900'} ${clientServiceLoading ? 'opacity-50 cursor-not-allowed' : ''}`, children: ["Client Browser ", clientServiceLoading && '(loading...)'] })] })] }), _jsxs("div", { className: 'flex items-center gap-4', children: [_jsx(Button, { onClick: sendRequest, children: "Call API" }), _jsx(Button, { onClick: runWorkflow, variant: 'outline', disabled: clientLoading || (executionMode === 'client' && (!clientInitialized || clientServiceLoading)), children: clientLoading ? 'Executing...' : `Run ${executionMode === 'server' ? 'Server' : 'Client'} Workflow` }), _jsx(Button, { onClick: runWorkflowById, variant: 'destructive', disabled: runByIdLoading, children: runByIdLoading ? 'Running...' : 'Run by ID (test-workflow)' }), _jsx(Button, { variant: 'secondary', asChild: true, children: _jsx("a", { target: '_blank', href: "https://bhvr.dev", children: "Docs" }) })] }), executionMode === 'client' && !clientServiceLoading && (_jsx("div", { className: `mt-4 p-3 rounded-lg text-sm ${clientInitialized
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`, children: clientInitialized
                    ? '✅ Client workflow service ready for browser execution'
                    : '⚠️ Client workflow service not initialized' })), data && (_jsx("pre", { className: "bg-gray-100 p-4 rounded-md", children: _jsxs("code", { children: ["Message: ", data.message, " ", _jsx("br", {}), "Success: ", data.success.toString()] }) })), workflowResult && (_jsxs("div", { className: "w-full max-w-lg", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("h3", { className: "font-bold", children: "Workflow Result" }), _jsx("span", { className: `px-2 py-1 rounded text-xs font-medium ${executionMode === 'server'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'}`, children: executionMode === 'server' ? 'Server API' : 'Client Browser' })] }), _jsx("pre", { className: "bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-96", children: _jsx("code", { children: JSON.stringify(workflowResult, null, 2) }) }), executionMode === 'client' && workflowResult.status === 'completed' && (_jsx("div", { className: "mt-2 text-sm text-green-600", children: "\uD83D\uDCA1 This workflow executed entirely in your browser using the shared workflow engine!" }))] })), _jsx("div", { className: "w-full mt-8 pt-8 border-t", children: _jsx(WorkflowDemo, {}) })] }));
}
