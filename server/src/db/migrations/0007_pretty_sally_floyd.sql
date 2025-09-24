CREATE TABLE `automation_executions` (
	`id` varchar(128) NOT NULL,
	`automation_id` varchar(128) NOT NULL,
	`workflow_execution_id` varchar(128),
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`trigger_data` json,
	`result` json,
	`error` text,
	`started_at` timestamp ,
	`completed_at` timestamp,
	`duration` int,
	`trigger_source` varchar(100),
	`execution_context` json NOT NULL DEFAULT ('{}'),
	CONSTRAINT `automation_executions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `automations` (
	`id` varchar(128) NOT NULL,
	`agency_id` bigint unsigned NOT NULL,
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
	`created_at` timestamp ,
	`updated_at` timestamp  ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automations_id` PRIMARY KEY(`id`)
);

ALTER TABLE `automation_executions` ADD CONSTRAINT `automation_executions_automation_id_automations_id_fk` FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `automation_executions` ADD CONSTRAINT `automation_exe_w_execution_id_workflow_exe_id_fk` FOREIGN KEY (`workflow_execution_id`) REFERENCES `workflow_executions`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `automations` ADD CONSTRAINT `automations_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `automations` ADD CONSTRAINT `automations_workflow_id_workflows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON DELETE no action ON UPDATE no action;
CREATE INDEX `automation_executions_automation_idx` ON `automation_executions` (`automation_id`);
CREATE INDEX `automation_executions_workflow_exec_idx` ON `automation_executions` (`workflow_execution_id`);
CREATE INDEX `automation_executions_status_idx` ON `automation_executions` (`status`);
CREATE INDEX `automation_executions_started_idx` ON `automation_executions` (`started_at`);
CREATE INDEX `automations_agency_idx` ON `automations` (`agency_id`);
CREATE INDEX `automations_workflow_idx` ON `automations` (`workflow_id`);
CREATE INDEX `automations_trigger_type_idx` ON `automations` (`trigger_type`);
CREATE INDEX `automations_enabled_idx` ON `automations` (`enabled`);
CREATE INDEX `automations_next_run_idx` ON `automations` (`next_run_at`);
CREATE INDEX `automations_name_idx` ON `automations` (`name`);