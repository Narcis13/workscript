# Requirements Document: Workscript Main UI

## Introduction

The **Workscript Main UI** is a professional, production-ready React-based frontend application that provides a comprehensive user interface for managing the Workscript workflow orchestration system. This application will reside in the `/apps/frontend` directory alongside the existing React skeleton and authentication infrastructure, serving as the primary management interface for workflows, automations, and node operations.

The UI integrates with the fully-implemented Workscript plugin backend located in `/apps/api/src/plugins/workscript`, which exposes complete REST APIs for workflow management, automation scheduling, node discovery, and real-time execution monitoring via WebSockets. The backend provides 35+ universal and server-specific nodes, database persistence for workflows and automations, cron-based scheduling, webhook triggers, and comprehensive execution tracking with lifecycle hooks.

This frontend application leverages modern web technologies including React 19, Vite 7, TypeScript, and exclusively uses shadcn/ui as the component library to ensure design consistency. Key features include a Monaco-based JSON workflow editor, visual cron expression builder, real-time execution monitoring through WebSocket integration, comprehensive CRUD operations for all entities, and a modular component architecture designed for maintainability and reusability. The application integrates seamlessly with the existing JWT-based authentication system and implements role-based access control aligned with the backend permission model.

---

## Requirements

### Requirement 1: Node Library Browser

**User Story:** As a workflow developer, I want to browse all available workflow nodes (universal and server-specific), so that I can discover and understand the capabilities available for building workflows.

#### Acceptance Criteria

1. WHEN the user navigates to `/nodes` THEN they see a paginated list of all available nodes from the Workscript engine
2. WHEN the page loads THEN it fetches nodes from the `/workscript/workflows/allnodes` API endpoint
3. WHEN nodes are loading THEN the UI displays a loading skeleton for each node card
4. WHEN nodes are displayed THEN each node card shows: node ID, name, version, description, source badge (universal/server), and a "View Details" button
5. WHEN the user types in the search input THEN the node list filters in real-time to show only nodes matching the search term in name, ID, or description
6. WHEN the user selects a source filter (All/Universal/Server) THEN only nodes from the selected source are displayed
7. WHEN the user clicks on a node card THEN they navigate to `/nodes/:nodeId` detail page
8. WHEN no nodes match the current filters THEN an empty state is displayed with a message "No nodes found matching your criteria"
9. WHEN there's an error fetching nodes THEN an error message is displayed with a "Retry" button
10. WHEN the user clicks "Retry" on an error THEN the nodes query is refetched
11. IF the node list contains more than 20 nodes THEN pagination controls appear at the bottom
12. WHEN the user clicks pagination controls THEN the appropriate page of results is displayed without full page reload

### Requirement 2: Node Detail View and Metadata Display

**User Story:** As a workflow developer, I want to view detailed information about a specific node, so that I can understand how to configure and use it in my workflows.

#### Acceptance Criteria

1. WHEN the user navigates to `/nodes/:nodeId` THEN the node's complete metadata is displayed
2. WHEN the page loads THEN it fetches node metadata from `/workscript/nodes/metadata/:nodeId`
3. WHEN node details are displayed THEN the following sections are visible: Overview (name, version, description), Inputs (list of expected config fields), Outputs (list of state keys the node modifies), AI Hints section
4. WHEN displaying AI hints THEN show: purpose, when to use, expected edges, example usage code snippet, example config code snippet, get_from_state array, post_to_state array
5. WHEN code snippets are shown THEN they are syntax-highlighted as JSON
6. WHEN the user clicks the "Copy" button on a code snippet THEN the code is copied to clipboard and a toast notification confirms "Copied to clipboard"
7. WHEN breadcrumbs are displayed THEN they show: Nodes > {Node Name} with clickable links
8. WHEN the node doesn't exist THEN a 404 error state is shown with "Node not found" message and a button to return to the nodes list
9. WHEN there's an error loading node details THEN an error state is displayed with details and a "Retry" button
10. IF the node has no AI hints THEN the AI Hints section displays "No additional hints available"

### Requirement 3: Node Test Runner and Execution

**User Story:** As a workflow developer, I want to test individual nodes in isolation with custom configuration, so that I can understand their behavior before using them in workflows.

#### Acceptance Criteria

1. WHEN viewing a node detail page THEN a "Test Node" section is visible below the metadata
2. WHEN the test section is displayed THEN it contains: a Monaco editor for JSON config input, an "Initial State" Monaco editor for optional state setup, a "Run Test" button, and a results panel
3. WHEN the user types in the config editor THEN the JSON is validated in real-time with syntax highlighting
4. WHEN the JSON config is invalid THEN error markers appear in the Monaco editor with descriptive messages
5. WHEN the user clicks "Run Test" THEN a POST request is sent to `/workscript/nodes/run/:nodeId` with config and initialState
6. WHEN the test is executing THEN the "Run Test" button shows a loading spinner and is disabled
7. WHEN the test completes successfully THEN the results panel displays: execution time, returned edges (as JSON), final state (as JSON), and a success badge
8. WHEN the test fails THEN the results panel displays the error message with an error badge
9. WHEN the user clicks "Clear Results" THEN the results panel is hidden and editors are reset to defaults
10. IF the node has example_config in AI hints THEN the config editor is pre-populated with that example
11. WHEN the user clicks "Reset to Example" THEN the config editor is populated with the example config from AI hints
12. WHEN results are displayed THEN they are formatted as syntax-highlighted JSON with expand/collapse for nested objects

