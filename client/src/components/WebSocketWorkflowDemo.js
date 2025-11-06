import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { ClientWorkflowService } from '../services/ClientWorkflowService';
import { WebSocketMessageSerializer, isWorkflowMessage } from 'shared';
// Test workflow definition
const TEST_WORKFLOW = {
    "id": "websocket-test-workflow",
    "name": "WebSocket Test Workflow",
    "version": "1.0.0",
    "description": "A comprehensive test workflow to demonstrate WebSocket communication",
    "initialState": {
        "startTime": null,
        "userInput": "Hello from WebSocket!",
        "processingSteps": []
    },
    "workflow": [
        {
            "auth": {
                "operation": "generate_token",
                "data": "test-data",
                "success?": {
                    "filesystem": {
                        "operation": "write",
                        "path": "/tmp/workflow-token.txt",
                        "content": "Token generated successfully!"
                    }
                }
            }
        },
        "empty"
    ]
};
export const WebSocketWorkflowDemo = () => {
    // State management
    const [workflowService, setWorkflowService] = useState(null);
    const [executions, setExecutions] = useState([]);
    const [selectedExecution, setSelectedExecution] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isServiceInitialized, setIsServiceInitialized] = useState(false);
    // WebSocket connection
    const { isConnected, sendMessage, lastMessage, connect, disconnect } = useWebSocket({
        url: 'ws://localhost:3013/ws', // WebSocket server on same port as HTTP
        onOpen: () => addLog('🔌 WebSocket connected'),
        onClose: () => addLog('🔌 WebSocket disconnected'),
        onError: (error) => addLog(`❌ WebSocket error: ${error}`),
        onMessage: handleWebSocketMessage
    });
    // Utility function to add logs
    const addLog = useCallback((message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
    }, []);
    // Initialize ClientWorkflowService
    useEffect(() => {
        const initService = async () => {
            try {
                addLog('🔧 Initializing ClientWorkflowService...');
                const service = await ClientWorkflowService.getInstance();
                addLog('✅ ClientWorkflowService initialized');
                setWorkflowService(service);
                setIsServiceInitialized(true);
                // Enable WebSocket integration after service is fully initialized
                try {
                    service.enableWebSocket({
                        url: 'ws://localhost:3013/ws',
                        autoExecute: false, // We'll handle execution manually
                        reconnect: true
                    });
                    addLog('✅ WebSocket integration enabled');
                }
                catch (wsError) {
                    addLog(`⚠️ WebSocket integration failed: ${wsError}`);
                    // Service is still usable for local execution
                }
            }
            catch (error) {
                addLog(`❌ Failed to initialize ClientWorkflowService: ${error}`);
                console.error('ClientWorkflowService initialization error:', error);
            }
        };
        initService();
    }, [addLog]);
    // Connection deduplication - ensure single WebSocket connection
    useEffect(() => {
        // Only connect once
        if (!isConnected) {
            connect();
        }
        return () => {
            disconnect(); // Always cleanup on unmount
        };
    }, []); // Empty deps - connect only once
    // Handle WebSocket messages
    function handleWebSocketMessage(message) {
        addLog(`📨 Received: ${message.type}`);
        if (isWorkflowMessage(message)) {
            switch (message.type) {
                case 'workflow:result':
                    handleWorkflowResult(message);
                    break;
                case 'workflow:error':
                    handleWorkflowError(message);
                    break;
                case 'workflow:progress':
                    // Handle progress updates if implemented
                    addLog(`📊 Progress: ${JSON.stringify(message.payload)}`);
                    break;
                default:
                    addLog(`📨 Workflow message: ${message.type}`);
            }
        }
    }
    // Handle workflow execution result
    const handleWorkflowResult = useCallback((message) => {
        const { executionId, result } = message.payload;
        setExecutions(prev => prev.map(exec => exec.id === executionId
            ? {
                ...exec,
                status: 'completed',
                endTime: new Date(),
                result: result
            }
            : exec));
        addLog(`✅ Workflow ${executionId} completed successfully`);
    }, [addLog]);
    // Handle workflow execution error
    const handleWorkflowError = useCallback((message) => {
        const { executionId, error } = message.payload;
        setExecutions(prev => prev.map(exec => exec.id === executionId
            ? {
                ...exec,
                status: 'failed',
                endTime: new Date(),
                error: error
            }
            : exec));
        addLog(`❌ Workflow ${executionId} failed: ${error}`);
    }, [addLog]);
    // Execute workflow locally (client-side)
    const executeWorkflowLocally = useCallback(async () => {
        if (!workflowService) {
            addLog('❌ Workflow service not initialized');
            return;
        }
        const executionId = `local-${Date.now()}`;
        const newExecution = {
            id: executionId,
            status: 'running',
            startTime: new Date()
        };
        setExecutions(prev => [...prev, newExecution]);
        addLog(`🚀 Starting local workflow execution: ${executionId}`);
        try {
            // Execute workflow using ClientWorkflowService
            const result = await workflowService.executeWorkflow(TEST_WORKFLOW);
            setExecutions(prev => prev.map(exec => exec.id === executionId
                ? {
                    ...exec,
                    status: 'completed',
                    endTime: new Date(),
                    result: result
                }
                : exec));
            addLog(`✅ Local workflow ${executionId} completed`);
        }
        catch (error) {
            setExecutions(prev => prev.map(exec => exec.id === executionId
                ? {
                    ...exec,
                    status: 'failed',
                    endTime: new Date(),
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
                : exec));
            addLog(`❌ Local workflow ${executionId} failed: ${error}`);
        }
    }, [workflowService, addLog]);
    // Execute workflow via WebSocket (server-side)
    const executeWorkflowViaWebSocket = useCallback(() => {
        if (!isConnected) {
            addLog('❌ WebSocket not connected');
            return;
        }
        const executionId = `remote-${Date.now()}`;
        const newExecution = {
            id: executionId,
            status: 'pending',
            startTime: new Date()
        };
        setExecutions(prev => [...prev, newExecution]);
        // Create workflow execution message
        const executeMessage = WebSocketMessageSerializer.createMessage('workflow:execute', {
            workflowDefinition: TEST_WORKFLOW,
            executionId: executionId,
            options: {
                debug: true,
                timeout: 30000
            }
        });
        // Send via WebSocket
        const sent = sendMessage(executeMessage);
        if (sent) {
            setExecutions(prev => prev.map(exec => exec.id === executionId ? { ...exec, status: 'running' } : exec));
            addLog(`🚀 Sent workflow execution request: ${executionId}`);
        }
        else {
            addLog(`❌ Failed to send workflow execution request: ${executionId}`);
            setExecutions(prev => prev.filter(exec => exec.id !== executionId));
        }
    }, [isConnected, sendMessage, addLog]);
    // Validate workflow
    const validateWorkflow = useCallback(() => {
        if (!workflowService) {
            addLog('❌ Workflow service not initialized');
            return;
        }
        try {
            const validation = workflowService.validateWorkflow(TEST_WORKFLOW);
            if (validation.valid) {
                addLog('✅ Workflow validation passed');
            }
            else {
                addLog(`❌ Workflow validation failed: ${validation.errors.length} errors`);
                validation.errors.forEach(error => {
                    addLog(`   - ${error.path}: ${error.message}`);
                });
            }
        }
        catch (error) {
            addLog(`❌ Workflow validation error: ${error}`);
        }
    }, [workflowService, addLog]);
    // Clear logs
    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);
    // Clear executions
    const clearExecutions = useCallback(() => {
        setExecutions([]);
        setSelectedExecution(null);
    }, []);
    // Get selected execution details
    const getSelectedExecution = () => {
        return executions.find(exec => exec.id === selectedExecution);
    };
    return (_jsxs("div", { className: "max-w-6xl mx-auto p-6 space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800 mb-4", children: "WebSocket Workflow Demo" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-gray-700 mb-2", children: "Service Status" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${isServiceInitialized ? 'bg-green-500' : 'bg-red-500'}` }), _jsx("span", { className: `text-sm ${isServiceInitialized ? 'text-green-600' : 'text-red-600'}`, children: isServiceInitialized ? 'Initialized' : 'Not Ready' })] })] }), _jsxs("div", { className: "bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-gray-700 mb-2", children: "WebSocket" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}` }), _jsx("span", { className: `text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`, children: isConnected ? 'Connected' : 'Disconnected' })] })] }), _jsxs("div", { className: "bg-gray-50 p-4 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-gray-700 mb-2", children: "Executions" }), _jsx("span", { className: "text-lg font-bold text-blue-600", children: executions.length })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3 mb-6", children: [_jsx("button", { onClick: validateWorkflow, disabled: !isServiceInitialized, className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed", children: "\uD83D\uDD0D Validate Workflow" }), _jsx("button", { onClick: executeWorkflowLocally, disabled: !isServiceInitialized, className: "px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed", children: "\u26A1 Execute Locally" }), _jsx("button", { onClick: executeWorkflowViaWebSocket, disabled: !isConnected, className: "px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed", children: "\uD83C\uDF10 Execute via WebSocket" }), _jsx("button", { onClick: isConnected ? disconnect : connect, className: `px-4 py-2 text-white rounded ${isConnected
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-blue-500 hover:bg-blue-600'}`, children: isConnected ? '🔌 Disconnect' : '🔌 Connect' }), _jsx("button", { onClick: clearExecutions, className: "px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600", children: "\uD83D\uDDD1\uFE0F Clear Executions" }), _jsx("button", { onClick: clearLogs, className: "px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600", children: "\uD83D\uDDD1\uFE0F Clear Logs" })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-800 mb-4", children: "Workflow Executions" }), executions.length === 0 ? (_jsx("p", { className: "text-gray-500 italic", children: "No executions yet" })) : (_jsx("div", { className: "space-y-3", children: executions.map((execution) => (_jsxs("div", { className: `p-4 border rounded-lg cursor-pointer transition-colors ${selectedExecution === execution.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'}`, onClick: () => setSelectedExecution(selectedExecution === execution.id ? null : execution.id), children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "font-mono text-sm text-gray-600", children: execution.id }), _jsx("span", { className: `px-2 py-1 rounded text-xs font-semibold ${execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                            execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800'}`, children: execution.status })] }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Started: ", execution.startTime.toLocaleTimeString(), execution.endTime && (_jsxs("span", { children: [" \u2022 Finished: ", execution.endTime.toLocaleTimeString()] }))] }), execution.error && (_jsxs("div", { className: "text-sm text-red-600 mt-1", children: ["Error: ", execution.error] }))] }, execution.id))) })), selectedExecution && getSelectedExecution() && (_jsxs("div", { className: "mt-6 p-4 bg-gray-50 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-gray-800 mb-2", children: "Execution Details" }), _jsx("pre", { className: "text-xs bg-white p-3 rounded border overflow-auto max-h-64", children: JSON.stringify(getSelectedExecution(), null, 2) })] }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-800 mb-4", children: "Real-time Logs" }), _jsx("div", { className: "bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto", children: logs.length === 0 ? (_jsx("div", { className: "text-gray-500", children: "No logs yet..." })) : (logs.map((log, index) => (_jsx("div", { className: "mb-1", children: log }, index)))) })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-800 mb-4", children: "Test Workflow Definition" }), _jsx("pre", { className: "bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96", children: JSON.stringify(TEST_WORKFLOW, null, 2) })] })] }));
};
