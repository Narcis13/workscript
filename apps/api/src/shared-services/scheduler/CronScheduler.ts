import { Cron } from 'croner';
import { createId } from '@paralleldrive/cuid2';

/**
 * Cron Job Information
 */
export interface CronJobInfo {
  automationId: string;
  automationName: string;
  pluginId: string;
  cronExpression: string;
  nextRun: Date | null;
  job: Cron;
  metadata?: Record<string, any>;
}

/**
 * Automation Execution Context
 */
export interface AutomationExecutionContext {
  automationId: string;
  executionId: string;
  pluginId: string;
  workflowId: string;
  triggeredBy: 'cron' | 'webhook' | 'manual';
  triggerData?: any;
}

/**
 * Automation Execution Callback
 * Plugins provide this callback to handle their own workflow execution logic
 */
export type AutomationExecutionCallback = (context: AutomationExecutionContext) => Promise<{
  success: boolean;
  result?: any;
  error?: string;
}>;

/**
 * Shared CronScheduler - Multi-plugin automation scheduling
 *
 * This service provides cron-based scheduling capabilities for all plugins.
 * Each plugin can register its own automations with custom execution logic.
 *
 * Features:
 * - Multi-plugin support with pluginId isolation
 * - Cron expression validation
 * - Execution locking to prevent overlapping runs
 * - Timezone support
 * - Plugin-specific execution callbacks
 * - Graceful shutdown
 */
export class CronScheduler {
  private static instance: CronScheduler | null = null;
  private jobs: Map<string, CronJobInfo>; // key: automationId
  private executionLocks: Set<string>; // Set of automationIds currently executing
  private executionCallbacks: Map<string, AutomationExecutionCallback>; // key: pluginId

  private constructor() {
    this.jobs = new Map();
    this.executionLocks = new Set();
    this.executionCallbacks = new Map();
  }

  /**
   * Get singleton instance of CronScheduler
   */
  public static getInstance(): CronScheduler {
    if (!CronScheduler.instance) {
      CronScheduler.instance = new CronScheduler();
    }
    return CronScheduler.instance;
  }

  /**
   * Register an execution callback for a plugin
   * This callback will be invoked when any automation from this plugin needs to execute
   *
   * @param pluginId - Plugin ID
   * @param callback - Execution callback function
   */
  public registerExecutionCallback(pluginId: string, callback: AutomationExecutionCallback): void {
    this.executionCallbacks.set(pluginId, callback);
    console.log(`🔌 CronScheduler: Registered execution callback for plugin "${pluginId}"`);
  }

  /**
   * Unregister an execution callback for a plugin
   * @param pluginId - Plugin ID
   */
  public unregisterExecutionCallback(pluginId: string): void {
    this.executionCallbacks.delete(pluginId);
    console.log(`🔌 CronScheduler: Unregistered execution callback for plugin "${pluginId}"`);
  }