### Requirement 4: Workflow List Management and Navigation

**User Story:** As a workflow administrator, I want to view and manage all workflows in the system, so that I can organize and maintain workflow definitions.

#### Acceptance Criteria

1. WHEN the user navigates to `/workflows` THEN they see a list of all workflows from the database
2. WHEN the page loads THEN it fetches workflows from `/workscript/workflows/allfromdb`
3. WHEN workflows are loading THEN skeleton cards are displayed
4. WHEN workflows are displayed THEN each workflow card shows: name, description, version, isActive badge, created/updated timestamps, and action buttons (View, Edit, Delete, Run)
5. WHEN the user types in the search input THEN workflows are filtered by name or description in real-time
6. WHEN the user clicks "Create Workflow" button THEN they navigate to `/workflows/new`
7. WHEN the user clicks "View" on a workflow card THEN they navigate to `/workflows/:id`
8. WHEN the user clicks "Edit" on a workflow card THEN they navigate to `/workflows/:id/edit`
9. WHEN the user clicks "Delete" on a workflow card THEN a confirmation dialog appears with the message "Are you sure you want to delete '{workflow name}'? This action cannot be undone."
10. WHEN the user confirms deletion THEN a DELETE request is sent to `/workscript/workflows/:id` and the workflow is removed from the list
11. WHEN a workflow is deleted successfully THEN a success toast notification is displayed "Workflow deleted successfully"
12. WHEN deletion fails THEN an error toast is displayed with the error message
13. WHEN the user clicks "Run" on a workflow card THEN a dialog opens for immediate execution with optional initial state input
14. WHEN no workflows exist THEN an empty state is displayed with "No workflows yet" message and a "Create Your First Workflow" button
15. IF there are more than 20 workflows THEN pagination controls appear

### Requirement 5: Workflow Creation with Monaco Editor

**User Story:** As a workflow developer, I want to create new workflows using a professional JSON editor with validation, so that I can efficiently define complex workflow logic.

#### Acceptance Criteria

1. WHEN the user navigates to `/workflows/new` THEN a workflow creation form is displayed
2. WHEN the form is displayed THEN it contains: Name input (required), Description textarea (optional), Version input (default: "1.0.0"), Monaco editor for workflow JSON (required), Validation status indicator, Action buttons (Save, Validate, Test Run, Cancel)
3. WHEN the user types in the Monaco editor THEN the JSON is validated in real-time against the workflow schema
4. WHEN the workflow JSON is invalid THEN error markers appear in the editor with line/column positions and descriptive messages
5. WHEN the user clicks "Validate" THEN a POST request is sent to `/workscript/workflows/validate` with the workflow definition
6. WHEN validation succeeds THEN a success message is displayed "Workflow validation passed ✓" with green indicator
7. WHEN validation fails THEN error messages are displayed with line numbers and the Monaco editor scrolls to the first error
8. WHEN the user clicks "Save" THEN the workflow is validated first before saving
9. IF validation passes THEN a POST request is sent to `/workscript/workflows/create` with name, description, version, and workflow definition
10. WHEN the workflow is saved successfully THEN the user is redirected to `/workflows/:id` detail page with a success toast
11. WHEN save fails THEN an error toast is displayed and the user remains on the creation page
12. WHEN the user clicks "Test Run" THEN a dialog opens allowing them to input initial state and execute the workflow immediately
13. WHEN the user clicks "Cancel" THEN a confirmation dialog appears if there are unsaved changes: "You have unsaved changes. Are you sure you want to leave?"
14. WHEN Monaco editor loads THEN it is configured with: JSON syntax highlighting, Auto-complete for workflow structure, Bracket matching, Code folding, Error squiggles, Line numbers
15. IF the user has permission `WORKFLOW_CREATE` THEN the save button is enabled, ELSE it is disabled with a tooltip explaining insufficient permissions

### Requirement 6: Workflow Editing with Version Control

**User Story:** As a workflow developer, I want to edit existing workflows while preserving version history, so that I can improve workflows without losing previous implementations.

#### Acceptance Criteria

1. WHEN the user navigates to `/workflows/:id/edit` THEN the workflow editing form is displayed pre-populated with existing data
2. WHEN the page loads THEN it fetches the workflow from `/workscript/workflows/:id`
3. WHEN the workflow data loads THEN all form fields are populated: name, description, version, and Monaco editor contains the workflow JSON
4. WHEN the user modifies any field THEN a "dirty" indicator appears showing unsaved changes
5. WHEN the user clicks "Save" THEN a PUT request is sent to `/workscript/workflows/:id` with updated data
6. WHEN the update succeeds THEN the user sees a success toast "Workflow updated successfully" and the dirty indicator is cleared
7. WHEN the update fails THEN an error toast is displayed with the error message
8. WHEN the user clicks "Save as New Version" THEN a dialog prompts for a new version number and creates a new workflow entry
9. WHEN the user modifies the workflow JSON THEN real-time validation runs and displays errors immediately
10. WHEN the user clicks "View Diff" THEN a Monaco diff editor appears showing the original vs. current workflow definition
11. WHEN the user clicks "Cancel" THEN a confirmation dialog appears if there are unsaved changes
12. WHEN the workflow is being used by active automations THEN a warning banner appears: "Warning: This workflow is used by X active automation(s). Changes may affect scheduled executions."
13. IF the user lacks `WORKFLOW_UPDATE` permission THEN all form fields are read-only and save buttons are hidden
14. WHEN there's an error loading the workflow THEN an error state is displayed with a "Retry" button

