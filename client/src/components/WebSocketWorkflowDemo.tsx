import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { ClientWorkflowService } from '../services/ClientWorkflowService';
import { 
  WebSocketMessageSerializer,
  type WorkflowDefinition,
  type WebSocketMessage,
  type WorkflowExecuteMessage,
  type WorkflowResultMessage,
  type WorkflowErrorMessage,
  isWorkflowMessage
} from 'shared';

// Test workflow definition
const TEST_WORKFLOW: WorkflowDefinition = {
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
      "start-timer": {
        "operation": "set",
        "key": "startTime", 
        "value": "{{timestamp}}",
        "success?": "math-calculation"
      }
    },
    {
      "math-calculation": {
        "operation": "add",
        "values": [10, 25, 5],
        "success?": "logic-check"
      }
    },
    {
      "logic-check": {
        "condition": "{{math_result}} > 30",
        "success?": "data-transform",
        "failure?": "error-handler"
      }
    },
    {
      "data-transform": {
        "operation": "map",
        "source": ["apple", "banana", "cherry"],
        "transform": "uppercase", 
        "success?": "final-summary"
      }
    },
    {
      "final-summary": {
        "operation": "combine",
        "data": {
          "mathResult": "{{math_result}}",
          "transformedData": "{{data_transform_result}}",
          "processingComplete": true
        },
        "success?": "complete"
      }
    },
    {
      "complete": {
        "message": "Workflow completed successfully!",
        "finalData": "{{final_summary_result}}",
        "success?": null
      }
    },
    {
      "error-handler": {
        "message": "Handling error gracefully",
        "error": "PROCESSING_ERROR",
        "recovery": "Setting default values",
        "success?": "complete"
      }
    }
  ]
};

interface WorkflowExecution {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export const WebSocketWorkflowDemo: React.FC = () => {
  // State management
  const [workflowService, setWorkflowService] = useState<ClientWorkflowService | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isServiceInitialized, setIsServiceInitialized] = useState(false);

  // WebSocket connection
  const {
    isConnected,
    sendMessage,
    lastMessage,
    connect,
    disconnect
  } = useWebSocket({
    url: 'ws://localhost:3000/ws', // WebSocket server on same port as HTTP
    onOpen: () => addLog('🔌 WebSocket connected'),
    onClose: () => addLog('🔌 WebSocket disconnected'),
    onError: (error) => addLog(`❌ WebSocket error: ${error}`),
    onMessage: handleWebSocketMessage
  });

  // Utility function to add logs
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  // Initialize ClientWorkflowService
  useEffect(() => {
    const initService = async () => {
      try {
        const service = await ClientWorkflowService.getInstance();
        
        // Enable WebSocket integration
        service.enableWebSocket({
          url: 'ws://localhost:3000/ws',
          autoExecute: false, // We'll handle execution manually
          reconnect: true
        });

        setWorkflowService(service);
        setIsServiceInitialized(true);
        addLog('✅ ClientWorkflowService initialized');
      } catch (error) {
        addLog(`❌ Failed to initialize ClientWorkflowService: ${error}`);
      }
    };

    initService();
  }, [addLog]);

