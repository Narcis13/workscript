import { Hono } from 'hono';
import { AutomationRepository } from '../../db/repositories/automationRepository';
import { WorkflowRepository } from '../../db/repositories/workflowRepository';
import { CronScheduler } from '../../services/CronScheduler';
import { createId } from '@paralleldrive/cuid2';
const automationRepository = new AutomationRepository();
const workflowRepository = new WorkflowRepository();
const automationsApp = new Hono();
// GET /automations - List all automations (with optional filtering)
automationsApp.get('/', async (c) => {
    try {
        const { agencyId, enabled, triggerType } = c.req.query();
        let automations;
        if (agencyId) {
            if (enabled === 'true') {
                automations = await automationRepository.findEnabledByAgencyId(Number(agencyId));
            }
            else {
                automations = await automationRepository.findByAgencyId(Number(agencyId));
            }
        }
        else if (enabled === 'true') {
            automations = await automationRepository.findEnabled();
        }
        else if (triggerType) {
            automations = await automationRepository.findByTriggerType(triggerType);
        }
        else {
            automations = await automationRepository.findAll();
        }
        return c.json(automations);
    }
    catch (error) {
        console.error('Error fetching automations:', error);
        return c.json({ error: 'Failed to fetch automations' }, 500);
    }
});
// GET /automations/:id - Get single automation
automationsApp.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const automation = await automationRepository.findById(id);
        if (!automation) {
            return c.json({ error: 'Automation not found' }, 404);
        }
        return c.json(automation);
    }
    catch (error) {
        console.error('Error fetching automation:', error);
        return c.json({ error: 'Failed to fetch automation' }, 500);
    }
});
// POST /automations - Create new automation
automationsApp.post('/', async (c) => {
    try {
        const body = await c.req.json();
        // Validate cron expression if triggerType is 'cron'
        if (body.triggerType === 'cron') {
            const cronExpression = body.triggerConfig?.cronExpression;
            if (!cronExpression) {
                return c.json({ error: 'Cron expression is required for cron trigger type' }, 400);
            }
            const validation = CronScheduler.validateAndParseCron(cronExpression);
            if (!validation.valid) {
                return c.json({ error: `Invalid cron expression: ${validation.error}` }, 400);
            }
        }
        const newAutomation = {
            id: createId(),
            agencyId: body.agencyId,
            name: body.name,
            description: body.description,
            triggerType: body.triggerType,
            triggerConfig: body.triggerConfig,
            workflowId: body.workflowId,
            enabled: body.enabled ?? true,
            nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const automation = await automationRepository.create(newAutomation);
        // Schedule cron automation if enabled
        if (automation.triggerType === 'cron' && automation.enabled) {
            const cronScheduler = CronScheduler.getInstance();
            await cronScheduler.scheduleAutomation(automation);
        }
        return c.json(automation, 201);
    }
    catch (error) {
        console.error('Error creating automation:', error);
        return c.json({ error: 'Failed to create automation' }, 500);
    }
});
// PUT /automations/:id - Update automation
automationsApp.put('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        // Validate cron expression if triggerType is 'cron'
        if (body.triggerType === 'cron' && body.triggerConfig?.cronExpression) {
            const validation = CronScheduler.validateAndParseCron(body.triggerConfig.cronExpression);
            if (!validation.valid) {
                return c.json({ error: `Invalid cron expression: ${validation.error}` }, 400);
            }
        }
        const updates = {
            name: body.name,
            description: body.description,
            triggerType: body.triggerType,
            triggerConfig: body.triggerConfig,
            workflowId: body.workflowId,
            enabled: body.enabled,
            nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : undefined,
            updatedAt: new Date()
        };
        const automation = await automationRepository.update(id, updates);
        if (!automation) {
            return c.json({ error: 'Automation not found' }, 404);
        }
        // Reschedule cron automation if config changed
        if (automation.triggerType === 'cron') {
            const cronScheduler = CronScheduler.getInstance();
            if (automation.enabled) {
                await cronScheduler.rescheduleAutomation(id);
            }
            else {
                await cronScheduler.unscheduleAutomation(id);
            }
        }
        return c.json(automation);
    }
    catch (error) {
        console.error('Error updating automation:', error);
        return c.json({ error: 'Failed to update automation' }, 500);
    }
});
// DELETE /automations/:id - Delete automation
automationsApp.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        // Unschedule cron job if exists
        const cronScheduler = CronScheduler.getInstance();
        await cronScheduler.unscheduleAutomation(id);
        const deleted = await automationRepository.delete(id);
        if (!deleted) {
            return c.json({ error: 'Automation not found' }, 404);
        }
        return c.json({ message: 'Automation deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting automation:', error);
        return c.json({ error: 'Failed to delete automation' }, 500);
    }
});
// GET /automations/:id/executions - Get automation execution history
automationsApp.get('/:id/executions', async (c) => {
    try {
        const id = c.req.param('id');
        const executions = await automationRepository.findExecutionsByAutomationId(id);
        return c.json(executions);
    }
    catch (error) {
        console.error('Error fetching automation executions:', error);
        return c.json({ error: 'Failed to fetch automation executions' }, 500);
    }
});
// PUT /automations/:id/toggle - Toggle automation enabled status
automationsApp.put('/:id/toggle', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const automation = await automationRepository.toggleEnabled(id, body.enabled);
        if (!automation) {
            return c.json({ error: 'Automation not found' }, 404);
        }
        // Handle cron scheduling based on enabled status
        if (automation.triggerType === 'cron') {
            const cronScheduler = CronScheduler.getInstance();
            if (automation.enabled) {
                await cronScheduler.scheduleAutomation(automation);
            }
            else {
                await cronScheduler.unscheduleAutomation(id);
            }
        }
        return c.json(automation);
    }
    catch (error) {
        console.error('Error toggling automation:', error);
        return c.json({ error: 'Failed to toggle automation' }, 500);
    }
});
// POST /automations/:id/execute - Execute automation immediately
automationsApp.post('/:id/execute', async (c) => {
    try {
        const id = c.req.param('id');
        const automation = await automationRepository.findById(id);
        if (!automation) {
            return c.json({ error: 'Automation not found' }, 404);
        }
        if (!automation.enabled) {
            return c.json({ error: 'Automation is disabled' }, 400);
        }
        // Create execution record
        const executionId = createId();
        await automationRepository.createExecution({
            id: executionId,
            automationId: id,
            status: 'running',
            startedAt: new Date(),
            triggerSource: 'manual'
        });
        // Execute workflow via /workflows/run API
        try {
            // Get the workflow definition
            const workflow = await workflowRepository.findById(automation.workflowId);
            if (!workflow) {
                throw new Error('Workflow not found');
            }
            // console.log('Raw workflow from database:', JSON.stringify(workflow, null, 2))
            //  console.log('Workflow definition type:', typeof workflow.definition)
            // console.log('Workflow definition:', JSON.stringify(workflow.definition, null, 2))
            // Ensure workflow.definition is an object and add execution context
            let workflowDefinition;
            if (typeof workflow.definition === 'object' && workflow.definition !== null) {
                workflowDefinition = {
                    ...workflow.definition,
                    executionContext: {
                        automationId: id,
                        executionId: executionId,
                        triggeredBy: 'manual'
                    }
                };
            }
            else {
                workflowDefinition = workflow.definition;
            }
            //console.log('Final workflow definition for execution:', JSON.stringify(workflowDefinition, null, 2))
            // Make POST request to /workflows/run
            const workflowRunResponse = await fetch('http://localhost:3013/workflows/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowDefinition)
            });
            if (!workflowRunResponse.ok) {
                const errorData = await workflowRunResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Workflow execution failed: ${workflowRunResponse.status}`);
            }
            const workflowResult = await workflowRunResponse.json();
            //console.log('Workflow result:', workflowResult)
            // Mark as completed with workflow result
            await automationRepository.completeExecution(executionId, 'completed', workflowResult);
            // Update automation run stats
            await automationRepository.updateRunStats(id, true);
        }
        catch (error) {
            console.error('Workflow execution error:', error);
            // Mark as failed
            await automationRepository.completeExecution(executionId, 'failed', null, error instanceof Error ? error.message : 'Unknown error');
            // Update automation run stats
            await automationRepository.updateRunStats(id, false, error instanceof Error ? error.message : 'Unknown error');
        }
        return c.json({
            message: 'Automation execution started',
            executionId,
            automation
        });
    }
    catch (error) {
        console.error('Error executing automation:', error);
        return c.json({ error: 'Failed to execute automation' }, 500);
    }
});
// POST /automations/:id/reschedule - Manually reschedule a cron automation
automationsApp.post('/:id/reschedule', async (c) => {
    try {
        const id = c.req.param('id');
        const automation = await automationRepository.findById(id);
        if (!automation) {
            return c.json({ error: 'Automation not found' }, 404);
        }
        if (automation.triggerType !== 'cron') {
            return c.json({ error: 'Only cron automations can be rescheduled' }, 400);
        }
        const cronScheduler = CronScheduler.getInstance();
        await cronScheduler.rescheduleAutomation(id);
        const updatedAutomation = await automationRepository.findById(id);
        return c.json({
            message: 'Automation rescheduled successfully',
            automation: updatedAutomation
        });
    }
    catch (error) {
        console.error('Error rescheduling automation:', error);
        return c.json({ error: 'Failed to reschedule automation' }, 500);
    }
});
// POST /automations/webhook/:webhookPath - Execute automation via webhook
automationsApp.post('/webhook/:webhookPath', async (c) => {
    try {
        const webhookPath = c.req.param('webhookPath');
        // Parse request body as initial state
        let initialState = {};
        try {
            initialState = await c.req.json();
        }
        catch (parseError) {
            return c.json({ error: 'Invalid JSON in request body' }, 400);
        }
        // Find automation by webhook path
        const automations = await automationRepository.findAll();
        const automation = automations.find(auto => {
            if (auto.triggerType !== 'webhook')
                return false;
            const config = auto.triggerConfig;
            return config.webhookUrl === webhookPath || config.webhookUrl === `/${webhookPath}`;
        });
        if (!automation) {
            return c.json({ error: `No automation found for webhook path: ${webhookPath}` }, 404);
        }
        if (!automation.enabled) {
            return c.json({ error: 'Automation is disabled' }, 400);
        }
        // Create execution record
        const executionId = createId();
        await automationRepository.createExecution({
            id: executionId,
            automationId: automation.id,
            status: 'running',
            startedAt: new Date(),
            triggerSource: 'webhook',
            triggerData: initialState
        });
        // Execute workflow with initial state injection
        try {
            // Get the workflow definition
            const workflow = await workflowRepository.findById(automation.workflowId);
            if (!workflow) {
                throw new Error('Workflow not found');
            }
            // Inject initial state into workflow definition
            let workflowDefinition;
            if (typeof workflow.definition === 'object' && workflow.definition !== null) {
                workflowDefinition = {
                    ...workflow.definition,
                    initialState: initialState,
                    executionContext: {
                        automationId: automation.id,
                        executionId: executionId,
                        triggeredBy: 'webhook',
                        webhookPath: webhookPath
                    }
                };
            }
            else {
                workflowDefinition = workflow.definition;
            }
            // Make POST request to /workflows/run
            const workflowRunResponse = await fetch('http://localhost:3013/workflows/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowDefinition)
            });
            if (!workflowRunResponse.ok) {
                const errorData = await workflowRunResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Workflow execution failed: ${workflowRunResponse.status}`);
            }
            const workflowResult = await workflowRunResponse.json();
            // Mark as completed with workflow result
            await automationRepository.completeExecution(executionId, 'completed', workflowResult);
            // Update automation run stats
            await automationRepository.updateRunStats(automation.id, true);
            return c.json({
                message: 'Workflow execution started via webhook',
                executionId,
                automationId: automation.id,
                automation: {
                    id: automation.id,
                    name: automation.name
                }
            }, 202);
        }
        catch (error) {
            console.error('Webhook workflow execution error:', error);
            // Mark as failed
            await automationRepository.completeExecution(executionId, 'failed', null, error instanceof Error ? error.message : 'Unknown error');
            // Update automation run stats
            await automationRepository.updateRunStats(automation.id, false, error instanceof Error ? error.message : 'Unknown error');
            return c.json({
                error: 'Workflow execution failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                executionId
            }, 500);
        }
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        return c.json({ error: 'Failed to process webhook request' }, 500);
    }
});
// POST /automations/cron/validate - Validate cron expression
automationsApp.post('/cron/validate', async (c) => {
    try {
        const body = await c.req.json();
        const { cronExpression } = body;
        if (!cronExpression) {
            return c.json({ error: 'Cron expression is required' }, 400);
        }
        const validation = CronScheduler.validateAndParseCron(cronExpression);
        if (validation.valid) {
            return c.json({
                valid: true,
                nextRun: validation.nextRun?.toISOString(),
                message: 'Valid cron expression'
            });
        }
        else {
            return c.json({
                valid: false,
                error: validation.error
            }, 400);
        }
    }
    catch (error) {
        console.error('Error validating cron expression:', error);
        return c.json({ error: 'Failed to validate cron expression' }, 500);
    }
});
// GET /automations/scheduler/status - Get scheduler status
automationsApp.get('/scheduler/status', async (c) => {
    try {
        const cronScheduler = CronScheduler.getInstance();
        const status = cronScheduler.getStatus();
        return c.json({
            status: 'running',
            ...status
        });
    }
    catch (error) {
        console.error('Error getting scheduler status:', error);
        return c.json({ error: 'Failed to get scheduler status' }, 500);
    }
});
export default automationsApp;
