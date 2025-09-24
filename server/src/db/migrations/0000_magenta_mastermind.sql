CREATE TABLE `users` (
	`id` varchar(128) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` varchar(128) NOT NULL,
	`workflow_id` varchar(128) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`result` json,
	`error` text,
	`started_at` timestamp NOT NULL DEFAULT (now()),
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
