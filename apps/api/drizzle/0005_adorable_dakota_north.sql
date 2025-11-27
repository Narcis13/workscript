CREATE TABLE `oauth_connections` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`created_by` varchar(128),
	`tenant_id` varchar(128),
	`account_id` varchar(255),
	`account_email` varchar(255),
	`account_name` varchar(255),
	`access_token` text,
	`refresh_token` text,
	`access_token_encrypted` text,
	`refresh_token_encrypted` text,
	`encryption_version` int,
	`token_type` varchar(50) DEFAULT 'Bearer',
	`scope` text,
	`expires_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_used_at` timestamp,
	`last_refreshed_at` timestamp,
	`last_error` text,
	`last_error_at` timestamp,
	`provider_data` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oauth_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_connections_provider_account_tenant_unique` UNIQUE(`provider`,`account_id`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`id` varchar(128) NOT NULL,
	`state` varchar(128) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`code_verifier` text,
	`redirect_url` varchar(500),
	`metadata` json,
	`created_by` varchar(128),
	`tenant_id` varchar(128),
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_states_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `oauth_connections_provider_idx` ON `oauth_connections` (`provider`);--> statement-breakpoint
CREATE INDEX `oauth_connections_created_by_idx` ON `oauth_connections` (`created_by`);--> statement-breakpoint
CREATE INDEX `oauth_connections_tenant_idx` ON `oauth_connections` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `oauth_connections_account_email_idx` ON `oauth_connections` (`account_email`);--> statement-breakpoint
CREATE INDEX `oauth_connections_is_active_idx` ON `oauth_connections` (`is_active`);--> statement-breakpoint
CREATE INDEX `oauth_states_state_idx` ON `oauth_states` (`state`);--> statement-breakpoint
CREATE INDEX `oauth_states_expires_at_idx` ON `oauth_states` (`expires_at`);--> statement-breakpoint
CREATE INDEX `oauth_states_provider_idx` ON `oauth_states` (`provider`);