  // Handle WebSocket messages
  function handleWebSocketMessage(message: WebSocketMessage): void {
    addLog(`📨 Received: ${message.type}`);
    
    if (isWorkflowMessage(message)) {
      switch (message.type) {
        case 'workflow:result':
          handleWorkflowResult(message as WorkflowResultMessage);
          break;
        case 'workflow:error':
          handleWorkflowError(message as WorkflowErrorMessage);
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
  const handleWorkflowResult = useCallback((message: WorkflowResultMessage) => {
    const { executionId, result } = message.payload;
    
    setExecutions(prev => prev.map(exec => 
      exec.id === executionId
        ? { 
            ...exec, 
            status: 'completed' as const,
            endTime: new Date(),
            result: result
          }
        : exec
    ));
    
    addLog(`✅ Workflow ${executionId} completed successfully`);
  }, [addLog]);

  // Handle workflow execution error
  const handleWorkflowError = useCallback((message: WorkflowErrorMessage) => {
    const { executionId, error } = message.payload;
    
    setExecutions(prev => prev.map(exec => 
      exec.id === executionId
        ? { 
            ...exec, 
            status: 'failed' as const,
            endTime: new Date(),
            error: error
          }
        : exec
    ));
    
    addLog(`❌ Workflow ${executionId} failed: ${error}`);
  }, [addLog]);

  // Execute workflow locally (client-side)
  const executeWorkflowLocally = useCallback(async () => {
    if (!workflowService) {
      addLog('❌ Workflow service not initialized');
      return;
    }

    const executionId = `local-${Date.now()}`;
    const newExecution: WorkflowExecution = {
      id: executionId,
      status: 'running',
      startTime: new Date()
    };

    setExecutions(prev => [...prev, newExecution]);
    addLog(`🚀 Starting local workflow execution: ${executionId}`);

    try {
      // Execute workflow using ClientWorkflowService
      const result = await workflowService.executeWorkflow(TEST_WORKFLOW);
      
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId
          ? { 
              ...exec, 
              status: 'completed' as const,
              endTime: new Date(),
              result: result
            }
          : exec
      ));
      
      addLog(`✅ Local workflow ${executionId} completed`);
    } catch (error) {
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId
          ? { 
              ...exec, 
              status: 'failed' as const,
              endTime: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : exec
      ));
      
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
    const newExecution: WorkflowExecution = {
      id: executionId,
      status: 'pending',
      startTime: new Date()
    };

    setExecutions(prev => [...prev, newExecution]);

    // Create workflow execution message
    const executeMessage: WorkflowExecuteMessage = WebSocketMessageSerializer.createMessage(
      'workflow:execute',
      {
        workflowDefinition: TEST_WORKFLOW,
        executionId: executionId,
        options: {
          debug: true,
          timeout: 30000
        }
      }
    ) as WorkflowExecuteMessage;

    // Send via WebSocket
    const sent = sendMessage(executeMessage);
    if (sent) {
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId ? { ...exec, status: 'running' as const } : exec
      ));
      addLog(`🚀 Sent workflow execution request: ${executionId}`);
    } else {
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
      } else {
        addLog(`❌ Workflow validation failed: ${validation.errors.length} errors`);
        validation.errors.forEach(error => {
          addLog(`   - ${error.path}: ${error.message}`);
        });
      }
    } catch (error) {
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          WebSocket Workflow Demo
        </h1>
        
        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Service Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isServiceInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${isServiceInitialized ? 'text-green-600' : 'text-red-600'}`}>
                {isServiceInitialized ? 'Initialized' : 'Not Ready'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">WebSocket</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Executions</h3>
            <span className="text-lg font-bold text-blue-600">{executions.length}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={validateWorkflow}
            disabled={!isServiceInitialized}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            🔍 Validate Workflow
          </button>
          
          <button
            onClick={executeWorkflowLocally}
            disabled={!isServiceInitialized}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ⚡ Execute Locally
          </button>
          
          <button
            onClick={executeWorkflowViaWebSocket}
            disabled={!isConnected}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            🌐 Execute via WebSocket
          </button>
          
          <button
            onClick={isConnected ? disconnect : connect}
            className={`px-4 py-2 text-white rounded ${
              isConnected 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isConnected ? '🔌 Disconnect' : '🔌 Connect'}
          </button>
          
          <button
            onClick={clearExecutions}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Clear Executions
          </button>
          
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Executions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Workflow Executions</h2>
          
          {executions.length === 0 ? (
            <p className="text-gray-500 italic">No executions yet</p>
          ) : (
            <div className="space-y-3">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedExecution === execution.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedExecution(
                    selectedExecution === execution.id ? null : execution.id
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm text-gray-600">
                      {execution.id}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                      execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                      execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Started: {execution.startTime.toLocaleTimeString()}
                    {execution.endTime && (
                      <span> • Finished: {execution.endTime.toLocaleTimeString()}</span>
                    )}
                  </div>
                  
                  {execution.error && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {execution.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected Execution Details */}
          {selectedExecution && getSelectedExecution() && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Execution Details</h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                {JSON.stringify(getSelectedExecution(), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Real-time Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Real-time Logs</h2>
          
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Workflow Definition Display */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Test Workflow Definition</h2>
        <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
          {JSON.stringify(TEST_WORKFLOW, null, 2)}
        </pre>
      </div>
    </div>
  );
};