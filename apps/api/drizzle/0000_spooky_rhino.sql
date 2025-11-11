CREATE TABLE `automation_executions` (
	`id` varchar(128) NOT NULL,
	`automation_id` varchar(128) NOT NULL,
	`plugin_id` varchar(128) NOT NULL DEFAULT 'workscript',
	`workflow_execution_id` varchar(128),
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`trigger_data` json,
	`result` json,
	`error` text,
	`started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	`duration` int,
	`trigger_source` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` varchar(128) NOT NULL,
	`plugin_id` varchar(128) NOT NULL DEFAULT 'workscript',
	`agency_id` varchar(128),
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger_type` enum('immediate','cron','webhook') NOT NULL,
	`trigger_config` json NOT NULL,
	`workflow_id` varchar(128) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`run_count` int NOT NULL DEFAULT 0,
	`success_count` int NOT NULL DEFAULT 0,
	`failure_count` int NOT NULL DEFAULT 0,
	`last_error` text,
	`last_error_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` varchar(128) NOT NULL,
	`workflow_id` varchar(128) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`result` json,
	`error` text,
	`started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `workflow_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`definition` json NOT NULL,
	`version` varchar(50) NOT NULL DEFAULT '1.0.0',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `automation_executions_automation_idx` ON `automation_executions` (`automation_id`);--> statement-breakpoint
CREATE INDEX `automation_executions_plugin_idx` ON `automation_executions` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `automation_executions_status_idx` ON `automation_executions` (`status`);--> statement-breakpoint
CREATE INDEX `automation_executions_created_at_idx` ON `automation_executions` (`created_at`);--> statement-breakpoint
CREATE INDEX `automations_plugin_idx` ON `automations` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `automations_agency_idx` ON `automations` (`agency_id`);--> statement-breakpoint
CREATE INDEX `automations_workflow_idx` ON `automations` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `automations_trigger_type_idx` ON `automations` (`trigger_type`);--> statement-breakpoint
CREATE INDEX `automations_enabled_idx` ON `automations` (`enabled`);--> statement-breakpoint
CREATE INDEX `automations_next_run_idx` ON `automations` (`next_run_at`);--> statement-breakpoint
CREATE INDEX `automations_name_idx` ON `automations` (`name`);--> statement-breakpoint
CREATE INDEX `automations_plugin_agency_idx` ON `automations` (`plugin_id`,`agency_id`);