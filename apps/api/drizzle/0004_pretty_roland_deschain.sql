ALTER TABLE `automation_executions` ADD `initial_state` json;--> statement-breakpoint
ALTER TABLE `automation_executions` ADD `final_state` json;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD `triggered_by` varchar(50) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD `initial_state` json;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD `final_state` json;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD `stack_trace` text;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD `failed_node_id` varchar(128);--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD `node_logs` json;