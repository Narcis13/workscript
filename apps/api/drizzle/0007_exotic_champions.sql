CREATE TABLE `resource_operations` (
	`id` varchar(128) NOT NULL,
	`resource_id` varchar(128) NOT NULL,
	`operation` varchar(50) NOT NULL,
	`actor_type` varchar(50) NOT NULL,
	`actor_id` varchar(128),
	`workflow_id` varchar(128),
	`execution_id` varchar(128),
	`node_id` varchar(128),
	`details` json,
	`previous_checksum` varchar(64),
	`new_checksum` varchar(64),
	`status` varchar(50) NOT NULL,
	`error_message` text,
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_operations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`path` varchar(512) NOT NULL,
	`type` varchar(50) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`checksum` varchar(64),
	`author_type` varchar(50) NOT NULL,
	`author_id` varchar(128),
	`tenant_id` varchar(128),
	`plugin_id` varchar(128) NOT NULL DEFAULT 'workscript',
	`description` text,
	`tags` json DEFAULT ('[]'),
	`metadata` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_public` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `resource_ops_resource_idx` ON `resource_operations` (`resource_id`);--> statement-breakpoint
CREATE INDEX `resource_ops_actor_idx` ON `resource_operations` (`actor_type`,`actor_id`);--> statement-breakpoint
CREATE INDEX `resource_ops_workflow_idx` ON `resource_operations` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `resource_ops_created_at_idx` ON `resource_operations` (`created_at`);--> statement-breakpoint
CREATE INDEX `resources_path_idx` ON `resources` (`path`);--> statement-breakpoint
CREATE INDEX `resources_tenant_type_idx` ON `resources` (`tenant_id`,`type`);--> statement-breakpoint
CREATE INDEX `resources_author_idx` ON `resources` (`author_type`,`author_id`);--> statement-breakpoint
CREATE INDEX `resources_plugin_idx` ON `resources` (`plugin_id`);