### Requirement 7: Workflow Execution and Testing

**User Story:** As a workflow developer, I want to manually execute workflows with custom initial state, so that I can test workflow behavior before scheduling automations.

#### Acceptance Criteria

1. WHEN viewing a workflow detail page THEN an "Execute Workflow" section is visible
2. WHEN the execute section is displayed THEN it contains: Initial State Monaco editor (optional JSON), "Run Workflow" button, Execution results panel (collapsed by default)
3. WHEN the user clicks "Run Workflow" THEN a POST request is sent to `/workscript/workflows/run` with the workflow definition and optional initial state
4. WHEN execution starts THEN the button shows a loading spinner and displays "Running..."
5. WHEN execution completes successfully THEN the results panel expands and displays: execution ID, status badge ("completed"), execution duration, final state (as formatted JSON), workflow result (as formatted JSON), and a "View Full Execution" link
6. WHEN execution fails THEN the results panel displays: status badge ("failed"), error message, stack trace (if available), and partial state at failure point
7. WHEN the user clicks "View Full Execution" THEN they navigate to a detailed execution view page
8. WHEN a workflow is executing THEN real-time updates are received via WebSocket showing current node execution progress
9. WHEN the user clicks "Clear Results" THEN the results panel collapses and the initial state editor is cleared
10. IF the workflow has no initial state configured THEN the editor shows an empty JSON object `{}`
11. WHEN the user enters invalid JSON in the initial state editor THEN error markers appear and the "Run Workflow" button is disabled
12. IF the user lacks `WORKFLOW_EXECUTE` permission THEN the execute section shows "You don't have permission to execute workflows"
13. WHEN the execution result contains large state objects THEN they are displayed with expand/collapse tree view

### Requirement 8: Workflow Detail View and Execution History

**User Story:** As a workflow administrator, I want to view complete workflow details and execution history, so that I can monitor workflow usage and troubleshoot issues.

#### Acceptance Criteria

1. WHEN the user navigates to `/workflows/:id` THEN the complete workflow details are displayed
2. WHEN the page loads THEN it fetches workflow from `/workscript/workflows/:id` and executions from workflow execution API
3. WHEN details are displayed THEN the following sections are visible: Header with workflow name and action buttons, Metadata section (description, version, created/updated dates, active status), Workflow Definition panel (read-only Monaco editor), Execution History table (recent 20 executions), Execute Workflow section
4. WHEN viewing the workflow definition THEN the Monaco editor is in read-only mode with syntax highlighting
5. WHEN viewing execution history THEN each row shows: execution ID (truncated), start time, status badge (pending/running/completed/failed), duration, and "View Details" button
6. WHEN the user clicks "View Details" on an execution THEN they navigate to `/executions/:executionId`
7. WHEN the user clicks "Edit" button THEN they navigate to `/workflows/:id/edit`
8. WHEN the user clicks "Duplicate" button THEN a new workflow is created with the same definition but name prefixed with "Copy of"
9. WHEN the user clicks "Delete" button THEN a confirmation dialog appears, and if confirmed, the workflow is deleted
10. WHEN the workflow is used by automations THEN an "Associated Automations" section lists all automations using this workflow
11. IF the execution history has more than 20 items THEN pagination controls appear
12. WHEN the user clicks "Refresh History" THEN the executions list is refetched from the API
13. WHEN there are no executions THEN an empty state displays "No executions yet. Run this workflow to see execution history."
14. IF the user lacks `WORKFLOW_READ` permission THEN they see a 403 error page

### Requirement 9: Automation List Management and Filtering

**User Story:** As a workflow administrator, I want to view and manage all automations with filtering capabilities, so that I can organize scheduled and triggered workflows.

#### Acceptance Criteria

1. WHEN the user navigates to `/automations` THEN they see a list of all automations from the database
2. WHEN the page loads THEN it fetches automations from `/workscript/automations`
3. WHEN automations are loading THEN skeleton cards are displayed
4. WHEN automations are displayed THEN each card shows: name, description, workflow name (as link), trigger type badge (cron/webhook/immediate), next run time (for cron), enabled/disabled toggle, run statistics (total/success/failure counts), last run timestamp, and action buttons (View, Edit, Delete, Execute Now)
5. WHEN the user types in the search input THEN automations are filtered by name or description
6. WHEN the user selects a trigger type filter (All/Cron/Webhook/Immediate) THEN only automations of that type are displayed
7. WHEN the user selects status filter (All/Enabled/Disabled) THEN only automations matching that status are displayed
8. WHEN the user clicks the enable/disable toggle THEN a PUT request is sent to `/workscript/automations/:id/toggle`
9. WHEN toggle succeeds THEN the automation status updates immediately and a toast notification confirms the change
10. WHEN the user clicks "Execute Now" THEN a POST request is sent to `/workscript/automations/:id/execute` and a confirmation toast appears
11. WHEN the user clicks "Create Automation" THEN they navigate to `/automations/new`
12. WHEN the user clicks "View" THEN they navigate to `/automations/:id`
13. WHEN the user clicks "Edit" THEN they navigate to `/automations/:id/edit`
14. WHEN the user clicks "Delete" THEN a confirmation dialog appears with the message "Delete '{automation name}'? This will unschedule the automation permanently."
15. IF there are no automations THEN an empty state displays "No automations yet. Create your first automation to schedule workflows."
16. WHEN automations are sorted by column (name, trigger type, next run, status) THEN the list re-orders accordingly

