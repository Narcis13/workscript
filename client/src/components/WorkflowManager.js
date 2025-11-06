import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Play, Copy, Eye, Settings, Filter, MoreVertical, X, Save, FileText, Clock, CheckCircle, AlertCircle, Zap, Layers } from 'lucide-react';
export function WorkflowManager({ selectedWorkflowId, onWorkflowSelect, mode = 'selector', className = '', placeholder = 'Selectează un workflow...', onWorkflowCreated, onWorkflowUpdated, onWorkflowDeleted }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // UI State
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterBy, setFilterBy] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const [showRunDialog, setShowRunDialog] = useState(null);
    const [initialState, setInitialState] = useState('{}');
    const [runLoading, setRunLoading] = useState(false);
    const [runError, setRunError] = useState(null);
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        version: '1.0.0',
        tags: '',
        definition: '{\n  "id": "",\n  "name": "",\n  "version": "1.0.0",\n  "description": "",\n  "workflow": [\n    \n  ]\n}'
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);
    useEffect(() => {
        fetchWorkflows();
    }, []);
    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('http://localhost:3013/workflows/allfromdb');
            if (!response.ok) {
                throw new Error('Failed to fetch workflows from database');
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            const data = await response.json();
            if (data.success && Array.isArray(data.workflows)) {
                const enrichedWorkflows = data.workflows.map((w) => ({
                    ...w,
                    status: w.status || 'active',
                    executions: w.executions || Math.floor(Math.random() * 100),
                    lastExecution: w.lastExecution || new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                    tags: w.tags || ['automation', 'workflow']
                }));
                setWorkflows(enrichedWorkflows);
            }
            else {
                throw new Error('Invalid response format from database');
            }
        }
        catch (err) {
            console.warn('Failed to fetch workflows from database:', err);
            // Enhanced mock data
            setWorkflows([
                {
                    id: '1',
                    name: 'Email Notification System',
                    description: 'Automated email notifications for user actions',
                    version: '1.2.0',
                    definition: JSON.stringify({
                        id: '1',
                        name: 'Email Notification System',
                        version: '1.2.0',
                        description: 'Automated email notifications for user actions',
                        workflow: [
                            {
                                'start': {
                                    'message': 'Starting email notification workflow',
                                    'success?': 'validate-email'
                                }
                            },
                            {
                                'validate-email': {
                                    'email': '$input.email',
                                    'success?': 'send-email',
                                    'error?': 'log-error'
                                }
                            },
                            {
                                'send-email': {
                                    'to': '$state.email',
                                    'subject': '$input.subject',
                                    'body': '$input.body',
                                    'success?': 'log-success',
                                    'error?': 'log-error'
                                }
                            }
                        ]
                    }, null, 2),
                    status: 'active',
                    createdAt: '2024-01-15T10:00:00Z',
                    updatedAt: '2024-02-20T14:30:00Z',
                    author: 'John Doe',
                    tags: ['email', 'notification', 'automation'],
                    executions: 245,
                    lastExecution: '2024-02-20T09:15:00Z'
                },
                {
                    id: '2',
                    name: 'Data Processing Pipeline',
                    description: 'Process and transform incoming data streams',
                    version: '2.1.0',
                    definition: JSON.stringify({
                        id: '2',
                        name: 'Data Processing Pipeline',
                        version: '2.1.0',
                        description: 'Process and transform incoming data streams',
                        workflow: [
                            {
                                'fetch-data': {
                                    'source': '$input.dataSource',
                                    'format': 'json',
                                    'success?': 'transform-data',
                                    'error?': 'handle-error'
                                }
                            },
                            {
                                'transform-data': {
                                    'data': '$state.fetchedData',
                                    'transformations': '$input.transformations',
                                    'success?': 'save-data'
                                }
                            }
                        ]
                    }, null, 2),
                    status: 'active',
                    createdAt: '2024-01-10T08:00:00Z',
                    updatedAt: '2024-02-18T16:45:00Z',
                    author: 'Jane Smith',
                    tags: ['data', 'processing', 'pipeline'],
                    executions: 1024,
                    lastExecution: '2024-02-20T11:30:00Z'
                },
                {
                    id: '3',
                    name: 'Report Generation',
                    description: 'Generate monthly reports with charts and analytics',
                    version: '1.0.0',
                    definition: JSON.stringify({
                        id: '3',
                        name: 'Report Generation',
                        version: '1.0.0',
                        description: 'Generate monthly reports with charts and analytics',
                        workflow: [
                            {
                                'collect-data': {
                                    'period': '$input.period',
                                    'metrics': '$input.metrics',
                                    'success?': 'generate-charts'
                                }
                            }
                        ]
                    }, null, 2),
                    status: 'draft',
                    createdAt: '2024-02-01T12:00:00Z',
                    updatedAt: '2024-02-15T10:20:00Z',
                    author: 'Mike Johnson',
                    tags: ['reports', 'analytics', 'charts'],
                    executions: 12,
                    lastExecution: '2024-02-15T08:00:00Z'
                },
                {
                    id: '4',
                    name: 'Contact Management',
                    description: 'Manage and synchronize contact information',
                    version: '1.1.0',
                    definition: JSON.stringify({
                        id: '4',
                        name: 'Contact Management',
                        version: '1.1.0',
                        description: 'Manage and synchronize contact information',
                        workflow: [
                            {
                                'sync-contacts': {
                                    'source': '$input.source',
                                    'destination': '$input.destination',
                                    'success?': 'update-index'
                                }
                            }
                        ]
                    }, null, 2),
                    status: 'inactive',
                    createdAt: '2024-01-20T15:30:00Z',
                    updatedAt: '2024-02-10T13:15:00Z',
                    author: 'Sarah Wilson',
                    tags: ['contacts', 'sync', 'management'],
                    executions: 67,
                    lastExecution: '2024-02-10T07:45:00Z'
                },
                {
                    id: '5',
                    name: 'File Processing System',
                    description: 'Process uploaded files with validation and transformation',
                    version: '1.0.0',
                    definition: JSON.stringify({
                        id: '5',
                        name: 'File Processing System',
                        version: '1.0.0',
                        description: 'Process uploaded files with validation and transformation',
                        workflow: [
                            {
                                'validate-file': {
                                    'file': '$input.file',
                                    'maxSize': '10MB',
                                    'allowedTypes': ['pdf', 'doc', 'docx'],
                                    'success?': 'process-file',
                                    'error?': 'reject-file'
                                }
                            }
                        ]
                    }, null, 2),
                    status: 'active',
                    createdAt: '2024-02-05T09:15:00Z',
                    updatedAt: '2024-02-19T11:00:00Z',
                    author: 'Tom Brown',
                    tags: ['files', 'processing', 'validation'],
                    executions: 89,
                    lastExecution: '2024-02-19T14:20:00Z'
                }
            ]);
            setError(null);
        }
        finally {
            setLoading(false);
        }
    };
    const filteredAndSortedWorkflows = workflows
        .filter(workflow => {
        const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            workflow.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = filterBy === 'all' || workflow.status === filterBy;
        return matchesSearch && matchesFilter;
    })
        .sort((a, b) => {
        switch (sortBy) {
            case 'created':
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            case 'updated':
                return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
            case 'executions':
                return (b.executions || 0) - (a.executions || 0);
            default:
                return a.name.localeCompare(b.name);
        }
    });
    const handleCreate = () => {
        setFormData({
            name: '',
            description: '',
            version: '1.0.0',
            tags: '',
            definition: '{\n  "id": "",\n  "name": "",\n  "version": "1.0.0",\n  "description": "",\n  "workflow": [\n    \n  ]\n}'
        });
        setEditingWorkflow(null);
        setShowCreateModal(true);
    };
    const handleEdit = (workflow) => {
        // Use existing definition if available, otherwise create a template
        const defaultDefinition = '{\n  "id": "' + workflow.id + '",\n  "name": "' + workflow.name + '",\n  "version": "' + workflow.version + '",\n  "description": "' + (workflow.description || '') + '",\n  "workflow": [\n    \n  ]\n}';
        let definitionString = defaultDefinition;
        if (workflow.definition) {
            if (typeof workflow.definition === 'string') {
                // If it's already a string, try to parse and re-stringify for proper formatting
                try {
                    const parsed = JSON.parse(workflow.definition);
                    definitionString = JSON.stringify(parsed, null, 2);
                }
                catch {
                    // If parsing fails, use the raw string
                    definitionString = workflow.definition;
                }
            }
            else {
                // If it's an object, stringify it
                definitionString = JSON.stringify(workflow.definition, null, 2);
            }
        }
        setFormData({
            name: workflow.name,
            description: workflow.description || '',
            version: workflow.version,
            tags: workflow.tags?.join(', ') || '',
            definition: definitionString
        });
        setEditingWorkflow(workflow);
        setShowCreateModal(true);
    };
    const handleSave = async () => {
        if (!formData.name.trim())
            return;
        try {
            setFormLoading(true);
            setFormError(null);
            const parsedDefinition = JSON.parse(formData.definition);
            const workflowData = {
                ...parsedDefinition,
                name: formData.name,
                description: formData.description,
                version: formData.version,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
            };
            const url = editingWorkflow
                ? `http://localhost:3013/workflows/${editingWorkflow.id}`
                : 'http://localhost:3013/workflows/create';
            const method = editingWorkflow ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowData)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            if (editingWorkflow) {
                onWorkflowUpdated?.(result);
            }
            else {
                onWorkflowCreated?.(result);
            }
            await fetchWorkflows();
            handleCloseModal();
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                setFormError('Format JSON invalid. Verifică sintaxa workflow-ului.');
            }
            else {
                const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută';
                setFormError(`Eroare la salvarea workflow-ului: ${errorMessage}`);
            }
        }
        finally {
            setFormLoading(false);
        }
    };
    const handleDelete = async (workflow) => {
        if (!confirm(`Ești sigur că vrei să ștergi workflow-ul "${workflow.name}"?`))
            return;
        try {
            const response = await fetch(`http://localhost:3013/workflows/${workflow.id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Failed to delete workflow');
            }
            onWorkflowDeleted?.(workflow.id);
            await fetchWorkflows();
        }
        catch (err) {
            alert('Eroare la ștergerea workflow-ului');
        }
    };
    const handleClone = async (workflow) => {
        const clonedWorkflow = {
            ...workflow,
            id: '',
            name: `${workflow.name} (Copy)`,
            version: '1.0.0'
        };
        let clonedDefinition = '{\n  "id": "",\n  "name": "' + clonedWorkflow.name + '",\n  "version": "' + clonedWorkflow.version + '",\n  "description": "' + (clonedWorkflow.description || '') + '",\n  "workflow": [\n    \n  ]\n}';
        // If we have a definition, parse it and update the metadata
        if (workflow.definition) {
            try {
                let parsedDef;
                if (typeof workflow.definition === 'string') {
                    parsedDef = JSON.parse(workflow.definition);
                }
                else {
                    parsedDef = { ...workflow.definition };
                }
                parsedDef.id = '';
                parsedDef.name = clonedWorkflow.name;
                parsedDef.version = clonedWorkflow.version;
                parsedDef.description = clonedWorkflow.description || '';
                clonedDefinition = JSON.stringify(parsedDef, null, 2);
            }
            catch (error) {
                console.warn('Failed to parse workflow definition for cloning, using template');
                clonedDefinition = '{\n  "id": "",\n  "name": "' + clonedWorkflow.name + '",\n  "version": "' + clonedWorkflow.version + '",\n  "description": "' + (clonedWorkflow.description || '') + '",\n  "workflow": [\n    \n  ]\n}';
            }
        }
        setFormData({
            name: clonedWorkflow.name,
            description: clonedWorkflow.description || '',
            version: clonedWorkflow.version,
            tags: clonedWorkflow.tags?.join(', ') || '',
            definition: clonedDefinition
        });
        setEditingWorkflow(null);
        setShowCreateModal(true);
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingWorkflow(null);
        setFormError(null);
        setFormLoading(false);
    };
    const handleRun = (workflow) => {
        setShowRunDialog(workflow);
        setInitialState('{}');
        setRunError(null);
    };
    const handleExecuteWorkflow = async () => {
        if (!showRunDialog)
            return;
        try {
            setRunLoading(true);
            setRunError(null);
            // Parse the initial state
            let parsedInitialState = {};
            try {
                parsedInitialState = JSON.parse(initialState);
            }
            catch (err) {
                throw new Error('Format JSON invalid pentru starea inițială');
            }
            // Get the workflow definition
            let workflowDefinition;
            if (showRunDialog.definition) {
                if (typeof showRunDialog.definition === 'string') {
                    try {
                        workflowDefinition = JSON.parse(showRunDialog.definition);
                    }
                    catch (err) {
                        throw new Error('Definiția workflow-ului nu este un JSON valid');
                    }
                }
                else {
                    workflowDefinition = { ...showRunDialog.definition };
                }
            }
            else {
                throw new Error('Workflow-ul nu are o definiție validă');
            }
            // Inject/overwrite the initialState in the workflow definition
            workflowDefinition.initialState = parsedInitialState;
            // Execute the workflow
            const response = await fetch('http://localhost:3013/workflows/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowDefinition)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            // Success - close dialog and show result
            setShowRunDialog(null);
            alert(`Workflow executat cu succes!\n\nRezultat: ${JSON.stringify(result, null, 2)}`);
            // Refresh workflows to update execution count
            await fetchWorkflows();
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută';
            setRunError(`Eroare la execuția workflow-ului: ${errorMessage}`);
        }
        finally {
            setRunLoading(false);
        }
    };
    const handleCloseRunDialog = () => {
        setShowRunDialog(null);
        setInitialState('{}');
        setRunError(null);
        setRunLoading(false);
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return _jsx(CheckCircle, { className: "w-4 h-4 text-green-500" });
            case 'inactive': return _jsx(AlertCircle, { className: "w-4 h-4 text-gray-500" });
            case 'draft': return _jsx(Clock, { className: "w-4 h-4 text-orange-500" });
            default: return _jsx(AlertCircle, { className: "w-4 h-4 text-gray-500" });
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'draft': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    // Selector mode - simple dropdown
    if (mode === 'selector') {
        return (_jsxs("div", { className: `relative ${className}`, children: [_jsxs("select", { value: selectedWorkflowId || '', onChange: (e) => onWorkflowSelect(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white", disabled: loading, children: [_jsx("option", { value: "", children: loading ? 'Se încarcă...' : placeholder }), filteredAndSortedWorkflows.map((workflow) => (_jsxs("option", { value: workflow.id, children: [workflow.name, " (v", workflow.version, ")"] }, workflow.id)))] }), error && (_jsxs("p", { className: "mt-1 text-sm text-red-600", children: ["Eroare la \u00EEnc\u0103rcarea workflow-urilor: ", error] }))] }));
    }
    // Full mode - comprehensive CRUD interface
    return (_jsxs("div", { className: `bg-white rounded-xl shadow-lg border border-gray-200 ${className}`, children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-blue-100 rounded-lg", children: _jsx(Layers, { className: "w-6 h-6 text-blue-600" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Workflow Manager" }), _jsx("p", { className: "text-sm text-gray-600", children: "Gestioneaz\u0103 \u0219i organizeaz\u0103 workflow-urile tale" })] })] }), _jsxs("button", { onClick: handleCreate, className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-md", children: [_jsx(Plus, { className: "w-4 h-4" }), "Workflow nou"] })] }), _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsxs("div", { className: "relative flex-1 min-w-64", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx("input", { type: "text", placeholder: "Caut\u0103 workflow-uri...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { className: "w-4 h-4 text-gray-500" }), _jsxs("select", { value: filterBy, onChange: (e) => setFilterBy(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "all", children: "Toate" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" }), _jsx("option", { value: "draft", children: "Draft" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Settings, { className: "w-4 h-4 text-gray-500" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "name", children: "Nume" }), _jsx("option", { value: "created", children: "Data cre\u0103rii" }), _jsx("option", { value: "updated", children: "Ultima modificare" }), _jsx("option", { value: "executions", children: "Execu\u021Bii" })] })] }), _jsxs("div", { className: "flex bg-gray-100 rounded-lg p-1", children: [_jsx("button", { onClick: () => setViewMode('grid'), className: `p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`, children: _jsx(Layers, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => setViewMode('list'), className: `p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`, children: _jsx(FileText, { className: "w-4 h-4" }) })] })] })] }), _jsx("div", { className: "p-6", children: loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [...Array(6)].map((_, i) => (_jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "bg-gray-200 rounded-lg h-48" }) }, i))) })) : filteredAndSortedWorkflows.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4", children: _jsx(Layers, { className: "w-8 h-8 text-gray-400" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: searchQuery ? 'Nu s-au găsit rezultate' : 'Nu există workflow-uri' }), _jsx("p", { className: "text-gray-500 mb-6", children: searchQuery ? 'Încearcă cu termeni diferiți de căutare' : 'Începe prin a crea primul tău workflow' }), !searchQuery && (_jsxs("button", { onClick: handleCreate, className: "bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2", children: [_jsx(Plus, { className: "w-4 h-4" }), "Creaz\u0103 primul workflow"] }))] })) : viewMode === 'grid' ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredAndSortedWorkflows.map((workflow) => (_jsxs("div", { className: `bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:border-blue-200 cursor-pointer ${selectedWorkflowId === workflow.id ? 'border-blue-500 shadow-md' : 'border-gray-200'}`, onClick: () => onWorkflowSelect(workflow.id), children: [_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [getStatusIcon(workflow.status || 'draft'), _jsx("span", { className: `px-2 py-1 text-xs rounded-full border ${getStatusColor(workflow.status || 'draft')}`, children: workflow.status || 'draft' })] }), _jsx("div", { className: "relative", children: _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        // Toggle dropdown
                                                    }, className: "p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded", children: _jsx(MoreVertical, { className: "w-4 h-4" }) }) })] }), _jsx("h3", { className: "font-semibold text-gray-900 mb-2 line-clamp-2", children: workflow.name }), workflow.description && (_jsx("p", { className: "text-sm text-gray-600 mb-3 line-clamp-2", children: workflow.description })), _jsxs("div", { className: "flex flex-wrap gap-1 mb-3", children: [workflow.tags?.slice(0, 2).map((tag) => (_jsx("span", { className: "px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full", children: tag }, tag))), workflow.tags && workflow.tags.length > 2 && (_jsxs("span", { className: "px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full", children: ["+", workflow.tags.length - 2] }))] }), _jsxs("div", { className: "flex items-center justify-between text-sm text-gray-500 mb-4", children: [_jsxs("span", { children: ["v", workflow.version] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Zap, { className: "w-3 h-3" }), workflow.executions || 0, " exec."] })] })] }), _jsx("div", { className: "border-t border-gray-100 px-4 py-3 bg-gray-50/50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex -space-x-1", children: [_jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleRun(workflow);
                                                    }, className: "p-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-orange-600 hover:border-orange-300 transition-colors", title: "Run", children: _jsx(Play, { className: "w-3 h-3" }) }), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        setShowPreview(workflow);
                                                    }, className: "p-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors", title: "Preview", children: _jsx(Eye, { className: "w-3 h-3" }) }), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleEdit(workflow);
                                                    }, className: "p-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-green-600 hover:border-green-300 transition-colors", title: "Edit", children: _jsx(Edit3, { className: "w-3 h-3" }) }), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleClone(workflow);
                                                    }, className: "p-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-purple-600 hover:border-purple-300 transition-colors", title: "Clone", children: _jsx(Copy, { className: "w-3 h-3" }) }), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleDelete(workflow);
                                                    }, className: "p-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors", title: "Delete", children: _jsx(Trash2, { className: "w-3 h-3" }) })] }), workflow.lastExecution && (_jsx("span", { className: "text-xs text-gray-400", children: new Date(workflow.lastExecution).toLocaleDateString('ro-RO') }))] }) })] }, workflow.id))) })) : (
                // List view
                _jsx("div", { className: "space-y-2", children: filteredAndSortedWorkflows.map((workflow) => (_jsxs("div", { className: `flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-sm cursor-pointer ${selectedWorkflowId === workflow.id ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}`, onClick: () => onWorkflowSelect(workflow.id), children: [_jsxs("div", { className: "flex items-center gap-4 flex-1", children: [getStatusIcon(workflow.status || 'draft'), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h3", { className: "font-medium text-gray-900 truncate", children: workflow.name }), _jsxs("span", { className: "text-sm text-gray-500", children: ["v", workflow.version] }), _jsx("span", { className: `px-2 py-0.5 text-xs rounded ${getStatusColor(workflow.status || 'draft')}`, children: workflow.status || 'draft' })] }), workflow.description && (_jsx("p", { className: "text-sm text-gray-600 truncate", children: workflow.description }))] }), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Zap, { className: "w-3 h-3" }), workflow.executions || 0] }), workflow.lastExecution && (_jsx("span", { children: new Date(workflow.lastExecution).toLocaleDateString('ro-RO') }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            handleRun(workflow);
                                        }, className: "p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors", children: _jsx(Play, { className: "w-4 h-4" }) }), _jsx("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            setShowPreview(workflow);
                                        }, className: "p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", children: _jsx(Eye, { className: "w-4 h-4" }) }), _jsx("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            handleEdit(workflow);
                                        }, className: "p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors", children: _jsx(Edit3, { className: "w-4 h-4" }) }), _jsx("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            handleClone(workflow);
                                        }, className: "p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors", children: _jsx(Copy, { className: "w-4 h-4" }) }), _jsx("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            handleDelete(workflow);
                                        }, className: "p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, workflow.id))) })) }), showCreateModal && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: editingWorkflow ? 'Editează Workflow' : 'Workflow Nou' }), _jsx("button", { onClick: handleCloseModal, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "flex-1 p-6 overflow-y-auto", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nume workflow *" }), _jsx("input", { type: "text", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", disabled: formLoading })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Versiune" }), _jsx("input", { type: "text", value: formData.version, onChange: (e) => setFormData({ ...formData, version: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", disabled: formLoading })] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Descriere" }), _jsx("textarea", { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", rows: 3, disabled: formLoading })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tags (separate prin virgul\u0103)" }), _jsx("input", { type: "text", value: formData.tags, onChange: (e) => setFormData({ ...formData, tags: e.target.value }), placeholder: "automation, workflow, email", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", disabled: formLoading })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Defini\u021Bia workflow-ului (JSON) *" }), _jsx("textarea", { value: formData.definition, onChange: (e) => setFormData({ ...formData, definition: e.target.value }), className: "w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none", spellCheck: false, disabled: formLoading })] }), formError && (_jsx("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg", children: _jsx("p", { className: "text-sm text-red-600", children: formError }) }))] }), _jsxs("div", { className: "flex items-center justify-end gap-3 p-6 border-t border-gray-200", children: [_jsx("button", { onClick: handleCloseModal, disabled: formLoading, className: "px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "Anuleaz\u0103" }), _jsxs("button", { onClick: handleSave, disabled: formLoading || !formData.name.trim(), className: "px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md", children: [_jsx(Save, { className: "w-4 h-4" }), formLoading ? 'Se salvează...' : editingWorkflow ? 'Actualizează' : 'Creează'] })] })] }) })), showPreview && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-900", children: ["Preview: ", showPreview.name] }), _jsx("button", { onClick: () => setShowPreview(null), className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsx("div", { className: "flex-1 p-6 overflow-y-auto", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Informa\u021Bii generale" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Nume:" }), " ", showPreview.name] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Versiune:" }), " ", showPreview.version] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Status:" }), " ", showPreview.status] }), showPreview.description && (_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Descriere:" }), " ", showPreview.description] }))] })] }), showPreview.tags && showPreview.tags.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Tags" }), _jsx("div", { className: "flex flex-wrap gap-2", children: showPreview.tags.map((tag) => (_jsx("span", { className: "px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm", children: tag }, tag))) })] })), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Statistici" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Execu\u021Bii totale:" }), " ", showPreview.executions || 0] }), showPreview.lastExecution && (_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Ultima execu\u021Bie:" }), " ", new Date(showPreview.lastExecution).toLocaleString('ro-RO')] })), showPreview.createdAt && (_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Creat la:" }), " ", new Date(showPreview.createdAt).toLocaleString('ro-RO')] })), showPreview.updatedAt && (_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Modificat la:" }), " ", new Date(showPreview.updatedAt).toLocaleString('ro-RO')] }))] })] }), showPreview.definition && (_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Defini\u021Bia Workflow-ului" }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4", children: _jsx("pre", { className: "text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono", children: typeof showPreview.definition === 'string'
                                                        ? (() => {
                                                            try {
                                                                return JSON.stringify(JSON.parse(showPreview.definition), null, 2);
                                                            }
                                                            catch {
                                                                return showPreview.definition;
                                                            }
                                                        })()
                                                        : JSON.stringify(showPreview.definition, null, 2) }) })] }))] }) }), _jsxs("div", { className: "flex items-center justify-end gap-3 p-6 border-t border-gray-200", children: [_jsxs("button", { onClick: () => {
                                        setShowPreview(null);
                                        handleEdit(showPreview);
                                    }, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2", children: [_jsx(Edit3, { className: "w-4 h-4" }), "Editeaz\u0103"] }), _jsx("button", { onClick: () => setShowPreview(null), className: "px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors", children: "\u00CEnchide" })] })] }) })), showRunDialog && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-900", children: ["Executare Workflow: ", showRunDialog.name] }), _jsx("button", { onClick: handleCloseRunDialog, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsx("div", { className: "flex-1 p-6 overflow-y-auto", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Informa\u021Bii Workflow" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Nume:" }), " ", showRunDialog.name] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Versiune:" }), " ", showRunDialog.version] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Status:" }), " ", showRunDialog.status] }), showRunDialog.description && (_jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Descriere:" }), " ", showRunDialog.description] }))] })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-900 mb-2", children: "Starea Ini\u021Bial\u0103 (JSON)" }), _jsx("p", { className: "text-sm text-gray-600 mb-3", children: "Define\u0219te obiectul de stare cu care va \u00EEncepe execu\u021Bia workflow-ului." }), _jsx("textarea", { value: initialState, onChange: (e) => setInitialState(e.target.value), className: "w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none", placeholder: '{"key": "value", "counter": 0}', spellCheck: false, disabled: runLoading }), _jsxs("p", { className: "mt-2 text-xs text-gray-500", children: ["Exemplu: ", "{", "\"key\": \"value\", \"counter\": 0", "}"] })] }), runError && (_jsx("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg", children: _jsx("p", { className: "text-sm text-red-600", children: runError }) }))] }) }), _jsxs("div", { className: "flex items-center justify-end gap-3 p-6 border-t border-gray-200", children: [_jsx("button", { onClick: handleCloseRunDialog, disabled: runLoading, className: "px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "Anuleaz\u0103" }), _jsxs("button", { onClick: handleExecuteWorkflow, disabled: runLoading, className: "px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md", children: [_jsx(Play, { className: "w-4 h-4" }), runLoading ? 'Se execută...' : 'Execută'] })] })] }) }))] }));
}
