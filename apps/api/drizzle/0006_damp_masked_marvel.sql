CREATE TABLE `ai_models` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`context_length` int,
	`max_completion_tokens` int,
	`prompt_price` decimal(18,12),
	`completion_price` decimal(18,12),
	`request_price` decimal(18,12),
	`image_price` decimal(18,12),
	`modality` varchar(50),
	`input_modalities` json,
	`output_modalities` json,
	`tokenizer` varchar(50),
	`supported_parameters` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_synced_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`id` varchar(128) NOT NULL,
	`plugin_id` varchar(128) NOT NULL,
	`user_id` varchar(128),
	`tenant_id` varchar(128),
	`model_id` varchar(128) NOT NULL,
	`prompt_tokens` int NOT NULL,
	`completion_tokens` int NOT NULL,
	`total_tokens` int NOT NULL,
	`prompt_cost` decimal(18,12),
	`completion_cost` decimal(18,12),
	`total_cost` decimal(18,12),
	`request_duration_ms` int,
	`status` varchar(20),
	`error_message` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ai_models_modality_idx` ON `ai_models` (`modality`);--> statement-breakpoint
CREATE INDEX `ai_models_is_active_idx` ON `ai_models` (`is_active`);--> statement-breakpoint
CREATE INDEX `ai_models_last_synced_at_idx` ON `ai_models` (`last_synced_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_plugin_id_idx` ON `ai_usage` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_user_id_idx` ON `ai_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_tenant_id_idx` ON `ai_usage` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_model_id_idx` ON `ai_usage` (`model_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_created_at_idx` ON `ai_usage` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_plugin_created_at_idx` ON `ai_usage` (`plugin_id`,`created_at`);