### Requirement 10: Automation Creation with Trigger Configuration

**User Story:** As a workflow administrator, I want to create new automations with different trigger types (cron, webhook, immediate), so that I can schedule workflows to run automatically.

#### Acceptance Criteria

1. WHEN the user navigates to `/automations/new` THEN a multi-step automation creation form is displayed
2. WHEN the form is displayed THEN it shows: Step indicators (1. Basic Info, 2. Workflow Selection, 3. Trigger Config, 4. Review), Navigation buttons (Back, Next, Save), Current step content
3. WHEN on Step 1 (Basic Info) THEN the user sees: Name input (required), Description textarea (optional), and "Next" button
4. WHEN the user clicks "Next" on Step 1 THEN form validates name is not empty, IF valid THEN proceed to Step 2, ELSE show validation error
5. WHEN on Step 2 (Workflow Selection) THEN a dropdown lists all active workflows from the database with search capability
6. WHEN the user selects a workflow THEN the workflow name and version are displayed as confirmation
7. WHEN on Step 3 (Trigger Configuration) THEN the user sees radio buttons for trigger type selection: Cron, Webhook, Immediate
8. WHEN the user selects "Cron" trigger THEN a CronBuilder component appears with visual controls for scheduling
9. WHEN the user selects "Webhook" trigger THEN a webhook URL input field appears with auto-generated path suggestion
10. WHEN the user selects "Immediate" trigger THEN a message displays "This automation will only run when manually triggered."
11. WHEN on Step 4 (Review) THEN all entered information is displayed for confirmation in a read-only summary
12. WHEN the user clicks "Save" on Step 4 THEN a POST request is sent to `/workscript/automations` with all configuration
13. WHEN creation succeeds THEN the user is redirected to `/automations/:id` with success toast "Automation created successfully"
14. WHEN creation fails THEN an error toast displays the error message and user remains on the form
15. WHEN the user clicks "Back" THEN they return to the previous step without losing entered data
16. WHEN the user clicks "Cancel" THEN a confirmation dialog appears if any data has been entered
17. IF the user lacks `AUTOMATION_CREATE` permission THEN the save button is disabled

### Requirement 11: Cron Expression Builder and Validator

**User Story:** As a workflow administrator, I want a visual cron expression builder with validation, so that I can easily schedule automations without memorizing cron syntax.

#### Acceptance Criteria

1. WHEN the CronBuilder component is displayed THEN it shows: Minute dropdown (0-59, */5, */10, */15, */30), Hour dropdown (0-23, */1, */2, */3, */6, */12), Day of Month dropdown (1-31, *, */1, L), Month dropdown (1-12, *, Jan-Dec names), Day of Week dropdown (0-6, *, Sun-Sat names), Raw cron expression input field (for advanced users), Timezone selector, Next run preview (shows next 5 execution times)
2. WHEN the user selects values from dropdowns THEN the raw cron expression is automatically generated and displayed
3. WHEN the user manually types in the raw cron expression THEN dropdowns are disabled and validation runs in real-time
4. WHEN the cron expression is valid THEN a green checkmark appears with the message "Valid cron expression"
5. WHEN the cron expression is invalid THEN error markers appear with a descriptive message explaining the issue
6. WHEN validation succeeds THEN a POST request is sent to `/workscript/automations/cron/validate` to get next execution times
7. WHEN next run times are loaded THEN they are displayed as a formatted list with dates/times in the selected timezone
8. WHEN the user clicks "Common Presets" THEN a dropdown shows: Every minute, Every 5 minutes, Every hour, Every day at midnight, Every day at 9 AM, Every Monday at 9 AM, First day of month, Every weekday at 9 AM
9. WHEN the user selects a preset THEN the cron expression is populated and validated automatically
10. WHEN the user changes timezone THEN the next run preview updates to show times in the new timezone
11. WHEN the cron expression changes THEN the next run preview is recalculated within 300ms debounce
12. IF the API validation fails THEN an error message displays "Unable to validate cron expression. Please check your input."
13. WHEN the user hovers over the info icon next to "Cron Expression" THEN a tooltip displays examples: "Examples: '0 9 * * *' (daily at 9 AM), '*/5 * * * *' (every 5 minutes)"

### Requirement 12: Automation Execution Management and Monitoring

**User Story:** As a workflow administrator, I want to monitor automation executions and manually trigger automations, so that I can ensure automations are working correctly and troubleshoot issues.

#### Acceptance Criteria

