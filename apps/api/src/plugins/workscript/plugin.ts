import type { SaaSPlugin } from '../../core/plugins';
import { Hono } from 'hono';
import workflowRoutes from './workflows';
import automationRoutes from './automations';
import executionRoutes from './executions';
import nodeRoutes from './nodes';
import resourceRoutes from './resources';
import reflectionRoutes from './reflection';
import { WorkflowService } from './services/WorkflowService';
import { CronScheduler, type AutomationExecutionContext } from '../../shared-services/scheduler';
import { AutomationRepository } from './repositories/automationRepository';
import { WorkflowRepository } from './repositories/workflowRepository';
import { workflows, workflowExecutions } from './schema/workscript.schema';
import { resources, resourceOperations } from './schema/resources.schema';
import { getStorageService } from '../../shared-services/storage';

// Create main router for the plugin
const router = new Hono();

// Root endpoint
router.get('/', (c) => c.json({
  message: 'Workscript plugin running!',
  version: '1.0.0',
  endpoints: [
    '/workscript/workflows/*',
    '/workscript/automations/*',
    '/workscript/executions/*',
    '/workscript/nodes/*',
    '/workscript/resources/*',
    '/workscript/reflection/*'
  ]
}));

// Mount sub-routers
router.route('/workflows', workflowRoutes);
router.route('/automations', automationRoutes);
router.route('/executions', executionRoutes);
router.route('/nodes', nodeRoutes);
router.route('/resources', resourceRoutes);
router.route('/reflection', reflectionRoutes);

/**
 * Workscript Plugin Definition
 *
 * This plugin provides workflow orchestration capabilities with:
 * - Workflow creation, validation, and execution
 * - Automation with cron scheduling
 * - Node-based workflow system
 * - Real-time WebSocket monitoring
 */
