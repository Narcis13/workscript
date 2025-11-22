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
      'Create and execute workflows with JSON definitions',
      'Validate workflow syntax and structure',
      'Schedule automated workflow execution with cron',
      'Execute individual nodes in isolation',
      'Real-time workflow monitoring via WebSocket',
      'Comprehensive node library (universal + server-specific)'
    ],
    when_to_use: 'When you need to automate business processes, orchestrate complex workflows, or execute repeatable task sequences',
    endpoints: [
      {
        path: '/workscript/workflows/create',
        method: 'POST',
        description: 'Create and save a workflow definition to the database',
        parameters: {
          workflowDefinition: 'Complete workflow JSON with id, name, version, and workflow array. Example: { id: "my-workflow", name: "Example", version: "1.0.0", workflow: [{ "math-1": { operation: "add", values: [10, 20], "success?": "log-1" } }] }'
        }
      },
      {
        path: '/workscript/workflows/run',
        method: 'POST',
        description: 'Execute a workflow definition immediately',
        parameters: {
          workflowDefinition: 'Complete workflow JSON',
          initialState: 'Optional initial state object'
        }
      },
      {
        path: '/workscript/workflows/validate',
        method: 'POST',
        description: 'Validate a workflow definition without executing',
        parameters: {
          workflowDefinition: 'Workflow JSON to validate'
        }
      },
      {
        path: '/workscript/workflows/allnodes',
        method: 'GET',
        description: 'Get all available nodes (universal + server-specific)',
        parameters: {
          source: 'Optional filter: "universal" or "server"'
        }
      },
      {
        path: '/workscript/workflows/allfromdb',
        method: 'GET',
        description: 'Get all workflows from database'
      },
      {
        path: '/workscript/automations',
        method: 'GET',
        description: 'List all automations with optional filtering',
        parameters: {
          enabled: 'Filter by enabled status (true/false)',
          triggerType: 'Filter by trigger type (cron/webhook/immediate)'
        }
      },
      {
        path: '/workscript/automations',
        method: 'POST',
        description: 'Create a new automation',
        parameters: {
          name: 'Automation name',
          description: 'Automation description',
          workflowId: 'ID of workflow to execute',
          triggerType: '"cron", "webhook", or "immediate"',
          triggerConfig: 'Trigger configuration (e.g., { cronExpression: "0 0 * * *" })'
        }
      },
      {
        path: '/workscript/automations/:id/execute',
        method: 'POST',
        description: 'Execute an automation immediately (manual trigger)'
      },
      {
        path: '/workscript/nodes/run/:nodeId',
        method: 'POST',
        description: 'Execute a single node in isolation for testing',
        parameters: {
          nodeId: 'ID of the node to execute',
          config: 'Node configuration object'
        }
      }
    ],
    examples: [
      {
        scenario: 'Simple Math Workflow',
        workflow: JSON.stringify({
          id: 'simple-math',
          name: 'Simple Math',
          version: '1.0.0',
          initialState: { a: 10, b: 20 },
          workflow: [
            { 'add': { operation: 'add', values: ['$.a', '$.b'], 'success?': 'log' } },
            { 'log': { message: 'Result: $.mathResult' } }
          ]
        }, null, 2),
        expected_outcome: 'Adds two numbers (10 + 20) and logs the result (30) to console'
      },
      {
        scenario: 'Conditional Routing Workflow',
        workflow: JSON.stringify({
          id: 'conditional',
          name: 'Conditional Routing',
          version: '1.0.0',
          initialState: { value: 15 },
          workflow: [
            { 'check': { value: '$.value', 'gt10?': 'log-high', 'default?': 'log-low' } },
            { 'log-high': { message: 'Value is greater than 10' } },
            { 'log-low': { message: 'Value is 10 or less' } }
          ]
        }, null, 2),
        expected_outcome: 'Routes execution based on value comparison, logs "Value is greater than 10"'
      }
    ]
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

          // Create execution record
          await automationRepo.createExecution({
            id: ctx.executionId,
            automationId: ctx.automationId,
            status: 'running',
            startedAt: new Date(),
            triggerSource: ctx.triggeredBy,
            triggerData: ctx.triggerData
          });

          // Execute workflow
          const result = await workflowService.executeWorkflow(workflow.definition as any);

          // Mark as completed
          await automationRepo.completeExecution(ctx.executionId, 'completed', result);
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