1. WHEN the user navigates to `/automations/:id` THEN complete automation details are displayed
2. WHEN the page loads THEN it fetches automation from `/workscript/automations/:id` and execution history from `/workscript/automations/:id/executions`
3. WHEN details are displayed THEN the following sections are visible: Header with automation name and action buttons, Metadata (description, workflow link, trigger config, enabled status, next run time), Statistics panel (total runs, success count, failure count, success rate percentage, average duration), Execution History table (recent 20 executions), Trigger details section
4. WHEN viewing trigger details for cron THEN display: cron expression, timezone, next 5 scheduled runs
5. WHEN viewing trigger details for webhook THEN display: webhook URL (with copy button), example curl command
6. WHEN the user clicks "Execute Now" button THEN a POST request is sent to `/workscript/automations/:id/execute`
7. WHEN manual execution succeeds THEN a success toast appears "Automation triggered successfully" and execution history is refreshed
8. WHEN the user clicks "Edit" THEN they navigate to `/automations/:id/edit`
9. WHEN the user clicks "Reschedule" (for cron automations) THEN a dialog opens with CronBuilder pre-populated with current schedule
10. WHEN reschedule is confirmed THEN a POST request is sent to `/workscript/automations/:id/reschedule` with new cron config
11. WHEN the user toggles enabled/disabled THEN the automation status updates and next run time is recalculated or cleared
12. WHEN execution history is displayed THEN each row shows: execution ID, triggered by (cron/webhook/manual), start time, status badge, duration, and "View Details" button
13. WHEN the user clicks "View Details" on an execution THEN they navigate to execution detail page showing full logs and state
14. WHEN the automation has failures THEN a warning banner displays "This automation has failed X times recently. Click to view error details."
15. IF there are more than 20 executions THEN pagination controls appear
16. WHEN the page is open THEN execution history auto-refreshes every 30 seconds to show new runs

### Requirement 13: Real-time Workflow Monitoring via WebSocket

**User Story:** As a workflow operator, I want to see real-time updates of workflow executions as they happen, so that I can monitor progress and quickly identify issues.

#### Acceptance Criteria

1. WHEN the user navigates to `/monitoring` THEN the real-time monitoring dashboard is displayed
2. WHEN the page loads THEN a WebSocket connection is established to the `/ws` endpoint
3. WHEN the WebSocket connects THEN the client subscribes to the `workflow-events` channel
4. WHEN connection is established THEN a WebSocketStatus indicator shows "Connected" with green dot
5. WHEN connection is lost THEN the indicator shows "Disconnected" with red dot and auto-reconnect attempts begin
6. WHEN a workflow execution starts THEN a `workflow:started` event is received and a new execution card appears in the monitoring view
7. WHEN a node execution starts THEN a `node:started` event is received and the execution card updates to show current node progress
8. WHEN a node execution completes THEN a `node:completed` event is received and the node is marked as complete with green checkmark
9. WHEN a node execution fails THEN a `node:error` event is received and the node is marked with red error icon
10. WHEN a workflow execution completes THEN a `workflow:completed` event is received and the execution card shows final status
11. WHEN any workflow error occurs THEN a `workflow:error` event is received and a toast notification appears with error details
12. WHEN the monitoring view displays active executions THEN each execution shows: workflow ID, workflow name, current node, progress bar, elapsed time, real-time node execution flow diagram
13. WHEN the user clicks on an active execution card THEN it expands to show detailed event log with timestamps
14. WHEN the event log is displayed THEN events are shown in chronological order with: timestamp, event type, node ID (if applicable), event details
15. WHEN the user applies event filters (show only errors, show only completed, etc.) THEN the event log updates to show filtered events
16. WHEN WebSocket auto-reconnect succeeds THEN missed events are fetched via REST API to maintain continuity
17. IF the WebSocket fails to reconnect after 5 attempts THEN an error banner appears with "Real-time updates unavailable. Refresh the page to retry."

### Requirement 14: Execution History and State Inspection

**User Story:** As a workflow developer, I want to view detailed execution history with state snapshots, so that I can debug workflow issues and understand how data flows through nodes.

#### Acceptance Criteria

1. WHEN the user navigates to `/executions` THEN they see a list of all workflow executions from the database
2. WHEN the page loads THEN it fetches executions from workflow execution API endpoint
3. WHEN executions are displayed THEN each row shows: execution ID (truncated with copy button), workflow name (as link), start time, completion time, duration, status badge (pending/running/completed/failed), and "View Details" button
4. WHEN the user filters by status THEN only executions matching that status are displayed
5. WHEN the user filters by workflow THEN only executions of that workflow are displayed
6. WHEN the user filters by date range THEN only executions within that range are displayed
7. WHEN the user clicks "View Details" THEN they navigate to a detailed execution view page
8. WHEN viewing execution details THEN the following sections are displayed: Execution metadata (ID, workflow, start/end times, duration, status), Initial state (as formatted JSON tree), Final state (as formatted JSON tree), State changes timeline (showing each state mutation), Node execution log (each node with inputs/outputs/duration), Error details (if failed)
9. WHEN viewing state changes THEN each change shows: timestamp, node that made the change, state key that changed, old value, new value (with diff highlighting)
10. WHEN the user clicks "Compare States" THEN a side-by-side diff view opens showing initial state vs. final state
11. WHEN viewing node execution log THEN each node shows: node ID, node type, execution start time, execution duration, input configuration (as JSON), output edges (as JSON), state modifications made
12. WHEN an execution failed THEN the error section displays: error message, error stack trace, node that failed, state at failure point, suggested resolution (if available)
13. WHEN the user clicks "Re-run Execution" THEN a dialog confirms re-execution with the same initial state
14. WHEN the user clicks "Export Execution" THEN a JSON file downloads containing the complete execution data
15. IF the execution is still running THEN the page shows live updates via WebSocket and displays "Execution in progress..." with refresh button