  /**
   * Schedule a cron automation
   *
   * @param automation - Automation configuration
   * @param automation.id - Automation ID
   * @param automation.name - Automation name
   * @param automation.pluginId - Plugin ID that owns this automation
   * @param automation.workflowId - Workflow ID to execute
   * @param automation.cronExpression - Cron expression
   * @param automation.timezone - Timezone (default: UTC)
   * @param automation.metadata - Additional metadata
   */
  public async scheduleAutomation(automation: {
    id: string;
    name: string;
    pluginId: string;
    workflowId: string;
    cronExpression: string;
    timezone?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { id, name, pluginId, workflowId, cronExpression, timezone = 'UTC', metadata } = automation;

      // Validate cron expression
      if (!this.validateCronExpression(cronExpression)) {
        console.error(`❌ CronScheduler: Invalid cron expression "${cronExpression}" for automation ${id}`);
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Check if plugin has registered an execution callback
      if (!this.executionCallbacks.has(pluginId)) {
        console.error(`❌ CronScheduler: No execution callback registered for plugin "${pluginId}"`);
        throw new Error(`Plugin "${pluginId}" has not registered an execution callback`);
      }

      // Remove existing job if it exists
      if (this.jobs.has(id)) {
        await this.unscheduleAutomation(id);
      }

      // Create cron job
      const job = new Cron(
        cronExpression,
        {
          timezone,
          protect: true, // Prevent overlapping executions
        },
        async () => {
          await this.executeAutomation(id, pluginId, workflowId);
        }
      );

      // Get next run time
      const nextRun = job.nextRun();

      // Store job info
      this.jobs.set(id, {
        automationId: id,
        automationName: name,
        pluginId,
        cronExpression,
        nextRun,
        job,
        metadata,
      });

      console.log(`✅ CronScheduler: Scheduled automation "${name}" (${id}) for plugin "${pluginId}"`);
      console.log(`   Expression: ${cronExpression}`);
      console.log(`   Timezone: ${timezone}`);
      console.log(`   Next run: ${nextRun?.toISOString() || 'N/A'}`);
    } catch (error) {
      console.error(`❌ CronScheduler: Failed to schedule automation ${automation.id}:`, error);
      throw error;
    }
  }

  /**
   * Unschedule an automation
   * @param automationId - Automation ID
   */
  public async unscheduleAutomation(automationId: string): Promise<void> {
    const jobInfo = this.jobs.get(automationId);
    if (jobInfo) {
      jobInfo.job.stop();
      this.jobs.delete(automationId);
      console.log(`🛑 CronScheduler: Unscheduled automation ${automationId}`);
    }
  }

  /**
   * Reschedule an automation
   * Useful when automation config changes
   *
   * @param automationId - Automation ID
   * @param newConfig - New automation configuration
   */
  public async rescheduleAutomation(
    automationId: string,
    newConfig: {
      name: string;
      pluginId: string;
      workflowId: string;
      cronExpression: string;
      timezone?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    console.log(`🔄 CronScheduler: Rescheduling automation ${automationId}`);

    // Unschedule existing job
    await this.unscheduleAutomation(automationId);

    // Schedule with new config
    await this.scheduleAutomation({
      id: automationId,
      ...newConfig,
    });
  }

  /**
   * Execute an automation (with execution lock to prevent duplicates)
   * @private
   */
  private async executeAutomation(
    automationId: string,
    pluginId: string,
    workflowId: string
  ): Promise<void> {
    // Check if already executing
    if (this.executionLocks.has(automationId)) {
      console.log(`⏭️  CronScheduler: Skipping execution for ${automationId} (already running)`);
      return;
    }

    // Acquire lock
    this.executionLocks.add(automationId);

    const executionId = createId();

    try {
      const jobInfo = this.jobs.get(automationId);
      if (!jobInfo) {
        console.error(`❌ CronScheduler: Job info not found for automation ${automationId}`);
        return;
      }

      console.log(`🚀 CronScheduler: Executing automation "${jobInfo.automationName}" (${automationId})`);

      // Get execution callback for the plugin
      const executionCallback = this.executionCallbacks.get(pluginId);
      if (!executionCallback) {
        console.error(`❌ CronScheduler: No execution callback for plugin "${pluginId}"`);
        return;
      }

      // Create execution context
      const context: AutomationExecutionContext = {
        automationId,
        executionId,
        pluginId,
        workflowId,
        triggeredBy: 'cron',
      };

      // Execute via plugin callback
      const result = await executionCallback(context);

      if (result.success) {
        console.log(`✅ CronScheduler: Automation "${jobInfo.automationName}" completed successfully`);

        // Update nextRunAt
        const nextRun = jobInfo.job.nextRun();
        if (nextRun) {
          jobInfo.nextRun = nextRun;
        }
      } else {
        console.error(`❌ CronScheduler: Automation "${jobInfo.automationName}" failed:`, result.error);
      }
    } catch (error) {
      console.error(`❌ CronScheduler: Automation execution failed for ${automationId}:`, error);
    } finally {
      // Release lock
      this.executionLocks.delete(automationId);
    }
  }

  /**
   * Validate cron expression
   * @param expression - Cron expression to validate
   * @returns True if valid, false otherwise
   */
  private validateCronExpression(expression: string): boolean {
    try {
      const testJob = new Cron(expression, { paused: true }, () => {});
      testJob.stop();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get scheduled job info by automation ID
   * @param automationId - Automation ID
   * @returns Job info or undefined
   */
  public getJob(automationId: string): CronJobInfo | undefined {
    return this.jobs.get(automationId);
  }

  /**
   * Get all scheduled jobs for a specific plugin
   * @param pluginId - Plugin ID
   * @returns Array of job info
   */
  public getJobsByPlugin(pluginId: string): CronJobInfo[] {
    return Array.from(this.jobs.values()).filter(job => job.pluginId === pluginId);
  }

  /**
   * Get status of all scheduled jobs
   * @param pluginId - Optional filter by plugin ID
   * @returns Status object with job details
   */
  public getStatus(pluginId?: string): {
    totalJobs: number;
    jobs: Array<{
      automationId: string;
      automationName: string;
      pluginId: string;
      cronExpression: string;
      nextRun: string | null;
      isRunning: boolean;
      metadata?: Record<string, any>;
    }>;
  } {
    const allJobs = Array.from(this.jobs.values());
    const filteredJobs = pluginId ? allJobs.filter(job => job.pluginId === pluginId) : allJobs;

    const jobs = filteredJobs.map((jobInfo) => ({
      automationId: jobInfo.automationId,
      automationName: jobInfo.automationName,
      pluginId: jobInfo.pluginId,
      cronExpression: jobInfo.cronExpression,
      nextRun: jobInfo.nextRun?.toISOString() || null,
      isRunning: this.executionLocks.has(jobInfo.automationId),
      metadata: jobInfo.metadata,
    }));

    return {
      totalJobs: jobs.length,
      jobs,
    };
  }

  /**
   * Graceful shutdown - stop all cron jobs
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 CronScheduler: Shutting down...');

    for (const [automationId, jobInfo] of this.jobs.entries()) {
      jobInfo.job.stop();
      console.log(`🛑 CronScheduler: Stopped job for automation ${automationId}`);
    }

    this.jobs.clear();
    this.executionLocks.clear();
    this.executionCallbacks.clear();
    console.log('🛑 CronScheduler: Shutdown complete');
  }

  /**
   * Validate and parse cron expression (static utility method)
   * @param expression - Cron expression
   * @returns Validation result with next run time
   */
  public static validateAndParseCron(expression: string, timezone: string = 'UTC'): {
    valid: boolean;
    error?: string;
    nextRun?: Date;
  } {
    try {
      const testJob = new Cron(expression, { paused: true, timezone }, () => {});
      const nextRun = testJob.nextRun();
      testJob.stop();

      return {
        valid: true,
        nextRun: nextRun || undefined,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid cron expression',
      };
    }
  }
}
