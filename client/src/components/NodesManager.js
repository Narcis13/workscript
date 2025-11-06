import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ClientWorkflowService } from '../services/ClientWorkflowService';
export function NodesManager() {
    const [activeTab, setActiveTab] = useState('universal');
    const [universalNodes, setUniversalNodes] = useState([]);
    const [clientNodes, setClientNodes] = useState([]);
    const [serverNodes, setServerNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [testRunNode, setTestRunNode] = useState(null);
    const [testRunBody, setTestRunBody] = useState('');
    const [testRunResult, setTestRunResult] = useState(null);
    const [testRunLoading, setTestRunLoading] = useState(false);
    useEffect(() => {
        loadNodes();
    }, []);
    const loadNodes = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load client-side nodes from ClientWorkflowService
            const clientService = await ClientWorkflowService.getInstance();
            const clientUniversalNodes = clientService.getNodesBySource('universal');
            const clientOnlyNodes = clientService.getNodesBySource('client');
            setUniversalNodes(clientUniversalNodes);
            setClientNodes(clientOnlyNodes);
            // Load server nodes from API endpoint
            try {
                const response = await fetch('http://localhost:3013/workflows/allnodes');
                if (!response.ok) {
                    throw new Error(`Failed to fetch server nodes: ${response.statusText}`);
                }
                const data = await response.json();
                if (data.success && data.nodes) {
                    // The API returns all nodes (universal + server)
                    // We need to identify which are server-only by comparing IDs with universal nodes
                    const universalNodeIds = new Set(clientUniversalNodes.map(n => n.id));
                    const serverOnlyNodes = data.nodes
                        .filter((node) => !universalNodeIds.has(node.id))
                        .map((node) => ({ ...node, source: 'server' }));
                    setServerNodes(serverOnlyNodes);
                }
            }
            catch (serverError) {
                console.warn('Failed to load server nodes (server may not be running):', serverError);
                // Don't set error state - just leave server nodes empty
                // The UI will show "Make sure the server is running" message
                setServerNodes([]);
            }
        }
        catch (err) {
            console.error('Failed to load nodes:', err);
            setError(err instanceof Error ? err.message : 'Failed to load nodes');
        }
        finally {
            setLoading(false);
        }
    };
    const getCurrentNodes = () => {
        switch (activeTab) {
            case 'universal':
                return universalNodes;
            case 'client':
                return clientNodes;
            case 'server':
                return serverNodes;
            default:
                return [];
        }
    };
    const getTabColorActive = (tab) => {
        switch (tab) {
            case 'universal':
                return 'bg-blue-600 border-blue-700';
            case 'client':
                return 'bg-green-600 border-green-700';
            case 'server':
                return 'bg-purple-600 border-purple-700';
            default:
                return 'bg-gray-600 border-gray-700';
        }
    };
    const generateStubJson = (node) => {
        const stub = {
            config: {},
            initialState: {}
        };
        // Generate stub config based on inputs and ai_hints
        if (node.ai_hints?.example_config) {
            try {
                stub.config = JSON.parse(node.ai_hints.example_config);
            }
            catch {
                // If example_config is not valid JSON, create a basic structure
                if (node.inputs && node.inputs.length > 0) {
                    node.inputs.forEach(input => {
                        stub.config[input] = `<${input}>`;
                    });
                }
            }
        }
        else if (node.inputs && node.inputs.length > 0) {
            node.inputs.forEach(input => {
                stub.config[input] = `<${input}>`;
            });
        }
        // Add state keys from ai_hints
        if (node.ai_hints?.get_from_state && node.ai_hints.get_from_state.length > 0) {
            node.ai_hints.get_from_state.forEach(key => {
                stub.initialState[key] = `<${key}>`;
            });
        }
        return JSON.stringify(stub, null, 2);
    };
    const openTestRunModal = (node) => {
        setTestRunNode(node);
        setTestRunBody(generateStubJson(node));
        setTestRunResult(null);
    };
    const closeTestRunModal = () => {
        setTestRunNode(null);
        setTestRunBody('');
        setTestRunResult(null);
        setTestRunLoading(false);
    };
    const executeTestRun = async () => {
        if (!testRunNode)
            return;
        setTestRunLoading(true);
        setTestRunResult(null);
        try {
            const body = JSON.parse(testRunBody);
            const response = await fetch(`http://localhost:3013/nodes/run/${testRunNode.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            setTestRunResult(result);
        }
        catch (error) {
            setTestRunResult({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to execute test run'
            });
        }
        finally {
            setTestRunLoading(false);
        }
    };
    const currentNodes = getCurrentNodes();
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }), _jsx("p", { className: "mt-4 text-gray-600", children: "Loading nodes..." })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("div", { className: "bg-white shadow-sm border-b", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Nodes Browser" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "Browse and explore available workflow nodes across different environments" })] }) }), error && (_jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4", children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("span", { className: "text-red-400 text-xl", children: "\u26A0\uFE0F" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error loading nodes" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadNodes, className: "mt-2 text-sm text-red-600 hover:text-red-500 underline", children: "Try again" })] })] }) }) })), _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6", children: _jsxs("div", { className: "flex space-x-2 border-b border-gray-200", children: [_jsxs("button", { onClick: () => setActiveTab('universal'), className: `px-6 py-3 font-medium rounded-t-lg transition-colors ${activeTab === 'universal'
                                ? `${getTabColorActive('universal')} text-white border-b-2`
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`, children: ["Universal Nodes", _jsx("span", { className: "ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full", children: universalNodes.length })] }), _jsxs("button", { onClick: () => setActiveTab('client'), className: `px-6 py-3 font-medium rounded-t-lg transition-colors ${activeTab === 'client'
                                ? `${getTabColorActive('client')} text-white border-b-2`
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`, children: ["Client Nodes", _jsx("span", { className: "ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full", children: clientNodes.length })] }), _jsxs("button", { onClick: () => setActiveTab('server'), className: `px-6 py-3 font-medium rounded-t-lg transition-colors ${activeTab === 'server'
                                ? `${getTabColorActive('server')} text-white border-b-2`
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`, children: ["Server Nodes", _jsx("span", { className: "ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full", children: serverNodes.length })] })] }) }), _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("div", { className: "bg-white rounded-lg shadow overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 bg-gray-50 border-b border-gray-200", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: [activeTab.charAt(0).toUpperCase() + activeTab.slice(1), " Nodes"] }) }), currentNodes.length === 0 ? (_jsxs("div", { className: "px-6 py-12 text-center text-gray-500", children: [_jsx("p", { className: "text-lg", children: "No nodes found" }), _jsx("p", { className: "text-sm mt-2", children: activeTab === 'server'
                                                    ? 'Make sure the server is running and accessible'
                                                    : 'No nodes are registered for this environment' })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ID" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Version" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: currentNodes.map((node) => (_jsxs("tr", { className: `hover:bg-gray-50 transition-colors cursor-pointer ${selectedNode?.id === node.id ? 'bg-blue-50' : ''}`, onClick: () => setSelectedNode(node), children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900", children: node.id }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: node.name || node.id }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: node.version || 'N/A' }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm", children: _jsxs("div", { className: "flex space-x-3", children: [_jsx("button", { onClick: (e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedNode(node);
                                                                            }, className: "text-blue-600 hover:text-blue-900 font-medium", children: "View Details" }), _jsx("button", { onClick: (e) => {
                                                                                e.stopPropagation();
                                                                                openTestRunModal(node);
                                                                            }, className: "text-green-600 hover:text-green-900 font-medium", children: "Test Run" })] }) })] }, node.id))) })] }) }))] }) }), _jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow overflow-hidden sticky top-6", children: [_jsx("div", { className: "px-6 py-4 bg-gray-50 border-b border-gray-200", children: _jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Node Details" }) }), selectedNode ? (_jsxs("div", { className: "px-6 py-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Node ID" }), _jsx("p", { className: "mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded", children: selectedNode.id })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Name" }), _jsx("p", { className: "mt-1 text-sm text-gray-900", children: selectedNode.name || selectedNode.id })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Version" }), _jsx("p", { className: "mt-1 text-sm text-gray-900", children: selectedNode.version || 'N/A' })] }), selectedNode.source && (_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Source" }), _jsx("p", { className: "mt-1", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedNode.source === 'universal'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : selectedNode.source === 'client'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-purple-100 text-purple-800'}`, children: selectedNode.source }) })] })), selectedNode.description && (_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Description" }), _jsx("p", { className: "mt-1 text-sm text-gray-900", children: selectedNode.description })] })), selectedNode.inputs && selectedNode.inputs.length > 0 && (_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Inputs" }), _jsx("div", { className: "mt-1 space-y-1", children: selectedNode.inputs.map((input, idx) => (_jsx("div", { className: "text-sm font-mono text-gray-700 bg-gray-50 px-3 py-1 rounded", children: input }, idx))) })] })), selectedNode.outputs && selectedNode.outputs.length > 0 && (_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Outputs" }), _jsx("div", { className: "mt-1 space-y-1", children: selectedNode.outputs.map((output, idx) => (_jsx("div", { className: "text-sm font-mono text-gray-700 bg-gray-50 px-3 py-1 rounded", children: output }, idx))) })] })), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Raw Metadata" }), _jsx("pre", { className: "mt-1 text-xs text-gray-700 bg-gray-50 px-3 py-2 rounded overflow-x-auto", children: JSON.stringify(selectedNode, null, 2) })] })] })) : (_jsx("div", { className: "px-6 py-12 text-center text-gray-500", children: _jsx("p", { className: "text-sm", children: "Select a node to view details" }) }))] }) })] }) }), testRunNode && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200 flex justify-between items-center", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-gray-900", children: ["Test Run: ", testRunNode.id] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: testRunNode.name || testRunNode.id })] }), _jsx("button", { onClick: closeTestRunModal, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Request Body (JSON)" }), _jsx("textarea", { value: testRunBody, onChange: (e) => setTestRunBody(e.target.value), className: "w-full h-64 font-mono text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Enter JSON body..." }), _jsxs("p", { className: "mt-2 text-xs text-gray-500", children: ["Edit the JSON body to test the node. The request will be sent to POST /nodes/run/", testRunNode.id] })] }), _jsx("div", { children: _jsx("button", { onClick: executeTestRun, disabled: testRunLoading, className: "w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center", children: testRunLoading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" }), "Executing..."] })) : ('Execute') }) }), testRunResult && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Result" }), _jsxs("div", { className: `border rounded-lg p-4 ${testRunResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`, children: [_jsxs("div", { className: "flex items-start mb-2", children: [_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${testRunResult.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`, children: testRunResult.success ? 'Success' : 'Error' }), testRunResult.metadata?.duration && (_jsxs("span", { className: "ml-2 text-xs text-gray-600", children: ["Duration: ", testRunResult.metadata.duration, "ms"] }))] }), _jsx("pre", { className: "text-xs text-gray-800 bg-white rounded p-3 overflow-x-auto", children: JSON.stringify(testRunResult, null, 2) })] })] }))] }) }), _jsx("div", { className: "px-6 py-4 border-t border-gray-200 flex justify-end", children: _jsx("button", { onClick: closeTestRunModal, className: "px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors", children: "Close" }) })] }) }))] }));
}