### Requirement 15: Dashboard Overview and Statistics

**User Story:** As a workflow administrator, I want to see an overview dashboard with key statistics and quick actions, so that I can monitor system health and quickly access common tasks.

#### Acceptance Criteria

1. WHEN the user navigates to `/dashboard` (or root `/`) THEN the dashboard overview is displayed
2. WHEN the page loads THEN it fetches summary statistics from multiple API endpoints concurrently
3. WHEN statistics are displayed THEN four stat cards appear showing: Total Workflows (count + link to workflows page), Total Automations (count + breakdown by enabled/disabled + link), Recent Executions (count of last 24h + success rate + link), Active Jobs (currently running executions + link to monitoring)
4. WHEN the user clicks on a stat card THEN they navigate to the relevant page
5. WHEN the dashboard displays recent executions THEN a table shows the last 10 executions with: workflow name, start time, status, duration
6. WHEN the dashboard displays automation status THEN a pie chart shows the distribution of: enabled vs. disabled automations, success vs. failure rates
7. WHEN the user hovers over chart segments THEN tooltips display exact counts and percentages
8. WHEN the dashboard displays quick actions THEN buttons appear for: Create New Workflow, Create New Automation, View Monitoring, Browse Nodes
9. WHEN the user clicks a quick action button THEN they navigate to the appropriate page
10. WHEN statistics are loading THEN skeleton loaders are displayed for each section
11. WHEN there's an error loading any statistic THEN that section shows an error message with "Retry" button while other sections continue loading
12. WHEN the dashboard displays "System Health" indicator THEN it shows: WebSocket connection status, Number of active automations, Number of scheduled jobs in next 24h, Last execution timestamp
13. WHEN the page is open THEN statistics auto-refresh every 60 seconds
14. IF the user lacks permissions for certain sections THEN those sections are hidden or show "Insufficient permissions" message

### Requirement 16: Authentication Integration and Session Management

**User Story:** As a system user, I want to authenticate securely using the existing auth system, so that my session persists and I can access protected resources.

#### Acceptance Criteria

1. WHEN the application loads THEN it checks for a valid JWT token in localStorage or sessionStorage
2. IF a valid token exists THEN the user is automatically logged in and the token is included in all API requests
3. IF no token exists or token is expired THEN the user is redirected to the login page
4. WHEN the user successfully logs in THEN the JWT token is stored securely and the user is redirected to `/dashboard`
5. WHEN making API requests THEN the Authorization header is set with `Bearer {token}`
6. WHEN a 401 Unauthorized response is received THEN the app attempts to refresh the token using the refresh token endpoint
7. IF token refresh succeeds THEN the new token is stored and the original request is retried
8. IF token refresh fails THEN the user is logged out and redirected to login page with message "Your session has expired. Please log in again."
9. WHEN the user clicks "Logout" THEN the token is removed from storage, the WebSocket connection is closed, and they are redirected to login
10. WHEN viewing the user menu THEN it displays: user's name, user's email, user's role, "Logout" button
11. WHEN API requests fail due to network errors THEN appropriate error messages are displayed
12. WHEN the token is close to expiration (within 5 minutes) THEN a background refresh is triggered automatically
13. IF the user's session is active THEN their last activity timestamp is updated with each interaction
14. WHEN the app detects a different user has logged in on another tab THEN the current tab is redirected to login with message "You have been logged out because another user logged in."

### Requirement 17: Permission-based Access Control and UI Restrictions

**User Story:** As a system administrator, I want the UI to respect user permissions, so that users can only access and modify resources they're authorized for.

#### Acceptance Criteria

1. WHEN a user's permissions are loaded THEN they are stored in a permissions context/store accessible throughout the app
2. WHEN rendering action buttons (Create, Edit, Delete, Execute) THEN each button checks the user's permissions before rendering
3. IF the user lacks `WORKFLOW_CREATE` permission THEN the "Create Workflow" button is hidden or disabled
4. IF the user lacks `WORKFLOW_UPDATE` permission THEN the "Edit" button on workflow cards is hidden
5. IF the user lacks `WORKFLOW_DELETE` permission THEN the "Delete" button on workflow cards is hidden
6. IF the user lacks `WORKFLOW_EXECUTE` permission THEN the "Run" button and execution panel are hidden
7. IF the user lacks `AUTOMATION_CREATE` permission THEN the "Create Automation" button is hidden
8. IF the user lacks `AUTOMATION_UPDATE` permission THEN the "Edit" and "Toggle" buttons on automations are hidden
9. IF the user lacks `AUTOMATION_DELETE` permission THEN the "Delete" button on automations is hidden
10. IF the user lacks `AUTOMATION_EXECUTE` permission THEN the "Execute Now" button is hidden
11. WHEN navigating to a route that requires specific permissions THEN the app checks permissions before rendering
12. IF the user lacks required permissions for a route THEN a 403 Forbidden page is displayed with message "You don't have permission to access this page"
13. WHEN viewing read-only resources THEN all users can view but only authorized users see edit/delete actions
14. WHEN the user is an admin THEN all permissions are granted and all actions are available
15. WHEN permission checks are being loaded THEN protected UI elements show loading states instead of prematurely showing/hiding

