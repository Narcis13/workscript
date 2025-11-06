import { useState, useEffect } from 'react';
import { ClientWorkflowService } from '../services/ClientWorkflowService';
import type { NodeMetadata as SharedNodeMetadata } from '@workscript/engine';

interface NodeMetadata extends SharedNodeMetadata {
  source?: 'universal' | 'client' | 'server';
}

type NodeSource = 'universal' | 'client' | 'server';

export function NodesManager() {
  const [activeTab, setActiveTab] = useState<NodeSource>('universal');
  const [universalNodes, setUniversalNodes] = useState<NodeMetadata[]>([]);
  const [clientNodes, setClientNodes] = useState<NodeMetadata[]>([]);
  const [serverNodes, setServerNodes] = useState<NodeMetadata[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testRunNode, setTestRunNode] = useState<NodeMetadata | null>(null);
  const [testRunBody, setTestRunBody] = useState<string>('');
  const [testRunResult, setTestRunResult] = useState<any>(null);
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
            .filter((node: NodeMetadata) => !universalNodeIds.has(node.id))
            .map((node: NodeMetadata) => ({ ...node, source: 'server' as const }));

          setServerNodes(serverOnlyNodes);
        }
      } catch (serverError) {
        console.warn('Failed to load server nodes (server may not be running):', serverError);
        // Don't set error state - just leave server nodes empty
        // The UI will show "Make sure the server is running" message
        setServerNodes([]);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load nodes');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentNodes = (): NodeMetadata[] => {
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

  const getTabColorActive = (tab: NodeSource): string => {
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

  const generateStubJson = (node: NodeMetadata): string => {
    const stub: any = {
      config: {},
      initialState: {}
    };

    // Generate stub config based on inputs and ai_hints
    if (node.ai_hints?.example_config) {
      try {
        stub.config = JSON.parse(node.ai_hints.example_config);
      } catch {
        // If example_config is not valid JSON, create a basic structure
        if (node.inputs && node.inputs.length > 0) {
          node.inputs.forEach(input => {
            stub.config[input] = `<${input}>`;
          });
        }
      }
    } else if (node.inputs && node.inputs.length > 0) {
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

  const openTestRunModal = (node: NodeMetadata) => {
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
    if (!testRunNode) return;

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
    } catch (error) {
      setTestRunResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute test run'
      });
    } finally {
      setTestRunLoading(false);
    }
  };

  const currentNodes = getCurrentNodes();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading nodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Nodes Browser</h1>
          <p className="mt-2 text-sm text-gray-600">
            Browse and explore available workflow nodes across different environments
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading nodes</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={loadNodes}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('universal')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'universal'
                ? `${getTabColorActive('universal')} text-white border-b-2`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Universal Nodes
            <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
              {universalNodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('client')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'client'
                ? `${getTabColorActive('client')} text-white border-b-2`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Client Nodes
            <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
              {clientNodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'server'
                ? `${getTabColorActive('server')} text-white border-b-2`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Server Nodes
            <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
              {serverNodes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nodes List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Nodes
                </h2>
              </div>

              {currentNodes.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <p className="text-lg">No nodes found</p>
                  <p className="text-sm mt-2">
                    {activeTab === 'server'
                      ? 'Make sure the server is running and accessible'
                      : 'No nodes are registered for this environment'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentNodes.map((node) => (
                        <tr
                          key={node.id}
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            selectedNode?.id === node.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {node.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {node.name || node.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {node.version || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNode(node);
                                }}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                View Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTestRunModal(node);
                                }}
                                className="text-green-600 hover:text-green-900 font-medium"
                              >
                                Test Run
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Node Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow overflow-hidden sticky top-6">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Node Details</h2>
              </div>

              {selectedNode ? (
                <div className="px-6 py-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Node ID */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Node ID
                    </label>
                    <p className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                      {selectedNode.id}
                    </p>
                  </div>

                  {/* Node Name */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedNode.name || selectedNode.id}
                    </p>
                  </div>

                  {/* Version */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedNode.version || 'N/A'}
                    </p>
                  </div>

                  {/* Source */}
                  {selectedNode.source && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedNode.source === 'universal'
                            ? 'bg-blue-100 text-blue-800'
                            : selectedNode.source === 'client'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {selectedNode.source}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {selectedNode.description && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedNode.description}
                      </p>
                    </div>
                  )}

                  {/* Inputs */}
                  {selectedNode.inputs && selectedNode.inputs.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inputs
                      </label>
                      <div className="mt-1 space-y-1">
                        {selectedNode.inputs.map((input, idx) => (
                          <div
                            key={idx}
                            className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-1 rounded"
                          >
                            {input}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outputs */}
                  {selectedNode.outputs && selectedNode.outputs.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outputs
                      </label>
                      <div className="mt-1 space-y-1">
                        {selectedNode.outputs.map((output, idx) => (
                          <div
                            key={idx}
                            className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-1 rounded"
                          >
                            {output}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Metadata */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raw Metadata
                    </label>
                    <pre className="mt-1 text-xs text-gray-700 bg-gray-50 px-3 py-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedNode, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500">
                  <p className="text-sm">Select a node to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Run Modal */}
      {testRunNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Test Run: {testRunNode.id}</h2>
                <p className="text-sm text-gray-600 mt-1">{testRunNode.name || testRunNode.id}</p>
              </div>
              <button
                onClick={closeTestRunModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Request Body Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Body (JSON)
                  </label>
                  <textarea
                    value={testRunBody}
                    onChange={(e) => setTestRunBody(e.target.value)}
                    className="w-full h-64 font-mono text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter JSON body..."
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Edit the JSON body to test the node. The request will be sent to POST /nodes/run/{testRunNode.id}
                  </p>
                </div>

                {/* Execute Button */}
                <div>
                  <button
                    onClick={executeTestRun}
                    disabled={testRunLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {testRunLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Executing...
                      </>
                    ) : (
                      'Execute'
                    )}
                  </button>
                </div>

                {/* Result Display */}
                {testRunResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Result
                    </label>
                    <div className={`border rounded-lg p-4 ${
                      testRunResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-start mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          testRunResult.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        }`}>
                          {testRunResult.success ? 'Success' : 'Error'}
                        </span>
                        {testRunResult.metadata?.duration && (
                          <span className="ml-2 text-xs text-gray-600">
                            Duration: {testRunResult.metadata.duration}ms
                          </span>
                        )}
                      </div>
                      <pre className="text-xs text-gray-800 bg-white rounded p-3 overflow-x-auto">
                        {JSON.stringify(testRunResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeTestRunModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
