import { Cron } from 'croner';
import { AutomationRepository } from '../db/repositories/automationRepository';
import { WorkflowRepository } from '../db/repositories/workflowRepository';
import { createId } from '@paralleldrive/cuid2';
export class CronScheduler {
    static instance = null;
    automationRepository;
    workflowRepository;
    jobs;
    executionLocks;
    constructor() {
        this.automationRepository = new AutomationRepository();
        this.workflowRepository = new WorkflowRepository();
        this.jobs = new Map();
        this.executionLocks = new Set();
    }
    /**
     * Get singleton instance of CronScheduler
     */
    static getInstance() {
        if (!CronScheduler.instance) {
            CronScheduler.instance = new CronScheduler();
        }
        return CronScheduler.instance;
    }
    /**
     * Initialize and start the scheduler
     * Loads all enabled cron automations from database and schedules them
     */
    async start() {
        console.log('🕐 CronScheduler: Starting...');
        try {
            // Load all enabled cron automations
            const automations = await this.automationRepository.findScheduledAutomations();
            console.log(`🕐 CronScheduler: Found ${automations.length} enabled cron automations`);
            // Schedule each automation
            for (const automation of automations) {
                await this.scheduleAutomation(automation);
            }
            console.log(`🕐 CronScheduler: Successfully scheduled ${this.jobs.size} jobs`);
        }
        catch (error) {
            console.error('❌ CronScheduler: Failed to start:', error);
            throw error;
        }
    }
    /**
     * Schedule a single automation
     */
    async scheduleAutomation(automation) {
        try {
            // Validate automation
            if (!automation.enabled) {
                console.log(`⏭️  CronScheduler: Skipping disabled automation ${automation.id}`);
                return;
            }
            if (automation.triggerType !== 'cron') {
                console.log(`⏭️  CronScheduler: Skipping non-cron automation ${automation.id}`);
                return;
            }
            // Extract cron expression from triggerConfig
            const triggerConfig = automation.triggerConfig;
            const cronExpression = triggerConfig?.cronExpression;
            if (!cronExpression) {
                console.error(`❌ CronScheduler: No cron expression found for automation ${automation.id}`);
                return;
            }
            // Validate cron expression
            if (!this.validateCronExpression(cronExpression)) {
                console.error(`❌ CronScheduler: Invalid cron expression "${cronExpression}" for automation ${automation.id}`);
                return;
            }
            // Remove existing job if it exists
            if (this.jobs.has(automation.id)) {
                await this.unscheduleAutomation(automation.id);
            }
            // Create cron job with timezone support
            const options = {
                timezone: triggerConfig?.timezone || 'UTC',
                protect: true, // Prevent overlapping executions
            };
            const job = new Cron(cronExpression, options, async () => {
                await this.executeAutomation(automation.id);
            });
            // Get next run time
            const nextRun = job.nextRun();
            // Store job info
            this.jobs.set(automation.id, {
                automationId: automation.id,
                automationName: automation.name,
                cronExpression,
                nextRun,
                job,
            });
            // Update nextRunAt in database
            if (nextRun) {
                await this.automationRepository.update(automation.id, { nextRunAt: nextRun });
            }
            console.log(`✅ CronScheduler: Scheduled automation "${automation.name}" (${automation.id})`);
            console.log(`   Expression: ${cronExpression}`);
            console.log(`   Next run: ${nextRun?.toISOString() || 'N/A'}`);
        }
        catch (error) {
            console.error(`❌ CronScheduler: Failed to schedule automation ${automation.id}:`, error);
        }
    }
    /**
     * Unschedule an automation
     */
    async unscheduleAutomation(automationId) {
        const jobInfo = this.jobs.get(automationId);
        if (jobInfo) {
            jobInfo.job.stop();
            this.jobs.delete(automationId);
            console.log(`🛑 CronScheduler: Unscheduled automation ${automationId}`);
        }
    }
    /**
     * Reschedule an automation (used when config changes)
     */
    async rescheduleAutomation(automationId) {
        console.log(`🔄 CronScheduler: Rescheduling automation ${automationId}`);
        // Get fresh automation data from database
        const automation = await this.automationRepository.findById(automationId);
        if (!automation) {
            console.error(`❌ CronScheduler: Automation ${automationId} not found`);
            return;
        }
        // Unschedule and reschedule
        await this.unscheduleAutomation(automationId);
        await this.scheduleAutomation(automation);
    }
    /**
     * Execute an automation (with execution lock to prevent duplicates)
     */
    async executeAutomation(automationId) {
        // Check if already executing
        if (this.executionLocks.has(automationId)) {
            console.log(`⏭️  CronScheduler: Skipping execution for ${automationId} (already running)`);
            return;
        }
        // Acquire lock
        this.executionLocks.add(automationId);
        try {
            const automation = await this.automationRepository.findById(automationId);
            if (!automation) {
                console.error(`❌ CronScheduler: Automation ${automationId} not found`);
                return;
            }
            if (!automation.enabled) {
                console.log(`⏭️  CronScheduler: Automation ${automationId} is disabled, skipping execution`);
                return;
            }
            console.log(`🚀 CronScheduler: Executing automation "${automation.name}" (${automationId})`);
            // Create execution record
            const executionId = createId();
            await this.automationRepository.createExecution({
                id: executionId,
                automationId,
                status: 'running',
                startedAt: new Date(),
                triggerSource: 'cron',
            });
            try {
                // Get workflow definition
                const workflow = await this.workflowRepository.findById(automation.workflowId);
                if (!workflow) {
                    throw new Error('Workflow not found');
                }
                // Prepare workflow definition with execution context
                let workflowDefinition;
                if (typeof workflow.definition === 'object' && workflow.definition !== null) {
                    workflowDefinition = {
                        ...workflow.definition,
                        executionContext: {
                            automationId,
                            executionId,
                            triggeredBy: 'cron',
                        },
                    };
                }
                else {
                    workflowDefinition = workflow.definition;
                }
                // Execute workflow via internal API
                const workflowRunResponse = await fetch('http://localhost:3013/workflows/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workflowDefinition),
                });
                if (!workflowRunResponse.ok) {
                    const errorData = await workflowRunResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || `Workflow execution failed: ${workflowRunResponse.status}`);
                }
                const workflowResult = await workflowRunResponse.json();
                // Mark execution as completed
                await this.automationRepository.completeExecution(executionId, 'completed', workflowResult);
                // Update automation stats
                await this.automationRepository.updateRunStats(automationId, true);
                console.log(`✅ CronScheduler: Automation "${automation.name}" completed successfully`);
                // Update nextRunAt for next execution
                const jobInfo = this.jobs.get(automationId);
                if (jobInfo) {
                    const nextRun = jobInfo.job.nextRun();
                    if (nextRun) {
                        await this.automationRepository.update(automationId, { nextRunAt: nextRun });
                    }
                }
            }
            catch (error) {
                console.error(`❌ CronScheduler: Automation "${automation.name}" failed:`, error);
                // Mark execution as failed
                await this.automationRepository.completeExecution(executionId, 'failed', null, error instanceof Error ? error.message : 'Unknown error');
                // Update automation stats
                await this.automationRepository.updateRunStats(automationId, false, error instanceof Error ? error.message : 'Unknown error');
            }
        }
        finally {
            // Release lock
            this.executionLocks.delete(automationId);
        }
    }
    /**
     * Validate cron expression
     */
    validateCronExpression(expression) {
        try {
            // Try to create a cron job to validate
            const testJob = new Cron(expression, { paused: true }, () => { });
            testJob.stop();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get status of all scheduled jobs
     */
    getStatus() {
        const jobs = Array.from(this.jobs.values()).map((jobInfo) => ({
            automationId: jobInfo.automationId,
            automationName: jobInfo.automationName,
            cronExpression: jobInfo.cronExpression,
            nextRun: jobInfo.nextRun?.toISOString() || null,
            isRunning: this.executionLocks.has(jobInfo.automationId),
        }));
        return {
            totalJobs: this.jobs.size,
            jobs,
        };
    }
    /**
     * Graceful shutdown - stop all cron jobs
     */
    async shutdown() {
        console.log('🛑 CronScheduler: Shutting down...');
        for (const [automationId, jobInfo] of this.jobs.entries()) {
            jobInfo.job.stop();
            console.log(`🛑 CronScheduler: Stopped job for automation ${automationId}`);
        }
        this.jobs.clear();
        this.executionLocks.clear();
        console.log('🛑 CronScheduler: Shutdown complete');
    }
    /**
     * Validate and parse cron expression (public utility method)
     */
    static validateAndParseCron(expression) {
        try {
            const testJob = new Cron(expression, { paused: true }, () => { });
            const nextRun = testJob.nextRun();
            testJob.stop();
            return {
                valid: true,
                nextRun: nextRun || undefined,
            };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Invalid cron expression',
            };
        }
    }
}