### Requirement 18: Responsive Design and Mobile Optimization

**User Story:** As a mobile user, I want the application to work well on small screens, so that I can manage workflows and automations from any device.

#### Acceptance Criteria

1. WHEN viewing the app on screens < 768px wide THEN the sidebar collapses into a hamburger menu
2. WHEN the user taps the hamburger menu THEN the sidebar slides in from the left as an overlay
3. WHEN the user taps outside the open sidebar THEN the sidebar closes automatically
4. WHEN viewing tables on mobile THEN they transform into stacked card layouts showing key information
5. WHEN viewing the workflow editor on mobile THEN the Monaco editor resizes appropriately and provides touch-friendly controls
6. WHEN viewing forms on mobile THEN all inputs are touch-friendly with appropriate sizing (min 44px touch targets)
7. WHEN viewing charts on mobile THEN they scale to fit the viewport width and remain interactive
8. WHEN viewing the monitoring dashboard on mobile THEN execution cards stack vertically with full width
9. WHEN viewing dropdowns and selects on mobile THEN they use native mobile pickers for better UX
10. WHEN using touch gestures THEN swipe left on list items reveals quick actions (delete, edit)
11. WHEN viewing pagination on mobile THEN it shows condensed controls (prev/next buttons, current page, no full page numbers)
12. WHEN viewing modals/dialogs on mobile THEN they take full screen or slide up from bottom
13. WHEN the app detects a touch device THEN hover states are replaced with tap states
14. WHEN viewing the app in landscape mode on tablets THEN the layout adapts to use horizontal space efficiently
15. WHEN testing responsive breakpoints THEN the app works correctly at: 320px (mobile), 768px (tablet), 1024px (desktop), 1440px (large desktop)

### Requirement 19: Error Handling, Validation, and User Feedback

**User Story:** As an application user, I want clear error messages and validation feedback, so that I understand what went wrong and how to fix issues.

#### Acceptance Criteria

1. WHEN any API request fails THEN an appropriate error message is displayed to the user
2. WHEN displaying error messages THEN they include: what went wrong, why it might have happened (if known), what the user can do to resolve it
3. WHEN a network error occurs THEN the message displays "Unable to connect to the server. Please check your internet connection."
4. WHEN a 404 error occurs THEN the message displays "Resource not found. It may have been deleted or the URL is incorrect."
5. WHEN a 500 error occurs THEN the message displays "An unexpected error occurred. Please try again or contact support."
6. WHEN form validation fails THEN error messages appear inline below each invalid field
7. WHEN the user corrects a validation error THEN the error message disappears immediately
8. WHEN the user submits a form with validation errors THEN the form scrolls to the first error and focuses that field
9. WHEN a successful action completes THEN a toast notification appears with success message (e.g., "Workflow created successfully")
10. WHEN a destructive action is confirmed THEN a toast notification appears confirming the action (e.g., "Automation deleted")
11. WHEN loading data THEN appropriate loading indicators are shown (spinners, skeleton screens, loading bars)
12. WHEN an error boundary catches an unhandled error THEN a friendly error page is displayed with "Something went wrong" message and "Reload Page" button
13. WHEN JSON validation fails in Monaco editor THEN error squiggles appear at the error location with descriptive tooltips
14. WHEN cron expression validation fails THEN the specific error (e.g., "Invalid minute value") is displayed
15. WHEN copy-to-clipboard actions succeed THEN a toast notification appears "Copied to clipboard"
16. WHEN API requests are pending THEN action buttons are disabled and show loading state to prevent double-submission

### Requirement 20: Monaco Editor Integration and Configuration

**User Story:** As a workflow developer, I want a professional code editor with IntelliSense and validation, so that I can write workflow JSON efficiently with fewer errors.

#### Acceptance Criteria

1. WHEN the Monaco editor component loads THEN it is configured with: JSON language mode, Dark theme (matching app theme), Line numbers, Minimap, Bracket matching, Auto-indentation, Code folding
2. WHEN the user types in the editor THEN syntax highlighting is applied to JSON structures
3. WHEN the user types an opening bracket/brace THEN the closing bracket/brace is automatically inserted
4. WHEN the user presses Tab THEN the content is indented by 2 spaces
5. WHEN the user presses Cmd/Ctrl+S THEN the save action is triggered instead of browser save dialog
6. WHEN validation errors exist THEN red squiggles appear under the error location
7. WHEN the user hovers over an error squiggle THEN a tooltip displays the error message
8. WHEN the editor displays large JSON documents (>1000 lines) THEN performance remains smooth with no lag
9. WHEN the user uses find (Cmd/Ctrl+F) THEN the Monaco find widget opens with search and replace capabilities
10. WHEN the user uses format document (Shift+Alt+F) THEN the JSON is automatically formatted with correct indentation
11. WHEN the editor is in diff mode THEN it displays side-by-side comparison with additions highlighted in green and deletions in red
12. WHEN the user clicks on line numbers THEN breakpoint-style indicators can be toggled (for future debugging features)
13. WHEN the editor theme changes (light/dark mode toggle) THEN the Monaco theme updates accordingly
14. WHEN the editor is read-only THEN it displays a lock icon and prevents editing while maintaining all viewing features
15. WHEN auto-complete is triggered (Ctrl+Space) THEN suggestions appear based on JSON schema and node IDs from the registry

