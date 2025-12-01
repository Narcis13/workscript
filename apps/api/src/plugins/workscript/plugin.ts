import type { SaaSPlugin } from '../../core/plugins';
import { Hono } from 'hono';
import workflowRoutes from './workflows';
import automationRoutes from './automations';
import executionRoutes from './executions';
import nodeRoutes from './nodes';
import { WorkflowService } from './services/WorkflowService';
import { CronScheduler, type AutomationExecutionContext } from '../../shared-services/scheduler';
import { AutomationRepository } from './repositories/automationRepository';
import { WorkflowRepository } from './repositories/workflowRepository';
import { workflows, workflowExecutions } from './schema/workscript.schema';

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
    '/workscript/nodes/*'
  ]
}));

// Mount sub-routers
router.route('/workflows', workflowRoutes);
router.route('/automations', automationRoutes);
router.route('/executions', executionRoutes);
router.route('/nodes', nodeRoutes);

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
    tables: [workflows, workflowExecutions]
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
      'Comprehensive node library (35+ nodes for data, logic, AI, integrations)'
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

      return info.initialized && info.totalNodes > 0;
    } catch {
      return false;
    }
  }
};

export default plugin;