const plugin: SaaSPlugin = {
  id: 'workscript',
  name: 'Workscript',
  version: '1.0.0',
  description: 'Agentic workflow orchestration engine with AI-first design',
  enabled: true,

  // Routes
  routes: {
    basePath: '/workscript',
    router
  },

  // Database schema
  schema: {
    tables: [workflows, workflowExecutions, resources, resourceOperations]
    // Note: automations and automationExecutions are in shared schema
  },

  // AI Manifest - Provides LLM-friendly API documentation
  aiManifest: {
    capabilities: [
      'Create, update, delete, and execute workflows with JSON definitions',
      'Validate workflow syntax and structure before execution',
      'Store workflows both in database and filesystem',
      'Schedule automated workflow execution with cron expressions',
      'Trigger workflows via webhooks with custom payloads',
      'Execute individual nodes in isolation for testing',
      'Real-time workflow monitoring via WebSocket events',
      'Comprehensive execution history with state tracking',
      'Execution timeline, node logs, and state change analysis',
      'Comprehensive node library (35+ nodes for data, logic, AI, integrations)',
      'Store and manage files in sandboxed environment',
      'Upload images, audio, and documents for multi-modal workflows',
      'Create and interpolate AI prompt templates with {{$.var}} syntax',
      'Track all file operations with audit logging'
    ],
    when_to_use: 'When you need to automate business processes, orchestrate complex workflows, execute repeatable task sequences, schedule recurring jobs, or integrate external services via webhooks',

    endpoints: {
      // ============= WORKFLOWS =============
      workflows: {
        description: 'Workflow management - create, read, update, delete, and execute workflows',
        routes: [
          {
            path: '/workscript/workflows/create',
            method: 'POST',
            auth: 'Required (WORKFLOW_CREATE permission)',
            description: 'Create and save a workflow definition to the database',
            body: {
              name: 'string (required) - Workflow display name',
              description: 'string (optional) - Workflow description',
              version: 'string (optional, default: "1.0.0") - Semantic version',
              definition: 'WorkflowDefinition (required) - Complete workflow JSON with id, name, version, initialState, and workflow array',
              isActive: 'boolean (optional, default: true) - Whether workflow is active'
            },
            response: '{ success: boolean, workflow: Workflow, message: string }'
          },
          {
            path: '/workscript/workflows/run',
            method: 'POST',
            auth: 'Required (WORKFLOW_EXECUTE permission)',
            description: 'Execute a workflow immediately. Can accept either a direct definition or a workflowId to fetch from database. Creates execution record with full state tracking.',
            body: {
              definition: 'WorkflowDefinition (optional) - Direct workflow JSON to execute',
              workflowId: 'string (optional) - ID of existing workflow in database',
              initialState: 'object (optional) - Initial state to inject into workflow execution'
            },
            notes: 'Either definition OR workflowId must be provided. JWT token from auth header is automatically injected into state as JWT_token.',
            response: '{ status: "completed"|"failed", executionId: string, finalState: object, nodeLogs: array }'
          },
          {
            path: '/workscript/workflows/validate',
            method: 'POST',
            auth: 'Required (WORKFLOW_READ permission)',
            description: 'Validate a workflow definition without executing. Checks syntax, node references, and edge definitions.',
            body: { workflowDefinition: 'WorkflowDefinition - Complete workflow JSON to validate' },
            response: '{ valid: boolean, errors?: array }'
          },
          {
            path: '/workscript/workflows/store',
            method: 'POST',
            auth: 'Required (WORKFLOW_CREATE permission)',
            description: 'Store workflow definition to filesystem (apps/api/src/workflows/)',
            body: { workflowDefinition: 'WorkflowDefinition - Workflow JSON with required id field' },
            query: { subfolder: 'string (optional) - Subfolder name within workflows directory' },
            response: '{ success: boolean, filePath: string, subfolder: string|null }'
          },
          {
            path: '/workscript/workflows/run/:workflowId',
            method: 'POST',
            auth: 'Required (WORKFLOW_EXECUTE permission)',
            description: 'Execute a workflow by ID from filesystem. Searches recursively in workflows directory.',
            params: { workflowId: 'string - Workflow ID (filename without .json)' },
            response: '{ status: string, executionId: string, workflowFile: string, subfolder: string|null }'
          },
          {
            path: '/workscript/workflows/allnodes',
            method: 'GET',
            auth: 'Required (WORKFLOW_READ permission)',
            description: 'Get all available workflow nodes with metadata (id, name, description, inputs, outputs, ai_hints)',
            response: '{ success: boolean, count: number, nodes: NodeMetadata[] }'
          },
          {
            path: '/workscript/workflows/allfromdb',
            method: 'GET',
            auth: 'Required (WORKFLOW_READ permission)',
            description: 'Get all workflows stored in database',
            response: '{ success: boolean, count: number, workflows: Workflow[] }'
          },
          {
            path: '/workscript/workflows/all',
            method: 'GET',
            auth: 'Required (WORKFLOW_READ permission)',
            description: 'Get all workflows from filesystem (recursively scans workflows directory)',
            response: '{ success: boolean, count: number, workflows: array }'
          },
          {
            path: '/workscript/workflows/:workflowId',
            method: 'GET',
            auth: 'Required (WORKFLOW_READ permission)',
            description: 'Get a single workflow by ID from database',
            params: { workflowId: 'string - Workflow ID' },
            response: '{ success: boolean, workflow: Workflow }'
          },
          {
            path: '/workscript/workflows/:workflowId',
            method: 'PUT',
            auth: 'Required (WORKFLOW_UPDATE permission)',
            description: 'Update an existing workflow. Validates definition if provided.',
            params: { workflowId: 'string - Workflow ID' },
            body: {
              name: 'string (optional)',
              description: 'string (optional)',
              version: 'string (optional)',
              definition: 'WorkflowDefinition (optional)',
              isActive: 'boolean (optional)'
            },
            response: '{ success: boolean, workflow: Workflow }'
          },
          {
            path: '/workscript/workflows/:workflowId',
            method: 'DELETE',
            auth: 'Required (WORKFLOW_DELETE permission)',
            description: 'Delete a workflow from database',
            params: { workflowId: 'string - Workflow ID' },
            response: '{ success: boolean, workflowId: string }'
          },
          {
            path: '/workscript/workflows/:workflowId/executions',
            method: 'GET',
            auth: 'Optional',
            description: 'Get execution history for a specific workflow',
            params: { workflowId: 'string - Workflow ID' },
            query: { limit: 'number (optional, default: 20) - Max executions to return' },
            response: '{ success: boolean, items: WorkflowExecution[], count: number }'
          },
          {
            path: '/workscript/workflows/:workflowId/automations',
            method: 'GET',
            auth: 'Optional',
            description: 'Get all automations configured for a specific workflow',
            params: { workflowId: 'string - Workflow ID' },
            response: '{ success: boolean, items: Automation[], count: number }'
          }
        ]
      },

      // ============= AUTOMATIONS =============
      automations: {
        description: 'Automation management - schedule workflows with cron, webhooks, or manual triggers',
        routes: [
          {
            path: '/workscript/automations',
            method: 'GET',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'List all automations with optional filtering',
            query: {
              agencyId: 'number (optional) - Filter by agency ID',
              enabled: '"true"|"false" (optional) - Filter by enabled status',
              triggerType: '"cron"|"webhook"|"immediate" (optional) - Filter by trigger type'
            },
            response: 'Automation[]'
          },
          {
            path: '/workscript/automations',
            method: 'POST',
            auth: 'Required (AUTOMATION_CREATE permission)',
            description: 'Create a new automation. Automatically schedules cron jobs if enabled.',
            body: {
              name: 'string (required) - Automation name',
              description: 'string (optional) - Description',
              agencyId: 'number (optional) - Agency ID for multi-tenant',
              workflowId: 'string (required) - ID of workflow to execute',
              triggerType: '"cron"|"webhook"|"immediate" (required)',
              triggerConfig: 'object - Trigger-specific config',
              enabled: 'boolean (optional, default: true)'
            },
            triggerConfigExamples: {
              cron: '{ cronExpression: "0 9 * * *", timezone: "America/New_York" }',
              webhook: '{ webhookUrl: "my-webhook-path" }',
              immediate: '{}'
            },
            response: 'Automation'
          },
          {
            path: '/workscript/automations/server-time',
            method: 'GET',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'Get current server time and timezone (useful for cron scheduling)',
            response: '{ currentTime: ISO8601, timezone: string, localTime: string, utcOffset: number }'
          },
          {
            path: '/workscript/automations/scheduler/status',
            method: 'GET',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'Get CronScheduler status including all scheduled jobs',
            response: '{ status: "running", jobs: array, ... }'
          },
          {
            path: '/workscript/automations/cron/validate',
            method: 'POST',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'Validate a cron expression and get next run time',
            body: { cronExpression: 'string - Cron expression to validate' },
            response: '{ valid: boolean, nextRun?: ISO8601, error?: string }'
          },
          {
            path: '/workscript/automations/webhook/:webhookPath',
            method: 'POST',
            auth: 'None (public webhook)',
            description: 'Execute a webhook-triggered automation. Request body becomes workflow initialState.',
            params: { webhookPath: 'string - Webhook path configured in automation' },
            body: 'any - JSON payload injected as workflow initialState',
            response: '{ message: string, executionId: string, automationId: string }'
          },
          {
            path: '/workscript/automations/:id',
            method: 'GET',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'Get a single automation by ID',
            response: 'Automation'
          },
          {
            path: '/workscript/automations/:id/stats',
            method: 'GET',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'Get automation with execution statistics (success rate, average duration, etc.)',
            response: 'Automation & { stats: { totalRuns, successCount, failureCount, successRate, averageDuration, lastRunAt } }'
          },
          {
            path: '/workscript/automations/:id/executions',
            method: 'GET',
            auth: 'Required (AUTOMATION_READ permission)',
            description: 'Get execution history for a specific automation',
            response: 'AutomationExecution[]'
          },
          {
            path: '/workscript/automations/:id',
            method: 'PUT',
            auth: 'Required (AUTOMATION_UPDATE permission)',
            description: 'Update an automation. Reschedules cron job if expression changed.',
            body: 'Partial<Automation>',
            response: 'Automation'
          },
          {
            path: '/workscript/automations/:id/toggle',
            method: 'PATCH',
            auth: 'Required (AUTOMATION_UPDATE permission)',
            description: 'Toggle automation enabled/disabled status. Schedules/unschedules cron job accordingly.',
            body: { enabled: 'boolean' },
            response: 'Automation'
          },
          {
            path: '/workscript/automations/:id/execute',
            method: 'POST',
            auth: 'Required (AUTOMATION_EXECUTE permission)',
            description: 'Execute an automation immediately (manual trigger). Creates execution record.',
            response: '{ message: string, executionId: string, automation: Automation }'
          },
          {
            path: '/workscript/automations/:id/reschedule',
            method: 'POST',
            auth: 'Required (AUTOMATION_UPDATE permission)',
            description: 'Manually reschedule a cron automation',
            response: '{ message: string, automation: Automation }'
          },
          {
            path: '/workscript/automations/:id',
            method: 'DELETE',
            auth: 'Required (AUTOMATION_DELETE permission)',
            description: 'Delete an automation and all its execution history',
            response: '{ message: string }'
          }
        ]
      },

      // ============= EXECUTIONS =============
      executions: {
        description: 'Execution history and analysis - view logs, state changes, timelines',
        routes: [
          {
            path: '/workscript/executions',
            method: 'GET',
            auth: 'Required (EXECUTION_READ permission)',
            description: 'List all workflow executions with filtering and pagination',
            query: {
              status: '"pending"|"running"|"completed"|"failed" (optional)',
              workflowId: 'string (optional) - Filter by workflow',
              startDate: 'ISO8601 (optional) - Filter executions after this date',
              endDate: 'ISO8601 (optional) - Filter executions before this date',
              pageSize: 'number (optional, default: 50, max: 100)',
              sortBy: '"startTime"|"completedAt" (optional, default: "startTime")',
              sortOrder: '"asc"|"desc" (optional, default: "desc")'
            },
            response: '{ items: Execution[], count: number, filters: object, pagination: object }'
          },
          {
            path: '/workscript/executions/stats',
            method: 'GET',
            auth: 'Required (EXECUTION_READ permission)',
            description: 'Get aggregate execution statistics',
            query: {
              workflowId: 'string (optional)',
              startDate: 'ISO8601 (optional)',
              endDate: 'ISO8601 (optional)'
            },
            response: '{ total: number, byStatus: { pending, running, completed, failed }, successRate: number, averageDuration: number }'
          },
          {
            path: '/workscript/executions/:id',
            method: 'GET',
            auth: 'Required (EXECUTION_READ permission)',
            description: 'Get detailed execution by ID including workflow name, states, and logs',
            response: 'ExecutionDetail'
          },
          {
            path: '/workscript/executions/:id/state-changes',
            method: 'GET',
            auth: 'Required (EXECUTION_READ permission)',
            description: 'Get state changes that occurred during execution (computed from node logs or initial/final state diff)',
            response: '{ items: StateChange[], count: number }'
          },
          {
            path: '/workscript/executions/:id/node-logs',
            method: 'GET',
            auth: 'Required (EXECUTION_READ permission)',
            description: 'Get detailed node execution logs (nodeId, nodeType, duration, status, config, output, errors)',
            response: '{ items: NodeLog[], count: number }'
          },
          {
            path: '/workscript/executions/:id/timeline',
            method: 'GET',
            auth: 'Required (EXECUTION_READ permission)',
            description: 'Get chronological timeline of execution events (workflow:started, node:started, node:completed, state:changed, workflow:completed/failed)',
            response: '{ items: TimelineEvent[], count: number }'
          },
          {
            path: '/workscript/executions/:id/rerun',
            method: 'POST',
            auth: 'Required (EXECUTION_RERUN permission)',
            description: 'Re-run a previous execution (returns 501 Not Implemented - planned feature)',
            response: '501 Not Implemented'
          }
        ]
      },

      // ============= NODES =============
      nodes: {
        description: 'Node introspection and isolated execution for testing',
        routes: [
          {
            path: '/workscript/nodes',
            method: 'GET',
            auth: 'None',
            description: 'List all available workflow nodes',
            query: { source: '"universal"|"server" (optional) - Filter by node source' },
            response: '{ success: boolean, count: number, nodes: NodeMetadata[] }'
          },
          {
            path: '/workscript/nodes/metadata/:nodeId',
            method: 'GET',
            auth: 'None',
            description: 'Get detailed metadata for a specific node (inputs, outputs, ai_hints)',
            params: { nodeId: 'string - Node ID (e.g., "math", "filter", "database")' },
            response: '{ success: boolean, metadata: NodeMetadata }'
          },
          {
            path: '/workscript/nodes/run/:nodeId',
            method: 'POST',
            auth: 'None',
            description: 'Execute a single node in isolation for testing. Useful for debugging node configurations.',
            params: { nodeId: 'string - Node ID to execute' },
            body: {
              config: 'object (required) - Node configuration',
              initialState: 'object (optional) - Initial state for the execution context'
            },
            response: '{ success: boolean, nodeId: string, executionId: string, edges: object, finalState: object, metadata: { executedAt, duration } }'
          }
        ]
      },

      // ============= RESOURCES =============
      resources: {
        description: 'Resource management - sandboxed file storage and template interpolation for workflows',
        routes: [
          {
            path: '/workscript/resources/create',
            method: 'POST',
            auth: 'Required (RESOURCE_CREATE permission)',
            description: 'Create a new resource by providing content directly. Use for AI prompt templates, JSON configs, and text-based files.',
            body: {
              name: 'string (required) - Resource display name',
              content: 'string (required) - File content (text)',
              path: 'string (required) - Relative path within sandbox (e.g., "prompts/greeting.md")',
              type: 'string (optional) - Resource type: "prompt"|"document"|"data" (auto-detected from extension)',
              description: 'string (optional) - Resource description',
              tags: 'string[] (optional) - Tags for filtering',
              isPublic: 'boolean (optional, default: false) - Whether other tenants can access'
            },
            response: '{ success: boolean, resource: Resource }',
            statusCodes: {
              201: 'Resource created successfully',
              400: 'Validation error (missing required fields)',
              409: 'RESOURCE_EXISTS - File already exists at path'
            }
          },
          {
            path: '/workscript/resources/upload',
            method: 'POST',
            auth: 'Required (RESOURCE_CREATE permission)',
            description: 'Upload a file via multipart form. Use for images, audio, PDFs, and binary files.',
            body: {
              file: 'File (required) - Multipart file upload',
              name: 'string (optional) - Resource name (defaults to filename)',
              description: 'string (optional) - Resource description',
              tags: 'string (optional) - Comma-separated tags',
              isPublic: 'boolean (optional, default: false)'
            },
            constraints: {
              maxFileSize: '50MB',
              allowedTypes: '.md, .txt, .json, .csv, .png, .jpg, .jpeg, .gif, .webp, .mp3, .wav, .pdf'
            },
            response: '{ success: boolean, resource: Resource }',
            statusCodes: {
              201: 'Resource uploaded successfully',
              400: 'FILE_TOO_LARGE or INVALID_FILE_TYPE'
            }
          },
          {
            path: '/workscript/resources',
            method: 'GET',
            auth: 'Required (RESOURCE_READ permission)',
            description: 'List resources with filtering and pagination. Returns resources for current tenant plus public resources.',
            query: {
              type: 'string (optional) - Filter by type: "prompt"|"image"|"audio"|"document"|"data"',
              authorType: 'string (optional) - Filter by author: "user"|"workflow"|"automation"|"system"',
              tags: 'string (optional) - Comma-separated tags to filter by (any match)',
              search: 'string (optional) - Search in name and description',
              limit: 'number (optional, default: 50, max: 100) - Results per page',
              offset: 'number (optional, default: 0) - Skip N results for pagination',
              sortBy: '"createdAt"|"name" (optional, default: "createdAt")'
            },
            response: '{ items: Resource[], count: number, pagination: { limit, offset } }'
          },
          {
            path: '/workscript/resources/:id',
            method: 'GET',
            auth: 'Required (RESOURCE_READ permission)',
            description: 'Get resource metadata by ID (does not return file content)',
            params: { id: 'string - Resource ID (CUID2)' },
            response: '{ success: boolean, resource: Resource }',
            statusCodes: { 404: 'RESOURCE_NOT_FOUND' }
          },
          {
            path: '/workscript/resources/:id/content',
            method: 'GET',
            auth: 'Required (RESOURCE_READ permission)',
            description: 'Download raw file content. Sets appropriate Content-Type header.',
            params: { id: 'string - Resource ID' },
            response: 'Raw file content with Content-Type and Content-Disposition headers',
            statusCodes: { 404: 'RESOURCE_NOT_FOUND' }
          },
          {
            path: '/workscript/resources/:id',
            method: 'PUT',
            auth: 'Required (RESOURCE_UPDATE permission)',
            description: 'Update resource metadata (name, description, tags, visibility). Does not change file content.',
            params: { id: 'string - Resource ID' },
            body: {
              name: 'string (optional) - New name (must not be empty)',
              description: 'string (optional) - New description',
              tags: 'string[] (optional) - New tags (replaces existing)',
              isPublic: 'boolean (optional) - Change visibility'
            },
            response: '{ success: boolean, resource: Resource }',
            statusCodes: { 404: 'RESOURCE_NOT_FOUND' }
          },
          {
            path: '/workscript/resources/:id/content',
            method: 'PUT',
            auth: 'Required (RESOURCE_UPDATE permission)',
            description: 'Replace file content. Recomputes checksum and size. Path is immutable.',
            params: { id: 'string - Resource ID' },
            body: { content: 'string (required) - New file content' },
            response: '{ success: boolean, resource: Resource, previousChecksum: string, newChecksum: string }',
            statusCodes: { 404: 'RESOURCE_NOT_FOUND' }
          },
          {
            path: '/workscript/resources/:id',
            method: 'DELETE',
            auth: 'Required (RESOURCE_DELETE permission)',
            description: 'Soft delete a resource. Sets isActive=false but keeps file on disk.',
            params: { id: 'string - Resource ID' },
            response: '{ success: boolean, resourceId: string }',
            statusCodes: { 404: 'RESOURCE_NOT_FOUND or already deleted' }
          },
          {
            path: '/workscript/resources/:id/interpolate',
            method: 'POST',
            auth: 'Required (RESOURCE_READ permission)',
            description: 'Interpolate template variables in resource content. Replaces {{$.key}} placeholders with state values. Does NOT modify the source file.',
            params: { id: 'string - Resource ID' },
            body: {
              state: 'object (required) - State object for variable substitution',
              workflowId: 'string (optional) - Workflow ID for audit logging',
              executionId: 'string (optional) - Execution ID for audit logging',
              nodeId: 'string (optional) - Node ID for audit logging'
            },
            templateSyntax: {
              '{{$.key}}': 'Replaced with state.key value',
              '{{$.nested.path}}': 'Replaced with state.nested.path value',
              'Missing keys': 'Left as-is (not replaced)'
            },
            response: '{ success: boolean, content: string }',
            statusCodes: {
              400: 'INVALID_RESOURCE_TYPE - Resource is not a text file',
              404: 'RESOURCE_NOT_FOUND'
            }
          },
          {
            path: '/workscript/resources/:id/copy',
            method: 'POST',
            auth: 'Required (RESOURCE_CREATE permission)',
            description: 'Create a copy of an existing resource with new ID and optional new name/path.',
            params: { id: 'string - Source resource ID' },
            body: {
              name: 'string (optional) - New name (defaults to "Copy of {original}")',
              path: 'string (optional) - New path (auto-generated if not provided)'
            },
            response: '{ success: boolean, resource: Resource }',
            statusCodes: {
              404: 'Source RESOURCE_NOT_FOUND',
              409: 'Target path already exists'
            }
          }
        ]
      },

      // ============= REFLECTION =============
      reflection: {
        description: 'Reflection API - introspection and "consciousness layer" for AI agents to understand and compose workflows',
        routes: [
          {
            path: '/workscript/reflection/',
            method: 'GET',
            auth: 'None',
            description: 'Get API overview and available endpoints'
          },
          {
            path: '/workscript/reflection/nodes',
            method: 'GET',
            auth: 'None',
            description: 'List all nodes with deep introspection data (category, complexity, inputSchema, edgeConditions, stateInteractions)',
            query: {
              category: 'string (optional) - Filter by category: core|ai|orchestration|data-manipulation|server|integrations',
              search: 'string (optional) - Search nodes by name or description'
            },
            response: '{ nodes: ReflectionNodeInfo[], metadata: { totalNodes, byCategory } }'
          },
          {
            path: '/workscript/reflection/nodes/:nodeId',
            method: 'GET',
            auth: 'None',
            description: 'Get complete introspection for a specific node',
            response: 'ReflectionNodeInfo'
          },
          {
            path: '/workscript/reflection/nodes/:nodeId/operations',
            method: 'GET',
            auth: 'None',
            description: 'Get available operations for operation-based nodes (filter, switch, etc.)',
            response: '{ nodeId, operations: { string: [], number: [], boolean: [], date: [], array: [], object: [] } }'
          },
          {
            path: '/workscript/reflection/nodes/:nodeId/examples',
            method: 'GET',
            auth: 'None',
            description: 'Get usage examples for a node',
            response: '{ nodeId, examples: [], exampleWorkflow?: WorkflowDefinition }'
          },
          {
            path: '/workscript/reflection/source/:nodeId',
            method: 'GET',
            auth: 'None',
            description: 'Get structured source code with parsed class info, methods, and interfaces',
            response: '{ language: "typescript", content, path, structure, highlights, relatedFiles }'
          },
          {
            path: '/workscript/reflection/source/:nodeId/raw',
            method: 'GET',
            auth: 'None',
            description: 'Get raw TypeScript source code (text/plain)',
            response: 'Raw TypeScript source'
          },
          {
            path: '/workscript/reflection/manifest',
            method: 'GET',
            auth: 'None',
            description: 'Get full AI manifest with system prompt, quick reference, and capabilities',
            response: 'AIManifest'
          },
          {
            path: '/workscript/reflection/manifest/compact',
            method: 'GET',
            auth: 'None',
            description: 'Get compressed manifest for smaller context windows (~5000 tokens)',
            response: 'CompactManifest'
          },
          {
            path: '/workscript/reflection/manifest/custom',
            method: 'POST',
            auth: 'None',
            description: 'Generate filtered manifest for specific use cases',
            body: {
              useCase: '"data-pipeline"|"ai-workflow"|"integration"|"full" (optional)',
              includeCategories: 'string[] (optional)',
              excludeNodes: 'string[] (optional)',
              maxTokens: 'number (optional)',
              format: '"markdown"|"json"|"structured" (optional)'
            },
            response: 'AIManifest'
          },
          {
            path: '/workscript/reflection/analysis/explain',
            method: 'POST',
            auth: 'None',
            description: 'Get detailed workflow explanation with step-by-step analysis',
            body: { workflow: 'WorkflowDefinition' },
            response: 'WorkflowAnalysis'
          },
          {
            path: '/workscript/reflection/analysis/validate-deep',
            method: 'POST',
            auth: 'None',
            description: 'Perform semantic validation beyond JSON schema',
            body: { workflow: 'WorkflowDefinition' },
            response: '{ valid, schemaErrors, semanticIssues, stateConsistency }'
          },
          {
            path: '/workscript/reflection/analysis/optimize',
            method: 'POST',
            auth: 'None',
            description: 'Get optimization suggestions for a workflow',
            body: { workflow: 'WorkflowDefinition' },
            response: '{ suggestions: OptimizationSuggestion[] }'
          },
          {
            path: '/workscript/reflection/analysis/:workflowId',
            method: 'GET',
            auth: 'Required (JWT)',
            description: 'Analyze a stored workflow by ID',
            response: 'WorkflowAnalysis'
          },
          {
            path: '/workscript/reflection/composability/graph',
            method: 'GET',
            auth: 'None',
            description: 'Get full node compatibility matrix',
            response: 'ComposabilityGraph'
          },
          {
            path: '/workscript/reflection/composability/from/:nodeId',
            method: 'GET',
            auth: 'None',
            description: 'Get possible successors for a node',
            response: 'SuccessorsResponse'
          },
          {
            path: '/workscript/reflection/composability/to/:nodeId',
            method: 'GET',
            auth: 'None',
            description: 'Get possible predecessors for a node',
            response: 'PredecessorsResponse'
          },
          {
            path: '/workscript/reflection/composability/suggest',
            method: 'POST',
            auth: 'None',
            description: 'Get context-aware node suggestions',
            body: {
              currentNode: 'string',
              currentEdge: 'string',
              currentState: 'object',
              intent: 'string (optional)'
            },
            response: '{ suggestions: NodeSuggestion[] }'
          },
          {
            path: '/workscript/reflection/patterns',
            method: 'GET',
            auth: 'None',
            description: 'List all recognized workflow patterns',
            query: { category: 'string (optional)' },
            response: 'Pattern[]'
          },
          {
            path: '/workscript/reflection/patterns/:patternId',
            method: 'GET',
            auth: 'None',
            description: 'Get complete pattern details with template',
            response: 'Pattern'
          },
          {
            path: '/workscript/reflection/patterns/detect',
            method: 'POST',
            auth: 'None',
            description: 'Detect patterns in a workflow',
            body: { workflow: 'WorkflowDefinition' },
            response: 'PatternDetectionResponse'
          },
          {
            path: '/workscript/reflection/patterns/generate',
            method: 'POST',
            auth: 'None',
            description: 'Generate workflow from pattern template',
            body: {
              patternId: 'string',
              parameters: 'object'
            },
            response: 'PatternGenerationResponse'
          }
        ]
      }
    },

    // ============= WEBSOCKET =============
    websocket: {
      endpoint: 'ws://localhost:3013/ws',
      channel: 'workflow-events',
      description: 'Real-time workflow execution monitoring via WebSocket',
      events: [
        { type: 'workflow:started', payload: '{ workflowId, timestamp, state: "starting" }' },
        { type: 'workflow:completed', payload: '{ workflowId, result, timestamp, state: "completed" }' },
        { type: 'workflow:error', payload: '{ workflowId, error: { message, stack }, timestamp, state: "error" }' },
        { type: 'node:started', payload: '{ workflowId, nodeId, nodeType, data, timestamp, state: "executing" }' },
        { type: 'node:completed', payload: '{ workflowId, nodeId, nodeType, result, timestamp, state: "completed" }' },
        { type: 'node:error', payload: '{ workflowId, nodeId, nodeType, error, timestamp, state: "error" }' }
      ]
    },

    // ============= DATABASE SCHEMA =============
    schema: {
      workflows: {
        description: 'Workflow definitions stored in database',
        fields: ['id', 'name', 'description', 'definition (JSON)', 'version', 'isActive', 'createdAt', 'updatedAt']
      },
      workflowExecutions: {
        description: 'Execution history for workflows',
        fields: ['id', 'workflowId', 'status', 'triggeredBy', 'initialState', 'finalState', 'result', 'error', 'stackTrace', 'failedNodeId', 'nodeLogs', 'startedAt', 'completedAt']
      },
      automations: {
        description: 'Scheduled/triggered workflow automations (shared table filtered by pluginId="workscript")',
        fields: ['id', 'agencyId', 'pluginId', 'name', 'description', 'workflowId', 'triggerType', 'triggerConfig', 'enabled', 'runCount', 'successCount', 'failureCount', 'lastRunAt', 'lastError', 'nextRunAt']
      },
      automationExecutions: {
        description: 'Execution history for automations',
        fields: ['id', 'automationId', 'pluginId', 'status', 'triggerSource', 'triggerData', 'initialState', 'finalState', 'result', 'error', 'duration', 'startedAt', 'completedAt']
      },
      resources: {
        description: 'File metadata for sandboxed resource storage (prompt templates, images, audio, documents)',
        fields: ['id (CUID2)', 'name', 'path', 'type (prompt|image|audio|document|data)', 'mimeType', 'size', 'checksum (SHA-256)', 'authorType', 'authorId', 'tenantId', 'pluginId', 'description', 'tags (JSON)', 'metadata (JSON)', 'isActive', 'isPublic', 'createdAt', 'updatedAt', 'deletedAt']
      },
      resourceOperations: {
        description: 'Audit log for all resource operations (create, read, update, delete, interpolate, copy)',
        fields: ['id (CUID2)', 'resourceId', 'operation', 'actorType', 'actorId', 'workflowId', 'executionId', 'nodeId', 'details (JSON)', 'previousChecksum', 'newChecksum', 'status', 'errorMessage', 'durationMs', 'createdAt']
      }
    },

    // ============= EXAMPLES =============
    examples: [
      {
        scenario: 'Create and Execute a Simple Math Workflow',
        steps: [
          'POST /workscript/workflows/create with workflow definition',
          'POST /workscript/workflows/run with { workflowId: "your-id" }'
        ],
        workflow: {
          id: 'simple-math',
          name: 'Simple Math',
          version: '1.0.0',
          initialState: { a: 10, b: 20 },
          workflow: [
            { 'math': { operation: 'add', values: ['$.a', '$.b'], 'success?': { 'log': { message: 'Result: $.mathResult' } } } }
          ]
        },
        expected_outcome: 'Adds 10 + 20, stores result in $.mathResult (30), logs the result'
      },
      {
        scenario: 'Schedule a Daily Cron Automation',
        steps: [
          'First create a workflow: POST /workscript/workflows/create',
          'Then create automation: POST /workscript/automations'
        ],
        automationPayload: {
          name: 'Daily Report',
          description: 'Generate daily report at 9 AM',
          workflowId: 'daily-report-workflow',
          triggerType: 'cron',
          triggerConfig: { cronExpression: '0 9 * * *', timezone: 'America/New_York' },
          enabled: true
        },
        expected_outcome: 'Workflow executes every day at 9 AM Eastern time'
      },
      {
        scenario: 'Trigger Workflow via Webhook',
        steps: [
          'Create automation with triggerType: "webhook" and triggerConfig: { webhookUrl: "my-processor" }',
          'POST /workscript/automations/webhook/my-processor with JSON body'
        ],
        webhookBody: { customerId: '123', action: 'process-order' },
        expected_outcome: 'Workflow executes with webhookBody injected as initialState'
      },
      {
        scenario: 'Test a Single Node in Isolation',
        request: 'POST /workscript/nodes/run/filter',
        body: {
          config: {
            items: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 17 }],
            conditions: [{ field: 'age', operation: 'gte', value: 18 }]
          }
        },
        expected_outcome: 'Returns filtered items (only Alice) without running a full workflow'
      },
      {
        scenario: 'Analyze Failed Execution',
        steps: [
          'GET /workscript/executions?status=failed to find failed executions',
          'GET /workscript/executions/:id to see error details',
          'GET /workscript/executions/:id/node-logs to identify which node failed',
          'GET /workscript/executions/:id/timeline for chronological event sequence'
        ],
        expected_outcome: 'Full visibility into execution failure with node-level granularity'
      },
      {
        scenario: 'Create an AI Prompt Template',
        request: 'POST /workscript/resources/create',
        body: {
          name: 'Customer Greeting',
          content: 'Hello {{$.customerName}},\n\nThank you for your interest in {{$.productName}}.\n\nBest regards,\n{{$.agentName}}',
          path: 'prompts/customer-greeting.md',
          type: 'prompt',
          description: 'Personalized customer greeting template',
          tags: ['email', 'customer-service']
        },
        expected_outcome: 'Creates a prompt template file at prompts/customer-greeting.md with {{$.var}} placeholders'
      },
      {
        scenario: 'Interpolate Template with State',
        request: 'POST /workscript/resources/:id/interpolate',
        body: {
          state: {
            customerName: 'Alice Johnson',
            productName: 'Workscript Enterprise',
            agentName: 'Support Team'
          }
        },
        expected_outcome: 'Returns: "Hello Alice Johnson,\\n\\nThank you for your interest in Workscript Enterprise.\\n\\nBest regards,\\nSupport Team"'
      },
      {
        scenario: 'Upload an Image for Multi-Modal Workflow',
        request: 'POST /workscript/resources/upload (multipart form)',
        formData: {
          file: 'product-screenshot.png (binary)',
          name: 'Product Screenshot',
          description: 'Screenshot for AI vision analysis',
          tags: 'product,screenshot,vision'
        },
        expected_outcome: 'Image stored in sandbox and available for ask-ai node with vision capabilities'
      },
      {
        scenario: 'Generate AI Manifest for Workflow-Building Agent',
        request: 'GET /workscript/reflection/manifest',
        expected_outcome: 'Returns complete AI manifest with systemPrompt, quickReference, capabilities organized by nodeCategories, syntaxReference for $.key notation, and estimated tokenCount. Use this as system prompt for AI agents that build workflows.',
        notes: 'Use /manifest/compact for smaller context windows (~5000 tokens), or POST /manifest/custom to filter by use case (data-pipeline, ai-workflow, integration)'
      },
      {
        scenario: 'Get Deep Node Introspection',
        request: 'GET /workscript/reflection/nodes/filter',
        expected_outcome: 'Returns complete introspection for FilterNode including: category, complexity, inputSchema with all parameters, edgeConditions explaining what triggers "passed?" vs "filtered?", stateInteractions showing it reads items and writes filterStats, and composability info with typical predecessors/successors',
        notes: 'Use GET /reflection/nodes/:nodeId/operations to discover all filter operations grouped by data type (string, number, boolean, date, array, object)'
      },
      {
        scenario: 'Analyze Workflow for Understanding',
        request: 'POST /workscript/reflection/analysis/explain',
        body: {
          workflow: {
            id: 'data-pipeline',
            name: 'Data Pipeline',
            version: '1.0.0',
            initialState: { data: [{ id: 1, status: 'active' }] },
            workflow: [
              { 'filter': { items: '$.data', conditions: [{ field: 'status', operation: 'equals', value: 'active' }], 'passed?': { 'log': { message: 'Found {{$.filterStats.passedCount}} active items' } } } }
            ]
          }
        },
        expected_outcome: 'Returns WorkflowAnalysis with: summary describing what workflow does, steps array explaining each node purpose, stateFlow showing initial->intermediate->final state keys, dataTransformations tracking how data changes, and complexity metrics (nodeCount, maxDepth, branchCount, loopCount)'
      },
      {
        scenario: 'Deep Validate Workflow for Semantic Issues',
        request: 'POST /workscript/reflection/analysis/validate-deep',
        body: {
          workflow: {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            initialState: {},
            workflow: [
              { 'log': { message: 'Value: {{$.undefinedKey}}' } }
            ]
          }
        },
        expected_outcome: 'Returns { valid: false, semanticIssues: [{ type: "warning", path: "workflow[0]", message: "State key $.undefinedKey used but never defined", suggestion: "Add undefinedKey to initialState or ensure a previous node writes to it" }], stateConsistency: { usedBeforeDefined: ["undefinedKey"] } }'
      },
      {
        scenario: 'Get Composability Suggestions',
        request: 'POST /workscript/reflection/composability/suggest',
        body: {
          currentNode: 'filter',
          currentEdge: 'passed',
          currentState: { filterStats: { passedCount: 10 } },
          intent: 'aggregate results'
        },
        expected_outcome: 'Returns suggestions sorted by confidence: [{ node: "summarize", confidence: 0.95, config: { operation: "count" }, explanation: "Summarize node aggregates filtered data and matches your intent to aggregate results" }]'
      },
      {
        scenario: 'Generate Workflow from Pattern',
        request: 'POST /workscript/reflection/patterns/generate',
        body: {
          patternId: 'etl-pipeline',
          parameters: {
            sourceTable: 'customers',
            targetTable: 'active_customers',
            filterConditions: [{ field: 'status', operation: 'equals', value: 'active' }],
            transformations: [{ field: 'fullName', expression: '$.firstName + " " + $.lastName' }]
          }
        },
        expected_outcome: 'Returns complete executable workflow definition following ETL pattern: database(find) -> filter -> editFields(transform) -> database(insert), plus explanation of what was generated'
      },
      {
        scenario: 'Detect Patterns in Existing Workflow',
        request: 'POST /workscript/reflection/patterns/detect',
        body: {
          workflow: {
            id: 'my-workflow',
            name: 'My Workflow',
            version: '1.0.0',
            initialState: { index: 0 },
            workflow: [
              { 'logic...': { operation: 'less', values: ['$.index', 10], 'true?': [{ 'log': { message: 'Processing {{$.index}}' } }, { '$.index': '$.index + 1' }], 'false?': null } }
            ]
          }
        },
        expected_outcome: 'Returns { detectedPatterns: [{ patternId: "loop-with-counter", confidence: 0.92, matchedNodes: ["logic..."], description: "Counter-based iteration pattern" }], suggestions: [{ patternId: "error-handling", reason: "Consider adding error edges for robustness" }] }'
      },
      {
        scenario: 'Read Node Source Code',
        request: 'GET /workscript/reflection/source/filter',
        expected_outcome: 'Returns structured source with: language, content (full TypeScript), path to file, structure (className, methods with signatures, interfaces), highlights (key implementation snippets), and relatedFiles (test file, example file paths)',
        notes: 'Use GET /reflection/source/:nodeId/raw for plain text TypeScript source. Source extraction is limited to packages/nodes/ for security.'
      }
    ],

    // ============= NODE CATEGORIES =============
    nodeCategories: {
      core: ['math', 'logic', 'transform', 'log', 'empty'],
      dataManipulation: ['filter', 'sort', 'aggregate', 'switch', 'splitOut', 'limit', 'editFields', 'summarize', 'transformObject', 'jsonExtract', 'removeDuplicates', 'validateData', 'compareDatasets', 'dateTime', 'stringOperations', 'mathOperations', 'arrayUtilities', 'objectUtilities', 'extractText', 'calculateField'],
      ai: ['ask-ai'],
      orchestration: ['runWorkflow'],
      server: ['filesystem', 'database', 'auth'],
      integrations: ['gmail (custom)', 'zoca (custom)']
    }
  },

  // Lifecycle hooks
  async onLoad(context) {
    const logger = context.logger || console;

    logger.info('🔧 Loading Workscript plugin...');

    try {
      // Initialize StorageService (sandboxed file storage)
      logger.info('   Initializing StorageService...');
      const storageService = getStorageService();
      logger.info('   ✅ StorageService initialized');

      // Initialize WorkflowService (discovers nodes)
      logger.info('   Initializing WorkflowService...');
      const workflowService = await WorkflowService.getInstance();
      const info = workflowService.getServiceInfo();
      logger.info(`   ✅ WorkflowService initialized: ${info.totalNodes} nodes registered`);

      // Register CronScheduler execution callback
      logger.info('   Registering CronScheduler callback...');
      const cronScheduler = CronScheduler.getInstance();
      const automationRepo = new AutomationRepository();
      const workflowRepo = new WorkflowRepository();

      cronScheduler.registerExecutionCallback('workscript', async (ctx: AutomationExecutionContext) => {
        try {
          logger.info(`   🚀 Executing automation ${ctx.automationId}`);

          // Get workflow definition
          const workflow = await workflowRepo.findById(ctx.workflowId);
          if (!workflow) {
            throw new Error(`Workflow ${ctx.workflowId} not found`);
          }

          // Capture initial state from workflow definition
          const workflowDef = workflow.definition as any;
          const capturedInitialState = workflowDef?.initialState || {};

          // Create execution record with initial state
          await automationRepo.createExecution({
            id: ctx.executionId,
            automationId: ctx.automationId,
            status: 'running',
            startedAt: new Date(),
            triggerSource: ctx.triggeredBy,
            triggerData: ctx.triggerData,
            initialState: Object.keys(capturedInitialState).length > 0 ? capturedInitialState : null
          });

          // Execute workflow
          const result = await workflowService.executeWorkflow(workflow.definition as any);

          // Extract final state from result
          const finalState = result?.finalState || null;

          // Mark as completed with final state
          await automationRepo.completeExecution(ctx.executionId, 'completed', result, undefined, finalState);
          await automationRepo.updateRunStats(ctx.automationId, true);

          return { success: true, result };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Mark as failed
          await automationRepo.completeExecution(ctx.executionId, 'failed', null, errorMessage);
          await automationRepo.updateRunStats(ctx.automationId, false, errorMessage);

          return { success: false, error: errorMessage };
        }
      });

      // Load and schedule existing cron automations
      logger.info('   Loading scheduled automations...');
      const scheduledAutomations = await automationRepo.findScheduledAutomations();
      logger.info(`   Found ${scheduledAutomations.length} scheduled automations`);

      for (const automation of scheduledAutomations) {
        const triggerConfig = automation.triggerConfig as { cronExpression?: string; timezone?: string };
        if (triggerConfig?.cronExpression) {
          await cronScheduler.scheduleAutomation({
            id: automation.id,
            name: automation.name,
            pluginId: 'workscript',
            workflowId: automation.workflowId,
            cronExpression: triggerConfig.cronExpression,
            timezone: triggerConfig.timezone || 'UTC'
          });
        }
      }

      logger.info('✅ Workscript plugin loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load Workscript plugin:', error);
      throw error;
    }
  },

  async onUnload() {
    console.log('🛑 Unloading Workscript plugin...');

    // Unregister CronScheduler callback
    const cronScheduler = CronScheduler.getInstance();
    cronScheduler.unregisterExecutionCallback('workscript');

    // Unschedule all workscript automations
    const jobs = cronScheduler.getJobsByPlugin('workscript');
    for (const job of jobs) {
      await cronScheduler.unscheduleAutomation(job.automationId);
    }

    console.log('✅ Workscript plugin unloaded');
  },

  async healthCheck() {
    try {
      // Check if WorkflowService is initialized and has nodes
      const workflowService = await WorkflowService.getInstance();
      const info = workflowService.getServiceInfo();
      const workflowHealthy = info.initialized && info.totalNodes > 0;

      // Check if StorageService is initialized and sandbox exists
      const storageService = getStorageService();
      const storageHealthy = await storageService.isHealthy();

      return workflowHealthy && storageHealthy;
    } catch {
      return false;
    }
  }
};

export default plugin;