---

## Non-Functional Requirements

### Performance

1. Initial page load time must be under 3 seconds on a standard broadband connection
2. Route transitions must complete within 300ms
3. List views must render smoothly with up to 1000 items using virtualization
4. Monaco editor must handle JSON documents up to 10,000 lines without lag
5. WebSocket reconnection must occur within 5 seconds of disconnection
6. API response times should be under 500ms for most operations
7. The application bundle size should be under 1MB (gzipped) using code splitting

### Security

1. All API requests must include authentication tokens
2. Tokens must be stored securely (HttpOnly cookies or secure storage)
3. The application must not expose sensitive data in console logs or error messages
4. XSS protection must be enabled through React's built-in escaping
5. CSRF protection must be implemented for state-changing operations
6. Webhook URLs must be displayed with a "Copy" button instead of being selectable to prevent accidental sharing

### Accessibility

1. All interactive elements must be keyboard accessible
2. Focus indicators must be clearly visible on all focusable elements
3. Color contrast ratios must meet WCAG 2.1 AA standards (4.5:1 for normal text)
4. All images and icons must have appropriate alt text or aria-labels
5. Form inputs must have associated labels
6. Error messages must be announced to screen readers
7. Modal dialogs must trap focus and return focus when closed

### Browser Support / Compatibility

1. The application must work on: Chrome (last 2 versions), Firefox (last 2 versions), Safari (last 2 versions), Edge (last 2 versions)
2. The application must be tested on: iOS Safari (latest), Chrome Mobile (latest)
3. JavaScript must be required (no graceful degradation for no-JS)
4. The application must work offline for previously loaded pages using service workers (future enhancement)

### Code Quality

1. All components must have TypeScript type definitions with no `any` types except where absolutely necessary
2. All components must be documented with JSDoc comments explaining purpose, props, and usage
3. All complex business logic must be covered by unit tests
4. All API integration hooks must be covered by integration tests
5. Code must pass ESLint with no warnings
6. Code must be formatted with Prettier consistently
7. Component file size should not exceed 300 lines (split into sub-components if larger)
8. Utility functions must be pure and side-effect free where possible

---

## Out of Scope

The following features are explicitly **NOT** included in this initial implementation:

1. **Drag-and-Drop Visual Workflow Builder** - Only JSON-based workflow editing is included in v1. Visual builder is planned for v2.
2. **Multi-tenant Agency Switching** - The UI will show the logged-in user's agency data only. Multi-tenant UI switching is not included.
3. **Workflow Version Comparison Tool** - Diff viewer is included, but full version history and comparison across multiple versions is not.
4. **Advanced Analytics Dashboard** - Basic statistics are included, but detailed analytics (trends, predictions, performance metrics) are out of scope.
5. **Workflow Templates Library** - Users can duplicate workflows, but a curated template library is not included.
6. **Collaborative Editing** - Real-time multi-user collaboration on workflows is not included.
7. **Workflow Debugging with Breakpoints** - The UI shows execution logs but interactive debugging with step-through is not included.
8. **Custom Theme Builder** - Light/dark mode toggle is included, but custom theme creation is not.
9. **Export to External Formats** - JSON export is included, but export to other formats (YAML, graphical formats) is not.
10. **Audit Logs UI** - Backend may log actions, but a dedicated audit log viewer is not included in v1.
11. **User Management UI** - Authentication is integrated, but user creation/management UI is not included (admin backend only).
12. **API Key Management UI** - API keys exist in backend, but UI for generating/managing them is not included.
13. **Workflow Marketplace** - Sharing workflows publicly or in a marketplace is not included.

---

## Success Metrics

This feature will be considered successfully implemented when:

1. ✅ All 20 requirements have been implemented with acceptance criteria verified
2. ✅ The application successfully performs CRUD operations on workflows and automations
3. ✅ The node library displays all 35+ nodes with filtering and search capabilities
4. ✅ Monaco editor allows creating and editing workflows with real-time validation
5. ✅ Cron expression builder generates valid cron expressions and displays next run previews
6. ✅ Real-time monitoring displays live workflow execution updates via WebSocket
7. ✅ The application is fully responsive on mobile, tablet, and desktop devices
8. ✅ All shadcn/ui components are used consistently throughout the UI
9. ✅ Authentication integration works seamlessly with the existing backend auth system
10. ✅ Permission-based access control properly restricts UI elements based on user roles
11. ✅ Error handling provides clear, actionable feedback to users
12. ✅ The application passes TypeScript compilation with no errors
13. ✅ All components are documented with JSDoc comments
14. ✅ The application loads in under 3 seconds on standard connections
15. ✅ WebSocket connection is stable with auto-reconnect functionality
16. ✅ The codebase follows the modular component architecture with no component exceeding 300 lines
17. ✅ The application has been tested end-to-end on Chrome, Firefox, Safari, and Edge
18. ✅ Manual testing confirms all user workflows can be completed without errors
19. ✅ Code review confirms adherence to React best practices and coding standards
20. ✅ The application successfully integrates with all backend API endpoints

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-18
**Status:** Draft - Ready for Implementation
