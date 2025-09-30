# Testing Cron Automation System

## 1. Create a Test Workflow

First, create a simple workflow that we can automate:

```bash
curl -X POST http://localhost:3013/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Daily Notification",
    "description": "A simple test workflow for cron automation",
    "definition": {
      "id": "test-daily-notification",
      "name": "Test Daily Notification",
      "version": "1.0.0",
      "description": "Logs a daily notification message",
      "workflow": [
        {
          "log-message": {
            "level": "info",
            "message": "Daily cron automation executed successfully at ${new Date().toISOString()}"
          }
        }
      ]
    }
  }'
```

Save the returned `workflowId` for the next step.

## 2. Validate Cron Expression

Before creating an automation, validate the cron expression:

```bash
curl -X POST http://localhost:3013/automations/cron/validate \
  -H "Content-Type: application/json" \
  -d '{
    "cronExpression": "5 19 * * *"
  }'
```

Expected response:
```json
{
  "valid": true,
  "nextRun": "2025-09-30T19:05:00.000Z",
  "message": "Valid cron expression"
}
```

## 3. Create Cron Automation

Create an automation with the cron trigger (runs daily at 19:05):

```bash
curl -X POST http://localhost:3013/automations \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": 1,
    "name": "Daily Notification at 19:05",
    "description": "Automated daily notification triggered by cron",
    "triggerType": "cron",
    "triggerConfig": {
      "cronExpression": "5 19 * * *",
      "timezone": "Europe/Bucharest"
    },
    "workflowId": "YOUR_WORKFLOW_ID_HERE",
    "enabled": true
  }'
```

Save the returned `automationId`.

## 4. Check Scheduler Status

View all active cron jobs:

```bash
curl http://localhost:3013/automations/scheduler/status
```

Expected response:
```json
{
  "status": "running",
  "totalJobs": 1,
  "jobs": [
    {
      "automationId": "...",
      "automationName": "Daily Notification at 19:05",
      "cronExpression": "5 19 * * *",
      "nextRun": "2025-09-30T19:05:00.000Z",
      "isRunning": false
    }
  ]
}
```

## 5. Test with a Frequent Cron (Every Minute)

For testing purposes, create an automation that runs every minute:

```bash
curl -X POST http://localhost:3013/automations \
  -H "Content-Type: application/json" \
  -d '{
    "agencyId": 1,
    "name": "Test Every Minute",
    "description": "Test automation that runs every minute",
    "triggerType": "cron",
    "triggerConfig": {
      "cronExpression": "* * * * *",
      "timezone": "Europe/Bucharest"
    },
    "workflowId": "YOUR_WORKFLOW_ID_HERE",
    "enabled": true
  }'
```

Watch the server logs to see the automation execute every minute.

## 6. View Execution History

Check the execution history of an automation:

```bash
curl http://localhost:3013/automations/YOUR_AUTOMATION_ID/executions
```

## 7. Toggle Automation On/Off

Disable the automation:

```bash
curl -X PUT http://localhost:3013/automations/YOUR_AUTOMATION_ID/toggle \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

Enable it again:

```bash
curl -X PUT http://localhost:3013/automations/YOUR_AUTOMATION_ID/toggle \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }'
```

## 8. Update Cron Schedule

Update the cron expression:

```bash
curl -X PUT http://localhost:3013/automations/YOUR_AUTOMATION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Daily Notification",
    "triggerType": "cron",
    "triggerConfig": {
      "cronExpression": "10 20 * * *",
      "timezone": "Europe/Bucharest"
    },
    "workflowId": "YOUR_WORKFLOW_ID_HERE",
    "enabled": true
  }'
```

The automation will be automatically rescheduled.

## 9. Manual Reschedule

Manually reschedule a cron automation:

```bash
curl -X POST http://localhost:3013/automations/YOUR_AUTOMATION_ID/reschedule
```

## 10. Execute Manually (Override Schedule)

Trigger an automation immediately without waiting for the cron schedule:

```bash
curl -X POST http://localhost:3013/automations/YOUR_AUTOMATION_ID/execute
```

## Common Cron Expression Examples

- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at minute 0
- `5 19 * * *` - Every day at 19:05
- `0 9 * * 1-5` - Every weekday at 9:00 AM
- `0 0 * * 0` - Every Sunday at midnight
- `0 0 1 * *` - First day of every month at midnight
- `0 0 1 1 *` - January 1st at midnight (New Year)

## Troubleshooting

1. **Check server logs** for CronScheduler messages:
   - `🕐 CronScheduler: Starting...`
   - `✅ CronScheduler: Scheduled automation...`
   - `🚀 CronScheduler: Executing automation...`

2. **Verify automation is enabled**:
   ```bash
   curl http://localhost:3013/automations/YOUR_AUTOMATION_ID
   ```

3. **Check nextRunAt field** in the automation record

4. **View scheduler status** to see all active jobs

5. **Check execution history** for errors

## Notes

- The scheduler starts automatically when the server starts
- Cron jobs are rescheduled automatically when automations are updated
- The scheduler supports timezone configuration per automation
- Execution locks prevent duplicate runs if a job is still running
- The scheduler gracefully shuts down on SIGINT/SIGTERM signals